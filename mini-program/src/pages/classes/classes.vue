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
        <text class="label">学期（自动生成）</text>
        <view class="readonly">{{ autoTermName }}</view>
      </view>

      <view class="field">
        <text class="label">班主任姓名</text>
        <input v-model="form.headTeacher" placeholder="班主任姓名" />
      </view>

      <view class="field">
        <text class="label">本学期课程 <text class="must">*至少选一门</text></text>
        <view class="chips">
          <view
            v-for="s in pubSubjects"
            :key="s"
            :class="['chip', form.subjects.includes(s) ? 'on' : '']"
            @click="toggleSubject(s)"
          >{{ s }}</view>
          <view v-if="!pubSubjects.length" class="no-subj">暂无科目预设，请先在系统配置中设置</view>
        </view>
      </view>

      <view v-for="s in form.subjects" :key="s" class="field">
        <text class="label">{{ s }} 任课老师</text>
        <input :value="form.subjectTeachers[s] || form.headTeacher" :placeholder="form.headTeacher || '任课老师姓名'" @input="(e) => form.subjectTeachers = { ...form.subjectTeachers, [s]: e.detail.value }" />
        <text v-if="form.subjectTeachers[s] === form.headTeacher || (!form.subjectTeachers[s])" class="hint">默认班主任</text>
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

    <!-- 班级详情（花名册/座位/课表/公告/成员） -->
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
          <view class="facet" @click="openMembers(detailC)">
            <text class="f-n">{{ members.length }}</text><text class="f-l">班级成员</text>
          </view>
        </view>
        <button class="enter" @click="goStudents(detailC)">进入学生管理</button>
        <button class="sync" @click="syncTerm">📅 将本学期同步到其他班级</button>
        <button class="cancel" @click="showDetail = false">关闭</button>
      </view>
    </view>

    <!-- 班级成员管理（班主任特权） -->
    <view v-if="showMembers" class="mask" @click="showMembers = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ membersC.name }} · 班级成员</view>
        <view class="sh-meta">
          <text v-if="isHead">您是本班班主任，可管理科任老师</text>
          <text v-else>您是本班科任老师，仅可查看成员列表</text>
        </view>
        <view class="members-list">
          <view v-for="m in members" :key="m.teacherId" class="member-row">
            <view class="member-info">
              <text class="member-name">{{ m.teacherName }}</text>
              <text class="member-role" :class="m.role === 'head' ? 'role-head' : 'role-subject'">
                {{ m.role === 'head' ? '班主任' : '科任老师' }}
              </text>
              <text v-if="m.subjects && m.subjects.length" class="member-subj">{{ m.subjects.join('、') }}</text>
            </view>
            <text
              v-if="isHead && m.role !== 'head'"
              class="member-del"
              @click="removeMember(m)"
            >移除</text>
          </view>
          <view v-if="!members.length" class="empty-members">暂无成员</view>
        </view>
        <button v-if="isHead" class="enter" @click="showAddMember = true">＋ 添加科任老师</button>
        <button class="cancel" @click="showMembers = false">关闭</button>
      </view>
    </view>

    <!-- 添加科任老师（班主任特权） -->
    <view v-if="showAddMember" class="mask" @click="showAddMember = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">添加科任老师到「{{ membersC.name }}」</view>
        <view class="field">
          <text class="label">选择本校教师</text>
          <picker :range="teacherOptions" range-key="label" @change="onTeacherPick">
            <view class="picker">{{ addMemberForm.teacherId ? teacherLabel(addMemberForm.teacherId) : '请选择教师' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">任教学科（多选）</text>
          <view class="chips">
            <view
              v-for="s in pubSubjects"
              :key="s"
              :class="['chip', addMemberForm.subjects.includes(s) ? 'on' : '']"
              @click="toggleAddMemberSubject(s)"
            >{{ s }}</view>
          </view>
        </view>
        <button class="save" :disabled="saving" @click="confirmAddMember">{{ saving ? '添加中…' : '确认添加' }}</button>
        <button class="cancel" @click="showAddMember = false">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api, { batchRun } from '../../common/request'
import { auth, theme, flushTabBarStyle, switchTabParams } from '../../common/store'

const list = ref([])
const showForm = ref(false)
const editingId = ref('')
const saving = ref(false)

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const classOpts = ['一班', '二班', '三班', '四班', '五班', '六班', '七班', '八班', '九班', '十班']
const quarters = ['春季', '秋季']

const colorOpts = ['#07c160', '#409eff', '#e6a23c', '#e06c75', '#9b59b6', '#1abc9c', '#34495e', '#f39c12']

const thisYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 5 + i))

const form = ref({
  gradeIdx: 0,
  classIdx: 0,
  yearIdx: years.length - 1,
  quarterIdx: 0,
  headTeacher: '',
  slogan: '',
  color: '#07c160',
  customNo: '',
  subjects: [],
  subjectTeachers: {},
})

const className = computed(() => grades[form.value.gradeIdx] + classOpts[form.value.classIdx])
// 学期由年度+季度自动生成，格式：年度+季度+学期（如 "2026年春季学期"）
const autoTermName = computed(() => years[form.value.yearIdx] + '年' + quarters[form.value.quarterIdx] + '学期')

async function load() {
  list.value = await api.getList('/classes', { loading: true, loadingText: '加载班级' })
  try {
    const pub = await api.get('/config/public')
    pubSubjects.value = (pub && pub.defaultSubjects) || []
  } catch (e) {
    pubSubjects.value = []
  }
}
const pubSubjects = ref([])
onShow(async () => {
  await load()
  flushTabBarStyle()
})
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function open(c) {
  switchTabParams.students = { classId: c.id, name: c.name }
  uni.switchTab({ url: '/pages/students/students' })
}

function toggleForm() {
  if (editingId.value) {
    cancelEdit()
    return
  }
  // 班级需由学校管理员创建并指定班主任，老师端仅提示
  uni.showToast({ title: '新建班级请联系学校管理员', icon: 'none', duration: 2000 })
  return
  showForm.value = !showForm.value
  if (showForm.value) {
    form.value.headTeacher = auth.user?.name || ''
  }
}

function toggleSubject(s) {
  const arr = form.value.subjects
  if (arr.includes(s)) {
    form.value.subjects = arr.filter(x => x !== s)
    const teachers = { ...form.value.subjectTeachers }
    delete teachers[s]
    form.value.subjectTeachers = teachers
  } else {
    form.value.subjects = [...arr, s]
    // 默认班主任
    const defaultTeacher = form.value.headTeacher || auth.user?.name || ''
    form.value.subjectTeachers = { ...form.value.subjectTeachers, [s]: defaultTeacher }
  }
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
    headTeacher: c.headTeacher || '',
    slogan: c.slogan || '',
    color: c.color || '#07c160',
    customNo: '',
    subjects: c.subjects ? [...c.subjects] : [],
    subjectTeachers: c.subjectTeachers ? { ...c.subjectTeachers } : {},
  }
  showForm.value = true
}

function cancelEdit() {
  editingId.value = ''
  showForm.value = false
  form.value = { gradeIdx: 0, classIdx: 0, yearIdx: years.length - 1, quarterIdx: 0, headTeacher: '', slogan: '', color: '#07c160', customNo: '', subjects: [], subjectTeachers: {} }
}

async function save() {
  if (saving.value) return
  if (!form.value.headTeacher.trim()) {
    return uni.showToast({ title: '请填写班主任姓名', icon: 'none' })
  }
  if (!form.value.subjects.length) {
    return uni.showToast({ title: '请至少选择一门课程', icon: 'none' })
  }
  const classNo = form.value.customNo.trim() || classOpts[form.value.classIdx]
  // 默认未设置的任课老师为班主任
  const subjectTeachers = { ...form.value.subjectTeachers }
  form.value.subjects.forEach(s => {
    if (!subjectTeachers[s]) subjectTeachers[s] = form.value.headTeacher
  })
  const payload = {
    name: grades[form.value.gradeIdx] + classNo,
    grade: grades[form.value.gradeIdx],
    classNo,
    term: autoTermName.value,
    headTeacher: form.value.headTeacher,
    slogan: form.value.slogan.trim(),
    color: form.value.color || '#07c160',
    subjects: form.value.subjects,
    subjectTeachers,
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
  switchTabParams.students = { classId: c.id, name: c.name }
  uni.switchTab({ url: '/pages/students/students' })
}
function goSeats(c) {
  showDetail.value = false
  uni.navigateTo({ url: `/pages/seats/seats?classId=${c.id}` })
}
function goSchedule() {
  showDetail.value = false
  uni.navigateTo({ url: '/pages/schedule/schedule' })
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

/* ===== 班级成员管理（班主任特权） ===== */
const showMembers = ref(false)
const membersC = ref({})
const members = ref([])
const isHead = ref(false)        // 当前教师在当前班级是否为班主任
const showAddMember = ref(false)
const addMemberForm = ref({ teacherId: '', subjects: [] })
const schoolTeachers = ref([])   // 本校教师列表（用于添加科任老师）

// 本校教师下拉选项（排除已是本班成员的）
const teacherOptions = computed(() => {
  const memberIds = new Set(members.value.map(m => m.teacherId))
  return schoolTeachers.value
    .filter(t => !memberIds.has(t.id))
    .map(t => ({ id: t.id, label: t.name + (t.teacherNo ? '（' + t.teacherNo + '）' : '') }))
})
function teacherLabel(id) {
  const t = teacherOptions.value.find(x => x.id === id)
  return t ? t.label : '请选择教师'
}
function onTeacherPick(e) {
  const idx = +e.detail.value
  addMemberForm.value.teacherId = teacherOptions.value[idx]?.id || ''
}

function toggleAddMemberSubject(s) {
  const arr = addMemberForm.value.subjects
  if (arr.includes(s)) {
    addMemberForm.value.subjects = arr.filter(x => x !== s)
  } else {
    addMemberForm.value.subjects = [...arr, s]
  }
}

// 加载本校教师列表（首次打开成员管理时按需加载）
async function loadSchoolTeachers() {
  if (schoolTeachers.value.length) return
  try {
    // 班主任特权接口：查询本校教师列表（供添加科任老师时选择）
    const res = await api.post('/classes/school-teachers')
    if (Array.isArray(res)) schoolTeachers.value = res
  } catch (e) {}
}

async function openMembers(c) {
  membersC.value = c
  showDetail.value = false
  showMembers.value = true
  uni.showLoading({ title: '加载成员…', mask: true })
  try {
    const list = await api.post('/classes/' + c.id + '/members/list')
    members.value = list || []
    // 判断当前教师在本班的角色
    const me = (list || []).find(m => m.teacherId === auth.user?.id)
    isHead.value = me?.role === 'head'
    if (isHead.value) await loadSchoolTeachers()
  } catch (e) {
    uni.showToast({ title: '加载成员失败：' + (e.message || ''), icon: 'none' })
    members.value = []
    isHead.value = false
  } finally {
    uni.hideLoading()
  }
}

async function removeMember(m) {
  uni.showModal({
    title: '移除科任老师',
    content: `确定将「${m.teacherName}」移出本班？该老师将无法再访问本班数据。`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '移除中…', mask: true })
      try {
        await api.del('/classes/' + membersC.value.id + '/members/' + m.teacherId)
        uni.showToast({ title: '已移除', icon: 'success' })
        // 刷新成员列表
        members.value = await api.post('/classes/' + membersC.value.id + '/members/list')
      } catch (e) {
        uni.showToast({ title: '移除失败：' + (e.message || ''), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

async function confirmAddMember() {
  if (!addMemberForm.value.teacherId) {
    return uni.showToast({ title: '请选择教师', icon: 'none' })
  }
  saving.value = true
  try {
    await api.post('/classes/' + membersC.value.id + '/members', {
      teacherId: addMemberForm.value.teacherId,
      subjects: addMemberForm.value.subjects,
    })
    uni.showToast({ title: '添加成功', icon: 'success' })
    showAddMember.value = false
    addMemberForm.value = { teacherId: '', subjects: [] }
    // 刷新成员列表
    members.value = await api.post('/classes/' + membersC.value.id + '/members/list')
  } catch (e) {
    uni.showToast({ title: '添加失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
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
.must { color: #e64340; font-size: 22rpx; font-weight: 400; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 10rpx; }
.chip { padding: 12rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); font-size: 26rpx; }
.chip.on { background: var(--c-accent); color: #fff; }
.no-subj { font-size: 24rpx; color: var(--c-sub); padding: 12rpx 0; }
.hint { font-size: 22rpx; color: #07c160; margin-top: 6rpx; display: block; }

/* 班级成员管理 */
.members-list { margin-bottom: 24rpx; }
.member-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 0; border-bottom: 1px solid var(--c-input-border);
}
.member-row:last-child { border-bottom: none; }
.member-info { flex: 1; display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx; }
.member-name { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.member-role { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.role-head { background: rgba(7, 193, 96, 0.15); color: #07c160; }
.role-subject { background: rgba(58, 142, 230, 0.15); color: #3a8ee6; }
.member-subj { font-size: 22rpx; color: var(--c-sub); }
.member-del { font-size: 24rpx; color: var(--c-danger); padding: 8rpx 18rpx; background: rgba(230, 67, 64, 0.12); border-radius: 24rpx; flex-shrink: 0; }
.empty-members { text-align: center; color: var(--c-sub); padding: 40rpx 0; font-size: 26rpx; }
</style>
