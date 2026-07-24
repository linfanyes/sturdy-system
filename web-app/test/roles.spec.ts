import fs from 'fs'
import path from 'path'

const routerPath = path.resolve(__dirname, '../src/router/index.ts')
const routerContent = fs.readFileSync(routerPath, 'utf-8')

describe('四级角色路由权限', () => {
  const roles = ['super', 'school_admin', 'teacher', 'parent']

  roles.forEach((role) => {
    describe(`${role} 角色路由`, () => {
      it(`存在 ${role} 角色的父路由`, () => {
        // 路由表中应包含该角色的路径定义
        const pattern = new RegExp(`path:\\s*['"]/${role.replace('_', '-')}['"]`)
        expect(routerContent).toMatch(pattern)
      })

      it(`${role} 路由设置了 requiresAuth`, () => {
        // 查找角色路由块中的 requiresAuth
        const rolePath = role === 'school_admin' ? 'school-admin' : role
        const blockPattern = new RegExp(
          `path:\\s*['"]/${rolePath}['"][\\s\\S]*?requiresAuth:\\s*true`,
        )
        expect(routerContent).toMatch(blockPattern)
      })

      it(`${role} 路由设置了 roles meta`, () => {
        const rolePath = role === 'school_admin' ? 'school-admin' : role
        const blockPattern = new RegExp(
          `path:\\s*['"]/${rolePath}['"][\\s\\S]*?roles:\\s*\\[?['"]${role}['"]\\]?`,
        )
        expect(routerContent).toMatch(blockPattern)
      })
    })
  })

  it('根路径按角色重定向逻辑存在', () => {
    expect(routerContent).toMatch(/name:\s*['"]home['"]/)
    expect(routerContent).toMatch(/redirect:/)
    expect(routerContent).toMatch(/useAuthStore/)
  })

  it('存在 forbidden（403）页面', () => {
    expect(routerContent).toMatch(/forbidden/i)
    expect(routerContent).toMatch(/Forbidden\.vue/)
  })

  it('存在 404 catch-all 路由', () => {
    expect(routerContent).toMatch(/pathMatch\(\.\*\)/)
    expect(routerContent).toMatch(/NotFound\.vue/)
  })

  it('已登录访问 /login 会重定向', () => {
    expect(routerContent).toMatch(/isLoggedIn/)
    expect(routerContent).toMatch(/name:\s*['"]home['"]/)
  })
})
