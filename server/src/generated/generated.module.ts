import { Module, UseGuards, Post, Body, BadRequestException } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import {
  GeneratedPaper,
  GeneratedLessonPlan,
  GeneratedKnowledge,
  PaperQueryDoc,
} from './generated.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { User } from '../users/user.entity'

class PapersService extends CrudService<GeneratedPaper> {
  constructor(@InjectRepository(GeneratedPaper) repo: Repository<GeneratedPaper>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/papers')
class PapersController extends CrudController<GeneratedPaper> {
  constructor(s: PapersService) {
    super(s)
  }
}

class PlansService extends CrudService<GeneratedLessonPlan> {
  constructor(
    @InjectRepository(GeneratedLessonPlan) repo: Repository<GeneratedLessonPlan>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super(repo)
  }

  /** 初始化示例教案：教师库为空时生成 3 条按学科定制的模板（幂等） */
  async seedDefaults(teacherId: string) {
    const count = await this.repo.count({ where: { teacherId } as any })
    if (count > 0) return { seeded: 0, reason: '已存在教案数据' }
    const user = await this.userRepo.findOne({ where: { id: teacherId } }).catch(() => null)
    const subject = (user?.subject || '语文').trim()
    const templates: Partial<GeneratedLessonPlan>[] = [
      {
        title: `${subject} · 新授课教学设计（示例）`,
        topic: '新授课：核心知识讲解',
        subject,
        grade: user?.grade || '',
        content: [
          `【教学目标】1. 理解并掌握本节课核心概念；2. 能运用所学知识解决基础问题；3. 培养学科核心素养。`,
          `【教学重点】重点概念的建立与理解。`,
          `【教学难点】知识迁移与实际应用。`,
          `【教学过程】一、情境导入（5min）→ 二、新知讲授（20min）→ 三、例题精讲（10min）→ 四、随堂练习（8min）→ 五、小结作业（2min）。`,
          `【板书设计】标题 + 知识结构图 + 关键词。`,
        ].join('\n\n'),
      },
      {
        title: `${subject} · 公开课教学设计（示例）`,
        topic: '公开课：探究式学习',
        subject,
        grade: user?.grade || '',
        content: [
          `【课型】公开课 / 探究式教学`,
          `【设计理念】以学生为主体，通过问题链引导自主探究。`,
          `【活动设计】小组合作探究 + 成果展示 + 师生互评。`,
          `【时间分配】导入 5min / 探究 20min / 展示点评 12min / 总结 3min。`,
          `【教学反思】预留反思栏：课堂生成与改进方向。`,
        ].join('\n\n'),
      },
      {
        title: `${subject} · 复习课教学设计（示例）`,
        topic: '复习课：单元知识梳理',
        subject,
        grade: user?.grade || '',
        content: [
          `【复习目标】1. 系统梳理本单元知识框架；2. 攻克高频易错点。`,
          `【知识框架】思维导图式回顾：概念 → 性质/公式 → 典型题型 → 易错提醒。`,
          `【易错点清单】1. …；2. …；3. …（请结合班级学情补充）。`,
          `【练习设计】基础过关（全员）→ 能力提升（选做）→ 拓展挑战（学有余力）。`,
        ].join('\n\n'),
      },
    ]
    for (const t of templates) {
      await this.repo.save(this.repo.create({ ...t, teacherId } as any))
    }
    return { seeded: templates.length }
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/lesson-plans')
class PlansController extends CrudController<GeneratedLessonPlan> {
  constructor(s: PlansService) {
    super(s)
  }

  /** 初始化示例教案（幂等：已有数据时不重复生成） */
  @Post('seed-defaults')
  @UseGuards(JwtAuthGuard)
  seedDefaults(@CurrentTeacher() t: any) {
    if (!t?.sub) throw new BadRequestException('缺少教师身份')
    return (this.service as PlansService).seedDefaults(t.sub)
  }
}

class KnowledgeService extends CrudService<GeneratedKnowledge> {
  constructor(
    @InjectRepository(GeneratedKnowledge) repo: Repository<GeneratedKnowledge>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super(repo)
  }

  /** 初始化示例知识点：教师库为空时生成 3 条按学科定制的模板（幂等） */
  async seedDefaults(teacherId: string) {
    const count = await this.repo.count({ where: { teacherId } as any })
    if (count > 0) return { seeded: 0, reason: '已存在知识点数据' }
    const user = await this.userRepo.findOne({ where: { id: teacherId } }).catch(() => null)
    const subject = (user?.subject || '语文').trim()
    const templates: Partial<GeneratedKnowledge>[] = [
      {
        title: `${subject} · 基础概念（示例）`,

        subject,
        grade: user?.grade || '',
        textbook: '',
        term: '',
        content: `【知识点】${subject}核心概念的定义与内涵。\n【讲解要点】1. 概念的提出背景；2. 定义中的关键限定词；3. 典型例子加深理解。\n【易错提醒】注意与相近概念的区分。`,
      },
      {
        title: `${subject} · 重点方法（示例）`,

        subject,
        grade: user?.grade || '',
        textbook: '',
        term: '',
        content: `【知识点】本学科的常用解题方法/学习策略。\n【方法步骤】第一步…第二步…第三步…（结合具体题目补充）。\n【举一反三】换一种情境，方法是否依然适用？`,
      },
      {
        title: `${subject} · 拓展提升（示例）`,

        subject,
        grade: user?.grade || '',
        textbook: '',
        term: '',
        content: `【知识点】与课本相关的拓展内容。\n【链接生活】生活中有哪些例子与本节课知识相关？\n【思考题】尝试用所学知识解释一个身边的（学科相关）现象。`,
      },
    ]
    for (const t of templates) {
      await this.repo.save(this.repo.create({ ...t, teacherId } as any))
    }
    return { seeded: templates.length }
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/knowledges')
class KnowledgeController extends CrudController<GeneratedKnowledge> {
  constructor(s: KnowledgeService) {
    super(s)
  }

  /** 初始化示例知识点（幂等：已有数据时不重复生成） */
  @Post('seed-defaults')
  @UseGuards(JwtAuthGuard)
  seedDefaults(@CurrentTeacher() t: any) {
    if (!t?.sub) throw new BadRequestException('缺少教师身份')
    return (this.service as KnowledgeService).seedDefaults(t.sub)
  }
}

class QueryService extends CrudService<PaperQueryDoc> {
  constructor(@InjectRepository(PaperQueryDoc) repo: Repository<PaperQueryDoc>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('generated/queries')
class QueryController extends CrudController<PaperQueryDoc> {
  constructor(s: QueryService) {
    super(s)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GeneratedPaper,
      GeneratedLessonPlan,
      GeneratedKnowledge,
      PaperQueryDoc,
      User,
    ]),
  ],
  providers: [PapersService, PlansService, KnowledgeService, QueryService],
  controllers: [PapersController, PlansController, KnowledgeController, QueryController],
})
export class GeneratedModule {}
