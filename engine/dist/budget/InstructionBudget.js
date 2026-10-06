/**
 * InstructionBudget.ts — 指令预算引擎
 *
 * 职责：
 * - 管理 Luau 代码执行的指令预算
 * - 软超预算警告、硬超强制终止
 * - Worker 墙钟超时终止（P0 方案）
 * - 指令计数采样与统计
 * - 性能面板数据源
 */
import { EventEmitter } from 'events';
// ============================================
// 默认配置
// ============================================
export const DEFAULT_BUDGET_CONFIG = {
    // 硬预算：每帧 1,000,000 指令（约 16ms @ 60M instr/s）
    hardLimit: 1_000_000,
    // 软预算：80% 硬预算
    softLimit: 800_000,
    // 连续 3 帧软超触发惩罚
    softFramesThreshold: 3,
    // 采样间隔 100ms
    sampleIntervalMs: 100,
    enableHardTerminate: true,
    enableSoftWarning: true,
};
// ============================================
// 指令预算引擎
// ============================================
export class InstructionBudget extends EventEmitter {
    config;
    state;
    history = [];
    samplingTimer = null;
    frameStartTime = 0;
    frameInstructionCount = 0;
    worker = null;
    isRunning = false;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
        this.state = this.getDefaultState();
    }
    getDefaultState() {
        return {
            currentInstructions: 0,
            frameTimeMs: 0,
            memoryBytes: 0,
            networkBytes: 0,
            isSoftOver: false,
            isHardOver: false,
            consecutiveSoftFrames: 0,
            rewardMultiplier: 1.0,
            techDebt: 0,
        };
    }
    // ============================================
    // 生命周期
    // ============================================
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.startSampling();
    }
    stop() {
        this.isRunning = false;
        if (this.samplingTimer) {
            clearInterval(this.samplingTimer);
            this.samplingTimer = null;
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
    // ============================================
    // 帧追踪
    // ============================================
    frameStart() {
        this.frameStartTime = performance.now();
        this.frameInstructionCount = 0;
    }
    frameEnd(instructionCount = 0) {
        const frameTimeMs = performance.now() - this.frameStartTime;
        const instructions = instructionCount || this.frameInstructionCount;
        // 更新状态
        this.state.currentInstructions = instructions;
        this.state.frameTimeMs = frameTimeMs;
        // 检查预算
        this.checkBudget();
        // 记录历史
        this.recordFrame();
        return { ...this.state };
    }
    // 供外部调用：手动增加指令计数
    addInstructions(count) {
        this.frameInstructionCount += count;
    }
    // ============================================
    // 预算检查
    // ============================================
    checkBudget() {
        const { hardLimit, softLimit, softFramesThreshold, enableHardTerminate, enableSoftWarning } = this.config;
        const instructions = this.state.currentInstructions;
        // 硬超检查
        const wasHardOver = this.state.isHardOver;
        this.state.isHardOver = instructions > this.config.hardLimit;
        if (this.state.isHardOver && !wasHardOver && this.config.enableHardTerminate) {
            this.emit('hardOver', {
                instructions: this.state.currentInstructions,
                limit: this.config.hardLimit,
            });
            this.emit('terminate', { reason: 'hard_budget_exceeded' });
        }
        // 软超检查
        const isSoftOver = this.state.currentInstructions > this.config.softLimit;
        this.state.isSoftOver = isSoftOver;
        if (isSoftOver) {
            this.state.consecutiveSoftFrames++;
            if (this.state.consecutiveSoftFrames >= this.config.softFramesThreshold) {
                // 连续软超，降低奖励乘数
                this.state.rewardMultiplier = Math.max(0.1, this.state.rewardMultiplier * 0.9);
                this.state.techDebt += 5;
                this.emit('softOverPenalty', {
                    consecutiveFrames: this.state.consecutiveSoftFrames,
                    rewardMultiplier: this.state.rewardMultiplier,
                    techDebt: this.state.techDebt,
                });
            }
        }
        else {
            // 恢复
            if (this.state.consecutiveSoftFrames > 0) {
                this.state.consecutiveSoftFrames = Math.max(0, this.state.consecutiveSoftFrames - 1);
                if (this.state.consecutiveSoftFrames === 0) {
                    // 恢复奖励乘数
                    this.state.rewardMultiplier = Math.min(1.0, this.state.rewardMultiplier * 1.1);
                }
            }
        }
        this.state.isSoftOver = isSoftOver;
    }
    // ============================================
    // 采样与历史
    // ============================================
    startSampling() {
        if (this.samplingTimer)
            return;
        this.samplingTimer = setInterval(() => {
            if (!this.isRunning)
                return;
            this.sample();
        }, this.config.sampleIntervalMs);
    }
    sample() {
        // 从 Luau VM 获取指标（如果可用）
        const metrics = {
            timestamp: Date.now(),
            instructions: this.state.currentInstructions,
            frameTimeMs: this.state.frameTimeMs,
            memoryBytes: this.getMemoryUsage(),
            networkBytes: this.state.networkBytes,
        };
        this.history.push(metrics);
        // 保留最近 600 帧（10分钟 @ 100ms 采样）
        if (this.history.length > 600) {
            this.history.shift();
        }
        // 触发采样事件
        this.emit('sample', {
            timestamp: metrics.timestamp,
            state: { ...this.state },
            metrics,
        });
    }
    recordFrame() {
        const metrics = {
            timestamp: Date.now(),
            instructions: this.state.currentInstructions,
            frameTimeMs: this.state.frameTimeMs,
            memoryBytes: this.getMemoryUsage(),
            networkBytes: this.state.networkBytes,
        };
        this.history.push(metrics);
        if (this.history.length > 600) {
            this.history.shift();
        }
    }
    // ============================================
    // 内存与网络统计
    // ============================================
    getMemoryUsage() {
        // 如果可用，使用 performance.memory
        if (typeof performance !== 'undefined' && performance.memory) {
            const mem = performance.memory;
            return mem.usedJSHeapSize || 0;
        }
        return 0;
    }
    setNetworkBytes(bytes) {
        this.state.networkBytes = bytes;
    }
    addNetworkBytes(bytes) {
        this.state.networkBytes += bytes;
    }
    // ============================================
    // 历史与快照
    // ============================================
    getHistory() {
        return [...this.history];
    }
    getSnapshot() {
        return {
            timestamp: Date.now(),
            state: { ...this.state },
            history: [...this.history],
        };
    }
    // ============================================
    // 配置更新
    // ============================================
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    // ============================================
    // Worker 终止支持（P0 方案）
    // ============================================
    /**
     * 创建用于执行用户代码的 Worker
     * Worker 可被 terminate() 强制终止，实现硬超预算保护
     */
    createExecutionWorker(userCode) {
        // 创建包含用户代码的 Blob
        const wrappedCode = this.wrapUserCode(userCode);
        const workerCode = `
      // 用户代码
      ${wrappedCode}

      // 导出执行函数
      self.onmessage = async (e) => {
        const { code, args } = e.data;
        try {
          const fn = new Function(...args.map((_, i) => \`arg\${i}\`), code);
          const result = await fn(...args);
          self.postMessage({ success: true, result });
        } catch (e) {
          self.postMessage({ success: false, error: e.message, stack: e.stack });
        }
      };
    `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        // 设置超时终止
        const timeout = setTimeout(() => {
            worker.terminate();
            this.emit('workerTimeout', { reason: 'execution_timeout' });
        }, 100); // 100ms 硬超时
        const originalOnMessage = worker.onmessage;
        worker.onmessage = (e) => {
            clearTimeout(timeout);
            if (e.data.success) {
                // 成功
            }
            else {
                this.emit('executionError', e.data.error);
            }
        };
        worker.onerror = (e) => {
            clearTimeout(timeout);
            this.emit('workerError', e);
        };
        return worker;
    }
    // 包装用户代码，注入指令计数
    wrapUserCode(userCode) {
        return `
      // 指令计数器
      let __instructionCount = 0;
      const __originalRequire = require;
      const __originalSetTimeout = setTimeout;
      const __originalSetInterval = setInterval;
      
      // 简单指令计数：拦截函数调用
      const __originalApply = Function.prototype.apply;
      Function.prototype.apply = function(...args) {
        __instructionCount++;
        return __originalApply.apply(this, args);
      };
      
      try {
        ${userCode}
      } finally {
        // 恢复
        Function.prototype.apply = __originalApply;
        setTimeout = __originalSetTimeout;
        setInterval = __originalSetInterval;
      }
    `;
    }
    // ============================================
    // 状态查询
    // ============================================
    getState() {
        return { ...this.state };
    }
    getRewardMultiplier() {
        return this.state.rewardMultiplier;
    }
    getTechDebt() {
        return this.state.techDebt;
    }
    isOverBudget() {
        return this.state.isHardOver || this.state.isSoftOver;
    }
    getCurrentInstructions() {
        return this.state.currentInstructions;
    }
    getFrameTimeMs() {
        return this.state.frameTimeMs;
    }
    // ============================================
    // 重置
    // ============================================
    reset() {
        this.state = this.getDefaultState();
        this.history = [];
        this.frameInstructionCount = 0;
        this.frameStartTime = 0;
    }
    // ============================================
    // 清理
    // ============================================
    destroy() {
        this.stop();
        this.removeAllListeners();
    }
}
// ============================================
// 单例导出
// ============================================
let globalBudget = null;
export function getInstructionBudget(config) {
    if (!globalBudget) {
        globalBudget = new InstructionBudget(config);
    }
    return globalBudget;
}
export function setInstructionBudget(budget) {
    globalBudget = budget;
}
//# sourceMappingURL=InstructionBudget.js.map