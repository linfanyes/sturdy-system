import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';

// Use a test-specific module that overrides database to SQLite in-memory
import { TestAppModule } from './test-app.module';

// Entities
import { User } from '../../src/users/user.entity';
import { Student } from '../../src/students/student.entity';
import { ClassItem } from '../../src/classes/class.entity';
import { SchoolAdmin } from '../../src/school-admin/school-admin.entity';
import { School } from '../../src/school/school.entity';
import { Exam } from '../../src/exams/exam.entity';
import { Grade } from '../../src/grades/grade.entity';
import { Homework } from '../../src/school/school.entity';
import { Notice } from '../../src/school/school.entity';
import { ScheduleItem } from '../../src/school/school.entity';
import { Attendance } from '../../src/school/school.entity';
import { Resource } from '../../src/school/school.entity';
import { ParentContact } from '../../src/parent-contact/parent-contact.entity';
import { AwardRecord } from '../../src/award/award.entity';
import { NoteItem } from '../../src/notes/notes.entity';
import { DutyRoster } from '../../src/duty-roster/duty.entity';
import { ClassGallery } from '../../src/gallery/gallery.entity';
import { TeachingCalendarItem } from '../../src/teaching-calendar/teaching-calendar.entity';
import { ClassMember } from '../../src/class-members/class-member.entity';

// Shared constants
import { PHONE_REGEX, CLASS_NAMING_RULE, SUBJECT_VALUES, ROLE_VALUES, FEATURE_FLAGS_SET } from '@gardener/shared/constants';

/**
 * IntegrationTestContext - 集成测试上下文
 * 管理应用启动、数据库连接、测试工具实例
 */
export class IntegrationTestContext {
  app: INestApplication;
  module: TestingModule;
  dataSource: DataSource;
  httpServer: any;
  authHelper: TestAuthHelper;
  factory: TestDataFactory;

  // Repositories
  private userRepo: Repository<User>;
  private studentRepo: Repository<Student>;
  private classRepo: Repository<ClassItem>;
  private schoolAdminRepo: Repository<SchoolAdmin>;
  private schoolRepo: Repository<School>;
  private examRepo: Repository<Exam>;
  private gradeRepo: Repository<Grade>;
  private homeworkRepo: Repository<Homework>;
  private noticeRepo: Repository<Notice>;
  private scheduleRepo: Repository<ScheduleItem>;
  private attendanceRepo: Repository<Attendance>;
  private resourceRepo: Repository<Resource>;
  private parentContactRepo: Repository<ParentContact>;
  private awardRepo: Repository<AwardRecord>;
  private noteRepo: Repository<NoteItem>;
  private dutyRepo: Repository<DutyRoster>;
  private galleryRepo: Repository<ClassGallery>;
  private teachingCalendarRepo: Repository<TeachingCalendarItem>;
  private classMemberRepo: Repository<ClassMember>;

  static async create(): Promise<IntegrationTestContext> {
    const ctx = new IntegrationTestContext();
    await ctx.initialize();
    return ctx;
  }

  private async initialize() {
    this.module = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    this.app = this.module.createNestApplication();
    this.app.setGlobalPrefix('api');
    await this.app.init();

    this.httpServer = this.app.getHttpServer();
    this.dataSource = this.module.get(DataSource);
    const jwtService = this.module.get(JwtService);
    const configService = this.module.get(ConfigService);

    // Get repositories
    this.userRepo = this.module.get(getRepositoryToken(User));
    this.studentRepo = this.module.get(getRepositoryToken(Student));
    this.classRepo = this.module.get(getRepositoryToken(ClassItem));
    this.schoolAdminRepo = this.module.get(getRepositoryToken(SchoolAdmin));
    this.schoolRepo = this.module.get(getRepositoryToken(School));
    this.examRepo = this.module.get(getRepositoryToken(Exam));
    this.gradeRepo = this.module.get(getRepositoryToken(Grade));
    this.homeworkRepo = this.module.get(getRepositoryToken(Homework));
    this.noticeRepo = this.module.get(getRepositoryToken(Notice));
    this.scheduleRepo = this.module.get(getRepositoryToken(ScheduleItem));
    this.attendanceRepo = this.module.get(getRepositoryToken(Attendance));
    this.resourceRepo = this.module.get(getRepositoryToken(Resource));
    this.parentContactRepo = this.module.get(getRepositoryToken(ParentContact));
    this.awardRepo = this.module.get(getRepositoryToken(AwardRecord));
    this.noteRepo = this.module.get(getRepositoryToken(NoteItem));
    this.dutyRepo = this.module.get(getRepositoryToken(DutyRoster));
    this.galleryRepo = this.module.get(getRepositoryToken(ClassGallery));
    this.teachingCalendarRepo = this.module.get(getRepositoryToken(TeachingCalendarItem));
    this.classMemberRepo = this.module.get(getRepositoryToken(ClassMember));

    this.authHelper = new TestAuthHelper(jwtService, configService);
    this.factory = new TestDataFactory(
      this.dataSource,
      this.userRepo,
      this.studentRepo,
      this.classRepo,
      this.schoolAdminRepo,
      this.schoolRepo,
      this.examRepo,
      this.gradeRepo,
      this.homeworkRepo,
      this.noticeRepo,
      this.scheduleRepo,
      this.attendanceRepo,
      this.resourceRepo,
      this.parentContactRepo,
      this.awardRepo,
      this.noteRepo,
      this.dutyRepo,
      this.galleryRepo,
      this.teachingCalendarRepo,
      this.classMemberRepo,
    );
  }

  request() {
    return request(this.httpServer);
  }

  async teardown() {
    // 清理测试数据
    await this.cleanup();
    await this.app.close();
  }

  private async cleanup() {
    // 按依赖顺序清理
    await this.classMemberRepo.delete({});
    await this.studentRepo.delete({});
    await this.classRepo.delete({});
    await this.userRepo.delete({});
    await this.schoolAdminRepo.delete({});
    await this.schoolRepo.delete({});
    await this.examRepo.delete({});
    await this.gradeRepo.delete({});
    await this.homeworkRepo.delete({});
    await this.noticeRepo.delete({});
    await this.scheduleRepo.delete({});
    await this.attendanceRepo.delete({});
    await this.resourceRepo.delete({});
    await this.parentContactRepo.delete({});
    await this.awardRepo.delete({});
    await this.noteRepo.delete({});
    await this.dutyRepo.delete({});
    await this.galleryRepo.delete({});
    await this.teachingCalendarRepo.delete({});
  }
}

/**
 * TestAuthHelper - 生成各角色 JWT Token
 */
export class TestAuthHelper {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  superAdminToken(): string {
    return this.jwtService.sign({ sub: 'super', role: 'super' });
  }

  schoolAdminToken(adminId: string, schoolId: string): string {
    return this.jwtService.sign({ sub: adminId, role: 'school_admin', schoolId });
  }

  teacherToken(teacherId: string, schoolId: string): string {
    return this.jwtService.sign({ sub: teacherId, role: 'teacher', schoolId });
  }

  parentToken(params: {
    imUserId: string;
    studentId: string;
    studentName: string;
    classId: string;
    studentNo: string;
  }): string {
    return this.jwtService.sign({
      sub: params.imUserId,
      type: 'parent',
      studentId: params.studentId,
      studentName: params.studentName,
      classId: params.classId,
      studentNo: params.studentNo,
    });
  }

  teacherWechatToken(teacherId: string, openid: string, schoolId: string): string {
    return this.jwtService.sign({ sub: teacherId, openid, role: 'teacher', schoolId });
  }

  parentWechatToken(params: {
    imUserId: string;
    studentId: string;
    studentName: string;
    classId: string;
    studentNo: string;
  }): string {
    return this.jwtService.sign({
      sub: params.imUserId,
      type: 'parent',
      studentId: params.studentId,
      studentName: params.studentName,
      classId: params.classId,
      studentNo: params.studentNo,
    });
  }

  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }
}

/**
 * TestDataFactory - 测试数据工厂
 */
export class TestDataFactory {
  constructor(
    private dataSource: DataSource,
    private userRepo: Repository<User>,
    private studentRepo: Repository<Student>,
    private classRepo: Repository<ClassItem>,
    private schoolAdminRepo: Repository<SchoolAdmin>,
    private schoolRepo: Repository<School>,
    private examRepo: Repository<Exam>,
    private gradeRepo: Repository<Grade>,
    private homeworkRepo: Repository<Homework>,
    private noticeRepo: Repository<Notice>,
    private scheduleRepo: Repository<ScheduleItem>,
    private attendanceRepo: Repository<Attendance>,
    private resourceRepo: Repository<Resource>,
    private parentContactRepo: Repository<ParentContact>,
    private awardRepo: Repository<AwardRecord>,
    private noteRepo: Repository<NoteItem>,
    private dutyRepo: Repository<DutyRoster>,
    private galleryRepo: Repository<ClassGallery>,
    private teachingCalendarRepo: Repository<TeachingCalendarItem>,
    private classMemberRepo: Repository<ClassMember>,
  ) {}

  async createSchool(overrides: Partial<School> = {}): Promise<School> {
    const school = this.schoolRepo.create({
      code: `SCH${Date.now().toString().slice(-3)}`,
      name: '测试学校',
      address: '测试地址',
      contact: '测试联系人',
      phone: '13800138000',
      status: 'active',
      ...overrides,
    });
    return this.schoolRepo.save(school);
  }

  async createSchoolAdmin(schoolId: string, overrides: Partial<SchoolAdmin> = {}): Promise<SchoolAdmin> {
    const admin = this.schoolAdminRepo.create({
      username: `admin_${Date.now()}`,
      passwordHash: 'hashed_password',
      name: '测试校管',
      schoolId,
      permissions: ['school_manage', 'teacher_manage', 'student_manage', 'class_manage', 'data_analysis'],
      enabled: true,
      ...overrides,
    });
    return this.schoolAdminRepo.save(admin);
  }

  async createTeacher(schoolId: string, overrides: Partial<User> = {}): Promise<User> {
    const teacher = this.userRepo.create({
      username: `teacher_${Date.now()}`,
      passwordHash: 'hashed_password',
      name: '测试老师',
      school: '测试学校',
      schoolId,
      phone: '13800138001',
      features: [],
      enabled: true,
      avatar: '',
      teacherNo: `T${Date.now().toString().slice(-6)}`,
      ...overrides,
    });
    return this.userRepo.save(teacher);
  }

  async createClass(teacherId: string, grade: string, classNo: string, overrides: Partial<ClassItem> = {}): Promise<ClassItem> {
    const className = this.generateClassName(grade, classNo);
    const cls = this.classRepo.create({
      name: className,
      grade,
      classNo,
      headTeacher: teacherId,
      term: '2024-2025-1',
      ...overrides,
    });
    return this.classRepo.save(cls);
  }

  async createClassByAdmin(adminId: string, schoolId: string, overrides: Partial<ClassItem> = {}): Promise<ClassItem> {
    const cls = this.classRepo.create({
      name: this.generateClassName(overrides.grade || '一年级', overrides.classNo || '1'),
      grade: overrides.grade || '一年级',
      classNo: overrides.classNo || '1',
      headTeacher: overrides.headTeacher || '',
      teacherId: adminId,
      term: '2024-2025-1',
      ...overrides,
    });
    return this.classRepo.save(cls);
  }

  generateClassName(grade: string, classNo: string): string {
    return `${grade}${classNo}班`;
  }

  async createStudent(classId: string, teacherId: string, overrides: Partial<Student> = {}): Promise<Student> {
    const student = this.studentRepo.create({
      name: `学生_${Date.now()}`,
      gender: '男',
      studentNo: `S${Date.now().toString().slice(-6)}`,
      classId,
      teacherId,
      seatNo: 1,
      tags: [],
      parentName: '测试家长',
      parentPhone: '13800138002',
      parentId: '',
      parentLoginEnabled: true,
      ...overrides,
    });
    return this.studentRepo.save(student);
  }

  async createExam(teacherId: string, classId: string, overrides: Partial<Exam> = {}): Promise<Exam> {
    const exam = this.examRepo.create({
      name: '期中考试',
      date: new Date().toISOString().split('T')[0],
      term: '2024-2025-1',
      classId,
      teacherId,
      subjects: ['语文', '数学', '英语'],
      teacherName: '测试老师',
      ...overrides,
    });
    return this.examRepo.save(exam);
  }

  async createGrade(teacherId: string, classId: string, examId: string, overrides: Partial<Grade> = {}): Promise<Grade> {
    const grade = this.gradeRepo.create({
      teacherId,
      classId,
      examId,
      examName: '期中考试',
      subject: '语文',
      date: new Date().toISOString().split('T')[0],
      scores: [],
      ...overrides,
    });
    return this.gradeRepo.save(grade);
  }

  async createHomework(teacherId: string, classId: string, overrides: Partial<Homework> = {}): Promise<Homework> {
    const homework = this.homeworkRepo.create({
      teacherId,
      classId,
      subject: '语文',
      title: '语文作业',
      content: '完成课本练习',
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: '待批改',
      ...overrides,
    });
    return this.homeworkRepo.save(homework);
  }

  async createNotice(teacherId: string, classId: string, overrides: Partial<Notice> = {}): Promise<Notice> {
    const notice = this.noticeRepo.create({
      teacherId,
      classId,
      title: '测试公告',
      content: '公告内容',
      scope: 'class',
      pinned: false,
      ended: false,
      ...overrides,
    });
    return this.noticeRepo.save(notice);
  }

  async createSchedule(teacherId: string, classId: string, overrides: Partial<ScheduleItem> = {}): Promise<ScheduleItem> {
    const schedule = this.scheduleRepo.create({
      teacherId,
      classId,
      dayOfWeek: 1,
      period: 1,
      weekType: 'all',
      subject: '语文',
      teacher: '测试老师',
      ...overrides,
    });
    return this.scheduleRepo.save(schedule);
  }

  async addClassMember(teacherId: string, classId: string, role: 'head' | 'subject', subjects: string[] = []): Promise<ClassMember> {
    const member = this.classMemberRepo.create({
      teacherId,
      classId,
      role,
      subjects,
      term: '2024-2025-1',
    });
    return this.classMemberRepo.save(member);
  }

  // Additional factory methods for other entities...
  async createAttendance(classId: string, teacherId: string, date: string, records: any[]): Promise<Attendance> {
    const attendance = this.attendanceRepo.create({ classId, teacherId, date, records });
    return this.attendanceRepo.save(attendance);
  }

  async createAwardRecord(teacherId: string, overrides: Partial<AwardRecord> = {}): Promise<AwardRecord> {
    const award = this.awardRepo.create({
      name: '测试奖励',
      issuer: '测试老师',
      date: new Date().toISOString().split('T')[0],
      level: 'class',
      ...overrides,
    });
    return this.awardRepo.save(award);
  }

  async createParentContact(studentId: string, classId: string, teacherId: string, overrides: Partial<ParentContact> = {}): Promise<ParentContact> {
    const contact = this.parentContactRepo.create({
      studentId,
      studentName: '测试学生',
      classId,
      parentName: '测试家长',
      relation: '家长',
      phone: '13800138000',
      method: '电话',
      content: '测试联系记录',
      date: new Date().toISOString().split('T')[0],
      teacherId,
      ...overrides,
    });
    return this.parentContactRepo.save(contact);
  }
}

/**
 * 断言辅助函数
 */
export function expectSuccessResponse(res: any): any {
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('code', 200);
  expect(res.body).toHaveProperty('data');
  expect(res.body).toHaveProperty('message', 'success');
  expect(res.body).toHaveProperty('timestamp');
  return res.body.data;
}

export function expectErrorResponse(res: any, expectedStatus: number, expectedCode?: string): void {
  expect(res.status).toBe(expectedStatus);
  expect(res.body).toHaveProperty('code', expectedCode || getErrorCode(expectedStatus));
  expect(res.body).toHaveProperty('message');
  expect(res.body).toHaveProperty('statusCode', expectedStatus);
}

function getErrorCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE_ENTITY';
    case 429: return 'TOO_MANY_REQUESTS';
    case 500: return 'INTERNAL_ERROR';
    default: return 'ERROR';
  }
}

export function expectPaginatedResponse(data: any): void {
  expect(data).toHaveProperty('items');
  expect(data).toHaveProperty('total');
  expect(Array.isArray(data.items)).toBe(true);
  expect(typeof data.total).toBe('number');
}

/**
 * 验证共享常量对齐
 */
export function validateSharedConstants(): void {
  // 手机号正则
  expect(PHONE_REGEX).toEqual(/^1[3-9]\d{9}$/);
  expect('13800138000').toMatch(PHONE_REGEX);
  expect('12345678901').not.toMatch(PHONE_REGEX);

  // 班级命名规则
  expect(CLASS_NAMING_RULE.pattern).toEqual(
    /^((一|二|三|四|五|六)年级|初一|初二|初三|高一|高二|高三)([1-9]|[1-9]\d)班$/
  );

  // 学科选项
  expect(SUBJECT_VALUES.length).toBe(15);
  expect(SUBJECT_VALUES).toContain('语文');
  expect(SUBJECT_VALUES).toContain('数学');
  expect(SUBJECT_VALUES).toContain('英语');

  // 角色枚举
  expect(ROLE_VALUES).toEqual(['super_admin', 'school_admin', 'teacher', 'parent']);

  // 功能标识
  expect(FEATURE_FLAGS_SET.has('homework')).toBe(true);
  expect(FEATURE_FLAGS_SET.has('ai')).toBe(true);
  expect(FEATURE_FLAGS_SET.has('grades')).toBe(true);
}

/**
 * 生成标准班级名（复用共享常量逻辑）
 */
export function generateClassName(grade: string, classNo: string): string {
  return `${grade}${classNo}班`;
}

/**
 * 测试命名约定：describe('模块: 接口', () => { it('should 行为_场景_预期', async () => {}) })
 * 
 * 使用示例：
 * describe('认证模块: 登录', () => {
 *   it('should 登录成功_超管账号_返回super角色token', async () => {})
 *   it('should 登录失败_错误密码_返回401密码错误', async () => {})
 * })
 */