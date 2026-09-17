/**
 * 存储模块
 * 支持 localStorage、IndexedDB、OPFS (Origin Private File System)
 * 提供导入/导出存档功能
 */

const STORAGE_KEY = 'luaquest-save';
const STORAGE_VERSION = 1;

// 存储后端优先级：OPFS > IndexedDB > localStorage
let storageBackend = null;

export async function initStorage() {
    // 尝试 OPFS (Chrome 86+, Firefox 101+, Safari 15.2+)
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        try {
            const root = await navigator.storage.getDirectory();
            await root.getFileHandle('save.json', { create: true });
            storageBackend = 'opfs';
            console.log('[Storage] 使用 OPFS 存储');
            return;
        } catch (e) {
            console.warn('[Storage] OPFS 不可用:', e);
        }
    }
    
    // 尝试 IndexedDB
    if ('indexedDB' in window) {
        try {
            await testIndexedDB();
            storageBackend = 'indexeddb';
            console.log('[Storage] 使用 IndexedDB 存储');
            return;
        } catch (e) {
            console.warn('[Storage] IndexedDB 不可用:', e);
        }
    }
    
    // 回退到 localStorage
    storageBackend = 'localstorage';
    console.log('[Storage] 使用 localStorage 存储');
}

async function testIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LuaQuestTest', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            request.result.close();
            indexedDB.deleteDatabase('LuaQuestTest');
            resolve();
        };
        request.onupgradeneeded = (e) => {
            e.target.result.createObjectStore('saves');
        };
    });
}

/**
 * 保存游戏
 */
export async function saveGame(state) {
    const saveData = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        state: state.toJSON ? state.toJSON() : state,
    };
    
    const json = JSON.stringify(saveData);
    
    try {
        switch (storageBackend) {
            case 'opfs':
                await saveToOPFS(json);
                break;
            case 'indexeddb':
                await saveToIndexedDB(json);
                break;
            default:
                saveToLocalStorage(json);
        }
        console.log('[Storage] 游戏已保存');
        return true;
    } catch (error) {
        console.error('[Storage] 保存失败:', error);
        return false;
    }
}

/**
 * 加载游戏
 */
export async function loadGame() {
    try {
        let json;
        switch (storageBackend) {
            case 'opfs':
                json = await loadFromOPFS();
                break;
            case 'indexeddb':
                json = await loadFromIndexedDB();
                break;
            default:
                json = loadFromLocalStorage();
        }
        
        if (!json) return null;
        
        const saveData = JSON.parse(json);
        
        // 版本迁移
        if (saveData.version !== STORAGE_VERSION) {
            return migrateSave(saveData);
        }
        
        console.log('[Storage] 游戏已加载');
        return saveData.state;
    } catch (error) {
        console.error('[Storage] 加载失败:', error);
        return null;
    }
}

/**
 * 导出存档文件
 */
export function exportSave(state) {
    const saveData = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        state: state.toJSON ? state.toJSON() : state,
    };
    
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `luaquest-save-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    return true;
}

/**
 * 导入存档文件
 */
export function importSave(file, state) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const saveData = JSON.parse(e.target.result);
                
                // 验证存档格式
                if (!saveData.state) {
                    throw new Error('无效的存档文件');
                }
                
                // 版本迁移
                let finalState = saveData.state;
                if (saveData.version !== STORAGE_VERSION) {
                    finalState = migrateSave(saveData);
                }
                
                // 应用到状态
                if (state.batch) {
                    state.batch(finalState);
                } else {
                    Object.assign(state, finalState);
                }
                
                // 保存到存储后端
                await saveGame(state);
                
                console.log('[Storage] 存档导入成功');
                resolve(true);
            } catch (error) {
                console.error('[Storage] 导入失败:', error);
                reject(error);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * 存档版本迁移
 */
function migrateSave(saveData) {
    console.log(`[Storage] 迁移存档从 v${saveData.version} 到 v${STORAGE_VERSION}`);
    
    let state = saveData.state;
    
    // v1 -> v2 迁移示例
    if (saveData.version < 2) {
        // 添加新字段默认值
        state.settings = state.settings || {};
        state.settings.autoSave = state.settings.autoSave ?? true;
        state.settings.fontSize = state.settings.fontSize ?? 14;
    }
    
    return state;
}

// ============================================================================
// OPFS 实现
// ============================================================================
async function saveToOPFS(json) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle('save.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
}

async function loadFromOPFS() {
    try {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle('save.json');
        const file = await handle.getFile();
        return await file.text();
    } catch (e) {
        if (e.name === 'NotFoundError') return null;
        throw e;
    }
}

// ============================================================================
// IndexedDB 实现
// ============================================================================
function getIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LuaQuest', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('saves')) {
                db.createObjectStore('saves');
            }
        };
    });
}

async function saveToIndexedDB(json) {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(json, 'autosave');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadFromIndexedDB() {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.get('autosave');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

// ============================================================================
// localStorage 实现
// ============================================================================
function saveToLocalStorage(json) {
    localStorage.setItem(STORAGE_KEY, json);
}

function loadFromLocalStorage() {
    return localStorage.getItem(STORAGE_KEY);
}

/**
 * 清除存档
 */
export function clearSave() {
    switch (storageBackend) {
        case 'opfs':
            navigator.storage.getDirectory().then(root => root.removeEntry('save.json'));
            break;
        case 'indexeddb':
            indexedDB.deleteDatabase('LuaQuest');
            break;
        default:
            localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * 获取存储使用情况
 */
export async function getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
            used: estimate.usage,
            quota: estimate.quota,
            backend: storageBackend,
        };
    }
    return { backend: storageBackend };
}