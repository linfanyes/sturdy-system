<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 模式切换：班级课表 / 教师课表（两个不同功能，均支持编辑） -->
    <view class="tabs">
      <view class="tab" :class="{ on: mode === 'class' }" @click="switchMode('class')">班级课表</view>
      <view class="tab" :class="{ on: mode === 'teacher' }" @click="switchMode('teacher')">教师课表</view>
    </view>

    <picker v-if="mode === 'class'" :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <view v-else class="picker ro">教师：{{ meName }}（本人任教课程）</view>

    <view v-if="mode === 'class'" class="teach-bar">
      <text class="tstat">共 {{ teachStat.lessons }} 节课 · {{ teachStat.teachers }} 位教师</text>
      <view class="tbtns">
        <text class="tbtn" @click="showTeach = true">任教设置</text>
        <text class="tbtn auto" @click="openAuto">自动排课</text>
      </view>
    </view>

    <view class="legend">
      <text class="lg lg-all">全周</text>
      <text class="lg lg-single">单周</text>
      <text class="lg lg-double">双周</text>
    </view>

    <view class="grid">
      <view class="row head">
        <view class="cell col">节次</view>
        <view class="cell col" v-for="d in days" :key="d.k">{{ d.label }}</view>
      </view>
      <view class="row" v-for="p in periods" :key="p">
        <view class="cell col idx">{{ p }}</view>
        <view
          class="cell"
          v-for="d in days"
          :key="d.k"
          :class="cellClass(d.k, p)"
          @click="onCell(d.k, p)"
        >
          <block v-for="it in cellItems(d.k, p)" :key="it.id">
            <view class="subj">{{ it.subject }}</view>
            <view class="tea" v-if="mode === 'teacher' && it.classId">{{ className(it.classId) }}</view>
            <view class="tea" v-else-if="it.teacher">{{ it.teacher }}</view>
            <view class="tag" v-if="it.section">{{ it.section }}</view>
          </block>
          <view class="empty" v-if="!cellItems(d.k, p).length">—</view>
        </view>
      </view>
    </view>
    <view v-if="!items.length" class="empty-tip">
      {{ mode === 'class' ? '请选择班级并添加课程' : '暂无本人任教课程，点击格子添加' }}
    </view>

    <!-- 新增/编辑弹层 -->
    <view class="mask" v-if="showEdit" @click="showEdit = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">编辑课程（{{ dowLabel(edit.dayOfWeek) }} 第{{ edit.period }}节）</view>
        <input v-model="edit.subject" class="inp" placeholder="科目" />
        <template v-if="mode === 'teacher'">
          <picker :range="classOpts" @change="(e) => (editClassId = classes[e.detail.value].id)">
            <view class="picker sm">{{ className(editClassId) || '选择班级' }}</view>
          </picker>
          <view class="ro">任教教师：{{ meName }}</view>
        </template>
        <template v-else>
          <input v-model="edit.teacher" class="inp" placeholder="教师（可选）" />
        </template>
        <input v-model="edit.section" class="inp" placeholder="节次类型（早读/晚自习等，可选）" />
        <picker :range="weekOpts" @change="(e) => (edit.weekType = weekVals[e.detail.value])">
          <view class="picker sm">{{ weekLabel(edit.weekType) }}</view>
        </picker>
        <view class="sh-bar">
          <button class="btn del" v-if="edit.id" @click="removeItem">删除</button>
          <button class="btn ok" @click="saveItem">保存</button>
        </view>
      </view>
    </view>

    <!-- 任教设置弹层 -->
    <view class="mask" v-if="showTeach" @click="showTeach = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">设置任课教师（{{ selName }}）</view>
        <picker :range="classSubjects" @change="onTeachSubject">
          <view class="picker sm">{{ teachForm.subject || '选择科目' }}</view>
        </picker>
        <input v-model="teachForm.teacher" class="inp" placeholder="任教教师姓名" />
        <view class="sh-bar">
          <button class="btn ok" @click="saveTeach">保存</button>
        </view>
      </view>
    </view>

    <!-- 自动排课弹层 -->
    <view class="mask" v-if="showAuto" @click="showAuto = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">自动排课（{{ selName }}）</view>
        <view class="hint">按科目均匀轮转填充课表，可仅补齐空白或覆盖重建（替代 Web 拖拽自动排版）。</view>
        <input v-model="autoForm.subjectsText" class="inp" placeholder="科目列表，逗号分隔，如：语文,数学,英语,体育" />
        <picker :range="dayOpts" @change="(e) => (autoForm.days = dayVals[e.detail.value])">
          <view class="picker sm">每周天数：{{ autoForm.days }} 天</view>
        </picker>
        <picker :range="periodOpts" @change="(e) => (autoForm.periods = periodVals[e.detail.value])">
          <view class="picker sm">每天节数：{{ autoForm.periods }} 节</view>
        </picker>
        <picker :range="startOpts" @change="(e) => (autoForm.start = startVals[e.detail.value])">
          <view class="picker sm">起始节次：第 {{ autoForm.start }} 节</view>
        </picker>
        <view class="sw-row">
          <text>覆盖已有课程</text>
          <switch :checked="autoForm.cover" @change="(e) => (autoForm.cover = e.detail.value)" color="#07c160" />
        </view>
        <view class="sh-bar">
          <button class="btn del" @click="showAuto = false">取消</button>
          <button class="btn ok" @click="confirmAuto">生成并保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'

const days = [
  { k: 0, label: '周一' },
  { k: 1, label: '周二' },
  { k: 2, label: '周三' },
  { k: 3, label: '周四' },
  { k: 4, label: '周五' },
  { k: 5, label: '周六' },
  { k: 6, label: '周日' },
]
const periods = [1, 2, 3, 4, 5, 6, 7, 8]
const weekVals = ['all', 'single', 'double']
const weekOpts = ['全周', '单周', '双周']

const mode = ref('class') // class | teacher
const classes = ref([])
const classId = ref('')
const items = ref([])
const showEdit = ref(false)
const edit = ref({ id: '', dayOfWeek: 0, period: 1, subject: '', teacher: '', section: '', weekType: 'all' })
const editClassId = ref('')
const showTeach = ref(false)
const teachForm = ref({ subject: '', teacher: '' })
const showAuto = ref(false)
const dayOpts = ['5 天', '6 天', '7 天']
const dayVals = [5, 6, 7]
const periodOpts = ['6 节', '7 节', '8 节']
const periodVals = [6, 7, 8]
const startOpts = ['第 1 节', '第 2 节', '第 3 节']
const startVals = [1, 2, 3]
const autoForm = ref({ subjectsText: '', days: 5, periods: 8, start: 1, cover: false })
const teachStat = computed(() => {
  if (mode.value !== 'class') return { lessons: 0, teachers: 0 }
  const t = new Set(items.value.map((s) => s.teacher).filter(Boolean))
  return { lessons: items.value.length, teachers: t.size }
})
const classSubjects = computed(() => Array.from(new Set(items.value.map((s) => s.subject).filter(Boolean))))

const meName = computed(() => (auth.user && auth.user.name) || '')
const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
function className(id) {
  const c = classes.value.find((x) => x.id === id)
  return c ? c.name : ''
}

function dowLabel(k) {
  return (days.find((d) => d.k === k) || {}).label || ''
}
function weekLabel(v) {
  return weekVals.indexOf(v) >= 0 ? weekOpts[weekVals.indexOf(v)] : '全周'
}

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (!classId.value && classes.value.length) classId.value = classes.value[0].id
  await loadItems()
}
async function loadItems() {
  if (mode.value === 'class') {
    if (!classId.value) {
      items.value = []
      return
    }
    items.value = (await api.get('/schedules')).filter((s) => s.classId === classId.value)
  } else {
    // 教师课表：展示本人任教的全部课程（跨班级）
    const me = meName.value.trim()
    const all = await api.get('/schedules')
    items.value = me ? all.filter((s) => (s.teacher || '').trim() === me) : []
  }
}
function switchMode(m) {
  if (mode.value === m) return
  mode.value = m
  showEdit.value = false
  loadItems()
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  loadItems()
}

function cellItems(day, period) {
  return items.value.filter((s) => s.dayOfWeek === day && s.period === period)
}
function cellClass(day, period) {
  const arr = cellItems(day, period)
  if (!arr.length) return 'cell idle'
  const types = arr.map((a) => a.weekType || 'all')
  if (types.every((t) => t === 'single')) return 'cell single'
  if (types.every((t) => t === 'double')) return 'cell double'
  return 'cell all'
}

function onCell(day, period) {
  const arr = cellItems(day, period)
  const first = arr[0] || {}
  edit.value = {
    id: first.id || '',
    dayOfWeek: day,
    period,
    subject: first.subject || '',
    teacher: first.teacher || (mode.value === 'teacher' ? meName.value : ''),
    section: first.section || '',
    weekType: first.weekType || 'all',
  }
  editClassId.value = first.classId || (mode.value === 'teacher' ? classId.value || (classes.value[0] && classes.value[0].id) || '' : classId.value)
  showEdit.value = true
}

async function saveItem() {
  if (!edit.value.subject) return uni.showToast({ title: '请填科目', icon: 'none' })
  const isTeacher = mode.value === 'teacher'
  const payload = {
    classId: isTeacher ? editClassId.value : classId.value,
    dayOfWeek: edit.value.dayOfWeek,
    period: edit.value.period,
    subject: edit.value.subject,
    teacher: isTeacher ? meName.value : edit.value.teacher,
    section: edit.value.section,
    weekType: edit.value.weekType,
  }
  try {
    if (edit.value.id) {
      await api.patch('/schedules/' + edit.value.id, payload)
    } else {
      await api.post('/schedules', payload)
    }
    showEdit.value = false
    await loadItems()
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  }
}
async function removeItem() {
  try {
    await api.del('/schedules/' + edit.value.id)
    showEdit.value = false
    await loadItems()
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function onTeachSubject(e) {
  teachForm.value.subject = classSubjects.value[e.detail.value]
}
async function saveTeach() {
  if (!teachForm.value.subject) return uni.showToast({ title: '请选择科目', icon: 'none' })
  if (!teachForm.value.teacher.trim()) return uni.showToast({ title: '请填教师', icon: 'none' })
  const targets = items.value.filter((s) => s.subject === teachForm.value.subject)
  if (!targets.length) return uni.showToast({ title: '该班级无此科目课程', icon: 'none' })
  uni.showLoading({ title: '设置中…' })
  try {
    await Promise.all(targets.map((s) => api.patch('/schedules/' + s.id, { teacher: teachForm.value.teacher.trim() })))
    uni.showToast({ title: '已设置任课教师', icon: 'none' })
    showTeach.value = false
    await loadItems()
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 自动排课：基于科目列表均匀轮转填充（替代 Web 拖拽自动排版，受小程序平台限制）
function openAuto() {
  const subs = Array.from(new Set(items.value.map((s) => s.subject).filter(Boolean)))
  autoForm.value = { subjectsText: subs.join(','), days: 5, periods: 8, start: 1, cover: false }
  showAuto.value = true
}
function buildPlan() {
  const subs = autoForm.value.subjectsText.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)
  if (!subs.length) return { ok: false, err: '请填写科目列表' }
  const dN = autoForm.value.days
  const pN = autoForm.value.periods
  const st = autoForm.value.start
  if (st + pN - 1 > 8) return { ok: false, err: '节次超出范围（最大第 8 节）' }
  if (dN > 7) return { ok: false, err: '天数超出范围（最大 7 天）' }
  const plan = []
  let idx = 0
  for (let d = 0; d < dN; d++) {
    const row = []
    for (let p = 0; p < pN; p++) {
      row.push(subs[(idx + d) % subs.length])
      idx++
    }
    plan.push(row)
  }
  return { ok: true, plan }
}
async function confirmAuto() {
  const r = buildPlan()
  if (!r.ok) return uni.showToast({ title: r.err, icon: 'none' })
  const total = autoForm.value.days * autoForm.value.periods
  uni.showModal({
    title: '确认排课',
    content: `将${autoForm.value.cover ? '覆盖重建' : '补齐空白'}本班课表，共 ${total} 格，确认？`,
    success: async (m) => {
      if (m.confirm) await doSavePlan(r.plan)
    },
  })
}
async function doSavePlan(plan) {
  const dN = autoForm.value.days
  const pN = autoForm.value.periods
  const st = autoForm.value.start
  uni.showLoading({ title: '排课中…' })
  try {
    if (autoForm.value.cover) {
      await Promise.all(items.value.map((s) => api.del('/schedules/' + s.id)))
    }
    const jobs = []
    for (let d = 0; d < dN; d++) {
      for (let p = 0; p < pN; p++) {
        const period = st + p
        const dow = d
        const existing = items.value.find((s) => s.dayOfWeek === dow && s.period === period)
        if (existing && !autoForm.value.cover) continue
        const payload = {
          classId: classId.value,
          dayOfWeek: dow,
          period,
          subject: plan[d][p],
          teacher: '',
          section: '',
          weekType: 'all',
        }
        jobs.push(existing ? api.patch('/schedules/' + existing.id, payload) : api.post('/schedules', payload))
      }
    }
    await Promise.all(jobs)
    uni.showToast({ title: '排课完成', icon: 'none' })
    showAuto.value = false
    await loadItems()
  } catch (e) {
    uni.showToast({ title: '排课失败：' + (e.message || ''), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; font-size: 28rpx; background: var(--c-card); color: var(--c-sub); border: 1px solid var(--c-border); }
.tab.on { background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%); color: #5a3e1b; font-weight: 700; border-color: transparent; }
.dark .tab { background: var(--c-card); color: var(--c-sub); }
.dark .tab.on { background: linear-gradient(135deg, #2a2f3a 0%, #383f4d 100%); color: #f2f2f2; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 16rpx; font-size: 28rpx; }
.picker.ro { background: #fff7ec; color: #a07b3b; font-weight: 600; }
.legend { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.teach-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; background: #fff7ec; border-radius: 12rpx; padding: 14rpx 20rpx; }
.tstat { font-size: 24rpx; color: #a07b3b; }
.tbtns { display: flex; gap: 14rpx; }
.tbtn { font-size: 24rpx; color: #fff; background: #e6a23c; padding: 10rpx 24rpx; border-radius: 30rpx; }
.tbtn.auto { background: #07c160; }
.dark .teach-bar { background: var(--c-card2); }
.dark .tstat { color: var(--c-accent); }
.lg { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; color: #fff; }
.lg-all { background: #e6a23c; }
.lg-single { background: #67c23a; }
.lg-double { background: #409eff; }
.grid { border: 1px solid #eee; border-radius: 12rpx; overflow: hidden; }
.row { display: flex; }
.row.head { background: #f7f1e6; }
.cell { flex: 1; min-height: 78rpx; border: 1px solid #f0f0f0; padding: 6rpx 8rpx; box-sizing: border-box; font-size: 22rpx; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.cell.col { flex: 0 0 64rpx; background: #f7f1e6; color: #4a3f35; font-weight: 600; }
.cell.idx { font-weight: 700; }
.cell.idle .empty { color: #ccc; }
.cell.all { background: #fff8ec; }
.cell.single { background: #eef9e8; }
.cell.double { background: #e8f1fb; }
.subj { font-weight: 700; color: #4a3f35; }
.tea { color: #9aa0a6; font-size: 20rpx; }
.tag { color: #a07b3b; font-size: 20rpx; }
.empty-tip { text-align: center; color: #9aa0a6; padding: 50rpx 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: #4a3f35; margin-bottom: 20rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; font-size: 28rpx; background: #fff; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 20rpx; font-size: 28rpx; background: #fff; }
.ro { font-size: 26rpx; color: #a07b3b; background: #fff7ec; border-radius: 12rpx; padding: 14rpx 16rpx; margin-bottom: 16rpx; }
.hint { font-size: 22rpx; color: #9aa0a6; line-height: 1.5; margin-bottom: 16rpx; }
.sw-row { display: flex; align-items: center; justify-content: space-between; font-size: 26rpx; color: #4a3f35; margin-bottom: 20rpx; }
.sh-bar { display: flex; gap: 20rpx; }
.btn { flex: 1; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.btn.ok { background: #07c160; }
.btn.del { background: #e06c75; flex: 0 0 200rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .sheet { background: var(--c-card); }
.dark .picker.ro { background: var(--c-card2); color: var(--c-accent); }
.dark .row.head, .dark .cell.col { background: var(--c-card2); }
.dark .cell { border-color: var(--c-input-border); }
.dark .cell.all { background: var(--c-card2); }
.dark .cell.single { background: #22351c; }
.dark .cell.double { background: #1c2b35; }
.dark .subj { color: var(--c-title); }
.dark .tea { color: var(--c-sub); }
.dark .tag { color: var(--c-accent); }
.dark .inp, .dark .picker.sm, .dark .ro { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .lg-all { background: var(--c-accent); }
</style>
