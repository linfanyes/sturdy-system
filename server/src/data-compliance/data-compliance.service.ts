import { Injectable, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DataConsent } from './data-compliance.entity'
import { UpsertConsentDto } from './data-compliance.dto'
import { AuditService } from '../audit/audit.service'

const DEFAULT_CONSENTS = { mood: true, worksPublic: false, aiAnalysis: true }
export const CONSENT_VERSION = '1.0'

@Injectable()
export class DataComplianceService {
  constructor(
    @InjectRepository(DataConsent)
    private readonly repo: Repository<DataConsent>,
    private readonly audit: AuditService,
  ) {}

  async getOrCreate(ownerId: string, studentId?: string, studentName?: string): Promise<DataConsent> {
    let e = await this.repo.findOne({ where: { ownerId } as any })
    if (!e) {
      e = this.repo.create({
        ownerId,
        studentId,
        studentName,
        consents: { ...DEFAULT_CONSENTS },
        version: CONSENT_VERSION,
      })
      e = await this.repo.save(e)
    }
    return e
  }

  /** 更新授权项，并写入审计 */
  async upsert(ownerId: string, studentId: string | undefined, studentName: string | undefined, dto: UpsertConsentDto) {
    const e = await this.getOrCreate(ownerId, studentId, studentName)
    const before = e.consents || {}
    const merged = { ...DEFAULT_CONSENTS, ...before, ...(dto.consents || {}) }
    e.consents = merged
    e.withdrawnAt = null // 重新授权即恢复有效
    if (dto.version) e.version = dto.version as string
    const saved = await this.repo.save(e)
    await this.audit.logOperation({
      actorId: ownerId, actorRole: 'parent',
      action: 'consent.update', targetType: 'student', targetId: studentId || '',
      detail: { before, after: merged }, schoolId: '',
    })
    return saved
  }

  /** 撤回全部授权（被遗忘权 / 数据最小化），并写入审计 */
  async withdraw(ownerId: string, studentId?: string) {
    const e = await this.getOrCreate(ownerId, studentId)
    e.consents = { mood: false, worksPublic: false, aiAnalysis: false }
    e.withdrawnAt = new Date()
    const saved = await this.repo.save(e)
    await this.audit.logOperation({
      actorId: ownerId, actorRole: 'parent',
      action: 'consent.withdraw', targetType: 'student', targetId: studentId || '',
      detail: { withdrawnAt: saved.withdrawnAt }, schoolId: '',
    })
    return saved
  }

  /** 超管/校管：授权概览统计 */
  async summary() {
    const all = await this.repo.find()
    const total = all.length
    const granted = { mood: 0, worksPublic: 0, aiAnalysis: 0 }
    let withdrawn = 0
    for (const e of all) {
      if (e.withdrawnAt) { withdrawn++; continue }
      const c = e.consents || {}
      if (c.mood) granted.mood++
      if (c.worksPublic) granted.worksPublic++
      if (c.aiAnalysis) granted.aiAnalysis++
    }
    return { total, withdrawn, granted }
  }

  /** 超管/校管：按学生查询授权 */
  async listByStudent(studentId: string) {
    return this.repo.find({ where: { studentId } as any, order: { createdAt: 'DESC' } })
  }
}
