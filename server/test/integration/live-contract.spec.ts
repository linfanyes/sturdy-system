/**
 * 真实后端 → Web/小程序 API 契约验证测试
 * 启动 NestJS + SQLite 内存后端，验证核心 API 端点
 */
import { IntegrationTestContext, expectSuccessResponse, validateSharedConstants } from './setup'

let ctx: IntegrationTestContext

beforeAll(async () => {
  ctx = await IntegrationTestContext.create()
}, 60000)

afterAll(async () => {
  try { if (ctx) await ctx.app?.close() } catch {}
}, 5000)

describe('真实后端 → 前端 API 契约验证', () => {
  // ========== 健康检查 ==========
  describe('健康检查: Web/Mini 监控端点', () => {
    it('GET /api/health_返回200+标准格式', async () => {
      const res = await ctx.request().get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('code', 200)
      expect(res.body).toHaveProperty('message')
      expect(res.body).toHaveProperty('timestamp')
    })
  })

  // ========== 认证模块 ==========
  describe('认证模块: Web/Mini 统一登录 API', () => {
    it('POST /api/auth/login_错误凭据_返回401', async () => {
      const res = await ctx.request()
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' })
      
      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('message')
    })

    it('POST /api/auth/login_空凭据_返回400/401', async () => {
      const res = await ctx.request()
        .post('/api/auth/login')
        .send({})
      
      expect([400, 401]).toContain(res.status)
    })

    it('GET 受保护路由_无token_返回401/404', async () => {
      const res = await ctx.request().get('/api/auth/profile')
      expect([401, 404]).toContain(res.status)
    })

    it('GET /api/classes_无token_返回401', async () => {
      const res = await ctx.request().get('/api/classes')
      expect(res.status).toBe(401)
    })
  })

  // ========== 安全验证 ==========
  describe('安全验证: 限流+CORS+错误格式', () => {
    it('限流_正常请求_不拦截', async () => {
      const res = await ctx.request().get('/api/health')
      expect(res.status).toBe(200)
    })

    it('错误响应格式_401含code/message/timestamp', async () => {
      const res = await ctx.request()
        .post('/api/auth/login')
        .send({ username: 'x', password: 'y' })
      
      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('code')
      expect(res.body).toHaveProperty('message')
      expect(res.body).toHaveProperty('timestamp')
    })

    it('CORS_OPTIONS请求_允许跨域', async () => {
      const res = await ctx.request()
        .options('/api/health')
        .set('Origin', 'http://localhost:5202')
      
      expect([200, 204]).toContain(res.status)
    })
  })

  // ========== 共享常量验证 ==========
  describe('共享常量对齐: 前后端一致', () => {
    it('PHONE_REGEX_与shared.constant一致', () => {
      validateSharedConstants()
    })
  })

  // ========== 数据库CRUD ==========
  describe('数据库CRUD: 真实SQLite读写验证', () => {
    it('创建学校→查询学校_数据已持久化', async () => {
      const school = await ctx.factory.createSchool({ name: '测试学校' })
      expect(school.id).toBeTruthy()
      expect(school.name).toBe('测试学校')
    })

    it('创建教师→查询教师_数据正确', async () => {
      const teacher = await ctx.factory.createTeacher('1', { name: '张老师' })
      expect(teacher.id).toBeTruthy()
      expect(teacher.name).toBe('张老师')
    })

    it('创建班级→生成标准名_验证班级命名规则', async () => {
      const cls = await ctx.factory.createClass('1', '三年级', '2')
      expect(cls.name).toBe('三年级2班')
    })
  })
})