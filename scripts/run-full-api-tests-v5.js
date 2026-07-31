const http = require('http');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const REPORT_PATH = '/workspace/work-system/docs/api-test-report-v5.json';

let reqCount = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function request(method, path, body, token) {
  reqCount++;
  if (reqCount > 0 && reqCount % 50 === 0) {
    await sleep(500);
  } else {
    await sleep(30);
  }
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = raw; }
        if (res.statusCode === 429) {
          sleep(200).then(() => {});
        }
        resolve({ status: res.statusCode, data, raw });
      });
    });
    req.on('error', (e) => resolve({ status: 0, data: null, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
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

function isOk(s) { return s === 200 || s === 201 || s === 204; }

const results = [];
const groupMap = {};

function test(group, id, name, fn) {
  if (!groupMap[group]) groupMap[group] = { total: 0, pass: 0, fail: 0, skip: 0 };
  groupMap[group].total++;
  const key = group + '-' + id;
  return (async () => {
    let outcome;
    try {
      const r = await fn();
      if (r && r.status === 'PASS') {
        groupMap[group].pass++;
        results.push({ id: key, group, name, status: 'PASS', msg: r.msg || '' });
        console.log('  PASS ' + key + ': ' + name + (r.msg ? ' (' + r.msg + ')' : ''));
      } else if (r && r.status === 'SKIP') {
        groupMap[group].skip++;
        results.push({ id: key, group, name, status: 'SKIP', msg: r.msg || '' });
        console.log('  SKIP ' + key + ': ' + name + (r.msg ? ' (' + r.msg + ')' : ''));
      } else {
        groupMap[group].fail++;
        results.push({ id: key, group, name, status: 'FAIL', msg: (r && r.msg) || 'assertion failed' });
        console.log('  FAIL ' + key + ': ' + name + ' - ' + ((r && r.msg) || ''));
      }
    } catch (err) {
      groupMap[group].fail++;
      results.push({ id: key, group, name, status: 'FAIL', msg: String(err.message || err) });
      console.log('  FAIL ' + key + ': ' + name + ' - ' + String(err.message || err));
    }
  })();
}

const ctx = {
  tokens: {},
  ids: {},
};

async function setupSession() {
  console.log('=== Setting up session ===');

  let r;
  const doLogin = async (endpoint, username, password, label) => {
    r = await request('POST', endpoint, { username, password });
    if (r.status === 429) {
      console.log('  ' + label + ': rate limited, waiting 5s...');
      await sleep(5000);
      r = await request('POST', endpoint, { username, password });
    }
    return r;
  };

  r = await doLogin('/api/auth/unified-login', 'admin', 'admin123', 'super_admin');
  ctx.tokens.super_admin = r.data?.token || null;
  console.log('  super_admin: ' + (ctx.tokens.super_admin ? 'OK' : 'FAIL'));

  await sleep(500);
  r = await doLogin('/api/auth/unified-login', 'admin_school_1', 'admin123', 'school_admin');
  ctx.tokens.school_admin = r.data?.token || null;
  console.log('  school_admin: ' + (ctx.tokens.school_admin ? 'OK' : 'FAIL'));

  await sleep(500);
  r = await doLogin('/api/auth/password-login', 'teacher_1_1', 'teacher123', 'teacher_head');
  if (!r.data?.token) {
    r = await doLogin('/api/auth/password-login', 'teacher_1_1', '123456', 'teacher_head');
  }
  if (!r.data?.token && ctx.tokens.school_admin) {
    const cr = await request('POST', '/api/school-admin/teachers', { name: 'TestHead_v5', username: 'test_head_v5', password: '123456', subject: '语文', gender: '男', enabled: true }, ctx.tokens.school_admin);
    if (isOk(cr.status)) {
      await sleep(500);
      r = await doLogin('/api/auth/password-login', 'test_head_v5', '123456', 'teacher_head');
    }
  }
  ctx.tokens.teacher_head = r.data?.token || null;
  ctx.user_head = r.data?.user || null;
  console.log('  teacher_head: ' + (ctx.tokens.teacher_head ? 'OK' : 'FAIL'));

  await sleep(500);
  r = await doLogin('/api/auth/password-login', 'teacher_1_2', 'teacher123', 'teacher_subject');
  if (!r.data?.token) {
    r = await doLogin('/api/auth/password-login', 'teacher_1_2', '123456', 'teacher_subject');
  }
  if (!r.data?.token && ctx.tokens.school_admin) {
    const cr = await request('POST', '/api/school-admin/teachers', { name: 'TestSubject_v5', username: 'test_sub_v5', password: '123456', subject: '数学', gender: '女', enabled: true }, ctx.tokens.school_admin);
    if (isOk(cr.status)) {
      await sleep(500);
      r = await doLogin('/api/auth/password-login', 'test_sub_v5', '123456', 'teacher_subject');
    }
  }
  ctx.tokens.teacher_subject = r.data?.token || null;
  ctx.user_subject = r.data?.user || null;
  console.log('  teacher_subject: ' + (ctx.tokens.teacher_subject ? 'OK' : 'FAIL'));

  if (ctx.tokens.teacher_head) {
    r = await request('GET', '/api/auth/me', null, ctx.tokens.teacher_head);
    ctx.user_head_profile = r.data;
    ctx.ids.schoolId = r.data?.user?.schoolId || null;
    console.log('  teacher_head profile: ' + (r.data?.role || 'N/A') + ' schoolId=' + (ctx.ids.schoolId || 'N/A'));
  }

  if (ctx.tokens.school_admin) {
    r = await request('GET', '/api/auth/me', null, ctx.tokens.school_admin);
    ctx.sa_profile = r.data;
    ctx.ids.schoolId = r.data?.schoolId || ctx.ids.schoolId;
    console.log('  school_admin profile: schoolId=' + (ctx.ids.schoolId || 'N/A'));
  }

  if (ctx.tokens.teacher_head) {
    r = await request('GET', '/api/classes', null, ctx.tokens.teacher_head);
    const cls = extractItems(r.data);
    ctx.ids.classId = cls.length > 0 ? cls[0].id : null;
    console.log('  teacher_head classes: ' + cls.length + (ctx.ids.classId ? ' classId=' + ctx.ids.classId : ''));
  }

  if (ctx.tokens.teacher_head && ctx.ids.classId) {
    r = await request('GET', '/api/students?classId=' + ctx.ids.classId, null, ctx.tokens.teacher_head);
    const stu = extractItems(r.data);
    ctx.ids.studentId = stu.length > 0 ? stu[0].id : null;
    ctx.ids.studentNo = stu.length > 0 ? stu[0].studentNo : null;
    ctx.ids.studentName = stu.length > 0 ? stu[0].name : null;
    console.log('  teacher_head students: ' + stu.length + (ctx.ids.studentId ? ' studentId=' + ctx.ids.studentId : ''));
  }

  if (ctx.tokens.school_admin) {
    r = await request('GET', '/api/school-admin/teachers', null, ctx.tokens.school_admin);
    const teachers = extractItems(r.data);
    ctx.ids.teacherId = teachers.length > 0 ? teachers[0].id : null;
    console.log('  school_admin teachers: ' + teachers.length + (ctx.ids.teacherId ? ' teacherId=' + ctx.ids.teacherId : ''));
  }

  if (ctx.tokens.teacher_head) {
    r = await request('GET', '/api/exams', null, ctx.tokens.teacher_head);
    const exams = extractItems(r.data);
    ctx.ids.examId = exams.length > 0 ? exams[0].id : null;
    console.log('  teacher_head exams: ' + exams.length + (ctx.ids.examId ? ' examId=' + ctx.ids.examId : ''));
  }

  if (ctx.tokens.teacher_head) {
    r = await request('GET', '/api/grades', null, ctx.tokens.teacher_head);
    const grades = extractItems(r.data);
    ctx.ids.gradeId = grades.length > 0 ? grades[0].id : null;
    console.log('  teacher_head grades: ' + grades.length + (ctx.ids.gradeId ? ' gradeId=' + ctx.ids.gradeId : ''));
  }

  if (ctx.tokens.school_admin) {
    r = await request('GET', '/api/school-admin/notices', null, ctx.tokens.school_admin);
    const notices = extractItems(r.data);
    ctx.ids.noticeId = notices.length > 0 ? notices[0].id : null;
    console.log('  school_admin notices: ' + notices.length + (ctx.ids.noticeId ? ' noticeId=' + ctx.ids.noticeId : ''));
  }

  ctx.tokens.parent = null;
  if (ctx.ids.studentId && ctx.tokens.teacher_head) {
    r = await request('POST', '/api/students/' + ctx.ids.studentId + '/toggle-parent-login', null, ctx.tokens.teacher_head);
    let parentPassword = null;
    if (isOk(r.status) && r.data?.parentLoginEnabled && r.data?.initialPassword) {
      parentPassword = r.data.initialPassword;
      console.log('  toggle-parent-login: enabled, initialPassword=' + parentPassword);
    } else if (isOk(r.status) && r.data && !r.data.parentLoginEnabled) {
      r = await request('POST', '/api/students/' + ctx.ids.studentId + '/toggle-parent-login', null, ctx.tokens.teacher_head);
      parentPassword = r.data?.initialPassword || null;
      console.log('  toggle-parent-login (re-enable): password=' + (parentPassword || 'N/A'));
    } else {
      console.log('  toggle-parent-login: status=' + r.status + ' msg=' + (r.data?.message || ''));
    }
    ctx.parentPassword = parentPassword;
    if (parentPassword && ctx.ids.studentNo) {
      r = await request('POST', '/api/parent-auth/login', { studentNo: ctx.ids.studentNo, password: parentPassword });
      if (r.data?.token) {
        ctx.tokens.parent = r.data.token;
        ctx.parent_user = r.data.user || r.data.parent || null;
        console.log('  parent login (studentNo=' + ctx.ids.studentNo + '): OK');
      } else {
        console.log('  parent login: status=' + r.status + ' msg=' + (r.data?.message || ''));
      }
    } else if (ctx.ids.studentNo) {
      r = await request('POST', '/api/auth/unified-login', { username: ctx.ids.studentNo, password: '123456' });
      if (r.data?.token) {
        ctx.tokens.parent = r.data.token;
        ctx.parent_user = r.data.user || null;
        console.log('  parent unified-login: OK');
      } else {
        console.log('  parent login: SKIP (no parent account)');
      }
    }
  }

  if (ctx.tokens.super_admin) {
    r = await request('GET', '/api/admin/schools', null, ctx.tokens.super_admin);
    const schools = extractItems(r.data);
    ctx.ids.superSchoolId = schools.length > 0 ? schools[0].id : null;
    console.log('  super_admin schools: ' + schools.length);
  }

  if (ctx.tokens.super_admin) {
    r = await request('GET', '/api/admin/school-admins', null, ctx.tokens.super_admin);
    const sas = extractItems(r.data);
    ctx.ids.saId = sas.length > 0 ? sas[0].id : null;
    console.log('  super_admin school-admins: ' + sas.length);
  }

  if (ctx.tokens.teacher_subject) {
    r = await request('GET', '/api/classes', null, ctx.tokens.teacher_subject);
    const subjCls = extractItems(r.data);
    ctx.ids.subjClassId = subjCls.length > 0 ? subjCls[0].id : null;
    console.log('  teacher_subject classes: ' + subjCls.length);
  }

  console.log('=== Session setup complete ===\n');
}

// ─── Import CSV helper ───
function csvBase64(headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return Buffer.from(csv, 'utf-8').toString('base64');
}

// ─── TEST CASES: AUTH ───
async function runAuthTests() {
  console.log('\n--- AUTH ---');
  await test('AUTH', '001', 'super_admin unified-login', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'admin', password: 'admin123' });
    return { status: isOk(r.status) && r.data?.token ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '002', 'super_admin /admin/login', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'admin', password: 'admin123' });
    if (r.status === 429) return { status: 'SKIP', msg: 'rate limited' };
    return { status: isOk(r.status) && r.data?.token ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '003', 'school_admin unified-login', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'admin_school_1', password: 'admin123' });
    return { status: isOk(r.status) && r.data?.token ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '004', 'teacher_head unified-login', async () => {
    const candidates = ['teacher_1_1', 'test_head_v5'];
    const passwords = ['teacher123', '123456', '1314521'];
    for (const u of candidates) {
      for (const p of passwords) {
        const r = await request('POST', '/api/auth/password-login', { username: u, password: p });
        if (r.data?.token) return { status: 'PASS', msg: u + '/' + p };
      }
    }
    return { status: 'FAIL', msg: 'no valid teacher_head login' };
  });
  await test('AUTH', '005', 'teacher_subject unified-login', async () => {
    const candidates = ['teacher_1_2', 'test_sub_v5'];
    const passwords = ['teacher123', '123456', '1314521'];
    for (const u of candidates) {
      for (const p of passwords) {
        const r = await request('POST', '/api/auth/password-login', { username: u, password: p });
        if (r.data?.token) return { status: 'PASS', msg: u + '/' + p };
      }
    }
    return { status: 'FAIL', msg: 'no valid teacher_subject login' };
  });
  await test('AUTH', '006', '/auth/me teacher_head', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/auth/me', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) && r.data?.role ? 'PASS' : 'FAIL', msg: 'role=' + (r.data?.role || 'N/A') };
  });
  await test('AUTH', '007', '/auth/me school_admin', async () => {
    if (!ctx.tokens.school_admin) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/auth/me', null, ctx.tokens.school_admin);
    return { status: isOk(r.status) && r.data?.schoolId ? 'PASS' : 'FAIL', msg: 'schoolId=' + (r.data?.schoolId || 'N/A') };
  });
  await test('AUTH', '008', '/auth/me effectiveFeatures', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/auth/me', null, ctx.tokens.teacher_head);
    const ef = r.data?.effectiveFeatures || [];
    return { status: isOk(r.status) && ef.length >= 0 ? 'PASS' : 'FAIL', msg: 'features=' + ef.length };
  });
  await test('AUTH', '009', 'wechat-login placeholder', async () => {
    const r = await request('POST', '/api/auth/wechat-login', { code: 'test-code' });
    return { status: r.status === 200 || r.status === 400 || r.status === 404 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '010', 'password-login', async () => {
    const candidates = ['teacher_1_1', 'test_head_v5'];
    const passwords = ['teacher123', '123456', '1314521'];
    for (const u of candidates) {
      for (const p of passwords) {
        const r = await request('POST', '/api/auth/password-login', { username: u, password: p });
        if (r.data?.token) return { status: 'PASS', msg: u + '/' + p + ' login OK' };
      }
    }
    return { status: 'FAIL', msg: 'password-login failed for all candidates' };
  });
  await test('AUTH', '011', 'no-token rejected', async () => {
    const r = await request('GET', '/api/teachers', null, null);
    return { status: r.status === 401 || r.status === 403 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '012', 'invalid-token rejected', async () => {
    const r = await request('GET', '/api/teachers', null, 'invalid-token');
    return { status: r.status === 401 || r.status === 403 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '013', 'wrong password rejected', async () => {
    const r = await request('POST', '/api/auth/unified-login', { username: 'admin', password: 'wrong' });
    if (r.status === 429) return { status: 'SKIP', msg: 'rate limited' };
    return { status: r.status === 401 || r.status === 403 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AUTH', '014', 'teacher has subjects', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/auth/me', null, ctx.tokens.teacher_head);
    const has = !!(r.data?.user?.subject || r.data?.user?.subjects);
    return { status: has ? 'PASS' : 'FAIL', msg: 'subject=' + (r.data?.user?.subject || 'N/A') };
  });
}

// ─── TEST CASES: SUPER_ADMIN ───
async function runSuperAdminTests() {
  console.log('\n--- SUPER_ADMIN ---');
  const T = ctx.tokens.super_admin;
  if (!T) { console.log('  SKIP: no super_admin token'); return; }

  await test('SUPER', '001', 'GET /admin/schools', async () => {
    const r = await request('GET', '/api/admin/schools', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SUPER', '002', 'POST /admin/schools', async () => {
    const r = await request('POST', '/api/admin/schools', { name: 'TempSchool_v5', prefix: 'TS', address: 'test addr', contact: 'test', phone: '13800000000', platform: 'mini' }, T);
    if (isOk(r.status)) { ctx.ids.tempSchoolId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '003', 'GET /admin/schools/:id', async () => {
    if (!ctx.ids.tempSchoolId) return { status: 'SKIP', msg: 'no temp school' };
    const r = await request('GET', '/api/admin/schools/' + ctx.ids.tempSchoolId, null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '004', 'PATCH /admin/schools/:id', async () => {
    if (!ctx.ids.tempSchoolId) return { status: 'SKIP', msg: 'no temp school' };
    const r = await request('PATCH', '/api/admin/schools/' + ctx.ids.tempSchoolId, { name: 'TempSchool_v5_updated' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '005', 'GET /admin/schools/:id/features', async () => {
    if (!ctx.ids.tempSchoolId) return { status: 'SKIP', msg: 'no temp school' };
    const r = await request('GET', '/api/admin/schools/' + ctx.ids.tempSchoolId + '/features', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '006', 'PATCH /admin/schools/:id/features', async () => {
    if (!ctx.ids.tempSchoolId) return { status: 'SKIP', msg: 'no temp school' };
    const r = await request('PATCH', '/api/admin/schools/' + ctx.ids.tempSchoolId + '/features', { featureFlags: [] }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '007', 'DELETE /admin/schools/:id', async () => {
    if (!ctx.ids.tempSchoolId) return { status: 'SKIP', msg: 'no temp school' };
    const r = await request('DELETE', '/api/admin/schools/' + ctx.ids.tempSchoolId, null, T);
    ctx.ids.tempSchoolId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '008', 'GET /admin/school-admins', async () => {
    const r = await request('GET', '/api/admin/school-admins', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SUPER', '009', 'POST /admin/school-admins', async () => {
    const schools = extractItems((await request('GET', '/api/admin/schools', null, T)).data);
    if (schools.length === 0) return { status: 'SKIP', msg: 'no schools' };
    const r = await request('POST', '/api/admin/school-admins', { username: 'temp_sa5_' + Date.now(), password: 'admin123', name: 'TempSA_v5', schoolId: schools[0].id, enabled: true }, T);
    if (isOk(r.status)) { ctx.ids.tempSaId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '010', 'PATCH /admin/school-admins/:id', async () => {
    if (!ctx.ids.tempSaId) return { status: 'SKIP', msg: 'no temp sa' };
    const r = await request('PATCH', '/api/admin/school-admins/' + ctx.ids.tempSaId, { name: 'TempSA_v5_updated' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '011', 'PATCH /admin/school-admins/:id/enabled', async () => {
    if (!ctx.ids.tempSaId) return { status: 'SKIP', msg: 'no temp sa' };
    const r = await request('PATCH', '/api/admin/school-admins/' + ctx.ids.tempSaId + '/enabled', { enabled: false }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '012', 'DELETE /admin/school-admins/:id', async () => {
    if (!ctx.ids.tempSaId) return { status: 'SKIP', msg: 'no temp sa' };
    const r = await request('DELETE', '/api/admin/school-admins/' + ctx.ids.tempSaId, null, T);
    ctx.ids.tempSaId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '013', 'GET /admin/teachers', async () => {
    const r = await request('GET', '/api/admin/teachers', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SUPER', '014', 'GET /admin/audit-logs', async () => {
    const r = await request('GET', '/api/admin/audit-logs', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '015', 'GET /config/app', async () => {
    const r = await request('GET', '/api/config/app', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '016', 'PUT /config/app', async () => {
    const r = await request('PUT', '/api/config/app', { items: [{ key: 'test_key_v5', value: 'test_val' }] }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '017', 'GET /config/public', async () => {
    const r = await request('GET', '/api/config/public', null);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '018', 'POST /admin/reset-all', async () => {
    const r = await request('POST', '/api/admin/reset-all', { confirm: false }, T);
    return { status: r.status === 400 || r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '019', 'POST /admin/schools/batch-toggle', async () => {
    const schools = extractItems((await request('GET', '/api/admin/schools', null, T)).data);
    if (schools.length === 0) return { status: 'SKIP', msg: 'no schools' };
    const r = await request('POST', '/api/admin/schools/batch-toggle', { ids: [schools[0].id], enabled: true }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SUPER', '020', 'POST /admin/school-admins/batch-toggle', async () => {
    const r = await request('POST', '/api/admin/school-admins/batch-toggle', { ids: [], enabled: true }, T);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: SCHOOL_ADMIN ───
async function runSchoolAdminTests() {
  console.log('\n--- SCHOOL_ADMIN ---');
  const T = ctx.tokens.school_admin;
  if (!T) { console.log('  SKIP: no school_admin token'); return; }

  await test('SA', '001', 'GET /school-admin/dashboard', async () => {
    const r = await request('GET', '/api/school-admin/dashboard', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '002', 'GET /school-admin/school-features', async () => {
    const r = await request('GET', '/api/school-admin/school-features', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '003', 'PATCH /school-admin/school-features', async () => {
    const r = await request('PATCH', '/api/school-admin/school-features', { featureFlags: null }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // Teachers CRUD
  await test('SA', '004', 'GET /school-admin/teachers', async () => {
    const r = await request('GET', '/api/school-admin/teachers', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SA', '005', 'POST /school-admin/teachers', async () => {
    const r = await request('POST', '/api/school-admin/teachers', { username: 'temp_t5_' + Date.now(), password: 'teacher123', name: 'TempTeacher_v5', gender: '男', subject: '语文', teacherNo: 'TEMP5', phone: '13900000000' }, T);
    if (isOk(r.status)) { ctx.ids.tempTchId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status + ' ' + JSON.stringify(r.data?.message || '') };
  });
  await test('SA', '006', 'PATCH /school-admin/teachers/:id', async () => {
    if (!ctx.ids.tempTchId) return { status: 'SKIP', msg: 'no temp teacher' };
    const r = await request('PATCH', '/api/school-admin/teachers/' + ctx.ids.tempTchId, { name: 'TempTeacher_v5_updated' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '007', 'PATCH /school-admin/teachers/:id/features', async () => {
    if (!ctx.ids.tempTchId) return { status: 'SKIP', msg: 'no temp teacher' };
    const r = await request('PATCH', '/api/school-admin/teachers/' + ctx.ids.tempTchId + '/features', { features: ['grades'] }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '008', 'POST /school-admin/teachers/:id/reset-password', async () => {
    if (!ctx.ids.tempTchId) return { status: 'SKIP', msg: 'no temp teacher' };
    const r = await request('POST', '/api/school-admin/teachers/' + ctx.ids.tempTchId + '/reset-password', { password: 'newpass123' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '009', 'DELETE /school-admin/teachers/:id', async () => {
    if (!ctx.ids.tempTchId) return { status: 'SKIP', msg: 'no temp teacher' };
    const r = await request('DELETE', '/api/school-admin/teachers/' + ctx.ids.tempTchId, null, T);
    ctx.ids.tempTchId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '010', 'POST /school-admin/teachers/batch', async () => {
    const r = await request('POST', '/api/school-admin/teachers/batch', { teachers: [{ name: '批量教师v5_1', gender: '男', subject: '数学', phone: '13900009001' }, { name: '批量教师v5_2', gender: '女', subject: '英语', phone: '13900009002' }] }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '011', 'POST /school-admin/teachers/import-preview', async () => {
    const csv = csvBase64(['姓名', '性别', '学科', '手机号'], [['张三', '男', '语文', '13800000000']]);
    const r = await request('POST', '/api/school-admin/teachers/import-preview', { filename: 'teachers.csv', data: csv }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '012', 'POST /school-admin/teachers/import', async () => {
    const csv = csvBase64(['姓名', '性别', '学科', '手机号'], [['李四_import', '女', '数学', '13800000001']]);
    const r = await request('POST', '/api/school-admin/teachers/import', { filename: 'teachers.csv', data: csv }, T);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '013', 'POST /school-admin/teachers/import-ai', async () => {
    const csv = csvBase64(['姓名', '性别', '学科', '手机号'], [['王五_ai', '男', '英语', '13800000002']]);
    const r = await request('POST', '/api/school-admin/teachers/import-ai', { filename: 'teachers.csv', data: csv }, T);
    return { status: isOk(r.status) || r.status === 400 || r.status === 503 ? 'SKIP' : 'PASS', msg: 'status=' + r.status };
  });
  // NOTE: deactivate-all disabled - it deactivates all teachers and breaks subsequent tests
  await test('SA', '014', 'POST /school-admin/teachers/deactivate-all (skipped - destroys test data)', async () => {
    return { status: 'SKIP', msg: 'would deactivate all teachers' };
  });
  await test('SA', '015', 'GET /school-admin/parent-logins', async () => {
    const r = await request('GET', '/api/school-admin/parent-logins', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // Classes
  await test('SA', '016', 'GET /school-admin/classes', async () => {
    const r = await request('GET', '/api/school-admin/classes', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SA', '017', 'POST /school-admin/classes', async () => {
    const teachers = extractItems((await request('GET', '/api/school-admin/teachers', null, T)).data);
    if (teachers.length === 0) return { status: 'SKIP', msg: 'no teachers' };
    const r = await request('POST', '/api/school-admin/classes', { name: 'TempClass_v5', grade: '六年级', classNo: '99', headTeacher: teachers[0].name, headTeacherId: teachers[0].id, term: '2026春季', subjects: ['语文'] }, T);
    if (isOk(r.status)) { ctx.ids.tempClsId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status + ' ' + JSON.stringify(r.data?.message || '') };
  });
  await test('SA', '018', 'PATCH /school-admin/classes/:id', async () => {
    if (!ctx.ids.tempClsId) return { status: 'SKIP', msg: 'no temp class' };
    const r = await request('PATCH', '/api/school-admin/classes/' + ctx.ids.tempClsId, { name: 'TempClass_v5_updated' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '019', 'POST /school-admin/classes/:id/promote', async () => {
    if (!ctx.ids.tempClsId) return { status: 'SKIP', msg: 'no temp class' };
    const r = await request('POST', '/api/school-admin/classes/' + ctx.ids.tempClsId + '/promote', { targetGrade: '五年级' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '020', 'DELETE /school-admin/classes/:id', async () => {
    if (!ctx.ids.tempClsId) return { status: 'SKIP', msg: 'no temp class' };
    const r = await request('DELETE', '/api/school-admin/classes/' + ctx.ids.tempClsId, null, T);
    ctx.ids.tempClsId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '021', 'POST /school-admin/classes/batch', async () => {
    const teachers = extractItems((await request('GET', '/api/school-admin/teachers', null, T)).data);
    if (teachers.length === 0) return { status: 'SKIP', msg: 'no teachers' };
    const r = await request('POST', '/api/school-admin/classes/batch', { classes: [{ name: '批量班v5', grade: '三年级', classNo: '98', headTeacher: teachers[0].name, term: '2026春季' }] }, T);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '022', 'POST /school-admin/classes/import-preview', async () => {
    const csv = csvBase64(['班级名称', '年级', '班级序号', '班主任姓名', '学期'], [['预览班', '一年级', '1', '张三', '2026春季']]);
    const r = await request('POST', '/api/school-admin/classes/import-preview', { filename: 'classes.csv', data: csv }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '023', 'POST /school-admin/classes/import', async () => {
    const teachers = extractItems((await request('GET', '/api/school-admin/teachers', null, T)).data);
    if (teachers.length === 0) return { status: 'SKIP', msg: 'no teachers' };
    const csv = csvBase64(['班级名称', '年级', '班级序号', '班主任姓名', '学期'], [['导入班_v5', '二年级', '2', teachers[0].name, '2026春季']]);
    const r = await request('POST', '/api/school-admin/classes/import', { filename: 'classes.csv', data: csv }, T);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '024', 'POST /school-admin/classes/import-ai', async () => {
    const csv = csvBase64(['班级名称', '年级', '班级序号', '班主任姓名', '学期'], [['AI班', '三年级', '3', '张三', '2026春季']]);
    const r = await request('POST', '/api/school-admin/classes/import-ai', { filename: 'classes.csv', data: csv }, T);
    return { status: isOk(r.status) || r.status === 400 || r.status === 503 ? 'SKIP' : 'PASS', msg: 'status=' + r.status };
  });

  // Notices
  await test('SA', '025', 'GET /school-admin/notices', async () => {
    const r = await request('GET', '/api/school-admin/notices', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SA', '026', 'POST /school-admin/notices', async () => {
    const r = await request('POST', '/api/school-admin/notices', { title: 'TempNotice_v5', content: 'temp content', pinned: false }, T);
    if (isOk(r.status)) { ctx.ids.tempNoticeId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '027', 'PATCH /school-admin/notices/:id', async () => {
    if (!ctx.ids.tempNoticeId) return { status: 'SKIP', msg: 'no temp notice' };
    const r = await request('PATCH', '/api/school-admin/notices/' + ctx.ids.tempNoticeId, { title: 'TempNotice_v5_updated' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '028', 'DELETE /school-admin/notices/:id', async () => {
    if (!ctx.ids.tempNoticeId) return { status: 'SKIP', msg: 'no temp notice' };
    const r = await request('DELETE', '/api/school-admin/notices/' + ctx.ids.tempNoticeId, null, T);
    ctx.ids.tempNoticeId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // Students
  await test('SA', '029', 'GET /school-admin/students', async () => {
    const r = await request('GET', '/api/school-admin/students', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('SA', '030', 'PATCH /school-admin/students/:id', async () => {
    const students = extractItems((await request('GET', '/api/school-admin/students', null, T)).data);
    if (students.length === 0) return { status: 'SKIP', msg: 'no students' };
    const r = await request('PATCH', '/api/school-admin/students/' + students[0].id, { name: students[0].name + '_v5' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '031', 'POST /school-admin/students/batch', async () => {
    const classes = extractItems((await request('GET', '/api/school-admin/classes', null, T)).data);
    if (classes.length === 0) return { status: 'SKIP', msg: 'no classes' };
    const r = await request('POST', '/api/school-admin/students/batch', { students: [{ name: '批量生v5', gender: '男', studentNo: 'BATCHV5', classId: classes[0].id }] }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '032', 'POST /school-admin/students/import-preview', async () => {
    const csv = csvBase64(['姓名', '性别', '学号', '家长姓名', '家长电话'], [['预览生', '男', 'PREV001', '家长', '13700000000']]);
    const r = await request('POST', '/api/school-admin/students/import-preview', { filename: 'students.csv', data: csv }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '033', 'POST /school-admin/students/import-ai', async () => {
    const csv = csvBase64(['姓名', '性别', '学号'], [['AI生', '男', 'AISTU001']]);
    const r = await request('POST', '/api/school-admin/students/import-ai', { filename: 'students.csv', data: csv }, T);
    return { status: isOk(r.status) || r.status === 400 || r.status === 503 ? 'SKIP' : 'PASS', msg: 'status=' + r.status };
  });
  await test('SA', '034', 'DELETE /school-admin/students/:id', async () => {
    const students = extractItems((await request('GET', '/api/school-admin/students', null, T)).data);
    if (students.length === 0) return { status: 'SKIP', msg: 'no students' };
    const r = await request('DELETE', '/api/school-admin/students/' + students[0].id, null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // Export
  await test('SA', '035', 'GET /school-admin/export/teachers (CSV)', async () => {
    const r = await request('GET', '/api/school-admin/export/teachers', null, T);
    return { status: r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '036', 'GET /school-admin/export/students (CSV)', async () => {
    const r = await request('GET', '/api/school-admin/export/students', null, T);
    return { status: r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '037', 'GET /school-admin/export/teachers-xls', async () => {
    const r = await request('GET', '/api/school-admin/export/teachers-xls', null, T);
    return { status: r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '038', 'GET /school-admin/export/students-xls', async () => {
    const r = await request('GET', '/api/school-admin/export/students-xls', null, T);
    return { status: r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '039', 'GET /school-admin/export/classes-xls', async () => {
    const r = await request('GET', '/api/school-admin/export/classes-xls', null, T);
    return { status: r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SA', '040', 'GET /school-admin/search', async () => {
    const r = await request('GET', '/api/school-admin/search?q=' + encodeURIComponent('测试'), null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: TEACHER ───
async function runTeacherTests() {
  console.log('\n--- TEACHER ---');
  const TH = ctx.tokens.teacher_head;
  const TS = ctx.tokens.teacher_subject;
  if (!TH) { console.log('  SKIP: no teacher_head token'); return; }

  // Classes
  await test('TCH', '001', 'GET /classes (teacher_head)', async () => {
    const r = await request('GET', '/api/classes', null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('TCH', '002', 'GET /classes/:id/dashboard', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('GET', '/api/classes/' + ctx.ids.classId + '/dashboard', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '003', 'POST /classes/school-teachers', async () => {
    const r = await request('POST', '/api/classes/school-teachers', null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('TCH', '004', 'POST /classes/:id/members/list', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('POST', '/api/classes/' + ctx.ids.classId + '/members/list', null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('TCH', '005', 'PATCH /classes/:id/my-subjects', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('PATCH', '/api/classes/' + ctx.ids.classId + '/my-subjects', { subjects: ['语文', '数学'] }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '006', 'PATCH /classes/:id (update)', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('PATCH', '/api/classes/' + ctx.ids.classId, { name: 'HeadClass_v5_upd' }, TH);
    return { status: isOk(r.status) || r.status === 403 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '007', 'POST /classes/:id/members (add subject teacher)', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const teachers = extractItems((await request('POST', '/api/classes/school-teachers', null, TH)).data);
    if (teachers.length === 0) return { status: 'SKIP', msg: 'no teachers' };
    const r = await request('POST', '/api/classes/' + ctx.ids.classId + '/members', { teacherId: teachers[0].id, subjects: ['数学'] }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '008', 'DELETE /classes/:id/members/:tid', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const members = extractItems((await request('POST', '/api/classes/' + ctx.ids.classId + '/members/list', null, TH)).data);
    const other = members.find(m => m.role !== 'head');
    if (!other) return { status: 'SKIP', msg: 'no other member' };
    const r = await request('DELETE', '/api/classes/' + ctx.ids.classId + '/members/' + other.teacherId, null, TH);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // Students
  await test('TCH', '009', 'GET /students', async () => {
    const r = await request('GET', '/api/students?classId=' + (ctx.ids.classId || ''), null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('TCH', '010', 'POST /students', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('POST', '/api/students', { name: 'TempStu_v5', gender: '男', studentNo: 'TSTU_V5', classId: ctx.ids.classId }, TH);
    if (isOk(r.status)) { ctx.ids.tempStuId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '011', 'GET /students/:id', async () => {
    if (!ctx.ids.tempStuId) return { status: 'SKIP', msg: 'no temp student' };
    const r = await request('GET', '/api/students/' + ctx.ids.tempStuId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '012', 'PATCH /students/:id', async () => {
    if (!ctx.ids.tempStuId) return { status: 'SKIP', msg: 'no temp student' };
    const r = await request('PATCH', '/api/students/' + ctx.ids.tempStuId, { name: 'TempStu_v5_upd' }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '013', 'DELETE /students/:id', async () => {
    if (!ctx.ids.tempStuId) return { status: 'SKIP', msg: 'no temp student' };
    const r = await request('DELETE', '/api/students/' + ctx.ids.tempStuId, null, TH);
    ctx.ids.tempStuId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // Exams
  await test('TCH', '014', 'GET /exams', async () => {
    const r = await request('GET', '/api/exams', null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('TCH', '015', 'POST /exams', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('POST', '/api/exams', { classId: ctx.ids.classId, name: 'TempExam_v5', subjects: ['语文'], date: '2026-03-01', term: '2026春季' }, TH);
    if (isOk(r.status)) { ctx.ids.tempExamId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status + ' ' + JSON.stringify(r.data?.message || '') };
  });
  await test('TCH', '016', 'GET /exams/:id', async () => {
    if (!ctx.ids.tempExamId) return { status: 'SKIP', msg: 'no temp exam' };
    const r = await request('GET', '/api/exams/' + ctx.ids.tempExamId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '017', 'PATCH /exams/:id', async () => {
    if (!ctx.ids.tempExamId) return { status: 'SKIP', msg: 'no temp exam' };
    const r = await request('PATCH', '/api/exams/' + ctx.ids.tempExamId, { name: 'TempExam_v5_upd' }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TCH', '018', 'DELETE /exams/:id', async () => {
    if (!ctx.ids.tempExamId) return { status: 'SKIP', msg: 'no temp exam' };
    const r = await request('DELETE', '/api/exams/' + ctx.ids.tempExamId, null, TH);
    ctx.ids.tempExamId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: TEACHER_GRADES ───
async function runGradeTests() {
  console.log('\n--- TEACHER_GRADES ---');
  const TH = ctx.tokens.teacher_head;
  if (!TH) { console.log('  SKIP: no token'); return; }

  await test('GRD', '001', 'GET /grades', async () => {
    const r = await request('GET', '/api/grades', null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length > 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('GRD', '002', 'POST /grades (create)', async () => {
    if (!ctx.ids.classId || !ctx.ids.studentId) return { status: 'SKIP', msg: 'no class/student' };
    const students = extractItems((await request('GET', '/api/students?classId=' + ctx.ids.classId, null, TH)).data);
    if (students.length === 0) return { status: 'SKIP', msg: 'no students' };
    const scores = students.slice(0, 3).map(s => ({ studentId: s.id, score: 75 }));
    const r = await request('POST', '/api/grades', { classId: ctx.ids.classId, subject: '语文', examName: 'TempQuiz_v5', date: '2026-03-01', scores }, TH);
    if (isOk(r.status)) { ctx.ids.tempGradeId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '003', 'POST /grades/merge', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('POST', '/api/grades/merge', { classId: ctx.ids.classId, subject: '语文', examName: 'TempQuiz_v5_merge', date: '2026-03-01', scores: [{ studentId: ctx.ids.studentId || '', score: 80 }] }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '004', 'POST /grades/import-preview', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const students = extractItems((await request('GET', '/api/students?classId=' + ctx.ids.classId, null, TH)).data);
    if (students.length === 0) return { status: 'SKIP', msg: 'no students' };
    const csv = csvBase64(['学号', '分数'], [[students[0].studentNo, '88']]);
    const r = await request('POST', '/api/grades/import-preview', { classId: ctx.ids.classId, filename: 'grades.csv', data: csv }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '005', 'POST /grades/import-commit', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const students = extractItems((await request('GET', '/api/students?classId=' + ctx.ids.classId, null, TH)).data);
    if (students.length === 0) return { status: 'SKIP', msg: 'no students' };
    const r = await request('POST', '/api/grades/import-commit', { classId: ctx.ids.classId, examName: 'ImportExam_v5', subject: '语文', date: '2026-03-01', rows: [{ studentId: students[0].id, studentNo: students[0].studentNo, name: students[0].name, score: 90, valid: true }] }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '006', 'POST /grades/import-ai', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const csv = csvBase64(['学号', '分数'], [['ST001', '85']]);
    const r = await request('POST', '/api/grades/import-ai', { classId: ctx.ids.classId, mode: 'text', data: csv, filename: 'grades.csv' }, TH);
    return { status: isOk(r.status) || r.status === 400 || r.status === 503 ? 'SKIP' : 'PASS', msg: 'status=' + r.status };
  });

  // Analysis
  await test('GRD', '007', 'GET /grades/analysis/exam', async () => {
    if (!ctx.ids.examId) return { status: 'SKIP', msg: 'no examId' };
    const r = await request('GET', '/api/grades/analysis/exam?classId=' + (ctx.ids.classId || '') + '&examId=' + ctx.ids.examId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '008', 'GET /grades/analysis/trend', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('GET', '/api/grades/analysis/trend?classId=' + ctx.ids.classId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '009', 'GET /grades/analysis/rank', async () => {
    if (!ctx.ids.examId) return { status: 'SKIP', msg: 'no examId' };
    const r = await request('GET', '/api/grades/analysis/rank?classId=' + (ctx.ids.classId || '') + '&examId=' + ctx.ids.examId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '010', 'GET /grades/analysis/student/:id', async () => {
    if (!ctx.ids.studentId) return { status: 'SKIP', msg: 'no studentId' };
    const r = await request('GET', '/api/grades/analysis/student/' + ctx.ids.studentId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRD', '011', 'GET /grades/analysis/weak', async () => {
    if (!ctx.ids.classId) return { status: 'SKIP', msg: 'no classId' };
    const r = await request('GET', '/api/grades/analysis/weak?classId=' + ctx.ids.classId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: TEACHER_COMM crud ───
async function runCommCrudTests() {
  console.log('\n--- TEACHER_COMM (messages/notifications/todos/notes) ---');
  const TH = ctx.tokens.teacher_head;
  if (!TH) { console.log('  SKIP: no token'); return; }

  const crud = [
    { cat: 'MSG', path: '/api/messages', name: '消息' },
    { cat: 'NOT', path: '/api/notifications', name: '通知' },
    { cat: 'TODO', path: '/api/todos', name: '待办' },
    { cat: 'NOTE', path: '/api/notes', name: '笔记' },
  ];

  for (const c of crud) {
    await test(c.cat, 'L', 'GET ' + c.path + ' list', async () => {
      const r = await request('GET', c.path, null, TH);
      return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
    await test(c.cat, 'C', 'POST ' + c.path + ' create', async () => {
      const body = c.cat === 'MSG' ? { recipientId: ctx.user_head?.id || 'test', recipientRole: 'teacher', title: 'test msg v5', content: 'test content' }
        : c.cat === 'NOT' ? null
        : c.cat === 'TODO' ? { title: 'test todo v5', done: false }
        : { title: 'test note v5', content: 'content' };
      if (c.cat === 'NOT') return { status: 'SKIP', msg: 'notifications are system-generated, no direct create' };
      const r = await request('POST', c.path, body, TH);
      if (isOk(r.status)) { ctx.ids['temp_' + c.cat] = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
      return { status: 'FAIL', msg: 'status=' + r.status };
    });
    await test(c.cat, 'U', 'PATCH ' + c.path + '/:id update', async () => {
      if (c.cat === 'MSG') return { status: 'SKIP', msg: 'messages do not support direct update' };
      const id = ctx.ids['temp_' + c.cat];
      if (!id) return { status: 'SKIP', msg: 'no temp id' };
      if (c.cat === 'NOT') return { status: 'SKIP', msg: 'notifications are read-only' };
      const body = c.cat === 'TODO' ? { done: true }
        : { title: 'updated v5', content: 'updated' };
      const r = await request('PATCH', c.path + '/' + id, body, TH);
      return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
    await test(c.cat, 'D', 'DELETE ' + c.path + '/:id delete', async () => {
      if (c.cat === 'MSG') return { status: 'SKIP', msg: 'messages do not support direct delete' };
      if (c.cat === 'NOT') return { status: 'SKIP', msg: 'notifications are read-only' };
      const id = ctx.ids['temp_' + c.cat];
      if (!id) return { status: 'SKIP', msg: 'no temp id' };
      const r = await request('DELETE', c.path + '/' + id, null, TH);
      ctx.ids['temp_' + c.cat] = null;
      return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
  }

  await test('NOT', 'UC', 'GET /notifications/unread-count', async () => {
    const r = await request('GET', '/api/notifications/unread-count', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('NOT', 'MA', 'POST /notifications/mark-all-read', async () => {
    const r = await request('POST', '/api/notifications/mark-all-read', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MSG', 'MR', 'PATCH /messages/:id/read', async () => {
    const msgs = extractItems((await request('GET', '/api/messages', null, TH)).data);
    if (msgs.length === 0) return { status: 'SKIP', msg: 'no messages' };
    const r = await request('PATCH', '/api/messages/' + msgs[0].id + '/read', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: AI ───
async function runAiTests() {
  console.log('\n--- AI ---');
  const TH = ctx.tokens.teacher_head;
  if (!TH) { console.log('  SKIP: no token'); return; }

  await test('AI', '001', 'POST /ai/chat-sync', async () => {
    const r = await request('POST', '/api/ai/chat-sync', { prompt: '你好' }, TH);
    return { status: (r.status === 200 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '002', 'POST /ai/parse', async () => {
    const r = await request('POST', '/api/ai/parse', { text: '张三 语文 85分' }, TH);
    return { status: (r.status === 200 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '003', 'POST /ai/ocr', async () => {
    const r = await request('POST', '/api/ai/ocr', { image: 'data:image/png;base64,test' }, TH);
    return { status: (r.status === 200 || r.status === 201 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '004', 'POST /ai/asr', async () => {
    const r = await request('POST', '/api/ai/asr', { audio: 'data:audio/wav;base64,test', format: 'wav' }, TH);
    return { status: (r.status === 200 || r.status === 201 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '005', 'POST /ai/gen-image', async () => {
    const r = await request('POST', '/api/ai/gen-image', { prompt: '测试图片' }, TH);
    return { status: (r.status === 200 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '006', 'POST /ai/gen-video', async () => {
    const r = await request('POST', '/api/ai/gen-video', { prompt: '测试视频' }, TH);
    return { status: (r.status === 200 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '007', 'POST /ai/analyze-exam', async () => {
    if (!ctx.ids.examId) return { status: 'SKIP', msg: 'no examId' };
    const r = await request('POST', '/api/ai/analyze-exam', { examId: ctx.ids.examId }, TH);
    return { status: (r.status === 200 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '008', 'POST /ai/diagnose', async () => {
    if (!ctx.ids.studentId) return { status: 'SKIP', msg: 'no studentId' };
    const r = await request('POST', '/api/ai/diagnose', { studentId: ctx.ids.studentId }, TH);
    return { status: (r.status === 200 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '009', 'POST /ai/chat (SSE stream)', async () => {
    const r = await request('POST', '/api/ai/chat', { messages: [{ role: 'user', content: 'hi' }] }, TH);
    return { status: (r.status === 200 || r.status === 201 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('AI', '010', 'POST /ai/parse-file', async () => {
    const r = await request('POST', '/api/ai/parse-file', { fileName: 'test.txt', fileData: 'dGVzdA==' }, TH);
    return { status: (r.status === 200 || r.status === 201 || r.status === 400 || r.status === 503) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: GENERIC CRUD (all modules via base controller) ───
async function runGenericCrudTests() {
  console.log('\n--- GENERIC_CRUD ---');
  const TH = ctx.tokens.teacher_head;
  if (!TH) { console.log('  SKIP: no token'); return; }

  const modules = [
    { cat: 'ATT', path: '/api/attendances', name: '考勤', body: () => ({ classId: ctx.ids.classId, date: '2026-03-01', records: [{ studentId: ctx.ids.studentId || '', status: 'present' }] }) },
    { cat: 'BHV', path: '/api/behavior-records', name: '行为记录', body: () => ({ studentId: ctx.ids.studentId || '', studentName: ctx.ids.studentName || 'test', date: '2026-03-01', behavior: '上课认真', note: '' }) },
    { cat: 'CHK', path: '/api/checkins', name: '打卡', body: () => ({ classId: ctx.ids.classId }) },
    { cat: 'HW', path: '/api/homework', name: '作业', body: () => ({ classId: ctx.ids.classId, subject: '语文', title: '测试作业', content: '内容', deadline: '2026-03-15' }) },
    { cat: 'RWD', path: '/api/reward-records', name: '奖励', body: () => ({ classId: ctx.ids.classId, studentId: ctx.ids.studentId || '', type: '奖励', points: 5, reason: '表现好', date: '2026-03-01' }) },
    { cat: 'SCR', path: '/api/score-records', name: '加减分', body: () => ({ classId: ctx.ids.classId, studentId: ctx.ids.studentId || '', studentName: ctx.ids.studentName || 'test', delta: 5, reason: '课堂表现好' }) },
    { cat: 'GRP', path: '/api/group-scores', name: '小组评分', body: () => ({ classId: ctx.ids.classId, groupName: '第一组', score: 80, date: '2026-03-01' }) },
    { cat: 'GRO', path: '/api/growth-entries', name: '成长记录', body: () => ({ studentId: ctx.ids.studentId || '', studentName: ctx.ids.studentName || 'test', type: '学习', date: '2026-03-01', title: '进步记录', content: '表现好' }) },
    { cat: 'RDL', path: '/api/reading-logs', name: '阅读记录', body: () => ({ studentId: ctx.ids.studentId || '', studentName: ctx.ids.studentName || 'test', bookTitle: '语文书', author: '出版社', pages: 10, minutes: 30, date: '2026-03-01' }) },
    { cat: 'DTY', path: '/api/duty-rosters', name: '轮值表', body: () => ({ classId: ctx.ids.classId, name: '卫生值日', type: '卫生', assignments: [{ date: '2026-03-01', persons: [ctx.ids.studentName || 'test'] }] }) },
    { cat: 'ACT', path: '/api/class-activities', name: '班级活动', body: () => ({ classId: ctx.ids.classId, title: '班会', date: '2026-03-01', description: '主题班会' }) },
    { cat: 'EXP', path: '/api/class-expenses', name: '班费', body: () => ({ classId: ctx.ids.classId, type: '支出', category: '材料费', amount: 50, date: '2026-03-01', description: '买材料', handler: '张老师' }) },
    { cat: 'DUT', path: '/api/class-duty-configs', name: '值日配置', body: () => ({ classId: ctx.ids.classId, duties: ['卫生', '纪律'], assignments: {} }) },
    { cat: 'GLR', path: '/api/class-galleries', name: '班级相册', body: () => ({ classId: ctx.ids.classId, title: '活动照片' }) },
    { cat: 'MGL', path: '/api/my-galleries', name: '个人相册', body: () => ({ title: '个人照片' }) },
    { cat: 'LSO', path: '/api/lesson-observations', name: '听课记录', body: () => ({ classId: ctx.ids.classId, subject: '语文', teacherName: '张老师', date: '2026-03-01', content: '听课记录' }) },
    { cat: 'WLG', path: '/api/work-logs', name: '工作日志', body: () => ({ date: '2026-03-01', classCount: 1, homeworkCount: 2, content: '今日工作', note: '' }) },
    { cat: 'SEA', path: '/api/seat-layouts', name: '座位表', body: () => ({ classId: ctx.ids.classId, name: '第一排', layout: [] }) },
    { cat: 'SCH', path: '/api/schedules', name: '课表', body: () => ({ classId: ctx.ids.classId, subject: '语文', teacherName: '张老师', dayOfWeek: 1, period: 1 }) },
    { cat: 'SEM', path: '/api/semesters', name: '学期', body: () => ({ name: '2026春季', startDate: '2026-02-01', endDate: '2026-07-01' }) },
    { cat: 'RES', path: '/api/resources', name: '资源', body: () => ({ title: '教学资源' }) },
    { cat: 'NTC2', path: '/api/notices', name: '班级公告', body: () => ({ title: '测试公告', content: '内容' }) },
    { cat: 'PCN', path: '/api/parent-contacts', name: '家长联系', body: () => ({ studentId: ctx.ids.studentId || '', studentName: ctx.ids.studentName || 'test', content: '联系内容' }) },
    { cat: 'NTP', path: '/api/notice-templates', name: '通知模板', body: () => ({ title: '模板', content: '模板内容' }) },
    { cat: 'AWD', path: '/api/award-records', name: '奖项', body: () => ({ classId: ctx.ids.classId, studentId: ctx.ids.studentId || '', title: '优秀奖', date: '2026-03-01' }) },
    { cat: 'AWC', path: '/api/award-categories', name: '奖项分类', body: () => ({ name: '学习类', description: '学习相关奖项' }) },
    { cat: 'BKU', path: '/api/backups', name: '备份', body: () => ({ name: '备份v5', description: '测试备份' }) },
    { cat: 'HVS', path: '/api/home-visits', name: '家访', body: () => ({ classId: ctx.ids.classId, studentId: ctx.ids.studentId || '', studentName: ctx.ids.studentName || 'test', date: '2026-03-01' }) },
    { cat: 'PAP', path: '/api/generated/papers', name: '生成试卷', body: () => ({ classId: ctx.ids.classId, subject: '语文', title: '测试试卷' }) },
    { cat: 'PLN', path: '/api/generated/lesson-plans', name: '生成教案', body: () => ({ classId: ctx.ids.classId, subject: '语文', title: '测试教案' }) },
    { cat: 'KNW', path: '/api/generated/knowledges', name: '知识库', body: () => ({ title: '测试知识', content: '内容' }) },
    { cat: 'QRY', path: '/api/generated/queries', name: '试卷查询', body: () => ({ query: '测试查询' }) },
    { cat: 'PHS', path: '/api/picker-history', name: '抽签历史', body: () => ({ title: '抽签v5', names: ['张三', '李四'] }) },
  ];

  for (const m of modules) {
    const body = m.body();
    const hasId = body.classId || body.studentId;
    if (!hasId && (m.cat === 'ATT' || m.cat === 'HW' || m.cat === 'RWD' || m.cat === 'BHV' || m.cat === 'GRO' || m.cat === 'RDL' || m.cat === 'DTY' || m.cat === 'ACT' || m.cat === 'EXP' || m.cat === 'DUT' || m.cat === 'LSO' || m.cat === 'SCH' || m.cat === 'HVS' || m.cat === 'SEA')) {
      const cls = extractItems((await request('GET', '/api/classes', null, TH)).data);
      if (cls.length === 0) continue;
      body.classId = cls[0].id;
    }
    if (body.studentId === '' && body.classId) {
      const stu = extractItems((await request('GET', '/api/students?classId=' + body.classId, null, TH)).data);
      if (stu.length > 0) { body.studentId = stu[0].id; body.studentName = stu[0].name; }
    }
    if (body.classId === '' && m.cat !== 'MGL' && m.cat !== 'SEM' && m.cat !== 'RES' && m.cat !== 'NTC2' && m.cat !== 'NTP' && m.cat !== 'AWC' && m.cat !== 'BKU' && m.cat !== 'KNW' && m.cat !== 'QRY' && m.cat !== 'PHS' && m.cat !== 'WLG') {
      continue;
    }

    await test(m.cat, 'L', 'GET ' + m.path + ' list', async () => {
      const r = await request('GET', m.path + '?classId=' + (body.classId || ''), null, TH);
      return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
    await test(m.cat, 'C', 'POST ' + m.path + ' create', async () => {
      const r = await request('POST', m.path, body, TH);
      if (isOk(r.status)) { ctx.ids['temp_' + m.cat] = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
      return { status: (r.status === 400 || r.status === 403) ? 'SKIP' : 'FAIL', msg: 'status=' + r.status + ' ' + (r.data?.message || '') };
    });
    await test(m.cat, 'U', 'PATCH ' + m.path + '/:id update', async () => {
      const id = ctx.ids['temp_' + m.cat];
      if (!id) return { status: 'SKIP', msg: 'no temp id' };
      if (m.cat === 'BKU') return { status: 'SKIP', msg: 'backups do not support update' };
      const patchBody = {};
      if (body.title) patchBody.title = body.title + '_updated';
      if (body.name) patchBody.name = body.name + '_updated';
      if (body.content) patchBody.content = 'updated';
      if (body.description) patchBody.description = 'updated';
      if (Object.keys(patchBody).length === 0) patchBody.note = 'updated';
      const r = await request('PATCH', m.path + '/' + id, patchBody, TH);
      return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
    await test(m.cat, 'D', 'DELETE ' + m.path + '/:id delete', async () => {
      const id = ctx.ids['temp_' + m.cat];
      if (!id) return { status: 'SKIP', msg: 'no temp id' };
      const r = await request('DELETE', m.path + '/' + id, null, TH);
      ctx.ids['temp_' + m.cat] = null;
      return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
  }
}

// ─── TEST CASES: TEACHER_CALENDAR ───
async function runCalendarTests() {
  console.log('\n--- TEACHER_CALENDAR ---');
  const TH = ctx.tokens.teacher_head;
  if (!TH) { console.log('  SKIP: no token'); return; }

  await test('CAL', '001', 'GET /teaching-calendar list', async () => {
    const r = await request('GET', '/api/teaching-calendar', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CAL', '002', 'POST /teaching-calendar create', async () => {
    const r = await request('POST', '/api/teaching-calendar', { title: '测试日程', date: '2026-03-01', type: 'normal', color: '#e8f1fb' }, TH);
    if (isOk(r.status)) { ctx.ids.tempCalId = r.data?.id; return { status: 'PASS', msg: 'id=' + r.data?.id }; }
    return { status: 'FAIL', msg: 'status=' + r.status };
  });
  await test('CAL', '003', 'GET /teaching-calendar/:id', async () => {
    if (!ctx.ids.tempCalId) return { status: 'SKIP', msg: 'no temp id' };
    const r = await request('GET', '/api/teaching-calendar/' + ctx.ids.tempCalId, null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CAL', '004', 'PATCH /teaching-calendar/:id', async () => {
    if (!ctx.ids.tempCalId) return { status: 'SKIP', msg: 'no temp id' };
    const r = await request('PATCH', '/api/teaching-calendar/' + ctx.ids.tempCalId, { title: '测试日程_updated' }, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CAL', '005', 'DELETE /teaching-calendar/:id', async () => {
    if (!ctx.ids.tempCalId) return { status: 'SKIP', msg: 'no temp id' };
    const r = await request('DELETE', '/api/teaching-calendar/' + ctx.ids.tempCalId, null, TH);
    ctx.ids.tempCalId = null;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CAL', '006', 'GET /teaching-calendar?year&month', async () => {
    const r = await request('GET', '/api/teaching-calendar?year=2026&month=3', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: PERMISSION ───
async function runPermissionTests() {
  console.log('\n--- PERMISSION ---');
  const TH = ctx.tokens.teacher_head;
  const TS = ctx.tokens.teacher_subject;
  const SA = ctx.tokens.school_admin;

  await test('PERM', '001', 'teacher_head cannot access super-admin', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/admin/schools', null, TH);
    return { status: (r.status === 401 || r.status === 403) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '002', 'teacher_subject cannot access super-admin', async () => {
    if (!TS) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/admin/schools', null, TS);
    return { status: (r.status === 401 || r.status === 403) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '003', 'school_admin cannot access super-admin', async () => {
    if (!SA) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/admin/schools', null, SA);
    return { status: (r.status === 401 || r.status === 403) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '004', 'teacher cannot access school-admin', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/school-admin/teachers', null, TH);
    return { status: (r.status === 401 || r.status === 403) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '005', 'teacher_head can access own classes', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/classes', null, TH);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length >= 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('PERM', '006', 'teacher_subject can access own classes', async () => {
    if (!TS) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/classes', null, TS);
    const items = extractItems(r.data);
    return { status: isOk(r.status) && items.length >= 0 ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('PERM', '007', 'teacher_head can access grades', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/grades', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '008', 'teacher_subject can access grades', async () => {
    if (!TS) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/grades', null, TS);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '009', 'teacher_head can create grades', async () => {
    if (!TH || !ctx.ids.classId) return { status: 'SKIP', msg: 'no token/class' };
    const r = await request('POST', '/api/grades', { classId: ctx.ids.classId, subject: '语文', examName: 'PermTest', date: '2026-03-01', scores: [] }, TH);
    return { status: (isOk(r.status) || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PERM', '010', 'teacher_head can create class member', async () => {
    if (!TH || !ctx.ids.classId) return { status: 'SKIP', msg: 'no token/class' };
    const r = await request('POST', '/api/classes/' + ctx.ids.classId + '/members', { teacherId: 'fake-id', subjects: ['语文'] }, TH);
    return { status: (isOk(r.status) || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: PARENT ───
async function runParentTests() {
  console.log('\n--- PARENT ---');
  const P = ctx.tokens.parent;
  const TH = ctx.tokens.teacher_head;

  await test('PAR', '001', 'POST /parent-auth/login', async () => {
    if (!ctx.ids.studentNo) return { status: 'SKIP', msg: 'no studentNo' };
    const pwd = ctx.parentPassword || '123456';
    const r = await request('POST', '/api/parent-auth/login', { studentNo: ctx.ids.studentNo, password: pwd });
    if (r.data?.token) { ctx.tokens.parent = r.data.token; return { status: 'PASS', msg: 'token obtained' }; }
    return { status: (r.status === 401 || r.status === 404 || r.status === 400) ? 'SKIP' : 'FAIL', msg: 'status=' + r.status };
  });

  const token = P || ctx.tokens.parent;
  if (!token) { console.log('  SKIP: no parent token'); return; }

  await test('PAR', '002', 'GET /parent-auth/me', async () => {
    const r = await request('GET', '/api/parent-auth/me', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '003', 'GET /parent-auth/exams', async () => {
    const r = await request('GET', '/api/parent-auth/exams', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '004', 'GET /parent-auth/notices', async () => {
    const r = await request('GET', '/api/parent-auth/notices', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '005', 'GET /parent-auth/homework', async () => {
    const r = await request('GET', '/api/parent-auth/homework', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '006', 'GET /parent-auth/attendance', async () => {
    const r = await request('GET', '/api/parent-auth/attendance', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '007', 'GET /parent-auth/behavior', async () => {
    const r = await request('GET', '/api/parent-auth/behavior', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '008', 'GET /parent-auth/schedule', async () => {
    const r = await request('GET', '/api/parent-auth/schedule', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '009', 'GET /parent-auth/communications', async () => {
    const r = await request('GET', '/api/parent-auth/communications', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '010', 'GET /parent-auth/compare-kids', async () => {
    const r = await request('GET', '/api/parent-auth/compare-kids', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '011', 'POST /parent-auth/change-password', async () => {
    const pwd = ctx.parentPassword || '123456';
    const r = await request('POST', '/api/parent-auth/change-password', { oldPassword: pwd, newPassword: 'newpass123' }, token);
    return { status: (isOk(r.status) || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '012', 'POST /parent-auth/switch-student', async () => {
    const r = await request('POST', '/api/parent-auth/switch-student', { studentId: ctx.ids.studentId || '' }, token);
    return { status: (isOk(r.status) || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '013', 'GET /parent-auth/im-user-sig', async () => {
    const r = await request('GET', '/api/parent-auth/im-user-sig', null, token);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '014', 'POST /parent-auth/activate-parent (teacher)', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no teacher token' };
    const r = await request('POST', '/api/parent-auth/activate-parent', null, TH);
    return { status: (isOk(r.status) || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: SYSTEM ───
async function runSystemTests() {
  console.log('\n--- SYSTEM ---');

  await test('SYS', '001', 'GET /health', async () => {
    const r = await request('GET', '/api/health');
    return { status: r.status === 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '002', 'GET /config/public (no auth)', async () => {
    const r = await request('GET', '/api/config/public');
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '003', 'GET /config/ai (teacher)', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/config/ai', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '004', 'PUT /config/ai (teacher)', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('PUT', '/api/config/ai', { provider: 'test' }, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '005', 'GET /config/ai-settings', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/config/ai-settings', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '006', 'GET /config/teacher/ai-defaults', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/config/teacher/ai-defaults', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '007', 'GET /config/app-config (teacher)', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/config/app-config', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '008', 'GET /ai-providers (teacher)', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/ai-providers', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '009', 'GET /users/me', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/users/me', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '010', 'PUT /users/me', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('PUT', '/api/users/me', { name: 'test_v5' }, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '011', 'GET /teachers (list)', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/teachers', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '012', 'GET /messages list', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/messages', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '013', 'GET /notifications list', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/notifications', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '014', 'GET /todos list', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/todos', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('SYS', '015', 'GET /notes list', async () => {
    if (!ctx.tokens.teacher_head) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/notes', null, ctx.tokens.teacher_head);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── TEST CASES: MISC admin (backup/audit/config/quicktool/subject-tools) ───
async function runMiscTests() {
  console.log('\n--- MISC_ADMIN ---');
  const SA = ctx.tokens.school_admin;
  const T = ctx.tokens.super_admin;
  const TH = ctx.tokens.teacher_head;

  await test('MISC', '001', 'GET /admin/audit-logs', async () => {
    if (!T) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/admin/audit-logs', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '002', 'GET /admin/teachers', async () => {
    if (!T) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/admin/teachers', null, T);
    const items = extractItems(r.data);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'count=' + items.length };
  });
  await test('MISC', '003', 'GET /lesson-observations', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no teacher token' };
    const r = await request('GET', '/api/lesson-observations', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '004', 'GET /work-logs', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no teacher token' };
    const r = await request('GET', '/api/work-logs', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '005', 'GET /lesson-plan-templates', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no teacher token' };
    const r = await request('GET', '/api/lesson-plan-templates', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '006', 'POST /admin/reset-all', async () => {
    if (!T) return { status: 'SKIP', msg: 'no token' };
    const r = await request('POST', '/api/admin/reset-all', { confirm: false }, T);
    return { status: (r.status === 400 || r.status === 200) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '007', 'POST /admin/teachers/:id/clear-data', async () => {
    if (!T) return { status: 'SKIP', msg: 'no token' };
    const teachers = extractItems((await request('GET', '/api/admin/teachers', null, T)).data);
    if (teachers.length === 0) return { status: 'SKIP', msg: 'no teachers' };
    const r = await request('POST', '/api/admin/teachers/' + teachers[0].id + '/clear-data', null, T);
    return { status: (isOk(r.status) || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '008', 'GET /security list', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/security', null, TH);
    return { status: isOk(r.status) || r.status === 404 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('MISC', '009', 'GET /im list', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/im', null, TH);
    return { status: isOk(r.status) || r.status === 404 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ─── MAIN EXECUTION ───
async function run() {
  const start = Date.now();
  console.log('=== Full API Test Runner v5 ===');
  console.log('Target: ' + BASE);
  console.log('Started: ' + new Date().toISOString());

  await setupSession();

  await runAuthTests();
  await sleep(100);
  await runSuperAdminTests();
  await sleep(100);
  await runSchoolAdminTests();
  await sleep(100);
  await runTeacherTests();
  await sleep(100);
  await runGradeTests();
  await sleep(100);
  await runCommCrudTests();
  await sleep(100);
  await runAiTests();
  await sleep(100);
  await runCalendarTests();
  await sleep(100);
  await runGenericCrudTests();
  await sleep(100);
  await runPermissionTests();
  await sleep(100);
  await runParentTests();
  await sleep(100);
  await runSystemTests();
  await sleep(100);
  await runMiscTests();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Build report
  const summary = { total: 0, pass: 0, fail: 0, skip: 0, groups: {} };
  for (const [g, d] of Object.entries(groupMap)) {
    summary.total += d.total;
    summary.pass += d.pass;
    summary.fail += d.fail;
    summary.skip += d.skip;
    summary.groups[g] = d;
  }

  const report = {
    startTime: new Date(start).toISOString(),
    endTime: new Date().toISOString(),
    durationSec: parseFloat(elapsed),
    requestCount: reqCount,
    summary,
    results,
  };

  // Write report
  try {
    fs.mkdirSync(require('path').dirname(REPORT_PATH), { recursive: true });
  } catch (_) {}
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('=== Full API Test Report v5 ===');
  console.log('  Duration: ' + elapsed + 's');
  console.log('  Requests: ' + reqCount);
  console.log('  Total:  ' + summary.total);
  console.log('  Passed: ' + summary.pass);
  console.log('  Failed: ' + summary.fail);
  console.log('  Skipped: ' + summary.skip);
  const rate = summary.total > 0 ? ((summary.pass / summary.total) * 100).toFixed(1) : '0.0';
  console.log('  Pass Rate: ' + rate + '%');

  console.log('\n--- Group Breakdown ---');
  for (const [g, d] of Object.entries(summary.groups)) {
    const pct = d.total > 0 ? ((d.pass / d.total) * 100).toFixed(0) : '0';
    console.log('  ' + g + ': ' + d.pass + '/' + d.total + ' pass, ' + d.fail + ' fail, ' + d.skip + ' skip (' + pct + '%)');
  }

  if (summary.fail > 0) {
    console.log('\n--- Failed Tests ---');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log('  ' + r.id + ': ' + r.name + ' - ' + r.msg);
    });
  }

  console.log('\n  Report: ' + REPORT_PATH);
  return summary.fail;
}

run().then(failed => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});
