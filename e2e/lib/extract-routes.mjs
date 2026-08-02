// 从 web-app 路由源码里自动抽取全量路由表
//
// 为什么不手写路由清单：手写清单会随着新页面上线迅速过期，
// 冒烟"全绿"却漏测了新页面是最危险的假阳性。这里直接解析 router/index.ts，
// 新增路由自动纳入覆盖，无需改测试代码。
import fs from 'node:fs'

/** 去掉行注释与块注释，避免注释里的 path: 被误抓 */
function stripComments(src) {
  let out = ''
  let i = 0
  let mode = 'code' // code | line | block | str
  let quote = ''
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue }
      if (c === '"' || c === "'" || c === '`') { mode = 'str'; quote = c; out += c; i++; continue }
      out += c; i++; continue
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c }
      i++; continue
    }
    if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i += 2; continue }
      i++; continue
    }
    // 字符串内原样保留，注意转义
    if (c === '\\') { out += c + (n ?? ''); i += 2; continue }
    if (c === quote) { mode = 'code' }
    out += c; i++
  }
  return out
}

/**
 * 解析路由数组，返回扁平化的 { fullPath, roles } 列表。
 * 依赖 vue-router 的写法约定：对象里有 path，父级用 children 承载子路由。
 */
export function extractWebRoutes(routerFile) {
  const raw = fs.readFileSync(routerFile, 'utf8')
  const src = stripComments(raw)
  // 注意：类型注解 RouteRecordRaw[] 自带一对方括号，必须定位到 "= [" 之后的真正数组开头
  const marker = /routes\s*:\s*RouteRecordRaw\[\]\s*=\s*\[/.exec(src)
  if (!marker) throw new Error('未在路由文件中找到 routes 数组定义')
  const start = marker.index + marker[0].length - 1 // 指向数组的 '['

  // 用括号深度定位每个路由对象，栈里保存"当前所处的父路径"
  const results = []
  const stack = [] // { depth, path, roles }
  let depth = 0
  let i = start
  let inStr = false
  let quote = ''

  // 记录 children 数组开始时的深度，用于判断嵌套归属
  const pendingChildren = []

  while (i < src.length) {
    const c = src[i]
    if (inStr) {
      if (c === '\\') { i += 2; continue }
      if (c === quote) inStr = false
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; quote = c; i++; continue }

    if (c === '{' || c === '[') {
      depth++
      i++
      continue
    }
    if (c === '}' || c === ']') {
      depth--
      // 退出对象时，弹出深度不再有效的父路径
      while (stack.length && stack[stack.length - 1].depth > depth) stack.pop()
      while (pendingChildren.length && pendingChildren[pendingChildren.length - 1] > depth) {
        pendingChildren.pop()
      }
      if (depth <= 0) break
      i++
      continue
    }

    // 匹配 path: 'xxx'
    if (src.startsWith('path:', i)) {
      const m = /^path:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(src.slice(i))
      if (m) {
        const p = m[2]
        // 找到当前对象所属的父路径（栈顶且深度小于当前）
        const parent = stack.filter((s) => s.depth < depth).pop()
        const full = p.startsWith('/')
          ? p
          : `${(parent?.path || '').replace(/\/$/, '')}/${p}`.replace(/\/+/g, '/')
        const entry = { depth, path: full || '/', roles: parent?.roles || null, isGroup: false }
        stack.push(entry)
        results.push(entry)
        i += m[0].length
        continue
      }
    }

    // 匹配 roles: ['xxx'] —— 归属到最近的路由对象
    if (src.startsWith('roles:', i)) {
      const m = /^roles:\s*\[([^\]]*)\]/.exec(src.slice(i))
      if (m) {
        const roles = [...m[1].matchAll(/['"`]([a-z_]+)['"`]/g)].map((x) => x[1])
        const owner = stack.filter((s) => s.depth <= depth).pop()
        if (owner && roles.length) owner.roles = roles
        i += m[0].length
        continue
      }
    }

    // 标记有 children 的对象为分组（分组本身也可能是可访问路由，保留）
    if (src.startsWith('children:', i)) {
      const owner = stack[stack.length - 1]
      if (owner) owner.isGroup = true
      pendingChildren.push(depth)
      i += 'children:'.length
      continue
    }

    i++
  }

  // 归一化：去掉通配/参数路由（冒烟无法构造有效参数），去重
  const seen = new Set()
  const flat = []
  for (const r of results) {
    let p = r.path.replace(/\/+$/, '') || '/'
    if (p.includes(':') || p.includes('*')) continue
    if (seen.has(p)) continue
    seen.add(p)
    flat.push({ path: p, roles: r.roles, isGroup: r.isGroup })
  }
  return flat
}

/** 按角色分组：super / school_admin / teacher */
export function groupRoutesByRole(flat) {
  const byRole = { super: [], school_admin: [], teacher: [] }
  for (const r of flat) {
    if (r.path === '/login' || r.path === '/forbidden' || r.path === '/') continue
    const roles = r.roles || []
    for (const role of roles) {
      if (byRole[role]) byRole[role].push(r.path)
    }
  }
  for (const k of Object.keys(byRole)) byRole[k] = [...new Set(byRole[k])].sort()
  return byRole
}
