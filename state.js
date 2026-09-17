/**
 * 状态管理模块
 * 单一状态源，响应式更新
 */

export function createState(initialState = {}) {
    const listeners = new Map(); // key -> Set<callback>
    let state = { ...initialState };
    
    // 缓存已代理的对象，避免重复包装
    const proxyCache = new WeakMap();
    
    function createProxy(obj, path = '') {
        if (proxyCache.has(obj)) return proxyCache.get(obj);
        
        const handler = {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // 如果是对象，返回代理以支持深层监听
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    return createProxy(value, `${path}.${prop}`);
                }
                return value;
            },
            set(target, prop, value) {
                const old = target[prop];
                const result = Reflect.set(target, prop, value);
                if (old !== value) {
                    notify(`${path}.${prop}`, value, old);
                }
                return result;
            }
        };
        
        const proxy = new Proxy(obj, handler);
        proxyCache.set(obj, proxy);
        return proxy;
    }
    
    const proxy = createProxy(state);
    
    function notify(key, newVal, oldVal) {
        const keyListeners = listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(cb => cb(newVal, oldVal, key));
        }
        // 通知通配符监听器
        const allListeners = listeners.get('*');
        if (allListeners) {
            allListeners.forEach(cb => cb(newVal, oldVal, key));
        }
    }
    
    // 给 proxy 添加额外方法
    proxy.get = (key) => {
        const keys = key.split('.');
        let val = state;
        for (const k of keys) {
            if (val === undefined || val === null) return undefined;
            val = val[k];
        }
        return val;
    };
    
    proxy.set = (key, value) => {
        const keys = key.split('.');
        if (keys.length === 1) {
            proxy[key] = value;
        } else {
            let obj = proxy;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        }
    };
    
    proxy.subscribe = (key, callback) => {
        if (!listeners.has(key)) {
            listeners.set(key, new Set());
        }
        listeners.get(key).add(callback);
        return () => listeners.get(key).delete(callback);
    };
    
    proxy.batch = (updates) => {
        Object.entries(updates).forEach(([key, value]) => {
            proxy[key] = value;
        });
    };
    
    proxy.reset = (newState = {}) => {
        state = { ...initialState, ...newState };
        // 清理代理缓存
        proxyCache.clear();
        // 重新代理新状态
        Object.assign(proxy, createProxy(state));
        // 重新通知所有监听器
        listeners.forEach((callbacks, key) => {
            if (key !== '*') {
                const val = state[key];
                callbacks.forEach(cb => cb(val, undefined, key));
            }
        });
    };
    
    return proxy;
}

// 计算属性辅助
export function computed(state, key, computeFn) {
    let cached = computeFn(state.get(key));
    const unsubscribe = state.subscribe(key, (newVal) => {
        cached = computeFn(newVal);
    });
    return {
        get value() { return cached; },
        destroy: unsubscribe
    };
}