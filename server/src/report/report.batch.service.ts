import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Grade } from '../grades/grade.entity'
import { ReportService } from './report.service'
import { MessageService } from '../messages/message.service'

@Injectable()
export class ReportBatchService {
  private readonly logger = new Logger(ReportBatchService.name)

  constructor(
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    private readonly svc: ReportService,
    private readonly msg: MessageService,
  ) {}

  /** 周一 08:00 生成并推送全校周报 */
  @Cron('0 8 * * 1', { name: 'class-report-weekly' })
  async weeklyCron() {
    this.logger.log('[report] 周报定时生成开始')
    await this.generateAll('weekly')
  }

  /** 每月 1 号 08:00 生成并推送全校月报 */
  @Cron('0 8 1 * *', { name: 'class-report-monthly' })
  async monthlyCron() {
    this.logger.log('[report] 月报定时生成开始')
    await this.generateAll('monthly')
  }

  async generateAll(type: 'weekly' | 'monthly') {
    const grades = await this.gradeRepo.find()
    const pairs = [
      ...new Map(
        grades.map((g: any) => [`${g.teacherId}|${g.classId}`, { teacherId: g.teacherId, classId: g.classId }]),
      ).values(),
    ]
    let ok = 0
    for (const p of pairs as any[]) {
      try {
        const report = await this.svc.generate(p.teacherId, p.classId, type)
        await this.msg.send('system', 'system', {
          recipientId: p.teacherId,
          recipientRole: 'teacher',
          title: report.title,
          content: report.content || '',
          type: 'class_report',
        })
        await this.msg.notifyClassParents(
          p.teacherId,
          p.classId,
          `【${report.type === 'weekly' ? '周报' : '月报'}】${report.className}`,
          `本班${report.type === 'weekly' ? '本周' : '本月'}报告已生成，点击消息查看详情。`,
          'class_report',
        )
        ok++
      } catch (e) {
        this.logger.error(`[report][${type}] 生成失败 ${p.classId}: ${(e as Error).message}`)
      }
    }
    this.logger.log(`[report][${type}] 完成，成功 ${ok}/${pairs.length} 个班级`)
  }
}
