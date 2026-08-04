// 测试账号自备：校管角色在部署环境里未必有可用账号，
// 冒烟前用超管接口临时建一个、跑完立刻删掉，保证 CI 可重复执行且不留脏数据。
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function callApi(apiBase, path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { ...JSON_HEADERS, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> HTTP ${res.status}: ${data?.message || text.slice(0, 200)}`)
  }
  return data
}

/** 用统一登录换取 token */
export async function login(apiBase, username, password) {
  const r = await callApi(apiBase, '/auth/unified-login', {
    method: 'POST',
    body: { username, password },
  })
  if (!r?.token) throw new Error(`登录未返回 token: ${JSON.stringify(r).slice(0, 200)}`)
  return r
}

/**
 * 临时校管账号：若目标环境已有可用校管则直接复用，否则用超管接口新建。
 * @returns {{ user, pass, cleanup: () => Promise<void> }}
 */
export async function ensureSchoolAdmin(apiBase, { superUser, superPass, preferUser, preferPass }) {
  // 1) 已有账号可用就别动数据库
  if (preferUser) {
    try {
      await login(apiBase, preferUser, preferPass)
      return { user: preferUser, pass: preferPass, created: false, cleanup: async () => {} }
    } catch {
      /* 落到新建分支 */
    }
  }

  // 2) 用超管身份新建临时账号
  const su = await login(apiBase, superUser, superPass)
  const schools = await callApi(apiBase, '/admin/schools?skip=0&take=10', { token: su.token })
  const list = Array.isArray(schools) ? schools : schools?.items || []
  if (!list.length) throw new Error('平台内没有任何学校，无法创建校管测试账号')

  const suffix = Date.now().toString(36)
  const user = `smoke_sa_${suffix}`
  const pass = 'Smoke@2026'
  const created = await callApi(apiBase, '/admin/school-admins', {
    method: 'POST',
    token: su.token,
    body: { username: user, password: pass, name: '冒烟测试校管', schoolId: list[0].id },
  })

  // 新建账号可能因后端多实例复制延迟，在浏览器跨域链路里短暂 401。
  // 这里用 node 侧先验证账号确实可登录（带重试），尽量让返回的凭据可用。
  let verified = false
  for (let i = 0; i < 8 && !verified; i++) {
    try {
      await login(apiBase, user, pass)
      verified = true
    } catch {
      await new Promise((r) => setTimeout(r, 800))
    }
  }
  if (!verified) console.warn(`[warn] 临时校管 ${user} 创建后自检登录失败，浏览器侧可能仍 401`)

  const id = created?.id
  return {
    user,
    pass,
    created: true,
    schoolName: list[0].name,
    cleanup: async () => {
      if (!id) return
      try {
        await callApi(apiBase, `/admin/school-admins/${id}`, { method: 'DELETE', token: su.token })
      } catch (e) {
        console.warn(`[warn] 临时校管账号清理失败（需手工删除 ${user}）: ${e.message}`)
      }
    },
  }
}

/** 探活：确认后端可达再跑浏览器，避免 160 条路由全红却只是后端没起来 */
export async function waitForBackend(apiBase, { timeoutMs = 60000, intervalMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastErr = ''
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${apiBase}/health`)
      if (res.ok) return true
      lastErr = `HTTP ${res.status}`
    } catch (e) {
      lastErr = e.message
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`后端 ${apiBase} 在 ${timeoutMs}ms 内未就绪: ${lastErr}`)
}
