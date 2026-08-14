/**
 * 小程序成绩手动录入落库回归测试（缺陷修复）。
 *
 * 背景缺陷：GradeEntry 的「保存成绩/保存全部科目成绩」此前仅 emit('reload')，
 * 未调用任何写接口，导致小程序端手动录入成绩完全不持久化（web 端走 importGradesCommit 幂等 upsert）。
 * 修复：改为调用 /grades/merge（幂等合并，重复保存=更新），与 web 端行为一致。
 */
import fs from 'fs'
import path from 'path'

const gradeEntry = fs.readFileSync(
  path.resolve(__dirname, '../src/pages/teaching/components/GradeEntry.vue'),
  'utf-8',
)
const gradesApi = fs.readFileSync(path.resolve(__dirname, '../src/api/grades.js'), 'utf-8')

describe('小程序成绩手动录入 · 持久化与幂等性（与 web 端功能无差异）', () => {
  it('「保存成绩」单科录入调用幂等 mergeGrades，而非仅 reload', () => {
    // 必须真正调用写接口
    expect(gradeEntry).toMatch(/saveManual[\s\S]*?mergeGrades\(\{[\s\S]*?scores: sc/)
    // 幂等语义：同一班级/考试/科目重复保存为更新
    expect(gradeEntry).toMatch(/subject: props\.subject, date: props\.date, scores: sc/)
  })

  it('「保存全部科目成绩」矩阵录入按科目逐科幂等合并', () => {
    expect(gradeEntry).toMatch(/saveAll[\s\S]*?mergeGrades\(/)
    expect(gradeEntry).toMatch(/subject: sub, date: props\.date, scores: bySubject\[sub\]/)
  })

  it('不再出现仅 emit("reload") 的假保存（写调用必须发生在 reload 之前）', () => {
    const saveManualBody = gradeEntry.slice(gradeEntry.indexOf('async function saveManual'), gradeEntry.indexOf('/* ===== 单科删除 ====='))
    // 真实保存：mergeGrades 调用在 emit('reload') 之前（reload 仅用于保存成功后刷新）
    const mergeIdx = saveManualBody.indexOf('mergeGrades(')
    const reloadIdx = saveManualBody.indexOf("emit('reload')")
    expect(mergeIdx).toBeGreaterThan(-1)
    expect(reloadIdx).toBeGreaterThan(mergeIdx)
  })

  it('grades.js 已移除非幂等 saveGrade（POST /grades 会重复插入），保留幂等 mergeGrades', () => {
    expect(gradesApi).not.toContain('export function saveGrade(')
    expect(gradesApi).toMatch(/api\.post\('\/grades\/merge', payload\)/)
  })

  it('保存失败/成功均有反馈，且保存期间展示 loading', () => {
    expect(gradeEntry).toContain("uni.showLoading({ title: '保存中…', mask: true })")
    expect(gradeEntry).toContain("uni.showToast({ title: r?.created ? '已保存' : '已更新', icon: 'success' })")
    expect(gradeEntry).toContain('保存失败：')
  })
})
