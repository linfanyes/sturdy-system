<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <picker :range="scopeLabels" @change="onScope">
        <view class="picker">范围：{{ scopeLabel }}</view>
      </picker>
      <text class="toggle" :class="hideEnded && 'on'" @click="hideEnded = !hideEnded">{{ hideEnded ? '显示已结束' : '隐藏已结束' }}</text>
      <text class="add" @click="openCreate">+ 发布</text>
    </view>

    <view class="grid">
      <view class="card" v-for="n in shown" :key="n.id" :class="[n.pinned && !n.ended && 'pin', n.ended && 'ended']">
        <view class="top">
          <text class="chip" :class="n.ended ? 'c-ended' : (n.pinned ? 'c-pin' : 'c-scope')">{{ n.ended ? '已结束' : (n.pinned ? '置顶' : scopeName(n.classId)) }}</text>
          <view class="acts">
            <text v-if="!n.ended" class="a" @click="togglePin(n)">{{ n.pinned ? '取消置顶' : '置顶' }}</text>
            <text v-if="!n.ended" class="a" @click="setEnded(n, true)">结束</text>
            <text v-else class="a" @click="setEnded(n, false)">恢复</text>
            <text class="a" @click="openEdit(n)">编辑</text>
            <text class="a print" @click="printNotice(n)">🖨 打印</text>
            <text class="a del" @click="del(n)">删除</text>
          </view>
        </view>
        <text class="tt">{{ n.title }}</text>
        <text class="content">{{ n.content }}</text>
        <text class="foot">📣 发布于 {{ fmt(n.createdAt) }}</text>
      </view>
      <EmptyState v-if="!shown.length" icon="📢" text="暂无公告" hint="点击右上角发布第一条公告" />
    </view>

    <view class="sheet" v-if="showAdd">
      <text class="st">公告范围</text>
      <picker :range="scopeLabels" @change="(e) => (form.classId = scopeValues[e.detail.value])">
        <view class="picker sm">{{ scopeName(form.classId) }}</view>
      </picker>
      <input v-model="form.title" class="inp" placeholder="公告标题" />
      <textarea v-model="form.content" class="inp area" placeholder="公告内容" />
      <label class="row"><checkbox :checked="form.pinned" @change="(e) => (form.pinned = e.detail.value)" color="#e6a23c" /> 置顶这条公告</label>
      <button class="ok" :disabled="saving" @click="save">{{ saving ? '保存中…' : (editing ? '保存' : '发布') }}</button>
      <button class="cancel" @click="showAdd = false">取消</button>
    </view>

    <!-- 打印用隐藏 canvas -->
    <canvas type="2d" id="printCanvas" class="print-canvas"></canvas>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { isNonEmpty } from '../../common/validators'
import { theme } from '../../common/store'
import { drawAndSave, saveToAlbum, copyText } from '../../common/print'

const classes = ref([])
const list = ref([])
const hideEnded = ref(true)
const showAdd = ref(false)
const editing = ref(null)
const saving = ref(false)
const form = ref({ classId: '全校', title: '', content: '', pinned: false })

const scopeValues = computed(() => ['', '全校', ...classes.value.map((c) => c.id)])
const scopeLabels = computed(() => ['全部公告', '全校', ...classes.value.map((c) => c.name)])
const scopeFilter = ref('')
const scopeLabel = computed(() => {
  const i = scopeValues.value.indexOf(scopeFilter.value)
  return i >= 0 ? scopeLabels.value[i] : '全部公告'
})
function onScope(e) {
  scopeFilter.value = scopeValues.value[e.detail.value]
}
const classMap = computed(() => {
  const m = {}
  classes.value.forEach((c) => (m[c.id] = c.name))
  return m
})
function scopeName(id) {
  if (!id || id === '全校') return id === '全校' ? '全校' : '全部'
  return classMap.value[id] || '班级'
}

const shown = computed(() => {
  let arr = [...list.value]
  if (hideEnded.value) arr = arr.filter((n) => !n.ended)
  if (scopeFilter.value) {
    arr = arr.filter((n) => n.classId === scopeFilter.value || (scopeFilter.value === '全校' && n.classId === '全校'))
  }
  arr.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.createdAt || '').localeCompare(a.createdAt || '')
  })
  return arr
})

async function load() {
  // 并行加载 + 各自兜底，避免 classes 失败导致 notices 也不渲染
  const [cls, ns] = await Promise.all([
    api.getList('/classes', { silent: true }),
    api.getList('/notices', { loading: true, loadingText: '加载公告' }),
  ])
  classes.value = cls
  list.value = ns
}
onShow(load)

// 下拉刷新：重新加载公告列表
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function openCreate() {
  editing.value = null
  form.value = {
    classId: scopeFilter.value && scopeFilter.value !== '全校' ? scopeFilter.value : '全校',
    title: '',
    content: '',
    pinned: false,
  }
  showAdd.value = true
}
function openEdit(n) {
  editing.value = n
  form.value = { ...n }
  showAdd.value = true
}
async function save() {
  if (!form.value.title.trim()) return uni.showToast({ title: '请填标题', icon: 'none' })
  if (!isNonEmpty(form.value.content)) return uni.showToast({ title: '请填内容', icon: 'none' })
  saving.value = true
  try {
    if (editing.value) {
      await api.patch('/notices/' + editing.value.id, { ...form.value })
      uni.showToast({ title: '已更新', icon: 'none' })
    } else {
      await api.post('/notices', { ...form.value, ended: false })
      uni.showToast({ title: '已发布', icon: 'none' })
    }
    showAdd.value = false
    load()
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
async function togglePin(n) {
  uni.showLoading({ title: '处理中…', mask: true })
  try {
    await api.patch('/notices/' + n.id, { pinned: !n.pinned })
    n.pinned = !n.pinned
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
async function setEnded(n, v) {
  uni.showLoading({ title: '处理中…', mask: true })
  try {
    await api.patch('/notices/' + n.id, { ended: v })
    n.ended = v
    uni.showToast({ title: v ? '已结束' : '已重新发布', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
async function del(n) {
  uni.showModal({
    title: '删除公告',
    content: n.title,
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…', mask: true })
      try {
        await api.del('/notices/' + n.id)
        list.value = list.value.filter((x) => x.id !== n.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
function fmt(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return String(d)
  const p = (n) => (n < 10 ? '0' : '') + n
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

// 打印公告：渲染 canvas → 保存到相册（用户可走相册打印或转发）
// 失败自动降级为复制纯文本
async function printNotice(n) {
  const scope = scopeName(n.classId)
  const lines = [
    `范围：${scope === '全部' ? '全校' : scope}`,
    `时间：${fmt(n.createdAt)}`,
    n.pinned ? '（置顶）' : '',
    '',
    '———————————',
    '',
    ...String(n.content || '').split('\n'),
    '',
    '———————————',
    '（此公告由工作系统小程序生成）',
  ]
  uni.showLoading({ title: '生成图片…', mask: true })
  try {
    const tmp = await drawAndSave('printCanvas', lines, '📢 ' + (n.title || '公告'))
    uni.hideLoading()
    uni.showModal({
      title: '已生成公告图片',
      content: '是否保存到相册？保存后可通过相册打印或转发给家长。',
      confirmText: '保存到相册',
      cancelText: '复制文本',
      success: async (m) => {
        if (m.confirm) {
          try {
            await saveToAlbum(tmp)
            uni.showToast({ title: '已保存到相册', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '保存失败：' + (e.errMsg || ''), icon: 'none' })
          }
        } else if (m.cancel) {
          copyText(`${n.title}\n范围：${scope}\n时间：${fmt(n.createdAt)}\n\n${n.content || ''}`)
        }
      },
    })
  } catch (e) {
    uni.hideLoading()
    // 降级：复制文本
    copyText(`【${n.title}】\n范围：${scope}\n时间：${fmt(n.createdAt)}\n\n${n.content || ''}`)
    uni.showToast({ title: '图片生成失败，已复制文本', icon: 'none' })
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.picker { background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 26rpx; border: 1px solid #eee; }
.toggle { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.toggle.on { background: #e8f1fb; color: #409eff; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; margin-left: auto; }
.grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.card { width: calc(50% - 8rpx); background: #fff; border-radius: 16rpx; padding: 20rpx; box-sizing: border-box; }
.card.pin { box-shadow: inset 4rpx 0 0 #e6a23c; }
.card.ended { opacity: 0.7; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; }
.chip { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 16rpx; }
.c-pin { background: #fde9c8; color: #b9742a; }
.c-ended { background: #eee; color: #999; }
.c-scope { background: #e8f1fb; color: #3a8ee6; }
.acts { display: flex; gap: 12rpx; flex-wrap: wrap; justify-content: flex-end; }
.a { font-size: 22rpx; color: #409eff; }
.a.del { color: #e06c75; }
.tt { display: block; font-size: 28rpx; font-weight: 700; color: #4a3f35; margin: 12rpx 0 6rpx; }
.content { display: block; font-size: 24rpx; color: #5a5048; white-space: pre-wrap; }
.foot { display: block; font-size: 20rpx; color: #b0a89e; margin-top: 10rpx; }
.empty { width: 100%; text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.st { display: block; font-size: 24rpx; color: #999; margin: 10rpx 0 6rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 150rpx; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.row { display: flex; align-items: center; font-size: 26rpx; color: #5a5048; margin: 6rpx 0 14rpx; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 6rpx; }
.cancel { background: #f3f3f3; color: #666; border-radius: 50rpx; margin-top: 14rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .card, .dark .sheet, .dark .picker, .dark .picker.sm { background: var(--c-card); border-color: var(--c-input-border); }
.dark .tt { color: var(--c-title); }
.dark .content { color: var(--c-sub); }
.dark .chip.c-scope { background: var(--c-card2); color: var(--c-sub); }
.dark .toggle { background: var(--c-card2); color: var(--c-sub); }
.dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .ok { background: #07c160; }
.dark .cancel { background: var(--c-card2); color: var(--c-sub); }
.a.print { color: #e6a23c; }
.print-canvas { position: fixed; left: -9999rpx; top: 0; width: 720rpx; height: 400rpx; pointer-events: none; }
</style>
