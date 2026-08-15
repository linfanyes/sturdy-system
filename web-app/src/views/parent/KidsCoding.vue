<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { toast } from '@/utils/feedback'
import {
  listParentCodingProjects,
  getParentCodingProject,
  listMyPracticeProjects,
  createPracticeProject,
  updatePracticeProject,
  removePracticeProject,
  type CodingProject,
} from '@/api/kidsCoding'
import BlockNode from '@/components/BlockNode.vue'
import BlockView from '@/components/BlockView.vue'

/* ============ 积木定义（与教师端一致） ============ */
interface BlockDef {
  cat: 'event' | 'motion' | 'looks' | 'control' | 'data'
  label: string
  color: string
  param?: { key: string; type: 'number' | 'text'; default: any; suffix?: string }
  container?: boolean
}
const CAT_LABELS: Record<BlockDef['cat'], string> = {
  event: '事件',
  motion: '运动',
  looks: '外观',
  control: '控制',
  data: '数据',
}
const CAT_ORDER: BlockDef['cat'][] = ['event', 'motion', 'looks', 'control', 'data']
const BLOCK_DEFS: Record<string, BlockDef> = {
  event_flag: { cat: 'event', label: '当 🟢 被点击', color: '#ef4444', container: false },
  move_forward: { cat: 'motion', label: '上移', color: '#22c55e', param: { key: 'steps', type: 'number', default: 1, suffix: '步' } },
  move_back: { cat: 'motion', label: '下移', color: '#22c55e', param: { key: 'steps', type: 'number', default: 1, suffix: '步' } },
  move_left: { cat: 'motion', label: '左移', color: '#22c55e', param: { key: 'steps', type: 'number', default: 1, suffix: '步' } },
  move_right: { cat: 'motion', label: '右移', color: '#22c55e', param: { key: 'steps', type: 'number', default: 1, suffix: '步' } },
  turn_left: { cat: 'motion', label: '左转', color: '#22c55e', param: { key: 'deg', type: 'number', default: 90, suffix: '°' } },
  turn_right: { cat: 'motion', label: '右转', color: '#22c55e', param: { key: 'deg', type: 'number', default: 90, suffix: '°' } },
  say: { cat: 'looks', label: '说', color: '#eab308', param: { key: 'text', type: 'text', default: '你好！' } },
  change_color: { cat: 'looks', label: '换颜色', color: '#eab308' },
  repeat: { cat: 'control', label: '重复', color: '#a855f7', param: { key: 'count', type: 'number', default: 4, suffix: '次' }, container: true },
  wait: { cat: 'control', label: '等待', color: '#a855f7', param: { key: 'sec', type: 'number', default: 0.3, suffix: '秒' } },
  set_var: { cat: 'data', label: '设置变量 score =', color: '#3b82f6', param: { key: 'value', type: 'number', default: 0 } },
  change_var: { cat: 'data', label: '变量 score +', color: '#3b82f6', param: { key: 'delta', type: 'number', default: 1 } },
}
interface Block {
  uid: string
  type: string
  params: Record<string, any>
  body?: Block[]
}
const paletteByCat = computed(() =>
  CAT_ORDER.map((cat) => ({
    cat,
    label: CAT_LABELS[cat],
    items: Object.entries(BLOCK_DEFS)
      .filter(([, d]) => d.cat === cat)
      .map(([type, d]) => ({ type, ...d })),
  })),
)

function makeBlock(type: string): Block {
  const d = BLOCK_DEFS[type]
  const params: Record<string, any> = {}
  if (d.param) params[d.param.key] = d.param.default
  const b: Block = { uid: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, params }
  if (d.container) b.body = []
  return b
}

/* ============ Tab ============ */
const tab = ref<'practice' | 'gallery'>('practice')

/* ============ 共享舞台 / 运行引擎 ============ */
const GRID = 16
const turtle = reactive({ x: 8, y: 13, dir: 0, color: '#22c55e' })
const trail = ref<{ x: number; y: number }[]>([])
const vars = reactive<Record<string, number>>({ score: 0 })
const speech = ref('')
const logs = ref<string[]>([])
const running = ref(false)
const stopFlag = ref(false)
const stageCanvas = ref<HTMLCanvasElement | null>(null)
const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#eab308', '#a855f7', '#f97316']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const num = (v: any) => Number(v) || 0
const clampPos = (v: number) => Math.max(0, Math.min(GRID - 1, v))

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
function drawStage() {
  const cv = stageCanvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const W = cv.width
  const H = cv.height
  const cell = W / GRID
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#fffdf7'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#f0e6d2'
  ctx.lineWidth = 1
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke()
  }
  if (trail.value.length > 1) {
    ctx.strokeStyle = 'rgba(34,197,94,0.45)'
    ctx.lineWidth = 3
    ctx.beginPath()
    trail.value.forEach((p, i) => {
      const x = (p.x + 0.5) * cell
      const y = (p.y + 0.5) * cell
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
  const cx = (turtle.x + 0.5) * cell
  const cy = (turtle.y + 0.5) * cell
  const r = cell * 0.38
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((turtle.dir * Math.PI) / 180)
  ctx.fillStyle = turtle.color
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r * 0.8, r * 0.7)
  ctx.lineTo(-r * 0.8, r * 0.7)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  if (speech.value) {
    ctx.font = '12px sans-serif'
    const tw = ctx.measureText(speech.value).width + 12
    const bx = Math.min(W - tw - 2, Math.max(2, cx - tw / 2))
    const by = Math.max(2, cy - r - 26)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.5
    roundRect(ctx, bx, by, tw, 20, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#334155'
    ctx.fillText(speech.value, bx + 6, by + 14)
  }
}
function resetStage() {
  turtle.x = 8
  turtle.y = 13
  turtle.dir = 0
  turtle.color = COLORS[0]
  trail.value = [{ x: turtle.x, y: turtle.y }]
  speech.value = ''
  vars.score = 0
  drawStage()
}
function pushTrail() {
  trail.value = [...trail.value, { x: turtle.x, y: turtle.y }]
}
function log(msg: string) {
  logs.value = [...logs.value, msg]
}
async function execSequence(seq: Block[], depth: number) {
  for (const b of seq) {
    if (stopFlag.value) throw new Error('stopped')
    await execBlock(b, depth)
  }
}
async function execBlock(b: Block, depth: number) {
  if (++stepCount > MAX_STEPS) throw new Error('stopped')
  const d = BLOCK_DEFS[b.type]
  const p = b.params
  switch (b.type) {
    case 'move_forward': turtle.y = clampPos(turtle.y - num(p.steps)); pushTrail(); break
    case 'move_back': turtle.y = clampPos(turtle.y + num(p.steps)); pushTrail(); break
    case 'move_left': turtle.x = clampPos(turtle.x - num(p.steps)); pushTrail(); break
    case 'move_right': turtle.x = clampPos(turtle.x + num(p.steps)); pushTrail(); break
    case 'turn_left': turtle.dir = (turtle.dir - num(p.deg) + 360) % 360; break
    case 'turn_right': turtle.dir = (turtle.dir + num(p.deg)) % 360; break
    case 'say': speech.value = String(p.text ?? ''); log('💬 ' + speech.value); break
    case 'change_color': turtle.color = COLORS[(COLORS.indexOf(turtle.color) + 1) % COLORS.length]; break
    case 'repeat':
      for (let i = 0; i < num(p.count); i++) {
        if (stopFlag.value) throw new Error('stopped')
        await execSequence(b.body || [], depth + 1)
      }
      return
    case 'wait': await sleep(num(p.sec) * 1000); break
    case 'set_var': vars.score = num(p.value); log('📊 score = ' + vars.score); break
    case 'change_var': vars.score += num(p.delta); log('📊 score = ' + vars.score); break
  }
  drawStage()
  if (d.cat === 'motion' || d.cat === 'looks' || d.cat === 'control') {
    await sleep(depth === 0 ? 350 : 120)
  }
}
async function run() {
  if (running.value) return
  stepCount = 0
  const target = tab.value === 'practice' ? pBlocks.value : blocks.value
  if (!target.length) {
    toast('画布为空，先拖入积木吧～')
    return
  }
  resetStage()
  running.value = true
  stopFlag.value = false
  logs.value = []
  log('▶ 开始运行')
  try {
    await execSequence(target, 0)
    log('✅ 运行结束')
  } catch {
    log('⏹ 已停止')
  } finally {
    running.value = false
    drawStage()
  }
}
function stop() {
  stopFlag.value = true
}
const MAX_STEPS = 5000
let stepCount = 0

/* ============ 家长练习（可读写） ============ */
const pBlocks = ref<Block[]>([])
const pTitle = ref('我的练习')
const pCurrentId = ref<string | null>(null)
const saving = ref(false)
const myPractice = ref<CodingProject[]>([])
const showPractice = ref(false)

function findBlock(list: Block[], uid: string): Block | null {
  for (const b of list) {
    if (b.uid === uid) return b
    if (b.body) {
      const f = findBlock(b.body, uid)
      if (f) return f
    }
  }
  return null
}
function removeBlock(list: Block[], uid: string): boolean {
  const i = list.findIndex((b) => b.uid === uid)
  if (i >= 0) {
    list.splice(i, 1)
    return true
  }
  for (const b of list) {
    if (b.body && removeBlock(b.body, uid)) return true
  }
  return false
}
function extractBlock(uid: string): Block | null {
  let found: Block | null = null
  const walk = (list: Block[]) => {
    const i = list.findIndex((b) => b.uid === uid)
    if (i >= 0) {
      found = list[i]
      list.splice(i, 1)
      return true
    }
    for (const b of list) if (b.body && walk(b.body)) return true
    return false
  }
  walk(pBlocks.value)
  return found
}
function handleRootDrop(e: DragEvent) {
  e.preventDefault()
  const newType = e.dataTransfer?.getData('application/x-new-block') || ''
  const moveUid = e.dataTransfer?.getData('application/x-move-block') || ''
  if (newType) pBlocks.value.push(makeBlock(newType))
  else if (moveUid) {
    const m = extractBlock(moveUid)
    if (m) pBlocks.value.push(m)
  }
}
function handleBodyDrop(e: DragEvent, containerUid: string) {
  e.preventDefault()
  const container = findBlock(pBlocks.value, containerUid)
  if (!container?.body) return
  const newType = e.dataTransfer?.getData('application/x-new-block') || ''
  const moveUid = e.dataTransfer?.getData('application/x-move-block') || ''
  if (newType) container.body!.push(makeBlock(newType))
  else if (moveUid) {
    if (moveUid === containerUid) return
    const m = extractBlock(moveUid)
    if (m) container.body!.push(m)
  }
}
function onPaletteDragStart(e: DragEvent, type: string) {
  e.dataTransfer?.setData('application/x-new-block', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
function onBlockDragStart(e: DragEvent, uid: string) {
  e.dataTransfer?.setData('application/x-move-block', uid)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function deleteBlock(uid: string) {
  removeBlock(pBlocks.value, uid)
}
function clearAllP() {
  pBlocks.value = []
  logs.value = []
  resetStage()
  toast('已清空画布')
}
const pBlockCount = computed(() => (pBlocks.value || []).length)

function loadLocalPractice(): CodingProject[] {
  try {
    return JSON.parse(localStorage.getItem('kids-coding-practice-local') || '[]')
  } catch {
    return []
  }
}
function saveLocalPractice(list: CodingProject[]) {
  localStorage.setItem('kids-coding-practice-local', JSON.stringify(list))
}
async function loadMyPractice() {
  try {
    myPractice.value = await listMyPracticeProjects()
  } catch {
    myPractice.value = loadLocalPractice()
  }
}
async function savePractice() {
  if (saving.value) return
  saving.value = true
  const payload = {
    title: pTitle.value || '我的练习',
    blocks: pBlocks.value as any,
  }
  try {
    if (pCurrentId.value) {
      await updatePracticeProject(pCurrentId.value, payload)
    } else {
      const r = await createPracticeProject(payload)
      pCurrentId.value = r.id
    }
    toast.success('已保存到云端')
    await loadMyPractice()
  } catch {
    const list = loadLocalPractice()
    if (pCurrentId.value) {
      const i = list.findIndex((p) => p.id === pCurrentId.value)
      if (i >= 0) list[i] = { ...list[i], title: payload.title, blocks: payload.blocks, updatedAt: new Date().toISOString() }
    } else {
      const id = 'local-' + Date.now().toString(36)
      pCurrentId.value = id
      list.push({ id, ...payload, updatedAt: new Date().toISOString() } as CodingProject)
    }
    saveLocalPractice(list)
    toast.success('已保存到本地（云端不可用）')
    await loadMyPractice()
  } finally {
    saving.value = false
  }
}
function openPractice(id: string) {
  const p = myPractice.value.find((x) => x.id === id)
  if (!p) return
  pCurrentId.value = p.id
  pTitle.value = p.title || '我的练习'
  pBlocks.value = Array.isArray(p.blocks) ? (JSON.parse(JSON.stringify(p.blocks)) as Block[]) : []
  resetStage()
  showPractice.value = false
  toast('已载入练习')
}
async function deletePractice(id: string) {
  if (!window.confirm('确定删除该练习作品？')) return
  try {
    await removePracticeProject(id)
    await loadMyPractice()
    toast.success('已删除')
  } catch {
    const list = loadLocalPractice().filter((p) => p.id !== id)
    saveLocalPractice(list)
    await loadMyPractice()
  }
  if (pCurrentId.value === id) {
    pCurrentId.value = null
    pTitle.value = '我的练习'
    pBlocks.value = []
    resetStage()
  }
}
function newPractice() {
  pCurrentId.value = null
  pTitle.value = '我的练习'
  pBlocks.value = []
  resetStage()
  logs.value = []
  toast('新建练习')
}

/* ============ 老师作品（只读画廊） ============ */
const projects = ref<CodingProject[]>([])
const selected = ref<CodingProject | null>(null)
const blocks = ref<Block[]>([])
const gBlockCount = computed(() => (blocks.value || []).length)

async function loadGallery() {
  try {
    projects.value = await listParentCodingProjects()
    if (projects.value.length && !selected.value) select(projects.value[0])
  } catch {
    toast.error('加载老师作品失败')
  }
}
function select(p: CodingProject) {
  selected.value = p
  blocks.value = Array.isArray(p.blocks) ? (JSON.parse(JSON.stringify(p.blocks)) as Block[]) : []
  resetStage()
}

function switchTab(t: 'practice' | 'gallery') {
  tab.value = t
  nextTick(() => resetStage())
}

onMounted(() => {
  resetStage()
  loadMyPractice()
  loadGallery()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 + Tab -->
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-bold text-cocoa-900 flex items-center gap-2">🧩 少儿编程</h1>
      <div class="inline-flex rounded-xl bg-cream-100 p-0.5">
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="tab === 'practice' ? 'bg-surface shadow-softer text-cocoa-900' : 'text-cocoa-400'"
          @click="switchTab('practice')"
        >✏️ 我的练习</button>
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="tab === 'gallery' ? 'bg-surface shadow-softer text-cocoa-900' : 'text-cocoa-400'"
          @click="switchTab('gallery')"
        >📚 老师作品</button>
      </div>
    </div>

    <!-- ============ 练习编辑视图 ============ -->
    <template v-if="tab === 'practice'">
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="pTitle"
          class="px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 text-sm font-semibold text-cocoa-900 w-48"
          placeholder="练习名称"
        />
        <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="newPractice">＋ 新建</button>
        <button class="px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="savePractice">💾 保存</button>
        <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="showPractice = true">📂 我的练习</button>
        <div class="flex-1" />
        <button class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60" :disabled="running || !pBlockCount" @click="run">▶ 运行</button>
        <button class="px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600" :disabled="!running" @click="stop">⏹ 停止</button>
        <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="clearAllP">🧹 清空</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[200px_1fr_320px] gap-4">
        <!-- 控件面板 -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          <div v-for="grp in paletteByCat" :key="grp.cat">
            <div class="text-xs font-semibold text-cocoa-400 mb-1.5">{{ grp.label }}</div>
            <div class="space-y-1.5">
              <div
                v-for="item in grp.items"
                :key="item.type"
                class="flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing text-white text-xs font-medium shadow-sm select-none"
                :style="{ background: item.color }"
                draggable="true"
                @dragstart="onPaletteDragStart($event, item.type)"
              >
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 编程画布 -->
        <div
          class="bg-surface rounded-2xl shadow-softer p-3 min-h-[60vh]"
          :class="running ? '' : 'ring-2 ring-dashed ring-butter-200'"
          @dragover.prevent
          @drop="handleRootDrop"
        >
          <div class="text-xs text-cocoa-400 mb-2">把左侧控件拖到这里，拼出你的程序 👇</div>
          <div v-if="!pBlockCount" class="text-center text-cocoa-300 py-16 text-sm">画布为空，从左侧拖入积木开始练习</div>
          <div class="space-y-1.5">
            <BlockNode
              v-for="b in pBlocks"
              :key="b.uid"
              :block="b"
              :defs="BLOCK_DEFS"
              :depth="0"
              @delete="deleteBlock"
              @dragstart-block="onBlockDragStart"
              @drop-root="handleRootDrop"
              @drop-body="handleBodyDrop"
            />
          </div>
        </div>

        <!-- 舞台 -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-cocoa-900">运行预览</span>
            <span class="text-xs text-cocoa-400">score = {{ vars.score }}</span>
          </div>
          <canvas ref="stageCanvas" width="320" height="320" class="w-full rounded-xl border border-cream-200 bg-white" />
          <div class="text-xs text-cocoa-400 h-28 overflow-y-auto bg-cream-50 rounded-xl p-2 font-mono">
            <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
            <div v-if="!logs.length" class="text-cocoa-300">运行日志将显示在这里</div>
          </div>
        </div>
      </div>

      <!-- 我的练习 -->
      <div v-if="showPractice" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showPractice = false">
        <div class="w-full max-w-lg max-h-[80vh] rounded-2xl bg-surface shadow-xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-cream-200">
            <h3 class="text-lg font-bold text-cocoa-900">我的练习</h3>
            <button class="text-cocoa-400 hover:text-cocoa-700" @click="showPractice = false">✕</button>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            <div v-if="!myPractice.length" class="text-center text-cocoa-300 py-10 text-sm">还没有保存的练习</div>
            <div v-for="p in myPractice" :key="p.id" class="flex items-center gap-3 p-3 rounded-xl border border-cream-200 hover:bg-cream-50">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-cocoa-900 truncate">{{ p.title }}</div>
                <div class="text-xs text-cocoa-400">{{ (p.blocks?.length || 0) }} 个积木</div>
              </div>
              <button class="px-3 py-1.5 rounded-lg bg-butter-500 text-white text-xs" @click="openPractice(p.id)">打开</button>
              <button class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-500 text-xs" @click="deletePractice(p.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 老师作品只读画廊 ============ -->
    <template v-else>
      <div class="text-xs text-cocoa-400">老师发布的编程作品（只读，供参考学习）</div>
      <div v-if="!projects.length" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-300 text-sm">
        老师还没有发布少儿编程作品～
      </div>
      <div v-else class="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
        <!-- 作品列表 -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          <div class="text-xs font-semibold text-cocoa-400 mb-1">作品列表</div>
          <button
            v-for="p in projects"
            :key="p.id"
            class="w-full text-left px-3 py-2.5 rounded-xl border transition-colors"
            :class="selected?.id === p.id ? 'border-butter-300 bg-butter-50' : 'border-cream-200 hover:bg-cream-50'"
            @click="select(p)"
          >
            <div class="text-sm font-medium text-cocoa-900 truncate">{{ p.title }}</div>
            <div class="text-xs text-cocoa-400">{{ p.teacherName || '老师' }} · {{ (p.blocks?.length || 0) }} 个积木</div>
          </button>
        </div>

        <!-- 程序（只读） -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 min-h-[60vh]">
          <div class="text-xs text-cocoa-400 mb-2">程序内容（只读，不可编辑）</div>
          <div v-if="!gBlockCount" class="text-center text-cocoa-300 py-16 text-sm">该作品暂无积木</div>
          <div class="space-y-1.5">
            <BlockView v-for="b in blocks" :key="b.uid" :block="b" :defs="BLOCK_DEFS" :depth="0" />
          </div>
        </div>

        <!-- 舞台 -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-cocoa-900">运行预览</span>
            <span class="text-xs text-cocoa-400">score = {{ vars.score }}</span>
          </div>
          <canvas ref="stageCanvas" width="320" height="320" class="w-full rounded-xl border border-cream-200 bg-white" />
          <div class="flex gap-2">
            <button class="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60" :disabled="running || !gBlockCount" @click="run">▶ 运行</button>
            <button class="px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600" :disabled="!running" @click="stop">⏹ 停止</button>
          </div>
          <div class="text-xs text-cocoa-400 h-28 overflow-y-auto bg-cream-50 rounded-xl p-2 font-mono">
            <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
            <div v-if="!logs.length" class="text-cocoa-300">运行日志将显示在这里</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
