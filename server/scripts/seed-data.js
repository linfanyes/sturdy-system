"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const node_crypto_1 = __importDefault(require("node:crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const school_entity_1 = require("../src/school/school.entity");
const school_admin_entity_1 = require("../src/school-admin/school-admin.entity");
const user_entity_1 = require("../src/users/user.entity");
const class_entity_1 = require("../src/classes/class.entity");
const class_member_entity_1 = require("../src/class-members/class-member.entity");
const student_entity_1 = require("../src/students/student.entity");
const parent_entity_1 = require("../src/parent/parent.entity");
const student_parent_entity_1 = require("../src/student-parent/student-parent.entity");
const exam_entity_1 = require("../src/exams/exam.entity");
const grade_entity_1 = require("../src/grades/grade.entity");
const school_entity_2 = require("../src/school/school.entity");
const resource_library_entity_1 = require("../src/resource-library/resource-library.entity");
const resource_library_seed_data_1 = require("../src/resource-library/resource-library.seed-data");
const textbook_entity_1 = require("../src/textbook/textbook.entity");
const textbook_seed_data_1 = require("../src/textbook/textbook.seed-data");
const seed_common_1 = require("./seed-common");
const SCHOOL_PREFIXES = ['XA', 'XB', 'XC', 'XD', 'XE'];
const NOTICE_TITLES = ['家长会通知', '作业提醒', '安全教育告家长书', '期中表彰名单', '春季运动会安排', '期末考试安排', '放假通知', '返校通知'];
const EXAM_NAMES = ['第一次月考', '期中考试', '第二次月考', '第三次月考', '第四次月考', '第五次月考', '第六次月考', '期末考试', '摸底考试', '综合测试'];
async function createSchool(ds, s, m, pwHash) {
    const code = await (0, seed_common_1.genSchoolCode)(SCHOOL_PREFIXES[s], ds);
    const school = await ds.getRepository(school_entity_1.School).save(ds.getRepository(school_entity_1.School).create({
        code, name: `第${s + 1}实验小学`, address: `测试市测试区${s + 1}号`,
        contact: '教务处', phone: `1380000000${s}`, status: 'active',
    }));
    m.schools.push(school.id);
    const adminUsername = `sa${s + 1}`;
    const admin = await ds.getRepository(school_admin_entity_1.SchoolAdmin).save(ds.getRepository(school_admin_entity_1.SchoolAdmin).create({
        username: adminUsername, passwordHash: pwHash, name: `${school.name}主任`,
        schoolId: school.id,
        permissions: ['teachers', 'classes', 'students', 'exams', 'grades', 'attendance',
            'schedule', 'homework', 'notices', 'ai', 'tools', 'games', 'finance', 'activities', 'rewards', 'parents'],
        enabled: true,
    }));
    m.schoolAdmins.push(admin.id);
    const teachers = [];
    for (let t = 0; t < seed_common_1.SEED_CONFIG.teachersPerSchool; t++) {
        const teacherNo = 'JS' + code + String(t + 1).padStart(5, '0');
        const subject = seed_common_1.ALL_SUBJECTS[t % seed_common_1.ALL_SUBJECTS.length];
        const position = seed_common_1.POSITIONS[t % seed_common_1.POSITIONS.length];
        const name = (0, seed_common_1.genName)();
        const u = await ds.getRepository(user_entity_1.User).save(ds.getRepository(user_entity_1.User).create({
            username: teacherNo, passwordHash: pwHash, name, schoolId: school.id,
            school: school.name, subject, subjects: [subject], position,
            positions: [position], grade: seed_common_1.GRADES[t % seed_common_1.GRADES.length], teacherNo, enabled: true, gender: (0, seed_common_1.pick)(['男', '女']),
        }));
        teachers.push(u);
        m.teachers.push(u.id);
    }
    const subjectTeacherMap = {};
    for (const subj of seed_common_1.ALL_SUBJECTS) {
        subjectTeacherMap[subj] = teachers
            .filter((t) => (t.subjects || []).includes(subj))
            .map((t) => t.id);
    }
    for (let g = 0; g < seed_common_1.GRADES.length; g++) {
        const grade = seed_common_1.GRADES[g];
        for (let c = 0; c < seed_common_1.SEED_CONFIG.classesPerGrade; c++) {
            const head = teachers[(g * seed_common_1.SEED_CONFIG.classesPerGrade + c) % teachers.length];
            const className = `${grade}${c + 1}班`;
            const cls = await ds.getRepository(class_entity_1.ClassItem).save(ds.getRepository(class_entity_1.ClassItem).create({
                name: className, grade, classNo: String(c + 1), headTeacher: head.name,
                term: '2026春季', subjects: seed_common_1.ALL_SUBJECTS, color: 'butter', slogan: '勤奋向上',
            }));
            m.classes.push(cls.id);
            const headMember = await ds.getRepository(class_member_entity_1.ClassMember).save(ds.getRepository(class_member_entity_1.ClassMember).create({
                classId: cls.id, teacherId: head.id, className, role: 'head',
                subjects: [head.subject], term: '2026春季',
            }));
            m.classMembers.push(headMember.id);
            for (const subj of seed_common_1.ALL_SUBJECTS) {
                const candidates = subjectTeacherMap[subj] || [];
                const tid = candidates.find((id) => id !== head.id) || candidates[0];
                if (!tid)
                    continue;
                const sm = await ds.getRepository(class_member_entity_1.ClassMember).save(ds.getRepository(class_member_entity_1.ClassMember).create({
                    classId: cls.id, teacherId: tid, className, role: 'subject',
                    subjects: [subj], term: '2026春季',
                }));
                m.classMembers.push(sm.id);
            }
            const students = [];
            for (let st = 0; st < seed_common_1.SEED_CONFIG.studentsPerClass; st++) {
                const surname = (0, seed_common_1.pick)(seed_common_1.SURNAMES);
                const name = surname + (0, seed_common_1.pick)(seed_common_1.GIVEN);
                const studentNo = `${s + 1}${g + 1}${c + 1}${String(st + 1).padStart(3, '0')}`;
                const gender = (0, seed_common_1.pick)(['男', '女']);
                const parentPhone = '1' + (0, seed_common_1.pick)(['3', '5', '7', '8', '9']) + (0, seed_common_1.randInt)(100000000, 999999999).toString();
                const stu = await ds.getRepository(student_entity_1.Student).save(ds.getRepository(student_entity_1.Student).create({
                    classId: cls.id, name, gender, studentNo,
                    birthDate: `201${(0, seed_common_1.randInt)(2, 8)}-0${(0, seed_common_1.randInt)(1, 9)}-${String((0, seed_common_1.randInt)(1, 28)).padStart(2, '0')}`,
                    seatNo: st + 1, parentName: surname + '家长', parentPhone,
                    address: `测试市测试区${st + 1}号`, parentLoginEnabled: true,
                    parentPasswordHash: pwHash, teacherId: head.id,
                }));
                students.push(stu);
                m.students.push(stu.id);
                const relation = (0, seed_common_1.pick)(['父亲', '母亲']);
                const parentName = surname + (0, seed_common_1.pick)(seed_common_1.GIVEN);
                const parent = await ds.getRepository(parent_entity_1.Parent).save(ds.getRepository(parent_entity_1.Parent).create({
                    phone: parentPhone, parentName, relation, passwordHash: pwHash,
                }));
                m.parents.push(parent.id);
                const openId = 'wx_' + node_crypto_1.default.randomBytes(12).toString('hex');
                const sp = await ds.getRepository(student_parent_entity_1.StudentParent).save(ds.getRepository(student_parent_entity_1.StudentParent).create({
                    studentId: stu.id, parentId: parent.id, openId, relation,
                    nickName: parentName, isPrimary: true, schoolId: school.id, classId: cls.id,
                }));
                m.studentParents.push(sp.id);
                stu.parentId = parent.id;
                stu.parentNickName = parentName;
                await ds.getRepository(student_entity_1.Student).save(stu);
            }
            const exams = [];
            for (let e = 0; e < seed_common_1.SEED_CONFIG.examsPerClass; e++) {
                const exam = await ds.getRepository(exam_entity_1.Exam).save(ds.getRepository(exam_entity_1.Exam).create({
                    term: '2026春季', name: EXAM_NAMES[e % EXAM_NAMES.length], teacherName: head.name,
                    classId: cls.id, subjects: seed_common_1.CORE_SUBJECTS,
                    subjectFullScores: Object.fromEntries(seed_common_1.CORE_SUBJECTS.map((x) => [x, 100])),
                    date: `2026-0${(e % 9) + 2}-${String((e % 28) + 1).padStart(2, '0')}`, note: '', teacherId: head.id,
                }));
                exams.push(exam);
                m.exams.push(exam.id);
            }
            for (const exam of exams) {
                for (const subj of exam.subjects) {
                    const scores = students.map((st) => ({ studentId: st.id, score: (0, seed_common_1.randInt)(40, 100) }));
                    const where = { classId: cls.id, examName: exam.name, subject: subj, teacherId: head.id };
                    const existing = await ds.getRepository(grade_entity_1.Grade).findOne({ where: where });
                    if (existing) {
                        existing.scores = scores;
                        existing.date = exam.date;
                        existing.examId = exam.id;
                        await ds.getRepository(grade_entity_1.Grade).save(existing);
                        m.grades.push(existing.id);
                    }
                    else {
                        const g = await ds.getRepository(grade_entity_1.Grade).save(ds.getRepository(grade_entity_1.Grade).create({
                            classId: cls.id, subject: subj, examName: exam.name, examId: exam.id,
                            date: exam.date, scores, teacherId: head.id,
                        }));
                        m.grades.push(g.id);
                    }
                }
            }
            for (let n = 0; n < 3; n++) {
                const notice = await ds.getRepository(school_entity_2.Notice).save(ds.getRepository(school_entity_2.Notice).create({
                    teacherId: head.id, classId: cls.id,
                    title: `${className}：${(0, seed_common_1.pick)(NOTICE_TITLES)}`, content: '这是测试公告内容。',
                    scope: 'class', pinned: n === 0, ended: false,
                }));
                m.notices.push(notice.id);
            }
            for (let d = 1; d <= 5; d++) {
                for (let p = 1; p <= 7; p++) {
                    const subj = seed_common_1.ALL_SUBJECTS[(d * 7 + p) % seed_common_1.ALL_SUBJECTS.length];
                    const tid = (subjectTeacherMap[subj] || [])[0];
                    const teacherName = tid ? (teachers.find((t) => t.id === tid)?.name || head.name) : head.name;
                    const sched = await ds.getRepository(school_entity_2.ScheduleItem).save(ds.getRepository(school_entity_2.ScheduleItem).create({
                        classId: cls.id, dayOfWeek: d, period: p, weekType: 'all',
                        subject: subj, teacher: teacherName, note: '', teacherId: head.id,
                    }));
                    m.schedules.push(sched.id);
                }
            }
            console.log(`    ✓ 班级[${className}] 完成：${seed_common_1.SEED_CONFIG.studentsPerClass} 学生 / ${seed_common_1.SEED_CONFIG.examsPerClass} 考试`);
        }
        const sn = await ds.getRepository(school_entity_2.Notice).save(ds.getRepository(school_entity_2.Notice).create({
            teacherId: admin.id, classId: '__school__', title: `${school.name}开学公告`,
            content: `欢迎来到${school.name}，本学期正式开始。`, scope: 'school', pinned: true, ended: false,
        }));
        m.notices.push(sn.id);
        console.log(`  ✓ 学校[${school.name}] 完成：校管 sa${s + 1} / 教师 ${teachers.length} / 年级 ${seed_common_1.GRADES.length}`);
    }
    for (const seed of resource_library_seed_data_1.SEED_POEMS) {
        await ds.getRepository(resource_library_entity_1.Poem).save(ds.getRepository(resource_library_entity_1.Poem).create({
            schoolId: school.id, title: seed.title, dynasty: seed.dynasty, author: seed.author,
            content: seed.content, translation: seed.translation || '', appreciation: seed.appreciation || '',
            grade: seed.grade, keywords: seed.keywords, status: 'published',
        }));
    }
    for (const seed of resource_library_seed_data_1.SEED_MATH_FORMULAS) {
        await ds.getRepository(resource_library_entity_1.MathFormula).save(ds.getRepository(resource_library_entity_1.MathFormula).create({
            schoolId: school.id, title: seed.title, category: seed.category, formula: seed.formula,
            explanation: seed.explanation || '', example: seed.example || '',
            grade: seed.grade, keywords: seed.keywords, status: 'published',
        }));
    }
    for (const seed of resource_library_seed_data_1.SEED_ENGLISH_WORDS) {
        await ds.getRepository(resource_library_entity_1.EnglishWord).save(ds.getRepository(resource_library_entity_1.EnglishWord).create({
            schoolId: school.id, word: seed.word, phonetic: seed.phonetic, meaning: seed.meaning,
            category: seed.category, example: seed.example || '', grade: seed.grade,
            status: 'published',
        }));
    }
    for (const seed of textbook_seed_data_1.SEED_TEXTBOOKS) {
        const existing = await ds.getRepository(textbook_entity_1.Textbook).findOne({
            where: { schoolId: school.id, publisher: seed.publisher, subject: seed.subject, grade: seed.grade, term: seed.term },
        });
        if (existing)
            continue;
        const tb = await ds.getRepository(textbook_entity_1.Textbook).save(ds.getRepository(textbook_entity_1.Textbook).create({
            schoolId: school.id, publisher: seed.publisher, subject: seed.subject,
            grade: seed.grade, term: seed.term, name: seed.name, status: 'published',
        }));
        for (let i = 0; i < seed.units.length; i++) {
            const su = seed.units[i];
            const unit = await ds.getRepository(textbook_entity_1.TextbookUnit).save(ds.getRepository(textbook_entity_1.TextbookUnit).create({
                textbookId: tb.id, unitOrder: i + 1, title: su.title, summary: su.summary || '',
            }));
            for (let j = 0; j < su.points.length; j++) {
                const sp = su.points[j];
                await ds.getRepository(textbook_entity_1.TextbookKnowledgePoint).save(ds.getRepository(textbook_entity_1.TextbookKnowledgePoint).create({
                    unitId: unit.id, pointOrder: j + 1,
                    title: sp.title, type: sp.type, content: sp.content,
                    difficulty: sp.difficulty, keywords: sp.keywords,
                }));
            }
        }
    }
}
async function main() {
    const ds = (0, seed_common_1.buildDataSource)();
    await ds.initialize();
    console.log('✅ 数据库连接成功');
    const prev = (0, seed_common_1.loadManifest)();
    if (prev) {
        console.log('⚠ 发现旧种子清单，先清除再重新生成...');
        await (0, seed_common_1.clearByManifest)(ds, prev);
        (0, seed_common_1.clearManifest)();
    }
    const m = {
        schools: [], schoolAdmins: [], teachers: [], classes: [], classMembers: [],
        students: [], parents: [], studentParents: [], exams: [], grades: [],
        notices: [], schedules: [],
    };
    const pwHash = bcrypt_1.default.hashSync(seed_common_1.SEED_CONFIG.defaultPassword, 10);
    console.log(`\n🚀 开始生成测试数据：${seed_common_1.SEED_CONFIG.schools} 学校 × ${seed_common_1.GRADES.length} 年级 × ${seed_common_1.SEED_CONFIG.classesPerGrade} 班级 × ${seed_common_1.SEED_CONFIG.studentsPerClass} 学生\n`);
    for (let s = 0; s < seed_common_1.SEED_CONFIG.schools; s++) {
        await createSchool(ds, s, m, pwHash);
    }
    (0, seed_common_1.saveManifest)(m);
    console.log('\n✅ 测试数据生成完成');
    console.log(`   学校 ${m.schools.length} · 校管 ${m.schoolAdmins.length} · 教师 ${m.teachers.length} · 班级 ${m.classes.length}`);
    console.log(`   学生 ${m.students.length} · 家长 ${m.parents.length} · 考试 ${m.exams.length} · 成绩 ${m.grades.length}`);
    console.log(`   公告 ${m.notices.length} · 课表 ${m.schedules.length}`);
    console.log(`\n🔑 默认登录口令：${seed_common_1.SEED_CONFIG.defaultPassword}`);
    console.log(`   校管账号示例：sa1 / ${seed_common_1.SEED_CONFIG.defaultPassword}`);
    console.log(`   教师账号示例：教师编号（如 JS<学校编号>00001，即 username=teacherNo） / ${seed_common_1.SEED_CONFIG.defaultPassword}`);
    console.log(`   清单已写入：${seed_common_1.MANIFEST_PATH}`);
    await ds.destroy();
}
main().catch((e) => {
    console.error('❌ 生成失败:', e?.message || e);
    if (e?.stack)
        console.error(e.stack);
    process.exit(1);
});
