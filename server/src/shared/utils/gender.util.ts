/**
 * 性别归一化工具：将 M/m/男 → 男，F/f/女 → 女，其余原样返回。
 *
 * 抽取自 students.module.ts / school-admin.service.ts 中重复出现的归一化逻辑（A08）。
 */
export function normalizeGender(gender: string): string {
  if (gender === 'M' || gender === 'm' || gender === '男') return '男'
  if (gender === 'F' || gender === 'f' || gender === '女') return '女'
  return gender
}
