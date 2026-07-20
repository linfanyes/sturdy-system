<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <input v-model="kw" class="search" placeholder="搜索标题/标签/描述" @input="onSearch" />
      <text class="add" @click="showAdd = !showAdd">+ 添加</text>
    </view>
    <view class="bar2">
      <picker :range="catLabels" @change="(e) => (catFilter = e.detail.value === 0 ? 'all' : catLabels[e.detail.value])">
        <view class="picker sm">{{ catFilter === 'all' ? '全部分类' : catFilter }}</view>
      </picker>
    </view>

    <view class="grid">
      <view class="card" v-for="r in shown" :key="r.id">
        <image v-if="r.image" :src="r.image" class="thumb" mode="aspectFill" lazy-load />
        <text class="tt">{{ r.title }}</text>
        <text class="desc" v-if="r.description">{{ r.description }}</text>
        <view class="chips">
          <text class="cat" :style="catStyle(r.category)">{{ r.category || '其他' }}</text>
          <text class="tag" v-for="t in (r.tags || [])" :key="t">#{{ t }}</text>
        </view>
        <view class="acts">
          <text class="a" v-if="r.url" @click="copy(r.url)">复制链接</text>
          <text class="a del" @click="del(r)">删除</text>
        </view>
      </view>
      <EmptyState v-if="!shown.length" icon="📦" text="暂无资源" hint="点击下方按钮上传教学资源" />
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.title" class="inp" placeholder="资源名称 *" />
      <input v-model="form.url" class="inp" placeholder="外部链接（与图片二选一）" />
      <view class="up" @click="pickImg">
        <image v-if="form.image" :src="form.image" class="prev" mode="aspectFill" />
        <text v-else>📷 点击选择图片/文件</text>
      </view>
      <text class="st">分类</text>
      <picker :range="catOpts" @change="(e) => (form.category = catOpts[e.detail.value])">
        <view class="picker sm">{{ form.category || '教学素材' }}</view>
      </picker>
      <text class="st">标签（回车添加）</text>
      <input v-model="tagInput" class="inp" placeholder="输入后回车" @confirm="addTag" />
      <view class="tags">
        <text class="tag" v-for="(t, i) in form.tags" :key="t" @click="form.tags.splice(i, 1)">#{{ t }} ✕</text>
      </view>
      <textarea v-model="form.description" class="inp area" placeholder="简介（可选）" />
      <button class="ok" :disabled="saving" @click="save">{{ saving ? '添加中…' : '添加' }}</button>
      <button class="cancel" @click="showAdd = false">取消</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import api from '../../common/request'
import { theme } from '../../common/store'
import { isNonEmpty } from '../../common/validators'

const list = ref([])
const showAdd = ref(false)
const kw = ref('')
const searchKw = ref('')
const catFilter = ref('all')
const tagInput = ref('')
const form = ref({ title: '', url: '', image: '', category: '教学素材', tags: [], description: '' })
const saving = ref(false)

const catOpts = ['官方平台', '教学素材', '工具', '班级管理', '其他']
const catLabels = computed(() => ['全部分类', ...catOpts, ...Array.from(new Set(list.value.map((r) => r.category).filter((c) => c && !catOpts.includes(c))))])
const catColor = { 官方平台: '#a07b3b', 教学素材: '#e6a23c', 工具: '#07c160', 班级管理: '#3a8ee6', 其他: '#999' }
function catStyle(c) {
  const col = catColor[c] || '#999'
  return `background:${col}1a;color:${col}`
}

let timer = null
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => (searchKw.value = kw.value.trim().toLowerCase()), 200)
}

const shown = computed(() => {
  let arr = [...list.value]
  if (catFilter.value !== 'all') arr = arr.filter((r) => r.category === catFilter.value)
  const k = searchKw.value
  if (k) {
    arr = arr.filter(
      (r) =>
        (r.title || '').toLowerCase().includes(k) ||
        (r.description || '').toLowerCase().includes(k) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(k)),
    )
  }
  return arr
})

async function load() {
  list.value = await api.getList('/resources', { loading: true, loadingText: '加载资源' })
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function pickImg() {
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    success: (res) => {
      const p = res.tempFiles[0].tempFilePath
      uni.getFileSystemManager().readFile({
        filePath: p,
        encoding: 'base64',
        success: (r) => {
          const ext = p.split('.').pop() || 'png'
          form.value.image = 'data:image/' + ext + ';base64,' + r.data
        },
        fail: () => uni.showToast({ title: '读取失败', icon: 'none' }),
      })
    },
  })
}
function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.value.tags.includes(t)) form.value.tags.push(t)
  tagInput.value = ''
}
function copy(u) {
  uni.setClipboardData({ data: u, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
}
async function save() {
  if (!isNonEmpty(form.value.title)) return uni.showToast({ title: '请填名称', icon: 'none' })
  if (!isNonEmpty(form.value.url) && !form.value.image) return uni.showToast({ title: '请填链接或选图片', icon: 'none' })
  saving.value = true
  try {
    await api.post('/resources', { ...form.value })
    showAdd.value = false
    form.value = { title: '', url: '', image: '', category: '教学素材', tags: [], description: '' }
    uni.showToast({ title: '已添加', icon: 'none' })
    load()
  } catch (e) {
    uni.showToast({ title: '添加失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
async function del(r) {
  uni.showModal({
    title: '删除资源',
    content: r.title,
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '删除中…', mask: true })
      try {
        await api.del('/resources/' + r.id)
        list.value = list.value.filter((x) => x.id !== r.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; align-items: center; gap: 12rpx; }
.search { flex: 1; border: 1px solid #e5e5e5; border-radius: 30rpx; padding: 14rpx 24rpx; font-size: 26rpx; background: #fff; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.bar2 { margin: 14rpx 0; }
.picker.sm { display: inline-block; border: 1px solid #e5e5e5; border-radius: 30rpx; padding: 10rpx 24rpx; font-size: 24rpx; background: #fff; }
.grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 8rpx; }
.card { width: calc(50% - 8rpx); background: #fff; border-radius: 16rpx; padding: 18rpx; box-sizing: border-box; }
.thumb { width: 100%; height: 160rpx; border-radius: 12rpx; background: #f3f3f3; margin-bottom: 10rpx; }
.tt { display: block; font-size: 28rpx; font-weight: 700; color: #4a3f35; }
.desc { display: block; font-size: 22rpx; color: #9aa0a6; margin-top: 6rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.cat { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 16rpx; }
.tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 16rpx; background: #fff3e0; color: #a07b3b; }
.acts { display: flex; gap: 20rpx; margin-top: 12rpx; }
.a { font-size: 24rpx; color: #409eff; }
.a.del { color: #e06c75; }
.empty { width: 100%; text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.st { display: block; font-size: 24rpx; color: #999; margin: 10rpx 0 6rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 110rpx; }
.up { border: 1px dashed #e6a23c; border-radius: 12rpx; padding: 26rpx; text-align: center; color: #a07b3b; font-size: 24rpx; margin-bottom: 14rpx; }
.prev { width: 160rpx; height: 160rpx; border-radius: 12rpx; }
.tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 14rpx; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
.cancel { background: #f3f3f3; color: #666; border-radius: 50rpx; margin-top: 14rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .card, .dark .sheet, .dark .search, .dark .picker.sm { background: var(--c-card); border-color: var(--c-input-border); }
.dark .tt { color: var(--c-title); }
.dark .desc { color: var(--c-sub); }
.dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .up { border-color: var(--c-accent); color: var(--c-accent); }
.dark .ok { background: #07c160; }
.dark .cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
