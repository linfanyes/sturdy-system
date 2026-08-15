<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/feedback'
import BlockNode from '@/components/BlockNode.vue'
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
  listCodingProjects,
  getCodingProject,
  createCodingProject,
  updateCodingProject,
  removeCodingProject,
  listTeacherChallenges,
  createChallenge,
  updateChallenge,
  removeChallenge,
  listChallengeSubmissions,
  createReview,
  featureSubmission,
  unfeatureSubmission,
  type CodingProject,
  type CodingChallenge,
} from '@/api/kidsCoding'
import { listMyClasses, getClassParentFeatures, updateClassParentFeatures, type TeacherClass } from '@/api/teacher'

const auth = useAuthStore()
const stageCanvas = ref<HTMLCanvasElement | null>(null)
const eng = useCodingEngine(stageCanvas)
const { running, mode, speed, paused, currentUid, logs, vars, output, varSummary, resetStage, run, stop, pause, resume, stepNext, setMode, setSpeed } = eng
const runProgram = () => run(blocks.value)

/* 作品发布设置（作品级，区别于班级菜单级 openPublish） */
const selectedClassId = ref<string | null>(null)
const publishToParent = ref(false)
const description = ref('')

/* ============ 编辑器状态 ============ */
const blocks = ref<Block[]>([])
const title = ref('未命名作品')
const currentProjectId = ref<string | null>(null)

/* ============ 拖拽：从控件面板新建 / 移动已有积木 ============ */
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
  if (newType) blocks.value.push(makeBlock(newType))
  else if (moveUid) {
    const m = extractBlock(moveUid, blocks)
    if (m) blocks.value.push(m)
  }
}
function handleBodyDrop(e: DragEvent, containerUid: string) {
  e.preventDefault()
  const container = findBlock(blocks.value, containerUid)
  if (!container?.body) return
  const newType = e.dataTransfer?.getData('application/x-new-block') || ''
  const moveUid = e.dataTransfer?.getData('application/x-move-block') || ''
  if (newType) container.body!.push(makeBlock(newType))
  else if (moveUid) {
    if (moveUid === containerUid) return
    const m = extractBlock(moveUid, blocks)
    if (m) container.body!.push(m)
  }
}
function handleElseDrop(e: DragEvent, containerUid: string) {
  e.preventDefault()
  const container = findBlock(blocks.value, containerUid)
  if (!container?.elseBody) return
  const newType = e.dataTransfer?.getData('application/x-new-block') || ''
  const moveUid = e.dataTransfer?.getData('application/x-move-block') || ''
  if (newType) container.elseBody!.push(makeBlock(newType))
  else if (moveUid) {
    if (moveUid === containerUid) return
    const m = extractBlock(moveUid, blocks)
    if (m) container.elseBody!.push(m)
  }
}
function deleteBlock(uid: string) {
  removeBlock(blocks.value, uid)
}
function clearAll() {
  blocks.value = []
  logs.value = []
  resetStage()
  toast('已清空画布')
}

/* ============ 作品：保存 / 我的作品 / 本地兜底 ============ */
const myProjects = ref<CodingProject[]>([])
const showProjects = ref(false)
const saving = ref(false)

async function loadMyProjects() {
  try {
    myProjects.value = await listCodingProjects()
  } catch {
    myProjects.value = loadLocalProjects()
  }
}
function loadLocalProjects(): CodingProject[] {
  try {
    return JSON.parse(localStorage.getItem('kids-coding-local') || '[]')
  } catch {
    return []
  }
}
function saveLocalProjects(list: CodingProject[]) {
  localStorage.setItem('kids-coding-local', JSON.stringify(list))
}
async function saveProject() {
  if (saving.value) return
  saving.value = true
  const payload = {
    title: title.value || '未命名作品',
    blocks: blocks.value as any,
    teacherName: auth.user?.name || '老师',
    description: description.value || null,
    classId: selectedClassId.value,
    publishedToParent: publishToParent.value,
  }
  try {
    if (currentProjectId.value) {
      await updateCodingProject(currentProjectId.value, payload)
    } else {
      const r = await createCodingProject(payload)
      currentProjectId.value = r.id
    }
    toast.success('已保存到云端')
    await loadMyProjects()
  } catch {
    // 本地兜底
    const list = loadLocalProjects()
    if (currentProjectId.value) {
      const i = list.findIndex((p) => p.id === currentProjectId.value)
      if (i >= 0) list[i] = { ...list[i], title: payload.title, blocks: payload.blocks, teacherName: payload.teacherName, description: payload.description, classId: payload.classId, publishedToParent: payload.publishedToParent, updatedAt: new Date().toISOString() }
    } else {
      const id = 'local-' + Date.now().toString(36)
      currentProjectId.value = id
      list.push({ id, ...payload, updatedAt: new Date().toISOString() } as CodingProject)
    }
    saveLocalProjects(list)
    toast.success('已保存到本地（云端不可用）')
    await loadMyProjects()
  } finally {
    saving.value = false
  }
}
async function openProject(id: string) {
  try {
    const p = await getCodingProject(id)
    loadIntoEditor(p)
  } catch {
    const p = loadLocalProjects().find((x) => x.id === id)
    if (p) loadIntoEditor(p)
    else toast.error('加载失败')
  }
  showProjects.value = false
}
function loadIntoEditor(p: CodingProject) {
  currentProjectId.value = p.id
  title.value = p.title || '未命名作品'
  blocks.value = Array.isArray(p.blocks) ? (JSON.parse(JSON.stringify(p.blocks)) as Block[]) : []
  selectedClassId.value = p.classId ?? null
  publishToParent.value = !!p.publishedToParent
  description.value = p.description ?? ''
  resetStage()
  toast('已载入作品')
}
async function deleteProject(id: string) {
  if (!window.confirm('确定删除该作品？此操作不可撤销。')) return
  try {
    await removeCodingProject(id)
    await loadMyProjects()
    toast.success('已删除')
  } catch {
    const list = loadLocalProjects().filter((p) => p.id !== id)
    saveLocalProjects(list)
    await loadMyProjects()
  }
}
function newProject() {
  currentProjectId.value = null
  title.value = '未命名作品'
  blocks.value = []
  selectedClassId.value = null
  publishToParent.value = false
  description.value = ''
  logs.value = []
  resetStage()
  toast('新建作品')
}

const presetName = ref('')
function applyPreset() {
  const pre = PRESETS.find((p) => p.name === presetName.value)
  if (!pre) return
  blocks.value = pre.blocks()
  resetStage()
  toast('已载入示例：' + pre.name)
}

/* ============ 开放给家长 ============ */
const showPublish = ref(false)
const classes = ref<TeacherClass[]>([])
const classPublish = reactive<Record<string, boolean>>({})

async function openPublish() {
  showPublish.value = true
  try {
    classes.value = await listMyClasses()
    for (const c of classes.value) {
      try {
        const r = await getClassParentFeatures(c.id)
        const feats = Array.isArray(r.features) ? r.features : r.configured ? [] : null
        classPublish[c.id] = Array.isArray(feats) && feats.includes('kids-coding')
      } catch {
        classPublish[c.id] = false
      }
    }
  } catch {
    toast.error('加载班级失败')
  }
}
async function togglePublish(c: TeacherClass) {
  const on = !classPublish[c.id]
  classPublish[c.id] = on
  try {
    const r = await getClassParentFeatures(c.id)
    let feats: string[] = Array.isArray(r.features) ? [...r.features] : r.configured ? [] : []
    if (on) {
      if (!feats.includes('kids-coding')) feats.push('kids-coding')
    } else {
      feats = feats.filter((f) => f !== 'kids-coding')
    }
    await updateClassParentFeatures(c.id, feats.length ? feats : null)
    toast.success(on ? `已对「${c.name}」开放少儿编程` : `已关闭「${c.name}」的少儿编程`)
  } catch {
    classPublish[c.id] = !on
    toast.error('操作失败，请重试')
  }
}

async function loadClasses() {
  try {
    classes.value = await listMyClasses()
  } catch {
    /* 忽略：以开放给家长弹窗为准 */
  }
}

/* ============ 任务卡（挑战）与批改 ============ */
const showChallenges = ref(false)
const challenges = ref<CodingChallenge[]>([])
const challengeTitle = ref('')
const challengeGoal = ref('')
const challengeClassId = ref<string | null>(null)
const challengeUseCanvas = ref(false) // 用当前画布作为起始模板
const editingChallengeId = ref<string | null>(null)

const submissions = ref<any[]>([])
const activeReview = reactive<Record<string, { comment: string; rating: number | null; saving: boolean }>>({})

async function loadChallenges() {
  try {
    challenges.value = await listTeacherChallenges()
  } catch {
    challenges.value = []
  }
}
function newChallenge() {
  editingChallengeId.value = null
  challengeTitle.value = ''
  challengeGoal.value = ''
  challengeClassId.value = null
  challengeUseCanvas.value = false
}
async function saveChallenge() {
  if (!challengeTitle.value.trim()) {
    toast.error('请填写挑战标题')
    return
  }
  const dto: any = {
    title: challengeTitle.value.trim(),
    goal: challengeGoal.value || null,
    classId: challengeClassId.value,
    teacherName: auth.user?.name || '老师',
  }
  if (challengeUseCanvas.value) dto.starterBlocks = blocks.value
  try {
    if (editingChallengeId.value) {
      await updateChallenge(editingChallengeId.value, dto)
      toast.success('已更新挑战')
    } else {
      await createChallenge(dto)
      toast.success('已发布挑战')
    }
    await loadChallenges()
    newChallenge()
  } catch {
    toast.error('保存挑战失败')
  }
}
function editChallenge(c: CodingChallenge) {
  editingChallengeId.value = c.id
  challengeTitle.value = c.title
  challengeGoal.value = c.goal || ''
  challengeClassId.value = c.classId ?? null
  challengeUseCanvas.value = false
}
async function deleteChallenge(id: string) {
  if (!window.confirm('确定删除该挑战？学生已提交的作业将保留但不再关联。')) return
  try {
    await removeChallenge(id)
    await loadChallenges()
    toast.success('已删除')
  } catch {
    toast.error('删除失败')
  }
}
async function viewSubmissions(id: string) {
  try {
    const rows = await listChallengeSubmissions(id)
    submissions.value = rows
    for (const r of rows) {
      if (!activeReview[r.id]) activeReview[r.id] = { comment: '', rating: null, saving: false }
    }
    toast('已加载 ' + rows.length + ' 份提交')
  } catch {
    toast.error('加载提交失败')
  }
}
async function saveReview(projectId: string) {
  const rv = activeReview[projectId]
  if (!rv || rv.saving) return
  rv.saving = true
  try {
    await createReview({ projectId, comment: rv.comment || null, rating: rv.rating })
    toast.success('已保存点评')
  } catch {
    toast.error('保存点评失败')
  } finally {
    rv.saving = false
  }
}
async function toggleGallery(s: any) {
  try {
    if (s.showInGallery) {
      await unfeatureSubmission(s.id)
      s.showInGallery = false
      toast('已移出作品墙')
    } else {
      await featureSubmission(s.id)
      s.showInGallery = true
      toast.success('已选入班级作品墙 🏆')
    }
  } catch {
    toast.error('操作失败')
  }
}

function openChallengePanel() {
  showChallenges.value = true
  loadChallenges()
}

onMounted(() => {
  resetStage()
  loadMyProjects()
  loadClasses()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="title"
        class="px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 text-sm font-semibold text-cocoa-900 w-48"
        placeholder="作品名称"
      />
      <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="newProject">＋ 新建</button>
      <button class="px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="saveProject">💾 保存</button>
      <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="showProjects = true">📂 我的作品</button>
      <select
        v-model="presetName"
        class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white focus:outline-none"
        @change="applyPreset()"
      >
        <option value="">📐 示例模板</option>
        <option v-for="p in PRESETS" :key="p.name" :value="p.name">{{ p.name }}</option>
      </select>
      <!-- 作品级发布设置 -->
      <div class="flex items-center gap-2 px-2 border-l border-cream-200">
        <select
          v-model="selectedClassId"
          class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white focus:outline-none"
          @change="publishToParent = false"
        >
          <option :value="null">仅自己可见</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <label
          class="flex items-center gap-1 text-xs font-medium text-cocoa-500 select-none"
          :class="selectedClassId ? '' : 'opacity-40 pointer-events-none'"
        >
          <input type="checkbox" v-model="publishToParent" :disabled="!selectedClassId" />
          开放给家长
        </label>
        <input
          v-model="description"
          class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 w-40 focus:outline-none"
          placeholder="作品描述（选填）"
        />
      </div>
      <div class="flex-1" />
      <!-- 运行 / 调试 -->
      <button class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60" :disabled="running" @click="runProgram">▶ 运行</button>
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
      <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="clearAll">🧹 清空</button>
      <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="openChallengePanel">🎯 任务卡</button>
      <button class="px-3 py-2 rounded-xl border border-cream-200 text-sm text-cocoa-600 hover:bg-cream-50" @click="openPublish">👨‍👩‍👧 开放给家长</button>
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
        <div v-if="!blocks.length" class="text-center text-cocoa-300 py-16 text-sm">画布为空，从左侧拖入积木开始创作</div>
        <div class="space-y-1.5">
          <BlockNode
            v-for="b in blocks"
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
          <span class="text-sm font-semibold text-cocoa-900">舞台</span>
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

    <!-- 我的作品 -->
    <div v-if="showProjects" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showProjects = false">
      <div class="w-full max-w-lg max-h-[80vh] rounded-2xl bg-surface shadow-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-cream-200">
          <h3 class="text-lg font-bold text-cocoa-900">我的作品</h3>
          <button class="text-cocoa-400 hover:text-cocoa-700" @click="showProjects = false">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <div v-if="!myProjects.length" class="text-center text-cocoa-300 py-10 text-sm">还没有保存的作品</div>
          <div v-for="p in myProjects" :key="p.id" class="flex items-center gap-3 p-3 rounded-xl border border-cream-200 hover:bg-cream-50">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cocoa-900 truncate">{{ p.title }}</div>
              <div class="text-xs text-cocoa-400">{{ (p.blocks?.length || 0) }} 个积木</div>
            </div>
            <button class="px-3 py-1.5 rounded-lg bg-butter-500 text-white text-xs" @click="openProject(p.id)">打开</button>
            <button class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-500 text-xs" @click="deleteProject(p.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 开放给家长 -->
    <div v-if="showPublish" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showPublish = false">
      <div class="w-full max-w-lg max-h-[80vh] rounded-2xl bg-surface shadow-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-cream-200">
          <h3 class="text-lg font-bold text-cocoa-900">开放给家长</h3>
          <button class="text-cocoa-400 hover:text-cocoa-700" @click="showPublish = false">✕</button>
        </div>
        <div class="px-5 py-3 text-xs text-cocoa-500 bg-cream-50 border-b border-cream-200">
          默认不开放。开启后，该班级家长可在「少儿编程」菜单查看你发布（已勾选"开放给家长"）的作品。
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <div v-if="!classes.length" class="text-center text-cocoa-300 py-10 text-sm">暂无班级</div>
          <label
            v-for="c in classes"
            :key="c.id"
            class="flex items-center justify-between p-3 rounded-xl border border-cream-200 hover:bg-cream-50 cursor-pointer"
          >
            <span class="text-sm text-cocoa-900">{{ c.name }}</span>
            <button
              type="button"
              class="w-11 h-6 rounded-full flex items-center px-0.5 transition-colors"
              :class="classPublish[c.id] ? 'bg-butter-500 justify-end' : 'bg-cream-300 justify-start'"
              @click="togglePublish(c)"
            >
              <span class="w-5 h-5 rounded-full bg-surface shadow" />
            </button>
          </label>
        </div>
      </div>
    </div>

    <!-- 任务卡与批改 -->
    <div v-if="showChallenges" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showChallenges = false">
      <div class="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-surface shadow-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-cream-200">
          <h3 class="text-lg font-bold text-cocoa-900">任务卡与批改</h3>
          <button class="text-cocoa-400 hover:text-cocoa-700" @click="showChallenges = false">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- 左：任务卡列表 + 新建 -->
          <div class="space-y-3">
            <div class="bg-cream-50 rounded-xl p-3 space-y-2">
              <div class="text-sm font-semibold text-cocoa-900">{{ editingChallengeId ? '编辑挑战' : '发布新挑战' }}</div>
              <input v-model="challengeTitle" class="w-full px-3 py-2 rounded-lg border border-cream-200 text-sm" placeholder="挑战标题，如：画一个正方形" />
              <textarea v-model="challengeGoal" rows="2" class="w-full px-3 py-2 rounded-lg border border-cream-200 text-sm" placeholder="任务说明（学生看到的学习目标）" />
              <select v-model="challengeClassId" class="w-full px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white">
                <option :value="null">发布到全部班级（按班级查收）</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <label class="flex items-center gap-2 text-xs text-cocoa-500">
                <input type="checkbox" v-model="challengeUseCanvas" /> 用当前画布作为起始模板
              </label>
              <div class="flex gap-2">
                <button class="px-3 py-1.5 rounded-lg bg-butter-500 text-white text-xs font-medium hover:bg-butter-600" @click="saveChallenge">{{ editingChallengeId ? '更新' : '发布' }}</button>
                <button class="px-3 py-1.5 rounded-lg border border-cream-200 text-xs text-cocoa-600 hover:bg-cream-50" @click="newChallenge">清空</button>
              </div>
            </div>
            <div class="space-y-2">
              <div class="text-xs font-semibold text-cocoa-400">我的挑战（{{ challenges.length }}）</div>
              <div v-if="!challenges.length" class="text-center text-cocoa-300 py-6 text-sm">还没有挑战</div>
              <div v-for="c in challenges" :key="c.id" class="p-3 rounded-xl border border-cream-200 hover:bg-cream-50">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-cocoa-900 truncate">{{ c.title }}</div>
                    <div class="text-xs text-cocoa-400 line-clamp-2">{{ c.goal || '（无说明）' }}</div>
                  </div>
                  <div class="flex flex-col gap-1 shrink-0">
                    <button class="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs" @click="viewSubmissions(c.id)">批改</button>
                    <button class="px-2 py-1 rounded border border-cream-200 text-cocoa-500 text-xs" @click="editChallenge(c)">编辑</button>
                    <button class="px-2 py-1 rounded border border-rose-200 text-rose-500 text-xs" @click="deleteChallenge(c.id)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右：提交与点评 -->
          <div class="space-y-2">
            <div class="text-xs font-semibold text-cocoa-400">学生提交（点左侧「批改」加载）</div>
            <div v-if="!submissions.length" class="text-center text-cocoa-300 py-10 text-sm">暂无提交</div>
            <div v-for="s in submissions" :key="s.id" class="p-3 rounded-xl border border-cream-200 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-cocoa-900 truncate">{{ s.title }}</span>
                <span class="text-xs text-cocoa-400">{{ s.submitted ? '✅ 已提交' : '📝 草稿' }}</span>
              </div>
              <div class="text-xs text-cocoa-400">学生 {{ s.studentId }} · {{ (s.blocks?.length || 0) }} 个积木</div>
              <button
                class="mt-1 px-2 py-1 rounded text-xs font-medium"
                :class="s.showInGallery ? 'bg-amber-100 text-amber-700' : 'border border-amber-200 text-amber-600'"
                @click="toggleGallery(s)"
              >{{ s.showInGallery ? '🏆 已在作品墙' : '选入作品墙' }}</button>
              <textarea v-model="activeReview[s.id].comment" rows="2" class="w-full px-2 py-1.5 rounded-lg border border-cream-200 text-sm" placeholder="老师评语…" />
              <div class="flex items-center gap-2">
                <select v-model="activeReview[s.id].rating" class="px-2 py-1.5 rounded-lg border border-cream-200 text-sm text-cocoa-700 bg-white">
                  <option :value="null">评分（不选）</option>
                  <option :value="5">⭐⭐⭐⭐⭐</option>
                  <option :value="4">⭐⭐⭐⭐</option>
                  <option :value="3">⭐⭐⭐</option>
                  <option :value="2">⭐⭐</option>
                  <option :value="1">⭐</option>
                </select>
                <button class="px-3 py-1.5 rounded-lg bg-butter-500 text-white text-xs font-medium hover:bg-butter-600 disabled:opacity-60" :disabled="activeReview[s.id].saving" @click="saveReview(s.id)">保存点评</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
