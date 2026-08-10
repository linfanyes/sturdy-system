"use strict";
/**
 * 鉴权状态机接口（Auth State Machine）—— 跨端共享的鉴权生命周期抽象。
 *
 * 【定位】定义 Web / 小程序 / 后端共有的鉴权操作契约。
 * 各端的具体实现（Persistence / API 调用 / 存储键名）不同，但状态机语义一致：
 *   - login:     凭据 → token / user
 *   - logout:    清状态 + 清存储
 *   - restore:   冷启动从本地持久化恢复
 *   - switchRole: 多角色切换（师兼家等），不重新输入密码
 *
 * 【对齐】
 *   - Web 端实现在 web-app/src/stores/auth.ts（Pinia） + roleSwitch.ts
 *   - 小程序端实现在 mini-program/src/common/store.js（reactive）
 *
 * 该接口为阶段 2 契约层：各端保留具体 store 实现，共享抽象约束状态名称与类型。
 * 阶段 3 可将各端 store 收敛为同一个状态机实现 + 不同 Persistence Adapter。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = void 0;
exports.isJwtLike = isJwtLike;
exports.parseJwtPayload = parseJwtPayload;
exports.isJwtExpired = isJwtExpired;
/** 鉴权错误 */
class AuthError extends Error {
    code;
    constructor(message, code = 'AUTH_ERROR') {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}
exports.AuthError = AuthError;
/**
 * 辅助：判断 token 是否形如 JWT（三段 base64）。
 * 用于客户端快速校验（不做签名校验）。
 */
function isJwtLike(token) {
    if (!token || typeof token !== 'string')
        return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
}
/**
 * 辅助：从 JWT payload 提取字段（不验签）。
 * 用于客户端读 exp / role 等。
 *
 * 【跨端兼容】使用 `atob`（浏览器 / 小程序 通用），无需 Node Buffer。
 * 在 atob 不可用时返回 null。
 */
function parseJwtPayload(token) {
    if (!isJwtLike(token))
        return null;
    if (typeof atob !== 'function')
        return null;
    try {
        const payload = token.split('.')[1];
        if (!payload)
            return null;
        // base64url → base64
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const json = atob(padded);
        return JSON.parse(json);
    }
    catch {
        return null;
    }
}
/**
 * 辅助：判断 JWT 是否已过期（基于 exp 字段）。
 * 留 bufferSec 用于客户端提前判定（避免请求时才失败）。
 */
function isJwtExpired(token, bufferSec = 60) {
    const payload = parseJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number')
        return false;
    return Date.now() >= (payload.exp - bufferSec) * 1000;
}
//# sourceMappingURL=machine.js.map