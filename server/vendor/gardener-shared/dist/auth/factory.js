"use strict";
/**
 * shared/auth/factory.ts —— 通用鉴权状态机实现。
 *
 * 跨端共用的状态机逻辑：login / logout / restore / switchRole 四大操作的状态变迁与持久化，
 * 各端仅注入 loginFn（调用各自后端适配）和 persistence（localStorage / wx storage 适配器）。
 *
 * 【持久化语义】
 *   - saveLogin / loadLogin：当前"活跃角色"的凭证
 *   - saveMultiRole / loadMultiRole：多角色（师兼家、超管/校管 token 分存）的全量快照
 *   - clearLogin 仅清活跃凭证；clearMultiRole 清多角色快照；logout 两者都清
 *
 * 【事件】通过 on/once 订阅 'login' | 'logout' | 'switchRole' | 'restore' | 'tokenExpired'。
 * Web 端可在 store 中桥接为 Pinia 响应式；小程序端桥接为 reactive。
 *
 * 【对齐】
 *   - Web 适配：web-app/src/stores/auth-machine.ts（Pinia 包装）
 *   - 小程序适配：mini-program/src/common/auth-machine.js（reactive 包装）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMachine = createAuthMachine;
exports.createKvPersistence = createKvPersistence;
exports.createLocalStoragePersistence = createLocalStoragePersistence;
const machine_1 = require("./machine");
/** 创建跨端共用的鉴权状态机实例 */
function createAuthMachine(opts) {
    const { loginFn, persistence, revokeFn, debug = false } = opts;
    let active = null;
    let multiRole = {};
    const listeners = new Map();
    // —— 事件系统 ——
    function emit(evt, data) {
        listeners.get(evt)?.forEach((cb) => {
            try {
                cb(evt, data);
            }
            catch (e) {
                if (debug)
                    console.warn(`[auth] listener for '${evt}' threw`, e);
            }
        });
        listeners.get('*')?.forEach((cb) => {
            try {
                cb(evt, data);
            }
            catch (e) {
                if (debug)
                    console.warn('[auth] wildcard listener threw', e);
            }
        });
    }
    function on(evt, cb) {
        if (!listeners.has(evt))
            listeners.set(evt, new Set());
        listeners.get(evt).add(cb);
        return () => listeners.get(evt)?.delete(cb);
    }
    function once(evt, cb) {
        const wrapper = (e, d) => {
            off();
            cb(e, d);
        };
        const off = on(evt, wrapper);
        return off;
    }
    // —— 状态写入 ——
    function setActive(result) {
        active = result;
        if (result.user?.role) {
            multiRole[result.user.role] = result;
            persistence.saveMultiRole(multiRole);
        }
        persistence.saveLogin(result);
    }
    // —— 状态机操作 ——
    async function login(creds) {
        let result;
        try {
            result = await loginFn(creds);
        }
        catch (e) {
            throw e instanceof machine_1.AuthError ? e : new machine_1.AuthError(e instanceof Error ? e.message : '登录失败', 'LOGIN_FAILED');
        }
        if (!result?.token)
            throw new machine_1.AuthError('登录响应缺少 token', 'INVALID_RESPONSE');
        if (!result?.user?.id)
            throw new machine_1.AuthError('登录响应缺少 user.id', 'INVALID_RESPONSE');
        if ((0, machine_1.isJwtExpired)(result.token))
            throw new machine_1.AuthError('登录令牌已过期', 'TOKEN_EXPIRED');
        setActive(result);
        emit('login', { token: result.token, user: result.user, role: result.user.role });
        if (debug)
            console.log('[auth] login ok, role=', result.user.role);
        return result;
    }
    async function logout() {
        const oldToken = active?.token;
        active = null;
        multiRole = {};
        persistence.clearLogin();
        persistence.clearMultiRole();
        if (revokeFn && oldToken) {
            try {
                await revokeFn(oldToken);
            }
            catch (e) {
                if (debug)
                    console.warn('[auth] revoke failed:', e);
            }
        }
        emit('logout');
        if (debug)
            console.log('[auth] logout ok');
    }
    async function restore() {
        const multi = persistence.loadMultiRole();
        if (multi && Object.keys(multi).length > 0)
            multiRole = multi;
        const saved = persistence.loadLogin();
        if (!saved) {
            if (debug)
                console.log('[auth] restore: no saved login');
            return null;
        }
        if ((0, machine_1.isJwtExpired)(saved.token)) {
            persistence.clearLogin();
            active = null;
            emit('tokenExpired', { token: saved.token });
            if (debug)
                console.log('[auth] restore: token expired');
            return null;
        }
        active = saved;
        emit('restore', { token: saved.token, user: saved.user, role: saved.user?.role });
        if (debug)
            console.log('[auth] restore ok, role=', saved.user?.role);
        return saved;
    }
    async function switchRole(targetRole) {
        // 已处于目标角色，短路返回
        if (active?.user?.role === targetRole && active)
            return active;
        const target = multiRole[targetRole];
        if (!target) {
            throw new machine_1.AuthError(`角色 "${targetRole}" 未登录或不在快照中。请先完成该角色的登录。`, 'ROLE_NOT_AVAILABLE');
        }
        if ((0, machine_1.isJwtExpired)(target.token)) {
            delete multiRole[targetRole];
            persistence.saveMultiRole(multiRole);
            throw new machine_1.AuthError(`角色 "${targetRole}" 的令牌已过期，请重新登录。`, 'TOKEN_EXPIRED');
        }
        active = target;
        persistence.saveLogin(target);
        emit('switchRole', { token: target.token, user: target.user, role: targetRole });
        if (debug)
            console.log('[auth] switchRole →', targetRole);
        return target;
    }
    return {
        get token() {
            return active?.token ?? null;
        },
        get user() {
            return active?.user ?? null;
        },
        get role() {
            return active?.user?.role ?? null;
        },
        get isLoggedIn() {
            return !!active?.token && !!active?.user;
        },
        login,
        logout,
        restore,
        switchRole,
        on,
        once,
    };
}
// —— 通用 localStorage 持久化（Node / 浏览器 / jsdom 均可用）——
/**
 * 基于 Key-Value 存储的轻量持久化适配器。
 * 注入 get/set/remove 三函数即可；不直接依赖 localStorage。
 */
function createKvPersistence(opts) {
    const { get, set, remove, tokenKey, userKey, multiRoleKey = '__multi_role__' } = opts;
    return {
        saveLogin(result) {
            set(tokenKey, result.token);
            set(userKey, JSON.stringify(result.user));
        },
        loadLogin() {
            const t = get(tokenKey);
            const raw = get(userKey);
            if (!t || !raw)
                return null;
            try {
                return { token: t, user: JSON.parse(raw) };
            }
            catch {
                return null;
            }
        },
        clearLogin() {
            remove(tokenKey);
            remove(userKey);
        },
        saveMultiRole(data) {
            set(multiRoleKey, JSON.stringify(data));
        },
        loadMultiRole() {
            const raw = get(multiRoleKey);
            if (!raw)
                return null;
            try {
                const obj = JSON.parse(raw);
                // 仅保有有效 token 的结果
                return Object.fromEntries(Object.entries(obj).filter(([, v]) => v && v.token));
            }
            catch {
                return null;
            }
        },
        clearMultiRole() {
            remove(multiRoleKey);
        },
    };
}
/**
 * 浏览器端默认适配器：使用 window.localStorage。
 * Web 端可直接使用，测试环境可按需替换为内存实现。
 */
function createLocalStoragePersistence(opts) {
    const tokenKey = opts?.tokenKey ?? '__auth_token__';
    const userKey = opts?.userKey ?? '__auth_user__';
    const multiRoleKey = opts?.multiRoleKey ?? '__auth_multi_role__';
    return createKvPersistence({
        get: (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
        set: (k, v) => {
            if (typeof localStorage !== 'undefined')
                localStorage.setItem(k, v);
        },
        remove: (k) => {
            if (typeof localStorage !== 'undefined')
                localStorage.removeItem(k);
        },
        tokenKey,
        userKey,
        multiRoleKey,
    });
}
//# sourceMappingURL=factory.js.map