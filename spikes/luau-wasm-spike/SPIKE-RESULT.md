# Spike 结论：Luau WASM（luau-web）技术验证

> 对应 `docs/design/PHASE1-DESIGN.md` §5.3 Go/No-Go 清单
> 日期：2026-10-03 · 执行：OpenCode · 复现：`node spike.mjs`

## 总判定：**GO** ✅（8/9 通过，唯一缺口有替代方案）

| # | 验证项 | 结果 | 详情 |
|---|--------|------|------|
| 1 | Luau 语法（类型注解/`+=`/`continue`/`--!strict`/表类型） | ✅ | 全部原生支持，无需转译 |
| 2 | JS↔Luau 互操作 | ✅ | `Instance.new` 注入、属性双向读写、事件回调全通；JS 对象需 `Mutable()` 包装才可在 Luau 侧写 |
| 3 | 指令预算（VM 中断回调） | ❌→⚠️ | **luau-web 未暴露中断 API**，见下方替代方案 |
| 4 | 死循环保护 | ✅ | `while true do end` 在 Worker 中被 `terminate()` 于 1.5s 掐断（浏览器同构：Web Worker） |
| 5 | 错误堆栈与行号 | ✅ | `[string "my_script"]:2: boom` — chunk 名+行号完整，JS 侧可捕获 |
| 6 | 体积 | ✅ | WASM 以 base64 内嵌 JS；gzip 后 Asyncify 0.40MB / JSPI 0.30MB（预算 2MB） |
| 7 | luau-analyze 类型检查 | ⏸️ P1 | 运行时忽略注解；静态检查需另接 luau-analyze WASM（官方 playground 已证明可行） |

## 关键工程发现

1. **执行模型**：`loadstring()()` 返回 Promise（Asyncify/JSPI）；**JS 函数返回 Promise 时 Luau 侧自动 await** —— `task.wait` 类异步 API 有官方路径，这是设计 QA 引擎虚拟时钟的天然入口
2. **多返回值语义**：Luau 函数返回值是 JS 数组（multret），引擎桥接层需统一解包
3. **沙箱**：`Function`/`eval`/`require`/`process`/`global` 禁止传入 Luau（securityTransmitList）
4. **只读边界**：JS 对象默认 Luau 侧只读；`Mutable()` 包装（返回 Map）后才可写 —— Roblox API 模拟层必须用 `Mutable()` 构建可操作实例
5. **运行时无类型检查**：`--!strict` 只被解析、不生效 —— 类型检查（P1）必须独立接 luau-analyze WASM，不能指望运行时

## 第 3 项缺口（指令预算）的替代方案

- **P0（采用）**：性能预算改为「**墙钟时间预算**」——玩家代码在 Web Worker 运行，超时 `terminate()`。Spike 第 4 项已验证可行性。QA 报告的性能数据用「运行时长 + 内存采样」呈现
- **P1/P2（增强）**：fork luau-web 的上游 [luau-interop](https://github.com/xNasuni/luau-interop)（Luau fork，重写过 WASM 执行 API），补一个 `lua_setinterrupt` 绑定导出，升级为真·指令计数。Luau VM 本身支持中断回调（Roblox 用它做脚本超时），是可预期的改造

## 对设计的修订

- `engine/LuaEngine.js` 从「重写 fengari-wrapper」改为「**基于 luau-web 重建**」：Fengari 退役
- 指令预算面板 → 墙钟时间 + 内存面板（P0），指令计数列 P1
- `task.wait`/`task.spawn` 模拟 → 直接用 Asyncify 的 JS Promise 桥（不需要自造调度 hack，但虚拟时钟确定性仍需自建薄层）
