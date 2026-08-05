import { IsOptional, IsString, IsArray } from 'class-validator'

/** 考试计划新增入参（字段与 Exam 实体对齐，白名单校验下需全部声明以免落库被剥离） */
export class CreateExamDto {
  @IsOptional() @IsString() term?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() teacherName?: string
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsArray() subjects?: string[]
  @IsOptional() subjectFullScores?: Record<string, number>
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsString() note?: string
  @IsOptional() @IsString() analysisNote?: string
}

/** 考试计划更新入参 */
export class UpdateExamDto {
  @IsOptional() @IsString() term?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() teacherName?: string
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsArray() subjects?: string[]
  @IsOptional() subjectFullScores?: Record<string, number>
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsString() note?: string
  @IsOptional() @IsString() analysisNote?: string
}
