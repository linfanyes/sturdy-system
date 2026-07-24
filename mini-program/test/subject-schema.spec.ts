import fs from 'fs'
import path from 'path'

const schemaPath = path.resolve(__dirname, '../src/common/subject-schema.js')
const src = fs.readFileSync(schemaPath, 'utf-8')

// 提取 SUBJECT_TOOLS 对象并求值（需传入 GRADE 常量）
const toolsMatch = src.match(/export const SUBJECT_TOOLS = (\{[\s\S]*?\n\})/)
if (!toolsMatch) throw new Error('未能从 subject-schema.js 提取 SUBJECT_TOOLS')
// 提取 GRADE 常量
const gradeMatch = src.match(/const GRADE = (\[[\s\S]*?\])/)
if (!gradeMatch) throw new Error('未能从 subject-schema.js 提取 GRADE')
// eslint-disable-next-line no-new-func
const GRADE: any[] = new Function('return ' + gradeMatch[1])()
// eslint-disable-next-line no-new-func
const SUBJECT_TOOLS: Record<string, any> = new Function('GRADE', 'return ' + toolsMatch[1])(GRADE)

// 提取 SUBJECT_LIST 数组
const listMatch = src.match(/export const SUBJECT_LIST = (\[[\s\S]*?\n\])/)
if (!listMatch) throw new Error('未能从 subject-schema.js 提取 SUBJECT_LIST')
// eslint-disable-next-line no-new-func
const SUBJECT_LIST: any[] = new Function('return ' + listMatch[1])()

// 提取 MATH_TOOLS 数组
const mathMatch = src.match(/export const MATH_TOOLS = (\[[\s\S]*?\n\])/)
if (!mathMatch) throw new Error('未能从 subject-schema.js 提取 MATH_TOOLS')
// eslint-disable-next-line no-new-func
const MATH_TOOLS: any[] = new Function('return ' + mathMatch[1])()

describe('学科工具配置 subject-schema', () => {
  describe('学科清单 SUBJECT_LIST', () => {
    it('包含5个学科：语文/数学/英语/科学/道德与法治', () => {
      expect(SUBJECT_LIST.length).toBe(5)
      const subjects = SUBJECT_LIST.map((s) => s.subject)
      expect(subjects).toEqual(['语文', '数学', '英语', '科学', '道德与法治'])
    })

    it('每个学科有 icon/color/desc 元信息', () => {
      SUBJECT_LIST.forEach((s) => {
        expect(s.icon).toBeTruthy()
        expect(s.color).toMatch(/^#[0-9a-f]{6}$/i)
        expect(s.desc).toBeTruthy()
      })
    })
  })

  describe('SUBJECT_TOOLS 工具配置', () => {
    it('每个工具有 title/icon/subject/fields/build', () => {
      Object.entries(SUBJECT_TOOLS).forEach(([key, tool]: [string, any]) => {
        expect(tool.title).toBeTruthy()
        expect(tool.icon).toBeTruthy()
        expect(tool.subject).toBeTruthy()
        expect(Array.isArray(tool.fields)).toBe(true)
        expect(typeof tool.build).toBe('function')
      })
    })

    it('每个工具的 subject 字段在 SUBJECT_LIST 中存在', () => {
      const validSubjects = new Set(SUBJECT_LIST.map((s) => s.subject))
      // 数学不在 SUBJECT_TOOLS 中（用独立页面），但其他学科工具的 subject 必须在清单中
      Object.entries(SUBJECT_TOOLS).forEach(([key, tool]: [string, any]) => {
        expect(validSubjects.has(tool.subject)).toBe(true)
      })
    })

    it('required 字段标注正确', () => {
      Object.entries(SUBJECT_TOOLS).forEach(([key, tool]: [string, any]) => {
        tool.fields.forEach((f: any) => {
          if (f.required) {
            expect(typeof f.required).toBe('boolean')
          }
        })
      })
    })
  })

  describe('语文学科工具', () => {
    it('包含7个工具', () => {
      const chineseTools = Object.entries(SUBJECT_TOOLS).filter(
        ([, t]: [string, any]) => t.subject === '语文',
      )
      expect(chineseTools.length).toBe(7)
    })

    it('包含古诗词助手/汉字听写/阅读理解生成等核心工具', () => {
      const titles = Object.values(SUBJECT_TOOLS)
        .filter((t: any) => t.subject === '语文')
        .map((t: any) => t.title)
      expect(titles).toContain('古诗词助手')
      expect(titles).toContain('汉字听写')
      expect(titles).toContain('阅读理解生成')
      expect(titles).toContain('小作文助手')
    })
  })

  describe('数学学科工具（MATH_TOOLS 独立页面）', () => {
    it('包含6个工具', () => {
      expect(MATH_TOOLS.length).toBe(6)
    })

    it('每个工具有 label/icon/path', () => {
      MATH_TOOLS.forEach((t) => {
        expect(t.label).toBeTruthy()
        expect(t.icon).toBeTruthy()
        expect(t.path).toMatch(/^\/pages\/tools\//)
      })
    })

    it('包含口算生成/竖式计算/乘法口诀等核心工具', () => {
      const labels = MATH_TOOLS.map((t) => t.label)
      expect(labels).toContain('口算生成')
      expect(labels).toContain('竖式计算')
      expect(labels).toContain('乘法口诀')
      expect(labels).toContain('单位换算')
      expect(labels).toContain('错题本')
    })
  })

  describe('英语学科工具', () => {
    it('包含8个工具', () => {
      const englishTools = Object.entries(SUBJECT_TOOLS).filter(
        ([, t]: [string, any]) => t.subject === '英语',
      )
      expect(englishTools.length).toBe(8)
    })
  })

  describe('科学学科工具（新增）', () => {
    it('包含3个工具', () => {
      const scienceTools = Object.entries(SUBJECT_TOOLS).filter(
        ([, t]: [string, any]) => t.subject === '科学',
      )
      expect(scienceTools.length).toBe(3)
    })

    it('包含实验设计助手/科学知识图解/观察记录生成', () => {
      const titles = Object.values(SUBJECT_TOOLS)
        .filter((t: any) => t.subject === '科学')
        .map((t: any) => t.title)
      expect(titles).toContain('实验设计助手')
      expect(titles).toContain('科学知识图解')
      expect(titles).toContain('观察记录生成')
    })

    it('实验设计助手包含年级/实验主题/课时字段', () => {
      const tool = SUBJECT_TOOLS['experiment-design']
      expect(tool).toBeDefined()
      const fieldKeys = tool.fields.map((f: any) => f.k)
      expect(fieldKeys).toContain('grade')
      expect(fieldKeys).toContain('topic')
      expect(fieldKeys).toContain('duration')
      expect(tool.fields.find((f: any) => f.k === 'topic')?.required).toBe(true)
    })

    it('科学知识图解包含年级/科学概念字段', () => {
      const tool = SUBJECT_TOOLS['science-knowledge']
      expect(tool).toBeDefined()
      const fieldKeys = tool.fields.map((f: any) => f.k)
      expect(fieldKeys).toContain('grade')
      expect(fieldKeys).toContain('concept')
      expect(tool.fields.find((f: any) => f.k === 'concept')?.required).toBe(true)
    })

    it('观察记录生成包含年级/观察对象/观察周期字段', () => {
      const tool = SUBJECT_TOOLS['observation-record']
      expect(tool).toBeDefined()
      const fieldKeys = tool.fields.map((f: any) => f.k)
      expect(fieldKeys).toContain('grade')
      expect(fieldKeys).toContain('object')
      expect(fieldKeys).toContain('days')
      expect(tool.fields.find((f: any) => f.k === 'object')?.required).toBe(true)
    })

    it('build 函数生成贴合年级的 prompt', () => {
      const tool = SUBJECT_TOOLS['experiment-design']
      const prompt = tool.build({ grade: '三年级', topic: '水的三态变化', duration: '1课时(40分)' })
      expect(prompt).toContain('三年级')
      expect(prompt).toContain('水的三态变化')
      expect(prompt).toContain('1课时(40分)')
      expect(prompt).toMatch(/实验目的|实验材料|实验步骤/)
    })
  })

  describe('道德与法治学科工具（新增）', () => {
    it('包含3个工具', () => {
      const moralTools = Object.entries(SUBJECT_TOOLS).filter(
        ([, t]: [string, any]) => t.subject === '道德与法治',
      )
      expect(moralTools.length).toBe(3)
    })

    it('包含案例分析/情境讨论/价值观辨析', () => {
      const titles = Object.values(SUBJECT_TOOLS)
        .filter((t: any) => t.subject === '道德与法治')
        .map((t: any) => t.title)
      expect(titles).toContain('案例分析')
      expect(titles).toContain('情境讨论')
      expect(titles).toContain('价值观辨析')
    })

    it('案例分析包含年级/主题/情境描述字段，主题有8个选项', () => {
      const tool = SUBJECT_TOOLS['moral-case']
      expect(tool).toBeDefined()
      const fieldKeys = tool.fields.map((f: any) => f.k)
      expect(fieldKeys).toContain('grade')
      expect(fieldKeys).toContain('topic')
      expect(fieldKeys).toContain('scene')
      const topicField = tool.fields.find((f: any) => f.k === 'topic')
      expect(topicField.type).toBe('picker')
      expect(topicField.options.length).toBe(8)
      expect(topicField.options).toContain('诚实守信')
      expect(topicField.options).toContain('爱国教育')
      expect(topicField.options).toContain('网络安全')
    })

    it('情境讨论包含年级/两难情境字段，两难情境必填且为多行文本', () => {
      const tool = SUBJECT_TOOLS['moral-discussion']
      expect(tool).toBeDefined()
      const fieldKeys = tool.fields.map((f: any) => f.k)
      expect(fieldKeys).toContain('grade')
      expect(fieldKeys).toContain('dilemma')
      const dilemmaField = tool.fields.find((f: any) => f.k === 'dilemma')
      expect(dilemmaField.required).toBe(true)
      expect(dilemmaField.type).toBe('textarea')
    })

    it('价值观辨析包含年级/价值观关键词字段，关键词必填', () => {
      const tool = SUBJECT_TOOLS['moral-value']
      expect(tool).toBeDefined()
      const fieldKeys = tool.fields.map((f: any) => f.k)
      expect(fieldKeys).toContain('grade')
      expect(fieldKeys).toContain('value')
      expect(tool.fields.find((f: any) => f.k === 'value')?.required).toBe(true)
    })

    it('build 函数生成贴合年级的 prompt', () => {
      const tool = SUBJECT_TOOLS['moral-case']
      const prompt = tool.build({ grade: '五年级', topic: '诚实守信', scene: '同学捡到钱包后的处理方式' })
      expect(prompt).toContain('五年级')
      expect(prompt).toContain('诚实守信')
      expect(prompt).toContain('同学捡到钱包后的处理方式')
      expect(prompt).toMatch(/案例|讨论|法律|道德/)
    })
  })
})

describe('getToolsBySubject 按学科分组函数', () => {
  // 重新提取函数并执行
  const fnMatch = src.match(/export function getToolsBySubject\(subject\) \{[\s\S]*?\n\}/)
  if (!fnMatch) throw new Error('未能从 subject-schema.js 提取 getToolsBySubject')
  // eslint-disable-next-line no-new-func
  const getToolsBySubject = new Function('SUBJECT_TOOLS', 'MATH_TOOLS', fnMatch[0].replace('export function', 'function').replace('function getToolsBySubject', 'return function getToolsBySubject'))

  it('语文返回7个工具', () => {
    const tools = getToolsBySubject(SUBJECT_TOOLS, MATH_TOOLS)('语文')
    expect(tools.length).toBe(7)
    tools.forEach((t: any) => {
      expect(t.subject).toBe('语文')
      expect(t.key).toBeTruthy()
      expect(t.title).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(t.subjectKey).toBeTruthy()
    })
  })

  it('数学返回6个工具，每个有 path 跳转独立页面', () => {
    const tools = getToolsBySubject(SUBJECT_TOOLS, MATH_TOOLS)('数学')
    expect(tools.length).toBe(6)
    tools.forEach((t: any) => {
      expect(t.subject).toBe('数学')
      expect(t.path).toMatch(/^\/pages\/tools\//)
      expect(t.subjectKey).toBeUndefined()
    })
  })

  it('英语返回8个工具', () => {
    const tools = getToolsBySubject(SUBJECT_TOOLS, MATH_TOOLS)('英语')
    expect(tools.length).toBe(8)
  })

  it('科学返回3个工具', () => {
    const tools = getToolsBySubject(SUBJECT_TOOLS, MATH_TOOLS)('科学')
    expect(tools.length).toBe(3)
    const titles = tools.map((t: any) => t.title)
    expect(titles).toContain('实验设计助手')
    expect(titles).toContain('科学知识图解')
    expect(titles).toContain('观察记录生成')
  })

  it('道德与法治返回3个工具', () => {
    const tools = getToolsBySubject(SUBJECT_TOOLS, MATH_TOOLS)('道德与法治')
    expect(tools.length).toBe(3)
    const titles = tools.map((t: any) => t.title)
    expect(titles).toContain('案例分析')
    expect(titles).toContain('情境讨论')
    expect(titles).toContain('价值观辨析')
  })

  it('不存在的学科返回空数组', () => {
    const tools = getToolsBySubject(SUBJECT_TOOLS, MATH_TOOLS)('历史')
    expect(tools).toEqual([])
  })
})
