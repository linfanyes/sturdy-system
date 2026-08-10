/**
 * 通用小工具（跨端共享）
 *
 * 来源对齐：
 *   - mini-program/src/common/util.js::safeParse
 *   - web-app/src/views/exams/DataDashboard.vue::safeParse (数组特化版)
 */
/**
 * 安全 JSON.parse —— 解析失败返回 fallback。
 * 类型安全：泛型指定返回类型。
 */
export declare function safeParse<T = unknown>(raw: unknown, fallback: T): T;
/**
 * 非空断言：剔除 null / undefined。
 * 用于数组过滤：list.filter(isNotNull)
 */
export declare function isNotNull<T>(v: T | null | undefined): v is T;
/**
 * 延迟（ms）返回 Promise。
 * 用于节流后延 / 动画等待 / 测试。
 */
export declare function delay(ms: number): Promise<void>;
/**
 * 简单深拷贝（基于 JSON.parse(JSON.stringify)）。
 * 仅适用于纯数据（含 Date→string 等局限性）；复杂对象请使用专用库。
 */
export declare function deepClone<T>(obj: T): T;
//# sourceMappingURL=general.d.ts.map