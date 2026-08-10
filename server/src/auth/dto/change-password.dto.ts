import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator'

/** 已登录用户自助修改密码（校验原密码） */
export class ChangePasswordDto {
  @IsNotEmpty({ message: '请填写原密码' })
  @IsString()
  oldPassword: string

  @IsNotEmpty({ message: '请填写新密码' })
  @IsString()
  @MinLength(8, { message: '新密码长度须为 8-20 位' })
  @MaxLength(20, { message: '新密码长度须为 8-20 位' })
  newPassword: string
}
