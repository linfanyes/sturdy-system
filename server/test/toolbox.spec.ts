import 'reflect-metadata'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * 工具箱分类逻辑测试。
 *
 * toolbox.vue 是 Vue 单文件组件，无法直接 import，故通过 fs 读取其源码，
 * 用正则提取 sections 与 secItemsFeatureMap 真实数据后求值，再做断言。
 * 这样测试针对源文件本身，构成有效的回归测试。
 */

const VUE_PATH = path.resolve(
  __dirname,
  '../../mini-program/src/pages/toolbox/toolbox.vue',
)
const src = fs.readFileSync(VUE_PATH, 'utf8')

type Tool = {
  label: string
  icon?: string
  path?: string
  subject?: string
  quicktool?: string
  crud?: string
}
type Section = { title: string; items: Tool[] }

/** 从 toolbox.vue 提取 sections 数组（ref([...])）并求值 */
function extractSections(): Section[] {
  const m = src.match(/const sections = ref\(\[([\s\S]*?)\r?\n\]\)/)
  if (!m) throw new Error('未能从 toolbox.vue 提取 sections')
  // sections 内部为纯数据字面量（无函数引用），可安全求值
  // eslint-disable-next-line no-new-func
  return new Function('return [' + m[1] + ']')() as Section[]
}

/** 从 toolbox.vue 提取 secItemsFeatureMap 对象（含 new Set(...) 调用）并求值 */
function extractSecItemsFeatureMap(): Record<string, Set<string>> {
  const m = src.match(/const secItemsFeatureMap = (\{[\s\S]*?\r?\n\})/)
  if (!m) throw new Error('未能从 toolbox.vue 提取 secItemsFeatureMap')
  // Set 为全局对象，可在求值中直接构造
  // eslint-disable-next-line no-new-func
  return new Function('return ' + m[1])() as Record<string, Set<string>>
}

describe('toolbox 工具箱分类逻辑', () => {
  const sections = extractSections()
  const secItemsFeatureMap = extractSecItemsFeatureMap()

  it('1. 分区数量为 11', () => {
    expect(sections.length).toBe(11)
  })

  it('2. 工具总数为 86（统计所有分区的 items）', () => {
    const total = sections.reduce((s, sec) => s + sec.items.length, 0)
    expect(total).toBe(86)
  })

  it('2b. 班级成员工具在"班级管理"分区（班主任特权入口）', () => {
    const sec = sections.find(s => s.items.some(i => i.label === '班级成员'))
    expect(sec).toBeDefined()
    expect(sec!.title).toBe('班级管理')
    const item = sec!.items.find(i => i.label === '班级成员') as any
    expect(item.tab).toBe('/pages/classes/classes')
  })

  it('3. 每个分区至少有 2 个工具', () => {
    for (const sec of sections) {
      expect(sec.items.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('4. 笔顺演示使用 subject:"stroke"（不再用 path）', () => {
    const stroke = sections
      .flatMap((s) => s.items)
      .find((it) => it.label === '笔顺演示')
    expect(stroke).toBeTruthy()
    expect(stroke!.subject).toBe('stroke')
    expect(stroke!.path).toBeUndefined()
  })

  it('5. "我的工作台"和"教师办公"始终可见（feature 过滤后仍存在）', () => {
    // viewSections 中对这两个分区显式 return true
    expect(src).toMatch(
      /if \(sec\.title === '我的工作台' \|\| sec\.title === '教师办公'\) return true/,
    )
    // 二者确实存在于分区数据中
    const titles = sections.map((s) => s.title)
    expect(titles).toContain('我的工作台')
    expect(titles).toContain('教师办公')
  })

  it('6. itemFeatureMap 兜底逻辑：未分类工具默认显示（return true 而非 return false）', () => {
    // viewSections 过滤器末尾对未命中 feature 的工具应 return true
    const fallback = src.match(
      /未分类的新工具默认显示[\s\S]*?return (true|false)/,
    )
    expect(fallback).not.toBeNull()
    expect(fallback![1]).toBe('true')
  })

  it('7. secItemsFeatureMap 中 schedule 不再映射"课堂互动"', () => {
    expect(secItemsFeatureMap.schedule).toBeInstanceOf(Set)
    expect(secItemsFeatureMap.schedule.has('课堂互动')).toBe(false)
    expect(secItemsFeatureMap.schedule.has('我的工作台')).toBe(true)
  })

  it('8. secItemsFeatureMap 中 parents 映射"家校沟通"', () => {
    expect(secItemsFeatureMap.parents).toBeInstanceOf(Set)
    expect(secItemsFeatureMap.parents.has('家校沟通')).toBe(true)
  })

  it('9. 评语生成在"学生评价与积分"分区（不再在 AI 备课）', () => {
    const inSection = sections.find((s) =>
      s.items.some((it) => it.label === '评语生成'),
    )
    expect(inSection).toBeTruthy()
    expect(inSection!.title).toBe('学生评价与积分')
    const ai = sections.find((s) => s.title === 'AI 备课')
    expect(ai!.items.some((it) => it.label === '评语生成')).toBe(false)
  })

  it('10. 抽签历史在"课堂互动"分区（不再在班级管理）', () => {
    const inSection = sections.find((s) =>
      s.items.some((it) => it.label === '抽签历史'),
    )
    expect(inSection).toBeTruthy()
    expect(inSection!.title).toBe('课堂互动')
    const cls = sections.find((s) => s.title === '班级管理')
    expect(cls!.items.some((it) => it.label === '抽签历史')).toBe(false)
  })

  it('11. 无重复工具标签（所有 label 唯一）', () => {
    const labels = sections.flatMap((s) => s.items.map((it) => it.label))
    const dup = labels.filter((l, i) => labels.indexOf(l) !== i)
    expect(dup).toEqual([])
  })

  it('12. 演讲稿在"教师办公"分区', () => {
    const inSection = sections.find((s) =>
      s.items.some((it) => it.label === '演讲稿'),
    )
    expect(inSection).toBeTruthy()
    expect(inSection!.title).toBe('教师办公')
  })
})
