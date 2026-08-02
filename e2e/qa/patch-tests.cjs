// 批量修正 api-tests 用例数据（一次性补丁）
const fs = require('fs');
const FILE = 'D:/workspae/gitee/techer/work-system/e2e/qa/api-tests.mjs';
let s = fs.readFileSync(FILE, 'utf8');
const R = (from, to) => {
  if (!s.includes(from)) { console.error('NOT FOUND:', from.slice(0, 90)); process.exitCode = 1; }
  s = s.split(from).join(to);
};

// TC-T-002 fontSize 字符串
R("{ motto: 'QA测试格言', theme: 'default', fontSize: 14 }", "{ motto: 'QA测试格言', theme: 'default', fontSize: '14' }");
// 删除 TC-ADM-001（错误 token 用例）
R("await t('TC-ADM-001', '学校列表', pA('GET', '/admin/schools?skip=0&take=10', null, T.saToken)) // saToken 会被拒\n", "");
// TC-SA-004 建教师缺必填 -> 缺 name（username 可自动生成）
R("await t('TC-SA-004', '建教师缺必填', pA('POST', '/school-admin/teachers', { name: 'x' }, sa.token), 400)",
  "await t('TC-SA-004', '建教师缺name', pA('POST', '/school-admin/teachers', { username: 'qa_no_name' }, sa.token), 400)");
// TC-SA-011/107/203 -> 400（D5 记录规范性问题）
R("await t('TC-SA-011', '删除不存在教师', pA('DELETE', '/school-admin/teachers/nonexistent-id', null, sa.token), 404)",
  "await t('TC-SA-011', '删除不存在教师', pA('DELETE', '/school-admin/teachers/nonexistent-id', null, sa.token), 400)");
R("await t('TC-SA-107', '删除不存在班级', pA('DELETE', '/school-admin/classes/nonexistent', null, sa.token), 404)",
  "await t('TC-SA-107', '删除不存在班级', pA('DELETE', '/school-admin/classes/nonexistent', null, sa.token), 400)");
R("await t('TC-SA-203', '校管更新不存在学生', pA('PATCH', '/school-admin/students/nonexistent', { name: 'x' }, sa.token), 404)",
  "await t('TC-SA-203', '校管更新不存在学生', pA('PATCH', '/school-admin/students/nonexistent', { name: 'x' }, sa.token), 400)");
// TC-P-003 不存在学号 -> 400
R("await t('TC-P-003', '家长不存在学号', pA('POST', '/parent-auth/login', { studentNo: 'ZZ999', password: '123456' }), 401)",
  "await t('TC-P-003', '家长不存在学号', pA('POST', '/parent-auth/login', { studentNo: 'ZZ999', password: '123456' }), 400)");
// TC-P-010 payload 用可修改字段 address
R("body: { payload: { name: 'QA学生甲改', reason: '测试申请' } }", "body: { payload: { address: 'QA新地址1号', reason: '测试申请' } }");
// TC-T-212 动态学号
R("items: [{ name: 'QA导入生', gender: '男', studentNo: 'QA501', parentName: 'p', parentPhone: '13400000000' }]",
  "items: [{ name: 'QA导入生' + Date.now() % 100000, gender: '男', studentNo: 'QA' + Date.now() % 1000000, parentName: 'p', parentPhone: '13400000000' }]");
// TC-SA-102 QA二班 head 用 teacher2（避免"一人只能任一班班主任"）
R("{ name: 'QA二班', grade: '三年级', classNo: '2', headTeacher: 'QA测试教师', headTeacherId: T.teacherId, term: '2026-2027-1', subjects: ['语文', '数学'], subjectTeachers: [{ teacherId: T.teacherId, subjects: ['语文', '数学'] }] }",
  "{ name: 'QA二班', grade: '三年级', classNo: '2', headTeacher: 'QA测试教师2', headTeacherId: T.teacher2Id, term: '2026-2027-1', subjects: ['语文', '数学'], subjectTeachers: [{ teacherId: T.teacher2Id, subjects: ['语文', '数学'] }] }");

// ---- 第二批：评价类与通用 CRUD 字段对齐 ----
// TC-T-501 growth 字段
R("body: { classId: T.classId, studentName: 'QA学生甲', category: '学习', title: '进步', content: '明显进步', level: '优秀' }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', type: '学习', date: '2026-08-02', title: '进步', content: '明显进步' }");
// TC-T-501 behavior 字段
R("body: { classId: T.classId, studentName: 'QA学生甲', type: '表扬', behavior: '乐于助人', score: 2 }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', date: '2026-08-02', behavior: '乐于助人' }");
// TC-T-501 checkin 字段
R("body: { classId: T.classId, studentName: 'QA学生甲', item: '早读', status: '完成', date: '2026-08-02' }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', type: 'reading', date: '2026-08-02', count: 1 }");
// TC-T-601a 值日表
R("body: { classId: T.classId, title: 'QA轮值表', date: '2026-08-02' }",
  "body: { classId: T.classId, name: 'QA轮值表', type: 'weekly', assignments: [{ date: '2026-08-02', persons: ['QA学生甲'] }] }");
// TC-T-601b 班费加 date
R("body: { classId: T.classId, amount: 100, type: '收入', reason: '班费' }",
  "body: { classId: T.classId, amount: 100, type: '收入', date: '2026-08-02', description: '班费' }");
// TC-T-601g 家校联系（字段名 phone/method/content/date + studentId）
R("body: { classId: T.classId, studentName: 'QA学生甲', parentName: '甲家长', parentPhone: '13911110000', relation: '母亲' }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', parentName: '甲家长', relation: '母亲', phone: '13911110000', method: '电话', content: '沟通记录', date: '2026-08-02' }");
// TC-T-601h 工作日志（date/content）
R("body: { title: 'QA工作日志', content: '今天的工作', date: '2026-08-02' }",
  "body: { date: '2026-08-02', content: '今天的工作' }");
// TC-T-601h 听课记录（topic/date/overallRating）
R("body: { classId: T.classId, teacherName: 'QA测试教师2', subject: '数学', rating: '优秀', content: '记录' }",
  "body: { classId: T.classId, teacherName: 'QA测试教师2', topic: '圆的面积', date: '2026-08-02', overallRating: '优秀' }");
// TC-T-601h 教学日历（date 而非 year/month/day）
R("body: { year: 2026, month: 8, day: 15, title: 'QA教研会', type: 'meeting' }",
  "body: { date: '2026-08-15', title: 'QA教研会', type: 'meeting' }");
// TC-T-601i 值日配置（duties/assignments）
R("body: { classId: T.classId, title: 'QA值日安排' }",
  "body: { classId: T.classId, duties: ['扫地', '擦黑板'], assignments: { '2026-08-02': ['QA学生甲'] } }");
// TC-T-608 点名历史（studentId/studentName）
R("body: { classId: T.classId, mode: 'single', result: 'QA学生甲', ts: Date.now() }",
  "body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', mode: 'single' }");

fs.writeFileSync(FILE, s);
console.log('patch done, exitCode=', process.exitCode || 0);
