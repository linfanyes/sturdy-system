import { IsNotEmpty, IsOptional, IsString, IsBoolean, MinLength, MaxLength } from 'class-validator'

/** 新增学校管理员入参校验（超管操作，绑定已存在的学校） */
export class CreateSchoolAdminDto {
  @IsNotEmpty({ message: '用户名必填' })
  @IsString()
  @MaxLength(50, { message: '用户名过长' })
  username: string

  @IsNotEmpty({ message: '密码必填' })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(100, { message: '密码过长' })
  password: string

  @IsNotEmpty({ message: '姓名必填' })
  @IsString()
  @MaxLength(50, { message: '姓名过长' })
  name: string

  @IsNotEmpty({ message: '请选择所属学校' })
  @IsString()
  schoolId: string

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

/** 更新学校管理员入参校验 */
export class UpdateSchoolAdminDto {
  @IsOptional()
  @IsString()
  schoolId?: string

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '用户名过长' })
  username?: string

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '姓名过长' })
  name?: string

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

/** 切换管理员启用状态 */
export class ToggleEnabledDto {
  @IsBoolean({ message: 'enabled 必须为布尔值' })
  enabled: boolean
}

/** 重置管理员密码 */
export class ResetPasswordDto {
  @IsNotEmpty({ message: '新密码必填' })
  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  @MaxLength(100, { message: '新密码过长' })
  password: string
}

/** 一键重置确认 */
export class ResetAllDto {
  @IsBoolean({ message: 'confirm 必须为布尔值' })
  confirm: boolean
}
