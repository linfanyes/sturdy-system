export interface ScheduleItem {
  id: string
  classId: string
  dayOfWeek: number // 1~7
  period: number // 1~8 (1-4 上午正课, 5 午自习, 6-7 下午正课, 8 课后服务)
  subject: string
  teacher: string // 默认「未知」
  note: string
}

export type AttendanceStatus = '出勤' | '迟到' | '请假' | '旷课'

export interface AttendanceRecord {
  studentId: string
  status: AttendanceStatus
}

export interface Attendance {
  id: string
  classId: string
  date: string
  records: AttendanceRecord[]
}

export type HomeworkStatus = '待批改' | '已批改' | '已发还'

export interface Homework {
  id: string
  classId: string
  subject: string
  title: string
  content: string
  startDate: string // 开始日期 YYYY-MM-DD
  deadline: string // 截止日期 YYYY-MM-DD
  status: HomeworkStatus
  createdAt: number
}

export interface Notice {
  id: string
  classId: string | '全校'
  title: string
  content: string
  pinned: boolean
  /** 是否已结束（结束后自动取消置顶） */
  ended?: boolean
  /** 结束时间 */
  endedAt?: number
  createdAt: number
}

export interface Resource {
  id: string
  title: string
  url: string
  category: string
  tags: string[]
  description: string
  createdAt: number
}
