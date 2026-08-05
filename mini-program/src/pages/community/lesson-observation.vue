<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">📝 听课记录</view>
        <view class="sub">记录听课心得，促进教学交流与提升</view>
      </view>
      <view class="add" @click="openCreate">+ 新增</view>
    </view>

    <view class="empty" v-if="!list.length">还没有听课记录，记录听课过程中的亮点与建议</view>

    <view class="list" v-else>
      <view class="c" v-for="o in list" :key="o.id">
        <view class="top">
          <text class="teacher">{{ o.teacherName }}</text>
          <text class="chip" :class="'r-' + rateKey(o.overallRating)">{{ o.overallRating }}</text>
        </view>
        <view class="meta">{{ o.className }} · {{ o.subject }} · {{ o.date }}</view>
        <view class="topic" v-if="o.topic">📌 {{ o.topic }}</view>
        <view class="stg" v-if="o.strengths"><text class="lab s">✅ 亮点</text><text class="txt">{{ o.strengths }}</text></view>
        <view class="stg" v-if="o.suggestions"><text class="lab t">💡 建议</text><text class="txt">{{ o.suggestions }}</text></view>
        <view class="acts">
          <text class="a" @click="openEdit(o)">编辑</text>
          <text class="a del" @click="del(o)">删除</text>
        </view>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show = false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑听课记录' : '新增听课记录' }}</view>

      <picker :range="classOpts" @change="pickClass">
        <view class="picker">班级：{{ form.className || '请选择' }}</view>
      </picker>
      <input v-model="form.teacherName" class="inp" placeholder="授课教师，如：王老师" />
      <input v-model="form.subject" class="inp" placeholder="科目，如：语文" />
      <picker mode="date" :value="form.date" @change="(e) => (form.date = e.detail.value)">
        <view class="picker">日期：{{ form.date }}</view>
      </picker>
      <input v-model="form.topic" class="inp" placeholder="听课主题 / 课题" />

      <view class="lab2">总体评价</view>
      <view class="chips">
        <text v-for="r in ratings" :key="r" class="chip2" :class="[rateKey(r), form.overallRating === r && 'on']" @click="form.overallRating = r">{{ r }}</text>
      </view>

      <textarea v-model="form.strengths" class="inp area" placeholder="教学中的亮点..."></textarea>
      <textarea v-model="form.suggestions" class="inp area" placeholder="改进建议..."></textarea>

      <view class="mbtns">
        <view class="mb cancel" @click="show = false">取消</view>
        <view class="mb ok" :class="{ disabled: saving }" @click="save">{{ saving ? '保存中…' : '保存' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const ratings = ['优秀', '良好', '一般', '待改进']
const rateMap = { 优秀: 'excellent', 良好: 'good', 一般: 'normal', 待改进: 'improve' }
const rateKey = (r) => rateMap[r] || 'good'

const list = ref([])
const classes = ref([])
const classOpts = computed(() => classes.value.map((c) => c.name))
const show = ref(false)
const editing = ref(null)
const form = ref({ classId: '', className: '', teacherName: '', subject: '', topic: '', date: today(), strengths: '', suggestions: '', overallRating: '良好' })
const saving = ref(false)

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  const arr = await api.getList('/lesson-observations', { loading: true, loadingText: '加载听课' })
  arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  list.value = arr
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function pickClass(ev) {
  const c = classes.value[ev.detail.value]
  form.value.classId = c.id
  form.value.className = c.name
}
function openCreate() {
  editing.value = null
  form.value = { classId: '', className: '', teacherName: '', subject: '', topic: '', date: today(), strengths: '', suggestions: '', overallRating: '良好' }
  show.value = true
}
function openEdit(o) {
  editing.value = o
  form.value = { classId: o.classId, className: o.className, teacherName: o.teacherName, subject: o.subject, topic: o.topic, date: o.date, strengths: o.strengths || '', suggestions: o.suggestions || '', overallRating: o.overallRating || '良好' }
  show.value = true
}
async function save() {
  if (saving.value) return
  if (!form.value.teacherName.trim()) return uni.showToast({ title: '请输入授课教师', icon: 'none' })
  if (!form.value.topic.trim()) return uni.showToast({ title: '请输入听课主题', icon: 'none' })
  saving.value = true
  const payload = { ...form.value }
  try {
    if (editing.value) {
      const r = await api.patch('/lesson-observations/' + editing.value.id, payload)
      Object.assign(editing.value, r)
    } else {
      const r = await api.post('/lesson-observations', payload)
      list.value.unshift(r)
    }
    show.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
function del(o) {
  uni.showModal({ title: '删除', content: '确定删除此听课记录？', success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/lesson-observations/' + o.id); list.value = list.value.filter((x) => x.id !== o.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.h { font-size: 36rpx; font-weight: 800; color: #4a3f35; }
.sub { font-size: 24rpx; color: #9aa0a6; margin-top: 4rpx; }
.add { font-size: 28rpx; color: #fff; background: #07c160; padding: 12rpx 26rpx; border-radius: 40rpx; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 40rpx; font-size: 26rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.c { padding: 20rpx 0; border-bottom: 1px solid #f3f3f3; }
.top { display: flex; align-items: center; gap: 12rpx; }
.teacher { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.chip { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.meta { font-size: 24rpx; color: #9aa0a6; margin: 8rpx 0; }
.topic { font-size: 27rpx; color: #5a5048; }
.stg { margin-top: 8rpx; }
.lab { font-size: 22rpx; font-weight: 600; margin-right: 8rpx; }
.lab.s { color: #07c160; }
.lab.t { color: #409eff; }
.txt { font-size: 25rpx; color: #6a6058; }
.acts { display: flex; gap: 28rpx; margin-top: 12rpx; }
.a { font-size: 26rpx; color: #409eff; }
.a.del { color: #e06c75; }
.r-excellent { background: #e8f9e8; color: #07c160; }
.r-good { background: #e8f1fb; color: #409eff; }
.r-normal { background: #fff3e0; color: #e6a23c; }
.r-improve { background: #fde8ea; color: #e06c75; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; }
.modal { position: fixed; left: 5%; right: 5%; bottom: 0; z-index: 51; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 90vh; overflow-y: auto; }
.mt { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; color: #4a3f35; }
.picker { background: #f6f6f6; border-radius: 12rpx; padding: 18rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 120rpx; }
.lab2 { font-size: 24rpx; color: #9aa0a6; margin-bottom: 8rpx; }
.chips { display: flex; gap: 14rpx; flex-wrap: wrap; margin-bottom: 14rpx; }
.chip2 { font-size: 24rpx; padding: 12rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.chip2.on { color: #fff; }
.chip2.r-excellent.on { background: #07c160; }
.chip2.r-good.on { background: #409eff; }
.chip2.r-normal.on { background: #e6a23c; }
.chip2.r-improve.on { background: #e06c75; }
.mbtns { display: flex; gap: 20rpx; margin-top: 10rpx; }
.mb { flex: 1; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; }
.mb.cancel { background: #f3f3f3; color: #666; }
.mb.ok { background: #07c160; color: #fff; }
.mb.disabled { opacity: 0.5; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .list, .dark .modal { background: var(--c-card); }
.dark .c { border-color: var(--c-input-border); }
.dark .teacher { color: var(--c-title); }
.dark .topic, .dark .txt { color: var(--c-sub); }
.dark .inp, .dark .picker { background: var(--c-input); color: var(--c-text); border-color: var(--c-input-border); }
.dark .chip2 { background: var(--c-card2); color: var(--c-sub); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
