/**
 * Game Jam 模块
 * 程序生成主题、约束、评分、排行榜模拟
 */

// ============================================================================
// Game Jam 主题池
// ============================================================================
const JAM_THEMES = [
    { name: '单按钮游戏', desc: '整个游戏只能用一个按钮控制', weight: 1 },
    { name: '10 秒人生', desc: '游戏时长只有 10 秒', weight: 1 },
    { name: '反向操作', desc: '左右反了、上下反了、跳跃变下蹲', weight: 1 },
    { name: '越玩越弱', desc: '升级反而让角色变弱', weight: 1 },
    { name: '合作竞争', desc: '必须合作才能赢，但只能有一个赢家', weight: 1 },
    { name: '颜色盲', desc: '关键信息只用颜色区分', weight: 1 },
    { name: '声音导航', desc: '全程黑屏，只能靠声音定位', weight: 1 },
    { name: '时间循环', desc: '死后保留记忆重来', weight: 1 },
    { name: '生成艺术', desc: '代码生成的视觉/听觉体验', weight: 1 },
    { name: '最小化', desc: '代码行数 < 100 行', weight: 1 },
    { name: '塔防变体', desc: '塔会移动、敌人会建塔', weight: 1 },
    { name: '卡牌自走棋', desc: '买卡、合成、自动战斗', weight: 1 },
    { name: '物理喜剧', desc: '夸张物理参数制造搞笑效果', weight: 1 },
    { name: '叙事分支', desc: '每个选择改变结局', weight: 1 },
    { name: '元游戏', desc: '游戏里玩游戏', weight: 1 },
];

// ============================================================================
// 约束池
// ============================================================================
const JAM_CONSTRAINTS = [
    { name: '无 UI 库', desc: '不能使用现成 UI 库，需手写', penalty: 0.9 },
    { name: '单文件', desc: '所有代码在一个脚本内', penalty: 0.85 },
    { name: '无外部资源', desc: '不能使用外部图片/音频/模型', penalty: 0.9 },
    { name: '60 FPS 硬性要求', desc: '掉帧扣分', penalty: 0.95 },
    { name: '代码 < 500 行', desc: '超行扣分', penalty: 0.8 },
    { name: '必须用并行 Luau', desc: '核心逻辑需并行化', penalty: 0.85 },
    { name: '无全局变量', desc: '严格模块化', penalty: 0.9 },
    { name: '移动端优先', desc: '触屏操作体验优先', penalty: 0.9 },
    { name: '无人类文字', desc: '只用图标/符号/表情', penalty: 0.85 },
    { name: '单色调', desc: '只能用一种颜色 + 黑白', penalty: 0.9 },
];

// ============================================================================
// 评分权重
// ============================================================================
const SCORING_WEIGHTS = {
    creativity: 0.30,      // 创意完成度
    technical: 0.25,       // 技术实现
    polish: 0.20,          // 打磨程度
    theme: 0.15,           // 主题贴合
    constraints: 0.10,     // 约束遵守
};

// ============================================================================
// Game Jam 状态
// ============================================================================
let currentJam = null;
let jamTimer = null;

/**
 * 初始化 Game Jam 系统
 */
export function initGameJam(state, elements) {
    // 绑定周期性检查
    setInterval(() => checkJamSchedule(state), 60000); // 每分钟检查
    
    // 如果有活跃的 Jam，恢复计时器
    if (state.gameJam.active) {
        startJamTimer(state, elements);
    }
}

/**
 * 检查 Game Jam 时间表（周一 00:00 UTC 开始，周三 23:59 结束）
 */
function checkJamSchedule(state) {
    const now = new Date();
    const day = now.getUTCDay(); // 0=周日, 1=周一, 3=周三
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    // 周一 00:00 开始新 Jam
    if (day === 1 && hour === 0 && minute === 0 && !state.gameJam.active) {
        startNewJam(state);
    }
    
    // 周三 23:59 结束
    if (day === 3 && hour === 23 && minute === 59 && state.gameJam.active) {
        endJam(state, false); // 强制结束，不给分
    }
}

/**
 * 开始新的 Game Jam
 */
function startNewJam(state) {
    // 随机选择主题
    const theme = weightedRandom(JAM_THEMES);
    
    // 随机选择 2-4 个约束
    const numConstraints = 2 + Math.floor(Math.random() * 3);
    const constraints = shuffle([...JAM_CONSTRAINTS]).slice(0, numConstraints);
    
    // 计算总时长（72 小时 = 3 天）
    const duration = 72 * 60 * 60; // 秒
    
    state.gameJam = {
        active: true,
        theme: theme.name,
        themeDesc: theme.desc,
        constraints: constraints.map(c => c.name),
        constraintDetails: constraints,
        timeRemaining: duration,
        startTime: Date.now(),
        endTime: Date.now() + duration * 1000,
        score: 0,
        submitted: false,
        seed: generateSeed(), // 用于可复现的程序化内容
    };
    
    console.log('[Game Jam] 新 Jam 开始:', state.gameJam.theme);
    
    // 触发 UI 更新事件
    window.dispatchEvent(new CustomEvent('jam-started', { detail: state.gameJam }));
}

/**
 * 手动开始 Game Jam（用于测试/调试）
 */
export function startJamManually(state) {
    if (state.gameJam.active) {
        return { success: false, message: '已有进行中的 Game Jam' };
    }
    startNewJam(state);
    return { success: true, jam: state.gameJam };
}

/**
 * 启动 Jam 倒计时器
 */
function startJamTimer(state, elements) {
    if (jamTimer) clearInterval(jamTimer);
    
    jamTimer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((state.gameJam.endTime - now) / 1000));
        state.gameJam.timeRemaining = remaining;
        
        // 更新 UI
        const timerEl = document.getElementById('jamTimer');
        if (timerEl) {
            timerEl.textContent = formatTime(remaining);
        }
        
        if (remaining <= 0) {
            endJam(state, true);
        }
    }, 1000);
}

/**
 * 提交 Game Jam 作品
 */
export function submitGameJam(state, elements) {
    if (!state.gameJam.active) {
        return { success: false, message: '没有进行中的 Game Jam' };
    }
    if (state.gameJam.submitted) {
        return { success: false, message: '已经提交过了' };
    }
    
    // 计算分数
    const score = calculateJamScore(state);
    state.gameJam.score = score;
    state.gameJam.submitted = true;
    
    // 发放奖励
    const rewards = calculateRewards(score, state.gameJam.constraintDetails);
    state.money += rewards.money;
    state.xp += rewards.xp;
    state.reputation += rewards.reputation;
    
    // 解锁技能/员工（根据分数）
    if (score >= 250) {
        state.unlockedSkills.push('jam_master');
    }
    if (score >= 200) {
        // 解锁稀有员工
    }
    
    // 结束 Jam
    endJam(state, true);
    
    return { success: true, score, rewards };
}

/**
 * 计算 Jam 分数
 */
function calculateJamScore(state) {
    const code = document.getElementById('codeEditor')?.value || '';
    let score = 50; // 基础分
    
    // 1. 代码量评分 (0-80)
    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length;
    score += Math.min(lines * 0.5, 80);
    
    // 2. API 使用多样性 (0-50)
    const apisUsed = new Set();
    const apiPatterns = [
        'DataStore', 'RemoteEvent', 'RemoteFunction', 'TweenService',
        'PhysicsService', 'RunService', 'UserInputService', 'CollectionService',
        'PathfindingService', 'HttpService', 'MarketplaceService',
        'AlignPosition', 'AlignOrientation', 'VectorForce',
        'task.desynchronize', 'task.synchronize', 'MicroProfiler',
    ];
    apiPatterns.forEach(api => {
        if (code.includes(api)) apisUsed.add(api);
    });
    score += Math.min(apisUsed.size * 5, 50);
    
    // 3. 代码结构评分 (0-40)
    const hasFunctions = /function\s+\w+/.test(code);
    const hasModules = /require\s*\(/.test(code);
    const hasErrorHandling = /pcall|xpcall/.test(code);
    const hasComments = /--[^\n]/.test(code);
    if (hasFunctions) score += 10;
    if (hasModules) score += 10;
    if (hasErrorHandling) score += 10;
    if (hasComments) score += 10;
    
    // 4. 约束遵守检查 (扣分)
    const constraints = state.gameJam.constraintDetails || [];
    constraints.forEach(c => {
        if (c.name === '单文件' && hasModules) score *= c.penalty;
        if (c.name === '代码 < 500 行' && lines > 500) score *= c.penalty;
        if (c.name === '无全局变量' && /_G\.\w+\s*=/.test(code)) score *= c.penalty;
    });
    
    // 5. 随机因素 (模拟评委主观)
    score += Math.floor(Math.random() * 30) - 15;
    
    // 6. 主题贴合度 (简化：检查关键词)
    const themeKeywords = getThemeKeywords(state.gameJam.theme);
    const themeMatches = themeKeywords.filter(kw => code.toLowerCase().includes(kw.toLowerCase())).length;
    score += themeMatches * 5;
    
    return Math.max(0, Math.min(300, Math.round(score)));
}

function getThemeKeywords(theme) {
    const keywords = {
        '单按钮游戏': ['button', 'click', 'tap', 'input'],
        '10 秒人生': ['wait(10)', '10', 'timer', 'countdown'],
        '反向操作': ['invert', 'reverse', '-1', 'opposite'],
        '越玩越弱': ['weaken', 'decrease', 'reduce', 'penalty'],
        '合作竞争': ['team', 'coop', 'betray', 'alliance'],
        '颜色盲': ['color', 'colour', 'rgb', 'hsv'],
        '声音导航': ['sound', 'audio', 'play', 'volume'],
        '时间循环': ['loop', 'reset', 'restart', 'memory'],
        '生成艺术': ['math.random', 'noise', 'generate', 'procedural'],
        '最小化': [],
        '塔防变体': ['tower', 'enemy', 'wave', 'spawn'],
        '卡牌自走棋': ['card', 'deck', 'shop', 'merge'],
        '物理喜剧': ['velocity', 'force', 'ragdoll', 'physics'],
        '叙事分支': ['choice', 'dialogue', 'ending', 'branch'],
        '元游戏': ['game', 'meta', 'simulation'],
    };
    return keywords[theme] || [];
}

/**
 * 计算奖励
 */
function calculateRewards(score, constraints) {
    const baseMoney = Math.round(score * 20);
    const baseXP = Math.round(score * 5);
    const baseRep = Math.round(score * 0.5);
    
    // 约束奖励加成
    let constraintBonus = 1;
    constraints.forEach(c => {
        constraintBonus += (1 - c.penalty) * 0.5; // 约束越严格奖励越高
    });
    
    return {
        money: Math.round(baseMoney * constraintBonus),
        xp: Math.round(baseXP * constraintBonus),
        reputation: Math.round(baseRep * constraintBonus),
    };
}

/**
 * 结束 Game Jam
 */
function endJam(state, submitted) {
    if (jamTimer) {
        clearInterval(jamTimer);
        jamTimer = null;
    }
    
    if (!submitted) {
        // 未提交惩罚
        state.techDebt += 10;
    }
    
    state.gameJam.active = false;
    
    window.dispatchEvent(new CustomEvent('jam-ended', { 
        detail: { score: state.gameJam.score, submitted } 
    }));
}

/**
 * 生成随机种子（用于程序化内容）
 */
function generateSeed() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * 获取当前 Jam 信息
 */
export function getCurrentJam(state) {
    return state.gameJam;
}

/**
 * 获取 Jam 历史记录（模拟）
 */
export function getJamHistory() {
    // 实际应从存储读取
    return [];
}

/**
 * 工具函数
 */
function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
        random -= item.weight || 1;
        if (random <= 0) return item;
    }
    return items[items.length - 1];
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 导出用于测试
export { JAM_THEMES, JAM_CONSTRAINTS, SCORING_WEIGHTS };