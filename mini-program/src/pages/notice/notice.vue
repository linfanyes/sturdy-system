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
      <view class="add-bar">
        <text class="st">公告范围</text>
        <text class="tpl-btn" @click="openTemplates">📋 使用模板</text>
      </view>
      <picker :range="scopeLabels" @change="(e) => (form.classId = scopeValues[e.detail.value])">
        <view class="picker sm">{{ scopeName(form.classId) }}</view>
      </picker>
      <input v-model="form.title" class="inp" placeholder="公告标题" />
      <textarea v-model="form.content" class="inp area" placeholder="公告内容" />
      <view class="polish" @click="aiPolish">{{ polishing ? '润色中…' : '✨ AI 润色' }}</view>
      <label class="row"><checkbox :checked="form.pinned" @change="(e) => (form.pinned = e.detail.value)" color="#e6a23c" /> 置顶这条公告</label>
      <label class="row" v-if="!editing"><checkbox :checked="pushToParent" @change="pushToParent = $event.detail.value" color="#07c160" /> 📲 推送给家长（微信订阅消息）</label>
      <button class="ok" :disabled="saving" @click="save">{{ saving ? '保存中…' : (editing ? '保存' : '发布') }}</button>
      <button class="cancel" @click="showAdd = false">取消</button>
    </view>

    <!-- 模板选择 sheet -->
    <view class="mask" v-if="showTpl" @click="showTpl = false">
      <view class="sheet tpl-sheet" @click.stop>
        <view class="st">📋 公告模板库</view>
        <view v-if="!tplList.length && !tplLoading" class="tpl-empty">
          暂无模板，可在「工具箱 → 通知模板」中创建
        </view>
        <scroll-view scroll-y class="tpl-list">
          <view v-for="t in tplList" :key="t.id" class="tpl-item" @click="useTemplate(t)">
            <text class="tpl-name">{{ t.name || t.title || '未命名模板' }}</text>
            <text class="tpl-prev">{{ (t.content || '').slice(0, 50) }}{{ (t.content || '').length > 50 ? '…' : '' }}</text>
          </view>
        </scroll-view>
        <button class="cancel" @click="showTpl = false">关闭</button>
      </view>
    </view>

    <!-- 打印用隐藏 canvas -->
    <canvas type="2d" id="printCanvas" class="print-canvas"></canvas>

    <!-- 打印预览弹层：先生成图片，用户确认预览后再保存到相册或复制文本 -->
    <view class="mask" v-if="showPrintPreview" @click="showPrintPreview = false">
      <view class="sheet preview-sheet" @click.stop>
        <view class="st">打印预览</view>
        <view class="hint">长按图片可保存，或点下方按钮保存到相册</view>
        <scroll-view scroll-y class="preview-box">
          <image :src="printTmpPath" mode="widthFix" class="preview-img" :show-menu-by-longpress="true" />
        </scroll-view>
        <view class="pv-acts">
          <button class="cancel" @click="showPrintPreview = false">关闭</button>
          <button class="copy-btn" @click="copyPrintText">📋 复制文本</button>
          <button class="ok" @click="savePreviewToAlbum">💾 保存到相册</button>
        </view>
      </view>
    </view>
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
const polishing = ref(false)
const form = ref({ classId: '全校', title: '', content: '', pinned: false })
const pushToParent = ref(false)
// 打印预览相关状态
const showPrintPreview = ref(false)
const printTmpPath = ref('')
const printText = ref('')
// 模板相关状态
const showTpl = ref(false)
const tplList = ref([])
const tplLoading = ref(false)

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
// AI 润色文案（大模型，免费替代短信的精致触达）
async function aiPolish() {
  if (!form.value.content.trim()) return uni.showToast({ title: '请先输入内容', icon: 'none' })
  polishing.value = true
  try {
    const r = await api.post('/ai/chat-sync', {
      messages: [
        {
          role: 'system',
          content:
            '你是学校公告润色助手。请把下面的通知润色得更正式、清晰、有条理，保留所有关键信息，不要编造，直接输出润色后的正文。',
        },
        { role: 'user', content: form.value.content },
      ],
    })
    if (r && r.content) {
      form.value.content = r.content.trim()
      uni.showToast({ title: '已润色', icon: 'success' })
    } else {
      uni.showToast({ title: '润色失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '润色失败:' + (e.message || ''), icon: 'none' })
  } finally {
    polishing.value = false
  }
}

async function save() {
  if (!form.value.title.trim()) return uni.showToast({ title: '请填标题', icon: 'none' })
  if (!isNonEmpty(form.value.content)) return uni.showToast({ title: '请填内容', icon: 'none' })
  // 微信内容安全审核（后端已配置则审核，未配置/异常放行）
  try {
    const text = (form.value.title + '\n' + form.value.content).trim()
    const r = await api.post('/security/msg-check', { content: text })
    if (r && r.pass === false) {
      return uni.showToast({ title: '内容未通过安全审核：' + (r.reason || ''), icon: 'none' })
    }
  } catch (e) {}
  saving.value = true
  try {
    if (editing.value) {
      await api.patch('/notices/' + editing.value.id, { ...form.value })
      uni.showToast({ title: '已更新', icon: 'none' })
    } else {
      const notice = await api.post('/notices', { ...form.value, ended: false })
      uni.showToast({ title: '已发布', icon: 'none' })
      // 推送通知给家长
      if (pushToParent.value && form.value.classId) {
        try {
          await api.post('/notices/push', {
            classId: form.value.classId,
            title: form.value.title,
            content: form.value.content,
          })
          uni.showToast({ title: '已发布并推送', icon: 'success' })
        } catch (e) {
          // 推送失败不影响发布
        }
      }
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

// 打印公告：渲染 canvas → 弹预览 sheet → 用户确认后保存到相册或复制文本
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
  // 文本备用：图片失败或用户选「复制文本」时使用
  printText.value = `【${n.title}】\n范围：${scope}\n时间：${fmt(n.createdAt)}\n\n${n.content || ''}`
  uni.showLoading({ title: '生成图片…', mask: true })
  try {
    const tmp = await drawAndSave('printCanvas', lines, '📢 ' + (n.title || '公告'))
    uni.hideLoading()
    // 弹出预览 sheet，用户预览后再选「保存到相册」或「复制文本」
    printTmpPath.value = tmp
    showPrintPreview.value = true
  } catch (e) {
    uni.hideLoading()
    // 降级：直接复制文本
    copyText(printText.value)
    uni.showToast({ title: '图片生成失败，已复制文本', icon: 'none' })
  }
}

// 保存预览图到相册
async function savePreviewToAlbum() {
  if (!printTmpPath.value) return
  try {
    await saveToAlbum(printTmpPath.value)
    uni.showToast({ title: '已保存到相册', icon: 'success' })
    showPrintPreview.value = false
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.errMsg || ''), icon: 'none' })
  }
}

// 复制公告文本（预览 sheet 内按钮）
function copyPrintText() {
  copyText(printText.value)
}

// 打开模板库：拉取通知模板列表
async function openTemplates() {
  showTpl.value = true
  tplLoading.value = true
  try {
    const list = await api.getList('/notice-templates', { silent: true })
    tplList.value = Array.isArray(list) ? list : []
  } catch (e) {
    tplList.value = []
  } finally {
    tplLoading.value = false
  }
}

// 使用模板：填充标题和内容（支持变量占位符 {班级} {日期}）
function useTemplate(t) {
  const today = new Date()
  const p = (n) => (n < 10 ? '0' : '') + n
  const dateStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
  const className = scopeName(form.value.classId) === '全部' ? '全校' : scopeName(form.value.classId)
  const fill = (s) => (s || '')
    .replace(/\{班级\}/g, className)
    .replace(/\{日期\}/g, dateStr)
    .replace(/\{date\}/g, dateStr)
    .replace(/\{class\}/g, className)
  form.value.title = fill(t.title || t.name || '')
  form.value.content = fill(t.content || '')
  showTpl.value = false
  uni.showToast({ title: '已套用模板', icon: 'success' })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.picker { background: var(--c-card); border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 26rpx; border: 1px solid var(--c-border); }
.toggle { font-size: 24rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); }
.toggle.on { background: #e8f1fb; color: #409eff; }
.add { font-size: 28rpx; color: var(--c-accent); font-weight: 600; margin-left: auto; }
.grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.card { width: calc(50% - 8rpx); background: var(--c-card); border-radius: 16rpx; padding: 20rpx; box-sizing: border-box; }
.card.pin { box-shadow: inset 4rpx 0 0 var(--c-accent); }
.card.ended { opacity: 0.7; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; }
.chip { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 16rpx; }
.c-pin { background: #fde9c8; color: #b9742a; }
.c-ended { background: #eee; color: #999; }
.c-scope { background: #e8f1fb; color: #3a8ee6; }
.acts { display: flex; gap: 12rpx; flex-wrap: wrap; justify-content: flex-end; }
.a { font-size: 22rpx; color: #409eff; }
.a.del { color: var(--c-danger); }
.tt { display: block; font-size: 28rpx; font-weight: 700; color: var(--c-title); margin: 12rpx 0 6rpx; }
.content { display: block; font-size: 24rpx; color: var(--c-sub); white-space: pre-wrap; }
.foot { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 10rpx; }
.empty { width: 100%; text-align: center; color: var(--c-sub); padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.st { display: block; font-size: 24rpx; color: var(--c-sub); margin: 10rpx 0 6rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); }
.area { height: 150rpx; }
.picker.sm { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: var(--c-card); box-sizing: border-box; }
.row { display: flex; align-items: center; font-size: 26rpx; color: var(--c-sub); margin: 6rpx 0 14rpx; }
.ok { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; margin-top: 14rpx; }
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
.a.print { color: var(--c-accent); }
.print-canvas { position: fixed; left: -9999rpx; top: 0; width: 720rpx; height: 400rpx; pointer-events: none; }
/* 打印预览 sheet */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 50; }
.preview-sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; box-sizing: border-box; max-height: 88vh; }
.preview-sheet .st { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.preview-sheet .hint { font-size: 22rpx; color: var(--c-sub); margin-bottom: 12rpx; }
.preview-box { max-height: 60vh; margin-bottom: 16rpx; }
.preview-img { width: 100%; border-radius: 8rpx; }
.pv-acts { display: flex; gap: 14rpx; }
.pv-acts .ok { flex: 1; margin-top: 0; }
.pv-acts .cancel { flex: 1; margin-top: 0; }
.pv-acts .copy-btn { flex: 1; background: var(--c-card2); color: var(--c-title); border: 1px solid var(--c-border); border-radius: 50rpx; }
.dark .preview-sheet { background: var(--c-card); }
.dark .copy-btn { background: var(--c-card2); color: var(--c-title); }
/* 表单顶部行：标题 + 模板按钮 */
.add-bar { display: flex; align-items: center; justify-content: space-between; margin: 10rpx 0 6rpx; }
.add-bar .st { margin: 0; }
.tpl-btn { font-size: 24rpx; color: var(--c-accent); padding: 6rpx 16rpx; border-radius: 20rpx; background: rgba(230,162,60,0.12); }
/* 模板 sheet */
.tpl-sheet { max-height: 80vh; }
.tpl-list { max-height: 60vh; margin-bottom: 14rpx; }
.tpl-item { padding: 18rpx 12rpx; border-bottom: 1rpx solid var(--c-border); }
.tpl-item:active { background: var(--c-card2); }
.tpl-name { display: block; font-size: 28rpx; font-weight: 600; color: var(--c-title); margin-bottom: 6rpx; }
.tpl-prev { display: block; font-size: 22rpx; color: var(--c-sub); line-height: 1.5; }
.tpl-empty { padding: 40rpx 0; text-align: center; color: var(--c-sub); font-size: 24rpx; }
.polish { align-self: flex-start; font-size: 22rpx; padding: 10rpx 22rpx; border-radius: 24rpx; background: var(--c-card2); color: var(--c-accent); margin: 10rpx 0 4rpx; }
</style>
