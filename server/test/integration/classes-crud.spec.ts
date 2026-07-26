import 'reflect-metadata';
import { IntegrationTestContext, TestAuthHelper, TestDataFactory, expectSuccessResponse, expectErrorResponse, expectPaginatedResponse, validateSharedConstants, generateClassName } from './setup';

/**
 * 班级 CRUD 集成测试
 * 覆盖：POST /classes、GET /classes、GET /classes/:id、
 *       PATCH /classes/:id、DELETE /classes/:id
 * 权限矩阵：超管全权、校管本校、教师仅读任教、家长不可见
 */
describe('班级模块: CRUD 集成测试', () => {
  let ctx: IntegrationTestContext;
  let authHelper: TestAuthHelper;
  let factory: TestDataFactory;

  // 测试数据
  let school: any;
  let school2: any;
  let schoolAdmin: any;
  let schoolAdmin2: any;
  let teacher1: any;
  let teacher2: any;
  let class1: any;
  let class2: any;
  let class3: any;

  beforeAll(async () => {
    ctx = await IntegrationTestContext.create();
    authHelper = ctx.authHelper;
    factory = ctx.factory;

    validateSharedConstants();

    // 创建两所学校及相关数据
    school = await factory.createSchool({ code: 'SCH001', name: '第一小学' });
    school2 = await factory.createSchool({ code: 'SCH002', name: '第二小学' });

    schoolAdmin = await factory.createSchoolAdmin(school.id, { username: 'sa1', name: '校管1' });
    schoolAdmin2 = await factory.createSchoolAdmin(school2.id, { username: 'sa2', name: '校管2' });

    teacher1 = await factory.createTeacher(school.id, { username: 't1', name: '教师1', teacherNo: 'T001' });
    teacher2 = await factory.createTeacher(school.id, { username: 't2', name: '教师2', teacherNo: 'T002' });

    // 创建班级（由校管创建）
    class1 = await factory.createClassByAdmin(schoolAdmin.id, school.id, { grade: '五年级', classNo: '1', headTeacher: teacher1.id });
    class2 = await factory.createClassByAdmin(schoolAdmin.id, school.id, { grade: '五年级', classNo: '2', headTeacher: teacher1.id });
    class3 = await factory.createClassByAdmin(schoolAdmin2.id, school2.id, { grade: '三年级', classNo: '1', headTeacher: teacher2.id });

    // 建立班级成员关系
    await factory.addClassMember(teacher1.id, class1.id, 'head', ['语文', '数学']);
    await factory.addClassMember(teacher2.id, class1.id, 'subject', ['英语']);
    await factory.addClassMember(teacher2.id, class2.id, 'head', ['语文']);
  }, 30000);

  afterAll(async () => {
    await ctx.teardown();
  }, 10000);

  describe('POST /api/classes - 创建班级（仅校管/超管）', () => {
    it('should 创建成功_校管_年级序号生成标准名_返回班级信息', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ grade: '一年级', classNo: '3', headTeacher: teacher1.id });

      const data = expectSuccessResponse(res);
      expect(data.name).toBe('一年级3班'); // 生成的标准班级名
      expect(data.grade).toBe('一年级');
      expect(data.classNo).toBe('3');
      expect(data.headTeacher).toBe(teacher1.id);
      expect(data.schoolId).toBe(school.id);
      expect(data.term).toBeDefined();
    });

    it('should 创建成功_超管_可跨学校创建', async () => {
      const token = authHelper.superAdminToken();
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ schoolId: school2.id, grade: '二年级', classNo: '1', headTeacher: teacher2.id });

      const data = expectSuccessResponse(res);
      expect(data.name).toBe('二年级1班');
      expect(data.schoolId).toBe(school2.id);
    });

    it('should 创建失败_教师无权创建_返回403', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ grade: '三年级', classNo: '1', headTeacher: teacher1.id });

      expectErrorResponse(res, 403);
    });

    it('should 创建失败_家长无权_返回403', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: 'student_1',
        studentName: '学生1',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ grade: '三年级', classNo: '1', headTeacher: teacher1.id });

      expectErrorResponse(res, 403);
    });

    it('should 创建失败_缺少年级_返回400', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ classNo: '1', headTeacher: teacher1.id });

      expectErrorResponse(res, 400, 'BAD_REQUEST');
    });

    it('should 创建失败_缺少班主任_返回400', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ grade: '四年级', classNo: '1' });

      expectErrorResponse(res, 400, 'BAD_REQUEST');
    });

    it('should 创建失败_手机号格式错误_返回400', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ grade: '五年级', classNo: '4', headTeacher: teacher1.id, headTeacherPhone: 'invalid' });

      expectErrorResponse(res, 400);
    });

    it('should 班级命名规则_符合CLASS_NAMING_RULE', async () => {
      // 验证生成的班级名符合共享常量
      expect(generateClassName('五年级', '1')).toBe('五年级1班');
      expect(generateClassName('初二', '3')).toBe('初二3班');
      expect(generateClassName('高一', '5')).toBe('高一5班');
      expect('五年级1班').toMatch(/^((一|二|三|四|五|六)年级|初一|初二|初三|高一|高二|高三)([1-9]|[1-9]\d)班$/);
    });
  });

  describe('GET /api/classes - 班级列表', () => {
    it('should 列表成功_超管_返回所有学校班级', async () => {
      const token = authHelper.superAdminToken();
      
      const res = await ctx.request()
        .get('/api/classes')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBeGreaterThanOrEqual(3);
      // 超管能看到所有学校的班级
      const schoolIds = [...new Set(data.items.map((c: any) => c.schoolId))];
      expect(schoolIds.length).toBe(2);
    });

    it('should 列表成功_校管_仅返回本校班级', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .get('/api/classes')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      data.items.forEach((c: any) => {
        expect(c.schoolId).toBe(school.id);
      });
      // 只能看到第一小学的班级
      expect(data.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should 列表成功_班主任_仅返回任教班级', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/classes')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      // teacher1 是 class1 和 class2 的班主任
      expect(data.items.length).toBeGreaterThanOrEqual(2);
      data.items.forEach((c: any) => {
        expect([class1.id, class2.id]).toContain(c.id);
      });
    });

    it('should 列表成功_科任教师_仅返回任教班级', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .get('/api/classes')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      // teacher2 是 class1 的科任、class2 的班主任
      expect(data.items.length).toBeGreaterThanOrEqual(2);
      data.items.forEach((c: any) => {
        expect([class1.id, class2.id]).toContain(c.id);
      });
    });

    it('should 列表失败_家长_返回403', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: 'student_1',
        studentName: '学生1',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get('/api/classes')
        .set('Authorization', `Bearer ${parentToken}`);

      expectErrorResponse(res, 403);
    });

    it('should 分页参数生效', async () => {
      const token = authHelper.superAdminToken();
      
      const res = await ctx.request()
        .get('/api/classes?skip=0&take=1')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBe(1);
    });

    it('should 关键字搜索_按班级名筛选', async () => {
      const token = authHelper.superAdminToken();
      
      const res = await ctx.request()
        .get('/api/classes?keyword=五年级')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      data.items.forEach((c: any) => {
        expect(c.name).toContain('五年级');
      });
    });

    it('should 年级筛选_按年级过滤', async () => {
      const token = authHelper.superAdminToken();
      
      const res = await ctx.request()
        .get('/api/classes?grade=五年级')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      data.items.forEach((c: any) => {
        expect(c.grade).toBe('五年级');
      });
    });
  });

  describe('GET /api/classes/:id - 班级详情', () => {
    it('should 详情成功_班主任_返回学生数_任教教师_班主任信息', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expect(data.id).toBe(class1.id);
      expect(data.name).toBe('五年级1班');
      expect(data.studentCount).toBeDefined();
      expect(data.teachers).toBeDefined();
      expect(data.headTeacher).toBeDefined();
      expect(data.headTeacher.id).toBe(teacher1.id);
    });

    it('should 详情成功_科任教师_返回基本信息', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expect(data.id).toBe(class1.id);
      expect(data.teachers).toBeDefined();
    });

    it('should 详情失败_无关教师_返回403', async () => {
      // 创建无关教师
      const unrelatedTeacher = await factory.createTeacher(school2.id, { username: 'unrelated', name: '无关教师' });
      const token = authHelper.teacherToken(unrelatedTeacher.id, school2.id);
      
      const res = await ctx.request()
        .get(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 403);
    });

    it('should 详情失败_家长_返回403', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: 'student_1',
        studentName: '学生1',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expectErrorResponse(res, 403);
    });

    it('should 详情失败_不存在ID_返回404', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/classes/nonexistent-id')
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 404);
    });
  });

  describe('PATCH /api/classes/:id - 编辑班级（仅班主任）', () => {
    it('should 编辑成功_班主任_修改基本信息', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '五年级1班(实验班)' });

      const data = expectSuccessResponse(res);
      expect(data.name).toBe('五年级1班(实验班)');
    });

    it('should 编辑成功_年级变���_触发班级名重生成', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ grade: '六年级', classNo: '1' });

      const data = expectSuccessResponse(res);
      expect(data.grade).toBe('六年级');
      expect(data.classNo).toBe('1');
      expect(data.name).toBe('六年级1班'); // 班级名自动重生成
    });

    it('should 编辑失败_科任教师_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '修改尝试' });

      expectErrorResponse(res, 403);
    });

    it('should 编辑失败_非本校教师_返回403', async () => {
      const otherTeacher = await factory.createTeacher(school2.id, { username: 'other', name: '其他校教师' });
      const token = authHelper.teacherToken(otherTeacher.id, school2.id);
      
      const res = await ctx.request()
        .patch(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '修改尝试' });

      expectErrorResponse(res, 403);
    });

    it('should 编辑失败_班主任变更被禁止_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ headTeacher: teacher2.id });

      // 班主任不允许通过此接口转交班级
      expect([400, 403]).toContain(res.status);
    });
  });

  describe('DELETE /api/classes/:id - 删除班级（仅班主任）', () => {
    it('should 删除失败_有学生时阻止_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 先创建学生
      await factory.createStudent(class1.id, teacher1.id, { studentNo: 'S100', name: '测试学生' });
      
      const res = await ctx.request()
        .delete(`/api/classes/${class1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 400);
      expect(res.body.message).toContain('学生');
    });

    it('should 删除成功_空班级_级联清理关联', async () => {
      // 创建一个空班级
      const emptyClass = await factory.createClassByAdmin(schoolAdmin.id, school.id, { 
        grade: '四年级', 
        classNo: '5', 
        headTeacher: teacher1.id 
      });
      
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .delete(`/api/classes/${emptyClass.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(res);
      
      // 验证班级已删除
      const getRes = await ctx.request()
        .get(`/api/classes/${emptyClass.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });

    it('should 删除失败_科任教师_返回403', async () => {
      const emptyClass = await factory.createClassByAdmin(schoolAdmin.id, school.id, { 
        grade: '四年级', 
        classNo: '6', 
        headTeacher: teacher2.id 
      });
      
      const token = authHelper.teacherToken(teacher1.id, school.id); // teacher1 不是班主任
      
      const res = await ctx.request()
        .delete(`/api/classes/${emptyClass.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('共享常量对齐验证', () => {
    it('should 手机号正则与DTO一致', () => {
      // 来自 @gardener/shared/constants
      const { PHONE_REGEX } = require('@gardener/shared/constants');
      expect(PHONE_REGEX).toEqual(/^1[3-9]\d{9}$/);
      expect('13800138000').toMatch(PHONE_REGEX);
      expect('12345678901').not.toMatch(PHONE_REGEX);
    });

    it('should 班级命名规则与DTO一致', () => {
      const { CLASS_NAMING_RULE } = require('@gardener/shared/constants');
      expect(CLASS_NAMING_RULE.pattern).toEqual(
        /^((一|二|三|四|五|六)年级|初一|初二|初三|高一|高二|高三)([1-9]|[1-9]\d)班$/
      );
    });

    it('should 学科选项与前端一致', () => {
      const { SUBJECT_VALUES } = require('@gardener/shared/constants');
      expect(SUBJECT_VALUES).toContain('语文');
      expect(SUBJECT_VALUES).toContain('数学');
      expect(SUBJECT_VALUES.length).toBe(15);
    });

    it('should 角色枚举与Guard权限矩阵一致', () => {
      const { ROLE_VALUES } = require('@gardener/shared/constants');
      expect(ROLE_VALUES).toEqual(['super_admin', 'school_admin', 'teacher', 'parent']);
    });
  });
});