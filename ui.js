/**
 * UI 模块
 * 负责界面渲染、状态同步、交互反馈
 */

import { showNotification, showModal, closeModal } from './modals.js';

// ============================================================================
// UI 初始化
// ============================================================================
export function initUI(elements, state) {
    // 设置编辑器字体大小
    elements.codeEditor.style.fontSize = `${state.settings.fontSize}px`;
    elements.lineNumbers.style.fontSize = `${state.settings.fontSize}px`;
    
    // 设置行号显示
    elements.lineNumbers.style.display = state.settings.showLineNumbers ? 'block' : 'none';
    
    // 设置自动换行
    elements.codeEditor.style.whiteSpace = state.settings.wordWrap ? 'pre-wrap' : 'pre';
    
    // 初始化行号
    updateLineNumbers(elements);
    
    // 初始化文档分类
    initDocCategories(elements);
    
    // 监听状态变化
    subscribeToState(elements, state);
    
    // 设置主题
    document.documentElement.setAttribute('data-theme', state.settings.theme);
}

/**
 * 订阅状态变化并更新 UI
 */
function subscribeToState(elements, state) {
    // 资源变化
    state.subscribe('money', (v) => elements.money.textContent = formatNumber(v));
    state.subscribe('xp', (v) => elements.xp.textContent = formatNumber(v));
    state.subscribe('reputation', (v) => elements.reputation.textContent = formatNumber(v));
    state.subscribe('techDebt', (v) => elements.techDebt.textContent = formatNumber(v));
    
    // 时间变化
    state.subscribe('currentDay', (v) => elements.currentDay.textContent = v);
    state.subscribe('currentPhase', (v) => elements.currentPhase.textContent = getPhaseLabel(v));
    state.subscribe('chapterBadge', (v) => elements.chapterBadge.textContent = v);
    
    // 编辑器内容
    state.subscribe('editorContent', (v) => {
        if (elements.codeEditor.value !== v) {
            elements.codeEditor.value = v;
            updateLineNumbers(elements);
        }
    });
    
    // 章节变化
    state.subscribe('currentChapter', (v) => {
        const chapter = getChapterInfo(v);
        elements.chapterBadge.textContent = chapter.badge;
    });
    
    // 控制台日志
    state.subscribe('consoleLogs', (logs) => {
        // 由 logToConsole 直接处理
    });
    
    // 测试结果
    state.subscribe('testResults', (results) => {
        renderTestResults(elements, results);
    });
    
    // 目标完成
    state.subscribe('completedObjectives', () => {
        updateObjectivesUI(elements, state);
    });
}

/**
 * 更新整体 UI（用于加载存档后）
 */
export function updateUI(elements, state) {
    elements.money.textContent = formatNumber(state.money);
    elements.xp.textContent = formatNumber(state.xp);
    elements.reputation.textContent = formatNumber(state.reputation);
    elements.techDebt.textContent = formatNumber(state.techDebt);
    elements.currentDay.textContent = state.currentDay;
    elements.currentPhase.textContent = getPhaseLabel(state.currentPhase);
    elements.studioName.textContent = state.studio.name;
    
    const chapter = getChapterInfo(state.currentChapter);
    elements.chapterBadge.textContent = chapter.badge;
    
    elements.codeEditor.value = state.editorContent;
    updateLineNumbers(elements);
    updateCursorPosition(elements);
    
    // 渲染目标
    updateObjectivesUI(elements, state);
    
    // 渲染提示
    updateHintsUI(elements, state);
    
    // 渲染 NPC
    updateNPCUI(elements, state);
    
    // 渲染测试结果
    renderTestResults(elements, state.testResults);
}

// ============================================================================
// 辅助函数
// ============================================================================
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function getPhaseLabel(phase) {
    const labels = {
        planning: '规划期',
        development: '开发期',
        testing: '测试期',
        release: '发布期',
        gamejam: 'Game Jam',
    };
    return labels[phase] || phase;
}

function getChapterInfo(chapterId) {
    const chapters = {
        prologue: { badge: 'Prologue', title: 'Hello Roblox' },
        ch1: { badge: 'Ch 1', title: '脚本与实例' },
        ch2: { badge: 'Ch 2', title: 'DataStore 持久化' },
        ch3: { badge: 'Ch 3', title: '远程通信' },
        ch4: { badge: 'Ch 4', title: 'UI 与输入' },
        ch5: { badge: 'Ch 5', title: '物理与移动' },
        ch6: { badge: 'Ch 6', title: '动画与状态机' },
        ch7: { badge: 'Ch 7', title: '性能与优化' },
        ch8: { badge: 'Ch 8', title: '模块化架构' },
        ch9: { badge: 'Ch 9', title: '发布与运营' },
        endless: { badge: 'Endless', title: '周常 Game Jam' },
    };
    return chapters[chapterId] || { badge: '?', title: '未知' };
}

function updateLineNumbers(elements) {
    const lines = elements.codeEditor.value.split('\n');
    elements.lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
    elements.lineNumbers.scrollTop = elements.codeEditor.scrollTop;
}

function updateCursorPosition(elements) {
    const pos = elements.codeEditor.selectionStart;
    const text = elements.codeEditor.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    elements.cursorPosition.textContent = `第 ${line} 行，第 ${col} 列`;
}

// ============================================================================
// 目标 UI
// ============================================================================
export function updateObjectivesUI(elements, state) {
    const chapter = getCurrentChapter(state.currentChapter);
    if (!chapter.objectives) {
        elements.objectivesList.innerHTML = '<li class="empty">本章暂无目标</li>';
        elements.progressFill.style.width = '0%';
        elements.progressText.textContent = '0%';
        return;
    }
    
    elements.objectivesList.innerHTML = chapter.objectives.map(obj => {
        const completed = state.completedObjectives.includes(obj.id);
        const rewardText = obj.reward ? 
            `+${obj.reward.xp || 0} XP ${obj.reward.money ? '$' + obj.reward.money : ''} ${obj.reward.reputation ? '★' + obj.reward.reputation : ''}` 
            : '';
        
        return `
            <li class="objective-item ${completed ? 'completed' : ''}" data-id="${obj.id}">
                <div class="objective-checkbox">${completed ? '✓' : ''}</div>
                <span class="objective-text">${obj.title}</span>
                ${rewardText ? `<span class="objective-reward">${rewardText}</span>` : ''}
            </li>
        `;
    }).join('');
    
    // 进度条
    const total = chapter.objectives.length;
    const done = chapter.objectives.filter(o => state.completedObjectives.includes(o.id)).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `${percent}%`;
}

// ============================================================================
// 提示 UI
// ============================================================================
export function updateHintsUI(elements, state) {
    const chapter = getCurrentChapter(state.currentChapter);
    if (!chapter.hints || chapter.hints.length === 0) {
        elements.hintsContent.innerHTML = '<p class="empty">本章暂无提示</p>';
        return;
    }
    
    elements.hintsContent.innerHTML = chapter.hints.map(hint => `
        <div class="hint-card ${hint.type || ''}">
            <div class="hint-title">${hint.title}</div>
            <div class="hint-body">${hint.content}</div>
            ${hint.code ? `<pre class="hint-code"><code>${escapeHtml(hint.code)}</code></pre>` : ''}
        </div>
    `).join('');
}

// ============================================================================
// 文档 UI
// ============================================================================
function initDocCategories(elements) {
    const categories = [
        { name: '基础 API', icon: '📦', entries: [
            { name: 'print(...)', desc: '输出到控制台' },
            { name: 'warn(...)', desc: '输出警告' },
            { name: 'error(...)', desc: '抛出错误' },
            { name: 'wait(seconds)', desc: '等待指定秒数' },
            { name: 'spawn(function)', desc: '创建新线程运行函数' },
            { name: 'tick()', desc: '获取当前时间戳' },
            { name: 'typeof(value)', desc: '获取值的类型' },
            { name: 'assert(condition, msg)', desc: '断言检查' },
        ]},
        { name: '数据类型', icon: '🔢', entries: [
            { name: 'Vector3.new(x,y,z)', desc: '3D 向量' },
            { name: 'Vector2.new(x,y)', desc: '2D 向量' },
            { name: 'CFrame.new(...)', desc: '坐标变换' },
            { name: 'Color3.new(r,g,b)', desc: '颜色 (0-1)' },
            { name: 'Color3.fromRGB(r,g,b)', desc: '颜色 (0-255)' },
            { name: 'UDim2.new(xS,xO,yS,yO)', desc: 'UI 尺寸' },
            { name: 'Ray.new(origin,dir)', desc: '射线' },
            { name: 'Rect.new(min,max)', desc: '矩形区域' },
        ]},
        { name: '实例操作', icon: '🧱', entries: [
            { name: 'Instance.new(className)', desc: '创建实例' },
            { name: 'instance:Clone()', desc: '克隆实例' },
            { name: 'instance:Destroy()', desc: '销毁实例' },
            { name: 'instance:FindFirstChild(name)', desc: '查找子对象' },
            { name: 'instance:GetChildren()', desc: '获取所有子对象' },
            { name: 'instance:GetDescendants()', desc: '获取所有后代' },
            { name: 'instance:IsA(className)', desc: '类型检查' },
            { name: 'instance.Parent', desc: '父对象属性' },
        ]},
        { name: '事件系统', icon: '⚡', entries: [
            { name: 'event:Connect(fn)', desc: '连接事件监听' },
            { name: 'event:Wait()', desc: '等待事件触发' },
            { name: 'event:Fire(...)', desc: '触发事件 (BindableEvent)' },
            { name: 'RemoteEvent:FireServer(...)', desc: '客户端→服务端' },
            { name: 'RemoteEvent:FireClient(player,...)', desc: '服务端→客户端' },
            { name: 'RemoteFunction:InvokeServer(...)', desc: '客户端调用服务端' },
            { name: 'RemoteFunction:InvokeClient(player,...)', desc: '服务端调用客户端' },
        ]},
        { name: 'DataStore', icon: '💾', entries: [
            { name: 'DataStoreService:GetDataStore(name)', desc: '获取数据存储' },
            { name: 'store:GetAsync(key)', desc: '读取数据' },
            { name: 'store:SetAsync(key,value)', desc: '写入数据' },
            { name: 'store:UpdateAsync(key,fn)', desc: '原子更新' },
            { name: 'store:RemoveAsync(key)', desc: '删除数据' },
            { name: 'store:IncrementAsync(key,delta)', desc: '增量更新' },
            { name: 'store:GetSortedAsync(...)', desc: '排序查询' },
        ]},
        { name: 'TweenService', icon: '✨', entries: [
            { name: 'TweenService:Create(obj,info,props)', desc: '创建补间' },
            { name: 'TweenInfo.new(time,style,dir,reps,rev,delay)', desc: '补间信息' },
            { name: 'tween:Play()', desc: '播放补间' },
            { name: 'tween:Pause()', desc: '暂停补间' },
            { name: 'tween:Cancel()', desc: '取消补间' },
            { name: 'tween.Completed:Connect(fn)', desc: '完成回调' },
        ]},
        { name: 'RunService', icon: '🔄', entries: [
            { name: 'RunService.Heartbeat', desc: '每帧后 (物理后)' },
            { name: 'RunService.RenderStepped', desc: '每帧前 (渲染前)' },
            { name: 'RunService.Stepped', desc: '每帧前 (物理前)' },
            { name: 'RunService.PreSimulation', desc: '物理模拟前' },
            { name: 'RunService.PostSimulation', desc: '物理模拟后' },
        ]},
        { name: 'UserInputService', icon: '🎮', entries: [
            { name: 'InputBegan/Changed/Ended', desc: '输入事件' },
            { name: 'GetMouseLocation()', desc: '获取鼠标位置' },
            { name: 'MouseBehavior', desc: '鼠标行为模式' },
            { name: 'GamepadConnected/Disconnected', desc: '手柄连接事件' },
            { name: 'GetGamepadState(gp)', desc: '获取手柄状态' },
        ]},
        { name: '物理引擎', icon: '⚙️', entries: [
            { name: 'workspace.Gravity', desc: '重力加速度' },
            { name: 'Raycast(origin,dir,params)', desc: '射线检测' },
            { name: 'Blockcast(cframe,size,dir)', desc: '方块投射' },
            { name: 'Spherecast(origin,radius,dir)', desc: '球体投射' },
            { name: 'PhysicsService collision groups', desc: '碰撞组管理' },
            { name: 'BasePart.AssemblyLinearVelocity', desc: '线速度' },
            { name: 'BasePart.AssemblyAngularVelocity', desc: '角速度' },
            { name: 'VectorForce/AlignPosition/AlignOrientation', desc: '约束力' },
        ]},
    ];
    
    elements.docCategories.innerHTML = categories.map(cat => `
        <details class="doc-category">
            <summary>${cat.icon} ${cat.name}</summary>
            <div class="doc-category-content">
                ${cat.entries.map(entry => `
                    <div class="doc-entry" data-name="${escapeHtml(entry.name)}">
                        <div class="doc-entry-name">${escapeHtml(entry.name)}</div>
                        <div class="doc-entry-desc">${escapeHtml(entry.desc)}</div>
                    </div>
                `).join('')}
            </div>
        </details>
    `).join('');
    
    // 点击文档条目插入代码
    elements.docCategories.addEventListener('click', (e) => {
        const entry = e.target.closest('.doc-entry');
        if (entry) {
            insertAtCursor(elements.codeEditor, entry.dataset.name + ' ');
            elements.codeEditor.focus();
        }
    });
}

export function filterDocs(elements, state) {
    const query = elements.docSearch.value.toLowerCase();
    const entries = elements.docCategories.querySelectorAll('.doc-entry');
    
    entries.forEach(entry => {
        const name = entry.dataset.name.toLowerCase();
        const desc = entry.querySelector('.doc-entry-desc').textContent.toLowerCase();
        const match = name.includes(query) || desc.includes(query);
        entry.style.display = match ? 'block' : 'none';
    });
    
    // 显示/隐藏空分类
    elements.docCategories.querySelectorAll('.doc-category').forEach(cat => {
        const visible = cat.querySelectorAll('.doc-entry[style*="block"], .doc-entry:not([style*="none"])').length > 0;
        cat.style.display = visible ? 'block' : 'none';
    });
}

// ============================================================================
// NPC UI
// ============================================================================
export function updateNPCUI(elements, state) {
    const npcs = getNPCsForChapter(state.currentChapter);
    elements.npcList.innerHTML = npcs.map(npc => {
        const relationship = state.npcs[npc.id] || 0;
        return `
            <div class="npc-card" data-npc="${npc.id}">
                <div class="npc-header">
                    <div class="npc-avatar">${npc.avatar}</div>
                    <div>
                        <div class="npc-name">${npc.name}</div>
                        <div class="npc-role">${npc.role}</div>
                    </div>
                </div>
                <div class="npc-relationship">
                    <span>好感度</span>
                    <div class="relationship-bar">
                        <div class="relationship-fill" style="width: ${Math.max(0, Math.min(100, 50 + relationship))}%"></div>
                    </div>
                    <span class="relationship-value">${50 + relationship}</span>
                </div>
                <div class="npc-desc">${npc.description}</div>
            </div>
        `;
    }).join('');
}

function getNPCsForChapter(chapterId) {
    const allNpcs = {
        prologue: [
            { id: 'mentor', name: '老陈', avatar: '👨‍💻', role: '导师', description: '资深 Roblox 开发者，将指导你完成第一个游戏。' },
        ],
        ch1: [
            { id: 'mentor', name: '老陈', avatar: '👨‍💻', role: '导师', description: '教你理解实例树和事件系统。' },
            { id: 'rival', name: '小杰', avatar: '🧑‍💻', role: '竞争对手', description: '同期入行的开发者，代码风格激进但效率极高。' },
        ],
        ch2: [
            { id: 'mentor', name: '老陈', avatar: '👨‍💻', role: '导师', description: '强调数据持久化的重要性。' },
            { id: 'investor', name: '王总', avatar: '👔', role: '投资人', description: '关注数据安全和用户留存指标。' },
        ],
        ch3: [
            { id: 'mentor', name: '老陈', avatar: '👨‍💻', role: '导师', description: '讲解客户端-服务端架构。' },
            { id: 'security', name: '安全专家', avatar: '🛡️', role: '安全顾问', description: '教你防作弊和网络验证。' },
        ],
        ch4: [
            { id: 'artist', name: '美美', avatar: '🎨', role: 'UI 设计师', description: '帮你设计漂亮的界面。' },
            { id: 'mentor', name: '老陈', avatar: '👨‍💻', role: '导师', description: '讲解响应式布局和多端适配。' },
        ],
        ch5: [
            { id: 'physics', name: '物理大神', avatar: '⚙️', role: '物理引擎专家', description: '教你调教完美的移动手感。' },
        ],
        ch6: [
            { id: 'animator', name: '动作哥', avatar: '🕺', role: '动画师', description: '连招系统和状态机设计。' },
        ],
        ch7: [
            { id: 'perf', name: '性能狂', avatar: '📊', role: '性能优化专家', description: 'MicroProfiler 实战教学。' },
        ],
        ch8: [
            { id: 'architect', name: '架构师', avatar: '🏗️', role: '技术总监', description: '重构僵尸代码库，引入 Knit/ECS。' },
        ],
        ch9: [
            { id: 'producer', name: '制作人', avatar: '🎯', role: '游戏制作人', description: 'LiveOps、A/B 测试、变现策略。' },
            { id: 'community', name: '社区经理', avatar: '💬', role: '社区运营', description: '玩家反馈收集和社区建设。' },
        ],
        endless: [
            { id: 'jam_host', name: 'Jam 主办方', avatar: '🏆', role: 'Game Jam 组织者', description: '每周发布新主题，评选最佳作品。' },
        ],
    };
    return allNpcs[chapterId] || allNpcs.prologue;
}

// ============================================================================
// 测试结果渲染
// ============================================================================
function renderTestResults(elements, results) {
    if (!results || results.length === 0) {
        elements.testsList.innerHTML = '<p class="empty">暂无测试结果</p>';
        elements.testSummary.textContent = '暂无测试';
        return;
    }
    
    elements.testsList.innerHTML = results.map(test => `
        <div class="test-item ${test.passed ? 'passed' : 'failed'}">
            <div class="test-status">${test.passed ? '✓' : '✗'}</div>
            <span class="test-name">${escapeHtml(test.name)}</span>
            <span class="test-duration">${test.duration}ms</span>
            ${test.error ? `<div class="test-error">${escapeHtml(test.error)}</div>` : ''}
        </div>
    `).join('');
    
    const passed = results.filter(r => r.passed).length;
    elements.testSummary.textContent = `${passed}/${results.length} 通过`;
}

// ============================================================================
// 章节数据获取（从 chapters 导入）
// ============================================================================
import { getCurrentChapter } from './chapters/index.js';

// ============================================================================
// 工具函数
// ============================================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    // 触发 input 事件
    textarea.dispatchEvent(new Event('input'));
}