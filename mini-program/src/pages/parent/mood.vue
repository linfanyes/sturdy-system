<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'checkin' }" @click="tab = 'checkin'">今日心情</view>
      <view class="tab" :class="{ on: tab === 'history' }" @click="switchTab('history')">我的心情</view>
      <view class="tab" :class="{ on: tab === 'tree' }" @click="switchTab('tree')">树洞</view>
    </view>

    <!-- 今日心情打卡 -->
    <block v-if="tab === 'checkin'">
      <view class="mood-card">
        <text class="m-title">今天的感觉怎么样？</text>
        <view class="emoji-row">
          <view
            v-for="o in options"
            :key="o.level"
            class="emoji"
            :class="{ on: level === o.level }"
            @click="level = o.level"
          >
            <text class="e-ic">{{ o.icon }}</text>
            <text class="e-lb">{{ o.label }}</text>
          </view>
        </view>
        <textarea
          class="note"
          v-model="note"
          placeholder="想说点什么吗？（可选，仅老师可见）"
          maxlength="300"
        />
        <view class="bar">
          <text class="tbtn primary" @click="submitCheckin">提交今日心情</text>
        </view>
        <text class="hint" v-if="today">今日已打卡：{{ today.icon }} {{ today.label }}</text>
      </view>
    </block>

    <!-- 我的心情历史 -->
    <block v-if="tab === 'history'">
      <view v-for="m in history" :key="m.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ m.emoji || '·' }} {{ levelLabel(m.level) }}</text>
          <text class="c-meta">{{ m.date }}</text>
        </view>
        <text class="c-note" v-if="m.note">{{ m.note }}</text>
      </view>
      <EmptyState v-if="!history.length" icon="🌤️" text="还没有心情记录" hint="每天花 10 秒打个卡，让老师更懂你" />
    </block>

    <!-- 树洞（匿名倾诉） -->
    <block v-if="tab === 'tree'">
      <view class="mood-card">
        <text class="m-title">树洞 · 想说就说（匿名）</text>
        <textarea
          class="note"
          v-model="treeContent"
          placeholder="这里说的话只有你和老师知道，可以放心倾诉……"
          maxlength="500"
        />
        <view class="bar">
          <text class="tbtn primary" @click="submitTree">匿名提交</text>
        </view>
      </view>
      <view v-for="t in trees" :key="t.id" class="card tree">
        <text class="c-note">{{ t.content }}</text>
        <view class="reply" v-if="t.aiReply">
          <text class="r-label">🌱 暖心回复</text>
          <text class="r-text">{{ t.aiReply }}</text>
        </view>
        <view class="reply staff" v-if="t.staffReply">
          <text class="r-label">👩‍🏫 老师回复</text>
          <text class="r-text">{{ t.staffReply }}</text>
        </view>
        <text class="c-meta">{{ t.createdAt ? t.createdAt.slice(0, 10) : '' }} · {{ riskLabel(t.riskLevel) }}</text>
      </view>
      <EmptyState v-if="!trees.length" icon="🕳️" text="树洞很安静" hint="把心里的话写下来，会轻松一些" />
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  checkInMood, listMyMood, submitTreeHole, listMyTreeHoles,
} from '@/api/mood'
import { theme } from '../../common/store'

const tab = ref('checkin')
const level = ref(0)
const note = ref('')
const treeContent = ref('')
const history = ref([])
const trees = ref([])
const today = ref(null)

const options = [
  { level: 1, icon: '😣', label: '很低落' },
  { level: 2, icon: '😟', label: '有点闷' },
  { level: 3, icon: '😐', label: '还行' },
  { level: 4, icon: '🙂', label: '不错' },
  { level: 5, icon: '😄', label: '很好' },
]

function levelLabel(l) {
  return (options.find((o) => o.level === l) || {}).label || '—'
}
function riskLabel(r) {
  return r === 'high' ? '需关注' : r === 'low' ? '轻微' : '正常'
}

async function load() {
  await loadHistory()
  await loadTrees()
}
async function loadHistory() {
  try {
    const list = (await listMyMood()) || []
    history.value = list
    const t = list.find((m) => m.date === todayStr())
    today.value = t ? { icon: (options.find((o) => o.level === t.level) || {}).icon, label: levelLabel(t.level) } : null
  } catch (e) { history.value = [] }
}
async function loadTrees() {
  try { trees.value = (await listMyTreeHoles()) || [] } catch (e) { trees.value = [] }
}
function switchTab(t) {
  tab.value = t
  if (t === 'history') loadHistory()
  if (t === 'tree') loadTrees()
}
function todayStr() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
async function submitCheckin() {
  if (!level.value) { uni.showToast({ title: '请先选择一个心情', icon: 'none' }); return }
  try {
    await checkInMood({ level: level.value, note: note.value || null })
    uni.showToast({ title: '已记录，谢谢分享', icon: 'success' })
    note.value = ''
    await loadHistory()
  } catch (e) {
    uni.showToast({ title: '提交失败：' + (e.message || ''), icon: 'none' })
  }
}
async function submitTree() {
  if (!treeContent.value.trim()) { uni.showToast({ title: '写点什么吧', icon: 'none' }); return }
  try {
    await submitTreeHole({ content: treeContent.value.trim() })
    uni.showToast({ title: '已收到，会有人陪你', icon: 'success' })
    treeContent.value = ''
    await loadTrees()
  } catch (e) {
    uni.showToast({ title: '提交失败：' + (e.message || ''), icon: 'none' })
  }
}

onShow(() => load())
</script>

<style scoped>
.page { padding: 24rpx; min-height: 100vh; background: #f6f7fb; }
.page.dark { background: #15171c; }
.tabs { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; background: #fff; color: #555; font-size: 26rpx; }
.tab.on { background: #4f7cff; color: #fff; }
.mood-card { background: #fff; border-radius: 20rpx; padding: 32rpx 28rpx; margin-bottom: 20rpx; }
.m-title { font-size: 30rpx; font-weight: 600; color: #222; display: block; margin-bottom: 24rpx; }
.emoji-row { display: flex; justify-content: space-between; gap: 8rpx; }
.emoji { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 16rpx 0; border-radius: 16rpx; background: #f3f5fa; }
.emoji.on { background: #e8f0ff; outline: 2rpx solid #4f7cff; }
.e-ic { font-size: 52rpx; }
.e-lb { font-size: 22rpx; color: #666; margin-top: 6rpx; }
.note { width: 100%; min-height: 140rpx; margin-top: 24rpx; padding: 20rpx; background: #f7f8fc; border-radius: 14rpx; font-size: 26rpx; box-sizing: border-box; }
.bar { display: flex; justify-content: flex-end; margin-top: 18rpx; }
.tbtn { padding: 16rpx 28rpx; border-radius: 14rpx; background: #eef1f6; color: #444; font-size: 26rpx; }
.tbtn.primary { background: #4f7cff; color: #fff; }
.hint { display: block; margin-top: 16rpx; font-size: 24rpx; color: #4f7cff; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.c-top { display: flex; justify-content: space-between; align-items: center; }
.c-title { font-size: 28rpx; color: #222; font-weight: 600; }
.c-meta { font-size: 22rpx; color: #999; }
.c-note { display: block; margin-top: 12rpx; font-size: 26rpx; color: #555; line-height: 1.5; }
.tree .reply { margin-top: 14rpx; padding: 16rpx; border-radius: 12rpx; background: #f3f8f4; }
.tree .reply.staff { background: #fff6ec; }
.r-label { display: block; font-size: 22rpx; color: #4f7cff; margin-bottom: 6rpx; }
.tree .reply.staff .r-label { color: #e08a2b; }
.r-text { font-size: 25rpx; color: #444; line-height: 1.5; }
.dark .mood-card, .dark .tab, .dark .card { background: #23262e; }
.dark .m-title, .dark .c-title { color: #eee; }
.dark .tab { color: #aaa; }
.dark .note, .dark .emoji { background: #2c2f38; }
.dark .c-note, .dark .r-text { color: #bbb; }
</style>
