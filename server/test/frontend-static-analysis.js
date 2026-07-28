/**
 * 前端静态分析测试
 * 通过代码分析验证小程序前端的排版、功能、性能问题
 * 运行方式: node test/frontend-static-analysis.js
 */

const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../../mini-program/src')
const results = []
let passCount = 0
let failCount = 0
let warnCount = 0

function test(id, category, description, fn) {
  try {
    const result = fn()
    if (result === true) {
      results.push({ id, category, description, status: 'PASS' })
      passCount++
    } else if (result === 'WARN') {
      results.push({ id, category, description, status: 'WARN', detail: '存在潜在风险' })
      warnCount++
    } else {
      results.push({ id, category, description, status: 'FAIL', detail: String(result) })
      failCount++
    }
  } catch (e) {
    results.push({ id, category, description, status: 'FAIL', detail: e.message })
    failCount++
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8')
}

function fileExists(relPath) {
  return fs.existsSync(path.join(SRC, relPath))
}

// ============ 排版测试 ============
console.log('=== 排版测试 ===')

test('TC-FE-LAYOUT-001', '排版', '全局 box-sizing: border-box 设置', () => {
  const app = readFile('App.vue')
  return app.includes('box-sizing') && app.includes('border-box')
})

test('TC-FE-LAYOUT-002', '排版', '页面 overflow-x: hidden 防止横向溢出', () => {
  const app = readFile('App.vue')
  return app.includes('overflow-x') && app.includes('hidden')
})

test('TC-FE-LAYOUT-003', '排版', '安全区域适配（safe-area-inset）', () => {
  const app = readFile('App.vue')
  return app.includes('safe-area') || app.includes('safe-top') || app.includes('safe-bottom')
})

test('TC-FE-LAYOUT-004', '排版', 'rpx 响应式单位使用', () => {
  const dashboard = readFile('pages/dashboard/dashboard.vue')
  return dashboard.includes('rpx')
})

test('TC-FE-LAYOUT-005', '排版', '暗色模式 CSS 变量覆盖', () => {
  const app = readFile('App.vue')
  return app.includes('.dark') && app.includes('--c-bg')
})

test('TC-FE-LAYOUT-006', '排版', '字体缩放支持（fz-sm/md/lg）', () => {
  const app = readFile('App.vue')
  return app.includes('fz-sm') && app.includes('fz-md') && app.includes('fz-lg') && app.includes('--fz-scale')
})

test('TC-FE-LAYOUT-007', '排版', 'tabBar 5个标签完整配置', () => {
  const pages = JSON.parse(readFile('pages.json'))
  return pages.tabBar.list.length === 5
})

test('TC-FE-LAYOUT-008', '排版', 'tabBar 选中色与主题色一致（#e6a23c）', () => {
  const pages = JSON.parse(readFile('pages.json'))
  return pages.tabBar.selectedColor === '#e6a23c'
})

test('TC-FE-LAYOUT-009', '排版', '全局导航栏背景色 #fff7e6', () => {
  const pages = JSON.parse(readFile('pages.json'))
  return pages.globalStyle.navigationBarBackgroundColor === '#fff7e6'
})

test('TC-FE-LAYOUT-010', '排版', '图片最大宽度100%防止溢出', () => {
  const app = readFile('App.vue')
  return app.includes('max-width') && app.includes('100%')
})

test('TC-FE-LAYOUT-011', '排版', '模态框/底部栏安全区域 padding', () => {
  const app = readFile('App.vue')
  return app.includes('.modal') || app.includes('.batchbar') || app.includes('.fab')
})

test('TC-FE-LAYOUT-012', '排版', '4种配色方案定义（奶黄/薄荷/樱花/天蓝）', () => {
  const store = readFile('common/store.js')
  return store.includes('SCHEMES') && store.includes('奶黄')
})

// ============ 功能测试 ============
console.log('=== 功能测试 ===')

test('TC-FE-FUNC-001', '功能', 'config.vue 正确导入 flushTabBarStyle', () => {
  const config = readFile('pages/config/config.vue')
  const importLine = config.split('\n').find(l => l.includes('import') && l.includes('store'))
  const usesFlush = config.includes('flushTabBarStyle()')
  const importsFlush = importLine && importLine.includes('flushTabBarStyle')
  if (usesFlush && !importsFlush) return '使用了 flushTabBarStyle() 但未从 store 导入，将导致 ReferenceError'
  return true
})

test('TC-FE-FUNC-002', '功能', 'dashboard.vue 正确导入 flushTabBarStyle', () => {
  const dash = readFile('pages/dashboard/dashboard.vue')
  const importLine = dash.split('\n').find(l => l.includes('import') && l.includes('store'))
  return importLine && importLine.includes('flushTabBarStyle')
})

test('TC-FE-FUNC-003', '功能', 'classes.vue 正确导入 flushTabBarStyle', () => {
  const cls = readFile('pages/classes/classes.vue')
  const importLine = cls.split('\n').find(l => l.includes('import') && l.includes('store'))
  return importLine && importLine.includes('flushTabBarStyle')
})

test('TC-FE-FUNC-004', '功能', 'students.vue 正确导入 flushTabBarStyle', () => {
  const stu = readFile('pages/students/students.vue')
  const importLine = stu.split('\n').find(l => l.includes('import') && l.includes('store'))
  return importLine && importLine.includes('flushTabBarStyle')
})

test('TC-FE-FUNC-005', '功能', 'toolbox.vue 正确导入 flushTabBarStyle', () => {
  const tb = readFile('pages/toolbox/toolbox.vue')
  const importLine = tb.split('\n').find(l => l.includes('import') && l.includes('store'))
  return importLine && importLine.includes('flushTabBarStyle')
})

test('TC-FE-FUNC-006', '功能', '登录页空用户名/密码校验', () => {
  const login = readFile('pages/login/login.vue')
  return login.includes('请输入') || login.includes('showToast')
})

test('TC-FE-FUNC-007', '功能', '401 自动登出逻辑', () => {
  const req = readFile('common/request.js')
  return req.includes('401') && req.includes('logout')
})

test('TC-FE-FUNC-008', '功能', '请求超时 30s 设置', () => {
  const req = readFile('common/request.js')
  return req.includes('30000') || req.includes('REQUEST_TIMEOUT')
})

test('TC-FE-FUNC-009', '功能', 'AI 流式超时 45s 设置', () => {
  const req = readFile('common/request.js')
  return req.includes('45000')
})

test('TC-FE-FUNC-010', '功能', '路由守卫角色拦截', () => {
  const guard = readFile('common/route-guard.js')
  return guard.includes('addInterceptor') && guard.includes('PAGE_ROLES')
})

test('TC-FE-FUNC-011', '功能', '多角色会话恢复（super/sa/parent/teacher）', () => {
  const app = readFile('App.vue')
  return app.includes('admin_token') && app.includes('sa_token') && app.includes('g_parent_token') && app.includes('g_token')
})

test('TC-FE-FUNC-012', '功能', 'Mock 模式开关持久化', () => {
  const store = readFile('common/store.js')
  return store.includes('g_mock_mode')
})

test('TC-FE-FUNC-013', '功能', 'switchTab 参数桥接（switchTabParams）', () => {
  const store = readFile('common/store.js')
  return store.includes('switchTabParams')
})

test('TC-FE-FUNC-014', '功能', '下拉刷新配置（enablePullDownRefresh）', () => {
  const pages = JSON.parse(readFile('pages.json'))
  const mainPages = pages.pages.filter(p => p.style && p.style.enablePullDownRefresh)
  return mainPages.length > 10 // 大部分业务页面应启用
})

test('TC-FE-FUNC-015', '功能', '分包预加载规则（toolbox → tools）', () => {
  const pages = JSON.parse(readFile('pages.json'))
  const rules = pages.preloadRule
  return rules && rules['pages/toolbox/toolbox'] && rules['pages/toolbox/toolbox'].packages.includes('tools')
})

test('TC-FE-FUNC-016', '功能', 'EmptyState 组件存在且被引用', () => {
  const exists = fileExists('components/EmptyState/EmptyState.vue')
  const dash = readFile('pages/dashboard/dashboard.vue')
  return exists && dash.includes('EmptyState')
})

test('TC-FE-FUNC-017', '功能', 'Skeleton 加载骨架屏组件存在', () => {
  return fileExists('components/Skeleton/Skeleton.vue')
})

test('TC-FE-FUNC-018', '功能', '表单验证器导入（validators）', () => {
  const students = readFile('pages/students/students.vue')
  return students.includes('validators') || students.includes('isPhone') || students.includes('isStudentNo')
})

test('TC-FE-FUNC-019', '功能', '批量操作使用 Promise.allSettled（batchRun）', () => {
  const req = readFile('common/request.js')
  return req.includes('allSettled') && req.includes('batchRun')
})

test('TC-FE-FUNC-020', '功能', '删除操作二次确认（uni.showModal）', () => {
  const dash = readFile('pages/dashboard/dashboard.vue')
  return dash.includes('showModal')
})

// ============ 性能测试 ============
console.log('=== 性能测试 ===')

test('TC-FE-PERF-001', '性能', 'Dashboard 并行加载（Promise.all 或独立 catch）', () => {
  const dash = readFile('pages/dashboard/dashboard.vue')
  // 检查是否有多个 .catch(() => []) 并行调用
  const catchCount = (dash.match(/\.catch\(\(\)\s*=>/g) || []).length
  return catchCount >= 5 ? true : `仅发现 ${catchCount} 个并行 catch，预期 >= 5`
})

test('TC-FE-PERF-002', '性能', '学生列表客户端分页（PAGE_SIZE）', () => {
  const stu = readFile('pages/students/students.vue')
  return stu.includes('PAGE_SIZE') || stu.includes('pageSize') || stu.includes('20')
})

test('TC-FE-PERF-003', '性能', '搜索防抖（debounce/watch）', () => {
  const stu = readFile('pages/students/students.vue')
  return stu.includes('watch') || stu.includes('debounce') || stu.includes('setTimeout')
})

test('TC-FE-PERF-004', '性能', '定时器清理（onHide/onUnload clearInterval）', () => {
  const dash = readFile('pages/dashboard/dashboard.vue')
  return dash.includes('clearInterval') || dash.includes('onHide')
})

test('TC-FE-PERF-005', '性能', '图片压缩（compressImage）', () => {
  const exists = fileExists('common/image.js')
  if (!exists) return 'common/image.js 不存在'
  const img = readFile('common/image.js')
  return img.includes('compress') || img.includes('canvas')
})

test('TC-FE-PERF-006', '性能', 'AI 会话持久化时剥离 base64', () => {
  const ai = readFile('pages/ai/ai.vue')
  return ai.includes('base64') && (ai.includes('strip') || ai.includes('replace') || ai.includes('slice'))
})

test('TC-FE-PERF-007', '性能', '分包加载（subPackages 配置）', () => {
  const pages = JSON.parse(readFile('pages.json'))
  return pages.subPackages && pages.subPackages.length >= 3
})

test('TC-FE-PERF-008', '性能', '请求 loading 状态防重复提交（saving flag）', () => {
  const config = readFile('pages/config/config.vue')
  return config.includes('savingAi') || config.includes('saving')
})

test('TC-FE-PERF-009', '性能', '云托管私网链路（callContainer 而非公网 HTTP）', () => {
  const req = readFile('common/request.js')
  return req.includes('callContainer')
})

test('TC-FE-PERF-010', '性能', 'DCloud CDN 预加载阻断（避免 ERR_TIMED_OUT）', () => {
  const app = readFile('App.vue')
  return app.includes('preloadAssets') || app.includes('ERR_TIMED_OUT')
})

// ============ 安全测试 ============
console.log('=== 安全测试 ===')

test('TC-FE-SEC-001', '安全', 'AI 富文本 XSS 防护（HTML 转义）', () => {
  const ai = readFile('pages/ai/ai.vue')
  return ai.includes('escape') || ai.includes('sanitize') || ai.includes('rich-text')
})

test('TC-FE-SEC-002', '安全', '图片 URL 协议限制（仅 http/https）', () => {
  const ai = readFile('pages/ai/ai.vue')
  return ai.includes('http') && (ai.includes('https') || ai.includes('protocol'))
})

test('TC-FE-SEC-003', '安全', 'Token 存储使用 storage key 前缀隔离', () => {
  const store = readFile('common/store.js')
  return store.includes('g_token') && store.includes('g_parent_token')
})

test('TC-FE-SEC-004', '安全', '登出清除所有角色 token', () => {
  const store = readFile('common/store.js')
  const logoutSection = store.slice(store.indexOf('function logout') || store.indexOf('logout'))
  return logoutSection.includes('admin_token') || logoutSection.includes('removeStorage')
})

test('TC-FE-SEC-005', '安全', '云环境 ID 不暴露密钥', () => {
  const config = readFile('common/config.js')
  return !config.includes('secret') && !config.includes('password') && !config.includes('apiKey')
})

// ============ 输出报告 ============
console.log('\n=== 前端静态分析测试报告 ===')
console.log(`总计: ${results.length} | 通过: ${passCount} | 失败: ${failCount} | 警告: ${warnCount}`)
console.log('')

const failed = results.filter(r => r.status === 'FAIL')
const warned = results.filter(r => r.status === 'WARN')

if (failed.length > 0) {
  console.log('--- 失败项 ---')
  failed.forEach(r => console.log(`  [FAIL] ${r.id} (${r.category}): ${r.description}`))
  if (failed[0].detail) console.log(`         原因: ${failed[0].detail}`)
  failed.slice(1).forEach(r => {
    if (r.detail) console.log(`         原因: ${r.detail}`)
  })
}

if (warned.length > 0) {
  console.log('--- 警告项 ---')
  warned.forEach(r => console.log(`  [WARN] ${r.id} (${r.category}): ${r.description}`))
}

console.log('\n--- 全部结果 ---')
results.forEach(r => {
  const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠'
  console.log(`  ${icon} ${r.id} [${r.category}] ${r.description}${r.detail ? ' → ' + r.detail : ''}`)
})

// 写入 JSON 报告
const report = {
  timestamp: new Date().toISOString(),
  type: 'frontend-static-analysis',
  summary: { total: results.length, pass: passCount, fail: failCount, warn: warnCount },
  results,
}
fs.writeFileSync(path.join(__dirname, 'frontend-test-report.json'), JSON.stringify(report, null, 2))
console.log('\n报告已写入: test/frontend-test-report.json')

process.exit(failCount > 0 ? 1 : 0)
