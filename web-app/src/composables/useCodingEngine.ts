import { reactive, ref, computed, type Ref } from 'vue'

/* =========================================================================
 * 少儿编程 · 共享运行引擎
 * 同时供「教师端编辑器」与「家长端练习编辑器」复用，避免两端逻辑分叉。
 * M1 能力：通用变量作用域、表达式求值器(+−×÷/%/比较/逻辑/随机)、
 *          条件分支 if/else、控制结构 children 递归、单步调试(暂停/单步/慢速/高亮)。
 * M3 能力：自定义函数(定义+调用+局部参数)、列表(name[i]/len/set_list/list_add/for_each)、
 *          多角色(多小乌龟+创建/切换+广播消息)、文字输出(print)。
 * ========================================================================= */

export type Cat = 'event' | 'motion' | 'looks' | 'control' | 'data' | 'operator'

export interface ParamDef {
  key: string
  /** number/expr/varname 统一用文本输入（expr 支持算式，如 random(20,50)） */
  type: 'number' | 'text' | 'expr' | 'varname'
  default: any
  suffix?: string
  placeholder?: string
}

export interface BlockDef {
  cat: Cat
  label: string
  color: string
  params?: ParamDef[]
  container?: boolean
  hasElse?: boolean
  fixed?: boolean
}

export interface Block {
  uid: string
  type: string
  params: Record<string, any>
  body?: Block[]
  elseBody?: Block[]
}

export const GRID = 16
export const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#eab308', '#a855f7', '#f97316']

export const CAT_LABELS: Record<Cat, string> = {
  event: '事件',
  motion: '运动',
  looks: '外观',
  control: '控制',
  data: '数据',
  operator: '运算',
}
export const CAT_ORDER: Cat[] = ['event', 'motion', 'looks', 'control', 'data', 'operator']

export const BLOCK_DEFS: Record<string, BlockDef> = {
  event_flag: { cat: 'event', label: '当 🟢 被点击', color: '#ef4444', fixed: true },
  when_received: { cat: 'event', label: '当收到消息', color: '#ef4444', params: [{ key: 'msg', type: 'text', default: 'go' }], container: true },

  move_forward: { cat: 'motion', label: '上移', color: '#22c55e', params: [{ key: 'steps', type: 'expr', default: 1, suffix: '步' }] },
  move_back: { cat: 'motion', label: '下移', color: '#22c55e', params: [{ key: 'steps', type: 'expr', default: 1, suffix: '步' }] },
  move_left: { cat: 'motion', label: '左移', color: '#22c55e', params: [{ key: 'steps', type: 'expr', default: 1, suffix: '步' }] },
  move_right: { cat: 'motion', label: '右移', color: '#22c55e', params: [{ key: 'steps', type: 'expr', default: 1, suffix: '步' }] },
  turn_left: { cat: 'motion', label: '左转', color: '#22c55e', params: [{ key: 'deg', type: 'expr', default: 90, suffix: '°' }] },
  turn_right: { cat: 'motion', label: '右转', color: '#22c55e', params: [{ key: 'deg', type: 'expr', default: 90, suffix: '°' }] },
  create_turtle: { cat: 'motion', label: '新建小乌龟', color: '#22c55e' },
  switch_turtle: { cat: 'motion', label: '切换小乌龟', color: '#22c55e', params: [{ key: 'index', type: 'expr', default: 1, suffix: '号' }] },

  say: { cat: 'looks', label: '说', color: '#eab308', params: [{ key: 'text', type: 'text', default: '你好！' }] },
  change_color: { cat: 'looks', label: '换颜色', color: '#eab308' },
  print: { cat: 'looks', label: '打印', color: '#eab308', params: [{ key: 'text', type: 'text', default: '结果' }] },
  set_pen_color: { cat: 'looks', label: '画笔颜色', color: '#eab308', params: [{ key: 'color', type: 'varname', default: '#ef4444', placeholder: '十六进制颜色' }] },
  set_pen_width: { cat: 'looks', label: '画笔粗细', color: '#eab308', params: [{ key: 'w', type: 'expr', default: 3, suffix: 'px' }] },
  play_note: { cat: 'looks', label: '演奏音符', color: '#eab308', params: [{ key: 'note', type: 'expr', default: 60, suffix: '音高' }] },
  ai_recognize: { cat: 'looks', label: 'AI 识别图形', color: '#eab308' },

  repeat: { cat: 'control', label: '重复', color: '#a855f7', params: [{ key: 'count', type: 'expr', default: 4, suffix: '次' }], container: true },
  wait: { cat: 'control', label: '等待', color: '#a855f7', params: [{ key: 'sec', type: 'expr', default: 0.3, suffix: '秒' }] },
  if: { cat: 'control', label: '如果', color: '#a855f7', params: [{ key: 'cond', type: 'expr', default: 'x > 5', placeholder: '条件，如 x > 5' }], container: true, hasElse: true },
  broadcast: { cat: 'control', label: '广播消息', color: '#a855f7', params: [{ key: 'msg', type: 'text', default: 'go' }] },

  set_var: { cat: 'data', label: '设置变量', color: '#3b82f6', params: [{ key: 'name', type: 'varname', default: 'score' }, { key: 'value', type: 'expr', default: 0 }] },
  change_var: { cat: 'data', label: '变量', color: '#3b82f6', params: [{ key: 'name', type: 'varname', default: 'score' }, { key: 'delta', type: 'expr', default: 1 }] },
  set_list: { cat: 'data', label: '新建列表', color: '#3b82f6', params: [{ key: 'name', type: 'varname', default: 'nums' }, { key: 'values', type: 'text', default: '1,2,3', placeholder: '元素，逗号分隔' }] },
  list_add: { cat: 'data', label: '列表加入', color: '#3b82f6', params: [{ key: 'name', type: 'varname', default: 'nums' }, { key: 'value', type: 'expr', default: 0 }] },
  for_each: { cat: 'data', label: '遍历列表', color: '#3b82f6', params: [{ key: 'item', type: 'varname', default: 'i' }, { key: 'list', type: 'varname', default: 'nums' }], container: true },
  define_fn: { cat: 'data', label: '定义函数', color: '#3b82f6', params: [{ key: 'name', type: 'varname', default: 'drawSquare' }, { key: 'params', type: 'text', default: '', placeholder: '参数名，逗号分隔' }], container: true },
  call_fn: { cat: 'data', label: '调用函数', color: '#3b82f6', params: [{ key: 'name', type: 'varname', default: 'drawSquare' }, { key: 'args', type: 'text', default: '', placeholder: '参数值，逗号分隔' }] },
}

export const paletteByCat = computed(() =>
  CAT_ORDER.map((cat) => ({
    cat,
    label: CAT_LABELS[cat],
    items: Object.entries(BLOCK_DEFS)
      .filter(([, d]) => d.cat === cat)
      .map(([type, d]) => ({ type, ...d })),
  })),
)

/* ===================== 积木树工具 ===================== */
export function makeBlock(type: string): Block {
  const d = BLOCK_DEFS[type]
  const params: Record<string, any> = {}
  for (const p of d.params || []) params[p.key] = p.default
  const b: Block = { uid: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, params }
  if (d.container) b.body = []
  if (d.hasElse) b.elseBody = []
  return b
}
export function findBlock(list: Block[], uid: string): Block | null {
  for (const b of list) {
    if (b.uid === uid) return b
    if (b.body) { const f = findBlock(b.body, uid); if (f) return f }
    if (b.elseBody) { const f = findBlock(b.elseBody, uid); if (f) return f }
  }
  return null
}
export function removeBlock(list: Block[], uid: string): boolean {
  const i = list.findIndex((b) => b.uid === uid)
  if (i >= 0) { list.splice(i, 1); return true }
  for (const b of list) {
    if (b.body && removeBlock(b.body, uid)) return true
    if (b.elseBody && removeBlock(b.elseBody, uid)) return true
  }
  return false
}
export function extractBlock(uid: string, root: Ref<Block[]>): Block | null {
  let found: Block | null = null
  const walk = (list: Block[]) => {
    const i = list.findIndex((b) => b.uid === uid)
    if (i >= 0) { found = list[i]; list.splice(i, 1); return true }
    for (const b of list) {
      if (b.body && walk(b.body)) return true
      if (b.elseBody && walk(b.elseBody)) return true
    }
    return false
  }
  walk(root.value)
  return found
}
export function countBlocks(list: Block[]): number {
  let n = 0
  for (const b of list) { n++; if (b.body) n += countBlocks(b.body); if (b.elseBody) n += countBlocks(b.elseBody) }
  return n
}

/* ===================== 形状识别（AI 启蒙：纯几何启发式，无外部依赖） ===================== */
export function recognizeShape(trail: { x: number; y: number }[]): string {
  if (!trail || trail.length < 4) return '线条'
  const pts = trail
  const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 2
  // 累计转角，统计明显拐角数
  let corners = 0
  let totalTurn = 0
  for (let i = 2; i < pts.length; i++) {
    const a = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x)
    const b = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x)
    let d = ((b - a) * 180) / Math.PI
    while (d > 180) d -= 360
    while (d < -180) d += 360
    totalTurn += d
    if (Math.abs(d) > 35) corners++
  }
  if (!closed) return corners <= 1 ? '线条' : '折线'
  if (Math.abs(Math.abs(totalTurn) - 360) < 60) {
    if (corners <= 1) return '圆形'
    if (corners <= 3) return '三角形'
    if (corners <= 5) return '正方形/长方形'
    if (corners <= 7) return '五边形'
    if (corners <= 11) return '星形'
    return '多边形'
  }
  return '多边形'
}

/* ===================== 示例模板（引导教程） ===================== */
export interface PresetTemplate { name: string; blocks: () => Block[] }
export const PRESETS: PresetTemplate[] = [
  {
    name: '正方形',
    blocks: () => {
      const body = [makeBlock('move_forward'), makeBlock('turn_right'), makeBlock('move_forward'), makeBlock('turn_right'), makeBlock('move_forward'), makeBlock('turn_right'), makeBlock('move_forward'), makeBlock('turn_right')]
      const r = makeBlock('repeat'); r.params.count = 4; r.body = body
      return [r]
    },
  },
  {
    name: '五角星',
    blocks: () => {
      const body = [makeBlock('move_forward'), makeBlock('turn_right')]
      body[1].params.deg = 144
      const r = makeBlock('repeat'); r.params.count = 5; r.body = body
      return [r]
    },
  },
  {
    name: '彩色螺旋',
    blocks: () => {
      const setc = makeBlock('set_pen_color')
      const r = makeBlock('repeat'); r.params.count = 12
      r.body = [setc, makeBlock('move_forward'), makeBlock('turn_right'), makeBlock('change_color')]
      return [r]
    },
  },
]

/* ===================== 表达式求值器 ===================== */

type Scope = Record<string, number>
const FN: Record<string, (a: number[]) => number> = {
  random: (a) => (a.length >= 2 ? Math.floor(Math.random() * (a[1] - a[0] + 1)) + a[0] : a.length ? Math.floor(Math.random() * (a[0] + 1)) : 0),
  abs: (a) => Math.abs(a[0] || 0),
  floor: (a) => Math.floor(a[0] || 0),
  ceil: (a) => Math.ceil(a[0] || 0),
  round: (a) => Math.round(a[0] || 0),
  sqrt: (a) => Math.sqrt(a[0] || 0),
  min: (a) => (a.length ? Math.min(...a) : 0),
  max: (a) => (a.length ? Math.max(...a) : 0),
  mod: (a) => ((a[0] || 0) % (a[1] || 1) + (a[1] || 1)) % (a[1] || 1),
  pow: (a) => Math.pow(a[0] || 0, a[1] || 0),
  sin: (a) => Math.sin(((a[0] || 0) * Math.PI) / 180),
  cos: (a) => Math.cos(((a[0] || 0) * Math.PI) / 180),
}
function tokenize(s: string): string[] {
  const out: string[] = []
  let i = 0
  const isD = (c: string) => c >= '0' && c <= '9'
  const isA = (c: string) => /[a-zA-Z_]/.test(c)
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if (isD(c) || (c === '.' && isD(s[i + 1]))) { let j = i + 1; while (j < s.length && (isD(s[j]) || s[j] === '.')) j++; out.push(s.slice(i, j)); i = j; continue }
    if (isA(c)) { let j = i + 1; while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++; out.push(s.slice(i, j)); i = j; continue }
    const two = s.slice(i, i + 2)
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) { out.push(two); i += 2; continue }
    if ('+-*/%()><![],'.includes(c)) { out.push(c); i++; continue }
    i++
  }
  return out
}
function parseExpr(tokens: string[], scope: Scope, varsRef?: Record<string, number>, listsRef?: Record<string, number[]>): number | boolean {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const toNum = (v: any) => (typeof v === 'number' ? v : v ? 1 : 0)
  const toBool = (v: any) => (typeof v === 'boolean' ? v : !!toNum(v))
  const lookup = (name: string) => (scope && Object.prototype.hasOwnProperty.call(scope, name)) ? scope[name] : (varsRef?.[name] ?? 0)
  function parseOr(): any { let v = parseAnd(); while (peek() === '||') { next(); v = toBool(v) || toBool(parseAnd()) } return v }
  function parseAnd(): any { let v = parseCmp(); while (peek() === '&&') { next(); v = toBool(v) && toBool(parseCmp()) } return v }
  function parseCmp(): any {
    let v = parseAdd()
    while (['>', '<', '>=', '<=', '==', '!='].includes(peek())) {
      const op = next(); const r = parseAdd(); const x = toNum(v), y = toNum(r)
      v = op === '>' ? x > y : op === '<' ? x < y : op === '>=' ? x >= y : op === '<=' ? x <= y : op === '==' ? x === y : x !== y
    }
    return v
  }
  function parseAdd(): any { let v = parseMul(); while (peek() === '+' || peek() === '-') { const op = next(); const r = parseMul(); v = op === '+' ? toNum(v) + toNum(r) : toNum(v) - toNum(r) } return v }
  function parseMul(): any {
    let v = parseUnary()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next(); const r = parseUnary()
      if (op === '*') v = toNum(v) * toNum(r)
      else if (op === '/') v = toNum(v) / toNum(r)
      else v = ((toNum(v) % toNum(r)) + toNum(r)) % toNum(r)
    }
    return v
  }
  function parseUnary(): any { if (peek() === '!') { next(); return !toBool(parseUnary()) } if (peek() === '-') { next(); return -toNum(parseUnary()) } return parsePrimary() }
  function parsePrimary(): any {
    const t = peek()
    if (t === '(') { next(); const v = parseOr(); if (peek() === ')') next(); return v }
    if (/^\d/.test(t)) return Number(next())
    if (/^[a-zA-Z_]/.test(t)) {
      const name = next()
      if (peek() === '(') {
        next(); const args: number[] = []
        if (peek() !== ')') { args.push(toNum(parseOr())); while (peek() === ',') { next(); args.push(toNum(parseOr())) } }
        if (peek() === ')') next()
        return FN[name] ? FN[name](args) : 0
      }
      if (name === 'len' && peek() === '(') {
        next()
        const lstName = peek()
        if (/^[a-zA-Z_]/.test(lstName)) next()
        if (peek() === ')') next()
        return (listsRef?.[lstName] || []).length
      }
      if (peek() === '[') {
        next(); const idx = toNum(parseOr()); if (peek() === ']') next()
        return (listsRef?.[name] || [])[idx] ?? 0
      }
      return lookup(name)
    }
    next(); return 0
  }
  return parseOr()
}
export function evalExpr(input: any, scope: Scope = {}, varsRef?: Record<string, number>, listsRef?: Record<string, number[]>): number | boolean {
  if (typeof input === 'number') return input
  if (input == null || input === '') return 0
  try { return parseExpr(tokenize(String(input)), scope, varsRef, listsRef) } catch { return 0 }
}

/* ===================== 运行引擎（舞台 + 调试） ===================== */
export interface TurtleState {
  x: number
  y: number
  dir: number
  color: string
  penColor: string
  penWidth: number
  trail: { x: number; y: number }[]
  speech: string
}

export function useCodingEngine(canvasRef: Ref<HTMLCanvasElement | null>) {
  const turtles = reactive<TurtleState[]>([{ x: 8, y: 13, dir: 0, color: COLORS[0], penColor: '#22c55e', penWidth: 3, trail: [{ x: 8, y: 13 }], speech: '' }])
  const activeTurtle = ref(0)
  const vars = reactive<Record<string, number>>({})
  const lists = reactive<Record<string, number[]>>({})
  const output = ref<string[]>([])
  const logs = ref<string[]>([])

  /* 调试状态 */
  const running = ref(false)
  const mode = ref<'auto' | 'step'>('auto')
  const speed = ref(350)
  const paused = ref(false)
  const currentUid = ref<string | null>(null)
  const MAX_STEPS = 5000
  let stepCount = 0
  let pending: (() => void) | null = null
  let stopFlag = false
  let functions: Record<string, { params: string[]; body: Block[] }> = {}
  let handlers: Record<string, Block[]> = {}

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const clampPos = (v: number) => Math.max(0, Math.min(GRID - 1, v))
  const T = () => turtles[activeTurtle.value]
  const numExpr = (v: any) => Number(evalExpr(v, vars, vars, lists)) || 0
  const boolExpr = (v: any) => !!evalExpr(v, vars, vars, lists)
  const varSummary = computed(() => {
    const parts = Object.keys(vars).map((k) => `${k}=${vars[k]}`)
    return parts.length ? parts.join('  ') : '（无变量）'
  })

  function log(msg: string) { logs.value = [...logs.value, msg] }
  function pushTrail() { const t = T(); t.trail = [...t.trail, { x: t.x, y: t.y }] }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }
  function drawStage() {
    const cv = canvasRef.value
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const W = cv.width, H = cv.height, cell = W / GRID
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#f0e6d2'; ctx.lineWidth = 1
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke()
    }
    for (const t of turtles) {
      if (t.trail.length > 1) {
        ctx.strokeStyle = t.penColor; ctx.lineWidth = t.penWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.beginPath()
        t.trail.forEach((p, i) => { const x = (p.x + 0.5) * cell, y = (p.y + 0.5) * cell; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
        ctx.stroke()
      }
    }
    turtles.forEach((t, idx) => {
      const cx = (t.x + 0.5) * cell, cy = (t.y + 0.5) * cell, r = cell * 0.34
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((t.dir * Math.PI) / 180)
      ctx.fillStyle = t.color
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, r * 0.7); ctx.lineTo(-r * 0.8, r * 0.7); ctx.closePath(); ctx.fill()
      ctx.restore()
      if (idx === activeTurtle.value && turtles.length > 1) {
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.stroke()
      }
      if (t.speech) {
        ctx.font = '11px sans-serif'
        const tw = ctx.measureText(t.speech).width + 12
        const bx = Math.min(W - tw - 2, Math.max(2, cx - tw / 2)), by = Math.max(2, cy - r - 24)
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5
        roundRect(ctx, bx, by, tw, 18, 6); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#334155'; ctx.fillText(t.speech, bx + 6, by + 13)
      }
    })
  }
  function resetStage() {
    turtles.splice(0, turtles.length, { x: 8, y: 13, dir: 0, color: COLORS[0], penColor: '#22c55e', penWidth: 3, trail: [{ x: 8, y: 13 }], speech: '' })
    activeTurtle.value = 0
    output.value = []
    for (const k of Object.keys(vars)) delete vars[k]
    for (const k of Object.keys(lists)) delete lists[k]
    drawStage()
  }
  function waitStep(): Promise<void> {
    if (mode.value === 'step') return new Promise((res) => { pending = res })
    return sleep(speed.value).then(() => { if (paused.value) return new Promise<void>((res) => { pending = res }) })
  }
  function stepNext() { const r = pending; pending = null; r && r() }
  function pause() { paused.value = true }
  function resume() { mode.value = 'auto'; paused.value = false; const r = pending; pending = null; r && r() }

  function collectDefs(seq: Block[]) {
    for (const b of seq) {
      if (b.type === 'define_fn') {
        const pnames = String(b.params.params || '').split(',').map((s) => s.trim()).filter(Boolean)
        functions[b.params.name] = { params: pnames, body: b.body || [] }
      } else if (b.type === 'when_received') {
        const msg = String(b.params.msg || '')
        handlers[msg] = handlers[msg] || []
        handlers[msg].push(...(b.body || []))
      }
      if (b.body) collectDefs(b.body)
      if (b.elseBody) collectDefs(b.elseBody)
    }
  }

  async function execSequence(seq: Block[], depth: number) {
    for (const b of seq) {
      if (stopFlag) throw new Error('stopped')
      await execBlock(b, depth)
    }
  }
  async function execBlock(b: Block, depth: number) {
    if (++stepCount > MAX_STEPS) throw new Error('stopped')
    currentUid.value = b.uid
    drawStage()
    await waitStep()
    if (stopFlag) throw new Error('stopped')
    const d = BLOCK_DEFS[b.type]
    const p = b.params
    switch (b.type) {
      case 'move_forward': T().y = clampPos(T().y - numExpr(p.steps)); pushTrail(); break
      case 'move_back': T().y = clampPos(T().y + numExpr(p.steps)); pushTrail(); break
      case 'move_left': T().x = clampPos(T().x - numExpr(p.steps)); pushTrail(); break
      case 'move_right': T().x = clampPos(T().x + numExpr(p.steps)); pushTrail(); break
      case 'turn_left': T().dir = (T().dir - numExpr(p.deg) + 360) % 360; break
      case 'turn_right': T().dir = (T().dir + numExpr(p.deg)) % 360; break
      case 'create_turtle':
        turtles.push({ x: 8, y: 13, dir: 0, color: COLORS[turtles.length % COLORS.length], penColor: COLORS[turtles.length % COLORS.length], penWidth: 3, trail: [{ x: 8, y: 13 }], speech: '' })
        activeTurtle.value = turtles.length - 1
        break
      case 'switch_turtle': activeTurtle.value = Math.max(0, Math.min(turtles.length - 1, numExpr(p.index)))
        break
      case 'say': T().speech = String(p.text ?? ''); log('💬 ' + T().speech); break
      case 'change_color': T().color = COLORS[(COLORS.indexOf(T().color) + 1) % COLORS.length]; break
      case 'print': { const s = String(p.text ?? ''); output.value = [...output.value, s]; log('🖨 ' + s); break }
      case 'set_pen_color': T().penColor = String(p.color || '#22c55e'); break
      case 'set_pen_width': T().penWidth = Math.max(1, Math.min(12, numExpr(p.w))); break
      case 'play_note': {
        const n = numExpr(p.note)
        const freq = 440 * Math.pow(2, (n - 69) / 12)
        try {
          const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
          if (AC) {
            const ac = new AC()
            const osc = ac.createOscillator(); const gain = ac.createGain()
            osc.frequency.value = freq; osc.type = 'triangle'
            gain.gain.setValueAtTime(0.18, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3)
            osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.3)
            setTimeout(() => ac.close(), 400)
          }
          log('🎵 音高 ' + n + ' (' + Math.round(freq) + 'Hz)')
        } catch { /* 浏览器不支持音频时静默 */ }
        break
      }
      case 'ai_recognize': {
        const guess = recognizeShape(T().trail)
        output.value = [...output.value, 'AI：我猜你画的是「' + guess + '」']
        log('🤖 AI 识别：' + guess)
        break
      }
      case 'repeat':
        for (let i = 0; i < numExpr(p.count); i++) { if (stopFlag) throw new Error('stopped'); await execSequence(b.body || [], depth + 1) }
        return
      case 'wait': await sleep(numExpr(p.sec) * 1000); break
      case 'if': await execSequence(boolExpr(p.cond) ? (b.body || []) : [], depth + 1); return
      case 'broadcast': {
        const msg = String(p.msg || '')
        if (handlers[msg]) for (const hb of handlers[msg]) { if (stopFlag) throw new Error('stopped'); await execBlock(hb, depth + 1) }
        break
      }
      case 'set_var': vars[p.name] = numExpr(p.value); log('📊 ' + p.name + ' = ' + vars[p.name]); break
      case 'change_var': vars[p.name] = (vars[p.name] || 0) + numExpr(p.delta); log('📊 ' + p.name + ' = ' + vars[p.name]); break
      case 'set_list': {
        lists[p.name] = String(p.values || '').split(',').map((s) => numExpr(s.trim())).filter((_, i, a) => a.length > 0)
        log('📚 列表 ' + p.name + ' = [' + lists[p.name].join(', ') + ']')
        break
      }
      case 'list_add': {
        if (!lists[p.name]) lists[p.name] = []
        const v = numExpr(p.value)
        lists[p.name] = [...lists[p.name], v]
        log('📚 ' + p.name + ' 加入 ' + v)
        break
      }
      case 'for_each': {
        const arr = lists[p.list] || []
        const item = p.item
        const saved = Object.prototype.hasOwnProperty.call(vars, item) ? vars[item] : undefined
        for (const v of arr) {
          if (stopFlag) throw new Error('stopped')
          vars[item] = v
          await execSequence(b.body || [], depth + 1)
        }
        if (saved !== undefined) vars[item] = saved; else delete vars[item]
        return
      }
      case 'define_fn':
      case 'when_received':
        return
      case 'call_fn': {
        const fn = functions[p.name]
        if (!fn) { log('⚠️ 未定义函数: ' + (p.name || '')); break }
        const argVals = String(p.args || '').split(',').map((s) => numExpr(s.trim()))
        const saved: Record<string, number> = {}
        fn.params.forEach((pn, i) => { if (Object.prototype.hasOwnProperty.call(vars, pn)) saved[pn] = vars[pn]; vars[pn] = argVals[i] || 0 })
        try { await execSequence(fn.body, depth + 1) }
        finally { fn.params.forEach((pn) => { if (Object.prototype.hasOwnProperty.call(saved, pn)) vars[pn] = saved[pn]; else delete vars[pn] }) }
        return
      }
    }
    drawStage()
  }

  async function run(target: Block[]) {
    if (running.value) return
    stepCount = 0; stopFlag = false
    functions = {}; handlers = {}
    collectDefs(target)
    resetStage()
    running.value = true; paused.value = false
    logs.value = []
    log('▶ 开始运行')
    try {
      await execSequence(target, 0)
      log('✅ 运行结束')
    } catch {
      log('⏹ 已停止')
    } finally {
      running.value = false; currentUid.value = null; drawStage()
    }
  }
  function stop() { stopFlag = true }

  return {
    turtles, activeTurtle, vars, lists, output, logs,
    running, mode, speed, paused, currentUid, varSummary,
    drawStage, resetStage, run, stop, pause, resume, stepNext,
    setMode: (m: 'auto' | 'step') => { mode.value = m }, setSpeed: (n: number) => { speed.value = n },
  }
}
