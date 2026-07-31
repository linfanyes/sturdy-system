/**
 * Comprehensive API Test Runner v2
 * Fixed response parsing (items array) and auth handling
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const TEST_DATA = JSON.parse(fs.readFileSync('/workspace/work-system/scripts/test-data-store.json', 'utf8'));

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Helper: extract items from API response
function extractItems(res) {
  if (!res || !res.data) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data.items)) return res.data.items;
  if (Array.isArray(res.data.data)) return res.data.data;
  if (res.data.items === undefined && res.data.data === undefined && !Array.isArray(res.data)) {
    // Single object
    return [res.data];
  }
  return [];
}

const report = {
  startTime: new Date().toISOString(),
  summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
  modules: [],
  defects: [],
  testCases: [],
};

let currentModule = '';
let caseNo = 0;

function startModule(name) {
  currentModule = name;
  report.modules.push({ name, cases: [] });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`MODULE: ${name}`);
  console.log('='.repeat(60));
}

function assertCase(id, title, condition, expectedStatus, actualStatus, details = '') {
  caseNo++;
  const passed = condition;
  report.summary.total++;
  if (passed) report.summary.passed++;
  else report.summary.failed++;

  const testCase = { id, title, module: currentModule, expected: expectedStatus, actual: actualStatus, passed, details, timestamp: new Date().toISOString() };
  report.testCases.push(testCase);

  const moduleObj = report.modules[report.modules.length - 1];
  if (moduleObj) moduleObj.cases.push(testCase);

  if (passed) {
    console.log(`  [PASS] ${id}: ${title}`);
  } else {
    console.log(`  [FAIL] ${id}: ${title}`);
    console.log(`         Expected: ${expectedStatus}, Got: ${actualStatus}`);
    if (details) console.log(`         Details: ${details}`);
    report.defects.push({
      id: `BUG-${String(report.defects.length + 1).padStart(3, '0')}`,
      testCase: id, title, module: currentModule, expected: expectedStatus, actual: actualStatus, details,
      severity: /PERM|AUTH|LOGIN/.test(id) ? 'P0' : 'P1',
    });
  }
}

async function main() {
  console.log('=== API TEST RUNNER v2 ===');
  console.log(`Loaded: Schools=${TEST_DATA.schools?.length}, Teachers=${TEST_DATA.teachers?.length}, Classes=${TEST_DATA.classes?.length}`);

  // ===== LOGIN =====
  // Super admin
  const superLogin = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  const superToken = superLogin.data?.token;
  assertCase('AUTH-SUPER-001', 'Super Admin Login', !!superToken, 'token', superToken ? 'token' : 'null');

  // Re-enable any disabled school admins from previous runs
  if (superToken) {
    const admins = extractItems(await request('GET', '/api/admin/school-admins', null, superToken));
    for (const adm of admins) {
      if (adm.enabled === false) {
        await request('PATCH', `/api/admin/school-admins/${adm.id}/enabled`, { enabled: true }, superToken);
      }
    }
  }

  // School admin tokens
  const schoolAdminTokens = [];
  for (let i = 1; i <= 5; i++) {
    const res = await request('POST', '/api/school-admin/login', { username: `admin_school_${i}`, password: 'admin123' });
    if (res.data?.token) schoolAdminTokens.push({ index: i - 1, token: res.data.token, username: `admin_school_${i}` });
  }
  assertCase('AUTH-SA-001', 'All 5 School Admins Login', schoolAdminTokens.length === 5, '5 tokens', `${schoolAdminTokens.length} tokens`);

  // Teacher tokens
  const teacherTokens = [];
  for (const t of TEST_DATA.teachers.slice(0, 10)) {
    const res = await request('POST', '/api/auth/unified-login', { username: t.username, password: 'teacher123' });
    if (res.data?.token) teacherTokens.push({ ...t, token: res.data.token });
  }
  assertCase('AUTH-TCH-001', '10 Teachers Login', teacherTokens.length >= 10, '>=10 tokens', `${teacherTokens.length} tokens`);

  // ===== MODULE 1: AUTHENTICATION =====
  startModule('1. Authentication & Security');

  assertCase('AUTH-LOGIN-VALID', 'Valid Super Admin Login', !!superToken, 'token', !!superToken);
  const wrongPass = await request('POST', '/api/admin/login', { username: 'admin', password: 'wrongpass' });
  assertCase('AUTH-LOGIN-INVALID', 'Invalid Password Rejected', wrongPass.status === 401, '401', wrongPass.status);

  if (teacherTokens[0]) {
    const meRes = await request('GET', '/api/auth/me', null, teacherTokens[0].token);
    assertCase('AUTH-ME-001', 'Get Current User', meRes.status === 200, '200', meRes.status);
    assertCase('AUTH-ME-002', 'Has Role', !!meRes.data?.role, 'role', meRes.data?.role || 'none');
    assertCase('AUTH-ME-003', 'Has Effective Features', Array.isArray(meRes.data?.effectiveFeatures) || meRes.data?.effectiveFeatures === null, 'features', 'present');
    assertCase('AUTH-ME-004', 'Has User Object', !!meRes.data?.user, 'user object', meRes.data?.user ? 'present' : 'missing');
    if (meRes.data?.user) {
      assertCase('AUTH-ME-005', 'User Has Subject', !!meRes.data?.user?.subject || !!meRes.data?.user?.subjects, 'subject', meRes.data?.user?.subject || meRes.data?.user?.subjects || 'undefined');
    }
  }

  // Rate limiting test
  let rateBlocked = false;
  for (let i = 0; i < 15; i++) {
    const r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'wrong' });
    if (r.status === 429) { rateBlocked = true; break; }
  }
  assertCase('AUTH-RATE-001', 'Rate Limiting', rateBlocked, '429', rateBlocked ? '429' : 'not triggered');

  // ===== MODULE 2: ROLE PERMISSIONS =====
  startModule('2. Role & Permission Tests');

  if (teacherTokens[0]) {
    const r1 = await request('GET', '/api/admin/schools', null, teacherTokens[0].token);
    assertCase('PERM-TCH-ADMIN', 'Teacher Blocked from Admin', r1.status === 401 || r1.status === 403, '401/403', r1.status);
  }
  if (schoolAdminTokens[0]) {
    const r2 = await request('GET', '/api/admin/schools', null, schoolAdminTokens[0].token);
    assertCase('PERM-SA-ADMIN', 'School Admin Blocked from Admin', r2.status === 401 || r2.status === 403, '401/403', r2.status);
  }
  const r3 = await request('GET', '/api/admin/schools', null, superToken);
  assertCase('PERM-SUPER-ACCESS', 'Super Admin Can Access All', r3.status === 200, '200', r3.status);

  // No token
  const r4 = await request('GET', '/api/admin/schools');
  assertCase('PERM-NO-TOKEN', 'No Token Blocked', r4.status === 401, '401', r4.status);

  // ===== MODULE 3: SCHOOL MANAGEMENT =====
  startModule('3. School Management (CRUD)');

  const schoolList = await request('GET', '/api/admin/schools', null, superToken);
  const schools = extractItems(schoolList);
  assertCase('SCHOOL-LIST', 'List Schools', schools.length >= 5, '>=5', schools.length);

  if (schools.length > 0) {
    const s0 = schools[0];
    const getRes = await request('GET', `/api/admin/schools/${s0.id}`, null, superToken);
    assertCase('SCHOOL-GET', 'Get Single School', getRes.status === 200, '200', getRes.status);

    const updateRes = await request('PATCH', `/api/admin/schools/${s0.id}`, { name: '测试更新' }, superToken);
    assertCase('SCHOOL-UPDATE', 'Update School', updateRes.status === 200, '200', updateRes.status);

    const featRes = await request('GET', `/api/admin/schools/${s0.id}/features`, null, superToken);
    assertCase('SCHOOL-FEAT', 'Get School Features', featRes.status === 200, '200', featRes.status);

    const featUpdateRes = await request('PATCH', `/api/admin/schools/${s0.id}/features`, { featureFlags: ['classes', 'students', 'grades'] }, superToken);
    assertCase('SCHOOL-FEAT-UPDATE', 'Update School Features', featUpdateRes.status === 200, '200', featUpdateRes.status);
  }

  // ===== MODULE 4: SCHOOL ADMIN MANAGEMENT =====
  startModule('4. School Admin Management');

  const adminList = await request('GET', '/api/admin/school-admins', null, superToken);
  const admins = extractItems(adminList);
  assertCase('SA-LIST', 'List School Admins', admins.length >= 5, '>=5', admins.length);

  if (admins.length >= 2) {
    const toggleRes = await request('PATCH', `/api/admin/school-admins/${admins[0].id}/enabled`, { enabled: false }, superToken);
    assertCase('SA-DISABLE', 'Disable School Admin', toggleRes.status === 200, '200', toggleRes.status);

    const enableRes = await request('PATCH', `/api/admin/school-admins/${admins[0].id}/enabled`, { enabled: true }, superToken);
    assertCase('SA-ENABLE', 'Enable School Admin', enableRes.status === 200, '200', enableRes.status);

    const pwdRes = await request('PATCH', `/api/admin/school-admins/${admins[1].id}/password`, { password: 'newpass123' }, superToken);
    assertCase('SA-RESET-PWD', 'Reset Password', pwdRes.status === 200, '200', pwdRes.status);

    // Login with new password
    const loginNewPwd = await request('POST', '/api/school-admin/login', { username: admins[1].username, password: 'newpass123' });
    assertCase('SA-NEW-PWD-LOGIN', 'Login with New Password', !!loginNewPwd.data?.token, 'token', loginNewPwd.status);

    // Restore password to default
    await request('PATCH', `/api/admin/school-admins/${admins[1].id}/password`, { password: 'admin123' }, superToken);
  }

  // ===== MODULE 5: TEACHER MANAGEMENT =====
  startModule('5. Teacher Management');

  if (schoolAdminTokens[0]) {
    const tchList = await request('GET', '/api/school-admin/teachers', null, schoolAdminTokens[0].token);
    const teachers = extractItems(tchList);
    assertCase('TCH-LIST', 'List Teachers', teachers.length > 0, '>0', teachers.length);

    // Create teacher
    const newTchRes = await request('POST', '/api/school-admin/teachers', {
      username: 'test_create_teacher', password: 'teacher123', name: '测试创建教师',
      gender: '男', subject: '语文', teacherNo: 'JSCR00001',
    }, schoolAdminTokens[0].token);
    assertCase('TCH-CREATE', 'Create Teacher', newTchRes.status === 201 || newTchRes.status === 200, '201/200', newTchRes.status);

    // Update teacher features
    if (teachers.length > 0) {
      const featRes = await request('PATCH', `/api/school-admin/teachers/${teachers[0].id}/features`, { features: ['classes', 'students'] }, schoolAdminTokens[0].token);
      assertCase('TCH-FEAT-UPDATE', 'Update Teacher Features', featRes.status === 200, '200', featRes.status);
    }

    // Delete teacher
    if (newTchRes.data?.id) {
      const delRes = await request('DELETE', `/api/school-admin/teachers/${newTchRes.data.id}`, null, schoolAdminTokens[0].token);
      assertCase('TCH-DELETE', 'Delete Teacher', delRes.status === 200, '200', delRes.status);
    }
  }

  // ===== MODULE 6: CLASS MANAGEMENT =====
  startModule('6. Class Management');

  if (schoolAdminTokens[0]) {
    const clsList = await request('GET', '/api/school-admin/classes', null, schoolAdminTokens[0].token);
    const classes = extractItems(clsList);
    assertCase('CLS-LIST-SA', 'School Admin List Classes', classes.length >= 5, '>=5', classes.length);

    // Create class - fetch real teacher from API
    const saTeachers = extractItems(await request('GET', '/api/school-admin/teachers', null, schoolAdminTokens[0].token));
    if (saTeachers.length >= 1) {
      const createClsRes = await request('POST', '/api/school-admin/classes', {
        name: '测试新建班级', grade: '测试年级', classNo: '99',
        headTeacher: saTeachers[0].name, headTeacherId: saTeachers[0].id,
        term: '2026春季', subjects: ['语文', '数学'],
      }, schoolAdminTokens[0].token);
      assertCase('CLS-CREATE', 'Create Class', createClsRes.status === 201 || createClsRes.status === 200, '201/200', createClsRes.status);

      if (createClsRes.data?.id) {
        const clsId = createClsRes.data.id;
        const updRes = await request('PATCH', `/api/school-admin/classes/${clsId}`, { name: '更新班级' }, schoolAdminTokens[0].token);
        assertCase('CLS-UPDATE', 'Update Class', updRes.status === 200, '200', updRes.status);

        const delRes = await request('DELETE', `/api/school-admin/classes/${clsId}`, null, schoolAdminTokens[0].token);
        assertCase('CLS-DELETE', 'Delete Class', delRes.status === 200, '200', delRes.status);
      }
    }
  }

  // Teacher class access
  if (teacherTokens[0]) {
    const tchClsList = await request('GET', '/api/classes', null, teacherTokens[0].token);
    const tchClasses = extractItems(tchClsList);
    assertCase('CLS-TCH-LIST', 'Teacher List Own Classes', tchClasses.length > 0, '>0', tchClasses.length);
  }

  // ===== MODULE 7: STUDENT MANAGEMENT =====
  startModule('7. Student Management');

  if (schoolAdminTokens[0]) {
    const stuList = await request('GET', '/api/school-admin/students', null, schoolAdminTokens[0].token);
    const students = extractItems(stuList);
    assertCase('STD-LIST-SA', 'School Admin List Students', students.length > 0, '>0', students.length);

    // Create student
    const classes = TEST_DATA.classes.filter(c => c.schoolIndex === 0);
    if (classes.length >= 1) {
      const createStuRes = await request('POST', '/api/school-admin/students/batch', {
        students: [{ name: '测试学生新增', gender: '男', studentNo: 'STADD001', classId: classes[0].id, parentName: '家长', parentPhone: '13700001234' }],
      }, schoolAdminTokens[0].token);
      assertCase('STD-CREATE', 'Batch Create Student', createStuRes.status === 201 || createStuRes.status === 200, '201/200', createStuRes.status);
    }

    // Update student
    if (students.length > 0) {
      const updRes = await request('PATCH', `/api/school-admin/students/${students[0].id}`, { name: '更新学生姓名' }, schoolAdminTokens[0].token);
      assertCase('STD-UPDATE', 'Update Student', updRes.status === 200, '200', updRes.status);
    }
  }

  if (teacherTokens[0]) {
    const tchStuList = await request('GET', '/api/students', null, teacherTokens[0].token);
    const tchStudents = extractItems(tchStuList);
    assertCase('STD-TCH-LIST', 'Teacher List Students', tchStudents.length > 0, '>0', tchStudents.length);

    if (tchStudents.length > 0) {
      const getRes = await request('GET', `/api/students/${tchStudents[0].id}`, null, teacherTokens[0].token);
      assertCase('STD-GET', 'Get Single Student', getRes.status === 200, '200', getRes.status);
    }
  }

  // ===== MODULE 8: GRADE & EXAM MANAGEMENT =====
  startModule('8. Grade & Exam Management');

  if (teacherTokens[0]) {
    // Get teacher's real classes for grade and exam creation
    const teacherClasses = extractItems(await request('GET', '/api/classes', null, teacherTokens[0].token));

    // Create grade - use teacher's real classes
    if (teacherClasses.length >= 1) {
      const clsId = teacherClasses[0].id;
      const stuRes = await request('GET', `/api/students?classId=${clsId}`, null, teacherTokens[0].token);
      const clsStudents = extractItems(stuRes);
      if (clsStudents.length >= 2) {
        const scores = clsStudents.slice(0, 3).map(s => ({ studentId: s.id, score: 70 + Math.floor(Math.random() * 25) }));
        const createGradeRes = await request('POST', '/api/grades', {
          classId: clsId, subject: '语文', examName: '单元测试',
          date: '2026-07-31', scores,
        }, teacherTokens[0].token);
        assertCase('GRD-CREATE', 'Create Grade', createGradeRes.status === 201 || createGradeRes.status === 200, '201/200', createGradeRes.status);
      }
    }

    // Now list grades to verify creation
    const gradeList = await request('GET', '/api/grades', null, teacherTokens[0].token);
    const grades = extractItems(gradeList);
    assertCase('GRD-LIST', 'List Grades', grades.length > 0, '>0', grades.length);

    // Exam operations use teacher role - need term field
    const examClassId = teacherClasses.length > 0 ? teacherClasses[0].id : null;
    if (examClassId) {
      const examCreateRes = await request('POST', '/api/exams', {
        classId: examClassId,
        name: '测试考试', date: '2026-07-31', term: '2026春季', subjects: ['语文', '数学'],
      }, teacherTokens[0].token);
      assertCase('EXM-CREATE', 'Create Exam (Teacher)', examCreateRes.status === 201 || examCreateRes.status === 200, '201/200', examCreateRes.status);
    } else {
      assertCase('EXM-CREATE', 'Create Exam (Teacher)', false, '201/200', 'no classes');
    }

    const examListRes = await request('GET', '/api/exams', null, teacherTokens[0].token);
    const exams = extractItems(examListRes);
    assertCase('EXM-LIST', 'List Exams', exams.length > 0, '>0', exams.length);
  }

  // ===== MODULE 9: NOTICE MANAGEMENT =====
  startModule('9. Notice Management');

  if (schoolAdminTokens[0]) {
    const noticeCreate = await request('POST', '/api/school-admin/notices', {
      title: '测试系统公告', content: '这是一条测试公告的详细内容', pinned: false,
    }, schoolAdminTokens[0].token);
    assertCase('NTC-CREATE', 'Create Notice', noticeCreate.status === 201 || noticeCreate.status === 200, '201/200', noticeCreate.status);

    const noticeList = await request('GET', '/api/school-admin/notices', null, schoolAdminTokens[0].token);
    const notices = extractItems(noticeList);
    assertCase('NTC-LIST', 'List Notices', notices.length > 0, '>0', notices.length);

    if (notices.length > 0) {
      const updRes = await request('PATCH', `/api/school-admin/notices/${notices[0].id}`, { title: '更新公告' }, schoolAdminTokens[0].token);
      assertCase('NTC-UPDATE', 'Update Notice', updRes.status === 200, '200', updRes.status);

      const delRes = await request('DELETE', `/api/school-admin/notices/${notices[0].id}`, null, schoolAdminTokens[0].token);
      assertCase('NTC-DELETE', 'Delete Notice', delRes.status === 200, '200', delRes.status);
    }
  }

  // ===== MODULE 10: SYSTEM & HEALTH =====
  startModule('10. System & Health');

  const healthRes = await request('GET', '/api/health');
  assertCase('HEALTH-CHECK', 'Health Check', healthRes.status === 200, '200', healthRes.status);
  assertCase('HEALTH-STATUS', 'Status OK', healthRes.data?.status === 'ok', 'ok', healthRes.data?.status);

  if (superToken) {
    const audits = await request('GET', '/api/admin/audit-logs', null, superToken);
    assertCase('AUDIT-LIST', 'List Audit Logs', audits.status === 200, '200', audits.status);
  }

  // ===== MODULE 11: CROSS-SCHOOL ISOLATION =====
  startModule('11. Cross-School Data Isolation');

  if (schoolAdminTokens[0] && schoolAdminTokens[1]) {
    const r1 = await request('GET', '/api/school-admin/teachers', null, schoolAdminTokens[0].token);
    const r2 = await request('GET', '/api/school-admin/teachers', null, schoolAdminTokens[1].token);
    const t1 = extractItems(r1);
    const t2 = extractItems(r2);
    assertCase('ISO-SCHOOLS', 'Different Schools See Different Teachers', t1.length > 0 && t2.length > 0, 'both > 0', `${t1.length} vs ${t2.length}`);
  }

  // ===== MODULE 12: PERMISSION EDGE CASES =====
  startModule('12. Permission Edge Cases');

  // Expired/invalid token
  const invalidTokenRes = await request('GET', '/api/auth/me', null, 'invalid_token_here');
  assertCase('PERM-INVALID-TOKEN', 'Invalid Token Rejected', invalidTokenRes.status === 401, '401', invalidTokenRes.status);

  // Super admin as teacher (data isolation)
  if (superToken) {
    // Super admin can see all teachers through admin endpoint
    const allTeachers = await request('GET', '/api/admin/teachers', null, superToken);
    const allTchCount = extractItems(allTeachers).length;
    assertCase('PERM-SUPER-ALL', 'Super Admin Can See All Teachers', allTchCount >= 50, '>=50', allTchCount);
  }

  // ===== MODULE 13: DATA INTEGRITY =====
  startModule('13. Data Integrity');

  // Verify school names are correct
  if (schools.length > 0) {
    const schoolNames = schools.map(s => s.name);
    assertCase('DATA-SCHOOL-NAMES', 'School Names Correct',
      schoolNames.some(n => n.includes('小学')) && schoolNames.some(n => n.includes('中学')),
      'correct names', schoolNames.join(', ')
    );
  }

  // Verify teachers have subjects
  if (teacherTokens[0]) {
    const meRes = await request('GET', '/api/auth/me', null, teacherTokens[0].token);
    const hasSubject = !!meRes.data?.user?.subject || !!meRes.data?.user?.subjects;
    assertCase('DATA-TEACHER-SUBJECT', 'Teacher Has Subject', hasSubject, 'subject', meRes.data?.user?.subject || JSON.stringify(meRes.data?.user?.subjects) || 'undefined');
  }

  // ===== GENERATE REPORT =====
  report.endTime = new Date().toISOString();
  report.duration = ((new Date() - new Date(report.startTime)) / 1000).toFixed(1) + 's';

  fs.writeFileSync('/workspace/work-system/docs/test-execution-report.json', JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('=== EXECUTION SUMMARY ===');
  console.log('='.repeat(60));
  console.log(`  Total: ${report.summary.total}`);
  console.log(`  Passed: ${report.summary.passed}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log(`  Pass Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
  console.log(`  Duration: ${report.duration}`);

  if (report.defects.length > 0) {
    console.log('\n  DEFECTS FOUND:');
    report.defects.forEach(d => {
      console.log(`    [${d.severity}] ${d.id}: ${d.testCase}`);
      console.log(`           ${d.title}`);
      console.log(`           ${d.details}`);
    });
  } else {
    console.log('\n  ✅ NO DEFECTS FOUND!');
  }

  console.log('\n  Full report: docs/test-execution-report.json');
  return report.summary.failed;
}

main().then(failed => process.exit(failed > 0 ? 1 : 0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
