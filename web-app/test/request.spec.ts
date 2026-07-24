import fs from 'fs'
import path from 'path'

const requestPath = path.resolve(__dirname, '../src/api/request.ts')
const requestContent = fs.readFileSync(requestPath, 'utf-8')

describe('HTTP 请求封装安全属性', () => {
  it('存在 axios 实例创建', () => {
    expect(requestContent).toMatch(/axios\.create|import\s+axios/)
  })

  it('请求拦截器携带 Authorization 头', () => {
    expect(requestContent).toMatch(/interceptors\.request/)
    expect(requestContent).toMatch(/Authorization/)
    expect(requestContent).toMatch(/Bearer/)
  })

  it('401 响应清除登录态并跳转登录', () => {
    expect(requestContent).toMatch(/status\s*===\s*401/)
    expect(requestContent).toMatch(/removeItem.*trace_web_token/)
    expect(requestContent).toMatch(/removeItem.*trace_web_user/)
    expect(requestContent).toMatch(/login/)
  })

  it('使用 trace_web_token 作为 localStorage key', () => {
    expect(requestContent).toMatch(/trace_web_token/)
  })
})
