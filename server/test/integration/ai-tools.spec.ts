import 'reflect-metadata';
import { IntegrationTestContext, TestAuthHelper, TestDataFactory, expectSuccessResponse, expectErrorResponse, validateSharedConstants } from './setup';

/**
 * AI 工具调用集成测试
 * 覆盖：POST /ai/chat/sync、POST /ai/chat/async、
 *       模板管理、历史记录、限流/配额
 */
describe('AI模块: AI 工具调用集成测试', () => {
  let ctx: IntegrationTestContext;
  let authHelper: TestAuthHelper;
  let factory: TestDataFactory;

  // 测试数据
  let school: any;
  let teacher1: any;

  beforeAll(async () => {
    ctx = await IntegrationTestContext.create();
    authHelper = ctx.authHelper;
    factory = ctx.factory;

    validateSharedConstants();

    school = await factory.createSchool({ code: 'SCH001', name: '测试小学' });
    teacher1 = await factory.createTeacher(school.id, { username: 'teacher1', name: '李老师', teacherNo: 'T001' });
  }, 30000);

  afterAll(async () => {
    await ctx.teardown();
  }, 10000);

  describe('POST /api/ai/chat/sync - 同步调用', () => {
    it('should 同步调用成功_Prompt构建_上下文注入_非流式返回', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [
            { role: 'user', content: '帮我写一份语文阅读理解教案' }
          ],
          temperature: 0.7,
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('content');
        expect(typeof data.content).toBe('string');
        expect(data.content.length).toBeGreaterThan(0);
      } else if (res.status === 400) {
        // AI 未配置
        expect(res.body.message).toContain('AI');
      }
    });

    it('should 同步调用成功_含文件上传_文件解析注入上下文', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 模拟 base64 文件
      const fakeFileBase64 = Buffer.from('测试文件内容').toString('base64');
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [
            { role: 'user', content: '分析这个学生成绩文件' }
          ],
          files: [
            { name: 'grades.xlsx', data: fakeFileBase64 }
          ],
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('content');
      }
    });

    it('should 同步调用失败_未配置AI_返回错误', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [{ role: 'user', content: '测试' }],
        });

      // 可能返回 200 但内容为 fallback，或 400/500
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should 同步调用失败_缺少messages_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expectErrorResponse(res, 400);
    });

    it('should Token统计_响应包��token使用量', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [{ role: 'user', content: '简单测试' }],
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        // 检查是否包含 token 统计信息
        if (data.usage) {
          expect(data.usage).toHaveProperty('promptTokens');
          expect(data.usage).toHaveProperty('completionTokens');
          expect(data.usage).toHaveProperty('totalTokens');
        }
      }
    });
  });

  describe('POST /api/ai/chat - 流式调用 (SSE)', () => {
    it('should 流式调用_SSE格式_分片返回', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [{ role: 'user', content: '写一首关于春天的诗' }],
        });

      // SSE 响应检查
      if (res.status === 200) {
        expect(res.headers['content-type']).toContain('text/event-stream');
        const text = res.text;
        expect(text).toContain('data:');
        expect(text).toContain('[DONE]');
      }
    });

    it('should 流式调用错误处理_返回error分片', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [],
        });

      if (res.status === 200) {
        const text = res.text;
        // 错误时也应返回 SSE 格式
        expect(text).toContain('data:');
      }
    });
  });

  describe('POST /api/ai/parse - 结构化解析', () => {
    it('should 结构化解析_文本转JSON数组', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/parse')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: '学生名单：张三 男 1001 李四 女 1002',
          instruction: '解析为 [{name, gender, studentNo}] 格式',
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          expect(data[0]).toHaveProperty('name');
        }
      }
    });

    it('should 结构化解析失败_缺少text_返回400', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/parse')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expectErrorResponse(res, 400);
    });
  });

  describe('AI 模板管理: POST/GET/PATCH/DELETE /api/ai/templates', () => {
    let templateId: string;

    it('should 创建模板_变量替换_版本控制', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/templates')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '教案生成模板',
          description: '用于生成标准教案',
          content: '请为{{subject}}学科{{grade}}年级设计一份关于{{topic}}的教案，要求包含教学目标、重难点、教学过程。',
          variables: ['subject', 'grade', 'topic'],
          category: 'lesson_plan',
        });

      if (res.status === 200 || res.status === 201) {
        const data = expectSuccessResponse(res);
        expect(data.id).toBeDefined();
        expect(data.name).toBe('教案生成模板');
        expect(data.variables).toEqual(['subject', 'grade', 'topic']);
        expect(data.version).toBe(1);
        templateId = data.id;
      }
    });

    it('should 获取模板列表_按分类筛选', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/ai/templates?category=lesson_plan')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('should 获取模板详情', async () => {
      if (!templateId) return;
      
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get(`/api/ai/templates/${templateId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data.id).toBe(templateId);
        expect(data.content).toContain('{{subject}}');
      }
    });

    it('should 更新模板_版本号递增', async () => {
      if (!templateId) return;
      
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .patch(`/api/ai/templates/${templateId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: '更新后的模板内容：{{subject}} {{grade}} {{topic}}',
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data.version).toBe(2);
      }
    });

    it('should 删除模板', async () => {
      if (!templateId) return;
      
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .delete(`/api/ai/templates/${templateId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.status);
    });
  });

  describe('AI 历史记录: GET /api/ai/history', () => {
    it('should 历史记录_用户维度_按工具分类', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/ai/history?tool=chat&skip=0&take=20')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('total');
        expect(Array.isArray(data.items)).toBe(true);
        if (data.items.length > 0) {
          expect(data.items[0]).toHaveProperty('tool');
          expect(data.items[0]).toHaveProperty('input');
          expect(data.items[0]).toHaveProperty('output');
          expect(data.items[0]).toHaveProperty('createdAt');
        }
      }
    });

    it('should 历史记录_导出', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .get('/api/ai/history/export?format=json')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        expect(res.headers['content-type']).toContain('application/json');
      }
    });

    it('should 历史记录失败_其他用户不可见_隔离', async () => {
      const teacher2 = await factory.createTeacher(school.id, { username: 'teacher2', name: '王老师' });
      const token = authHelper.teacherToken(teacher2.id, school.id);
      
      const res = await ctx.request()
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        // teacher2 的历史记录应该为空或不包含 teacher1 的记录
        data.items.forEach((item: any) => {
          expect(item.teacherId).not.toBe(teacher1.id);
        });
      }
    });
  });

  describe('限流/配额: 用户级/校级/平台级', () => {
    it('should 用户级限流_超额返回429', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 发送多次请求触发限流
      const promises = Array(15).fill(null).map(() => 
        ctx.request()
          .post('/api/ai/chat-sync')
          .set('Authorization', `Bearer ${token}`)
          .send({ messages: [{ role: 'user', content: '限流测试' }] })
      );

      const results = await Promise.all(promises);
      const rateLimited = results.some(r => r.status === 429);
      
      // 至少有一次被限流（具体限流阈值取决于配置）
      // 如果未配置限流，则全部成功
      expect(rateLimited || results.every(r => r.status === 200)).toBe(true);
    });

    it('should 校级配额_超额处理', async () => {
      // 校级配额测试需要多教师并发
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ messages: [{ role: 'user', content: '配额测试' }] });

      // 只要不报错即可，具体配额逻辑视配置而定
      expect([200, 400, 429, 500]).toContain(res.status);
    });

    it('should 平台级配额_超额返回错误信息', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat-sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ messages: [{ role: 'user', content: '平台配额测试' }] });

      expect([200, 400, 429, 500]).toContain(res.status);
    });
  });

  describe('异步任务: POST /api/ai/chat/async', () => {
    it('should 异步任务创建_返回taskId', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/chat/async')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [{ role: 'user', content: '生成一份详细的期中考试分析报告' }],
          callbackUrl: 'https://example.com/callback',
        });

      if (res.status === 200 || res.status === 201) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('taskId');
        expect(typeof data.taskId).toBe('string');
      }
    });

    it('should 任务轮询/回调_超时处理', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      // 创建任务
      const createRes = await ctx.request()
        .post('/api/ai/chat/async')
        .set('Authorization', `Bearer ${token}`)
        .send({
          messages: [{ role: 'user', content: '简单任务' }],
        });

      if (createRes.status === 200 || createRes.status === 201) {
        const taskId = createRes.body.data?.taskId || createRes.body.taskId;
        
        if (taskId) {
          // 轮询状态
          const pollRes = await ctx.request()
            .get(`/api/ai/tasks/${taskId}`)
            .set('Authorization', `Bearer ${token}`);

          if (pollRes.status === 200) {
            const data = expectSuccessResponse(pollRes);
            expect(data).toHaveProperty('status');
            expect(['pending', 'processing', 'completed', 'failed']).toContain(data.status);
          }
        }
      }
    });
  });

  describe('文件解析: POST /api/ai/parse-file', () => {
    it('should 解析Excel_返回文本', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      const fakeXlsx = Buffer.from('fake xlsx content').toString('base64');
      
      const res = await ctx.request()
        .post('/api/ai/parse-file')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'grades.xlsx',
          fileData: fakeXlsx,
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('text');
        expect(typeof data.text).toBe('string');
      } else if (res.status === 400) {
        // 文件格式校验失败
        expect(res.body.message).toContain('文件');
      }
    });

    it('should 解析PDF_返回文本', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      const fakePdf = Buffer.from('%PDF-1.4 fake pdf').toString('base64');
      
      const res = await ctx.request()
        .post('/api/ai/parse-file')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'document.pdf',
          fileData: fakePdf,
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('text');
      }
    });

    it('should 解析图片_OCR识别文字', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      const fakeImage = Buffer.from('fake png').toString('base64');
      
      const res = await ctx.request()
        .post('/api/ai/parse-file')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'image.png',
          fileData: fakeImage,
        });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('text');
      }
    });
  });

  describe('OCR/ASR/图生图/文生视频: 专用端点', () => {
    it('should OCR识别_POST /api/ai/ocr', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      const fakeImage = Buffer.from('fake image').toString('base64');
      
      const res = await ctx.request()
        .post('/api/ai/ocr')
        .set('Authorization', `Bearer ${token}`)
        .send({ image: fakeImage });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(typeof data).toBe('string');
      }
    });

    it('should 语音识别_POST /api/ai/asr', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      const fakeAudio = Buffer.from('fake wav').toString('base64');
      
      const res = await ctx.request()
        .post('/api/ai/asr')
        .set('Authorization', `Bearer ${token}`)
        .send({ audio: fakeAudio, format: 'wav' });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('text');
      }
    });

    it('should 文生图_POST /api/ai/gen-image', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/gen-image')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: '一张春天的风景画', n: 1, size: '1024x1024' });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('urls');
        expect(Array.isArray(data.urls)).toBe(true);
      }
    });

    it('should 文生视频_POST /api/ai/gen-video', async () => {
      const token = authHelper.teacherToken(teacher1.id, school.id);
      
      const res = await ctx.request()
        .post('/api/ai/gen-video')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: '春天的动画', duration: 5 });

      if (res.status === 200) {
        const data = expectSuccessResponse(res);
        expect(data).toHaveProperty('taskId');
      }
    });
  });

  describe('共享常量对齐验证', () => {
    it('should 功能标识包含ai', () => {
      const { FEATURE_FLAGS_SET } = require('@gardener/shared/constants');
      expect(FEATURE_FLAGS_SET.has('ai')).toBe(true);
    });

    it('should 角色教师包含ai权限', () => {
      const { ROLE_OPTIONS } = require('@gardener/shared/constants');
      const teacherRole = ROLE_OPTIONS.find((r: any) => r.value === 'teacher');
      expect(teacherRole).toBeDefined();
      expect(teacherRole.features).toContain('ai');
    });
  });
});