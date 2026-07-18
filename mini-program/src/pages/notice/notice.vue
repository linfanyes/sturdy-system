<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <text class="toggle" :class="hideEnded && 'on'" @click="hideEnded = !hideEnded">
        {{ hideEnded ? '显示已结束' : '隐藏已结束' }}
      </text>
      <text class="add" @click="showAdd = !showAdd">+ 发布</text>
    </view>

    <view class="list">
      <view class="n" v-for="n in shown" :key="n.id" :class="n.pinned && !n.ended && 'pin'">
        <view class="top">
          <text class="pin-ic" v-if="n.pinned && !n.ended">📌</text>
          <text class="tt">{{ n.title }}</text>
          <text class="scope">{{ n.classId }}</text>
        </view>
        <view class="content">{{ n.content }}</view>
        <view class="foot">
          <text class="t" v-if="n.ended" @click="setEnded(n, false)">恢复</text>
          <text class="t" v-else @click="setEnded(n, true)">结束</text>
          <text class="t" @click="togglePin(n)">{{ n.pinned ? '取消置顶' : '置顶' }}</text>
          <text class="t del" @click="del(n)">删除</text>
        </view>
      </view>
      <view class="empty" v-if="!shown.length">暂无公告</view>
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.title" class="inp" placeholder="公告标题" />
      <textarea v-model="form.content" class="inp area" placeholder="公告内容" />
      <picker :range="scopeOpts" @change="(e)=>form.classId = scopeOpts[e.detail.value]">
        <view class="picker sm">发布范围：{{ form.classId }}</view>
      </picker>
      <button class="ok" @click="add">发布</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const scopeOpts = ['全校', '本班', '年级']
const list = ref([])
const hideEnded = ref(true)
const showAdd = ref(false)
const form = ref({ title: '', content: '', classId: '本班' })

const shown = computed(() => {
  let arr = [...list.value]
  if (hideEnded.value) arr = arr.filter((n) => !n.ended)
  arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  return arr
})

async function load() {
  list.value = await api.get('/notices')
}
onShow(load)

async function togglePin(n) {
  try {
    await api.patch('/notices/' + n.id, { pinned: !n.pinned })
    n.pinned = !n.pinned
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
async function setEnded(n, v) {
  try {
    await api.patch('/notices/' + n.id, { ended: v })
    n.ended = v
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
async function del(n) {
  uni.showModal({
    title: '删除公告',
    content: n.title,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/notices/' + n.id)
        list.value = list.value.filter((x) => x.id !== n.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
async function add() {
  if (!form.value.title) return uni.showToast({ title: '请填标题', icon: 'none' })
  try {
    const r = await api.post('/notices', {
      classId: form.value.classId,
      title: form.value.title,
      content: form.value.content,
      pinned: false,
      ended: false,
    })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { title: '', content: '', classId: '本班' }
    uni.showToast({ title: '已发布', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '发布失败：' + (e.message || ''), icon: 'none' })
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.toggle { font-size: 26rpx; padding: 10rpx 20rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.toggle.on { background: #e8f1fb; color: #409eff; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 20rpx; }
.n { padding: 20rpx 0; border-bottom: 1px solid #f3f3f3; }
.n.pin { box-shadow: inset 4rpx 0 0 #e6a23c; }
.top { display: flex; align-items: center; gap: 10rpx; }
.pin-ic { font-size: 26rpx; }
.tt { font-size: 30rpx; font-weight: 700; color: #4a3f35; flex: 1; }
.scope { font-size: 22rpx; color: #9aa0a6; background: #f3f3f3; padding: 4rpx 12rpx; border-radius: 16rpx; }
.content { font-size: 26rpx; color: #5a5048; margin: 10rpx 0; white-space: pre-wrap; }
.foot { display: flex; gap: 28rpx; }
.t { font-size: 26rpx; color: #409eff; }
.t.del { color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 140rpx; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .list, .dark .sheet { background: var(--c-card); }
.dark .tt { color: var(--c-title); }
.dark .content { color: var(--c-sub); }
.dark .scope { background: var(--c-card2); color: var(--c-sub); }
.dark .n { border-color: var(--c-input-border); }
.dark .toggle { background: var(--c-card2); color: var(--c-sub); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
</style>
