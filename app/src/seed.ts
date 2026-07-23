/**
 * 种子数据 (Seed Data)
 *
 * 本系统是空白待配置系统, 默认不预置任何班级 / 学生 / 成绩 / 笔记 / 教师 /
 * 课表 / 作业 / 公告 / 资源 / 考勤等具体数据, 避免下载压缩包时携带上一位
 * 老师残留的个人信息.
 *
 * 教师首次登录后可自行在对应页面添加; 也可以使用「批量导入」或
 * 「AI 智能识别导入」快速建班.
 *
 * 这里只保留与界面配色 / 头像相关的静态配置, 不会泄露任何隐私.
 */

import type { ClassItem, Student, Grade, NoteItem, Teacher, ScheduleItem, Homework, Notice, Resource, Attendance } from './types'

const day = 24 * 60 * 60 * 1000

// ============== 空白数据 (新部署系统默认空) ==============
export const seedClasses: ClassItem[] = []
export const seedStudents: Student[] = []
export const seedGrades: Grade[] = []
export const seedNotes: NoteItem[] = []
export const seedTeachers: Teacher[] = []
export const seedSchedules: ScheduleItem[] = []
export const seedHomework: Homework[] = []
export const seedNotices: Notice[] = []
export const seedResources: Resource[] = []
export const seedAttendance: Attendance[] = []

// ============== 静态配置 (不涉及隐私) ==============
/** 学科色板 (用于作业 / 课表 / 成绩 卡片着色) */
export const subjectPalette: Record<string, { bg: string; text: string; ring: string; bar: string }> = {
  语文: { bg: 'bg-sakura-100', text: 'text-sakura-500', ring: 'ring-sakura-300', bar: 'from-sakura-500 to-sakura-200' },
  数学: { bg: 'bg-sky2-100', text: 'text-sky2-500', ring: 'ring-sky2-300', bar: 'from-sky2-500 to-sky2-200' },
  英语: { bg: 'bg-mint-100', text: 'text-mint-500', ring: 'ring-mint-300', bar: 'from-mint-500 to-mint-200' },
  音乐: { bg: 'bg-butter-100', text: 'text-butter-600', ring: 'ring-butter-300', bar: 'from-butter-500 to-butter-200' },
  美术: { bg: 'bg-cream-200', text: 'text-cocoa-700', ring: 'ring-cocoa-100', bar: 'from-cocoa-500 to-cocoa-300' },
  体育: { bg: 'bg-mint-100', text: 'text-mint-500', ring: 'ring-mint-300', bar: 'from-mint-500 to-mint-200' },
  品德: { bg: 'bg-sakura-100', text: 'text-sakura-500', ring: 'ring-sakura-300', bar: 'from-sakura-500 to-sakura-200' },
  科学: { bg: 'bg-sky2-100', text: 'text-sky2-500', ring: 'ring-sky2-300', bar: 'from-sky2-500 to-sky2-200' },
}

/** 头像表情池 (登录页 / 个人中心可选) */
export const avatarPool = [
  '🍎', '📚', '✏️', '🎨', '🌈', '⭐', '🌻', '🐻',
  '🦄', '🐤', '🍀', '🎈', '🎁', '🌷', '🐰', '🐼',
]

// ============== 仅供开发使用的样例数据 ==============
// 取消下方注释可在本地开发时快速填充演示数据
// 压缩包中默认不包含, 不会出现在生产环境

/*
import { now, DEFAULT_TEACHER_POOL, generateAutoSchedule } from './utils'

export const seedClasses: ClassItem[] = [
  // ... 开发期可在此临时填充演示数据
]
*/
