#!/usr/bin/env node
/**
 * 修复造数学生学号（QA 前缀 → 纯数字）并开通家长登录（教师路径，规避 D1 云端未生效）
 * 目标：10 校每班 001/002 学生改纯数字学号 + 开通家长登录（口令 123456）
 * 学号映射：QA011001 → 11001（校序号+班级号+序号），保持纯数字且可反查
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

/** 登录节流：unified-login 10/min/IP → 7.5s/次（带 token 缓存） */
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

/** 校管登录（school-admin/login，不占 unified 限速） */
async function saLogin(u, p) {
  const r = await call('POST', '/school-admin/login', { body: { username: u, password: p } })
  if (!r.data?.token) throw new Error(`校管登录失败 ${u}: ${r.status} ${r.data?.message || ''}`)
  return r.data.token
}

/** 从旧学号 QA<校号2位><班号1位><序3位> 生成纯数字学号：<校号2位><班号1位><序3位> */
function toNumericNo(oldNo) {
  const m = String(oldNo || '').match(/^QA(\d{2})(\d)(\d{3})$/)
  if (!m) return null
  return `${m[1]}${m[2]}${m[3]}` // e.g. QA011001 → 011001
}

async function main() {
  console.log('=== 修复学号 + 开通家长登录 ===')
  const prefixes = ['qa', 'qb', 'qc', 'qd', 'qe', 'qf', 'qg', 'qh', 'qi', 'qj']
  let fixed = 0, enabled = 0

  for (const pre of prefixes) {
    const saToken = await saLogin(`qa_sa_${pre}`, 'Qa@2026')
    const sr = await call('GET', '/school-admin/students', { token: saToken })
    const list = Array.isArray(sr.data) ? sr.data : sr.data.items || []
    // 每班 001/002（已开通的跳过，只需改学号）
    const targets = list.filter((s) => /^QA/.test(s.studentNo || '') && /(001|002)$/.test(s.studentNo))
    console.log(`校${pre}: 待处理 ${targets.length} 名学生`)

    // 按班级分组：每班取 001/002（key = 校号2位+班号1位）
    const byClass = {}
    for (const st of targets) {
      const no = st.studentNo
      const m = no.match(/^QA(\d{2})(\d)/)
      const clsKey = m ? m[1] + m[2] : no
      ;(byClass[clsKey] ||= []).push(st)
    }
    for (const clsKey of Object.keys(byClass)) {
      const sts = byClass[clsKey].slice(0, 2) // 每班 2 名
      for (const st of sts) {
        const newNo = toNumericNo(st.studentNo)
        if (!newNo) continue
        // 改学号（D2 已生效）
        const ur = await call('PATCH', `/school-admin/students/${st.id}`, { body: { studentNo: newNo }, token: saToken })
        if (ur.status < 300) {
          fixed++
          console.log(`  ✅ ${st.studentNo} → ${newNo}`)
        } else {
          console.log(`  ⚠ 改学号 ${st.studentNo} 失败: ${ur.data?.message || ur.status}`)
        }
        // 开通家长登录：优先教师路径（班主任），校管路径 D1 云端未生效
        if (!st.parentLoginEnabled) {
          try {
            // 班主任命名：qa_<校>_ht_<班号>（班号 = 学号第 4 位，如 QA011001 → 校01 班1）
            const m = String(st.studentNo || '').match(/^QA(\d{2})(\d)/)
            const htUser = `qa_${pre}_ht_${m ? m[2] : '1'}`
            const htToken = await throttledLogin(htUser, 'Qa@2026')
            const tr = await call('POST', `/students/${st.id}/toggle-parent-login`, { body: {}, token: htToken })
            if (tr.status < 300) { enabled++; console.log(`  ✅ ${newNo} 家长登录已开通`) }
            else console.log(`  ⚠ ${newNo} 开通失败: ${tr.data?.message || tr.status}`)
          } catch (e) {
            console.log(`  ⚠ ${newNo} 开通异常: ${e.message}`)
          }
        } else {
          enabled++
        }
      }
    }
    await delay(1000)
  }
  console.log(`\n=== 完成：改学号 ${fixed} 名 / 家长登录 ${enabled} 名 ===`)
}
main().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1) })
