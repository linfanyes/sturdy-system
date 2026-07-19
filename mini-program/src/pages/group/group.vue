<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="seg">
      <text :class="['seg-i', mode === 'random' && 'on']" @click="mode = 'random'">随机分组</text>
      <text :class="['seg-i', mode === 'gender' && 'on']" @click="mode = 'gender'">男女分组</text>
      <text :class="['seg-i', mode === 'mixed' && 'on']" @click="mode = 'mixed'">男女均衡</text>
      <text :class="['seg-i', mode === 'column' && 'on']" @click="mode = 'column'">按列分组</text>
    </view>

    <view v-if="mode === 'random' || mode === 'mixed'" class="cfg">
      <view class="seg2">
        <text :class="['seg-i', by === 'groups' && 'on']" @click="by = 'groups'">按组数</text>
        <text :class="['seg-i', by === 'size' && 'on']" @click="by = 'size'">按每组人数</text>
      </view>
      <input v-model="num" type="number" class="ctrl" :placeholder="by === 'groups' ? '分成几组' : '每组几人'" />
      <button class="go" :disabled="loading" @click="run">{{ loading ? '分组中…' : '开始分组' }}</button>
    </view>

    <view v-else-if="mode === 'gender'" class="cfg">
      <view class="hint">按性别自动分成「男生组 / 女生组」（未填性别的学生单独一组）</view>
      <button class="go" :disabled="loading" @click="run">{{ loading ? '分组中…' : '开始分组' }}</button>
    </view>

    <view v-else class="cfg">
      <button class="go" :disabled="loading" @click="run">{{ loading ? '分组中…' : '按座位列分组' }}</button>
      <text class="tip" v-if="!hasLayout && tried">（需先在该班座位表中启用一个布局）</text>
    </view>

    <view class="result" v-if="groups.length">
      <view class="res-bar">
        <text class="res-t">分组结果（共 {{ groups.length }} 组 {{ totalPeople }} 人）</text>
        <text class="res-copy" @click="copyResult">📋 复制</text>
      </view>
      <view v-for="(g, gi) in groups" :key="gi" class="grp">
        <view class="gh">
          <text>第 {{ gi + 1 }} 组 · {{ g.members.length }} 人</text>
          <text v-if="g.type" class="gtag">{{ g.type }}</text>
          <text v-else class="gsex">男{{ countGender(g.members, '男') }} · 女{{ countGender(g.members, '女') }}</text>
        </view>
        <view class="mem" v-for="m in g.members" :key="m.id">
          <text>{{ m.name }}</text>
          <text v-if="m.gender" class="mem-sex" :class="m.gender === '男' ? 'male' : 'female'">{{ m.gender }}</text>
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

const classes = ref([])
const classId = ref('')
const mode = ref('random')
const by = ref('groups')
const num = ref('')
const students = ref([])
const groups = ref([])
const hasLayout = ref(false)
const tried = ref(false)
const loading = ref(false)

const totalPeople = computed(() => groups.value.reduce((s, g) => s + (g.members ? g.members.length : 0), 0))

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})

async function load() {
  classes.value = await api.getList('/classes', { loading: true, loadingText: '加载分组班级' })
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
}

// 统计一组中某性别的人数
function countGender(g, gender) {
  return (g || []).filter((m) => m.gender === gender).length
}

// Fisher-Yates 洗牌
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function run() {
  tried.value = true
  if (loading.value) return
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  loading.value = true
  try {
    // 服务端按 classId 过滤，避免拉全量再前端 filter
    students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
    if (!students.value.length) {
      loading.value = false
      return uni.showToast({ title: '该班暂无学生', icon: 'none' })
    }

    if (mode.value === 'column') {
      const layouts = (await api.get('/seat-layouts?classId=' + encodeURIComponent(classId.value))).filter(
        (l) => l.classId === classId.value && l.active
      )
      if (!layouts.length || !layouts[0].seats || !layouts[0].seats.length) {
        hasLayout.value = false
        loading.value = false
        return uni.showToast({ title: '该班未启用座位布局', icon: 'none' })
      }
      hasLayout.value = true
      const seats = layouts[0].seats
      const res = []
      const colCount = seats[0] ? seats[0].length : 0
      for (let c = 0; c < colCount; c++) {
        const col = []
        for (let r = 0; r < seats.length; r++) {
          const sid = seats[r][c]
          if (sid) {
            const st = students.value.find((x) => x.id === sid)
            if (st) col.push(st)
          }
        }
        if (col.length) res.push({ members: col, type: '第' + (c + 1) + '列' })
      }
      groups.value = res
      loading.value = false
      return
    }

    // gender 模式：按性别直接分组
    if (mode.value === 'gender') {
      const males = shuffle(students.value.filter((s) => s.gender === '男'))
      const females = shuffle(students.value.filter((s) => s.gender === '女'))
      const others = shuffle(students.value.filter((s) => s.gender !== '男' && s.gender !== '女'))
      const res = []
      if (males.length) res.push({ members: males, type: '男生组' })
      if (females.length) res.push({ members: females, type: '女生组' })
      if (others.length) res.push({ members: others, type: '其他组' })
      groups.value = res
      loading.value = false
      return
    }

    // random / mixed 模式：需要数量
    const n = parseInt(num.value)
    if (!n || n < 1) {
      loading.value = false
      return uni.showToast({ title: '请填写有效数量', icon: 'none' })
    }

    // mixed 模式：男女均衡分配，每组男女比例尽量接近整体比例
    if (mode.value === 'mixed') {
      const males = shuffle(students.value.filter((s) => s.gender === '男'))
      const females = shuffle(students.value.filter((s) => s.gender === '女'))
      const others = shuffle(students.value.filter((s) => s.gender !== '男' && s.gender !== '女'))
      // 计算组数
      const total = students.value.length
      const groupCount = by.value === 'groups' ? n : Math.ceil(total / n)
      if (groupCount > total) {
        loading.value = false
        return uni.showToast({ title: '组数不能超过总人数', icon: 'none' })
      }
      const res = Array.from({ length: groupCount }, () => ({ members: [] }))
      // 轮流填入男生
      males.forEach((s, i) => res[i % groupCount].members.push(s))
      // 轮流填入女生（从不同 offset 开始以减少同组聚集）
      females.forEach((s, i) => res[(i + Math.floor(groupCount / 2)) % groupCount].members.push(s))
      // 其他性别均匀填入
      others.forEach((s, i) => res[i % groupCount].members.push(s))
      groups.value = res.filter((g) => g.members.length > 0)
      loading.value = false
      return
    }

    // random 模式：纯随机
    const arr = shuffle(students.value)
    const res = []
    if (by.value === 'groups') {
      const per = Math.ceil(arr.length / n)
      for (let i = 0; i < arr.length; i += per) res.push({ members: arr.slice(i, i + per) })
    } else {
      for (let i = 0; i < arr.length; i += n) res.push({ members: arr.slice(i, i + n) })
    }
    groups.value = res
  } catch (e) {
    uni.showToast({ title: '分组失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function copyResult() {
  const text = groups.value
    .map((g, i) => `第${i + 1}组：${g.members.map((m) => m.name).join('、')}`)
    .join('\n')
  if (!text) return
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制分组结果', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}
</script>

<style scoped>
.page { padding: 30rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.seg { display: flex; background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 20rpx; }
.seg-i { flex: 1; text-align: center; padding: 22rpx 0; font-size: 28rpx; color: #9aa0a6; }
.seg-i.on { background: #e6a23c; color: #fff; font-weight: 600; }
.cfg { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 20rpx; }
.seg2 { display: flex; margin-bottom: 20rpx; }
.seg2 .seg-i { border-radius: 12rpx; }
.ctrl { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: #333; background: #fff; }
.go { background: #07c160; color: #fff; border-radius: 50rpx; }
.tip { display: block; color: #e06c75; font-size: 24rpx; margin-top: 12rpx; }
.hint { display: block; color: #888; font-size: 24rpx; line-height: 1.6; margin-bottom: 16rpx; }
.result { margin-top: 10rpx; }
.grp { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.gh { font-size: 30rpx; font-weight: 700; color: #4a3f35; margin-bottom: 12rpx; display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.gtag { font-size: 22rpx; color: #fff; background: #409eff; padding: 4rpx 16rpx; border-radius: 20rpx; font-weight: 500; }
.gsex { font-size: 22rpx; color: #888; font-weight: 400; }
.mem { font-size: 28rpx; color: #5a5048; padding: 8rpx 0; display: flex; align-items: center; gap: 12rpx; }
.mem-sex { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; }
.mem-sex.male { background: #ecf5ff; color: #409eff; }
.mem-sex.female { background: #fef0f7; color: #e06c75; }
/* 深色适配 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .seg, .dark .cfg, .dark .grp, .dark .sheet { background: var(--c-card); }
.dark .seg-i { color: var(--c-sub); }
.dark .seg-i.on { background: var(--c-accent); color: #fff; }
.dark .ctrl { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .gh { color: var(--c-title); }
.dark .mem { color: var(--c-sub); }
.dark .res-t { color: var(--c-title); }
.dark .res-copy { color: var(--c-accent); }
.dark .hint { color: var(--c-sub); }
.dark .gsex { color: var(--c-sub); }
.dark .mem-sex.male { background: rgba(64,158,255,0.15); color: var(--c-primary); }
.dark .mem-sex.female { background: rgba(224,108,117,0.15); color: #ff8a91; }
</style>
