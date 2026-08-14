/**
 * 诊断：POST /todos → GET /todos/:id 404 问题根因。
 */
import { req, log } from './lib.mjs'

const HEAD = { username: 'ht_T1_01_01', password: 'Teacher123' }

async function main() {
  let r = await req('POST', '/auth/unified-login', { body: HEAD })
  const token = r.data?.token
  if (!token) throw new Error('登录失败')
  log('=== 诊断 todos ===')
  r = await req('POST', '/todos', { token, body: { title: 'FT待办', done: false } })
  log(`POST /todos -> status=${r.status} body=${JSON.stringify(r.data)}`)
  const id = r.data?.id
  if (id) {
    r = await req('GET', `/todos/${id}`, { token })
    log(`GET /todos/${id} -> status=${r.status} body=${JSON.stringify(r.data)}`)
    r = await req('GET', '/todos?take=5', { token })
    log(`GET /todos?take=5 -> status=${r.status} count=${r.data?.items?.length} first=${JSON.stringify((r.data?.items||[])[0])}`)
  }
  log('\n=== 诊断 notes ===')
  r = await req('POST', '/notes', { token, body: { title: 'FT笔记', content: '内容' } })
  log(`POST /notes -> status=${r.status} body=${JSON.stringify(r.data)}`)
  const nid = r.data?.id
  if (nid) {
    r = await req('GET', `/notes/${nid}`, { token })
    log(`GET /notes/${nid} -> status=${r.status} body=${JSON.stringify(r.data)}`)
  }
}

main().catch(e => { console.error('诊断失败:', e); process.exit(1) })
