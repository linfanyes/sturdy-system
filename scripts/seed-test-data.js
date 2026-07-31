/**
 * Test Data Seeder for Work System
 * Creates 5-10 records per test case for comprehensive testing
 * 
 * Generated:
 * - 5 schools
 * - 5 school admins (1 per school)
 * - 10 teachers per school = 50 teachers
 * - 5 classes per school = 25 classes
 * - 8 students per class = 200 students
 * - 3 notices per school = 15 notices
 * - Grades/exams for testing
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
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const store = {
  schools: [],
  schoolAdmins: [],
  teachers: [],
  classes: [],
  students: [],
  tokens: {},
  results: { passed: 0, failed: 0, errors: [] },
};

function log(msg) {
  console.log(`[${new Date().toISOString().split('T')[1]}] ${msg}`);
}

function pass(msg) {
  store.results.passed++;
  log(`  ✅ ${msg}`);
}

function fail(msg, err) {
  store.results.failed++;
  store.results.errors.push({ msg, error: err });
  log(`  ❌ ${msg}: ${err}`);
}

async function main() {
  log('=== Test Data Seeding ===\n');

  // Step 1: Login as super admin
  log('Step 1: Super Admin Login...');
  const loginRes = await request('POST', '/api/admin/login', {
    username: 'admin',
    password: 'admin123',
  });
  if (loginRes.data?.token) {
    store.tokens.super = loginRes.data.token;
    pass('Super admin logged in');
  } else {
    fail('Super admin login', `${loginRes.status} ${JSON.stringify(loginRes.data)}`);
    process.exit(1);
  }

  // Step 2: Create 5 schools (need prefix field)
  log('\nStep 2: Creating 5 Schools...');
  const schoolConfigs = [
    { prefix: 'YG', name: '阳光小学', address: '朝阳区阳光路1号', contact: '张主任', phone: '13800000001' },
    { prefix: 'YC', name: '育才中学', address: '海淀区育才路2号', contact: '李主任', phone: '13800000002' },
    { prefix: 'SY', name: '实验学校', address: '西城区实验路3号', contact: '赵主任', phone: '13800000003' },
    { prefix: 'DY', name: '第一小学', address: '东城区第一路4号', contact: '孙主任', phone: '13800000004' },
    { prefix: 'XS', name: '新世纪学校', address: '丰台区新世纪路5号', contact: '周主任', phone: '13800000005' },
  ];
  for (const cfg of schoolConfigs) {
    const res = await request('POST', '/api/admin/schools', {
      prefix: cfg.prefix,
      name: cfg.name,
      address: cfg.address,
      contact: cfg.contact,
      phone: cfg.phone,
      platform: 'mini',
    }, store.tokens.super);
    if (res.status === 201 || res.status === 200) {
      store.schools.push({ ...res.data, prefix: cfg.prefix });
      pass(`School: ${cfg.name} (code: ${res.data.code})`);
    } else {
      fail(`School ${cfg.name}`, `${res.status} ${JSON.stringify(res.data?.message || res.data)}`);
    }
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
      username: cfg.username,
      password: cfg.password,
      name: cfg.name,
      schoolId: store.schools[cfg.schoolIdx].id,
      enabled: true,
    }, store.tokens.super);
    if (res.status === 201 || res.status === 200) {
      store.schoolAdmins.push({ ...res.data, schoolIndex: cfg.schoolIdx, username: cfg.username, password: cfg.password });
      pass(`School Admin: ${cfg.username} → ${store.schools[cfg.schoolIdx].name}`);
    } else {
      fail(`School Admin ${cfg.username}`, `${res.status} ${JSON.stringify(res.data?.message || res.data)}`);
    }
    await sleep(100);
  }

  // Step 4: Login all school admins
  log('\nStep 4: Logging in School Admins...');
  for (const admin of store.schoolAdmins) {
    const loginRes = await request('POST', '/api/school-admin/login', {
      username: admin.username,
      password: admin.password,
    });
    if (loginRes.data?.token) {
      admin.token = loginRes.data.token;
      pass(`${admin.username} logged in`);
    } else {
      fail(`${admin.username} login`, `${loginRes.status}`);
    }
    await sleep(100);
  }

  // Step 5: Create teachers (10 per school = 50 total)
  log('\nStep 5: Creating Teachers...');
  const subjects = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育', '信息技术', '综合实践'];
  const surnames = ['张', '王', '李', '赵', '孙', '周', '吴', '郑', '冯', '陈', '刘', '杨', '黄', '林', '何'];
  const givenNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋'];

  for (let s = 0; s < store.schools.length; s++) {
    const school = store.schools[s];
    const admin = store.schoolAdmins[s];
    log(`  Creating 10 teachers for ${school.name}...`);

    for (let t = 0; t < 10; t++) {
      const gender = t % 2 === 0 ? '男' : '女';
      const name = surnames[t] + givenNames[(s + t) % 10];
      const subject = subjects[t];
      const teacherNo = `JS${school.code}${String(10000 + t + s * 10).slice(-5)}`;

      const res = await request('POST', '/api/school-admin/teachers', {
        username: `teacher_${s + 1}_${t + 1}`,
        password: 'teacher123',
        name: name,
        gender: gender,
        subject: subject,
        teacherNo: teacherNo,
        phone: `139${String(10000000 + s * 100 + t).padStart(8, '0')}`,
      }, admin.token);
      if (res.status === 201 || res.status === 200) {
        store.teachers.push({
          id: res.data.id,
          schoolIndex: s,
          name: name,
          username: `teacher_${s + 1}_${t + 1}`,
          password: 'teacher123',
          subject: subject,
          subjects: [subject],
          gender: gender,
          teacherNo: teacherNo,
        });
        pass(`Teacher: ${name} (${subject})`);
      } else {
        fail(`Teacher teacher_${s + 1}_${t + 1}`, `${res.status} ${JSON.stringify(res.data?.message || '')}`);
      }
      await sleep(100);
    }
  }

  // Step 6: Create classes (5 per school = 25 total)
  log('\nStep 6: Creating Classes...');
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级'];
  for (let s = 0; s < store.schools.length; s++) {
    const school = store.schools[s];
    const admin = store.schoolAdmins[s];
    const schoolTeachers = store.teachers.filter(t => t.schoolIndex === s);
    log(`  Creating 5 classes for ${school.name}...`);

    for (let c = 0; c < 5; c++) {
      const headTeacher = schoolTeachers[c % schoolTeachers.length];
      const classSubjects = [subjects[c], subjects[(c + 1) % 10]];

      const res = await request('POST', '/api/school-admin/classes', {
        name: `${grades[c]}${['1', '2', '3', '4', '5'][c]}班`,
        grade: grades[c],
        classNo: `${c + 1}`,
        headTeacher: headTeacher.name,
        headTeacherId: headTeacher.id,
        term: '2026春季',
        subjects: classSubjects,
      }, admin.token);
      if (res.status === 201 || res.status === 200) {
        store.classes.push({
          id: res.data.id,
          name: res.data.name,
          schoolIndex: s,
          headTeacher: headTeacher.name,
          headTeacherId: headTeacher.id,
          subjects: classSubjects,
        });
        pass(`Class: ${res.data.name} (班主任: ${headTeacher.name})`);
      } else {
        fail(`Class ${grades[c]}${c + 1}班`, `${res.status} ${JSON.stringify(res.data?.message || '')}`);
      }
      await sleep(100);
    }
  }

  // Step 7: Create students (8 per class = 200 total)
  log('\nStep 7: Creating Students (8 per class)...');
  const studentNames = ['小明', '小红', '小刚', '小丽', '小强', '小芳', '小军', '小燕'];

  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    const schoolClasses = store.classes.filter(c => c.schoolIndex === s);
    log(`  Creating students for school ${s + 1}...`);

    for (const cls of schoolClasses) {
      const studentsToCreate = studentNames.map((name, idx) => ({
        name: `${name}${s + 1}`,
        gender: idx % 2 === 0 ? '男' : '女',
        studentNo: `ST${s + 1}${String(store.classes.indexOf(cls) + 1).padStart(2, '0')}${String(idx + 1).padStart(2, '0')}`,
        classId: cls.id,
        parentName: `家长${name}`,
        parentPhone: `137${String(10000000 + s * 500 + idx).padStart(8, '0')}`,
      }));

      const res = await request('POST', '/api/school-admin/students/batch', {
        students: studentsToCreate,
      }, admin.token);
      if (res.status === 201 || res.status === 200) {
        const count = Array.isArray(res.data) ? res.data.length : (res.data?.count || studentsToCreate.length);
        pass(`${cls.name}: ${count} students`);
      } else {
        fail(`Students for ${cls.name}`, `${res.status} ${JSON.stringify(res.data?.message || '')}`);
      }
      await sleep(200);
    }
  }

  // Step 8: Create school notices
  log('\nStep 8: Creating School Notices...');
  const noticeTitles = ['开学通知', '考试安排', '放假通知'];
  for (let s = 0; s < store.schools.length; s++) {
    const admin = store.schoolAdmins[s];
    for (let n = 0; n < 3; n++) {
      const res = await request('POST', '/api/school-admin/notices', {
        title: `${noticeTitles[n]} - ${store.schools[s].name}`,
        content: `${store.schools[s].name}${noticeTitles[n]}详情：请全体师生注意相关安排。`,
        pinned: n === 0,
      }, admin.token);
      if (res.status === 201 || res.status === 200) {
        pass(`Notice: ${noticeTitles[n]}`);
      } else {
        fail(`Notice ${noticeTitles[n]}`, `${res.status}`);
      }
      await sleep(100);
    }
  }

  // Step 9: Create grades/exams for first 2 schools
  log('\nStep 9: Creating Grades and Exams...');
  const examNames = ['期中考试', '期末考试', '月考'];
  for (let s = 0; s < 2; s++) {
    const teachers = store.teachers.filter(t => t.schoolIndex === s);
    const classes = store.classes.filter(c => c.schoolIndex === s);
    log(`  Creating grades for school ${s + 1}...`);

    for (const teacher of teachers.slice(0, 3)) {
      const loginRes = await request('POST', '/api/auth/unified-login', {
        username: teacher.username,
        password: 'teacher123',
      });
      if (!loginRes.data?.token) {
        fail(`Teacher ${teacher.username} login`, 'failed');
        continue;
      }
      const teacherToken = loginRes.data.token;

      for (const cls of classes.slice(0, 2)) {
        for (let e = 0; e < 2; e++) {
          const studentsRes = await request('GET', `/api/students?classId=${cls.id}`, null, teacherToken);
          const students = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.data || []);

          if (students.length > 0) {
            const scores = students.map(st => ({
              studentId: st.id,
              score: 60 + Math.floor(Math.random() * 40),
            }));

            const gradeRes = await request('POST', '/api/grades', {
              classId: cls.id,
              subject: teacher.subject,
              examName: examNames[e],
              date: `2026-0${e + 1}-15`,
              scores: scores,
            }, teacherToken);
            if (gradeRes.status === 201 || gradeRes.status === 200) {
              pass(`Grade: ${cls.name} - ${examNames[e]}`);
            } else {
              fail(`Grade ${cls.name} - ${examNames[e]}`, `${gradeRes.status} ${JSON.stringify(gradeRes.data?.message || '')}`);
            }
          }
          await sleep(200);
        }
      }
    }
  }

  // Step 10: Create some exams
  log('\nStep 10: Creating Exams...');
  for (let s = 0; s < 2; s++) {
    const admin = store.schoolAdmins[s];
    const classes = store.classes.filter(c => c.schoolIndex === s);
    for (const cls of classes.slice(0, 2)) {
      for (let e = 0; e < 3; e++) {
        const res = await request('POST', '/api/exams', {
          classId: cls.id,
          name: `${examNames[e]} - ${cls.name}`,
          subject: subjects[e],
          date: `2026-0${e + 1}-20`,
        }, admin.token);
        if (res.status === 201 || res.status === 200) {
          pass(`Exam: ${cls.name} - ${examNames[e]}`);
        } else {
          fail(`Exam ${cls.name}`, `${res.status}`);
        }
        await sleep(100);
      }
    }
  }

  // Save data store
  fs.writeFileSync('/workspace/work-system/scripts/test-data-store.json', JSON.stringify({
    schools: store.schools,
    teachers: store.teachers,
    classes: store.classes,
    students: store.students,
    schoolAdmins: store.schoolAdmins.map(a => ({ ...a, token: undefined })),
    summary: {
      schools: store.schools.length,
      schoolAdmins: store.schoolAdmins.length,
      teachers: store.teachers.length,
      classes: store.classes.length,
      students: store.students.length,
    }
  }, null, 2));

  // Final summary
  log('\n' + '='.repeat(50));
  log('=== Test Data Seeding Complete ===');
  log(`  Schools: ${store.schools.length}`);
  log(`  School Admins: ${store.schoolAdmins.length}`);
  log(`  Teachers: ${store.teachers.length}`);
  log(`  Classes: ${store.classes.length}`);
  log(`  Students: ${store.students.length}`);
  log(`  Notices: ${store.schools.length * 3}`);
  log(`  Grades/Exams: Created`);
  log('\n  Passed: ' + store.results.passed);
  log('  Failed: ' + store.results.failed);
  
  if (store.results.errors.length > 0) {
    log('\n  Errors:');
    store.results.errors.forEach(e => log(`    - ${e.msg}: ${e.error}`));
  }

  log('\n  Data saved to: scripts/test-data-store.json');
  log('  Test credentials:');
  log('    Super Admin: admin / admin123');
  log('    School Admin: admin_school_1..5 / admin123');
  log('    Teacher: teacher_1_1..5_10 / teacher123');
}

main().catch(console.error);
