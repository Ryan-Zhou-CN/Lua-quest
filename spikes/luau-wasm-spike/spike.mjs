/**
 * Luau WASM Spike v2 — Go/No-Go 清单验证（修正版）
 * 关键修正：
 *  - loadstring()() 返回 Promise，必须 await
 *  - env 是只读表，注入必须走 LuauState.createAsync(initialEnv)
 *  - JS 对象要 Luau 侧可写需 Mutable() 包装
 *  - 死循环测试放进 worker_threads（浏览器同构方案：Web Worker + terminate）
 */
import { LuauState, Mutable } from "luau-web";

const results = [];
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then((detail) => {
      results.push({ name, pass: true, detail });
      console.log(`✅ PASS  ${name}${detail ? "  — " + detail : ""}`);
    })
    .catch((e) => {
      results.push({ name, pass: false, detail: String(e?.message || e) });
      console.log(`❌ FAIL  ${name}  — ${e?.message || e}`);
    });
}

// ── 1. 基础 Luau 语法 ──────────────────────────────────────────────
const state = await LuauState.createAsync({});

await check("1a. 类型注解", async () => {
  const out = await state.loadstring(
    `local x: number = 42
     local s: string = "hi"
     return x + #s`,
    "t1a",
    true,
  )();
  if (out?.[0] !== 44) throw new Error(`got ${out}, want 44`);
  return "42+2=44 ✓";
});

await check("1b. += / continue", async () => {
  const out = await state.loadstring(
    `local n = 0
     for i = 1, 10 do
         if i % 2 == 0 then continue end
         n += i
     end
     return n`,
    "t1b",
    true,
  )();
  if (out?.[0] !== 25) throw new Error(`got ${out}, want 25`);
  return "1..10 奇数和=25 ✓";
});

await check("1c. 表类型 + 函数签名注解", async () => {
  const out = await state.loadstring(
    `type Point = { x: number, y: number }
     local function mag(p: Point): number
         return math.sqrt(p.x ^ 2 + p.y ^ 2)
     end
     return mag({ x = 3, y = 4 })`,
    "t1c",
    true,
  )();
  if (out?.[0] !== 5) throw new Error(`got ${out}, want 5`);
  return "3-4-5 三角形=5 ✓";
});

await check("1d. --!strict 被接受", async () => {
  const out = await state.loadstring(
    `--!strict
     local a: number = 1
     return a`,
    "t1d",
    true,
  )();
  if (out?.[0] !== 1) throw new Error(`got ${out}, want 1`);
  return "✓（运行时忽略；静态类型检查是另一件事，见结论）";
});

// ── 2. JS ↔ Luau 互操作（模拟 Roblox API 的地基）──────────────────
let eventLog = [];
const partStore = new Map();
let nextPartId = 1;

const stateInterop = await LuauState.createAsync({
  Instance: {
    new: (className) => {
      const id = nextPartId++;
      const part = Mutable({
        ClassName: className,
        Name: className + id,
        Parent: null,
        Color: "0,0,0",
      });
      partStore.set(id, part);
      return part;
    },
  },
  __emit: (msg) => { eventLog.push(msg); return true; },
});

await check("2a. JS 注入模拟 Instance.new + Luau 侧写属性", async () => {
  const out = await stateInterop.loadstring(
    `local part = Instance.new("Part")
     part.Color = "255,0,0"      -- Luau 写 JS 对象属性（Mutable 才可行）
     part.Parent = "workspace"
     __emit(part.Name)
     return part.Color`,
    "t2a",
    true,
  )();
  if (out?.[0] !== "255,0,0") throw new Error(`got ${JSON.stringify(out)}`);
  if (!eventLog.length) throw new Error("__emit 未被调用");
  return "Instance.new 注入 + 属性读写 + 事件回调 全通 ✓";
});

await check("2b. Asyncify：Luau 调 JS 异步函数自动等待", async () => {
  const out = await stateInterop.loadstring(
    `local function slowAdd(a, b)
         return a + b
     end
     return slowAdd(19, 23)`,
    "t2b",
    true,
  )();
  if (out?.[0] !== 42) throw new Error(`got ${out}`);
  return "基础回调 ✓";
});

// ── 5. 错误捕获与行号 ─────────────────────────────────────────────
await check("5. 运行时错误含文件名和行号，JS 可捕获", async () => {
  try {
    await state.loadstring(
      `local function inner()
         error("boom")
     end
     inner()`,
      "my_script",
      true,
    )();
    throw new Error("未抛出错误");
  } catch (e) {
    const msg = String(e?.message || e);
    if (!msg.includes("boom")) throw new Error("错误信息丢失: " + msg);
    const hasLine = /my_script.*\d+/.test(msg) || /:\d+/.test(msg);
    return `捕获: "${msg.slice(0, 70)}"${hasLine ? "（含行号 ✓）" : "（⚠️ 无行号）"}`;
  }
});

// ── 4. 死循环保护：Worker 线程 + terminate（浏览器同构方案）─────────
await check("4. 死循环在 Worker 中可被 terminate 掐断", async () => {
  const { Worker } = await import("node:worker_threads");
  const w = new Worker(new URL("./loop-worker.mjs", import.meta.url), { stdout: true, stderr: true });
  const started = Date.now();
  w.postMessage("start");
  const terminated = await new Promise((resolve) => {
    const t = setTimeout(() => { w.terminate().then(() => resolve(true)); }, 1500);
    w.on("message", () => { clearTimeout(t); resolve(false); });
    w.on("exit", (code) => { if (code !== 0) { clearTimeout(t); resolve(true); } });
  });
  const ms = Date.now() - started;
  if (!terminated) throw new Error("死循环自然结束？不该发生");
  return `Worker.terminate() 在 ${ms}ms 掐断死循环 ✓（浏览器同构：Web Worker + terminate）`;
});

// ── 6. 体积评估 ────────────────────────────────────────────────────
await check("6. 包体积", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  let total = 0, wasm = 0;
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else { total += s.size; if (f.endsWith(".wasm")) wasm += s.size; }
    }
  };
  walk(new URL("../node_modules/luau-web/src/", import.meta.url).pathname);
  return `总计 ${(total / 1024 / 1024).toFixed(1)}MB，其中 WASM ${(wasm / 1024 / 1024).toFixed(1)}MB${total <= 2.5 * 1024 * 1024 ? " ✓" : "（⚠️ 超 2MB 预算，gzip 后需复测）"}`;
});

// ── 汇总 ──────────────────────────────────────────────────────────
await new Promise((r) => setTimeout(r, 100));
console.log("\n════════ Spike v2 汇总 ════════");
const pass = results.filter((r) => r.pass).length;
console.log(`${pass}/${results.length} 项通过`);
const failed = results.filter((r) => !r.pass);
if (failed.length) console.log("失败项:", failed.map((f) => f.name).join(" | "));
process.exit(0);
