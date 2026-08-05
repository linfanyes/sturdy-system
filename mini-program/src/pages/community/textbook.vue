<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="header">
      <text class="title">📚 教材知识库</text>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input v-model="keyword" class="search-inp" placeholder="搜索知识点（如：多音字、分数加减）" confirm-type="search" @confirm="doSearch" />
      <text v-if="keyword" class="search-clear" @click="keyword=''; searchResults=[]">×</text>
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searchResults.length" class="card">
      <view class="sec-title">🔍 搜索结果（{{ searchResults.length }} 条）</view>
      <view v-for="r in searchResults" :key="r.id" class="result-item">
        <view class="result-title">
          {{ r.title }}
          <text v-if="r.type" class="tag">{{ r.type }}</text>
          <text v-if="r.difficulty" class="tag diff">{{ r.difficulty }}</text>
          <text class="tag book">{{ r.textbookName }}</text>
        </view>
        <view class="result-content">{{ r.content }}</view>
        <view v-if="r.keywords" class="result-keywords">🏷 {{ r.keywords }}</view>
      </view>
    </view>

    <!-- 教材树 -->
    <template v-if="!keyword">
      <view class="filter-bar">
        <picker :range="SUBJECTS" :value="subjectIdx" @change="onSubjectChange">
          <view class="picker">{{ SUBJECTS[subjectIdx] || '全部学科' }}</view>
        </picker>
        <picker :range="GRADES" :value="gradeIdx" @change="onGradeChange">
          <view class="picker">{{ GRADES[gradeIdx] || '全部年级' }}</view>
        </picker>
      </view>

      <view v-if="loading" class="loading">加载中…</view>
      <view v-else-if="!tree.length" class="empty">
        <text class="empty-icon">📚</text>
        <text>暂无教材知识点，请联系学校管理员导入</text>
      </view>
      <view v-else class="tree">
        <view v-for="t in tree" :key="t.id" class="textbook">
          <view class="textbook-head" @click="toggleTextbook(t.id)">
            <text class="arrow">{{ expandedTextbooks.has(t.id) ? '▼' : '▶' }}</text>
            <text class="emoji">{{ t.subject === '语文' ? '📜' : t.subject === '数学' ? '🔢' : t.subject === '英语' ? '🔤' : '📚' }}</text>
            <view class="textbook-info">
              <text class="textbook-name">{{ t.name }}</text>
              <text class="textbook-meta">{{ t.publisher }} · {{ t.grade }} · {{ t.term }} · {{ t.units?.length || 0 }} 单元</text>
            </view>
          </view>
          <view v-if="expandedTextbooks.has(t.id)" class="units">
            <view v-if="!t.units?.length" class="unit-empty">暂无单元</view>
            <view v-for="u in t.units" :key="u.id" class="unit">
              <view class="unit-head" @click="toggleUnit(u.id)">
                <text class="arrow">{{ expandedUnits.has(u.id) ? '▼' : '▶' }}</text>
                <text class="unit-title">{{ u.title }}</text>
                <text v-if="u.knowledgePoints?.length" class="unit-count">{{ u.knowledgePoints.length }} 个知识点</text>
              </view>
              <view v-if="expandedUnits.has(u.id)" class="points">
                <view v-if="!u.knowledgePoints?.length" class="point-empty">暂无知识点</view>
                <view v-for="p in u.knowledgePoints" :key="p.id" class="point">
                  <view class="point-title">
                    {{ p.title }}
                    <text v-if="p.type" class="tag">{{ p.type }}</text>
                    <text v-if="p.difficulty" class="tag diff">{{ p.difficulty }}</text>
                  </view>
                  <view class="point-content">{{ p.content }}</view>
                  <view v-if="p.keywords" class="point-keywords">🏷 {{ p.keywords }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { auth, theme } from '../../common/store'
import api from '../../common/request'

const dark = computed(() => theme.mode === 'dark')
const loading = ref(false)
const tree = ref([])
const expandedTextbooks = ref(new Set())
const expandedUnits = ref(new Set())
const subjectIdx = ref(0)
const gradeIdx = ref(0)
const keyword = ref('')
const searchResults = ref([])

const SUBJECTS = ['', '语文', '数学', '英语']
const GRADES = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

onLoad(() => {
  loadTree()
})

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})

async function loadTree() {
  loading.value = true
  try {
    const params = {}
    if (SUBJECTS[subjectIdx.value]) params.subject = SUBJECTS[subjectIdx.value]
    if (GRADES[gradeIdx.value]) params.grade = GRADES[gradeIdx.value]
    const res = await api.get('/textbooks/tree', { params })
    tree.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e) {
    tree.value = []
  } finally {
    loading.value = false
  }
}

function onSubjectChange(e) {
  subjectIdx.value = Number(e.detail.value)
  loadTree()
}
function onGradeChange(e) {
  gradeIdx.value = Number(e.detail.value)
  loadTree()
}
function toggleTextbook(id) {
  const s = new Set(expandedTextbooks.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedTextbooks.value = s
}
function toggleUnit(id) {
  const s = new Set(expandedUnits.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedUnits.value = s
}

async function doSearch() {
  if (!keyword.value.trim()) { searchResults.value = []; return }
  try {
    const res = await api.get('/textbooks/search', { params: { keyword: keyword.value.trim() } })
    searchResults.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e) {
    searchResults.value = []
  }
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.search-bar { display: flex; gap: 12rpx; margin-bottom: 20rpx; align-items: center; }
.search-inp { flex: 1; border: 1px solid var(--c-border); border-radius: 40rpx; padding: 16rpx 40rpx 16rpx 24rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); }
.search-clear { position: absolute; right: 140rpx; font-size: 32rpx; color: var(--c-sub); }
.search-btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; padding: 12rpx 28rpx; font-size: 26rpx; }
.filter-bar { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.picker { flex: 1; border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-title); text-align: center; }
.loading { text-align: center; padding: 40rpx; color: var(--c-sub); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80rpx 0; color: var(--c-sub); gap: 16rpx; }
.empty-icon { font-size: 64rpx; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.result-item { border-bottom: 1px solid var(--c-border); padding: 16rpx 0; }
.result-item:last-child { border-bottom: none; }
.result-title { font-size: 28rpx; font-weight: 600; color: var(--c-title); margin-bottom: 8rpx; display: flex; flex-wrap: wrap; gap: 8rpx; align-items: center; }
.tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 12rpx; background: var(--c-input); color: var(--c-sub); }
.tag.diff { background: #e3f2fd; color: #1565c0; }
.tag.book { background: #fff3e0; color: #e65100; }
.result-content { font-size: 26rpx; color: var(--c-text); line-height: 1.7; white-space: pre-wrap; }
.result-keywords { font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; }
.tree { display: flex; flex-direction: column; gap: 16rpx; }
.textbook { background: var(--c-card); border-radius: 20rpx; overflow: hidden; }
.textbook-head { display: flex; align-items: center; gap: 12rpx; padding: 20rpx; cursor: pointer; }
.arrow { font-size: 22rpx; color: var(--c-sub); width: 28rpx; }
.emoji { font-size: 40rpx; }
.textbook-info { flex: 1; }
.textbook-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); display: block; }
.textbook-meta { font-size: 22rpx; color: var(--c-sub); }
.units { border-top: 1px solid var(--c-border); padding: 0 20rpx 16rpx; }
.unit-empty { text-align: center; padding: 20rpx; color: var(--c-sub); font-size: 24rpx; }
.unit { margin-top: 12rpx; }
.unit-head { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; cursor: pointer; }
.unit-title { flex: 1; font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.unit-count { font-size: 22rpx; color: var(--c-sub); }
.points { padding-left: 40rpx; }
.point-empty { text-align: center; padding: 16rpx; color: var(--c-sub); font-size: 22rpx; }
.point { padding: 16rpx; background: var(--c-input); border-radius: 12rpx; margin-top: 10rpx; }
.point-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); margin-bottom: 8rpx; display: flex; flex-wrap: wrap; gap: 8rpx; align-items: center; }
.point-content { font-size: 24rpx; color: var(--c-text); line-height: 1.7; white-space: pre-wrap; }
.point-keywords { font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; }
</style>
