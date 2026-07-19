<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 列表态 -->
    <block v-if="!editing">
      <picker :range="classOpts" @change="pickClass">
        <view class="picker">班级：{{ selName }}</view>
      </picker>

      <view class="list" v-if="classId">
        <view v-for="l in layouts" :key="l.id" class="item">
          <view class="top">
            <text class="name">{{ l.name }}（{{ l.rows }}×{{ l.cols }}）</text>
            <text v-if="l.active" class="on">使用中</text>
          </view>
          <view class="btns">
            <button v-if="!l.active" class="act" size="mini" :disabled="busy" @click="activate(l.id)">启用</button>
            <button class="edit" size="mini" @click="openEdit(l)">编辑座位</button>
          </view>
        </view>
        <EmptyState v-if="!layouts.length" icon="🪑" text="暂无座位布局" hint="点击下方按钮新建布局" />
      </view>

      <button class="add" v-if="classId" :disabled="saving" @click="showForm = !showForm">{{ showForm ? '收起' : '＋ 新建布局' }}</button>
      <view v-if="showForm" class="form">
        <input v-model="form.name" placeholder="布局名称" />
        <input v-model="form.rows" type="number" placeholder="行数" />
        <input v-model="form.cols" type="number" placeholder="列数" />
        <button class="save" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
      </view>
    </block>

    <!-- 编辑态 -->
    <block v-else>
      <view class="bar">
        <text class="back" @click="editing = null">‹ 返回</text>
        <text class="title">{{ editing.name }} · 点击格子分配学生</text>
      </view>
      <view class="toolbar">
        <text class="tbtn" @click="showAuto = true">⚡ 自动排座</text>
        <text class="tbtn" @click="showResize = true">📐 调整尺寸</text>
        <text class="tbtn" @click="openAisle">🛤 过道</text>
        <text class="tbtn" @click="clearAll">🧹 清空</text>
      </view>
      <view class="podium">讲 台</view>
      <view class="grid-rows">
        <view v-for="(row, r) in seatRows" :key="r" class="grid-row">
          <template v-for="(cell, c) in row" :key="c">
            <view v-if="cell.aisle" class="aisle"><text class="aisle-mark">过</text></view>
            <view
              v-else
              class="seat"
              :class="{ filled: cell.id }"
              @click="tapCell(r, cell.col)"
            >
              <text v-if="cell.id" class="sno">{{ cell.no }}</text>
              <text class="sname">{{ cell.name || '空' }}</text>
            </view>
          </template>
        </view>
      </view>
      <button class="save" :disabled="busy" @click="saveSeats">{{ busy ? '保存中…' : '保存座位' }}</button>
    </block>

    <!-- 学生选择弹层 -->
    <view v-if="picking" class="mask" @click="picking = false">
      <view class="sheet" @click.stop>
        <picker :range="pickOpts" @change="onPick">
          <view class="picker">选择学生（首位为清空）</view>
        </picker>
        <button class="cancel" @click="picking = false">取消</button>
      </view>
    </view>

    <!-- 自动排座弹层 -->
    <view v-if="showAuto" class="mask" @click="showAuto = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">自动排座（{{ editing.name }}）</view>
        <view class="hint">按所选模式自动分配，已占用座位会被覆盖。</view>
        <picker :range="autoModes" :value="autoModeIdx" @change="(e) => (autoModeIdx = +e.detail.value)">
          <view class="picker sm">模式：{{ autoModes[autoModeIdx] }}</view>
        </picker>
        <view class="mode-desc">{{ autoModeDesc }}</view>
        <view class="sh-bar">
          <button class="btn del" @click="showAuto = false">取消</button>
          <button class="btn ok" @click="doAutoArrange">开始排座</button>
        </view>
      </view>
    </view>

    <!-- 调整尺寸弹层 -->
    <view v-if="showResize" class="mask" @click="showResize = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">调整尺寸（当前 {{ editing.rows }}×{{ editing.cols }}）</view>
        <view class="hint">增大：新增格子为空；缩小：超出部分的学生会被清出。</view>
        <input v-model="resizeRows" type="number" class="inp" placeholder="新行数" />
        <input v-model="resizeCols" type="number" class="inp" placeholder="新列数" />
        <view class="sh-bar">
          <button class="btn del" @click="showResize = false">取消</button>
          <button class="btn ok" @click="doResize">应用</button>
        </view>
      </view>
    </view>

    <!-- 过道设置弹层 -->
    <view v-if="showAisle" class="mask" @click="showAisle = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">过道布局（共 {{ editing.cols }} 列）</view>
        <view class="hint">勾选某列后，该列右侧将出现一条过道（最后一列无需设置）。</view>
        <view class="aisle-list">
          <view
            v-for="c in editing.cols - 1"
            :key="c"
            class="aisle-row"
            :class="{ on: aisleSet.has(c - 1) }"
            @click="toggleAisle(c - 1)"
          >
            <text class="aisle-label">第 {{ c }} 列后</text>
            <text class="aisle-mark-x">{{ aisleSet.has(c - 1) ? '✓' : '○' }}</text>
          </view>
        </view>
        <view class="sh-bar">
          <button class="btn del" @click="showAisle = false">取消</button>
          <button class="btn ok" @click="confirmAisle">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { isInt } from '../../common/validators'

const classes = ref([])
const classId = ref('')
const layouts = ref([])
const showForm = ref(false)
const saving = ref(false)
const busy = ref(false)
const form = ref({ name: '默认座位', rows: 6, cols: 7 })
const editing = ref(null)
const students = ref([])
const picking = ref(false)
const cur = ref({ r: 0, c: 0 })

// 自动排座 / 调整尺寸 / 过道布局
const showAuto = ref(false)
const autoModes = ['顺序排座', 'S形排座', '分组排座', '男女交错']
const autoModeIdx = ref(0)
const autoModeDesc = computed(() => {
  return [
    '按学号顺序从第 1 行第 1 列开始依次填充（适合常规课堂）。',
    '蛇形走位：第 1 行从左到右，第 2 行从右到左，依次交替（便于左右互动）。',
    '按列分组：从左到右每列从上到下填充（适合小组讨论课堂）。',
    '男女交替：按学号排序后男女分两队，轮流填入每个座位（适合纪律管理）。',
  ][autoModeIdx.value]
})
const showResize = ref(false)
const resizeRows = ref('')
const resizeCols = ref('')
const showAisle = ref(false)
const aisleSet = ref(new Set())

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
// seatRows：按行分组的二维数组，每行在过道列后插入 aisle 占位
const seatRows = computed(() => {
  if (!editing.value) return []
  const rows = []
  const aisleCols = editing.value.aisleCols || []
  for (let r = 0; r < editing.value.seats.length; r++) {
    const row = []
    for (let c = 0; c < editing.value.seats[r].length; c++) {
      const sid = editing.value.seats[r][c]
      const st = students.value.find((x) => x.id === sid)
      row.push({ id: sid, name: st ? st.name : '', no: r * editing.value.cols + c + 1, col: c })
      if (aisleCols.includes(c) && c < editing.value.cols - 1) {
        row.push({ aisle: true })
      }
    }
    rows.push(row)
  }
  return rows
})
const pickOpts = computed(() => ['（清空座位）', ...students.value.map((s) => s.name)])

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (classId.value) {
    // 服务端按 classId 过滤，避免拉全量再前端 filter
    layouts.value = await api.getList('/seat-layouts?classId=' + encodeURIComponent(classId.value), { silent: true })
    students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
  }
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
  load()
}

async function save() {
  const rows = +form.value.rows
  const cols = +form.value.cols
  if (!form.value.name || !rows || !cols) {
    return uni.showToast({ title: '请填写布局名称与行列数', icon: 'none' })
  }
  if (!isInt(form.value.rows, 1, 20)) return uni.showToast({ title: '行数应为 1-20', icon: 'none' })
  if (!isInt(form.value.cols, 1, 20)) return uni.showToast({ title: '列数应为 1-20', icon: 'none' })
  saving.value = true
  try {
    const seats = Array.from({ length: rows }, () => Array(cols).fill(null))
    await api.post('/seat-layouts', { classId: classId.value, name: form.value.name, rows, cols, seats, aisleCols: [] })
    uni.showToast({ title: '布局已创建', icon: 'success' })
    showForm.value = false
    form.value = { name: '默认座位', rows: 6, cols: 7 }
    await load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function activate(id) {
  busy.value = true
  try {
    await api.post(`/seat-layouts/${id}/activate`, {})
    uni.showToast({ title: '已启用，学生行列已回写', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: '启用失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    busy.value = false
  }
}

function openEdit(l) {
  const clone = JSON.parse(JSON.stringify(l))
  // 兼容旧数据（aisleCols 字段后加）
  if (!Array.isArray(clone.aisleCols)) clone.aisleCols = []
  editing.value = clone
}

function tapCell(r, c) {
  cur.value = { r, c }
  picking.value = true
}

function onPick(ev) {
  const idx = ev.detail.value
  const seats = editing.value.seats
  if (idx === 0) {
    seats[cur.value.r][cur.value.c] = null
  } else {
    const st = students.value[idx - 1]
    // 先从其他座位移除该学生
    for (let r = 0; r < seats.length; r++)
      for (let c = 0; c < seats[r].length; c++)
        if (seats[r][c] === st.id) seats[r][c] = null
    seats[cur.value.r][cur.value.c] = st.id
  }
  picking.value = false
}

async function saveSeats() {
  busy.value = true
  try {
    await api.patch(`/seat-layouts/${editing.value.id}`, {
      seats: editing.value.seats,
      rows: editing.value.rows,
      cols: editing.value.cols,
      aisleCols: editing.value.aisleCols || [],
    })
    uni.showToast({ title: '座位已保存', icon: 'success' })
    editing.value = null
    await load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    busy.value = false
  }
}

// 自动排座：4 种模式
function doAutoArrange() {
  if (!editing.value || !students.value.length) {
    uni.showToast({ title: '该班级没有学生可排', icon: 'none' })
    return
  }
  const rows = editing.value.rows
  const cols = editing.value.cols
  const sts = [...students.value].sort((a, b) =>
    String(a.studentNo || '').localeCompare(String(b.studentNo || ''), 'zh'),
  )
  // 全部清空后再填充
  const seats = Array.from({ length: rows }, () => Array(cols).fill(null))
  const mode = autoModeIdx.value
  if (mode === 0) {
    // 顺序：行优先
    let i = 0
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (i < sts.length) seats[r][c] = sts[i++].id
      }
  } else if (mode === 1) {
    // S形：偶数行从左到右，奇数行从右到左
    let i = 0
    for (let r = 0; r < rows; r++) {
      const leftToRight = r % 2 === 0
      for (let k = 0; k < cols; k++) {
        const c = leftToRight ? k : cols - 1 - k
        if (i < sts.length) seats[r][c] = sts[i++].id
      }
    }
  } else if (mode === 2) {
    // 分组：列优先
    let i = 0
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        if (i < sts.length) seats[r][c] = sts[i++].id
      }
  } else if (mode === 3) {
    // 男女交错：按学号排序后分男女两队，轮流填
    const males = sts.filter((s) => s.gender === '男')
    const females = sts.filter((s) => s.gender === '女')
    const queue = []
    const max = Math.max(males.length, females.length)
    for (let k = 0; k < max; k++) {
      if (k < males.length) queue.push(males[k])
      if (k < females.length) queue.push(females[k])
    }
    let i = 0
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (i < queue.length) seats[r][c] = queue[i++].id
      }
  }
  editing.value.seats = seats
  showAuto.value = false
  uni.showToast({ title: '已生成，请保存', icon: 'none' })
}

// 调整尺寸：保留交集，新增格子为空
function doResize() {
  const nr = +resizeRows.value
  const nc = +resizeCols.value
  if (!isInt(nr, 1, 20)) return uni.showToast({ title: '行数应为 1-20', icon: 'none' })
  if (!isInt(nc, 1, 20)) return uni.showToast({ title: '列数应为 1-20', icon: 'none' })
  const oldSeats = editing.value.seats
  const newSeats = Array.from({ length: nr }, (_, r) =>
    Array.from({ length: nc }, (_, c) => (oldSeats[r] && oldSeats[r][c] != null ? oldSeats[r][c] : null)),
  )
  editing.value.rows = nr
  editing.value.cols = nc
  editing.value.seats = newSeats
  // 过道列裁剪到新列数范围
  editing.value.aisleCols = (editing.value.aisleCols || []).filter((c) => c < nc - 1)
  showResize.value = false
  resizeRows.value = ''
  resizeCols.value = ''
  uni.showToast({ title: '尺寸已调整，请保存', icon: 'none' })
}

// 过道设置
function openAisle() {
  aisleSet.value = new Set(editing.value.aisleCols || [])
  showAisle.value = true
}
function toggleAisle(c) {
  const s = new Set(aisleSet.value)
  if (s.has(c)) s.delete(c)
  else s.add(c)
  aisleSet.value = s
}
function confirmAisle() {
  editing.value.aisleCols = [...aisleSet.value].sort((a, b) => a - b)
  showAisle.value = false
  uni.showToast({ title: '过道已设置，请保存', icon: 'none' })
}

// 一键清空所有座位
function clearAll() {
  uni.showModal({
    title: '清空座位',
    content: '确定清空当前布局所有座位分配？',
    confirmColor: '#e64340',
    success: (r) => {
      if (!r.confirm) return
      const { rows, cols } = editing.value
      editing.value.seats = Array.from({ length: rows }, () => Array(cols).fill(null))
      uni.showToast({ title: '已清空，请保存', icon: 'none' })
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.item { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: 600; }
.on { color: #07c160; font-size: 26rpx; }
.btns { margin-top: 12rpx; }
.act { background: #e6a23c; color: #fff; margin-right: 12rpx; }
.edit { background: #409eff; color: #fff; }
.empty { text-align: center; color: #c0c4cc; padding: 60rpx 0; }
.add { margin-top: 16rpx; background: #e6a23c; color: #fff; border-radius: 50rpx; }
.form { margin-top: 24rpx; background: #fff; border-radius: 20rpx; padding: 30rpx; }
.form input { width: 100%; height: 80rpx; min-height: 80rpx; line-height: 44rpx; border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; color: #333; background: #fff; box-sizing: border-box; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 12rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.bar { display: flex; align-items: center; margin-bottom: 16rpx; }
.back { color: #409eff; font-size: 30rpx; margin-right: 16rpx; }
.title { font-size: 28rpx; color: #4a3f35; }
.podium { text-align: center; background: #f3e9d2; color: #a07b3b; border-radius: 12rpx; padding: 12rpx; margin-bottom: 20rpx; font-size: 26rpx; }
.grid-rows { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 20rpx; }
.grid-row { display: flex; gap: 12rpx; }
.grid { display: grid; gap: 12rpx; margin-bottom: 20rpx; }
.seat { position: relative; background: #fff; border-radius: 14rpx; padding: 22rpx 6rpx; text-align: center; font-size: 24rpx; color: #9aa0a6; border: 1px solid #eee; flex: 1; min-width: 0; box-sizing: border-box; }
.seat.filled { background: #fff3d6; color: #a07b3b; border-color: #e6a23c; font-weight: 600; }
.sno { position: absolute; top: 4rpx; left: 8rpx; font-size: 18rpx; line-height: 1; color: #c08a3e; opacity: .85; font-weight: 700; }
.sname { display: block; margin-top: 10rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; padding: 30rpx; }
.sheet .picker { padding: 24rpx; border: 1px solid #eee; border-radius: 12rpx; margin-bottom: 16rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.cancel { background: #f4f4f4; border-radius: 50rpx; }
/* 编辑态工具栏 */
.toolbar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.tbtn { font-size: 24rpx; color: #409eff; background: #ecf5ff; padding: 10rpx 20rpx; border-radius: 32rpx; }
.tbtn:active { opacity: 0.7; }
/* 弹层（自动排座/调整尺寸/过道） */
.sh-t { font-size: 32rpx; font-weight: 700; margin-bottom: 12rpx; color: #333; }
.hint { font-size: 24rpx; color: #888; margin-bottom: 20rpx; line-height: 1.6; }
.sh-bar { display: flex; gap: 16rpx; margin-top: 24rpx; }
.btn { flex: 1; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; font-size: 28rpx; padding: 0; }
.btn::after { border: none; }
.btn.del { background: #f4f4f4; color: #666; }
.btn.ok { background: #07c160; color: #fff; }
.picker.sm { padding: 18rpx 24rpx; border: 1px solid #eee; border-radius: 12rpx; margin-bottom: 12rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; font-size: 28rpx; }
.mode-desc { font-size: 24rpx; color: #555; line-height: 1.7; background: #f8f8f8; padding: 16rpx 20rpx; border-radius: 12rpx; margin: 8rpx 0 16rpx; }
.inp { width: 100%; height: 80rpx; line-height: 44rpx; border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 16rpx; font-size: 28rpx; color: #333; background: #fff; box-sizing: border-box; }
.aisle-list { max-height: 480rpx; overflow-y: auto; }
.aisle-row { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 16rpx; border-bottom: 1px solid #f0f0f0; }
.aisle-row.on { background: #f0fbf3; }
.aisle-label { font-size: 28rpx; color: #333; }
.aisle-mark-x { font-size: 32rpx; color: #07c160; font-weight: 700; }
.aisle-row:not(.on) .aisle-mark-x { color: #ccc; }
/* 过道格子（flex row 中的窄占位） */
.aisle { width: 40rpx; flex-shrink: 0; background: transparent !important; border: 1px dashed #d9d9d9; border-radius: 8rpx; padding: 22rpx 0; text-align: center; font-size: 20rpx; color: #bbb; display: flex; align-items: center; justify-content: center; }
.aisle-mark { color: #bbb; }
/* 深色：弹层与工具栏 */
.dark .sh-t { color: var(--c-title); }
.dark .hint, .dark .mode-desc { color: var(--c-sub); background: var(--c-card2); }
.dark .btn.del { background: var(--c-card2); color: var(--c-sub); }
.dark .picker.sm { border-color: var(--c-border); color: var(--c-text); }
.dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .aisle { border-color: var(--c-border); color: var(--c-sub); }
.dark .aisle-mark { color: var(--c-sub); }
.dark .aisle-row { border-bottom-color: var(--c-border); }
.dark .aisle-row.on { background: rgba(7,193,96,0.12); }
.dark .aisle-label { color: var(--c-title); }
.dark .tbtn { background: var(--c-card2); color: var(--c-primary); }
/* 深色适配 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .item, .dark .form, .dark .sheet { background: var(--c-card); }
.dark .name { color: var(--c-title); }
.dark .on { color: var(--c-primary); }
.dark .title { color: var(--c-title); }
.dark .form input { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .seat { background: var(--c-card2); color: var(--c-sub); border-color: var(--c-border); }
.dark .seat.filled { background: var(--c-card2); color: var(--c-accent); border-color: var(--c-accent); }
.dark .sno { color: var(--c-accent); }
.dark .podium { background: var(--c-card2); color: var(--c-sub); }
.dark .sheet .picker { border-color: var(--c-border); }
.dark .cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
