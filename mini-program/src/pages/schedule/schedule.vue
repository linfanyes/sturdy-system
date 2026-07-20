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
    <view v-else class="picker ro">教师：{{ meName }}（本人任教课程）<text class="exp-link" @click="copyTeacherSchedule">📋 复制课表</text></view>

    <view v-if="mode === 'class'" class="teach-bar">
      <text class="tstat">共 {{ teachStat.lessons }} 节课 · {{ teachStat.teachers }} 位教师</text>
      <view class="tbtns">
        <text class="tbtn" @click="showTeach = true">任教设置</text>
        <text class="tbtn auto" @click="openAuto">自动排课</text>
        <text class="tbtn print" @click="openPrint">🖨 排版打印</text>
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
      {{ mode === 'class'
        ? '请选择班级并添加课程'
        : '暂无您的任教课程。请确认课表「教师」栏填写的姓名与通讯录一致；或在「班级课表」点击格子，任教教师填您的姓名后保存。' }}
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
          <button class="btn del" v-if="edit.id" :disabled="saving" @click="removeItem">{{ saving ? '删除中…' : '删除' }}</button>
          <button class="btn ok" :disabled="saving" @click="saveItem">{{ saving ? '保存中…' : '保存' }}</button>
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
          <button class="btn ok" :disabled="savingTeach" @click="saveTeach">{{ savingTeach ? '保存中…' : '保存' }}</button>
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
          <button class="btn ok" :disabled="savingPlan" @click="confirmAuto">{{ savingPlan ? '排课中…' : '生成并保存' }}</button>
        </view>
      </view>
    </view>

    <!-- 排版打印：canvas 渲染课表为图片，可保存到相册或复制为文本 -->
    <view class="mask" v-if="showPrint" @click="showPrint = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ selName }} 课表排版</view>
        <view class="hint">选择排版样式后生成图片，可保存到相册打印。</view>
        <picker :range="printStyleOpts" :value="printStyleIdx" @change="(e) => (printStyleIdx = e.detail.value)">
          <view class="picker sm">{{ printStyleOpts[printStyleIdx] }}</view>
        </picker>
        <scroll-view scroll-y class="print-preview">
          <canvas canvas-id="scheduleCanvas" id="scheduleCanvas" class="print-canvas" :style="{ width: canvasW + 'px', height: canvasH + 'px' }"></canvas>
        </scroll-view>
        <view class="sh-bar">
          <button class="btn del" @click="showPrint = false">关闭</button>
          <button class="btn ok" :disabled="printing" @click="saveImage">{{ printing ? '生成中…' : '🖼 生成并保存图片' }}</button>
          <button class="btn" @click="copyAsText">📋 复制文本</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api, { batchRun } from '../../common/request'
import { auth, theme } from '../../common/store'
import { isInt } from '../../common/validators'
import { copyText } from '../../common/print'

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
const saving = ref(false)
const savingTeach = ref(false)
const savingPlan = ref(false)
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
// 排版打印相关状态
const showPrint = ref(false)
const printing = ref(false)
const printStyleOpts = ['紧凑表格（5天×8节）', '宽松表格（含节次名）', '仅任教课程']
const printStyleIdx = ref(0)
const canvasW = ref(360)
const canvasH = ref(480)
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
    // 匹配本人姓名；若通讯录带有工号(employeeNo/no)，则一并匹配工号写法，避免后端存工号时恒空
    const me = meName.value.trim()
    const emp = auth.user && (auth.user.employeeNo || auth.user.no || '')
      ? String(auth.user.employeeNo || auth.user.no).trim()
      : ''
    const all = await api.get('/schedules')
    items.value = (me || emp)
      ? all.filter((s) => {
          const t = (s.teacher || '').trim()
          return (me && t === me) || (emp && t === emp)
        })
      : []
  }
}
function switchMode(m) {
  if (mode.value === m) return
  mode.value = m
  showEdit.value = false
  loadItems()
}
// 教师课表：复制为文本
function copyTeacherSchedule() {
  if (!items.value.length) return uni.showToast({ title: '暂无课表可导出', icon: 'none' })
  const lines = [`${meName.value} 老师课表`, '']
  lines.push('节次\t' + days.map((d) => d.label).join('\t'))
  for (let p = 1; p <= 8; p++) {
    const row = ['第' + p + '节']
    for (let d = 0; d < 7; d++) {
      const arr = items.value.filter((s) => s.dayOfWeek === d && s.period === p)
      row.push(arr.map((a) => a.subject).join('/') || '—')
    }
    lines.push(row.join('\t'))
  }
  copyText(lines.join('\n'))
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
  if (saving.value) return
  if (!edit.value.subject) return uni.showToast({ title: '请填科目', icon: 'none' })
  if (!isInt(edit.value.period, 1, 8)) return uni.showToast({ title: '节次应为 1-8', icon: 'none' })
  if (!isInt(edit.value.dayOfWeek, 0, 6)) return uni.showToast({ title: '周几应为 0-6', icon: 'none' })
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
  saving.value = true
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
  } finally {
    saving.value = false
  }
}
async function removeItem() {
  if (saving.value) return
  uni.showLoading({ title: '删除中…', mask: true })
  saving.value = true
  try {
    await api.del('/schedules/' + edit.value.id)
    showEdit.value = false
    await loadItems()
    uni.showToast({ title: '已删除', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  } finally {
    uni.hideLoading()
    saving.value = false
  }
}

function onTeachSubject(e) {
  teachForm.value.subject = classSubjects.value[e.detail.value]
}
async function saveTeach() {
  if (savingTeach.value) return
  if (!teachForm.value.subject) return uni.showToast({ title: '请选择科目', icon: 'none' })
  if (!teachForm.value.teacher.trim()) return uni.showToast({ title: '请填教师', icon: 'none' })
  const targets = items.value.filter((s) => s.subject === teachForm.value.subject)
  if (!targets.length) return uni.showToast({ title: '该班级无此科目课程', icon: 'none' })
  uni.showLoading({ title: '设置中…' })
  savingTeach.value = true
  try {
    const { success, failed } = await batchRun(
      targets.map((s) => api.patch('/schedules/' + s.id, { teacher: teachForm.value.teacher.trim() })),
    )
    if (failed === 0) {
      uni.showToast({ title: `已设置 ${success} 节课任课教师`, icon: 'success' })
    } else {
      uni.showToast({ title: `成功 ${success} 失败 ${failed}`, icon: 'none' })
    }
    showTeach.value = false
    await loadItems()
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  } finally {
    uni.hideLoading()
    savingTeach.value = false
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
  if (savingPlan.value) return
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
  if (savingPlan.value) return
  const dN = autoForm.value.days
  const pN = autoForm.value.periods
  const st = autoForm.value.start
  uni.showLoading({ title: '排课中…' })
  savingPlan.value = true
  try {
    if (autoForm.value.cover && items.value.length) {
      const dr = await batchRun(items.value.map((s) => api.del('/schedules/' + s.id)))
      if (dr.failed > 0) {
        uni.showToast({ title: `覆盖删除失败 ${dr.failed} 条，已中止`, icon: 'none' })
        return
      }
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
    const { success, failed } = await batchRun(jobs)
    if (failed === 0) {
      uni.showToast({ title: `排课完成 ${success} 节`, icon: 'success' })
    } else {
      uni.showToast({ title: `成功 ${success} 失败 ${failed}`, icon: 'none' })
    }
    showAuto.value = false
    await loadItems()
  } catch (e) {
    uni.showToast({ title: '排课失败：' + (e.message || ''), icon: 'none' })
  } finally {
    uni.hideLoading()
    savingPlan.value = false
  }
}

// —— 课表排版打印 ——
// 打开打印面板：先按当前班级课表数据计算 canvas 尺寸并预渲染
function openPrint() {
  if (mode.value !== 'class') {
    return uni.showToast({ title: '请切到班级课表再打印', icon: 'none' })
  }
  if (!classId.value) {
    return uni.showToast({ title: '请先选择班级', icon: 'none' })
  }
  showPrint.value = true
  // 等下一帧 canvas 挂载后再渲染
  setTimeout(() => renderScheduleCanvas(), 60)
}

// 渲染课表到 canvas：根据样式 idx 选择布局
function renderScheduleCanvas() {
  const ctx = uni.createCanvasContext('scheduleCanvas')
  const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2
  const dayCount = printStyleIdx.value === 2 ? 7 : (printStyleIdx.value === 1 ? 7 : 5)
  const periodCount = printStyleIdx.value === 1 ? 8 : 8
  // 单元格尺寸（按 5天8节 紧凑布局算）
  const cellW = 56
  const cellH = printStyleIdx.value === 1 ? 56 : 44
  const labelW = 50
  const headH = 50
  const titleH = 60
  const pad = 20
  const W = pad * 2 + labelW + dayCount * cellW
  const H = pad * 2 + titleH + headH + periodCount * cellH
  canvasW.value = W
  canvasH.value = H
  // 等尺寸生效后再画
  setTimeout(() => {
    // 背景
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, W, H)
    // 标题
    ctx.setFillStyle('#222')
    ctx.setFontSize(20)
    ctx.setTextAlign('center')
    ctx.fillText(`${selName.value} 课表`, W / 2, pad + 28)
    ctx.setFontSize(11)
    ctx.setFillStyle('#888')
    ctx.fillText(`生成于 ${new Date().toLocaleString('zh-CN')}`, W / 2, pad + 50)
    // 表头
    const daysList = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].slice(0, dayCount)
    let x0 = pad + labelW
    let y0 = pad + titleH
    ctx.setFillStyle('#f5f7fa')
    ctx.fillRect(x0, y0, dayCount * cellW, headH)
    ctx.setFillStyle('#333')
    ctx.setFontSize(13)
    ctx.setTextAlign('center')
    daysList.forEach((d, i) => {
      ctx.fillText(d, x0 + i * cellW + cellW / 2, y0 + headH / 2 + 4)
    })
    // 节次列
    for (let p = 0; p < periodCount; p++) {
      const y = y0 + headH + p * cellH
      ctx.setFillStyle('#f5f7fa')
      ctx.fillRect(pad, y, labelW, cellH)
      ctx.setFillStyle('#555')
      ctx.setFontSize(12)
      ctx.fillText(`第${p + 1}节`, pad + labelW / 2, y + cellH / 2 + 4)
    }
    // 课表内容
    ctx.setFontSize(13)
    for (let d = 0; d < dayCount; d++) {
      for (let p = 0; p < periodCount; p++) {
        const arr = cellItems(d, p + 1)
        const x = x0 + d * cellW
        const y = y0 + headH + p * cellH
        // 单元格背景
        if (arr.length) {
          const types = arr.map((a) => a.weekType || 'all')
          let bg = '#e8f4ff'
          if (types.every((t) => t === 'single')) bg = '#fff4e6'
          else if (types.every((t) => t === 'double')) bg = '#e6fffb'
          ctx.setFillStyle(bg)
          ctx.fillRect(x, y, cellW, cellH)
        }
        // 边框
        ctx.setStrokeStyle('#d0d7de')
        ctx.setLineWidth(0.5)
        ctx.strokeRect(x, y, cellW, cellH)
        // 文字
        if (arr.length) {
          const subj = arr.map((a) => a.subject).filter(Boolean).join('/')
          const tea = arr.map((a) => a.teacher).filter(Boolean).join('/')
          ctx.setFillStyle('#222')
          ctx.setFontSize(13)
          ctx.fillText(subj || '', x + cellW / 2, y + cellH / 2)
          if (tea && printStyleIdx.value !== 0) {
            ctx.setFillStyle('#888')
            ctx.setFontSize(10)
            ctx.fillText(tea, x + cellW / 2, y + cellH / 2 + 14)
          }
        }
      }
    }
    // 图例
    const lgY = pad + titleH + headH + periodCount * cellH + 20
    if (lgY + 20 < H) {
      ctx.setFontSize(10)
      ctx.setTextAlign('left')
      ctx.setFillStyle('#e8f4ff')
      ctx.fillRect(pad, lgY, 14, 14)
      ctx.setFillStyle('#555')
      ctx.fillText('全周', pad + 20, lgY + 11)
      ctx.setFillStyle('#fff4e6')
      ctx.fillRect(pad + 70, lgY, 14, 14)
      ctx.setFillStyle('#555')
      ctx.fillText('单周', pad + 90, lgY + 11)
      ctx.setFillStyle('#e6fffb')
      ctx.fillRect(pad + 140, lgY, 14, 14)
      ctx.setFillStyle('#555')
      ctx.fillText('双周', pad + 160, lgY + 11)
    }
    ctx.draw()
  }, 50)
}

// 保存 canvas 为图片到相册
async function saveImage() {
  if (printing.value) return
  printing.value = true
  try {
    // 先重新渲染确保最新
    await new Promise((resolve) => {
      renderScheduleCanvas()
      setTimeout(resolve, 120)
    })
    const res = await new Promise((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: 'scheduleCanvas',
        fileType: 'png',
        quality: 1,
        success: resolve,
        fail: reject,
      })
    })
    await new Promise((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: resolve,
        fail: reject,
      })
    })
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e) {
    // 拒绝相册权限时降级为复制文本
    if (String(e?.errMsg || '').includes('auth') || String(e?.errMsg || '').includes('deny')) {
      uni.showModal({
        title: '无相册权限',
        content: '已为你复制课表文本，可粘贴到任意应用打印',
        showCancel: false,
        success: () => copyAsText(),
      })
    } else {
      uni.showToast({ title: '保存失败：' + (e?.errMsg || ''), icon: 'none' })
    }
  } finally {
    printing.value = false
  }
}

// 复制课表为纯文本（备用方案）
function copyAsText() {
  const dayCount = 5
  const lines = [`${selName.value} 课表（生成于 ${new Date().toLocaleString('zh-CN')}）`, '']
  const daysList = ['周一', '周二', '周三', '周四', '周五']
  lines.push('节次\t' + daysList.join('\t'))
  for (let p = 1; p <= 8; p++) {
    const row = [`第${p}节`]
    for (let d = 0; d < dayCount; d++) {
      const arr = cellItems(d, p)
      row.push(arr.map((a) => a.subject + (a.teacher ? `(${a.teacher})` : '')).join(',') || '—')
    }
    lines.push(row.join('\t'))
  }
  uni.setClipboardData({
    data: lines.join('\n'),
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; font-size: 28rpx; background: var(--c-card); color: var(--c-sub); border: 1px solid var(--c-border); }
.tab.on { background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%); color: #5a3e1b; font-weight: 700; border-color: transparent; }
.dark .tab { background: var(--c-card); color: var(--c-sub); }
.dark .tab.on { background: linear-gradient(135deg, #2a2f3a 0%, #383f4d 100%); color: #f2f2f2; }
.picker { background: var(--c-card); border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 16rpx; font-size: 28rpx; }
.picker.ro { background: var(--c-card2); color: var(--c-accent); font-weight: 600; }
.legend { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.teach-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 20rpx; }
.tstat { font-size: 24rpx; color: var(--c-accent); }
.tbtns { display: flex; gap: 14rpx; }
.tbtn { font-size: 24rpx; color: #fff; background: var(--c-accent); padding: 10rpx 24rpx; border-radius: 30rpx; }
.tbtn.auto { background: var(--c-primary); }
.tbtn.print { background: #409eff; }
.dark .teach-bar { background: var(--c-card2); }
.dark .tstat { color: var(--c-accent); }
.lg { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; color: #fff; }
.lg-all { background: #e6a23c; }
.lg-single { background: #67c23a; }
.lg-double { background: #409eff; }
.grid { border: 1px solid var(--c-border); border-radius: 12rpx; overflow: hidden; }
.row { display: flex; }
.row.head { background: var(--c-card2); }
.cell { flex: 1; min-height: 78rpx; border: 1px solid var(--c-border); padding: 6rpx 8rpx; box-sizing: border-box; font-size: 22rpx; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.cell.col { flex: 0 0 64rpx; background: var(--c-card2); color: var(--c-title); font-weight: 600; }
.cell.idx { font-weight: 700; }
.cell.idle .empty { color: var(--c-border); }
.cell.all { background: var(--c-card2); }
.cell.single { background: var(--c-card2); }
.cell.double { background: var(--c-card2); }
.subj { font-weight: 700; color: var(--c-title); }
.tea { color: var(--c-sub); font-size: 20rpx; }
.tag { color: var(--c-accent); font-size: 20rpx; }
.empty-tip { text-align: center; color: var(--c-sub); padding: 50rpx 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; font-size: 28rpx; background: var(--c-input); }
.picker.sm { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 20rpx; font-size: 28rpx; background: var(--c-input); }
.ro { font-size: 26rpx; color: var(--c-accent); background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 16rpx; margin-bottom: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.exp-link { font-size: 22rpx; color: var(--c-primary); padding: 4rpx 12rpx; border-radius: 12rpx; background: rgba(7,193,96,.1); flex-shrink: 0; }
.hint { font-size: 22rpx; color: var(--c-sub); line-height: 1.5; margin-bottom: 16rpx; }
.sw-row { display: flex; align-items: center; justify-content: space-between; font-size: 26rpx; color: var(--c-title); margin-bottom: 20rpx; }
.sh-bar { display: flex; gap: 20rpx; }
/* 打印预览 */
.print-preview { max-height: 60vh; margin: 16rpx 0; }
.print-canvas { background: #fff; display: block; margin: 0 auto; }
.btn { flex: 1; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.btn.ok { background: var(--c-primary); }
.btn.del { background: var(--c-danger); flex: 0 0 200rpx; }
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
