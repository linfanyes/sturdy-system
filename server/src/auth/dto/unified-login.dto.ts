import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator'

export class UnifiedLoginDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string
}

export class AdminLoginDto {
  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsString()
  password?: string
}
