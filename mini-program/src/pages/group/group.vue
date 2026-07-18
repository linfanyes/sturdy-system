<template>
  <view class="page">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="seg">
      <text :class="['seg-i', mode === 'random' && 'on']" @click="mode = 'random'">随机分组</text>
      <text :class="['seg-i', mode === 'column' && 'on']" @click="mode = 'column'">按列分组</text>
    </view>

    <view v-if="mode === 'random'" class="cfg">
      <view class="seg2">
        <text :class="['seg-i', by === 'groups' && 'on']" @click="by = 'groups'">按组数</text>
        <text :class="['seg-i', by === 'size' && 'on']" @click="by = 'size'">按每组人数</text>
      </view>
      <input v-model="num" type="number" class="ctrl" :placeholder="by === 'groups' ? '分成几组' : '每组几人'" />
      <button class="go" @click="run">开始分组</button>
    </view>

    <view v-else class="cfg">
      <button class="go" @click="run">按座位列分组</button>
      <text class="tip" v-if="!hasLayout && tried">（需先在该班座位表中启用一个布局）</text>
    </view>

    <view class="result" v-if="groups.length">
      <view v-for="(g, gi) in groups" :key="gi" class="grp">
        <view class="gh">第 {{ gi + 1 }} 组 · {{ g.length }} 人</view>
        <view class="mem" v-for="m in g" :key="m.id">{{ m.name }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'

const classes = ref([])
const classId = ref('')
const mode = ref('random')
const by = ref('groups')
const num = ref('')
const students = ref([])
const groups = ref([])
const hasLayout = ref(false)
const tried = ref(false)

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})

async function load() {
  classes.value = await api.get('/classes')
}
onShow(load)

function pickClass(ev) {
  classId.value = classes.value[ev.detail.value].id
}

async function run() {
  tried.value = true
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  const all = await api.get('/students')
  students.value = all.filter((s) => s.classId === classId.value)
  if (!students.value.length) return uni.showToast({ title: '该班暂无学生', icon: 'none' })

  if (mode.value === 'column') {
    const layouts = (await api.get('/seat-layouts')).filter(
      (l) => l.classId === classId.value && l.active
    )
    if (!layouts.length || !layouts[0].seats || !layouts[0].seats.length) {
      hasLayout.value = false
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
      if (col.length) res.push(col)
    }
    groups.value = res
    return
  }

  const n = parseInt(num.value)
  if (!n || n < 1) return uni.showToast({ title: '请填写有效数量', icon: 'none' })
  const arr = [...students.value]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const res = []
  if (by.value === 'groups') {
    const per = Math.ceil(arr.length / n)
    for (let i = 0; i < arr.length; i += per) res.push(arr.slice(i, i + per))
  } else {
    for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n))
  }
  groups.value = res
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
.result { margin-top: 10rpx; }
.grp { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.gh { font-size: 30rpx; font-weight: 700; color: #4a3f35; margin-bottom: 12rpx; }
.mem { font-size: 28rpx; color: #5a5048; padding: 6rpx 0; }
</style>
