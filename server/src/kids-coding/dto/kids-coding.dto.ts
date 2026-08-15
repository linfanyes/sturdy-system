import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator'

/** 少儿编程作品新增入参（字段与 CodingProject 实体对齐） */
export class CreateCodingProjectDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() description?: string
  /** 积木脚本：JSON 数组（控件 id + 参数 + 顺序） */
  @IsOptional() @IsArray() blocks?: any[]
  /** 发布到的班级（开放给家长时填写） */
  @IsOptional() @IsString() classId?: string | null
  /** 是否开放给该班级家长查看 */
  @IsOptional() @IsBoolean() publishedToParent?: boolean
  /** 作者教师展示名 */
  @IsOptional() @IsString() teacherName?: string | null
  /** 关联任务卡（学生练习对应某道挑战） */
  @IsOptional() @IsString() challengeId?: string | null
  /** 是否作为作业提交 */
  @IsOptional() @IsBoolean() submitted?: boolean
}

/** 少儿编程作品更新入参 */
export class UpdateCodingProjectDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsArray() blocks?: any[]
  @IsOptional() @IsString() classId?: string | null
  @IsOptional() @IsBoolean() publishedToParent?: boolean
  @IsOptional() @IsString() teacherName?: string | null
  /** 关联任务卡 */
  @IsOptional() @IsString() challengeId?: string | null
  /** 是否作为作业提交 */
  @IsOptional() @IsBoolean() submitted?: boolean
}
