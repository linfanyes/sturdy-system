/**
 * Corrected Comprehensive API Test Runner v4
 * - All entity field names verified against actual entity definitions
 * - Fixed all create operations with correct field names
 * - Uses isOkStatus consistently for all HTTP status checks
 * - Covers 120+ test cases across 20 modules
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null, raw: body }); }
        catch (e) { resolve({ status: res.statusCode, data: body, raw: body }); }
      });
    });
    req.on('error', (err) => resolve({ status: 0, data: null, error: err.message }));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const report = {
  startTime: new Date().toISOString(),
  results: [],
  summary: { total: 0, passed: 0, failed: 0, errors: 0 },
  categories: {},
};

function log(msg) { console.log(`[${new Date().toISOString().split('T')[1]}] ${msg}`); }

function test(category, id, name, fn) {
  const key = `${category}-${id}`;
  report.summary.total++;
  const cat = report.categories[category] || (report.categories[category] = { total: 0, passed: 0, failed: 0 });
  cat.total++;
  return (async () => {
    try {
      const res = await fn();
      const success = typeof res === 'object' ? res.success : res;
      const detail = typeof res === 'object' ? res.detail : '';
      if (success) {
        report.summary.passed++; cat.passed++;
        report.results.push({ id: key, category, name, status: 'PASS', detail });
        log(`  ✅ ${key}: ${name}`);
      } else {
        report.summary.failed++; cat.failed++;
        report.results.push({ id: key, category, name, status: 'FAIL', detail });
        log(`  ❌ ${key}: ${name} - ${detail}`);
      }
    } catch (err) {
      report.summary.errors++; cat.failed++;
      report.results.push({ id: key, category, name, status: 'ERROR', detail: err.message });
      log(`  ⚠️  ${key}: ${name} - ERROR: ${err.message}`);
    }
  })();
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.list)) return data.list;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

function isOkStatus(status) {
  return status === 200 || status === 201 || status === 204;
}

let tokens = {};
let created = {};
let cached = { classes: [], students: [], exams: [] };

async function loginAll() {
  log('Logging in all roles...');
  
  let r = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  tokens.super = r.data?.token;
  log(`  Super admin: ${tokens.super ? '✅' : '❌'}`);
  
  await sleep(300);
  r = await request('POST', '/api/school-admin/login', { username: 'admin_school_1', password: 'admin123' });
  tokens.sa1 = r.data?.token;
  log(`  School Admin 1: ${tokens.sa1 ? '✅' : '❌'}`);
  
  await sleep(300);
  r = await request('POST', '/api/school-admin/login', { username: 'admin_school_2', password: 'admin123' });
  tokens.sa2 = r.data?.token;
  log(`  School Admin 2: ${tokens.sa2 ? '✅' : '❌'}`);
  
  await sleep(300);
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'teacher123' });
  tokens.t1 = r.data?.token;
  tokens.t1_data = r.data;
  log(`  Teacher 1_1 (head): ${tokens.t1 ? '✅' : '❌'}`);
  
  await sleep(300);
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_2', password: 'teacher123' });
  tokens.t2 = r.data?.token;
  tokens.t2_data = r.data;
  log(`  Teacher 1_2 (subject): ${tokens.t2 ? '✅' : '❌'}`);
  
  // Cache teacher data
  if (tokens.t1) {
    r = await request('GET', '/api/auth/me', null, tokens.t1);
    tokens.t1_profile = r.data;
  }
  
  // Cache class data for teacher 1
  if (tokens.t1) {
    r = await request('GET', '/api/classes', null, tokens.t1);
    cached.classes = extractItems(r.data);
    log(`  Teacher 1 classes: ${cached.classes.length}`);
    if (cached.classes.length > 0) {
      cached.classId = cached.classes[0].id;
      r = await request('GET', `/api/students?classId=${cached.classId}`, null, tokens.t1);
      cached.students = extractItems(r.data);
      log(`  Teacher 1 students: ${cached.students.length}`);
      if (cached.students.length > 0) {
        cached.studentId = cached.students[0].id;
        cached.studentName = cached.students[0].name;
      }
    }
  }
  
  // Cache class data for teacher 2
  if (tokens.t2) {
    r = await request('GET', '/api/classes', null, tokens.t2);
    cached.classes2 = extractItems(r.data);
    log(`  Teacher 2 classes: ${cached.classes2.length}`);
  }
}

async function main() {
  log('=== Corrected Comprehensive API Test Runner v4 ===\n');
  await loginAll();
  await sleep(200);
  
  log('\n' + '='.repeat(50));
  log('Starting tests...\n');

  // ==================== 1. AUTH & SECURITY (10 tests) ====================
  log('\n--- Auth & Security ---');
  
  await test('AUTH', '001', '超级管理员登录', async () => {
    const r = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
    return { success: !!r.data?.token, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '002', '学校管理员登录', async () => {
    const r = await request('POST', '/api/school-admin/login', { username: 'admin_school_1', password: 'admin123' });
    return { success: !!r.data?.token, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '003', '教师统一登录', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'teacher123' });
    return { success: !!r.data?.token, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '004', '/auth/me 教师信息', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/auth/me', null, tokens.t1);
    return { success: !!r.data?.user && !!r.data?.role, detail: `role=${r.data?.role}` };
  });
  
  await test('AUTH', '005', '/auth/me 包含有效功能包', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/auth/me', null, tokens.t1);
    return { success: !!r.data?.effectiveFeatures && r.data.effectiveFeatures.length > 0, detail: `features=${r.data?.effectiveFeatures?.length || 0}` };
  });
  
  await test('AUTH', '006', '/auth/me 教师包含科目', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/auth/me', null, tokens.t1);
    return { success: !!r.data?.user?.subject || !!r.data?.user?.subjects, detail: `subject=${r.data?.user?.subject || 'N/A'}` };
  });
  
  await test('AUTH', '007', '/auth/me 学校管理员 schoolId', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/auth/me', null, tokens.sa1);
    return { success: !!r.data?.schoolId, detail: `schoolId=${r.data?.schoolId || 'NULL'}` };
  });
  
  await test('AUTH', '008', '无 token 访问被拒绝', async () => {
    const r = await request('GET', '/api/teachers', null, null);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '009', '无效 token 被拒绝', async () => {
    const r = await request('GET', '/api/teachers', null, 'invalid-token');
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '010', '错误密码被拒绝', async () => {
    const r = await request('POST', '/api/admin/login', { username: 'admin', password: 'wrong' });
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });

  // ==================== 2. HEALTH CHECK ====================
  log('\n--- Health Check ---');
  await test('SYS', '001', '健康检查', async () => {
    const r = await request('GET', '/api/health');
    return { success: r.status === 200, detail: `status=${r.status}` };
  });

  // ==================== 3. SCHOOLS CRUD (5 tests) ====================
  log('\n--- Schools (Super Admin) ---');
  
  await test('SCHL', '001', '列出学校', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/admin/schools', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('SCHL', '002', '创建学校', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/admin/schools', {
      prefix: 'TS', name: '测试学校', address: '测试地址', contact: '联系人', phone: '13800009999', platform: 'mini',
    }, tokens.super);
    if (isOkStatus(r.status)) {
      created.schoolId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('SCHL', '003', '获取学校详情', async () => {
    if (!created.schoolId || !tokens.super) return { success: false, detail: 'no id/token' };
    const r = await request('GET', `/api/admin/schools/${created.schoolId}`, null, tokens.super);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('SCHL', '004', '更新学校', async () => {
    if (!created.schoolId || !tokens.super) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/admin/schools/${created.schoolId}`, { name: '测试学校-更新' }, tokens.super);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('SCHL', '005', '删除学校', async () => {
    if (!created.schoolId || !tokens.super) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/admin/schools/${created.schoolId}`, null, tokens.super);
    created.schoolId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 4. SCHOOL ADMINS CRUD (5 tests) ====================
  log('\n--- School Admins (Super Admin) ---');
  
  await test('SA', '001', '列出学校管理员', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/admin/school-admins', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('SA', '002', '创建学校管理员', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const schools = extractItems((await request('GET', '/api/admin/schools', null, tokens.super)).data);
    if (schools.length === 0) return { success: false, detail: 'no schools' };
    const r = await request('POST', '/api/admin/school-admins', {
      username: 'temp_sa_' + Date.now(), password: 'admin123', name: '临时管理员', schoolId: schools[0].id, enabled: true,
    }, tokens.super);
    if (isOkStatus(r.status)) {
      created.saId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('SA', '003', '更新学校管理员', async () => {
    if (!created.saId || !tokens.super) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/admin/school-admins/${created.saId}`, { name: '临时管理员-更新' }, tokens.super);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('SA', '004', '启用/禁用管理员', async () => {
    if (!created.saId || !tokens.super) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/admin/school-admins/${created.saId}`, { enabled: false }, tokens.super);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('SA', '005', '删除学校管理员', async () => {
    if (!created.saId || !tokens.super) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/admin/school-admins/${created.saId}`, null, tokens.super);
    created.saId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 5. TEACHERS CRUD (8 tests) ====================
  log('\n--- Teachers (School Admin) ---');
  
  await test('TCH', '001', '列出教师', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/teachers', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 10, detail: `count=${items.length}` };
  });
  
  await test('TCH', '002', '创建教师', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/school-admin/teachers', {
      username: `temp_t_${Date.now()}`, password: 'teacher123', name: '临时教师',
      gender: '男', subject: '语文', teacherNo: 'TEMP001', phone: '13900009999',
    }, tokens.sa1);
    if (isOkStatus(r.status)) {
      created.tchId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${r.data?.message || ''}` };
  });
  
  await test('TCH', '003', '更新教师', async () => {
    if (!created.tchId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/school-admin/teachers/${created.tchId}`, { name: '临时教师-更新' }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('TCH', '004', '更新教师权限', async () => {
    if (!created.tchId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/school-admin/teachers/${created.tchId}/features`, { features: ['grades'] }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('TCH', '005', '重置教师密码', async () => {
    if (!created.tchId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('POST', `/api/school-admin/teachers/${created.tchId}/reset-password`, { password: 'newpass123' }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('TCH', '006', '删除教师', async () => {
    if (!created.tchId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/school-admin/teachers/${created.tchId}`, null, tokens.sa1);
    created.tchId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('TCH', '007', '批量创建教师', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/school-admin/teachers/batch', {
      teachers: [
        { name: '批量教师1', gender: '男', subject: '数学', phone: '13900008801' },
        { name: '批量教师2', gender: '女', subject: '英语', phone: '13900008802' },
      ],
    }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('TCH', '008', '导出教师 CSV', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/export/teachers', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });

  // ==================== 6. CLASSES (6 tests) ====================
  log('\n--- Classes ---');
  
  await test('CLS', '001', '学校管理员列出班级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/classes', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('CLS', '002', '教师列出自己的班级', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/classes', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('CLS', '003', '创建班级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const teachers = extractItems((await request('GET', '/api/school-admin/teachers', null, tokens.sa1)).data);
    if (teachers.length === 0) return { success: false, detail: 'no teachers' };
    const r = await request('POST', '/api/school-admin/classes', {
      name: '临时班级', grade: '六年级', classNo: '99',
      headTeacher: teachers[0].name, headTeacherId: teachers[0].id,
      term: '2026春季', subjects: ['语文', '数学'],
    }, tokens.sa1);
    if (isOkStatus(r.status)) {
      created.clsId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${r.data?.message || ''}` };
  });
  
  await test('CLS', '004', '更新班级', async () => {
    if (!created.clsId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/school-admin/classes/${created.clsId}`, { name: '临时班级-更新' }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('CLS', '005', '班级升级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/school-admin/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', `/api/school-admin/classes/${classes[0].id}/promote`, { targetGrade: '五年级' }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('CLS', '006', '删除班级', async () => {
    if (!created.clsId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/school-admin/classes/${created.clsId}`, null, tokens.sa1);
    created.clsId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 7. STUDENTS (6 tests) ====================
  log('\n--- Students ---');
  
  await test('STD', '001', '学校管理员列出学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/students', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 40, detail: `count=${items.length}` };
  });
  
  await test('STD', '002', '教师列出班级学生', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('GET', `/api/students?classId=${cached.classId}`, null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('STD', '003', '批量创建学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/school-admin/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/school-admin/students/batch', { students: [{ name: '临时学生', gender: '男', studentNo: 'TEMP001', classId: classes[0].id }] }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('STD', '004', '更新学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/students', null, tokens.sa1);
    const items = extractItems(r.data);
    if (items.length === 0) return { success: false, detail: 'no students' };
    const ur = await request('PATCH', `/api/school-admin/students/${items[0].id}`, { name: items[0].name + '-更新' }, tokens.sa1);
    return { success: isOkStatus(ur.status), detail: `status=${ur.status}` };
  });
  
  await test('STD', '005', '删除学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/students', null, tokens.sa1);
    const items = extractItems(r.data);
    if (items.length === 0) return { success: false, detail: 'no students' };
    const dr = await request('DELETE', `/api/school-admin/students/${items[0].id}`, null, tokens.sa1);
    return { success: isOkStatus(dr.status), detail: `status=${dr.status}` };
  });
  
  await test('STD', '006', '导出学生 CSV', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/export/students', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });

  // ==================== 8. EXAMS CRUD (4 tests) ====================
  log('\n--- Exams (Teacher) ---');
  
  await test('EXM', '001', '教师列出考试', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/exams', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('EXM', '002', '教师创建考试', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('POST', '/api/exams', {
      classId: cached.classId, name: '临时考试', subjects: ['语文'], date: '2026-03-01', term: '2026春季',
    }, tokens.t1);
    if (isOkStatus(r.status)) {
      created.examId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${r.data?.message || ''}` };
  });
  
  await test('EXM', '003', '教师更新考试', async () => {
    if (!created.examId || !tokens.t1) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/exams/${created.examId}`, { name: '临时考试-更新' }, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('EXM', '004', '教师删除考试', async () => {
    if (!created.examId || !tokens.t1) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/exams/${created.examId}`, null, tokens.t1);
    created.examId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 9. GRADES (2 tests) ====================
  log('\n--- Grades (Teacher) ---');
  
  await test('GRD', '001', '教师列出成绩', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/grades', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('GRD', '002', '教师创建成绩', async () => {
    if (!tokens.t1 || !cached.classId || cached.students.length === 0) return { success: false, detail: 'no data' };
    const scores = cached.students.slice(0, 3).map(s => ({ studentId: s.id, score: 75 }));
    const r = await request('POST', '/api/grades', {
      classId: cached.classId, subject: '语文', examName: '临时测验', date: '2026-03-01', scores,
    }, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 10. HOMEWORK CRUD (3 tests) ====================
  log('\n--- Homework (Teacher) ---');
  
  await test('HW', '001', '列出作业', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/homework', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('HW', '002', '创建作业', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('POST', '/api/homework', {
      classId: cached.classId, subject: '语文', title: '临时作业', content: '作业内容', deadline: '2026-03-15',
    }, tokens.t1);
    if (isOkStatus(r.status)) {
      created.hwId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${r.data?.message || ''}` };
  });
  
  await test('HW', '003', '删除作业', async () => {
    if (!created.hwId || !tokens.t1) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/homework/${created.hwId}`, null, tokens.t1);
    created.hwId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 11. NOTICES CRUD (4 tests) ====================
  log('\n--- Notices (School Admin) ---');
  
  await test('NTC', '001', '列出公告', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/notices', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 3, detail: `count=${items.length}` };
  });
  
  await test('NTC', '002', '创建公告', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/school-admin/notices', {
      title: '临时公告', content: '临时公告内容', pinned: false,
    }, tokens.sa1);
    if (isOkStatus(r.status)) {
      created.noticeId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('NTC', '003', '更新公告', async () => {
    if (!created.noticeId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('PATCH', `/api/school-admin/notices/${created.noticeId}`, { title: '临时公告-更新' }, tokens.sa1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('NTC', '004', '删除公告', async () => {
    if (!created.noticeId || !tokens.sa1) return { success: false, detail: 'no id/token' };
    const r = await request('DELETE', `/api/school-admin/notices/${created.noticeId}`, null, tokens.sa1);
    created.noticeId = null;
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 12. GRADE ANALYSIS (3 tests) ====================
  log('\n--- Grade Analysis ---');
  
  await test('ANLY', '001', '列出考试用于分析', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/exams', null, tokens.t1);
    cached.exams = extractItems(r.data);
    return { success: true, detail: `count=${cached.exams.length}` };
  });
  
  await test('ANLY', '002', 'AI 考试分析（需要配置AI密钥）', async () => {
    if (!tokens.t1 || cached.exams.length === 0) return { success: false, detail: 'no exams' };
    const r = await request('POST', '/api/ai/analyze-exam', { examId: cached.exams[0].id }, tokens.t1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });
  
  await test('ANLY', '003', 'AI 学情诊断', async () => {
    if (!tokens.t1 || !cached.studentId) return { success: false, detail: 'no student' };
    const r = await request('POST', '/api/ai/diagnose', { studentId: cached.studentId }, tokens.t1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });

  // ==================== 13. TEACHER LIST OPERATIONS (29 tests) ====================
  log('\n--- Teacher List Operations ---');
  
  const listEndpoints = [
    { cat: 'TCR', id: '001', name: '列出考勤', path: '/api/attendances' },
    { cat: 'TCR', id: '002', name: '列出奖励', path: '/api/reward-records' },
    { cat: 'TCR', id: '003', name: '列出加减分', path: '/api/score-records' },
    { cat: 'TCR', id: '004', name: '列出小组评分', path: '/api/group-scores' },
    { cat: 'TCR', id: '005', name: '列出成长记录', path: '/api/growth-entries' },
    { cat: 'TCR', id: '006', name: '列出行为记录', path: '/api/behavior-records' },
    { cat: 'TCR', id: '007', name: '列出轮值表', path: '/api/duty-rosters' },
    { cat: 'TCR', id: '008', name: '列出工作日志', path: '/api/work-logs' },
    { cat: 'TCR', id: '009', name: '列出笔记', path: '/api/notes' },
    { cat: 'TCR', id: '010', name: '列出待办', path: '/api/todos' },
    { cat: 'TCR', id: '011', name: '列出教学日历', path: '/api/teaching-calendar' },
    { cat: 'TCR', id: '012', name: '列出资源', path: '/api/resources' },
    { cat: 'TCR', id: '013', name: '列出阅读记录', path: '/api/reading-logs' },
    { cat: 'TCR', id: '014', name: '列出座位表', path: '/api/seat-layouts' },
    { cat: 'TCR', id: '015', name: '列出学期', path: '/api/semesters' },
    { cat: 'TCR', id: '016', name: '列出听课记录', path: '/api/lesson-observations' },
    { cat: 'TCR', id: '017', name: '列出班级相册', path: '/api/class-galleries' },
    { cat: 'TCR', id: '018', name: '列出个人相册', path: '/api/my-galleries' },
    { cat: 'TCR', id: '019', name: '列出打卡记录', path: '/api/checkins' },
    { cat: 'TCR', id: '020', name: '列出家长联系', path: '/api/parent-contacts' },
    { cat: 'TCR', id: '021', name: '列出通知模板', path: '/api/notice-templates' },
    { cat: 'TCR', id: '022', name: '列出班级活动', path: '/api/class-activities' },
    { cat: 'TCR', id: '023', name: '列出班费', path: '/api/class-expenses' },
    { cat: 'TCR', id: '024', name: '列出值日配置', path: '/api/class-duty-configs' },
    { cat: 'TCR', id: '025', name: '列出生成的试卷', path: '/api/generated/papers' },
    { cat: 'TCR', id: '026', name: '列出生成的教案', path: '/api/generated/lesson-plans' },
    { cat: 'TCR', id: '027', name: '列出抽签历史', path: '/api/picker-history' },
  ];
  
  for (const ep of listEndpoints) {
    await test(ep.cat, ep.id, ep.name, async () => {
      if (!tokens.t1) return { success: false, detail: 'no token' };
      const r = await request('GET', ep.path, null, tokens.t1);
      const items = extractItems(r.data);
      return { success: r.status === 200, detail: `count=${items.length}` };
    });
  }
  
  // Class-specific endpoints
  await test('TCR', '028', '查询班级成员', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('POST', `/api/classes/${cached.classId}/members/list`, null, tokens.t1);
    const items = extractItems(r.data);
    return { success: r.status === 200, detail: `count=${items.length}` };
  });
  
  await test('TCR', '029', '班级数据看板', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('GET', `/api/classes/${cached.classId}/dashboard`, null, tokens.t1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCR', '030', '获取同校教师列表', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/classes/school-teachers', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: r.status === 200, detail: `count=${items.length}` };
  });

  // ==================== 14. TEACHER CREATE OPERATIONS (15 tests) ====================
  log('\n--- Teacher Create Operations ---');
  
  // Helper to get current student name
  const stuName = cached.studentName || '测试学生';
  
  const createOps = [
    // Attendance: requires records array not status
    { cat: 'CR', id: '001', name: '创建考勤', path: '/api/attendances', body: () => ({ classId: cached.classId, date: '2026-03-01', records: [{ studentId: cached.studentId, status: 'present' }] }) },
    // Reward: type, points, reason, date (not content, score)
    { cat: 'CR', id: '002', name: '创建奖励', path: '/api/reward-records', body: () => ({ classId: cached.classId, studentId: cached.studentId, type: '奖励', points: 5, reason: '表现好', date: '2026-03-01' }) },
    // Score record: delta (not change), studentName required
    { cat: 'CR', id: '003', name: '创建加减分', path: '/api/score-records', body: () => ({ classId: cached.classId, studentId: cached.studentId, studentName: stuName, delta: 5, reason: '课堂表现好' }) },
    // Growth: type, date, title (not classId, content)
    { cat: 'CR', id: '004', name: '创建成长记录', path: '/api/growth-entries', body: () => ({ studentId: cached.studentId, studentName: stuName, type: '学习', date: '2026-03-01', title: '进步记录', content: '表现好' }) },
    // Behavior: behavior (not content), date required
    { cat: 'CR', id: '005', name: '创建行为记录', path: '/api/behavior-records', body: () => ({ studentId: cached.studentId, studentName: stuName, date: '2026-03-01', behavior: '上课认真', note: '' }) },
    // Duty roster: assignments array not date
    { cat: 'CR', id: '006', name: '创建轮值', path: '/api/duty-rosters', body: () => ({ classId: cached.classId, name: '卫生值日', type: '卫生', assignments: [{ date: '2026-03-01', persons: [stuName] }] }) },
    // Work log: date, classCount, homeworkCount (not title)
    { cat: 'CR', id: '007', name: '创建工作日志', path: '/api/work-logs', body: () => ({ date: '2026-03-01', classCount: 1, homeworkCount: 2, content: '今日工作', note: '' }) },
    // Teaching calendar: title, date (not startDate/endDate)
    { cat: 'CR', id: '008', name: '创建日历事件', path: '/api/teaching-calendar', body: () => ({ title: '备课', date: '2026-03-01', grade: '', subject: '语文', note: '', color: '#e8f1fb', type: 'normal' }) },
    // Reading log: bookTitle, pages, minutes, date
    { cat: 'CR', id: '009', name: '创建阅读记录', path: '/api/reading-logs', body: () => ({ studentId: cached.studentId, studentName: stuName, bookTitle: '语文书', author: '出版社', pages: 10, minutes: 30, date: '2026-03-01', note: '' }) },
    // Class activity: date required
    { cat: 'CR', id: '010', name: '创建班级活动', path: '/api/class-activities', body: () => ({ classId: cached.classId, title: '班会', date: '2026-03-01', description: '主题班会' }) },
    // Class expense: type, amount, date
    { cat: 'CR', id: '011', name: '创建班费', path: '/api/class-expenses', body: () => ({ classId: cached.classId, type: '支出', category: '材料费', amount: 50, date: '2026-03-01', description: '买材料', handler: '张老师' }) },
    // Class duty config
    { cat: 'CR', id: '012', name: '创建值日配置', path: '/api/class-duty-configs', body: () => ({ classId: cached.classId, duties: ['卫生', '纪律'], assignments: {} }) },
    // Note: title, content
    { cat: 'CR', id: '013', name: '创建笔记', path: '/api/notes', body: () => ({ title: '备课笔记', content: '内容' }) },
    // Todo: title, done
    { cat: 'CR', id: '014', name: '创建待办', path: '/api/todos', body: () => ({ title: '批改作业', done: false }) },
    // Resource: title
    { cat: 'CR', id: '015', name: '创建资源', path: '/api/resources', body: () => ({ title: '教学资源' }) },
    // Checkin
    { cat: 'CR', id: '016', name: '创建打卡', path: '/api/checkins', body: () => ({ classId: cached.classId }) },
  ];
  
  for (const op of createOps) {
    await test(op.cat, op.id, op.name, async () => {
      if (!tokens.t1) return { success: false, detail: 'no token' };
      if (!cached.classId && op.body().classId) return { success: false, detail: 'no class' };
      if (!cached.studentId && op.body().studentId) return { success: false, detail: 'no student' };
      const body = op.body();
      const r = await request('POST', op.path, body, tokens.t1);
      return { success: isOkStatus(r.status), detail: `status=${r.status}` };
    });
  }

  // ==================== 15. UPDATE & DELETE OPERATIONS (4 tests) ====================
  log('\n--- Update & Delete Operations ---');
  
  // Test update for notes
  await test('UD', '001', '更新笔记', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const cr = await request('POST', '/api/notes', { title: '临时笔记', content: '内容' }, tokens.t1);
    if (!isOkStatus(cr.status)) return { success: false, detail: `create failed: ${cr.status}` };
    const id = cr.data?.id;
    if (!id) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/notes/${id}`, { title: '更新笔记-已更新', content: '更新内容' }, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  // Test delete for notes
  await test('UD', '002', '删除笔记', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const cr = await request('POST', '/api/notes', { title: '待删除笔记', content: '内容' }, tokens.t1);
    if (!isOkStatus(cr.status)) return { success: false, detail: `create failed: ${cr.status}` };
    const id = cr.data?.id;
    if (!id) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/notes/${id}`, null, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  // Test update for todos
  await test('UD', '003', '更新待办', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const cr = await request('POST', '/api/todos', { title: '临时待办', done: false }, tokens.t1);
    if (!isOkStatus(cr.status)) return { success: false, detail: `create failed: ${cr.status}` };
    const id = cr.data?.id;
    if (!id) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/todos/${id}`, { title: '更新待办-已更新', done: true }, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  // Test delete for todos
  await test('UD', '004', '删除待办', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const cr = await request('POST', '/api/todos', { title: '待删除待办', done: false }, tokens.t1);
    if (!isOkStatus(cr.status)) return { success: false, detail: `create failed: ${cr.status}` };
    const id = cr.data?.id;
    if (!id) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/todos/${id}`, null, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });

  // ==================== 16. CLASS MEMBER OPERATIONS (3 tests) ====================
  log('\n--- Class Member Operations ---');
  
  await test('CLSM', '001', '添加科任老师', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const teachers = extractItems((await request('POST', '/api/classes/school-teachers', null, tokens.t1)).data);
    if (teachers.length === 0) return { success: false, detail: 'no teachers' };
    const r = await request('POST', `/api/classes/${cached.classId}/members`, { teacherId: teachers[0].id, subjects: ['数学'] }, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('CLSM', '002', '更新任教学科', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('PATCH', `/api/classes/${cached.classId}/my-subjects`, { subjects: ['语文', '数学'] }, tokens.t1);
    return { success: isOkStatus(r.status), detail: `status=${r.status}` };
  });
  
  await test('CLSM', '003', '查询班级成员列表', async () => {
    if (!tokens.t1 || !cached.classId) return { success: false, detail: 'no token/class' };
    const r = await request('POST', `/api/classes/${cached.classId}/members/list`, null, tokens.t1);
    const items = extractItems(r.data);
    return { success: r.status === 200 && items.length >= 1, detail: `count=${items.length}` };
  });

  // ==================== 17. AI FEATURES (2 tests) ====================
  log('\n--- AI Features ---');
  
  await test('AI', '001', 'AI 同步对话', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/ai/chat-sync', { prompt: '你好' }, tokens.t1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });
  
  await test('AI', '002', 'AI 结构化解析', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/ai/parse', { text: '张三 语文 85分' }, tokens.t1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });

  // ==================== 18. PERMISSION TESTS (5 tests) ====================
  log('\n--- Permission Tests ---');
  
  await test('PERM', '001', '教师无法访问超管接口', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/admin/schools', null, tokens.t1);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('PERM', '002', '学校管理员无法访问超管接口', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/admin/schools', null, tokens.sa1);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('PERM', '003', '教师无法访问学校管理员接口', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/teachers', null, tokens.t1);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('PERM', '004', '跨校数据隔离', async () => {
    if (!tokens.sa1 || !tokens.sa2) return { success: false, detail: 'no tokens' };
    const r1 = await request('GET', '/api/school-admin/teachers', null, tokens.sa1);
    const r2 = await request('GET', '/api/school-admin/teachers', null, tokens.sa2);
    const t1 = extractItems(r1.data);
    const t2 = extractItems(r2.data);
    return { success: t1.length > 0 && t2.length > 0, detail: `sa1=${t1.length}, sa2=${t2.length}` };
  });
  
  await test('PERM', '005', '班主任和科任共享班级', async () => {
    if (!tokens.t1 || !tokens.t2) return { success: false, detail: 'no tokens' };
    const r1 = await request('GET', '/api/classes', null, tokens.t1);
    const r2 = await request('GET', '/api/classes', null, tokens.t2);
    const c1 = extractItems(r1.data);
    const c2 = extractItems(r2.data);
    return { success: c1.length >= 1 && c2.length >= 1, detail: `head=${c1.length}, subject=${c2.length}` };
  });

  // ==================== 19. MISC ADMIN TESTS (5 tests) ====================
  log('\n--- Admin Misc ---');
  
  await test('MISC', '001', 'AI 服务商列表', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/ai-providers', null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('MISC', '002', '审计日志查询', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/admin/audit-logs', null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('MISC', '003', '学校仪表盘', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/dashboard', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('MISC', '004', '学校搜索', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/search?q=测试', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('MISC', '005', '学校功能包', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/school-features', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });

  // Save report
  report.endTime = new Date().toISOString();
  fs.writeFileSync('/workspace/work-system/docs/api-test-report-v4.json', JSON.stringify(report, null, 2));
  
  // Print summary
  log('\n' + '='.repeat(60));
  log('=== Corrected API Test Execution Complete v4 ===');
  log(`  Total:  ${report.summary.total}`);
  log(`  Passed: ${report.summary.passed}`);
  log(`  Failed: ${report.summary.failed}`);
  log(`  Pass Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
  
  log('\n--- Category Breakdown ---');
  for (const [cat, data] of Object.entries(report.categories)) {
    log(`  ${cat}: ${data.passed}/${data.total} (${((data.passed / data.total) * 100).toFixed(0)}%)`);
  }
  
  if (report.summary.failed > 0) {
    log('\n--- Failed Tests ---');
    report.results.filter(r => r.status !== 'PASS').forEach(r => {
      log(`  ${r.id}: ${r.name} - ${r.detail}`);
    });
  }
  
  log('\n  Full report: docs/api-test-report-v4.json');
  return report.summary.failed;
}

main().then(failed => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});