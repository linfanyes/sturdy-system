import fs from 'fs'
import path from 'path'

// 认证 store 已拆分为「兼容 shim（auth.ts）+ 共享状态机实现（auth-machine.ts）」，
// 静态检查需同时覆盖两个文件。
const authStorePath = path.resolve(__dirname, '../src/stores/auth.ts')
const authContent = fs.readFileSync(authStorePath, 'utf-8')
const authMachinePath = path.resolve(__dirname, '../src/stores/auth-machine.ts')
const authMachineContent = fs.readFileSync(authMachinePath, 'utf-8')

// 用户类型现在从共享包重新导出，验证重新导出存在
const userTypesPath = path.resolve(__dirname, '../src/types/user.ts')
const userTypesContent = fs.readFileSync(userTypesPath, 'utf-8')

// 共享包类型定义路径
const sharedTypesPath = path.resolve(__dirname, '../../shared/types/index.ts')
const sharedTypesContent = fs.readFileSync(sharedTypesPath, 'utf-8')

describe('认证 Store 安全属性', () => {
  describe('Role 类型定义', () => {
    it('在共享包中定义了四级角色联合类型', () => {
      expect(sharedTypesContent).toMatch(/type\s+Role\s*=/)
      // 共享包常量使用 'super' 等值（在 constants 文件中定义）
      // types 文件中重新导出了 Role 类型，验证常量文件中包含这些值
      const constantsPath = path.resolve(__dirname, '../../shared/constants/index.ts')
      const constantsContent = fs.readFileSync(constantsPath, 'utf-8')
      expect(constantsContent).toMatch(/'super'/)
      expect(constantsContent).toMatch(/'school_admin'/)
      expect(constantsContent).toMatch(/'teacher'/)
      expect(constantsContent).toMatch(/'parent'/)
    })

    it('Web端重新导出了 Role 类型', () => {
      expect(userTypesContent).toMatch(/type\s+Role/)
      expect(userTypesContent).toMatch(/from\s+['"]@gardener\/shared\/types['"]/)
    })
  })

  describe('AuthUser 类型定义', () => {
    it('在共享包中定义了 User 接口（等价 AuthUser）', () => {
      // 共享包使用 User 接口，包含 role、features 等字段
      expect(sharedTypesContent).toMatch(/interface\s+User/)
      expect(sharedTypesContent).toMatch(/role:\s*Role/)
      expect(sharedTypesContent).toMatch(/features:\s*string\[\]/)
    })

    it('Web端重新导出了 User 类型', () => {
      expect(userTypesContent).toMatch(/type\s+User/)
      expect(userTypesContent).toMatch(/from\s+['"]@gardener\/shared\/types['"]/)
    })
  })

  describe('Store 实现（shim + auth-machine）', () => {
    it('auth.ts 作为兼容 shim 重新导出 useAuthStore', () => {
      expect(authContent).toMatch(/export\s*\{\s*useAuthStore\s*\}/)
      expect(authContent).toMatch(/auth-machine/)
    })

    it('token 持久化到 localStorage（沿用旧 key）', () => {
      expect(authMachineContent).toMatch(/trace_web_token/)
      expect(authMachineContent).toMatch(/localStorage/)
    })

    it('user 信息持久化', () => {
      expect(authMachineContent).toMatch(/trace_web_user/)
    })

    it('实现了统一登录与 4 种角色快捷登录方法', () => {
      expect(authMachineContent).toMatch(/loginByUsername/)
      expect(authMachineContent).toMatch(/loginAsSuper/)
      expect(authMachineContent).toMatch(/loginAsSchoolAdmin/)
      expect(authMachineContent).toMatch(/loginAsTeacher/)
      expect(authMachineContent).toMatch(/loginAsParent/)
    })

    it('实现了登出逻辑（清除持久化由共享 persistence 适配器完成）', () => {
      expect(authMachineContent).toMatch(/logout/)
      const factoryPath = path.resolve(__dirname, '../../shared/auth/factory.ts')
      const factoryContent = fs.readFileSync(factoryPath, 'utf-8')
      expect(factoryContent).toMatch(/removeItem/)
    })

    it('role 是 computed 派生', () => {
      expect(authMachineContent).toMatch(/computed/)
      expect(authMachineContent).toMatch(/role/)
    })

    it('isLoggedIn computed 存在', () => {
      expect(authMachineContent).toMatch(/isLoggedIn/)
    })
  })
})
