<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="tabs">
      <view :class="['tab', tab === 'gen' ? 'on' : '']" @click="tab = 'gen'">🤖 生成试卷</view>
      <view :class="['tab', tab === 'lib' ? 'on' : '']" @click="switchLib">📚 往年试卷库</view>
    </view>

    <view v-if="tab === 'gen'" class="card">
      <view class="sec-title">优选试卷生成</view>
      <view class="hint">AI 整理贴近真实考纲的优选试卷，含题目、答案与解析，可一键存入试卷库。</view>
      <input v-model="form.grade" class="ctrl" placeholder="年级，如：九年级" />
      <input v-model="form.subject" class="ctrl" placeholder="科目，如：物理" />
      <input v-model="form.year" class="ctrl" placeholder="参考年份，如：2024（可选）" />
      <input v-model="form.keyword" class="ctrl" placeholder="主题/范围（必填），如：力学综合" />
      <input v-model="form.title" class="ctrl" placeholder="试卷标题（可选，留空自动生成）" />
      <button class="gen" :disabled="loading" @click="gen">{{ loading ? '生成中…' : '🤖 生成优选试卷' }}</button>
    </view>

    <view v-if="content" class="card result">
      <view class="sec-title">生成结果</view>
      <view class="result-text">{{ content }}</view>
      <button class="save" @click="save">💾 存入试卷库</button>
      <button class="copy" @click="copy">📋 复制结果</button>
      <button class="copy docx" @click="exportAsDocx">📄 导出 Word</button>
      <button v-if="saved" class="link" @click="goLib">查看试卷库 →</button>
    </view>

    <view v-if="tab === 'lib'" class="card">
      <view class="sec-title">往年试卷库</view>
      <view class="hint">从已存入的试卷库中按关键词查询历年优选试卷，点击可查看详情并复制。</view>
      <input v-model="libKw" class="ctrl" placeholder="搜索：年级 / 科目 / 标题关键词" />
      <view v-if="libLoading" class="hint">加载中…</view>
      <view v-for="p in libFiltered" :key="p.id" class="lib-item" @click="openPaper(p)">
        <view class="lib-t">{{ p.title }}</view>
        <view class="lib-m">{{ p.grade || '—' }} · {{ p.subject || '—' }}</view>
      </view>
      <view v-if="!libLoading && !libFiltered.length" class="empty">暂无试卷，去「生成试卷」创建并存入</view>
    </view>

    <view v-if="viewing" class="mask" @click="viewing = false">
      <view class="sheet" @click.stop>
        <view class="sec-title">{{ viewing.title }}</view>
        <scroll-view scroll-y class="paper-box">
          <view class="result-text">{{ viewing.content }}</view>
        </scroll-view>
        <button class="copy" @click="copyText(viewing.content)">📋 复制</button>
        <button class="cancel" @click="viewing = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'
import { exportDocx } from '../../common/exporter'

const form = ref({ grade: '', subject: '', year: '', keyword: '', title: '' })
const content = ref('')
const lastPrompt = ref('')
const loading = ref(false)
const saved = ref(false)

const tab = ref('gen')
const libList = ref([])
const libKw = ref('')
const libLoading = ref(false)
const viewing = ref(null)
const libFiltered = computed(() => {
  const k = libKw.value.trim().toLowerCase()
  if (!k) return libList.value
  return libList.value.filter((p) =>
    ((p.title || '') + (p.grade || '') + (p.subject || '')).toLowerCase().includes(k),
  )
})

function switchLib() {
  tab.value = 'lib'
  loadLib()
}
async function loadLib() {
  if (libList.value.length) return
  libLoading.value = true
  try {
    const r = await api.get('/generated/papers')
    libList.value = Array.isArray(r) ? r : r.list || r.data || []
  } catch (e) {
    libList.value = []
  }
  libLoading.value = false
}
function openPaper(p) {
  viewing.value = p
}
function copyText(c) {
  if (!c) return
  uni.setClipboardData({
    data: c,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

async function gen() {
  if (loading.value) return
  if (!form.value.keyword.trim()) {
    return uni.showToast({ title: '请填写主题/范围', icon: 'none' })
  }
  const f = form.value
  const prompt =
    `请为「${f.grade || '中学'}${f.subject || '学科'}」整理一套优选试卷（主题/范围：${f.keyword}，` +
    `参考年份：${f.year || '近三年'}）。要求：1) 题型与真实考纲一致，不虚构不存在的题型；` +
    `2) 题目尽量贴近真实考点与常见考法；3) 每题给出答案与简要解析；` +
    `4) 若某些题目无法确认为真实原题，请明确标注「（模拟）」并说明依据；` +
    `5) 在开头说明试卷来源与适用说明。请使用中文输出，便于直接打印使用。`
  loading.value = true
  content.value = ''
  lastPrompt.value = prompt
  saved.value = false
  try {
    const res = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: prompt }],
    })
    content.value = res.content || ''
    if (!content.value) uni.showToast({ title: '生成内容为空', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '生成失败，请检查后端 AI 配置', icon: 'none' })
  }
  loading.value = false
  await nextTick()
}

async function save() {
  if (!content.value) return
  const f = form.value
  const title = f.title.trim() || `${f.grade || ''}${f.subject || ''}优选试卷(${f.keyword})`
  try {
    await api.post('/generated/papers', {
      title,
      grade: f.grade,
      subject: f.subject,
      prompt: lastPrompt.value,
      content: content.value,
    })
    saved.value = true
    uni.showToast({ title: '已存入试卷库', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function goLib() {
  uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent('generated/papers') })
}

function copy() {
  if (!content.value) return
  uni.setClipboardData({
    data: content.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}
async function exportAsDocx() {
  if (!content.value) return
  const title = form.value.title || '优选试卷'
  await exportDocx(title, content.value, title)
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 50rpx; font-size: 28rpx; color: var(--c-sub); background: var(--c-card2); border: 1px solid var(--c-border); }
.tab.on { color: #fff; background: var(--c-accent); border-color: var(--c-accent); font-weight: 600; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.hint { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; line-height: 1.5; }
.ctrl { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); }
.gen { background: var(--c-accent); color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; }
.gen[disabled] { opacity: 0.6; }
.lib-item { padding: 22rpx 0; border-bottom: 1px solid var(--c-border); }
.lib-t { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.lib-m { font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 40rpx 0; font-size: 26rpx; }
.result-text { font-size: 28rpx; line-height: 1.7; color: var(--c-title); white-space: pre-wrap; margin-bottom: 20rpx; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 84rpx; line-height: 84rpx; }
.copy { background: var(--c-card2); color: var(--c-title); border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; }
.copy.docx { background: #409eff; color: #fff; border-color: #409eff; }
.link { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; font-size: 26rpx; margin-top: 16rpx; height: 80rpx; line-height: 80rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 30rpx; box-sizing: border-box; max-height: 80vh; }
.paper-box { max-height: 52vh; margin: 8rpx 0 16rpx; }
.cancel { background: var(--c-card2); color: var(--c-sub); border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-top: 8rpx; height: 80rpx; line-height: 80rpx; }
.dark .tab { background: var(--c-card); }
.dark .mask { background: rgba(0,0,0,0.6); }
</style>
