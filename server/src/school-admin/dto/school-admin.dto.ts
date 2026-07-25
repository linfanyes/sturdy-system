import {
  IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray,
  MinLength, MaxLength, ValidateNested, ArrayMinSize, Matches,
} from 'class-validator'
import { Type } from 'class-transformer'

/** 单个教师入参（用于批量创建） */
export class TeacherItemDto {
  @IsNotEmpty({ message: '教师姓名必填' })
  @IsString()
  @MaxLength(50, { message: '姓名过长' })
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '用户名过长' })
  username?: string

  @IsOptional()
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(100, { message: '密码过长' })
  password?: string

  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$|^$/, { message: '手机号格式不正确（应为 11 位手机号，可留空）' })
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '学科过长' })
  subject?: string
}

/** 新增（单个）教师入参校验 */
export class CreateTeacherDto extends TeacherItemDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

/** 批量创建教师入参校验 */
export class BatchCreateTeachersDto {
  @IsArray({ message: 'teachers 必须为数组' })
  @ArrayMinSize(1, { message: '请提供至少一位教师信息' })
  @ValidateNested({ each: true })
  @Type(() => TeacherItemDto)
  teachers: TeacherItemDto[]
}

/** 创建班级入参校验 */
export class CreateClassDto {
  @IsNotEmpty({ message: '班级名称必填' })
  @IsString()
  @MaxLength(50, { message: '班级名称过长' })
  name: string

  @IsNotEmpty({ message: '年级必填' })
  @IsString()
  @MaxLength(20)
  grade: string

  @IsNotEmpty({ message: '班号必填' })
  @IsString()
  @MaxLength(20)
  classNo: string

  @IsNotEmpty({ message: '班主任必填' })
  @IsString()
  @MaxLength(50)
  headTeacher: string

  @IsNotEmpty({ message: '请选择班主任（教师）' })
  @IsString()
  headTeacherId: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  term?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectTeacherDto)
  subjectTeachers?: SubjectTeacherDto[]
}

/** 班级任课教师（班级维度） */
export class SubjectTeacherDto {
  @IsNotEmpty({ message: 'teacherId 必填' })
  @IsString()
  teacherId: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[]
}

/** 创建班级公告入参校验 */
export class CreateNoticeDto {
  @IsNotEmpty({ message: '公告标题必填' })
  @IsString()
  @MaxLength(200, { message: '标题过长' })
  title: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: '内容过长' })
  content?: string
}

/** 更新学生入参校验 */
export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '姓名过长' })
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentName?: string

  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$|^$/, { message: '家长手机号格式不正确（应为 11 位手机号，可留空）' })
  parentPhone?: string
}
