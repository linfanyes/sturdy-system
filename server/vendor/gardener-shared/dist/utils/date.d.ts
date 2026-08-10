/**
 * shared/utils/date —— 跨端通用日期时间格式化
 *
 * 纯函数，无平台依赖，可在 Web / 小程序 / 后端共用。
 */
/**
 * 相对时间格式化：刚刚 / X分钟前 / X小时前 / X天前 / X周前
 */
export declare function formatRelativeTime(ts: string | number | Date): string;
/**
 * 日期时间格式化：YYYY-MM-DD HH:mm
 * - 空值 / 无效日期返回 '-'
 */
export declare function formatDateTime(ts: string | number | Date | null | undefined): string;
/**
 * 纯日期格式化：YYYY-MM-DD（不含时间）
 * - 用于日历格子 / 纯日期 key 匹配等场景
 * - 空值 / 无效日期返回 '-'
 */
export declare function formatDate(ts: string | number | Date | null | undefined): string;
/**
 * ISO 时间简化：把 "2026-08-07T10:15:10.123Z" 变为 "2026-08-07 10:15:10"
 * 用于审计日志等后端返回的标准 ISO 字符串。
 */
export declare function formatISOTime(ts: string | null | undefined): string;
/**
 * 毫秒转分秒显示：如 125000 → "2分5秒"
 */
export declare function formatMsToMinSec(ms: number): string;
/**
 * 当前学期：9月-次年2月为第一学期，3-8月为第二学期
 * @param date 可传入 Date（便于测试/复用），默认当前时间
 * @returns 如 "2025-2026学年第一学期"
 */
export declare function getCurrentTerm(date?: Date): string;
/**
 * 当前季节：秋季 / 春季（"YYYY秋季" / "YYYY春季"）
 * @param date 可传入 Date（便于测试/复用），默认当前时间
 * @param autumnFromMonth 判定为秋季的起始月份（0-11），默认 8（9 月起为秋季，与 getCurrentTerm 对齐）
 * @returns 如 "2026春季"
 */
export declare function getCurrentSemester(date?: Date, autumnFromMonth?: number): string;
//# sourceMappingURL=date.d.ts.map