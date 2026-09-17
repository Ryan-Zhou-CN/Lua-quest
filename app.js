/**
 * Lua Quest — Roblox 开发者模拟器
 * 主应用入口：状态管理、路由、核心系统初始化
 */

import { createState } from './state.js';
import { initFengari, runLuauCode, createSandbox } from './fengari-wrapper.js';
import { initUI, updateUI, filterDocs } from './ui.js';
import { loadChapter, getCurrentChapter } from './chapters/index.js';
import { initStorage, saveGame, loadGame, exportSave, importSave } from './storage.js';
import { initGameJam } from './gamejam.js';
import { initSkillTree } from './skills.js';
import { showNotification, showModal } from './modals.js';

// ============================================================================
// 全局状态
// ============================================================================
const state = createState({
    // 玩家资源
    money: 1000,
    xp: 0,
    level: 1,
    reputation: 0,
    techDebt: 0,
    
    // 时间系统
    currentDay: 1,
    currentPhase: 'planning', // planning, development, testing, release
    phaseDay: 1,
    
    // 进度
    currentChapter: 'prologue',
    completedObjectives: [],
    unlockedSkills: [],
    discoveredAPIs: [],
    
    // 工作室
    studio: {
        name: 'Lua Quest',
        employees: [],
        projects: [],
        serverCost: 0,
        monthlyRevenue: 0,
    },
    
    // 代码编辑器
    editorContent: `-- 欢迎来到 Lua Quest！\n-- 这是你的第一个 Roblox/Luau 项目\n\nlocal function hello()\n    print("Hello, Roblox!")\nend\n\nhello()`,
    editorLanguage: 'luau',
    
    // 控制台
    consoleLogs: [],
    
    // 测试结果
    testResults: [],
    
    // NPC 关系
    npcs: {},
    
    // 设置
    settings: {
        theme: 'dark',
        autoSave: true,
        autoRunTests: false,
        fontSize: 14,
        showLineNumbers: true,
        wordWrap: false,
    },
    
    // Game Jam
    gameJam: {
        active: false,
        theme: '',
        constraints: [],
        timeRemaining: 0,
        score: 0,
    },
    
    // 系统状态
    system: {
        fengariLoaded: false,
        fengariError: null,
        offlineMode: false,
    },
});

// ============================================================================
// DOM 元素引用
// ============================================================================
const elements = {
    // 加载/错误屏幕
    loadingScreen: document.getElementById('loadingScreen'),
    loadingStatus: document.getElementById('loadingStatus'),
    loadingBar: document.getElementById('loadingBar'),
    errorScreen: document.getElementById('errorScreen'),
    errorMessage: document.getElementById('errorMessage'),
    errorDetails: document.getElementById('errorDetails'),
    btnRetry: document.getElementById('btnRetry'),
    btnOfflineMode: document.getElementById('btnOfflineMode'),
    app: document.getElementById('app'),
    
    // 顶部栏
    studioName: document.getElementById('studioName'),
    chapterBadge: document.getElementById('chapterBadge'),
    money: document.getElementById('money'),
    xp: document.getElementById('xp'),
    reputation: document.getElementById('reputation'),
    techDebt: document.getElementById('techDebt'),
    currentDay: document.getElementById('currentDay'),
    currentPhase: document.getElementById('currentPhase'),
    
    // 导航
    navBtns: document.querySelectorAll('.nav-btn'),
    sidebarContent: document.getElementById('sidebarContent'),
    
    // 中央面板
    panelTabs: document.querySelectorAll('.panel-tab'),
    panelPanes: document.querySelectorAll('.panel-pane'),
    codeEditor: document.getElementById('codeEditor'),
    lineNumbers: document.getElementById('lineNumbers'),
    languageMode: document.getElementById('languageMode'),
    editorStatus: document.getElementById('editorStatus'),
    cursorPosition: document.getElementById('cursorPosition'),
    btnRun: document.getElementById('btnRun'),
    btnTest: document.getElementById('btnTest'),
    btnFormat: document.getElementById('btnFormat'),
    btnHint: document.getElementById('btnHint'),
    previewFrame: document.getElementById('previewFrame'),
    previewOverlay: document.getElementById('previewOverlay'),
    consoleOutput: document.getElementById('consoleOutput'),
    btnClearConsole: document.getElementById('btnClearConsole'),
    btnExportConsole: document.getElementById('btnExportConsole'),
    filterErrors: document.getElementById('filterErrors'),
    filterWarnings: document.getElementById('filterWarnings'),
    filterLogs: document.getElementById('filterLogs'),
    testsList: document.getElementById('testsList'),
    btnRunAllTests: document.getElementById('btnRunAllTests'),
    testSummary: document.getElementById('testSummary'),
    
    // 右侧边栏
    sidebarTabs: document.querySelectorAll('.sidebar-tab'),
    sidebarPanes: document.querySelectorAll('.sidebar-pane'),
    objectivesList: document.getElementById('objectivesList'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    hintsContent: document.getElementById('hintsContent'),
    docSearch: document.getElementById('docSearch'),
    docCategories: document.getElementById('docCategories'),
    npcList: document.getElementById('npcList'),
    
    // 通知
    notificationArea: document.getElementById('notificationArea'),
    modalContainer: document.getElementById('modalContainer'),
};

// ============================================================================
// 初始化
// ============================================================================
async function init() {
    console.log('[Lua Quest] 初始化中...');
    
    // 显示加载屏幕
    showLoading('初始化存储...', 10);
    
    // 1. 初始化存储
    await initStorage();
    
    showLoading('加载存档...', 20);
    
    // 2. 尝试加载存档
    const saved = await loadGame();
    if (saved) {
        // 合并状态，保留默认值
        Object.keys(saved).forEach(key => {
            if (key !== 'system') { // 不覆盖系统状态
                state[key] = saved[key];
            }
        });
        console.log('[Lua Quest] 存档加载成功');
    }
    
    showLoading('初始化 Fengari 引擎...', 40);
    
    // 3. 初始化 Fengari（带错误处理）
    try {
        await initFengari();
        state.system.fengariLoaded = true;
        console.log('[Lua Quest] Fengari 就绪');
        showLoading('Fengari 引擎就绪', 60);
    } catch (error) {
        console.error('[Lua Quest] Fengari 初始化失败:', error);
        state.system.fengariLoaded = false;
        state.system.fengariError = error.message;
        // 不抛出错误，继续加载 UI，稍后显示错误
        showLoading('引擎加载失败，启用基础模式...', 60);
    }
    
    showLoading('初始化界面...', 70);
    
    // 4. 初始化 UI
    initUI(elements, state);
    
    showLoading('加载章节内容...', 80);
    
    // 5. 加载当前章节
    await loadChapter(state.currentChapter);
    
    showLoading('初始化子系统...', 90);
    
    // 6. 初始化子系统
    initGameJam(state, elements);
    initSkillTree(state, elements);
    
    // 7. 绑定事件
    bindEvents();
    
    // 8. 启动自动保存
    if (state.settings.autoSave) {
        startAutoSave();
    }
    
    showLoading('完成', 100);
    
    // 9. 更新 UI
    updateUI(elements, state);
    
    // 10. 隐藏加载屏幕，显示主界面
    await hideLoadingScreen();
    
    // 11. 检查 Fengari 错误
    if (!state.system.fengariLoaded) {
        showFengariError(state.system.fengariError);
    } else {
        console.log('[Lua Quest] 初始化完成');
        showNotification('欢迎来到 Lua Quest！点击「运行」开始你的开发者之旅。', 'info');
    }
}

/**
 * 显示加载进度
 */
function showLoading(message, percent) {
    if (elements.loadingStatus) {
        elements.loadingStatus.textContent = message;
    }
    if (elements.loadingBar) {
        elements.loadingBar.style.width = `${percent}%`;
    }
}

/**
 * 隐藏加载屏幕，显示主应用
 */
async function hideLoadingScreen() {
    return new Promise(resolve => {
        if (elements.loadingScreen) {
            elements.loadingScreen.classList.add('hidden');
            setTimeout(() => {
                if (elements.app) {
                    elements.app.classList.remove('hidden');
                    elements.app.classList.add('visible');
                }
                resolve();
            }, 300);
        } else {
            if (elements.app) {
                elements.app.classList.remove('hidden');
                elements.app.classList.add('visible');
            }
            resolve();
        }
    });
}

/**
 * 显示 Fengari 加载错误
 */
function showFengariError(error) {
    if (elements.errorScreen && elements.errorMessage && elements.errorDetails) {
        elements.errorMessage.textContent = '游戏引擎 (Fengari) 加载失败。代码运行功能将不可用，但你仍可浏览教程、阅读文档、管理工作室。';
        elements.errorDetails.textContent = error || '未知错误';
        elements.errorScreen.classList.remove('hidden');
        elements.app.classList.add('hidden');
        
        // 绑定重试按钮
        if (elements.btnRetry) {
            elements.btnRetry.onclick = () => location.reload();
        }
        if (elements.btnOfflineMode) {
            elements.btnOfflineMode.onclick = () => {
                state.system.offlineMode = true;
                elements.errorScreen.classList.add('hidden');
                elements.app.classList.remove('hidden');
                elements.app.classList.add('visible');
                showNotification('已进入离线模式，代码运行功能不可用', 'warning');
            };
        }
    }
}

/**
 * 显示通用错误界面
 */
function showErrorScreen(message, details) {
    if (elements.errorScreen && elements.errorMessage && elements.errorDetails) {
        elements.errorMessage.textContent = message;
        elements.errorDetails.textContent = details || '';
        elements.errorScreen.classList.remove('hidden');
        if (elements.app) elements.app.classList.add('hidden');
        
        if (elements.btnRetry) {
            elements.btnRetry.onclick = () => location.reload();
        }
    }
}

// ============================================================================
// 事件绑定
// ============================================================================
function bindEvents() {
    // 导航标签切换
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchNavTab(btn.dataset.tab));
    });
    
    // 中央面板标签切换
    elements.panelTabs.forEach(tab => {
        tab.addEventListener('click', () => switchPanelTab(tab.dataset.panel));
    });
    
    // 右侧边栏标签切换
    elements.sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => switchSidebarTab(tab.dataset.sideTab));
    });
    
    // 编辑器工具栏
    elements.btnRun.addEventListener('click', runCode);
    elements.btnTest.addEventListener('click', runTests);
    elements.btnFormat.addEventListener('click', formatCode);
    elements.btnHint.addEventListener('click', showHint);
    
    // 语言模式切换
    elements.languageMode.addEventListener('change', (e) => {
        state.editorLanguage = e.target.value;
        updateLineNumbers();
    });
    
    // 编辑器内容变化
    elements.codeEditor.addEventListener('input', onEditorInput);
    elements.codeEditor.addEventListener('scroll', syncLineNumbers);
    elements.codeEditor.addEventListener('keyup', updateCursorPosition);
    elements.codeEditor.addEventListener('click', updateCursorPosition);
    
    // 控制台
    elements.btnClearConsole.addEventListener('click', clearConsole);
    elements.btnExportConsole.addEventListener('click', exportConsole);
    [elements.filterErrors, elements.filterWarnings, elements.filterLogs].forEach(cb => {
        cb.addEventListener('change', filterConsole);
    });
    
    // 测试
    elements.btnRunAllTests.addEventListener('click', runTests);
    
    // 文档搜索
    elements.docSearch.addEventListener('input', filterDocs);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeydown);
    
    // 窗口卸载前保存
    window.addEventListener('beforeunload', () => {
        if (state.settings.autoSave) {
            saveGame(state);
        }
    });
    
    // PWA 安装提示
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // 可以在这里显示安装按钮
    });
}

// ============================================================================
// 导航切换
// ============================================================================
function switchNavTab(tabName) {
    elements.navBtns.forEach(btn => {
        const active = btn.dataset.tab === tabName;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active);
    });
    
    // 加载对应的侧边栏内容
    loadSidebarContent(tabName);
}

function switchPanelTab(panelName) {
    elements.panelTabs.forEach(tab => {
        const active = tab.dataset.panel === panelName;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active);
    });
    
    elements.panelPanes.forEach(pane => {
        const active = pane.id === `panel-${panelName}`;
        pane.classList.toggle('active', active);
        pane.hidden = !active;
    });
}

function switchSidebarTab(tabName) {
    elements.sidebarTabs.forEach(tab => {
        const active = tab.dataset.sideTab === tabName;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active);
    });
    
    elements.sidebarPanes.forEach(pane => {
        const active = pane.id === `side-${tabName}`;
        pane.classList.toggle('active', active);
        pane.hidden = !active;
    });
}

// ============================================================================
// 侧边栏内容加载
// ============================================================================
function loadSidebarContent(tabName) {
    const content = elements.sidebarContent;
    
    switch (tabName) {
        case 'story':
            content.innerHTML = renderStoryPanel();
            break;
        case 'studio':
            content.innerHTML = renderStudioPanel();
            break;
        case 'skills':
            content.innerHTML = renderSkillsPanel();
            break;
        case 'gamejam':
            content.innerHTML = renderGameJamPanel();
            break;
        case 'settings':
            content.innerHTML = renderSettingsPanel();
            break;
    }
    
    // 重新绑定新内容的事件
    bindSidebarEvents(tabName);
}

function renderStoryPanel() {
    const chapter = getCurrentChapter(state.currentChapter);
    return `
        <div class="story-panel">
            <h3>${chapter.title}</h3>
            <p class="story-desc">${chapter.description}</p>
            <div class="story-progress">
                <h4>剧情进度</h4>
                <div class="progress-bar" role="progressbar" aria-valuenow="${chapter.progress}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-fill" style="width: ${chapter.progress}%"></div>
                </div>
            </div>
            <div class="story-npcs">
                <h4>本章角色</h4>
                ${chapter.npcs.map(npc => `
                    <div class="npc-mini" data-npc="${npc.id}">
                        <span class="npc-avatar">${npc.avatar}</span>
                        <span class="npc-name">${npc.name}</span>
                        <span class="npc-role">${npc.role}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderStudioPanel() {
    const s = state.studio;
    return `
        <div class="studio-panel">
            <div class="studio-header">
                <input type="text" class="form-input" id="studioNameInput" value="${s.name}" placeholder="工作室名称">
            </div>
            <div class="studio-stats">
                <div class="stat">
                    <span class="stat-label">员工</span>
                    <span class="stat-value">${s.employees.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">项目</span>
                    <span class="stat-value">${s.projects.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">服务器成本/月</span>
                    <span class="stat-value">$${s.serverCost}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">月收入</span>
                    <span class="stat-value">$${s.monthlyRevenue}</span>
                </div>
            </div>
            <div class="studio-employees">
                <h4>团队成员</h4>
                <ul id="employeeList">${renderEmployees()}</ul>
                <button class="btn btn-secondary btn-sm" id="btnHire">招聘员工</button>
            </div>
            <div class="studio-projects">
                <h4>进行中项目</h4>
                <ul id="projectList">${renderProjects()}</ul>
            </div>
        </div>
    `;
}

function renderEmployees() {
    if (state.studio.employees.length === 0) {
        return '<li class="empty">暂无员工，点击「招聘员工」开始组建团队</li>';
    }
    return state.studio.employees.map(emp => `
        <li class="employee-item">
            <span class="emp-name">${emp.name}</span>
            <span class="emp-role">${emp.role}</span>
            <span class="emp-skill">${emp.skill}★</span>
            <span class="emp-salary">$${emp.salary}/月</span>
        </li>
    `).join('');
}

function renderProjects() {
    if (state.studio.projects.length === 0) {
        return '<li class="empty">暂无进行中项目</li>';
    }
    return state.studio.projects.map(proj => `
        <li class="project-item">
            <span class="proj-name">${proj.name}</span>
            <span class="proj-progress">${proj.progress}%</span>
            <span class="proj-deadline">${proj.deadline}天后截止</span>
        </li>
    `).join('');
}

function renderSkillsPanel() {
    return `
        <div class="skills-panel">
            <h3>技能树</h3>
            <div class="skill-tree" id="skillTreeContainer"></div>
            <div class="skill-points">
                技能点：<span id="skillPoints">${state.xp}</span>
            </div>
        </div>
    `;
}

function renderGameJamPanel() {
    const gj = state.gameJam;
    if (gj.active) {
        return `
            <div class="gamejam-panel active">
                <h3>🎮 Game Jam 进行中</h3>
                <div class="jam-theme">主题：${gj.theme}</div>
                <div class="jam-constraints">
                    约束：${gj.constraints.join('、')}
                </div>
                <div class="jam-timer">
                    剩余时间：<span id="jamTimer">${formatTime(gj.timeRemaining)}</span>
                </div>
                <div class="jam-score">当前分数：${gj.score}</div>
                <button class="btn btn-primary" id="btnSubmitJam">提交作品</button>
            </div>
        `;
    }
    return `
        <div class="gamejam-panel">
            <h3>🎮 周常 Game Jam</h3>
            <p class="jam-desc">每周生成新主题，3天开发周期，与全球开发者竞速</p>
            <div class="jam-preview">
                <div class="jam-info">下次开始：周一 00:00 UTC</div>
                <div class="jam-rewards">
                    奖励：资金、声望、独家技能、稀有员工
                </div>
            </div>
            <button class="btn btn-secondary" id="btnViewHistory">查看历史记录</button>
        </div>
    `;
}

function renderSettingsPanel() {
    const s = state.settings;
    return `
        <div class="settings-panel">
            <h3>⚙️ 设置</h3>
            <div class="setting-group">
                <label class="setting-item">
                    <span>主题</span>
                    <select class="form-select" id="settingTheme">
                        <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>深色</option>
                        <option value="light" ${s.theme === 'light' ? 'selected' : ''}>浅色</option>
                        <option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>跟随系统</option>
                    </select>
                </label>
                <label class="setting-item">
                    <span>自动保存</span>
                    <input type="checkbox" id="settingAutoSave" ${s.autoSave ? 'checked' : ''}>
                </label>
                <label class="setting-item">
                    <span>自动运行测试</span>
                    <input type="checkbox" id="settingAutoTest" ${s.autoRunTests ? 'checked' : ''}>
                </label>
                <label class="setting-item">
                    <span>字体大小</span>
                    <input type="range" id="settingFontSize" min="11" max="18" value="${s.fontSize}">
                    <span id="fontSizeValue">${s.fontSize}px</span>
                </label>
                <label class="setting-item">
                    <span>显示行号</span>
                    <input type="checkbox" id="settingLineNumbers" ${s.showLineNumbers ? 'checked' : ''}>
                </label>
                <label class="setting-item">
                    <span>自动换行</span>
                    <input type="checkbox" id="settingWordWrap" ${s.wordWrap ? 'checked' : ''}>
                </label>
            </div>
            <div class="setting-actions">
                <button class="btn btn-secondary" id="btnExportSave">导出存档</button>
                <button class="btn btn-secondary" id="btnImportSave">导入存档</button>
                <input type="file" id="importFile" accept=".json" hidden>
                <button class="btn btn-danger" id="btnResetGame">重置游戏</button>
            </div>
        </div>
    `;
}

function bindSidebarEvents(tabName) {
    switch (tabName) {
        case 'studio':
            document.getElementById('btnHire')?.addEventListener('click', showHireModal);
            document.getElementById('studioNameInput')?.addEventListener('change', (e) => {
                state.studio.name = e.target.value;
                elements.studioName.textContent = e.target.value;
            });
            break;
        case 'settings':
            document.getElementById('settingTheme')?.addEventListener('change', (e) => {
                state.settings.theme = e.target.value;
                document.documentElement.setAttribute('data-theme', e.target.value);
            });
            document.getElementById('settingAutoSave')?.addEventListener('change', (e) => {
                state.settings.autoSave = e.target.checked;
            });
            document.getElementById('settingAutoTest')?.addEventListener('change', (e) => {
                state.settings.autoRunTests = e.target.checked;
            });
            document.getElementById('settingFontSize')?.addEventListener('input', (e) => {
                state.settings.fontSize = parseInt(e.target.value);
                document.getElementById('fontSizeValue').textContent = `${e.target.value}px`;
                elements.codeEditor.style.fontSize = `${e.target.value}px`;
                elements.lineNumbers.style.fontSize = `${e.target.value}px`;
            });
            document.getElementById('settingLineNumbers')?.addEventListener('change', (e) => {
                state.settings.showLineNumbers = e.target.checked;
                elements.lineNumbers.style.display = e.target.checked ? 'block' : 'none';
            });
            document.getElementById('settingWordWrap')?.addEventListener('change', (e) => {
                state.settings.wordWrap = e.target.checked;
                elements.codeEditor.style.whiteSpace = e.target.checked ? 'pre-wrap' : 'pre';
            });
            document.getElementById('btnExportSave')?.addEventListener('click', () => exportSave(state));
            document.getElementById('btnImportSave')?.addEventListener('click', () => {
                document.getElementById('importFile').click();
            });
            document.getElementById('importFile')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) importSave(file, state);
            });
            document.getElementById('btnResetGame')?.addEventListener('click', resetGame);
            break;
        case 'gamejam':
            document.getElementById('btnSubmitJam')?.addEventListener('click', submitGameJam);
            document.getElementById('btnViewHistory')?.addEventListener('click', showJamHistory);
            break;
    }
}

// ============================================================================
// 编辑器相关
// ============================================================================
function onEditorInput() {
    state.editorContent = elements.codeEditor.value;
    updateLineNumbers();
    updateCursorPosition();
    elements.editorStatus.textContent = '已修改';
}

function updateLineNumbers() {
    const lines = elements.codeEditor.value.split('\n');
    elements.lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
}

function syncLineNumbers() {
    elements.lineNumbers.scrollTop = elements.codeEditor.scrollTop;
}

function updateCursorPosition() {
    const pos = elements.codeEditor.selectionStart;
    const text = elements.codeEditor.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    elements.cursorPosition.textContent = `第 ${line} 行，第 ${col} 列`;
}

// ============================================================================
// 代码运行与测试
// ============================================================================
async function runCode() {
    // 检查离线模式
    if (state.system.offlineMode || !state.system.fengariLoaded) {
        showNotification('离线模式下无法运行代码，请联网重试或点击「重试」', 'warning');
        return;
    }
    
    const code = elements.codeEditor.value;
    if (!code.trim()) {
        showNotification('代码为空', 'warning');
        return;
    }
    
    elements.btnRun.disabled = true;
    elements.btnRun.querySelector('.btn-text').textContent = '运行中...';
    elements.editorStatus.textContent = '运行中...';
    
    // 切换到预览/控制台面板
    switchPanelTab('console');
    
    try {
        const result = await runLuauCode(code, state);
        logToConsole(`> 运行完成`, 'success');
        if (result.output) {
            logToConsole(result.output, 'log');
        }
        elements.editorStatus.textContent = '运行成功';
        
        // 检查是否完成目标
        checkObjectives(code, result);
    } catch (error) {
        logToConsole(`> 错误: ${error.message}`, 'error');
        elements.editorStatus.textContent = '运行失败';
    } finally {
        elements.btnRun.disabled = false;
        elements.btnRun.querySelector('.btn-text').textContent = '运行';
    }
}

async function runTests() {
    // 检查离线模式
    if (state.system.offlineMode || !state.system.fengariLoaded) {
        showNotification('离线模式下无法运行测试', 'warning');
        return;
    }
    
    const chapter = getCurrentChapter(state.currentChapter);
    if (!chapter.tests || chapter.tests.length === 0) {
        showNotification('本章暂无测试用例', 'info');
        return;
    }
    
    elements.btnRunAllTests.disabled = true;
    elements.btnRunAllTests.querySelector('.btn-text').textContent = '测试中...';
    elements.testSummary.textContent = '运行测试中...';
    
    switchPanelTab('tests');
    
    const results = [];
    for (const test of chapter.tests) {
        try {
            const result = await runLuauCode(test.code, state);
            const passed = test.assert(result);
            results.push({
                name: test.name,
                passed,
                duration: result.duration,
                error: passed ? null : result.error,
            });
            renderTestItem(results[results.length - 1]);
        } catch (error) {
            results.push({
                name: test.name,
                passed: false,
                duration: 0,
                error: error.message,
            });
            renderTestItem(results[results.length - 1]);
        }
    }
    
    state.testResults = results;
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    elements.testSummary.textContent = `${passed}/${total} 通过`;
    
    if (passed === total) {
        showNotification('所有测试通过！', 'success');
        completeChapter();
    } else {
        showNotification(`${total - passed} 个测试失败`, 'warning');
    }
    
    elements.btnRunAllTests.disabled = false;
    elements.btnRunAllTests.querySelector('.btn-text').textContent = '运行所有测试';
}

function renderTestItem(test) {
    const item = document.createElement('div');
    item.className = `test-item ${test.passed ? 'passed' : 'failed'}`;
    item.innerHTML = `
        <div class="test-status">${test.passed ? '✓' : '✗'}</div>
        <span class="test-name">${test.name}</span>
        <span class="test-duration">${test.duration}ms</span>
        ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
    `;
    elements.testsList.appendChild(item);
}

function formatCode() {
    // 简单的格式化：缩进处理
    let code = elements.codeEditor.value;
    let indent = 0;
    const lines = code.split('\n');
    const formatted = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('end') || trimmed.startsWith('else') || trimmed.startsWith('elseif') || trimmed.startsWith('until')) {
            indent = Math.max(0, indent - 1);
        }
        const result = '    '.repeat(indent) + trimmed;
        if (trimmed.startsWith('function') || trimmed.startsWith('if') || trimmed.startsWith('for') || trimmed.startsWith('while') || trimmed.startsWith('repeat') || trimmed.startsWith('do') || trimmed.endsWith('then') || trimmed.endsWith('do')) {
            indent++;
        }
        return result;
    }).join('\n');
    
    elements.codeEditor.value = formatted;
    state.editorContent = formatted;
    updateLineNumbers();
    showNotification('代码已格式化', 'success');
}

function showHint() {
    const chapter = getCurrentChapter(state.currentChapter);
    if (chapter.hint) {
        showModal('💡 提示', chapter.hint);
    } else {
        showNotification('本章暂无提示', 'info');
    }
}

// ============================================================================
// 控制台
// ============================================================================
function logToConsole(message, level = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${level}`;
    line.innerHTML = `<span class="timestamp">[${timestamp}]</span><span class="level">${level.toUpperCase()}</span>${message}`;
    elements.consoleOutput.appendChild(line);
    elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
    
    state.consoleLogs.push({ timestamp, level, message });
}

function clearConsole() {
    elements.consoleOutput.innerHTML = '';
    state.consoleLogs = [];
}

function exportConsole() {
    const content = state.consoleLogs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
}

function filterConsole() {
    const showErrors = elements.filterErrors.checked;
    const showWarnings = elements.filterWarnings.checked;
    const showLogs = elements.filterLogs.checked;
    
    document.querySelectorAll('.console-line').forEach(line => {
        const isError = line.classList.contains('error');
        const isWarn = line.classList.contains('warn');
        const isLog = line.classList.contains('log') || line.classList.contains('info') || line.classList.contains('success');
        
        let show = false;
        if (isError && showErrors) show = true;
        if (isWarn && showWarnings) show = true;
        if (isLog && showLogs) show = true;
        
        line.style.display = show ? 'block' : 'none';
    });
}

// ============================================================================
// 目标检查与章节完成
// ============================================================================
function checkObjectives(code, result) {
    const chapter = getCurrentChapter(state.currentChapter);
    if (!chapter.objectives) return;
    
    chapter.objectives.forEach(obj => {
        if (state.completedObjectives.includes(obj.id)) return;
        
        if (obj.check(code, result, state)) {
            completeObjective(obj);
        }
    });
    
    updateObjectivesUI();
}

function completeObjective(obj) {
    state.completedObjectives.push(obj.id);
    
    // 奖励
    if (obj.reward) {
        if (obj.reward.money) state.money += obj.reward.money;
        if (obj.reward.xp) state.xp += obj.reward.xp;
        if (obj.reward.reputation) state.reputation += obj.reward.reputation;
        if (obj.reward.skill) state.unlockedSkills.push(obj.reward.skill);
    }
    
    showNotification(`目标完成：${obj.title}`, 'success');
    updateUI(elements, state);
    updateObjectivesUI();
}

function updateObjectivesUI() {
    const chapter = getCurrentChapter(state.currentChapter);
    if (!chapter.objectives) return;
    
    elements.objectivesList.innerHTML = chapter.objectives.map(obj => {
        const completed = state.completedObjectives.includes(obj.id);
        return `
            <li class="objective-item ${completed ? 'completed' : ''}">
                <div class="objective-checkbox">${completed ? '✓' : ''}</div>
                <span class="objective-text">${obj.title}</span>
                ${obj.reward ? `<span class="objective-reward">+${obj.reward.xp || 0} XP ${obj.reward.money ? '$' + obj.reward.money : ''}</span>` : ''}
            </li>
        `;
    }).join('');
    
    // 更新进度条
    const total = chapter.objectives.length;
    const done = chapter.objectives.filter(o => state.completedObjectives.includes(o.id)).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `${percent}%`;
}

function completeChapter() {
    const chapter = getCurrentChapter(state.currentChapter);
    showNotification(`章节「${chapter.title}」完成！`, 'success');
    
    // 解锁下一章
    const chapters = ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'endless'];
    const currentIndex = chapters.indexOf(state.currentChapter);
    if (currentIndex < chapters.length - 1) {
        const nextChapter = chapters[currentIndex + 1];
        // 这里可以添加解锁动画
        setTimeout(() => {
            if (confirm(`解锁下一章：${getCurrentChapter(nextChapter).title}？`)) {
                state.currentChapter = nextChapter;
                loadChapter(nextChapter);
                updateUI(elements, state);
            }
        }, 1000);
    }
}

// ============================================================================
// 键盘快捷键
// ============================================================================
function handleKeydown(e) {
    // Ctrl/Cmd + Enter: 运行代码
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
    }
    
    // Ctrl/Cmd + T: 运行测试
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        runTests();
    }
    
    // Ctrl/Cmd + S: 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveGame(state);
        showNotification('游戏已保存', 'success');
    }
    
    // Escape: 关闭模态框
    if (e.key === 'Escape') {
        closeModal();
    }
}

// ============================================================================
// 模态框
// ============================================================================
function closeModal() {
    elements.modalContainer.hidden = true;
    elements.modalContainer.innerHTML = '';
}

// ============================================================================
// 招聘模态框
// ============================================================================
function showHireModal() {
    const candidates = generateCandidates(3);
    const html = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">招聘员工</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <p>可用候选人（刷新需花费 $100）：</p>
                <div id="candidateList">${renderCandidates(candidates)}</div>
                <button class="btn btn-secondary" id="btnRefreshCandidates">刷新候选人 ($100)</button>
            </div>
        </div>
    `;
    elements.modalContainer.innerHTML = html;
    elements.modalContainer.hidden = false;
    
    document.getElementById('btnRefreshCandidates').addEventListener('click', () => {
        if (state.money >= 100) {
            state.money -= 100;
            const newCandidates = generateCandidates(3);
            document.getElementById('candidateList').innerHTML = renderCandidates(newCandidates);
            bindCandidateEvents(newCandidates);
            updateUI(elements, state);
        } else {
            showNotification('资金不足', 'warning');
        }
    });
    
    bindCandidateEvents(candidates);
}

function generateCandidates(count) {
    const roles = ['程序员', '美术', '策划', '音效', 'QA'];
    const names = ['小明', '小红', '小李', '小张', '小王', '小陈', '小刘', '小杨'];
    
    return Array.from({ length: count }, () => ({
        name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100),
        role: roles[Math.floor(Math.random() * roles.length)],
        skill: Math.floor(Math.random() * 5) + 1,
        salary: Math.floor(Math.random() * 500) + 500,
        traits: ['快速学习', '完美主义', '团队合作', '独行侠', '夜猫子'].sort(() => 0.5 - Math.random()).slice(0, 2),
    }));
}

function renderCandidates(candidates) {
    return candidates.map((c, i) => `
        <div class="candidate-card" data-index="${i}">
            <h4>${c.name} <span class="candidate-role">${c.role}</span></h4>
            <div class="candidate-stats">
                <span>技能: ${'★'.repeat(c.skill)}</span>
                <span>薪资: $${c.salary}/月</span>
                <span>特质: ${c.traits.join(', ')}</span>
            </div>
            <button class="btn btn-primary btn-sm btn-hire" data-index="${i}">雇佣</button>
        </div>
    `).join('');
}

function bindCandidateEvents(candidates) {
    document.querySelectorAll('.btn-hire').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const candidate = candidates[idx];
            if (state.money >= candidate.salary * 3) { // 预付3个月
                state.money -= candidate.salary * 3;
                state.studio.employees.push({ ...candidate, id: Date.now() + idx });
                showNotification(`成功雇佣 ${candidate.name}!`, 'success');
                closeModal();
                loadSidebarContent('studio');
                updateUI(elements, state);
            } else {
                showNotification('资金不足支付预付薪资', 'warning');
            }
        });
    });
}

// ============================================================================
// 存档导入导出
// ============================================================================
// exportSave 和 importSave 在 storage.js 中实现

// ============================================================================
// 重置游戏
// ============================================================================
function resetGame() {
    if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
        localStorage.removeItem('luaquest-save');
        location.reload();
    }
}

// ============================================================================
// Game Jam 相关
// ============================================================================
function submitGameJam() {
    // 评分逻辑
    const score = calculateJamScore();
    state.gameJam.score = score;
    state.money += score * 10;
    state.reputation += score;
    state.xp += score * 5;
    state.gameJam.active = false;
    
    showNotification(`Game Jam 结束！得分：${score}`, 'success');
    loadSidebarContent('gamejam');
    updateUI(elements, state);
}

function calculateJamScore() {
    // 基于代码质量、完成度、创新度评分
    const code = elements.codeEditor.value;
    let score = 50; // 基础分
    
    // 代码行数奖励
    score += Math.min(code.split('\n').length * 2, 100);
    
    // 使用特定 API 奖励
    const apis = ['DataStore', 'RemoteEvent', 'TweenService', 'PhysicsService'];
    apis.forEach(api => {
        if (code.includes(api)) score += 20;
    });
    
    // 随机因素
    score += Math.floor(Math.random() * 50);
    
    return Math.min(score, 300);
}

function showJamHistory() {
    // 显示历史记录模态框
    showModal('Game Jam 历史', '暂无历史记录');
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// 自动保存
// ============================================================================
function startAutoSave() {
    setInterval(() => {
        if (state.settings.autoSave) {
            saveGame(state);
        }
    }, 30000); // 每30秒
}

// ============================================================================
// 启动
// ============================================================================
init().catch(console.error);

// 导出给全局调试
window.LuaQuest = { state, elements, runCode, runTests, logToConsole };