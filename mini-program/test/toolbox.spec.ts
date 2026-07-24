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
  it('分区数量为 11', () => {
    expect(sections.length).toBe(11)
  })

  it('工具总数为 85', () => {
    const total = sections.reduce((n: number, s: any) => n + s.items.length, 0)
    expect(total).toBe(85)
  })

  it('每个分区至少有 2 个工具', () => {
    sections.forEach((s: any) => {
      expect(s.items.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('笔顺演示使用 subject:"stroke"（不再用 path）', () => {
    const stroke = allItems().find((i: any) => i.label === '笔顺演示')
    expect(stroke).toBeDefined()
    expect(stroke.subject).toBe('stroke')
    expect(stroke.path).toBeUndefined()
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
    // 过滤逻辑中“未分类的新工具默认显示”后兜底返回 true
    expect(src).toMatch(/未分类的新工具默认显示\s+return true/)
    expect(src).not.toMatch(/未分类的新工具默认显示\s+return false/)
  })

  it('secItemsFeatureMap 中 schedule 不映射"课堂互动"', () => {
    expect(secItemsFeatureMap.schedule).toBeDefined()
    expect(secItemsFeatureMap.schedule.has('课堂互动')).toBe(false)
    // schedule 实际映射到“我的工作台”
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
