<template>
  <view class="page">
    <view class="sel">
      <view class="field">
        <text class="label">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClass">
          <view class="picker">{{ classOpts[classIdx] || '请选择班级' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">考试</text>
        <picker :range="examOpts" :value="examIdx" @change="onExam">
          <view class="picker">{{ examOpts[examIdx] || '请选择考试' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">科目</text>
        <picker :range="subjectOpts" :value="subjectIdx" @change="onSubject">
          <view class="picker">{{ subjectOpts[subjectIdx] || '请选择科目' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">日期</text>
        <input v-model="date" placeholder="如 2026-05-12" />
      </view>
    </view>

    <view v-if="!classId" class="empty">请先选择班级</view>

    <block v-else>
      <view v-if="existing" class="exist">
        ✅ 已录入 {{ doneCount }} / {{ students.length }} 人（点击「保存」可更新）
        <text class="clear" @click="removeGrade">删除该成绩</text>
      </view>

      <view class="list">
        <view v-for="s in students" :key="s.id" class="item">
          <text class="name">{{ s.name }}</text>
          <input
            class="score"
            type="digit"
            :value="scores[s.id] || ''"
            :placeholder="s.studentNo ? s.studentNo : '分数'"
            @input="(e) => (scores[s.id] = e.detail.value)"
          />
        </view>
        <view v-if="!students.length" class="empty">该班级还没有学生，请先在「学生管理」添加</view>
      </view>

      <button class="save" @click="saveManual">💾 保存成绩</button>
      <button class="imp" @click="showImport = !showImport">{{ showImport ? '收起导入' : '📥 批量导入成绩' }}</button>

      <view v-if="showImport" class="import-box">
        <view class="imp-tip">先选好上方「班级/考试/科目/日期」，再导入 Excel/TXT（列：学号或姓名, 分数）。</view>
        <button class="pick" @click="pickFile">📂 选择文件</button>

        <view v-if="preview" class="preview">
          <view class="pv-sum">
            校验：<text class="ok">有效 {{ preview.validCount }}</text> ·
            <text class="bad">异常 {{ preview.errorCount }}</text> / 共 {{ preview.total }} 行
          </view>
          <view v-if="preview.errorCount" class="pv-errs">
            <view v-for="(r, i) in preview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
              {{ r.name || '(空)' }}：{{ r.error }}
            </view>
          </view>
          <button class="confirm" :disabled="!preview.validCount" @click="commit">确认导入 {{ preview.validCount }} 条</button>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'

const classes = ref([])
const exams = ref([])
const students = ref([])
const pubSubjects = ref([])
const grades = ref([])

const classIdx = ref(-1)
const examIdx = ref(-1)
const subjectIdx = ref(-1)
const classId = ref('')
const examId = ref('')
const examName = ref('')
const subject = ref('')
const date = ref('')
const scores = reactive({})
const existing = ref(null)
const doneCount = ref(0)

const showImport = ref(false)
const preview = ref(null)

const classOpts = ref([])
const examOpts = ref([])
const subjectOpts = ref([])

async function load() {
  const [cs, es, pub, gs] = await Promise.all([
    api.get('/classes'),
    api.get('/exams'),
    api.get('/config/public'),
    api.get('/grades'),
  ])
  classes.value = cs
  exams.value = es
  pubSubjects.value = pub.defaultSubjects || []
  grades.value = gs
  classOpts.value = cs.map((c) => c.name)
  rebuildExamOpts()
}

onShow(load)

function rebuildExamOpts() {
  examOpts.value = exams.value
    .filter((e) => !classId.value || e.classId === classId.value)
    .map((e) => e.name + (e.subjects && e.subjects.length ? `（${e.subjects.join('/')}）` : ''))
}

async function onClass(e) {
  classIdx.value = +e.detail.value
  const c = classes.value[classIdx.value]
  classId.value = c.id
  examIdx.value = -1
  examId.value = ''
  examName.value = ''
  subjectIdx.value = -1
  subject.value = ''
  existing.value = null
  rebuildExamOpts()
  await loadStudents()
  await checkExisting()
}

async function onExam(e) {
  examIdx.value = +e.detail.value
  const list = exams.value.filter((x) => x.classId === classId.value)
  const chosen = list[examIdx.value]
  examId.value = chosen.id
  examName.value = chosen.name
  subjectOpts.value = chosen.subjects && chosen.subjects.length ? chosen.subjects : pubSubjects.value
  subjectIdx.value = subjectOpts.value.length ? 0 : -1
  subject.value = subjectOpts.value[0] || ''
  date.value = chosen.date || date.value
  await checkExisting()
}

function onSubject(e) {
  subjectIdx.value = +e.detail.value
  subject.value = subjectOpts.value[subjectIdx.value]
  checkExisting()
}

async function loadStudents() {
  const all = await api.get('/students')
  students.value = all.filter((s) => s.classId === classId.value)
}

function checkExisting() {
  if (!classId.value || !examName.value || !subject.value) {
    existing.value = null
    return
  }
  const rec = grades.value.find(
    (g) => g.classId === classId.value && g.examName === examName.value && g.subject === subject.value,
  )
  existing.value = rec || null
  // 预填分数
  for (const k in scores) delete scores[k]
  doneCount.value = 0
  if (rec) {
    const map = {}
    ;(rec.scores || []).forEach((x) => (map[x.studentId] = x.score))
    students.value.forEach((s) => {
      scores[s.id] = map[s.id] != null ? String(map[s.id]) : ''
    })
    doneCount.value = (rec.scores || []).filter((x) => x.score != null).length
  }
}

async function saveManual() {
  if (!classId.value || !examName.value || !subject.value)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  if (!date.value) return uni.showToast({ title: '请填写日期', icon: 'none' })
  const sc = []
  students.value.forEach((s) => {
    const v = (scores[s.id] || '').trim()
    if (v !== '') {
      const n = Number(v)
      if (isNaN(n)) return uni.showToast({ title: `${s.name} 分数不是数字`, icon: 'none' })
      sc.push({ studentId: s.id, score: n })
    }
  })
  if (!sc.length) return uni.showToast({ title: '请至少录入一个分数', icon: 'none' })
  uni.showLoading({ title: '保存中…' })
  try {
    const r = await api.post('/grades/merge', {
      classId: classId.value,
      examName: examName.value,
      examId: examId.value,
      subject: subject.value,
      date: date.value,
      scores: sc,
    })
    uni.showToast({ title: r.created ? '成绩已创建' : '成绩已更新', icon: 'success' })
    grades.value = await api.get('/grades')
    checkExisting()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function removeGrade() {
  if (!existing.value) return
  uni.showModal({
    title: '删除成绩',
    content: `确定删除「${examName.value}·${subject.value}」的成绩记录吗？`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/grades/' + existing.value.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        grades.value = await api.get('/grades')
        existing.value = null
        for (const k in scores) delete scores[k]
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || '请重试'), icon: 'none' })
      }
    },
  })
}

function pickFile() {
  if (!classId.value || !examName.value || !subject.value)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        const r = await api.post('/grades/import-preview', { classId: classId.value, filename: f.name, data })
        preview.value = r
        if (!r.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => {},
  })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data),
      fail: reject,
    })
  })
}

async function commit() {
  const rows = preview.value.rows.filter((r) => r.valid && r.studentId)
  if (!rows.length) return
  uni.showLoading({ title: '导入中…' })
  try {
    const r = await api.post('/grades/import-commit', {
      classId: classId.value,
      examName: examName.value,
      examId: examId.value,
      subject: subject.value,
      date: date.value,
      rows,
    })
    uni.showToast({ title: `成功导入 ${r.count} 条成绩`, icon: 'success' })
    preview.value = null
    showImport.value = false
    grades.value = await api.get('/grades')
    checkExisting()
  } catch (e) {
    uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.page { padding: 30rpx; }
.sel { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: #9aa0a6; margin-bottom: 8rpx; }
.picker, .sel input {
  border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: #4a3f35; min-height: 80rpx; line-height: 44rpx;
  box-sizing: border-box; background: #fff;
}
.exist { background: #e8f8ef; color: #07c160; font-size: 26rpx; padding: 18rpx 24rpx; border-radius: 14rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.clear { color: #e64340; font-size: 24rpx; }
.item { background: #fff; border-radius: 16rpx; padding: 20rpx 26rpx; margin-bottom: 14rpx; display: flex; align-items: center; justify-content: space-between; }
.name { font-size: 30rpx; color: #4a3f35; }
.score { width: 220rpx; height: 80rpx; min-height: 80rpx; line-height: 44rpx; border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 0 20rpx; text-align: center; font-size: 28rpx; box-sizing: border-box; background: #fff; }
.empty { text-align: center; color: #c0c4cc; padding: 80rpx 0; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.imp { background: #409eff; color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.import-box { margin-top: 16rpx; background: #f6fbff; border-radius: 20rpx; padding: 24rpx; }
.imp-tip { font-size: 24rpx; color: #6a7c8c; line-height: 1.6; margin-bottom: 14rpx; }
.pick { background: #409eff; color: #fff; border-radius: 50rpx; font-size: 28rpx; }
.preview { margin-top: 14rpx; border-top: 1px dashed #cfe3f5; padding-top: 14rpx; }
.pv-sum { font-size: 26rpx; color: #4a3f35; }
.pv-sum .ok { color: #07c160; }
.pv-sum .bad { color: #e64340; }
.pv-errs { margin: 8rpx 0; }
.pv-err { font-size: 24rpx; color: #e64340; line-height: 1.6; }
.confirm { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 6rpx; }
.confirm[disabled] { opacity: 0.5; }
</style>
