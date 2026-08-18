/**
 * 敏感数据脱敏工具
 * 
 * 用于对手机号、身份证号、邮箱等敏感信息进行脱敏处理，
 * 防止在 API 响应中泄露用户隐私数据。
 * 
 * 使用场景：
 * - 家长端查看教师列表时手机号脱敏
 * - 学生详情页身份证号脱敏
 * - 任何对外暴露个人信息的接口
 */

/**
 * 手机号脱敏：138****5678
 * 支持 11 位中国大陆手机号
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const s = String(phone).trim()
  if (s.length < 7) return s
  return s.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

/**
 * 身份证号脱敏：110***********1234
 * 保留前 3 位和后 4 位
 */
export function maskIdCard(idCard: string | null | undefined): string {
  if (!idCard) return ''
  const s = String(idCard).trim()
  if (s.length < 8) return s
  const head = s.slice(0, 3)
  const tail = s.slice(-4)
  return `${head}${'*'.repeat(s.length - 7)}${tail}`
}

/**
 * 邮箱脱敏：abc***@example.com
 * 保留邮箱前缀前 3 位（不足则全保留）和完整域名
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const s = String(email).trim()
  const atIdx = s.indexOf('@')
  if (atIdx <= 1) return s
  const prefix = s.slice(0, Math.min(3, atIdx))
  const domain = s.slice(atIdx)
  return `${prefix}***${domain}`
}

/**
 * 姓名脱敏：张*三 或 张**
 * 保留姓，名用 * 替代
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return ''
  const s = String(name).trim()
  if (s.length <= 1) return s
  if (s.length === 2) return `${s[0]}*`
  return `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`
}

