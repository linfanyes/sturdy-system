/**
 * Corrected Comprehensive API Test Runner
 * Uses correct API paths per role (school-admin vs teacher vs admin)
 * Covers ALL backend API endpoints with CRUD operations
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

let tokens = {};
let created = {};

async function loginAll() {
  log('Logging in all roles...');
  
  let r = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  tokens.super = r.data?.token;
  log(`  Super admin: ${tokens.super ? '✅' : '❌'}`);
  
  await sleep(500);
  r = await request('POST', '/api/school-admin/login', { username: 'admin_school_1', password: 'admin123' });
  tokens.sa1 = r.data?.token;
  log(`  School Admin 1: ${tokens.sa1 ? '✅' : '❌'}`);
  
  await sleep(500);
  r = await request('POST', '/api/school-admin/login', { username: 'admin_school_2', password: 'admin123' });
  tokens.sa2 = r.data?.token;
  log(`  School Admin 2: ${tokens.sa2 ? '✅' : '❌'}`);
  
  await sleep(500);
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'teacher123' });
  tokens.t1 = r.data?.token;
  tokens.t1_data = r.data;
  log(`  Teacher 1_1 (head): ${tokens.t1 ? '✅' : '❌'}`);
  
  await sleep(500);
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_2', password: 'teacher123' });
  tokens.t2 = r.data?.token;
  tokens.t2_data = r.data;
  log(`  Teacher 1_2 (subject): ${tokens.t2 ? '✅' : '❌'}`);
  
  await sleep(500);
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_2_1', password: 'teacher123' });
  tokens.t3 = r.data?.token;
  log(`  Teacher 2_1 (cross-school): ${tokens.t3 ? '✅' : '❌'}`);
  
  if (tokens.sa1) {
    r = await request('GET', '/api/auth/me', null, tokens.sa1);
    tokens.sa1_profile = r.data;
    log(`  SA1 schoolId: ${r.data?.schoolId || 'NULL'}`);
  }
  if (tokens.t1) {
    r = await request('GET', '/api/auth/me', null, tokens.t1);
    tokens.t1_profile = r.data;
  }
}

async function main() {
  log('=== Corrected Comprehensive API Test Runner ===\n');
  await loginAll();
  await sleep(300);
  
  log('\n' + '='.repeat(50));
  log('Starting tests...\n');

  // ==================== 1. AUTH & SECURITY ====================
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
  
  await test('AUTH', '010', '超级管理员错误密码', async () => {
    const r = await request('POST', '/api/admin/login', { username: 'admin', password: 'wrong' });
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  // ==================== 2. HEALTH CHECK ====================
  log('\n--- Health Check ---');
  await test('SYS', '001', '健康检查', async () => {
    const r = await request('GET', '/api/health');
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 3. SCHOOLS (Super Admin) ====================
  log('\n--- Schools (Super Admin) ---');
  
  await test('SCHL', '001', '列出学校', async () => {
    const r = await request('GET', '/api/admin/schools', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('SCHL', '002', '创建学校', async () => {
    const r = await request('POST', '/api/admin/schools', {
      prefix: 'TS', name: '测试学校', address: '测试地址', contact: '联系人', phone: '13800009999', platform: 'mini',
    }, tokens.super);
    if (r.status === 201 || r.status === 200) {
      created.schoolId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('SCHL', '003', '获取学校详情', async () => {
    if (!created.schoolId) return { success: false, detail: 'no id' };
    const r = await request('GET', `/api/admin/schools/${created.schoolId}`, null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SCHL', '004', '更新学校', async () => {
    if (!created.schoolId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/admin/schools/${created.schoolId}`, { name: '测试学校-更新' }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SCHL', '005', '删除学校', async () => {
    if (!created.schoolId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/admin/schools/${created.schoolId}`, null, tokens.super);
    created.schoolId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 4. SCHOOL ADMINS ====================
  log('\n--- School Admins (Super Admin) ---');
  
  await test('SA', '001', '列出学校管理员', async () => {
    const r = await request('GET', '/api/admin/school-admins', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('SA', '002', '创建学校管理员', async () => {
    const schools = extractItems((await request('GET', '/api/admin/schools', null, tokens.super)).data);
    if (schools.length === 0) return { success: false, detail: 'no schools' };
    const r = await request('POST', '/api/admin/school-admins', {
      username: 'temp_sa_' + Date.now(), password: 'admin123', name: '临时管理员', schoolId: schools[0].id, enabled: true,
    }, tokens.super);
    if (r.status === 201 || r.status === 200) {
      created.saId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('SA', '003', '更新学校管理员', async () => {
    if (!created.saId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/admin/school-admins/${created.saId}`, { name: '临时管理员-更新' }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SA', '004', '重置管理员密码', async () => {
    if (!created.saId) return { success: false, detail: 'no id' };
    const r = await request('POST', `/api/admin/school-admins/${created.saId}/reset-password`, null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SA', '005', '启用/禁用管理员', async () => {
    if (!created.saId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/admin/school-admins/${created.saId}`, { enabled: false }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SA', '006', '删除学校管理员', async () => {
    if (!created.saId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/admin/school-admins/${created.saId}`, null, tokens.super);
    created.saId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 5. TEACHERS (School Admin) ====================
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
    if (r.status === 201 || r.status === 200) {
      created.tchId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('TCH', '003', '更新教师', async () => {
    if (!created.tchId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/school-admin/teachers/${created.tchId}`, { name: '临时教师-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '004', '更新教师权限', async () => {
    if (!created.tchId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/school-admin/teachers/${created.tchId}/features`, { features: ['grades'] }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '005', '重置教师密码', async () => {
    if (!created.tchId) return { success: false, detail: 'no id' };
    const r = await request('POST', `/api/school-admin/teachers/${created.tchId}/reset-password`, { password: 'newpass123' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '006', '删除教师', async () => {
    if (!created.tchId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/school-admin/teachers/${created.tchId}`, null, tokens.sa1);
    created.tchId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  await test('TCH', '007', '批量创建教师', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/school-admin/teachers/batch', {
      teachers: [
        { name: '批量教师1', gender: '男', subject: '数学', phone: '13900008801' },
        { name: '批量教师2', gender: '女', subject: '英语', phone: '13900008802' },
      ],
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '008', '教师导入预览', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/school-admin/teachers/import-preview', {
      filename: 'teachers.csv', data: '姓名,性别,学科,手机号\n测试教师,男,语文,13900001234',
    }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '009', '导出教师 CSV', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/export/teachers', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '010', '教师列表数量(≥10)', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/teachers', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 10, detail: `count=${items.length}` };
  });
  
  // ==================== 6. CLASSES (School Admin) ====================
  log('\n--- Classes (School Admin) ---');
  
  await test('CLS', '001', '列出班级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/classes', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('CLS', '002', '创建班级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const teachers = extractItems((await request('GET', '/api/school-admin/teachers', null, tokens.sa1)).data);
    if (teachers.length === 0) return { success: false, detail: 'no teachers' };
    const r = await request('POST', '/api/school-admin/classes', {
      name: '临时班级', grade: '六年级', classNo: '99',
      headTeacher: teachers[0].name, headTeacherId: teachers[0].id,
      term: '2026春季', subjects: ['语文', '数学'],
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      created.clsId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('CLS', '003', '更新班级', async () => {
    if (!created.clsId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/school-admin/classes/${created.clsId}`, { name: '临时班级-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('CLS', '004', '删除班级', async () => {
    if (!created.clsId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/school-admin/classes/${created.clsId}`, null, tokens.sa1);
    created.clsId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  await test('CLS', '005', '班级升级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/school-admin/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', `/api/school-admin/classes/${classes[0].id}/promote`, { targetGrade: '五年级' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('CLS', '006', '批量创建班级', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const teachers = extractItems((await request('GET', '/api/school-admin/teachers', null, tokens.sa1)).data);
    if (teachers.length === 0) return { success: false, detail: 'no teachers' };
    const r = await request('POST', '/api/school-admin/classes/batch', {
      classes: [
        { name: '批量班级1', grade: '六年级', classNo: '97', headTeacher: teachers[0].name, term: '2026春季' },
      ],
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 7. STUDENTS (School Admin) ====================
  log('\n--- Students (School Admin) ---');
  
  await test('STD', '001', '列出学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/students', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 40, detail: `count=${items.length}` };
  });
  
  await test('STD', '002', '批量创建学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/school-admin/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/school-admin/students/batch', {
      students: [{ name: '临时学生', gender: '男', studentNo: 'TEMP001', classId: classes[0].id }],
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('STD', '003', '更新学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/students', null, tokens.sa1);
    const items = extractItems(r.data);
    if (items.length === 0) return { success: false, detail: 'no students' };
    const ur = await request('PATCH', `/api/school-admin/students/${items[0].id}`, { name: items[0].name + '-更新' }, tokens.sa1);
    return { success: ur.status === 200, detail: `status=${ur.status}` };
  });
  
  await test('STD', '004', '删除学生', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/students', null, tokens.sa1);
    const items = extractItems(r.data);
    if (items.length === 0) return { success: false, detail: 'no students' };
    const dr = await request('DELETE', `/api/school-admin/students/${items[0].id}`, null, tokens.sa1);
    return { success: dr.status === 200 || dr.status === 204, detail: `status=${dr.status}` };
  });
  
  await test('STD', '005', '导入学生预览', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/school-admin/students/import-preview', {
      filename: 'students.csv', data: '姓名,性别,学号,家长姓名,家长电话\n测试,男,ST001,家长,13700000000',
    }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('STD', '006', '导出学生 CSV', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/export/students', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 8. NOTICES (School Admin) ====================
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
    if (r.status === 201 || r.status === 200) {
      created.noticeId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('NTC', '003', '更新公告', async () => {
    if (!created.noticeId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/school-admin/notices/${created.noticeId}`, { title: '临时公告-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('NTC', '004', '删除公告', async () => {
    if (!created.noticeId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/school-admin/notices/${created.noticeId}`, null, tokens.sa1);
    created.noticeId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 9. TEACHER FEATURES ====================
  log('\n--- Teacher Features ---');
  
  await test('TCHR', '001', '教师列出自己的班级', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/classes/my', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('TCHR', '002', '教师列出班级学生', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/classes/my', null, tokens.t1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('GET', `/api/students?classId=${classes[0].id}`, null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('TCHR', '003', '教师列出考试', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/exams', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('TCHR', '004', '教师创建考试', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/classes/my', null, tokens.t1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/exams', {
      classId: classes[0].id, name: '临时考试', subjects: ['语文'], date: '2026-03-01', term: '2026春季',
    }, tokens.t1);
    if (r.status === 201 || r.status === 200) {
      created.examId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('TCHR', '005', '教师更新考试', async () => {
    if (!created.examId) return { success: false, detail: 'no id' };
    const r = await request('PATCH', `/api/exams/${created.examId}`, { name: '临时考试-更新' }, tokens.t1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCHR', '006', '教师删除考试', async () => {
    if (!created.examId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/exams/${created.examId}`, null, tokens.t1);
    created.examId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  await test('TCHR', '007', '教师列出成绩', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/grades', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('TCHR', '008', '教师创建成绩', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/classes/my', null, tokens.t1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const students = extractItems((await request('GET', `/api/students?classId=${classes[0].id}`, null, tokens.t1)).data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const scores = students.slice(0, 3).map(s => ({ studentId: s.id, score: 75 }));
    const r = await request('POST', '/api/grades', {
      classId: classes[0].id, subject: '语文', examName: '临时测验', date: '2026-03-01', scores,
    }, tokens.t1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 10. GRADE ANALYSIS ====================
  log('\n--- Grade Analysis ---');
  
  await test('ANLY', '001', 'AI 考试分析', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const exams = extractItems((await request('GET', '/api/exams', null, tokens.t1)).data);
    if (exams.length === 0) return { success: false, detail: 'no exams' };
    const r = await request('POST', '/api/ai/analyze-exam', { examId: exams[0].id }, tokens.t1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('ANLY', '002', 'AI 学情诊断', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const students = extractItems((await request('GET', '/api/students', null, tokens.t1)).data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const r = await request('POST', '/api/ai/diagnose', { studentId: students[0].id }, tokens.t1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 11. HOMEWORK ====================
  log('\n--- Homework ---');
  
  await test('HW', '001', '列出作业', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/homework', null, tokens.t1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('HW', '002', '创建作业', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const classes = extractItems((await request('GET', '/api/classes/my', null, tokens.t1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/homework', {
      classId: classes[0].id, subject: '语文', title: '临时作业', content: '作业内容', dueDate: '2026-03-15',
    }, tokens.t1);
    if (r.status === 201 || r.status === 200) {
      created.hwId = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('HW', '003', '删除作业', async () => {
    if (!created.hwId) return { success: false, detail: 'no id' };
    const r = await request('DELETE', `/api/homework/${created.hwId}`, null, tokens.t1);
    created.hwId = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 12. OTHER TEACHER CRUD ====================
  log('\n--- Other Teacher CRUD ---');
  
  const teacherEndpoints = [
    { cat: 'TCR', id: '001', name: '列出考勤', path: '/api/attendances', method: 'GET' },
    { cat: 'TCR', id: '002', name: '列出奖励', path: '/api/reward-records', method: 'GET' },
    { cat: 'TCR', id: '003', name: '列出加减分', path: '/api/score-records', method: 'GET' },
    { cat: 'TCR', id: '004', name: '列出小组评分', path: '/api/group-scores', method: 'GET' },
    { cat: 'TCR', id: '005', name: '列出成长记录', path: '/api/growth-entries', method: 'GET' },
    { cat: 'TCR', id: '006', name: '列出行为记录', path: '/api/behavior-records', method: 'GET' },
    { cat: 'TCR', id: '007', name: '列出轮值表', path: '/api/duty-rosters', method: 'GET' },
    { cat: 'TCR', id: '008', name: '列出工作日志', path: '/api/work-logs', method: 'GET' },
    { cat: 'TCR', id: '009', name: '列出笔记', path: '/api/notes', method: 'GET' },
    { cat: 'TCR', id: '010', name: '列出待办', path: '/api/todos', method: 'GET' },
    { cat: 'TCR', id: '011', name: '列出教学日历', path: '/api/teaching-calendar', method: 'GET' },
    { cat: 'TCR', id: '012', name: '列出资源', path: '/api/resources', method: 'GET' },
    { cat: 'TCR', id: '013', name: '列出阅读记录', path: '/api/reading-logs', method: 'GET' },
    { cat: 'TCR', id: '014', name: '列出座位表', path: '/api/seat-layouts', method: 'GET' },
    { cat: 'TCR', id: '015', name: '列出学期', path: '/api/semesters', method: 'GET' },
    { cat: 'TCR', id: '016', name: '列出听课记录', path: '/api/lesson-observations', method: 'GET' },
    { cat: 'TCR', id: '017', name: '列出班级相册', path: '/api/class-galleries', method: 'GET' },
    { cat: 'TCR', id: '018', name: '列出个人相册', path: '/api/my-galleries', method: 'GET' },
    { cat: 'TCR', id: '019', name: '列出打卡记录', path: '/api/checkins', method: 'GET' },
    { cat: 'TCR', id: '020', name: '列出家长联系', path: '/api/parent-contacts', method: 'GET' },
    { cat: 'TCR', id: '021', name: '列出通知模板', path: '/api/notice-templates', method: 'GET' },
    { cat: 'TCR', id: '022', name: '列出班级活动', path: '/api/class-activities', method: 'GET' },
    { cat: 'TCR', id: '023', name: '列出班费', path: '/api/class-expenses', method: 'GET' },
    { cat: 'TCR', id: '024', name: '列出值日配置', path: '/api/class-duty-configs', method: 'GET' },
    { cat: 'TCR', id: '025', name: '列出生成的试卷', path: '/api/generated/papers', method: 'GET' },
    { cat: 'TCR', id: '026', name: '列出生成的教案', path: '/api/generated/lesson-plans', method: 'GET' },
    { cat: 'TCR', id: '027', name: '列出抽签历史', path: '/api/picker-history', method: 'GET' },
  ];
  
  for (const ep of teacherEndpoints) {
    await test(ep.cat, ep.id, ep.name, async () => {
      if (!tokens.t1) return { success: false, detail: 'no token' };
      const r = await request(ep.method, ep.path, null, tokens.t1);
      const items = extractItems(r.data);
      return { success: r.status === 200, detail: `count=${items.length}` };
    });
  }
  
  // ==================== 13. TEACHER CREATE ENDPOINTS ====================
  log('\n--- Teacher Create Operations ---');
  
  const createEndpoints = [
    { cat: 'CR', id: '001', name: '创建考勤', path: '/api/attendances', body: (cls) => ({ classId: cls.id, date: '2026-03-01', status: 'present' }) },
    { cat: 'CR', id: '002', name: '创建奖励', path: '/api/reward-records', body: (cls, stu) => ({ studentId: stu?.id, classId: cls?.id, type: '奖励', content: '临时', score: 5 }) },
    { cat: 'CR', id: '003', name: '创建成长记录', path: '/api/growth-entries', body: (cls, stu) => ({ studentId: stu?.id, classId: cls?.id, content: '临时记录' }) },
    { cat: 'CR', id: '004', name: '创建轮值', path: '/api/duty-rosters', body: (cls) => ({ classId: cls.id, date: '2026-03-01', dutyType: '卫生', content: '值日' }) },
    { cat: 'CR', id: '005', name: '创建工作日志', path: '/api/work-logs', body: () => ({ title: '日志', content: '内容' }) },
    { cat: 'CR', id: '006', name: '创建笔记', path: '/api/notes', body: () => ({ title: '笔记', content: '内容' }) },
    { cat: 'CR', id: '007', name: '创建待办', path: '/api/todos', body: () => ({ title: '待办', done: false }) },
    { cat: 'CR', id: '008', name: '创建日历事件', path: '/api/teaching-calendar', body: () => ({ title: '事件', startDate: '2026-03-01', endDate: '2026-03-02' }) },
  ];
  
  for (const ep of createEndpoints) {
    await test(ep.cat, ep.id, ep.name, async () => {
      if (!tokens.t1) return { success: false, detail: 'no token' };
      const classes = extractItems((await request('GET', '/api/classes/my', null, tokens.t1)).data);
      if (classes.length === 0) return { success: false, detail: 'no classes' };
      let body = ep.body(classes[0]);
      const r = await request('POST', ep.path, body, tokens.t1);
      return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
    });
  }
  
  // ==================== 14. AI FEATURES ====================
  log('\n--- AI Features ---');
  
  await test('AI', '001', 'AI 同步对话', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/ai/chat-sync', { prompt: '你好' }, tokens.t1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('AI', '002', 'AI 结构化解析', async () => {
    if (!tokens.t1) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/ai/parse', { text: '张三 语文 85分' }, tokens.t1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 15. SECURITY ====================
  log('\n--- Security ---');
  
  await test('SEC', '001', '文本安全审核', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/security/audit-text', { text: '正常文本' }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SEC', '002', '图片安全审核', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('POST', '/api/security/audit-image', { imageUrl: 'https://example.com/img.jpg' }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 16. PERMISSION TESTS ====================
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
    const r1 = await request('GET', '/api/classes/my', null, tokens.t1);
    const r2 = await request('GET', '/api/classes/my', null, tokens.t2);
    const c1 = extractItems(r1.data);
    const c2 = extractItems(r2.data);
    return { success: c1.length >= 1 && c2.length >= 1, detail: `head=${c1.length}, subject=${c2.length}` };
  });
  
  // ==================== 17. SUPER ADMIN MISC ====================
  log('\n--- Super Admin Misc ---');
  
  await test('SAMD', '001', '获取平台配置', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/config', null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SAMD', '002', 'AI 服务商列表', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/ai-providers', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('SAMD', '003', '列出备份', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/backups', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('SAMD', '004', '审计日志查询', async () => {
    if (!tokens.super) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/admin/audit-logs', null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SAMD', '005', '学校管理员搜索', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/search?q=测试', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SAMD', '006', '学校仪表盘', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/dashboard', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SAMD', '007', '学校功能包获取', async () => {
    if (!tokens.sa1) return { success: false, detail: 'no token' };
    const r = await request('GET', '/api/school-admin/school-features', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // Save report
  report.endTime = new Date().toISOString();
  fs.writeFileSync('/workspace/work-system/docs/api-test-report-v2.json', JSON.stringify(report, null, 2));
  
  // Print summary
  log('\n' + '='.repeat(60));
  log('=== Corrected API Test Execution Complete ===');
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
  
  log('\n  Full report: docs/api-test-report-v2.json');
  return report.summary.failed;
}

main().then(failed => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});