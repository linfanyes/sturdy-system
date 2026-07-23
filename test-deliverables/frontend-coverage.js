/**
 * Mini Program 前端逐页渲染覆盖测试
 * 
 * 分析每页的 API 调用 → 交叉验证 mock/后端覆盖 → 识别风险页面
 */
const fs = require('fs')
const path = require('path')
const { getMockData, hasKnownMock } = require('../mini-program/src/common/mock-data.js')

const PAGES_DIR = path.resolve(__dirname, '../mini-program/src/pages')
const PACKAGES_JSON = path.resolve(__dirname, '../mini-program/src/pages.json')

// 已知的真实后端路由（从 server/src 中的 @Controller 注解提取）
const REAL_ROUTES = new Set([
  '/todos', '/schedules', '/notices', '/behavior-records', '/homework',
  '/award-records', '/class-activities', '/duty-rosters', '/class-galleries',
  '/my-galleries', '/attendances', '/lesson-plan-templates', '/reading-logs',
  '/home-visits', '/semesters', '/parent-contacts', '/group-scores',
  '/score-records', '/reward-records', '/checkins', '/resources', '/notes',
  '/growth-entries', '/generated/papers', '/generated/lesson-plans',
  '/generated/knowledges', '/generated/queries', '/class-duty-configs',
  '/seat-layouts', '/work-logs', '/award-categories', '/lesson-observations',
  '/class-expenses', '/students', '/classes', '/exams', '/grades',
  '/config/public', '/config/ai', '/backups', '/messages',
  '/picker-history', '/teachers', '/users/me',
  '/ai/chat', '/ai/chat-sync', '/ai/gen-image', '/ai/gen-video',
  '/ai/parse-file', '/ai/analyze-exam', '/ai/diagnose', '/ai/asr', '/ai/ocr',
  '/security/msg-check', '/security/img-check',
  '/im/user-sig', '/im/parents', '/im/class-group',
  '/parent-auth/login', '/parent-auth/me', '/parent-auth/notices',
  '/parent-auth/exams', '/parent-auth/homework', '/parent-auth/im-user-sig',
  '/auth/unified-login', '/auth/wechat-login', '/auth/bind-by-number',
  '/auth/password-login', '/auth/bind-teacher', '/auth/bind-parent',
  '/admin/login', '/admin/schools', '/admin/school-admins',
  '/school-admin/login', '/school-admin/dashboard', '/school-admin/teachers',
  '/school-admin/stats', '/school-admin/parent-logins',
  '/notices/push', '/schedules/import-ai', '/schedules/import-commit',
])

// 已知不需要 mock 的后端路由（因为它们有真实后端且不需要在演示模式渲染）
const NEEDS_REAL = new Set([
  '/auth/', '/admin/', '/school-admin/', '/parent-auth/',
])

// 收集所有页面路径
function collectPages(pkgJson) {
  const cfg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'))
  const pages = []
  // 主包 — pages.json 的 path 是 "pages/login/login" → 文件是 pages/login/login.vue
  for (const p of cfg.pages) pages.push(p.path)
  // 分包 — root="pages/games" pages=["index"] → 文件是 pages/games/index.vue
  for (const sp of cfg.subPackages || []) {
    for (const p of sp.pages) {
      pages.push(sp.root + '/' + p)
    }
  }
  return pages
}

function extractApiCalls(filePath) {
  if (!fs.existsSync(filePath)) return { calls: [], exists: false }
  const content = fs.readFileSync(filePath, 'utf8')
  // 提取 api.get/api.post/api.put/api.delete/api.getList/api.postForm 调用中的路径字符串
  const regex = /api\.(get|post|put|delete|getList|postForm|upload)\((['`])([^'`]+)\2/g
  const calls = []
  let match
  while ((match = regex.exec(content)) !== null) {
    const path = match[3].split('?')[0].split('${')[0] // 去除 query 参数和模板表达式
    if (path && !path.includes('${') && !path.startsWith('/api/')) {
      const normalized = path.startsWith('/') ? path : '/' + path
      calls.push(normalized)
    }
  }
  // 也提取 uploadFile 等
  const uploadRegex = /uploadFile\(['`]([^'`]+)['`]/g
  while ((match = uploadRegex.exec(content)) !== null) {
    const path = match[1].split('?')[0]
    if (path && path.startsWith('/')) calls.push(path)
  }
  return { calls: [...new Set(calls)], exists: true }
}

// 主流程
const allPages = collectPages(PACKAGES_JSON)
console.log(`共有 ${allPages.length} 个页面\n`)

// 分析子包页面（按根路径分组）
const subPackageRoots = {
  'games/': [],
  'tools/': [],
  'ai/': [],
}

const uncovered = []
const pagesByCoverage = { covered: [], partial: [], missing: [], noapi: [] }

for (const pagePath of allPages) {
  // pages.json 的 path 以 "pages/" 开头，而 PAGES_DIR 已是 pages/
  const rel = pagePath.replace(/^pages\//, '')
  const vueFile = path.join(PAGES_DIR, rel + '.vue')
  if (!fs.existsSync(vueFile)) {
    pagesByCoverage.noapi.push(pagePath)
    continue
  }
  const { calls, exists } = extractApiCalls(vueFile)

  if (calls.length === 0) {
    pagesByCoverage.noapi.push(pagePath)
    continue
  }

  // 分析各 API 调用的覆盖情况
  let covered = 0, missing = 0
  const missingCalls = []
  for (const call of calls) {
    const cleanCall = call.startsWith('/') ? call : '/' + call
    // 检查 mock
    const hasMock = hasKnownMock(cleanCall)
    // 检查真实后端
    const hasReal = REAL_ROUTES.has(cleanCall) || NEEDS_REAL.has(
      [...NEEDS_REAL].find(p => cleanCall.startsWith(p)) || ''
    )
    if (hasMock || hasReal) {
      covered++
    } else {
      missing++
      missingCalls.push(cleanCall)
    }
  }

  if (missing === 0) {
    pagesByCoverage.covered.push({ page: pagePath, calls: calls.length })
  } else {
    pagesByCoverage.partial.push({ page: pagePath, missing: missingCalls })
  }
}

// 输出报告
console.log('=== 页面覆盖概况 ===')
console.log(`✅ 完全覆盖: ${pagesByCoverage.covered.length} 页`)
console.log(`⚠️  部分覆盖: ${pagesByCoverage.partial.length} 页`)
console.log(`📭 无 API 调用: ${pagesByCoverage.noapi.length} 页（工具/游戏页面）`)
console.log(`\n=== 完全覆盖的页面 ===`)
for (const p of pagesByCoverage.covered) {
  console.log(`  ✅ ${p.page} (${p.calls} 个 API)`)
}

console.log(`\n=== 存在风险的页面 ===`)
for (const p of pagesByCoverage.partial) {
  console.log(`  ⚠️  ${p.page}`)
  for (const m of p.missing) console.log(`     缺失: ${m}`)
}

console.log(`\n=== 无 API 调用的页面（无需关注）===`)
console.log(`  ${pagesByCoverage.noapi.join('\n  ')}`)
