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
// ============================================
// 状态管理类
// ============================================
export class GameState extends EventEmitter {
    state;
    subscribers = new Map();
    migrationFns = new Map();
    autoSaveTimer = null;
    constructor(initialState) {
        super();
        this.state = this.getDefaultState();
        if (initialState) {
            this.state = this.mergeState(this.state, initialState);
        }
        this.registerMigrations();
    }
    // ============================================
    // 初始化与默认值
    // ============================================
    getDefaultState() {
        return {
            version: 1,
            lastSavedAt: Date.now(),
            playTime: 0,
            player: {
                id: 'player_1',
                name: '开发者',
                level: 1,
                exp: 0,
                stats: {
                    health: 100,
                    maxHealth: 100,
                    mana: 50,
                    maxMana: 50,
                },
            },
            management: {
                money: 10000,
                reputation: 100,
                techDebt: 0,
                team: [
                    {
                        id: 'dev_1',
                        name: '主程序员',
                        role: 'programmer',
                        level: 3,
                        efficiency: 1.2,
                        salary: 5000,
                        skills: ['luau', 'architecture', 'optimization'],
                    },
                    {
                        id: 'artist_1',
                        name: '美术主管',
                        role: 'artist',
                        level: 2,
                        efficiency: 1.0,
                        salary: 4000,
                        skills: ['ui', 'icon', 'animation'],
                    },
                ],
                eventPool: this.getDefaultEventPool(),
                currentDay: 1,
            },
            skills: {
                unlocked: ['luau_basics'],
                points: 0,
                tree: this.getDefaultSkillTree(),
            },
            settings: {
                language: 'zh-CN',
                soundVolume: 0.8,
                musicVolume: 0.6,
                graphicsQuality: 'high',
                keybindings: {
                    'save': 'Ctrl+S',
                    'run': 'Ctrl+Enter',
                    'test': 'Ctrl+T',
                    'pause': 'Escape',
                },
                reducedMotion: false,
                autoSave: true,
                autoSaveInterval: 5,
            },
        };
    }
    getDefaultEventPool() {
        return [
            {
                id: 'bug_outbreak',
                title: 'Bug 爆发',
                description: '代码库中突然爆发大量 Bug，需要紧急修复。',
                weight: 30,
                cooldownDays: 7,
                choices: [
                    {
                        id: 'fix_now',
                        text: '全员加班修复',
                        effects: [
                            { type: 'money', value: -2000 },
                            { type: 'techDebt', value: -10 },
                            { type: 'teamExp', value: 50 },
                        ],
                    },
                    {
                        id: 'delay_fix',
                        text: '下个版本再修',
                        effects: [
                            { type: 'techDebt', value: 20 },
                            { type: 'reputation', value: -5 },
                        ],
                    },
                ],
            },
            {
                id: 'investor_visit',
                title: '投资人来访',
                description: '投资人突击检查项目进度，准备演示。',
                weight: 15,
                cooldownDays: 14,
                choices: [
                    {
                        id: 'polish_demo',
                        text: '连夜打磨 Demo',
                        effects: [
                            { type: 'money', value: -1000 },
                            { type: 'reputation', value: 20 },
                        ],
                    },
                    {
                        id: 'honest_report',
                        text: '如实汇报',
                        effects: [
                            { type: 'reputation', value: 10 },
                            { type: 'techDebt', value: -5 },
                        ],
                    },
                ],
            },
            {
                id: 'team_building',
                title: '团建活动',
                description: '团队士气低落，需要组织团建提振士气。',
                weight: 20,
                cooldownDays: 10,
                choices: [
                    {
                        id: 'team_dinner',
                        text: '聚餐聚餐',
                        effects: [
                            { type: 'money', value: -1500 },
                            { type: 'morale', value: 20 },
                        ],
                    },
                    {
                        id: 'hackathon',
                        text: '内部 Hackathon',
                        effects: [
                            { type: 'money', value: -3000 },
                            { type: 'teamExp', value: 200 },
                        ],
                    },
                ],
            },
            {
                id: 'bug_bounty',
                title: '悬赏 Bug',
                description: '社区发现严重 Bug，开启悬赏计划。',
                weight: 10,
                cooldownDays: 21,
                choices: [
                    {
                        id: 'high_bounty',
                        text: '高额悬赏',
                        effects: [
                            { type: 'money', value: -5000 },
                            { type: 'techDebt', value: -30 },
                        ],
                    },
                    {
                        id: 'low_bounty',
                        text: '象征性奖励',
                        effects: [
                            { type: 'money', value: -500 },
                            { type: 'techDebt', value: -5 },
                        ],
                    },
                ],
            },
        ];
    }
    getDefaultSkillTree() {
        return [
            // 编程分支
            { id: 'luau_basics', name: 'Luau 基础', description: '掌握 Luau 基础语法', cost: 0, prerequisites: [], category: 'programming', tier: 1 },
            { id: 'luau_oop', name: 'Luau 面向对象', description: '掌握元表、继承、组合', cost: 100, prerequisites: ['luau_basics'], category: 'programming', tier: 2 },
            { id: 'luau_async', name: '异步编程', description: 'Promise、Asyncify、task 库', cost: 200, prerequisites: ['luau_oop'], category: 'programming', tier: 3 },
            { id: 'luau_optimization', name: '性能优化', description: '指令预算、内存管理、JIT', cost: 500, prerequisites: ['luau_async'], category: 'engine', tier: 4 },
            // 美术分支
            { id: 'ui_basics', name: 'UI 基础', description: 'ScreenGui、Frame、布局系统', cost: 50, prerequisites: [], category: 'art', tier: 1 },
            { id: 'animation', name: '动画系统', description: 'AnimationTrack、Tween、状态机', cost: 150, prerequisites: ['ui_basics'], category: 'art', tier: 2 },
            { id: 'vfx', name: '特效系统', description: '粒子、Shader、后处理', cost: 300, prerequisites: ['animation'], category: 'art', tier: 3 },
            // 设计分支
            { id: 'game_design', name: '游戏设计基础', description: '核心循环、数值策划', cost: 50, prerequisites: [], category: 'design', tier: 1 },
            { id: 'system_design', name: '系统设计', description: '架构模式、数据驱动、ECS', cost: 200, prerequisites: ['game_design'], category: 'design', tier: 2 },
            { id: 'liveops_design', name: '运营设计', description: 'A/B 测试、埋点、伦理变现', cost: 300, prerequisites: ['system_design'], category: 'design', tier: 3 },
            // 管理分支
            { id: 'project_mgmt', name: '项目管理', description: '敏捷、看板、里程碑', cost: 100, prerequisites: [], category: 'management', tier: 1 },
            { id: 'team_lead', name: '团队管理', description: '招聘、绩效、薪资、士气', cost: 300, prerequisites: ['project_mgmt'], category: 'management', tier: 2 },
            { id: 'liveops_mgmt', name: '运营运营', description: 'A/B 测试、活动管道、灰度发布', cost: 500, prerequisites: ['team_lead'], category: 'management', tier: 3 },
            // 引擎分支
            { id: 'engine_arch', name: '引擎架构', description: '模块化、依赖注入、热更', cost: 300, prerequisites: ['luau_oop'], category: 'engine', tier: 3 },
            { id: 'network', name: '网络同步', description: 'RemoteEvent、预测回滚、权威服务端', cost: 500, prerequisites: ['luau_async'], category: 'engine', tier: 4 },
        ];
    }
    // ============================================
    // 状态迁移
    // ============================================
    registerMigrations() {
        this.migrationFns.set(1, (state) => {
            // v1 -> v2: 添加 playTime 字段
            return {
                ...state,
                playTime: state.playTime || 0,
            };
        });
    }
    migrateState(state) {
        let currentVersion = state.version || 1;
        let migrated = { ...state };
        while (currentVersion < this.getDefaultState().version) {
            const migration = this.migrationFns.get(currentVersion);
            if (migration) {
                migrated = migration(migrated);
            }
            currentVersion++;
        }
        return migrated;
    }
    // ============================================
    // 状态访问与更新
    // ============================================
    get(key) {
        return this.state[key];
    }
    getAll() {
        return { ...this.state };
    }
    set(key, value, silent = false) {
        const oldValue = this.state[key];
        this.state = { ...this.state, [key]: value };
        this.state.lastSavedAt = Date.now();
        if (!silent) {
            this.emit('change', key, value, this.state[key]);
            this.notifySubscribers(key, value);
        }
    }
    update(key, updater) {
        const newValue = updater(this.state[key]);
        this.set(key, newValue);
    }
    // 订阅机制
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        // 返回取消订阅函数
        return () => {
            this.subscribers.get(key)?.delete(callback);
        };
    }
    notifySubscribers(key, value) {
        const subs = this.subscribers.get(key);
        if (subs) {
            subs.forEach(cb => {
                try {
                    cb(value);
                }
                catch (e) {
                    console.error(`Subscriber error for ${key}:`, e);
                }
            });
        }
    }
    // ============================================
    // 存档与读档
    // ============================================
    serialize() {
        return JSON.stringify(this.state, null, 2);
    }
    deserialize(json) {
        const parsed = JSON.parse(json);
        const migrated = this.migrateState(parsed);
        this.state = migrated;
        this.state.lastSavedAt = Date.now();
        this.emit('load', this.state);
        // 通知所有订阅者
        Object.keys(this.state).forEach(key => {
            this.notifySubscribers(key, this.state[key]);
        });
    }
    async save() {
        this.state.lastSavedAt = Date.now();
        const data = this.serialize();
        await this.emit('save', this.state);
    }
    async load() {
        const data = await this.emit('load');
        if (data && typeof data === 'string') {
            this.deserialize(data);
        }
    }
    // ============================================
    // 自动保存
    // ============================================
    startAutoSave(intervalMinutes = 5) {
        if (this.autoSaveTimer)
            return;
        this.autoSaveTimer = setInterval(() => {
            this.save().catch(e => console.error('Auto-save failed:', e));
        }, 1000 * 60 * intervalMinutes);
    }
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
    // ============================================
    // 经营相关便利方法
    // ============================================
    addMoney(amount) {
        this.update('management', m => ({
            ...m,
            money: Math.max(0, m.money + amount),
        }));
    }
    addReputation(amount) {
        this.update('management', m => ({
            ...m,
            reputation: Math.max(0, Math.min(1000, m.reputation + amount)),
        }));
    }
    addTechDebt(amount) {
        this.update('management', m => ({
            ...m,
            techDebt: Math.max(0, m.techDebt + amount),
        }));
    }
    advanceDay() {
        this.update('management', m => {
            const newDay = m.currentDay + 1;
            // 扣除每日维护费
            const dailyCost = m.team.reduce((sum, tm) => sum + tm.salary, 0) * 0.1;
            const newMoney = Math.max(0, m.money - dailyCost);
            // 触发随机事件
            const events = this.triggerRandomEvents();
            return {
                ...m,
                currentDay: m.currentDay + 1,
                money: newMoney,
                eventPool: events,
            };
        });
    }
    triggerRandomEvents() {
        const pool = this.state.management.eventPool;
        const today = this.state.management.currentDay;
        const triggered = [];
        for (const event of pool) {
            if (event.lastTriggeredDay && today - event.lastTriggeredDay < event.cooldownDays)
                continue;
            if (Math.random() * 100 < event.weight) {
                event.lastTriggeredDay = this.state.management.currentDay;
                triggered.push(event);
            }
        }
        return triggered;
    }
    // ============================================
    // 技能树操作
    // ============================================
    unlockSkill(skillId) {
        const skill = this.state.skills.tree.find(s => s.id === skillId);
        if (!skill)
            return false;
        // 检查前置条件
        if (!skill.prerequisites.every(p => this.state.skills.unlocked.includes(p))) {
            return false;
        }
        // 检查技能点
        if (this.state.skills.points < skill.cost) {
            return false;
        }
        this.update('skills', s => ({
            ...s,
            points: s.points - skill.cost,
            unlocked: [...s.unlocked, skillId],
        }));
        // 触发解锁事件
        this.emit('skillUnlocked', skill);
        return true;
    }
    getSkillPoints() {
        return this.state.skills.points;
    }
    addSkillPoints(amount) {
        this.update('skills', s => ({
            ...s,
            points: s.points + amount,
        }));
    }
    // ============================================
    // 经营状态查询
    // ============================================
    getManagementSummary() {
        const m = this.state.management;
        const monthlyBurn = m.team.reduce((sum, tm) => sum + tm.salary, 0);
        return {
            money: m.money,
            reputation: m.reputation,
            techDebt: m.techDebt,
            teamSize: m.team.length,
            monthlyBurn,
            runwayDays: m.money / (monthlyBurn / 30) || Infinity,
        };
    }
    // ============================================
    // 技能树查询
    // ============================================
    getAvailableSkills() {
        const unlocked = new Set(this.state.skills.unlocked);
        return this.state.skills.tree.filter(skill => {
            if (unlocked.has(skill.id))
                return false;
            return skill.prerequisites.every(p => unlocked.has(p));
        });
    }
    getSkillTree() {
        return this.state.skills.tree;
    }
    // ============================================
    // 设置操作
    // ============================================
    updateSetting(key, value) {
        this.update('settings', s => ({ ...s, [key]: value }));
    }
    // ============================================
    // 工具方法
    // ============================================
    mergeState(base, incoming) {
        const merged = { ...base };
        for (const key of Object.keys(incoming)) {
            const incomingValue = incoming[key];
            if (incomingValue !== undefined) {
                if (typeof incomingValue === 'object' && !Array.isArray(incomingValue) && incomingValue !== null) {
                    merged[key] = { ...base[key], ...incomingValue };
                }
                else {
                    merged[key] = incomingValue;
                }
            }
        }
        return merged;
    }
    // ============================================
    // 生命周期
    // ============================================
    destroy() {
        this.stopAutoSave();
        this.removeAllListeners();
        this.subscribers.clear();
    }
}
// ============================================
// 单例导出（可选）
// ============================================
let globalGameState = null;
export async function getGameState() {
    if (!globalGameState) {
        globalGameState = new GameState();
        await globalGameState.load();
        globalGameState.startAutoSave(5);
    }
    return globalGameState;
}
export function setGameState(state) {
    globalGameState = state;
}
//# sourceMappingURL=GameState.js.map