"use strict";
/**
 * shared/utils/format —— 跨端通用格式化纯函数
 *
 * 这些函数在 Web 端 exams/*.vue 与小程序端 teaching/exam-detail.vue 等多处
 * 存在完全一致的重复实现，现收敛到共享模块，避免五处维护。
 *
 * 无平台依赖，可在 Web / 小程序 / 后端共用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fmt1 = fmt1;
exports.pct = pct;
exports.pctNum = pctNum;
exports.scoreColor = scoreColor;
/**
 * 数字保留 1 位小数；空值 / 无效值返回 '-'
 * @example fmt1(97.333) => "97.3" ; fmt1(undefined) => "-"
 */
function fmt1(n) {
    if (n == null || n === '' || isNaN(Number(n)))
        return '-';
    return Number(n).toFixed(1);
}
/**
 * 小数(0.9) 或 百分数(90) → 百分比字符串，兼容两种形式
 * @example pct(0.9) => "90.0%" ; pct(90) => "90.0%" ; pct(undefined) => "-"
 */
function pct(n) {
    if (n == null || n === '' || isNaN(Number(n)))
        return '-';
    const v = Number(n);
    const p = v > 1 ? v : v * 100;
    return p.toFixed(1) + '%';
}
/**
 * 已是百分数数值(如 97.5) → 直接加 % 后缀
 * @example pctNum(97.5) => "97.5%" ; pctNum(null) => "-"
 */
function pctNum(n) {
    if (n == null || n === '' || isNaN(Number(n)))
        return '-';
    return Number(n).toFixed(1) + '%';
}
/**
 * 分数 → 颜色：按与满分占比分级（红/橙/黄/深黄/绿）
 * - >=90% 绿，>=80% 橙，>=60% 亮黄，>=50% 深黄，否则红
 * - null/undefined 返回浅灰背景
 * @example scoreColor(95, 100) => "#67c23a" ; scoreColor(null) => "rgb(var(--cream-200))"
 */
function scoreColor(score, fullScore = 100) {
    if (score == null)
        return 'rgb(var(--cream-200))';
    const p = score / fullScore;
    if (p >= 0.9)
        return '#67c23a';
    if (p >= 0.8)
        return '#e6a23c';
    if (p >= 0.6)
        return '#f5d342';
    if (p >= 0.5)
        return '#f5b342';
    return '#f56c6c';
}
//# sourceMappingURL=format.js.map