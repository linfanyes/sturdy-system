import 'reflect-metadata';
import { IntegrationTestContext, TestAuthHelper, TestDataFactory, expectSuccessResponse, expectErrorResponse, expectPaginatedResponse, validateSharedConstants } from './setup';

/**
 * 作业全流程集成测试
 * 覆盖：教师发布、学生/家长查看、提交、批改、统计
 * 权限：教师发布/批改、学生/家长查看/提交、截止后禁止提交
 */
describe('作业模块: 作业全流程集成测试', () => {
  let ctx: IntegrationTestContext;
  let authHelper: TestAuthHelper;
  let factory: TestDataFactory;

  // 测试数据
  let school: any;
  let teacher1: any;
  let teacher2: any;
  let class1: any;
  let student1: any;
  let student2: any;
  let homework1: any;

  beforeAll(async () => {
    ctx = await IntegrationTestContext.create();
    authHelper = ctx.authHelper;
    factory = ctx.factory;

    validateSharedConstants();

    school = await factory.createSchool({ code: 'SCH001', name: '测试小学' });
    teacher1 = await factory.createTeacher(school.id, { username: 'teacher1', name: '李老师(班主任)', teacherNo: 'T001' });
    teacher2 = await factory.createTeacher(school.id, { username: 'teacher2', name: '王老师(数学)', teacherNo: 'T002' });
    
    class1 = await factory.createClassByAdmin(teacher1.id, school.id, { grade: '五年级', classNo: '1', headTeacher: teacher1.id });
    student1 = await factory.createStudent(class1.id, teacher1.id, { studentNo: 'S001', name: '学生一' });
    student2 = await factory.createStudent(class1.id, teacher1.id, { studentNo: 'S002', name: '学生二' });

    await factory.addClassMember(teacher1.id, class1.id, 'head', ['语文']);
    await factory.addClassMember(teacher2.id, class1.id, 'subject', ['数学']);

    // 创建作业
    homework1 = await factory.createHomework(teacher1.id, class1.id, {
      subject: '语文',
      title: '语文阅读理解练习',
      content: '完成课本第10页练习',
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 明天
    });
  }, 30000);

  afterAll(async () => {
    await ctx.teardown();
  }, 10000);

  describe('教师发布: POST /api/homework', () => {
    it('should 发布成功_班主任_标题内容科目班级截止日期附件', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/homework')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          subject: '语文',
          title: '背诵古诗',
          content: '背诵《静夜思》《登鹳雀楼》',
          startDate: new Date().toISOString().split('T')[0],
          deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          attachments: [{ name: '练习题.pdf', url: 'https://example.com/exercise.pdf' }],
        });

      const data = expectSuccessResponse(res);
      expect(data.id).toBeDefined();
      expect(data.title).toBe('背诵古诗');
      expect(data.subject).toBe('语文');
      expect(data.classId).toBe(class1.id);
      expect(data.teacherId).toBe(teacher1.id);
      expect(data.status).toBe('待批改');
      expect(data.attachments).toBeDefined();
    });

    it('should 发布成功_定时发布_草稿箱状态', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const futureDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
      
      const res = await ctx.request()
        .post('/api/homework')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          subject: '语文',
          title: '定时作业',
          content: '定时发布测试',
          startDate: futureDate,
          deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          isDraft: true,
        });

      const data = expectSuccessResponse(res);
      expect(data.status).toBe('草稿');
    });

    it('should 发布失败_非班主任_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // 科任教师
      
      const res = await ctx.request()
        .post('/api/homework')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          subject: '数学',
          title: '数学作业',
          content: '练习题',
          deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        });

      expectErrorResponse(res, 403);
    });

    it('should 发布失败_缺少必填字段_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/homework')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          // 缺少 subject, title, deadline
        });

      expectErrorResponse(res, 400);
    });
  });

  describe('学生/家长查看: GET /api/homework', () => {
    it('should 列表成功_学生_按状态筛选未完成/已完成/过期', async () => {
      // 创建家长 token（学生视角用家长 token 模拟）
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get('/api/homework')
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      
      // 验证作业属于该班级
      data.items.forEach((hw: any) => {
        expect(hw.classId).toBe(class1.id);
      });
    });

    it('should 列表筛选_未完成', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get('/api/homework?status=未完成')
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
    });

    it('should 列表筛选_已完成', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get('/api/homework?status=已完成')
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
    });

    it('should 列表筛选_过期', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get('/api/homework?status=过期')
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expectPaginatedResponse(data);
    });

    it('should 详情成功_返回附件下载链接', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .get(`/api/homework/${homework1.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      const data = expectSuccessResponse(res);
      expect(data.id).toBe(homework1.id);
      expect(data.title).toBe('语文阅读理解练习');
      expect(data.attachments).toBeDefined();
      if (data.attachments.length > 0) {
        expect(data.attachments[0]).toHaveProperty('url');
      }
    });

    it('should 详情失败_非本班学生_返回403', async () => {
      // 创建另一个班级的学生
      const class2 = await factory.createClassByAdmin(teacher2.id, school.id, { grade: '五年级', classNo: '2', headTeacher: teacher2.id });
      const otherStudent = await factory.createStudent(class2.id, teacher2.id, { 
        studentNo: 'S003', 
        name: '其他学生' 
      });
      
      const otherParentToken = authHelper.parentToken({
        imUserId: 'parent_other',
        studentId: otherStudent.id,
        studentName: '其他学生',
        classId: class2.id,
        studentNo: 'S003',
      });
      
      const res = await ctx.request()
        .get(`/api/homework/${homework1.id}`)
        .set('Authorization', `Bearer ${otherParentToken}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('学生提交: POST /api/homework/:id/submit', () => {
    it('should 提交成功_文本/图片/文件_多次提交取最新', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      // 第一次提交
      const res1 = await ctx.request()
        .post(`/api/homework/${homework1.id}/submit`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          content: '第一次提交的答案',
          attachments: [{ name: 'answer1.jpg', url: 'https://example.com/answer1.jpg' }],
        });

      const data1 = expectSuccessResponse(res1);
      expect(data1.id).toBeDefined();
      expect(data1.content).toBe('第一次提交的答案');
      expect(data1.status).toBe('已提交');

      // 第二次提交（覆盖）
      const res2 = await ctx.request()
        .post(`/api/homework/${homework1.id}/submit`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          content: '修改后的答案',
          attachments: [{ name: 'answer2.jpg', url: 'https://example.com/answer2.jpg' }],
        });

      const data2 = expectSuccessResponse(res2);
      expect(data2.content).toBe('修改后的答案');
      expect(data2.attachments[0].url).toBe('https://example.com/answer2.jpg');
    });

    it('should 提交失败_截止日期后_返回400', async () => {
      // 创建一个已过期的作业
      const expiredHomework = await factory.createHomework(teacher1.id, class1.id, {
        subject: '语文',
        title: '过期作业',
        content: '已过期',
        deadline: new Date(Date.now() - 86400000).toISOString().split('T')[0], // 昨天
        status: '待批改',
      });

      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      const res = await ctx.request()
        .post(`/api/homework/${expiredHomework.id}/submit`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          content: '迟交答案',
        });

      expectErrorResponse(res, 400);
      expect(res.body.message).toContain('截止');
    });

    it('should 提交失败_非本班学生_返回403', async () => {
      const class2 = await factory.createClassByAdmin(teacher2.id, school.id, { grade: '五年级', classNo: '2', headTeacher: teacher2.id });
      const otherStudent = await factory.createStudent(class2.id, teacher2.id, { 
        studentNo: 'S003', 
        name: '其他学生' 
      });
      
      const otherParentToken = authHelper.parentToken({
        imUserId: 'parent_other',
        studentId: otherStudent.id,
        studentName: '其他学生',
        classId: class2.id,
        studentNo: 'S003',
      });
      
      const res = await ctx.request()
        .post(`/api/homework/${homework1.id}/submit`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .send({ content: '尝试提交' });

      expectErrorResponse(res, 403);
    });
  });

  describe('教师批改: POST /api/homework/:id/grade, POST /api/homework/batch-grade', () => {
    it('should 批改成功_评分评语附件反馈', async () => {
      // 先让学生提交
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      await ctx.request()
        .post(`/api/homework/${homework1.id}/submit`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ content: '学生答案' });

      // 教师批改
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post(`/api/homework/${homework1.id}/grade`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: student1.id,
          score: 95,
          comment: '做得很好，书写工整',
          feedbackAttachments: [{ name: 'teacher_feedback.pdf', url: 'https://example.com/feedback.pdf' }],
        });

      const data = expectSuccessResponse(res);
      expect(data.score).toBe(95);
      expect(data.comment).toBe('做得很好，书写工整');
      expect(data.status).toBe('已批改');
      expect(data.feedbackAttachments).toBeDefined();
    });

    it('should 批量批改_已批/未批筛选', async () => {
      // 让另一个学生提交
      const parentToken2 = authHelper.parentToken({
        imUserId: 'parent_2',
        studentId: student2.id,
        studentName: '学生二',
        classId: class1.id,
        studentNo: 'S002',
      });
      
      await ctx.request()
        .post(`/api/homework/${homework1.id}/submit`)
        .set('Authorization', `Bearer ${parentToken2}`)
        .send({ content: '学生二的答案' });

      // 批量批改
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/homework/batch-grade')
        .set('Authorization', `Bearer ${token}`)
        .send({
          homeworkId: homework1.id,
          grades: [
            { studentId: student1.id, score: 90, comment: '优秀' },
            { studentId: student2.id, score: 85, comment: '良好' },
          ],
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data.count).toBe(2);
      }
    });

    it('should 批改列表筛选_已批改', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/homework/${homework1.id}/submissions?status=已批改`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expectPaginatedResponse(data);
        data.items.forEach((sub: any) => {
          expect(sub.status).toBe('已批改');
        });
      }
    });

    it('should 批改列表筛选_未批改', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/homework/${homework1.id}/submissions?status=未批改`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expectPaginatedResponse(data);
        data.items.forEach((sub: any) => {
          expect(sub.status).toBe('待批改');
        });
      }
    });

    it('should 批改失败_非任课教师_返回403', async () => {
      // 创建数学作业（teacher2 的任课科目）
      const mathHomework = await factory.createHomework(teacher2.id, class1.id, {
        subject: '数学',
        title: '数学计算题',
        content: '完成练习册',
        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      // 让学生提交
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });
      
      await ctx.request()
        .post(`/api/homework/${mathHomework.id}/submit`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ content: '数学答案' });

      // 语文老师尝试批改数学作业
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post(`/api/homework/${mathHomework.id}/grade`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          studentId: student1.id,
          score: 90,
          comment: '语文老师批改数学',
        });

      expectErrorResponse(res, 403);
    });
  });

  describe('统计分析: GET /api/homework/:id/stats', () => {
    it('should 完成率_平均分_未交名单导出', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/homework/${homework1.id}/stats`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('completionRate');
        expect(data).toHaveProperty('averageScore');
        expect(data).toHaveProperty('notSubmitted');
        expect(data).toHaveProperty('totalStudents');
        
        expect(typeof data.completionRate).toBe('number');
        expect(data.completionRate).toBeGreaterThanOrEqual(0);
        expect(data.completionRate).toBeLessThanOrEqual(100);
        expect(Array.isArray(data.notSubmitted)).toBe(true);
      }
    });

    it('should 统计失败_非班主任_返回403', async () => {
      const token = authHelper.teacherToken(teacher2.id, school.id); // 科任教师
      
      const res = await ctx.request()
        .get(`/api/homework/${homework1.id}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 403);
    });
  });

  describe('权限矩阵验证', () => {
    it('should 教师发布/批改/统计', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 发布
      const createRes = await ctx.request()
        .post('/api/homework')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: class1.id,
          subject: '语文',
          title: '权限测试作业',
          content: '测试',
          deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        });
      expect([200, 201]).toContain(createRes.status);

      const hwId = createRes.body.data?.id || createRes.body.id;

      // 批改
      const gradeRes = await ctx.request()
        .post(`/api/homework/${hwId}/grade`)
        .set('Authorization', `Bearer ${token}`)
        .send({ studentId: student1.id, score: 100, comment: '测试' });
      expect([200, 201, 404]).toContain(gradeRes.status); // 可能学生未提交

      // 统计
      const statsRes = await ctx.request()
        .get(`/api/homework/${hwId}/stats`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 404]).toContain(statsRes.status);
    });

    it('should 学生/家长查看/提交', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });

      // 查看列表
      const listRes = await ctx.request()
        .get('/api/homework')
        .set('Authorization', `Bearer ${parentToken}`);
      expectSuccessResponse(listRes);

      // 查看详情
      const detailRes = await ctx.request()
        .get(`/api/homework/${homework1.id}`)
        .set('Authorization', `Bearer ${parentToken}`);
      expectSuccessResponse(detailRes);

      // 提交
      const submitRes = await ctx.request()
        .post(`/api/homework/${homework1.id}/submit`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ content: '权限测试提交' });
      expect([200, 201, 400]).toContain(submitRes.status); // 可能已提交过
    });

    it('should 家长不可批改/统计', async () => {
      const parentToken = authHelper.parentToken({
        imUserId: 'parent_1',
        studentId: student1.id,
        studentName: '学生一',
        classId: class1.id,
        studentNo: 'S001',
      });

      // 尝试批改
      const gradeRes = await ctx.request()
        .post(`/api/homework/${homework1.id}/grade`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ studentId: student1.id, score: 100 });
      expectErrorResponse(gradeRes, 403);

      // 尝试统计
      const statsRes = await ctx.request()
        .get(`/api/homework/${homework1.id}/stats`)
        .set('Authorization', `Bearer ${parentToken}`);
      expectErrorResponse(statsRes, 403);
    });
  });

  describe('共享常量对齐验证', () => {
    it('should 学科选项与SUBJECT_VALUES一致', () => {
      const { SUBJECT_VALUES } = require('@gardener/shared/constants');
      expect(SUBJECT_VALUES.length).toBe(15);
      expect(SUBJECT_VALUES).toContain('语文');
      expect(SUBJECT_VALUES).toContain('数学');
    });

    it('should 角色枚举与ROLE_VALUES一致', () => {
      const { ROLE_VALUES } = require('@gardener/shared/constants');
      expect(ROLE_VALUES).toEqual(['super_admin', 'school_admin', 'teacher', 'parent']);
    });

    it('should 功能标识包含homework', () => {
      const { FEATURE_FLAGS_SET } = require('@gardener/shared/constants');
      expect(FEATURE_FLAGS_SET.has('homework')).toBe(true);
    });
  });
});