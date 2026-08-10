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
    // 页面通过 @/api/admin 的 getPlatformConfig/updatePlatformConfig 间接调用 /config/app
    expect(content).toMatch(/@\/api\/admin/)
    expect(content).toMatch(/getPlatformConfig|updatePlatformConfig/)
  })
})

describe('家长端页面完整性', () => {
  it('Dashboard.vue 显示欢迎与孩子信息', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/welcome-banner|welcome/)
    expect(content).toMatch(/studentName|孩子/)
  })

  it('Dashboard.vue 包含统计卡片', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/stat-card|孩子动态|学习成长|家校沟通/)
  })

  it('Dashboard.vue 欢迎家长', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/家长中心|welcome/)
  })

  it('Dashboard.vue 今日需关注提醒置顶', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/今日需关注/)
    expect(content).toMatch(/reminders/)
  })

  it('Dashboard.vue 健康度总览为可点击彩色卡片', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/孩子在校健康度总览/)
    expect(content).toMatch(/HEALTH_TONE_CLS/)
    expect(content).toMatch(/scrollToSection/)
  })

  it('Dashboard.vue 作业含截止倒计时与逾期高亮', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/deadlineChip/)
    expect(content).toMatch(/已逾期|今天截止/)
  })

  it('Dashboard.vue 每周小结卡片', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/每周小结/)
    expect(content).toMatch(/weekSummary/)
  })

  it('Dashboard.vue 联系老师展示电话可拨号', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/联系老师/)
    expect(content).toMatch(/tel:/)
  })

  it('Dashboard.vue 课表含明日预览与值日倒计时', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/明日课程预览/)
    expect(content).toMatch(/dutyDaysLeft/)
  })

  it('GradeOverview.vue 展示较上次变化与得分率进度条', () => {
    const content = readFile('parent/components/GradeOverview.vue')
    expect(content).toMatch(/deltaInfo/)
    expect(content).toMatch(/较上次/)
    expect(content).toMatch(/subjectPct/)
  })
})

describe('作业管理（schema 驱动 CRUD）', () => {
  // 架构重构后，作业管理由通用 SchemaCrudPage 渲染（router entity: homework），
  // 字段与状态定义集中在 shared/schemas/crud-schema.ts。
  const routerContent = fs.readFileSync(path.resolve(__dirname, '../src/router/index.ts'), 'utf-8')
  const schemaContent = fs.readFileSync(path.resolve(__dirname, '../../shared/schemas/crud-schema.ts'), 'utf-8')

  it('作业路由接入 SchemaCrudPage 通用 CRUD', () => {
    expect(routerContent).toMatch(/entity: 'homework'/)
    expect(routerContent).toMatch(/SchemaCrudPage\.vue/)
  })

  it('作业 schema 定义了核心字段（标题/学科/日期/状态）', () => {
    expect(schemaContent).toMatch(/'homework'/)
    expect(schemaContent).toMatch(/deadline/)
    expect(schemaContent).toMatch(/startDate/)
  })

  it('作业状态支持逾期与已批改', () => {
    expect(schemaContent).toMatch(/逾期/)
    expect(schemaContent).toMatch(/已批改/)
  })

  it('家长看板作业列表区分逾期/完成/进行中', () => {
    const content = readFile('parent/Dashboard.vue')
    expect(content).toMatch(/isHwOverdue/)
    expect(content).toMatch(/DONE_HW_STATUSES/)
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
