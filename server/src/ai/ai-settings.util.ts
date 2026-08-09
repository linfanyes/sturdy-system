import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { assertAllowedAiUrl } from './ai-file-parser.service'

/**
 * A06修复：AI 子服务 buildSettings 重复代码抽取。
 * 验证 AI 配置（apiKey、baseUrl）并进行 SSRF 防护校验。
 * 被 AiChatService / AiMediaService / AiVisionService / AiFileParserService 共同使用。
 */
export async function buildAiSettings(
  cfg: ConfigService,
  ownerType: string,
  ownerId: string,
) {
  const s = await cfg.getAiSettings(ownerType, ownerId)
  if (!s.apiKey) {
    throw new BadRequestException('未配置 AI 密钥，请到「后端配置」中填写')
  }
  if (!s.baseUrl) {
    throw new BadRequestException('未配置 AI 接口地址')
  }
  // SSRF 防护：拒绝私网/云元数据/非 HTTPS 地址
  assertAllowedAiUrl(s.baseUrl)
  return s
}
