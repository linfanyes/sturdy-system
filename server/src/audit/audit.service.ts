import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from './audit.entity'

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(schoolId: string, action: string, operator: string, target: string, detail?: string) {
    const entry = this.auditRepo.create({ schoolId, action, operator, target, detail })
    return this.auditRepo.save(entry)
  }

  async list(schoolId?: string, skip = 0, take = 100) {
    const where = schoolId ? { schoolId } : {}
    const [items, total] = await this.auditRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, skip, take,
    })
    return { items, total }
  }
}
