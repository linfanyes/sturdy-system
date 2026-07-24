import fs from 'fs'
import path from 'path'

const viewsDir = path.resolve(__dirname, '../src/views')

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(viewsDir, relPath), 'utf-8')
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.resolve(viewsDir, relPath))
}

describe('超管端页面完整性', () => {
  const superFiles = [
    'Dashboard.vue',
    'Schools.vue',
    'Admins.vue',
    'AuditLogs.vue',
    'PlatformConfig.vue',
  ]

  superFiles.forEach((f) => {
    it(`super/${f} 存在`, () => {
      expect(fileExists(`super/${f}`)).toBe(true)
    })
  })

  it('Dashboard 不再是纯占位页', () => {
    const content = readFile('super/Dashboard.vue')
    expect(content).not.toMatch(/功能待扩展/)
    expect(content).not.toMatch(/后续功能模块将逐步扩展/)
  })

  it('Schools.vue 实现了 CRUD', () => {
    const content = readFile('super/Schools.vue')
    expect(content).toMatch(/listSchools|listSchool/)
    expect(content).toMatch(/createSchool/)
    expect(content).toMatch(/updateSchool/)
    expect(content).toMatch(/deleteSchool/)
  })

  it('Admins.vue 实现了管理员管理', () => {
    const content = readFile('super/Admins.vue')
    expect(content).toMatch(/listSchoolAdmin/)
    expect(content).toMatch(/resetSchoolAdminPassword|resetPassword/)
    expect(content).toMatch(/toggleSchoolAdminEnabled|toggleEnabled/)
  })

  it('PlatformConfig.vue 调用配置接口', () => {
    const content = readFile('super/PlatformConfig.vue')
    expect(content).toMatch(/\/config\/app/)
  })
})

describe('家长端页面完整性', () => {
  it('Dashboard.vue 实现了 Tab 切换', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/tab|Tab/)
    expect(content).toMatch(/pending|scores|待办|成绩/)
  })

  it('Dashboard.vue 包含成绩分布图', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/distribution|barChart|svg|SVG/)
  })

  it('Dashboard.vue 包含优势/薄弱学科分析', () => {
    const content = readFile('parent/Dashboard.vue')
    const hasAdvantage = content.match(/优势|薄弱|advantage|weak/) !== null
    expect(hasAdvantage).toBe(true)
  })
})

describe('作业管理教学化', () => {
  it('Homework.vue 实现了双视图切换', () => {
    const content = readFile('exams/Homework.vue')
    expect(content).toMatch(/teaching|list|view/)
    expect(content).toMatch(/教学视图|列表管理/)
  })

  it('Homework.vue 实现了班级分组', () => {
    const content = readFile('exams/Homework.vue')
    expect(content).toMatch(/groupedByClass|groupBy|classId/)
  })

  it('Homework.vue 实现了逾期列表', () => {
    const content = readFile('exams/Homework.vue')
    expect(content).toMatch(/overdue|逾期/)
  })

  it('Homework.vue 实现了标记已批改', () => {
    const content = readFile('exams/Homework.vue')
    expect(content).toMatch(/markGraded|标记已批改|已批改/)
  })
})

describe('班级公告增强', () => {
  it('Notices.vue 实现了 AI 润色', () => {
    const content = readFile('workspace/Notices.vue')
    expect(content).toMatch(/ai\/chat-sync|润色|polish/i)
  })

  it('Notices.vue 实现了推送家长', () => {
    const content = readFile('workspace/Notices.vue')
    expect(content).toMatch(/push-notice|推送|push/i)
  })

  it('Notices.vue 实现了模板套用', () => {
    const content = readFile('workspace/Notices.vue')
    expect(content).toMatch(/notice-templates|模板|template/i)
  })

  it('Notices.vue 实现了范围选择', () => {
    const content = readFile('workspace/Notices.vue')
    expect(content).toMatch(/scope|范围/)
  })
})

describe('消息与通知中心', () => {
  it('Notifications.vue 存在且调用通知接口', () => {
    expect(fileExists('workspace/Notifications.vue')).toBe(true)
    const content = readFile('workspace/Notifications.vue')
    // 页面通过 @/api/notification 封装间接调用 /notifications 接口
    expect(content).toMatch(/@\/api\/notification/)
    expect(content).toMatch(/listNotifications|markAllRead|markRead/)
  })

  it('Messages.vue 存在且调用消息接口', () => {
    expect(fileExists('workspace/Messages.vue')).toBe(true)
    const content = readFile('workspace/Messages.vue')
    // 页面通过 @/api/notification 封装间接调用 /messages 接口
    expect(content).toMatch(/@\/api\/notification/)
    expect(content).toMatch(/listMessages|markMessageRead/)
  })

  it('notification.ts API 封装存在', () => {
    const apiPath = path.resolve(__dirname, '../src/api/notification.ts')
    expect(fs.existsSync(apiPath)).toBe(true)
    const content = fs.readFileSync(apiPath, 'utf-8')
    expect(content).toMatch(/listNotifications/)
    expect(content).toMatch(/getUnreadCount/)
    expect(content).toMatch(/markAllRead/)
    expect(content).toMatch(/listMessages/)
  })
})

describe('教师工作台增强', () => {
  it('Dashboard.vue 包含通知铃铛', () => {
    const content = readFile('teacher/Dashboard.vue')
    expect(content).toMatch(/Bell|铃|通知/)
    expect(content).toMatch(/getUnreadCount|unread/i)
  })

  it('Dashboard.vue 包含快捷操作', () => {
    const content = readFile('teacher/Dashboard.vue')
    expect(content).toMatch(/attendance|考勤|作业|homework|通知|notice|待办|todo/)
  })
})

describe('数据统计页对齐', () => {
  it('DataDashboard.vue 包含 8 项指标', () => {
    const content = readFile('exams/DataDashboard.vue')
    expect(content).toMatch(/班级数|classes/)
    expect(content).toMatch(/学生数|students/)
    expect(content).toMatch(/出勤|attendance/)
    expect(content).toMatch(/作业|homework/)
    expect(content).toMatch(/考试|exam/)
    expect(content).toMatch(/待办|todo/)
    expect(content).toMatch(/笔记|note/)
    expect(content).toMatch(/公告|notice/)
  })

  it('DataDashboard.vue 包含学期筛选', () => {
    const content = readFile('exams/DataDashboard.vue')
    expect(content).toMatch(/semester|学期/)
  })

  it('DataDashboard.vue 包含导出功能', () => {
    const content = readFile('exams/DataDashboard.vue')
    expect(content).toMatch(/export|导出|csv|CSV|Blob/)
  })

  it('DataDashboard.vue 包含图表', () => {
    const content = readFile('exams/DataDashboard.vue')
    expect(content).toMatch(/svg|SVG|chart|图/)
  })
})

describe('工具箱统一入口', () => {
  it('Toolbox.vue 存在', () => {
    expect(fileExists('tools/Toolbox.vue')).toBe(true)
  })

  it('Toolbox.vue 包含 9 分区', () => {
    const content = readFile('tools/Toolbox.vue')
    expect(content).toMatch(/课堂互动|互动/)
    expect(content).toMatch(/语文/)
    expect(content).toMatch(/数学/)
    expect(content).toMatch(/英语/)
    expect(content).toMatch(/文字/)
    expect(content).toMatch(/班级管理|管理/)
    expect(content).toMatch(/AI|备课/)
    expect(content).toMatch(/教师办公|办公/)
    expect(content).toMatch(/游戏|小游戏/)
  })

  it('Toolbox.vue 按 features 过滤', () => {
    const content = readFile('tools/Toolbox.vue')
    expect(content).toMatch(/features|auth\.features/)
  })
})
