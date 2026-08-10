"use strict";
/**
 * 通用小工具（跨端共享）
 *
 * 来源对齐：
 *   - mini-program/src/common/util.js::safeParse
 *   - web-app/src/views/exams/DataDashboard.vue::safeParse (数组特化版)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeParse = safeParse;
exports.isNotNull = isNotNull;
exports.delay = delay;
exports.deepClone = deepClone;
/**
 * 安全 JSON.parse —— 解析失败返回 fallback。
 * 类型安全：泛型指定返回类型。
 */
function safeParse(raw, fallback) {
    if (raw == null)
        return fallback;
    if (typeof raw !== 'string')
        return raw;
    try {
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
}
/**
 * 非空断言：剔除 null / undefined。
 * 用于数组过滤：list.filter(isNotNull)
 */
function isNotNull(v) {
    return v != null;
}
/**
 * 延迟（ms）返回 Promise。
 * 用于节流后延 / 动画等待 / 测试。
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * 简单深拷贝（基于 JSON.parse(JSON.stringify)）。
 * 仅适用于纯数据（含 Date→string 等局限性）；复杂对象请使用专用库。
 */
function deepClone(obj) {
    if (obj == null || typeof obj !== 'object')
        return obj;
    return JSON.parse(JSON.stringify(obj));
}
//# sourceMappingURL=general.js.map