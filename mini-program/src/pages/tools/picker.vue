<template>
  <view class="page" :class="{ dark }">
    <view class="hd">随机点名</view>

    <view class="cls-row">
      <picker :range="classNames" @change="onClass"><view class="picker">{{ curClass || '选择班级（绑定真实名单）' }}</view></picker>
      <view class="switch-box">
        <text class="sw-label">排除已点</text>
        <switch :checked="excludePicked" @change="e => excludePicked = e.detail.value" color="#07c160" />
      </view>
    </view>

    <view class="stage" @click="roll">
      <text class="name" :class="{ spin: spinning }">{{ picked || '点击开始' }}</text>
    </view>
    <view class="row">
      <button class="btn" @click="roll">{{ spinning ? '…' : '开始点名' }}</button>
      <button class="btn ghost" @click="resetHistory">重置历史</button>
      <button class="btn ghost" @click="clearClass">清空名单</button>
    </view>

    <view class="list-box">
      <view class="lb-title">
        名单（每行一个，可手动编辑）
        <text class="lb-act" @click="selectAll">全选</text>
        <text class="lb-act" @click="clearNames">清空</text>
      </view>
      <textarea class="ta" v-model="namesText" :placeholder="ph" @blur="saveDraft" />
      <view class="lb-meta" v-if="names.length">共 {{ names.length }} 人 · 已点 {{ history.length }} 人 · 剩余 {{ remainCount }} 人</view>
    </view>

    <view class="hist" v-if="history.length">
      <view class="hist-h">
        <text>最近点过（共 {{ history.length }}）</text>
        <text class="hist-c" @click="resetHistory">清空历史</text>
      </view>
      <view class="hist-list">
        <text v-for="(n, i) in history.slice(-12)" :key="i" class="hist-i">{{ n }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { api } from '../../common/request'
import { theme, auth } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const classes = ref([])
const classNames = computed(() => classes.value.map((c) => c.name))
const curClass = ref('')
const curClassId = ref('')
const namesText = ref('')
const ph = '张三\n李四\n王五'
const names = computed(() => namesText.value.split('\n').map((s) => s.trim()).filter(Boolean))
const picked = ref('')
const spinning = ref(false)
const history = ref([])
const excludePicked = ref(false)
let timer = null
let rollTimer = null

// 按用户 + 班级隔离的存储 key
function sk(suffix) {
  const uid = (auth.user && (auth.user.id || auth.user.username)) || 'anon'
  return `picker_${uid}_${suffix}`
}

// 当前班级对应的存储 key
function curKey() {
  return curClassId.value ? sk('cls_' + curClassId.value) : sk('manual')
}

// 载入持久化数据
function loadDraft() {
  try {
    const raw = uni.getStorageSync(curKey()) || {}
    namesText.value = raw.namesText || ''
    history.value = Array.isArray(raw.history) ? raw.history : []
    excludePicked.value = !!raw.excludePicked
    picked.value = raw.picked || ''
  } catch (e) {
    namesText.value = ''
    history.value = []
  }
}

// 保存当前状态
function saveDraft() {
  try {
    uni.setStorageSync(curKey(), {
      namesText: namesText.value,
      history: history.value.slice(-50),
      excludePicked: excludePicked.value,
      picked: picked.value,
    })
  } catch (e) {}
}

const remainCount = computed(() => {
  if (!excludePicked.value) return names.value.length
  return names.value.filter((n) => !history.value.includes(n)).length
})

watch([namesText, history, excludePicked, picked], saveDraft, { deep: true })

async function loadClasses() {
  try {
    const res = await api.get('/classes')
    const list = res?.items || res?.data || res || []
    classes.value = Array.isArray(list) ? list : []
    // 自动恢复上次班级
    const lastClsId = uni.getStorageSync(sk('lastClsId'))
    if (lastClsId) {
      const c = classes.value.find((x) => x.id === lastClsId)
      if (c) {
        curClass.value = c.name
        curClassId.value = c.id
        loadDraft()
      }
    } else {
      loadDraft()
    }
  } catch (e) { /* 忽略 */ }
}
function onClass(e) {
  const c = classes.value[e.detail.value]
  if (!c) return
  curClass.value = c.name
  curClassId.value = c.id
  uni.setStorageSync(sk('lastClsId'), c.id)
  // 优先从服务器拉取真实名单，再合并本地草稿
  loadStudents(c.id)
}
async function loadStudents(classId) {
  try {
    const res = await api.get('/students?pageSize=1000')
    const list = res?.items || res?.data || res || []
    const ns = (Array.isArray(list) ? list : [])
      .filter((s) => s.classId === classId)
      .map((s) => s.name || s.studentName || s)
      .filter(Boolean)
    if (ns.length) {
      // 拉到真实名单：替换名单但保留历史
      namesText.value = ns.join('\n')
      uni.showToast({ title: '已导入 ' + ns.length + ' 人', icon: 'success' })
    } else {
      // 服务器没数据：尝试恢复本地草稿
      loadDraft()
      uni.showToast({ title: '该班暂无学生，可手动输入', icon: 'none' })
    }
  } catch (e) {
    loadDraft()
    uni.showToast({ title: '导入失败，请手动输入', icon: 'none' })
  }
}

function clearNames() {
  if (!namesText.value) return
  uni.showModal({
    title: '清空名单',
    content: '确定清空当前名单？历史记录会保留。',
    success: (r) => { if (r.confirm) { namesText.value = ''; picked.value = '' } },
  })
}
function clearClass() {
  uni.showModal({
    title: '清空',
    content: '确定清空名单与历史记录？',
    success: (r) => {
      if (!r.confirm) return
      namesText.value = ''
      curClass.value = ''
      curClassId.value = ''
      history.value = []
      picked.value = ''
      uni.removeStorageSync(sk('lastClsId'))
      uni.removeStorageSync(curKey())
    },
  })
}
function resetHistory() {
  if (!history.value.length) return
  uni.showModal({
    title: '重置历史',
    content: '清空点名历史？名单保留。',
    success: (r) => { if (r.confirm) { history.value = []; picked.value = '' } },
  })
}
function selectAll() {
  // 小程序 textarea 不支持选择，提供“复制全名单”替代
  if (!names.value.length) return uni.showToast({ title: '名单为空', icon: 'none' })
  uni.setClipboardData({
    data: names.value.join('\n'),
    success: () => uni.showToast({ title: '已复制全名单', icon: 'success' }),
  })
}

function roll() {
  if (spinning.value) return
  let pool = names.value
  if (excludePicked.value && history.value.length) pool = pool.filter((n) => !history.value.includes(n))
  if (!pool.length) {
    const allPicked = excludePicked.value && names.value.length && history.value.length >= names.value.length
    uni.showToast({ title: allPicked ? '全部点完，请重置历史' : '名单为空', icon: 'none' })
    return
  }
  spinning.value = true
  let n = 0
  timer = setInterval(() => {
    picked.value = pool[n % pool.length]
    n++
  }, 70)
  rollTimer = setTimeout(() => {
    clearInterval(timer)
    spinning.value = false
    const final = pool[Math.floor(Math.random() * pool.length)]
    picked.value = final
    history.value.push(final)
    uni.vibrateShort({ fail() {} })
  }, 1500)
}
function stop() { if (timer) clearInterval(timer); if (rollTimer) clearTimeout(rollTimer) }
onLoad(loadClasses)
onUnload(stop)
</script>

<style scoped>
.page { padding: 30rpx; display: flex; flex-direction: column; align-items: center; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.cls-row { width: 600rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 20rpx 0; }
.picker { background: var(--c-card); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; color: var(--c-title); min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; flex: 1; }
.switch-box { display: flex; align-items: center; gap: 8rpx; }
.sw-label { font-size: 22rpx; color: var(--c-sub); }
.stage { width: 600rpx; height: 240rpx; margin: 20rpx 0; background: var(--c-card); border-radius: 24rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 20rpx var(--c-shadow); }
.name { font-size: 64rpx; font-weight: 800; color: #e6a23c; }
.name.spin { color: var(--c-sub); }
.row { display: flex; gap: 16rpx; flex-wrap: wrap; justify-content: center; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 36rpx; font-size: 26rpx; }
.btn.ghost { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; }
.list-box { width: 600rpx; margin-top: 30rpx; }
.lb-title { font-size: 24rpx; color: var(--c-accent); margin-bottom: 10rpx; display: flex; align-items: center; gap: 16rpx; }
.lb-act { color: var(--c-sub); font-size: 22rpx; }
.lb-act:active { opacity: 0.5; }
.ta { width: 100%; height: 220rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; color: var(--c-title); }
.lb-meta { font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; }
.hist { width: 600rpx; margin-top: 20rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx 20rpx; box-sizing: border-box; }
.hist-h { font-size: 24rpx; color: var(--c-sub); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.hist-c { color: #e64340; font-size: 22rpx; }
.hist-list { display: flex; flex-wrap: wrap; gap: 10rpx; }
.hist-i { font-size: 24rpx; padding: 4rpx 14rpx; background: var(--c-card2); color: var(--c-title); border-radius: 16rpx; }
</style>
