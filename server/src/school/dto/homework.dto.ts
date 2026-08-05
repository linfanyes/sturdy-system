import { IsOptional, IsString } from 'class-validator'

/** 作业新增入参（字段与 Homework 实体对齐） */
export class CreateHomeworkDto {
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsString() subject?: string
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() content?: string
  @IsOptional() @IsString() startDate?: string
  @IsOptional() @IsString() deadline?: string
  @IsOptional() @IsString() status?: string
}

/** 作业更新入参 */
export class UpdateHomeworkDto {
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsString() subject?: string
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() content?: string
  @IsOptional() @IsString() startDate?: string
  @IsOptional() @IsString() deadline?: string
  @IsOptional() @IsString() status?: string
}
