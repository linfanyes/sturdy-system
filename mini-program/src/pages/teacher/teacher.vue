<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <input v-model="kw" class="search" placeholder="搜索姓名 / 职务 / 电话 / 学科" />
      <view class="add" @click="openCreate">＋</view>
    </view>

    <!-- 学科筛选 -->
    <scroll-view scroll-x class="filters">
      <text class="f" :class="subjectFilter === 'all' && 'on'" @click="subjectFilter = 'all'">全部</text>
      <text class="f" v-for="s in subjectList" :key="s" :class="subjectFilter === s && 'on'" @click="subjectFilter = s">{{ s }}</text>
    </scroll-view>

    <view class="list">
      <view class="t" v-for="t in shown" :key="t.id">
        <text class="av">{{ t.avatar || '🧑' }}</text>
        <view class="info">
          <view class="top">
            <text class="nm">{{ t.name }}</text>
            <text class="pos" v-if="t.position">{{ t.position }}</text>
            <text class="star" v-if="t.isStarred" @click.stop="star(t, false)">⭐</text>
            <text class="star off" v-else @click.stop="star(t, true)">☆</text>
          </view>
          <text class="teach" v-if="teachSummary(t)">{{ teachSummary(t) }}</text>
          <text class="meta" :class="{ tap: t.phone }" v-if="t.phone" @click.stop="call(t.phone)">{{ t.phone }}{{ t.email ? ' · ' + t.email : '' }}</text>
          <text class="meta" v-else-if="t.email">{{ t.email }}</text>
        </view>
        <view class="acts">
          <text class="call" v-if="t.phone" @click.stop="call(t.phone)">拨打</text>
          <text class="cp" @click.stop="copy(t)">复制</text>
          <text class="ed" @click.stop="openEdit(t)">编辑</text>
          <text class="del" @click.stop="remove(t)">删除</text>
        </view>
      </view>
      <EmptyState v-if="!shown.length" icon="👤" text="暂无教师" hint="点击下方按钮添加" />
    </view>

    <!-- 导入区域 -->
    <view class="bar" style="justify-content: flex-end; margin-bottom: 20rpx;">
      <text class="add" @click="showImport = !showImport" style="background:var(--c-accent); padding:12rpx 26rpx; border-radius:40rpx; color:#fff; font-size:28rpx;">{{ showImport ? '收起' : '📥 批量导入' }}</text>
    </view>

    <view v-if="showImport" class="form import-box">
      <view class="imp-title">批量导入教师</view>
      <view class="imp-tip">支持 Excel(.xlsx/.xls) 或 TXT/CSV，每行：姓名,职务,电话,邮箱,任教班级学科(逗号分隔)</view>
      <button class="tpl" @click="showTpl = true">📄 下载/查看模板</button>
      <button class="pick" @click="pickFile">📂 选择文件</button>
      <view v-if="importPreview" class="preview">
        <view class="pv-sum">
          识别 <text class="ok">{{ importPreview.length }}</text> 条，点击确认逐一保存
        </view>
        <button class="confirm" :disabled="importing" @click="commitImport">{{ importing ? '导入中…' : '确认导入 ' + importPreview.length + ' 条' }}</button>
      </view>
    </view>

    <!-- 模板弹窗 -->
    <view v-if="showTpl" class="mask" @click="showTpl = false">
      <view class="dialog" @click.stop>
        <view class="d-title">导入模板格式</view>
        <view class="d-sub">第一行可写表头，数据从下一行开始：</view>
        <view class="d-code">姓名,职务,电话,邮箱,任教班级(逗号分隔)
王老师,班主任,13800000001,wang@school.com,一年级一班·语文,二年级二班·数学
李老师,数学教师,13800000002,li@school.com,一年级一班·数学</view>
        <button class="d-copy" @click="copyTpl">📋 复制示例</button>
        <button class="d-close" @click="showTpl = false">关闭</button>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <view class="mask" v-if="editOpen" @click="editOpen = false">
      <view class="sheet" @click.stop>
        <view class="sh-h">{{ editId ? '编辑同事' : '添加同事' }}</view>
        <view class="row2">
          <view class="fld">
            <text class="lab">姓名 *</text>
            <input v-model="draft.name" class="inp" placeholder="如：李老师" />
          </view>
          <view class="fld">
            <text class="lab">职务</text>
            <picker :range="positionOpts" @change="(e)=>draft.position = positionOpts[e.detail.value]">
              <view class="inp pick">{{ draft.position || '教师' }}</view>
            </picker>
          </view>
        </view>

        <text class="lab">头像</text>
        <view class="avatars">
          <text
            v-for="a in avatarOpts"
            :key="a"
            class="avopt"
            :class="draft.avatar === a && 'on'"
            @click="draft.avatar = a"
          >{{ a }}</text>
        </view>

        <text class="lab">任教班级学科</text>
        <view class="teach-edit" v-if="classes.length">
          <view class="te-class" v-for="c in classes" :key="c.id">
            <view class="tc-name">{{ c.name }}</view>
            <view class="tc-subs">
              <text
                v-for="s in subjectOpts"
                :key="s"
                class="ts"
                :class="isTeach(c.id, s) && 'on'"
                @click="toggleTeach(c.id, s)"
              >{{ s }}</text>
            </view>
          </view>
        </view>
        <view class="teach-edit empty2" v-else>请先到「班级管理」创建班级</view>

        <view class="row2">
          <view class="fld">
            <text class="lab">电话</text>
            <input v-model="draft.phone" class="inp" @blur="checkPhone" />
            <text v-if="phoneError" class="field-err">{{ phoneError }}</text>
          </view>
          <view class="fld">
            <text class="lab">邮箱</text>
            <input v-model="draft.email" class="inp" />
          </view>
        </view>

        <label class="star-row">
          <switch :checked="draft.isStarred" @change="(e)=>draft.isStarred = e.detail.value" color="#e6a23c" />
          <text>设为常用联系人</text>
        </label>

        <view class="sh-acts">
          <button class="btn-c" @click="editOpen = false">取消</button>
          <button class="btn-s" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { isPhone, isEmail } from '../../common/validators'
import { theme } from '../../common/store'
import { copyText } from '../../common/print'

// 批量导入
const showImport = ref(false)
const showTpl = ref(false)
const importPreview = ref([])
const importing = ref(false)
function pickFile() {
  uni.chooseMessageFile({
    count: 1, type: 'file', extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: (res) => {
      const f = res.tempFiles[0]
      if (f.size > 4 * 1024 * 1024) return uni.showToast({ title: '文件过大(>4MB)', icon: 'none' })
      uni.getFileSystemManager().readFile({
        filePath: f.path, encoding: 'base64',
        success: (r) => parseImport(f.name, r.data),
        fail: () => uni.showToast({ title: '读取失败', icon: 'none' }),
      })
    },
  })
}
function parseImport(name, data) {
  // 简单 CSV/TXT 解析：逐行逗号分割
  try {
    const raw = atob(data)
    const lines = raw.split('\n').filter((l) => l.trim()).slice(0, 200)
    const rows = []
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 1 || !cols[0]) continue
      // 跳过表头行
      if (cols[0] === '姓名' || cols[0] === 'name') continue
      rows.push({ name: cols[0], position: cols[1] || '', phone: cols[2] || '', email: cols[3] || '' })
    }
    importPreview.value = rows
    if (!rows.length) uni.showToast({ title: '未识别到有效数据', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '解析失败：' + (e.message || ''), icon: 'none' })
  }
}
async function commitImport() {
  if (importing.value || !importPreview.value.length) return
  importing.value = true
  let ok = 0, fail = 0
  for (const row of importPreview.value) {
    try {
      const r = await api.post('/teachers', { name: row.name, position: row.position, phone: row.phone, email: row.email })
      list.value.push(r)
      ok++
    } catch (e) { fail++ }
  }
  uni.showToast({ title: `导入完成：成功 ${ok} 条${fail ? '，失败 ' + fail + ' 条' : ''}`, icon: fail ? 'none' : 'success' })
  importPreview.value = []
  importing.value = false
}
function copyTpl() {
  copyText('姓名,职务,电话,邮箱\n王老师,班主任,13800000001,wang@school.com\n李老师,数学教师,13800000002,li@school.com')
}

const list = ref([])
const classes = ref([])
const kw = ref('')
const subjectFilter = ref('all')
const saving = ref(false)

const subjectOpts = ['语文', '数学', '英语', '音乐', '美术', '体育', '品德', '科学', '综合实践', '信息技术', '劳动', '阅读', '午自习', '课后服务']
const positionOpts = ['教师', '班主任', '副班主任', '教研组长', '年级组长', '学科带头人', '教务主任', '德育主任', '校长', '副校长', '其他']
const avatarOpts = ['👩‍🏫', '🧑‍🏫', '🧑', '👩', '👨‍🏫', '🎨', '🏃', '🎵', '🔬', '🌱']

const subjectList = computed(() => {
  const set = new Set()
  for (const t of list.value) for (const x of (t.teachings || [])) set.add(x.subject)
  return [...set]
})

const shown = computed(() => {
  let l = [...list.value]
  if (subjectFilter.value !== 'all')
    l = l.filter((t) => (t.teachings || []).some((x) => x.subject === subjectFilter.value))
  const k = kw.value.trim().toLowerCase()
  if (k)
    l = l.filter((t) =>
      (t.name || '').toLowerCase().includes(k) ||
      (t.position || '').toLowerCase().includes(k) ||
      (t.phone || '').includes(k) ||
      (t.teachings || []).some((x) => x.subject.toLowerCase().includes(k))
    )
  return l.sort((a, b) => Number(b.isStarred) - Number(a.isStarred))
})

function teachSummary(t) {
  const ts = t.teachings || []
  if (!ts.length) return ''
  return ts.slice(0, 2).map((e) => {
    const c = classes.value.find((x) => x.id === e.classId)
    return c ? c.name + '·' + e.subject : e.subject
  }).join('、') + (ts.length > 2 ? ' 等' + ts.length + '项' : '')
}

async function load() {
  const [t, c] = await Promise.all([api.getList('/teachers', { loading: true, loadingText: '加载通讯录' }), api.getList('/classes', { silent: true })])
  list.value = t || []
  classes.value = c || []
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function call(p) {
  uni.makePhoneCall({ phoneNumber: p, fail: () => {} })
}
async function star(t, v) {
  try { const r = await api.patch('/teachers/' + t.id, { isStarred: v }); t.isStarred = r.isStarred }
  catch (e) { uni.showToast({ title: '失败', icon: 'none' }) }
}
function copy(t) {
  const text = `${t.name} 老师\n${t.position || ''}\n任教：${(t.teachings || []).map((e) => {
    const c = classes.value.find((x) => x.id === e.classId); return c ? c.name + '·' + e.subject : e.subject
  }).join('；')}\n📞 ${t.phone || ''}\n✉ ${t.email || ''}`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}

// 编辑
const editOpen = ref(false)
const editId = ref(null)
const draft = ref({ name: '', position: '教师', phone: '', email: '', avatar: '🧑', isStarred: false, teachings: [] })
const phoneError = ref('')

function checkPhone() {
  if (draft.value.phone && !isPhone(draft.value.phone)) {
    phoneError.value = '手机号格式错误（11 位）'
  } else {
    phoneError.value = ''
  }
}

function openCreate() {
  editId.value = null
  draft.value = { name: '', position: '教师', phone: '', email: '', avatar: '🧑', isStarred: false, teachings: [] }
  editOpen.value = true
}
function openEdit(t) {
  editId.value = t.id
  draft.value = { name: t.name, position: t.position || '教师', phone: t.phone || '', email: t.email || '', avatar: t.avatar || '🧑', isStarred: !!t.isStarred, teachings: (t.teachings || []).map((x) => ({ ...x })) }
  editOpen.value = true
}
function isTeach(classId, subject) {
  return draft.value.teachings.some((x) => x.classId === classId && x.subject === subject)
}
function toggleTeach(classId, subject) {
  const i = draft.value.teachings.findIndex((x) => x.classId === classId && x.subject === subject)
  if (i >= 0) draft.value.teachings.splice(i, 1)
  else draft.value.teachings.push({ classId, subject })
}
async function save() {
  if (!draft.value.name.trim()) return uni.showToast({ title: '请填写姓名', icon: 'none' })
  if (draft.value.phone && !isPhone(draft.value.phone)) {
    phoneError.value = '手机号格式错误（11 位）'
    return uni.showToast({ title: phoneError.value, icon: 'none' })
  }
  if (draft.value.email && !isEmail(draft.value.email)) return uni.showToast({ title: '邮箱格式错误', icon: 'none' })
  phoneError.value = ''
  saving.value = true
  try {
    if (editId.value) {
      const r = await api.patch('/teachers/' + editId.value, { ...draft.value })
      Object.assign(list.value.find((t) => t.id === editId.value), r)
      uni.showToast({ title: '已更新', icon: 'none' })
    } else {
      const r = await api.post('/teachers', { ...draft.value })
      list.value.push(r)
      uni.showToast({ title: '已添加同事', icon: 'none' })
    }
    editOpen.value = false
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
function remove(t) {
  uni.showModal({
    title: '删除同事', content: '确定删除「' + t.name + ' 老师」吗？',
    success: async (r) => {
      if (!r.confirm) return
      try { await api.del('/teachers/' + t.id); list.value = list.value.filter((x) => x.id !== t.id); uni.showToast({ title: '已删除', icon: 'none' }) }
      catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    }
  })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; gap: 14rpx; align-items: center; margin-bottom: 14rpx; }
.search { flex: 1; background: var(--c-card); border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.add { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: var(--c-primary); color: #fff; text-align: center; line-height: 72rpx; font-size: 44rpx; flex: 0 0 auto; }
.filters { white-space: nowrap; margin-bottom: 14rpx; }
.f { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; border-radius: 30rpx; background: #fff; color: #9aa0a6; margin-right: 12rpx; }
.f.on { background: #e6a23c; color: #fff; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 24rpx; }
.t { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 0; border-bottom: 1px solid var(--c-card2); }
.t:last-child { border-bottom: none; }
.av { width: 72rpx; height: 72rpx; border-radius: 50%; background: #f7f1e6; text-align: center; line-height: 72rpx; font-size: 40rpx; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.top { display: flex; align-items: center; gap: 10rpx; }
.nm { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.pos { font-size: 20rpx; color: #a07b3b; background: #f7f1e6; padding: 2rpx 12rpx; border-radius: 16rpx; }
.star { font-size: 28rpx; margin-left: auto; }
.star.off { color: #ccc; }
.teach { font-size: 22rpx; color: #5a5048; display: block; }
.meta { font-size: 22rpx; color: #9aa0a6; display: block; }
.meta.tap { color: var(--c-primary); }
.acts { display: flex; flex-direction: column; gap: 8rpx; flex: 0 0 auto; }
.call { font-size: 22rpx; padding: 6rpx 14rpx; border-radius: 20rpx; text-align: center; background: #e8f1fb; color: #409eff; }
.cp, .ed, .del { font-size: 22rpx; padding: 6rpx 14rpx; border-radius: 20rpx; text-align: center; }
.cp { background: #eef7ee; color: var(--c-primary); }
.ed { background: #f3f1e6; color: #a07b3b; }
.del { background: #fde8ea; color: #e06c75; }
.empty { text-align: center; color: var(--c-sub); padding: 40rpx 0; }
/* 弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 99; }
.sheet { background: var(--c-card); width: 100%; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 86vh; overflow-y: auto; }
.sh-h { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.lab { font-size: 24rpx; color: #5a5048; display: block; margin: 14rpx 0 8rpx; }
.row2 { display: flex; gap: 18rpx; }
.fld { flex: 1; }
.inp { background: var(--c-input); border-radius: 12rpx; padding: 16rpx 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.pick { color: var(--c-title); }
.avatars { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 6rpx; }
.avopt { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: var(--c-input); text-align: center; line-height: 64rpx; font-size: 36rpx; }
.avopt.on { background: #f7d9a8; border: 2rpx solid #e6a23c; }
.teach-edit { max-height: 320rpx; overflow-y: auto; }
.te-class { margin-bottom: 12rpx; }
.tc-name { font-size: 24rpx; color: var(--c-title); font-weight: 600; }
.tc-subs { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 6rpx; }
.ts { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; background: #f6f7fb; color: #999; }
.ts.on { background: #f7d9a8; color: #a07b3b; }
.empty2 { color: var(--c-sub); font-size: 24rpx; text-align: center; padding: 20rpx; }
.star-row { display: flex; align-items: center; gap: 12rpx; font-size: 26rpx; color: #5a5048; margin: 18rpx 0; }
.sh-acts { display: flex; gap: 18rpx; margin-top: 20rpx; }
.btn-c { flex: 1; background: var(--c-card2); color: #5a5048; border-radius: 50rpx; }
.btn-s { flex: 1; background: var(--c-primary); color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .search, .dark .list, .dark .sheet { background: var(--c-card); }
.dark .nm, .dark .sh-h, .dark .tc-name { color: var(--c-title); }
.dark .teach, .dark .meta, .dark .lab { color: var(--c-sub); }
.dark .t { border-color: var(--c-input-border); }
.dark .av { background: var(--c-card2); }
.dark .pos { background: var(--c-card2); color: var(--c-accent); }
.dark .f { background: var(--c-card); color: var(--c-sub); }
.dark .inp, .dark .avopt, .dark .ts { background: var(--c-input); color: var(--c-title); }
.dark .btn-c { background: var(--c-card2); color: var(--c-title); }
/* 批量导入 */
.import-box { background: var(--c-card2); border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.imp-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.tpl, .pick { background: var(--c-card); border-radius: 14rpx; padding: 18rpx; text-align: center; font-size: 26rpx; color: var(--c-title); margin-bottom: 12rpx; width: 100%; }
.pick.ai { background: #e6a23c; color: #fff; }
.preview { background: var(--c-card); border-radius: 14rpx; padding: 16rpx; margin-top: 12rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); margin-bottom: 10rpx; }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.confirm { background: var(--c-primary); color: #fff; border-radius: 40rpx; padding: 18rpx; text-align: center; font-size: 28rpx; width: 100%; }
.confirm[disabled] { opacity: 0.5; }
.dialog { width: 600rpx; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; }
.d-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.d-sub { font-size: 24rpx; color: var(--c-sub); margin-bottom: 14rpx; }
.d-code { background: #f5f5f5; border-radius: 12rpx; padding: 16rpx; font-size: 22rpx; color: #333; white-space: pre-wrap; line-height: 1.7; margin-bottom: 14rpx; }
.d-copy { background: var(--c-primary); color: #fff; border-radius: 30rpx; padding: 16rpx; text-align: center; font-size: 26rpx; margin-bottom: 10rpx; }
.d-close { background: var(--c-card2); color: var(--c-sub); border-radius: 30rpx; padding: 16rpx; text-align: center; font-size: 26rpx; }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
</style>
