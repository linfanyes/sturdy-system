import fs from 'fs'
import path from 'path'

const parentLoginVuePath = path.resolve(__dirname, '../src/pages/parent-login/parent-login.vue')
const content = fs.readFileSync(parentLoginVuePath, 'utf-8')

describe('家长登录页安全属性', () => {
  it('有密码输入框（password 属性）', () => {
    // input 标签应带 password 属性
    expect(content).toMatch(/<input[^>]*\bpassword\b[^>]*>/)
  })

  it('login 函数传递 password 参数', () => {
    expect(content).toMatch(/function\s+login\s*\(/)
    // 调用接口时应传递 password 字段
    expect(content).toMatch(/password\s*:\s*password\.value/)
  })

  it('有密码非空校验', () => {
    // 应存在对 password.value 的非空判断
    expect(content).toMatch(/if\s*\(\s*!password\.value\s*\)/)
    // 应有对应的提示文案
    expect(content).toContain('请输入密码')
  })

  it('placeholder 包含"默认 123456"提示', () => {
    expect(content).toContain('默认 123456')
  })

  it('不存在无密码登录的代码（只传 studentNo 不传 password）', () => {
    // 所有含 studentNo 的单行对象字面量都必须同时包含 password
    // [^\n{}] 限制不跨行、不嵌套花括号，避免误匹配函数体
    const studentNoObjects = content.match(/\{[^\n{}]*studentNo[^\n{}]*\}/g) || []
    expect(studentNoObjects.length).toBeGreaterThan(0)
    for (const obj of studentNoObjects) {
      expect(obj).toContain('password')
    }
    // 不应出现只传学号的登录调用（请求体仅含 studentNo）
    expect(content).not.toMatch(/\{\s*studentNo\s*:\s*[^,}]*\s*\}/)
  })

  it('输入框有防挤压（width: 100% 或 max-width）', () => {
    // .inp 样式应包含 width: 100% 或 max-width 以防输入框被挤压
    expect(content).toMatch(/\.inp\s*\{[^}]*width:\s*100%[^}]*\}/)
    expect(content).toMatch(/max-width:\s*620rpx/)
  })
})
