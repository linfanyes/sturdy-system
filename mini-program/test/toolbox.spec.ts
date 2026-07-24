import fs from 'fs'
import path from 'path'

const vuePath = path.resolve(__dirname, '../src/pages/toolbox/toolbox.vue')
const src = fs.readFileSync(vuePath, 'utf-8')

// .vue 文件无法在 jest 中直接 import（需要 vue-jest 转换器），
// 这里采用读取源文件 + 正则提取 + new Function 求值的方式测试。

// 提取 sections 数组（ref([...]) 中的数组字面量）
const sectionsMatch = src.match(/const sections = ref\((\[[\s\S]*?\])\)/)
if (!sectionsMatch) throw new Error('未能从 toolbox.vue 提取 sections 数组')
// eslint-disable-next-line no-new-func
const sections: any[] = new Function('return ' + sectionsMatch[1])()

// 提取 secItemsFeatureMap（含 new Set(...)）
const secMapMatch = src.match(/const secItemsFeatureMap = (\{[\s\S]*?\n\})/)
if (!secMapMatch) throw new Error('未能从 toolbox.vue 提取 secItemsFeatureMap')
// eslint-disable-next-line no-new-func
const secItemsFeatureMap: Record<string, Set<string>> = new Function('return ' + secMapMatch[1])()

// 提取 itemFeatureMap
const itemMapMatch = src.match(/const itemFeatureMap = (\{[\s\S]*?\n\})/)
if (!itemMapMatch) throw new Error('未能从 toolbox.vue 提取 itemFeatureMap')
// eslint-disable-next-line no-new-func
const itemFeatureMap: Record<string, Set<string>> = new Function('return ' + itemMapMatch[1])()

function findSectionByItemLabel(label: string) {
  return sections.find((s: any) => s.items.some((i: any) => i.label === label))
}
function allItems() {
  return sections.flatMap((s: any) => s.items)
}

describe('工具箱分类逻辑', () => {
  it('分区数量为 9（3个学科专项合并为"学科工具"上层菜单）', () => {
    expect(sections.length).toBe(9)
  })

  it('主页面工具总数为 69（学科工具入口5个，原22个学科工具移至子页面）', () => {
    const total = sections.reduce((n: number, s: any) => n + s.items.length, 0)
    expect(total).toBe(69)
  })

  it('班级成员工具在"班级管理"分区（班主任特权入口）', () => {
    const sec = findSectionByItemLabel('班级成员')
    expect(sec).toBeDefined()
    expect(sec.title).toBe('班级管理')
    const item = allItems().find((i: any) => i.label === '班级成员')
    expect(item.tab).toBe('/pages/classes/classes')
  })

  it('每个分区至少有 2 个工具', () => {
    sections.forEach((s: any) => {
      expect(s.items.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('"我的工作台"和"教师办公"始终可见', () => {
    // 源码中存在对这两个分区始终 return true 的过滤逻辑
    expect(src).toMatch(
      /sec\.title\s*===\s*['"]我的工作台['"]\s*\|\|\s*sec\.title\s*===\s*['"]教师办公['"]/
    )
    const titles = sections.map((s: any) => s.title)
    expect(titles).toContain('我的工作台')
    expect(titles).toContain('教师办公')
  })

  it('itemFeatureMap 兜底逻辑：return true（而非 return false）', () => {
    // itemFeatureMap 可正确求值，且值为 Set
    expect(itemFeatureMap).toBeDefined()
    expect(itemFeatureMap.ai).toBeInstanceOf(Set)
    // 过滤逻辑中"未分类的新工具默认显示"后兜底返回 true
    expect(src).toMatch(/未分类的新工具默认显示\s+return true/)
    expect(src).not.toMatch(/未分类的新工具默认显示\s+return false/)
  })

  it('secItemsFeatureMap 中 schedule 不映射"课堂互动"', () => {
    expect(secItemsFeatureMap.schedule).toBeDefined()
    expect(secItemsFeatureMap.schedule.has('课堂互动')).toBe(false)
    // schedule 实际映射到"我的工作台"
    expect(secItemsFeatureMap.schedule.has('我的工作台')).toBe(true)
  })

  it('secItemsFeatureMap 中 parents 映射"家校沟通"', () => {
    expect(secItemsFeatureMap.parents).toBeDefined()
    expect(secItemsFeatureMap.parents.has('家校沟通')).toBe(true)
  })

  it('评语生成在"学生评价与积分"分区', () => {
    const sec = findSectionByItemLabel('评语生成')
    expect(sec).toBeDefined()
    expect(sec!.title).toBe('学生评价与积分')
  })

  it('抽签历史在"课堂互动"分区', () => {
    const sec = findSectionByItemLabel('抽签历史')
    expect(sec).toBeDefined()
    expect(sec!.title).toBe('课堂互动')
  })

  it('无重复工具标签', () => {
    const labels = allItems().map((i: any) => i.label)
    const unique = new Set(labels)
    expect(unique.size).toBe(labels.length)
  })

  it('演讲稿在"教师办公"分区', () => {
    const sec = findSectionByItemLabel('演讲稿')
    expect(sec).toBeDefined()
    expect(sec!.title).toBe('教师办公')
  })
})

describe('学科工具上层菜单重构', () => {
  it('"学科工具"分区存在且包含5个学科入口', () => {
    const sec = sections.find((s: any) => s.title === '学科工具')
    expect(sec).toBeDefined()
    expect(sec!.items.length).toBe(5)
    const subjects = sec!.items.map((i: any) => i.label)
    expect(subjects).toEqual(['语文', '数学', '英语', '科学', '道德与法治'])
  })

  it('每个学科入口使用 subjectEntry 属性标识', () => {
    const sec = sections.find((s: any) => s.title === '学科工具')
    sec!.items.forEach((item: any) => {
      expect(item.subjectEntry).toBeDefined()
      expect(item.subjectEntry).toBe(item.label)
    })
  })

  it('原"学科专项 - 语文/数学/英语"3个分区已移除', () => {
    const titles = sections.map((s: any) => s.title)
    expect(titles).not.toContain('学科专项 - 语文')
    expect(titles).not.toContain('学科专项 - 数学')
    expect(titles).not.toContain('学科专项 - 英语')
  })

  it('go 函数处理 subjectEntry 跳转到 subject-list 子页面', () => {
    expect(src).toMatch(/t\.subjectEntry\) uni\.navigateTo\(\{ url: '\/pages\/subject-list\/subject-list\?subject='/)
  })

  it('itemFeatureMap 中 ai 包含语文/英语/科学/道德与法治学科入口', () => {
    expect(itemFeatureMap.ai.has('语文')).toBe(true)
    expect(itemFeatureMap.ai.has('英语')).toBe(true)
    expect(itemFeatureMap.ai.has('科学')).toBe(true)
    expect(itemFeatureMap.ai.has('道德与法治')).toBe(true)
  })

  it('itemFeatureMap 中 tools 包含数学学科入口', () => {
    expect(itemFeatureMap.tools.has('数学')).toBe(true)
  })

  it('secItemsFeatureMap 中 ai 和 tools 都映射"学科工具"分区', () => {
    expect(secItemsFeatureMap.ai.has('学科工具')).toBe(true)
    expect(secItemsFeatureMap.tools.has('学科工具')).toBe(true)
  })

  it('subjectEntry 工具走 feature 过滤（不直接 return true）', () => {
    // 源码中 subjectEntry 不在"直接保留"分支，需走 itemFeatureMap 过滤
    // 直接保留分支只含 subject/quicktool
    expect(src).toMatch(/if \(it\.subject \|\| it\.quicktool\) return true/)
    expect(src).not.toMatch(/if \(it\.subject \|\| it\.quicktool \|\| it\.subjectEntry\) return true/)
  })
})
