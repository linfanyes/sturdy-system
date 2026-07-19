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
    <view class="mask" v-if="editing" @click="editing = false">
      <view class="sheet" @click.stop>
        <view class="sh-h">编辑资料</view>
        <view class="fld"><text class="lab">老师称呼</text><input v-model="form.name" class="inp" /></view>
        <view class="fld"><text class="lab">所在学校</text><input v-model="form.school" class="inp" maxlength="30" placeholder="如：阳光小学" /></view>
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
        <view class="fld"><text class="lab">手机号</text><input v-model="form.phone" class="inp" placeholder="选填，便于联系" /></view>
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

    <!-- 外观设置 -->
    <view class="card">
      <view class="card-h">外观设置</view>
      <view class="row" @click="onTheme">
        <text class="lab">{{ theme.mode === 'dark' ? '🌙 暗色模式' : '☀️ 明亮模式' }}</text>
        <switch :checked="theme.mode === 'dark'" @change="onTheme" color="#3fd07f" />
      </view>
      <view class="row" @click="cycle">
        <text class="lab">🎨 主题色（{{ curScheme.label }}）</text>
        <view class="scheme-row">
          <view class="dot" v-for="s in SCHEMES" :key="s.value" :style="{ background: s.color }" :class="theme.colorScheme === s.value && 'on'"></view>
          <text class="chev">切换 ›</text>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="card">
      <view class="card-h">数据管理</view>
      <view class="dm" @click="exportData"><text class="dm-ic" style="background:#e8f9e8">📤</text><view><text class="dm-t">导出数据</text><text class="dm-s">复制全部数据为 JSON</text></view></view>
      <view class="dm" @click="resetData"><text class="dm-ic" style="background:#fde8ea">🗑️</text><view><text class="dm-t" style="color:#e06c75">清空所有数据</text><text class="dm-s">不可恢复，请先导出</text></view></view>
    </view>

    <button class="logout" @click="logout">退出登录</button>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api, { batchRun } from '../../common/request'
import { isPhone, isEmail } from '../../common/validators'
import { theme, setTheme, setUser, setColorScheme, cycleColorScheme, logout as doLogout, SCHEMES } from '../../common/store'

const me = reactive({})
const form = reactive({ name: '', subject: '', school: '', term: '', subjects: [], motto: '', avatar: '', phone: '', email: '' })
const editing = ref(false)
const saving = ref(false)

const subjectOpts = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育', '综合实践', '信息技术']
const avatarOpts = ['🍎', '👩‍🏫', '🧑‍🏫', '🧑', '👩', '👨‍🏫', '🌟', '🌈', '📚', '☕']
const termOpts = ['2026春季学期', '2026秋季学期', '2027春季学期', '2027秋季学期']

const curScheme = computed(() => SCHEMES.find((s) => s.value === theme.colorScheme) || SCHEMES[0])

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
function onTheme(e) {
  setTheme(e.detail.value ? 'dark' : 'light')
}
async function cycle() {
  const next = cycleColorScheme()
  uni.showLoading({ title: '切换中…', mask: true })
  try {
    await api.put('/users/me', { colorScheme: next })
    uni.showToast({ title: '主题色：' + (SCHEMES.find((s) => s.value === next) || {}).label, icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '切换失败：' + (e.message||''), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function save() {
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
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 99; }
.sheet { background: var(--c-card); width: 100%; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 88vh; overflow-y: auto; }
.sh-h { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.lab { font-size: 24rpx; color: #5a5048; display: block; margin: 12rpx 0 8rpx; }
.fld { margin-bottom: 6rpx; }
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
</style>
