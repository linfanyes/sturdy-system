<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 顶部标题栏 -->
    <view class="nav">
      <view class="nav-title">
        <text class="nav-emoji">🤖</text>
        <view class="nav-text">
          <text class="t1">AI 助教</text>
          <text class="t2">智能答疑 · 文档分析</text>
        </view>
      </view>
      <text class="nav-clear" @click="clearAll">清空</text>
    </view>

    <!-- 对话区 -->
    <scroll-view class="box" scroll-y :scroll-into-view="scrollId" :scroll-with-animation="true">
      <view v-for="(m, i) in messages" :key="i" :id="'m' + i" :class="['row', m.role]">
        <view class="avatar">{{ m.role === 'assistant' ? '🤖' : '我' }}</view>
        <view class="content">
          <view
            :class="['bubble', m.role]"
            @longpress="m.role === 'assistant' && !m.loading && copyText(m.content)"
          >
            <text v-if="m.loading" class="typing"><text class="dot">●</text><text class="dot">●</text><text class="dot">●</text></text>
            <rich-text v-else-if="m.role === 'assistant'" class="md" :nodes="md(m.content || '')"></rich-text>
            <text v-else class="text">{{ m.content || '…' }}</text>
          </view>
          <!-- 助手消息：复制按钮 -->
          <view v-if="m.role === 'assistant' && !m.loading" class="bubble-ops">
            <text class="copy-btn" @click="copyText(m.content)">📋 复制</text>
          </view>
          <!-- 用户发的文件/图片 展示 -->
          <view v-if="m.role === 'user' && (m.files?.length || m.image)" class="attach">
            <view v-if="m.image" class="attach-img"><image :src="m.image" mode="aspectFill" /></view>
            <view v-for="(f, k) in (m.files || [])" :key="k" class="chip">
              <text class="chip-ico">📄</text>
              <text class="chip-name">{{ f.name }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 已选文件 chips -->
    <view v-if="fileList.length" class="filebar">
      <view v-for="(f, k) in fileList" :key="k" class="filepill">
        <text class="fp-ico">📎</text>
        <text class="fp-name">{{ f.name }}</text>
        <text class="fp-size">{{ formatSize(f.size) }}</text>
        <text class="fp-del" @click="removeFile(k)">×</text>
      </view>
    </view>

    <!-- 输入区 -->
    <view class="input-bar">
      <button class="icon-btn" @click="chooseFile">📎</button>
      <button class="icon-btn" @click="chooseImage">{{ imageData ? '🖼️' : '🌅' }}</button>
      <input
        v-model="input"
        class="ipt"
        placeholder="问问 AI 助手…（可发图片/文档）"
        @confirm="send"
        :disabled="loading"
      />
      <button class="send" :class="{ disabled: loading }" @click="send">
        {{ loading ? '…' : '发送' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { marked } from 'marked'
import api from '../../common/request'
import { auth, theme } from '../../common/store'

// —— Markdown 渲染：token 化 renderer + 内联样式，产物交给 <rich-text> 渲染 ——
// rich-text 不继承外部 CSS 变量，故按当前主题直接输出对应色值（切换主题时组件重渲染，md() 重新生成）
marked.setOptions({ gfm: true, breaks: true })
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const SZ = { 1: 40, 2: 36, 3: 32, 4: 30, 5: 28, 6: 26 }
const LIGHT = { fg: '#333', sub: '#888', codeBg: '#f5f5f5', codeFg: '#c7254e', border: '#d9d9d9', link: '#07c160', strong: '#222' }
const DARK = { fg: '#e6e6e6', sub: '#9aa0a6', codeBg: '#262b34', codeFg: '#ff9b9b', border: '#3a3f47', link: '#3fd07f', strong: '#ffffff' }
marked.use({
  renderer: {
    heading(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<view style="font-size:${SZ[t.depth] || 30}rpx;font-weight:700;margin:18rpx 0 10rpx;color:${c.fg};line-height:1.4;">${this.parser.parseInline(t.tokens) || t.text}</view>`
    },
    paragraph(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<view style="margin:10rpx 0;line-height:1.7;color:${c.fg};">${this.parser.parseInline(t.tokens) || t.text}</view>`
    },
    listitem(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<li style="margin:8rpx 0;line-height:1.7;color:${c.fg};">• ${this.parser.parseInline(t.tokens) || t.text}</li>`
    },
    code(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<view style="background:${c.codeBg};border-radius:12rpx;padding:18rpx;font-size:24rpx;margin:12rpx 0;white-space:pre-wrap;word-break:break-all;color:${c.codeFg};">${esc(t.text)}</view>`
    },
    codespan(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<text style="background:${c.codeBg};padding:2rpx 8rpx;border-radius:6rpx;font-size:24rpx;color:${c.codeFg};">${t.text}</text>`
    },
    strong(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<text style="font-weight:700;color:${c.strong};">${t.text}</text>`
    },
    em(t) {
      return `<text style="font-style:italic;">${t.text}</text>`
    },
    blockquote(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<view style="border-left:6rpx solid ${c.border};padding:4rpx 20rpx;color:${c.sub};margin:12rpx 0;">${this.parser.parse(t.tokens) || t.text}</view>`
    },
    hr() {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<view style="height:1rpx;background:${c.border};margin:18rpx 0;"></view>`
    },
    link(t) {
      const c = theme.mode === 'dark' ? DARK : LIGHT
      return `<text style="color:${c.link};">${t.text}</text>`
    },
  },
})
function md(text) {
  return marked.parse(text || '')
}

const MAX_FILE = 4 * 1024 * 1024 // 单文件上限 4MB

const messages = ref([
  {
    role: 'assistant',
    content:
      '你好，我是你的 AI 助教 🤖\n可以问我班级、学生、出题等问题；也能发图片，或上传 Excel / Word / PDF / Markdown 文档让我帮你分析、总结、出题。',
  },
])
const input = ref('')
const loading = ref(false)
const scrollId = ref('')
const imageData = ref('') // 选中的图片（base64 data url）
const fileList = ref([]) // { name, size, data(base64) }

function formatSize(b) {
  if (b < 1024) return b + 'B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + 'KB'
  return (b / 1024 / 1024).toFixed(1) + 'MB'
}

function removeFile(k) {
  fileList.value.splice(k, 1)
}

/** 复制助手回复原文到剪贴板 */
function copyText(text) {
  const t = (text || '').trim()
  if (!t) return
  uni.setClipboardData({
    data: t,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

function clearAll() {
  if (messages.value.length <= 1 && !input.value) return
  uni.showModal({
    title: '清空对话',
    content: '确定要清空当前对话吗？',
    success: (r) => {
      if (r.confirm) {
        messages.value = [
          { role: 'assistant', content: '对话已清空，有什么可以帮你的？😊' },
        ]
      }
    },
  })
}

/** 选图：压缩后读为 base64，随消息以 OpenAI 视觉格式上传 */
function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      const path = res.tempFilePaths[0]
      uni.getFileSystemManager().readFile({
        filePath: path,
        encoding: 'base64',
        success: (r) => {
          imageData.value = 'data:image/jpeg;base64,' + r.data
        },
        fail: () => uni.showToast({ title: '图片读取失败', icon: 'none' }),
      })
    },
  })
}

/** 选文件：Excel / Word / PDF / Markdown / 文本，读为 base64 上传后端解析 */
function chooseFile() {
  uni.chooseMessageFile({
    count: 9,
    type: 'file',
    extension: ['xlsx', 'xls', 'docx', 'doc', 'pdf', 'md', 'txt', 'csv'],
    success: (res) => {
      res.tempFiles.forEach((tf) => {
        if (tf.size > MAX_FILE) {
          uni.showToast({ title: tf.name + ' 超过 4MB', icon: 'none' })
          return
        }
        uni.getFileSystemManager().readFile({
          filePath: tf.path,
          encoding: 'base64',
          success: (r) => {
            fileList.value.push({ name: tf.name, size: tf.size, data: r.data })
          },
          fail: () =>
            uni.showToast({ title: '读取失败：' + tf.name, icon: 'none' }),
        })
      })
    },
  })
}

async function send() {
  const text = input.value.trim()
  if ((!text && !imageData.value && fileList.value.length === 0) || loading.value)
    return

  // 展示用用户消息（含文件/图片缩略）
  const dispFiles = fileList.value.map((f) => ({ name: f.name }))
  messages.value.push({
    role: 'user',
    content: text,
    image: imageData.value || '',
    files: dispFiles,
  })

  // 实际发给后端的消息（OpenAI 视觉格式）
  const content = []
  if (text) content.push({ type: 'text', text })
  if (imageData.value)
    content.push({ type: 'image_url', image_url: { url: imageData.value } })
  const userMsg = {
    role: 'user',
    content:
      content.length === 1 && content[0].type === 'text' ? text : content,
  }
  const payload = { messages: [userMsg] }
  if (fileList.value.length) {
    payload.files = fileList.value.map((f) => ({ name: f.name, data: f.data }))
  }

  // 重置输入
  input.value = ''
  imageData.value = ''
  fileList.value = []

  loading.value = true
  messages.value.push({ role: 'assistant', content: '', loading: true })
  const idx = messages.value.length - 1
  await nextTick()
  scrollId.value = 'm' + idx

  try {
    const res = await api.post('/ai/chat-sync', payload)
    messages.value[idx].content = res.content
  } catch (e) {
    messages.value[idx].content =
      '调用失败：' + (e?.errMsg || e?.message || '请检查后端 AI 配置')
  }
  messages.value[idx].loading = false
  loading.value = false
  await nextTick()
  scrollId.value = 'm' + messages.value.length
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-bg);
  box-sizing: border-box;
}

/* 顶部导航 */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
  background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%);
  box-shadow: 0 6rpx 20rpx rgba(230, 162, 60, 0.25);
}
.nav-title { display: flex; align-items: center; gap: 16rpx; }
.nav-emoji { font-size: 44rpx; }
.nav-text { display: flex; flex-direction: column; }
.t1 { font-size: 32rpx; font-weight: 700; color: #5a3e1b; }
.t2 { font-size: 22rpx; color: #8a6d3b; }
.nav-clear {
  font-size: 26rpx;
  color: #5a3e1b;
  background: rgba(255, 255, 255, 0.55);
  padding: 8rpx 24rpx;
  border-radius: 30rpx;
}
/* 深色下导航栏改用深蓝灰渐变 */
.dark .nav {
  background: linear-gradient(135deg, #2a2f3a 0%, #383f4d 100%);
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.35);
}
.dark .t1 { color: #f2f2f2; }
.dark .t2 { color: #aab2c0; }
.dark .nav-clear {
  color: #e6e6e6;
  background: rgba(255, 255, 255, 0.12);
}

/* 对话区 */
.box { flex: 1; padding: 24rpx 22rpx; box-sizing: border-box; }
.row { display: flex; margin-bottom: 28rpx; gap: 16rpx; }
.row.user { flex-direction: row-reverse; }
.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx var(--c-shadow);
}
.row.user .avatar { background: var(--c-primary); color: #fff; }
.content { max-width: 78%; display: flex; flex-direction: column; }
.row.user .content { align-items: flex-end; }

.bubble {
  padding: 20rpx 26rpx;
  border-radius: 24rpx;
  font-size: 30rpx;
  line-height: 1.6;
}
.bubble.assistant {
  background: var(--c-card);
  color: var(--c-text);
  border-bottom-left-radius: 8rpx;
  box-shadow: 0 4rpx 14rpx var(--c-shadow);
}
.bubble.user {
  background: linear-gradient(135deg, #07c160 0%, #19d27e 100%);
  color: #fff;
  border-bottom-right-radius: 8rpx;
  box-shadow: 0 4rpx 14rpx rgba(7, 193, 96, 0.25);
}
.text { white-space: pre-wrap; word-break: break-word; }
.md { font-size: 30rpx; line-height: 1.6; word-break: break-word; }

/* 复制按钮 */
.bubble-ops { display: flex; justify-content: flex-end; margin-top: 6rpx; }
.copy-btn {
  font-size: 22rpx;
  color: var(--c-sub);
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  background: var(--c-card2);
}
.copy-btn:active { color: var(--c-primary); }

/* 打字动画 */
.typing { display: inline-flex; gap: 10rpx; align-items: center; }
.dot { font-size: 22rpx; color: #bbb; animation: blink 1.2s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }

/* 附件展示 */
.attach { margin-top: 12rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.attach-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 14rpx;
  overflow: hidden;
  border: 2rpx solid var(--c-border);
}
.attach-img image { width: 100%; height: 100%; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: 30rpx;
  padding: 8rpx 18rpx;
  font-size: 24rpx;
  color: var(--c-title);
  max-width: 360rpx;
}
.chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 已选文件条 */
.filebar {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 14rpx 22rpx 0;
  background: var(--c-bg);
}
.filepill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: var(--c-card);
  border: 1px solid var(--c-input-border);
  border-radius: 30rpx;
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  color: var(--c-sub);
}
.fp-name { max-width: 240rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-size { color: var(--c-sub); opacity: 0.7; }
.fp-del { color: var(--c-danger); font-size: 32rpx; padding: 0 6rpx; }

/* 输入区 */
.input-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--c-card);
  border-top: 1px solid var(--c-border);
}
.icon-btn {
  background: var(--c-card2);
  color: var(--c-sub);
  border-radius: 50%;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 34rpx;
  padding: 0;
  flex-shrink: 0;
}
.icon-btn::after { border: none; }
.ipt {
  flex: 1;
  background: var(--c-input);
  border-radius: 40rpx;
  padding: 18rpx 28rpx;
  font-size: 28rpx;
  height: 72rpx;
  min-height: 72rpx;
  line-height: 40rpx;
  box-sizing: border-box;
  color: var(--c-text);
}
.send {
  background: linear-gradient(135deg, #07c160 0%, #19d27e 100%);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
}
.send.disabled { opacity: 0.6; }
.send::after { border: none; }
</style>
