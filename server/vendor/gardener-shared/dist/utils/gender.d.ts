/**
 * 性别归一化工具：将 M/m/男 → 男，F/f/女 → 女，其余原样返回。
 *
 * 后端原重复出现在 students.module.ts / school.admin.service.ts（共 8 处），
 * 现统一收敛到此模块。
 */
export declare function normalizeGender(gender: string): string;
//# sourceMappingURL=gender.d.ts.map