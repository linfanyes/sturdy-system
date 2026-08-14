<template>
  <view class="tb-manage">
    <!-- 学科筛选 + 初始化 -->
    <view class="tb-bar">
      <picker class="tb-picker" :range="subjects" @change="e => subject = subjects[e.detail.value]">
        <view class="tb-pick-btn">{{ subject || '全部学科' }} ▾</view>
      </picker>
      <button class="tb-seed" :disabled="seeding" @click="seedDefaults">{{ seeding ? '导入中…' : '📚 初始化预置教材' }}</button>
    </view>
    <view class="tb-tip">初始化将写入人教版语文/数学 + 外研版英语共 32 本教材及其单元、知识点。</view>

    <!-- 面包屑 -->
    <view class="tb-crumb" v-if="view === 'units' || view === 'points'">
      <text class="tb-crumb-item" @click="backToBooks">教材</text>
      <text class="tb-crumb-sep">›</text>
      <text class="tb-crumb-item" v-if="view === 'points'" @click="backToUnits">{{ activeBook ? activeBook.name : '' }}</text>
      <text class="tb-crumb-sep" v-if="view === 'points'">›</text>
      <text class="tb-crumb-cur">{{ view === 'units' ? (activeBook ? activeBook.name : '') : (activeUnit ? activeUnit.title : '') }}</text>
    </view>

    <!-- 教材列表 -->
    <view v-if="view === 'books'" class="tb-list">
      <view class="tb-card" v-for="b in filteredBooks" :key="b.id" @click="openBook(b)">
        <view class="tb-card-hd">
          <text class="tb-card-title">{{ b.name }}</text>
          <text class="tb-arrow">›</text>
        </view>
        <view class="tb-card-meta">
          <text class="tb-tag">{{ b.subject || '-' }}</text>
          <text class="tb-tag">{{ b.grade || '-' }}</text>
          <text class="tb-tag">{{ b.term || '-' }}</text>
          <text class="tb-tag" v-if="b.publisher">{{ b.publisher }}</text>
        </view>
      </view>
      <EmptyState v-if="!loading && !filteredBooks.length" icon="📚" text="暂无教材" hint="点击上方「初始化预置教材」一键导入" />
    </view>

    <!-- 单元列表 -->
    <view v-else-if="view === 'units'" class="tb-list">
      <view class="tb-card" v-for="u in units" :key="u.id" @click="openUnit(u)">
        <view class="tb-card-hd">
          <text class="tb-card-title">{{ u.unitOrder ? '第' + u.unitOrder + '单元 · ' : '' }}{{ u.title }}</text>
          <text class="tb-arrow">›</text>
        </view>
        <text class="tb-card-sub" v-if="u.summary">{{ u.summary }}</text>
      </view>
      <EmptyState v-if="!loading && !units.length" icon="📑" text="该教材暂无单元" />
    </view>

    <!-- 知识点列表 -->
    <view v-else class="tb-list">
      <view class="tb-card" v-for="p in points" :key="p.id">
        <view class="tb-card-hd">
          <text class="tb-card-title">{{ p.title }}</text>
          <view class="tb-pt-tags">
            <text class="tb-tag type">{{ p.type || '重点' }}</text>
            <text class="tb-tag" v-if="p.difficulty">{{ p.difficulty }}</text>
          </view>
        </view>
        <text class="tb-card-content">{{ p.content }}</text>
      </view>
      <EmptyState v-if="!loading && !points.length" icon="💡" text="该单元暂无知识点" />
    </view>
  </view>
</template>

<script setup>
/**
 * 校管·教材知识库管理（对齐 Web 端 /school-admin/textbooks）
 * 三级浏览：教材 → 单元 → 知识点；支持按学科筛选与一键初始化预置教材。
 */
import { ref, computed } from 'vue'
import EmptyState from '../../../components/EmptyState/EmptyState.vue'

const props = defineProps({
  /** 父页面 apiCall(method, path, data)，携带校管 sa_token */
  api: { type: Function, required: true },
})

const subjects = ['全部', '语文', '数学', '英语']
const subject = ref('全部')
const view = ref('books') // books | units | points
const loading = ref(false)
const books = ref([])
const units = ref([])
const points = ref([])
const activeBook = ref(null)
const activeUnit = ref(null)
const seeding = ref(false)

const filteredBooks = computed(() =>
  subject.value === '全部' ? books.value : books.value.filter((b) => b.subject === subject.value),
)

async function loadBooks() {
  loading.value = true
  try {
    const res = await props.api('GET', '/school-admin/textbooks')
    books.value = Array.isArray(res) ? res : res?.items || []
  } catch (e) {
    books.value = []
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function openBook(b) {
  activeBook.value = b
  view.value = 'units'
  loading.value = true
  try {
    const res = await props.api('GET', '/school-admin/textbooks/' + b.id + '/units')
    units.value = (Array.isArray(res) ? res : res?.items || []).slice().sort((a, x) => (a.unitOrder || 0) - (x.unitOrder || 0))
  } catch (e) {
    units.value = []
    uni.showToast({ title: e.message || '加载单元失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function openUnit(u) {
  activeUnit.value = u
  view.value = 'points'
  loading.value = true
  try {
    const res = await props.api('GET', '/school-admin/textbooks/units/' + u.id + '/points')
    points.value = (Array.isArray(res) ? res : res?.items || []).slice().sort((a, x) => (a.pointOrder || 0) - (x.pointOrder || 0))
  } catch (e) {
    points.value = []
    uni.showToast({ title: e.message || '加载知识点失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function backToBooks() {
  view.value = 'books'
  activeBook.value = null
  activeUnit.value = null
}

function backToUnits() {
  view.value = 'units'
  activeUnit.value = null
}

async function seedDefaults() {
  if (seeding.value) return
  seeding.value = true
  try {
    await props.api('POST', '/school-admin/textbooks/seed-defaults', {})
    uni.showToast({ title: '预置教材已导入', icon: 'success' })
    backToBooks()
    await loadBooks()
  } catch (e) {
    uni.showToast({ title: e.message || '初始化失败', icon: 'none' })
  } finally {
    seeding.value = false
  }
}

defineExpose({ reload: loadBooks })
loadBooks()
</script>

<style scoped>
.tb-manage { padding-bottom: 20rpx; }
.tb-bar { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.tb-picker { flex-shrink: 0; }
.tb-pick-btn { background: var(--c-input); border: 1rpx solid var(--c-input-border); color: var(--c-title); font-size: 26rpx; padding: 12rpx 24rpx; border-radius: 14rpx; }
.tb-seed { flex: 1; margin: 0; background: var(--c-primary); color: #fff; font-size: 26rpx; line-height: 2.4; border-radius: 14rpx; }
.tb-seed[disabled] { opacity: 0.6; }
.tb-tip { font-size: 22rpx; color: var(--c-sub); margin-bottom: 16rpx; }
.tb-crumb { display: flex; align-items: center; gap: 8rpx; margin-bottom: 16rpx; font-size: 24rpx; color: var(--c-sub); flex-wrap: wrap; }
.tb-crumb-item { color: var(--c-primary); }
.tb-crumb-sep { opacity: 0.5; }
.tb-crumb-cur { color: var(--c-title); font-weight: 600; }
.tb-list { display: flex; flex-direction: column; gap: 14rpx; }
.tb-card { background: var(--c-card); border-radius: 18rpx; padding: 22rpx 24rpx; box-shadow: var(--c-shadow); }
.tb-card-hd { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.tb-card-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); flex: 1; }
.tb-card-meta { display: flex; gap: 10rpx; margin-top: 12rpx; flex-wrap: wrap; }
.tb-tag { font-size: 20rpx; color: var(--c-sub); background: var(--c-input); border-radius: 8rpx; padding: 4rpx 12rpx; }
.tb-tag.type { color: var(--c-primary); }
.tb-card-sub { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; }
.tb-card-content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 10rpx; line-height: 1.6; white-space: pre-wrap; }
.tb-arrow { color: var(--c-sub); font-size: 28rpx; }
.tb-pt-tags { display: flex; gap: 8rpx; }
</style>
