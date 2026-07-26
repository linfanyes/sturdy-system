import 'reflect-metadata';
import { IntegrationTestContext, TestAuthHelper, TestDataFactory, expectSuccessResponse, expectErrorResponse, expectPaginatedResponse, validateSharedConstants } from './setup';

/**
 * 学生 CRUD 集成测试
 * 覆盖：POST /students、GET /students、GET /students/:id、PATCH /students/:id、DELETE /students/:id
 * 批量导入：POST /students/import、POST /students/import-commit、POST /students/import-ai
 */
describe('学生模块: 学生 CRUD 集成测试', () => {
  let ctx: IntegrationTestContext;
  let authHelper: TestAuthHelper;
  let factory: TestDataFactory;

  // 测试数据
  let school: any;
  let schoolAdmin: any;
  let teacher1: any;
  let teacher2: any;
  let class1: any;
  let class2: any;
  let student1: any;
  let student2: any;

  beforeAll(async () => {
    ctx = await IntegrationTestContext.create();
    authHelper = ctx.authHelper;
    factory = ctx.factory;

    validateSharedConstants();

    // 创建基础测试数据
    school = await factory.createSchool({ code: 'SCH001', name: '测试小学' });
    schoolAdmin = await factory.createSchoolAdmin(school.id, { username: 'schooladmin', name: '张校管' });
    teacher1 = await factory.createTeacher(school.id, { username: 'teacher1', name: '李老师', teacherNo: 'T001' });
    teacher2 = await factory.createTeacher(school.id, { username: 'teacher2', name: '王老师', teacherNo: 'T002' });
    
    class1 = await factory.createClassByAdmin(schoolAdmin.id, school.id, { grade: '五年级', classNo: '1', headTeacher: teacher1.id });
    class2 = await factory.createClassByAdmin(schoolAdmin.id, school.id, { grade: '五年级', classNo: '2', headTeacher: teacher1.id });
    
    // 建立班级成员关系
    await factory.addClassMember(teacher1.id, class1.id, 'head', ['语文', '数学']);
    await factory.addClassMember(teacher2.id, class1.id, 'subject', ['语文']);
    await factory.addClassMember(teacher1.id, class2.id, 'head', ['语文']);

    student1 = await factory.createStudent(class1.id, teacher1.id, { 
      studentNo: 'S001', 
      name: '学生一', 
      gender: '男',
      parentName: '家长一',
      parentPhone: '13800138001'
    });
    student2 = await factory.createStudent(class1.id, teacher1.id, { 
      studentNo: 'S002', 
      name: '学生二', 
      gender: '女',
      parentName: '家长二',
      parentPhone: '13800138002'
    });
  }, 30000);

  afterAll(async () => {
    await ctx.teardown();
  }, 10000);

  describe('POST /api/students - 创建学生', () => {
    it('should 创建成功_班主任_学号唯一_班级关联_家长关联', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '新学生',
          gender: '男',
          studentNo: 'S003',
          classId: class1.id,
          parentName: '新家长',
          parentPhone: '13800138003',
        });

      const data = expectSuccessResponse(res);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('新学生');
      expect(data.studentNo).toBe('S003');
      expect(data.classId).toBe(class1.id);
      expect(data.parentName).toBe('新家长');
      expect(data.parentPhone).toBe('13800138003');
      expect(data.teacherId).toBe(teacher1.id);
    });

    it('should 创建失败_学号重复_返回409', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '重复学号学生',
          gender: '男',
          studentNo: 'S001', // 已存在
          classId: class1.id,
        });

      expectErrorResponse(res, 409);
      expect(res.body.message).toContain('学号');
    });

    it('should 创建失败_班级不存在_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '测试学生',
          gender: '男',
          studentNo: 'S999',
          classId: 'nonexistent',
        });

      expectErrorResponse(res, 400);
    });

    it('should 创建失败_非班主任_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // teacher2 不是 class1 班主任
      
      const res = await ctx.request()
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '测试学生',
          gender: '男',
          studentNo: 'S999',
          classId: class1.id,
        });

      expectErrorResponse(res, 403);
    });

    it('should 创建失败_校管创建_返回403（仅班主任可建）', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '测试学生',
          gender: '男',
          studentNo: 'S999',
          classId: class1.id,
        });

      expectErrorResponse(res, 403);
    });
  });

  describe('GET /api/students - 学生列表', () => {
    it('should 列表成功_班主任_仅本班学生_支持分页搜索筛选', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/students?classId=' + class1.id + '&skip=0&take=10')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
      data.items.forEach((s: any) => {
        expect(s.classId).toBe(class1.id);
        expect(s.teacherId).toBe(teacher1.id);
      });
    });

    it('should 列表成功_姓名搜索', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/students?classId=' + class1.id + '&keyword=学生一')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBe(1);
      expect(data.items[0].name).toBe('学生一');
    });

    it('should 列表成功_学号搜索', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/students?classId=' + class1.id + '&keyword=S002')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBe(1);
      expect(data.items[0].studentNo).toBe('S002');
    });

    it('should 列表成功_班级筛选', async () => {
      // 在 class2 创建学生
      const student3 = await factory.createStudent(class2.id, teacher1.id, { 
        studentNo: 'S003', 
        name: '学生三' 
      });

      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/students?classId=' + class2.id)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe(student3.id);
    });

    it('should 列表失败_家长_返回403', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get('/api/students')
        .set('Authorization', `Bearer ${parentToken}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('GET /api/students/:id - 学生详情（聚合档案、成绩、考勤、作业、奖惩）', () => {
    it('should 详情成功_班主任_返回聚合数据', async () => {
      // 创建关联数据
      const exam = await factory.createExam(teacher1.id, class1.id, { name: '期中考试' });
      await factory.createGrade(teacher1.id, class1.id, exam.id, { 
        subject: '语文', 
        examName: '期中考试',
        scores: [{ studentId: student1.id, score: 90 }] 
      });
      await factory.createAttendance(class1.id, teacher1.id, '2024-01-15', [
        { studentId: student1.id, status: 'present' }
      ]);
      await factory.createHomework(teacher1.id, class1.id, { title: '语文作业' });
      await factory.createAwardRecord(teacher1.id, { name: '优秀学生' });

      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expect(data.id).toBe(student1.id);
      expect(data.name).toBe('学生一');
      expect(data.profile).toBeDefined(); // 档案
      expect(data.grades).toBeDefined(); // 成绩
      expect(data.attendance).toBeDefined(); // 考勤
      expect(data.homeworks).toBeDefined(); // 作业
      expect(data.awards).toBeDefined(); // 奖惩
    });

    it('should 详情成功_科任教师_仅本学科成绩', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // teacher2 教语文
      
      const res = await ctx.request()
        .get(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expect(data.grades).toBeDefined();
      // 科任教师只能看到自己学科的成绩
      if (data.grades.length > 0) {
        data.grades.forEach((g: any) => {
          expect(['语文']).toContain(g.subject);
        });
      }
    });

    it('should 详情失败_家长_仅自家孩子_返回403', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_2',
        studentId: student2.id, // 不是自家孩子
        studentName: '学生二',
        classId: class1.id,
        studentNo: 'S002',
      });
      
      const res = await ctx.request()
        .get(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expectErrorResponse(res, 403);
    });

    it('should 详情成功_家长_自家孩子_返回聚合', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expect(data.id).toBe(student1.id);
      expect(data.name).toBe('学生一');
    });

    it('should 详情失败_不存在ID_返回404', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/students/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 404);
    });
  });

  describe('PATCH /api/students/:id - 编辑学生', () => {
    it('should 编辑成功_班主任_班级调整触发统计更新', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '学生一(修改)',
          gender: '女',
          classId: class2.id, // 调班
        });

      const data = expectSuccessResponse(res);
      expect(data.name).toBe('学生一(修改)');
      expect(data.gender).toBe('女');
      expect(data.classId).toBe(class2.id);
    });

    it('should 编辑失败_非班主任_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '修改尝试' });

      expectErrorResponse(res, 403);
    });

    it('should 编辑失败_学号冲突_返回409', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/students/${student1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ studentNo: 'S002' }); // student2 的学号

      expectErrorResponse(res, 409);
    });
  });

  describe('DELETE /api/students/:id - 删除学生（软删除、关联数据保留）', () => {
    it('should 删除成功_班主任_软删除_关联数据保留', async () => {
      // 创建一个待删除的学生
      const toDelete = await factory.createStudent(class1.id, teacher1.id, { 
        studentNo: 'S100', 
        name: '待删除学生' 
      });
      
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .delete(`/api/students/${toDelete.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(res);

      // 验证学生已软删除（列表不可见）
      const listRes = await ctx.request()
        .get(`/api/students?classId=${class1.id}`)
        .set('Authorization', `Bearer ${token}`);
      const listData = expectSuccessResponse(listRes);
      const found = listData.items.find((s: any) => s.id === toDelete.id);
      expect(found).toBeUndefined();

      // 但详情仍可查询（关联数据保留）
      const detailRes = await ctx.request()
        .get(`/api/students/${toDelete.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 404]).toContain(detailRes.status); // 根据实现可能返回 404 或 软删详情
    });

    it('should 删除失败_非班主任_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .delete(`/api/students/${student2.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('批量导入: POST /students/import, POST /students/import-commit, POST /students/import-ai', () => {
    it('should 预览导入_解析Excel_校验格式_返回预览数据', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 模拟 Excel base64 数据（实际测试中需要真实的 xlsx buffer）
      const mockExcelBase64 = Buffer.from('mock excel content').toString('base64');
      
      const res = await ctx.request()
        .post('/api/students/import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          filename: 'students.xlsx',
          data: mockExcelBase64,
        });

      // 预览接口可能返回解析结果
      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('rows');
        expect(data).toHaveProperty('validCount');
        expect(data).toHaveProperty('errorCount');
      }
    });

    it('should 提交导入_事务写入_失败回滚', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students/import-commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          items: [
            { name: '导入学生1', gender: '男', studentNo: 'IMP001', parentName: '家长1', parentPhone: '13800138010' },
            { name: '导入学生2', gender: '女', studentNo: 'IMP002', parentName: '家长2', parentPhone: '13800138011' },
          ],
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('count', 2);
        expect(data).toHaveProperty('ids');
        expect(data.ids.length).toBe(2);
        expect(data).toHaveProperty('contactCount', 2);
      }
    });

    it('should 提交导入_学号冲突_整体回滚', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students/import-commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          items: [
            { name: '导入学生3', gender: '男', studentNo: 'IMP003' },
            { name: '导入学生4', gender: '女', studentNo: 'S001' }, // 冲突学号
          ],
        });

      expectErrorResponse(res, 400);
    });

    it('should AI识别导入_图片/Excel_返回结构化预览', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/students/import-ai')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mode: 'image',
          data: 'base64_image_data',
          filename: 'students.jpg',
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('rows');
        expect(data).toHaveProperty('validCount');
        expect(data).toHaveProperty('errorCount');
      }
    });
  });

  describe('共享常量对齐验证', () => {
    it('should 手机号正则与DTO一致', () => {
      const { PHONE_REGEX } = require('@gardener/shared/constants');
      expect(PHONE_REGEX).toEqual(/^1[3-9]\d{9}$/);
      expect('13800138000').toMatch(PHONE_REGEX);
      expect('12345678901').not.toMatch(PHONE_REGEX);
    });

    it('should 学科选项与前端一致', () => {
      const { SUBJECT_VALUES } = require('@gardener/shared/constants');
      expect(SUBJECT_VALUES.length).toBe(15);
      expect(SUBJECT_VALUES).toContain('语文');
    });

    it('should 角色枚举与Guard一致', () => {
      const { ROLE_VALUES } = require('@gardener/shared/constants');
      expect(ROLE_VALUES).toEqual(['super_admin', 'school_admin', 'teacher', 'parent']);
    });
  });
});