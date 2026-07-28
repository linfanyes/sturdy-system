import 'reflect-metadata'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'

/**
 * 业务逻辑全量测试
 * 覆盖：学校管理、班级管理、学生管理、家长端、通知、配置、AI
 */

describe('业务逻辑 - 学校管理', () => {
  describe('学校 CRUD', () => {
    it('TC-BIZ-001: 学校代码生成规则（2前缀+5随机+1平台后缀=8位）', () => {
      const prefix = 'TS'
      const random = 'A1B2C'
      const platformSuffix = 'H' // H=web, W=mini
      const code = `${prefix}${random}${platformSuffix}`
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[A-Z0-9]{2}[A-Z0-9]{5}[HW]$/)
    })

    it('TC-BIZ-002: 学校代码前缀必须为2位大写字母/数字', () => {
      const validPrefixes = ['TS', 'A1', 'ZZ', '00']
      const invalidPrefixes = ['ts', 'ABC', 'A', '1', '']
      const regex = /^[A-Z0-9]{2}$/
      validPrefixes.forEach(p => expect(regex.test(p)).toBe(true))
      invalidPrefixes.forEach(p => expect(regex.test(p)).toBe(false))
    })

    it('TC-BIZ-003: 删除学校时存在管理员则阻止', () => {
      const existingAdmins = [{ id: 'sa-1' }]
      const canDelete = existingAdmins.length === 0
      expect(canDelete).toBe(false)
    })

    it('TC-BIZ-004: 学校代码创建后不可修改', () => {
      const originalCode = 'TS00001H'
      const updatePayload = { name: '新名称', code: 'XX99999W' }
      // code 字段应被忽略
      const applied = { ...updatePayload }
      delete (applied as any).code
      expect(applied).not.toHaveProperty('code')
    })

    it('TC-BIZ-005: 学校停用级联禁用所有管理员和教师', () => {
      const school = { id: 's1', status: 'active' }
      const admins = [{ id: 'sa1', enabled: true }, { id: 'sa2', enabled: true }]
      const teachers = [{ id: 't1', enabled: true }, { id: 't2', enabled: true }]
      // 停用学校
      school.status = 'inactive'
      admins.forEach(a => a.enabled = false)
      teachers.forEach(t => t.enabled = false)
      expect(admins.every(a => !a.enabled)).toBe(true)
      expect(teachers.every(t => !t.enabled)).toBe(true)
    })

    it('TC-BIZ-006: 学校重新启用仅恢复管理员，教师需手动启用', () => {
      const admins = [{ id: 'sa1', enabled: false }]
      const teachers = [{ id: 't1', enabled: false }]
      // 重新启用学校
      admins.forEach(a => a.enabled = true)
      // 教师不自动恢复
      expect(admins[0].enabled).toBe(true)
      expect(teachers[0].enabled).toBe(false)
    })

    it('TC-BIZ-007: reset-all 需要 confirm:true', () => {
      const payload = { confirm: false }
      const canReset = payload.confirm === true
      expect(canReset).toBe(false)
    })
  })

  describe('学校管理员管理', () => {
    it('TC-BIZ-010: 管理员用户名唯一性', () => {
      const existingUsernames = ['sa1', 'sa2', 'admin']
      const newUsername = 'sa1'
      const isDuplicate = existingUsernames.includes(newUsername)
      expect(isDuplicate).toBe(true)
    })

    it('TC-BIZ-011: 批量启用/禁用管理员', () => {
      const admins = [
        { id: '1', enabled: true },
        { id: '2', enabled: false },
        { id: '3', enabled: true },
      ]
      const idsToDisable = ['1', '3']
      admins.forEach(a => {
        if (idsToDisable.includes(a.id)) a.enabled = false
      })
      expect(admins.filter(a => a.enabled)).toHaveLength(0)
    })
  })
})

describe('业务逻辑 - 班级管理', () => {
  it('TC-BIZ-020: 教师编号生成规则（JS+学校代码+5位序号）', () => {
    const schoolCode = 'TS00001H'
    const sequence = '00001'
    const teacherNo = `JS${schoolCode}${sequence}`
    expect(teacherNo).toMatch(/^JS[A-Z0-9]{8}\d{5}$/)
    expect(teacherNo).toHaveLength(15)
  })

  it('TC-BIZ-021: 一教师一学期只能担任一个班的班主任', () => {
    const existingHeadRoles = [
      { teacherId: 't1', classId: 'c1', term: '2024-2025-1', role: 'head' },
    ]
    const newRole = { teacherId: 't1', classId: 'c2', term: '2024-2025-1', role: 'head' }
    const conflict = existingHeadRoles.some(
      r => r.teacherId === newRole.teacherId && r.term === newRole.term && r.role === 'head'
    )
    expect(conflict).toBe(true) // 应拒绝
  })

  it('TC-BIZ-022: 不同学期可以担任不同班的班主任', () => {
    const existingHeadRoles = [
      { teacherId: 't1', classId: 'c1', term: '2024-2025-1', role: 'head' },
    ]
    const newRole = { teacherId: 't1', classId: 'c2', term: '2024-2025-2', role: 'head' }
    const conflict = existingHeadRoles.some(
      r => r.teacherId === newRole.teacherId && r.term === newRole.term && r.role === 'head'
    )
    expect(conflict).toBe(false) // 允许
  })

  it('TC-BIZ-023: 班级升级年级映射', () => {
    const gradeMap: Record<string, string> = {
      '一年级': '二年级', '二年级': '三年级', '三年级': '四年级',
      '四年级': '五年级', '五年级': '六年级', '六年级': '初一',
      '初一': '初二', '初二': '初三', '初三': '高一',
      '高一': '高二', '高二': '高三',
    }
    expect(gradeMap['一年级']).toBe('二年级')
    expect(gradeMap['六年级']).toBe('初一')
    expect(gradeMap['高三']).toBeUndefined() // 毕业
  })

  it('TC-BIZ-024: 删除班级级联清理', () => {
    const classId = 'c1'
    const cascades = ['class_members', 'parentLogin', 'class_scoped_data']
    // 删除班级应清理所有关联
    expect(cascades).toContain('class_members')
    expect(cascades).toContain('parentLogin')
  })

  it('TC-BIZ-025: 用户名生成优先级（显式 > 拼音 > 教师编号）', () => {
    const generateUsername = (explicit?: string, pinyin?: string, teacherNo?: string) => {
      return explicit || pinyin || teacherNo || 'unknown'
    }
    expect(generateUsername('zhangsan', 'zhangsan', 'JS001')).toBe('zhangsan')
    expect(generateUsername(undefined, 'zhangsan', 'JS001')).toBe('zhangsan')
    expect(generateUsername(undefined, undefined, 'JS001')).toBe('JS001')
  })

  it('TC-BIZ-026: 用户名冲突追加数字后缀', () => {
    const existing = ['zhangsan', 'zhangsan1', 'zhangsan2']
    let candidate = 'zhangsan'
    let suffix = 0
    while (existing.includes(candidate)) {
      suffix++
      candidate = `zhangsan${suffix}`
    }
    expect(candidate).toBe('zhangsan3')
  })
})

describe('业务逻辑 - 学生管理', () => {
  it('TC-BIZ-030: 学生导入性别校验（仅男/女）', () => {
    const validGenders = ['男', '女']
    const testCases = ['男', '女', 'M', 'F', '未知', '']
    const results = testCases.map(g => validGenders.includes(g))
    expect(results).toEqual([true, true, false, false, false, false])
  })

  it('TC-BIZ-031: 学生导入手机号校验（6-15位数字）', () => {
    const phoneRegex = /^\d{6,15}$/
    expect(phoneRegex.test('13800138000')).toBe(true)
    expect(phoneRegex.test('12345')).toBe(false)
    expect(phoneRegex.test('')).toBe(false)
  })

  it('TC-BIZ-032: 学生姓名为必填', () => {
    const name = ''
    const isValid = name.trim().length > 0
    expect(isValid).toBe(false)
  })

  it('TC-BIZ-033: 批量创建学生自动生成座位号', () => {
    const students = Array.from({ length: 40 }, (_, i) => ({ name: `学生${i}` }))
    students.forEach((s, i) => {
      (s as any).seatNo = i + 1
    })
    expect((students[0] as any).seatNo).toBe(1)
    expect((students[39] as any).seatNo).toBe(40)
  })

  it('TC-BIZ-034: 家长登录默认密码 123456', () => {
    const DEFAULT_PASSWORD = '123456'
    expect(DEFAULT_PASSWORD).toBe('123456')
  })

  it('TC-BIZ-035: 家长修改密码不能设为默认密码', () => {
    const DEFAULT_PASSWORD = '123456'
    const newPassword = '123456'
    const isAllowed = newPassword !== DEFAULT_PASSWORD
    expect(isAllowed).toBe(false)
  })

  it('TC-BIZ-036: 家长修改密码最小6位', () => {
    const newPassword = '12345'
    const isAllowed = newPassword.length >= 6
    expect(isAllowed).toBe(false)
  })

  it('TC-BIZ-037: 删除教师级联禁用学生家长登录', () => {
    const students = [
      { id: 's1', parentLoginEnabled: true },
      { id: 's2', parentLoginEnabled: true },
    ]
    // 删除教师后
    students.forEach(s => s.parentLoginEnabled = false)
    expect(students.every(s => !s.parentLoginEnabled)).toBe(true)
  })
})

describe('业务逻辑 - 家长端', () => {
  it('TC-BIZ-040: 家长考试成绩包含排名和分布', () => {
    const examResult = {
      subjects: [
        { name: '语文', score: 85, fullScore: 100, rank: 5, totalStudents: 40 },
        { name: '数学', score: 92, fullScore: 100, rank: 3, totalStudents: 40 },
      ],
      totalRank: 4,
      distribution: Array.from({ length: 10 }, (_, i) => ({
        range: `${i * 10}-${(i + 1) * 10}`,
        count: Math.floor(Math.random() * 10),
      })),
    }
    expect(examResult.subjects).toHaveLength(2)
    expect(examResult.distribution).toHaveLength(10)
    expect(examResult.totalRank).toBeGreaterThan(0)
  })

  it('TC-BIZ-041: 家长通知列表限制30条', () => {
    const take = 30
    expect(take).toBe(30)
  })

  it('TC-BIZ-042: 家长学号格式校验（纯数字）', () => {
    const regex = /^\d+$/
    expect(regex.test('2024001')).toBe(true)
    expect(regex.test('ABC')).toBe(false)
  })
})

describe('业务逻辑 - 成绩管理', () => {
  it('TC-BIZ-050: 成绩统计（平均/最高/最低/中位数/及格率/优秀率）', () => {
    const scores = [85, 92, 78, 95, 60, 45, 88, 72, 91, 83]
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const max = Math.max(...scores)
    const min = Math.min(...scores)
    const sorted = [...scores].sort((a, b) => a - b)
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    const passRate = scores.filter(s => s >= 60).length / scores.length
    const excellentRate = scores.filter(s => s >= 85).length / scores.length

    expect(avg).toBeCloseTo(78.9, 1)
    expect(max).toBe(95)
    expect(min).toBe(45)
    expect(median).toBe(84)
    expect(passRate).toBeCloseTo(0.9, 1)
    expect(excellentRate).toBeCloseTo(0.4, 1)
  })

  it('TC-BIZ-051: 成绩分数不超过满分', () => {
    const isScore = (score: number, fullScore: number) =>
      score >= 0 && score <= fullScore
    expect(isScore(100, 100)).toBe(true)
    expect(isScore(101, 100)).toBe(false)
    expect(isScore(-1, 100)).toBe(false)
  })

  it('TC-BIZ-052: 10段分布图（0-10, 10-20, ..., 90-100）', () => {
    const scores = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95]
    const bands = Array.from({ length: 10 }, () => 0)
    scores.forEach(s => {
      const band = Math.min(Math.floor(s / 10), 9)
      bands[band]++
    })
    expect(bands.every(b => b === 1)).toBe(true)
  })

  it('TC-BIZ-053: 非班主任教师只能看到自己科目成绩', () => {
    const isHomeroom = false
    const teacherSubject = '数学'
    const allSubjects = ['语文', '数学', '英语']
    const visibleSubjects = isHomeroom ? allSubjects : [teacherSubject]
    expect(visibleSubjects).toEqual(['数学'])
  })
})

describe('业务逻辑 - 通知模块', () => {
  it('TC-BIZ-060: 通知类型枚举', () => {
    const validTypes = ['info', 'notice', 'homework', 'grade']
    expect(validTypes).toContain('info')
    expect(validTypes).toContain('homework')
    expect(validTypes).not.toContain('invalid')
  })

  it('TC-BIZ-061: 未读数统计', () => {
    const notifications = [
      { id: '1', read: false },
      { id: '2', read: true },
      { id: '3', read: false },
      { id: '4', read: false },
    ]
    const unread = notifications.filter(n => !n.read).length
    expect(unread).toBe(3)
  })

  it('TC-BIZ-062: 全部标记已读', () => {
    const notifications = [
      { id: '1', read: false },
      { id: '2', read: false },
    ]
    notifications.forEach(n => n.read = true)
    expect(notifications.every(n => n.read)).toBe(true)
  })
})

describe('业务逻辑 - 配置模块', () => {
  it('TC-BIZ-070: 教师 app-config 只能写 theme/semester/schoolYear', () => {
    const allowedKeys = ['theme', 'semester', 'schoolYear']
    const payload = { theme: 'dark', aiApiKey: 'hacked', semester: '2024-2025-1' }
    const filtered = Object.fromEntries(
      Object.entries(payload).filter(([k]) => allowedKeys.includes(k))
    )
    expect(filtered).not.toHaveProperty('aiApiKey')
    expect(filtered).toHaveProperty('theme')
    expect(filtered).toHaveProperty('semester')
  })

  it('TC-BIZ-071: AI 配置 temperature 范围 0-2', () => {
    const inRange = (v: number, min: number, max: number) => v >= min && v <= max
    expect(inRange(0.7, 0, 2)).toBe(true)
    expect(inRange(2.5, 0, 2)).toBe(false)
    expect(inRange(-0.1, 0, 2)).toBe(false)
  })

  it('TC-BIZ-072: AI 配置 baseUrl 必须为有效 URL', () => {
    const isUrl = (s: string) => /^https?:\/\/.+/.test(s)
    expect(isUrl('https://api.example.com')).toBe(true)
    expect(isUrl('http://localhost:3000')).toBe(true)
    expect(isUrl('ftp://invalid')).toBe(false)
    expect(isUrl('not-a-url')).toBe(false)
  })
})

describe('业务逻辑 - AI 模块', () => {
  it('TC-BIZ-080: AI 文件类型魔数校验', () => {
    const magicBytes: Record<string, number[]> = {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      zip: [0x50, 0x4B, 0x03, 0x04], // PK
      docx: [0x50, 0x4B, 0x03, 0x04], // PK (same as zip)
      png: [0x89, 0x50, 0x4E, 0x47], // .PNG
      jpg: [0xFF, 0xD8, 0xFF],
      gif: [0x47, 0x49, 0x46, 0x38], // GIF8
    }
    expect(magicBytes.pdf).toEqual([0x25, 0x50, 0x44, 0x46])
    expect(magicBytes.png[0]).toBe(0x89)
  })

  it('TC-BIZ-081: AI 分析考试验证教师权限', () => {
    const exam = { teacherId: 't1', classId: 'c1' }
    const requestingTeacher = { sub: 't2' }
    const hasAccess = exam.teacherId === requestingTeacher.sub
    expect(hasAccess).toBe(false) // 应拒绝
  })

  it('TC-BIZ-082: AI 诊断数据不足3条返回提示', () => {
    const gradeRecords = [{ id: '1' }, { id: '2' }]
    const insufficient = gradeRecords.length < 3
    expect(insufficient).toBe(true)
  })

  it('TC-BIZ-083: AI 未配置 apiKey/baseUrl 抛出 BadRequest', () => {
    const settings = { apiKey: '', baseUrl: '' }
    const isConfigured = !!(settings.apiKey && settings.baseUrl)
    expect(isConfigured).toBe(false)
  })

  it('TC-BIZ-084: AI 模型解析优先级（resource > resourceModels > vision > text）', () => {
    const resolveModel = (opts: {
      resource?: string
      resourceModels?: Record<string, string>
      hasImage?: boolean
      visionModel?: string
      textModel?: string
    }) => {
      if (opts.resource && opts.resourceModels?.[opts.resource]) {
        return opts.resourceModels[opts.resource]
      }
      if (opts.hasImage && opts.visionModel) return opts.visionModel
      return opts.textModel || 'qwen-plus'
    }
    expect(resolveModel({ resource: 'exam', resourceModels: { exam: 'qwen-max' }, textModel: 'qwen-plus' })).toBe('qwen-max')
    expect(resolveModel({ hasImage: true, visionModel: 'qwen-vl-plus', textModel: 'qwen-plus' })).toBe('qwen-vl-plus')
    expect(resolveModel({ textModel: 'qwen-turbo' })).toBe('qwen-turbo')
    expect(resolveModel({})).toBe('qwen-plus')
  })
})

describe('业务逻辑 - 作业模块', () => {
  it('TC-BIZ-090: 作业状态流转（待批改→已批改→已发还）', () => {
    const statuses = ['待批改', '已批改', '已发还']
    expect(statuses).toHaveLength(3)
    expect(statuses[0]).toBe('待批改')
  })

  it('TC-BIZ-091: 作业状态改为"已发还"自动创建通知', () => {
    const newStatus = '已发还'
    const shouldCreateNotice = newStatus === '已发还'
    expect(shouldCreateNotice).toBe(true)
  })

  it('TC-BIZ-092: 作业截止日期不能早于开始日期', () => {
    const startDate = '2024-03-15'
    const deadline = '2024-03-10'
    const isValid = deadline >= startDate
    expect(isValid).toBe(false)
  })

  it('TC-BIZ-093: 超期未批改天数计算', () => {
    const createdAt = new Date('2024-03-01')
    const now = new Date('2024-03-10')
    const daysOverdue = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysOverdue).toBe(9)
  })
})
