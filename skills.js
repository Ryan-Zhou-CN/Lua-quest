/**
 * 技能树模块
 * 定义技能节点、依赖关系、解锁条件、效果
 */

// ============================================================================
// 技能定义
// ============================================================================
const skills = {
    // === 编程基础分支 ===
    'basics_1': {
        id: 'basics_1',
        name: '变量与数据类型',
        desc: '掌握 Luau 变量声明、基本类型、类型注解',
        branch: 'programming',
        tier: 1,
        cost: 1,
        requires: [],
        effects: { xpBonus: 0.05 }, // 经验加成 5%
        icon: '📝',
    },
    'basics_2': {
        id: 'basics_2',
        name: '控制流',
        desc: 'if/else、for/while 循环、break/continue、三元运算符',
        branch: 'programming',
        tier: 1,
        cost: 1,
        requires: ['basics_1'],
        effects: { codeSpeed: 0.1 }, // 代码编写速度 +10%
        icon: '🔀',
    },
    'basics_3': {
        id: 'basics_3',
        name: '函数与闭包',
        desc: '函数定义、多返回值、匿名函数、闭包、尾调用',
        branch: 'programming',
        tier: 2,
        cost: 2,
        requires: ['basics_2'],
        effects: { modCostReduction: 0.1 }, // 模块开销 -10%
        icon: '📦',
    },
    'basics_4': {
        id: 'basics_4',
        name: '表与元表',
        desc: '数组/字典、元方法、__index/__newindex、面向对象模拟',
        branch: 'programming',
        tier: 2,
        cost: 2,
        requires: ['basics_3'],
        effects: { memoryEfficiency: 0.15 },
        icon: '🗂️',
    },
    'basics_5': {
        id: 'basics_5',
        name: '协程与异步',
        desc: 'coroutine.create/resume/yield、task 库、并行 Luau',
        branch: 'programming',
        tier: 3,
        cost: 3,
        requires: ['basics_4'],
        effects: { parallelEfficiency: 0.2 },
        icon: '🧵',
    },
    
    // === Roblox API 分支 ===
    'api_instances': {
        id: 'api_instances',
        name: '实例操作大师',
        desc: '创建、查找、销毁、克隆、属性、属性监听',
        branch: 'api',
        tier: 1,
        cost: 1,
        requires: [],
        effects: { instanceSpeed: 0.2 },
        icon: '🧱',
    },
    'api_events': {
        id: 'api_events',
        name: '事件系统专家',
        desc: 'RBXScriptSignal、Connect/Wait/Once、自定义事件、解绑管理',
        branch: 'api',
        tier: 1,
        cost: 1,
        requires: ['api_instances'],
        effects: { eventEfficiency: 0.15 },
        icon: '⚡',
    },
    'api_datastore': {
        id: 'api_datastore',
        name: '数据持久化架构师',
        desc: 'DataStore、UpdateAsync、版本迁移、错误重试、有序数据',
        branch: 'api',
        tier: 2,
        cost: 2,
        requires: ['api_events'],
        effects: { dataReliability: 0.3 },
        icon: '💾',
    },
    'api_network': {
        id: 'api_network',
        name: '网络通信专家',
        desc: 'RemoteEvent/Function、客户端服务端模型、防作弊、延迟补偿',
        branch: 'api',
        tier: 2,
        cost: 2,
        requires: ['api_events'],
        effects: { networkSecurity: 0.25 },
        icon: '🌐',
    },
    'api_ui': {
        id: 'api_ui',
        name: 'UI/UX 设计师',
        desc: 'ScreenGui、布局系统、响应式、动画、输入处理、无障碍',
        branch: 'api',
        tier: 2,
        cost: 2,
        requires: ['api_instances'],
        effects: { uiPolish: 0.2 },
        icon: '🎨',
    },
    'api_physics': {
        id: 'api_physics',
        name: '物理引擎调教师',
        desc: '碰撞组、约束、BodyMover 迁移、射线检测、自定义移动',
        branch: 'api',
        tier: 3,
        cost: 3,
        requires: ['api_instances', 'api_network'],
        effects: { physicsFeel: 0.3 },
        icon: '⚙️',
    },
    'api_animation': {
        id: 'api_animation',
        name: '动画状态机大师',
        desc: 'AnimationTrack、状态机、取消/过渡、事件、服务端同步',
        branch: 'api',
        tier: 3,
        cost: 3,
        requires: ['api_ui'],
        effects: { animationQuality: 0.25 },
        icon: '🕺',
    },
    
    // === 工程进阶分支 ===
    'eng_architecture': {
        id: 'eng_architecture',
        name: '模块化架构师',
        desc: '单一职责、依赖注入、服务定位器、事件总线、模块热更',
        branch: 'engineering',
        tier: 2,
        cost: 3,
        requires: ['basics_4', 'api_datastore'],
        effects: { techDebtReduction: 0.3 },
        icon: '🏗️',
    },
    'eng_testing': {
        id: 'eng_testing',
        name: '测试驱动开发',
        desc: '单元测试、集成测试、Mock/Stub、CI/CD 流水线、覆盖率',
        branch: 'engineering',
        tier: 2,
        cost: 2,
        requires: ['eng_architecture'],
        effects: { bugReduction: 0.4 },
        icon: '🧪',
    },
    'eng_performance': {
        id: 'eng_performance',
        name: '性能优化大师',
        desc: 'MicroProfiler、内存分析、对象池、空间划分、GC 调优、并行化',
        branch: 'engineering',
        tier: 3,
        cost: 3,
        requires: ['eng_architecture', 'basics_5'],
        effects: { performanceGain: 0.5 },
        icon: '📊',
    },
    'eng_security': {
        id: 'eng_security',
        name: '安全加固专家',
        desc: '服务端验证、权限系统、加密通信、防注入、审计日志',
        branch: 'engineering',
        tier: 3,
        cost: 3,
        requires: ['api_network', 'eng_architecture'],
        effects: { securityLevel: 0.5 },
        icon: '🛡️',
    },
    
    // === 运营分支 ===
    'ops_analytics': {
        id: 'ops_analytics',
        name: '数据驱动运营',
        desc: '埋点设计、留存分析、漏斗模型、A/B 测试、指标看板',
        branch: 'operations',
        tier: 2,
        cost: 2,
        requires: ['api_datastore'],
        effects: { revenueOptimization: 0.2 },
        icon: '📈',
    },
    'ops_liveops': {
        id: 'ops_liveops',
        name: 'LiveOps 专家',
        desc: '版本计划、热更、活动系统、Battle Pass、赛季制、社区运营',
        branch: 'operations',
        tier: 3,
        cost: 3,
        requires: ['ops_analytics', 'eng_architecture'],
        effects: { retentionBoost: 0.3 },
        icon: '🎯',
    },
    'ops_monetization': {
        id: 'ops_monetization',
        name: '伦理变现设计',
        desc: '外观付费、Battle Pass、便利性、非 P2W、玩家心理、合规',
        branch: 'operations',
        tier: 3,
        cost: 3,
        requires: ['ops_liveops'],
        effects: { monetizationEthics: 0.4 },
        icon: '💰',
    },
    
    // === Game Jam 专精 ===
    'jam_speedrun': {
        id: 'jam_speedrun',
        name: '极速原型',
        desc: '1 小时搭建核心玩法、代码复用库、最小可行性产品思维',
        branch: 'gamejam',
        tier: 1,
        cost: 1,
        requires: ['basics_2'],
        effects: { jamPrototypeSpeed: 0.5 },
        icon: '⚡',
    },
    'jam_toolkit': {
        id: 'jam_toolkit',
        name: '个人工具箱',
        desc: '积累通用模块：状态机、对象池、事件总线、UI 预制件、存档',
        branch: 'gamejam',
        tier: 2,
        cost: 2,
        requires: ['jam_speedrun', 'eng_architecture'],
        effects: { jamCodeReuse: 0.4 },
        icon: '🧰',
    },
    'jam_polish': {
        id: 'jam_polish',
        name: '限时打磨',
        desc: '视觉反馈、音效、粒子、屏幕震动、过场动画、菜单流程',
        branch: 'gamejam',
        tier: 3,
        cost: 3,
        requires: ['jam_toolkit', 'api_ui', 'api_animation'],
        effects: { jamPolishQuality: 0.5 },
        icon: '✨',
    },
    
    // === 隐藏/成就技能 ===
    'hidden_perfectionist': {
        id: 'hidden_perfectionist',
        name: '完美主义者',
        desc: '所有章节测试 100% 通过，零技术债通关',
        branch: 'hidden',
        tier: 4,
        cost: 0,
        requires: ['eng_testing', 'eng_performance'],
        hidden: true,
        unlockCondition: (state) => state.techDebt === 0 && state.completedObjectives.length >= 50,
        effects: { allBonuses: 0.1 },
        icon: '💎',
    },
    'hidden_jam_champion': {
        id: 'hidden_jam_champion',
        name: 'Game Jam 冠军',
        desc: '连续 4 周获得 Game Jam 前 3 名',
        branch: 'hidden',
        tier: 4,
        cost: 0,
        requires: ['jam_polish'],
        hidden: true,
        unlockCondition: (state) => state.jamWins >= 4,
        effects: { jamScoreBonus: 0.5 },
        icon: '🏆',
    },
    'hidden_architect': {
        id: 'hidden_architect',
        name: '代码建筑师',
        desc: '编写的模块被其他 10+ 个项目引用（模拟）',
        branch: 'hidden',
        tier: 4,
        cost: 0,
        requires: ['eng_architecture', 'ops_liveops'],
        hidden: true,
        unlockCondition: (state) => state.modulesPublished >= 10,
        effects: { influenceGain: 0.3 },
        icon: '🏛️',
    },
};

// ============================================================================
// 技能树状态
// ============================================================================
let skillTreeContainer = null;

/**
 * 初始化技能树
 */
export function initSkillTree(state, elements) {
    skillTreeContainer = document.getElementById('skillTreeContainer');
    if (!skillTreeContainer) return;
    
    renderSkillTree(state);
    
    // 监听技能点变化
    state.subscribe('xp', () => renderSkillTree(state));
    state.subscribe('unlockedSkills', () => renderSkillTree(state));
}

/**
 * 渲染技能树
 */
function renderSkillTree(state) {
    if (!skillTreeContainer) return;
    
    // 按分支分组
    const branches = {};
    Object.values(skills).forEach(skill => {
        if (skill.hidden && !isSkillUnlocked(skill, state)) return;
        if (!branches[skill.branch]) branches[skill.branch] = [];
        branches[skill.branch].push(skill);
    });
    
    // 分支显示顺序
    const branchOrder = ['programming', 'api', 'engineering', 'operations', 'gamejam', 'hidden'];
    const branchLabels = {
        programming: '📚 编程基础',
        api: '🔧 Roblox API',
        engineering: '⚙️ 工程进阶',
        operations: '📈 运营变现',
        gamejam: '🎮 Game Jam',
        hidden: '💎 隐藏成就',
    };
    
    let html = '';
    
    branchOrder.forEach(branchId => {
        const branchSkills = branches[branchId];
        if (!branchSkills || branchSkills.length === 0) return;
        
        // 按层级排序
        branchSkills.sort((a, b) => a.tier - b.tier);
        
        html += `
            <div class="skill-branch">
                <h4 class="skill-branch-title">${branchLabels[branchId]}</h4>
                <div class="skill-tier-container" data-branch="${branchId}">
                    ${renderTierRows(branchSkills, state)}
                </div>
            </div>
        `;
    });
    
    skillTreeContainer.innerHTML = html;
    
    // 更新技能点显示
    const skillPointsEl = document.getElementById('skillPoints');
    if (skillPointsEl) {
        const available = calculateAvailableSkillPoints(state);
        skillPointsEl.textContent = available;
    }
    
    // 绑定点击事件
    bindSkillEvents(state);
}

function renderTierRows(branchSkills, state) {
    const maxTier = Math.max(...branchSkills.map(s => s.tier));
    let html = '';
    
    for (let tier = 1; tier <= maxTier; tier++) {
        const tierSkills = branchSkills.filter(s => s.tier === tier);
        html += `<div class="skill-tier-row" data-tier="${tier}">`;
        
        tierSkills.forEach(skill => {
            const unlocked = state.unlockedSkills.includes(skill.id);
            const canUnlock = canUnlockSkill(skill, state);
            const hidden = skill.hidden && !unlocked;
            
            if (hidden) return;
            
            let className = 'skill-node';
            if (unlocked) className += ' unlocked';
            else if (canUnlock) className += ' available';
            else className += ' locked';
            
            html += `
                <div class="${className}" data-skill="${skill.id}" title="${skill.desc}">
                    <div class="skill-icon">${skill.icon}</div>
                    <div class="skill-name">${skill.name}</div>
                    <div class="skill-cost">${skill.cost} SP</div>
                    ${unlocked ? '<div class="skill-check">✓</div>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    return html;
}

function bindSkillEvents(state) {
    if (!skillTreeContainer) return;
    
    skillTreeContainer.querySelectorAll('.skill-node.available').forEach(node => {
        node.addEventListener('click', () => {
            const skillId = node.dataset.skill;
            unlockSkill(skillId, state);
        });
    });
}

/**
 * 检查技能是否可解锁
 */
function canUnlockSkill(skill, state) {
    if (state.unlockedSkills.includes(skill.id)) return false;
    
    // 检查前置技能
    for (const req of skill.requires) {
        if (!state.unlockedSkills.includes(req)) return false;
    }
    
    // 检查技能点
    const available = calculateAvailableSkillPoints(state);
    if (available < skill.cost) return false;
    
    // 检查隐藏解锁条件
    if (skill.unlockCondition && !skill.unlockCondition(state)) return false;
    
    return true;
}

/**
 * 计算可用技能点
 */
function calculateAvailableSkillPoints(state) {
    // 简化：每 100 XP = 1 技能点，减去已花费
    const totalEarned = Math.floor(state.xp / 100);
    const spent = state.unlockedSkills.reduce((sum, id) => {
        const skill = skills[id];
        return sum + (skill?.cost || 0);
    }, 0);
    return Math.max(0, totalEarned - spent);
}

/**
 * 解锁技能
 */
export function unlockSkill(skillId, state) {
    const skill = skills[skillId];
    if (!skill) return { success: false, message: '技能不存在' };
    
    if (!canUnlockSkill(skill, state)) {
        return { success: false, message: '不满足解锁条件' };
    }
    
    // 扣除技能点（通过 XP 系统间接体现）
    state.unlockedSkills.push(skillId);
    
    // 应用效果
    applySkillEffects(skill, state);
    
    // 重新渲染
    renderSkillTree(state);
    
    return { success: true, skill };
}

/**
 * 应用技能效果
 */
function applySkillEffects(skill, state) {
    const effects = skill.effects || {};
    
    // 这里可以应用各种效果到游戏状态
    // 例如：state.settings.xpMultiplier = (state.settings.xpMultiplier || 1) + (effects.xpBonus || 0);
    
    console.log('[Skill] 解锁:', skill.name, '效果:', effects);
}

/**
 * 检查技能是否已解锁
 */
export function isSkillUnlocked(skillId, state) {
    if (typeof skillId === 'object') {
        return state.unlockedSkills.includes(skillId.id);
    }
    return state.unlockedSkills.includes(skillId);
}

/**
 * 获取技能效果数值
 */
export function getSkillEffect(state, effectName, defaultValue = 0) {
    let total = defaultValue;
    
    state.unlockedSkills.forEach(id => {
        const skill = skills[id];
        if (skill?.effects?.[effectName]) {
            total += skill.effects[effectName];
        }
    });
    
    return total;
}

/**
 * 获取所有技能定义
 */
export function getAllSkills() {
    return skills;
}

/**
 * 获取分支技能
 */
export function getBranchSkills(branch) {
    return Object.values(skills).filter(s => s.branch === branch);
}

/**
 * 重置技能树（用于新游戏+）
 */
export function resetSkillTree(state, keepHidden = false) {
    if (keepHidden) {
        const hiddenSkills = state.unlockedSkills.filter(id => skills[id]?.hidden);
        state.unlockedSkills = hiddenSkills;
    } else {
        state.unlockedSkills = [];
    }
    renderSkillTree(state);
}