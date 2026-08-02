// 第二批补丁：TC-T-501 字段、TC-T-206 状态恢复、TC-T-210 清理、TC-T-608 单条删除、TC-AUTH-007 自包含
const fs = require('fs');
const FILE = 'D:/workspae/gitee/techer/work-system/e2e/qa/api-tests.mjs';
let s = fs.readFileSync(FILE, 'utf8');
const R = (from, to) => { if (!s.includes(from)) { console.error('NOT FOUND:', from.slice(0, 100)); process.exitCode = 1; } s = s.split(from).join(to); };

R("body: { classId: T.classId, studentName: 'QA学生甲', date: '2026-08-02', type: '加分', reason: '表现好', score: 5 }",
  "body: { classId: T.classId, studentId: T.students[0].id, date: '2026-08-02', type: '加分', reason: '表现好', points: 5 }");
R("body: { classId: T.classId, studentName: 'QA学生甲', subject: '语文', score: 10, reason: '课堂表现', source: '课堂' }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', delta: 10, reason: '课堂表现' }");
R("body: { classId: T.classId, groupName: 'QA一组', score: 10, reason: '合作' }",
  "body: { classId: T.classId, name: 'QA一组', points: 10, color: '#4ade80' }");
R("body: { classId: T.classId, studentName: 'QA学生甲', awardName: '学习之星', category: '学习', level: '校级', date: '2026-08-02' }",
  "body: { name: 'QA学习之星', issuer: 'QA学校', level: '校级', date: '2026-08-02' }");
R("body: { classId: T.classId, studentName: 'QA学生甲', bookTitle: '《西游记》', duration: 30, pages: 20, rating: 5 }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', bookTitle: '《西游记》', minutes: 30, pages: 20, date: '2026-08-02' }");

R("await t('TC-T-206', '开关家长登录', pA('POST', `/students/${T.students[0].id}/toggle-parent-login`, {}, T2.token))",
  [
    "await t('TC-T-206', '开关家长登录', async () => {",
    "  const cur = await call('/students/' + T.students[0].id, { token: T2.token })",
    "  if (!cur.ok) return cur",
    "  const before = !!cur.d.parentLoginEnabled",
    "  const t1 = await call('/students/' + T.students[0].id + '/toggle-parent-login', { method: 'POST', token: T2.token })",
    "  if (!t1.ok) return t1",
    "  const mid = !!t1.d.parentLoginEnabled",
    "  const t2 = await call('/students/' + T.students[0].id + '/toggle-parent-login', { method: 'POST', token: T2.token })",
    "  if (!t2.ok) return t2",
    "  const after = !!t2.d.parentLoginEnabled",
    "  return { status: 200, ok: before === after && mid !== before, d: { before, mid, after } }",
    "})",
  ].join('\n'));

R("  const del = await call('/students/' + stu2.id, { method: 'DELETE', token: T2.token })\n  return del // 期望非班主任无法删除 → 403/404",
  "  const del = await call('/students/' + stu2.id, { method: 'DELETE', token: T2.token })\n  await call('/school-admin/classes/' + cls2.id, { method: 'DELETE', token: sa.token }).catch(() => {})\n  return del // 期望非班主任无法删除 → 403/404");

R("  const a = await call('/picker-history', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', mode: 'single' }, token: T2.token })\n  if (!a.ok) return a\n  return call('/picker-history', { method: 'DELETE', token: T2.token })",
  "  const a = await call('/picker-history', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', mode: 'single' }, token: T2.token })\n  if (!a.ok) return a\n  return call('/picker-history/' + a.d.id, { method: 'DELETE', token: T2.token })");

R("await t('TC-AUTH-007', '家长登录(学号)', pA('POST', '/parent-auth/login', { studentNo: (T.students[0]?.studentNo || '12101'), password: '123456' }))",
  [
    "await t('TC-AUTH-007', '家长登录(学号)', async () => {",
    "  const sid = T.students[0].id",
    "  const cur = await call('/students/' + sid, { token: T.teacherToken })",
    "  if (!cur.ok) return cur",
    "  if (!cur.d.parentLoginEnabled) {",
    "    await call('/students/' + sid + '/toggle-parent-login', { method: 'POST', token: T.teacherToken })",
    "  }",
    "  await call('/students/' + sid + '/reset-parent-password', { method: 'POST', token: T.teacherToken })",
    "  return call('/parent-auth/login', { method: 'POST', body: { studentNo: (T.students[0]?.studentNo || '12101'), password: '123456' } })",
    "})",
  ].join('\n'));

fs.writeFileSync(FILE, s);
console.log('patch-2 done, exitCode=', process.exitCode || 0);
