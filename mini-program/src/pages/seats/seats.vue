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
        <view v-if="!layouts.length" class="empty">该班级还没有座位布局</view>
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
      <view class="podium">讲 台</view>
      <view class="grid" :style="{ gridTemplateColumns: 'repeat(' + editing.cols + ', 1fr)' }">
        <view
          v-for="(cell, idx) in flatSeats"
          :key="idx"
          class="seat"
          :class="{ filled: cell.id }"
          @click="tapCell(Math.floor(idx / editing.cols), idx % editing.cols)"
        >
          {{ cell.name || '空' }}
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
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

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

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const flatSeats = computed(() => {
  if (!editing.value) return []
  const arr = []
  for (let r = 0; r < editing.value.seats.length; r++)
    for (let c = 0; c < editing.value.seats[r].length; c++) {
      const sid = editing.value.seats[r][c]
      const st = students.value.find((x) => x.id === sid)
      arr.push({ id: sid, name: st ? st.name : '' })
    }
  return arr
})
const pickOpts = computed(() => ['（清空座位）', ...students.value.map((s) => s.name)])

async function load() {
  classes.value = await api.get('/classes')
  if (classId.value) {
    layouts.value = (await api.get('/seat-layouts')).filter((l) => l.classId === classId.value)
    const all = await api.get('/students')
    students.value = all.filter((s) => s.classId === classId.value)
  }
}
onShow(load)

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
  saving.value = true
  try {
    const seats = Array.from({ length: rows }, () => Array(cols).fill(null))
    await api.post('/seat-layouts', { classId: classId.value, name: form.value.name, rows, cols, seats })
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
  editing.value = JSON.parse(JSON.stringify(l))
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
    await api.patch(`/seat-layouts/${editing.value.id}`, { seats: editing.value.seats })
    uni.showToast({ title: '座位已保存', icon: 'success' })
    editing.value = null
    await load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    busy.value = false
  }
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
.grid { display: grid; gap: 12rpx; margin-bottom: 20rpx; }
.seat { background: #fff; border-radius: 14rpx; padding: 22rpx 6rpx; text-align: center; font-size: 24rpx; color: #9aa0a6; border: 1px solid #eee; }
.seat.filled { background: #fff3d6; color: #a07b3b; border-color: #e6a23c; font-weight: 600; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; padding: 30rpx; }
.sheet .picker { padding: 24rpx; border: 1px solid #eee; border-radius: 12rpx; margin-bottom: 16rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.cancel { background: #f4f4f4; border-radius: 50rpx; }
/* 深色适配 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .item, .dark .form, .dark .sheet { background: var(--c-card); }
.dark .name { color: var(--c-title); }
.dark .on { color: var(--c-primary); }
.dark .title { color: var(--c-title); }
.dark .form input { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .seat { background: var(--c-card2); color: var(--c-sub); border-color: var(--c-border); }
.dark .seat.filled { background: var(--c-card2); color: var(--c-accent); border-color: var(--c-accent); }
.dark .podium { background: var(--c-card2); color: var(--c-sub); }
.dark .sheet .picker { border-color: var(--c-border); }
.dark .cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
