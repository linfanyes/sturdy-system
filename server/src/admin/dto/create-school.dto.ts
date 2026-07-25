import { IsNotEmpty, IsOptional, IsString, IsIn, MaxLength } from 'class-validator'

/** 新增学校入参校验（超管维护学校结构） */
export class CreateSchoolDto {
  @IsNotEmpty({ message: '学校名称必填' })
  @IsString()
  @MaxLength(100, { message: '学校名称过长' })
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(6, { message: '编号前缀最多 6 位' })
  prefix?: string

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
