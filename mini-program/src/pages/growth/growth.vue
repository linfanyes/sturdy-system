<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <input v-model="kw" class="search" placeholder="搜索学生 / 标题" />
      <text class="add" @click="showAdd = !showAdd">+ 新增</text>
    </view>
    <scroll-view scroll-x class="chips">
      <text class="chip" :class="!activeType && 'on'" @click="activeType=''">全部</text>
      <text class="chip" v-for="t in types" :key="t" :class="activeType===t && 'on'" :style="chipStyle(t)" @click="activeType=t">{{ t }}</text>
    </scroll-view>

    <view class="timeline">
      <view class="item" v-for="(g, i) in filtered" :key="g.id">
        <view class="dot"></view>
        <view class="card">
          <view class="top">
            <text class="stu">{{ g.studentName }}</text>
            <text class="type" :style="typeStyle(g.type)">{{ g.type || '记录' }}</text>
            <text class="date">{{ g.date }}</text>
          </view>
          <view class="tt">{{ g.title }}</view>
          <view class="ct" v-if="g.content">{{ g.content }}</view>
          <text class="del" @click="del(g)">删除</text>
        </view>
      </view>
      <EmptyState v-if="!filtered.length" icon="🌱" text="暂无成长记录" hint="记录学生成长的每一个瞬间" />
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.studentName" class="inp" placeholder="学生姓名" />
      <input v-model="form.title" class="inp" placeholder="标题" />
      <picker :range="types" @change="(e)=>form.type=types[e.detail.value]">
        <view class="picker sm">类型：{{ form.type || '请选择' }}</view>
      </picker>
      <picker mode="date" :value="form.date" @change="(e)=>form.date = e.detail.value">
        <view class="picker sm">日期：{{ form.date || '今天' }}</view>
      </picker>
      <textarea v-model="form.content" class="inp area" placeholder="内容（可选）" />
      <button class="ok" :disabled="saving" @click="add">{{ saving ? '保存中…' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { isNonEmpty } from '../../common/validators'
import { theme } from '../../common/store'

const types = ['品德', '学业', '体育', '艺术', '劳动', '其他']
const typeColors = { '品德': '#e06c75', '学业': '#409eff', '体育': '#07c160', '艺术': '#9b59b6', '劳动': '#e6a23c', '其他': '#9aa0a6' }
const list = ref([])
const showAdd = ref(false)
const form = ref({ studentName: '', title: '', type: '', date: '', content: '' })
const kw = ref('')
const activeType = ref('')
const saving = ref(false)

const sorted = computed(() =>
  [...list.value].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)
const filtered = computed(() => {
  const k = kw.value.trim()
  return sorted.value.filter((g) => {
    if (activeType.value && g.type !== activeType.value) return false
    if (k && !((g.studentName || '').includes(k) || (g.title || '').includes(k))) return false
    return true
  })
})
function typeStyle(t) {
  const c = typeColors[t] || '#9aa0a6'
  return { color: c, background: c + '22' }
}
function chipStyle(t) {
  const c = typeColors[t] || '#9aa0a6'
  return activeType.value === t ? { background: c, color: '#fff' } : { background: c + '22', color: c }
}

async function load() {
  list.value = await api.getList('/growth-entries', { loading: true, loadingText: '加载档案' })
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

async function add() {
  if (!form.value.studentName || !form.value.title)
    return uni.showToast({ title: '请填学生和标题', icon: 'none' })
  if (!isNonEmpty(form.value.content)) return uni.showToast({ title: '请填写内容', icon: 'none' })
  saving.value = true
  try {
    const r = await api.post('/growth-entries', { ...form.value })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { studentName: '', title: '', type: '', date: '', content: '' }
    uni.showToast({ title: '已添加', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '添加失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
async function del(g) {
  uni.showModal({ title: '删除', content: g.title, success: async (m) => {
    if (!m.confirm) return
    uni.showLoading({ title: '删除中…', mask: true })
    try { await api.del('/growth-entries/' + g.id); list.value = list.value.filter((x) => x.id !== g.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    finally { uni.hideLoading() }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; align-items: center; margin-bottom: 16rpx; }
.search { flex: 1; border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 14rpx 18rpx; font-size: 26rpx; background: #fff; margin-right: 16rpx; box-sizing: border-box; }
.chips { white-space: nowrap; margin-bottom: 16rpx; }
.chip { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; border-radius: 30rpx; margin-right: 12rpx; }
.chip.on { font-weight: 700; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.timeline { position: relative; padding-left: 30rpx; }
.item { position: relative; padding-bottom: 24rpx; }
.dot { position: absolute; left: -22rpx; top: 24rpx; width: 18rpx; height: 18rpx; border-radius: 50%; background: #e6a23c; }
.card { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; }
.top { display: flex; align-items: center; gap: 12rpx; }
.stu { font-size: 28rpx; font-weight: 700; color: #4a3f35; }
.type { font-size: 22rpx; color: #a07b3b; background: #f7f1e6; padding: 2rpx 12rpx; border-radius: 16rpx; }
.date { font-size: 22rpx; color: #9aa0a6; margin-left: auto; }
.tt { font-size: 30rpx; color: #333; margin: 10rpx 0; font-weight: 600; }
.ct { font-size: 26rpx; color: #5a5048; white-space: pre-wrap; }
.del { font-size: 24rpx; color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 110rpx; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .search { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .card, .dark .sheet { background: var(--c-card); }
.dark .stu { color: var(--c-title); }
.dark .tt { color: var(--c-text); }
.dark .ct { color: var(--c-sub); }
.dark .type { background: var(--c-card2); color: var(--c-accent); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
</style>
