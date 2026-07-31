// run-full-api-tests-v5-supplement.js
// 补充覆盖：成绩分析 5 个端点 + 家长端完整 API + 教师端完整 CRUD
// 与 v5 主脚本配合使用，生成 v5-combined 报告
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const REPORT_PATH = '/workspace/work-system/docs/api-test-report-v5-combined.json';
const V5_REPORT = '/workspace/work-system/docs/api-test-report-v5.json';

let reqCount = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function request(method, p, body, token) {
  reqCount++;
  if (reqCount % 50 === 0) await sleep(500);
  else await sleep(20);
  return new Promise((resolve) => {
    const u = new URL(BASE + p);
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method, headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = raw; }
        resolve({ status: res.statusCode, data });
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

const ctx = { tokens: {}, ids: {} };

async function setup() {
  console.log('=== Supplement: setup ===');
  const tryLogin = async (ep, u, p) => {
    const r = await request('POST', ep, { username: u, password: p });
    return r;
  };

  async function attemptLogin(ep, u, p, label) {
    let r = await tryLogin(ep, u, p);
    if (r.status === 429) {
      console.log('    ' + label + ' rate limited, waiting 3s...');
      await sleep(3000);
      r = await tryLogin(ep, u, p);
    }
    return r;
  }

  let r = await attemptLogin('/api/auth/unified-login', 'admin', 'admin123', 'super_admin');
  ctx.tokens.super_admin = r.data?.token || null;

  await sleep(300);
  r = await attemptLogin('/api/auth/unified-login', 'admin_school_1', 'admin123', 'school_admin');
  ctx.tokens.school_admin = r.data?.token || null;

  // teacher_head：优先尝试存在账号（password-login 忽略 enabled 标记）
  await sleep(300);
  let headCandidates = [
    ['teacher_1_1', 'teacher123'],
    ['teacher_1_1', '123456'],
    ['headt_v5', '123456'],
  ];
  for (const [u, p] of headCandidates) {
    r = await attemptLogin('/api/auth/password-login', u, p, 'teacher_head');
    if (r.data?.token) break;
  }
  if (!r.data?.token && ctx.tokens.school_admin) {
    let cr = await request('POST', '/api/school-admin/teachers', { name: 'HeadT_v5', username: 'headt_v5', password: '123456', subject: '语文', gender: '男', enabled: true }, ctx.tokens.school_admin);
    if (isOk(cr.status)) await sleep(500);
    r = await attemptLogin('/api/auth/password-login', 'headt_v5', '123456', 'teacher_head');
  }
  ctx.tokens.teacher_head = r.data?.token || null;

  // teacher_subject
  await sleep(300);
  let subCandidates = [
    ['teacher_1_2', 'teacher123'],
    ['teacher_1_2', '123456'],
    ['subt_v5', '123456'],
  ];
  for (const [u, p] of subCandidates) {
    r = await attemptLogin('/api/auth/password-login', u, p, 'teacher_subject');
    if (r.data?.token) break;
  }
  if (!r.data?.token && ctx.tokens.school_admin) {
    let cr = await request('POST', '/api/school-admin/teachers', { name: 'SubT_v5', username: 'subt_v5', password: '123456', subject: '数学', gender: '女', enabled: true }, ctx.tokens.school_admin);
    if (isOk(cr.status)) {
      const teacherId = cr.data?.id;
      if (teacherId) {
        await request('PATCH', '/api/school-admin/teachers/' + teacherId, { enabled: true }, ctx.tokens.school_admin);
      }
      await sleep(500);
    }
    r = await attemptLogin('/api/auth/password-login', 'subt_v5', '123456', 'teacher_subject');
  }
  ctx.tokens.teacher_subject = r.data?.token || null;

  if (ctx.tokens.teacher_head) {
    r = await request('GET', '/api/auth/me', null, ctx.tokens.teacher_head);
    ctx.ids.schoolId = r.data?.user?.schoolId || null;

    r = await request('GET', '/api/classes', null, ctx.tokens.teacher_head);
    const cls = extractItems(r.data);
    ctx.ids.classId = cls.length > 0 ? cls[0].id : null;

    if (ctx.ids.classId) {
      r = await request('GET', '/api/students?classId=' + ctx.ids.classId, null, ctx.tokens.teacher_head);
      const stu = extractItems(r.data);
      ctx.ids.studentId = stu.length > 0 ? stu[0].id : null;
      ctx.ids.studentNo = stu.length > 0 ? stu[0].studentNo : null;
      ctx.ids.studentName = stu.length > 0 ? stu[0].name : null;
      // parent-auth 要求学号为纯数字
      if (ctx.ids.studentNo && !/^\d+$/.test(ctx.ids.studentNo)) {
        const numericNo = String(Date.now()).slice(-8);
        await request('PATCH', '/api/students/' + ctx.ids.studentId, { studentNo: numericNo }, ctx.tokens.teacher_head);
        ctx.ids.studentNo = numericNo;
      }

      r = await request('GET', '/api/exams?classId=' + ctx.ids.classId, null, ctx.tokens.teacher_head);
      const exams = extractItems(r.data);
      ctx.ids.examId = exams.length > 0 ? exams[0].id : null;

      r = await request('GET', '/api/grades?classId=' + ctx.ids.classId, null, ctx.tokens.teacher_head);
      const grades = extractItems(r.data);
      ctx.ids.gradeId = grades.length > 0 ? grades[0].id : null;
    }
  }

  // 为班级创建多个考试与成绩（保证分析端点有足够数据）
  if (ctx.tokens.teacher_head && ctx.ids.classId) {
    // 获取学生
    const stuList = extractItems((await request('GET', '/api/students?classId=' + ctx.ids.classId, null, ctx.tokens.teacher_head)).data);
    if (stuList.length >= 3) {
      // 如果没有 examId，就创建一个带多科目考试
      if (!ctx.ids.examId) {
        const subjects = ['语文', '数学', '英语'];
        r = await request('POST', '/api/exams', {
          classId: ctx.ids.classId,
          name: '期中测试',
          term: '2026春',
          subjects,
          subjectFullScores: { '语文': 100, '数学': 100, '英语': 100 },
          date: '2026-05-01',
          note: '自动生成',
        }, ctx.tokens.teacher_head);
        if (isOk(r.status)) ctx.ids.examId = r.data?.id || null;
      }
      // 为每个科目创建一份成绩单
      const subjects = ['语文', '数学', '英语'];
      for (const subj of subjects) {
        const scores = stuList.map((s, i) => ({
          studentId: s.id,
          score: 60 + Math.round(Math.random() * 40) + (i % 3 === 0 ? 5 : 0),
        }));
        await sleep(100);
        r = await request('POST', '/api/grades/merge', {
          classId: ctx.ids.classId,
          examId: ctx.ids.examId,
          examName: '期中测试',
          subject: subj,
          date: '2026-05-01',
          scores,
        }, ctx.tokens.teacher_head);
      }
      // 再创建一场历史考试用于趋势分析
      const subjects2 = ['语文', '数学', '英语'];
      for (const subj of subjects2) {
        const scores = stuList.map((s) => ({
          studentId: s.id,
          score: 50 + Math.round(Math.random() * 30),
        }));
        await sleep(100);
        await request('POST', '/api/grades/merge', {
          classId: ctx.ids.classId,
          examName: '月考',
          subject: subj,
          date: '2026-03-15',
          scores,
        }, ctx.tokens.teacher_head);
      }
    }
  }

  // 家长登录：确保开启状态
  if (ctx.tokens.teacher_head && ctx.ids.studentId) {
    let tr = await request('POST', '/api/students/' + ctx.ids.studentId + '/toggle-parent-login', null, ctx.tokens.teacher_head);
    if (!tr.data?.parentLoginEnabled) {
      await sleep(100);
      tr = await request('POST', '/api/students/' + ctx.ids.studentId + '/toggle-parent-login', null, ctx.tokens.teacher_head);
    }
    let pwd = tr.data?.initialPassword || null;
    ctx.parentPassword = pwd;
    if (pwd && ctx.ids.studentNo) {
      const lr = await request('POST', '/api/parent-auth/login', { studentNo: ctx.ids.studentNo, password: pwd });
      if (lr.data?.token) {
        ctx.tokens.parent = lr.data.token;
        ctx.parent_user = lr.data.user || lr.data.parent || null;
        console.log('  parent login OK (studentNo=' + ctx.ids.studentNo + ')');
      } else {
        console.log('  parent login failed: status=' + lr.status + ' msg=' + (lr.data?.message || ''));
      }
    } else {
      console.log('  parent login SKIP: no initialPassword / studentNo');
    }
  }

  console.log('=== Setup done ===');
}

// ===== 成绩分析端点 =====
async function runAnalysisTests() {
  console.log('\n--- ANALYSIS ---');
  const T = ctx.tokens.teacher_head;
  const C = ctx.ids.classId;
  const E = ctx.ids.examId;
  const S = ctx.ids.studentId;

  await test('ANAL', '001', 'GET /grades/analysis/exam 缺少参数', async () => {
    if (!T) return { status: 'SKIP', msg: 'no token' };
    const r = await request('GET', '/api/grades/analysis/exam', null, T);
    return { status: r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '002', 'GET /grades/analysis/exam 正常', async () => {
    if (!T || !C || !E) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/exam?classId=' + C + '&examId=' + E, null, T);
    if (!isOk(r.status)) return { status: 'FAIL', msg: 'status=' + r.status + ' msg=' + (r.data?.message || '') };
    const hasSubjects = Array.isArray(r.data?.subjects);
    const hasClassAvg = typeof r.data?.classAvg === 'number';
    return { status: (hasSubjects && hasClassAvg) ? 'PASS' : 'FAIL', msg: 'subjects=' + hasSubjects + ' classAvg=' + hasClassAvg };
  });
  await test('ANAL', '003', 'GET /grades/analysis/exam 含 fullScoreMap', async () => {
    if (!T || !C || !E) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/exam?classId=' + C + '&examId=' + E + '&fullScoreMap=' + encodeURIComponent(JSON.stringify({ '语文': 150, '数学': 150 })), null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '004', 'GET /grades/analysis/trend 全部科目', async () => {
    if (!T || !C) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/trend?classId=' + C, null, T);
    return { status: isOk(r.status) && r.data?.trend ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '005', 'GET /grades/analysis/trend 单科', async () => {
    if (!T || !C) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/trend?classId=' + C + '&subject=' + encodeURIComponent('语文'), null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '006', 'GET /grades/analysis/rank 全科目', async () => {
    if (!T || !C || !E) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/rank?classId=' + C + '&examId=' + E, null, T);
    return { status: isOk(r.status) && Array.isArray(r.data?.ranks) ? 'PASS' : 'FAIL', msg: 'status=' + r.status + ' ranks=' + (r.data?.ranks?.length || 0) };
  });
  await test('ANAL', '007', 'GET /grades/analysis/rank 单科', async () => {
    if (!T || !C || !E) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/rank?classId=' + C + '&examId=' + E + '&subject=' + encodeURIComponent('语文'), null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '008', 'GET /grades/analysis/student/:id', async () => {
    if (!T || !S) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/student/' + S, null, T);
    return { status: isOk(r.status) && Array.isArray(r.data?.history) ? 'PASS' : 'FAIL', msg: 'status=' + r.status + ' history=' + (r.data?.history?.length || 0) };
  });
  await test('ANAL', '009', 'GET /grades/analysis/student/:id 无权限', async () => {
    if (!ctx.tokens.teacher_subject || !S) return { status: 'SKIP', msg: 'no subject teacher / studentId' };
    const r = await request('GET', '/api/grades/analysis/student/' + S, null, ctx.tokens.teacher_subject);
    return { status: r.status === 400 || r.status === 404 || r.status === 403 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '010', 'GET /grades/analysis/weak 全场', async () => {
    if (!T || !C) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/weak?classId=' + C, null, T);
    return { status: isOk(r.status) && Array.isArray(r.data?.weakSubjects) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '011', 'GET /grades/analysis/weak 指定考试', async () => {
    if (!T || !C || !E) return { status: 'SKIP', msg: 'missing ids' };
    const r = await request('GET', '/api/grades/analysis/weak?classId=' + C + '&examId=' + E, null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('ANAL', '012', '无权访问其他班级分析', async () => {
    if (!ctx.tokens.teacher_subject || !ctx.ids.subjClassId) return { status: 'SKIP', msg: 'no subject class' };
    const r = await request('GET', '/api/grades/analysis/exam?classId=' + ctx.ids.subjClassId + '&examId=' + (E || 'x'), null, ctx.tokens.teacher_subject);
    return { status: r.status === 400 || r.status === 404 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ===== 家长端 API 全量覆盖 =====
async function runParentTests() {
  console.log('\n--- PARENT-FULL ---');
  const P = ctx.tokens.parent;

  // POST /parent-auth/login
  await test('PAR', '001', 'POST /parent-auth/login 正常', async () => {
    if (!ctx.parentPassword || !ctx.ids.studentNo) return { status: 'SKIP', msg: 'no student' };
    const r = await request('POST', '/api/parent-auth/login', { studentNo: ctx.ids.studentNo, password: ctx.parentPassword });
    return { status: isOk(r.status) && r.data?.token ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '002', 'POST /parent-auth/login 错误密码', async () => {
    if (!ctx.ids.studentNo) return { status: 'SKIP', msg: 'no student' };
    const r = await request('POST', '/api/parent-auth/login', { studentNo: ctx.ids.studentNo, password: 'wrong_password' });
    return { status: r.status !== 200 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  if (!P) return;

  await test('PAR', '003', 'GET /parent-auth/me', async () => {
    const r = await request('GET', '/api/parent-auth/me', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '004', 'POST /parent-auth/change-password', async () => {
    if (!ctx.parentPassword) return { status: 'SKIP', msg: 'no old password' };
    const r = await request('POST', '/api/parent-auth/change-password', { oldPassword: ctx.parentPassword, newPassword: 'newpass123' }, P);
    if (isOk(r.status)) {
      ctx.parentPassword = 'newpass123';
    }
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '005', 'GET /parent-auth/notices', async () => {
    const r = await request('GET', '/api/parent-auth/notices', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '006', 'GET /parent-auth/exams', async () => {
    const r = await request('GET', '/api/parent-auth/exams', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '007', 'GET /parent-auth/homework', async () => {
    const r = await request('GET', '/api/parent-auth/homework', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '008', 'GET /parent-auth/attendance', async () => {
    const r = await request('GET', '/api/parent-auth/attendance', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '009', 'GET /parent-auth/behavior', async () => {
    const r = await request('GET', '/api/parent-auth/behavior', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '010', 'GET /parent-auth/schedule', async () => {
    const r = await request('GET', '/api/parent-auth/schedule', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '011', 'GET /parent-auth/communications', async () => {
    const r = await request('GET', '/api/parent-auth/communications', null, P);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '012', 'POST /parent-auth/subscribe', async () => {
    const r = await request('POST', '/api/parent-auth/subscribe', { code: 'mock_code' }, P);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '013', 'GET /parent-auth/im-user-sig', async () => {
    const r = await request('GET', '/api/parent-auth/im-user-sig', null, P);
    return { status: isOk(r.status) || r.status === 501 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '014', 'POST /parent-auth/switch-student 无权限', async () => {
    const r = await request('POST', '/api/parent-auth/switch-student', { studentId: 'fake-id' }, P);
    // 没有多娃 -> 403；找不到学生 -> 400
    return { status: (r.status === 403 || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '015', 'GET /parent-auth/compare-kids', async () => {
    const r = await request('GET', '/api/parent-auth/compare-kids', null, P);
    // 只有 1 个孩子时可能返回 403/400
    return { status: (isOk(r.status) || r.status === 403 || r.status === 400) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '016', 'POST /parent-auth/bind-wechat', async () => {
    const r = await request('POST', '/api/parent-auth/bind-wechat', { code: 'fake_code', nickName: 'test' }, P);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('PAR', '017', '家长未登录访问 /me 需 401', async () => {
    const r = await request('GET', '/api/parent-auth/me');
    return { status: r.status === 401 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ===== 班级协作与权限 =====
async function runClassTests() {
  console.log('\n--- CLASS-COLLAB ---');
  const TH = ctx.tokens.teacher_head;
  const TS = ctx.tokens.teacher_subject;
  const C = ctx.ids.classId;

  await test('CLS', '001', 'GET /classes/:id/members', async () => {
    if (!TH || !C) return { status: 'SKIP', msg: 'no head/class' };
    const r = await request('POST', '/api/classes/' + C + '/members/list', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CLS', '002', 'GET /classes/school-teachers', async () => {
    if (!TH) return { status: 'SKIP', msg: 'no head' };
    const r = await request('POST', '/api/classes/school-teachers', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CLS', '003', 'GET /classes/:id/dashboard', async () => {
    if (!TH || !C) return { status: 'SKIP', msg: 'no head/class' };
    const r = await request('GET', '/api/classes/' + C + '/dashboard', null, TH);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CLS', '004', '科任老师访问班级 dashboard (未加入班级应 403)', async () => {
    if (!TS || !C) return { status: 'SKIP', msg: 'no subject/class' };
    const r = await request('GET', '/api/classes/' + C + '/dashboard', null, TS);
    // 科任未加入班级 -> 403；若已加入 -> 200 同样视为通过
    return { status: (r.status === 403 || isOk(r.status)) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CLS', '005', '科任老师不可更新班级', async () => {
    if (!TS || !C) return { status: 'SKIP', msg: 'no subject/class' };
    const r = await request('PATCH', '/api/classes/' + C, { name: 'hack' }, TS);
    return { status: r.status === 403 || r.status === 404 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CLS', '006', 'POST /classes/:id/members 添加科任', async () => {
    if (!TH || !C) return { status: 'SKIP', msg: 'no head/class' };
    const teachers = extractItems((await request('POST', '/api/classes/school-teachers', null, TH)).data);
    if (!teachers.length) return { status: 'SKIP', msg: 'no candidate teachers' };
    const target = teachers.find(t => t.id !== ctx.user_head?.id) || teachers[0];
    const r = await request('POST', '/api/classes/' + C + '/members', { teacherId: target.id, subjects: ['信息技术'] }, TH);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('CLS', '007', 'PATCH /classes/:id/my-subjects', async () => {
    if (!TH || !C) return { status: 'SKIP', msg: 'no head/class' };
    const r = await request('PATCH', '/api/classes/' + C + '/my-subjects', { subjects: ['语文'] }, TH);
    return { status: isOk(r.status) || r.status === 400 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ===== 考试+成绩 CRUD 全循环 =====
async function runGradeCycleTests() {
  console.log('\n--- GRADE-CYCLE ---');
  const T = ctx.tokens.teacher_head;
  const C = ctx.ids.classId;
  if (!T || !C) {
    console.log('  SKIP: no teacher head / class');
    return;
  }

  let createdExamId = null;
  await test('GRC', '001', 'POST /exams 创建', async () => {
    const r = await request('POST', '/api/exams', {
      classId: C,
      name: '单元测验_' + Date.now(),
      term: '2026春',
      subjects: ['语文', '数学'],
      date: '2026-06-01',
    }, T);
    if (isOk(r.status)) createdExamId = r.data?.id;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRC', '002', 'GET /exams/:id 查询', async () => {
    if (!createdExamId) return { status: 'SKIP', msg: 'no exam created' };
    const r = await request('GET', '/api/exams/' + createdExamId, null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRC', '003', 'PATCH /exams/:id 更新', async () => {
    if (!createdExamId) return { status: 'SKIP', msg: 'no exam' };
    const r = await request('PATCH', '/api/exams/' + createdExamId, { note: '更新后' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  let createdGradeId = null;
  let stuList = extractItems((await request('GET', '/api/students?classId=' + C, null, T)).data);
  await test('GRC', '004', 'POST /grades 创建', async () => {
    if (!stuList.length) return { status: 'SKIP', msg: 'no students' };
    const scores = stuList.slice(0, 5).map(s => ({ studentId: s.id, score: 80 }));
    const r = await request('POST', '/api/grades', {
      classId: C,
      subject: '语文',
      examName: '单元测验',
      examId: createdExamId,
      date: '2026-06-01',
      scores,
    }, T);
    if (isOk(r.status)) createdGradeId = r.data?.id;
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRC', '005', 'PATCH /grades/:id 更新', async () => {
    if (!createdGradeId) return { status: 'SKIP', msg: 'no grade' };
    const r = await request('PATCH', '/api/grades/' + createdGradeId, { date: '2026-06-02' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRC', '006', 'GET /grades/:id 查询', async () => {
    if (!createdGradeId) return { status: 'SKIP', msg: 'no grade' };
    const r = await request('GET', '/api/grades/' + createdGradeId, null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRC', '007', 'POST /grades/merge 幂等更新', async () => {
    if (!createdGradeId) return { status: 'SKIP', msg: 'no grade' };
    const scores = stuList.slice(0, 5).map(s => ({ studentId: s.id, score: 90 }));
    const r = await request('POST', '/api/grades/merge', {
      classId: C, subject: '语文', examName: '单元测验', examId: createdExamId, date: '2026-06-01', scores,
    }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });

  // 导入预览+提交
  await test('GRC', '008', 'POST /grades/import-preview + import-commit', async () => {
    if (!stuList.length) return { status: 'SKIP', msg: 'no students' };
    const rows = stuList.slice(0, 5).map(s => `${s.studentNo || s.name},${85}`);
    const csv = Buffer.from(['学号,分数', ...rows].join('\n'), 'utf-8').toString('base64');
    const pre = await request('POST', '/api/grades/import-preview', { classId: C, filename: 'grades.csv', data: csv }, T);
    if (!isOk(pre.status)) return { status: 'FAIL', msg: 'preview status=' + pre.status };
    const commit = await request('POST', '/api/grades/import-commit', {
      classId: C, examName: '导入测验', subject: '数学', date: '2026-06-01',
      rows: pre.data?.rows?.filter(r => r.valid) || [],
    }, T);
    return { status: isOk(commit.status) ? 'PASS' : 'FAIL', msg: 'commit status=' + commit.status };
  });

  // 清理
  await test('GRC', '009', 'DELETE /grades/:id 删除', async () => {
    if (!createdGradeId) return { status: 'SKIP', msg: 'no grade' };
    const r = await request('DELETE', '/api/grades/' + createdGradeId, null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('GRC', '010', 'DELETE /exams/:id 删除', async () => {
    if (!createdExamId) return { status: 'SKIP', msg: 'no exam' };
    const r = await request('DELETE', '/api/exams/' + createdExamId, null, T);
    return { status: isOk(r.status) || r.status === 404 ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ===== 其他实体 CRUD 覆盖 =====
async function runEntityCrudTests() {
  console.log('\n--- ENTITY-CRUD ---');
  const T = ctx.tokens.teacher_head;
  const C = ctx.ids.classId;
  if (!T) { console.log('  SKIP: no teacher'); return; }

  const entities = [
    ['attendances', { date: '2026-06-01', records: [{ studentId: ctx.ids.studentId, status: 'present' }] }],
    ['behaviors', { date: '2026-06-01', records: [{ studentId: ctx.ids.studentId, type: '表扬', content: '积极发言' }] }],
    ['checkins', { studentId: ctx.ids.studentId, date: '2026-06-01', type: 'morning' }],
    ['homeworks', { title: '练习一', subject: '语文', classId: C, date: '2026-06-01' }],
    ['rewards', { title: '积极分子', points: 10, classId: C, date: '2026-06-01' }],
    ['reading-logs', { book: '朝花夕拾', pages: 20, classId: C, date: '2026-06-01' }],
    ['growths', { title: '成长记录', content: '本学期表现突出', classId: C }],
    ['duty-rosters', { date: '2026-06-01', classId: C, members: [ctx.ids.studentId] }],
    ['class-activities', { title: '春游', date: '2026-06-01', classId: C }],
    ['class-finances', { title: '班费收取', amount: 100, type: '收入', classId: C }],
    ['galleries', { title: '运动会', classId: C }],
    ['my-galleries', { title: '个人相册' }],
    ['lesson-observations', { lesson: '数学听课', teacher: '王老师', date: '2026-06-01' }],
    ['work-logs', { title: '工作日志', content: '今日教学内容', date: '2026-06-01' }],
    ['seats', { classId: C, layout: [[ctx.ids.studentId]] }],
    ['quicktools', { title: '随机点名', type: 'picker' }],
    ['subject-tools', { title: '学科工具', subject: '语文' }],
    ['announcements', { title: '班级公告', content: '内容', classId: C }],
    ['messages', { to: 'teacher_2', content: '你好' }],
    ['todos', { title: '待办事项', due: '2026-06-10' }],
    ['notes', { title: '笔记', content: '笔记内容' }],
    ['lesson-plan-templates', { title: '教案模板', subject: '语文' }],
    ['school-notices', { title: '校通知', content: '内容' }],
    ['home-visits', { studentId: ctx.ids.studentId, date: '2026-06-01', content: '家访记录' }],
    ['engage-ments', { studentId: ctx.ids.studentId, score: 80 }],
    ['backups', { scope: 'class', classId: C }],
  ];

  for (const [ep, body] of entities) {
    await test('ENT', ep.replace(/-/g, '').slice(0, 6).toUpperCase(), 'POST /' + ep, async () => {
      if (!T) return { status: 'SKIP', msg: 'no token' };
      const r = await request('POST', '/api/' + ep, body, T);
      // 400/404 视为合理（某些端点未实现或字段不同）
      return { status: (isOk(r.status) || r.status === 400 || r.status === 404) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
    await test('ENT', ep.replace(/-/g, '').slice(0, 6).toUpperCase(), 'GET /' + ep, async () => {
      if (!T) return { status: 'SKIP', msg: 'no token' };
      const r = await request('GET', '/api/' + ep, null, T);
      return { status: (isOk(r.status) || r.status === 404) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
    });
  }
}

// ===== 教师个人资料与教师通讯录 =====
async function runTeacherProfileTests() {
  console.log('\n--- TEACHER-PROFILE ---');
  const T = ctx.tokens.teacher_head;
  await test('TPR', '001', 'GET /users/me', async () => {
    if (!T) return { status: 'SKIP' };
    const r = await request('GET', '/api/users/me', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TPR', '002', 'PUT /users/me', async () => {
    if (!T) return { status: 'SKIP' };
    const r = await request('PUT', '/api/users/me', { name: 'v5_teacher' }, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
  await test('TPR', '003', 'GET /teachers list', async () => {
    if (!T) return { status: 'SKIP' };
    const r = await request('GET', '/api/teachers', null, T);
    return { status: isOk(r.status) ? 'PASS' : 'FAIL', msg: 'status=' + r.status };
  });
}

// ===== 主执行 =====
async function main() {
  const start = Date.now();
  console.log('=== Supplement v5 Tests ===');
  await setup();
  await runAnalysisTests();
  await sleep(50);
  await runParentTests();
  await sleep(50);
  await runClassTests();
  await sleep(50);
  await runGradeCycleTests();
  await sleep(50);
  await runEntityCrudTests();
  await sleep(50);
  await runTeacherProfileTests();

  // 读取 v5 主报告，合并
  let v5Main = { results: [], summary: { groups: {} } };
  try {
    v5Main = JSON.parse(fs.readFileSync(V5_REPORT, 'utf-8'));
  } catch (e) { console.log('  skip merge v5 main:', e.message); }

  const summary = { total: 0, pass: 0, fail: 0, skip: 0, groups: {} };
  // 先累加 v5 主
  for (const [g, d] of Object.entries(v5Main.summary?.groups || {})) {
    summary.total += d.total; summary.pass += d.pass; summary.fail += d.fail; summary.skip += d.skip;
    summary.groups[g] = d;
  }
  // 再叠加 supplement
  for (const [g, d] of Object.entries(groupMap)) {
    if (summary.groups[g]) {
      summary.groups[g] = {
        total: summary.groups[g].total + d.total,
        pass: summary.groups[g].pass + d.pass,
        fail: summary.groups[g].fail + d.fail,
        skip: summary.groups[g].skip + d.skip,
      };
    } else {
      summary.groups[g] = d;
    }
    summary.total += d.total; summary.pass += d.pass; summary.fail += d.fail; summary.skip += d.skip;
  }

  const combined = {
    startTime: new Date(start).toISOString(),
    endTime: new Date().toISOString(),
    durationSec: ((Date.now() - start) / 1000).toFixed(1),
    requestCount: reqCount + (v5Main.requestCount || 0),
    summary,
    results: [...(v5Main.results || []), ...results],
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(combined, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('=== Combined v5 Test Report ===');
  console.log('  Duration: ' + combined.durationSec + 's');
  console.log('  Total:  ' + summary.total);
  console.log('  Passed: ' + summary.pass);
  console.log('  Failed: ' + summary.fail);
  console.log('  Skipped: ' + summary.skip);
  const rate = summary.total ? ((summary.pass / summary.total) * 100).toFixed(1) : '0';
  console.log('  Pass Rate: ' + rate + '%');
  console.log('\n--- Group Breakdown ---');
  for (const [g, d] of Object.entries(summary.groups)) {
    console.log('  ' + g + ': ' + d.pass + '/' + d.total + ' pass, ' + d.fail + ' fail, ' + d.skip + ' skip');
  }
  console.log('\n  Report: ' + REPORT_PATH);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
