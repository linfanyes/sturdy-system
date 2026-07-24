import fs from 'fs'
import path from 'path'

const authStorePath = path.resolve(__dirname, '../src/stores/auth.ts')
const authContent = fs.readFileSync(authStorePath, 'utf-8')

const userTypesPath = path.resolve(__dirname, '../src/types/user.ts')
const userTypesContent = fs.readFileSync(userTypesPath, 'utf-8')

describe('认证 Store 安全属性', () => {
  describe('Role 类型定义', () => {
    it('定义了四级角色联合类型', () => {
      expect(userTypesContent).toMatch(/type\s+Role\s*=/)
      expect(userTypesContent).toMatch(/'super'/)
      expect(userTypesContent).toMatch(/'school_admin'/)
      expect(userTypesContent).toMatch(/'teacher'/)
      expect(userTypesContent).toMatch(/'parent'/)
    })

    it('AuthUser 接口包含必要字段', () => {
      expect(userTypesContent).toMatch(/interface\s+AuthUser/)
      expect(userTypesContent).toMatch(/role:\s*Role/)
      expect(userTypesContent).toMatch(/features\??:\s*string\[\]/)
    })
  })

  describe('Auth Store 实现', () => {
    it('token 持久化到 localStorage', () => {
      expect(authContent).toMatch(/trace_web_token/)
      expect(authContent).toMatch(/localStorage/)
    })

    it('user 信息持久化', () => {
      expect(authContent).toMatch(/trace_web_user/)
    })

    it('实现了 4 种角色登录方法', () => {
      expect(authContent).toMatch(/loginAsSuper/)
      expect(authContent).toMatch(/loginAsSchoolAdmin/)
      expect(authContent).toMatch(/loginAsTeacher/)
      expect(authContent).toMatch(/loginAsParent/)
    })

    it('实现了登出逻辑', () => {
      expect(authContent).toMatch(/function\s+logout|logout\s*\(/)
      expect(authContent).toMatch(/removeItem.*trace_web_token/)
    })

    it('role 是 computed 派生', () => {
      expect(authContent).toMatch(/computed/)
      expect(authContent).toMatch(/role/)
    })

    it('isLoggedIn computed 存在', () => {
      expect(authContent).toMatch(/isLoggedIn/)
    })
  })
})
