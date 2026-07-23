import { IsOptional, IsString, IsArray } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() subject?: string
  @IsOptional() @IsArray() subjects?: string[]
  @IsOptional() @IsString() term?: string
  @IsOptional() @IsString() school?: string
  @IsOptional() @IsString() avatar?: string
  @IsOptional() @IsString() motto?: string
  @IsOptional() @IsString() theme?: string
  @IsOptional() @IsString() colorScheme?: string
  @IsOptional() @IsString() fontSize?: string
}
