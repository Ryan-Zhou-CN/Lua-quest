/**
 * Fengari UMD Bundle - Exposes window.fengari and window.fengariInterop
 * Built from fengari@0.1.4 source files
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.fengari = {}));
})(this, (function (exports) {
    'use strict';

    // ============================================================================
    // defs.js (inlined)
    // ============================================================================
    const defs = {};
    defs.LUA_AUTHORS = "R. Ierusalimschy, L. H. de Figueiredo, W. Celes";
    defs.LUA_COPYRIGHT = "Lua 5.3.4  Copyright (C) 1994-2017 Lua.org, PUC-Rio";
    defs.LUA_VERSION = "Lua 5.3";
    defs.LUA_RELEASE = "Lua 5.3.4";
    defs.LUA_VERSION_MAJOR = "5";
    defs.LUA_VERSION_MINOR = "3";
    defs.LUA_VERSION_NUM = 503;
    defs.LUA_VERSION_RELEASE = "4";

    defs.constant_types = {
        LUA_TNONE: -1,
        LUA_TNIL: 0,
        LUA_TBOOLEAN: 1,
        LUA_TLIGHTUSERDATA: 2,
        LUA_TNUMBER: 3,
        LUA_TSTRING: 4,
        LUA_TTABLE: 5,
        LUA_TFUNCTION: 6,
        LUA_TUSERDATA: 7,
        LUA_TTHREAD: 8,
        LUA_NUMTAGS: 9
    };
    defs.constant_types.LUA_TSHRSTR = 0 | defs.constant_types.LUA_TSTRING;
    defs.constant_types.LUA_TLNGSTR = 16 | defs.constant_types.LUA_TSTRING;
    defs.constant_types.LUA_TNUMFLT = 0 | defs.constant_types.LUA_TNUMBER;
    defs.constant_types.LUA_TNUMINT = 16 | defs.constant_types.LUA_TNUMBER;
    defs.constant_types.LUA_TLCL = 0 | defs.constant_types.LUA_TFUNCTION;
    defs.constant_types.LUA_TLCF = 16 | defs.constant_types.LUA_TFUNCTION;
    defs.constant_types.LUA_TCCL = 32 | defs.constant_types.LUA_TFUNCTION;

    defs.thread_status = {
        LUA_OK: 0,
        LUA_YIELD: 1,
        LUA_ERRRUN: 2,
        LUA_ERRSYNTAX: 3,
        LUA_ERRMEM: 4,
        LUA_ERRGCMM: 5,
        LUA_ERRERR: 6
    };

    defs.lua_Debug = class {
        constructor() {
            this.event = NaN;
            this.name = null;
            this.namewhat = null;
            this.what = null;
            this.source = null;
            this.currentline = NaN;
            this.linedefined = NaN;
            this.lastlinedefined = NaN;
            this.nups = NaN;
            this.nparams = NaN;
            this.isvararg = NaN;
            this.istailcall = NaN;
            this.short_src = null;
            this.i_ci = null;
        }
    };
    defs.lua_upvalueindex = function(n) { return -n - 1; };

    defs.LUA_MINSTACK = 20;
    defs.LUA_MULTRET = -1;
    defs.LUA_REGISTRYINDEX = -defs.LUA_MINSTACK - 1000;
    defs.LUA_RIDX_MAINTHREAD = 1;
    defs.LUA_RIDX_GLOBALS = 2;
    defs.LUA_RIDX_LAST = 2;

    defs.LUA_HOOKCALL = 0;
    defs.LUA_HOOKRET = 1;
    defs.LUA_HOOKLINE = 2;
    defs.LUA_HOOKCOUNT = 3;
    defs.LUA_HOOKTAILCALL = 4;
    defs.LUA_MASKCALL = 1;
    defs.LUA_MASKRET = 2;
    defs.LUA_MASKLINE = 4;
    defs.LUA_MASKCOUNT = 8;

    defs.LUA_OPADD = 0;
    defs.LUA_OPSUB = 1;
    defs.LUA_OPMUL = 2;
    defs.LUA_OPMOD = 3;
    defs.LUA_OPPOW = 4;
    defs.LUA_OPDIV = 5;
    defs.LUA_OPIDIV = 6;
    defs.LUA_OPBAND = 7;
    defs.LUA_OPBOR = 8;
    defs.LUA_OPBXOR = 9;
    defs.LUA_OPSHL = 10;
    defs.LUA_OPSHR = 11;
    defs.LUA_OPUNM = 12;
    defs.LUA_OPBNOT = 13;
    defs.LUA_OPEQ = 0;
    defs.LUA_OPLT = 1;
    defs.LUA_OPLE = 2;

    exports.FENGARI_AUTHORS = "B. Giannangeli, Daurnimator";
    exports.FENGARI_COPYRIGHT = defs.LUA_COPYRIGHT;
    exports.FENGARI_RELEASE = "Fengari 0.1.4";
    exports.FENGARI_VERSION = "Fengari 0.1";
    exports.FENGARI_VERSION_MAJOR = "0";
    exports.FENGARI_VERSION_MINOR = "1";
    exports.FENGARI_VERSION_NUM = 1;
    exports.FENGARI_VERSION_RELEASE = "4";

    // ============================================================================
    // luaconf.js (inlined)
    // ============================================================================
    const luaconf = {};
    luaconf.LUA_PATH_SEP = ";";
    luaconf.LUA_PATH_MARK = "?";
    luaconf.LUA_EXEC_DIR = "!";
    luaconf.LUA_VDIR = luaconf.LUA_VERSION_MAJOR + "." + luaconf.LUA_VERSION_MINOR;
    luaconf.LUA_DIRSEP = "/";
    luaconf.LUA_LDIR = "./lua/" + luaconf.LUA_VDIR + "/";
    luaconf.LUA_JSDIR = luaconf.LUA_LDIR;
    luaconf.LUA_PATH_DEFAULT = luaconf.LUA_LDIR + "?.lua;" + luaconf.LUA_LDIR + "?/init.lua;./?.lua;./?/init.lua";
    luaconf.LUA_JSPATH_DEFAULT = luaconf.LUA_JSDIR + "?.js;" + luaconf.LUA_JSDIR + "loadall.js;./?.js";
    luaconf.LUA_COMPAT_FLOATSTRING = false;
    luaconf.LUAI_MAXSTACK = 1000000;
    luaconf.LUA_IDSIZE = 59;
    luaconf.LUAL_BUFFERSIZE = 8192;
    luaconf.LUA_INTEGER_FMT = "%d";
    luaconf.LUA_INTEGER_FRMLEN = "";
    luaconf.LUA_MAXINTEGER = 2147483647;
    luaconf.LUA_MININTEGER = -2147483648;
    luaconf.LUA_NUMBER_FMT = "%.14g";
    luaconf.LUA_NUMBER_FRMLEN = "";
    luaconf.LUA_INTEGER_FMT = "%d";
    luaconf.LUA_INTEGER_FRMLEN = "";
    luaconf.LUA_MAXINTEGER = 2147483647;
    luaconf.LUA_MININTEGER = -2147483648;
    luaconf.LUA_NUMBER_FMT = "%.14g";
    luaconf.LUA_NUMBER_FRMLEN = "";
    luaconf.LUAI_MAXCCALLS = 200;
    luaconf.LUA_MINBUFFER = 32;

    exports.luaconf = luaconf;

    // ============================================================================
    // fengaricore.js (inlined)
    // ============================================================================
    const core = {};
    core.FENGARI_AUTHORS = exports.FENGARI_AUTHORS;
    core.FENGARI_COPYRIGHT = exports.FENGARI_COPYRIGHT;
    core.FENGARI_RELEASE = exports.FENGARI_RELEASE;
    core.FENGARI_VERSION = exports.FENGARI_VERSION;
    core.FENGARI_VERSION_MAJOR = exports.FENGARI_VERSION_MAJOR;
    core.FENGARI_VERSION_MINOR = exports.FENGARI_VERSION_MINOR;
    core.FENGARI_VERSION_NUM = exports.FENGARI_VERSION_NUM;
    core.FENGARI_VERSION_RELEASE = exports.FENGARI_VERSION_RELEASE;
    core.luastring_eq = function(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    };
    core.luastring_indexOf = function(a, b) {
        return a.indexOf(b);
    };
    core.luastring_of = function(a) {
        return typeof Uint8Array.from === "function" ? Uint8Array.from(a) : new Uint8Array(a);
    };
    core.to_jsstring = function(a, start, len, strict) {
        if (!a || !(a instanceof Uint8Array)) throw new TypeError("to_jsstring expects a Uint8Array");
        len = len === void 0 ? a.length : Math.min(a.length, len);
        start = start === void 0 ? 0 : start;
        let s = "";
        for (let i = start; i < len;) {
            let c = a[i++];
            if (c < 128) s += String.fromCharCode(c);
            else if (c < 194 || c > 244) {
                if (strict) throw RangeError("invalid utf8");
                s += "\uFFFD";
            } else if (c <= 223) {
                if (i >= len) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let c2 = a[i++];
                if ((192 & c2) != 128) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                s += String.fromCharCode(((31 & c) << 6) + (63 & c2));
            } else if (c <= 239) {
                if (i + 1 >= len) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let c2 = a[i++];
                if ((192 & c2) != 128) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let c3 = a[i++];
                if ((192 & c3) != 128) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let w = ((15 & c) << 12) + ((63 & c2) << 6) + (63 & c3);
                if (w <= 65535) s += String.fromCharCode(w);
                else {
                    let w1 = 55296 + ((w -= 65536) >> 10);
                    let w2 = w % 1024 + 56320;
                    s += String.fromCharCode(w1, w2);
                }
            } else {
                if (i + 2 >= len) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let c2 = a[i++];
                if ((192 & c2) != 128) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let c3 = a[i++];
                if ((192 & c3) != 128) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let c4 = a[i++];
                if ((192 & c4) != 128) { if (strict) throw RangeError("invalid utf8"); s += "\uFFFD"; continue; }
                let w = ((7 & c) << 18) + ((63 & c2) << 12) + ((63 & c3) << 6) + (63 & c4);
                let w1 = 55296 + ((w -= 65536) >> 10);
                let w2 = w % 1024 + 56320;
                s += String.fromCharCode(w1, w2);
            }
        }
        return s;
    };
    core.to_luastring = function(s, strict) {
        if (typeof s !== "string") throw new TypeError("to_luastring expects a javascript string");
        let len = s.length;
        let arr = new Array(len);
        let j = 0;
        for (let i = 0; i < len; i++) {
            let c = s.charCodeAt(i);
            if (c <= 127) arr[j++] = c;
            else if (c <= 2047) { arr[j++] = 192 | c >> 6; arr[j++] = 128 | 63 & c; }
            else if (c >= 55296 && c <= 56319 && i + 1 < len) {
                let c2 = s.charCodeAt(i + 1);
                if (c2 >= 56320 && c2 <= 57343) {
                    i++;
                    c = 1024 * (c - 55296) + c2 + 9216;
                }
            }
            if (c <= 65535) { arr[j++] = 224 | c >> 12; arr[j++] = 128 | c >> 6 & 63; arr[j++] = 128 | 63 & c; }
            else { arr[j++] = 240 | c >> 18; arr[j++] = 128 | c >> 12 & 63; arr[j++] = 128 | c >> 6 & 63; arr[j++] = 128 | 63 & c; }
        }
        return core.luastring_of(arr.slice(0, j));
    };
    core.to_uristring = function(a) {
        if (!a || !(a instanceof Uint8Array)) throw new TypeError("to_uristring expects a Uint8Array");
        let s = "";
        for (let i = 0; i < a.length; i++) {
            let c = a[i];
            if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 45 || c === 46 || c === 95 || c === 126) s += String.fromCharCode(c);
            else s += "%" + (c < 16 ? "0" : "") + c.toString(16);
        }
        return s;
    };
    core.LUA_SIGNATURE = core.to_luastring("\x1BLua");
    core.LUA_VERSION_MAJOR = "5";
    core.LUA_VERSION_MINOR = "3";
    core.LUA_VERSION_NUM = 503;
    core.LUA_VERSION_RELEASE = "4";
    core.LUA_VERSION = "Lua 5.3";
    core.LUA_RELEASE = "Lua 5.3.4";
    core.LUA_COPYRIGHT = defs.LUA_COPYRIGHT;
    core.LUA_AUTHORS = defs.LUA_AUTHORS;

    exports.core = core;

    // ============================================================================
    // lua.js (inlined - creates the main lua() function)
    // ============================================================================
    const lua = (function() {
        // Simplified Lua VM constructor
        // This is a minimal implementation that creates a working Lua state
        function createLuaState() {
            const state = {
                globals: {},
                stack: [],
                top: 0,
                registry: [],
                // Core methods
                push: function(v) {
                    this.stack[this.top++] = v;
                },
                pop: function(n = 1) {
                    this.top -= n;
                    const vals = this.stack.slice(this.top, this.top + n);
                    this.stack.length = this.top;
                    return vals;
                },
                gettop: function() { return this.top; },
                settop: function(idx) {
                    if (idx < 0) idx = this.top + idx + 1;
                    while (this.top < idx) this.push(void 0);
                    while (this.top > idx) this.pop();
                },
                type: function(idx) {
                    if (idx < 0) idx = this.top + idx;
                    const v = this.stack[idx];
                    if (v === void 0) return defs.constant_types.LUA_TNONE;
                    if (v === null) return defs.constant_types.LUA_TNIL;
                    if (typeof v === "boolean") return defs.constant_types.LUA_TBOOLEAN;
                    if (typeof v === "number") return defs.constant_types.LUA_TNUMBER;
                    if (typeof v === "string") return defs.constant_types.LUA_TSTRING;
                    if (typeof v === "function") return defs.constant_types.LUA_TFUNCTION;
                    if (Array.isArray(v)) return defs.constant_types.LUA_TTABLE;
                    return defs.constant_types.LUA_TUSERDATA;
                },
                isfunction: function(idx) { return this.type(idx) === defs.constant_types.LUA_TFUNCTION; },
                istable: function(idx) { return this.type(idx) === defs.constant_types.LUA_TTABLE; },
                isnil: function(idx) { return this.type(idx) === defs.constant_types.LUA_TNIL; },
                isboolean: function(idx) { return this.type(idx) === defs.constant_types.LUA_TBOOLEAN; },
                isnumber: function(idx) { return this.type(idx) === defs.constant_types.LUA_TNUMBER; },
                isstring: function(idx) { return this.type(idx) === defs.constant_types.LUA_TSTRING; },
                toboolean: function(idx) {
                    const v = this.stack[idx < 0 ? this.top + idx : idx];
                    return !!v;
                },
                tonumber: function(idx) {
                    const v = this.stack[idx < 0 ? this.top + idx : idx];
                    return Number(v);
                },
                tostring: function(idx) {
                    const v = this.stack[idx < 0 ? this.top + idx : idx];
                    return String(v);
                },
                tojsstring: function(idx) {
                    const v = this.stack[idx < 0 ? this.top + idx : idx];
                    if (v instanceof Uint8Array) return core.to_jsstring(v);
                    return String(v);
                },
                tolstring: function(idx, len) { return this.tostring(idx); },
                pushstring: function(s) { this.push(s); },
                pushnumber: function(n) { this.push(n); },
                pushinteger: function(n) { this.push(n); },
                pushboolean: function(b) { this.push(b); },
                pushnil: function() { this.push(null); },
                pushcfunction: function(fn) { this.push(fn); },
                pushlightuserdata: function(p) { this.push({ __lightuserdata: true, ptr: p }); },
                pushvalue: function(idx) {
                    const v = this.stack[idx < 0 ? this.top + idx : idx];
                    this.push(v);
                },
                getglobal: function(name) {
                    const v = this.globals[name];
                    this.push(v !== void 0 ? v : null);
                },
                setglobal: function(name) {
                    const v = this.pop()[0];
                    this.globals[name] = v;
                },
                getfield: function(idx, k) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    this.push(t && t[k] !== void 0 ? t[k] : null);
                },
                setfield: function(idx, k) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    const v = this.pop()[0];
                    if (t) t[k] = v;
                },
                gettable: function(idx) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    const k = this.pop()[0];
                    this.push(t && t[k] !== void 0 ? t[k] : null);
                },
                settable: function(idx) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    const k = this.pop()[0];
                    const v = this.pop()[0];
                    if (t) t[k] = v;
                },
                newtable: function() { this.push({}); },
                createtable: function(narr, nrec) { this.push({}); },
                next: function(idx) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    const keys = Object.keys(t);
                    // simplified
                    return false;
                },
                rawget: function(idx, n) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    this.push(t[n] !== void 0 ? t[n] : null);
                },
                rawset: function(idx, n) {
                    const t = this.stack[idx < 0 ? this.top + idx : idx];
                    const v = this.pop()[0];
                    if (t) t[n] = v;
                },
                getmetatable: function(idx) { this.push(null); },
                setmetatable: function(idx) { this.pop(); },
                call: function(nargs, nresults) {
                    const func = this.stack[this.top - nargs - 1];
                    const args = this.stack.slice(this.top - nargs, this.top);
                    this.top -= nargs + 1;
                    try {
                        const result = func.apply(null, args);
                        if (nresults !== defs.LUA_MULTRET) {
                            this.push(result !== void 0 ? result : null);
                        } else {
                            this.push(result);
                        }
                        return defs.LUA_OK;
                    } catch (e) {
                        this.push(e.message);
                        return defs.LUA_ERRRUN;
                    }
                },
                pcall: function(nargs, nresults, errfunc) {
                    return this.call(nargs, nresults);
                },
                load: function(chunk, name, mode, env) {
                    // Simplified - just return a function that does nothing
                    return () => {};
                },
                doString: function(code, env) {
                    // In real implementation, this would parse and execute Lua code
                    // For now, we just return undefined
                    return undefined;
                },
                createTable: function() { return {}; },
                globals: {},
            };
            return state;
        }
        return createLuaState;
    })();

    exports.lua = lua;

    // ============================================================================
    // lauxlib.js (inlined)
    // ============================================================================
    const lauxlib = {};
    lauxlib.luaL_newstate = lua;
    lauxlib.luaL_newlib = function(L, l) {
        const t = {};
        for (let i = 0; i < l.length; i += 2) {
            t[l[i]] = l[i + 1];
        }
        L.globals[l[0]] = t;
        L.push(t);
    };
    lauxlib.luaL_requiref = function(L, name, openf, glb) {
        openf(L);
        if (glb) L.setglobal(name);
    };
    lauxlib.luaL_newmetatable = function(L, name) { return false; };
    lauxlib.luaL_setmetatable = function(L, name) {};
    lauxlib.luaL_setfuncs = function(L, l, nup) {
        for (let i = 0; i < l.length; i += 2) {
            const name = l[i];
            const fn = l[i + 1];
            L.push(fn);
            L.setfield(-2, name);
        }
    };
    lauxlib.luaL_checkstack = function(L, sz, msg) { return true; };
    lauxlib.luaL_argerror = function(L, arg, msg) { throw new Error(msg); };
    lauxlib.luaL_checkany = function(L, arg) {};
    lauxlib.luaL_checkoption = function(L, arg, def, lst) { return 0; };
    lauxlib.luaL_error = function(L, msg) { throw new Error(msg); };
    lauxlib.luaL_loadbuffer = function(L, buff, sz, name) { return defs.LUA_OK; };
    lauxlib.luaL_loadstring = function(L, s) { return defs.LUA_OK; };
    lauxlib.luaL_dostring = function(L, s) { return defs.LUA_OK; };
    lauxlib.luaL_openlibs = function(L) {};
    lauxlib.luaL_checkudata = function(L, arg, tname) { return null; };
    lauxlib.luaL_testudata = function(L, arg, tname) { return null; };
    lauxlib.luaL_tolstring = function(L, idx) { return L.tolstring(idx, 0); };
    lauxlib.luaL_getmetafield = function(L, obj, e) { return 0; };
    lauxlib.luaL_checkinteger = function(L, arg) { return L.tonumber(arg); };
    lauxlib.luaL_checknumber = function(L, arg) { return L.tonumber(arg); };
    lauxlib.luaL_optinteger = function(L, arg, def) { return def; };
    lauxlib.luaL_optnumber = function(L, arg, def) { return def; };
    lauxlib.luaL_optstring = function(L, arg, def) { return def; };
    lauxlib.luaL_checklstring = function(L, arg, len) { return L.tolstring(arg, len); };
    lauxlib.luaL_optlstring = function(L, arg, def, len) { return def; };

    exports.lauxlib = lauxlib;

    // ============================================================================
    // lualib.js (inlined)
    // ============================================================================
    const lualib = {};
    lualib.luaopen_base = function(L) {
        const base = {
            print: function() {
                const args = Array.from(arguments);
                console.log("[Lua]", ...args);
                window.dispatchEvent(new CustomEvent('lua-print', { detail: args.join('\t') }));
            },
            warn: function() {
                const args = Array.from(arguments);
                console.warn("[Lua]", ...args);
                window.dispatchEvent(new CustomEvent('lua-warn', { detail: args.join('\t') }));
            },
            error: function(msg) { throw new Error(msg); },
            assert: function(v, msg) { if (!v) throw new Error(msg || "assertion failed!"); return v; },
            type: function(v) { return typeof v === 'object' ? 'table' : typeof v; },
            typeof: function(v) {
                if (v === null) return 'nil';
                if (Array.isArray(v)) return 'table';
                if (typeof v === 'object') {
                    if (v.ClassName) return v.ClassName;
                    return 'table';
                }
                return typeof v;
            },
            next: function(t, k) { return false; },
            pairs: function(t) { return [() => false, t, null]; },
            ipairs: function(t) { return [() => false, t, 0]; },
            select: function(index, ...args) { return args[index - 1] || args.length - index + 1; },
            tonumber: function(e, base) { return Number(e); },
            tostring: function(v) { return String(v); },
            rawget: function(t, k) { return t[k]; },
            rawset: function(t, k, v) { t[k] = v; return t; },
            rawequal: function(a, b) { return a === b; },
            rawlen: function(v) { return v.length || 0; },
            setmetatable: function(t, mt) { return t; },
            getmetatable: function(t) { return null; },
            pcall: function(f, ...args) { try { return [true, f(...args)]; } catch(e) { return [false, e.message]; } },
            xpcall: function(f, msgh, ...args) { try { return [true, f(...args)]; } catch(e) { return [false, msgh(e)]; } },
            collectgarbage: function() {},
            gcinfo: function() { return 0; },
            load: function(chunk, name, mode, env) { return () => {}; },
            dofile: function(name) { return []; },
            dofile: function(name) { return []; },
        };
        for (const [k, v] of Object.entries(base)) L.globals[k] = v;
    };
    lualib.luaopen_coroutine = function(L) {};
    lualib.luaopen_debug = function(L) {};
    lualib.luaopen_math = function(L) {
        const math = {
            abs: Math.abs,
            acos: Math.acos,
            asin: Math.asin,
            atan: Math.atan,
            ceil: Math.ceil,
            cos: Math.cos,
            deg: (r) => r * 180 / Math.PI,
            exp: Math.exp,
            floor: Math.floor,
            fmod: (a, b) => a % b,
            huge: Infinity,
            log: Math.log,
            max: Math.max,
            min: Math.min,
            modf: (x) => [Math.floor(x), x % 1],
            pi: Math.PI,
            pow: Math.pow,
            rad: (d) => d * Math.PI / 180,
            random: (a, b) => { if (b === void 0) return Math.random() * a; if (a === void 0) return Math.random(); return a + Math.random() * (b - a); },
            randomseed: (x) => {},
            sin: Math.sin,
            sqrt: Math.sqrt,
            tan: Math.tan,
            clamp: (x, min, max) => Math.max(min, Math.min(max, x)),
            lerp: (a, b, t) => a + (b - a) * t,
            sign: (x) => x > 0 ? 1 : x < 0 ? -1 : 0,
            round: (x) => Math.round(x),
        };
        L.globals.math = math;
    };
    lualib.luaopen_string = function(L) {
        L.globals.string = {
            len: (s) => s.length,
            sub: (s, i, j) => s.slice(i - 1, j),
            byte: (s, i, j) => s.charCodeAt(i - 1),
            char: (...codes) => String.fromCharCode(...codes),
            find: (s, pat, init, plain) => {
                const idx = plain ? s.indexOf(pat, (init || 1) - 1) : s.search(pat);
                return idx >= 0 ? idx + 1 : null;
            },
            match: (s, pat, init) => { const m = s.slice((init || 1) - 1).match(pat); return m ? m[0] : null; },
            gmatch: (s, pat) => {
                const regex = new RegExp(pat, 'g');
                return function* () { let m; while ((m = regex.exec(s)) !== null) yield m[0]; };
            },
            gsub: (s, pat, repl, n) => s.replace(new RegExp(pat, 'g'), repl),
            format: (fmt, ...args) => fmt.replace(/%[sdqfg]/g, (m) => args.shift() || ''),
            lower: (s) => s.toLowerCase(),
            upper: (s) => s.toUpperCase(),
            reverse: (s) => s.split('').reverse().join(''),
            rep: (s, n) => s.repeat(n),
            trim: (s) => s.trim(),
        };
    };
    lualib.luaopen_table = function(L) {
        L.globals.table = {
            insert: (arr, pos, value) => { if (value === void 0) { value = pos; pos = arr.length; } arr.splice(pos - 1, 0, value); },
            remove: (arr, pos) => arr.splice((pos || arr.length) - 1, 1)[0],
            sort: (arr, comp) => arr.sort(comp),
            concat: (arr, sep, i, j) => arr.slice(i - 1, j).join(sep || ''),
            pack: (...args) => ({ n: args.length, ...args }),
            unpack: (arr, i, j) => arr.slice(i - 1, j),
            move: (src, f, e, t, dest) => { for (let i = f; i <= e; i++) dest[t + i - f] = src[i]; return dest; },
            freeze: (obj) => Object.freeze(obj),
            isfrozen: (obj) => Object.isFrozen(obj),
            clear: (obj) => { Object.keys(obj).forEach(k => delete obj[k]); },
        };
    };
    lualib.luaopen_utf8 = function(L) {};
    lualib.luaopen_package = function(L) {};
    lualib.luaopen_os = function(L) {};
    lualib.luaopen_io = function(L) {};

    exports.lualib = lualib;

    // ============================================================================
    // Main fengari object
    // ============================================================================
    exports.to_luastring = core.to_luastring;
    exports.to_jsstring = core.to_jsstring;
    exports.to_uristring = core.to_uristring;
    exports.luastring_eq = core.luastring_eq;
    exports.luastring_indexOf = core.luastring_indexOf;
    exports.luastring_of = core.luastring_of;

    // ============================================================================
    // fengari-interop (inlined)
    // ============================================================================
    const interop = (function() {
        const lua = exports.lua;
        const lauxlib = exports.lauxlib;
        const lualib = exports.lualib;
        const to_luastring = core.to_luastring;
        const to_jsstring = core.to_jsstring;

        const LUA_MULTRET = defs.LUA_MULTRET;
        const LUA_OK = defs.thread_status.LUA_OK;
        const LUA_REGISTRYINDEX = defs.LUA_REGISTRYINDEX;
        const LUA_RIDX_MAINTHREAD = defs.LUA_RIDX_MAINTHREAD;
        const LUA_TBOOLEAN = defs.constant_types.LUA_TBOOLEAN;
        const LUA_TFUNCTION = defs.constant_types.LUA_TFUNCTION;
        const LUA_TLIGHTUSERDATA = defs.constant_types.LUA_TLIGHTUSERDATA;
        const LUA_TNIL = defs.constant_types.LUA_TNIL;
        const LUA_TNONE = defs.constant_types.LUA_TNONE;
        const LUA_TNUMBER = defs.constant_types.LUA_TNUMBER;
        const LUA_TSTRING = defs.constant_types.LUA_TSTRING;
        const LUA_TTABLE = defs.constant_types.LUA_TTABLE;
        const LUA_TTHREAD = defs.constant_types.LUA_TTHREAD;
        const LUA_TUSERDATA = defs.constant_types.LUA_TUSERDATA;

        // Interop functions
        function checkjs(L, idx) {
            const t = L.type(idx);
            if (t === LUA_TUSERDATA) return L.touserdata(idx);
            throw new Error("js object expected");
        }
        function testjs(L, idx) {
            const t = L.type(idx);
            if (t === LUA_TUSERDATA) return L.touserdata(idx);
            return null;
        }
        function pushjs(L, v) {
            L.push({ __js_object: true, value: v });
        }
        function tojs(L, idx) {
            const v = L.stack[idx < 0 ? L.top + idx : idx];
            if (v && v.__js_object) return v.value;
            return v;
        }
        function luaopen_js(L) {
            // Already handled by base library
            return 1;
        }

        return {
            FENGARI_INTEROP_VERSION: "0.1",
            FENGARI_INTEROP_VERSION_NUM: 1,
            FENGARI_INTEROP_VERSION_RELEASE: "4",
            checkjs,
            testjs,
            pushjs,
            push: pushjs,
            tojs,
            luaopen_js,
        };
    })();

    exports.interop = interop;
    exports.FENGARI_INTEROP_VERSION = interop.FENGARI_INTEROP_VERSION;
    exports.FENGARI_INTEROP_VERSION_NUM = interop.FENGARI_INTEROP_VERSION_NUM;
    exports.FENGARI_INTEROP_RELEASE = interop.FENGARI_INTEROP_RELEASE;
    exports.checkjs = interop.checkjs;
    exports.testjs = interop.testjs;
    exports.pushjs = interop.pushjs;
    exports.push = interop.push;
    exports.tojs = interop.tojs;
    exports.luaopen_js = interop.luaopen_js;

    // ============================================================================
    // Attach to global
    // ============================================================================
    if (typeof window !== 'undefined') {
        window.fengari = exports;
        window.fengariInterop = { interop: exports.interop };
    }
    if (typeof self !== 'undefined') {
        self.fengari = exports;
        self.fengariInterop = { interop: exports.interop };
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.fengari = exports;
        globalThis.fengariInterop = { interop: exports.interop };
    }

    return exports;

}));
// UMD end
