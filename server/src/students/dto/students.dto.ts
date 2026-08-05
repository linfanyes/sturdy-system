import { IsOptional, IsString, IsArray, IsBoolean, IsNumber } from 'class-validator'

/** 学生新增入参（字段与 Student 实体对齐，白名单校验下需全部声明以免落库被剥离） */
export class CreateStudentDto {
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() gender?: string
  @IsOptional() @IsString() studentNo?: string
  @IsOptional() @IsString() birthDate?: string
  @IsOptional() @IsNumber() seatNo?: number
  @IsOptional() @IsNumber() seatRow?: number
  @IsOptional() @IsNumber() seatCol?: number
  @IsOptional() @IsString() parentName?: string
  @IsOptional() @IsString() parentPhone?: string
  @IsOptional() @IsString() studentPhone?: string
  @IsOptional() @IsString() address?: string
  @IsOptional() @IsString() parentId?: string
  @IsOptional() @IsString() parentNickName?: string
  @IsOptional() @IsBoolean() parentLoginEnabled?: boolean
  @IsOptional() @IsString() parentPasswordHash?: string
  @IsOptional() @IsString() note?: string
  @IsOptional() @IsArray() tags?: string[]
  @IsOptional() @IsString() duty?: string
  @IsOptional() @IsString() comment?: string
  @IsOptional() examComments?: Record<string, { comment: string; examName?: string; date?: string; generatedAt?: string }>
}

/** 学生更新入参 */
export class UpdateStudentDto {
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() gender?: string
  @IsOptional() @IsString() studentNo?: string
  @IsOptional() @IsString() birthDate?: string
  @IsOptional() @IsNumber() seatNo?: number
  @IsOptional() @IsNumber() seatRow?: number
  @IsOptional() @IsNumber() seatCol?: number
  @IsOptional() @IsString() parentName?: string
  @IsOptional() @IsString() parentPhone?: string
  @IsOptional() @IsString() studentPhone?: string
  @IsOptional() @IsString() address?: string
  @IsOptional() @IsString() parentId?: string
  @IsOptional() @IsString() parentNickName?: string
  @IsOptional() @IsBoolean() parentLoginEnabled?: boolean
  @IsOptional() @IsString() parentPasswordHash?: string
  @IsOptional() @IsString() note?: string
  @IsOptional() @IsArray() tags?: string[]
  @IsOptional() @IsString() duty?: string
  @IsOptional() @IsString() comment?: string
  @IsOptional() examComments?: Record<string, { comment: string; examName?: string; date?: string; generatedAt?: string }>
}
