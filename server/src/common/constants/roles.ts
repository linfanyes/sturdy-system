/**
 * fix-6: 角色字符串常量，避免魔法字符串散落在代码中。
 * 一处拼写错误就会导致静默失败（如 'school-admin' vs 'school_admin'）。
 */
export const Roles = {
  TEACHER: 'teacher',
  SCHOOL_ADMIN: 'school_admin',
  PARENT: 'parent',
  SUPER: 'super',
  HEAD: 'head',
  SUBJECT: 'subject',
} as const

export type Role = (typeof Roles)[keyof typeof Roles]
