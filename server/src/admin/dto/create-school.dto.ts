import { IsNotEmpty, IsOptional, IsString, IsIn, MaxLength, Matches } from 'class-validator'

/** 新增学校入参校验（超管维护学校结构） */
export class CreateSchoolDto {
  @IsNotEmpty({ message: '学校名称必填' })
  @IsString()
  @MaxLength(100, { message: '学校名称过长' })
  name: string

  /** 学校编号前缀：管理员输入，限制 2 位大写字母或数字 */
  @IsNotEmpty({ message: '请填写 2 位学校编号前缀' })
  @IsString()
  @Matches(/^[A-Z0-9]{2}$/, { message: '编号前缀必须为 2 位大写字母或数字' })
  prefix: string

  /** 创建端：web 端编号末尾 H，小程序端末尾 W */
  @IsOptional()
  @IsIn(['web', 'mini'])
  platform?: 'web' | 'mini'

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string
}

/** 更新学校入参校验（编号不可改） */
export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '学校名称过长' })
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string
}
