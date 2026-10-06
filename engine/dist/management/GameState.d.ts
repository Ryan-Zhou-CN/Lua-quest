/**
 * GameState.ts — 游戏全局状态管理
 *
 * 职责：
 * - 统一管理游戏全局状态（玩家、经营、技能、设置等）
 * - 提供响应式状态订阅/更新机制
 * - 支持存档/读档（序列化/反序列化）
 * - 状态迁移（版本升级兼容）
 */
import { EventEmitter } from 'events';
export interface PlayerState {
    id: string;
    name: string;
    level: number;
    exp: number;
    stats: {
        health: number;
        maxHealth: number;
        mana: number;
        maxMana: number;
    };
}
export interface ManagementState {
    money: number;
    reputation: number;
    techDebt: number;
    team: TeamMember[];
    eventPool: RandomEvent[];
    currentDay: number;
}
export interface TeamMember {
    id: string;
    name: string;
    role: 'programmer' | 'artist' | 'designer' | 'tester';
    level: number;
    efficiency: number;
    salary: number;
    skills: string[];
}
export interface RandomEvent {
    id: string;
    title: string;
    description: string;
    choices: EventChoice[];
    weight: number;
    cooldownDays: number;
    lastTriggeredDay?: number;
}
export interface EventChoice {
    id: string;
    text: string;
    effects: EventEffect[];
}
export interface EventEffect {
    type: 'money' | 'reputation' | 'techDebt' | 'teamExp' | 'morale';
    value: number;
    durationDays?: number;
}
export interface SkillsState {
    unlocked: string[];
    points: number;
    tree: SkillNode[];
}
export interface SkillNode {
    id: string;
    name: string;
    description: string;
    cost: number;
    prerequisites: string[];
    unlocksApi?: string[];
    category: 'programming' | 'art' | 'design' | 'management' | 'engine';
    tier: number;
}
export interface SettingsState {
    language: 'zh-CN' | 'en-US';
    soundVolume: number;
    musicVolume: number;
    graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
    keybindings: Record<string, string>;
    reducedMotion: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
}
export interface GameSettings {
    player: PlayerState;
    management: ManagementState;
    skills: SkillsState;
    settings: SettingsState;
    version: number;
    lastSavedAt: number;
    playTime: number;
}
export type GameStateKey = keyof GameSettings;
export declare class GameState extends EventEmitter {
    private state;
    private subscribers;
    private migrationFns;
    private autoSaveTimer;
    constructor(initialState?: Partial<GameSettings>);
    private getDefaultState;
    private getDefaultEventPool;
    private getDefaultSkillTree;
    private registerMigrations;
    private migrateState;
    get<K extends GameStateKey>(key: K): GameSettings[K];
    getAll(): Readonly<GameSettings>;
    set<K extends GameStateKey>(key: K, value: GameSettings[K], silent?: boolean): void;
    update<K extends GameStateKey>(key: K, updater: (value: GameSettings[K]) => GameSettings[K]): void;
    subscribe<K extends GameStateKey>(key: K, callback: (value: GameSettings[K]) => void): () => void;
    private notifySubscribers;
    serialize(): string;
    deserialize(json: string): void;
    save(): Promise<void>;
    load(): Promise<void>;
    startAutoSave(intervalMinutes?: number): void;
    stopAutoSave(): void;
    addMoney(amount: number): void;
    addReputation(amount: number): void;
    addTechDebt(amount: number): void;
    advanceDay(): void;
    private triggerRandomEvents;
    unlockSkill(skillId: string): boolean;
    getSkillPoints(): number;
    addSkillPoints(amount: number): void;
    getManagementSummary(): {
        money: number;
        reputation: number;
        techDebt: number;
        teamSize: number;
        monthlyBurn: number;
        runwayDays: number;
    };
    getAvailableSkills(): SkillNode[];
    getSkillTree(): SkillNode[];
    updateSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void;
    private mergeState;
    destroy(): void;
}
export declare function getGameState(): Promise<GameState>;
export declare function setGameState(state: GameState): void;
//# sourceMappingURL=GameState.d.ts.map