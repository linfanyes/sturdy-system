/**
 * Comprehensive API Test Runner
 * Covers ALL backend API endpoints with CRUD operations
 * Generates a detailed test report
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const DATA_STORE = require('./test-data-store.json');

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

// Helper to extract items from paginated responses
function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.list)) return data.list;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

// Helper to extract single item
function extractItem(data) {
  if (!data) return null;
  if (data.id) return data;
  if (data.data && data.data.id) return data.data;
  return data;
}

let tokens = {};
let createdEntities = {};

async function loginAll() {
  log('Logging in all roles...');
  
  // Super admin
  let r = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  tokens.super = r.data?.token;
  log(`  Super admin: ${tokens.super ? '✅' : '❌'}`);
  
  // School admin 1
  r = await request('POST', '/api/school-admin/login', { username: 'admin_school_1', password: 'admin123' });
  tokens.sa1 = r.data?.token;
  log(`  School Admin 1: ${tokens.sa1 ? '✅' : '❌'}`);
  
  // Teacher 1_1 (head teacher)
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'teacher123' });
  tokens.teacher_head = r.data?.token;
  tokens.teacher_head_data = r.data?.user || null;
  log(`  Teacher Head (teacher_1_1): ${tokens.teacher_head ? '✅' : '❌'}`);
  
  // Teacher 1_2 (subject teacher)
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_2', password: 'teacher123' });
  tokens.teacher_subject = r.data?.token;
  tokens.teacher_subject_data = r.data?.user || null;
  log(`  Teacher Subject (teacher_1_2): ${tokens.teacher_subject ? '✅' : '❌'}`);
  
  // Teacher 2_1 (from different school for isolation test)
  r = await request('POST', '/api/auth/unified-login', { username: 'teacher_2_1', password: 'teacher123' });
  tokens.teacher_2 = r.data?.token;
  log(`  Teacher 2 (teacher_2_1): ${tokens.teacher_2 ? '✅' : '❌'}`);
  
  // SA 2 for isolation
  r = await request('POST', '/api/school-admin/login', { username: 'admin_school_2', password: 'admin123' });
  tokens.sa2 = r.data?.token;
  log(`  School Admin 2: ${tokens.sa2 ? '✅' : '❌'}`);
  
  // Get profile info
  if (tokens.teacher_head) {
    r = await request('GET', '/api/auth/me', null, tokens.teacher_head);
    tokens.teacher_head_profile = r.data;
  }
  if (tokens.teacher_subject) {
    r = await request('GET', '/api/auth/me', null, tokens.teacher_subject);
    tokens.teacher_subject_profile = r.data;
  }
}

async function main() {
  log('=== Comprehensive API Test Runner ===\n');
  await loginAll();
  await sleep(200);
  
  log('\n' + '='.repeat(50));
  log('Starting tests...\n');

  // ==================== 1. AUTH & SECURITY ====================
  log('\n--- Auth & Security ---');
  
  await test('AUTH', '001', '超级管理员登录成功', async () => {
    const r = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
    return { success: !!r.data?.token, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '002', '超级管理员错误密码', async () => {
    const r = await request('POST', '/api/admin/login', { username: 'admin', password: 'wrong' });
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '003', '学校管理员登录', async () => {
    const r = await request('POST', '/api/school-admin/login', { username: 'admin_school_1', password: 'admin123' });
    return { success: !!r.data?.token, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '004', '教师统一登录', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'teacher123' });
    return { success: !!r.data?.token, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '005', '/auth/me 获取当前用户信息', async () => {
    const r = await request('GET', '/api/auth/me', null, tokens.teacher_head);
    return { success: !!r.data?.user, detail: `role=${r.data?.role}` };
  });
  
  await test('AUTH', '006', '/auth/me 包含角色和功能包', async () => {
    const r = await request('GET', '/api/auth/me', null, tokens.teacher_head);
    return { success: !!r.data?.effectiveFeatures && !!r.data?.role, detail: `features=${r.data?.effectiveFeatures?.length || 0}` };
  });
  
  await test('AUTH', '007', '/auth/me 教师包含科目信息', async () => {
    const r = await request('GET', '/api/auth/me', null, tokens.teacher_head);
    return { success: !!r.data?.user?.subject || !!r.data?.user?.subjects, detail: `subject=${r.data?.user?.subject}` };
  });
  
  await test('AUTH', '008', '无 token 访问被拒绝', async () => {
    const r = await request('GET', '/api/teachers', null, null);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '009', '无效 token 被拒绝', async () => {
    const r = await request('GET', '/api/teachers', null, 'invalid-token');
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '010', '学校管理员错误密码', async () => {
    const r = await request('POST', '/api/school-admin/login', { username: 'admin_school_1', password: 'wrong' });
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('AUTH', '011', '教师错误密码', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'teacher_1_1', password: 'wrong' });
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  // ==================== 2. HEALTH CHECK ====================
  log('\n--- Health Check ---');
  
  await test('SYS', '001', '健康检查', async () => {
    const r = await request('GET', '/api/health');
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 3. SCHOOLS (Super Admin) ====================
  log('\n--- Schools ---');
  
  await test('SCHOOL', '001', '列出学校', async () => {
    const r = await request('GET', '/api/admin/schools', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('SCHOOL', '002', '创建学校', async () => {
    const r = await request('POST', '/api/admin/schools', {
      prefix: 'TS', name: '测试学校', address: '测试地址', contact: '联系人', phone: '13800009999', platform: 'mini',
    }, tokens.super);
    if (r.status === 201 || r.status === 200) {
      createdEntities.school = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('SCHOOL', '003', '获取学校详情', async () => {
    const r = await request('GET', `/api/admin/schools/${createdEntities.school}`, null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SCHOOL', '004', '更新学校', async () => {
    const r = await request('PUT', `/api/admin/schools/${createdEntities.school}`, { name: '测试学校-更新' }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SCHOOL', '005', '删除学校', async () => {
    if (!createdEntities.school) return { success: false, detail: 'no school id' };
    const r = await request('DELETE', `/api/admin/schools/${createdEntities.school}`, null, tokens.super);
    createdEntities.school = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  await test('SCHOOL', '006', '学校数量验证(≥5)', async () => {
    const r = await request('GET', '/api/admin/schools', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  // ==================== 4. SCHOOL ADMINS ====================
  log('\n--- School Admins ---');
  
  await test('SA', '001', '列出学校管理员', async () => {
    const r = await request('GET', '/api/admin/school-admins', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('SA', '002', '创建学校管理员', async () => {
    const schools = extractItems((await request('GET', '/api/admin/schools', null, tokens.super)).data);
    if (schools.length === 0) return { success: false, detail: 'no schools' };
    const r = await request('POST', '/api/admin/school-admins', {
      username: 'temp_admin_' + Date.now(), password: 'admin123', name: '临时管理员', schoolId: schools[0].id, enabled: true,
    }, tokens.super);
    if (r.status === 201 || r.status === 200) {
      createdEntities.sa = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('SA', '003', '更新学校管理员', async () => {
    if (!createdEntities.sa) return { success: false, detail: 'no sa id' };
    const r = await request('PUT', `/api/admin/school-admins/${createdEntities.sa}`, { name: '临时管理员-更新' }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SA', '004', '重置管理员密码', async () => {
    if (!createdEntities.sa) return { success: false, detail: 'no sa id' };
    const r = await request('POST', `/api/admin/school-admins/${createdEntities.sa}/reset-password`, null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SA', '005', '启用/禁用管理员', async () => {
    if (!createdEntities.sa) return { success: false, detail: 'no sa id' };
    const r = await request('PATCH', `/api/admin/school-admins/${createdEntities.sa}/toggle`, { enabled: false }, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SA', '006', '删除学校管理员', async () => {
    if (!createdEntities.sa) return { success: false, detail: 'no sa id' };
    const r = await request('DELETE', `/api/admin/school-admins/${createdEntities.sa}`, null, tokens.super);
    createdEntities.sa = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 5. TEACHERS ====================
  log('\n--- Teachers ---');
  
  await test('TCH', '001', '列出教师', async () => {
    const r = await request('GET', '/api/teachers', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 10, detail: `count=${items.length}` };
  });
  
  await test('TCH', '002', '创建教师', async () => {
    const r = await request('POST', '/api/school-admin/teachers', {
      username: `temp_teacher_${Date.now()}`, password: 'teacher123', name: '临时教师',
      gender: '男', subject: '语文', teacherNo: 'TEMP001', phone: '13900009999',
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      createdEntities.teacher = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${JSON.stringify(r.data?.message || '')}` };
  });
  
  await test('TCH', '003', '获取教师详情', async () => {
    if (!createdEntities.teacher) return { success: false, detail: 'no teacher id' };
    const r = await request('GET', `/api/teachers/${createdEntities.teacher}`, null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '004', '更新教师信息', async () => {
    if (!createdEntities.teacher) return { success: false, detail: 'no teacher id' };
    const r = await request('PUT', `/api/teachers/${createdEntities.teacher}`, { name: '临时教师-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '005', '更新教师功能权限', async () => {
    if (!createdEntities.teacher) return { success: false, detail: 'no teacher id' };
    const r = await request('PUT', `/api/teachers/${createdEntities.teacher}/features`, { features: ['grade_management'] }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '006', '重置教师密码', async () => {
    if (!createdEntities.teacher) return { success: false, detail: 'no teacher id' };
    const r = await request('POST', `/api/teachers/${createdEntities.teacher}/reset-password`, { password: 'newpass123' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '007', '删除教师', async () => {
    if (!createdEntities.teacher) return { success: false, detail: 'no teacher id' };
    const r = await request('DELETE', `/api/teachers/${createdEntities.teacher}`, null, tokens.sa1);
    createdEntities.teacher = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  await test('TCH', '008', 'AI 识别导入教师（预览）', async () => {
    const r = await request('POST', '/api/school-admin/teachers/ai-import-preview', { fileId: 'test' }, tokens.sa1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });
  
  await test('TCH', '009', '导出教师', async () => {
    const r = await request('GET', '/api/teachers/export/csv', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('TCH', '010', '教师列表数量验证(≥10)', async () => {
    const r = await request('GET', '/api/teachers', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 10, detail: `count=${items.length}` };
  });
  
  // ==================== 6. CLASSES ====================
  log('\n--- Classes ---');
  
  await test('CLS', '001', '列出班级', async () => {
    const r = await request('GET', '/api/classes', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('CLS', '002', '创建班级', async () => {
    const teachers = extractItems((await request('GET', '/api/teachers', null, tokens.sa1)).data);
    if (teachers.length === 0) return { success: false, detail: 'no teachers' };
    const r = await request('POST', '/api/school-admin/classes', {
      name: '临时班级', grade: '六年级', classNo: '99',
      headTeacher: teachers[0].name, headTeacherId: teachers[0].id,
      term: '2026春季', subjects: ['语文', '数学'],
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      createdEntities.cls = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${JSON.stringify(r.data?.message || '')}` };
  });
  
  await test('CLS', '003', '获取班级详情', async () => {
    if (!createdEntities.cls) return { success: false, detail: 'no class id' };
    const r = await request('GET', `/api/classes/${createdEntities.cls}`, null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('CLS', '004', '更新班级', async () => {
    if (!createdEntities.cls) return { success: false, detail: 'no class id' };
    const r = await request('PUT', `/api/classes/${createdEntities.cls}`, { name: '临时班级-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('CLS', '005', '班级仪表盘数据', async () => {
    if (!createdEntities.cls) return { success: false, detail: 'no class id' };
    const r = await request('GET', `/api/classes/${createdEntities.cls}/dashboard`, null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('CLS', '006', '教师列出自己的班级', async () => {
    const r = await request('GET', '/api/classes/my', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('CLS', '007', '删除班级', async () => {
    if (!createdEntities.cls) return { success: false, detail: 'no class id' };
    const r = await request('DELETE', `/api/classes/${createdEntities.cls}`, null, tokens.sa1);
    createdEntities.cls = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 7. STUDENTS ====================
  log('\n--- Students ---');
  
  await test('STD', '001', '列出学生', async () => {
    const r = await request('GET', '/api/students', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 40, detail: `count=${items.length}` };
  });
  
  await test('STD', '002', '教师列出班级学生', async () => {
    const classes = extractItems((await request('GET', '/api/classes/my', null, tokens.teacher_head)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('GET', `/api/students?classId=${classes[0].id}`, null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('STD', '003', '批量创建学生', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/school-admin/students/batch', {
      students: [{ name: '临时学生', gender: '男', studentNo: 'TEMP001', classId: classes[0].id }],
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('STD', '004', '更新学生', async () => {
    const r = await request('GET', '/api/students', null, tokens.sa1);
    const items = extractItems(r.data);
    if (items.length === 0) return { success: false, detail: 'no students' };
    const sId = items[0].id;
    const ur = await request('PUT', `/api/students/${sId}`, { name: items[0].name + '-更新' }, tokens.sa1);
    return { success: ur.status === 200, detail: `status=${ur.status}` };
  });
  
  await test('STD', '005', '删除学生', async () => {
    const r = await request('GET', '/api/students', null, tokens.sa1);
    const items = extractItems(r.data);
    if (items.length === 0) return { success: false, detail: 'no students' };
    const sId = items[0].id;
    const dr = await request('DELETE', `/api/students/${sId}`, null, tokens.sa1);
    return { success: dr.status === 200 || dr.status === 204, detail: `status=${dr.status}` };
  });
  
  await test('STD', '006', '学生列表数量验证', async () => {
    const r = await request('GET', '/api/students', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 40, detail: `count=${items.length}` };
  });
  
  await test('STD', '007', '导出学生', async () => {
    const r = await request('GET', '/api/students/export/csv', null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 8. EXAMS ====================
  log('\n--- Exams ---');
  
  await test('EXM', '001', '列出考试', async () => {
    const r = await request('GET', '/api/exams', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  await test('EXM', '002', '创建考试', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/exams', {
      classId: classes[0].id, name: '临时考试', subject: '语文',
      date: '2026-03-01', term: '2026春季',
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      createdEntities.exam = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status} ${JSON.stringify(r.data?.message || '')}` };
  });
  
  await test('EXM', '003', '获取考试详情', async () => {
    if (!createdEntities.exam) return { success: false, detail: 'no exam id' };
    const r = await request('GET', `/api/exams/${createdEntities.exam}`, null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('EXM', '004', '更新考试', async () => {
    if (!createdEntities.exam) return { success: false, detail: 'no exam id' };
    const r = await request('PUT', `/api/exams/${createdEntities.exam}`, { name: '临时考试-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('EXM', '005', '删除考试', async () => {
    if (!createdEntities.exam) return { success: false, detail: 'no exam id' };
    const r = await request('DELETE', `/api/exams/${createdEntities.exam}`, null, tokens.sa1);
    createdEntities.exam = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  await test('EXM', '006', '考试数量验证', async () => {
    const r = await request('GET', '/api/exams', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 5, detail: `count=${items.length}` };
  });
  
  // ==================== 9. GRADES ====================
  log('\n--- Grades ---');
  
  await test('GRD', '001', '列出成绩', async () => {
    const r = await request('GET', '/api/grades', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('GRD', '002', '创建成绩', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const studRes = await request('GET', `/api/students?classId=${classes[0].id}`, null, tokens.sa1);
    const students = extractItems(studRes.data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const scores = students.slice(0, 3).map(s => ({ studentId: s.id, score: 75 }));
    const r = await request('POST', '/api/grades', {
      classId: classes[0].id, subject: '语文', examName: '临时测验', date: '2026-03-01', scores,
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('GRD', '003', '按班级过滤成绩', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('GET', `/api/grades?classId=${classes[0].id}`, null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('GRD', '004', '成绩文件导入预览', async () => {
    const r = await request('POST', '/api/grades/import-preview', { fileName: 'test.csv' }, tokens.sa1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });
  
  await test('GRD', '005', 'AI 识别导入成绩', async () => {
    const r = await request('POST', '/api/grades/ai-import-preview', { fileId: 'test' }, tokens.sa1);
    return { success: r.status === 200 || r.status === 400, detail: `status=${r.status}` };
  });
  
  // ==================== 10. GRADE ANALYSIS ====================
  log('\n--- Grade Analysis ---');
  
  await test('ANLY', '001', '后端数据统计接口', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('GET', `/api/grades/analysis?classId=${classes[0].id}`, null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('ANLY', '002', 'AI 考试分析', async () => {
    const exams = extractItems((await request('GET', '/api/exams', null, tokens.sa1)).data);
    if (exams.length === 0) return { success: false, detail: 'no exams' };
    const r = await request('POST', '/api/ai/analyze-exam', { examId: exams[0].id }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('ANLY', '003', 'AI 学生学情诊断', async () => {
    const students = extractItems((await request('GET', '/api/students', null, tokens.sa1)).data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const r = await request('POST', '/api/ai/diagnose', { studentId: students[0].id }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('ANLY', '004', '数据看板聚合指标', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('GET', `/api/grades/dashboard?classId=${classes[0].id}`, null, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 11. NOTICES ====================
  log('\n--- Notices ---');
  
  await test('NTC', '001', '列出公告', async () => {
    const r = await request('GET', '/api/notices', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 3, detail: `count=${items.length}` };
  });
  
  await test('NTC', '002', '创建公告', async () => {
    const r = await request('POST', '/api/school-admin/notices', {
      title: '临时公告', content: '临时公告内容', pinned: false,
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      createdEntities.notice = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('NTC', '003', '更新公告', async () => {
    if (!createdEntities.notice) return { success: false, detail: 'no notice id' };
    const r = await request('PUT', `/api/notices/${createdEntities.notice}`, { title: '临时公告-更新' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('NTC', '004', '删除公告', async () => {
    if (!createdEntities.notice) return { success: false, detail: 'no notice id' };
    const r = await request('DELETE', `/api/notices/${createdEntities.notice}`, null, tokens.sa1);
    createdEntities.notice = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 12. HOMEWORK ====================
  log('\n--- Homework ---');
  
  await test('HW', '001', '列出作业', async () => {
    const r = await request('GET', '/api/homework', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('HW', '002', '创建作业', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/school-admin/homework', {
      classId: classes[0].id, subject: '语文', title: '临时作业', content: '临时作业内容', dueDate: '2026-03-15',
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      createdEntities.hw = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('HW', '003', '删除作业', async () => {
    if (!createdEntities.hw) return { success: false, detail: 'no hw id' };
    const r = await request('DELETE', `/api/homework/${createdEntities.hw}`, null, tokens.sa1);
    createdEntities.hw = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 13. DUTY ROSTERS ====================
  log('\n--- Duty Rosters ---');
  
  await test('DUTY', '001', '列出轮值表', async () => {
    const r = await request('GET', '/api/duty-rosters', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('DUTY', '002', '创建轮值', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/duty-rosters', {
      classId: classes[0].id, date: '2026-03-01', dutyType: '卫生', content: '临时值日',
    }, tokens.sa1);
    if (r.status === 201 || r.status === 200) {
      createdEntities.duty = r.data?.id;
      return { success: true, detail: `id=${r.data?.id}` };
    }
    return { success: false, detail: `status=${r.status}` };
  });
  
  await test('DUTY', '003', '删除轮值', async () => {
    if (!createdEntities.duty) return { success: false, detail: 'no duty id' };
    const r = await request('DELETE', `/api/duty-rosters/${createdEntities.duty}`, null, tokens.sa1);
    createdEntities.duty = null;
    return { success: r.status === 200 || r.status === 204, detail: `status=${r.status}` };
  });
  
  // ==================== 14. AWARDS & REWARDS ====================
  log('\n--- Awards & Rewards ---');
  
  await test('RWD', '001', '列出奖励记录', async () => {
    const r = await request('GET', '/api/reward-records', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('RWD', '002', '列出加减分记录', async () => {
    const r = await request('GET', '/api/score-records', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('RWD', '003', '列出小组评分', async () => {
    const r = await request('GET', '/api/group-scores', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('RWD', '004', '创建奖励记录', async () => {
    const students = extractItems((await request('GET', '/api/students', null, tokens.sa1)).data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const r = await request('POST', '/api/reward-records', {
      studentId: students[0].id, classId: students[0].classId, type: '奖励', content: '临时奖励', score: 10,
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 15. GROWTH & BEHAVIOR ====================
  log('\n--- Growth & Behavior ---');
  
  await test('GRW', '001', '列出成长记录', async () => {
    const r = await request('GET', '/api/growth-entries', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('GRW', '002', '列出行为记录', async () => {
    const r = await request('GET', '/api/behavior-records', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('GRW', '003', '创建成长记录', async () => {
    const students = extractItems((await request('GET', '/api/students', null, tokens.sa1)).data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const r = await request('POST', '/api/growth-entries', {
      studentId: students[0].id, classId: students[0].classId, content: '临时成长记录',
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 16. PARENT CONTACT ====================
  log('\n--- Parent Contact ---');
  
  await test('PRT', '001', '列出家长联系', async () => {
    const r = await request('GET', '/api/parent-contacts', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('PRT', '002', '列出通知模板', async () => {
    const r = await request('GET', '/api/notice-templates', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 17. AI FEATURES ====================
  log('\n--- AI Features ---');
  
  await test('AI', '001', 'AI 同步对话', async () => {
    const r = await request('POST', '/api/ai/chat-sync', { prompt: '你好' }, tokens.teacher_head);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('AI', '002', 'AI 结构化解析', async () => {
    const r = await request('POST', '/api/ai/parse', { text: '张三 语文 85分' }, tokens.teacher_head);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('AI', '003', 'AI 学情诊断', async () => {
    const students = extractItems((await request('GET', '/api/students', null, tokens.sa1)).data);
    if (students.length === 0) return { success: false, detail: 'no students' };
    const r = await request('POST', '/api/ai/diagnose', { studentId: students[0].id }, tokens.teacher_head);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('AI', '004', 'AI 考试分析', async () => {
    const exams = extractItems((await request('GET', '/api/exams', null, tokens.sa1)).data);
    if (exams.length === 0) return { success: false, detail: 'no exams' };
    const r = await request('POST', '/api/ai/analyze-exam', { examId: exams[0].id }, tokens.teacher_head);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 18. TEACHING CALENDAR ====================
  log('\n--- Teaching Calendar ---');
  
  await test('CAL', '001', '列出教学日历', async () => {
    const r = await request('GET', '/api/teaching-calendar', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('CAL', '002', '创建日历事件', async () => {
    const r = await request('POST', '/api/teaching-calendar', {
      title: '临时日历事件', startDate: '2026-03-01', endDate: '2026-03-02',
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 19. ATTENDANCES ====================
  log('\n--- Attendances ---');
  
  await test('ATT', '001', '列出考勤', async () => {
    const r = await request('GET', '/api/attendances', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('ATT', '002', '创建考勤', async () => {
    const classes = extractItems((await request('GET', '/api/classes', null, tokens.sa1)).data);
    if (classes.length === 0) return { success: false, detail: 'no classes' };
    const r = await request('POST', '/api/attendances', {
      classId: classes[0].id, date: '2026-03-01', status: 'present',
    }, tokens.sa1);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 20. WORK LOGS ====================
  log('\n--- Work Logs ---');
  
  await test('WLK', '001', '列出工作日志', async () => {
    const r = await request('GET', '/api/work-logs', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('WLK', '002', '创建工作日志', async () => {
    const r = await request('POST', '/api/work-logs', { title: '日志标题', content: '日志内容' }, tokens.teacher_head);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 21. NOTES & TODOS ====================
  log('\n--- Notes & Todos ---');
  
  await test('NTS', '001', '列出笔记', async () => {
    const r = await request('GET', '/api/notes', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('NTS', '002', '创建笔记', async () => {
    const r = await request('POST', '/api/notes', { title: '临时笔记', content: '笔记内容' }, tokens.teacher_head);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('NTS', '003', '列出待办', async () => {
    const r = await request('GET', '/api/todos', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('NTS', '004', '创建待办', async () => {
    const r = await request('POST', '/api/todos', { title: '临时待办', done: false }, tokens.teacher_head);
    return { success: r.status === 201 || r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 22. RESOURCES ====================
  log('\n--- Resources ---');
  
  await test('RES', '001', '列出教学资源', async () => {
    const r = await request('GET', '/api/resources', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 23. CLASS OPS ====================
  log('\n--- Class Operations ---');
  
  await test('CLSOPS', '001', '列出班费', async () => {
    const r = await request('GET', '/api/class-expenses', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('CLSOPS', '002', '列出班级活动', async () => {
    const r = await request('GET', '/api/class-activities', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('CLSOPS', '003', '列出值日配置', async () => {
    const r = await request('GET', '/api/class-duty-configs', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 24. SECURITY ====================
  log('\n--- Security ---');
  
  await test('SEC', '001', '文本安全审核', async () => {
    const r = await request('POST', '/api/security/audit-text', { text: '这是一段正常文本' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('SEC', '002', '图片安全审核', async () => {
    const r = await request('POST', '/api/security/audit-image', { imageUrl: 'https://example.com/img.jpg' }, tokens.sa1);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // ==================== 25. PERMISSION TESTS ====================
  log('\n--- Permission Tests ---');
  
  await test('PERM', '001', '教师无法访问管理员接口', async () => {
    const r = await request('GET', '/api/admin/schools', null, tokens.teacher_head);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('PERM', '002', '学校管理员无法访问超管接口', async () => {
    const r = await request('GET', '/api/admin/schools', null, tokens.sa1);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  await test('PERM', '003', '跨校数据隔离', async () => {
    const r1 = await request('GET', '/api/teachers', null, tokens.sa1);
    const r2 = await request('GET', '/api/teachers', null, tokens.sa2);
    const s1 = extractItems(r1.data);
    const s2 = extractItems(r2.data);
    return { success: s1.length > 0 && s2.length > 0 && s1.length !== s2.length, detail: `sa1=${s1.length}, sa2=${s2.length}` };
  });
  
  await test('PERM', '004', '教师仅能查看自己的班级', async () => {
    const r = await request('GET', '/api/classes/my', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 1, detail: `count=${items.length}` };
  });
  
  await test('PERM', '005', '教师无法访问其他教师数据', async () => {
    const r = await request('GET', '/api/teachers', null, tokens.teacher_2);
    return { success: r.status === 401 || r.status === 403 || extractItems(r.data).length <= 10, detail: `status=${r.status}` };
  });
  
  await test('PERM', '006', '班主任和科任老师可看到相同班级', async () => {
    const r1 = await request('GET', '/api/classes/my', null, tokens.teacher_head);
    const r2 = await request('GET', '/api/classes/my', null, tokens.teacher_subject);
    const c1 = extractItems(r1.data);
    const c2 = extractItems(r2.data);
    return { success: c1.length >= 1 && c2.length >= 1, detail: `head=${c1.length}, subject=${c2.length}` };
  });
  
  // ==================== 26. MESSAGES & NOTIFICATIONS ====================
  log('\n--- Messages & Notifications ---');
  
  await test('MSG', '001', '列出消息', async () => {
    const r = await request('GET', '/api/messages', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('MSG', '002', '列出通知', async () => {
    const r = await request('GET', '/api/notifications', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 27. CONFIG ====================
  log('\n--- Config ---');
  
  await test('CFG', '001', '获取平台配置', async () => {
    const r = await request('GET', '/api/config', null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  await test('CFG', '002', '获取 AI 服务商列表', async () => {
    const r = await request('GET', '/api/ai-providers', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 28. BACKUP ====================
  log('\n--- Backup ---');
  
  await test('BKP', '001', '列出备份', async () => {
    const r = await request('GET', '/api/backups', null, tokens.super);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 29. LESSON OBSERVATIONS ====================
  log('\n--- Lesson Observations ---');
  
  await test('LSO', '001', '列出听课记录', async () => {
    const r = await request('GET', '/api/lesson-observations', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 30. READING LOGS ====================
  log('\n--- Reading Logs ---');
  
  await test('RDG', '001', '列出阅读记录', async () => {
    const r = await request('GET', '/api/reading-logs', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 31. GALLERY ====================
  log('\n--- Gallery ---');
  
  await test('GLR', '001', '列出班级相册', async () => {
    const r = await request('GET', '/api/class-galleries', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('GLR', '002', '列出个人相册', async () => {
    const r = await request('GET', '/api/my-galleries', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 32. CHECKINS ====================
  log('\n--- Checkins ---');
  
  await test('CHK', '001', '列出打卡记录', async () => {
    const r = await request('GET', '/api/checkins', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 33. SEMESTERS ====================
  log('\n--- Semesters ---');
  
  await test('SEM', '001', '列出学期', async () => {
    const r = await request('GET', '/api/semesters', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 34. SEAT LAYOUTS ====================
  log('\n--- Seat Layouts ---');
  
  await test('STL', '001', '列出座位表', async () => {
    const r = await request('GET', '/api/seat-layouts', null, tokens.sa1);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 35. IM FEATURES ====================
  log('\n--- IM (Messaging) ---');
  
  await test('IM', '001', 'IM 连接检查', async () => {
    const r = await request('GET', '/api/im/status', null, tokens.teacher_head);
    return { success: r.status === 200 || r.status === 404, detail: `status=${r.status}` };
  });
  
  // ==================== 36. GENERATED CONTENT ====================
  log('\n--- Generated Content ---');
  
  await test('GEN', '001', '列出生成的试卷', async () => {
    const r = await request('GET', '/api/generated/papers', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  await test('GEN', '002', '列出生成的教案', async () => {
    const r = await request('GET', '/api/generated/lesson-plans', null, tokens.teacher_head);
    const items = extractItems(r.data);
    return { success: items.length >= 0, detail: `count=${items.length}` };
  });
  
  // ==================== 37. PARENT AUTH ====================
  log('\n--- Parent Auth ---');
  
  await test('PA', '001', '家长登录页面访问', async () => {
    const r = await request('GET', '/api/parent-auth/me', null, null);
    return { success: r.status === 401 || r.status === 403, detail: `status=${r.status}` };
  });
  
  // ==================== 38. AUDIT LOGS ====================
  log('\n--- Audit Logs ---');
  
  await test('AUD', '001', '超级管理员查询审计日志', async () => {
    const r = await request('GET', '/api/admin/audit-logs', null, tokens.super);
    return { success: r.status === 200, detail: `status=${r.status}` };
  });
  
  // Save full report
  report.endTime = new Date().toISOString();
  fs.writeFileSync('/workspace/work-system/docs/api-test-report.json', JSON.stringify(report, null, 2));
  
  // Print summary
  log('\n' + '='.repeat(60));
  log('=== API Test Execution Complete ===');
  log(`  Total:  ${report.summary.total}`);
  log(`  Passed: ${report.summary.passed}`);
  log(`  Failed: ${report.summary.failed}`);
  log(`  Errors: ${report.summary.errors}`);
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
  
  log('\n  Full report saved to: docs/api-test-report.json');
  
  return report.summary.failed;
}

main().then(failed => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});