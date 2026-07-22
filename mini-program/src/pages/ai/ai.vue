<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 顶部标题栏 -->
    <view class="nav">
      <text class="nav-ico" @click="openSessions">☰</text>
      <view class="nav-text">
        <text class="t1">AI 助教</text>
        <text class="t2">{{ curSession?.title || '新对话' }}</text>
        <!-- 模型提示徽章：未配置 AI 时醒目提示 -->
        <text v-if="modelHint" class="model-hint" :class="{ off: !modelReady }" @click="goConfig">{{ modelHint }}</text>
      </view>
      <text class="nav-ico" @click="exportCurSession">📤</text>
      <text class="nav-ico" @click="openSkills">🧩</text>
    </view>

    <!-- 对话区 -->
    <scroll-view class="box" scroll-y :scroll-into-view="scrollId" :scroll-with-animation="true">
      <view v-for="(m, i) in curSession?.messages || []" :key="i" :id="'m' + i" :class="['row', m.role]">
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
          <view v-if="m.role === 'assistant' && !m.loading" class="bubble-ops">
            <text v-if="m.error" class="retry-btn" @click="retryLast">🔄 重试</text>
            <text class="copy-btn" @click="copyText(m.content)">📋 复制</text>
            <text class="copy-btn" @click="addToNotes(m)">📝 存笔记</text>
          </view>
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
      <button v-if="loading" class="stop-btn" @click="stopSend">⏹</button>
    </view>

    <!-- 会话抽屉 -->
    <view class="mask" v-if="showSessions" @click="showSessions = false">
      <view class="drawer left" @click.stop>
        <view class="dr-head">
          <text>对话</text>
          <text class="new" @click="newSession">+ 新建</text>
        </view>
        <view class="dr-search">
          <input v-model="sessionKw" class="dr-ipt" placeholder="🔍 搜索对话标题或内容" />
          <text v-if="sessionKw" class="dr-clr" @click="sessionKw = ''">×</text>
        </view>
        <scroll-view class="dr-list" scroll-y>
          <view
            v-for="s in filteredSessions"
            :key="s.id"
            class="dr-item"
            :class="{ active: s.id === curId }"
            @click="switchSession(s.id)"
          >
            <text class="dr-title">{{ s.title || '新对话' }}</text>
            <view class="dr-ops">
              <text class="dr-op" @click.stop="renameSession(s)">✎</text>
              <text class="dr-op" v-if="sessions.length > 1" @click.stop="delSession(s)">🗑</text>
            </view>
          </view>
          <view v-if="!filteredSessions.length" class="dr-empty">
            {{ sessions.length ? '没有匹配的对话' : '暂无对话，点右上新建' }}
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 技能抽屉 -->
    <view class="mask" v-if="showSkills" @click="showSkills = false">
      <view class="drawer right" @click.stop>
        <view class="dr-head"><text>AI 技能</text></view>
        <view class="sk-section">快捷指令</view>
        <view v-for="c in quickCmds" :key="c.k" class="skill" @click="runQuick(c)">
          <text class="sk-ico">{{ c.icon }}</text>
          <view class="sk-body"><text class="sk-t">{{ c.t }}</text><text class="sk-sub">{{ c.sub }}</text></view>
        </view>
        <view class="sk-section">专项工具</view>
        <view class="skill" @click="goSkill('/pages/ai-exam/ai-exam')">
          <text class="sk-ico">📊</text>
          <view class="sk-body"><text class="sk-t">考试分析</text><text class="sk-sub">按考试生成分析描述</text></view>
        </view>
        <view class="skill" @click="goSkill('/pages/ai-knowledge/ai-knowledge')">
          <text class="sk-ico">📚</text>
          <view class="sk-body"><text class="sk-t">知识点生成</text><text class="sk-sub">生成知识点讲解</text></view>
        </view>
        <view class="skill" @click="goSkill('/pages/ai-paper/ai-paper')">
          <text class="sk-ico">📝</text>
          <view class="sk-body"><text class="sk-t">优选试卷</text><text class="sk-sub">生成组卷建议</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { marked } from 'marked'
import api, { streamChat } from '../../common/request'
import { auth, theme } from '../../common/store'
import { compressImage } from '../../common/image'

// —— Markdown 渲染：token 化 renderer + 内联样式，产物交给 <rich-text> 渲染 ——
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

const WELCOME = {
  role: 'assistant',
  content:
    '你好，我是你的 AI 助教 🤖\n可以问我班级、学生、出题等问题；也能发图片，或上传 Excel / Word / PDF / Markdown 文档让我帮你分析、总结、出题。\n点击右上角 🧩 可使用「考试分析 / 知识点生成 / 优选试卷」技能；左上角 ☰ 可管理多轮对话。',
}

// —— 多会话（本地存储，按用户隔离）——
const uid = computed(() => (auth.user && auth.user.id) || 'anon')
const sessions = ref([])
const curId = ref('')
const showSessions = ref(false)
const showSkills = ref(false)
const curSession = computed(() => sessions.value.find((s) => s.id === curId.value) || null)

const input = ref('')
const loading = ref(false)
const scrollId = ref('')
const imageData = ref('')
const fileList = ref([])
// 会话搜索关键字
const sessionKw = ref('')
// filteredSessions：标题或任一消息内容命中关键字（不区分大小写）
const filteredSessions = computed(() => {
  const k = sessionKw.value.trim().toLowerCase()
  if (!k) return sessions.value
  return sessions.value.filter((s) => {
    if ((s.title || '').toLowerCase().includes(k)) return true
    return (s.messages || []).some((m) => (m.content || '').toLowerCase().includes(k))
  })
})
// 流式任务句柄，用于支持「停止生成」
let abortTask = null
// 最近一次发送的 payload，用于失败后「重试」
let lastPayload = null

function storageKey() {
  return 'ai_sessions_' + uid.value
}
function curKey() {
  return 'ai_cur_' + uid.value
}
function loadSessions() {
  try {
    const raw = uni.getStorageSync(storageKey())
    const arr = raw ? JSON.parse(raw) : []
    if (Array.isArray(arr) && arr.length) {
      sessions.value = arr
    } else {
      sessions.value = [{ id: String(Date.now()), title: '新对话', messages: [{ ...WELCOME }], updatedAt: Date.now() }]
    }
    const cur = uni.getStorageSync(curKey())
    curId.value = sessions.value.some((s) => s.id === cur) ? cur : sessions.value[0].id
  } catch (e) {
    sessions.value = [{ id: String(Date.now()), title: '新对话', messages: [{ ...WELCOME }], updatedAt: Date.now() }]
    curId.value = sessions.value[0].id
  }
}
// 持久化时去掉 base64 大体积字段，避免超出本地存储配额
function serializeMsg(m) {
  if (m.role === 'user') {
    return {
      role: 'user',
      content: m.content || '',
      files: (m.files || []).map((f) => ({ name: f.name })),
      image: m.image ? '__img__' : '',
    }
  }
  return { role: 'assistant', content: m.content || '' }
}
function saveSessions() {
  try {
    const data = sessions.value.map((s) => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      messages: (s.messages || []).map(serializeMsg),
    }))
    uni.setStorageSync(storageKey(), JSON.stringify(data))
    uni.setStorageSync(curKey(), curId.value)
  } catch (e) {
    /* 配额或序列化异常时忽略，不影响本次对话 */
  }
}

function newSession() {
  const s = { id: String(Date.now()), title: '新对话', messages: [{ ...WELCOME }], updatedAt: Date.now() }
  sessions.value.unshift(s)
  curId.value = s.id
  showSessions.value = false
  saveSessions()
  scrollBottom()
}
function switchSession(id) {
  curId.value = id
  showSessions.value = false
  saveSessions()
  scrollBottom()
}
function renameSession(s) {
  uni.showModal({
    title: '重命名对话',
    editable: true,
    content: s.title || '',
    success: (r) => {
      if (r.confirm && r.content != null) {
        s.title = r.content.trim() || '新对话'
        s.updatedAt = Date.now()
        saveSessions()
      }
    },
  })
}
function delSession(s) {
  uni.showModal({
    title: '删除对话',
    content: '确定删除「' + (s.title || '新对话') + '」？',
    success: (r) => {
      if (!r.confirm) return
      const idx = sessions.value.findIndex((x) => x.id === s.id)
      sessions.value.splice(idx, 1)
      if (!sessions.value.length) {
        sessions.value = [{ id: String(Date.now()), title: '新对话', messages: [{ ...WELCOME }], updatedAt: Date.now() }]
      }
      if (curId.value === s.id) curId.value = sessions.value[0].id
      saveSessions()
    },
  })
}

function openSessions() {
  showSessions.value = true
}
function openSkills() {
  showSkills.value = true
}
function goSkill(url) {
  showSkills.value = false
  uni.navigateTo({ url })
}

// —— 模型提示徽章：从后端拉取 AI 配置，未配置时醒目提示 ——
const aiSettings = ref(null)
const modelReady = computed(() => !!(aiSettings.value && aiSettings.value.apiKey && aiSettings.value.baseUrl))
const modelHint = computed(() => {
  if (!aiSettings.value) return ''
  if (!modelReady.value) return '⚠️ 未配置 AI'
  return aiSettings.value.textModel || 'AI'
})
function goConfig() {
  uni.navigateTo({ url: '/pages/config/config' })
}

// 导出当前会话为纯文本到剪贴板（便于分享或粘贴到其他工具）
function exportCurSession() {
  const sess = curSession.value
  if (!sess || !sess.messages || !sess.messages.length) {
    return uni.showToast({ title: '当前会话为空', icon: 'none' })
  }
  const lines = [`# ${sess.title || 'AI 对话'}`, '']
  sess.messages.forEach((m) => {
    if (m.role === 'user') {
      lines.push('## 我')
      lines.push(m.content || '（图片/文档）')
    } else {
      lines.push('## AI')
      lines.push(m.content || '')
    }
    lines.push('')
  })
  lines.push('— 由工作系统小程序 AI 助教导出 —')
  uni.setClipboardData({
    data: lines.join('\n'),
    success: () => uni.showToast({ title: '已复制对话文本', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

// 8 个预设快捷指令（对齐 web 端 AI.vue）
const quickCmds = [
  { k: 'analyze', icon: '📈', t: '分析成绩', sub: '分析班级最近一次考试成绩', prompt: '请帮我分析最近一次考试的成绩情况，给出分数分布、薄弱点、改进建议。' },
  { k: 'plan', icon: '📒', t: '生成教案', sub: '生成一节课的教案框架', prompt: '请帮我生成一节课的教案，包含教学目标、重难点、教学过程、板书设计、作业布置。' },
  { k: 'comment', icon: '✍️', t: '写评语', sub: '为学生写期末评语', prompt: '请帮我给一位学生写期末评语，包含学习态度、行为表现、改进方向、鼓励话语。' },
  { k: 'quiz', icon: '❓', t: '出题', sub: '按知识点出练习题', prompt: '请帮我出 5 道练习题（含答案与解析），覆盖本单元的核心知识点。' },
  { k: 'parent', icon: '💬', t: '家长沟通', sub: '起草家校沟通话术', prompt: '请帮我起草一段家长沟通话术，针对学生在校表现反馈给家长，语气友好、专业。' },
  { k: 'activity', icon: '🎉', t: '课堂活动', sub: '设计课堂互动活动', prompt: '请帮我设计 3 个 5-10 分钟的课堂互动活动，适合小学高年级，能激发学生兴趣。' },
  { k: 'outline', icon: '🗂️', t: '知识点梳理', sub: '梳理单元知识结构', prompt: '请帮我梳理本单元的知识结构，给出知识图谱、重点难点、典型例题。' },
  { k: 'grade', icon: '✔️', t: '作业批改', sub: '辅助批改学生作业', prompt: '请帮我分析一道学生作业题的常见错误类型与批改建议。' },
]

function runQuick(c) {
  showSkills.value = false
  input.value = c.prompt
  // 自动发送
  send()
}

function formatSize(b) {
  if (b < 1024) return b + 'B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + 'KB'
  return (b / 1024 / 1024).toFixed(1) + 'MB'
}
function removeFile(k) {
  fileList.value.splice(k, 1)
}
function copyText(text) {
  const t = (text || '').trim()
  if (!t) return
  uni.setClipboardData({
    data: t,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

// 把 AI 回复保存为笔记，自动加「AI 助教」分类与原标题
async function addToNotes(m) {
  const content = (m.content || '').trim()
  if (!content) return uni.showToast({ title: '内容为空', icon: 'none' })
  uni.showModal({
    title: '保存为笔记',
    editable: true,
    placeholderText: '笔记标题（可改）',
    content: (curSession.value?.title || 'AI 回复').slice(0, 30),
    success: async (r) => {
      if (!r.confirm) return
      const title = (r.content || 'AI 回复').trim().slice(0, 50)
      try {
        await api.post('/notes', {
          title,
          content,
          category: 'AI 助教',
        })
        uni.showToast({ title: '已存到笔记', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
      }
    },
  })
}
function scrollBottom() {
  nextTick(() => {
    scrollId.value = 'm' + ((curSession.value?.messages?.length || 1) - 1)
  })
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed', 'original'],
    success: async (res) => {
      const path = res.tempFilePaths[0]
      uni.showLoading({ title: '压缩中…' })
      try {
        // 主动压缩到 ≤1280px、jpg 质量 80，降低 token/带宽消耗
        const r = await compressImage({ src: path, maxWidth: 1280, maxHeight: 1280, quality: 80, fileType: 'jpg' })
        const finalPath = r.tempFilePath
        uni.getFileSystemManager().readFile({
          filePath: finalPath,
          encoding: 'base64',
          success: (rr) => {
            imageData.value = 'data:image/jpeg;base64,' + rr.data
            uni.showToast({ title: '已压缩 ' + Math.round((r.size || 0) / 1024) + 'KB', icon: 'none' })
          },
          fail: () => uni.showToast({ title: '图片读取失败', icon: 'none' }),
        })
      } catch (e) {
        // 压缩失败回退到原图
        uni.getFileSystemManager().readFile({
          filePath: path,
          encoding: 'base64',
          success: (rr) => { imageData.value = 'data:image/jpeg;base64,' + rr.data },
          fail: () => uni.showToast({ title: '图片读取失败', icon: 'none' }),
        })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
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
  if ((!text && !imageData.value && fileList.value.length === 0) || loading.value) return
  if (!curSession.value) newSession()

  const sess = curSession.value
  const dispFiles = fileList.value.map((f) => ({ name: f.name }))
  sess.messages.push({
    role: 'user',
    content: text,
    image: imageData.value || '',
    files: dispFiles,
  })
  if (!sess.title || sess.title === '新对话') {
    sess.title = (text || '图片/文档咨询').slice(0, 12) || '新对话'
  }

  const content = []
  if (text) content.push({ type: 'text', text })
  if (imageData.value) content.push({ type: 'image_url', image_url: { url: imageData.value } })
  const userMsg = {
    role: 'user',
    content: content.length === 1 && content[0].type === 'text' ? text : content,
  }
  const payload = { messages: [userMsg] }
  if (fileList.value.length) {
    payload.files = fileList.value.map((f) => ({ name: f.name, data: f.data }))
  }

  input.value = ''
  imageData.value = ''
  fileList.value = []

  loading.value = true
  sess.messages.push({ role: 'assistant', content: '', loading: true })
  const idx = sess.messages.length - 1
  await nextTick()
  scrollId.value = 'm' + idx
  lastPayload = payload

  try {
    await streamChat('/ai/chat', payload, (delta, full) => {
      sess.messages[idx].content = full
      scrollId.value = 'm' + idx
    }, {
      onTask: (t) => { abortTask = t },
    })
    sess.messages[idx].error = false
  } catch (e) {
    sess.messages[idx].content = '调用失败：' + (e?.errMsg || e?.message || '请检查后端 AI 配置')
    sess.messages[idx].error = true
  }
  sess.messages[idx].loading = false
  abortTask = null
  loading.value = false
  sess.updatedAt = Date.now()
  scrollBottom()
  saveSessions()
}

// 停止生成：中断流式请求，保留已接收到的部分回复
function stopSend() {
  if (abortTask) {
    try { abortTask.abort() } catch (e) {}
    abortTask = null
  }
  loading.value = false
  const sess = curSession.value
  if (sess) {
    const last = sess.messages[sess.messages.length - 1]
    if (last && last.role === 'assistant' && last.loading) {
      last.loading = false
      if (!last.content) last.content = '（已停止生成）'
    }
  }
}

// 重试上一次发送：移除失败的 assistant 消息后重新发送
async function retryLast() {
  const sess = curSession.value
  if (!sess || !lastPayload) return
  // 移除最后一条失败的 assistant 消息
  if (sess.messages.length && sess.messages[sess.messages.length - 1].role === 'assistant') {
    sess.messages.pop()
  }
  sess.messages.push({ role: 'assistant', content: '', loading: true })
  const idx = sess.messages.length - 1
  loading.value = true
  await nextTick()
  scrollId.value = 'm' + idx
  try {
    await streamChat('/ai/chat', lastPayload, (delta, full) => {
      sess.messages[idx].content = full
      scrollId.value = 'm' + idx
    }, {
      onTask: (t) => { abortTask = t },
    })
    sess.messages[idx].error = false
  } catch (e) {
    sess.messages[idx].content = '调用失败：' + (e?.errMsg || e?.message || '请检查后端 AI 配置')
    sess.messages[idx].error = true
  }
  sess.messages[idx].loading = false
  abortTask = null
  loading.value = false
  sess.updatedAt = Date.now()
  scrollBottom()
  saveSessions()
}

onShow(() => {
  if (!auth.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  loadSessions()
  // 拉取 AI 配置用于模型提示徽章（失败静默，不影响主流程）
  api.get('/config/ai').then((r) => { aiSettings.value = r }).catch(() => { aiSettings.value = null })
})
onUnload(() => saveSessions())
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
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
  background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%);
  box-shadow: 0 6rpx 20rpx rgba(230, 162, 60, 0.25);
}
.nav-ico { font-size: 40rpx; color: #5a3e1b; width: 56rpx; text-align: center; }
.nav-text { display: flex; flex-direction: column; align-items: center; flex: 1; }
.t1 { font-size: 32rpx; font-weight: 700; color: #5a3e1b; }
.t2 { font-size: 22rpx; color: #8a6d3b; max-width: 420rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dark .nav { background: linear-gradient(135deg, #2a2f3a 0%, #383f4d 100%); box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.35); }
.dark .nav-ico, .dark .t1 { color: #f2f2f2; }
.dark .t2 { color: #aab2c0; }

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
.bubble { padding: 20rpx 26rpx; border-radius: 24rpx; font-size: 30rpx; line-height: 1.6; }
.bubble.assistant { background: var(--c-card); color: var(--c-text); border-bottom-left-radius: 8rpx; box-shadow: 0 4rpx 14rpx var(--c-shadow); }
.bubble.user { background: linear-gradient(135deg, #07c160 0%, #19d27e 100%); color: #fff; border-bottom-right-radius: 8rpx; box-shadow: 0 4rpx 14rpx rgba(7, 193, 96, 0.25); }
.text { white-space: pre-wrap; word-break: break-word; }
.md { font-size: 30rpx; line-height: 1.6; word-break: break-word; }
.bubble-ops { display: flex; justify-content: flex-end; margin-top: 6rpx; }
.copy-btn { font-size: 22rpx; color: var(--c-sub); padding: 6rpx 16rpx; border-radius: 24rpx; background: var(--c-card2); }
.copy-btn:active { color: var(--c-primary); }
.typing { display: inline-flex; gap: 10rpx; align-items: center; }
.dot { font-size: 22rpx; color: #bbb; animation: blink 1.2s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
.attach { margin-top: 12rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.attach-img { width: 140rpx; height: 140rpx; border-radius: 14rpx; overflow: hidden; border: 2rpx solid var(--c-border); }
.attach-img image { width: 100%; height: 100%; }
.chip { display: inline-flex; align-items: center; gap: 8rpx; background: var(--c-card); border: 1px solid var(--c-border); border-radius: 30rpx; padding: 8rpx 18rpx; font-size: 24rpx; color: var(--c-title); max-width: 360rpx; }
.chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 已选文件条 */
.filebar { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 14rpx 22rpx 0; background: var(--c-bg); }
.filepill { display: inline-flex; align-items: center; gap: 8rpx; background: var(--c-card); border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 8rpx 16rpx; font-size: 24rpx; color: var(--c-sub); }
.fp-name { max-width: 240rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-size { color: var(--c-sub); opacity: 0.7; }
.fp-del { color: var(--c-danger); font-size: 32rpx; padding: 0 6rpx; }

/* 输入区 */
.input-bar { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); }
.icon-btn { background: var(--c-card2); color: var(--c-sub); border-radius: 50%; width: 72rpx; height: 72rpx; line-height: 72rpx; font-size: 34rpx; padding: 0; flex-shrink: 0; }
.icon-btn::after { border: none; }
.ipt { flex: 1; background: var(--c-input); border-radius: 40rpx; padding: 18rpx 28rpx; font-size: 28rpx; height: 72rpx; min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; color: var(--c-text); }
.send { background: linear-gradient(135deg, #07c160 0%, #19d27e 100%); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 0 32rpx; height: 72rpx; line-height: 72rpx; }
.send.disabled { opacity: 0.6; }
.send::after { border: none; }
.stop-btn { background: var(--c-card2); color: var(--c-danger, #e64340); border-radius: 50%; width: 72rpx; height: 72rpx; line-height: 72rpx; font-size: 32rpx; padding: 0; flex-shrink: 0; }
.stop-btn::after { border: none; }
.retry-btn { font-size: 22rpx; color: var(--c-danger, #e64340); padding: 6rpx 16rpx; border-radius: 24rpx; background: var(--c-card2); margin-right: 12rpx; }

/* 抽屉 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; z-index: 60; }
.drawer { position: absolute; top: 0; bottom: 0; width: 78%; max-width: 620rpx; background: var(--c-card); display: flex; flex-direction: column; box-shadow: 0 0 30rpx rgba(0,0,0,.2); }
.drawer.left { left: 0; }
.drawer.right { right: 0; }
.dr-head { display: flex; align-items: center; justify-content: space-between; padding: 36rpx 28rpx 20rpx; font-size: 32rpx; font-weight: 700; color: var(--c-title); border-bottom: 1px solid var(--c-border); }
.dr-head .new { font-size: 26rpx; color: #07c160; font-weight: 600; }
.dr-list { flex: 1; padding: 10rpx 0; }
.dr-search { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 28rpx 8rpx; }
.dr-ipt { flex: 1; background: var(--c-input); border-radius: 32rpx; padding: 14rpx 24rpx; font-size: 26rpx; color: var(--c-text); }
.dr-clr { color: var(--c-sub); font-size: 36rpx; padding: 0 8rpx; }
.dr-empty { padding: 60rpx 28rpx; text-align: center; color: var(--c-sub); font-size: 26rpx; }
.dr-item { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-bottom: 1px solid var(--c-border); }
.dr-item.active { background: var(--c-card2); }
.dr-title { font-size: 28rpx; color: var(--c-title); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.dr-ops { display: flex; gap: 24rpx; }
.dr-op { font-size: 30rpx; color: var(--c-sub); }
.skill { display: flex; align-items: center; gap: 20rpx; padding: 30rpx 28rpx; border-bottom: 1px solid var(--c-border); }
.sk-ico { font-size: 44rpx; }
.sk-body { display: flex; flex-direction: column; }
.sk-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.sk-sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }
.sk-section { font-size: 22rpx; color: var(--c-sub); padding: 18rpx 28rpx 8rpx; background: var(--c-card2); font-weight: 600; }

/* 模型提示徽章 */
.model-hint { font-size: 20rpx; color: var(--c-primary); background: rgba(255, 255, 255, 0.65); padding: 2rpx 14rpx; border-radius: 16rpx; margin-top: 6rpx; max-width: 360rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.model-hint.off { color: var(--c-danger, #e64340); background: rgba(230, 67, 64, 0.12); }
.dark .model-hint { background: rgba(255, 255, 255, 0.08); }
</style>
