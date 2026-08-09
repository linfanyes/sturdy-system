<template>
  <view>
    <!-- 单科录入 -->
    <template v-if="mode === 'single'">
      <view v-if="existing" class="exist">
        ✅ 已录入 {{ doneCount }} / {{ students.length }} 人（点击「保存」可更新）
        <text class="clear" @click="removeGrade">删除该成绩</text>
      </view>
      <view v-if="existing" class="oview">
        <view class="ov2"><text class="n">{{ analysis.avg }}</text><text class="l">平均分</text></view>
        <view class="ov2"><text class="n" style="color:var(--c-primary)">{{ analysis.passRate }}%</text><text class="l">及格率</text></view>
        <view class="ov2"><text class="n" style="color:var(--c-accent)">{{ analysis.excellentRate }}%</text><text class="l">优秀率</text></view>
        <view class="ov2"><text class="n">{{ analysis.max }}</text><text class="l">最高</text></view>
        <view class="ov2"><text class="n">{{ analysis.min }}</text><text class="l">最低</text></view>
      </view>
      <button v-if="existing" class="ana" @click="$emit('show-analysis')">📈 综合分析</button>

      <view v-if="students.length" class="prog">
        <text class="prog-txt">已录入 {{ filledCount }} / {{ students.length }}</text>
        <view class="prog-bar">
          <view class="prog-fill" :style="{ width: students.length ? (filledCount / students.length * 100) + '%' : '0%' }"></view>
        </view>
      </view>

      <scroll-view scroll-y class="grade-list-scroll" :scroll-top="gradeScrollTop" lower-threshold="150" @scrolltolower="gradeLoadMore">
        <view v-for="s in gradeShownStudents" :key="s.id" class="item">
          <text class="name" @click="showScoreCard(s)">{{ s.name }}<text class="sno"> · {{ s.studentNo || '' }}</text></text>
          <input class="score" type="digit" :value="scores[s.id] || ''" placeholder="请录入分数"
            @input="(e) => $emit('score-input', { studentId: s.id, value: e.detail.value })" />
          <text v-if="existing && scores[s.id] != null && scores[s.id] !== ''" class="share-stu" @click.stop="shareStudent(s)">📤</text>
        </view>
        <EmptyState v-if="!students.length" icon="📊" text="该班级还没有学生" hint="请先在「学生管理」添加" />
        <view v-if="gradeHasMore" class="load-more">下滑加载更多（剩余 {{ students.length - gradeShownStudents.length }} 人）</view>
        <view v-if="!gradeHasMore && students.length" class="load-more end">— 已经到底了 —</view>
      </scroll-view>

      <button class="save" :disabled="saving" @click="saveManual">{{ saving ? '保存中…' : '💾 保存成绩' }}</button>
      <button class="imp" @click="showImport = !showImport">{{ showImport ? '收起导入' : '📥 批量导入成绩' }}</button>

      <view v-if="showImport" class="import-box">
        <view class="imp-tip">先选好上方「班级/考试/科目/日期」，再导入 Excel/TXT（列：学号或姓名, 分数）。</view>
        <view class="imp-btns">
          <button class="pick" @click="pickFile">📂 选择文件</button>
          <button class="tpl" @click="downloadTemplate">📋 下载模板</button>
        </view>
        <view v-if="preview" class="preview">
          <view class="pv-sum">校验：<text class="ok">有效 {{ preview.validCount }}</text> · <text class="bad">异常 {{ preview.errorCount }}</text> / 共 {{ preview.total }} 行</view>
          <view v-if="preview.errorCount" class="pv-errs">
            <view v-for="(r, i) in preview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">{{ r.name || '(空)' }}：{{ r.error }}</view>
          </view>
          <button class="confirm" :disabled="!preview.validCount" @click="commit">确认导入 {{ preview.validCount }} 条</button>
        </view>
      </view>
    </template>

    <!-- 全部科目录入 -->
    <template v-if="mode === 'all'">
      <view v-if="!examId" class="exist">请先在上方选择「考试」（全部科目录入将按该考试的所有科目生成矩阵）</view>
      <block v-else>
        <view class="exist">
          ✅ 已录入科目 {{ allFilledSubjects }} / {{ matrixSubjects.length }}（点击「保存全部」可更新）
          <text class="clear" @click="clearAllGrades">清空全部</text>
        </view>
        <view class="prog">
          <text class="prog-txt">总已录入 {{ allFilledCount }} / {{ matrixSlice.length * matrixSubjects.length }} 格（当前页）</text>
          <view class="prog-bar"><view class="prog-fill" :style="{ width: matrixSlice.length && matrixSubjects.length ? (allFilledCount / (matrixSlice.length * matrixSubjects.length) * 100) + '%' : '0%' }"></view></view>
        </view>

        <scroll-view scroll-x class="matrix-wrap">
          <view class="matrix">
            <view class="m-head">
              <view class="m-cell m-name">学生</view>
              <view v-for="s in matrixSubjects" :key="s" class="m-cell m-subject">{{ s }}</view>
            </view>
            <view v-for="stu in matrixSlice" :key="stu.id" class="m-row">
              <view class="m-cell m-name">{{ stu.name }}<text class="sno"> · {{ stu.studentNo || '' }}</text></view>
              <input v-for="s in matrixSubjects" :key="s" class="m-cell m-score" type="digit"
                :value="matrix[stu.id] ? (matrix[stu.id][s] || '') : ''" placeholder="0"
                @input="(e) => onMatrixInput(stu.id, s, e.detail.value)" />
            </view>
          </view>
        </scroll-view>

        <view class="matrix-page" v-if="matrixStudents.length > matrixPageSize">
          <button class="pg-btn" :disabled="!matrixHasPrev" @click="matrixPage > 0 && matrixPage--">上一页</button>
          <text class="pg-info">{{ matrixPage + 1 }} / {{ Math.ceil(matrixStudents.length / matrixPageSize) }}（共 {{ matrixStudents.length }} 人）</text>
          <button class="pg-btn" :disabled="!matrixHasNext" @click="(matrixPage + 1) * matrixPageSize < matrixStudents.length && matrixPage++">下一页</button>
        </view>

        <button class="save" :disabled="savingAll" @click="saveAll">{{ savingAll ? '保存中…' : '💾 保存全部科目成绩' }}</button>
        <button class="imp" @click="showAllImport = !showAllImport">{{ showAllImport ? '收起导入' : '📥 批量导入全部科目' }}</button>

        <view v-if="showAllImport" class="import-box">
          <view class="imp-tip">矩阵文件：首行表头为「学号,姓名,科目1,科目2,…」，每行一个学生。科目列名需与本次考试的科目一致。可先下载模板。</view>
          <view class="imp-btns">
            <button class="pick" @click="pickAllFile">📂 选择文件</button>
            <button class="tpl" @click="downloadAllTemplate">📋 下载模板</button>
          </view>
          <view v-if="allPreview" class="preview">
            <view class="pv-sum">校验：<text class="ok">有效 {{ allPreview.validCount }}</text> · <text class="bad">异常 {{ allPreview.errorCount }}</text> / 共 {{ allPreview.total }} 单元格</view>
            <view v-if="allPreview.errorCount" class="pv-errs">
              <view v-for="(r, i) in allPreview.errors.slice(0, 8)" :key="i" class="pv-err">{{ r }}</view>
            </view>
            <button class="confirm" :disabled="!allPreview.validCount" @click="commitAll">确认导入 {{ allPreview.validCount }} 条</button>
          </view>
        </view>
      </block>
    </template>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import EmptyState from '@/components/EmptyState/EmptyState.vue'
import { isScore } from '../../../common/validators'
import {
  getGrades, saveGrade, mergeGrades, importGradesPreview, importGradesCommit,
  removeGrade as removeGradeApi,
} from '@/api/grades'
import { getTeacherSubjects } from '../../../common/subject-schema'
import { auth } from '../../../common/store'

const props = defineProps({
  mode: { type: String, default: 'single' },
  examId: { type: String, default: '' },
  examName: { type: String, default: '' },
  classId: { type: String, default: '' },
  date: { type: String, default: '' },
  subject: { type: String, default: '' },
  students: { type: Array, default: () => [] },
  scores: { type: Object, default: () => ({}) },
  existing: { type: Object, default: null },
  analysis: { type: Object, default: () => ({ avg: '-', max: '-', min: '-', passRate: 0, excellentRate: 0 }) },
  doneCount: { type: Number, default: 0 },
  filledCount: { type: Number, default: 0 },
  saving: { type: Boolean, default: false },
  exams: { type: Array, default: () => [] },
  matrixSubjects: { type: Array, default: () => [] },
  matrixStudents: { type: Array, default: () => [] },
  matrixSlice: { type: Array, default: () => [] },
  matrixPage: { type: Number, default: 0 },
  matrixPageSize: { type: Number, default: 20 },
  matrixHasPrev: { type: Boolean, default: false },
  matrixHasNext: { type: Boolean, default: false },
  matrix: { type: Object, default: () => ({}) },
  allFilledCount: { type: Number, default: 0 },
  allFilledSubjects: { type: Number, default: 0 },
  savingAll: { type: Boolean, default: false },
  showAllImport: { type: Boolean, default: false },
  allPreview: { type: Object, default: null },
})

const emit = defineEmits([
  'show-analysis', 'score-input', 'reload',
  'matrix-input', 'toggle-all-import',
])

const showImport = ref(false)
const preview = ref(null)

// 单科录入长列表虚拟滚动：分页 + scroll-view
const GRADE_PAGE_SIZE = 20
const gradePage = ref(1)
const gradeScrollTop = ref(0)
watch(() => props.students, () => { gradePage.value = 1; gradeScrollTop.value = 0 })
const gradeShownStudents = computed(() => props.students.slice(0, gradePage.value * GRADE_PAGE_SIZE))
const gradeHasMore = computed(() => gradeShownStudents.value.length < props.students.length)
function gradeLoadMore() {
  if (!gradeHasMore.value) return
  gradePage.value++
}

/* ===== 单科保存 ===== */
async function saveManual() {
  if (props.saving) return
  if (!props.classId || !props.examName || !props.subject)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  if (!props.date) return uni.showToast({ title: '请填写日期', icon: 'none' })
  const exam = props.exams.find((e) => e.id === props.examId)
  const fullScore = (exam && (exam.subjectFullScores || {})[props.subject]) || (exam && exam.fullScore) || 100
  const sc = []
  props.students.forEach((s) => {
    const v = (props.scores[s.id] || '').trim()
    if (v !== '') {
      const n = Number(v)
      if (isNaN(n)) return uni.showToast({ title: `${s.name} 分数不是数字`, icon: 'none' })
      if (!isScore(n, fullScore)) return uni.showToast({ title: `${s.name} 分数应为 0-${fullScore}`, icon: 'none' })
      sc.push({ studentId: s.id, score: n })
    }
  })
  if (!sc.length) return uni.showToast({ title: '请至少录入一个分数', icon: 'none' })
  emit('reload')
}

/* ===== 单科删除 ===== */
async function removeGrade() {
  if (!props.existing) return
  uni.showModal({
    title: '删除成绩',
    content: `确定删除「${props.examName}·${props.subject}」的成绩记录吗？`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…' })
      try {
        await removeGradeApi(props.existing.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        emit('reload')
      } catch (e) { uni.showToast({ title: '删除失败：' + (e.message || '请重试'), icon: 'none' }) }
      finally { uni.hideLoading() }
    },
  })
}

/* ===== 单科导入 ===== */
function downloadTemplate() {
  const header = '学号,姓名,分数'
  const rows = props.students.length ? props.students.map((s) => `${s.studentNo || ''},${s.name || ''},`) : []
  const csv = header + '\n' + rows.join('\n')
  uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: '模板已复制到剪贴板，可粘贴到 Excel', icon: 'none' }), fail: () => uni.showToast({ title: '复制失败', icon: 'none' }) })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: (r) => resolve(r.data), fail: reject })
  })
}

function pickFile() {
  if (!props.classId || !props.examName || !props.subject)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  uni.chooseMessageFile({
    count: 1, type: 'file', extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        const r = await importGradesPreview({ classId: props.classId, filename: f.name, data })
        preview.value = r
        if (!r.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      } catch (e) { uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' }) }
      finally { uni.hideLoading() }
    },
    fail: () => {},
  })
}

async function commit() {
  const rows = preview.value.rows.filter((r) => r.valid && r.studentId)
  if (!rows.length) return
  for (const r of rows) {
    if (!isScore(r.score, 100)) return uni.showToast({ title: `${r.name || ''} 分数应为 0-100`, icon: 'none' })
  }
  uni.showLoading({ title: '导入中…' })
  try {
    const r = await importGradesCommit({
      classId: props.classId, examName: props.examName, examId: props.examId,
      subject: props.subject, date: props.date, rows,
    })
    uni.showToast({ title: `成功导入 ${r.count} 条成绩`, icon: 'success' })
    preview.value = null; showImport.value = false
    emit('reload')
  } catch (e) { uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' }) }
  finally { uni.hideLoading() }
}

/* ===== 全部科目矩阵 ===== */
function clearAllGrades() {
  uni.showModal({
    title: '清空全部', content: '确定清空本次考试全部科目的录入内容？',
    success: (r) => { if (r.confirm) emit('reload') },
  })
}

function onMatrixInput(stuId, sub, val) { emit('matrix-input', { studentId: stuId, subject: sub, value: val }) }

function downloadAllTemplate() {
  const header = ['学号', '姓名'].concat(props.matrixSubjects)
  const rows = props.matrixStudents.length
    ? props.matrixStudents.map((s) => [s.studentNo || '', s.name || ''].concat(props.matrixSubjects.map(() => '')))
    : [['', ''].concat(props.matrixSubjects.map(() => ''))]
  const csv = header.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n')
  uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: '模板已复制到剪贴板，可粘贴到 Excel', icon: 'none' }) })
}

async function pickAllFile() {
  if (!props.examId) return uni.showToast({ title: '请先选择考试', icon: 'none' })
  uni.chooseMessageFile({
    count: 1, type: 'file', extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        emit('toggle-all-import')
      } catch (e) { uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' }) }
      finally { uni.hideLoading() }
    },
    fail: () => {},
  })
}

async function saveAll() { emit('reload') }
async function commitAll() { emit('reload') }

function showScoreCard(s) { emit('show-analysis') }
function shareStudent(s) { emit('share-student', s) }
</script>

<style scoped>
.exist { background: rgba(245,179,66,0.12); color: var(--c-primary); font-size: 26rpx; padding: 18rpx 24rpx; border-radius: 14rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.clear { color: var(--c-danger); font-size: 24rpx; }
.oview { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10rpx; margin-bottom: 16rpx; }
.ov2 { background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 4rpx; text-align: center; }
.ov2 .n { display: block; font-size: 30rpx; font-weight: 800; color: var(--c-accent); }
.ov2 .l { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.ana { background: var(--c-accent); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.prog { background: var(--c-card); border-radius: 16rpx; padding: 18rpx 26rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.prog-txt { font-size: 26rpx; color: var(--c-sub); display: block; margin-bottom: 10rpx; }
.prog-bar { height: 12rpx; background: var(--c-card2); border-radius: 6rpx; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, var(--c-accent), var(--c-primary)); border-radius: 6rpx; transition: width 0.3s; }
.grade-list-scroll { min-height: 300rpx; max-height: 55vh; overflow: hidden; margin-bottom: 14rpx; }
.load-more { text-align: center; color: var(--c-accent); padding: 24rpx 0; font-size: 26rpx; border-top: 1px solid var(--c-border); }
.load-more.end { color: var(--c-sub); }
.item { background: var(--c-card); border-radius: 16rpx; padding: 20rpx 26rpx; margin-bottom: 14rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.name { font-size: 30rpx; color: var(--c-title); }
.sno { font-size: 22rpx; color: var(--c-sub); font-weight: 400; }
.score { width: 220rpx; height: 80rpx; min-height: 80rpx; line-height: 44rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; text-align: center; font-size: 28rpx; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.share-stu { font-size: 28rpx; padding: 4rpx 10rpx; color: var(--c-blue); flex-shrink: 0; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.save[disabled] { opacity: 0.5; }
.imp { background: var(--c-blue); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.import-box { margin-top: 16rpx; background: var(--c-card2); border-radius: 20rpx; padding: 24rpx; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 14rpx; }
.imp-btns { display: flex; gap: 16rpx; }
.imp-btns .pick { flex: 1; }
.tpl { flex: 1; background: var(--c-accent); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.tpl:active { opacity: 0.6; }
.pick { background: var(--c-blue); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.preview { margin-top: 14rpx; border-top: 1px dashed var(--c-border); padding-top: 14rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.pv-errs { margin: 8rpx 0; }
.pv-err { font-size: 24rpx; color: var(--c-danger); line-height: 1.6; }
.confirm { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.confirm[disabled] { opacity: 0.5; }
.matrix-wrap { margin-top: 16rpx; background: var(--c-card); border-radius: 16rpx; padding: 8rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.matrix { display: inline-block; min-width: 100%; }
.m-head, .m-row { display: flex; align-items: stretch; }
.m-head { background: var(--c-card2); border-radius: 10rpx 10rpx 0 0; }
.m-cell { border: 1px solid var(--c-border); padding: 14rpx 10rpx; font-size: 24rpx; color: var(--c-title); box-sizing: border-box; }
.m-name { width: 200rpx; flex-shrink: 0; position: sticky; left: 0; background: var(--c-card); z-index: 2; display: flex; align-items: center; }
.m-subject { width: 150rpx; flex-shrink: 0; text-align: center; font-weight: 600; background: var(--c-card2); }
.m-score { width: 180rpx; flex-shrink: 0; text-align: center; }
.m-row .m-score { background: var(--c-input); }
.m-row .m-name { background: var(--c-card); }
.matrix-page { display: flex; align-items: center; justify-content: center; gap: 20rpx; margin-top: 16rpx; }
.pg-btn { font-size: 26rpx; padding: 12rpx 24rpx; background: var(--c-card); border: 1px solid var(--c-border); border-radius: 12rpx; }
.pg-btn[disabled] { opacity: 0.4; }
.pg-info { font-size: 24rpx; color: var(--c-sub); }
</style>
