<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 资料卡 -->
    <view class="hd">
      <text class="avatar">{{ me.avatar || '🍎' }}</text>
      <view class="info">
        <view class="top">
          <text class="name">{{ me.name || '老师' }}</text>
          <text class="chip">{{ me.subject || '' }} 老师</text>
        </view>
        <text class="sub" v-if="me.term">{{ me.term }}</text>
        <text class="sub" v-if="me.school">{{ me.school }}</text>
        <text class="motto" v-if="me.motto">“{{ me.motto }}”</text>
      </view>
      <text class="edit" @click="editing = true">编辑</text>
    </view>

    <!-- 编辑资料弹层 -->
    <view class="mask editing" v-if="editing" @click="editing = false">
      <view class="sheet" @click.stop>
        <view class="sh-h">编辑资料</view>
        <view class="fld"><text class="lab">老师称呼</text><input v-model="form.name" class="inp" /></view>
        <view class="fld"><text class="lab">所在学校</text><input v-model="form.school" class="inp" maxlength="30" placeholder="由学校管理员分配" disabled="true" /></view>
        <view class="fld"><text class="lab">任教学期</text>
          <view class="row2">
            <picker :range="termOpts" @change="(e)=>form.term = termOpts[e.detail.value]">
              <view class="inp pick">{{ form.term || '选择' }}</view>
            </picker>
          </view>
        </view>
        <text class="lab">任教学科（可多选）</text>
        <view class="subs">
          <text v-for="s in subjectOpts" :key="s" class="sb" :class="form.subjects.includes(s) && 'on'" @click="toggleSub(s)">{{ form.subjects.includes(s) ? '✓ ' : '' }}{{ s }}</text>
        </view>
        <view class="fld"><text class="lab">教育格言</text><input v-model="form.motto" class="inp" maxlength="50" /></view>
        <view class="fld"><text class="lab">手机号</text><input v-model="form.phone" class="inp" placeholder="选填，便于联系" @blur="checkPhone" /><text v-if="phoneError" class="field-err">{{ phoneError }}</text></view>
        <view class="fld"><text class="lab">邮箱</text><input v-model="form.email" class="inp" placeholder="选填，便于联系" /></view>
        <text class="lab">头像</text>
        <view class="avatars">
          <text v-for="a in avatarOpts" :key="a" class="avopt" :class="form.avatar === a && 'on'" @click="form.avatar = a">{{ a }}</text>
        </view>
        <view class="sh-acts">
          <button class="btn-c" @click="editing = false">取消</button>
          <button class="btn-s" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="card">
      <view class="card-h">数据管理</view>
      <view class="dm" @click="exportData"><text class="dm-ic" style="background:#e8f9e8">📤</text><view><text class="dm-t">导出数据</text><text class="dm-s">复制全部数据为 JSON</text></view></view>
      <view class="dm" @click="importData"><text class="dm-ic" style="background:#e8f0fe">📥</text><view><text class="dm-t">导入数据</text><text class="dm-s">从 JSON 文件导入，覆盖现有数据</text></view></view>
      <view class="dm" @click="resetData"><text class="dm-ic" style="background:#fde8ea">🗑️</text><view><text class="dm-t" style="color:#e06c75">清空所有数据</text><text class="dm-s">不可恢复，请先导出</text></view></view>
    </view>

    <!-- 备份与恢复：服务端定时/手动备份，支持一键恢复 -->
    <view class="card">
      <view class="card-h">备份与恢复</view>
      <view class="row">
        <view>
          <text class="lab">⏰ 自动备份</text>
          <text class="dm-s" style="margin-top:4rpx">每 2 小时自动备份一次，最多保留 10 条</text>
        </view>
        <switch :checked="autoBackupOn" @change="toggleAutoBackup" color="#3fd07f" />
      </view>
      <view class="row" v-if="autoBackupOn">
        <text class="lab">上次自动备份</text>
        <text class="bk-time">{{ lastAutoText }}</text>
      </view>
      <button class="bk-btn" :disabled="bkSaving" @click="createBackup">{{ bkSaving ? '备份中…' : '📥 立即创建备份' }}</button>
      <view class="bk-list" v-if="backups.length">
        <view class="bk-item" v-for="b in backups" :key="b.id">
          <view class="bk-info">
            <text class="bk-label">{{ b.label || '未命名备份' }}</text>
            <text class="bk-meta">{{ b.type === 'auto' ? '自动' : '手动' }} · {{ fmtTime(b.createdAt) }}</text>
          </view>
          <view class="bk-acts">
            <text class="bk-act" @click="restoreBackup(b)">恢复</text>
            <text class="bk-act danger" @click="deleteBackup(b)">删除</text>
          </view>
        </view>
      </view>
      <view class="bk-empty" v-else-if="!bkLoading">暂无备份记录</view>
      <view class="bk-empty" v-else>加载中…</view>
    </view>

    <button class="help-btn" @click="showHelp = true">📖 使用帮助</button>

    <button class="logout" @click="logout">退出登录</button>

    <view v-if="showHelp" class="mask" @click="showHelp = false">
      <view class="help-modal" @click.stop>
        <view class="hm-title">📖 使用帮助</view>
        <scroll-view scroll-y class="hm-body">
          <view class="hm-sec">
            <view class="hm-h">🎓 应用简介</view>
            <view class="hm-p">园丁工作台是面向中小学教师的一站式班务管理工具，覆盖班级、学生、考试、成绩、作业、公告、考勤、座位表、班费、活动、AI 教案/试卷/知识点生成等场景。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">🚀 快速上手</view>
            <view class="hm-p">1. 在「班级管理」创建班级，在「学生管理」批量录入学生（支持 Excel/图片 AI 识别）。</view>
            <view class="hm-p">2. 在「考试管理」创建考试，在「成绩管理」按班级/考试/科目录入或导入成绩。</view>
            <view class="hm-p">3. 在「作业管理」布置作业，状态自动同步到「班级公告」。</view>
            <view class="hm-p">4. 在「工具箱」使用随机点名、计时器、计分板、奖励兑换、笔顺演示等课堂神器。</view>
          </view>
        </scroll-view>
        <button class="hm-close" @click="showHelp = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api, { batchRun } from '../../common/request'
import { isPhone, isEmail } from '../../common/validators'
import { theme, auth, setUser, setColorScheme, logout as doLogout } from '../../common/store'

const me = reactive({})
const form = reactive({ name: '', subject: '', school: '', term: '', subjects: [], motto: '', avatar: '', phone: '', email: '' })
const editing = ref(false)
const saving = ref(false)
const phoneError = ref('')
const showHelp = ref(false)

// 备份历史与自动备份相关状态
const backups = ref([])
const bkLoading = ref(false)
const bkSaving = ref(false)
const autoBackupOn = ref(false)
const lastAutoAt = ref(0)
const lastAutoText = computed(() => lastAutoAt.value ? fmtTime(lastAutoAt.value) : '尚未触发')

const subjectOpts = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育', '综合实践', '信息技术']
const avatarOpts = ['🍎', '👩‍🏫', '🧑‍🏫', '🧑', '👩', '👨‍🏫', '🌟', '🌈', '📚', '☕']
const termOpts = ['2026春季学期', '2026秋季学期', '2027春季学期', '2027秋季学期']

async function load() {
  try {
    const u = await api.get('/users/me')
    Object.assign(me, u)
    Object.assign(form, {
      name: u.name || '',
      subject: u.subject || '',
      school: u.school || '',
      term: u.term || '',
      subjects: Array.isArray(u.subjects) ? [...u.subjects] : (u.subject ? [u.subject] : []),
      motto: u.motto || '',
      avatar: u.avatar || '🍎',
      // 同步 phone/email 到 form，使 save 中的格式校验不再是死代码
      phone: u.phone || '',
      email: u.email || '',
    })
    if (u.colorScheme) setColorScheme(u.colorScheme)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  // 用户信息加载完成后，并行加载备份列表和自动备份开关
  loadAutoBackupPref()
  loadBackups()
  // 若开启了自动备份，按 2 小时阈值决定是否触发一次
  maybeAutoBackup()
}
onShow(load)

// 下拉刷新：重新加载当前用户资料
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function toggleSub(s) {
  const i = form.subjects.indexOf(s)
  if (i >= 0) form.subjects.splice(i, 1)
  else form.subjects.push(s)
}
function checkPhone() {
  if (form.phone && !isPhone(form.phone)) {
    phoneError.value = '手机号格式错误，应为 11 位数字'
  } else {
    phoneError.value = ''
  }
}

async function save() {
  if (phoneError.value) return uni.showToast({ title: phoneError.value, icon: 'none' })
  if (form.phone && !isPhone(form.phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  if (form.email && !isEmail(form.email)) return uni.showToast({ title: '邮箱格式错误', icon: 'none' })
  saving.value = true
  const payload = {
    name: form.name,
    school: form.school,
    term: form.term,
    motto: form.motto,
    avatar: form.avatar,
    subjects: form.subjects,
    subject: form.subjects.length ? form.subjects[0] : (form.subject || '语文'),
    // 一并提交 phone/email，配合上方格式校验形成完整链路
    phone: form.phone,
    email: form.email,
  }
  try {
    const u = await api.put('/users/me', payload)
    Object.assign(me, u)
    setUser(u)
    editing.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}

// 导出：把全部数据聚合为 JSON 复制到剪贴板（小程序无文件下载，采用复制替代）
async function exportData() {
  uni.showLoading({ title: '导出中' })
  try {
    const paths = ['/classes', '/students', '/grades', '/notes', '/teachers', '/schedules', '/homework', '/notices', '/resources', '/attendances', '/exams', '/award-records', '/todos', '/growth-entries', '/parent-contacts', '/behavior-records', '/duty-rosters', '/class-activities', '/class-expenses', '/class-galleries']
    const out = { version: 1, user: me, exportedAt: Date.now() }
    await Promise.all(paths.map(async (p) => {
      const key = p.replace(/^\//, '').replace(/-/g, '_')
      try { out[key] = await api.get(p) } catch (e) { out[key] = [] }
    }))
    uni.setClipboardData({
      data: JSON.stringify(out),
      success: () => uni.showToast({ title: '已全部复制，可粘贴保存', icon: 'none' }),
    })
  } catch (e) {
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 导入：从 JSON 文件读取数据并批量写入后端
// 流程：首次 modal 确认 → 选 .json 文件 → 读取并解析 → 第二次 modal 显示摘要 → 批量写入
async function importData() {
  uni.showModal({
    title: '导入数据',
    content: '导入会覆盖现有数据，确定？',
    success: (r) => {
      if (!r.confirm) return
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['json'],
        success: (res) => {
          const f = res.tempFiles[0]
          uni.showLoading({ title: '读取中…' })
          uni.getFileSystemManager().readFile({
            filePath: f.path,
            encoding: 'utf-8',
            success: async (rr) => {
              try {
                const data = JSON.parse(rr.data)
                await doImport(data)
              } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: 'JSON 解析失败：' + (e.message || ''), icon: 'none' })
              }
            },
            fail: () => {
              uni.hideLoading()
              uni.showToast({ title: '文件读取失败', icon: 'none' })
            },
          })
        },
      })
    },
  })
}

// 执行批量导入：构建各资源写入任务，弹出摘要确认后并行执行
async function doImport(data) {
  // 收集所有写入任务（每项是一个返回 Promise 的函数，便于按需触发）
  const tasks = []
  if (data.user) tasks.push(() => api.put('/users/me', data.user))
  if (data.aiSettings) tasks.push(() => api.put('/config/ai', data.aiSettings))
  if (Array.isArray(data.classes)) data.classes.forEach(c => tasks.push(() => api.post('/classes', c)))
  if (Array.isArray(data.students)) data.students.forEach(s => tasks.push(() => api.post('/students', s)))
  if (Array.isArray(data.notes)) data.notes.forEach(n => tasks.push(() => api.post('/notes', n)))
  if (Array.isArray(data.teachers)) data.teachers.forEach(t => tasks.push(() => api.post('/teachers', t)))
  if (Array.isArray(data.exams)) data.exams.forEach(e => tasks.push(() => api.post('/exams', e)))
  if (Array.isArray(data.awards)) data.awards.forEach(a => tasks.push(() => api.post('/award-records', a)))
  if (Array.isArray(data.todos)) data.todos.forEach(t => tasks.push(() => api.post('/todos', t)))
  // 成绩使用 merge 接口合并写入
  if (Array.isArray(data.grades)) data.grades.forEach(g => tasks.push(() => api.post('/grades/merge', g)))

  // 构建按类别统计的摘要文本
  const parts = []
  if (data.user) parts.push('用户资料')
  if (data.aiSettings) parts.push('AI 配置')
  if (Array.isArray(data.classes) && data.classes.length) parts.push(`${data.classes.length} 个班级`)
  if (Array.isArray(data.students) && data.students.length) parts.push(`${data.students.length} 个学生`)
  if (Array.isArray(data.grades) && data.grades.length) parts.push(`${data.grades.length} 条成绩`)
  if (Array.isArray(data.notes) && data.notes.length) parts.push(`${data.notes.length} 条笔记`)
  if (Array.isArray(data.teachers) && data.teachers.length) parts.push(`${data.teachers.length} 位教师`)
  if (Array.isArray(data.exams) && data.exams.length) parts.push(`${data.exams.length} 个考试`)
  if (Array.isArray(data.awards) && data.awards.length) parts.push(`${data.awards.length} 条奖惩`)
  if (Array.isArray(data.todos) && data.todos.length) parts.push(`${data.todos.length} 条待办`)

  // 读取阶段已完成，关闭读取 loading，避免确认弹窗与 loading 叠加
  uni.hideLoading()

  if (tasks.length === 0) {
    uni.showToast({ title: '文件中无可导入数据', icon: 'none' })
    return
  }

  const summary = parts.length ? parts.join('、') : `${tasks.length} 条`
  uni.showModal({
    title: '确认导入',
    content: `将导入 ${summary}，共 ${tasks.length} 条，确定？`,
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '导入中…', mask: true })
      // 触发所有任务并用 batchRun 并行执行，统计成功/失败数
      const { success, failed } = await batchRun(tasks.map(fn => fn()))
      uni.hideLoading()
      uni.showToast({ title: `成功 ${success} 失败 ${failed}`, icon: failed === 0 ? 'success' : 'none' })
      // 有成功写入时刷新数据
      if (success > 0) load()
    },
  })
}

function resetData() {
  uni.showModal({
    title: '清空所有数据', content: '此操作不可恢复，建议先导出备份。确定继续吗？',
    success: (r) => {
      if (!r.confirm) return
      uni.showModal({
        title: '再次确认', content: '真的要清空吗？',
        success: async (r2) => {
          if (!r2.confirm) return
          const paths = ['/classes', '/students', '/grades', '/notes', '/teachers', '/schedules', '/homework', '/notices', '/resources', '/attendances', '/exams', '/award-records', '/todos', '/growth-entries', '/parent-contacts', '/behavior-records', '/duty-rosters', '/class-activities', '/class-expenses', '/class-galleries']
          uni.showLoading({ title: '清空中' })
          // 先收集所有删除任务，再用 batchRun 批量执行，单条失败不再被静默吞掉
          const tasks = []
          for (const p of paths) {
            try {
              const list = await api.get(p)
              for (const item of (list || [])) {
                if (item && item.id) tasks.push(api.del(p + '/' + item.id))
              }
            } catch (e) {}
          }
          const { success, failed } = await batchRun(tasks)
          uni.hideLoading()
          // 失败数大于 0 时提示部分失败，全成功时保持原提示
          if (failed > 0) {
            uni.showToast({ title: `成功 ${success} 失败 ${failed}`, icon: 'none' })
          } else {
            uni.showToast({ title: '已清空', icon: 'none' })
          }
          load()
        }
      })
    }
  })
}

function logout() {
  uni.showModal({
    title: '退出登录', content: '确定退出当前账号？',
    success: (r) => {
      if (!r.confirm) return
      doLogout()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}

// —— 备份与恢复 ——
// 时间格式化：备份列表/上次自动备份均使用同一格式
function fmtTime(t) {
  if (!t) return '-'
  const d = new Date(t)
  if (isNaN(d.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadBackups() {
  bkLoading.value = true
  try {
    const list = await api.get('/backups')
    backups.value = Array.isArray(list) ? list : []
  } catch (e) {
    // 静默：备份接口失败不应阻塞 Profile 页加载
    backups.value = []
  } finally {
    bkLoading.value = false
  }
}

async function createBackup() {
  if (bkSaving.value) return
  bkSaving.value = true
  try {
    await api.post('/backups', { label: '手动备份 ' + fmtTime(Date.now()) })
    uni.showToast({ title: '已创建备份', icon: 'success' })
    await loadBackups()
  } catch (e) {
    uni.showToast({ title: '备份失败：' + (e.message || ''), icon: 'none' })
  } finally {
    bkSaving.value = false
  }
}

// 恢复备份：拉取 payload → JSON 解析 → 复用 doImport 批量写入
async function restoreBackup(b) {
  uni.showModal({
    title: '恢复备份',
    content: `将用「${b.label || '备份'}」覆盖现有数据，确定？`,
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '恢复中…', mask: true })
      try {
        const rec = await api.get('/backups/' + b.id)
        const raw = rec?.payload
        if (!raw) throw new Error('备份内容为空')
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw
        // doImport 内部会关闭 loading 并弹摘要确认
        await doImport(data)
        await load()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '恢复失败：' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

async function deleteBackup(b) {
  uni.showModal({
    title: '删除备份',
    content: `确定删除「${b.label || '备份'}」？`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/backups/' + b.id)
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadBackups()
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

// 自动备份开关：按用户 ID 持久化到本地存储，避免多账号串扰
function toggleAutoBackup(e) {
  autoBackupOn.value = e.detail.value
  const uid = (auth && auth.id) || 'default'
  uni.setStorageSync('autoBackup_' + uid, autoBackupOn.value ? '1' : '0')
  // 开启时立即尝试触发一次（受 2 小时阈值控制）
  if (autoBackupOn.value) maybeAutoBackup(true)
}

function loadAutoBackupPref() {
  const uid = (auth && auth.id) || 'default'
  autoBackupOn.value = uni.getStorageSync('autoBackup_' + uid) === '1'
  lastAutoAt.value = +(uni.getStorageSync('lastAutoBackupAt_' + uid) || 0)
}

// 自动备份触发：开启后每 2 小时一次，由 onShow 调用；force=true 跳过阈值检查
async function maybeAutoBackup(force = false) {
  if (!autoBackupOn.value && !force) return
  const now = Date.now()
  const TWO_HOURS = 2 * 60 * 60 * 1000
  if (!force && now - lastAutoAt.value < TWO_HOURS) return
  try {
    await api.post('/backups/auto')
    const uid = (auth && auth.id) || 'default'
    uni.setStorageSync('lastAutoBackupAt_' + uid, String(now))
    lastAutoAt.value = now
    // 自动备份成功后静默刷新列表（不弹 toast，避免打扰）
    loadBackups()
  } catch (e) {
    /* 静默失败，不影响主流程 */
  }
}
</script>

<style scoped>
.page { padding: 30rpx; }
.hd { display: flex; align-items: center; gap: 24rpx; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; margin-bottom: 20rpx; }
.avatar { font-size: 88rpx; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.top { display: flex; align-items: center; gap: 12rpx; }
.name { font-size: 38rpx; font-weight: 800; color: var(--c-title); }
.chip { font-size: 20rpx; background: #e8f9e8; color: var(--c-primary); padding: 2rpx 12rpx; border-radius: 16rpx; }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }
.motto { font-size: 24rpx; color: #8a7a66; margin-top: 6rpx; }
.edit { font-size: 26rpx; color: var(--c-accent); padding: 8rpx 20rpx; border: 1px solid var(--c-accent); border-radius: 30rpx; flex: 0 0 auto; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 20rpx 24rpx; margin-bottom: 20rpx; }
.card-h { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1px solid var(--c-card2); }
.row:last-child { border-bottom: none; }
.lab { font-size: 28rpx; color: #5a5048; }
.scheme-row { display: flex; align-items: center; gap: 10rpx; }
.dot { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid var(--c-border); }
.dot.on { border-color: var(--c-title); transform: scale(1.1); }
.chev { font-size: 24rpx; color: var(--c-sub); }
.dm { display: flex; align-items: center; gap: 18rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-card2); }
.dm:last-child { border-bottom: none; }
.dm-ic { width: 64rpx; height: 64rpx; border-radius: 16rpx; text-align: center; line-height: 64rpx; font-size: 32rpx; flex: 0 0 auto; }
.dm-t { font-size: 28rpx; color: var(--c-title); font-weight: 600; display: block; }
.dm-s { font-size: 22rpx; color: var(--c-sub); display: block; }
/* 弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; z-index: 99; }
.mask.editing { align-items: flex-end; }
.mask:not(.editing) { align-items: center; justify-content: center; }
.sheet { background: var(--c-card); width: 100%; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 88vh; overflow-y: auto; }
.sh-h { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.lab { font-size: 24rpx; color: #5a5048; display: block; margin: 12rpx 0 8rpx; }
.fld { margin-bottom: 6rpx; }
.field-err { display:block; font-size:22rpx; color:#e64340; margin-top:4rpx; }
.inp { background: #f6f7fb; border-radius: 12rpx; padding: 16rpx 18rpx; font-size: 28rpx; }
.pick { color: var(--c-title); }
.subs { display: flex; flex-wrap: wrap; gap: 10rpx; }
.sb { font-size: 22rpx; padding: 8rpx 18rpx; border-radius: 20rpx; background: #f6f7fb; color: var(--c-sub); }
.sb.on { background: #f7d9a8; color: #a07b3b; }
.avatars { display: flex; flex-wrap: wrap; gap: 12rpx; }
.avopt { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: #f6f7fb; text-align: center; line-height: 64rpx; font-size: 36rpx; }
.avopt.on { background: #f7d9a8; border: 2rpx solid var(--c-accent); }
.sh-acts { display: flex; gap: 18rpx; margin-top: 24rpx; }
.btn-c { flex: 1; background: var(--c-card2); color: #5a5048; border-radius: 50rpx; }
.btn-s { flex: 1; background: var(--c-primary); color: #fff; border-radius: 50rpx; }
.logout { background: var(--c-card2); color: var(--c-danger); border-radius: 50rpx; margin-top: 10rpx; }
.help-btn { background: var(--c-card); color: var(--c-accent); border: 1px solid var(--c-accent); border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
/* 使用帮助弹层 */
.help-modal { width: 640rpx; max-height: 84vh; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; display: flex; flex-direction: column; box-sizing: border-box; }
.hm-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 16rpx; }
.hm-body { flex: 1; max-height: 60vh; }
.hm-sec { margin-bottom: 20rpx; }
.hm-h { font-size: 28rpx; font-weight: 700; color: var(--c-accent); margin-bottom: 8rpx; }
.hm-p { display: block; font-size: 24rpx; color: var(--c-title); line-height: 1.7; margin-bottom: 6rpx; }
.hm-close { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
/* 备份与恢复 */
.bk-time { font-size: 24rpx; color: var(--c-sub); }
.bk-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin: 16rpx 0; font-size: 28rpx; }
.bk-btn[disabled] { opacity: 0.6; }
.bk-list { margin-top: 8rpx; max-height: 720rpx; overflow-y: auto; }
.bk-item { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1px solid var(--c-card2); }
.bk-item:last-child { border-bottom: none; }
.bk-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.bk-label { font-size: 26rpx; color: var(--c-title); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-meta { font-size: 22rpx; color: var(--c-sub); }
.bk-acts { display: flex; gap: 16rpx; flex: 0 0 auto; }
.bk-act { font-size: 26rpx; color: var(--c-accent); padding: 4rpx 12rpx; }
.bk-act.danger { color: var(--c-danger); }
.bk-empty { text-align: center; font-size: 24rpx; color: var(--c-sub); padding: 30rpx 0; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .hd, .dark .card, .dark .sheet { background: var(--c-card); }
.dark .name, .dark .card-h, .dark .dm-t, .dark .lab { color: var(--c-title); }
.dark .sub, .dark .dm-s, .dark .chev { color: var(--c-sub); }
.dark .row, .dark .dm { border-color: var(--c-input-border); }
.dark .chip { background: var(--c-card2); color: var(--c-accent); }
.dark .inp, .dark .sb, .dark .avopt { background: var(--c-input); color: var(--c-title); }
.dark .btn-c { background: var(--c-card2); color: var(--c-title); }
.dark .logout { background: var(--c-card2); }
.dark .bk-item { border-color: var(--c-input-border); }
.dark .bk-label { color: var(--c-title); }
.dark .bk-meta, .dark .bk-time, .dark .bk-empty { color: var(--c-sub); }
</style>
