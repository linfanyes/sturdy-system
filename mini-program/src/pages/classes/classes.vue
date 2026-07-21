<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="list">
      <view
        v-for="c in list"
        :key="c.id"
        class="item"
      >
        <view class="info" @click="open(c)">
          <view class="name"><text class="dot" :style="{ background: c.color || '#07c160' }"></text>{{ c.name }}</view>
          <view class="meta">{{ c.grade }} · {{ c.term || '未设学期' }}<text v-if="c.slogan" class="slogan"> · {{ c.slogan }}</text></view>
        </view>
        <view class="ops">
          <text class="op detail" @click.stop="showDetailOf(c)">详情</text>
          <text class="op edit" @click.stop="edit(c)">编辑</text>
          <text class="op del" @click.stop="remove(c)">删除</text>
        </view>
      </view>
      <EmptyState v-if="!list.length" icon="🏫" text="还没有班级" hint="点下方按钮新建第一个班级" />
    </view>

    <button class="add" @click="toggleForm">{{ showForm && !editingId ? '收起' : '＋ 新建班级' }}</button>

    <view v-if="showForm" class="form">
      <view class="form-title">{{ editingId ? '编辑班级' : '新建班级' }}</view>

      <view class="field">
        <text class="label">年级</text>
        <picker :range="grades" :value="form.gradeIdx" @change="(e) => (form.gradeIdx = +e.detail.value)">
          <view class="picker">{{ grades[form.gradeIdx] }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">班级</text>
        <picker :range="classOpts" :value="form.classIdx" @change="(e) => (form.classIdx = +e.detail.value)">
          <view class="picker">{{ classOpts[form.classIdx] }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">班级名称（自动生成）</text>
        <view class="readonly">{{ className }}</view>
      </view>

      <view class="field">
        <text class="label">年度</text>
        <picker :range="years" :value="form.yearIdx" @change="(e) => (form.yearIdx = +e.detail.value)">
          <view class="picker">{{ years[form.yearIdx] }} 年</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">季度</text>
        <picker :range="quarters" :value="form.quarterIdx" @change="(e) => (form.quarterIdx = +e.detail.value)">
          <view class="picker">{{ quarters[form.quarterIdx] }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">学期</text>
        <picker :range="semesterOpts" :value="semesterIdx" @change="onSemesterPick">
          <view class="picker">{{ semesterOpts[semesterIdx] || '请选择学期（学期管理中添加）' }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">班主任姓名</text>
        <input v-model="form.headTeacher" placeholder="班主任姓名" />
      </view>

      <view class="field">
        <text class="label">班级口号</text>
        <input v-model="form.slogan" placeholder="如 团结拼搏，永不言弃" />
      </view>

      <view class="field">
        <text class="label">班级颜色</text>
        <view class="swatches">
          <view v-for="c in colorOpts" :key="c" class="sw" :class="form.color === c && 'on'" :style="{ background: c }" @click="form.color = c"></view>
          <view class="sw custom" :class="!colorOpts.includes(form.color) && 'on'" :style="{ background: form.color }">
            <input v-model="form.color" class="sw-inp" placeholder="自定" />
          </view>
        </view>
      </view>

      <view class="field">
        <text class="label">自定义班号（选填，留空则用上方班序）</text>
        <input v-model="form.customNo" placeholder="如 1 / A / 火箭班" />
      </view>

      <button class="save" :disabled="saving" @click="save">{{ saving ? '保存中…' : (editingId ? '保存修改' : '保存') }}</button>
      <button v-if="editingId" class="cancel" @click="cancelEdit">取消编辑</button>
    </view>

    <!-- 班级详情（花名册/座位/课表/公告） -->
    <view v-if="showDetail" class="mask" @click="showDetail = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ detailC.name }} · 班级详情</view>
        <view class="sh-meta">{{ detailC.grade }} · {{ detailC.term || '未设学期' }}<text v-if="detailC.headTeacher"> · 班主任 {{ detailC.headTeacher }}</text></view>
        <view class="facets">
          <view class="facet" @click="goStudents(detailC)">
            <text class="f-n">{{ stuCount }}</text><text class="f-l">花名册</text>
          </view>
          <view class="facet" @click="goSeats(detailC)">
            <text class="f-n">💺</text><text class="f-l">座位表</text>
          </view>
          <view class="facet" @click="goSchedule()">
            <text class="f-n">🗓️</text><text class="f-l">班级课表</text>
          </view>
          <view class="facet" @click="goNotice(detailC)">
            <text class="f-n">{{ noticesCount }}</text><text class="f-l">未结束公告</text>
          </view>
        </view>
        <button class="enter" @click="goStudents(detailC)">进入学生管理</button>
        <button class="sync" @click="syncTerm">📅 将本学期同步到其他班级</button>
        <button class="cancel" @click="showDetail = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api, { batchRun } from '../../common/request'
import { theme, flushTabBarStyle } from '../../common/store'

const list = ref([])
const showForm = ref(false)
const editingId = ref('')
const saving = ref(false)
const semesterList = ref([])

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const classOpts = ['一班', '二班', '三班', '四班', '五班', '六班', '七班', '八班', '九班', '十班']
const quarters = ['春季', '秋季']

const colorOpts = ['#07c160', '#409eff', '#e6a23c', '#e06c75', '#9b59b6', '#1abc9c', '#34495e', '#f39c12']

const thisYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 5 + i)) // 当前年前5年 + 当年

const form = ref({
  gradeIdx: 0,
  classIdx: 0,
  yearIdx: years.length - 1,
  quarterIdx: 0,
  semesterId: '',
  headTeacher: '',
  slogan: '',
  color: '#07c160',
  customNo: '',
})

const className = computed(() => grades[form.value.gradeIdx] + classOpts[form.value.classIdx])
const semesterOpts = computed(() => semesterList.value.map((s) => s.name + ' (' + s.startDate + '~' + s.endDate + ')'))
const semesterIdx = computed(() => {
  const i = semesterList.value.findIndex((s) => s.id === form.value.semesterId)
  return i >= 0 ? i : 0
})
function onSemesterPick(e) {
  const s = semesterList.value[e.detail.value]
  if (s) form.value.semesterId = s.id
}
async function loadSemesters() {
  try { semesterList.value = await api.get('/semesters') || [] } catch (e) { semesterList.value = [] }
}

async function load() {
  list.value = await api.getList('/classes', { loading: true, loadingText: '加载班级' })
  loadSemesters()
}
onShow(load)
onShow(() => flushTabBarStyle())
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function open(c) {
  uni.navigateTo({ url: `/pages/students/students?classId=${c.id}&name=${encodeURIComponent(c.name)}` })
}

function toggleForm() {
  if (editingId.value) {
    cancelEdit()
    return
  }
  showForm.value = !showForm.value
}

function edit(c) {
  editingId.value = c.id
  const gIdx = grades.indexOf(c.grade)
  const cIdx = classOpts.indexOf(c.classNo)
  form.value = {
    gradeIdx: gIdx >= 0 ? gIdx : 0,
    classIdx: cIdx >= 0 ? cIdx : 0,
    yearIdx: years.length - 1,
    quarterIdx: 0,
    semesterId: c.semesterId || '',
    headTeacher: c.headTeacher || '',
    slogan: c.slogan || '',
    color: c.color || '#07c160',
    customNo: '',
  }
  showForm.value = true
}

function cancelEdit() {
  editingId.value = ''
  showForm.value = false
  form.value = { gradeIdx: 0, classIdx: 0, yearIdx: years.length - 1, quarterIdx: 0, semesterId: '', headTeacher: '', slogan: '', color: '#07c160', customNo: '' }
}

async function save() {
  if (saving.value) return
  if (!form.value.headTeacher.trim()) {
    return uni.showToast({ title: '请填写班主任姓名', icon: 'none' })
  }
  if (!form.value.semesterId) {
    return uni.showToast({ title: '请选择学期（可在设置→学期管理中添加）', icon: 'none' })
  }
  const sem = semesterList.value.find((s) => s.id === form.value.semesterId)
  const classNo = form.value.customNo.trim() || classOpts[form.value.classIdx]
  const payload = {
    name: grades[form.value.gradeIdx] + classNo,
    grade: grades[form.value.gradeIdx],
    classNo,
    term: sem ? sem.name : '',
    semesterId: form.value.semesterId,
    headTeacher: form.value.headTeacher,
    slogan: form.value.slogan.trim(),
    color: form.value.color || '#07c160',
    subjects: [],
  }
  saving.value = true
  try {
    if (editingId.value) {
      await api.patch('/classes/' + editingId.value, payload)
      uni.showToast({ title: '已保存修改', icon: 'success' })
    } else {
      await api.post('/classes', payload)
      uni.showToast({ title: '班级已创建', icon: 'success' })
    }
    cancelEdit()
    load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    saving.value = false
  }
}

function remove(c) {
  uni.showModal({
    title: '删除班级',
    content: `确定删除「${c.name}」吗？该班级下的学生与成绩不会自动删除，请谨慎操作。`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…', mask: true })
      try {
        await api.del('/classes/' + c.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || '请重试'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

const showDetail = ref(false)
const detailC = ref({})
const stuCount = ref(0)
const noticesCount = ref(0)
async function showDetailOf(c) {
  detailC.value = c
  showDetail.value = true
  const [students, notices] = await Promise.all([api.get('/students').catch(() => []), api.get('/notices').catch(() => [])])
  stuCount.value = (students || []).filter((s) => s.classId === c.id).length
  noticesCount.value = (notices || []).filter((n) => n.classId === c.id && !n.ended).length
}
function goStudents(c) {
  showDetail.value = false
  uni.navigateTo({ url: `/pages/students/students?classId=${c.id}&name=${encodeURIComponent(c.name)}` })
}
function goSeats(c) {
  showDetail.value = false
  uni.navigateTo({ url: `/pages/seats/seats?classId=${c.id}` })
}
function goSchedule() {
  showDetail.value = false
  uni.switchTab({ url: '/pages/schedule/schedule' })
}
function goNotice(c) {
  showDetail.value = false
  uni.navigateTo({ url: '/pages/notice/notice' })
}

async function syncTerm() {
  const others = list.value.filter((c) => c.id !== detailC.value.id)
  if (!others.length) return uni.showToast({ title: '没有其他班级可同步', icon: 'none' })
  uni.showModal({
    title: '同步学期',
    content: `将「${detailC.value.term || '未设学期'}」同步到其余 ${others.length} 个班级？`,
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '同步中…' })
      try {
        const { success, failed } = await batchRun(
          others.map((c) => api.patch('/classes/' + c.id, { term: detailC.value.term })),
        )
        if (failed === 0) {
          uni.showToast({ title: `已同步 ${success} 个班级`, icon: 'success' })
        } else {
          uni.showToast({ title: `成功 ${success} 失败 ${failed}`, icon: 'none' })
        }
        load()
      } catch (e) {
        uni.showToast({ title: '同步失败：' + (e.message || ''), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.item {
  background: var(--c-card);
  border-radius: 20rpx;
  padding: 26rpx 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 10rpx var(--c-shadow);
}
.info { flex: 1; }
.name { font-size: 34rpx; font-weight: 600; color: var(--c-title); display: flex; align-items: center; }
.dot { width: 18rpx; height: 18rpx; border-radius: 50%; margin-right: 12rpx; flex-shrink: 0; }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.slogan { color: #a07b3b; }
.ops { display: flex; gap: 24rpx; flex-shrink: 0; }
.op { font-size: 26rpx; padding: 8rpx 16rpx; border-radius: 24rpx; }
.edit { color: var(--c-primary); background: rgba(7, 193, 96, 0.12); }
.del { color: var(--c-danger); background: rgba(230, 67, 64, 0.12); }
.detail { color: #3a8ee6; background: rgba(58, 142, 230, 0.12); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx; box-sizing: border-box; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 8rpx; }
.sh-meta { font-size: 24rpx; color: var(--c-sub); margin-bottom: 24rpx; }
.facets { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.facet { flex: 1; background: var(--c-card2); border-radius: 16rpx; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; }
.f-n { font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.f-l { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.enter { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; }
.sync { background: #409eff; color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; }
.swatches { display: flex; flex-wrap: wrap; gap: 16rpx; align-items: center; }
.sw { width: 56rpx; height: 56rpx; border-radius: 50%; border: 4rpx solid transparent; box-sizing: border-box; }
.sw.on { border-color: var(--c-title); box-shadow: 0 0 0 2rpx #fff inset; }
.sw.custom { display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
.sw-inp { width: 100%; height: 100%; font-size: 18rpx; text-align: center; color: #fff; background: transparent; border: none; }
.dark .slogan { color: #d9a85a; }
.dark .mask { background: rgba(0,0,0,0.6); }
.dark .sheet { background: var(--c-card); }
.dark .facet { background: var(--c-card2); }
.dark .enter { background: #07c160; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.add {
  margin-top: 20rpx;
  background: var(--c-accent);
  color: #fff;
  border-radius: 50rpx;
}
.form {
  margin-top: 24rpx;
  background: var(--c-card);
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx var(--c-shadow);
}
.form-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; line-height: 1.6; }
.picker, .readonly {
  border: 1px solid var(--c-input-border);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: var(--c-title);
  min-height: 80rpx;
  line-height: 44rpx;
  box-sizing: border-box;
}
.readonly { background: var(--c-input); color: var(--c-sub); }
.field input {
  width: 100%; height: 80rpx; min-height: 80rpx; line-height: 44rpx;
  border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: var(--c-text); background: var(--c-input);
  box-sizing: border-box;
}
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
