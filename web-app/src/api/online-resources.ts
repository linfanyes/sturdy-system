/**
 * 智慧中小学（国家中小学智慧教育平台）在线资源 API
 * - GET /online-resources/zhzx/courses  课程目录（按学科/年级/关键词过滤）
 * - GET /online-resources/zhzx/courses/:id  课程详情（尝试实时解析课时，失败降级）
 */
import request from './request'

export type ZhzxSubject = '语文' | '数学' | '英语' | '综合'

export interface ZhzxCourse {
  id: string
  title: string
  subject: ZhzxSubject
  grade?: string
  cover?: string
  /** 官方平台可打开的播放/浏览地址 */
  playUrl: string
  description: string
  activityId?: string
}

export interface ZhzxLesson {
  title: string
  playUrl?: string
  videoUrl?: string
}

export interface ZhzxCourseDetail extends ZhzxCourse {
  lessons: ZhzxLesson[]
  /** 是否为实时解析得到 */
  parsed: boolean
}

export const listZhzxCourses = (params?: { subject?: string; grade?: string; keyword?: string }) =>
  request.get<any, ZhzxCourse[]>('/online-resources/zhzx/courses', { params })

export const getZhzxCourse = (id: string) =>
  request.get<any, ZhzxCourseDetail>(`/online-resources/zhzx/courses/${id}`)
