import { IsInt, IsString, IsOptional, Min, Max, IsIn } from 'class-validator'

/** 学生提交/更新当日心情 */
export class CreateMoodCheckInDto {
  @IsString() studentId: string
  @IsOptional() @IsString() studentName?: string | null
  /** 班级（可选，便于聚合；家长端从 JWT 拿） */
  @IsOptional() @IsString() classId?: string | null
  /** 心情等级 1–5 */
  @IsInt() @Min(1) @Max(5) level: number
  /** 表情编码 */
  @IsOptional() @IsString() emoji?: string | null
  /** 留言 */
  @IsOptional() @IsString() note?: string | null
  /** 打卡日期 YYYY-MM-DD（缺省服务端取本地今日） */
  @IsOptional() @IsString() date?: string
}

/** 提交树洞（匿名） */
export class CreateTreeHoleDto {
  @IsString() content: string
  @IsOptional() @IsString() studentId?: string | null
  @IsOptional() @IsString() classId?: string | null
}

/** 教师/心理老师人工回复树洞 + 风险定级 */
export class ReplyTreeHoleDto {
  @IsString() staffReply: string
  @IsOptional() @IsIn(['none', 'low', 'high']) riskLevel?: 'none' | 'low' | 'high'
  /** 是否升级为需人工跟进 */
  @IsOptional() status?: 'responded' | 'escalated'
}
