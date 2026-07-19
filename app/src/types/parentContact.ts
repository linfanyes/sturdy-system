/** 家长联系记录 */
export interface ParentContact {
  id: string
  studentId: string
  studentName: string
  classId: string // 班级隔离键：写入时绑定学生所在班级，支持按班级过滤
  parentName: string
  relation: string // 如：母亲、父亲
  phone: string
  wechat: string
  method: '电话' | '面谈' | '微信' | '家访' | '其他'
  content: string
  date: string
  followUp?: string // 跟进事项
  createdAt: number
}

/** 通知模板 */
export interface NoticeTemplate {
  id: string
  title: string
  content: string
  category: '考试通知' | '家长会' | '活动通知' | '放假通知' | '作业提醒' | '安全提醒' | '其他'
  createdAt: number
}
