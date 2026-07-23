<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <text class="ht">🎯 课堂计分板</text>
      <text class="hsel" v-if="classId">{{ selName }} · {{ groups.length }} 组</text>
    </view>

    <!-- 班级选择 -->
    <picker v-if="!classId || !fullscreen" :range="classOpts" :value="classIdx" @change="onClass">
      <view class="picker">{{ selName || '选择班级' }}</view>
    </picker>

    <!-- 操作栏 -->
    <view v-if="classId && !fullscreen" class="bar">
      <text class="b-btn" @click="addGroup">＋ 新增小组</text>
      <text class="b-btn" @click="showHistory = true">📜 历史 ({{ history.length }})</text>
      <text class="b-btn" @click="undo" :class="{ disabled: !history.length }">↩️ 撤销</text>
      <text class="b-btn" @click="toggleFull">📱 全屏</text>
      <text class="b-btn danger" @click="resetAll">🗑 清零</text>
    </view>

    <!-- 全屏退出按钮 -->
    <view v-if="fullscreen" class="fs-exit" @click="toggleFull">✕ 退出全屏</view>

    <!-- 计分卡列表 -->
    <view v-if="classId" class="grid" :class="{ fs: fullscreen }">
      <view
        v-for="(g, i) in groups"
        :key="i"
        class="card"
        :style="{ background: g.color + '20', borderColor: g.color }"
      >
        <view class="g-hd" :style="{ color: g.color }">
          <text v-if="!g.editing" class="g-name" @click="g.editing = true">{{ g.name }}</text>
          <input v-else v-model="g.name" class="g-name-ipt" @blur="g.editing = false" :focus="true" />
          <text v-if="!fullscreen" class="g-del" @click="delGroup(i)">✕</text>
        </view>
        <view class="g-score" :style="{ color: g.color }">{{ g.points }}</view>
        <view class="g-btns">
          <view class="g-r">
            <text class="g-b" @click="add(i, -10)">-10</text>
            <text class="g-b" @click="add(i, -5)">-5</text>
            <text class="g-b" @click="add(i, -1)">-1</text>
          </view>
          <view class="g-r">
            <text class="g-b plus" @click="add(i, 1)">+1</text>
            <text class="g-b plus" @click="add(i, 5)">+5</text>
            <text class="g-b plus" @click="add(i, 10)">+10</text>
          </view>
        </view>
      </view>
      <view v-if="!groups.length && !fullscreen" class="empty">
        暂无小组，点击上方「＋ 新增小组」开始计分
      </view>
    </view>
    <view v-else class="empty">请先选择班级</view>

    <!-- 历史抽屉 -->
    <view v-if="showHistory" class="mask" @click="showHistory = false">
      <view class="sheet" @click.stop>
        <view class="s-hd">
          <text>📜 计分历史（最近 {{ history.length }} 条）</text>
          <text class="s-clr" @click="showHistory = false">✕</text>
        </view>
        <scroll-view scroll-y class="s-list">
          <view v-for="(h, i) in history" :key="i" class="h-item">
            <text class="h-time">{{ fmtTime(h.t) }}</text>
            <text class="h-name" :style="{ color: h.color }">{{ h.name }}</text>
            <text class="h-delta" :class="{ neg: h.delta < 0 }">{{ h.delta > 0 ? '+' : '' }}{{ h.delta }}</text>
            <text v-if="h.reason" class="h-rs">{{ h.reason }}</text>
          </view>
          <view v-if="!history.length" class="empty">暂无历史</view>
        </scroll-view>
        <button class="s-clr-btn" @click="clearHistory">清空历史</button>
      </view>
    </view>

    <!-- 加分理由弹层（点击加减分后可选填） -->
    <view v-if="showReason" class="mask" @click="cancelReason">
      <view class="sheet" @click.stop>
        <view class="s-hd"><text>{{ pendingDelta > 0 ? '加分' : '减分' }}理由（可选）</text></view>
        <input v-model="reasonInput" class="r-ipt" placeholder="如：积极发言、违纪等" :focus="true" />
        <view class="r-bar">
          <button class="r-btn cancel" @click="cancelReason">取消</button>
          <button class="r-btn ok" @click="confirmReason">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../../common/request'
import { theme, auth } from '../../../common/store'

const PALETTE = ['#e6a23c', '#07c160', '#409eff', '#e06c75', '#9b59b6', '#1abc9c', '#f39c12', '#34495e']
const MAX_GROUPS = 6
const MAX_HISTORY = 100

const classes = ref([])
const classIdx = ref(-1)
const classId = ref('')
const groups = ref([])
const history = ref([])
const showHistory = ref(false)
const fullscreen = ref(false)

const showReason = ref(false)
const pendingIdx = ref(-1)
const pendingDelta = ref(0)
const reasonInput = ref('')

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : ''
})
const uid = computed(() => (auth.user && auth.user.id) || 'anon')

function sk() { return 'sp_' + uid.value + '_' + classId.value }
function hk() { return 'sp_hist_' + uid.value + '_' + classId.value }

function loadLocal() {
  if (!classId.value) return
  try {
    const g = uni.getStorageSync(sk())
    groups.value = g ? JSON.parse(g) : []
    const h = uni.getStorageSync(hk())
    history.value = h ? JSON.parse(h) : []
  } catch (e) {
    groups.value = []
    history.value = []
  }
}
function saveLocal() {
  if (!classId.value) return
  uni.setStorageSync(sk(), JSON.stringify(groups.value))
  uni.setStorageSync(hk(), JSON.stringify(history.value.slice(0, MAX_HISTORY)))
}

async function onClass(e) {
  classIdx.value = +e.detail.value
  const c = classes.value[classIdx.value]
  classId.value = c.id
  await tryLoadServer()
  loadLocal()
}

// 尝试从服务端 group-scores 拉取初始化（如果本地无数据）
async function tryLoadServer() {
  try {
    const list = await api.getList('/group-scores', { silent: true })
    const mine = list.filter((x) => x.classId === classId.value)
    if (mine.length && !uni.getStorageSync(sk())) {
      groups.value = mine.map((x) => ({
        id: x.id,
        name: x.name || '小组',
        points: Number(x.points) || 0,
        color: x.color || PALETTE[0],
        editing: false,
      }))
      saveLocal()
    }
  } catch (e) {}
}

async function loadClasses() {
  classes.value = await api.getList('/classes', { silent: true })
  if (classes.value.length && !classId.value) {
    classIdx.value = 0
    classId.value = classes.value[0].id
    await tryLoadServer()
    loadLocal()
  }
}
onShow(loadClasses)

function addGroup() {
  if (groups.value.length >= MAX_GROUPS) {
    return uni.showToast({ title: `最多 ${MAX_GROUPS} 个小组`, icon: 'none' })
  }
  const idx = groups.value.length
  groups.value.push({
    name: '小组 ' + (idx + 1),
    points: 0,
    color: PALETTE[idx % PALETTE.length],
    editing: false,
  })
  saveLocal()
  syncServer(groups.value.length - 1)
}

function delGroup(i) {
  uni.showModal({
    title: '删除小组',
    content: `确定删除「${groups.value[i].name}」？积分将清零`,
    success: (r) => {
      if (!r.confirm) return
      const g = groups.value[i]
      if (g.id) api.del('/group-scores/' + g.id).catch(() => {})
      groups.value.splice(i, 1)
      saveLocal()
    },
  })
}

function add(i, delta) {
  pendingIdx.value = i
  pendingDelta.value = delta
  reasonInput.value = ''
  showReason.value = true
}

function cancelReason() {
  showReason.value = false
  pendingIdx.value = -1
  pendingDelta.value = 0
  reasonInput.value = ''
}

function confirmReason() {
  const i = pendingIdx.value
  const delta = pendingDelta.value
  if (i < 0 || !groups.value[i]) {
    cancelReason()
    return
  }
  const g = groups.value[i]
  g.points += delta
  history.value.unshift({
    t: Date.now(),
    name: g.name,
    color: g.color,
    delta,
    reason: reasonInput.value.trim(),
  })
  if (history.value.length > MAX_HISTORY) history.value = history.value.slice(0, MAX_HISTORY)
  saveLocal()
  syncServer(i)
  cancelReason()
}

// 同步到服务端 group-scores（失败静默，本地为准）
function syncServer(i) {
  const g = groups.value[i]
  if (!g || !classId.value) return
  const payload = {
    classId: classId.value,
    name: g.name,
    points: g.points,
    color: g.color,
  }
  if (g.id) {
    api.patch('/group-scores/' + g.id, payload).catch(() => {})
  } else {
    api.post('/group-scores', payload).then((r) => { g.id = r.id }).catch(() => {})
  }
}

function undo() {
  if (!history.value.length) return
  const last = history.value.shift()
  const idx = groups.value.findIndex((g) => g.name === last.name)
  if (idx >= 0) {
    groups.value[idx].points -= last.delta
    syncServer(idx)
  }
  saveLocal()
  uni.showToast({ title: '已撤销', icon: 'none' })
}

function resetAll() {
  uni.showModal({
    title: '清零所有小组积分',
    content: '所有小组积分将重置为 0，历史保留。确定？',
    success: (r) => {
      if (!r.confirm) return
      groups.value.forEach((g, i) => {
        g.points = 0
        syncServer(i)
      })
      saveLocal()
      uni.showToast({ title: '已清零', icon: 'none' })
    },
  })
}

function clearHistory() {
  history.value = []
  saveLocal()
  uni.showToast({ title: '历史已清空', icon: 'none' })
}

function toggleFull() {
  fullscreen.value = !fullscreen.value
  if (fullscreen.value) {
    uni.hideTabBar?.()
  } else {
    uni.showTabBar?.()
  }
}

function fmtTime(t) {
  const d = new Date(t)
  const p = (n) => (n < 10 ? '0' : '') + n
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.page.fs, .page:has(.grid.fs) { padding: 16rpx; }
.hd { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.ht { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.hsel { font-size: 24rpx; color: var(--c-sub); }
.picker { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; margin-bottom: 16rpx; }
.bar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 18rpx; }
.b-btn { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 24rpx; background: var(--c-card); color: var(--c-title); border: 1px solid var(--c-border); }
.b-btn.danger { color: var(--c-danger); }
.b-btn.disabled { opacity: 0.4; }
.fs-exit { position: fixed; top: 16rpx; right: 16rpx; z-index: 99; background: rgba(0,0,0,0.6); color: #fff; padding: 12rpx 22rpx; border-radius: 30rpx; font-size: 24rpx; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.grid.fs { grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.card { background: var(--c-card); border: 2rpx solid var(--c-border); border-radius: 20rpx; padding: 24rpx; }
.g-hd { display: flex; align-items: center; justify-content: space-between; font-size: 28rpx; font-weight: 700; }
.g-name { flex: 1; }
.g-name-ipt { flex: 1; font-size: 28rpx; font-weight: 700; border-bottom: 2rpx solid currentColor; padding: 4rpx 0; }
.g-del { font-size: 28rpx; color: var(--c-sub); padding: 0 8rpx; }
.g-score { font-size: 88rpx; font-weight: 800; text-align: center; margin: 14rpx 0 18rpx; line-height: 1.1; }
.grid.fs .g-score { font-size: 140rpx; }
.g-btns { display: flex; flex-direction: column; gap: 10rpx; }
.g-r { display: flex; gap: 8rpx; }
.g-b { flex: 1; text-align: center; padding: 14rpx 0; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; background: rgba(255,255,255,0.6); color: var(--c-title); border: 1px solid var(--c-border); }
.g-b.plus { background: rgba(7,193,96,0.12); color: var(--c-primary); }
.grid.fs .g-b { padding: 24rpx 0; font-size: 36rpx; }
.empty { grid-column: 1 / -1; text-align: center; color: var(--c-sub); padding: 80rpx 0; font-size: 26rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 28rpx; box-sizing: border-box; max-height: 86vh; display: flex; flex-direction: column; }
.s-hd { display: flex; align-items: center; justify-content: space-between; font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.s-clr { font-size: 32rpx; color: var(--c-sub); }
.s-list { flex: 1; max-height: 60vh; }
.h-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 0; border-bottom: 1rpx solid var(--c-border); }
.h-time { font-size: 20rpx; color: var(--c-sub); width: 140rpx; flex-shrink: 0; }
.h-name { font-size: 26rpx; font-weight: 600; flex: 1; }
.h-delta { font-size: 30rpx; font-weight: 800; color: var(--c-primary); width: 80rpx; text-align: right; }
.h-delta.neg { color: var(--c-danger); }
.h-rs { font-size: 22rpx; color: var(--c-sub); flex: 1; }
.s-clr-btn { background: var(--c-card2); color: var(--c-danger); border-radius: 50rpx; margin-top: 16rpx; font-size: 26rpx; }
.r-ipt { background: var(--c-input); border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; margin: 8rpx 0 18rpx; }
.r-bar { display: flex; gap: 14rpx; }
.r-btn { flex: 1; border-radius: 50rpx; font-size: 28rpx; height: 80rpx; line-height: 80rpx; }
.r-btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.r-btn.ok { background: var(--c-primary); color: #fff; }
.dark .g-b { background: rgba(255,255,255,0.08); }
</style>
