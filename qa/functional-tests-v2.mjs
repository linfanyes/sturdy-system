// 园丁工作台 · 功能测试套件 v2（扩展模块：成绩分析/考勤/作业/通知/资源库/教材库/家长端/消息/备份/生成/安全/IM/课表等）
// 运行: node qa/functional-tests-v2.mjs
// 前置: QA 服务器运行在 :3100，qa/seed-data.mjs 已执行（qa-env.json 有效）
// 输出: qa/functional-report-v2.json + 控制台摘要

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = ENV.base

const results = []
let passed = 0
let failed = 0
let blocked = 0
let defects = 0

const T = (id, name, group) => {
  const r = { id, name, group, method: '', path: '', expect: '', actual: '', status: 'PASS' }
  results.push(r)
  return r
}

// 标记为已知缺陷复现（不计入 failed，单独统计）
const markDefect = (t, detail) => {
  t.status = 'DEFECT'
  t.actual = (t.actual ? t.actual + ' | ' : '') + detail
  defects++
}

async function call(p, { method = 'GET', body, token, headers = {} } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d
  try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}

const ok2xx = (s) => s >= 200 && s < 300
const brief = (d, n = 110) => {
  if (d === null || d === undefined) return String(d)
  if (typeof d === 'string') return d.slice(0, n)
  return JSON.stringify(d).slice(0, n)
}

// ================= J. 成绩与考试 =================
async function suiteGrades(head, iso) {
  const g = 'J. 成绩与考试（成绩录入/分析/导入）'
  const class1 = ENV.created.class1Id
  const stu1 = ENV.created.students[0]
  const stu2 = ENV.created.students[1]
  let examId = ''
  let gradeId = ''

  // J01 创建考试
  let t = T('GRD-01', '创建考试（期中-扩展测试）', g)
  t.method = 'POST'; t.path = '/exams'; t.expect = '201 + id'
  const ex = await call('/exams', { method: 'POST', token: head, body: {
    term: '2026春', name: 'QA扩展考试', classId: class1, subjects: ['语文', '数学'],
    date: '2026-08-02', note: 'qa-v2',
  } })
  t.actual = `${ex.status} ${brief(ex.d)}`
  if (ok2xx(ex.status) && ex.d?.id) { passed++; examId = ex.d.id } else { t.status = 'FAIL'; failed++ }

  // J02 成绩 merge（创建/幂等均可，关键是有 id）
  const mergeKey = 'QA扩展考试-' + Date.now()
  t = T('GRD-02', '成绩 merge（创建成绩）', g)
  t.method = 'POST'; t.path = '/grades/merge'; t.expect = '201 + id'
  const mg = await call('/grades/merge', { method: 'POST', token: head, body: {
    classId: class1, examId, subject: '语文', examName: mergeKey, date: '2026-08-02',
    scores: [{ studentId: stu1.id, score: 98 }, { studentId: stu2.id, score: 82 }],
  } })
  t.actual = `${mg.status} ${brief(mg.d)}`
  if (ok2xx(mg.status) && mg.d?.id) { passed++; gradeId = mg.d.id } else { t.status = 'FAIL'; failed++ }

  // J03 成绩 merge（同键二次 = 幂等更新，不重复创建）
  t = T('GRD-03', '成绩 merge（同键幂等更新）', g)
  t.method = 'POST'; t.path = '/grades/merge'; t.expect = '200/201 + 同一 id'
  const mg2 = await call('/grades/merge', { method: 'POST', token: head, body: {
    classId: class1, examId, subject: '语文', examName: mergeKey, date: '2026-08-02',
    scores: [{ studentId: stu1.id, score: 99 }],
  } })
  t.actual = `${mg2.status} id=${mg2.d?.id} same=${mg2.d?.id === gradeId}`
  if (ok2xx(mg2.status) && mg2.d?.id === gradeId) passed++; else { t.status = 'FAIL'; failed++ }

  // J04 成绩列表按 subject 过滤
  t = T('GRD-04', '成绩列表 subject 精确过滤', g)
  t.method = 'GET'; t.path = '/grades?classId=' + class1 + '&subject=语文'; t.expect = '200 + items'
  const gl = await call(`/grades?classId=${class1}&subject=语文`, { token: head })
  t.actual = `${gl.status} items=${gl.d?.items?.length ?? '?'}`
  if (ok2xx(gl.status) && Array.isArray(gl.d?.items) && gl.d.items.length >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // J05 考试统计 analysis/exam
  t = T('GRD-05', '成绩分析：单场考试统计', g)
  t.method = 'GET'; t.path = '/grades/analysis/exam?classId=&examId='; t.expect = '200 + subjects'
  const st = await call(`/grades/analysis/exam?classId=${class1}&examId=${examId}`, { token: head })
  t.actual = `${st.status} subjects=${st.d?.subjects?.length ?? '?'}`
  if (ok2xx(st.status) && Array.isArray(st.d?.subjects)) passed++; else { t.status = 'FAIL'; failed++ }

  // J06 排名 analysis/rank
  t = T('GRD-06', '成绩分析：班级排名', g)
  t.method = 'GET'; t.path = '/grades/analysis/rank?classId=&examId='; t.expect = '200 + ranks'
  const rk = await call(`/grades/analysis/rank?classId=${class1}&examId=${examId}`, { token: head })
  t.actual = `${rk.status} ranks=${rk.d?.ranks?.length ?? '?'}`
  if (ok2xx(rk.status) && Array.isArray(rk.d?.ranks)) passed++; else { t.status = 'FAIL'; failed++ }

  // J07 学生历史 analysis/student
  t = T('GRD-07', '成绩分析：学生历次成绩', g)
  t.method = 'GET'; t.path = '/grades/analysis/student/:studentId'; t.expect = '200 + history'
  const hs = await call(`/grades/analysis/student/${stu1.id}`, { token: head })
  t.actual = `${hs.status} history=${hs.d?.history?.length ?? '?'}`
  if (ok2xx(hs.status) && Array.isArray(hs.d?.history)) passed++; else { t.status = 'FAIL'; failed++ }

  // J08 趋势 analysis/trend
  t = T('GRD-08', '成绩分析：趋势', g)
  t.method = 'GET'; t.path = '/grades/analysis/trend?classId='; t.expect = '200 + trend'
  const tr = await call(`/grades/analysis/trend?classId=${class1}`, { token: head })
  t.actual = `${tr.status} ${brief(tr.d, 60)}`
  if (ok2xx(tr.status) && tr.d?.trend) passed++; else { t.status = 'FAIL'; failed++ }

  // J09 薄弱 analysis/weak
  t = T('GRD-09', '成绩分析：薄弱学生', g)
  t.method = 'GET'; t.path = '/grades/analysis/weak?classId='; t.expect = '200 + weakSubjects'
  const wk = await call(`/grades/analysis/weak?classId=${class1}`, { token: head })
  t.actual = `${wk.status} ${brief(wk.d, 60)}`
  if (ok2xx(wk.status) && wk.d?.weakSubjects) passed++; else { t.status = 'FAIL'; failed++ }

  // J10 导入预览（合法）
  t = T('GRD-10', '成绩导入预览（CSV 文本）', g)
  t.method = 'POST'; t.path = '/grades/import-preview'; t.expect = '201 + validCount>0'
  const ip = await call('/grades/import-preview', { method: 'POST', token: head, body: {
    classId: class1, filename: 'score.txt',
    data: Buffer.from(`学号,分数\n${stu1.studentNo},95\n${stu2.studentNo},88`).toString('base64'),
  } })
  t.actual = `${ip.status} valid=${ip.d?.validCount ?? '?'}`
  if (ok2xx(ip.status) && ip.d?.validCount >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // J11 导入预览（非法分数）
  t = T('GRD-11', '成绩导入预览（非法分数被拒）', g)
  t.method = 'POST'; t.path = '/grades/import-preview'; t.expect = '201 + errorCount>=1'
  const ip2 = await call('/grades/import-preview', { method: 'POST', token: head, body: {
    classId: class1, filename: 'score.txt',
    data: Buffer.from(`学号,分数\n${stu1.studentNo},abc`).toString('base64'),
  } })
  t.actual = `${ip2.status} errors=${ip2.d?.errorCount ?? '?'}`
  if (ok2xx(ip2.status) && ip2.d?.errorCount >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // J12 导入提交
  t = T('GRD-12', '成绩导入提交', g)
  t.method = 'POST'; t.path = '/grades/import-commit'; t.expect = '201 + count>=1'
  const ic = await call('/grades/import-commit', { method: 'POST', token: head, body: {
    classId: class1, examName: 'QA扩展考试-导入', subject: '数学', date: '2026-08-02',
    rows: [
      { studentId: stu1.id, name: stu1.name, studentNo: stu1.studentNo, score: 90, valid: true },
      { studentId: stu2.id, name: stu2.name, studentNo: stu2.studentNo, score: 76, valid: true },
    ],
  } })
  t.actual = `${ic.status} count=${ic.d?.count ?? '?'}`
  if (ok2xx(ic.status) && ic.d?.count >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // J13 越权：无关教师访问他人班级成绩
  t = T('GRD-13', '越权：无关教师访问他人班级成绩被拒', g)
  t.method = 'GET'; t.path = '/grades/analysis/trend?classId='; t.expect = '400/403'
  const ov = await call(`/grades/analysis/trend?classId=${class1}`, { token: iso })
  t.actual = `${ov.status}`
  if (ov.status === 400 || ov.status === 403 || ov.status === 401) passed++; else { t.status = 'FAIL'; failed++ }

  // J14 缺少参数校验
  t = T('GRD-14', '成绩分析缺少 classId 参数被拒', g)
  t.method = 'GET'; t.path = '/grades/analysis/exam'; t.expect = '400'
  const miss = await call('/grades/analysis/exam', { token: head })
  t.actual = `${miss.status}`
  if (miss.status === 400) passed++; else { t.status = 'FAIL'; failed++ }

  return gradeId
}

// ================= K. 考勤 / 作业 / 通知 =================
async function suiteSchoolBiz(head, iso) {
  const g = 'K. 考勤 / 作业 / 通知'
  const class1 = ENV.created.class1Id
  const stu1 = ENV.created.students[0]

  // K01 考勤创建
  let t = T('SCH-01', '考勤创建（records 数组）', g)
  t.method = 'POST'; t.path = '/attendances'; t.expect = '201 + id'
  const at = await call('/attendances', { method: 'POST', token: head, body: {
    classId: class1, date: '2026-08-02',
    records: [{ studentId: stu1.id, status: '出勤' }],
  } })
  t.actual = `${at.status} ${brief(at.d)}`
  if (ok2xx(at.status) && at.d?.id) { passed++ } else { t.status = 'FAIL'; failed++ }

  // K02 考勤列表
  t = T('SCH-02', '考勤列表', g)
  t.method = 'GET'; t.path = '/attendances?take=5'; t.expect = '200 + items'
  const al = await call('/attendances?take=5', { token: head })
  t.actual = `${al.status} items=${al.d?.items?.length ?? '?'}`
  if (ok2xx(al.status) && Array.isArray(al.d?.items) && al.d.items.length >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // K03 作业创建
  t = T('SCH-03', '作业创建', g)
  t.method = 'POST'; t.path = '/homework'; t.expect = '201 + id'
  const hw = await call('/homework', { method: 'POST', token: head, body: {
    classId: class1, subject: '语文', title: 'QA扩展作业', content: '完成练习册', startDate: '2026-08-02', deadline: '2026-08-05',
  } })
  t.actual = `${hw.status} ${brief(hw.d)}`
  if (ok2xx(hw.status) && hw.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // K04 班级公告（班主任）
  t = T('SCH-04', '班主任发布班级公告', g)
  t.method = 'POST'; t.path = '/notices'; t.expect = '201 + id'
  const nt = await call('/notices', { method: 'POST', token: head, body: {
    classId: class1, title: 'QA扩展班级公告', content: '公告内容', scope: 'class', pinned: false,
  } })
  t.actual = `${nt.status} ${brief(nt.d)}`
  if (ok2xx(nt.status) && nt.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // K05 非班主任发班级公告被拒
  t = T('SCH-05', '非班主任发布班级公告被拒', g)
  t.method = 'POST'; t.path = '/notices'; t.expect = '403'
  const nt2 = await call('/notices', { method: 'POST', token: iso, body: {
    classId: class1, title: '越权公告', content: 'x', scope: 'class',
  } })
  t.actual = `${nt2.status} ${brief(nt2.d, 60)}`
  if (nt2.status === 403) passed++; else { t.status = 'FAIL'; failed++ }

  // K06 学校公告（任何教师可发）
  t = T('SCH-06', '学校公告发布 + scope=school 过滤', g)
  t.method = 'POST'; t.path = '/notices'; t.expect = '201'
  const nt3 = await call('/notices', { method: 'POST', token: iso, body: {
    title: 'QA扩展学校公告', content: 'x', scope: 'school',
  } })
  const nt4 = await call('/notices?scope=school', { token: head })
  t.actual = `${nt3.status} | filter=${nt4.status} items=${nt4.d?.items?.length ?? '?'}`
  if (ok2xx(nt3.status) && ok2xx(nt4.status) && Array.isArray(nt4.d?.items) && nt4.d.items.length >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // K07 公告置顶
  t = T('SCH-07', '公告置顶 PATCH', g)
  t.method = 'PATCH'; t.path = '/notices/:id'; t.expect = '200'
  const pin = await call(`/notices/${nt.d.id}`, { method: 'PATCH', token: head, body: { pinned: true } })
  t.actual = `${pin.status}`
  if (ok2xx(pin.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // K08 公告推送（越权班级返回 pushed:0）
  t = T('SCH-08', '公告推送（非本人班级安全降级）', g)
  t.method = 'POST'; t.path = '/notices/push'; t.expect = '200 + pushed>=0'
  const push = await call('/notices/push', { method: 'POST', token: iso, body: {
    noticeId: nt.d.id, classId: class1, title: 'x', content: 'x',
  } })
  t.actual = `${push.status} ${brief(push.d, 60)}`
  if (ok2xx(push.status) && push.d && typeof push.d.pushed === 'number') passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= L. 教学资源库 =================
async function suiteResourceLibrary(head, sa) {
  const g = 'L. 教学资源库（古诗词/公式/单词）'
  let poemId = ''

  // L01 校管创建古诗
  let t = T('RES-01', '校管创建古诗词', g)
  t.method = 'POST'; t.path = '/school-admin/resource-library/poems'; t.expect = '201 + id'
  const p = await call('/school-admin/resource-library/poems', { method: 'POST', token: sa, body: {
    title: '静夜思', dynasty: '唐', author: '李白', content: '床前明月光', grade: '一年级',
  } })
  t.actual = `${p.status} ${brief(p.d)}`
  if (ok2xx(p.status) && p.d?.id) { passed++; poemId = p.d.id } else { t.status = 'FAIL'; failed++ }

  // L02 教师查询古诗列表
  t = T('RES-02', '教师查询古诗词列表', g)
  t.method = 'GET'; t.path = '/resource-library/poems'; t.expect = '200 + array'
  const pl = await call('/resource-library/poems', { token: head })
  t.actual = `${pl.status} items=${Array.isArray(pl.d) ? pl.d.length : (pl.d?.items?.length ?? '?')}`
  if (ok2xx(pl.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // L03 教师搜索古诗
  t = T('RES-03', '教师搜索古诗词', g)
  t.method = 'GET'; t.path = '/resource-library/poems/search?keyword='; t.expect = '200'
  const ps = await call('/resource-library/poems/search?keyword=静夜思', { token: head })
  t.actual = `${ps.status} ${brief(ps.d, 60)}`
  if (ok2xx(ps.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // L04 校管创建公式
  t = T('RES-04', '校管创建数学公式', g)
  t.method = 'POST'; t.path = '/school-admin/resource-library/formulas'; t.expect = '201 + id'
  const fm = await call('/school-admin/resource-library/formulas', { method: 'POST', token: sa, body: {
    title: '加法交换律', category: '运算定律', formula: 'a+b=b+a', grade: '二年级',
  } })
  t.actual = `${fm.status} ${brief(fm.d)}`
  if (ok2xx(fm.status) && fm.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // L05 校管创建单词
  t = T('RES-05', '校管创建英语单词', g)
  t.method = 'POST'; t.path = '/school-admin/resource-library/words'; t.expect = '201 + id'
  const wd = await call('/school-admin/resource-library/words', { method: 'POST', token: sa, body: {
    word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', category: '水果',
  } })
  t.actual = `${wd.status} ${brief(wd.d)}`
  if (ok2xx(wd.status) && wd.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // L06 单词分类
  t = T('RES-06', '单词分类列表', g)
  t.method = 'GET'; t.path = '/resource-library/words/categories'; t.expect = '200'
  const wc = await call('/resource-library/words/categories', { token: head })
  t.actual = `${wc.status} ${brief(wc.d, 60)}`
  if (ok2xx(wc.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // L07 教师编辑古诗（权限）
  t = T('RES-07', '教师编辑古诗词', g)
  t.method = 'PATCH'; t.path = '/resource-library/poems/:id'; t.expect = '200（允许）或 403（拒绝）'
  const pe = await call(`/resource-library/poems/${poemId}`, { method: 'PATCH', token: head, body: { keywords: '思乡' } })
  t.actual = `${pe.status}`
  if (ok2xx(pe.status) || pe.status === 403) passed++; else { t.status = 'FAIL'; failed++ }

  // L08 教师越权删除被拒（无 DELETE 路由）
  t = T('RES-08', '教师无法删除资源（无写权限路由）', g)
  t.method = 'DELETE'; t.path = '/resource-library/poems/:id'; t.expect = '404/403'
  const pd = await call(`/resource-library/poems/${poemId}`, { method: 'DELETE', token: head })
  t.actual = `${pd.status}`
  if (pd.status === 404 || pd.status === 403 || pd.status === 405) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= M. 教材库 =================
async function suiteTextbooks(head, sa) {
  const g = 'M. 教材库（课本/单元/知识点）'
  let tbId = ''

  // M01 校管创建教材
  let t = T('TB-01', '校管创建教材', g)
  t.method = 'POST'; t.path = '/school-admin/textbooks'; t.expect = '201 + id'
  const tb = await call('/school-admin/textbooks', { method: 'POST', token: sa, body: {
    name: '语文三年级上册', subject: '语文', grade: '三年级', version: '人教版',
  } })
  t.actual = `${tb.status} ${brief(tb.d)}`
  if (ok2xx(tb.status) && tb.d?.id) { passed++; tbId = tb.d.id } else { t.status = 'FAIL'; failed++ }

  // M02 教材树（教师）
  t = T('TB-02', '教材树（教师只读）', g)
  t.method = 'GET'; t.path = '/textbooks/tree'; t.expect = '200'
  const tr = await call('/textbooks/tree', { token: head })
  t.actual = `${tr.status} ${brief(tr.d, 60)}`
  if (ok2xx(tr.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // M03 教材搜索
  t = T('TB-03', '教材搜索', g)
  t.method = 'GET'; t.path = '/textbooks/search?keyword='; t.expect = '200'
  const ts = await call('/textbooks/search?keyword=语文', { token: head })
  t.actual = `${ts.status} ${brief(ts.d, 60)}`
  if (ok2xx(ts.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // M04 教师创建单元被拒（403）
  t = T('TB-04', '教师创建教材单元被拒', g)
  t.method = 'POST'; t.path = '/textbooks/units'; t.expect = '403'
  const tu = await call('/textbooks/units', { method: 'POST', token: head, body: { textbookId: tbId, name: 'QA单元' } })
  t.actual = `${tu.status} ${brief(tu.d, 60)}`
  if (tu.status === 403) passed++; else { t.status = 'FAIL'; failed++ }

  // M05 校管创建单元（字段：title/unitOrder）
  t = T('TB-05', '校管创建教材单元', g)
  t.method = 'POST'; t.path = '/school-admin/textbooks/units'; t.expect = '201 + id'
  const un = await call('/school-admin/textbooks/units', { method: 'POST', token: sa, body: {
    textbookId: tbId, title: '第一单元', unitOrder: 1,
  } })
  t.actual = `${un.status} ${brief(un.d)}`
  if (ok2xx(un.status) && un.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // M06 校管创建知识点（字段：title/content/pointOrder）
  t = T('TB-06', '校管创建教材知识点', g)
  t.method = 'POST'; t.path = '/school-admin/textbooks/points'; t.expect = '201 + id'
  const pt = await call('/school-admin/textbooks/points', { method: 'POST', token: sa, body: {
    unitId: un.d?.id || 'x', title: '生字词', content: '重点生字', pointOrder: 1,
  } })
  t.actual = `${pt.status} ${brief(pt.d)}`
  if (ok2xx(pt.status) && pt.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // M07 seed-defaults（幂等）
  t = T('TB-07', '教材 seed-defaults 幂等', g)
  t.method = 'POST'; t.path = '/school-admin/textbooks/seed-defaults'; t.expect = '201/200'
  const sd = await call('/school-admin/textbooks/seed-defaults', { method: 'POST', token: sa })
  t.actual = `${sd.status} ${brief(sd.d, 60)}`
  if (ok2xx(sd.status)) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= N. 家长端扩展 =================
async function suiteParentExt(parent) {
  const g = 'N. 家长端扩展（作业/考勤/行为/课表/沟通/教师/多娃）'
  const checks = [
    ['PAR-05', '家长查看作业', '/parent-auth/homework'],
    ['PAR-06', '家长查看考勤', '/parent-auth/attendance'],
    ['PAR-07', '家长查看行为记录', '/parent-auth/behavior'],
    ['PAR-08', '家长查看课表', '/parent-auth/schedule'],
    ['PAR-09', '家长查看沟通记录', '/parent-auth/communications'],
    ['PAR-10', '家长查看班级教师', '/parent-auth/teachers'],
    ['PAR-11', '家长查看绑定关系', '/parent-auth/bindings'],
    ['PAR-12', '家长多娃对比', '/parent-auth/compare-kids'],
  ]
  for (const [id, name, p] of checks) {
    const t = T(id, name, g)
    t.method = 'GET'; t.path = p; t.expect = '200'
    const r = await call(p, { token: parent })
    t.actual = `${r.status} ${brief(r.d, 60)}`
    if (ok2xx(r.status)) passed++; else { t.status = 'FAIL'; failed++ }
  }

  // PAR-13 家长提交信息修改申请（合法字段）
  let t = T('PAR-13', '家长提交信息修改申请（合法字段）', g)
  t.method = 'POST'; t.path = '/parent-auth/student-update-request'; t.expect = '201 + id'
  const ur = await call('/parent-auth/student-update-request', { method: 'POST', token: parent, body: {
    payload: { address: 'QA测试地址-修改' },
  } })
  t.actual = `${ur.status} ${brief(ur.d)}`
  if (ok2xx(ur.status) && ur.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // PAR-14 家长提交非法字段被拒
  t = T('PAR-14', '家长提交非法字段被拒', g)
  t.method = 'POST'; t.path = '/parent-auth/student-update-request'; t.expect = '400'
  const ur2 = await call('/parent-auth/student-update-request', { method: 'POST', token: parent, body: {
    payload: { teacherId: 'evil' },
  } })
  t.actual = `${ur2.status} ${brief(ur2.d, 60)}`
  if (ur2.status === 400) passed++; else { t.status = 'FAIL'; failed++ }

  // PAR-15 家长查看申请列表
  t = T('PAR-15', '家长查看申请列表', g)
  t.method = 'GET'; t.path = '/parent-auth/student-update-requests'; t.expect = '200 + items'
  const ul = await call('/parent-auth/student-update-requests', { token: parent })
  t.actual = `${ul.status} ${brief(ul.d, 60)}`
  if (ok2xx(ul.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // PAR-16 教师端审核列表
  t = T('PAR-16', '教师端信息修改申请列表', g)
  t.method = 'GET'; t.path = '/student-info-updates'; t.expect = '200'
  const sil = await call('/student-info-updates', { token: ENV.created.headToken })
  t.actual = `${sil.status} ${brief(sil.d, 60)}`
  if (ok2xx(sil.status)) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= O. 消息与通知扩展 =================
async function suiteMessagesExt(head, parent) {
  const g = 'O. 消息与通知扩展（已读/未读/全部已读/删除）'
  const stu1 = ENV.created.students[0]

  // P1-MSG-01 修复后：教师收件人列表返回家长 IM 账号（p_xxx，与家长 JWT sub 一致）
  const recRes = await call('/messages/recipients', { token: head })
  const recList = Array.isArray(recRes.d) ? recRes.d : recRes.d?.items || []
  const parentRec = recList.find((r) => r.role === 'parent')

  // O01 发送消息（正确 payload）
  let t = T('MSG-05', '教师发送消息（recipientId/role/title）', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '201 + id'
  const m = await call('/messages', { method: 'POST', token: head, body: {
    recipientId: parentRec?.id || stu1.id, recipientRole: 'parent', title: 'QA扩展消息', content: '消息内容',
  } })
  t.actual = `${m.status} ${brief(m.d)}`
  if (ok2xx(m.status) && m.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // O02 缺少 recipientId 被拒
  t = T('MSG-06', '消息缺少收件人被拒', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '400'
  const m2 = await call('/messages', { method: 'POST', token: head, body: { content: 'x' } })
  t.actual = `${m2.status}`
  if (m2.status === 400) passed++; else { t.status = 'FAIL'; failed++ }

  // O03 已发送列表
  t = T('MSG-07', '已发送消息列表', g)
  t.method = 'GET'; t.path = '/messages/sent'; t.expect = '200 + items'
  const ms = await call('/messages/sent', { token: head })
  t.actual = `${ms.status} items=${ms.d?.items?.length ?? ms.d?.length ?? '?'}`
  if (ok2xx(ms.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // O04 家长标记已读（P1-MSG-01 修复后应通过）
  t = T('MSG-08', '家长标记教师消息已读', g)
  t.method = 'PATCH'; t.path = '/messages/:id/read'; t.expect = '200'
  const mr = await call(`/messages/${m.d.id}/read`, { method: 'PATCH', token: parent })
  t.actual = `${mr.status} ${brief(mr.d, 60)}`
  if (ok2xx(mr.status)) {
    passed++
  } else {
    t.status = 'FAIL'; failed++
  }

  // O04b 家长收件箱能看到教师消息（P1-MSG-01 修复后应通过）
  t = T('MSG-08b', '家长收件箱能看到教师消息', g)
  t.method = 'GET'; t.path = '/messages'; t.expect = '含教师消息'
  const inbox = await call('/messages', { token: parent })
  const hit = (inbox.d?.items || []).some((x) => x.id === m.d.id)
  t.actual = `${inbox.status} items=${inbox.d?.items?.length ?? 0} hit=${hit}`
  if (hit) {
    passed++
  } else {
    t.status = 'FAIL'; failed++
  }

  // O05 全部已读
  t = T('MSG-09', '标记全部已读', g)
  t.method = 'PATCH'; t.path = '/messages/mark-all-read'; t.expect = '200'
  const ma = await call('/messages/mark-all-read', { method: 'PATCH', token: parent })
  t.actual = `${ma.status}`
  if (ok2xx(ma.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // O06 未读数
  t = T('MSG-10', '未读消息数', g)
  t.method = 'GET'; t.path = '/messages/unread-count'; t.expect = '200'
  const mu = await call('/messages/unread-count', { token: parent })
  t.actual = `${mu.status} ${brief(mu.d, 40)}`
  if (ok2xx(mu.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // O07 删除消息
  t = T('MSG-11', '教师删除消息', g)
  t.method = 'DELETE'; t.path = '/messages/:id'; t.expect = '200'
  const md = await call(`/messages/${m.d.id}`, { method: 'DELETE', token: head })
  t.actual = `${md.status}`
  if (ok2xx(md.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // O08 通知未读数
  t = T('MSG-12', '通知未读数', g)
  t.method = 'GET'; t.path = '/notifications/unread-count'; t.expect = '200'
  const nu = await call('/notifications/unread-count', { token: parent })
  t.actual = `${nu.status} ${brief(nu.d, 40)}`
  if (ok2xx(nu.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // O09 通知全部已读
  t = T('MSG-13', '通知全部已读', g)
  t.method = 'POST'; t.path = '/notifications/mark-all-read'; t.expect = '201/200'
  const nm = await call('/notifications/mark-all-read', { method: 'POST', token: parent })
  t.actual = `${nm.status}`
  if (ok2xx(nm.status)) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= P. 备份 =================
async function suiteBackups(head, iso) {
  const g = 'P. 备份（创建/列表/租户隔离）'
  let backupId = ''

  // P01 创建备份
  let t = T('BAK-01', '创建手动备份', g)
  t.method = 'POST'; t.path = '/backups'; t.expect = '201 + id'
  const b = await call('/backups', { method: 'POST', token: head, body: { label: 'QA扩展备份' } })
  t.actual = `${b.status} ${brief(b.d)}`
  if (ok2xx(b.status) && b.d?.id) { passed++; backupId = b.d.id } else { t.status = 'FAIL'; failed++ }

  // P02 备份列表
  t = T('BAK-02', '备份列表', g)
  t.method = 'GET'; t.path = '/backups'; t.expect = '200 + array'
  const bl = await call('/backups', { token: head })
  t.actual = `${bl.status} items=${Array.isArray(bl.d) ? bl.d.length : '?'}`
  if (ok2xx(bl.status) && Array.isArray(bl.d) && bl.d.length >= 1) passed++; else { t.status = 'FAIL'; failed++ }

  // P03 自动备份
  t = T('BAK-03', '触发自动备份', g)
  t.method = 'POST'; t.path = '/backups/auto'; t.expect = '201/200'
  const ba = await call('/backups/auto', { method: 'POST', token: head })
  t.actual = `${ba.status} ${brief(ba.d, 50)}`
  if (ok2xx(ba.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // P04 租户隔离：其他教师看不到本教师备份
  t = T('BAK-04', '备份租户隔离（跨教师不可见）', g)
  t.method = 'GET'; t.path = '/backups'; t.expect = '200 且不含他人备份'
  const bi = await call('/backups', { token: iso })
  const ids = Array.isArray(bi.d) ? bi.d.map((x) => x.id) : []
  t.actual = `${bi.status} leak=${ids.includes(backupId)}`
  if (ok2xx(bi.status) && !ids.includes(backupId)) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= Q. 生成内容 =================
async function suiteGenerated(head) {
  const g = 'Q. 生成内容（试卷/教案/知识点/试题查询）'
  const groups = [
    ['GEN-01', '试卷列表/创建', 'papers', { title: 'QA扩展试卷', grade: '三年级', subject: '语文', content: '内容' }],
    ['GEN-02', '教案列表/创建', 'lesson-plans', { title: 'QA扩展教案', subject: '语文', grade: '三年级', content: '内容' }],
    ['GEN-03', '知识点列表/创建', 'knowledges', { title: 'QA扩展知识点', grade: '三年级', subject: '语文', content: '内容' }],
    ['GEN-04', '试题查询列表/创建', 'queries', { keyword: '分数', title: 'QA扩展试题', source: '题库', year: '2026' }],
  ]
  for (const [id, name, res, payload] of groups) {
    let t = T(id, name, g)
    t.method = 'GET'; t.path = `/generated/${res}`; t.expect = '200'
    const l = await call(`/generated/${res}`, { token: head })
    t.actual = `${l.status} items=${l.d?.items?.length ?? '?'}`
    if (ok2xx(l.status)) { passed++ } else { t.status = 'FAIL'; failed++; continue }

    t = T(id + 'b', name + '（POST）', g)
    t.method = 'POST'; t.path = `/generated/${res}`; t.expect = '201 + id'
    const c = await call(`/generated/${res}`, { method: 'POST', token: head, body: payload })
    t.actual = `${c.status} ${brief(c.d)}`
    if (ok2xx(c.status) && c.d?.id) passed++; else { t.status = 'FAIL'; failed++ }
  }

  // Q09 seed-defaults 幂等（仅 knowledges/lesson-plans 有该路由）
  let t = T('GEN-09', '生成内容 seed-defaults 幂等', g)
  t.method = 'POST'; t.path = '/generated/knowledges/seed-defaults'; t.expect = '201/200'
  const sd = await call('/generated/knowledges/seed-defaults', { method: 'POST', token: head })
  t.actual = `${sd.status} ${brief(sd.d, 60)}`
  if (ok2xx(sd.status)) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= R. 安全 / IM / 课表 =================
async function suiteMisc(head, parent) {
  const g = 'R. 安全 / IM / 课表 / 选择历史'
  const class1 = ENV.created.class1Id
  const stu1 = ENV.created.students[0]

  // R01 文本安全检测
  let t = T('SEC-01', '文本安全检测（正常内容）', g)
  t.method = 'POST'; t.path = '/security/msg-check'; t.expect = '201 + pass=true'
  const mc = await call('/security/msg-check', { method: 'POST', token: head, body: { content: '今天天气很好' } })
  t.actual = `${mc.status} ${brief(mc.d, 40)}`
  if (ok2xx(mc.status) && mc.d?.pass === true) passed++; else { t.status = 'FAIL'; failed++ }

  // R02 图片安全检测（空图优雅处理）
  t = T('SEC-02', '图片安全检测（无图降级）', g)
  t.method = 'POST'; t.path = '/security/img-check'; t.expect = '201/200 或 4xx（非 500）'
  const ic = await call('/security/img-check', { method: 'POST', token: head, body: { image: '' } })
  t.actual = `${ic.status} ${brief(ic.d, 40)}`
  if (ok2xx(ic.status) || (ic.status >= 400 && ic.status < 500)) passed++; else { t.status = 'FAIL'; failed++ }

  // R03 IM user-sig（空配置降级）
  t = T('IM-01', 'IM user-sig（未配置降级）', g)
  t.method = 'POST'; t.path = '/im/user-sig'; t.expect = '201/200'
  const us = await call('/im/user-sig', { method: 'POST', token: head, body: {} })
  t.actual = `${us.status} ${brief(us.d, 50)}`
  if (ok2xx(us.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // R04 IM 家长列表
  t = T('IM-02', 'IM 班级家长列表', g)
  t.method = 'GET'; t.path = '/im/parents?classId='; t.expect = '200 + array'
  const ip = await call(`/im/parents?classId=${class1}`, { token: head })
  t.actual = `${ip.status} items=${Array.isArray(ip.d) ? ip.d.length : '?'}`
  if (ok2xx(ip.status) && Array.isArray(ip.d)) passed++; else { t.status = 'FAIL'; failed++ }

  // R05 IM 班级群
  t = T('IM-03', 'IM 创建/获取班级群', g)
  t.method = 'POST'; t.path = '/im/class-group'; t.expect = '201/200'
  const cg = await call('/im/class-group', { method: 'POST', token: head, body: { classId: class1 } })
  t.actual = `${cg.status} ${brief(cg.d, 50)}`
  if (ok2xx(cg.status)) passed++; else { t.status = 'FAIL'; failed++ }

  // R06 我的课表
  t = T('SCH-09', '我的课表（教师）', g)
  t.method = 'GET'; t.path = '/schedules/my'; t.expect = '200'
  const sm = await call('/schedules/my', { token: head })
  t.actual = `${sm.status} classes=${sm.d?.classes?.length ?? '?'}`
  if (ok2xx(sm.status) && Array.isArray(sm.d?.classes)) passed++; else { t.status = 'FAIL'; failed++ }

  // R07 picker-history 创建
  t = T('PICK-01', '选择历史记录创建', g)
  t.method = 'POST'; t.path = '/picker-history'; t.expect = '201 + id'
  const ph = await call('/picker-history', { method: 'POST', token: head, body: {
    classId: class1, studentId: stu1.id, studentName: stu1.name,
  } })
  t.actual = `${ph.status} ${brief(ph.d)}`
  if (ok2xx(ph.status) && ph.d?.id) passed++; else { t.status = 'FAIL'; failed++ }

  // R08 picker-history 列表
  t = T('PICK-02', '选择历史列表', g)
  t.method = 'GET'; t.path = '/picker-history'; t.expect = '200'
  const phl = await call('/picker-history', { token: head })
  t.actual = `${phl.status} ${brief(phl.d, 60)}`
  if (ok2xx(phl.status)) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= S. 教师模块补充 =================
async function suiteTeacherExt(head) {
  const g = 'S. 教师模块（详情聚合）'
  // 用 userId 查询教师详情（detail 支持 userId 参数）
  let t = T('TCH-01', '教师详情（userId 聚合账号+班级）', g)
  t.method = 'GET'; t.path = '/teachers/:id/detail?userId='; t.expect = '200 或 404（取决于 ID 语义）'
  // 先获取当前教师 user id：/users/me
  const me = await call('/users/me', { token: head })
  const uid = me.d?.id || me.d?.userId
  let status = 'skip'
  if (uid) {
    const det = await call(`/teachers/${uid}/detail?userId=${uid}`, { token: head })
    status = `${det.status}`
    t.actual = `${det.status} ${brief(det.d, 80)}`
    if (ok2xx(det.status) || det.status === 404) passed++; else { t.status = 'FAIL'; failed++ }
  } else {
    t.actual = 'no-user-id'; t.status = 'FAIL'; failed++
  }
}

// ================= 主流程 =================
async function main() {
  const su = ENV.created.suToken
  const sa = ENV.created.saToken
  const head = ENV.created.headToken
  const iso = ENV.created.isoTokens.qa_t_iso
  const parent = ENV.created.parentToken

  await suiteGrades(head, iso)
  await suiteSchoolBiz(head, iso)
  await suiteResourceLibrary(head, sa)
  await suiteTextbooks(head, sa)
  await suiteParentExt(parent)
  await suiteMessagesExt(head, parent)
  await suiteBackups(head, iso)
  await suiteGenerated(head)
  await suiteMisc(head, parent)
  await suiteTeacherExt(head)

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    environment: 'SQLite 内存库（QA 服务器 :3100，限流放宽）',
    summary: {
      total: results.length,
      passed,
      failed,
      blocked,
      defects,
      passRate: ((passed + defects) / results.length * 100).toFixed(1) + '%（含已确认缺陷）',
    },
    results,
  }
  fs.writeFileSync(path.join(__dirname, 'functional-report-v2.json'), JSON.stringify(report, null, 2), 'utf8')

  console.log('')
  console.log('========== 功能测试 v2 摘要 ==========')
  console.log(`总用例: ${results.length} | 通过: ${passed} | 失败: ${failed} | 阻塞: ${blocked} | 已确认缺陷: ${defects}`)
  console.log('')
  const fails = results.filter((r) => r.status === 'FAIL')
  if (fails.length) {
    console.log('---- 失败用例 ----')
    for (const f of fails) {
      console.log(`${f.id} [${f.group}] ${f.name}`)
      console.log(`  期望: ${f.expect}`)
      console.log(`  实际: ${f.actual}`)
    }
  }
  const defs = results.filter((r) => r.status === 'DEFECT')
  if (defs.length) {
    console.log('---- 已确认缺陷 ----')
    for (const d of defs) {
      console.log(`${d.id} [${d.group}] ${d.name}`)
      console.log(`  ${d.actual}`)
    }
  }
  console.log(`报告已写入: qa/functional-report-v2.json`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error('套件执行异常:', e)
  process.exit(2)
})
