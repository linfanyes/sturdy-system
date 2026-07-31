/**
 * Enhanced Test Data Seeder
 * Creates 5-10 records per entity for comprehensive testing
 * 
 * Generated:
 * - 5 schools
 * - 5 school admins
 * - 50 teachers (10 per school)
 * - 25 classes (5 per school)
 * - 200+ students (8 per class)
 * - Multiple notices, homework, exams, grades, rewards, etc.
 * - AI grades for analysis testing
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

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

const store = {
  schools: [], schoolAdmins: [], teachers: [], classes: [], students: [],
  tokens: {}, examIds: [],
  results: { passed: 0, failed: 0, errors: [] },
};

function log(msg) { console.log(`[${new Date().toISOString().split('T')[1]}] ${msg}`); }
function pass(msg) { store.results.passed++; log(`  ✅ ${msg}`); }
function fail(msg, err) { store.results.failed++; store.results.errors.push({ msg, error: err }); log(`  ❌ ${msg}: ${err}`); }

async function main() {
  log('=== Enhanced Test Data Seeding ===\n');

  // Step 1: Login super admin
  log('Step 1: Super Admin Login...');
  const loginRes = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  if (!loginRes.data?.token) { fail('Super admin login', `${loginRes.status}`); process.exit(1); }
  store.tokens.super = loginRes.data.token;
  pass('Super admin logged in');

  // Step 2: Create 5 schools
  log('\nStep 2: Creating 5 Schools...');
  const schoolConfigs = [
    { prefix: 'YG', name: '阳光小学', address: '朝阳区阳光路1号', contact: '张主任', phone: '13800000001' },
    { prefix: 'YC', name: '育才中学', address: '海淀区育才路2号', contact: '李主任', phone: '13800000002' },
    { prefix: 'SY', name: '实验学校', address: '西城区实验路3号', contact: '赵主任', phone: '13800000003' },
    { prefix: 'DY', name: '第一小学', address: '东城区第一路4号', contact: '孙主任', phone: '13800000004' },
    { prefix: 'XS', name: '新世纪学校', address: '丰台区新世纪路5号', contact: '周主任', phone: '13800000005' },
  ];
  for (const cfg of schoolConfigs) {
    const res = await request('POST', '/api/admin/schools', { ...cfg, platform: 'mini' }, store.tokens.super);
    if (res.status === 201 || res.status === 200) {
      store.schools.push({ ...res.data, prefix: cfg.prefix });
      pass(`School: ${cfg.name}`);
    } else { fail(`School ${cfg.name}`, `${res.status} ${JSON.stringify(res.data?.message || '')}`); }
    await sleep(100);
  }

  // Step 3: Create 5 school admins
  log('\nStep 3: Creating School Admins...');
  const adminConfigs = [
    { username: 'admin_school_1', password: 'admin123', name: '王管理', schoolIdx: 0 },
    { username: 'admin_school_2', password: 'admin123', name: '李管理', schoolIdx: 1 },
    { username: 'admin_school_3', password: 'admin123', name: '赵管理', schoolIdx: 2 },
    { username: 'admin_school_4', password: 'admin123', name: '孙管理', schoolIdx: 3 },
    { username: 'admin_school_5', password: 'admin123', name: '周管理', schoolIdx: 4 },
  ];
  for (const cfg of adminConfigs) {
    const res = await request('POST', '/api/admin/school-admins', {
      username: cfg.username, password: cfg.password, name: cfg.name,
      schoolId: store.schools[cfg.schoolIdx].id, enabled: true,
    }, store.tokens.super);
    if (res.status === 201 || res.status === 200) {
      store.schoolAdmins.push({ ...res.data, username: cfg.username, password: cfg.password, schoolIndex: cfg.schoolIdx });
      pass(`School Admin: ${cfg.username}`);
    } else { fail(`School Admin ${cfg.username}`, `${res.status} ${JSON.stringify(res.data?.message || '')}`); }
    await sleep(100);
  }

  // Step 4: Login school admins
  log('\nStep 4: Logging in School Admins...');
  for (const admin of store.schoolAdmins) {
    const lr = await request('POST', '/api/school-admin/login', { username: admin.username, password: admin.password });
    if (lr.data?.token) { admin.token = lr.data.token; pass(`${admin.username} logged in`); }
    else fail(`${admin.username} login`, `${lr.status}`);
    await sleep(50);
  }

  // Step 5: Create 50 teachers
  log('\nStep 5: Creating Teachers...');
  const subjects = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育', '信息技术', '综合实践'];
  const surnames = ['张', '王', '李', '赵', '孙', '周', '吴', '郑', '冯', '陈'];
  const givenNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋'];

  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    for (let t = 0; t < 10; t++) {
      const gender = t % 2 === 0 ? '男' : '女';
      const name = surnames[t] + givenNames[(s + t) % 10];
      const subject = subjects[t];
      const teacherNo = `JS${store.schools[s].code}${String(10000 + t + s * 10).slice(-5)}`;
      const res = await request('POST', '/api/school-admin/teachers', {
        username: `teacher_${s + 1}_${t + 1}`, password: 'teacher123', name, gender, subject, teacherNo,
        phone: `139${String(10000000 + s * 100 + t).padStart(8, '0')}`,
      }, admin.token);
      if (res.status === 201 || res.status === 200) {
        store.teachers.push({
          id: res.data.id, schoolIndex: s, name, username: `teacher_${s + 1}_${t + 1}`,
          password: 'teacher123', subject, subjects: [subject], gender, teacherNo,
        });
        pass(`Teacher: ${name} (${subject})`);
      } else { fail(`Teacher teacher_${s + 1}_${t + 1}`, `${res.status} ${JSON.stringify(res.data?.message || '')}`); }
      await sleep(80);
    }
  }

  // Step 6: Create 25 classes
  log('\nStep 6: Creating Classes...');
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级'];
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const schoolTeachers = store.teachers.filter(t => t.schoolIndex === s);
    for (let c = 0; c < 5; c++) {
      const headTeacher = schoolTeachers[c];
      const res = await request('POST', '/api/school-admin/classes', {
        name: `${grades[c]}${['1','2','3','4','5'][c]}班`, grade: grades[c], classNo: `${c + 1}`,
        headTeacher: headTeacher.name, headTeacherId: headTeacher.id, term: '2026春季',
        subjects: [subjects[c], subjects[(c + 1) % 10]],
      }, admin.token);
      if (res.status === 201 || res.status === 200) {
        store.classes.push({ id: res.data.id, name: res.data.name, schoolIndex: s, headTeacherId: headTeacher.id, subjects: [subjects[c], subjects[(c + 1) % 10]] });
        pass(`Class: ${res.data.name}`);
      } else { fail(`Class`, `${res.status} ${JSON.stringify(res.data?.message || '')}`); }
      await sleep(100);
    }
  }

  // Step 7: Create 200 students
  log('\nStep 7: Creating Students (8 per class)...');
  const studentNames = ['小明', '小红', '小刚', '小丽', '小强', '小芳', '小军', '小燕'];
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const schoolClasses = store.classes.filter(c => c.schoolIndex === s);
    for (const cls of schoolClasses) {
      const studentsToCreate = studentNames.map((name, idx) => ({
        name: `${name}${s + 1}`, gender: idx % 2 === 0 ? '男' : '女',
        studentNo: `ST${s + 1}${String(store.classes.indexOf(cls) + 1).padStart(2, '0')}${String(idx + 1).padStart(2, '0')}`,
        classId: cls.id, parentName: `家长${name}`,
        parentPhone: `137${String(10000000 + s * 500 + idx).padStart(8, '0')}`,
      }));
      const res = await request('POST', '/api/school-admin/students/batch', { students: studentsToCreate }, admin.token);
      if (res.status === 201 || res.status === 200) {
        pass(`${cls.name}: ${studentsToCreate.length} students`);
      } else { fail(`Students for ${cls.name}`, `${res.status} ${JSON.stringify(res.data?.message || '')}`); }
      await sleep(200);
    }
  }

  // Step 8: Create notices
  log('\nStep 8: Creating Notices...');
  const noticeTitles = ['开学通知', '考试安排', '放假通知'];
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    for (let n = 0; n < 3; n++) {
      const res = await request('POST', '/api/school-admin/notices', {
        title: `${noticeTitles[n]} - ${store.schools[s].name}`,
        content: `${store.schools[s].name}${noticeTitles[n]}详情：请全体师生注意相关安排。`,
        pinned: n === 0,
      }, admin.token);
      if (res.status === 201 || res.status === 200) pass(`Notice: ${noticeTitles[n]}`);
      else fail(`Notice`, `${res.status}`);
      await sleep(80);
    }
  }

  // Step 9: Create homework
  log('\nStep 9: Creating Homework...');
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const schoolClasses = store.classes.filter(c => c.schoolIndex === s);
    for (const cls of schoolClasses.slice(0, 3)) {
      for (let h = 0; h < 2; h++) {
        const res = await request('POST', '/api/school-admin/homework', {
          classId: cls.id, subject: subjects[(h + s) % 10],
          title: `第${h + 1}次作业 - ${cls.name}`,
          content: `请完成课本第${h + 10}页的练习题。`,
          dueDate: `2026-0${h + 2}-01`,
        }, admin.token);
        if (res.status === 201 || res.status === 200) pass(`Homework: ${cls.name}`);
        else fail(`Homework`, `${res.status} ${JSON.stringify(res.data?.message || '')}`);
        await sleep(80);
      }
    }
  }

  // Step 10: Create exams and grades
  log('\nStep 10: Creating Exams and Grades...');
  const examNames = ['期中考试', '期末考试', '月考'];
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const teachers = store.teachers.filter(t => t.schoolIndex === s);
    const classes = store.classes.filter(c => c.schoolIndex === s);

    for (const cls of classes) {
      for (let e = 0; e < 3; e++) {
        const examRes = await request('POST', '/api/exams', {
          classId: cls.id, name: `${examNames[e]} - ${cls.name}`,
          subject: subjects[e], date: `2026-0${e + 1}-20`, term: '2026春季',
        }, admin.token);
        if (examRes.status === 201 || examRes.status === 200) {
          store.examIds.push(examRes.data.id);
          pass(`Exam: ${examNames[e]} - ${cls.name}`);
        } else { fail(`Exam`, `${examRes.status} ${JSON.stringify(examRes.data?.message || '')}`); }
        await sleep(80);
      }
    }

    // Create grades with varying scores for analysis testing
    for (const teacher of teachers.slice(0, 5)) {
      for (const cls of classes.slice(0, 3)) {
        const lr = await request('POST', '/api/auth/unified-login', { username: teacher.username, password: 'teacher123' });
        if (!lr.data?.token) continue;
        const tToken = lr.data.token;
        const studRes = await request('GET', `/api/students?classId=${cls.id}`, null, tToken);
        const students = Array.isArray(studRes.data) ? studRes.data : (studRes.data?.items || studRes.data?.data || []);
        if (students.length === 0) continue;

        for (let e = 0; e < 3; e++) {
          const scores = students.map((st, idx) => ({
            studentId: st.id,
            score: 50 + Math.floor(Math.random() * 50),
          }));
          const gRes = await request('POST', '/api/grades', {
            classId: cls.id, subject: teacher.subject,
            examName: examNames[e], date: `2026-0${e + 1}-15`, scores,
          }, tToken);
          if (gRes.status === 201 || gRes.status === 200) pass(`Grade: ${cls.name} ${teacher.subject} ${examNames[e]}`);
          else fail(`Grade`, `${gRes.status} ${JSON.stringify(gRes.data?.message || '')}`);
          await sleep(100);
        }
      }
    }
  }

  // Step 11: Create rewards and engagement data
  log('\nStep 11: Creating Rewards...');
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const teachers = store.teachers.filter(t => t.schoolIndex === s);
    const classes = store.classes.filter(c => c.schoolIndex === s);
    for (const teacher of teachers.slice(0, 3)) {
      for (const cls of classes.slice(0, 2)) {
        const lr = await request('POST', '/api/auth/unified-login', { username: teacher.username, password: 'teacher123' });
        if (!lr.data?.token) continue;
        const tToken = lr.data.token;
        const studRes = await request('GET', `/api/students?classId=${cls.id}`, null, tToken);
        const students = Array.isArray(studRes.data) ? studRes.data : (studRes.data?.items || []);
        for (let i = 0; i < Math.min(3, students.length); i++) {
          const rRes = await request('POST', '/api/reward-records', {
            studentId: students[i].id, classId: cls.id, type: '奖励',
            content: '学习进步', score: 5 + Math.floor(Math.random() * 10),
          }, tToken);
          if (rRes.status === 201 || rRes.status === 200) pass(`Reward`);
          await sleep(50);
        }
        for (let i = 0; i < Math.min(2, students.length); i++) {
          const scRes = await request('POST', '/api/score-records', {
            studentId: students[i].id, classId: cls.id, change: 5, reason: '课堂表现好',
          }, tToken);
          if (scRes.status === 201 || scRes.status === 200) pass(`Score`);
          await sleep(50);
        }
      }
    }
  }

  // Step 12: Create duty rosters
  log('\nStep 12: Creating Duty Rosters...');
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const classes = store.classes.filter(c => c.schoolIndex === s);
    for (const cls of classes.slice(0, 3)) {
      for (let d = 0; d < 5; d++) {
        const res = await request('POST', '/api/duty-rosters', {
          classId: cls.id, date: `2026-0${d + 1}-0${(d % 9) + 1}`,
          dutyType: ['卫生', '纪律', '学习'][d % 3], content: `第${d + 1}天值日`,
        }, admin.token);
        if (res.status === 201 || res.status === 200) pass(`Duty: ${cls.name}`);
        else fail(`Duty`, `${res.status}`);
        await sleep(50);
      }
    }
  }

  // Save data store
  fs.writeFileSync('/workspace/work-system/scripts/test-data-store.json', JSON.stringify({
    schools: store.schools, teachers: store.teachers, classes: store.classes,
    schoolAdmins: store.schoolAdmins.map(a => ({ ...a, token: undefined })),
    examIds: store.examIds,
    summary: { schools: store.schools.length, schoolAdmins: store.schoolAdmins.length, teachers: store.teachers.length, classes: store.classes.length, examIds: store.examIds.length },
  }, null, 2));

  log('\n' + '='.repeat(50));
  log('=== Test Data Seeding Complete ===');
  log(`  Schools: ${store.schools.length}`);
  log(`  School Admins: ${store.schoolAdmins.length}`);
  log(`  Teachers: ${store.teachers.length}`);
  log(`  Classes: ${store.classes.length}`);
  log(`  Exams: ${store.examIds.length}`);
  log(`  Passed: ${store.results.passed}`);
  log(`  Failed: ${store.results.failed}`);
  if (store.results.errors.length > 0) {
    log('\n  Errors:');
    store.results.errors.forEach(e => log(`    - ${e.msg}: ${e.error}`));
  }
}

main().catch(console.error);