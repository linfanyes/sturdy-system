import { IsOptional, IsString, IsArray } from 'class-validator'

/** 考勤新增入参（字段与 Attendance 实体对齐） */
export class CreateAttendanceDto {
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsArray() records?: { studentId: string; status: string }[]
}

/** 考勤更新入参 */
export class UpdateAttendanceDto {
  @IsOptional() @IsString() classId?: string
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsArray() records?: { studentId: string; status: string }[]
}
