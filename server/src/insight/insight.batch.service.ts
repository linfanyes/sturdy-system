import { Injectable, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { ClassInsight } from './insight.entity'
import { Grade } from '../grades/grade.entity'
import { InsightService } from './insight.service'

@Injectable()
export class InsightBatchService {
  private readonly logger = new Logger(InsightBatchService.name)

  constructor(
    @InjectRepository(ClassInsight) private readonly insightRepo: Repository<ClassInsight>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @Inject(InsightService) private readonly svc: InsightService,
  ) {}

  /** 扫描所有有成绩的班主任，逐班生成洞察并推送给教师；返回统计 */
  async pushAllInsights(): Promise<{ teachers: number; classes: number; processed: number }> {
    const rows = await this.gradeRepo
      .createQueryBuilder('g')
      .select('g.teacherId', 'teacherId')
      .distinct(true)
      .where('g.teacherId IS NOT NULL')
      .getRawMany()
    let classes = 0
    let processed = 0
    for (const r of rows) {
      const teacherId = r.teacherId
      const clsIds = await this.svc.getTeacherClasses(teacherId)
      for (const cid of clsIds) {
        try {
          const insight = await this.svc.buildAndStore(teacherId, cid)
          await this.svc.pushToTeacher(teacherId, insight)
          processed++
          this.logger.log(`[insight] 已推送 ${teacherId}/${cid}`)
        } catch (e) {
          this.logger.error(`[insight] 失败 ${teacherId}/${cid}: ` + (e as Error).message)
        }
      }
      classes += clsIds.length
    }
    return { teachers: rows.length, classes, processed }
  }

  /** 定时任务：每周一 08:00 自动推送全校班级洞察 */
  @Cron('0 8 * * 1', { name: 'class-insight-push' })
  async handleCron() {
    this.logger.log('[cron] 班级洞察自动推送开始')
    try {
      const res = await this.pushAllInsights()
      this.logger.log('[cron] 班级洞察自动推送完成：' + JSON.stringify(res))
    } catch (e) {
      this.logger.error('[cron] 班级洞察自动推送失败：' + (e as Error).message)
    }
  }
}
