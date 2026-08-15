import { IsOptional, IsString, IsArray, IsBoolean, IsInt, Min, Max } from 'class-validator'

/** 任务卡新增入参 */
export class CreateChallengeDto {
  @IsString() title: string
  @IsOptional() @IsString() goal?: string | null
  /** 发布到的班级 */
  @IsOptional() @IsString() classId?: string | null
  /** 起始积木模板（脚手架） */
  @IsOptional() @IsArray() starterBlocks?: any[]
  /** 自动判题配置（预留） */
  @IsOptional() @IsArray() criteria?: any
  /** 作者教师展示名 */
  @IsOptional() @IsString() teacherName?: string | null
}

/** 任务卡更新入参 */
export class UpdateChallengeDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() goal?: string | null
  @IsOptional() @IsString() classId?: string | null
  @IsOptional() @IsArray() starterBlocks?: any[]
  @IsOptional() @IsArray() criteria?: any
  @IsOptional() @IsString() teacherName?: string | null
}

/** 教师点评入参 */
export class CreateReviewDto {
  /** 被点评的练习作品 id */
  @IsString() projectId: string
  /** 关联任务卡（可选） */
  @IsOptional() @IsString() challengeId?: string | null
  /** 学生 id（冗余，便于查询） */
  @IsOptional() @IsString() studentId?: string | null
  /** 文字评语 */
  @IsOptional() @IsString() comment?: string | null
  /** 星级 1–5 */
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number | null
}
