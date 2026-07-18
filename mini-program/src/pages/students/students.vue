<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">{{ className }}</view>

    <view class="toolbar">
      <input v-model="kw" class="search" placeholder="搜索姓名/学号" />
      <picker :range="genderOpts" @change="(e) => (genderFilter = genderOpts[e.detail.value])">
        <view class="mini-picker">{{ genderFilter }}</view>
      </picker>
      <picker :range="sortOpts" @change="(e) => (sortBy = sortVals[e.detail.value])">
        <view class="mini-picker">{{ sortLabel }}</view>
      </picker>
    </view>
    <view class="toolbar2">
      <text class="tbtn" :class="batchMode && 'on'" @click="batchMode = !batchMode">{{ batchMode ? '取消批量' : '批量管理' }}</text>
      <text class="tbtn" @click="exportCsv">导出 CSV</text>
      <text class="tcount">共 {{ shown.length }} 人</text>
    </view>

    <view class="list">
      <view v-for="s in shown" :key="s.id" class="item" :class="batchMode && 'selectable'" @click="batchMode ? toggleSel(s) : openProfile(s)">
        <view v-if="batchMode" class="check" :class="selected.has(s.id) && 'on'">✓</view>
        <view class="top">
          <text class="name">{{ s.name }}</text>
          <text class="no">学号 {{ s.studentNo || '—' }}</text>
        </view>
        <view class="meta">
          <text>{{ s.gender }}</text>
          <text v-if="s.duty" class="duty">· {{ s.duty }}</text>
          <text v-if="s.seatRow" class="seat">· 第{{ s.seatRow }}行第{{ s.seatCol }}列</text>
          <text v-else class="seat">· 未排座</text>
        </view>
      </view>
      <view v-if="!shown.length" class="empty">暂无学生，点下方添加或批量导入</view>
    </view>

    <view v-if="batchMode && selected.size" class="batchbar">
      <text class="bsel">已选 {{ selected.size }} 人</text>
      <text class="bdel" @click="batchDelete">删除所选</text>
    </view>

    <view class="actions">
      <button class="add" @click="toggleForm">{{ showForm ? '收起' : '＋ 添加学生' }}</button>
      <button class="import" @click="showImport = !showImport">{{ showImport ? '收起' : '📥 批量导入' }}</button>
    </view>

    <view v-if="showForm" class="form">
      <input v-model="form.name" placeholder="姓名" />
      <picker :range="['男', '女']" :value="['男','女'].indexOf(form.gender)" @change="(e) => (form.gender = ['男', '女'][e.detail.value])">
        <view class="picker">性别：{{ form.gender }}</view>
      </picker>
      <input v-model="form.studentNo" placeholder="学号" />
      <input v-model="form.parentName" placeholder="家长姓名" />
      <input v-model="form.parentPhone" placeholder="家长电话" />
      <button class="save" @click="save">保存</button>
    </view>

    <view v-if="showImport" class="form import-box">
      <view class="imp-title">批量导入学生</view>
      <view class="imp-tip">支持 Excel(.xlsx/.xls) 或 TXT/CSV，每行：姓名,性别,学号,家长姓名,家长电话</view>
      <button class="tpl" @click="showTpl = true">📄 下载/查看模板</button>
      <button class="pick" @click="pickFile">📂 选择文件</button>

      <view v-if="preview" class="preview">
        <view class="pv-sum">
          校验结果：<text class="ok">有效 {{ preview.validCount }}</text> ·
          <text class="bad">异常 {{ preview.errorCount }}</text> / 共 {{ preview.rows.length }} 行
        </view>
        <view v-if="preview.errorCount" class="pv-errs">
          <view v-for="(r, i) in preview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
            第{{ r.line }}行 {{ r.name || '(空)' }}：{{ r.error }}
          </view>
        </view>
        <button class="confirm" :disabled="!preview.validCount" @click="commit">确认导入 {{ preview.validCount }} 条</button>
      </view>
    </view>

    <!-- 模板弹窗 -->
    <view v-if="showTpl" class="mask" @click="showTpl = false">
      <view class="dialog" @click.stop>
        <view class="d-title">导入模板格式</view>
        <view class="d-sub">第一行可写表头（姓名,性别,学号,家长姓名,家长电话），数据从下一行开始：</view>
        <view class="d-code">姓名,性别,学号,家长姓名,家长电话
张三,男,2026001,张父,13800000001
李四,女,2026002,李母,13800000002</view>
        <button class="d-copy" @click="copyTpl">📋 复制示例</button>
        <button class="d-close" @click="showTpl = false">关闭</button>
      </view>
    </view>

    <!-- 学生档案（雷达图） -->
    <view v-if="showProfile" class="mask" @click="showProfile = false">
      <view class="dialog" @click.stop>
        <view class="d-title">{{ profile.name }} 的档案</view>
        <view class="pf-meta">{{ profile.gender }} · 学号 {{ profile.studentNo || '—' }}<text v-if="profile.duty"> · {{ profile.duty }}</text></view>
        <canvas type="2d" id="radarCanvas" class="radar"></canvas>
        <view class="pf-stats">
          <view class="pf-st"><text class="pf-n">{{ radar.avg }}</text><text class="pf-l">成绩均分</text></view>
          <view class="pf-st"><text class="pf-n">{{ radar.attRate }}%</text><text class="pf-l">出勤率</text></view>
          <view class="pf-st"><text class="pf-n">{{ radar.behScore }}</text><text class="pf-l">行为活跃</text></view>
        </view>
        <view class="pf-tip">雷达基于成绩 / 考勤 / 行为观察数据自动生成（0–100）。</view>
        <button class="d-close" @click="showProfile = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { copyText } from '../../common/print'

const classId = ref('')
const className = ref('')
const list = ref([])
const kw = ref('')
const genderOpts = ['全部', '男', '女']
const genderFilter = ref('全部')
const sortOpts = ['按学号', '按座位', '按姓名']
const sortVals = ['studentNo', 'seat', 'name']
const sortBy = ref('studentNo')
const sortLabel = computed(() => sortOpts[sortVals.indexOf(sortBy.value)])
const batchMode = ref(false)
const selected = ref(new Set())
const shown = computed(() => {
  let arr = list.value.filter((s) => s.classId === classId.value)
  const k = kw.value.trim().toLowerCase()
  if (k) arr = arr.filter((s) => (s.name || '').toLowerCase().includes(k) || (s.studentNo || '').toLowerCase().includes(k))
  if (genderFilter.value !== '全部') arr = arr.filter((s) => s.gender === genderFilter.value)
  arr.sort((a, b) => {
    if (sortBy.value === 'studentNo') return String(a.studentNo || '').localeCompare(String(b.studentNo || ''))
    if (sortBy.value === 'seat') return (a.seatRow || 0) - (b.seatRow || 0) || (a.seatCol || 0) - (b.seatCol || 0)
    return (a.name || '').localeCompare(b.name || '', 'zh')
  })
  return arr
})
const showForm = ref(false)
const showImport = ref(false)
const showTpl = ref(false)
const preview = ref(null)
const showProfile = ref(false)
const profile = ref({})
const radar = ref({ avg: 0, attRate: 0, behScore: 0 })
const form = ref({ name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '' })

onLoad((q) => {
  classId.value = q.classId
  className.value = q.name || '学生管理'
})

async function load() {
  const all = await api.get('/students')
  list.value = all.filter((s) => s.classId === classId.value)
}
onShow(load)

function toggleForm() {
  showForm.value = !showForm.value
}

function toggleSel(s) {
  const ns = new Set(selected.value)
  if (ns.has(s.id)) ns.delete(s.id)
  else ns.add(s.id)
  selected.value = ns
}
async function batchDelete() {
  const ids = [...selected.value]
  if (!ids.length) return
  uni.showModal({
    title: '批量删除',
    content: `确定删除选中的 ${ids.length} 名学生吗？`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…' })
      try {
        await Promise.all(ids.map((id) => api.del('/students/' + id)))
        selected.value = new Set()
        batchMode.value = false
        uni.showToast({ title: '已删除 ' + ids.length + ' 人', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || ''), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
function exportCsv() {
  const rows = shown.value
  if (!rows.length) return uni.showToast({ title: '没有可导出的学生', icon: 'none' })
  const head = '姓名,性别,学号,家长姓名,家长电话,座位'
  const body = rows
    .map((s) =>
      [s.name, s.gender, s.studentNo || '', s.parentName || '', s.parentPhone || '', s.seatRow ? s.seatRow + '行' + (s.seatCol || '') + '列' : '']
        .map((x) => '"' + String(x).replace(/"/g, '""') + '"')
        .join(','),
    )
    .join('\n')
  copyText('\uFEFF' + head + '\n' + body)
}

async function save() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请填写姓名', icon: 'none' })
  if (form.value.gender !== '男' && form.value.gender !== '女')
    return uni.showToast({ title: '请选择性别', icon: 'none' })
  try {
    await api.post('/students', {
      ...form.value,
      classId: classId.value,
      seatNo: list.value.length + 1,
      tags: [],
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    showForm.value = false
    form.value = { name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '' }
    load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  }
}

function copyTpl() {
  uni.setClipboardData({
    data: '姓名,性别,学号,家长姓名,家长电话\n张三,男,2026001,张父,13800000001\n李四,女,2026002,李母,13800000002',
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

function pickFile() {
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        const r = await api.post('/students/import', { filename: f.name, data })
        preview.value = r
        if (!r.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => {},
  })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data),
      fail: reject,
    })
  })
}

async function commit() {
  const items = preview.value.rows.filter((r) => r.valid)
  if (!items.length) return
  uni.showLoading({ title: '导入中…' })
  try {
    const r = await api.post('/students/import-commit', { classId: classId.value, items })
    uni.showToast({ title: `成功导入 ${r.count} 名学生`, icon: 'success' })
    preview.value = null
    showImport.value = false
    load()
  } catch (e) {
    uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function openProfile(s) {
  profile.value = s
  showProfile.value = true
  radar.value = { avg: 0, attRate: 0, behScore: 0 }
  await computeProfile(s)
}
async function computeProfile(s) {
  const [grades, atts, beh] = await Promise.all([
    api.get('/grades').catch(() => []),
    api.get('/attendances').catch(() => []),
    api.get('/behavior-records').catch(() => []),
  ])
  // 成绩均分
  const sc = []
  ;(grades || []).forEach((g) => (g.scores || []).forEach((x) => { if (x.studentId === s.id && x.score != null) sc.push(Number(x.score)) }))
  const avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0
  // 出勤率
  let total = 0
  let present = 0
  ;(atts || []).forEach((a) => {
    const recs = typeof a.records === 'string' ? (() => { try { return JSON.parse(a.records) } catch (e) { return [] } })() : (a.records || [])
    recs.forEach((r) => { if (r.studentId === s.id) { total++; if (r.status === '出勤') present++ } })
  })
  const attRate = total ? Math.round((present / total) * 100) : 0
  // 行为活跃（封顶 20 条 = 100）
  const behCount = (beh || []).filter((b) => b.studentId === s.id).length
  const behScore = Math.min(100, Math.round((behCount / 20) * 100))
  radar.value = { avg, attRate, behScore }
  nextTick(drawRadar)
}
function drawRadar() {
  const q = uni.createSelectorQuery()
  q.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) return
    const canvas = res[0].node
    const dpr = (uni.getSystemInfoSync().pixelRatio || 2)
    const size = 300
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const cx = size / 2
    const cy = size / 2
    const R = 100
    const vals = [radar.value.avg, radar.value.attRate, radar.value.behScore]
    const labels = ['成绩', '出勤', '行为']
    const n = 3
    // 网格环
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
        const rr = (R * r) / 4
        const x = cx + rr * Math.cos(a)
        const y = cy + rr * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = '#e3e3e3'
      ctx.stroke()
    }
    // 轴线 + 标签
    ctx.font = '13px sans-serif'
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * Math.cos(a)
      const y = cy + R * Math.sin(a)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#eee'
      ctx.stroke()
      const lx = cx + (R + 18) * Math.cos(a)
      const ly = cy + (R + 18) * Math.sin(a)
      ctx.fillStyle = '#888'
      ctx.textAlign = 'center'
      ctx.fillText(labels[i], lx, ly + 4)
    }
    // 数据多边形
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const rr = (R * vals[i]) / 100
      const x = cx + rr * Math.cos(a)
      const y = cy + rr * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(230,162,60,0.35)'
    ctx.strokeStyle = '#e6a23c'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const rr = (R * vals[i]) / 100
      const x = cx + rr * Math.cos(a)
      const y = cy + rr * Math.sin(a)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#e6a23c'
      ctx.fill()
    }
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.bar { font-size: 34rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.toolbar { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.search { flex: 1; border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 14rpx 24rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); }
.mini-picker { border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 14rpx 24rpx; font-size: 24rpx; background: var(--c-card); color: var(--c-title); white-space: nowrap; }
.toolbar2 { display: flex; align-items: center; gap: 20rpx; margin-bottom: 16rpx; }
.tbtn { font-size: 26rpx; color: #409eff; padding: 10rpx 22rpx; border-radius: 30rpx; background: var(--c-card); border: 1px solid var(--c-border); }
.tbtn.on { background: #e8f1fb; color: #3a8ee6; }
.tcount { margin-left: auto; font-size: 24rpx; color: var(--c-sub); }
.item.selectable { display: flex; align-items: center; gap: 16rpx; }
.check { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid var(--c-border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #fff; }
.check.on { background: #07c160; border-color: #07c160; }
.batchbar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--c-card); border-top: 1px solid var(--c-border); padding: 20rpx 30rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -4rpx 16rpx var(--c-shadow); z-index: 40; }
.bsel { font-size: 26rpx; color: var(--c-title); }
.bdel { font-size: 28rpx; color: #fff; background: #e64340; padding: 14rpx 36rpx; border-radius: 40rpx; }
.dark .search { border-color: var(--c-input-border); }
.dark .mini-picker, .dark .tbtn { border-color: var(--c-input-border); background: var(--c-card); color: var(--c-title); }
.item { background: var(--c-card); border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; color: var(--c-text); }
.no { color: var(--c-sub); font-size: 24rpx; }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.duty { color: #409eff; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.actions { display: flex; gap: 20rpx; margin-top: 16rpx; }
.add, .import { flex: 1; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.add { background: var(--c-accent); }
.import { background: #409eff; }
.form { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.form input, .picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.import-box { background: var(--c-card2); }
.imp-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.tpl, .pick { background: var(--c-card); color: #2a6fbb; border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; }
.pick { background: #409eff; color: #fff; border: none; }
.preview { margin-top: 10rpx; border-top: 1px dashed var(--c-border); padding-top: 16rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: #e64340; }
.pv-errs { margin: 10rpx 0; }
.pv-err { font-size: 24rpx; color: #e64340; line-height: 1.6; }
.confirm { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.confirm[disabled] { opacity: 0.5; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { width: 620rpx; background: var(--c-card); border-radius: 24rpx; padding: 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
.d-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.d-sub { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.d-code { background: #2b2b2b; color: #f6f6f6; font-size: 22rpx; padding: 20rpx; border-radius: 12rpx; white-space: pre-wrap; line-height: 1.7; font-family: monospace; margin-bottom: 20rpx; }
.d-copy { background: #409eff; color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.d-close { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.radar { width: 300px; height: 300px; display: block; margin: 10rpx auto; }
.pf-meta { font-size: 24rpx; color: var(--c-sub); text-align: center; margin-bottom: 6rpx; }
.pf-stats { display: flex; justify-content: space-around; margin: 10rpx 0; }
.pf-st { display: flex; flex-direction: column; align-items: center; }
.pf-n { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.pf-l { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.pf-tip { font-size: 20rpx; color: var(--c-sub); text-align: center; line-height: 1.5; margin-bottom: 16rpx; }
</style>
