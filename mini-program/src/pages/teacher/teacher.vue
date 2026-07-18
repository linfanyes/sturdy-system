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
          <text class="meta">{{ t.phone || '' }}{{ t.email ? ' · ' + t.email : '' }}</text>
        </view>
        <view class="acts">
          <text class="cp" @click.stop="copy(t)">复制</text>
          <text class="ed" @click.stop="openEdit(t)">编辑</text>
          <text class="del" @click.stop="remove(t)">删除</text>
        </view>
      </view>
      <view class="empty" v-if="!shown.length">无匹配教师</view>
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
            <input v-model="draft.phone" class="inp" />
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
          <button class="btn-s" @click="save">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const classes = ref([])
const kw = ref('')
const subjectFilter = ref('all')

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
  const [t, c] = await Promise.all([api.get('/teachers'), api.get('/classes')])
  list.value = t || []
  classes.value = c || []
}
onShow(load)

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
.search { flex: 1; background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; }
.add { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: #07c160; color: #fff; text-align: center; line-height: 72rpx; font-size: 44rpx; flex: 0 0 auto; }
.filters { white-space: nowrap; margin-bottom: 14rpx; }
.f { display: inline-block; font-size: 24rpx; padding: 10rpx 22rpx; border-radius: 30rpx; background: #fff; color: #9aa0a6; margin-right: 12rpx; }
.f.on { background: #e6a23c; color: #fff; }
.list { background: #fff; border-radius: 16rpx; padding: 6rpx 24rpx; }
.t { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 0; border-bottom: 1px solid #f3f3f3; }
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
.acts { display: flex; flex-direction: column; gap: 8rpx; flex: 0 0 auto; }
.cp, .ed, .del { font-size: 22rpx; padding: 6rpx 14rpx; border-radius: 20rpx; text-align: center; }
.cp { background: #eef7ee; color: #07c160; }
.ed { background: #f3f1e6; color: #a07b3b; }
.del { background: #fde8ea; color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
/* 弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 99; }
.sheet { background: #fff; width: 100%; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 86vh; overflow-y: auto; }
.sh-h { font-size: 32rpx; font-weight: 700; color: #4a3f35; margin-bottom: 20rpx; }
.lab { font-size: 24rpx; color: #5a5048; display: block; margin: 14rpx 0 8rpx; }
.row2 { display: flex; gap: 18rpx; }
.fld { flex: 1; }
.inp { background: #f6f7fb; border-radius: 12rpx; padding: 16rpx 18rpx; font-size: 28rpx; }
.pick { color: #333; }
.avatars { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 6rpx; }
.avopt { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: #f6f7fb; text-align: center; line-height: 64rpx; font-size: 36rpx; }
.avopt.on { background: #f7d9a8; border: 2rpx solid #e6a23c; }
.teach-edit { max-height: 320rpx; overflow-y: auto; }
.te-class { margin-bottom: 12rpx; }
.tc-name { font-size: 24rpx; color: #4a3f35; font-weight: 600; }
.tc-subs { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 6rpx; }
.ts { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; background: #f6f7fb; color: #999; }
.ts.on { background: #f7d9a8; color: #a07b3b; }
.empty2 { color: #9aa0a6; font-size: 24rpx; text-align: center; padding: 20rpx; }
.star-row { display: flex; align-items: center; gap: 12rpx; font-size: 26rpx; color: #5a5048; margin: 18rpx 0; }
.sh-acts { display: flex; gap: 18rpx; margin-top: 20rpx; }
.btn-c { flex: 1; background: #f3f3f3; color: #5a5048; border-radius: 50rpx; }
.btn-s { flex: 1; background: #07c160; color: #fff; border-radius: 50rpx; }
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
</style>
