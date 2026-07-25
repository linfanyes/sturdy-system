import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator'

/** 家长登录入参校验 */
export class ParentLoginDto {
  @IsNotEmpty({ message: '学号必填' })
  @IsString()
  @MaxLength(30, { message: '学号过长' })
  studentNo: string

  @IsNotEmpty({ message: '密码必填' })
  @IsString()
  @MaxLength(100, { message: '密码过长' })
  password: string
}

/** 家长修改密码入参校验 */
export class ChangePasswordDto {
  @IsNotEmpty({ message: '原密码必填' })
  @IsString()
  oldPassword: string

  @IsNotEmpty({ message: '新密码必填' })
  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  @MaxLength(100, { message: '新密码过长' })
  newPassword: string
}

/** 家长绑定微信 */
export class BindWechatDto {
  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '昵称过长' })
  nickName?: string
}

/** 家长关注/订阅微信模板消息 */
export class SubscribeDto {
  @IsOptional()
  @IsString()
  code?: string
}
