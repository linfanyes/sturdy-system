import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

/**
 * 发送消息入参。
 * 发件人（senderId/senderRole）由当前登录用户决定，不接收前端传入，避免伪造。
 */
export class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: '收件人ID(recipientId)不能为空' })
  recipientId: string

  @IsString()
  @IsNotEmpty({ message: '收件人角色(recipientRole)不能为空' })
  recipientRole: string

  @IsString()
  @IsNotEmpty({ message: '标题(title)不能为空' })
  title: string

  @IsString()
  @IsNotEmpty({ message: '内容(content)不能为空' })
  content: string

  @IsString()
  @IsOptional()
  type?: string
}
