import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator'

/** 教师笔记新增入参（字段与 NoteItem 实体对齐） */
export class CreateNoteDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() content?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsBoolean() pinned?: boolean
  @IsOptional() @IsBoolean() favorite?: boolean
  @IsOptional() @IsArray() images?: string[]
}

/** 教师笔记更新入参 */
export class UpdateNoteDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() content?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsBoolean() pinned?: boolean
  @IsOptional() @IsBoolean() favorite?: boolean
  @IsOptional() @IsArray() images?: string[]
}
