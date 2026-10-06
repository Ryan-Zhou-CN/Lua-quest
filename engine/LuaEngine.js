/**
 * LuaEngine.js — Lua Quest 引擎核心（P0）
 * 基于 luau-web（Luau → WASM，上游 luau-interop）实现，替代 Fengari。
 *
 * 用法：
 *   import { createLuaEngine } from "./engine/LuaEngine.js";
 *   const engine = await createLuaEngine({ initialGlobals: { ... } });
 *   const fn = engine.loadstring("return 1 + 1", "my_chunk"); // -> Function
 *   const ret = await fn();                                   // -> [2]（multret 数组）
 *   const st = await engine.createState({ hp = 100 });        // -> { globals, loadstring, globalsSet }
 *
 * P0 契约：
 * 1. loadstring(code, chunkname) -> Function
 *    编译 Luau 代码（类型注解 / += / continue / --!strict / 泛型原生支持）。
 *    编译失败同步抛 CompileError；返回的函数异步执行，resolve 为多返回值数组（multret）。
 * 2. createState(initialEnv?) -> { globals, loadstring, globalsSet }
 *    每次调用创建一个完全隔离的 Luau 状态（独立 globals、独立标准库实例）。
 * 3. JS↔Luau 互操作
 *    - JS 函数可经 initialEnv / globalsSet / globals.xxx = 注入，Luau 直接调用；
 *      返回 Promise 时 Luau 侧自动 await（Asyncify/JSPI 内建桥）。
 *    - Luau 表/函数可被 JS 读取：chunk 返回值（含嵌套表/函数）在 JS 侧为可读代理，
 *      函数可直接调用、multret 为数组。globals 同步属性读仅覆盖 JS 注入值，
 *      原生 Luau 全局请用 `await globals.get(name)`（经返回值路径完整 marshal）。
 *    - JS 对象默认在 Luau 侧只读；Mutable(obj) 包装后 Luau 侧可写。
 * 4. 错误堆栈
 *    编译错误（CompileError）与运行时错误的消息均含 `[string "chunkname"]:行号:` 前缀，
 *    JS 侧 try/catch 可捕获；JS rejected Promise 在 Luau 侧转为 Luau 错误并冒泡回 JS。
 * 5. 基础标准库由 luau-web WASM 原生内置（已探测验证，无需 JS shim）：
 *    math / string / table / coroutine / utf8 / bit32 / debug / os / buffer
 *    （另有 vector、gcinfo、typeof 等 Luau 原生全局）。
 * 6. Asyncify：JS 函数返回 Promise → Luau 侧自动等待。
 *
 * 状态生命周期（上游已知缺陷与自愈策略）：
 *   luau-web 1.4.0（当前最新版）实测存在一个缺陷：destroy() 一个「执行过代码」的
 *   状态后，紧随其后的下一次 WASM 状态创建可能拿到损坏状态（createAsync 抛
 *   "attempt to call a nil value"，或 loadstring 返回不可调用值）；再下一次创建即
 *   恢复正常，已存在的其他状态不受影响；销毁「从未执行过代码」的状态完全无害。
 *   本引擎以「健康探测 + 丢弃重试（≤3 次）」将该缺陷对调用方完全屏蔽：任何时序
 *   destroy 之后，createState / createLuaEngine 仍会拿到可用状态（损坏的中间状态被
 *   直接丢弃引用、不再 destroy，避免级联触发）。
 *   进程级资源清理建议沿用 spike 方案：Web Worker + terminate()。
 *
 * 运行环境：ESM。Node ≥ 22（模块语法自动检测）或现代浏览器（<script type="module">）。
 * 注意：每个状态独占 WASM 内的 Lua state；engine._state 供高级用法直接操作底层
 * luau-web 状态（经 _state 编译/执行的代码不会被引擎的自愈标记跟踪）。
 */

import { LuauState, Mutable, CompileError } from "luau-web";

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

// 模块级自愈标记：上一次 destroy 是否销毁了「执行过代码」的状态（见文件头说明）。
// 所有引擎/状态共享同一个 WASM 模块实例，故该标记为模块级。
let needHealAfterDestroy = false;

/**
 * 创建一个「健康」的 Luau 状态：
 * - 常规时序：直接创建，零额外开销；
 * - 自愈时序（destroy 过已执行状态后）：创建后先做健康探测
 *   （编译并调用 `return 1`、校验往返），损坏则丢弃重试，最多 3 次。
 * @returns {Promise<{state: Object, preUsed: boolean}>}
 */
async function createHealthyState(initialEnv) {
    if (!needHealAfterDestroy) {
        return { state: await LuauState.createAsync(initialEnv), preUsed: false };
    }

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        let state = null;
        try {
            state = await LuauState.createAsync(initialEnv);
            const probe = state.loadstring("return 1", "__state_healthcheck", true);
            if (typeof probe !== "function") throw new Error("unhealthy state (loadstring)");
            const out = await probe();
            if (!Array.isArray(out) || out[0] !== 1) throw new Error("unhealthy state (roundtrip)");
            needHealAfterDestroy = false;
            return { state, preUsed: true };
        } catch (e) {
            lastError = e;
            // 损坏状态：直接丢弃引用，不调用 destroy（避免再次触发上游缺陷级联）
            state = null;
        }
    }
    throw new Error(
        `LuaEngine: 无法创建健康的 Luau 状态（连续 3 次失败，源于 luau-web 1.4.0 的 destroy 缺陷）。` +
            `最后错误: ${String((lastError && lastError.message) || lastError)}`,
    );
}

/**
 * 同步读一个全局：JS 注入值可读回；原生 Luau 值返回 null
 * （luau-web env 读路径的限制——原生值需走 readGlobalFull 的返回值 marshal 路径）。
 */
function syncReadGlobal(state, name) {
    try {
        return state.env.get(name);
    } catch {
        return null;
    }
}

/**
 * 构建单个 Luau 状态的 API 面（引擎主状态与 createState 创建的每个状态共用）
 * @param {Object} state luau-web 的 LuauState 实例
 * @param {boolean} [usedInitially] 该状态在交出前是否已执行过代码（自愈探测路径）
 */
function buildStateApi(state, usedInitially = false) {
    // 该状态是否编译/执行过代码（供 destroy 的自愈标记使用）
    let used = usedInitially;

    function compile(code, chunkname) {
        used = true;
        return state.loadstring(code, chunkname, true);
    }

    // 异步全量读：经 chunk 返回值路径 marshal（表→可读代理、函数→可调用、标量→原值）
    const getterCache = new Map();
    let byNameGetter = null;

    async function readGlobalFull(name) {
        const sync = syncReadGlobal(state, name);
        if (sync !== null && sync !== undefined) return sync;

        const n = String(name);
        if (IDENTIFIER_RE.test(n)) {
            let call = getterCache.get(n);
            if (!call) {
                // 仅合法标识符直接内插，杜绝代码注入
                call = compile(`return ${n}`, "__engine_getglobal");
                getterCache.set(n, call);
            }
            const out = await call();
            return out && out.length > 0 ? out[0] : null;
        }
        if (!byNameGetter) {
            byNameGetter = compile("local n = ...; return _G[n]", "__engine_getglobal_byname");
        }
        const out = await byNameGetter(n);
        return out && out.length > 0 ? out[0] : null;
    }

    /**
     * globals：Luau 全局环境的 JS 视图（Proxy）
     * - 读   `globals.foo`      同步读（JS 注入值可得；原生 Luau 全局为 null → 用 await globals.get("foo")）
     * - 写   `globals.foo = v`  等价 globalsSet（内部走官方 bypassReadonly 通道）
     * - 方法 `await globals.get(name)` 全量读任意全局（含 Luau 原生表/函数）
     * - 方法 `globals.set(name, v)`   等价 globalsSet
     * - 方法 `globals.keys()`        枚举全部全局名
     */
    const globals = new Proxy(
        {
            get: (name) => readGlobalFull(name),
            set: (name, value) => state.env.set(String(name), value, true),
            keys: () => {
                try {
                    return state.env.keys().map(String);
                } catch {
                    return [];
                }
            },
        },
        {
            get(target, key, receiver) {
                if (typeof key === "symbol") return Reflect.get(target, key, receiver);
                const k = String(key);
                if (Object.prototype.hasOwnProperty.call(target, k)) {
                    return Reflect.get(target, k, receiver);
                }
                const value = syncReadGlobal(state, k);
                // 防止 globals 被误判为 thenable（`await globals` 场景）
                if (k === "then" && (value === null || value === undefined)) return undefined;
                return value;
            },
            set(_target, key, value) {
                if (typeof key === "symbol") return false;
                return state.env.set(String(key), value, true);
            },
            has(target, key) {
                if (typeof key === "symbol") return false;
                const k = String(key);
                if (Object.prototype.hasOwnProperty.call(target, k)) return true;
                const v = syncReadGlobal(state, k);
                return v !== null && v !== undefined;
            },
            ownKeys() {
                try {
                    return state.env.keys().map(String);
                } catch {
                    return [];
                }
            },
            getOwnPropertyDescriptor(target, key) {
                if (typeof key === "symbol") return undefined;
                const k = String(key);
                if (Object.prototype.hasOwnProperty.call(target, k)) {
                    return Reflect.getOwnPropertyDescriptor(target, k);
                }
                const v = syncReadGlobal(state, k);
                if (v === null || v === undefined) return undefined;
                return { value: v, writable: true, enumerable: true, configurable: true };
            },
        },
    );

    /**
     * loadstring(code, chunkname) -> Function
     * 编译 Luau 代码，返回可调用函数（异步，resolve 为 multret 数组）。
     * 编译错误同步抛 CompileError（消息含 chunkname+行号）；运行时错误以 reject 冒泡。
     * @param {string} code Luau 源码
     * @param {string} [chunkname] 块名（进入错误堆栈，如 "my_script"）
     */
    function loadstring(code, chunkname = "chunk") {
        const fn = compile(String(code), String(chunkname));
        return (...args) => Promise.resolve(fn(...args));
    }

    /** 便捷执行：编译并立即运行 */
    async function run(code, chunkname = "snippet") {
        return loadstring(code, chunkname)();
    }

    /**
     * globalsSet(name, value) -> boolean
     * 创建后注入/替换全局（内部走 luau-web 官方 bypassReadonly 通道，
     * 与 LuauState.createAsync(initialEnv) 注入同一机制）。
     * JS 函数注入后 Luau 可直接调用，返回 Promise 时自动被 Luau await；
     * 需要 Luau 侧可写的 JS 对象请传 Mutable(obj)。
     * @param {string} name 全局名
     * @param {*} value JS 值 / 函数 / Mutable 包装对象
     */
    function globalsSet(name, value) {
        return state.env.set(String(name), value, true);
    }

    /** 销毁状态，释放 WASM 内的 Lua state（幂等；上游缺陷已由引擎自愈屏蔽） */
    function destroy() {
        if (!state.destroyed) {
            const wasUsed = used;
            state.destroy();
            if (wasUsed) needHealAfterDestroy = true;
        }
    }

    return { globals, loadstring, globalsSet, run, destroy };
}

/**
 * 创建 Lua 引擎实例
 * @param {Object} [options]
 * @param {Object} [options.initialGlobals] 引擎主状态的初始全局（JS 函数/对象/Mutable 包装均可）
 * @returns {Promise<{loadstring: Function, run: Function, globals: Object, globalsSet: Function, createState: Function, destroy: Function, _state: Object}>}
 */
export async function createLuaEngine(options = {}) {
    const { initialGlobals = {} } = options;

    const { state, preUsed } = await createHealthyState(initialGlobals);
    const api = buildStateApi(state, preUsed);

    /**
     * 创建隔离的 Luau 状态
     * @param {Object} [initialEnv] 该状态的初始全局环境
     * @returns {Promise<{globals: Object, loadstring: Function, globalsSet: Function, run: Function, destroy: Function}>}
     */
    async function createState(initialEnv = {}) {
        const created = await createHealthyState(initialEnv);
        return buildStateApi(created.state, created.preUsed);
    }

    return {
        ...api,
        createState,
        // 底层 luau-web 状态（高级用法；destroy 后不可再用）
        _state: state,
    };
}

// P0 契约导出 { createLuaEngine, LuauState }；Mutable / CompileError 为互操作便利导出
export { LuauState, Mutable, CompileError };
export default createLuaEngine;
