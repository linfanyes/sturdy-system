<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="sel">
      <view class="field">
        <text class="label">班级 <text v-if="isHomeroom" class="role-tag homeroom">班主任</text><text v-if="sharedClass" class="role-tag shared">共享</text></text>
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
      <view class="field" v-if="semesterList.length">
        <text class="label">学期</text>
        <picker :range="semesterList" range-key="name" :value="semesterIdx" @change="onSemester">
          <view class="picker">{{ semesterList[semesterIdx]?.name || '全部' }}</view>
        </picker>
      </view>
    </view>

    <EmptyState v-if="!classId" icon="📊" text="请先选择班级" hint="选择一个班级后即可查看和录入成绩" />
    <view v-else-if="loadError" class="load-err" @tap="load">⚠️ 数据加载失败，点击重试</view>

    <block v-else>
      <!-- 模式切换：单科录入 / 全部科目录入 -->
      <view class="mode-tabs">
        <view :class="['mtab', mode === 'single' ? 'on' : '']" @click="setMode('single')">单科录入</view>
        <view :class="['mtab', mode === 'all' ? 'on' : '']" @click="setMode('all')">全部科目录入</view>
      </view>

      <template v-if="mode === 'single'">
      <view v-if="existing" class="exist">
        ✅ 已录入 {{ doneCount }} / {{ students.length }} 人（点击「保存」可更新）
        <text class="clear" @click="removeGrade">删除该成绩</text>
      </view>
      <view v-if="existing" class="exp-row">
        <text class="exp-csv" @click="exportCsv">📋 导出 CSV</text>
        <text class="exp-rank" @click="exportRank">🏆 导出名次表</text>
        <text class="exp-share" @click="shareAll">📤 分享全部</text>
        <text class="exp-csv" @click="aiAnalyze">🤖 AI 分析</text>
        <text class="exp-rank" @click="aiDiagnose">🔍 学生诊断</text>
      </view>
      <view v-if="existing" class="oview">
        <view class="ov2"><text class="n">{{ analysis.avg }}</text><text class="l">平均分</text></view>
        <view class="ov2"><text class="n" style="color:var(--c-primary)">{{ analysis.passRate }}%</text><text class="l">及格率</text></view>
        <view class="ov2"><text class="n" style="color:var(--c-accent)">{{ analysis.excellentRate }}%</text><text class="l">优秀率</text></view>
        <view class="ov2"><text class="n">{{ analysis.max }}</text><text class="l">最高</text></view>
        <view class="ov2"><text class="n">{{ analysis.min }}</text><text class="l">最低</text></view>
      </view>
      <button v-if="existing" class="ana" @click="showAnalysis = true">📈 综合分析</button>

      <view v-if="students.length" class="prog">
        <text class="prog-txt">已录入 {{ filledCount }} / {{ students.length }}</text>
        <view class="prog-bar">
          <view class="prog-fill" :style="{ width: students.length ? (filledCount / students.length * 100) + '%' : '0%' }"></view>
        </view>
      </view>

      <view class="list">
        <view v-for="s in students" :key="s.id" class="item">
          <text class="name" @click="showScoreCard(s)">{{ s.name }}<text class="sno"> · {{ s.studentNo || '' }}</text></text>
          <input
            class="score"
            type="digit"
            :value="scores[s.id] || ''"
            placeholder="请录入分数"
            @input="(e) => (scores[s.id] = e.detail.value)"
          />
          <text v-if="existing && scores[s.id] != null && scores[s.id] !== ''" class="share-stu" @click.stop="shareStudent(s)">📤</text>
        </view>
        <EmptyState v-if="!students.length" icon="📊" text="该班级还没有学生" hint="请先在「学生管理」添加" />
      </view>

      <button class="save" :disabled="saving" @click="saveManual">{{ saving ? '保存中…' : '💾 保存成绩' }}</button>
      <button class="imp" @click="showImport = !showImport">{{ showImport ? '收起导入' : '📥 批量导入成绩' }}</button>

      <view v-if="showImport" class="import-box">
        <view class="imp-tip">先选好上方「班级/考试/科目/日期」，再导入 Excel/TXT（列：学号或姓名, 分数）。</view>
        <view class="imp-btns">
          <button class="pick" @click="pickFile">📂 选择文件</button>
          <button class="tpl" @click="downloadTemplate">📋 下载模板</button>
        </view>

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
      </template>

      <!-- 全部科目录入 / 全部科目导入 -->
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
                <input
                  v-for="s in matrixSubjects"
                  :key="s"
                  class="m-cell m-score"
                  type="digit"
                  :value="matrix[stu.id] ? (matrix[stu.id][s] || '') : ''"
                  placeholder="0"
                  @input="(e) => onMatrixInput(stu.id, s, e.detail.value)"
                />
              </view>
            </view>
          </scroll-view>

          <view class="matrix-page" v-if="matrixStudents.length > MATRIX_PAGE_SIZE">
            <button class="pg-btn" :disabled="!matrixHasPrev" @click="matrixPrev">上一页</button>
            <text class="pg-info">{{ matrixPage + 1 }} / {{ Math.ceil(matrixStudents.length / MATRIX_PAGE_SIZE) }}（共 {{ matrixStudents.length }} 人）</text>
            <button class="pg-btn" :disabled="!matrixHasNext" @click="matrixNext">下一页</button>
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
    </block>

    <view v-if="showAnalysis" class="mask" @click="showAnalysis = false">
      <view class="modal" @click.stop>
        <view class="m-h">{{ examName }} · {{ subject }} 综合分析</view>

        <view class="stat-grid">
          <view class="st"><view class="st-n">{{ analysis.avg }}</view><view class="st-l">平均分</view></view>
          <view class="st"><view class="st-n">{{ analysis.max }}</view><view class="st-l">最高分</view></view>
          <view class="st"><view class="st-n">{{ analysis.min }}</view><view class="st-l">最低分</view></view>
          <view class="st"><view class="st-n">{{ analysis.median }}</view><view class="st-l">中位数</view></view>
          <view class="st"><view class="st-n" style="color:var(--c-primary)">{{ analysis.passRate }}%</view><view class="st-l">及格率</view></view>
          <view class="st"><view class="st-n" style="color:var(--c-accent)">{{ analysis.excellentRate }}%</view><view class="st-l">优秀率</view></view>
        </view>

        <view class="dist">
          <view class="dh">分数段分布（每 10 分一段）</view>
          <!-- 10 段垂直柱状图：对齐 web 端 GradeManage.vue 的分布柱状图 -->
          <view class="bar-chart">
            <view v-for="(d, i) in analysis.dist" :key="i" class="bar-col">
              <text class="bar-num">{{ d.count }}</text>
              <view class="bar-track">
                <view
                  class="bar-fill"
                  :class="'bar-c' + d.colorIdx"
                  :style="{ height: (d.heightPct || 4) + '%' }"
                ></view>
              </view>
              <text class="bar-label">{{ d.label }}</text>
              <text class="bar-pct">{{ d.pct }}%</text>
            </view>
          </view>
          <view class="bar-legend">
            <view class="lg-item"><view class="lg-c bar-c0"></view><text>极低/不及格 (&lt;60)</text></view>
    <view class="lg-item"><view class="lg-c bar-c1"></view><text>及格 (60-69)</text></view>
    <view class="lg-item"><view class="lg-c bar-c2"></view><text>良好 (70-89)</text></view>
            <view class="lg-item"><view class="lg-c bar-c3"></view><text>优秀 (90+)</text></view>
          </view>
        </view>

        <!-- P1-3: 各科对比雷达图（维度：均分/及格率/优秀率/最高/最低） -->
        <view class="radar" v-if="radarData.subjects.length">
          <view class="dh">📊 各科对比雷达图</view>
          <canvas canvas-id="radarChart" id="radarChart" class="radar-cv"></canvas>
          <view class="radar-legend">
            <view v-for="(s, i) in radarData.subjects" :key="s.name" class="rl-item">
              <view class="rl-c" :style="{ background: radarData.colors[i % radarData.colors.length] }"></view>
              <text>{{ s.name }}</text>
            </view>
          </view>
        </view>

        <view class="rank" v-if="analysis.rank.length">
          <view class="rh">名次（前 20）</view>
          <view v-for="(r, i) in analysis.rank.slice(0, 20)" :key="r.id" class="rk">
            <text class="rk-no">{{ i + 1 }}</text>
            <text class="rk-n">{{ r.name }}</text>
            <text class="rk-s">{{ r.score }}</text>
          </view>
        </view>

        <button class="m-close" @click="showAnalysis = false">关闭</button>
      </view>
    </view>

    <!-- 学生成绩单 -->
    <view class="mask" v-if="scoreCard" @click="scoreCard = null">
      <view class="card" @click.stop>
        <view class="card-h">{{ scoreCard.className }} · {{ scoreCard.examName }}</view>
        <view class="card-stu">学生：{{ scoreCard.studentName }}<text v-if="scoreCard.rank" class="card-rank"> · 总分排名第 {{ scoreCard.rank }} 名</text></view>
        <view v-for="(row, i) in scoreCard.subjects" :key="i" class="card-row">
          <text class="c-subject">{{ row.subject }}</text>
          <text class="c-score">{{ row.score }}<text class="c-unit">分</text></text>
          <text class="c-full">满分 {{ row.fullScore }}</text>
          <text class="c-rank">第{{ row.rank }}/{{ row.totalCount }}名</text>
          <text class="c-avg">均分 {{ row.avg }}</text>
        </view>
        <view class="card-total" v-if="scoreCard.totalScore != null">
          总分：<text class="c-total-val">{{ scoreCard.totalScore }}</text> / {{ scoreCard.totalFull }}
        </view>
        <view class="card-btns">
          <button class="card-copy" @click="copyScoreCard">📋 复制成绩单</button>
          <button class="card-history" @click="goStudentGrades">📈 历次成绩</button>
          <button class="card-close" @click="scoreCard = null">关闭</button>
        </view>
      </view>
    </view>
  </view>

  <view class="aimask" v-if="aiResult" @click="aiResult=''">
    <view class="aisheet" @click.stop>
      <view class="ait">{{ aiTitle }}</view>
      <scroll-view scroll-y class="aibody">{{ aiResult }}</scroll-view>
      <view class="aiclose" @click="aiResult=''">关闭</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme } from '../../common/store'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import { isScore } from '../../common/validators'
import { copyText } from '../../common/print'
import { exportXlsx } from '../../common/exporter'

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
const semesterList = ref([])
const semesterIdx = ref(0)
function onSemester(e) { semesterIdx.value = e.detail.value; load() }
const scores = reactive({})
const existing = ref(null)
const aiResult = ref('')
const aiTitle = ref('')
const doneCount = ref(0)
const scoreCard = ref(null)  // 学生成绩单弹窗

/** 实时已录入人数（基于当前 scores 填写情况） */
const filledCount = computed(() => {
  let n = 0
  for (const s of students.value) {
    const v = (scores[s.id] || '').toString().trim()
    if (v !== '') n++
  }
  return n
})

const showImport = ref(false)
const preview = ref(null)
const showAnalysis = ref(false)
const saving = ref(false)
const loadError = ref(false)

// ===== 全部科目录入 / 全部科目导入 =====
const mode = ref('single') // 'single' | 'all'
const matrixSubjects = ref([]) // 本次考试的科目列表（矩阵的列）
const matrixStudents = ref([]) // 学生列表（矩阵的行）
const matrixPage = ref(0) // 当前录入页（每页 20 行）
const MATRIX_PAGE_SIZE = 20
const matrix = reactive({}) // { [studentId]: { [subject]: scoreString } }
const savingAll = ref(false)
const showAllImport = ref(false)
const allPreview = ref(null)
const matrixSlice = computed(() => {
  const start = matrixPage.value * MATRIX_PAGE_SIZE
  return matrixStudents.value.slice(start, start + MATRIX_PAGE_SIZE)
})
const matrixHasPrev = computed(() => matrixPage.value > 0)
const matrixHasNext = computed(() => (matrixPage.value + 1) * MATRIX_PAGE_SIZE < matrixStudents.value.length)

function setMode(m) {
  mode.value = m
  matrixPage.value = 0
  if (m === 'all') buildMatrix()
}
function matrixPrev() { if (matrixHasPrev.value) matrixPage.value-- }
function matrixNext() { if (matrixHasNext.value) matrixPage.value++ }

/** 构建全部科目矩阵（行=学生，列=考试科目），并预填已有成绩 */
function buildMatrix() {
  if (!students.value.length || !examName.value) return
  const exam = exams.value.find((e) => e.id === examId.value)
  const subs = (exam && exam.subjects && exam.subjects.length ? exam.subjects : pubSubjects.value)
  matrixSubjects.value = subs
  matrixStudents.value = students.value
  for (const k in matrix) delete matrix[k]
  students.value.forEach((s) => { matrix[s.id] = {} })
  // 预填：遍历本次考试该班所有科目的成绩记录
  grades.value
    .filter((g) => g.classId === classId.value && g.examName === examName.value)
    .forEach((g) => {
      ;(g.scores || []).forEach((x) => {
        if (matrix[x.studentId]) matrix[x.studentId][g.subject] = String(x.score)
      })
    })
}

const allFilledCount = computed(() => {
  let n = 0
  matrixSlice.value.forEach((s) => {
    matrixSubjects.value.forEach((sub) => {
      const v = ((matrix[s.id] && matrix[s.id][sub]) || '').toString().trim()
      if (v !== '') n++
    })
  })
  return n
})
const allFilledSubjects = computed(() => {
  let n = 0
  matrixSubjects.value.forEach((sub) => {
    const has = matrixSlice.value.some((s) => {
      const v = ((matrix[s.id] && matrix[s.id][sub]) || '').toString().trim()
      return v !== ''
    })
    if (has) n++
  })
  return n
})

function onMatrixInput(stuId, sub, val) {
  if (!matrix[stuId]) matrix[stuId] = {}
  matrix[stuId][sub] = val
}

function clearAllGrades() {
  uni.showModal({
    title: '清空全部',
    content: '确定清空本次考试全部科目的录入内容？',
    success: (r) => { if (r.confirm) matrixStudents.value.forEach((s) => { matrix[s.id] = {} }) },
  })
}

/** 逐科保存：把矩阵按科目拆成 rows，分别调 import-commit（后端按 班级+考试+科目 upsert，安全可重导） */
async function saveAll() {
  if (savingAll.value) return
  if (!matrixSubjects.value.length) return uni.showToast({ title: '没有可保存的科目', icon: 'none' })
  const exam = exams.value.find((e) => e.id === examId.value)
  const fullScore = (exam && exam.fullScore) || 100
  const slice = matrixSlice.value
  for (const s of slice) {
    for (const sub of matrixSubjects.value) {
      const v = ((matrix[s.id] && matrix[s.id][sub]) || '').trim()
      if (v === '') continue
      const n = Number(v)
      if (isNaN(n)) return uni.showToast({ title: `${s.name}·${sub} 分数不是数字`, icon: 'none' })
      if (!isScore(n, fullScore)) return uni.showToast({ title: `${s.name}·${sub} 分数应为 0-${fullScore}`, icon: 'none' })
    }
  }
  savingAll.value = true
  uni.showLoading({ title: '保存中…', mask: true })
  try {
    let done = 0
    for (const sub of matrixSubjects.value) {
      const rows = []
      slice.forEach((s) => {
        const v = ((matrix[s.id] && matrix[s.id][sub]) || '').trim()
        if (v !== '') rows.push({ studentId: s.id, score: Number(v) })
      })
      if (!rows.length) continue
      await api.post('/grades/import-commit', {
        classId: classId.value, examName: examName.value, examId: examId.value,
        subject: sub, date: date.value, rows,
      })
      done++
    }
    uni.showToast({ title: `已保存 ${done} 个科目`, icon: 'success' })
    grades.value = await api.get('/grades')
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingAll.value = false
    uni.hideLoading()
  }
}

function downloadAllTemplate() {
  const header = ['学号', '姓名', ...matrixSubjects.value]
  const rows = matrixStudents.value.length
    ? matrixStudents.value.map((s) => [s.studentNo || '', s.name || '', ...matrixSubjects.value.map(() => '')])
    : [['', '', ...matrixSubjects.value.map(() => '')]]
  const csv = header.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n')
  uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: '模板已复制到剪贴板，可粘贴到 Excel', icon: 'none' }) })
}

/** 解析矩阵文件：表头 学号,姓名,科目1,科目2,...；按科目拆分并校验 */
async function pickAllFile() {
  if (!examId.value) return uni.showToast({ title: '请先选择考试', icon: 'none' })
  uni.chooseMessageFile({
    count: 1, type: 'file', extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        const parsed = parseMatrixCsv(data)
        if (!parsed) return
        allPreview.value = parsed
        if (!parsed.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => {},
  })
}

/** 解析矩阵 CSV（base64 文本），返回 { validCount, errorCount, total, errors, bySubject, subjectCols } */
function parseMatrixCsv(base64) {
  let text = ''
  try { text = decodeURIComponent(escape(atob(base64))) } catch { return null }
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) { uni.showToast({ title: '文件为空或缺少数据行', icon: 'none' }); return null }
  const header = lines[0].split(',').map((h) => h.trim())
  const subjectCols = header.slice(2)
  if (!subjectCols.length) { uni.showToast({ title: '表头缺少科目列', icon: 'none' }); return null }
  const byNo = {}; const byName = {}
  students.value.forEach((s) => { if (s.studentNo) byNo[s.studentNo] = s; if (s.name) byName[s.name] = s })
  const bySubject = {}
  subjectCols.forEach((sub) => { bySubject[sub] = [] })
  let validCount = 0; let errorCount = 0; const errors = []; let total = 0
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const no = (cols[0] || '').trim(); const name = (cols[1] || '').trim()
    const stu = byNo[no] || byName[name]
    if (!stu) { errors.push(`第${i + 1}行：${name || no || '(空)'} 未匹配到学生`); errorCount++; continue }
    subjectCols.forEach((sub, idx) => {
      const raw = (cols[idx + 2] || '').trim()
      if (raw === '') return
      total++
      const n = Number(raw)
      if (isNaN(n) || n < 0 || n > 1000) { errors.push(`${name}·${sub}：分数无效`); errorCount++; return }
      bySubject[sub].push({ studentId: stu.id, score: n, valid: true }); validCount++
    })
  }
  return { validCount, errorCount, total, errors, bySubject, subjectCols }
}

async function commitAll() {
  const p = allPreview.value
  if (!p || !p.validCount) return
  const exam = exams.value.find((e) => e.id === examId.value)
  uni.showLoading({ title: '导入中…' })
  try {
    let done = 0
    for (const sub of p.subjectCols) {
      const rows = (p.bySubject[sub] || []).filter((r) => r.valid)
      if (!rows.length) continue
      await api.post('/grades/import-commit', {
        classId: classId.value, examName: examName.value, examId: examId.value,
        subject: sub, date: date.value, rows,
      })
      done++
    }
    uni.showToast({ title: `成功导入 ${done} 个科目`, icon: 'success' })
    allPreview.value = null
    showAllImport.value = false
    grades.value = await api.get('/grades')
    buildMatrix()
  } catch (e) {
    uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const analysis = computed(() => {
  const empty = { avg: '-', max: '-', min: '-', median: '-', passRate: 0, excellentRate: 0, segs: [], rank: [], dist: [], distMax: 1, count: 0 }
  if (!existing.value) return empty
  const all = (existing.value.scores || []).filter((x) => x.score != null)
  const sc = all.map((x) => Number(x.score))
  if (!sc.length) return empty
  const sorted = [...sc].sort((a, b) => a - b)
  const avg = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1)
  const max = Math.max(...sc)
  const min = Math.min(...sc)
  const mid = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : ((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1)
  const fs1 = existing.value.fullScore || 100
  const passLine1 = fs1 * 0.6
  const excLine1 = fs1 * 0.85
  const pass = sc.filter((s) => s >= passLine1).length
  const excellent = sc.filter((s) => s >= excLine1).length
  const passRate = Math.round((pass / sc.length) * 100)
  const excellentRate = Math.round((excellent / sc.length) * 100)
  // 5 段汇总分布（兼容旧 UI：综合分析弹层下方的水平分布条）
  const segments = [
    { label: '<60', min: 0, max: 59.999 },
    { label: '60-69', min: 60, max: 69.999 },
    { label: '70-79', min: 70, max: 79.999 },
    { label: '80-89', min: 80, max: 89.999 },
    { label: '90-100', min: 90, max: 100 },
  ]
  const segs = segments.map((s) => {
    const c = sc.filter((x) => x >= s.min && x <= s.max).length
    return { label: s.label, count: c, pct: Math.round((c / sc.length) * 100) }
  })
  // 10 段细分分布（对齐 web 端 GradeManage.vue：每 10 分一段，垂直柱状图）
  const bands = 10
  const distLabels = []
  for (let b = 0; b < bands; b++) {
    const lo = b * 10
    const hi = (b + 1) * 10
    distLabels.push(b === bands - 1 ? `${lo}-${hi}` : `${lo}-${hi - 1}`)
  }
  const dist = new Array(bands).fill(0)
  sc.forEach((n) => {
    let idx = Math.floor(n / 10)
    if (idx < 0) idx = 0
    if (idx > bands - 1) idx = bands - 1
    dist[idx]++
  })
  const distMax = Math.max(...dist, 1)
  const distWithMeta = dist.map((c, i) => ({
    label: distLabels[i],
    count: c,
    pct: Math.round((c / sc.length) * 100),
    // 4 色梯度：极低(红)/待提高(黄)/中等(绿)/优秀(蓝)
    colorIdx: i < 6 ? 0 : i === 6 ? 1 : i < 9 ? 2 : 3,
    heightPct: Math.round((c / distMax) * 100),
  }))
  const nameMap = {}
  students.value.forEach((s) => (nameMap[s.id] = s.name))
  const rank = all
    .map((x) => ({ id: x.studentId, name: nameMap[x.studentId] || '—', score: x.score }))
    .sort((a, b) => b.score - a.score)
  return { avg, max, min, median: Number(mid), passRate, excellentRate, segs, rank, dist: distWithMeta, distMax, count: sc.length }
})

// P1-3: 各科雷达图数据 - 取当前班级、当前考试所有已录入成绩的科目，每科 5 维
const RADAR_COLORS = ['#e6a23c', '#07c160', '#409eff', '#e06c75', '#9b59b6', '#1abc9c', '#f39c12', '#34495e']
const radarData = computed(() => {
  const result = { subjects: [], colors: RADAR_COLORS }
  if (!existing.value || !examName.value || !classId.value) return result
  const list = grades.value.filter(
    (g) => g.classId === classId.value && g.examName === examName.value,
  )
  list.forEach((g) => {
    const sc = (g.scores || []).map((x) => Number(x.score)).filter((n) => !isNaN(n))
    if (!sc.length) return
    const fs2 = g.fullScore || 100
    const passLine2 = fs2 * 0.6
    const excLine2 = fs2 * 0.85
    const pass = sc.filter((s) => s >= passLine2).length
    const excellent = sc.filter((s) => s >= excLine2).length
    result.subjects.push({
      name: g.subject || '—',
      avg: +(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1),
      passRate: Math.round((pass / sc.length) * 100),
      excellentRate: Math.round((excellent / sc.length) * 100),
      max: Math.max(...sc),
      min: Math.min(...sc),
    })
  })
  return result
})

function hexToRgba(hex, alpha) {
  const h = (hex || '#999').replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) || 0
  const g = parseInt(h.substring(2, 4), 16) || 0
  const b = parseInt(h.substring(4, 6), 16) || 0
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

function renderRadar() {
  const data = radarData.value
  if (!data.subjects.length) return
  const ctx = uni.createCanvasContext('radarChart')
  const W = 300
  const H = 300
  const cx = W / 2
  const cy = H / 2
  const R = 100
  const dims = ['均分', '及格率', '优秀率', '最高', '最低']
  const n = dims.length
  // 网格 5 圈
  ctx.setStrokeStyle('#dcdfe6')
  ctx.setLineWidth(1)
  for (let k = 1; k <= 5; k++) {
    const r = (R * k) / 5
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  // 轴线
  ctx.setStrokeStyle('#e4e7ed')
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a))
    ctx.stroke()
  }
  // 维度标签
  ctx.setFillStyle('#909399')
  ctx.setFontSize(11)
  ctx.setTextAlign('center')
  ctx.setTextBaseline('middle')
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const lx = cx + (R + 18) * Math.cos(a)
    const ly = cy + (R + 18) * Math.sin(a)
    ctx.fillText(dims[i], lx, ly)
  }
  // 数据多边形
  data.subjects.forEach((s, idx) => {
    const vals = [s.avg, s.passRate, s.excellentRate, s.max, s.min]
    const color = data.colors[idx % data.colors.length]
    ctx.setStrokeStyle(color)
    ctx.setFillStyle(hexToRgba(color, 0.15))
    ctx.setLineWidth(2)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, vals[i])) / 100
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * v * Math.cos(a)
      const y = cy + R * v * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // 顶点
    ctx.setFillStyle(color)
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, vals[i])) / 100
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * v * Math.cos(a)
      const y = cy + R * v * Math.sin(a)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }
  })
  ctx.draw()
}

watch(showAnalysis, (v) => {
  if (v) {
    nextTick(() => {
      setTimeout(renderRadar, 120)
    })
  }
})

const classOpts = ref([])
const examOpts = ref([])
const subjectOpts = ref([])
const isHomeroom = ref(false)
const sharedClass = ref(false)

async function load() {
  loadError.value = false
  try {
    const [cs, es, pub, gs, semesters] = await Promise.all([
      api.getList('/classes', { silent: true }),
      api.getList('/exams', { silent: true }),
      api.get('/config/public'),
      api.getList('/grades', { loading: true, loadingText: '加载成绩' }),
      api.get('/semesters').catch(() => []),
    ])
    classes.value = cs
    exams.value = es
    pubSubjects.value = (pub && pub.defaultSubjects) || []
    grades.value = gs
    semesterList.value = Array.isArray(semesters) ? semesters : (semesters?.items || [])
    classOpts.value = cs.map((c) => c.name)
    rebuildExamOpts()
  } catch (e) {
    loadError.value = true
  }
}

onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

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
  // 判断是否班主任 / 共享班级
  isHomeroom.value = c.headTeacher === (auth.user?.name || '')
  sharedClass.value = !isHomeroom.value && (c.teachers || []).some(t => t.name === (auth.user?.name || '') || t === (auth.user?.name || ''))
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
  let availableSubjects = chosen.subjects && chosen.subjects.length ? chosen.subjects : pubSubjects.value
  // 科任老师只能看到自己教的科目
  if (!isHomeroom.value) {
    const mySubjects = auth.user?.subjects || []
    if (mySubjects.length) {
      availableSubjects = availableSubjects.filter(s => mySubjects.includes(s))
    }
  }
  subjectOpts.value = availableSubjects
  subjectIdx.value = subjectOpts.value.length ? 0 : -1
  subject.value = subjectOpts.value[0] || ''
  date.value = chosen.date || date.value
  await checkExisting()
  if (mode.value === 'all') nextTick(buildMatrix)
}

function onSubject(e) {
  subjectIdx.value = +e.detail.value
  subject.value = subjectOpts.value[subjectIdx.value]
  checkExisting()
}

async function loadStudents() {
  // 服务端按 classId 过滤，避免拉全量再前端 filter
  students.value = await api.getList('/students?classId=' + encodeURIComponent(classId.value), { silent: true })
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
  if (saving.value) return
  if (!classId.value || !examName.value || !subject.value)
    return uni.showToast({ title: '请先选择班级/考试/科目', icon: 'none' })
  if (!date.value) return uni.showToast({ title: '请填写日期', icon: 'none' })
  // 获取本次考试该科目的满分
  const exam = exams.value.find((e) => e.id === examId.value)
  const fullScore = (exam && (exam.subjectFullScores || {})[subject.value]) || (exam && exam.fullScore) || 100
  const sc = []
  students.value.forEach((s) => {
    const v = (scores[s.id] || '').trim()
    if (v !== '') {
      const n = Number(v)
      if (isNaN(n)) return uni.showToast({ title: `${s.name} 分数不是数字`, icon: 'none' })
      if (!isScore(n, fullScore)) return uni.showToast({ title: `${s.name} 分数应为 0-${fullScore}`, icon: 'none' })
      sc.push({ studentId: s.id, score: n })
    }
  })
  if (!sc.length) return uni.showToast({ title: '请至少录入一个分数', icon: 'none' })
  saving.value = true
  uni.showLoading({ title: '保存中…', mask: true })
  try {
    const r = await api.post('/grades/merge', {
      classId: classId.value,
      examName: examName.value,
      examId: examId.value,
      subject: subject.value,
      date: date.value,
      fullScore,
      scores: sc,
    })
    uni.showToast({ title: r.created ? '成绩已创建' : '成绩已更新', icon: 'success' })
    grades.value = await api.get('/grades')
    checkExisting()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    saving.value = false
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
      uni.showLoading({ title: '删除中…' })
      try {
        await api.del('/grades/' + existing.value.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        grades.value = await api.get('/grades')
        existing.value = null
        for (const k in scores) delete scores[k]
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || '请重试'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

// 导出 CSV：含学号、姓名、性别、班级、考试、科目、日期、分数
function exportCsv() {
  if (!existing.value || !students.value.length) {
    return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  }
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const scoreMap = {}
  ;(existing.value.scores || []).forEach((x) => (scoreMap[x.studentId] = x.score))
  const header = ['学号', '姓名', '性别', '班级', '考试', '科目', '日期', '分数']
  const rows = students.value.map((s) => [
    s.studentNo || '', s.name, s.gender || '', className, examName.value, subject.value, date.value,
    scoreMap[s.id] != null ? String(scoreMap[s.id]) : '',
  ])
  exportXlsx(header, rows, className + '_' + examName.value + '_' + subject.value, '成绩')
}

// 导出名次表：按分数倒序，附名次、平均/及格率等统计
function exportRank() {
  if (!existing.value || !students.value.length) {
    return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  }
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const scoreMap = {}
  ;(existing.value.scores || []).forEach((x) => (scoreMap[x.studentId] = x.score))
  const rows = students.value
    .map((s) => ({ name: s.name, studentNo: s.studentNo || '', score: scoreMap[s.id] }))
    .filter((r) => r.score != null)
    .sort((a, b) => b.score - a.score)
  if (!rows.length) return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  const a = analysis.value
  const header = ['名次', '姓名', '学号', '分数']
  const data = rows.map((r, i) => [String(i + 1), r.name, r.studentNo, String(r.score)])
  // 附统计信息
  const summaryHeader = ['', '班级', className, '考试', examName.value, '科目', subject.value, '日期', date.value]
  const summaryRow1 = ['', '应考', String(students.value.length), '实考', String(rows.length), '平均', String(a.avg), '最高', String(a.max)]
  const summaryRow2 = ['', '最低', String(a.min), '及格率', a.passRate + '%', '优秀率', a.excellentRate + '%', '', '']
  exportXlsx(summaryHeader, [summaryRow1, summaryRow2, header, ...data], className + '_名次_' + subject.value, '名次表')
}

/** 下载/复制 CSV 导入模板到剪贴板（小程序文件下载受限，改用剪贴板） */
function downloadTemplate() {
  const header = '学号,姓名,分数'
  const rows = students.value.length
    ? students.value.map((s) => `${s.studentNo || ''},${s.name || ''},`)
    : []
  const csv = header + '\n' + rows.join('\n')
  uni.setClipboardData({
    data: csv,
    success: () => uni.showToast({ title: '模板已复制到剪贴板，可粘贴到 Excel', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
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
  for (const r of rows) {
    if (!isScore(r.score, 100)) return uni.showToast({ title: `${r.name || ''} 分数应为 0-100`, icon: 'none' })
  }
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

// 学生成绩单弹窗
function showScoreCard(s) {
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const allSubjects = grades.value.filter((g) => g.examName === examName.value && g.classId === classId.value)
  let totalScore = 0; let totalFull = 0; let totalCount = 0
  const exam = exams.value.find((e) => e.id === examId.value)
  const subjects = allSubjects.map((g) => {
    const sc = (g.scores || []).find((x) => x.studentId === s.id)
    const score = sc && sc.score != null ? Number(sc.score) : null
    const fullScore = g.fullScore || (exam && (exam.subjectFullScores || {})[g.subject]) || (exam && exam.fullScore) || 100
    if (score != null) { totalScore += score; totalFull += fullScore; totalCount++ }
    const allSc = (g.scores || []).filter((x) => x.score != null).map((x) => Number(x.score))
    const avg = allSc.length ? (allSc.reduce((a, b) => a + b, 0) / allSc.length).toFixed(1) : '—'
    // 该科目排名
    const ranked = allSc.slice().sort((a, b) => b - a)
    const rank = score != null ? ranked.indexOf(score) + 1 : '—'
    return { subject: g.subject, score: score != null ? Math.round(score * 10) / 10 : '—', fullScore, avg, rank, totalCount: allSc.length }
  })
  // 总分排名
  const allStudents = students.value.map((stu) => {
    let total = 0
    allSubjects.forEach((g) => {
      const sc = (g.scores || []).find((x) => x.studentId === stu.id)
      if (sc && sc.score != null) total += Number(sc.score)
    })
    return { id: stu.id, total: Math.round(total * 10) / 10 }
  }).sort((a, b) => b.total - a.total)
  const rank = allStudents.findIndex((x) => x.id === s.id) + 1
  scoreCard.value = { className, examName: examName.value, studentName: s.name, subjects, totalScore: Math.round(totalScore * 10) / 10, totalFull, rank, studentId: s.id }
}
function copyScoreCard() {
  const c = scoreCard.value
  if (!c) return
  const lines = c.subjects.map((r) => `  ${r.subject}：${r.score} 分（满分 ${r.fullScore}，${r.avg} 均分，第 ${r.rank}/${r.totalCount} 名）`)
  const text = `📚 ${c.className} · ${c.examName}\n学生：${c.studentName}${c.rank ? ' · 第' + c.rank + '名' : ''}\n${lines.join('\n')}\n总分：${c.totalScore} / ${c.totalFull}`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '成绩单已复制', icon: 'success' }), fail: () => uni.showToast({ title: '复制失败', icon: 'none' }) })
}

function goStudentGrades() {
  const c = scoreCard.value
  if (!c || !c.studentId) return
  scoreCard.value = null
  uni.navigateTo({ url: '/pages/teaching/student-grades?studentId=' + encodeURIComponent(c.studentId) + '&classId=' + encodeURIComponent(classId.value || '') })
}

// 分享单个学生全部科目成绩到微信
function shareStudent(s) {
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  // 获取本次考试所有科目的该生成绩
  const allSubjects = grades.value.filter((g) => g.examName === examName.value)
  const lines = allSubjects.map((g) => {
    const sc = (g.scores || []).find((x) => x.studentId === s.id)
    const score = sc && sc.score != null ? sc.score : '—'
    // 该科目班级均分
    const allSc = (g.scores || []).filter((x) => x.score != null).map((x) => Number(x.score))
    const avg = allSc.length > 0 ? (allSc.reduce((a, b) => a + b, 0) / allSc.length).toFixed(1) : '—'
    return `${g.subject}：${score}分（班级均分 ${avg}）`
  })
  const text = `📚 ${className} · ${examName.value}\n学生：${s.name}\n${lines.join('\n')}\n\n以上成绩由「园丁工作台」生成，供家长参考。`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制所有科目成绩，可粘贴到微信', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

// 分享全部学生全部科目成绩到微信
function shareAll() {
  if (!existing.value || !students.value.length) return
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  // 获取本次考试所有科目
  const allSubjects = grades.value.filter((g) => g.examName === examName.value)
  // 每个学生汇总所有科目
  const lines = students.value.map((s) => {
    const subs = allSubjects.map((g) => {
      const sc = (g.scores || []).find((x) => x.studentId === s.id)
      return sc && sc.score != null ? `${g.subject}:${sc.score}` : ''
    }).filter(Boolean).join(' · ')
    return `${s.name}：${subs || '无成绩'}`
  })
  // 各科统计
  const stats = allSubjects.map((g) => {
    const allSc = (g.scores || []).filter((x) => x.score != null).map((x) => Number(x.score))
    if (!allSc.length) return ''
    const avg = (allSc.reduce((a, b) => a + b, 0) / allSc.length).toFixed(1)
    const max = Math.max(...allSc)
    const min = Math.min(...allSc)
    return `${g.subject}：均分${avg} 最高${max} 最低${min}`
  }).filter(Boolean).join('\n')
  const text = `📚 ${className} · ${examName.value}\n\n${lines.join('\n')}\n\n${stats}\n\n由「园丁工作台」生成`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制全班多科成绩，可粘贴到微信群', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

async function aiAnalyze() {
  const exam = exams.value[examIdx.value]
  if (!exam || !exam.id) return uni.showToast({ title: '请先选择考试', icon: 'none' })
  aiTitle.value = `AI 分析：${exam.name}`
  aiResult.value = '分析中…'
  try {
    const r = await api.post('/ai/analyze-exam', { examId: exam.id })
    aiResult.value = r.content || '未返回分析结果'
  } catch (e) {
    aiResult.value = '分析失败，请检查 AI 配置'
  }
}

async function aiDiagnose() {
  const names = students.value.map((s) => s.name)
  if (!names.length) return uni.showToast({ title: '暂无学生', icon: 'none' })
  uni.showActionSheet({
    itemList: names,
    success: async (r) => {
      const s = students.value[r.tapIndex]
      aiTitle.value = `学情诊断：${s.name}`
      aiResult.value = '诊断中…'
      try {
        const res = await api.post('/ai/diagnose', { studentId: s.id })
        aiResult.value = res.content || '未返回诊断结果'
      } catch (e) {
        aiResult.value = '诊断失败，请检查 AI 配置'
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.sel { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.role-tag { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; }
.homeroom { background: rgba(7, 193, 96, 0.15); color: #07c160; }
.shared { background: rgba(230, 162, 60, 0.15); color: #e6a23c; }
.picker, .sel input {
  border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: var(--c-title); min-height: 80rpx; line-height: 44rpx;
  box-sizing: border-box; background: var(--c-input); width: 100%;
}
.exist { background: rgba(7,193,96,0.12); color: var(--c-primary); font-size: 26rpx; padding: 18rpx 24rpx; border-radius: 14rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.clear { color: var(--c-danger); font-size: 24rpx; }
.exp-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.exp-csv, .exp-rank, .exp-share { flex: 1; text-align: center; font-size: 26rpx; padding: 16rpx 0; border-radius: 14rpx; background: var(--c-card2); color: var(--c-accent); border: 1px solid var(--c-border); }
.exp-csv:active, .exp-rank:active, .exp-share:active { opacity: 0.6; }
.exp-share { color: #409eff; }
.share-stu { font-size: 28rpx; padding: 4rpx 10rpx; color: #409eff; flex-shrink: 0; }
.item { background: var(--c-card); border-radius: 16rpx; padding: 20rpx 26rpx; margin-bottom: 14rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.name { font-size: 30rpx; color: var(--c-title); }
.score { width: 220rpx; height: 80rpx; min-height: 80rpx; line-height: 44rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; text-align: center; font-size: 28rpx; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.imp { background: #409eff; color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.import-box { margin-top: 16rpx; background: var(--c-card2); border-radius: 20rpx; padding: 24rpx; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 14rpx; }
.imp-btns { display: flex; gap: 16rpx; }
.imp-btns .pick { flex: 1; }
.tpl { flex: 1; background: var(--c-accent); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.tpl:active { opacity: 0.6; }
.prog { background: var(--c-card); border-radius: 16rpx; padding: 18rpx 26rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.prog-txt { font-size: 26rpx; color: var(--c-sub); display: block; margin-bottom: 10rpx; }
.prog-bar { height: 12rpx; background: var(--c-card2); border-radius: 6rpx; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, var(--c-accent), var(--c-primary)); border-radius: 6rpx; transition: width 0.3s; }
.pick { background: #409eff; color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.preview { margin-top: 14rpx; border-top: 1px dashed var(--c-border); padding-top: 14rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.pv-errs { margin: 8rpx 0; }
.pv-err { font-size: 24rpx; color: var(--c-danger); line-height: 1.6; }
.confirm { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.confirm[disabled] { opacity: 0.5; }
.ana { background: var(--c-accent); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
/* 成绩单 */
.card { width: 86%; max-width: 640rpx; max-height: 80vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
.card-h { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 6rpx; }
.card-stu { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; }
.card-rank { color: var(--c-accent); font-weight: 600; }
.card-row { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.c-subject { width: 100rpx; font-weight: 600; color: var(--c-title); }
.c-score { width: 80rpx; text-align: right; color: var(--c-primary); font-weight: 700; }
.c-unit { font-size: 20rpx; font-weight: 400; color: var(--c-sub); }
.c-full { width: 90rpx; text-align: center; color: var(--c-sub); }
.c-rank { width: 100rpx; text-align: center; color: var(--c-accent); font-weight: 600; }
.c-avg { width: 80rpx; text-align: right; color: var(--c-sub); }
.sno { font-size: 22rpx; color: var(--c-sub); font-weight: 400; }
.card-total { margin-top: 16rpx; font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.c-total-val { color: var(--c-primary); font-weight: 700; }
.card-btns { display: flex; gap: 16rpx; margin-top: 24rpx; }
.card-copy { flex: 1; background: var(--c-accent); color: #fff; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
.card-close { flex: 1; background: #f0f0f0; color: #666; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
.oview { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10rpx; margin-bottom: 16rpx; }
.ov2 { background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 4rpx; text-align: center; }
.ov2 .n { display: block; font-size: 30rpx; font-weight: 800; color: var(--c-accent); }
.ov2 .l { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { width: 640rpx; max-height: 86vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 32rpx; box-sizing: border-box; }
.m-h { font-size: 30rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 22rpx; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-bottom: 22rpx; }
.st { background: var(--c-card2); border-radius: 14rpx; padding: 16rpx 6rpx; text-align: center; }
.st-n { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.st-l { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.dh, .rh { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin: 10rpx 0; }
.seg-row { display: flex; align-items: center; gap: 14rpx; margin-bottom: 12rpx; }
.seg-l { width: 100rpx; font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.seg-bar { flex: 1; height: 20rpx; background: var(--c-card2); border-radius: 10rpx; overflow: hidden; }
.seg-fill { height: 100%; background: linear-gradient(90deg,#e6a23c,#07c160); border-radius: 10rpx; }
.seg-c { width: 80rpx; text-align: right; font-size: 22rpx; color: var(--c-sub); flex-shrink: 0; }
/* 10 段垂直柱状图 */
.bar-chart { display: flex; align-items: flex-end; gap: 6rpx; height: 280rpx; padding: 12rpx 4rpx 0; margin-bottom: 14rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4rpx; }
.bar-num { font-size: 20rpx; color: var(--c-title); line-height: 1; }
.bar-track { width: 100%; flex: 1; display: flex; align-items: flex-end; min-height: 8rpx; }
.bar-fill { width: 100%; border-radius: 8rpx 8rpx 0 0; transition: height 0.3s; }
.bar-label { font-size: 18rpx; color: var(--c-sub); line-height: 1.2; white-space: nowrap; }
.bar-pct { font-size: 18rpx; color: var(--c-sub); opacity: 0.7; line-height: 1.2; }
/* 4 色梯度 */
.bar-c0 { background: linear-gradient(180deg, #ff8a8a 0%, #ffd1d1 100%); }
.bar-c1 { background: linear-gradient(180deg, #ffc14e 0%, #ffe7b3 100%); }
.bar-c2 { background: linear-gradient(180deg, #5ed8a6 0%, #b8f0d4 100%); }
.bar-c3 { background: linear-gradient(180deg, #5aa9ff 0%, #b8d9ff 100%); }
.dark .bar-num { color: var(--c-title); }
.dark .bar-label, .dark .bar-pct { color: var(--c-sub); }
.bar-legend { display: flex; flex-wrap: wrap; gap: 12rpx 18rpx; justify-content: center; margin-top: 10rpx; }
.lg-item { display: flex; align-items: center; gap: 6rpx; font-size: 20rpx; color: var(--c-sub); }
.lg-c { width: 18rpx; height: 18rpx; border-radius: 4rpx; }
.rk { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.rk-no { width: 44rpx; height: 44rpx; border-radius: 50%; background: var(--c-accent); color: #fff; text-align: center; line-height: 44rpx; font-size: 22rpx; flex-shrink: 0; }
.rk-n { flex: 1; font-size: 26rpx; color: var(--c-title); }
.rk-s { font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.m-close { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 24rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
/* P1-3: 各科雷达图 */
.radar { margin-top: 22rpx; padding-top: 14rpx; border-top: 1px dashed var(--c-border); }
.radar-cv { width: 100%; height: 520rpx; margin: 0 auto; display: block; }
.radar-legend { display: flex; flex-wrap: wrap; gap: 10rpx 18rpx; justify-content: center; margin-top: 6rpx; }
.rl-item { display: flex; align-items: center; gap: 6rpx; font-size: 22rpx; color: var(--c-sub); }
.rl-c { width: 18rpx; height: 18rpx; border-radius: 4rpx; }
.aimask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 99; }
.aisheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx 28rpx calc(30rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.ait { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.aibody { max-height: 60vh; font-size: 28rpx; line-height: 1.7; color: var(--c-text); white-space: pre-wrap; }
.aiclose { text-align: center; font-size: 28rpx; color: var(--c-accent); margin-top: 20rpx; padding: 14rpx 0; }
/* 模式切换 */
.mode-tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.mtab { flex: 1; text-align: center; font-size: 28rpx; padding: 18rpx 0; border-radius: 14rpx; background: var(--c-card2); color: var(--c-sub); border: 1px solid var(--c-border); }
.mtab.on { background: var(--c-primary); color: #fff; border-color: var(--c-primary); }
/* 全部科目矩阵 */
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
</style>
