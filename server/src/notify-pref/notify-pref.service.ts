import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotifyPref } from './notify-pref.entity'
import { UpsertNotifyPrefDto } from './notify-pref.dto'

const DEFAULT_CATEGORIES = { notice: true, homework: true, grade: true, mood: true, message: true }

@Injectable()
export class NotifyPrefService {
  constructor(
    @InjectRepository(NotifyPref)
    private readonly repo: Repository<NotifyPref>,
  ) {}

  /** 读取或创建默认偏好 */
  async getOrCreate(ownerId: string, ownerRole: string): Promise<NotifyPref> {
    let e = await this.repo.findOne({ where: { ownerId, ownerRole } as any })
    if (!e) {
      e = this.repo.create({
        ownerId,
        ownerRole,
        quietStart: '22:00',
        quietEnd: '08:00',
        quietEnabled: false,
        digestMode: false,
        categories: { ...DEFAULT_CATEGORIES },
        showGrade: true,
        showRank: true,
      })
      e = await this.repo.save(e)
    }
    return e
  }

  /** 更新偏好（局部字段合并） */
  async upsert(ownerId: string, ownerRole: string, dto: UpsertNotifyPrefDto): Promise<NotifyPref> {
    const e = await this.getOrCreate(ownerId, ownerRole)
    const merged = { ...e, ...dto }
    if (dto.categories) {
      merged.categories = { ...DEFAULT_CATEGORIES, ...e.categories, ...dto.categories }
    }
    return this.repo.save(merged)
  }

  /** 是否处于免打扰时段（供推送管线调用） */
  async isQuiet(ownerId: string, ownerRole: string, now = new Date()): Promise<boolean> {
    const e = await this.getOrCreate(ownerId, ownerRole)
    if (!e.quietEnabled) return false
    const cur = now.getHours() * 60 + now.getMinutes()
    const [sh, sm] = e.quietStart.split(':').map(Number)
    const [eh, em] = e.quietEnd.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (start <= end) return cur >= start && cur <= end
    // 跨午夜：如 22:00 - 08:00
    return cur >= start || cur <= end
  }
}
