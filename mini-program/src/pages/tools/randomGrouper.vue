<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">随机分组</view>
    <view class="sub">输入名单，随机分组</view>

    <!-- 班级选择 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="form-pk">{{ classOpts[classIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">分组方式</text>
        <picker :range="modeOptions" :value="modeIdx" @change="modeIdx = +$event.detail.value">
          <view class="form-pk">{{ modeOptions[modeIdx] }}</view>
        </picker>
      </view>
      <view v-if="modeIdx === 0" class="form-row">
        <text class="form-lb">组数</text>
        <input v-model.number="groupCount" class="form-ipt" type="number" min="1" maxlength="2" />
      </view>
      <view v-if="modeIdx === 1" class="form-row">
        <text class="form-lb">每组人数</text>
        <input v-model.number="groupSize" class="form-ipt" type="number" min="1" maxlength="2" />
      </view>
    </view>

    <!-- 名单输入 -->
    <view class="label">名单（每行一个名字）</view>
    <textarea v-model="namesText" class="textarea" placeholder="输入名字，每行一个" maxlength="500" />
    <view class="count">共 {{ namesList.length }} 人</view>

    <view class="actions">
      <button class="btn primary" @click="doGroup">生成分组</button>
      <button class="btn outline" v-if="groups.length" @click="reshuffle">重新打乱</button>
    </view>

    <!-- 分组结果 -->
    <view v-if="groups.length" class="groups">
      <view v-for="(g, i) in groups" :key="i" class="group-card" :class="groupColor(i)">
        <view class="group-hd">
          <text class="group-name">第 {{ i + 1 }} 组</text>
          <text class="group-num">{{ g.length }} 人</text>
        </view>
        <view class="group-members">
          <text v-for="(name, idx) in g" :key="idx" class="member">{{ name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'
import { listClasses, listStudents } from '../../api/students'

const classes = ref([])
const classIdx = ref(-1)
const modeIdx = ref(0)
const groupCount = ref(4)
const groupSize = ref(5)
const namesText = ref('')
const groups = ref([])

const modeOptions = ['按组数分', '按人数分']
const groupBgColors = ['bg-sakura', 'bg-mint', 'bg-sky', 'bg-butter']

const classOpts = computed(() => classes.value.map((c) => c.name))
const namesList = computed(() => namesText.value.split('\n').map((s) => s.trim()).filter(Boolean))

function groupColor(i) {
  return groupBgColors[i % groupBgColors.length]
}

async function loadClasses() {
  try {
    classes.value = await listClasses({ silent: true })
    if (classes.value.length) {
      classIdx.value = 0
      await loadStudents()
    }
  } catch {
    classes.value = []
  }
}

async function loadStudents() {
  if (classIdx.value < 0) return
  const cls = classes.value[classIdx.value]
  if (!cls) return
  try {
    const list = await listStudents(cls.id, { silent: true })
    if (list.length) {
      namesText.value = list.map((s) => s.name).join('\n')
    }
  } catch {
    // ignore
  }
}

async function onClassChange(e) {
  classIdx.value = +e.detail.value
  groups.value = []
  await loadStudents()
}

// P2修复：Fisher-Yates 洗牌算法，保证均匀分布
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function doGroup() {
  const list = namesList.value
  if (!list.length) {
    return uni.showToast({ title: '请先输入名单', icon: 'none' })
  }
  const shuffled = shuffle(list)
  const result = []
  if (modeIdx.value === 0) {
    const n = Math.max(1, groupCount.value)
    for (let i = 0; i < n; i++) result.push([])
    shuffled.forEach((name, i) => result[i % n].push(name))
  } else {
    const size = Math.max(1, groupSize.value)
    for (let i = 0; i < shuffled.length; i += size) {
      result.push(shuffled.slice(i, i + size))
    }
  }
  groups.value = result
}

function reshuffle() {
  doGroup()
}

onMounted(loadClasses)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.form-row:last-child { margin-bottom: 0; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-ipt { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.label { font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.textarea { width: 100%; background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; min-height: 160rpx; box-sizing: border-box; }
.count { text-align: right; font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; margin-bottom: 24rpx; }
.actions { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.btn { flex: 1; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; text-align: center; }
.btn.primary { background: var(--c-primary); color: #fff; }
.btn.outline { background: var(--c-input); color: var(--c-text); }
.groups { display: flex; flex-direction: column; gap: 16rpx; }
.group-card { border-radius: 16rpx; padding: 20rpx; }
.group-card.bg-sakura { background: #fff0f0; }
.group-card.bg-mint { background: #e8f8f0; }
.group-card.bg-sky { background: #e8f4ff; }
.group-card.bg-butter { background: #fff8e0; }
.group-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.group-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.group-num { font-size: 24rpx; color: var(--c-sub); }
.group-members { display: flex; flex-wrap: wrap; gap: 12rpx; }
.member { font-size: 26rpx; color: var(--c-text); background: rgba(255,255,255,0.7); border-radius: 8rpx; padding: 6rpx 16rpx; }
</style>
