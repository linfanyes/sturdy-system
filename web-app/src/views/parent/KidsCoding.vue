<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { toast } from '@/utils/feedback'
import { listParentCodingProjects, type CodingProject } from '@/api/kidsCoding'
import BlockView from '@/components/BlockView.vue'

/* ============ 积木定义（与教师端一致，用于只读渲染 + 运行） ============ */
interface BlockDef {
  cat: 'event' | 'motion' | 'looks' | 'control' | 'data'
  label: string
  color: string
  param?: { key: string; type: 'number' | 'text'; default: any; suffix?: string }
  container?: boolean
}
const BLOCK_DEFS: Record<string, BlockDef> = {
  event_flag: { cat: 'event', label: '当 🟢 被点击', color: '#ef4444' },
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

/* ============ 列表 / 选中 ============ */
const projects = ref<CodingProject[]>([])
const selected = ref<CodingProject | null>(null)
const blocks = ref<Block[]>([])

async function load() {
  try {
    projects.value = await listParentCodingProjects()
    if (projects.value.length && !selected.value) select(projects.value[0])
  } catch {
    toast.error('加载少儿编程作品失败')
  }
}
function select(p: CodingProject) {
  selected.value = p
  blocks.value = Array.isArray(p.blocks) ? (JSON.parse(JSON.stringify(p.blocks)) as Block[]) : []
  resetStage()
}

/* ============ 舞台 / 运行（只读，仅查看孩子老师发布的作品） ============ */
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
function pushTrail() {
  trail.value = [...trail.value, { x: turtle.x, y: turtle.y }]
}
function log(msg: string) {
  logs.value = [...logs.value, msg]
}
async function run() {
  if (running.value) return
  resetStage()
  running.value = true
  stopFlag.value = false
  logs.value = []
  log('▶ 开始运行')
  try {
    await execSequence(blocks.value, 0)
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
async function execSequence(seq: Block[], depth: number) {
  for (const b of seq) {
    if (stopFlag.value) throw new Error('stopped')
    await execBlock(b, depth)
  }
}
async function execBlock(b: Block, depth: number) {
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

const blockCount = computed(() => (blocks.value || []).length)

onMounted(() => {
  load()
  resetStage()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-cocoa-900 flex items-center gap-2">🧩 少儿编程</h1>
      <span class="text-xs text-cocoa-400">老师发布的编程作品（只读）</span>
    </div>

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
        <div v-if="!blockCount" class="text-center text-cocoa-300 py-16 text-sm">该作品暂无积木</div>
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
          <button class="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60" :disabled="running || !blockCount" @click="run">▶ 运行</button>
          <button class="px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600" :disabled="!running" @click="stop">⏹ 停止</button>
        </div>
        <div class="text-xs text-cocoa-400 h-28 overflow-y-auto bg-cream-50 rounded-xl p-2 font-mono">
          <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
          <div v-if="!logs.length" class="text-cocoa-300">运行日志将显示在这里</div>
        </div>
      </div>
    </div>
  </div>
</template>
