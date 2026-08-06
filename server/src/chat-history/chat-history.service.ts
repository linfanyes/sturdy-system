import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChatSession } from './chat-session.entity'

/**
 * AI 对话历史服务：按教师租户隔离，支持会话增删改查 + 置顶。
 */
@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly repo: Repository<ChatSession>,
  ) {}

  /** 新建会话（空消息） */
  async create(teacherId: string, dto: { title?: string }) {
    const e = this.repo.create({
      teacherId,
      title: dto.title?.trim() || '新对话',
      messages: [],
      pinned: false,
    })
    return this.repo.save(e)
  }

  /** 会话列表（按更新时间倒序） */
  async list(teacherId: string) {
    const rows = await this.repo.find({
      where: { teacherId },
      order: { updatedAt: 'DESC' } as any,
      take: 200,
    })
    // 仅返回会话元信息 + 首条/末条摘要，避免列表页加载全部消息
    return rows.map((s) => ({
      id: s.id,
      title: s.title,
      pinned: s.pinned,
      messageCount: (s.messages || []).length,
      updatedAt: s.updatedAt,
      preview: (s.messages || []).length ? (s.messages[s.messages.length - 1].content || '').slice(0, 60) : '',
    }))
  }

  /** 会话详情（含全部消息） */
  async detail(teacherId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, teacherId } })
    if (!e) return null
    return e
  }

  /** 追加一条消息（自动更新 updatedAt 与 title） */
  async append(teacherId: string, id: string, role: 'user' | 'assistant', content: string) {
    const e = await this.repo.findOne({ where: { id, teacherId } })
    if (!e) throw new Error('会话不存在或无权访问')
    const msgs = e.messages || []
    msgs.push({ role, content, createdAt: new Date().toISOString() })
    // 首条 user 消息作为会话标题
    if (msgs.length === 1 && role === 'user') {
      e.title = content.slice(0, 20) || '新对话'
    }
    e.messages = msgs
    await this.repo.save(e)
    return e
  }

  /** 删除会话 */
  async remove(teacherId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, teacherId } })
    if (!e) return { deleted: false }
    await this.repo.remove(e)
    return { deleted: true }
  }

  /** 置顶/取消置顶 */
  async togglePin(teacherId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, teacherId } })
    if (!e) throw new Error('会话不存在或无权访问')
    e.pinned = !e.pinned
    await this.repo.save(e)
    return e
  }
}