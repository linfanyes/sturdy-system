import { IsOptional, IsString, IsBoolean } from 'class-validator'

/** 待办事项新增入参（字段与 TodoItem 实体对齐） */
export class CreateTodoDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() note?: string
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsBoolean() done?: boolean
}

/** 待办事项更新入参 */
export class UpdateTodoDto {
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() note?: string
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsBoolean() done?: boolean
}
