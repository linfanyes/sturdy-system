import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 教学资源库：按学校隔离的公共教学资料。
 * 三张表分别承载语文古诗词、数学公式定理、英语分类单词。
 * 校管/学科组长可编辑，教师/家长只读查询。
 */

/** 古诗词（小学必背古诗词汇总） */
@Entity('resource_poems')
@Index('idx_poems_school', ['schoolId'])
@Index('idx_poems_school_grade', ['schoolId', 'grade'])
export class Poem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36, comment: '归属学校ID' })
  schoolId: string

  @Column({ length: 100 }) title: string           // 诗词标题
  @Column({ length: 20, default: '' }) dynasty: string   // 朝代：唐/宋/元/明/清
  @Column({ length: 50, default: '' }) author: string    // 作者
  @Column({ type: 'text' }) content: string         // 诗词正文
  @Column({ type: 'text', nullable: true }) translation: string   // 译文/白话解释
  @Column({ type: 'text', nullable: true }) appreciation: string  // 赏析
  @Column({ length: 20, default: '通用' }) grade: string   // 适用年级
  @Column({ length: 200, default: '' }) keywords: string   // 关键词，逗号分隔
  @Column({ length: 500, nullable: true }) audioUrl: string // 朗读音频URL
  @Column({ type: 'int', default: 0 }) sortOrder: number
  @Column({ default: 'published' }) status: string  // draft / published

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}

/** 数学公式定理（小学常用公式、定理、思维方式汇总） */
@Entity('resource_math_formulas')
@Index('idx_math_formulas_school', ['schoolId'])
@Index('idx_math_formulas_school_grade', ['schoolId', 'grade'])
export class MathFormula {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36, comment: '归属学校ID' })
  schoolId: string

  @Column({ length: 100 }) title: string            // 名称：加法交换律
  @Column({ length: 30, default: '' }) category: string   // 类别：运算定律/几何公式/单位换算/分数小数/比例百分数/思维方法
  @Column({ length: 500, default: '' }) formula: string   // 公式（支持 LaTeX）
  @Column({ type: 'text', nullable: true }) explanation: string  // 说明/解释
  @Column({ type: 'text', nullable: true }) example: string      // 例题
  @Column({ length: 20, default: '通用' }) grade: string
  @Column({ length: 200, default: '' }) keywords: string
  @Column({ type: 'int', default: 0 }) sortOrder: number
  @Column({ default: 'published' }) status: string

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}

/** 英语分类单词（按场景分类的英语单词，便于口语化记忆） */
@Entity('resource_english_words')
@Index('idx_english_words_school', ['schoolId'])
@Index('idx_english_words_school_grade', ['schoolId', 'grade'])
@Index('idx_english_words_school_category', ['schoolId', 'category'])
export class EnglishWord {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36, comment: '归属学校ID' })
  schoolId: string

  @Column({ length: 100 }) word: string             // 单词
  @Column({ length: 100, default: '' }) phonetic: string  // 音标
  @Column({ length: 200, default: '' }) meaning: string   // 中文释义
  @Column({ length: 30, default: '' }) category: string   // 场景类别：季节/食物/水果/数字/颜色/动物/身体/家庭/衣物/交通
  @Column({ type: 'text', nullable: true }) example: string // 例句
  @Column({ length: 20, default: '通用' }) grade: string
  @Column({ length: 500, nullable: true }) audioUrl: string // 发音音频URL
  @Column({ type: 'int', default: 0 }) sortOrder: number
  @Column({ default: 'published' }) status: string

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}

/**
 * 科学资源库（小学科学知识、实验、观察记录等）
 * 字段与英语单词类似走通用结构：标题 / 分类 / 内容 / 年级 / 关键词 / 排序 / 状态。
 */
@Entity('resource_science')
@Index('idx_science_school', ['schoolId'])
@Index('idx_science_school_grade', ['schoolId', 'grade'])
@Index('idx_science_school_category', ['schoolId', 'category'])
export class Science {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36, comment: '归属学校ID' })
  schoolId: string

  @Column({ length: 100 }) title: string            // 标题：水的三态变化
  @Column({ length: 30, default: '' }) category: string   // 分类：物质科学/生命科学/地球与宇宙/技术与工程
  @Column({ type: 'text' }) content: string         // 知识内容 / 实验说明
  @Column({ length: 20, default: '通用' }) grade: string
  @Column({ length: 200, default: '' }) keywords: string
  @Column({ type: 'int', default: 0 }) sortOrder: number
  @Column({ default: 'published' }) status: string

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}

/**
 * 道德与法治资源库（案例、讨论、价值观等）
 * 字段同样走通用结构：标题 / 主题分类 / 内容 / 年级 / 关键词 / 排序 / 状态。
 */
@Entity('resource_moral')
@Index('idx_moral_school', ['schoolId'])
@Index('idx_moral_school_grade', ['schoolId', 'grade'])
@Index('idx_moral_school_category', ['schoolId', 'category'])
export class Moral {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36, comment: '归属学校ID' })
  schoolId: string

  @Column({ length: 100 }) title: string            // 标题：诚实的花盆
  @Column({ length: 30, default: '' }) category: string   // 主题：个人品德/家庭美德/社会公德/国家情怀
  @Column({ type: 'text' }) content: string         // 案例 / 讨论 / 价值观内容
  @Column({ length: 20, default: '通用' }) grade: string
  @Column({ length: 200, default: '' }) keywords: string
  @Column({ type: 'int', default: 0 }) sortOrder: number
  @Column({ default: 'published' }) status: string

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}
