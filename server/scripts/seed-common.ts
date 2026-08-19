/**
 * 测试数据脚本 - 公共模块
 *
 * 说明：
 * - 使用「独立 TypeORM DataSource」直连数据库（沿用 .env 中的 DB_* 配置，与后端一致），
 *   不启动完整 Nest 应用，避免模块初始化 / @gardener/shared 路径解析等额外依赖。
 * - 所有实体形状、字段、唯一键都严格对齐后端实体（school / school_admins / users /
 *   classes / class_members / students / parents / student_parents / exams /
 *   grades / notices / schedules）。
 * - 密码统一用 bcrypt 哈希（与后端 hashPassword 一致），默认口令见 SEED_CONFIG。
 * - 生成脚本会写出 seed-manifest.json（记录所有生成的 ID），清除脚本按该清单精确删除，
 *   不会误删真实数据；重复运行生成会自动先清除旧清单再重建。
 */
import 'reflect-metadata'
import 'dotenv/config'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import path from 'node:path'
import { DataSource } from 'typeorm'
import bcrypt from 'bcrypt'

import { School } from '../src/school/school.entity'
import { SchoolAdmin } from '../src/school-admin/school-admin.entity'
import { User } from '../src/users/user.entity'
import { ClassItem } from '../src/classes/class.entity'
import { ClassMember } from '../src/class-members/class-member.entity'
import { Student } from '../src/students/student.entity'
import { Parent } from '../src/parent/parent.entity'
import { StudentParent } from '../src/student-parent/student-parent.entity'
import { Exam } from '../src/exams/exam.entity'
import { Grade } from '../src/grades/grade.entity'
import { Notice, ScheduleItem } from '../src/school/school.entity'
import { Poem, MathFormula, EnglishWord } from '../src/resource-library/resource-library.entity'
import { Textbook, TextbookUnit, TextbookKnowledgePoint } from '../src/textbook/textbook.entity'

/* ===================== 配置 ===================== */
export const SEED_CONFIG = {
  schools: 5,
  teachersPerSchool: 24,
  classesPerGrade: 3, // 每个年级的班级数
  studentsPerClass: 30,
  examsPerClass: 10, // 每个班级的考试次数
  defaultPassword: process.env.SEED_PASSWORD || 'Test@2026', // 所有种子账号统一口令
}

// 与 shared/constants/index.ts::SUBJECT_OPTIONS 的 15 门标准学科对齐（历史债 #9 统一）
export const ALL_SUBJECTS = [
  '语文', '数学', '英语', '科学', '物理', '化学', '生物', '历史', '地理', '政治',
  '音乐', '美术', '体育', '信息技术', '综合实践',
]
export const CORE_SUBJECTS = ['语文', '数学', '英语']
export const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

// 20 个不同职务（与每校 20 名教师一一对应，保证“不同职务”）
export const POSITIONS = [
  '班主任', '年级组长', '教研组长', '备课组长', '学科带头人', '教务主任', '德育主任',
  '少先队辅导员', '信息管理员', '后勤管理员', '教研员', '学生会指导老师', '团委书记',
  '心理辅导老师', '图书馆管理员', '实验室管理员', '体育教研组长', '艺术指导',
  '安全专员', '家长学校负责人',
]

export const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱',
  '胡', '林', '郭', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
]
export const GIVEN = [
  '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰',
  '娟', '涛', '明', '超', '霞', '平', '刚', '梅', '鹏', '宇', '浩', '晨', '欣', '悦',
  '梓', '涵', '睿', '嘉', '怡', '轩', '彤', '鑫', '璐', '倩', '波', '斌',
]

export const MANIFEST_PATH = path.join(process.cwd(), 'seed-manifest.json')

/* ===================== 工具函数 ===================== */
export const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const genName = () => pick(SURNAMES) + pick(GIVEN)

/** 生成学校编号：2 位前缀 + 5 位随机 + 平台后缀(H)，共 8 位，保证全局唯一 */
export async function genSchoolCode(prefix: string, ds: DataSource): Promise<string> {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const all = letters + digits
  const p = (prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)
  const suffix = 'H'
  for (let a = 0; a < 50; a++) {
    const bytes = crypto.randomBytes(5)
    let rand = ''
    for (let i = 0; i < 5; i++) rand += all[bytes[i] % all.length]
    const code = p + rand + suffix
    const dup = await ds.getRepository(School).findOne({ where: { code } })
    if (!dup) return code
  }
  const tail = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5)
  return p + tail + suffix
}

/* ===================== DataSource ===================== */
export function buildDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'gardener',
    charset: 'utf8mb4',
    timezone: '+08:00',
    // 不自动建表：要求目标库表结构已存在（先启动一次后端，或云环境已自动建表）
    synchronize: false,
    entities: [
      School, SchoolAdmin, User, ClassItem, ClassMember,
      Student, Parent, StudentParent, Exam, Grade, Notice, ScheduleItem,
      Poem, MathFormula, EnglishWord,
      Textbook, TextbookUnit, TextbookKnowledgePoint,
    ],
  })
}

/* ===================== Manifest ===================== */
export function loadManifest(): any | null {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  } catch {
    return null
  }
}
export function saveManifest(m: any) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2))
}
export function clearManifest() {
  try {
    fs.unlinkSync(MANIFEST_PATH)
  } catch {
    /* ignore */
  }
}

/**
 * 按外键依赖顺序删除测试数据（子表 → 父表）。
 * 仅删除清单中记录的 ID，绝不碰真实数据。
 */
export async function clearByManifest(ds: DataSource, m: any) {
  const repoMap: Record<string, any> = {
    grades: ds.getRepository(Grade),
    exams: ds.getRepository(Exam),
    studentParents: ds.getRepository(StudentParent),
    students: ds.getRepository(Student),
    notices: ds.getRepository(Notice),
    schedules: ds.getRepository(ScheduleItem),
    classMembers: ds.getRepository(ClassMember),
    classes: ds.getRepository(ClassItem),
    teachers: ds.getRepository(User),
    schoolAdmins: ds.getRepository(SchoolAdmin),
    parents: ds.getRepository(Parent),
    schools: ds.getRepository(School),
  }
  const order = [
    'grades', 'exams', 'studentParents', 'students', 'notices', 'schedules',
    'classMembers', 'classes', 'teachers', 'schoolAdmins', 'parents', 'schools',
  ]
  for (const key of order) {
    const ids: string[] = m[key] || []
    if (!ids.length) continue
    try {
      await repoMap[key].delete(ids)
      console.log(`  ✓ 已清除 ${key}: ${ids.length} 条`)
    } catch (e: any) {
      console.warn(`  ⚠ 清除 ${key} 失败（跳过）: ${e?.message || e}`)
    }
  }
}
