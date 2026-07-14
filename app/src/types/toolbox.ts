export type ToolCategory = 'dialogue' | 'text' | 'game' | 'other'

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
