#!/usr/bin/env node
/**
 * 教师路径批量改学号（QA 前缀 → 纯数字）— 云端校管 DTO 未部署，走教师 UpdateStudentDto（含 studentNo）
 * 目标：10 校 × 6 班 × 2 名学生（001/002）学号改为纯数字，家长登录已开通，改完即可登录
 */
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function call(m, p, { body, token } = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(BASE + p, {
      method: m,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429 && i < 6) { await delay(1500 * Math.pow(2, i)); continue }
    const t = await res.text()
    let d = null
    try { d = t ? JSON.parse(t) : null } catch { d = t }
    return { status: res.status, data: d }
  }
}

let lastLogin = 0
const tokenCache = {}
async function throttledLogin(u, p) {
  if (tokenCache[u]) return tokenCache[u]
  const wait = Math.max(0, lastLogin + 7500 - Date.now())
  if (wait > 0) await delay(wait)
  lastLogin = Date.now()
  const r = await call('POST', '/auth/unified-login', { body: { username: u, password: p } })
  if (!r.data?.token) throw new Error(`登录失败 ${u}: ${r.status} ${r.data?.message || ''}`)
  tokenCache[u] = r.data.token
  return r.data.token
}
async function saLogin(u, p) {
  const r = await call('POST', '/school-admin/login', { body: { username: u, password: p } })
  if (!r.data?.token) throw new Error(`校管登录失败 ${u}: ${r.status}`)
  return r.data.token
}

/** 从 QA 学号解析班级信息 */
function parseQANo(no) {
  const m = String(no || '').match(/^QA(\d{2})(\d)(\d{3})$/)
  if (!m) return null
  return { schoolNo: m[1], classNo: m[2], seq: m[3], numeric: m[1] + m[2] + m[3] }
}

async function main() {
  console.log('=== 教师路径批量改学号（QA→纯数字） ===')
  const prefixes = ['qa', 'qb', 'qc', 'qd', 'qe', 'qf', 'qg', 'qh', 'qi', 'qj']
  let fixed = 0, skip = 0

  for (const pre of prefixes) {
    const saToken = await saLogin(`qa_sa_${pre}`, 'Qa@2026')
    const sr = await call('GET', '/school-admin/students', { token: saToken })
    const list = Array.isArray(sr.data) ? sr.data : sr.data.items || []
    const targets = list.filter((s) => /^QA/.test(s.studentNo || '') && /(001|002)$/.test(s.studentNo))
    console.log(`校${pre}: ${targets.length} 名待改`)

    // 按班级分组，每组用该班班主任改
    const byClass = {}
    for (const st of targets) {
      const info = parseQANo(st.studentNo)
      if (!info) continue
      const key = info.schoolNo + info.classNo
      ;(byClass[key] ||= []).push(st)
    }
    for (const key of Object.keys(byClass)) {
      const classNo = key.slice(-1)
      const htUser = `qa_${pre}_ht_${classNo}`
      let htToken
      try {
        htToken = await throttledLogin(htUser, 'Qa@2026')
      } catch (e) {
        console.log(`  ⚠ 班主任 ${htUser} 登录失败: ${e.message}`)
        continue
      }
      for (const st of byClass[key]) {
        const info = parseQANo(st.studentNo)
        if (!info || st.studentNo === info.numeric) { skip++; continue }
        const ur = await call('PATCH', `/students/${st.id}`, { body: { studentNo: info.numeric }, token: htToken })
        if (ur.status < 300) {
          fixed++
          console.log(`  ✅ ${st.studentNo} → ${info.numeric}（${htUser}）`)
        } else {
          console.log(`  ⚠ ${st.studentNo} 失败: ${ur.data?.message || ur.status}`)
        }
        await delay(200)
      }
    }
  }

  // 验证抽样：校qa 011001 家长登录
  const p = await call('POST', '/parent-auth/login', { body: { studentNo: '011001', password: '123456' } })
  console.log(`\n=== 完成：改学号 ${fixed} / 跳过 ${skip} ===`)
  console.log('家长 011001 登录:', p.status, p.data?.token ? '✅ 成功' : (p.data?.message || ''))
}
main().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1) })
