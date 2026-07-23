<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="ch-t">🗺️ 家访路线规划</view>
      <picker :range="classOpts" @change="pickClass">
        <view class="picker">班级：{{ selName }}</view>
      </picker>
    </view>

    <view class="card" v-if="students.length">
      <view class="ch-t">选择家访学生</view>
      <view class="hint">勾选需要家访的学生，勾选后路线自动生成</view>
      <label class="all-row" @click="toggleAll"><text class="ck" :class="allSelected && 'on'"></text>全选（{{ students.length }} 人）</label>
      <view class="stu-list">
        <label class="stu-row" v-for="s in students" :key="s.id" @click="toggleStu(s.id)">
          <text class="ck" :class="selected.has(s.id) && 'on'"></text>
          <text class="s-name">{{ s.name }}</text>
          <text class="s-addr">{{ s.address || s.parentPhone || '地址待确认' }}</text>
        </label>
      </view>
    </view>

    <view v-if="selected.size >= 2" class="card">
      <view class="ch-t">推荐路线</view>
      <view class="route-steps">
        <view class="step" v-for="(s, i) in routePlan" :key="s.id">
          <text class="step-num">{{ i + 1 }}</text>
          <text class="step-info">{{ s.name }}<text class="step-addr" v-if="s.address"> · {{ s.address }}</text></text>
        </view>
      </view>
      <button class="nav-btn" @click="openMap">🗺️ 打开腾讯地图导航</button>
      <view class="hint">导航以第一个学生位置为起点，按推荐顺序访问</view>
    </view>

    <view v-if="selected.size && selected.size < 2" class="card">
      <view class="ch-t">已选择 {{ selected.size }} 名学生</view>
      <view class="hint">至少选择 2 名学生才能规划路线。也可「模糊定位」在同一个小区。</view>
      <button class="nav-btn" @click="openMapSingle">🗺️ 打开腾讯地图（单个学生）</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const classes = ref([])
const classId = ref('')
const students = ref([])
const selected = ref(new Set())

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const allSelected = computed(() => students.value.length > 0 && selected.value.size === students.value.length)

const routePlan = computed(() => {
  const sel = students.value.filter((s) => selected.value.has(s.id))
  return sel
})

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (!classId.value && classes.value.length) classId.value = classes.value[0].id
  if (classId.value) await loadStudents()
}
async function loadStudents() {
  students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
  selected.value = new Set()
}
onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
function pickClass(ev) { classId.value = classes.value[ev.detail.value].id; loadStudents() }
function toggleAll() { selected.value = allSelected.value ? new Set() : new Set(students.value.map((s) => s.id)) }
function toggleStu(id) {
  const ns = new Set(selected.value)
  ns.has(id) ? ns.delete(id) : ns.add(id)
  selected.value = ns
}

function openMap() {
  const sel = students.value.filter((s) => selected.value.has(s.id))
  if (sel.length < 2) return uni.showToast({ title: '请至少选择2名学生', icon: 'none' })
  // 优先用腾讯地图小程序插件；未授权时降级为复制地址列表 + 打开内置地图
  try {
    const plugin = requirePlugin('maps')
    const locations = sel.map((s) => s.address || s.parentPhone || s.name).filter(Boolean)
    plugin.routePlan({
      endPoint: locations[locations.length - 1],
      mode: 'car',
    })
  } catch (e) {
    // 插件未授权，降级：复制地址清单 + 打开第一个学生的位置
    const list = sel.map((s, i) => `${i + 1}. ${s.name} - ${s.address || '地址待确认'}`).join('\n')
    uni.setClipboardData({
      data: list,
      success: () => uni.showToast({ title: '地址清单已复制，可粘贴到地图APP', icon: 'none' }),
    })
    const first = sel[0]
    if (first.address) {
      uni.openLocation({
        latitude: 0, longitude: 0, name: first.name, address: first.address,
        fail: () => uni.showToast({ title: '请在地图APP中查看路线', icon: 'none' }),
      })
    }
  }
}

function openMapSingle() {
  const sel = students.value.filter((s) => selected.value.has(s.id))
  if (!sel.length) return
  const loc = sel[0].address || sel[0].name || ''
  if (!loc) return uni.showToast({ title: '该学生暂无地址信息', icon: 'none' })
  try {
    const plugin = requirePlugin('maps')
    plugin.openLocation({ latitude: 0, longitude: 0, name: sel[0].name, address: loc })
  } catch (e) {
    uni.openLocation({
      latitude: 0, longitude: 0, name: sel[0].name, address: loc,
      fail: () => uni.showToast({ title: '请在地图APP中查看', icon: 'none' }),
    })
  }
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.ch-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.picker { background: var(--c-card2); border-radius: 14rpx; padding: 18rpx; font-size: 28rpx; }
.hint { font-size: 22rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 12rpx; }
.all-row { display: flex; align-items: center; gap: 10rpx; padding: 14rpx; background: var(--c-card2); border-radius: 12rpx; font-size: 26rpx; color: var(--c-title); margin-bottom: 8rpx; }
.ck { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
.stu-list { max-height: 400rpx; overflow-y: auto; border: 1px solid var(--c-border); border-radius: 12rpx; }
.stu-row { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 14rpx; border-bottom: 1px solid var(--c-border); }
.s-name { width: 140rpx; font-size: 26rpx; color: var(--c-title); }
.s-addr { flex: 1; font-size: 22rpx; color: var(--c-sub); text-align: right; }
.route-steps { margin: 12rpx 0; }
.step { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1px solid var(--c-border); }
.step-num { width: 40rpx; height: 40rpx; border-radius: 50%; background: var(--c-accent); color: #fff; text-align: center; line-height: 40rpx; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.step-info { font-size: 26rpx; color: var(--c-title); }
.step-addr { font-size: 22rpx; color: var(--c-sub); }
.nav-btn { background: #409eff; color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; margin-top: 10rpx; }
</style>
