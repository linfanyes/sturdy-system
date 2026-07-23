<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <text class="ht">🎁 奖励兑换</text>
      <text class="hsel" v-if="classId">{{ selName }}</text>
    </view>

    <picker :range="classOpts" :value="classIdx" @change="onClass">
      <view class="picker">{{ selName || '选择班级' }}</view>
    </picker>

    <!-- 3 张统计卡 -->
    <view v-if="classId" class="stat">
      <view class="sc sc-1">
        <text class="sn">{{ stats.totalGrant }}</text>
        <text class="sl">累计兑换</text>
      </view>
      <view class="sc sc-2">
        <text class="sn">{{ stats.uniqueStudents }}</text>
        <text class="sl">参与学生</text>
      </view>
      <view class="sc sc-3">
        <text class="sn">{{ stats.totalPoints }}</text>
        <text class="sl">消耗积分</text>
      </view>
    </view>

    <!-- 操作栏 -->
    <view v-if="classId" class="bar">
      <text class="b-btn primary" @click="openCreate">+ 兑换奖励</text>
      <text class="b-btn" @click="openBatch">📦 批量发放</text>
      <text class="b-btn" @click="showStock = !showStock">{{ showStock ? '收起库存' : '📦 库存管理' }}</text>
      <text class="b-btn" @click="showStats = !showStats">{{ showStats ? '收起统计' : '展开统计' }}</text>
    </view>

    <!-- 统计图：各项目兑换次数横向柱状图 -->
    <view v-if="classId && showStats && itemStats.length" class="card">
      <view class="c-hd">📊 各项目兑换次数</view>
      <view v-for="it in itemStats" :key="it.name" class="stat-row">
        <text class="stat-l">{{ it.name }}</text>
        <view class="stat-bar"><view class="stat-fill" :style="{ width: it.pct + '%' }"></view></view>
        <text class="stat-c">{{ it.count }} 次</text>
      </view>
    </view>

    <!-- 库存管理：每个预设项目可设库存，-1 = 无限，0 = 暂停兑换 -->
    <view v-if="classId && showStock" class="card">
      <view class="c-hd">📦 库存管理<span class="c-hd-sub">（-1 = 无限；0 = 暂停）</span></view>
      <view v-for="(it, i) in stockList" :key="it.name" class="stk-row">
        <view class="stk-info">
          <text class="stk-name">{{ it.name }}</text>
          <text class="stk-pts">{{ it.points }} 分</text>
        </view>
        <view class="stk-ctrl">
          <text class="stk-btn" @click="adjustStock(i, -1)">−</text>
          <input
            :value="it.stock"
            type="number"
            class="stk-input"
            @change="(e) => (it.stock = parseInt(e.detail.value) || 0)"
          />
          <text class="stk-btn" @click="adjustStock(i, 1)">+</text>
          <text class="stk-tag" :class="stockTagClass(it.stock)">{{ stockTagLabel(it.stock) }}</text>
        </view>
      </view>
      <view class="stk-actions">
        <button class="stk-save" @click="saveStock">💾 保存库存</button>
        <button class="stk-reset" @click="resetStock">↻ 全部设为无限</button>
      </view>
    </view>

    <!-- 兑换记录列表 -->
    <view v-if="classId" class="list">
      <view v-for="r in records" :key="r.id" class="rc">
        <view class="rc-hd">
          <text class="rc-student">{{ r.studentName }}</text>
          <text class="rc-points">-{{ r.points }} 分</text>
        </view>
        <view class="rc-item">🎁 {{ r.item }}</view>
        <view class="rc-foot">
          <text class="rc-date">{{ fmtDate(r.date) }}</text>
          <text v-if="r.note" class="rc-note">· {{ r.note }}</text>
          <text class="rc-del" @click="del(r)">删除</text>
        </view>
      </view>
      <EmptyState v-if="!records.length" icon="🎁" text="暂无兑换记录" hint="点击「+ 兑换奖励」发放第一笔" />
    </view>

    <!-- 单人兑换弹层 -->
    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">兑换奖励</view>
        <view class="fg">
          <text class="lb">学生</text>
          <picker :range="studentOpts" :value="studentIdx" @change="(e) => (studentIdx = +e.detail.value)">
            <view class="pk">{{ studentOpts[studentIdx] || '选择学生' }}</view>
          </picker>
        </view>
        <view class="fg">
          <text class="lb">奖励项目</text>
          <picker :range="itemOpts" :value="itemIdx" @change="onItemPick">
            <view class="pk">{{ form.item || '选择项目' }}</view>
          </picker>
        </view>
        <view class="fg" v-if="form.item">
          <text class="lb">消耗积分</text>
          <input v-model.number="form.points" type="number" class="ipt" placeholder="如 10" />
          <text class="stk-mini-tag" :class="stockTagClass(currentStock)">{{ stockTagLabel(currentStock) }}</text>
        </view>
        <view class="fg">
          <text class="lb">备注（可选）</text>
          <input v-model="form.note" class="ipt" placeholder="如 课堂表现奖励" />
        </view>
        <view class="sh-bar">
          <button class="btn cancel" @click="showForm = false">取消</button>
          <button class="btn ok" :disabled="saving" @click="save">{{ saving ? '保存中…' : '确认兑换' }}</button>
        </view>
      </view>
    </view>

    <!-- 批量发放弹层 -->
    <view v-if="showBatch" class="mask" @click="showBatch = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">📦 批量发放奖励</view>
        <view class="sh-sub">一次给多名学生发放同一奖励，库存会按发放人数扣减</view>
        <view class="fg">
          <text class="lb">奖励项目</text>
          <picker :range="itemOpts" :value="batchItemIdx" @change="onBatchItemPick">
            <view class="pk">{{ batchForm.item || '选择项目' }}</view>
          </picker>
        </view>
        <view class="fg" v-if="batchForm.item">
          <text class="lb">消耗积分/人</text>
          <input v-model.number="batchForm.points" type="number" class="ipt" placeholder="如 10" />
          <text class="stk-mini-tag" :class="stockTagClass(batchStockAfter)">{{ stockTagLabel(batchStockAfter) }}（发放后剩余）</text>
        </view>
        <view class="fg">
          <text class="lb">备注（可选）</text>
          <input v-model="batchForm.note" class="ipt" placeholder="如 期中表彰" />
        </view>
        <view class="fg">
          <view class="lb-row">
            <text class="lb">选择学生（{{ batchSel.size }}/{{ students.length }}）</text>
            <text class="lb-link" @click="toggleAllBatch">{{ batchSel.size === students.length ? '全不选' : '全选' }}</text>
          </view>
          <scroll-view scroll-y class="stu-list">
            <view
              v-for="(s, i) in students"
              :key="s.id"
              class="stu-item"
              :class="{ on: batchSel.has(s.id) }"
              @click="toggleBatchSel(s.id)"
            >
              <text class="stu-check">{{ batchSel.has(s.id) ? '✓' : '' }}</text>
              <text class="stu-name">{{ s.name }}</text>
              <text class="stu-no" v-if="s.studentNo">{{ s.studentNo }}</text>
            </view>
            <view v-if="!students.length" class="stu-empty">暂无学生</view>
          </scroll-view>
        </view>
        <view class="sh-bar">
          <button class="btn cancel" @click="showBatch = false">取消</button>
          <button class="btn ok" :disabled="batchSaving" @click="saveBatch">{{ batchSaving ? '发放中…' : `确认发放（${batchSel.size} 人）` }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../../common/request'
import { auth, theme } from '../../../common/store'
import EmptyState from '../../../components/EmptyState/EmptyState.vue'

// 预设奖励项目（教师可在记录中自由输入）
const PRESET_ITEMS = [
  { name: '免写作业 1 次', points: 20 },
  { name: '免写作业 3 次', points: 50 },
  { name: '优先选座 1 周', points: 15 },
  { name: '当一日班长', points: 30 },
  { name: '小礼品一份', points: 25 },
  { name: '加分卡 +5', points: 10 },
  { name: '自习课听音乐', points: 18 },
  { name: '免一次值日', points: 22 },
]
const UNLIMITED = -1

const classes = ref([])
const classIdx = ref(-1)
const classId = ref('')
const students = ref([])
const records = ref([])
const showForm = ref(false)
const showBatch = ref(false)
const showStats = ref(false)
const showStock = ref(false)
const saving = ref(false)
const batchSaving = ref(false)
const studentIdx = ref(0)
const itemIdx = ref(0)
const batchItemIdx = ref(0)
const form = ref({ item: '', points: 0, note: '' })
const batchForm = ref({ item: '', points: 0, note: '' })
const batchSel = ref(new Set())
// 库存表：[{ name, points, stock }]，stock = -1 表示无限
const stockList = ref([])

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : ''
})
const studentOpts = computed(() => students.value.map((s) => s.name))
const itemOpts = computed(() => PRESET_ITEMS.map((it) => `${it.name}（${it.points} 分）`))

// 统计：累计兑换、参与学生、消耗积分
const stats = computed(() => {
  const totalGrant = records.value.length
  const uniqueStudents = new Set(records.value.map((r) => r.studentId)).size
  const totalPoints = records.value.reduce((s, r) => s + (Number(r.points) || 0), 0)
  return { totalGrant, uniqueStudents, totalPoints }
})

// 各项目兑换次数
const itemStats = computed(() => {
  const map = {}
  records.value.forEach((r) => {
    if (!r.item) return
    map[r.item] = (map[r.item] || 0) + 1
  })
  const arr = Object.entries(map).map(([name, count]) => ({ name, count }))
  arr.sort((a, b) => b.count - a.count)
  const max = Math.max(...arr.map((x) => x.count), 1)
  return arr.map((x) => ({ ...x, pct: Math.round((x.count / max) * 100) }))
})

// 当前选中项目的库存（单人兑换弹层用）
const currentStock = computed(() => {
  const it = stockList.value[itemIdx.value]
  return it ? it.stock : UNLIMITED
})
// 批量发放后剩余库存
const batchStockAfter = computed(() => {
  const it = stockList.value[batchItemIdx.value]
  if (!it) return UNLIMITED
  if (it.stock === UNLIMITED) return UNLIMITED
  return it.stock - batchSel.value.size
})

// 库存本地存储 key：按用户 uid + classId 隔离
function stockKey() {
  return `reward_stock_${auth.user?.id || 'anon'}_${classId.value || 'all'}`
}
function loadStock() {
  try {
    const raw = uni.getStorageSync(stockKey())
    if (raw) {
      const saved = JSON.parse(raw)
      // 用保存的库存覆盖预设项目（缺项补默认无限）
      stockList.value = PRESET_ITEMS.map((it) => {
        const f = saved.find((x) => x.name === it.name)
        return { name: it.name, points: it.points, stock: f ? f.stock : UNLIMITED }
      })
      return
    }
  } catch (e) {}
  // 默认全部无限
  stockList.value = PRESET_ITEMS.map((it) => ({ name: it.name, points: it.points, stock: UNLIMITED }))
}
function saveStock() {
  uni.setStorageSync(stockKey(), JSON.stringify(stockList.value))
  uni.showToast({ title: '库存已保存', icon: 'success' })
}
function resetStock() {
  stockList.value = PRESET_ITEMS.map((it) => ({ name: it.name, points: it.points, stock: UNLIMITED }))
  uni.setStorageSync(stockKey(), JSON.stringify(stockList.value))
  uni.showToast({ title: '已重置为无限', icon: 'none' })
}
function adjustStock(i, delta) {
  const it = stockList.value[i]
  if (!it) return
  if (it.stock === UNLIMITED) {
    // 从无限切到具体数值
    it.stock = delta > 0 ? 1 : 0
  } else {
    it.stock = Math.max(-1, it.stock + delta)
  }
}
function stockTagClass(stock) {
  if (stock === UNLIMITED) return 'tag-unlimited'
  if (stock <= 0) return 'tag-empty'
  if (stock <= 3) return 'tag-low'
  return 'tag-ok'
}
function stockTagLabel(stock) {
  if (stock === UNLIMITED) return '∞ 无限'
  if (stock <= 0) return '已售罄'
  if (stock <= 3) return `仅剩 ${stock}`
  return `库存 ${stock}`
}
// 扣减库存（兑换成功后调用）
function decreaseStock(itemName) {
  const it = stockList.value.find((x) => x.name === itemName)
  if (!it || it.stock === UNLIMITED) return
  it.stock = Math.max(0, it.stock - 1)
  // 自动保存
  uni.setStorageSync(stockKey(), JSON.stringify(stockList.value))
}

async function loadClasses() {
  classes.value = await api.getList('/classes', { silent: true })
  if (classes.value.length && !classId.value) {
    classIdx.value = 0
    classId.value = classes.value[0].id
    await loadStudents()
    await loadRecords()
    loadStock()
  }
}
onShow(loadClasses)
onPullDownRefresh(async () => {
  if (classId.value) {
    await Promise.all([loadStudents(), loadRecords()])
    loadStock()
  }
  uni.stopPullDownRefresh()
})

async function onClass(e) {
  classIdx.value = +e.detail.value
  const c = classes.value[classIdx.value]
  classId.value = c.id
  await Promise.all([loadStudents(), loadRecords()])
  loadStock()
}

async function loadStudents() {
  if (!classId.value) return
  students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
}

async function loadRecords() {
  if (!classId.value) return
  const list = await api.getList('/reward-records', { loading: true, loadingText: '加载兑换记录' })
  records.value = list.filter((r) => r.classId === classId.value)
}

function openCreate() {
  if (!students.value.length) {
    return uni.showToast({ title: '请先在学生管理添加学生', icon: 'none' })
  }
  studentIdx.value = 0
  itemIdx.value = 0
  form.value = { item: '', points: 0, note: '' }
  showForm.value = true
}

function onItemPick(e) {
  itemIdx.value = +e.detail.value
  const it = PRESET_ITEMS[itemIdx.value]
  form.value.item = it.name
  form.value.points = it.points
}

// 库存校验：返回 true 表示可兑换
function checkStock(itemName) {
  const it = stockList.value.find((x) => x.name === itemName)
  if (!it || it.stock === UNLIMITED) return true
  if (it.stock <= 0) {
    uni.showToast({ title: `「${itemName}」库存不足`, icon: 'none' })
    return false
  }
  return true
}

async function save() {
  if (studentIdx.value < 0 || !students.value[studentIdx.value]) {
    return uni.showToast({ title: '请选择学生', icon: 'none' })
  }
  if (!form.value.item) return uni.showToast({ title: '请选择奖励项目', icon: 'none' })
  if (!form.value.points || form.value.points <= 0) {
    return uni.showToast({ title: '请填消耗积分', icon: 'none' })
  }
  if (!checkStock(form.value.item)) return
  const student = students.value[studentIdx.value]
  saving.value = true
  try {
    const r = await api.post('/reward-records', {
      classId: classId.value,
      studentId: student.id,
      studentName: student.name,
      type: '兑换',
      points: Number(form.value.points),
      reason: form.value.item + (form.value.note ? ' · ' + form.value.note : ''),
      item: form.value.item,
      itemNote: form.value.note,
      date: new Date().toISOString().slice(0, 10),
    })
    records.value.unshift(r)
    decreaseStock(form.value.item)
    showForm.value = false
    uni.showToast({ title: '兑换成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}

// ===== 批量发放 =====
function openBatch() {
  if (!students.value.length) {
    return uni.showToast({ title: '请先在学生管理添加学生', icon: 'none' })
  }
  batchItemIdx.value = 0
  batchForm.value = { item: '', points: 0, note: '' }
  batchSel.value = new Set()
  showBatch.value = true
}
function onBatchItemPick(e) {
  batchItemIdx.value = +e.detail.value
  const it = PRESET_ITEMS[batchItemIdx.value]
  batchForm.value.item = it.name
  batchForm.value.points = it.points
}
function toggleBatchSel(id) {
  const ns = new Set(batchSel.value)
  if (ns.has(id)) ns.delete(id)
  else ns.add(id)
  batchSel.value = ns
}
function toggleAllBatch() {
  if (batchSel.value.size === students.value.length) {
    batchSel.value = new Set()
  } else {
    batchSel.value = new Set(students.value.map((s) => s.id))
  }
}
async function saveBatch() {
  if (!batchForm.value.item) return uni.showToast({ title: '请选择奖励项目', icon: 'none' })
  if (!batchForm.value.points || batchForm.value.points <= 0) {
    return uni.showToast({ title: '请填消耗积分', icon: 'none' })
  }
  if (!batchSel.value.size) return uni.showToast({ title: '请至少选择 1 名学生', icon: 'none' })
  // 库存校验
  const it = stockList.value.find((x) => x.name === batchForm.value.item)
  if (it && it.stock !== UNLIMITED && it.stock < batchSel.value.size) {
    return uni.showToast({ title: `库存仅 ${it.stock}，不够 ${batchSel.value.size} 人`, icon: 'none' })
  }
  batchSaving.value = true
  const selStudents = students.value.filter((s) => batchSel.value.has(s.id))
  const date = new Date().toISOString().slice(0, 10)
  const tasks = selStudents.map((s) => () => api.post('/reward-records', {
    classId: classId.value,
    studentId: s.id,
    studentName: s.name,
    type: '兑换',
    points: Number(batchForm.value.points),
    reason: batchForm.value.item + (batchForm.value.note ? ' · ' + batchForm.value.note : ''),
    item: batchForm.value.item,
    itemNote: batchForm.value.note,
    date,
  }))
  uni.showLoading({ title: `发放中 0/${tasks.length}`, mask: true })
  let done = 0
  let failed = 0
  for (const t of tasks) {
    try { await t() } catch (e) { failed++ }
    done++
    uni.showLoading({ title: `发放中 ${done}/${tasks.length}`, mask: true })
  }
  uni.hideLoading()
  // 批量扣库存
  for (let i = 0; i < selStudents.length; i++) decreaseStock(batchForm.value.item)
  batchSaving.value = false
  showBatch.value = false
  if (failed === 0) {
    uni.showToast({ title: `已发放 ${tasks.length} 人`, icon: 'success' })
  } else {
    uni.showToast({ title: `成功 ${tasks.length - failed} 失败 ${failed}`, icon: 'none' })
  }
  await loadRecords()
}

function del(r) {
  uni.showModal({
    title: '删除兑换记录',
    content: `确定删除「${r.studentName} - ${r.item}」？`,
    confirmColor: '#e64340',
    success: async (res) => {
      if (!res.confirm) return
      uni.showLoading({ title: '删除中…', mask: true })
      try {
        await api.del('/reward-records/' + r.id)
        records.value = records.value.filter((x) => x.id !== r.id)
        uni.showToast({ title: '已删除', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return String(d)
  const p = (n) => (n < 10 ? '0' : '') + n
  return `${dt.getMonth() + 1}-${p(dt.getDate())}`
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.ht { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.hsel { font-size: 24rpx; color: var(--c-sub); }
.picker { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; margin-bottom: 16rpx; }
.stat { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 16rpx; }
.sc { background: var(--c-card); border-radius: 14rpx; padding: 18rpx 6rpx; text-align: center; }
.sc-1 { background: rgba(7,193,96,0.12); }
.sc-2 { background: rgba(64,158,255,0.12); }
.sc-3 { background: rgba(230,162,60,0.12); }
.sn { display: block; font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.sl { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.bar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.b-btn { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 24rpx; background: var(--c-card); color: var(--c-title); border: 1px solid var(--c-border); }
.b-btn.primary { background: var(--c-primary); color: #fff; border: none; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.c-hd { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; display: flex; align-items: baseline; gap: 12rpx; }
.c-hd-sub { font-size: 20rpx; color: var(--c-sub); font-weight: 400; }
.stat-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx; }
.stat-l { width: 200rpx; font-size: 22rpx; color: var(--c-sub); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat-bar { flex: 1; height: 18rpx; background: var(--c-card2); border-radius: 9rpx; overflow: hidden; }
.stat-fill { height: 100%; background: linear-gradient(90deg, #e6a23c, #07c160); border-radius: 9rpx; }
.stat-c { width: 100rpx; text-align: right; font-size: 22rpx; color: var(--c-sub); flex-shrink: 0; }
.list { display: flex; flex-direction: column; gap: 12rpx; }
.rc { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.rc-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.rc-student { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.rc-points { font-size: 26rpx; font-weight: 700; color: var(--c-danger); }
.rc-item { font-size: 26rpx; color: var(--c-text); }
.rc-foot { display: flex; align-items: center; gap: 8rpx; margin-top: 10rpx; font-size: 22rpx; color: var(--c-sub); }
.rc-note { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-del { color: var(--c-danger); padding: 0 8rpx; margin-left: auto; }

/* 库存管理 */
.stk-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 0; border-bottom: 1rpx solid var(--c-border); }
.stk-row:last-child { border-bottom: none; }
.stk-info { flex: 1; }
.stk-name { font-size: 26rpx; color: var(--c-title); display: block; }
.stk-pts { font-size: 22rpx; color: var(--c-sub); }
.stk-ctrl { display: flex; align-items: center; gap: 10rpx; }
.stk-btn { width: 48rpx; height: 48rpx; line-height: 44rpx; text-align: center; border-radius: 50%; background: var(--c-card2); color: var(--c-title); font-size: 32rpx; font-weight: 700; }
.stk-input { width: 80rpx; height: 56rpx; text-align: center; border: 1px solid var(--c-input-border); border-radius: 10rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); }
.stk-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 14rpx; margin-left: 6rpx; }
.stk-tag.tag-unlimited { background: rgba(7,193,96,0.12); color: #07c160; }
.stk-tag.tag-ok { background: rgba(64,158,255,0.12); color: #409eff; }
.stk-tag.tag-low { background: rgba(230,162,60,0.12); color: #e6a23c; }
.stk-tag.tag-empty { background: rgba(230,67,64,0.12); color: #e64340; }
.stk-mini-tag { display: inline-block; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 10rpx; margin-top: 6rpx; }
.stk-mini-tag.tag-unlimited { background: rgba(7,193,96,0.12); color: #07c160; }
.stk-mini-tag.tag-ok { background: rgba(64,158,255,0.12); color: #409eff; }
.stk-mini-tag.tag-low { background: rgba(230,162,60,0.12); color: #e6a23c; }
.stk-mini-tag.tag-empty { background: rgba(230,67,64,0.12); color: #e64340; }
.stk-actions { display: flex; gap: 12rpx; margin-top: 16rpx; }
.stk-save { flex: 1; background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 26rpx; height: 72rpx; line-height: 72rpx; }
.stk-reset { flex: 1; background: var(--c-card2); color: var(--c-sub); border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 26rpx; height: 72rpx; line-height: 72rpx; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 28rpx; box-sizing: border-box; max-height: 86vh; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 8rpx; }
.sh-sub { font-size: 22rpx; color: var(--c-sub); margin-bottom: 18rpx; }
.fg { margin-bottom: 16rpx; }
.lb { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 6rpx; }
.lb-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6rpx; }
.lb-link { font-size: 22rpx; color: var(--c-primary); }
.pk { background: var(--c-input); border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; }
.ipt { background: var(--c-input); border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; }
.sh-bar { display: flex; gap: 14rpx; margin-top: 8rpx; }
.btn { flex: 1; border-radius: 50rpx; font-size: 28rpx; height: 80rpx; line-height: 80rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.ok { background: var(--c-primary); color: #fff; }
.btn[disabled] { opacity: 0.5; }

/* 批量发放学生列表 */
.stu-list { max-height: 480rpx; border: 1px solid var(--c-border); border-radius: 12rpx; background: var(--c-input); }
.stu-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 20rpx; border-bottom: 1rpx solid var(--c-border); }
.stu-item:last-child { border-bottom: none; }
.stu-item.on { background: rgba(7,193,96,0.06); }
.stu-check { width: 36rpx; height: 36rpx; line-height: 36rpx; text-align: center; border-radius: 50%; border: 1px solid var(--c-border); color: #fff; background: var(--c-primary); font-size: 22rpx; }
.stu-item:not(.on) .stu-check { background: transparent; color: transparent; }
.stu-name { font-size: 28rpx; color: var(--c-title); }
.stu-no { font-size: 22rpx; color: var(--c-sub); margin-left: auto; }
.stu-empty { text-align: center; padding: 40rpx; color: var(--c-sub); font-size: 24rpx; }

.dark .sc-1 { background: rgba(7,193,96,0.15); }
.dark .sc-2 { background: rgba(64,158,255,0.15); }
.dark .sc-3 { background: rgba(230,162,60,0.15); }
.dark .stu-item.on { background: rgba(7,193,96,0.12); }
</style>
