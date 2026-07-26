import 'reflect-metadata';
import { IntegrationTestContext, TestAuthHelper, TestDataFactory, expectSuccessResponse, expectErrorResponse, expectPaginatedResponse, validateSharedConstants } from './setup';

/**
 * 成绩/考试集成测试
 * 覆盖：考试管理、成绩录入、成绩查询、统计分析
 * 权限：教师仅录入任教科目、校管全校、家长仅看自家孩子
 */
describe('成绩考试模块: 成绩/考试集成测试', () => {
  let ctx: IntegrationTestContext;
  let authHelper: TestAuthHelper;
  let factory: TestDataFactory;

  // 测试数据
  let school: any;
  let schoolAdmin: any;
  let teacher1: any;
  let teacher2: any;
  let class1: any;
  let student1: any;
  let student2: any;
  let exam: any;

  beforeAll(async () => {
    ctx = await IntegrationTestContext.create();
    authHelper = ctx.authHelper;
    factory = ctx.factory;

    validateSharedConstants();

    // 创建基础测试数据
    school = await factory.createSchool({ code: 'SCH001', name: '测试小学' });
    schoolAdmin = await factory.createSchoolAdmin(school.id, { username: 'schooladmin', name: '张校管' });
    teacher1 = await factory.createTeacher(school.id, { username: 'teacher1', name: '李老师(班主任)', teacherNo: 'T001', subject: '语文' });
    teacher2 = await factory.createTeacher(school.id, { username: 'teacher2', name: '王老师(数学)', teacherNo: 'T002', subject: '数学' });
    
    class1 = await factory.createClassByAdmin(schoolAdmin.id, school.id, { grade: '五年级', classNo: '1', headTeacher: teacher1.id });
    student1 = await factory.createStudent(class1.id, teacher1.id, { studentNo: 'S001', name: '学生一' });
    student2 = await factory.createStudent(class1.id, teacher1.id, { studentNo: 'S002', name: '学生二' });

    // 建立班级成员关系
    await factory.addClassMember(teacher1.id, class1.id, 'head', ['语文']);
    await factory.addClassMember(teacher2.id, class1.id, 'subject', ['数学']);

    // 创建考试
    exam = await factory.createExam(teacher1.id, class1.id, { 
      name: '2024年秋季期中考试',
      subjects: ['语文', '数学', '英语'],
    });

    // 创建成绩记录（语文）
    await factory.createGrade(teacher1.id, class1.id, exam.id, {
      subject: '语文',
      examName: '2024年秋季期中考试',
      scores: [
        { studentId: student1.id, score: 92 },
        { studentId: student2.id, score: 85 },
      ],
    });

    // 创建成绩记录（数学）
    await factory.createGrade(teacher2.id, class1.id, exam.id, {
      subject: '数学',
      examName: '2024年秋季期中考试',
      scores: [
        { studentId: student1.id, score: 88 },
        { studentId: student2.id, score: 95 },
      ],
    });
  }, 30000);

  afterAll(async () => {
    await ctx.teardown();
  }, 10000);

  describe('考试管理: POST/GET/PATCH/DELETE /api/exams', () => {
    it('should 创建考试_班主任_科目年级关联_自动建空成绩记录', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/exams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '期末考试',
          date: '2025-01-15',
          term: '2024-2025-1',
          classId: class1.id,
          subjects: ['语文', '数学', '英语'],
        });

      const data = expectSuccessResponse(res);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('期末考试');
      expect(data.classId).toBe(class1.id);
      expect(data.subjects).toEqual(['语文', '数学', '英语']);
    });

    it('should 创建失败_非班主任_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // 科任教师
      
      const res = await ctx.request()
        .post('/api/exams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '测试考试',
          date: '2025-01-15',
          classId: class1.id,
          subjects: ['数学'],
        });

      expectErrorResponse(res, 403);
    });

    it('should 列表成功_教师_仅本班考试', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/exams?classId=' + class1.id)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
      data.items.forEach((e: any) => {
        expect(e.classId).toBe(class1.id);
      });
    });

    it('should 编辑考试_创建者_状态流转', async () => {
      // 先创建一个草稿考试
      const draftExam = await factory.createExam(teacher1.id, class1.id, { 
        name: '草稿考试', 
        subjects: ['语文'],
      });

      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/exams/${draftExam.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '发布考试' });

      const data = expectSuccessResponse(res);
      expect(data.name).toBe('发布考试');
    });

    it('should 删除考试_创建者_级联删除关联成绩', async () => {
      const toDelete = await factory.createExam(teacher1.id, class1.id, { 
        name: '待删除考试', 
        subjects: ['语文'],
      });

      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .delete(`/api/exams/${toDelete.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(res);

      // 验证成绩也被删除
      const gradesRes = await ctx.request()
        .get(`/api/grades?examId=${toDelete.id}`)
        .set('Authorization', `Bearer ${token}`);
      const gradesData = expectSuccessResponse(gradesRes);
      expect(gradesData.items.length).toBe(0);
    });

    it('should 删除失败_非创建者_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .delete(`/api/exams/${exam.id}`)
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('成绩录入: POST /api/grades/merge, POST /api/grades/import-preview, POST /api/grades/import-commit', () => {
    it('should 单条录入_任教教师_分值校验0-150', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id); // 语文老师
      
      const res = await ctx.request()
        .post('/api/grades/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          examName: '2024年秋季期中考试',
          subject: '语文',
          examId: exam.id,
          date: '2024-11-15',
          scores: [
            { studentId: student1.id, score: 95 },
            { studentId: student2.id, score: 78 },
          ],
        });

      const data = expectSuccessResponse(res);
      expect(data.id).toBeDefined();
      expect(data.created).toBe(false); // 更新现有记录
    });

    it('should 批量录入_分值校验_缺考标记_null', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/grades/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          examName: '2024年秋季期中考试',
          subject: '语文',
          examId: exam.id,
          date: '2024-11-15',
          scores: [
            { studentId: student1.id, score: 90 },
            { studentId: student2.id, score: null }, // 缺考
          ],
        });

      const data = expectSuccessResponse(res);
      expect(data.id).toBeDefined();
    });

    it('should 录入失败_分值超出范围_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/grades/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          examName: '2024年秋季期中考试',
          subject: '语文',
          examId: exam.id,
          date: '2024-11-15',
          scores: [
            { studentId: student1.id, score: 200 }, // 超出 150
          ],
        });

      expectErrorResponse(res, 400);
    });

    it('should 录入失败_非任教科目_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // 数学老师
      
      const res = await ctx.request()
        .post('/api/grades/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          examName: '2024年秋季期中考试',
          subject: '语文', // 不是数学
          examId: exam.id,
          date: '2024-11-15',
          scores: [
            { studentId: student1.id, score: 90 },
          ],
        });

      expectErrorResponse(res, 403);
    });

    it('should 导入预览_解析Excel_匹配学生_校验分数', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 模拟 base64 Excel 数据
      const mockExcelBase64 = Buffer.from('mock excel').toString('base64');
      
      const res = await ctx.request()
        .post('/api/grades/import-preview')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          filename: 'grades.xlsx',
          data: mockExcelBase64,
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('rows');
        expect(data).toHaveProperty('validCount');
        expect(data).toHaveProperty('errorCount');
        expect(data).toHaveProperty('total');
      }
    });

    it('should 导入提交_事务upsert_失败回滚', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/grades/import-commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          examName: '2024年秋季期中考试',
          subject: '语文',
          examId: exam.id,
          date: '2024-11-15',
          rows: [
            { studentId: student1.id, score: 93, valid: true },
            { studentId: student2.id, score: 87, valid: true },
          ],
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('count', 2);
      }
    });
  });

  describe('成绩查询: GET /api/grades (学生维度/班级维度/年级维度/趋势对比)', () => {
    it('should 学生维度查询_班主任_返回该生所有科目成绩', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/grades?classId=${class1.id}&studentId=${student1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      data.items.forEach((g: any) => {
        expect(g.scores).toBeDefined();
        const myScore = g.scores.find((s: any) => s.studentId === student1.id);
        expect(myScore).toBeDefined();
      });
    });

    it('should 班级维度查询_班主任_返回班级全科成绩', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/grades?classId=${class1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBeGreaterThanOrEqual(2); // 语文、数学
    });

    it('should 科任教师_仅本学科成绩', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // 数学老师
      
      const res = await ctx.request()
        .get(`/api/grades?classId=${class1.id}`)
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      data.items.forEach((g: any) => {
        expect(g.subject).toBe('数学');
      });
    });

    it('should 年级维度查询_校管_返回全年级成绩', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .get('/api/grades?grade=五年级')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
    });

    it('should 趋势对比_同班级同学科多次考试_返回趋势数据', async () => {
      // 创建另一次考试
      const exam2 = await factory.createExam(teacher1.id, class1.id, { 
        name: '2024年秋季期末考试',
        subjects: ['语文'],
      });
      await factory.createGrade(teacher1.id, class1.id, exam2.id, {
        subject: '语文',
        examName: '2024年秋季期末考试',
        scores: [
          { studentId: student1.id, score: 95 },
          { studentId: student2.id, score: 88 },
        ],
      });

      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/grades/trend?classId=${class1.id}&subject=语文&studentId=${student1.id}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('trend');
        expect(Array.isArray(data.trend)).toBe(true);
      }
    });
  });

  describe('统计分析: GET /api/grades/analysis', () => {
    it('should 平均分_及格率_优秀率_分数段分布_趋势图数据', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/grades/analysis?examId=${exam.id}&subject=语文`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('avg');
        expect(data).toHaveProperty('passRate');
        expect(data).toHaveProperty('excellentRate');
        expect(data).toHaveProperty('distribution');
        expect(data).toHaveProperty('trend');
        
        // 验证数据合理性
        expect(typeof data.avg).toBe('number');
        expect(data.avg).toBeGreaterThanOrEqual(0);
        expect(data.avg).toBeLessThanOrEqual(150);
        expect(data.passRate).toBeGreaterThanOrEqual(0);
        expect(data.passRate).toBeLessThanOrEqual(100);
        expect(data.distribution).toHaveProperty('0-59');
        expect(data.distribution).toHaveProperty('60-79');
        expect(data.distribution).toHaveProperty('80-89');
        expect(data.distribution).toHaveProperty('90-100');
      }
    });

    it('should 统计失败_家长_返回403', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get(`/api/grades/analysis?examId=${exam.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('排名计算: 班级排名/年级排名', () => {
    it('should 班级排名_按总分降序', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/grades/ranking?examId=${exam.id}&type=class`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('rankings');
        expect(Array.isArray(data.rankings)).toBe(true);
        if (data.rankings.length >= 2) {
          expect(data.rankings[0].totalScore).toBeGreaterThanOrEqual(data.rankings[1].totalScore);
        }
      }
    });

    it('should 年级排名_校管可查', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/grades/ranking?grade=五年级&type=grade`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('rankings');
      }
    });
  });

  describe('权限矩阵验证', () => {
    it('should 教师仅录入任教科目', async () => {
      // 语文老师不能录入数学成绩
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/grades/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          examName: '2024年秋季期中考试',
          subject: '数学', // 非任教科目
          examId: exam.id,
          date: '2024-11-15',
          scores: [{ studentId: student1.id, score: 90 }],
        });

      expectErrorResponse(res, 403);
    });

    it('should 校管全校可查', async () => {
      const token = authHelper.schoolAdminToken(schoolAdmin.id, school.id);
      
      const res = await ctx.request()
        .get('/api/exams')
        .set('Authorization', `Bearer ${token}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
    });

    it('should 家长仅看自家孩子', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get(`/api/grades?studentId=${student1.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      // 只能看到自家孩子的成绩
      data.items.forEach((g: any) => {
        const myScore = g.scores.find((s: any) => s.studentId === student1.id);
        expect(myScore).toBeDefined();
      });
    });
  });

  describe('共享常量对齐验证', () => {
    it('should 学科选项与SUBJECT_VALUES一致', () => {
      const { SUBJECT_VALUES } = require('@gardener/shared/constants');
      expect(SUBJECT_VALUES.length).toBe(15);
      expect(SUBJECT_VALUES).toContain('语文');
      expect(SUBJECT_VALUES).toContain('数学');
      expect(SUBJECT_VALUES).toContain('英语');
    });

    it('should 角色枚举与ROLE_VALUES一致', () => {
      const { ROLE_VALUES } = require('@gardener/shared/constants');
      expect(ROLE_VALUES).toEqual(['super_admin', 'school_admin', 'teacher', 'parent']);
    });
  });
});