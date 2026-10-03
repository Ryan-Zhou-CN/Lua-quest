/** 死循环 worker —— 模拟「玩家代码卡死」场景，主线程用 terminate 掐断 */
import { parentPort } from "node:worker_threads";
import { LuauState } from "luau-web";

const state = await LuauState.createAsync({});
parentPort.on("message", async (msg) => {
  if (msg === "start") {
    try {
      // 故意死循环 —— 验证 terminate 兜底
      const fn = state.loadstring(`while true do end`, "loop_test", true);
      await fn();
      parentPort.postMessage("finished"); // 不该走到这
    } catch (e) {
      process.exit(1);
    }
  }
});
