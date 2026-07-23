/**
 * 家长 IM 账号派生工具（前后端共用同一算法，确保教师花名册里的家长账号
 * 与家长端登录后使用的账号是同一个，从而家校沟通两端能对上）。
 * 由（studentId + relation + parentName）稳定派生一个 ASCII IM 账号
 * （≤32 字符，保证唯一且可复现；腾讯云 IM 对 userID 字符集有限制，故用 hash）。
 */
export function parentImUserId(p: { studentId: string; relation: string; parentName: string }): string {
  const raw = `${p.studentId}|${p.relation}|${p.parentName}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 31) + raw.charCodeAt(i)) >>> 0
  return 'p_' + h.toString(36)
}
