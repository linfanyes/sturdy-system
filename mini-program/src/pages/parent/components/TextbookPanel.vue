<template>
  <scroll-view scroll-y class="tab-body">
    <view class="sec">
      <view class="st">📚 教材知识点</view>
      <view class="tb-search-row">
        <input class="tb-search-input" v-model="keyword" placeholder="搜索知识点（如：多音字）" confirm-type="search" @confirm="search" />
        <view class="tb-search-btn" @click="search">🔍</view>
        <view v-if="keyword" class="tb-search-clear" @click="clearSearch">✕</view>
      </view>
      <view class="tb-filter-row">
        <view v-for="s in SUBJECTS" :key="s" class="tb-chip" :class="{ on: filterSubject === s }" @click="filterSubject = s; load()">{{ s || '全部学科' }}</view>
      </view>
      <view class="tb-filter-row">
        <view v-for="g in GRADES" :key="g" class="tb-chip" :class="{ on: filterGrade === g }" @click="filterGrade = g; load()">{{ g || '全部年级' }}</view>
      </view>
      <view v-if="searchResults.length" class="tb-search-results">
        <view class="tb-search-title">🔍 搜索结果（{{ searchResults.length }} 条）</view>
        <view v-for="r in searchResults" :key="r.id" class="tb-kp-card">
          <view class="tb-kp-title">{{ r.title }}<text class="tb-kp-type">{{ r.type }}</text><text v-if="r.difficulty" class="tb-kp-diff">{{ r.difficulty }}</text></view>
          <view class="tb-kp-content">{{ r.content }}</view>
          <view class="tb-kp-from">{{ r.textbookName }} · {{ r.unitTitle }}</view>
        </view>
      </view>
      <view v-if="!keyword">
        <view v-if="loading" class="empty-card"><text class="empty-text">加载中…</text></view>
        <view v-else-if="!textbooks.length" class="empty-card">
          <text class="empty-icon">📚</text>
          <text class="empty-text">暂无教材知识点，请联系学校管理员导入</text>
        </view>
        <view v-else>
          <view v-for="g in groupedTree" :key="g.grade" class="tb-grade">
            <view class="tb-grade-title">🎓 {{ g.grade }}</view>
            <view v-for="sub in g.subjects" :key="sub.subject" class="tb-subject">
              <view class="tb-subject-title">{{ subjectIcon(sub.subject) }} {{ sub.subject }}</view>
              <view v-for="t in sub.textbooks" :key="t.id" class="tb-textbook">
                <view class="tb-textbook-head" @click="toggleTextbook(t.id)">
                  <text class="tb-arrow">{{ expandedTextbooks[t.id] ? '▾' : '▸' }}</text>
                  <text class="tb-emoji">{{ subjectIcon(t.subject) }}</text>
                  <view class="tb-textbook-info">
                    <text class="tb-textbook-name">{{ t.name }}</text>
                    <text class="tb-textbook-sub">{{ t.publisher }} · {{ t.grade }} · {{ t.term }}</text>
                  </view>
                </view>
                <view v-if="expandedTextbooks[t.id]" class="tb-units">
                  <view v-if="!t.units || !t.units.length" class="tb-empty">暂无单元</view>
                  <view v-for="u in t.units" :key="u.id" class="tb-unit">
                    <view class="tb-unit-head" @click="toggleUnit(u.id)">
                      <text class="tb-arrow-sm">{{ expandedUnits[u.id] ? '▾' : '▸' }}</text>
                      <text class="tb-unit-title">{{ u.title }}</text>
                    </view>
                    <view v-if="expandedUnits[u.id]" class="tb-points">
                      <view v-if="!u.knowledgePoints || !u.knowledgePoints.length" class="tb-empty">暂无知识点</view>
                      <view v-for="p in u.knowledgePoints" :key="p.id" class="tb-kp-card">
                        <view class="tb-kp-title">{{ p.title }}<text class="tb-kp-type">{{ p.type }}</text><text v-if="p.difficulty" class="tb-kp-diff">{{ p.difficulty }}</text></view>
                        <view class="tb-kp-content">{{ p.content }}</view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parentApi } from '../../../common/request'

const textbooks = ref([])
const loading = ref(false)
const filterSubject = ref('')
const filterGrade = ref('')
const keyword = ref('')
const searchResults = ref([])
const expandedTextbooks = ref({})
const expandedUnits = ref({})

// 学科/年级选项（与共享常量保持一致）
const SUBJECTS = ['', '语文', '数学', '英语']
const GRADES = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

async function load() {
  if (keyword.value) return
  loading.value = true
  try {
    // 同时按学科/年级过滤，传给后端 GET /textbooks/tree
    const params = []
    if (filterSubject.value) params.push('subject=' + encodeURIComponent(filterSubject.value))
    if (filterGrade.value) params.push('grade=' + encodeURIComponent(filterGrade.value))
    const url = '/textbooks/tree' + (params.length ? '?' + params.join('&') : '')
    textbooks.value = await parentApi.get(url)
  } catch (e) { textbooks.value = [] }
  finally { loading.value = false }
}

/**
 * 按 年级 → 学科 → 教材 → 单元 → 知识点 分组（前端基于 tree 接口返回数据分组，
 * 后端 GET /textbooks/tree 已支持 subject/grade/term 过滤，此处仅做展示分组）。
 */
function buildSubjects(bySubject) {
  const subjects = []
  for (const s of SUBJECTS) {
    if (!s || !bySubject[s]) continue
    subjects.push({ subject: s, textbooks: bySubject[s] })
  }
  for (const s of Object.keys(bySubject)) {
    if (SUBJECTS.includes(s)) continue
    subjects.push({ subject: s, textbooks: bySubject[s] })
  }
  return subjects
}

const groupedTree = computed(() => {
  const byGrade = {}
  for (const t of textbooks.value) {
    if (!byGrade[t.grade]) byGrade[t.grade] = {}
    if (!byGrade[t.grade][t.subject]) byGrade[t.grade][t.subject] = []
    byGrade[t.grade][t.subject].push(t)
  }
  const result = []
  const seenGrades = {}
  for (const g of GRADES) {
    if (!g || !byGrade[g]) continue
    seenGrades[g] = true
    result.push({ grade: g, subjects: buildSubjects(byGrade[g]) })
  }
  for (const g of Object.keys(byGrade)) {
    if (seenGrades[g]) continue
    result.push({ grade: g, subjects: buildSubjects(byGrade[g]) })
  }
  return result
})

function subjectIcon(subject) {
  return subject === '语文' ? '📜' : subject === '数学' ? '🔢' : subject === '英语' ? '🔤' : '📚'
}

function toggleTextbook(id) {
  expandedTextbooks.value = { ...expandedTextbooks.value, [id]: !expandedTextbooks.value[id] }
}

function toggleUnit(id) {
  expandedUnits.value = { ...expandedUnits.value, [id]: !expandedUnits.value[id] }
}

async function search() {
  if (!keyword.value.trim()) { searchResults.value = []; return }
  try {
    searchResults.value = await parentApi.get(`/textbooks/search?keyword=${encodeURIComponent(keyword.value.trim())}`)
  } catch { searchResults.value = [] }
}

function clearSearch() {
  keyword.value = ''
  searchResults.value = []
}

defineExpose({ load })
</script>

<style scoped>
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
.tb-search-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.tb-search-input { flex: 1; background: var(--c-card); border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 26rpx; color: var(--c-title); }
.tb-search-btn { width: 64rpx; height: 64rpx; border-radius: 12rpx; background: var(--c-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.tb-search-clear { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; color: var(--c-sub); font-size: 28rpx; }
.tb-filter-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.tb-chip { padding: 8rpx 24rpx; border-radius: 20rpx; background: var(--c-card); color: var(--c-sub); font-size: 24rpx; }
.tb-chip.on { background: var(--c-primary); color: #fff; }
.tb-search-results { margin-bottom: 16rpx; }
.tb-search-title { font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 12rpx; }
.tb-textbook { background: var(--c-card); border-radius: 16rpx; margin-bottom: 12rpx; overflow: hidden; }
.tb-grade { background: var(--c-card); border-radius: 16rpx; margin-bottom: 12rpx; overflow: hidden; }
.tb-grade-title { font-size: 28rpx; font-weight: 700; color: var(--c-primary); padding: 16rpx 20rpx; background: rgba(0,0,0,0.03); }
.tb-subject { border-top: 1rpx solid rgba(0,0,0,0.04); }
.tb-subject-title { font-size: 24rpx; color: var(--c-sub); font-weight: 600; padding: 12rpx 20rpx 4rpx; }
.tb-subject .tb-textbook { border-radius: 12rpx; margin: 0 16rpx 12rpx; }
.tb-textbook-head { display: flex; align-items: center; padding: 20rpx; gap: 12rpx; }
.tb-arrow { font-size: 24rpx; color: var(--c-sub); }
.tb-arrow-sm { font-size: 22rpx; color: var(--c-sub); margin-right: 8rpx; }
.tb-emoji { font-size: 36rpx; }
.tb-textbook-info { flex: 1; display: flex; flex-direction: column; }
.tb-textbook-name { font-size: 28rpx; color: var(--c-title); font-weight: 600; }
.tb-textbook-sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.tb-units { padding: 0 20rpx 16rpx 40rpx; }
.tb-unit { padding: 12rpx 0; border-top: 1rpx solid rgba(0,0,0,0.04); }
.tb-unit-head { display: flex; align-items: center; padding: 6rpx 0; }
.tb-unit-title { font-size: 26rpx; color: var(--c-title); flex: 1; }
.tb-points { padding: 8rpx 0 4rpx 20rpx; }
.tb-kp-card { background: rgba(0,0,0,0.02); border-radius: 12rpx; padding: 16rpx; margin-bottom: 10rpx; }
.tb-kp-title { font-size: 26rpx; color: var(--c-title); font-weight: 600; display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.tb-kp-type { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 10rpx; background: #fef3c7; color: #92400e; }
.tb-kp-diff { font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 10rpx; background: #dbeafe; color: #1e40af; }
.tb-kp-content { font-size: 24rpx; color: var(--c-title); line-height: 1.6; margin-top: 8rpx; white-space: pre-wrap; }
.tb-empty { font-size: 24rpx; color: var(--c-sub); padding: 16rpx 0; text-align: center; }
</style>
