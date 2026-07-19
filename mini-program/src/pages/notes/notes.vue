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

    <EmptyState v-if="!filtered.length" icon="📝" text="还没有笔记" hint="记下每一个教学瞬间" />

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
        <view class="title"><text class="md" v-if="isMd(n.content)">MD</text>{{ n.title }}</view>
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
      <view class="mdbar">
        <text class="mdtab" :class="!previewing && 'on'" @click="previewing = false">编辑</text>
        <text class="mdtab" :class="previewing && 'on'" @click="previewing = true">预览</text>
        <text class="mdhint">支持 Markdown</text>
      </view>
      <textarea v-if="!previewing" v-model="form.content" class="inp area" placeholder="把今天想说的写下来吧...（支持 # 标题、**加粗**、- 列表、`代码`、> 引用）"></textarea>
      <scroll-view v-else scroll-y class="mdpreview"><rich-text :nodes="mdPreview"></rich-text></scroll-view>
      <view class="mbtns">
        <view class="mb cancel" @click="show = false">取消</view>
        <view class="mb ok" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
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
const previewing = ref(false)

const isMd = (c) => /^#{1,6}\s|^\s*[-*]\s|\*\*|\[.+\]\(|```|^\s*>\s/.test(c || '')
const mdPreview = computed(() => md2html(form.value.content))

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inlineMd(s) {
  let t = escapeHtml(s)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#409eff;">$1</a>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/`([^`]+)`/g, '<code style="background:#f3f3f3;padding:2rpx 8rpx;border-radius:6rpx;font-size:22rpx;color:#c7254e;">$1</code>')
  return t
}
function md2html(src) {
  if (!src) return ''
  const lines = String(src).replace(/\r\n/g, '\n').split('\n')
  let html = ''
  let i = 0
  let inList = null
  const closeList = () => {
    if (inList) {
      html += inList === 'ul' ? '</ul>' : '</ol>'
      inList = null
    }
  }
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line.trim())) {
      closeList()
      let code = ''
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code += lines[i] + '\n'
        i++
      }
      i++
      html += '<pre style="background:#2b2b2b;color:#f6f6f6;padding:16rpx;border-radius:8rpx;overflow:auto;font-size:22rpx;"><code>' + escapeHtml(code.trim()) + '</code></pre>'
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const lv = h[1].length
      html += '<h' + lv + ' style="font-size:' + (36 - lv * 3) + 'rpx;font-weight:700;margin:14rpx 0;color:#4a3f35;">' + inlineMd(h[2]) + '</h' + lv + '>'
      i++
      continue
    }
    if (/^---+\s*$/.test(line)) {
      closeList()
      html += '<hr style="border:none;border-top:1px solid #e5e5e5;margin:14rpx 0;">'
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      closeList()
      html += '<blockquote style="border-left:6rpx solid #e6a23c;padding:4rpx 16rpx;color:#6a6058;margin:10rpx 0;">' + inlineMd(line.replace(/^>\s?/, '')) + '</blockquote>'
      i++
      continue
    }
    const ul = line.match(/^[-*]\s+(.*)$/)
    if (ul) {
      if (inList !== 'ul') {
        closeList()
        html += '<ul style="padding-left:36rpx;margin:8rpx 0;">'
        inList = 'ul'
      }
      html += '<li style="margin:4rpx 0;">' + inlineMd(ul[1]) + '</li>'
      i++
      continue
    }
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ol) {
      if (inList !== 'ol') {
        closeList()
        html += '<ol style="padding-left:36rpx;margin:8rpx 0;">'
        inList = 'ol'
      }
      html += '<li style="margin:4rpx 0;">' + inlineMd(ol[1]) + '</li>'
      i++
      continue
    }
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }
    closeList()
    html += '<p style="margin:8rpx 0;line-height:1.7;color:#5a5048;">' + inlineMd(line) + '</p>'
    i++
  }
  closeList()
  return html
}

async function load() {
  const arr = await api.getList('/notes', { loading: true, loadingText: '加载笔记' })
  arr.sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1
    return (b.updatedAt || '').localeCompare(a.updatedAt || '')
  })
  list.value = arr
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

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
  previewing.value = false
  show.value = true
}
function openEdit(n) {
  editing.value = n
  form.value = { title: n.title, category: n.category, content: n.content }
  previewing.value = false
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
.md { font-size: 18rpx; color: #fff; background: #409eff; padding: 2rpx 10rpx; border-radius: 8rpx; margin-right: 10rpx; vertical-align: middle; }
.mdbar { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.mdtab { font-size: 26rpx; padding: 10rpx 28rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.mdtab.on { background: #4a3f35; color: #fff; }
.mdhint { font-size: 22rpx; color: #bbb; margin-left: auto; }
.mdpreview { max-height: 420rpx; background: #fafafa; border: 1px solid #eee; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; }
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
.dark .mdpreview { background: var(--c-input); border-color: var(--c-input-border); }
.dark .mdtab { background: var(--c-card2); color: var(--c-sub); }
.dark .tab, .dark .chip { background: var(--c-card2); color: var(--c-sub); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
