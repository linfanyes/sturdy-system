import { IsArray, IsOptional, IsString } from 'class-validator'

export class StudyBuddyDto {
  /** 对话历史（含 system/user/assistant 角色），最后一条应为用户最新提问 */
  @IsArray()
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]

  /** 当前学生昵称（可选，用于更贴心的称谓，不持久化） */
  @IsOptional()
  @IsString()
  studentName?: string
}
