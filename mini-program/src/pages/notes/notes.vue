<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view class="h">📓 笔记</view>
      <view class="add" @click="openCreate">+ 新建</view>
    </view>

    <view class="search">
      <input v-model="kw" class="sinp" placeholder="搜索标题或内容..." />
    </view>

    <scroll-view scroll-x class="tabs">
      <text v-for="t in tabs" :key="t" class="tab" :class="active === t && 'on'" @click="active = t">{{ t }} ({{ countOf(t) }})</text>
    </scroll-view>

    <view class="empty" v-if="!filtered.length">还没有笔记，记下每一个教学瞬间</view>

    <view class="grid" v-else>
      <view class="c" v-for="n in filtered" :key="n.id" @click="openEdit(n)">
        <view class="top">
          <text class="cat" :class="'cat-' + catKey(n.category)">{{ n.category }}</text>
          <text class="pin" v-if="n.pinned">📌置顶</text>
          <view class="acts">
            <text class="star" :class="n.favorite && 'on'" @click.stop="toggleFav(n)">{{ n.favorite ? '★' : '☆' }}</text>
            <text class="pinbtn" :class="n.pinned && 'on'" @click.stop="togglePin(n)">{{ n.pinned ? '📌' : '📍' }}</text>
            <text class="del" @click.stop="del(n)">🗑</text>
          </view>
        </view>
        <view class="title">{{ n.title }}</view>
        <view class="content">{{ n.content }}</view>
        <view class="foot">{{ fmt(n.updatedAt) }}</view>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show = false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑笔记' : '新建笔记' }}</view>
      <input v-model="form.title" class="inp" placeholder="给笔记起个名字" maxlength="60" />
      <view class="lab2">分类</view>
      <view class="chips">
        <text v-for="c in cats" :key="c" class="chip" :class="form.category === c && 'on'" @click="form.category = c">{{ c }}</text>
      </view>
      <textarea v-model="form.content" class="inp area" placeholder="把今天想说的写下来吧..."></textarea>
      <view class="mbtns">
        <view class="mb cancel" @click="show = false">取消</view>
        <view class="mb ok" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const cats = ['教学反思', '班会记录', '学习资料', '其他']
const catMap = { 教学反思: 'reflection', 班会记录: 'meeting', 学习资料: 'material', 其他: 'etc' }
const catKey = (c) => catMap[c] || 'etc'
const tabs = ['全部', ...cats, '收藏']

const list = ref([])
const kw = ref('')
const active = ref('全部')
const show = ref(false)
const editing = ref(null)
const form = ref({ title: '', category: '教学反思', content: '' })

async function load() {
  const arr = await api.get('/notes')
  arr.sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1
    return (b.updatedAt || '').localeCompare(a.updatedAt || '')
  })
  list.value = arr
}
onShow(load)

function countOf(t) {
  if (t === '全部') return list.value.length
  if (t === '收藏') return list.value.filter((n) => n.favorite).length
  return list.value.filter((n) => n.category === t).length
}
const filtered = computed(() => {
  let arr = list.value
  if (active.value === '收藏') arr = arr.filter((n) => n.favorite)
  else if (active.value !== '全部') arr = arr.filter((n) => n.category === active.value)
  const q = kw.value.trim().toLowerCase()
  if (q) arr = arr.filter((n) => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
  return arr
})
function fmt(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function openCreate() {
  editing.value = null
  form.value = { title: '', category: '教学反思', content: '' }
  show.value = true
}
function openEdit(n) {
  editing.value = n
  form.value = { title: n.title, category: n.category, content: n.content }
  show.value = true
}
async function save() {
  if (!form.value.title.trim()) return uni.showToast({ title: '请填写标题', icon: 'none' })
  const payload = { ...form.value }
  try {
    if (editing.value) {
      const r = await api.patch('/notes/' + editing.value.id, payload)
      Object.assign(editing.value, r)
    } else {
      const r = await api.post('/notes', payload)
      list.value.unshift(r)
    }
    show.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  }
}
async function togglePin(n) {
  try { const r = await api.patch('/notes/' + n.id, { pinned: !n.pinned }); n.pinned = r.pinned; load() }
  catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
}
async function toggleFav(n) {
  try { const r = await api.patch('/notes/' + n.id, { favorite: !n.favorite }); n.favorite = r.favorite }
  catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
}
function del(n) {
  uni.showModal({ title: '删除', content: '确定删除「' + n.title + '」？', success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/notes/' + n.id); list.value = list.value.filter((x) => x.id !== n.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.h { font-size: 36rpx; font-weight: 800; color: #4a3f35; }
.add { font-size: 28rpx; color: #fff; background: #07c160; padding: 12rpx 26rpx; border-radius: 40rpx; }
.search { margin-bottom: 14rpx; }
.sinp { background: #fff; border-radius: 40rpx; padding: 16rpx 28rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.tabs { white-space: nowrap; margin-bottom: 16rpx; }
.tab { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; margin-right: 12rpx; }
.tab.on { background: #4a3f35; color: #fff; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 40rpx; font-size: 26rpx; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.c { background: #fff; border-radius: 16rpx; padding: 22rpx; position: relative; }
.top { display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.cat { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.cat-reflection { background: #fde8ea; color: #e06c75; }
.cat-meeting { background: #e8f9e8; color: #07c160; }
.cat-material { background: #e8f1fb; color: #409eff; }
.cat-etc { background: #fff3e0; color: #e6a23c; }
.pin { font-size: 20rpx; color: #e06c75; }
.acts { margin-left: auto; display: flex; gap: 14rpx; }
.star, .pinbtn, .del { font-size: 28rpx; color: #ccc; }
.star.on { color: #e6a23c; }
.pinbtn.on { color: #e06c75; }
.title { font-size: 30rpx; font-weight: 700; color: #4a3f35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.content { font-size: 25rpx; color: #6a6058; margin-top: 8rpx; max-height: 120rpx; overflow: hidden; white-space: pre-wrap; }
.foot { font-size: 22rpx; color: #bbb; margin-top: 12rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; }
.modal { position: fixed; left: 5%; right: 5%; bottom: 0; z-index: 51; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 92vh; overflow-y: auto; }
.mt { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; color: #4a3f35; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 320rpx; }
.lab2 { font-size: 24rpx; color: #9aa0a6; margin: 8rpx 0 10rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.chip { font-size: 24rpx; padding: 12rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.chip.on { background: #4a3f35; color: #fff; }
.mbtns { display: flex; gap: 20rpx; margin-top: 10rpx; }
.mb { flex: 1; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; }
.mb.cancel { background: #f3f3f3; color: #666; }
.mb.ok { background: #07c160; color: #fff; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .sinp, .dark .c, .dark .modal { background: var(--c-card); }
.dark .title { color: var(--c-title); }
.dark .content { color: var(--c-sub); }
.dark .inp { background: var(--c-input); color: var(--c-text); border-color: var(--c-input-border); }
.dark .tab, .dark .chip { background: var(--c-card2); color: var(--c-sub); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
