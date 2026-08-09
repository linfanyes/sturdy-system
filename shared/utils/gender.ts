/**
 * 性别归一化工具：将 M/m/男 → 男，F/f/女 → 女，其余原样返回。
 *
 * 后端原重复出现在 students.module.ts / school.admin.service.ts（共 8 处），
 * 现统一收敛到此模块。
 */
export function normalizeGender(gender: string): string {
  if (gender === 'M' || gender === 'm' || gender === '男') return '男'
  if (gender === 'F' || gender === 'f' || gender === '女') return '女'
  return gender
}
