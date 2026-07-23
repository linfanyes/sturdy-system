/** 获奖记录 */
export interface AwardRecord {
  id: string
  /** 奖项名称 */
  name: string
  /** 颁发机构 */
  issuer: string
  /** 获奖日期 YYYY-MM-DD */
  date: string
  /** 奖项等级（如：一等奖、二等奖、优秀奖等） */
  level: string
  /** 奖状图片 base64 dataURL (可选) */
  image?: string
  /** 自定义分类标签 */
  tags: string[]
  /** 备注 */
  note: string
  /** 评级分（0-3，可自定义，默认 0） */
  ratingScore?: number
  createdAt: number
}

/** 获奖分类（自定义） */
export interface AwardCategory {
  id: string
  name: string
  color: string
}
