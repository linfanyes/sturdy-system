"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genName = exports.pick = exports.randInt = exports.MANIFEST_PATH = exports.GIVEN = exports.SURNAMES = exports.POSITIONS = exports.GRADES = exports.CORE_SUBJECTS = exports.ALL_SUBJECTS = exports.SEED_CONFIG = void 0;
exports.genSchoolCode = genSchoolCode;
exports.buildDataSource = buildDataSource;
exports.loadManifest = loadManifest;
exports.saveManifest = saveManifest;
exports.clearManifest = clearManifest;
exports.clearByManifest = clearByManifest;
require("reflect-metadata");
require("dotenv/config");
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const typeorm_1 = require("typeorm");
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
const textbook_entity_1 = require("../src/textbook/textbook.entity");
exports.SEED_CONFIG = {
    schools: 5,
    teachersPerSchool: 24,
    classesPerGrade: 3,
    studentsPerClass: 30,
    examsPerClass: 10,
    defaultPassword: process.env.SEED_PASSWORD || 'Test@2026',
};
exports.ALL_SUBJECTS = [
    '语文', '数学', '英语', '科学', '物理', '化学', '生物', '历史', '地理', '政治',
    '音乐', '美术', '体育', '信息技术', '综合实践',
];
exports.CORE_SUBJECTS = ['语文', '数学', '英语'];
exports.GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
exports.POSITIONS = [
    '班主任', '年级组长', '教研组长', '备课组长', '学科带头人', '教务主任', '德育主任',
    '少先队辅导员', '信息管理员', '后勤管理员', '教研员', '学生会指导老师', '团委书记',
    '心理辅导老师', '图书馆管理员', '实验室管理员', '体育教研组长', '艺术指导',
    '安全专员', '家长学校负责人',
];
exports.SURNAMES = [
    '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱',
    '胡', '林', '郭', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
];
exports.GIVEN = [
    '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰',
    '娟', '涛', '明', '超', '霞', '平', '刚', '梅', '鹏', '宇', '浩', '晨', '欣', '悦',
    '梓', '涵', '睿', '嘉', '怡', '轩', '彤', '鑫', '璐', '倩', '波', '斌',
];
exports.MANIFEST_PATH = node_path_1.default.join(process.cwd(), 'seed-manifest.json');
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
exports.randInt = randInt;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
exports.pick = pick;
const genName = () => (0, exports.pick)(exports.SURNAMES) + (0, exports.pick)(exports.GIVEN);
exports.genName = genName;
async function genSchoolCode(prefix, ds) {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = letters + digits;
    const p = (prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
    const suffix = 'H';
    for (let a = 0; a < 50; a++) {
        const bytes = crypto.randomBytes(5);
        let rand = '';
        for (let i = 0; i < 5; i++)
            rand += all[bytes[i] % all.length];
        const code = p + rand + suffix;
        const dup = await ds.getRepository(school_entity_1.School).findOne({ where: { code } });
        if (!dup)
            return code;
    }
    const tail = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    return p + tail + suffix;
}
function buildDataSource() {
    return new typeorm_1.DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 3306),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'gardener',
        charset: 'utf8mb4',
        timezone: '+08:00',
        synchronize: false,
        entities: [
            school_entity_1.School, school_admin_entity_1.SchoolAdmin, user_entity_1.User, class_entity_1.ClassItem, class_member_entity_1.ClassMember,
            student_entity_1.Student, parent_entity_1.Parent, student_parent_entity_1.StudentParent, exam_entity_1.Exam, grade_entity_1.Grade, school_entity_2.Notice, school_entity_2.ScheduleItem,
            resource_library_entity_1.Poem, resource_library_entity_1.MathFormula, resource_library_entity_1.EnglishWord,
            textbook_entity_1.Textbook, textbook_entity_1.TextbookUnit, textbook_entity_1.TextbookKnowledgePoint,
        ],
    });
}
function loadManifest() {
    try {
        return JSON.parse(fs.readFileSync(exports.MANIFEST_PATH, 'utf8'));
    }
    catch {
        return null;
    }
}
function saveManifest(m) {
    fs.writeFileSync(exports.MANIFEST_PATH, JSON.stringify(m, null, 2));
}
function clearManifest() {
    try {
        fs.unlinkSync(exports.MANIFEST_PATH);
    }
    catch {
    }
}
async function clearByManifest(ds, m) {
    const repoMap = {
        grades: ds.getRepository(grade_entity_1.Grade),
        exams: ds.getRepository(exam_entity_1.Exam),
        studentParents: ds.getRepository(student_parent_entity_1.StudentParent),
        students: ds.getRepository(student_entity_1.Student),
        notices: ds.getRepository(school_entity_2.Notice),
        schedules: ds.getRepository(school_entity_2.ScheduleItem),
        classMembers: ds.getRepository(class_member_entity_1.ClassMember),
        classes: ds.getRepository(class_entity_1.ClassItem),
        teachers: ds.getRepository(user_entity_1.User),
        schoolAdmins: ds.getRepository(school_admin_entity_1.SchoolAdmin),
        parents: ds.getRepository(parent_entity_1.Parent),
        schools: ds.getRepository(school_entity_1.School),
    };
    const order = [
        'grades', 'exams', 'studentParents', 'students', 'notices', 'schedules',
        'classMembers', 'classes', 'teachers', 'schoolAdmins', 'parents', 'schools',
    ];
    for (const key of order) {
        const ids = m[key] || [];
        if (!ids.length)
            continue;
        try {
            await repoMap[key].delete(ids);
            console.log(`  ✓ 已清除 ${key}: ${ids.length} 条`);
        }
        catch (e) {
            console.warn(`  ⚠ 清除 ${key} 失败（跳过）: ${e?.message || e}`);
        }
    }
}
