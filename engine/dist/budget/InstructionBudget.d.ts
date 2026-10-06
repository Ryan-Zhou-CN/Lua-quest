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
export interface BudgetConfig {
    hardLimit: number;
    softLimit: number;
    softFramesThreshold: number;
    sampleIntervalMs: number;
    enableHardTerminate: boolean;
    enableSoftWarning: boolean;
}
export interface BudgetState {
    currentInstructions: number;
    frameTimeMs: number;
    memoryBytes: number;
    networkBytes: number;
    isSoftOver: boolean;
    isHardOver: boolean;
    consecutiveSoftFrames: number;
    rewardMultiplier: number;
    techDebt: number;
}
export interface FrameMetrics {
    timestamp: number;
    instructions: number;
    frameTimeMs: number;
    memoryBytes: number;
    networkBytes: number;
}
export interface BudgetSnapshot {
    timestamp: number;
    state: BudgetState;
    history: FrameMetrics[];
}
export declare const DEFAULT_BUDGET_CONFIG: BudgetConfig;
export declare class InstructionBudget extends EventEmitter {
    private config;
    private state;
    private history;
    private samplingTimer;
    private frameStartTime;
    private frameInstructionCount;
    private worker;
    private isRunning;
    constructor(config?: Partial<BudgetConfig>);
    private getDefaultState;
    start(): void;
    stop(): void;
    frameStart(): void;
    frameEnd(instructionCount?: number): BudgetState;
    addInstructions(count: number): void;
    private checkBudget;
    private startSampling;
    private sample;
    private recordFrame;
    private getMemoryUsage;
    setNetworkBytes(bytes: number): void;
    addNetworkBytes(bytes: number): void;
    getHistory(): FrameMetrics[];
    getSnapshot(): BudgetSnapshot;
    updateConfig(config: Partial<BudgetConfig>): void;
    getConfig(): BudgetConfig;
    /**
     * 创建用于执行用户代码的 Worker
     * Worker 可被 terminate() 强制终止，实现硬超预算保护
     */
    createExecutionWorker(userCode: string): Worker;
    private wrapUserCode;
    getState(): Readonly<BudgetState>;
    getRewardMultiplier(): number;
    getTechDebt(): number;
    isOverBudget(): boolean;
    getCurrentInstructions(): number;
    getFrameTimeMs(): number;
    reset(): void;
    destroy(): void;
}
export declare function getInstructionBudget(config?: Partial<BudgetConfig>): InstructionBudget;
export declare function setInstructionBudget(budget: InstructionBudget): void;
//# sourceMappingURL=InstructionBudget.d.ts.map