/**
 * 教师端 API 封装（按领域拆分）。
 *
 * 子模块：
 *   - types.ts        共享类型（TeacherClass / TeacherStudent / ClassMember 等）
 *   - class-student.ts 班级与学生管理
 *   - exam-grade.ts    考试与成绩（含分析 + CRUD）
 *   - ai-tools.ts      AI 工具（流式对话 / 文生图 / 诊断 等）
 *   - office.ts        家校沟通 + 办公（教学日历 / 课表）
 *   - interaction.ts   课堂互动（座位表 / 抽签 / 奖惩 / 错题）
 *   - config-message.ts 通用配置 + 留言板
 *   - misc.ts          通用列表辅助 + 批量导入学生
 *
 * 使用方式不变：import { listMyClasses, aiChatStream } from '@/api/teacher'
 */

export * from './types'
export * from './class-student'
export * from './exam-grade'
export * from './ai-tools'
export * from './office'
export * from './interaction'
export * from './config-message'
export * from './misc'
