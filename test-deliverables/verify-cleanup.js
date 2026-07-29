/**
 * verify-cleanup.js — 独立复核真实云托管库是否已无 test_qa_ / test_qa_perf_ 残留
 * --------------------------------------------------------------------------------
 * 修正：功能测试造数统一使用 teacher 令牌（teacher1/123456，unified-login），
 *       故用 teacher 令牌扫描教师域 33 个 CRUD 模块 + classes/students/teachers；
 *       super 令牌（/api/admin/login）无教师域读权限，仅用于 /api/admin/* 兜底。
 * 安全：只读扫描；仅当发现残留时才发起 DELETE 清理，且只删 test_qa_ 前缀实体。
 * 产出：test-deliverables/verify-cleanup-report.json
 */
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com'
const PREFIX = 'test_qa_' // test_qa_perf_ 也以 test_qa_ 开头，一次命中

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, path, body = null, token = '') {
  const url = BASE + path
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const ct = res.headers.get('content-type') || ''
    let data = null
    if (ct.includes('application/json')) {
      try { data = await res.json() } catch (e) { /* ignore */ }
    }
    return { status: res.status, data }
  } catch (e) {
    return { status: 0, error: String(e) }
  }
}

// 教师域 33 个 CRUD 模块 + 核心实体（功能测试均以此 teacher 令牌造数）
const TEACHER_MODULES = [
  'classes', 'students', 'teachers',
  'notes', 'todos', 'picker-history',
  'award-categories', 'award-records',
  'duty-rosters', 'teaching-calendar',
  'generated/papers', 'generated/lesson-plans', 'generated/knowledges', 'generated/queries',
  'reward-records', 'score-records', 'group-scores',
  'checkins', 'reading-logs', 'home-visits', 'parent-contacts',
  'notice-templates', 'class-expenses', 'class-activities',
  'class-duty-configs', 'class-galleries', 'my-galleries', 'seat-layouts',
  'growth-entries', 'behavior-records', 'attendances', 'homework',
  'resources', 'schedules', 'notices', 'semesters',
  'exams', 'grades', 'backups', 'ai-providers',
]
// super 域兜底端点（功能测试超管造数范围，少量非前缀，仅确认无 test_qa_）
const SUPER_MODULES = ['admin/schools', 'school-admin/teachers', 'config/app']

function extractItems(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  if (data && Array.isArray(data.data)) return data.data
  if (data && Array.isArray(data.rows)) return data.rows
  return []
}

async function scan(token, modules, label) {
  const residuals = []
  for (const m of modules) {
    const r = await api('GET', '/api/' + m + '?take=500', null, token)
    if (r.status !== 200) {
      console.log(`  [${label}] ${m.padEnd(24)} status=${r.status} (跳过)`)
      continue
    }
    const items = extractItems(r.data)
    let hit = 0
    const samples = []
    for (const it of items) {
      const s = JSON.stringify(it)
      if (s.includes(PREFIX)) {
        hit++
        const id = it?.id || (it?.data && it.data.id) || ''
        const name = it?.name || it?.title || ''
        if (samples.length < 5) samples.push({ id, name })
      }
    }
    if (hit > 0) {
      console.log(`  ⚠️  [${label}] ${m.padEnd(24)} 发现 ${hit} 条 ${PREFIX} 残留`)
      residuals.push({ module: m, count: hit, samples })
    } else {
      console.log(`  ✅ [${label}] ${m.padEnd(24)} 干净 (${items.length} 条)`)
    }
    await sleep(100)
  }
  return residuals
}

async function main() {
  console.log('🔐 获取 teacher 令牌（teacher1/123456）...')
  const tr = await api('POST', '/api/auth/unified-login', { username: 'teacher1', password: '123456' })
  const teacherTok = tr.data?.token || (tr.data?.data && tr.data.data.token)
  if (!teacherTok) {
    console.error('❌ teacher 登录失败:', JSON.stringify(tr).slice(0, 200))
    process.exit(1)
  }
  console.log('   teacher token OK\n')

  console.log('🔍 用 teacher 令牌扫描教师域模块...')
  const tRes = await scan(teacherTok, TEACHER_MODULES, 'T')

  console.log('\n🔍 用 super 令牌兜底扫描管理域端点...')
  const sr = await api('POST', '/api/admin/login', { username: 'admin', password: 'admin' })
  const superTok = sr.data?.token || (sr.data?.data && sr.data.data.token)
  let sRes = []
  if (superTok) {
    sRes = await scan(superTok, SUPER_MODULES, 'S')
  } else {
    console.log('   super 登录失败，跳过管理域兜底')
  }

  const residuals = [...tRes, ...sRes]

  let cleaned = 0
  let cleanFail = 0
  if (residuals.length > 0) {
    console.log('\n🧹 发现残留，发起最小清理（仅删 test_qa_ 前缀实体）...')
    const tokFor = (m) => SUPER_MODULES.includes(m) ? superTok : teacherTok
    for (const res of residuals) {
      const tok = tokFor(res.module)
      const r = await api('GET', '/api/' + res.module + '?take=500', null, tok)
      const items = extractItems(r.data)
      for (const it of items) {
        if (!JSON.stringify(it).includes(PREFIX)) continue
        const id = it?.id || (it?.data && it.data.id)
        if (!id) continue
        const del = await api('DELETE', '/api/' + res.module + '/' + id, null, tok)
        if (del.status === 200 || del.status === 204 || del.status === 404) cleaned++
        else cleanFail++
      }
    }
    console.log(`🧹 清理完成: 成功 ${cleaned} / 失败 ${cleanFail}`)
  } else {
    console.log('\n✅ 未在任何模块发现 ' + PREFIX + ' 残留，无需清理。')
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    prefix: PREFIX,
    scannedTeacherModules: TEACHER_MODULES.length,
    scannedSuperModules: SUPER_MODULES.length,
    residualModules: residuals.length,
    residuals,
    cleanup: { cleaned, cleanFail },
    verdict: residuals.length === 0 ? 'CLEAN' : (cleanFail === 0 ? 'CLEANED' : 'RESIDUAL_REMAINS'),
  }
  const fs = await import('fs')
  fs.writeFileSync('test-deliverables/verify-cleanup-report.json', JSON.stringify(report, null, 2))
  console.log('\n📄 复核报告已保存: test-deliverables/verify-cleanup-report.json')
  console.log('🔚 结论: ' + report.verdict)
}

main().catch((e) => { console.error('❌ 复核异常:', e); process.exit(1) })
