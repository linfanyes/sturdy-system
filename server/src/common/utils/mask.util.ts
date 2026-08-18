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

/**
 * 地址脱敏：保留省市区，详细地址用 * 替代
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return ''
  const s = String(address).trim()
  if (s.length <= 10) return s
  return `${s.slice(0, 10)}${'*'.repeat(Math.min(s.length - 10, 10))}`
}

/**
 * 通用字符串脱敏
 * @param str 原始字符串
 * @param head 保留前几位
 * @param tail 保留后几位
 */
export function maskString(str: string | null | undefined, head = 3, tail = 4): string {
  if (!str) return ''
  const s = String(str).trim()
  if (s.length <= head + tail) return s
  return `${s.slice(0, head)}${'*'.repeat(s.length - head - tail)}${s.slice(-tail)}`
}

/**
 * 批量脱敏对象中的指定字段
 * @param obj 原始对象
 * @param rules 脱敏规则 { fieldName: maskType }
 * @returns 脱敏后的新对象（不修改原对象）
 */
export function maskFields<T extends Record<string, any>>(
  obj: T,
  rules: Record<keyof T, 'phone' | 'idCard' | 'email' | 'name' | 'address' | 'string'>,
): T {
  if (!obj || typeof obj !== 'object') return obj
  const result: Record<string, any> = { ...obj }
  for (const [field, type] of Object.entries(rules)) {
    const value = result[field]
    if (value == null || value === '') continue
    switch (type) {
      case 'phone':
        result[field] = maskPhone(value)
        break
      case 'idCard':
        result[field] = maskIdCard(value)
        break
      case 'email':
        result[field] = maskEmail(value)
        break
      case 'name':
        result[field] = maskName(value)
        break
      case 'address':
        result[field] = maskAddress(value)
        break
      case 'string':
        result[field] = maskString(value)
        break
    }
  }
  return result as T
}

/**
 * 批量脱敏数组中的指定字段
 */
export function maskFieldsInArray<T extends Record<string, any>>(
  arr: T[],
  rules: Record<string, 'phone' | 'idCard' | 'email' | 'name' | 'address' | 'string'>,
): T[] {
  if (!Array.isArray(arr)) return arr
  return arr.map((item) => maskFields(item, rules as Record<keyof T, 'phone' | 'idCard' | 'email' | 'name' | 'address' | 'string'>))
}
