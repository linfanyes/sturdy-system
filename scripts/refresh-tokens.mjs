#!/usr/bin/env node
/**
 * 刷新五角色 token 并原地写回 mini-test-tokens.json。
 *
 * 背景：mini-api-test.mjs 直接读取 mini-test-tokens.json 里的静态 token，
 * 而后端 JWT 有效期约 30 天。若测试套件被定时任务或人工间隔较久才跑，
 * 旧 token 会失效导致 API 套件整片 401。本脚本用已落库的测试账号凭证重新登录，
 * 原地更新 token 字段，保持文件其它结构（entities / notes / suffix）不变，
 * 使 API 套件与后续冒烟可无限期重复执行，无需重新开通账号。
 *
 * 自愈：校管账号 qa_sa_* 若因关联学校被重置而登录失败（400 DB_ERROR），
 * 会用 ensureSchoolAdmin 新建一个临时校管并写回，避免单点脏数据卡死整轮。
 * 新建/复用的校管凭证同时写入 scripts/mini-sa.env，供冒烟脚本以 SMOKE_SA_USER/PASS
 * 复用，避免每次重复新建造成脏数据堆积。
 *
 * 用法: node scripts/refresh-tokens.mjs
 * 环境变量: REFRESH_API_BASE 可覆盖后端地址（默认与 mini-api-test.mjs 一致）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { ensureSchoolAdmin } from '../e2e/lib/provision.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.REFRESH_API_BASE ||
  'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api').replace(/\/$/, '')

const cfgPath = path.join(__dirname, 'mini-test-tokens.json')
const envPath = path.join(__dirname, 'mini-sa.env')
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))

async function callApi(method, p, { body, token } = {}) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data }
}

/** 取 token：兼容 {token} 与 {data:{token}} 两种返回形态 */
function extractToken(r) {
  if (r.data?.token) return r.data.token
  if (r.data?.data?.token) return r.data.data.token
  if (typeof r.data === 'string') return r.data
  return null
}

async function main() {
  const updated = { ...cfg }
  updated.roles = { ...cfg.roles }

  // 1) 超级管理员：/admin/login
  {
    const r = await callApi('POST', '/admin/login', {
      body: { username: cfg.roles.super.username, password: cfg.roles.super.password },
    })
    const t = extractToken(r)
    if (!t) throw new Error(`super 登录失败 status=${r.status} body=${JSON.stringify(r.data).slice(0, 200)}`)
    updated.roles.super = { ...cfg.roles.super, token: t }
    console.log(`[refresh-tokens] super   OK (${r.status})`)
  }

  // 2) 校管：优先复用已存账号；登录失败则自愈合新建，并落盘供冒烟复用
  let saUser = cfg.roles.school_admin.username
  let saPass = cfg.roles.school_admin.password
  {
    const r = await callApi('POST', '/auth/unified-login', {
      body: { username: saUser, password: saPass },
    })
    let t = extractToken(r)
    if (!t) {
      console.log('[refresh-tokens] 校管已存账号登录失败，自愈合新建临时校管...')
      const sa = await ensureSchoolAdmin(BASE, {
        superUser: cfg.roles.super.username,
        superPass: cfg.roles.super.password,
        preferUser: '',
        preferPass: '',
      })
      const r2 = await callApi('POST', '/auth/unified-login', {
        body: { username: sa.user, password: sa.pass },
      })
      t = extractToken(r2)
      if (!t) throw new Error(`校管自愈合后仍登录失败: ${JSON.stringify(r2.data).slice(0, 200)}`)
      saUser = sa.user
      saPass = sa.pass
      updated.roles.school_admin = { username: sa.user, password: sa.pass, token: t }
      console.log(`[refresh-tokens] school_admin          SELF-HEALED (${r2.status}) user=${sa.user}`)
    } else {
      updated.roles.school_admin = { ...cfg.roles.school_admin, token: t }
      console.log(`[refresh-tokens] school_admin          OK (${r.status})`)
    }
  }

  // 3) 教师：统一登录 /auth/unified-login
  const teacherKeys = Object.keys(cfg.roles).filter((k) => k.startsWith('teacher_qa_'))
  for (const key of teacherKeys) {
    const role = cfg.roles[key]
    const r = await callApi('POST', '/auth/unified-login', {
      body: { username: role.username, password: role.password },
    })
    const t = extractToken(r)
    if (!t) {
      console.warn(`[refresh-tokens] ⚠ ${key} 登录失败 status=${r.status}，保留旧 token`)
      continue
    }
    updated.roles[key] = { ...role, token: t }
    console.log(`[refresh-tokens] ${key.padEnd(28)} OK (${r.status})`)
  }

  // 4) 家长：/parent-auth/login（学号 + 密码）
  if (cfg.roles.parent?.studentNo) {
    const r = await callApi('POST', '/parent-auth/login', {
      body: { studentNo: cfg.roles.parent.studentNo, password: cfg.roles.parent.password || '123456' },
    })
    const t = extractToken(r)
    if (!t) {
      console.warn(`[refresh-tokens] ⚠ parent 登录失败 status=${r.status}，保留旧 token`)
    } else {
      updated.roles.parent = { ...cfg.roles.parent, token: t }
      console.log(`[refresh-tokens] parent                OK (${r.status})`)
    }
  }

  writeFileSync(cfgPath, JSON.stringify(updated, null, 2) + '\n', 'utf8')
  // 校管凭证侧车：供冒烟脚本以 SMOKE_SA_USER/PASS 复用，避免每次新建脏数据
  writeFileSync(envPath, `SMOKE_SA_USER=${saUser}\nSMOKE_SA_PASS=${saPass}\n`, 'utf8')
  console.log(`[refresh-tokens] 已写回 ${cfgPath}`)
  console.log(`[refresh-tokens] 校管凭证已写 ${envPath}`)
}

main().catch((e) => {
  console.error('[refresh-tokens] 失败:', e.message)
  process.exit(1)
})
