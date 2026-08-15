<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'challenges' }" @click="tab = 'challenges'">任务卡</view>
      <view class="tab" :class="{ on: tab === 'review' }" @click="switchTab('review')">待点评</view>
      <view class="tab" :class="{ on: tab === 'gallery' }" @click="switchTab('gallery')">作品墙</view>
    </view>

    <!-- 任务卡 -->
    <block v-if="tab === 'challenges'">
      <view class="bar">
        <text class="tbtn" @click="openNewChallenge">＋ 新建任务卡</text>
      </view>
      <view v-for="c in challenges" :key="c.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ c.title }}</text>
          <text class="c-del" @click="delChallenge(c)">删除</text>
        </view>
        <text class="c-goal" v-if="c.goal">{{ c.goal }}</text>
        <text class="c-meta">班级：{{ className(c.classId) }} · 积木数：{{ (c.starterBlocks || []).length }}</text>
      </view>
      <EmptyState v-if="!challenges.length" icon="🧩" text="暂无任务卡" hint="点击下方按钮发布首个编程任务" />
    </block>

    <!-- 待点评 -->
    <block v-if="tab === 'review'">
      <picker :range="challengeOpts" @change="onPickChallenge">
        <view class="picker">任务卡：{{ curChallengeName }}</view>
      </picker>
      <view v-if="submissions.length" class="hint">共 {{ submissions.length }} 份提交，点星评级后保存点评。</view>
      <view v-for="s in submissions" :key="s.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ s.studentName || s.title || '未命名作品' }}</text>
          <text class="c-meta">{{ s.submittedAt ? new Date(s.submittedAt).toLocaleString('zh-CN') : '' }}</text>
        </view>
        <view class="stars">
          <text
            v-for="n in 5"
            :key="n"
            class="star"
            :class="{ on: (draft[s.id]?.rating || 0) >= n }"
            @click="setRating(s.id, n)"
          >★</text>
          <text class="star-val">{{ draft[s.id]?.rating || 0 }} 星</text>
        </view>
        <input v-model="draft[s.id].comment" class="inp" placeholder="写一句评语…" />
        <view class="c-btns">
          <text class="c-btn" @click="saveReview(s)">保存点评</text>
          <text class="c-btn feat" :class="{ on: s.showInGallery }" @click="toggleFeature(s)">
            {{ s.showInGallery ? '已入选作品墙' : '选入作品墙' }}
          </text>
        </view>
      </view>
      <EmptyState v-if="tab === 'review' && !submissions.length" icon="✍️" text="该任务卡暂无提交" />
    </block>

    <!-- 作品墙 -->
    <block v-if="tab === 'gallery'">
      <view v-for="g in gallery" :key="g.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ g.title }}</text>
          <text class="c-del" @click="toggleFeature(g)">移出作品墙</text>
        </view>
        <text class="c-meta">{{ g.teacherName || g.studentName || '' }} · 积木数：{{ (g.blocks || []).length }}</text>
      </view>
      <EmptyState v-if="!gallery.length" icon="🖼️" text="作品墙暂无作品" hint="在「待点评」中把优秀作品选入作品墙" />
    </block>

    <!-- 新建任务卡弹层 -->
    <view v-if="showNew" class="mask" @click="showNew = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">新建任务卡</view>
        <input v-model="newForm.title" class="inp" placeholder="任务名称，如：画一个正方形" />
        <input v-model="newForm.goal" class="inp" placeholder="任务目标（可选）" />
        <picker :range="classOpts" @change="(e) => (newForm.classId = classes[e.detail.value]?.id)">
          <view class="picker sm">{{ className(newForm.classId) || '选择班级（可选）' }}</view>
        </picker>
        <view class="sh-bar">
          <button class="btn del" @click="showNew = false">取消</button>
          <button class="btn ok" :disabled="saving" @click="createChallengeX">{{ saving ? '保存中…' : '创建' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  listTeacherChallenges, createChallenge, removeChallenge,
  listChallengeSubmissions, createReview, featureSubmission, unfeatureSubmission,
  listCodingProjects,
} from '@/api/kids-coding'
import { listClasses } from '@/api/teaching'
import { theme } from '../../common/store'

const tab = ref('challenges')
const challenges = ref([])
const classes = ref([])
const submissions = ref([])
const gallery = ref([])
const curChallengeId = ref('')
const showNew = ref(false)
const saving = ref(false)
const newForm = reactive({ title: '', goal: '', classId: '' })
// 点评草稿：{ [projectId]: { rating, comment } }
const draft = reactive({})

const classOpts = computed(() => classes.value.map((c) => c.name))
const challengeOpts = computed(() => challenges.value.map((c) => c.title))
const curChallengeName = computed(() => {
  const c = challenges.value.find((x) => x.id === curChallengeId.value)
  return c ? c.title : '请选择任务卡'
})
function className(id) {
  const c = classes.value.find((x) => x.id === id)
  return c ? c.name : (id || '全校')
}

async function load() {
  classes.value = await listClasses({ silent: true })
  await loadChallenges()
  if (tab.value === 'review') await loadSubmissions()
  if (tab.value === 'gallery') await loadGallery()
}
async function loadChallenges() {
  try {
    challenges.value = (await listTeacherChallenges()) || []
  } catch (e) {
    challenges.value = []
  }
}
async function loadSubmissions() {
  if (!curChallengeId.value && challenges.value.length) curChallengeId.value = challenges.value[0].id
  if (!curChallengeId.value) { submissions.value = []; return }
  try {
    const list = (await listChallengeSubmissions(curChallengeId.value)) || []
    submissions.value = list
    for (const s of list) {
      if (!draft[s.id]) draft[s.id] = { rating: s.rating || 0, comment: s.comment || '' }
    }
  } catch (e) {
    submissions.value = []
  }
}
async function loadGallery() {
  try {
    const all = (await listCodingProjects()) || []
    gallery.value = all.filter((p) => p.showInGallery)
  } catch (e) {
    gallery.value = []
  }
}
function switchTab(t) {
  tab.value = t
  if (t === 'review') loadSubmissions()
  if (t === 'gallery') loadGallery()
}
function onPickChallenge(e) {
  curChallengeId.value = challenges.value[e.detail.value].id
  loadSubmissions()
}
function setRating(id, n) {
  if (!draft[id]) draft[id] = { rating: 0, comment: '' }
  draft[id].rating = draft[id].rating === n ? n - 1 : n
}
async function saveReview(s) {
  const d = draft[s.id] || { rating: 0, comment: '' }
  try {
    await createReview({
      projectId: s.id,
      challengeId: s.challengeId || curChallengeId.value,
      studentId: s.studentId || null,
      comment: d.comment,
      rating: d.rating || null,
    })
    uni.showToast({ title: '已保存点评', icon: 'success' })
    await loadSubmissions()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  }
}
async function toggleFeature(s) {
  try {
    if (s.showInGallery) {
      await unfeatureSubmission(s.id)
    } else {
      await featureSubmission(s.id)
    }
    uni.showToast({ title: s.showInGallery ? '已移出作品墙' : '已选入作品墙', icon: 'none' })
    await loadSubmissions()
    if (tab.value === 'gallery') await loadGallery()
  } catch (e) {
    uni.showToast({ title: '操作失败：' + (e.message || ''), icon: 'none' })
  }
}
function openNewChallenge() {
  newForm.title = ''
  newForm.goal = ''
  newForm.classId = ''
  showNew.value = true
}
async function createChallengeX() {
  if (!newForm.title.trim()) return uni.showToast({ title: '请填任务名称', icon: 'none' })
  saving.value = true
  try {
    await createChallenge({
      title: newForm.title.trim(),
      goal: newForm.goal.trim() || null,
      classId: newForm.classId || null,
      starterBlocks: [],
    })
    uni.showToast({ title: '任务卡已创建', icon: 'success' })
    showNew.value = false
    await loadChallenges()
  } catch (e) {
    uni.showToast({ title: '创建失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
async function delChallenge(c) {
  uni.showModal({
    title: '删除任务卡',
    content: '确定删除「' + c.title + '」？已提交的作品不受影响。',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await removeChallenge(c.id)
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadChallenges()
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
onShow(load)
</script>

<style scoped>
.page { padding: 24rpx; }
.tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; font-size: 28rpx; background: var(--c-card); color: var(--c-sub); border: 1px solid var(--c-border); }
.tab.on { background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%); color: #5a3e1b; font-weight: 700; border-color: transparent; }
.dark .tab { background: var(--c-card); color: var(--c-sub); }
.dark .tab.on { background: linear-gradient(135deg, #2a2f3a 0%, #383f4d 100%); color: #f2f2f2; }
.bar { margin-bottom: 16rpx; }
.tbtn { font-size: 24rpx; color: #fff; background: var(--c-primary); padding: 12rpx 28rpx; border-radius: 30rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; border: 1px solid var(--c-border); }
.c-top { display: flex; justify-content: space-between; align-items: center; }
.c-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.c-goal { display: block; font-size: 24rpx; color: var(--c-sub); margin: 8rpx 0; line-height: 1.5; }
.c-meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.c-del { font-size: 24rpx; color: var(--c-danger); }
.stars { display: flex; align-items: center; gap: 6rpx; margin: 14rpx 0; }
.star { font-size: 44rpx; color: #d9d9d9; }
.star.on { color: #f5b342; }
.star-val { font-size: 24rpx; color: var(--c-sub); margin-left: 10rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: var(--c-input); width: 100%; box-sizing: border-box; }
.c-btns { display: flex; gap: 16rpx; }
.c-btn { font-size: 26rpx; color: #fff; background: var(--c-blue); padding: 12rpx 24rpx; border-radius: 30rpx; }
.c-btn.feat { background: var(--c-primary); }
.c-btn.feat.on { background: var(--c-accent); }
.picker { background: var(--c-card); border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 16rpx; font-size: 28rpx; border: 1px solid var(--c-border); }
.picker.sm { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; font-size: 28rpx; background: var(--c-input); width: 100%; box-sizing: border-box; }
.hint { font-size: 22rpx; color: var(--c-sub); margin-bottom: 12rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.sh-bar { display: flex; gap: 20rpx; margin-top: 8rpx; }
.btn { flex: 1; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.btn.ok { background: var(--c-primary); }
.btn.del { background: var(--c-danger); flex: 0 0 200rpx; }
.dark .page { background: var(--c-bg); }
.dark .card, .dark .picker { background: var(--c-card); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
</style>
