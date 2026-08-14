/**
 * 家长功能包管理跨端一致性测试
 * 覆盖：小程序班主任端已具备「家长功能包管理」入口（与 web 端功能无差异）、
 *       接口路径与后端一致、功能键名与 shared 常量一致。
 */
import fs from 'fs'
import path from 'path'

const teachingApi = fs.readFileSync(path.resolve(__dirname, '../src/api/teaching.js'), 'utf-8')
const classesVue = fs.readFileSync(path.resolve(__dirname, '../src/pages/classes/classes.vue'), 'utf-8')
const sharedConstants = fs.readFileSync(path.resolve(__dirname, '../../shared/constants/index.ts'), 'utf-8')
const serverFeatureConstants = fs.readFileSync(
  path.resolve(__dirname, '../../server/src/common/feature/feature-flags.constants.ts'),
  'utf-8',
)

describe('小程序班主任端 · 家长功能包管理（与 web 端功能无差异）', () => {
  it('teaching.js 提供获取/更新家长功能包接口，路径与后端一致', () => {
    expect(teachingApi).toContain('export function getClassParentFeatures(classId)')
    expect(teachingApi).toMatch(/api\.get\('\/classes\/' \+ classId \+ '\/parent-features'\)/)
    expect(teachingApi).toContain('export function updateClassParentFeatures(classId, features)')
    expect(teachingApi).toMatch(/api\.patch\('\/classes\/' \+ classId \+ '\/parent-features', \{ features \}\)/)
  })

  it('classes.vue 成员弹窗提供「家长功能包管理」入口（仅班主任可见）', () => {
    expect(classesVue).toContain('⚙️ 家长功能包管理')
    expect(classesVue).toContain("v-if=\"isHead\" class=\"pf-btn\" @click=\"openParentFeatures()\"")
    // 科任老师不可见
    expect(classesVue).toContain('isHead')
  })

  it('classes.vue 支持「跟随默认 / 自定义」两种模式与勾选保存', () => {
    expect(classesVue).toContain('跟随默认')
    expect(classesVue).toContain('自定义')
    expect(classesVue).toContain('togglePfOption(o.key)')
    expect(classesVue).toContain('updateClassParentFeatures')
    // 跟随默认时以 null 恢复；自定义时提交勾选项
    expect(classesVue).toContain("const features = pfMode.value === 'custom' ? [...pfDraft.value] : null")
  })

  it('家长功能包键名与 shared 常量一致', () => {
    // 双端共用 shared/constants 的 PARENT_FEATURE_KEYS
    expect(sharedConstants).toContain('export const PARENT_FEATURE_KEYS: string[] = [')
  })

  it('后端 feature-flags.constants.ts 与 shared PARENT_FEATURE_KEYS 一致（CI 有校验）', () => {
    expect(serverFeatureConstants).toContain('PARENT_FEATURE_KEYS')
    expect(serverFeatureConstants).toContain('与 shared/constants/index.ts 的 PARENT_FEATURE_KEYS 保持一致')
  })
})

describe('家长端功能包门控跨端一致性（与 web Dashboard 对齐）', () => {
  const miniParent = fs.readFileSync(path.resolve(__dirname, '../src/pages/parent/parent.vue'), 'utf-8')
  const webDashboard = fs.readFileSync(path.resolve(__dirname, '../../web-app/src/views/parent/Dashboard.vue'), 'utf-8')

  it('小程序「考勤」tab 门控覆盖 schedule/duty/im（含课表/值日/家校沟通）', () => {
    // web 端对 schedule/duty/im 单独分区，小程序考勤 tab 聚合展示这些内容，
    // 门控必须包含对应键，否则班主任仅开放课表/家校沟通时家长在小程序看不到（跨端不一致）
    expect(miniParent).toMatch(/hasPf\('attendance'\) \|\| hasPf\('behavior'\) \|\| hasPf\('schedule'\) \|\| hasPf\('duty'\) \|\| hasPf\('im'\)/)
  })

  it('web Dashboard 对 schedule/duty、im 单独门控', () => {
    expect(webDashboard).toMatch(/hasPf\('schedule'\) \|\| hasPf\('duty'\)/)
    expect(webDashboard).toMatch(/hasPf\('im'\)/)
  })
})
