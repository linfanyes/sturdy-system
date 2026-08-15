import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsBoolean, IsObject } from 'class-validator'

export class UpsertConsentDto {
  @ApiProperty({ required: false, description: '授权项 {mood, worksPublic, aiAnalysis}' })
  @IsOptional() @IsObject()
  consents?: Record<string, boolean>

  @ApiProperty({ required: false, description: '条款版本' })
  @IsOptional() @IsObject()
  version?: string
}
