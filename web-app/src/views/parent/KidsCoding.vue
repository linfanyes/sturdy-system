<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { toast } from '@/utils/feedback'
import BlockNode from '@/components/BlockNode.vue'
import BlockView from '@/components/BlockView.vue'
import {
  useCodingEngine,
  makeBlock,
  findBlock,
  removeBlock,
  extractBlock,
  paletteByCat,
  BLOCK_DEFS,
  PRESETS,
  type Block,
} from '@/composables/useCodingEngine'
import {
  listParentCodingProjects,
  getParentCodingProject,
  listMyPracticeProjects,
  createPracticeProject,
  updatePracticeProject,
  removePracticeProject,
  submitPracticeProject,
  getPracticeReview,
  listChallenges,
  listGallery,
  getWeeklyReport,
  getBadges,
  type CodingProject,
  type CodingChallenge,
  type CodingReview,
} from '@/api/kidsCoding'

const stageCanvas = ref<HTMLCanvasElement | null>(null)
const eng = useCodingEngine(stageCanvas)
const { running, mode, speed, paused, currentUid, logs, output, varSummary, resetStage, run, stop, pause, resume, stepNext, setMode, setSpeed } = eng
const runPractice = () => run(pBlocks.value)
const runGallery = () => run(blocks.value)

/* ============ Tab ============ */
const tab = ref<'practice' | 'gallery' | 'challenge' | 'wall' | 'report' | 'badges'>('practice')

/* ============ 家长练习（可读写） ============ */
const pBlocks = ref<Block[]>([])
const pTitle = ref('我的练习')
const pCurrentId = ref<string | null>(null)
const pChallengeId = ref<string | null>(null)
const saving = ref(false)
const myPractice = ref<CodingProject[]>([])
const showPractice = ref(false)
const practiceReview = ref<CodingReview | null>(null)
const pBlockCount = computed(() => pBlocks.value.length)

/* ============ 任务卡（挑战） ============ */
const challenges = ref<CodingChallenge[]>([])
const activeChallenge = ref<CodingChallenge | null>(null)

/* ============ 班级作品墙 + 学习周报 ============ */
const wall = ref<CodingProject[]>([])
const weekly = ref<any>(null)
const badges = ref<{ type: string; label: string; icon: string; earned: boolean }[]>([])
const presetName = ref('')
async function loadWall() {
  try { wall.value = await listGallery() } catch { wall.value = [] }
}
async function loadWeekly() {
  try { weekly.value = await getWeeklyReport() } catch { weekly.value = null }
}
async function loadBadges() {
  try { badges.value = await getBadges() } catch { badges.value = [] }
}
function applyPreset() {
  const pre = PRESETS.find((p) => p.name === presetName.value)
  if (!pre) return
  pBlocks.value = pre.blocks()
  resetStage()
  toast('已载入示例：' + pre.name)
}
async function loadChallenges() {
  try {
    challenges.value = await listChallenges()
    if (challenges.value.length && !activeChallenge.value) activeChallenge.value = challenges.value[0]
  } catch {
    challenges.value = []
  }
}
/** 从任务卡开始练习：载入起始模板到编辑器 */
function startFromChallenge(c: CodingChallenge) {
  pChallengeId.value = c.id
  pCurrentId.value = null
  pTitle.value = c.title || '我的练习'
  pBlocks.value = Array.isArray(c.starterBlocks) ? (JSON.parse(JSON.stringify(c.starterBlocks)) as Block[]) : []
  resetStage()
  practiceReview.value = null
  showPractice.value = false
  activeChallenge.value = c
  tab.value = 'practice'
  toast('已载入挑战模板，开始练习吧！')
}

function onPaletteDragStart(e: DragEvent, type: string) {
  e.dataTransfer?.setData('application/x-new-block', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
function onBlockDragStart(e: DragEvent, uid: string) {
  e.dataTransfer?.setData('application/x-move-block', uid)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function handleRootDrop(e: DragEvent) {
  e.preventDefault()
  const newType = e.dataTransfer?.getData('application/x-new-block') || ''
  const moveUid = e.dataTransfer?.getData('application/x-move-block') || ''
  if (newType) pBlocks.value.push(makeBlock(newType))
  else if (moveUid) {
    const m = extractBlock(moveUid, pBlocks)
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
    const m = extractBlock(moveUid, pBlocks)
    if (m) container.body!.push(m)
  }
}
function handleElseDrop(e: DragEvent, containerUid: string) {
  e.preventDefault()
  const container = findBlock(pBlocks.value, containerUid)
  if (!container?.elseBody) return
  const newType = e.dataTransfer?.getData('application/x-new-block') || ''
  const moveUid = e.dataTransfer?.getData('application/x-move-block') || ''
  if (newType) container.elseBody!.push(makeBlock(newType))
  else if (moveUid) {
    if (moveUid === containerUid) return
    const m = extractBlock(moveUid, pBlocks)
    if (m) container.elseBody!.push(m)
  }
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
    challengeId: pChallengeId.value,
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
  pChallengeId.value = null
  pTitle.value = '我的练习'
  pBlocks.value = []
  practiceReview.value = null
  logs.value = []
  resetStage()
  toast('新建练习')
}

/** 打开已保存练习时，回填挑战关联并拉取教师点评 */
async function openPractice(id: string) {
  const p = myPractice.value.find((x) => x.id === id)
  if (!p) return
  pCurrentId.value = p.id
  pChallengeId.value = p.challengeId || null
  pTitle.value = p.title || '我的练习'
  pBlocks.value = Array.isArray(p.blocks) ? (JSON.parse(JSON.stringify(p.blocks)) as Block[]) : []
  resetStage()
  practiceReview.value = null
  showPractice.value = false
  await loadReview(id)
  toast('已载入练习')
}

/** 拉取某练习作品的教师点评 */
async function loadReview(id: string) {
  try {
    practiceReview.value = await getPracticeReview(id)
  } catch {
    practiceReview.value = null
  }
}

/** 提交当前练习作为作业 */
async function submitCurrent() {
  if (!pCurrentId.value) {
    await savePractice()
  }
  if (!pCurrentId.value) return
  try {
    await submitPracticeProject(pCurrentId.value)
    toast.success('已提交作业，等待老师点评 🎉')
    await loadMyPractice()
  } catch {
    toast.error('提交失败，请稍后再试')
  }
}

/** 打开某作品并立即提交 */
async function openAndSubmit(p: CodingProject) {
  await openPractice(p.id)
  await submitCurrent()
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

function switchTab(t: 'practice' | 'gallery' | 'challenge' | 'wall' | 'report' | 'badges') {
  tab.value = t
  if (t === 'wall') loadWall()
  if (t === 'report') loadWeekly()
  if (t === 'badges') loadBadges()
  nextTick(() => resetStage())
}

onMounted(() => {
  resetStage()
  loadMyPractice()
  loadGallery()
  loadChallenges()
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
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="tab === 'challenge' ? 'bg-surface shadow-softer text-cocoa-900' : 'text-cocoa-400'"
          @click="switchTab('challenge')"
        >🎯 挑战</button>
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="tab === 'wall' ? 'bg-surface shadow-softer text-cocoa-900' : 'text-cocoa-400'"
          @click="switchTab('wall')"
        >🏆 作品墙</button>
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="tab === 'report' ? 'bg-surface shadow-softer text-cocoa-900' : 'text-cocoa-400'"
          @click="switchTab('report')"
        >📈 周报</button>
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="tab === 'badges' ? 'bg-surface shadow-softer text-cocoa-900' : 'text-cocoa-400'"
          @click="switchTab('badges')"
        >🏅 徽章</button>
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
        <button class="px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-60" :disabled="!pCurrentId || running" @click="submitCurrent">📤 提交作业</button>
        <span v-if="practiceReview" class="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">⭐ 老师已点评{{ practiceReview.rating ? '（' + practiceReview.rating + '星）' : '' }}</span>
        <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="showPractice = true">📂 我的练习</button>
        <select
          v-model="presetName"
          class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white focus:outline-none"
          @change="applyPreset()"
        >
          <option value="">📐 示例模板</option>
          <option v-for="p in PRESETS" :key="p.name" :value="p.name">{{ p.name }}</option>
        </select>
        <div class="flex-1" />
        <button class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60" :disabled="running || !pBlockCount" @click="runPractice">▶ 运行</button>
        <button class="px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600" :disabled="!running" @click="stop">⏹ 停止</button>
        <button
          class="px-3 py-2 rounded-xl border text-sm font-medium transition-colors"
          :class="mode === 'step' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-cream-200 text-cocoa-600 hover:bg-cream-50'"
          :disabled="running"
          @click="setMode(mode === 'step' ? 'auto' : 'step')"
        >👣 单步{{ mode === 'step' ? '中' : '' }}</button>
        <select
          class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white focus:outline-none"
          :disabled="running"
          :value="speed"
          @change="setSpeed(Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="800">🐢 慢速</option>
          <option :value="350">⏱ 中速</option>
          <option :value="80">⚡ 快速</option>
        </select>
        <template v-if="running">
          <button v-if="mode === 'step'" class="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600" @click="stepNext">⏭ 下一步</button>
          <button v-else class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="paused ? resume() : pause()">{{ paused ? '▶ 继续' : '⏸ 暂停' }}</button>
        </template>
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
              :active-uid="currentUid"
              @delete="deleteBlock"
              @dragstart-block="onBlockDragStart"
              @drop-root="handleRootDrop"
              @drop-body="handleBodyDrop"
              @drop-else="handleElseDrop"
            />
          </div>
        </div>

        <!-- 舞台 -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-cocoa-900">运行预览</span>
            <span class="text-xs text-cocoa-400 font-mono">{{ varSummary }}</span>
          </div>
          <canvas ref="stageCanvas" width="320" height="320" class="w-full rounded-xl border border-cream-200 bg-white" />
          <div class="text-xs text-cocoa-400 h-28 overflow-y-auto bg-cream-50 rounded-xl p-2 font-mono">
            <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
            <div v-if="!logs.length" class="text-cocoa-300">运行日志将显示在这里</div>
          </div>
          <div v-if="output.length" class="text-xs text-cocoa-900">
            <div class="font-semibold text-cocoa-400 mb-1">🖨 输出</div>
            <div class="bg-white rounded-xl p-2 font-mono border border-cream-200 max-h-24 overflow-y-auto">{{ output.join('\n') }}</div>
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

    <!-- ============ 任务卡（挑战） ============ -->
    <template v-else-if="tab === 'challenge'">
      <div class="text-xs text-cocoa-400">老师发布的课堂挑战，选一个开始练习并提交作业吧 🎯</div>
      <div v-if="!challenges.length" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-300 text-sm">
        老师还没有发布挑战任务～
      </div>
      <div v-else class="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <!-- 挑战列表 -->
        <div class="bg-surface rounded-2xl shadow-softer p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          <div class="text-xs font-semibold text-cocoa-400 mb-1">挑战任务</div>
          <button
            v-for="c in challenges"
            :key="c.id"
            class="w-full text-left px-3 py-3 rounded-xl border transition-colors"
            :class="activeChallenge?.id === c.id ? 'border-butter-300 bg-butter-50' : 'border-cream-200 hover:bg-cream-50'"
            @click="activeChallenge = c"
          >
            <div class="text-sm font-medium text-cocoa-900">{{ c.title }}</div>
            <div class="text-xs text-cocoa-400 mt-0.5 line-clamp-2">{{ c.goal || '（无任务说明）' }}</div>
            <div class="text-xs text-cocoa-400 mt-1">由 {{ c.teacherName || '老师' }} 发布</div>
          </button>
        </div>

        <!-- 挑战详情 -->
        <div v-if="activeChallenge" class="space-y-3">
          <div class="bg-surface rounded-2xl shadow-softer p-5">
            <h3 class="text-lg font-bold text-cocoa-900 mb-1">{{ activeChallenge.title }}</h3>
            <p class="text-sm text-cocoa-600 whitespace-pre-wrap">{{ activeChallenge.goal || '（无任务说明）' }}</p>
            <button
              class="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
              @click="startFromChallenge(activeChallenge)"
            >✏️ 开始练习</button>
          </div>
          <!-- 我的相关作品 -->
          <div class="bg-surface rounded-2xl shadow-softer p-4">
            <div class="text-sm font-semibold text-cocoa-900 mb-2">我的提交</div>
            <div v-if="!myPractice.filter(p => p.challengeId === activeChallenge?.id).length" class="text-xs text-cocoa-400 py-3">还没有提交，点上方「开始练习」试试看</div>
            <div
              v-for="p in myPractice.filter(p => p.challengeId === activeChallenge?.id)"
              :key="p.id"
              class="flex items-center gap-3 p-2.5 rounded-xl border border-cream-200 hover:bg-cream-50"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-cocoa-900 truncate">{{ p.title }}</div>
                <div class="text-xs text-cocoa-400">{{ p.submitted ? '✅ 已提交' : '📝 草稿' }} · {{ (p.blocks?.length || 0) }} 个积木</div>
              </div>
              <button class="px-3 py-1.5 rounded-lg bg-butter-500 text-white text-xs" @click="openPractice(p.id)">打开</button>
              <button class="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 text-xs" @click="openAndSubmit(p)">提交</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 老师作品只读画廊 ============ -->
    <template v-else-if="tab === 'gallery'">
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
            <span class="text-xs text-cocoa-400 font-mono">{{ varSummary }}</span>
          </div>
          <canvas ref="stageCanvas" width="320" height="320" class="w-full rounded-xl border border-cream-200 bg-white" />
          <div class="flex gap-2">
            <button class="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60" :disabled="running || !gBlockCount" @click="runGallery">▶ 运行</button>
            <button class="px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600" :disabled="!running" @click="stop">⏹ 停止</button>
            <button
              class="px-3 py-2 rounded-xl border text-sm font-medium transition-colors"
              :class="mode === 'step' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-cream-200 text-cocoa-600 hover:bg-cream-50'"
              :disabled="running"
              @click="setMode(mode === 'step' ? 'auto' : 'step')"
            >👣 单步</button>
            <select
              class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white focus:outline-none"
              :disabled="running"
              :value="speed"
              @change="setSpeed(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="800">🐢</option>
              <option :value="350">⏱</option>
              <option :value="80">⚡</option>
            </select>
          </div>
          <div class="text-xs text-cocoa-400 h-28 overflow-y-auto bg-cream-50 rounded-xl p-2 font-mono">
            <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
            <div v-if="!logs.length" class="text-cocoa-300">运行日志将显示在这里</div>
          </div>
          <div v-if="output.length" class="text-xs text-cocoa-900">
            <div class="font-semibold text-cocoa-400 mb-1">🖨 输出</div>
            <div class="bg-white rounded-xl p-2 font-mono border border-cream-200 max-h-24 overflow-y-auto">{{ output.join('\n') }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 班级作品墙 ============ -->
    <template v-else-if="tab === 'wall'">
      <div class="text-xs text-cocoa-400">老师精选的同伴作品，互相学习 🏆</div>
      <div v-if="!wall.length" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-300 text-sm">
        作品墙还空空的，老师精选后会显示在这里～
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="w in wall" :key="w.id" class="bg-surface rounded-2xl shadow-softer p-4 space-y-2">
          <div class="text-sm font-semibold text-cocoa-900 truncate">{{ w.title }}</div>
          <div class="text-xs text-cocoa-400">学生 {{ (w as any).studentId }}</div>
          <div class="bg-cream-50 rounded-xl p-2 max-h-40 overflow-y-auto">
            <BlockView v-for="b in (w.blocks || [])" :key="b.uid" :block="b" :defs="BLOCK_DEFS" :depth="0" />
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 学习周报 ============ -->
    <template v-else-if="tab === 'report'">
      <div class="text-xs text-cocoa-400">近 7 天学习概况 📈</div>
      <div v-if="!weekly" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-300 text-sm">
        暂无周报数据
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.practiceTotal }}</div>
          <div class="text-xs text-cocoa-400 mt-1">练习作品总数</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.practiceRecent }}</div>
          <div class="text-xs text-cocoa-400 mt-1">本周新练习</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.submittedTotal }}</div>
          <div class="text-xs text-cocoa-400 mt-1">已提交作业</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.challengesAvailable }}</div>
          <div class="text-xs text-cocoa-400 mt-1">可挑战任务</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.reviewsTotal }}</div>
          <div class="text-xs text-cocoa-400 mt-1">收到点评</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.avgRating != null ? weekly.avgRating + '⭐' : '—' }}</div>
          <div class="text-xs text-cocoa-400 mt-1">平均评分</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.totalBlocks }}</div>
          <div class="text-xs text-cocoa-400 mt-1">累计积木数</div>
        </div>
        <div class="bg-surface rounded-2xl shadow-softer p-4 text-center">
          <div class="text-2xl font-bold text-cocoa-900">{{ weekly.reviewsRecent }}</div>
          <div class="text-xs text-cocoa-400 mt-1">本周新点评</div>
        </div>
      </div>
      <div class="text-xs text-cocoa-400 mt-2">统计区间：{{ weekly.weekStart?.slice(0, 10) }} 起 · 最近活跃：{{ weekly.lastActivity ? new Date(weekly.lastActivity).toLocaleString() : '—' }}</div>
    </template>

    <!-- ============ 成就徽章 ============ -->
    <template v-else-if="tab === 'badges'">
      <div class="text-xs text-cocoa-400">加油，每完成一个小目标就能解锁一枚徽章 🏅</div>
      <div v-if="!badges.length" class="bg-surface rounded-2xl shadow-softer p-10 text-center text-cocoa-300 text-sm">暂无可展示徽章</div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="b in badges"
          :key="b.type"
          class="rounded-2xl shadow-softer p-5 text-center"
          :class="b.earned ? 'bg-butter-50 border border-butter-200' : 'bg-surface opacity-60'"
        >
          <div class="text-3xl">{{ b.earned ? b.icon : '🔒' }}</div>
          <div class="text-sm font-medium text-cocoa-900 mt-1">{{ b.label }}</div>
          <div class="text-xs mt-1" :class="b.earned ? 'text-butter-600' : 'text-cocoa-300'">{{ b.earned ? '已获得' : '未解锁' }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
