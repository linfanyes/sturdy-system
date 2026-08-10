/**
 * shared/utils/score —— 跨端通用成绩统计 / 分布归一化纯函数
 *
 * 这些逻辑在 mini-program/src/pages/teaching/grades.vue 与 exam-detail.vue 中
 * 存在内联重复实现，现收敛到共享模块。纯函数，无平台依赖。
 */
/**
 * 成绩数组 → 统计摘要（均分/最高/最低/及格率/优秀率）
 * - 及格线 = fullScore * 0.6；优秀线 = fullScore * 0.85
 * - 均分保留 1 位小数；无有效成绩时返回空摘要（avg/max/min 为 '-'）
 * @param scores 原始成绩（可为 number 或含 .score 字段的对象）
 * @param fullScore 满分，默认 100
 */
export declare function computeExamStats(scores: Array<number | {
    score?: number | null;
}> | undefined | null, fullScore?: number): {
    avg: string;
    max: number | '-';
    min: number | '-';
    passRate: number;
    excellentRate: number;
};
/**
 * 分数分布归一化：兼容对象 {"0-10":0} 与数组 [{label,count}]
 * 返回 [{ label, value, lo, idx }]，区间标签按低位排序，其余保留原序。
 */
export declare function normalizeDistribution(dist: unknown): Array<{
    label: string;
    value: number;
    lo: number | null;
    idx: number;
}>;
/**
 * 学科数组归一化：兼容字符串数组 ["数学"] 与对象数组 [{subject:"数学"}]
 * @param arr 可能是字符串数组或对象数组
 */
export declare function toSubjectNames(arr: unknown): string[];
//# sourceMappingURL=score.d.ts.map