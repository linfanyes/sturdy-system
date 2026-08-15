import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsBoolean, IsString, IsObject, Matches } from 'class-validator'

export class UpsertNotifyPrefDto {
  @ApiProperty({ required: false, description: '免打扰开始 HH:mm' })
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '时间格式应为 HH:mm' })
  quietStart?: string

  @ApiProperty({ required: false, description: '免打扰结束 HH:mm' })
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '时间格式应为 HH:mm' })
  quietEnd?: string

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  quietEnabled?: boolean

  @ApiProperty({ required: false, description: '合并推送' })
  @IsOptional() @IsBoolean()
  digestMode?: boolean

  @ApiProperty({ required: false, description: '类别开关 {notice,homework,grade,mood,message}' })
  @IsOptional() @IsObject()
  categories?: Record<string, boolean>

  @ApiProperty({ required: false, description: '一屏展示分数' })
  @IsOptional() @IsBoolean()
  showGrade?: boolean

  @ApiProperty({ required: false, description: '一屏展示排名' })
  @IsOptional() @IsBoolean()
  showRank?: boolean
}
