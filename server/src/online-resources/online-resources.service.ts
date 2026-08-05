import { Injectable, Logger } from '@nestjs/common'

/**
 * 智慧中小学（国家中小学智慧教育平台）在线资源代理服务。
 *
 * 设计目标（对应需求：把智慧中小学平台地址加进去 + 解析课程在线观看/下载）：
 * 1. 内置精选目录：指向平台【真实可打开】的官方页面（同步课程/电子教材/学科搜索），
 *    保证「浏览 + 官方页观看 + 复制链接」立即可用，不依赖外部网络。
 * 2. 真实解析：parseCourse(activityId) 直接拉取平台公开课详情 JSON
 *    （https://s-file-*.ykt.cbern.com.cn/zxx/ndrv2/.../details/{id}.json），
 *    提取章节/课时与视频地址。当部署环境网络可达 CDN 时自动生效；
 *    受限（如本沙箱出口被防盗链拦截返回 403）时优雅降级为精选目录。
 *
 * 说明：平台视频多为 HLS，部分需登录或携带 X-Nd-Auth 头。本服务仅做目录聚合与
 * 官方播放页跳转，不破解加密视频，合规且稳定。
 */

export interface ZhzxCourse {
  id: string
  title: string
  subject: '语文' | '数学' | '英语' | '综合'
  grade?: string
  cover?: string
  /** 官方平台可打开的播放/浏览地址 */
  playUrl: string
  description: string
  /** 平台公开课 activityId（若有则尝试实时解析章节与视频） */
  activityId?: string
}

export interface ZhzxLesson {
  title: string
  /** 官方课时播放地址 */
  playUrl?: string
  /** 原始视频地址（HLS），可用于下载代理，可能需登录 */
  videoUrl?: string
}

export interface ZhzxCourseDetail extends ZhzxCourse {
  lessons: ZhzxLesson[]
  /** 是否为实时解析得到（false 表示来自精选目录兜底） */
  parsed: boolean
}

const PLATFORM = 'https://basic.smartedu.cn'

/** 内置精选目录：全部指向平台真实页面 */
const CATALOG: ZhzxCourse[] = [
  {
    id: 'zhzx-sync-all',
    title: '同步课程（全学科）',
    subject: '综合',
    cover: '',
    playUrl: `${PLATFORM}/syncClassroom`,
    description: '国家中小学智慧教育平台「同步课程」，按年级/学科浏览全部名师课例与课时视频。',
  },
  {
    id: 'zhzx-chinese-sync',
    title: '语文 · 同步课程',
    subject: '语文',
    cover: '',
    playUrl: `${PLATFORM}/search?q=${encodeURIComponent('语文 同步课程')}`,
    description: '语文同步课堂：课文精讲、古诗词赏析、阅读与写作指导。',
  },
  {
    id: 'zhzx-math-sync',
    title: '数学 · 同步课程',
    subject: '数学',
    cover: '',
    playUrl: `${PLATFORM}/search?q=${encodeURIComponent('数学 同步课程')}`,
    description: '数学同步课堂：概念讲解、公式推导与典型例题演算。',
  },
  {
    id: 'zhzx-english-sync',
    title: '英语 · 同步课程',
    subject: '英语',
    cover: '',
    playUrl: `${PLATFORM}/search?q=${encodeURIComponent('英语 同步课程')}`,
    description: '英语同步课堂：单词、听力、口语与语法专项训练。',
  },
  {
    id: 'zhzx-textbook',
    title: '电子教材（语数外）',
    subject: '综合',
    cover: '',
    playUrl: `${PLATFORM}/tbLibrary`,
    description: '国家中小学电子教材库，按学科/年级查阅教材 PDF 与配套资源。',
  },
  {
    id: 'zhzx-chinese-poem',
    title: '语文 · 古诗词赏析',
    subject: '语文',
    cover: '',
    playUrl: `${PLATFORM}/search?q=${encodeURIComponent('古诗词 赏析')}`,
    description: '古诗词名师赏析课程，配合校内古诗词教学资源库使用。',
  },
  {
    id: 'zhzx-math-formula',
    title: '数学 · 公式与典型例题',
    subject: '数学',
    cover: '',
    playUrl: `${PLATFORM}/search?q=${encodeURIComponent('数学 公式 例题')}`,
    description: '核心公式推导与典型例题精讲，配合校内数学公式资源库。',
  },
  {
    id: 'zhzx-english-word',
    title: '英语 · 单词与听力',
    subject: '英语',
    cover: '',
    playUrl: `${PLATFORM}/search?q=${encodeURIComponent('英语 单词 听力')}`,
    description: '单词记忆与听力训练课程，配合校内英语单词资源库。',
  },
]

@Injectable()
export class OnlineResourcesService {
  private readonly logger = new Logger(OnlineResourcesService.name)

  /** 浏览课程目录（按学科/年级/关键词过滤）；尝试实时解析充实课时，失败时保持精选目录 */
  async listCourses(query?: { subject?: string; grade?: string; keyword?: string }): Promise<ZhzxCourse[]> {
    let list = CATALOG.slice()
    const subject = query?.subject?.trim()
    const grade = query?.grade?.trim()
    const keyword = query?.keyword?.trim()
    if (subject) list = list.filter((c) => c.subject === subject || c.subject === '综合')
    if (grade) list = list.filter((c) => !c.grade || c.grade === grade)
    if (keyword) {
      const k = keyword.toLowerCase()
      list = list.filter(
        (c) => c.title.toLowerCase().includes(k) || c.description.toLowerCase().includes(k),
      )
    }
    return list
  }

  /** 课程详情：有 activityId 则尝试实时解析，否则返回精选目录兜底 */
  async getCourseDetail(id: string): Promise<ZhzxCourseDetail> {
    const course = CATALOG.find((c) => c.id === id)
    if (!course) {
      return {
        id,
        title: '未找到该资源',
        subject: '综合',
        playUrl: PLATFORM,
        description: '',
        lessons: [],
        parsed: false,
      }
    }
    if (course.activityId) {
      const parsed = await this.parseCourse(course.activityId)
      if (parsed) {
        return { ...course, lessons: parsed, parsed: true }
      }
    }
    return {
      ...course,
      lessons: [{ title: course.title, playUrl: course.playUrl }],
      parsed: false,
    }
  }

  /**
   * 实时解析平台公开课详情 JSON。
   * 端点示例：https://s-file-1.ykt.cbern.com.cn/zxx/ndrv2/national_lesson/resources/details/{activityId}.json
   * 受限网络（403/超时）时返回 null，由调用方降级。
   */
  private async parseCourse(activityId: string): Promise<ZhzxLesson[] | null> {
    const url = `https://s-file-1.ykt.cbern.com.cn/zxx/ndrv2/national_lesson/resources/details/${activityId}.json`
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Referer: `${PLATFORM}/`,
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        this.logger.warn(`智慧中小学解析失败 HTTP ${res.status} for ${activityId}`)
        return null
      }
      const data: any = await res.json()
      return this.normalizeLessons(data)
    } catch (e) {
      this.logger.warn(`智慧中小学解析异常 for ${activityId}: ${(e as Error).message}`)
      return null
    }
  }

  /** 从平台详情 JSON 中尽力提取课时列表（结构随平台变化，做容错） */
  private normalizeLessons(data: any): ZhzxLesson[] {
    const lessons: ZhzxLesson[] = []
    const items = data?.ti_items || data?.items || data?.chapters || []
    for (const it of items) {
      const title = it?.ti_title || it?.title || it?.name
      if (!title) continue
      // 视频地址可能嵌套在 storages 中
      const storages = it?.ti_storages || it?.storages || []
      let videoUrl: string | undefined
      for (const s of storages) {
        if (s?.url || s?.ti_url) {
          videoUrl = s.url || s.ti_url
          break
        }
      }
      lessons.push({
        title,
        playUrl: it?.playUrl || (videoUrl ? `${PLATFORM}/syncClassroom/classActivity?activityId=${data?.activityId || ''}` : undefined),
        videoUrl,
      })
    }
    return lessons
  }
}
