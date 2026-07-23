<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="filters">
      <picker :range="classFilterOpts" @change="(e) => { const i = e.detail.value; filterClass = i === 0 ? '' : classes[i - 1].id }">
        <view class="fpick">班级：{{ filterClassName }}</view>
      </picker>
      <picker :range="termOpts" @change="(e) => { const i = e.detail.value; filterTerm = i === 0 ? '' : termOpts[i] }">
        <view class="fpick">学期：{{ filterTerm || '全部' }}</view>
      </picker>
      <text class="freset" @click="filterClass = ''; filterTerm = ''; sortAsc = null">重置</text>
      <text class="fsort" @click="toggleSort">{{ sortLabel }}</text>
    </view>

    <view class="list">
      <view v-for="e in filtered" :key="e.id" class="item">
        <view class="info">
          <view class="name">{{ e.name }}</view>
          <view class="meta">{{ e.date }} · {{ e.term || '未设学期' }}<text v-if="e.teacherName" class="creator"> · 创建者：{{ e.teacherName }}</text></view>
          <view class="subjects">
            <text v-for="s in (e.subjects || [])" :key="s" class="schip">{{ s }}<text v-if="e.subjectFullScores && e.subjectFullScores[s]" class="fs"> ·{{ e.subjectFullScores[s] }}</text></text>
          </view>
        </view>
        <view class="ops">
          <text class="op edt" @click.stop="edit(e)">编辑</text>
          <text class="op ana" @click.stop="analyze(e)">分析</text>
          <text class="op del" @click.stop="remove(e)">删除</text>
        </view>
      </view>
      <EmptyState v-if="!filtered.length" icon="📝" text="暂无考试" hint="点击下方按钮创建第一场考试" />
    </view>

    <view class="semester-hint" @click="goSemesters">📅 未找到学期？点此新建学期</view>

    <button class="add" :disabled="loading" @click="toggleForm">{{ showForm && !editingId ? '收起' : '＋ 新建考试' }}</button>

    <view v-if="showForm" class="form">
      <view class="form-title">{{ editingId ? '编辑考试' : '新建考试' }}</view>
      <input v-model="form.name" maxlength="100" placeholder="考试名称，如 期中考试" />
      <picker :range="classOpts" @change="(ev) => { const c = classes[ev.detail.value]; form.classId = c.id; form.term = c.term || '' }">
        <view class="picker">班级：{{ selClassName }}</view>
      </picker>
      <view class="sub-label">学期（自动取所选班级）</view>
      <view class="readonly">{{ form.term || '所选班级未设学期' }}</view>
      <view class="sub-label">创建者</view>
      <view class="readonly">{{ form.teacherName || '—' }}</view>
      <input v-model="form.date" placeholder="日期，如 2026-05-12" />
      <view class="sub-label">考试科目（可多选）</view>
      <view class="chips">
        <view
          v-for="s in subjects"
          :key="s"
          :class="['chip', form.subjects.includes(s) ? 'on' : '']"
          @click="toggle(s)"
        >{{ s }}</view>
      </view>
      <view class="sub-label">各科满分（默认 100）</view>
      <view class="fs-rows">
        <view v-for="s in form.subjects" :key="s" class="fs-row">
          <text class="fs-name">{{ s }}</text>
          <input v-model.number="formFullScores[s]" class="fs-inp" type="number" placeholder="100" />
        </view>
      </view>
      <button class="save" :disabled="loading" @click="save">{{ loading ? '保存中…' : (editingId ? '保存修改' : '保存（自动建成绩表）') }}</button>
      <button v-if="editingId" class="cancel" @click="cancelEdit">取消编辑</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'
import { isNonEmpty } from '../../common/validators'

const list = ref([])
const classes = ref([])
const subjects = ref([])
const showForm = ref(false)
const editingId = ref('')
const loading = ref(false)
const form = ref({ name: '', classId: '', date: '', subjects: [], teacherName: '' })
const formFullScores = ref({})
const filterClass = ref('')
const filterTerm = ref('')
const sortAsc = ref(null) // null=不排序, true=升序, false=降序

const sortLabel = computed(() => {
  if (sortAsc.value === null) return '↕ 排序'
  return sortAsc.value ? '↑ 日期升序' : '↓ 日期降序'
})

function toggleSort() {
  if (sortAsc.value === null) sortAsc.value = false // 首次默认降序(最新在前)
  else if (sortAsc.value === false) sortAsc.value = true
  else sortAsc.value = null
}

const classOpts = computed(() => classes.value.map((c) => c.name))
const classFilterOpts = computed(() => ['全部', ...classes.value.map((c) => c.name)])
const filterClassName = computed(() => {
  if (!filterClass.value) return '全部'
  const c = classes.value.find((x) => x.id === filterClass.value)
  return c ? c.name : '全部'
})
const termOpts = computed(() => ['全部', ...Array.from(new Set(list.value.map((e) => e.term).filter(Boolean)))])
const filtered = computed(() => {
  let arr = list.value.filter((e) => {
    if (filterClass.value && e.classId !== filterClass.value) return false
    if (filterTerm.value && e.term !== filterTerm.value) return false
    return true
  })
  if (sortAsc.value !== null) {
    arr = [...arr].sort((a, b) => {
      const da = a.date || '', db = b.date || ''
      return sortAsc.value ? da.localeCompare(db) : db.localeCompare(da)
    })
  }
  return arr
})
const selClassName = computed(() => {
  const c = classes.value.find((x) => x.id === form.value.classId)
  return c ? c.name : '请选择'
})

async function load() {
  list.value = await api.getList('/exams', { loading: true, loadingText: '加载考试' })
  classes.value = await api.getList('/classes', { silent: true })
  const pub = await api.get('/config/public')
  subjects.value = pub.defaultSubjects || []
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function toggle(s) {
  const arr = form.value.subjects
  form.value.subjects = arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]
}

function goSemesters() {
  uni.navigateTo({ url: '/pages/crud/crud?type=semesters' })
}

function edit(e) {
  editingId.value = e.id
  form.value = {
    name: e.name,
    classId: e.classId,
    date: e.date,
    subjects: e.subjects ? [...e.subjects] : [],
    term: e.term || '',
    teacherName: e.teacherName || auth.user?.name || '',
  }
  if (e.subjectFullScores) {
    formFullScores.value = { ...e.subjectFullScores }
  }
  showForm.value = true
}

function toggleForm() {
  if (editingId.value) {
    cancelEdit()
    return
  }
  showForm.value = !showForm.value
  if (showForm.value) {
    form.value.teacherName = auth.user?.name || ''
  }
}

function cancelEdit() {
  editingId.value = ''
  showForm.value = false
  form.value = { name: '', classId: '', date: '', subjects: [], term: '', teacherName: '' }
  formFullScores.value = {}
}

function analyze(e) {
  uni.navigateTo({ url: '/pages/ai-exam/ai-exam?examId=' + encodeURIComponent(e.id) })
}

async function save() {
  if (loading.value) return
  if (!isNonEmpty(form.value.name)) return uni.showToast({ title: '请完善考试信息', icon: 'none' })
  if (!isNonEmpty(form.value.classId)) return uni.showToast({ title: '请完善考试信息', icon: 'none' })
  if (!form.value.subjects || !form.value.subjects.length) return uni.showToast({ title: '请完善考试信息', icon: 'none' })
  loading.value = true
  try {
    const subjectFullScores = {}
    form.value.subjects.forEach((s) => {
      subjectFullScores[s] = Number(formFullScores.value[s]) || 100
    })
    const payload = {
      ...form.value,
      subjectFullScores,
      teacherName: form.value.teacherName || auth.user?.name || '',
    }
    if (editingId.value) {
      await api.patch('/exams/' + editingId.value, payload)
      uni.showToast({ title: '考试已更新', icon: 'success' })
    } else {
      await api.post('/exams', payload)
      uni.showToast({ title: '考试已创建', icon: 'success' })
    }
    cancelEdit()
    await load()
  } catch (err) {
    uni.showToast({ title: '保存失败：' + (err.message || '请重试'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function remove(e) {
  uni.showModal({
    title: '删除考试',
    content: `确定删除「${e.name}」吗？将一并删除其成绩记录，操作不可恢复。`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/exams/' + e.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      } catch (err) {
        uni.showToast({ title: '删除失败：' + (err.message || '请重试'), icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.item { background: var(--c-card); border-radius: 20rpx; padding: 26rpx 30rpx; margin-bottom: 16rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.info { flex: 1; }
.name { font-size: 32rpx; font-weight: 600; color: var(--c-title); }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.creator { color: #3a8ee6; }
.ops { display: flex; gap: 20rpx; flex-shrink: 0; }
.op { font-size: 26rpx; padding: 8rpx 16rpx; border-radius: 24rpx; }
.edt { color: #3a8ee6; background: rgba(58, 142, 230, 0.12); }
.ana { color: var(--c-accent); background: rgba(230, 162, 60, 0.14); }
.del { color: #e64340; background: rgba(230, 67, 64, 0.12); }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.add { margin-top: 16rpx; background: var(--c-accent); color: #fff; border-radius: 50rpx; }
.add[disabled] { opacity: 0.6; }
.form { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.form-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.form input, .picker, .readonly { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; color: var(--c-text); background: var(--c-input); width: 100%; }
.readonly { color: var(--c-sub); }
.sub-label { color: var(--c-sub); font-size: 26rpx; margin: 10rpx 0; line-height: 1.6; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 20rpx; }
.chip { padding: 12rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); font-size: 26rpx; }
.chip.on { background: var(--c-accent); color: #fff; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.save[disabled] { opacity: 0.6; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.filters { display: flex; align-items: center; gap: 14rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.fpick { border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 12rpx 24rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-title); white-space: nowrap; box-sizing: border-box; }
.freset { font-size: 24rpx; color: #409eff; padding: 12rpx 8rpx; }
.fsort { font-size: 24rpx; color: var(--c-accent); padding: 12rpx 14rpx; border-radius: 30rpx; background: var(--c-card); margin-left: auto; }
.semester-hint { text-align: center; font-size: 24rpx; color: #409eff; padding: 12rpx 0; margin-top: 10rpx; }
.subjects { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.schip { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; background: var(--c-card2); color: var(--c-sub); }
.fs { color: #e6a23c; }
.fs-rows { margin-bottom: 20rpx; }
.fs-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.fs-name { font-size: 26rpx; color: var(--c-title); width: 140rpx; }
.fs-inp { flex: 1; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 12rpx 20rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; min-width: 0; }
</style>
