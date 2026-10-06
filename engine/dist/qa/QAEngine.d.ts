/**
 * QAEngine.ts — QA 引擎
 *
 * 职责：
 * - 管理机器人玩家行为模型
 * - 执行 QA 测试（自动化测试、回归测试）
 * - 生成 QA 报告（复现步骤、堆栈、性能数据、严重等级）
 * - 集成指令预算、内存检测
 * - 虚拟时钟调度器（确定性回放）
 */
import { EventEmitter } from 'events';
export interface BotConfig {
    id: string;
    name: string;
    skill: 'beginner' | 'normal' | 'expert';
    behaviorTree: BehaviorNode;
    latencyMs: number;
}
export interface BehaviorNode {
    type: 'selector' | 'sequence' | 'action' | 'condition';
    children?: BehaviorNode[];
    action?: string;
    params?: Record<string, any>;
    condition?: (state: BotState) => boolean;
}
export interface BotState {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    health: number;
    maxHealth: number;
    inventory: Map<string, number>;
    target?: string;
    state: 'idle' | 'move' | 'attack' | 'flee' | 'interact';
    lastActionTime: number;
    stuckTimer: number;
}
export interface QAContract {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: AcceptanceCriterion[];
    nonFunctionalRequirements: NonFunctionalRequirement[];
    budget: {
        money: number;
        timeDays: number;
        reputation: number;
    };
    requiredSkills: string[];
    qaConfig: QAConfig;
}
export interface AcceptanceCriterion {
    id: string;
    description: string;
    type: 'functional' | 'performance' | 'quality' | 'architecture' | 'security';
    priority: 'P0' | 'P1' | 'P2';
    test: (state: any) => Promise<{
        passed: boolean;
        details?: string;
    }>;
}
export interface NonFunctionalRequirement {
    id: string;
    description: string;
    type: 'performance' | 'quality' | 'architecture' | 'security';
    metric: string;
    threshold: number;
    operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
}
export interface QAConfig {
    botPlayers: number;
    playDurationSec: number;
    scenarios: string[];
    skillLevel: 'beginner' | 'normal' | 'expert';
    injectBugs: BugInjection[];
    seed?: number;
}
export interface BugInjection {
    type: 'null_pointer' | 'race_condition' | 'memory_leak' | 'performance_spike' | 'security_vuln' | 'state_machine_deadlock';
    triggerCondition: (state: any) => boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface QAReport {
    reportId: string;
    contractId: string;
    seed: number;
    botConfig: BotConfig[];
    durationSec: number;
    verdict: 'PASS' | 'FAIL';
    severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    findings: Finding[];
    performanceSummary: PerformanceSummary;
    passedCriteria: string[];
    failedCriteria: string[];
}
export interface Finding {
    id: string;
    title: string;
    type: 'BUG' | 'PERFORMANCE' | 'SECURITY' | 'MEMORY_LEAK' | 'RACE_CONDITION' | 'STATE_DEADLOCK';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reproSteps: string[];
    stackTrace?: string;
    metrics?: Record<string, number>;
    suggestedFix?: string;
}
export interface PerformanceSummary {
    avgFrameTimeMs: number;
    maxFrameTimeMs: number;
    instructionCountPeak: number;
    memoryPeakMB: number;
    networkKbps: number;
    avgInstructionsPerFrame: number;
}
export interface BotMetrics {
    botId: string;
    actionsPerMinute: number;
    successRate: number;
    averageLatencyMs: number;
    errors: number;
}
interface QARun {
    id: string;
    contractId: string;
    startTime: number;
    endTime?: number;
    seed: number;
    status: 'running' | 'completed' | 'failed';
    bots: Array<{
        id: string;
        config: any;
    }>;
    findings: any[];
    metrics: any[];
}
export declare class QAEngine extends EventEmitter {
    private bots;
    private currentContract;
    private currentRun;
    private virtualClock;
    private isRunningFlag;
    constructor();
    /**
     * 运行 QA 合约
     */
    runContract(contract: QAContract): Promise<QAReport>;
    private runSimulation;
    private injectBugs;
    private generateReport;
    private collectFindings;
    private collectPerformanceSummary;
    private calculateOverallSeverity;
    private createBotConfig;
    private getDefaultBehaviorTree;
    getCurrentRun(): QARun | null;
    getBots(): Map<string, BotController>;
    isRunning(): boolean;
    stop(): void;
}
export declare class VirtualClock {
    private currentTime;
    private timeScale;
    private paused;
    private subscribers;
    constructor(initialTime?: number);
    getTime(): number;
    setTime(time: number): void;
    tick(deltaMs: number): void;
    advance(deltaMs: number): void;
    setTimeScale(scale: number): void;
    getTimeScale(): number;
    pause(): void;
    resume(): void;
    isPaused(): boolean;
    subscribe(callback: (time: number) => void): () => void;
    private notifySubscribers;
    getState(): {
        time: number;
        scale: number;
        paused: boolean;
    };
    setState(state: {
        time: number;
        scale: number;
        paused: boolean;
    }): void;
}
declare class BotController {
    private id;
    private contractId;
    private config;
    private state;
    private behaviorTree;
    constructor(contractId: string, index: number, qaConfig: QAConfig);
    private getDefaultBehaviorTree;
    tick(currentTime: number): Promise<void>;
    getState(): BotState;
}
export default QAEngine;
//# sourceMappingURL=QAEngine.d.ts.map