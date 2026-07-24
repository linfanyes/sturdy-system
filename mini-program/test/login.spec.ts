import fs from 'fs'
import path from 'path'

const adminVuePath = path.resolve(__dirname, '../src/pages/admin/admin.vue')
const loginVuePath = path.resolve(__dirname, '../src/pages/login/login.vue')

const adminContent = fs.readFileSync(adminVuePath, 'utf-8')
const loginContent = fs.readFileSync(loginVuePath, 'utf-8')

describe('教师/超管登录页安全属性', () => {
  describe('admin.vue 凭据安全', () => {
    it('不存在硬编码的 admin/admin 凭据', () => {
      // 不应出现形如 username: 'admin' / password: 'admin' 的硬编码
      expect(adminContent).not.toMatch(/username\s*:\s*['"]admin['"]/)
      expect(adminContent).not.toMatch(/password\s*:\s*['"]admin['"]/)
      expect(adminContent).not.toMatch(/adminUser\s*=\s*ref\(['"]admin['"]\)/)
      expect(adminContent).not.toMatch(/adminPwd\s*=\s*ref\(['"]admin['"]\)/)
    })

    it('有 doLogin 函数（非 autoLogin）', () => {
      expect(adminContent).toMatch(/function\s+doLogin\s*\(/)
      expect(adminContent).toMatch(/async\s+function\s+doLogin\s*\(/)
    })

    it('有用户名密码输入框（login-input class）', () => {
      expect(adminContent).toContain('class="login-input"')
      // 用户名与密码两个输入框
      const loginInputCount = (adminContent.match(/class="login-input"/g) || []).length
      expect(loginInputCount).toBeGreaterThanOrEqual(2)
    })

    it('doLogin 使用 adminUser.value 和 adminPwd.value（非硬编码）', () => {
      expect(adminContent).toContain('adminUser.value')
      expect(adminContent).toContain('adminPwd.value')
      // doLogin 函数体应引用这两个响应式变量
      expect(adminContent).toMatch(/adminUser\.value\.trim\(\)/)
      expect(adminContent).toMatch(/password\s*:\s*adminPwd\.value/)
    })

    it('不存在 autoLogin 函数', () => {
      expect(adminContent).not.toMatch(/function\s+autoLogin\s*\(/)
      expect(adminContent).not.toMatch(/async\s+function\s+autoLogin\s*\(/)
      expect(adminContent).not.toContain('autoLogin')
    })
  })

  describe('login.vue 统一登录逻辑', () => {
    it('存在统一登录逻辑', () => {
      expect(loginContent).toMatch(/function\s+doLogin\s*\(/)
      expect(loginContent).toContain('/auth/unified-login')
    })
  })
})
