export type ToolCategory =
  | 'dialogue'
  | 'text'
  | 'chinese'
  | 'math'
  | 'english'
  | 'game'
  | 'other'

export interface ToolItem {
  name: string
  desc: string
  icon: string
  bg: string
  text: string
  route: string
  tag?: string
  category: ToolCategory
}
