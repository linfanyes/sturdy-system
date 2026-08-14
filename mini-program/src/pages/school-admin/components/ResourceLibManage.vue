<template>
  <view class="rl-manage">
    <!-- 分类切换 -->
    <view class="rl-tabs">
      <text
        v-for="c in CATS"
        :key="c.key"
        class="rl-tab"
        :class="{ on: cat === c.key }"
        @click="switchCat(c.key)"
      >{{ c.icon }} {{ c.label }}</text>
    </view>

    <!-- 搜索 + 初始化 -->
    <view class="rl-bar">
      <input v-model="kw" class="rl-search" placeholder="🔍 搜索标题/释义/关键词" confirm-type="search" @confirm="load" />
      <button class="rl-seed" :disabled="seeding" @click="seedDefaults">{{ seeding ? '导入中…' : '📦 初始化' }}</button>
    </view>
    <view class="rl-tip">初始化将一次性导入全部五个分类的预置资源（古诗词 / 数学公式 / 分类单词 / 科学 / 道德与法治），已存在的会自动跳过。</view>

    <!-- 列表 -->
    <view class="rl-list">
      <view class="rl-card" v-for="it in list" :key="it.id" @click="toggleDetail(it)">
        <view class="rl-card-hd">
          <text class="rl-card-title">{{ titleOf(it) }}</text>
          <view class="rl-ops">
            <text class="rl-meta">{{ metaOf(it) }}</text>
            <text class="rl-del" @click.stop="remove(it)">删除</text>
          </view>
        </view>
        <text class="rl-card-sub" v-if="subOf(it)">{{ subOf(it) }}</text>
        <text v-if="expandId === it.id && it.content" class="rl-card-content">{{ it.content }}</text>
      </view>
      <EmptyState v-if="!loading && !list.length" icon="🗃️" text="暂无资源" hint="点击上方「初始化」导入预置数据" />
    </view>
  </view>
</template>

<script setup>
/**
 * 校管·专项资源库管理（对齐 Web 端 /school-admin/resource-library）
 * 五分类：古诗词 / 数学公式 / 英语单词 / 科学 / 道德与法治；支持关键词搜索、详情展开、删除、一键初始化。
 */
import { ref } from 'vue'
import EmptyState from '../../../components/EmptyState/EmptyState.vue'

const props = defineProps({
  /** 父页面 apiCall(method, path, data)，携带校管 sa_token */
  api: { type: Function, required: true },
})

const CATS = [
  { key: 'poems', label: '古诗词', icon: '📜' },
  { key: 'formulas', label: '数学公式', icon: '🧮' },
  { key: 'words', label: '英语单词', icon: '🔤' },
  { key: 'science', label: '科学', icon: '🔬' },
  { key: 'moral', label: '道德与法治', icon: '⚖️' },
]

const cat = ref('poems')
const kw = ref('')
const list = ref([])
const loading = ref(false)
const seeding = ref(false)
const expandId = ref('')

function switchCat(k) {
  cat.value = k
  kw.value = ''
  expandId.value = ''
  load()
}

async function load() {
  loading.value = true
  try {
    const q = kw.value ? '?keyword=' + encodeURIComponent(kw.value) : ''
    const res = await props.api('GET', '/school-admin/resource-library/' + cat.value + q)
    list.value = Array.isArray(res) ? res : res?.items || []
  } catch (e) {
    list.value = []
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function toggleDetail(it) {
  expandId.value = expandId.value === it.id ? '' : it.id
}

/** 各分类标题字段：诗词/公式/科学/道法用 title，单词用 word */
function titleOf(it) {
  return it.title || it.word || '-'
}

/** 副标题：诗词=作者(朝代)；公式=公式；单词=释义；科学/道法=分类 */
function subOf(it) {
  if (cat.value === 'poems') return it.author ? `${it.author}${it.dynasty ? ' · ' + it.dynasty : ''}` : ''
  if (cat.value === 'formulas') return it.formula || ''
  if (cat.value === 'words') return it.meaning || ''
  return it.category || ''
}

/** 行末元信息：年级 / 场景分类 */
function metaOf(it) {
  return it.grade && it.grade !== '通用' ? it.grade : (it.category && cat.value === 'words' ? it.category : '')
}

async function remove(it) {
  const ok = await new Promise((r) =>
    uni.showModal({ title: '确认删除', content: '删除「' + titleOf(it) + '」？此操作不可恢复。', confirmColor: '#e64340', success: (m) => r(m.confirm) }),
  )
  if (!ok) return
  try {
    await props.api('DELETE', '/school-admin/resource-library/' + cat.value + '/' + it.id)
    uni.showToast({ title: '已删除', icon: 'success' })
    load()
  } catch (e) {
    uni.showToast({ title: e.message || '删除失败', icon: 'none' })
  }
}

async function seedDefaults() {
  if (seeding.value) return
  seeding.value = true
  try {
    await props.api('POST', '/school-admin/resource-library/seed-defaults', {})
    uni.showToast({ title: '预置资源已导入', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: e.message || '初始化失败', icon: 'none' })
  } finally {
    seeding.value = false
  }
}

defineExpose({ reload: load })
load()
</script>

<style scoped>
.rl-manage { padding-bottom: 20rpx; }
.rl-tabs { display: flex; gap: 10rpx; flex-wrap: wrap; margin-bottom: 14rpx; }
.rl-tab { font-size: 24rpx; color: var(--c-sub); background: var(--c-input); border-radius: 999rpx; padding: 8rpx 22rpx; }
.rl-tab.on { background: var(--c-primary); color: #fff; }
.rl-bar { display: flex; align-items: center; gap: 14rpx; margin-bottom: 10rpx; }
.rl-search { flex: 1; background: var(--c-input); border: 1rpx solid var(--c-input-border); color: var(--c-title); font-size: 26rpx; padding: 12rpx 22rpx; border-radius: 14rpx; }
.rl-seed { margin: 0; background: var(--c-primary); color: #fff; font-size: 26rpx; line-height: 2.4; border-radius: 14rpx; flex-shrink: 0; }
.rl-seed[disabled] { opacity: 0.6; }
.rl-tip { font-size: 22rpx; color: var(--c-sub); margin-bottom: 16rpx; }
.rl-list { display: flex; flex-direction: column; gap: 14rpx; }
.rl-card { background: var(--c-card); border-radius: 18rpx; padding: 22rpx 24rpx; box-shadow: var(--c-shadow); }
.rl-card-hd { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.rl-card-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rl-ops { display: flex; align-items: center; gap: 14rpx; flex-shrink: 0; }
.rl-meta { font-size: 20rpx; color: var(--c-sub); background: var(--c-input); border-radius: 8rpx; padding: 4rpx 12rpx; }
.rl-del { font-size: 22rpx; color: #e64340; }
.rl-card-sub { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rl-card-content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 10rpx; line-height: 1.6; white-space: pre-wrap; background: var(--c-input); border-radius: 12rpx; padding: 14rpx 18rpx; }
</style>
