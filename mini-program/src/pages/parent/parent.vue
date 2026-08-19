<template>
  <view class="page" :class="{ dark }">
    <!-- 错误/重试态 -->
    <view class="load-err" v-if="loadError" @tap="load">
      <text class="err-icon">⚠️</text>
      <text class="err-text">数据加载失败，点击重试</text>
    </view>
    <!-- 加载态 -->
    <view class="loading-mask" v-if="loading">
      <view class="spinner"></view>
      <text class="loading-text">加载中…</text>
    </view>

    <!-- ==================== 欢迎区域 ==================== -->
    <view class="hd" v-if="!loading">
      <view class="hd-left">
        <view class="greeting-wrap">
          <text class="greeting-line1">{{ greeting }}</text>
          <text class="greeting-line2">{{ me?.studentName ? me.studentName + '同学家长' : '家长' }}</text>
          <view class="greeting-deco"></view>
        </view>
      </view>
    </view>

    <!-- ==================== 功能入口面板 ==================== -->
    <view class="actions-grid" v-if="!loading">
      <view class="info-btn error logout-btn" @click="logout">
        <text class="info-icon">🚪</text>
        <text class="info-label">退出</text>
      </view>
    </view>

    <!-- 功能入口列表 -->
    <view class="actions-list" v-if="!loading">
      <view class="info-btn action-card" @click="openEditStudentInfo">
        <text class="info-icon">📝</text>
        <text class="info-label">维护信息</text>
      </view>
      <view class="info-btn action-card" @click="openStudentRequests">
        <text class="info-icon">📋</text>
        <text class="info-label">申请记录</text>
      </view>
      <view class="info-btn action-card" @click="openMessageCenter">
        <text class="info-icon">💬</text>
        <text class="info-label">留言</text>
      </view>
      <view class="info-btn action-card" @click="goKidsCoding">
        <text class="info-icon">🧩</text>
        <text class="info-label">少儿编程</text>
      </view>
      <view class="info-btn action-card" @click="goMood">
        <text class="info-icon">🌤️</text>
        <text class="info-label">心情打卡</text>
      </view>
      <view class="info-btn action-card" @click="goTimeline">
        <text class="info-icon">🌈</text>
        <text class="info-label">成长时光机</text>
      </view>
      <view class="info-btn action-card" @click="goNotifySettings">
        <text class="info-icon">🔔</text>
        <text class="info-label">通知设置</text>
      </view>
      <view class="info-btn action-card" @click="goDataConsent">
        <text class="info-icon">🔐</text>
        <text class="info-label">数据授权</text>
      </view>
      <view class="info-btn action-card" @click="goStudyBuddy">
        <text class="info-icon">🤖</text>
        <text class="info-label">AI学习伙伴</text>
      </view>
      <view class="info-btn action-card" @click="goFiveEdu">
        <text class="info-icon">📊</text>
        <text class="info-label">五育档案</text>
      </view>
      <view class="info-btn action-card" @click="goLearningLoop">
        <text class="info-icon">🎯</text>
        <text class="info-label">学习闭环</text>
      </view>
      <view class="info-btn action-card" @click="goSafety">
        <text class="info-icon">🛡️</text>
        <text class="info-label">安全守护</text>
      </view>
      <view class="info-btn action-card" @click="goHabit">
        <text class="info-icon">🔥</text>
        <text class="info-label">习惯养成</text>
      </view>
      <view class="info-btn action-card" @click="goLiteracy">
        <text class="info-icon">📚</text>
        <text class="info-label">素养启蒙</text>
      </view>
      <view class="info-btn action-card" @click="goSchedule">
        <text class="info-icon">🗓️</text>
        <text class="info-label">课表</text>
      </view>
      <view class="info-btn action-card" @click="goReport">
        <text class="info-icon">📋</text>
        <text class="info-label">班级报告</text>
      </view>
      <view class="info-btn action-card" @click="goAssignment">
        <text class="info-icon">📚</text>
        <text class="info-label">分层作业</text>
      </view>
      <view class="info-btn action-card" @click="showPwdModal = true">
        <text class="info-icon">🔑</text>
        <text class="info-label">改密</text>
      </view>
    </view>

    <!-- 学生信息条 -->
    <view class="stu-bar" v-if="me && me.studentName">
      <view class="stu-info-card">
        <view class="stu-avatar">{{ (me.studentName || '?').charAt(0) }}</view>
        <view class="stu-info-text">
          <text class="stu-name">{{ me.studentName }}</text>
          <text class="stu-meta">学号：{{ me.studentNo || '--' }}　班级：{{ me.className || '--' }}</text>
        </view>
      </view>
    </view>

    <!-- 孩子列表子组件 -->
    <KidList
      :me="me"
      :kids="kids"
      :active-kid-id="activeKidId"
      @switch-kid="switchToKid"
      @go-compare="goCompare"
    />

    <!-- 顶部统计卡片 -->
    <view class="stats-row" v-if="!loading">
      <view v-if="hasPf('notices')" class="stat-card stat-notices clickable" @tap="tab = 'pending'">
        <view class="stat-icon">📢</view>
        <view class="stat-label">待读通知</view>
        <view class="stat-value">{{ stats.notices }}</view>
      </view>
      <view v-if="hasPf('homework')" class="stat-card stat-homework clickable" @tap="tab = 'pending'">
        <view class="stat-icon">📝</view>
        <view class="stat-label">待完成作业</view>
        <view class="stat-value">{{ stats.homework }}</view>
      </view>
      <view v-if="(hasPf('grades') || hasPf('analysis')) && notifyPref.showGrade" class="stat-card stat-scores clickable" @tap="tab = 'scores'">
        <view class="stat-icon">📊</view>
        <view class="stat-label">最近考试</view>
        <view class="stat-value">{{ stats.pct }}</view>
        <view v-if="stats.pctDelta != null && stats.pctDelta !== 0" class="stat-delta" :class="stats.pctDelta > 0 ? 'up' : 'down'">
          较上次 {{ stats.pctDelta > 0 ? '+' : '' }}{{ stats.pctDelta }}%
        </view>
      </view>
      <view v-if="(hasPf('grades') || hasPf('analysis')) && notifyPref.showRank" class="stat-card stat-rank clickable" @tap="tab = 'scores'">
        <view class="stat-icon">🏆</view>
        <view class="stat-label">最新排名</view>
        <view class="stat-value">{{ stats.rank }}</view>
        <view v-if="stats.rankDelta != null && stats.rankDelta !== 0" class="stat-delta" :class="stats.rankDelta > 0 ? 'up' : 'down'">
          较上次 {{ stats.rankDelta > 0 ? '上升' : '下降' }}{{ Math.abs(stats.rankDelta) }}名
        </view>
      </view>
      <view v-if="moodStat" class="stat-card stat-mood clickable" @tap="goMood">
        <view class="stat-icon">🌤️</view>
        <view class="stat-label">今日心情</view>
        <view class="stat-value stat-value-sm">{{ moodStat }}</view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view v-if="showPendingTab" class="tab" :class="{ on: tab === 'pending' }" @click="tab = 'pending'">
        <text class="tab-icon">📋</text>
        <text class="tab-label">待办公告</text>
      </view>
      <view v-if="showScoresTab" class="tab" :class="{ on: tab === 'scores' }" @click="tab = 'scores'">
        <text class="tab-icon">📊</text>
        <text class="tab-label">成绩查询</text>
      </view>
      <view v-if="showAttendanceTab" class="tab" :class="{ on: tab === 'attendance' }" @click="tab = 'attendance'">
        <text class="tab-icon">📈</text>
        <text class="tab-label">考勤</text>
      </view>
      <view class="tab" :class="{ on: tab === 'textbook' }" @click="tab = 'textbook'; loadTextbooks()">
        <text class="tab-icon">📚</text>
        <text class="tab-label">教材</text>
      </view>
      <view class="tab" :class="{ on: tab === 'overview' }" @click="tab = 'overview'">
        <text class="tab-icon">💡</text>
        <text class="tab-label">总览</text>
      </view>
    </view>

    <!-- 订阅消息引导 -->
    <view class="subscribe-card" v-if="showSubscribeGuide">
      <view class="sub-icon-area">
        <text class="sub-icon">🔔</text>
      </view>
      <view class="sub-text">
        <text class="sub-title">开启通知订阅</text>
        <text class="sub-desc">作业提醒、新公告、成绩发布即时推送到微信</text>
      </view>
      <text class="sub-btn" @click="subscribeGuide">去开启</text>
      <text class="sub-close" @click="showSubscribeGuide = false">×</text>
    </view>

    <!-- ===== Tab 1：待办公告 ===== -->
    <MessageCenter
      v-if="tab === 'pending'"
      :homework="homework"
      :notices="notices"
    />

    <!-- ===== Tab 2：成绩查询 ===== -->
    <ScoreView
      v-if="tab === 'scores'"
      :exams="exams"
      :filter-term="filterTerm"
      :filter-exam-name="filterExamName"
      :filter-subject="filterSubject"
      @term-change="onTermChange"
      @exam-name-change="onExamNameChange"
      @subject-change="onSubjectChange"
    />

    <!-- ===== Tab 3：考勤看板 ===== -->
    <AttendancePanel
      v-if="tab === 'attendance'"
      :attendance="attendance"
      :behavior="behavior"
      :schedule="schedule"
      :communications="communications"
      @contact-teacher="contactTeacher"
    />

    <!-- ===== Tab 4：健康度总览 ===== -->
    <OverviewPanel
      v-if="tab === 'overview'"
      :me="me"
      :attendance="attendance"
      :homework="homework"
      :notices="notices"
      :teachers="teachers"
      :exams="exams"
      @edit-student-info="openEditStudentInfo"
      @view-requests="openStudentRequests"
      @open-teacher="openTeacher"
    />

    <!-- ===== Tab 5：教材知识点 ===== -->
    <TextbookPanel v-if="tab === 'textbook'" ref="textbookPanelRef" />

    <!-- 修改密码弹窗 -->
    <view v-if="showPwdModal" class="pwd-mask" @click="showPwdModal = false">
      <view class="pwd-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">修改登录密码</text>
          <text class="pwd-close" @click="showPwdModal = false">✕</text>
        </view>
        <view v-if="pwdOk" class="pwd-ok">✅ 密码修改成功</view>
        <view v-if="pwdError" class="pwd-err">{{ pwdError }}</view>
        <text class="pwd-label">原密码</text>
        <input class="pwd-input" :password="true" placeholder="请输入当前密码" v-model="oldPwd" />
        <text class="pwd-label">新密码（至少 8 位）</text>
        <input class="pwd-input" :password="true" placeholder="请输入新密码" v-model="newPwd" />
        <button class="pwd-btn" :disabled="pwdLoading" @click="submitChangePwd">{{ pwdLoading ? '提交中…' : '确认修改' }}</button>
      </view>
    </view>

    <!-- 修改学生信息弹窗 -->
    <view v-if="showStudentInfoModal" class="pwd-mask" @click="showStudentInfoModal = false">
      <view class="pwd-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">修改学生信息</text>
          <text class="pwd-close" @click="showStudentInfoModal = false">✕</text>
        </view>
        <text class="pwd-tip">提交后需老师审核通过才会更新</text>
        <view v-if="editOk" class="pwd-ok">✅ 已提交，等待老师审核</view>
        <view v-if="editError" class="pwd-err">{{ editError }}</view>
        <text class="pwd-label">家长姓名</text>
        <input class="pwd-input" placeholder="请输入家长姓名" v-model="editForm.parentName" />
        <text class="pwd-label">家长电话</text>
        <input class="pwd-input" placeholder="请输入家长电话" v-model="editForm.parentPhone" />
        <text class="pwd-label">学生电话</text>
        <input class="pwd-input" placeholder="请输入学生电话" v-model="editForm.studentPhone" />
        <text class="pwd-label">出生日期</text>
        <picker mode="date" :value="editForm.birthDate" @change="onBirthDateChange">
          <view class="pwd-input">{{ editForm.birthDate || '请选择出生日期' }}</view>
        </picker>
        <text class="pwd-label">地址</text>
        <input class="pwd-input" placeholder="请输入家庭住址" v-model="editForm.address" />
        <text class="pwd-label">备注</text>
        <textarea class="pwd-textarea" placeholder="如有其他说明请填写" v-model="editForm.note" />
        <button class="pwd-btn" :disabled="editSubmitting" @click="submitStudentInfo">{{ editSubmitting ? '提交中…' : '提交申请' }}</button>
      </view>
    </view>

    <!-- 申请记录弹窗 -->
    <view v-if="showStudentRequestsModal" class="pwd-mask" @click="showStudentRequestsModal = false">
      <view class="pwd-box req-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">申请记录</text>
          <text class="pwd-close" @click="showStudentRequestsModal = false">✕</text>
        </view>
        <view v-if="studentRequestsLoading" class="req-empty">加载中…</view>
        <view v-else-if="!studentRequests.length" class="req-empty">暂无申请记录</view>
        <scroll-view scroll-y v-else class="req-list">
          <view v-for="r in studentRequests" :key="r.id" class="req-item">
            <view class="req-head">
              <text class="req-name">{{ r.studentName || '学生' }}</text>
              <text class="req-status" :class="'rs-' + r.status">{{ reqStatusLabel(r.status) }}</text>
            </view>
            <text class="req-date">提交于 {{ r.createdAt }}</text>
            <view v-if="r.payload" class="req-payload">
              <text v-if="r.payload.parentName" class="req-line">家长姓名：{{ r.payload.parentName }}</text>
              <text v-if="r.payload.parentPhone" class="req-line">家长电话：{{ r.payload.parentPhone }}</text>
              <text v-if="r.payload.studentPhone" class="req-line">学生电话：{{ r.payload.studentPhone }}</text>
              <text v-if="r.payload.birthDate" class="req-line">出生日期：{{ r.payload.birthDate }}</text>
              <text v-if="r.payload.address" class="req-line">地址：{{ r.payload.address }}</text>
              <text v-if="r.payload.note" class="req-line">备注：{{ r.payload.note }}</text>
            </view>
            <text v-if="r.reviewNote" class="req-review">审核备注：{{ r.reviewNote }}</text>
            <text v-if="r.reviewedAt" class="req-reviewed">审核于 {{ r.reviewedAt }}</text>
          </view>
        </scroll-view>
        <button class="pwd-btn" @click="showStudentRequestsModal = false">关闭</button>
      </view>
    </view>

    <!-- 科任老师详情弹窗 -->
    <view v-if="showTeacherModal" class="pwd-mask" @click="showTeacherModal = false">
      <view class="pwd-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">老师详情</text>
          <text class="pwd-close" @click="showTeacherModal = false">✕</text>
        </view>
        <view v-if="teacherDetail" class="teacher-detail">
          <view class="td-avatar">{{ teacherDetail.name ? teacherDetail.name.charAt(0) : '师' }}</view>
          <view class="td-name">
            {{ teacherDetail.name }}
            <text class="teacher-role" :class="teacherDetail.role === 'head' ? 'head' : 'subject'">{{ teacherDetail.roleLabel }}</text>
          </view>
          <view class="td-row" v-if="teacherDetail.subjects && teacherDetail.subjects.length">
            <text class="td-label">任教科目</text><text class="td-val">{{ teacherDetail.subjects.join('、') }}</text>
          </view>
          <view class="td-row" v-else-if="teacherDetail.subject">
            <text class="td-label">任教科目</text><text class="td-val">{{ teacherDetail.subject }}</text>
          </view>
          <view class="td-row" v-if="teacherDetail.phone">
            <text class="td-label">联系电话</text><text class="td-val">{{ teacherDetail.phone }}</text>
          </view>
          <button class="pwd-btn" @click="messageThisTeacher(teacherDetail)">给TA留言</button>
          <button class="pwd-btn ghost" v-if="teacherDetail.phone" @click="callTeacher(teacherDetail)">拨打电话</button>
        </view>
      </view>
    </view>

    <!-- 家长留言弹窗 -->
    <view v-if="showMsgModal" class="pwd-mask" @click="showMsgModal = false">
      <view class="pwd-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">给老师留言</text>
          <text class="pwd-close" @click="showMsgModal = false">✕</text>
        </view>
        <view v-if="msgViewSent">
          <view v-if="!sentMessages.length" class="req-empty">暂无留言记录</view>
          <scroll-view scroll-y v-else class="req-list">
            <view v-for="(m, i) in sentMessages" :key="m.id || i" class="req-item">
              <view class="req-head">
                <text class="req-name">致：{{ (m.recipient && (m.recipient.name || m.recipient.nickname)) || '老师' }}</text>
                <text class="req-status" :class="m.read ? 'rs-approved' : 'rs-pending'">{{ m.read ? '已读' : '未读' }}</text>
              </view>
              <text class="req-msg">{{ m.content }}</text>
              <text v-if="m.createdAt" class="req-reviewed">发送于 {{ m.createdAt }}</text>
            </view>
          </scroll-view>
          <button class="pwd-btn ghost" @click="msgViewSent = false">返回写留言</button>
        </view>
        <view v-else>
          <text class="pwd-label">选择老师</text>
          <picker mode="selector" :range="teacherOptions" @change="onMsgTeacherChange">
            <view class="pwd-input">{{ selectedTeacherName }}</view>
          </picker>
          <text class="pwd-label">留言内容</text>
          <textarea class="pwd-textarea" placeholder="请输入要告诉老师的内容" v-model="msgContent" />
          <view v-if="msgOk" class="pwd-ok">✅ 留言已发送</view>
          <view v-if="msgError" class="pwd-err">{{ msgError }}</view>
          <button class="pwd-btn" :disabled="msgSending" @click="submitMessage">{{ msgSending ? '发送中…' : '发送留言' }}</button>
          <button class="pwd-btn ghost" @click="loadSentMessages">查看我发出的</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme, parent, logoutParent, setParent } from '../../common/store'
import { parentApi } from '../../common/request'
import { getNotifyPref } from '../../api/notifyPref'
import { DONE_HW_STATUSES } from '@gardener/shared/utils/general'
import KidList from './components/KidList.vue'
import ScoreView from './components/ScoreView.vue'
import MessageCenter from './components/MessageCenter.vue'
import AttendancePanel from './components/AttendancePanel.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import TextbookPanel from './components/TextbookPanel.vue'

const dark = computed(() => theme.mode === 'dark')
const tab = ref('pending')
const showSubscribeGuide = ref(true)

/**
 * 家长功能包判定（班主任可在班级里配置家长可见功能）。
 */
function hasPf(key) {
  const f = parent.user && parent.user.effectiveFeatures
  if (!Array.isArray(f)) return true
  if (f.length === 0) return false
  return f.indexOf(key) >= 0
}
const showPendingTab = computed(() => hasPf('notices') || hasPf('homework'))
const showScoresTab = computed(() => hasPf('grades') || hasPf('analysis'))
const showAttendanceTab = computed(() => hasPf('attendance') || hasPf('behavior') || hasPf('schedule') || hasPf('duty') || hasPf('im'))

async function subscribeGuide() {
  try {
    const { accept } = await wx.requestSubscribeMessage({ tmplIds: ['NOTICE_TEMPLATE_ID', 'HOMEWORK_TEMPLATE_ID'] })
    const count = Object.values(accept || {}).filter(v => v === 'accept').length
    if (count > 0) { uni.showToast({ title: `已订阅 ${count} 项通知`, icon: 'success' }); showSubscribeGuide.value = false }
  } catch (e) {}
}

const me = ref(null)
const kids = ref([])
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好，'
  if (h < 12) return '早上好，'
  if (h < 14) return '中午好，'
  if (h < 18) return '下午好，'
  return '晚上好，'
})
const activeKidId = ref('')
const notices = ref([])
const exams = ref([])
const homework = ref([])
const attendance = ref(null)
const behavior = ref(null)
const schedule = ref(null)
const communications = ref(null)
const loading = ref(true)
const loadError = ref(false)
const teachers = ref([])
const notifyPref = reactive({ showGrade: true, showRank: true })
const moodMine = ref([])

// 成绩筛选
const filterTerm = ref('')
const filterExamName = ref('')
const filterSubject = ref('')

function onTermChange(e) { const idx = e.detail.value; filterTerm.value = idx === 0 ? '' : termOptions.value[idx - 1]; filterExamName.value = ''; filterSubject.value = '' }
function onExamNameChange(e) { const idx = e.detail.value; filterExamName.value = idx === 0 ? '' : examNameOptions.value[idx - 1]; filterSubject.value = '' }
function onSubjectChange(e) { const idx = e.detail.value; filterSubject.value = idx === 0 ? '' : subjectOptions.value[idx - 1] }

const termOptions = computed(() => { const set = new Set(); for (const e of exams.value) { if (e.term) set.add(e.term) }; return Array.from(set) })
const examNameOptions = computed(() => { const set = new Set(); for (const e of exams.value) { if (e.examName) set.add(e.examName) }; return Array.from(set) })
const subjectOptions = computed(() => { const set = new Set(); for (const e of exams.value) { for (const s of (e.subjects || [])) { if (s.subject) set.add(s.subject) } }; return Array.from(set) })

const pendingHomework = computed(() => homework.value.filter(h => !DONE_HW_STATUSES.includes(h.status)).length)
const examsByDate = computed(() => [...exams.value].sort((a, b) => (a.date || '').localeCompare(b.date || '')))
const latestExam = computed(() => examsByDate.value.length ? examsByDate.value[examsByDate.value.length - 1] : null)
const prevExam = computed(() => examsByDate.value.length > 1 ? examsByDate.value[examsByDate.value.length - 2] : null)
function scorePct(e) {
  if (!e || e.totalScore == null || !e.totalFullScore) return null
  return Math.round((e.totalScore / e.totalFullScore) * 1000) / 10
}
const latestPct = computed(() => scorePct(latestExam.value))
const pctDelta = computed(() => {
  const a = scorePct(latestExam.value)
  const b = scorePct(prevExam.value)
  if (a == null || b == null) return null
  return Math.round((a - b) * 10) / 10
})
const rankDelta = computed(() => {
  const l = latestExam.value && latestExam.value.classRank
  const p = prevExam.value && prevExam.value.classRank
  if (l == null || p == null) return null
  return p - l
})

const stats = computed(() => {
  const noticeCount = (notices.value || []).filter(n => n.pinned).length || notices.value.length || 0
  const homeworkCount = pendingHomework.value
  const pct = latestPct.value != null ? latestPct.value + '%' : '--'
  const rank = latestExam.value
    ? latestExam.value.classRank ? `第${latestExam.value.classRank}名` : latestExam.value.gradeRank ? `年级第${latestExam.value.gradeRank}名` : '--'
    : '--'
  return { notices: noticeCount, homework: homeworkCount, pct, pctDelta: pctDelta.value, rank, rankDelta: rankDelta.value }
})

function contactTeacher() {
  const head = teachers.value.find(t => t.role === 'head' && t.phone)
  const anyWithPhone = teachers.value.find(t => t.phone)
  const target = head || anyWithPhone
  if (!target) {
    return uni.showToast({ title: '暂无老师联系方式，请联系班主任', icon: 'none' })
  }
  uni.showModal({
    title: '联系老师',
    content: `${target.name}（${target.roleLabel || '老师'}）\n电话：${target.phone}`,
    confirmText: '拨号',
    success: (res) => { if (res.confirm) uni.makePhoneCall({ phoneNumber: String(target.phone) }) },
  })
}

// 修改密码
const showPwdModal = ref(false)
const oldPwd = ref('')
const newPwd = ref('')
const pwdLoading = ref(false)
const pwdError = ref('')
const pwdOk = ref(false)
async function submitChangePwd() {
  pwdError.value = ''; pwdOk.value = false
  if (!oldPwd.value || !newPwd.value) { pwdError.value = '请填写原密码与新密码'; return }
  if (newPwd.value.length < 8) { pwdError.value = '新密码至少 8 位'; return }
  pwdLoading.value = true
  try {
    await parentApi.post('/parent-auth/change-password', { oldPassword: oldPwd.value, newPassword: newPwd.value })
    pwdOk.value = true; oldPwd.value = ''; newPwd.value = ''
    setTimeout(() => { showPwdModal.value = false; pwdOk.value = false }, 1200)
  } catch (e) { pwdError.value = (e && e.message) || '修改失败，请重试' }
  finally { pwdLoading.value = false }
}

// 学生信息修改
const showStudentInfoModal = ref(false)
const showStudentRequestsModal = ref(false)
const studentRequests = ref([])
const studentRequestsLoading = ref(false)
const editForm = ref({ parentPhone: '', studentPhone: '', address: '', birthDate: '', parentName: '', note: '' })
const editSubmitting = ref(false)
const editError = ref('')
const editOk = ref(false)
function openEditStudentInfo() {
  const si = (me.value && me.value.studentInfo) || {}
  editForm.value = { parentPhone: si.parentPhone || '', studentPhone: si.studentPhone || '', address: si.address || '', birthDate: si.birthDate || '', parentName: si.parentName || (me.value && me.value.parentName) || '', note: si.note || '' }
  editError.value = ''; editOk.value = false
  showStudentInfoModal.value = true
}
function onBirthDateChange(e) { editForm.value.birthDate = e.detail.value }
async function submitStudentInfo() {
  editError.value = ''; editOk.value = false; editSubmitting.value = true
  try {
    await parentApi.post('/parent-auth/student-update-request', { payload: { ...editForm.value } })
    editOk.value = true
    setTimeout(() => { showStudentInfoModal.value = false; editOk.value = false }, 1200)
  } catch (e) { editError.value = (e && e.message) || '提交失败，请重试' }
  finally { editSubmitting.value = false }
}
function reqStatusLabel(s) { return s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审核' }
async function openStudentRequests() {
  showStudentRequestsModal.value = true; studentRequestsLoading.value = true
  try { const list = await parentApi.get('/parent-auth/student-update-requests'); studentRequests.value = Array.isArray(list) ? list : [] }
  catch (e) { studentRequests.value = [] }
  finally { studentRequestsLoading.value = false }
}

async function switchToKid(studentId) {
  if (studentId === activeKidId.value) return
  uni.showLoading({ title: '切换中…' })
  try {
    const res = await parentApi.post('/parent-auth/switch-student', { studentId })
    const data = res.data || res
    if (data.token) {
      const userPatch = Array.isArray(data.effectiveFeatures)
        ? { ...(parent.user || {}), effectiveFeatures: data.effectiveFeatures }
        : parent.user
      setParent(data.token, userPatch)
      if (Array.isArray(data.effectiveFeatures)) parent.user = { ...(parent.user || {}), effectiveFeatures: data.effectiveFeatures }
      me.value = null; load()
    }
  } catch (e) { uni.showToast({ title: '切换失败', icon: 'error' }) }
  finally { uni.hideLoading() }
}
function goCompare() { uni.navigateTo({ url: '/pages/parent/compare' }) }
function logout() {
  uni.showModal({ title: '退出登录', content: '确定退出当前账号？', confirmColor: '#e64340', success: (res) => { if (res.confirm) { logoutParent(); uni.reLaunch({ url: '/pages/login/login' }) } } })
}

// 教材 Tab
const textbookPanelRef = ref(null)
function loadTextbooks() {
  nextTick(() => { textbookPanelRef.value && textbookPanelRef.value.load && textbookPanelRef.value.load() })
}

// 科任老师详情弹窗
const showTeacherModal = ref(false)
const teacherDetail = ref(null)
function openTeacher(t) { teacherDetail.value = t; showTeacherModal.value = true }
function callTeacher(t) { if (t && t.phone) uni.makePhoneCall({ phoneNumber: String(t.phone) }) }
function messageThisTeacher(t) { showTeacherModal.value = false; openMessageTeacher(t) }

// 家长留言功能
const showMsgModal = ref(false)
const msgTeacherIdx = ref(0)
const msgContent = ref('')
const msgSending = ref(false)
const msgError = ref('')
const msgOk = ref(false)
const sentMessages = ref([])
const msgViewSent = ref(false)

const teacherOptions = computed(() => (teachers.value || []).map(t => `${t.name}（${t.roleLabel || '老师'}）`))
const selectedTeacherName = computed(() => {
  const t = (teachers.value || [])[msgTeacherIdx.value]
  return t ? `${t.name}（${t.roleLabel || '老师'}）` : '请选择老师'
})
function openMessageCenter() {
  msgViewSent.value = false; msgContent.value = ''; msgError.value = ''; msgOk.value = false
  if ((teachers.value || []).length) msgTeacherIdx.value = 0
  showMsgModal.value = true
}
function goKidsCoding() { uni.navigateTo({ url: '/pages/parent/kidsCoding' }) }
function goMood() { uni.navigateTo({ url: '/pages/parent/mood' }) }
function goTimeline() { uni.navigateTo({ url: '/pages/parent/timeline' }) }
function goNotifySettings() { uni.navigateTo({ url: '/pages/parent/notifySettings' }) }
function goDataConsent() { uni.navigateTo({ url: '/pages/parent/dataConsent' }) }
function goStudyBuddy() { uni.navigateTo({ url: '/pages/parent/studyBuddy' }) }
function goFiveEdu() { uni.navigateTo({ url: '/pages/parent/fiveEduProfile' }) }
function goLearningLoop() { uni.navigateTo({ url: '/pages/parent/learningLoop' }) }
function goSafety() { uni.navigateTo({ url: '/pages/parent/safety' }) }
function goHabit() { uni.navigateTo({ url: '/pages/parent/habit' }) }
function goLiteracy() { uni.navigateTo({ url: '/pages/parent/literacy' }) }
function goSchedule() { uni.navigateTo({ url: '/pages/parent/schedule' }) }
function goReport() { uni.navigateTo({ url: '/pages/parent/report' }) }
function goAssignment() { uni.navigateTo({ url: '/pages/parent/assignment' }) }

const moodStat = computed(() => {
  const list = moodMine.value || []
  if (!list.length) return ''
  const today = new Date().toISOString().slice(0, 10)
  const todayOne = list.find(m => (m.date || '').slice(0, 10) === today)
  if (todayOne) return todayOne.emoji || '😊'
  const latest = list[0]
  return (latest.emoji || '😊') + '·未打卡'
})
function openMessageTeacher(t) {
  const idx = (teachers.value || []).findIndex(x => x.teacherId === (t && t.teacherId))
  msgTeacherIdx.value = idx >= 0 ? idx : 0
  msgViewSent.value = false; msgContent.value = ''; msgError.value = ''; msgOk.value = false
  showMsgModal.value = true
}
function onMsgTeacherChange(e) { msgTeacherIdx.value = e.detail.value }
async function submitMessage() {
  msgError.value = ''; msgOk.value = false
  const t = (teachers.value || [])[msgTeacherIdx.value]
  if (!t) { msgError.value = '暂无可留言的老师，请稍后重试'; return }
  if (!msgContent.value.trim()) { msgError.value = '请输入留言内容'; return }
  msgSending.value = true
  try {
    await parentApi.post('/messages', { recipientId: t.teacherId, recipientRole: 'teacher', content: msgContent.value.trim() })
    msgOk.value = true; msgContent.value = ''
    setTimeout(() => { showMsgModal.value = false; msgOk.value = false }, 1200)
  } catch (e) { msgError.value = (e && e.message) || '发送失败，请重试' }
  finally { msgSending.value = false }
}
async function loadSentMessages() {
  msgViewSent.value = true
  try {
    const list = await parentApi.get('/messages/sent')
    sentMessages.value = Array.isArray(list) ? list : (list && list.items) || []
  } catch (e) { sentMessages.value = []; uni.showToast({ title: '加载留言失败', icon: 'none' }) }
}

async function load() {
  loading.value = true; loadError.value = false
  const [meResult, edata, ns, hw, att, beh, sch, comm, tch, prefRes, moodRes] = await Promise.allSettled([
    parentApi.get('/parent-auth/me'),
    parentApi.get('/parent-auth/exams'),
    parentApi.get('/parent-auth/notices'),
    parentApi.get('/parent-auth/homework'),
    parentApi.get('/parent-auth/attendance'),
    parentApi.get('/parent-auth/behavior'),
    parentApi.get('/parent-auth/schedule'),
    parentApi.get('/parent-auth/communications'),
    parentApi.get('/parent-auth/teachers'),
    getNotifyPref().catch(() => null),
    parentApi.get('/parent/mood/mine').catch(() => []),
  ])
  if (tch.status === 'fulfilled') teachers.value = Array.isArray(tch.value) ? tch.value : []
  if (meResult.status === 'fulfilled') {
    me.value = meResult.value
    kids.value = (meResult.value && meResult.value.kids) || []
    activeKidId.value = meResult.value?.studentId || ''
    if (meResult.value && Array.isArray(meResult.value.effectiveFeatures)) {
      parent.user = { ...(parent.user || {}), effectiveFeatures: meResult.value.effectiveFeatures }
    }
    const cur = tab.value
    if ((cur === 'pending' && !showPendingTab.value) || (cur === 'scores' && !showScoresTab.value) || (cur === 'attendance' && !showAttendanceTab.value)) {
      tab.value = 'overview'
    }
  }
  if (edata.status === 'fulfilled') exams.value = (edata.value && edata.value.exams) || []
  if (ns.status === 'fulfilled') notices.value = Array.isArray(ns.value) ? ns.value : []
  if (hw.status === 'fulfilled') homework.value = Array.isArray(hw.value) ? hw.value : []
  if (att.status === 'fulfilled') attendance.value = att.value || null
  if (beh.status === 'fulfilled') behavior.value = beh.value || null
  if (sch.status === 'fulfilled') schedule.value = sch.value || null
  if (comm.status === 'fulfilled') communications.value = comm.value || null
  if (prefRes.status === 'fulfilled' && prefRes.value) {
    notifyPref.showGrade = prefRes.value.showGrade !== false
    notifyPref.showRank = prefRes.value.showRank !== false
  }
  if (moodRes.status === 'fulfilled') moodMine.value = Array.isArray(moodRes.value) ? moodRes.value : []
  loadError.value = meResult.status !== 'fulfilled'
  loading.value = false
}

onShow(() => { if (!parent.token) { uni.reLaunch({ url: '/pages/parent-login/parent-login' }); return } ; load() })
</script>

<style scoped>
/* ============================================================
   设计 Token — 温暖 · 手作 · 有光（园丁感）
   奶油米黄底 + 黄油琥珀主色 + 樱花粉/薄荷绿点缀 + 可可棕文字
   ============================================================ */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24rpx 24rpx 40rpx;
  box-sizing: border-box;
  background: var(--c-bg);
  background-image:
    radial-gradient(ellipse at 100% 0%, rgba(255, 183, 77, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 0% 100%, rgba(255, 138, 101, 0.05) 0%, transparent 40%);
  transition: background-color 0.3s ease;
}

/* ---------- 暗色模式 ---------- */
.page.dark {
  background: #1a1714;
  background-image:
    radial-gradient(ellipse at 100% 0%, rgba(255, 183, 77, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 0% 100%, rgba(255, 138, 101, 0.03) 0%, transparent 40%);
}

/* ==================== 欢迎区域 ==================== */
.hd {
  margin-bottom: 20rpx;
  animation: fadeInDown 0.6s ease-out;
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.greeting-wrap {
  position: relative;
  display: inline-block;
  padding: 28rpx 36rpx;
  background: linear-gradient(135deg, var(--c-primary) 0%, #f0b966 100%);
  border-radius: 24rpx;
  box-shadow:
    0 8rpx 32rpx rgba(230, 162, 60, 0.25),
    0 2rpx 8rpx rgba(230, 162, 60, 0.15),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.greeting-wrap::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.greeting-wrap::after {
  content: '';
  position: absolute;
  bottom: -40%;
  left: -10%;
  width: 160rpx;
  height: 160rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.greeting-line1 {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
  letter-spacing: 1rpx;
}

.greeting-line2 {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
  margin-top: 6rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.08);
}

.greeting-deco {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  width: 12rpx;
  height: 12rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  box-shadow: 20rpx 8rpx 0 -2rpx rgba(255, 255, 255, 0.3);
}

/* ==================== 功能入口面板 ==================== */
.actions-grid {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16rpx;
  animation: fadeIn 0.5s ease-out 0.1s both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.logout-btn {
  background: var(--c-card);
  border: 1rpx solid rgba(244, 67, 54, 0.15);
  box-shadow: 0 2rpx 8rpx rgba(244, 67, 54, 0.08);
}

.logout-btn .info-label {
  color: #e57373;
}

/* ==================== 功能入口列表 ==================== */
.actions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-bottom: 20rpx;
  animation: fadeIn 0.5s ease-out 0.15s both;
}

.info-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 100rpx;
  font-size: 24rpx;
  transition: all 0.2s ease;
}

.action-card {
  background: var(--c-card);
  box-shadow:
    0 2rpx 8rpx rgba(0, 0, 0, 0.04),
    0 1rpx 2rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.action-card:active {
  transform: scale(0.95);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.06);
}

.info-icon {
  font-size: 26rpx;
  line-height: 1;
}

.info-label {
  font-size: 24rpx;
  color: var(--c-title);
  font-weight: 600;
  white-space: nowrap;
}

/* ==================== 学生信息条 ==================== */
.stu-bar {
  margin-bottom: 16rpx;
  animation: fadeIn 0.5s ease-out 0.2s both;
}

.stu-info-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--c-card);
  border-radius: 20rpx;
  box-shadow:
    0 4rpx 16rpx rgba(0, 0, 0, 0.04),
    0 1rpx 4rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.stu-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8d7a0 0%, #f0b966 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(230, 162, 60, 0.2);
  flex-shrink: 0;
}

.stu-info-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.stu-name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-title);
}

.stu-meta {
  font-size: 22rpx;
  color: var(--c-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==================== 统计卡片 ==================== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150rpx, 1fr));
  gap: 14rpx;
  margin-bottom: 20rpx;
  animation: fadeInUp 0.5s ease-out 0.25s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card {
  background: var(--c-card);
  border-radius: 20rpx;
  padding: 20rpx 16rpx;
  text-align: center;
  box-shadow:
    0 4rpx 16rpx rgba(0, 0, 0, 0.04),
    0 1rpx 4rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  border-radius: 20rpx 20rpx 0 0;
}

.stat-card.stat-notices::before { background: linear-gradient(90deg, #ff9a9e, #fad0c4); }
.stat-card.stat-homework::before { background: linear-gradient(90deg, #a1c4fd, #c2e9fb); }
.stat-card.stat-scores::before { background: linear-gradient(90deg, #fbc2eb, #a6c1ee); }
.stat-card.stat-rank::before { background: linear-gradient(90deg, #ffecd2, #fcb69f); }
.stat-card.stat-mood::before { background: linear-gradient(90deg, #a8edea, #fed6e3); }

.stat-card.clickable:active {
  transform: scale(0.96);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.stat-icon {
  font-size: 36rpx;
  margin-bottom: 6rpx;
  display: block;
}

.stat-label {
  font-size: 22rpx;
  color: var(--c-sub);
  margin-bottom: 8rpx;
  font-weight: 500;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-title);
  line-height: 1.2;
}

.stat-value-sm {
  font-size: 26rpx;
}

.stat-delta {
  font-size: 18rpx;
  margin-top: 6rpx;
  line-height: 1.2;
  font-weight: 600;
}

.stat-delta.up { color: #52c41a; }
.stat-delta.down { color: #ff7875; }

/* ==================== Tab 切换 ==================== */
.tabs {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
  padding: 6rpx;
  background: var(--c-card);
  border-radius: 18rpx;
  box-shadow:
    0 2rpx 12rpx rgba(0, 0, 0, 0.04),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.5);
  animation: fadeInUp 0.5s ease-out 0.3s both;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  text-align: center;
  font-size: 24rpx;
  padding: 14rpx 8rpx;
  border-radius: 14rpx;
  color: var(--c-sub);
  font-weight: 600;
  transition: all 0.25s ease;
  position: relative;
}

.tab.on {
  background: linear-gradient(135deg, var(--c-primary) 0%, #f0b966 100%);
  color: #fff;
  box-shadow:
    0 4rpx 12rpx rgba(230, 162, 60, 0.3),
    0 1rpx 4rpx rgba(230, 162, 60, 0.2);
}

.tab:not(.on):active {
  background: rgba(230, 162, 60, 0.08);
}

.tab-icon {
  font-size: 26rpx;
}

.tab-label {
  white-space: nowrap;
}

/* ==================== 订阅引导卡片 ==================== */
.subscribe-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: linear-gradient(135deg, #fff8e1 0%, #fff3c4 100%);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  position: relative;
  box-shadow:
    0 4rpx 16rpx rgba(230, 162, 60, 0.12),
    0 1rpx 4rpx rgba(230, 162, 60, 0.08);
  border: 1rpx solid rgba(230, 162, 60, 0.15);
  animation: slideInRight 0.5s ease-out 0.35s both;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20rpx); }
  to { opacity: 1; transform: translateX(0); }
}

.sub-icon-area {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe082 0%, #ffcc02 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(255, 193, 7, 0.25);
}

.sub-icon {
  font-size: 32rpx;
}

.sub-text {
  flex: 1;
  min-width: 0;
}

.sub-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #5d4037;
  display: block;
}

.sub-desc {
  font-size: 22rpx;
  color: #795548;
  margin-top: 4rpx;
  display: block;
}

.sub-btn {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, var(--c-primary) 0%, #f0b966 100%);
  padding: 12rpx 24rpx;
  border-radius: 100rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(230, 162, 60, 0.3);
  transition: transform 0.15s ease;
}

.sub-btn:active {
  transform: scale(0.94);
}

.sub-close {
  position: absolute;
  top: 8rpx;
  right: 14rpx;
  font-size: 28rpx;
  color: #a1887f;
  line-height: 1;
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==================== 加载态 ==================== */
.loading-mask {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 80rpx 0;
}

.spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid rgba(230, 162, 60, 0.2);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  font-size: 26rpx;
  color: var(--c-sub);
}

/* ==================== 错误态 ==================== */
.load-err {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  color: #e65100;
  font-size: 26rpx;
  text-align: center;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(230, 126, 34, 0.12);
  border: 1rpx solid rgba(230, 126, 34, 0.15);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8rpx); }
  40% { transform: translateX(8rpx); }
  60% { transform: translateX(-4rpx); }
  80% { transform: translateX(4rpx); }
}

.err-icon {
  font-size: 30rpx;
}

.err-text {
  font-weight: 600;
}

/* ==================== 弹窗通用 ==================== */
.pwd-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: maskIn 0.2s ease-out;
}

@keyframes maskIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pwd-box {
  width: 600rpx;
  background: var(--c-card);
  border-radius: 28rpx;
  padding: 40rpx;
  box-shadow:
    0 16rpx 48rpx rgba(0, 0, 0, 0.12),
    0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  animation: boxIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes boxIn {
  from { opacity: 0; transform: scale(0.9) translateY(20rpx); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.pwd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.pwd-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-title);
}

.pwd-close {
  font-size: 36rpx;
  color: var(--c-sub);
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.15s;
}

.pwd-close:active {
  background: rgba(0, 0, 0, 0.05);
}

.pwd-ok {
  font-size: 24rpx;
  color: #52c41a;
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid rgba(82, 196, 26, 0.2);
  font-weight: 600;
}

.pwd-err {
  font-size: 24rpx;
  color: #ff7875;
  background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid rgba(255, 120, 117, 0.2);
  font-weight: 600;
}

.pwd-label {
  font-size: 24rpx;
  color: var(--c-sub);
  margin-bottom: 8rpx;
  display: block;
  font-weight: 600;
}

.pwd-input {
  background: var(--c-input);
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: var(--c-title);
  margin-bottom: 20rpx;
  border: 1rpx solid var(--c-input-border);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.pwd-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3rpx rgba(230, 162, 60, 0.15);
}

.pwd-btn {
  background: linear-gradient(135deg, var(--c-primary) 0%, #f0b966 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  border-radius: 16rpx;
  padding: 22rpx;
  margin-top: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(230, 162, 60, 0.25);
  transition: transform 0.15s, box-shadow 0.15s;
}

.pwd-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2rpx 8rpx rgba(230, 162, 60, 0.2);
}

.pwd-btn[disabled] {
  opacity: 0.6;
  box-shadow: none;
}

.pwd-tip {
  font-size: 22rpx;
  color: var(--c-sub);
  margin-bottom: 16rpx;
  display: block;
  background: #fffbe6;
  padding: 12rpx 16rpx;
  border-radius: 10rpx;
  border-left: 4rpx solid #faad14;
}

.pwd-textarea {
  background: var(--c-input);
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: var(--c-title);
  margin-bottom: 20rpx;
  width: 100%;
  box-sizing: border-box;
  height: 120rpx;
  border: 1rpx solid var(--c-input-border);
}

.pwd-textarea:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3rpx rgba(230, 162, 60, 0.15);
}

/* ==================== 申请记录 ==================== */
.req-box {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.req-list {
  max-height: 600rpx;
  margin-bottom: 16rpx;
}

.req-item {
  background: var(--c-input);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
  border: 1rpx solid var(--c-input-border);
  transition: transform 0.15s;
}

.req-item:active {
  transform: scale(0.98);
}

.req-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.req-name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-title);
}

.req-status {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 100rpx;
  font-weight: 600;
}

.rs-pending { background: #fff7e6; color: #fa8c16; }
.rs-approved { background: #f6ffed; color: #52c41a; }
.rs-rejected { background: #fff2f0; color: #ff7875; }

.req-date {
  font-size: 20rpx;
  color: var(--c-sub);
  display: block;
  margin-bottom: 8rpx;
}

.req-payload {
  background: var(--c-card);
  border-radius: 12rpx;
  padding: 14rpx;
  margin-bottom: 8rpx;
  border: 1rpx solid var(--c-input-border);
}

.req-line {
  font-size: 22rpx;
  color: var(--c-title);
  display: block;
  line-height: 1.6;
}

.req-review {
  font-size: 22rpx;
  color: #ff7875;
  background: #fff2f0;
  border-radius: 10rpx;
  padding: 10rpx 14rpx;
  display: block;
  margin-top: 6rpx;
  border-left: 4rpx solid #ff7875;
}

.req-reviewed {
  font-size: 20rpx;
  color: var(--c-sub);
  display: block;
  margin-top: 6rpx;
}

.req-empty {
  font-size: 24rpx;
  color: var(--c-sub);
  text-align: center;
  padding: 40rpx 0;
}

.req-msg {
  font-size: 24rpx;
  color: var(--c-title);
  display: block;
  line-height: 1.6;
  margin-top: 6rpx;
}

.pwd-btn.ghost {
  background: var(--c-input);
  color: var(--c-title);
  box-shadow: none;
  border: 1rpx solid var(--c-input-border);
}

/* ==================== 老师详情 ==================== */
.teacher-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 10rpx 0;
}

.td-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe082 0%, #ffcc02 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 20rpx rgba(255, 193, 7, 0.25);
}

.td-name {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-title);
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.teacher-role {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 100rpx;
  font-weight: 600;
}

.teacher-role.head { background: #fff7e6; color: #fa8c16; }
.teacher-role.subject { background: #e6f7ff; color: #1890ff; }

.td-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14rpx 0;
  border-bottom: 1rpx solid var(--c-input-border);
}

.td-label {
  font-size: 24rpx;
  color: var(--c-sub);
  flex-shrink: 0;
  font-weight: 500;
}

.td-val {
  font-size: 24rpx;
  color: var(--c-title);
  font-weight: 600;
  text-align: right;
  flex: 1;
  margin-left: 16rpx;
}

/* ==================== 暗色模式覆盖 ==================== */
.dark .greeting-wrap {
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 100%);
  box-shadow:
    0 8rpx 32rpx rgba(184, 134, 11, 0.3),
    0 2rpx 8rpx rgba(184, 134, 11, 0.2),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.15);
}

.dark .action-card {
  background: #2a2420;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.dark .info-label { color: #e0d5c8; }

.dark .stu-info-card {
  background: #2a2420;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.dark .stu-name { color: #f5efe6; }
.dark .stu-meta { color: #a89f91; }

.dark .stat-card {
  background: #2a2420;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.dark .stat-value { color: #f5efe6; }
.dark .stat-label { color: #a89f91; }

.dark .tabs {
  background: #2a2420;
  box-shadow:
    0 2rpx 12rpx rgba(0, 0, 0, 0.15),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.04);
}

.dark .tab { color: #a89f91; }

.dark .tab.on {
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 100%);
  box-shadow: 0 4rpx 12rpx rgba(184, 134, 11, 0.35);
}

.dark .subscribe-card {
  background: linear-gradient(135deg, #2e2a1a 0%, #332d1a 100%);
  border-color: rgba(230, 162, 60, 0.2);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.dark .sub-title { color: #f5d78e; }
.dark .sub-desc { color: #c4a96a; }

.dark .sub-icon-area {
  background: linear-gradient(135deg, #8d6e63 0%, #a1887f 100%);
  box-shadow: 0 4rpx 12rpx rgba(141, 110, 99, 0.3);
}

.dark .sub-btn {
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 100%);
  box-shadow: 0 4rpx 12rpx rgba(184, 134, 11, 0.35);
}

.dark .sub-close { color: #6d6458; }

.dark .load-err {
  background: linear-gradient(135deg, #3e2723 0%, #4e342e 100%);
  color: #ffab91;
  border-color: rgba(255, 171, 145, 0.2);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.dark .pwd-box {
  background: #2a2420;
  box-shadow:
    0 16rpx 48rpx rgba(0, 0, 0, 0.3),
    0 4rpx 16rpx rgba(0, 0, 0, 0.2);
}

.dark .pwd-title { color: #f5efe6; }
.dark .pwd-close { color: #a89f91; }
.dark .pwd-close:active { background: rgba(255, 255, 255, 0.05); }

.dark .pwd-ok {
  background: linear-gradient(135deg, #1a2e1a 0%, #253d25 100%);
  color: #95de64;
  border-color: rgba(149, 222, 100, 0.2);
}

.dark .pwd-err {
  background: linear-gradient(135deg, #2e1a1a 0%, #3d2525 100%);
  color: #ff9e9e;
  border-color: rgba(255, 158, 158, 0.2);
}

.dark .pwd-label { color: #a89f91; }
.dark .pwd-input { background: #1e1915; border-color: rgba(255, 255, 255, 0.08); color: #f5efe6; }
.dark .pwd-textarea { background: #1e1915; border-color: rgba(255, 255, 255, 0.08); color: #f5efe6; }

.dark .pwd-btn {
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 100%);
  box-shadow: 0 4rpx 16rpx rgba(184, 134, 11, 0.3);
}

.dark .pwd-tip {
  background: #2e2a1a;
  color: #c4a96a;
  border-left-color: #d4a017;
}

.dark .req-item { background: #1e1915; border-color: rgba(255, 255, 255, 0.06); }
.dark .req-name { color: #f5efe6; }
.dark .req-date { color: #a89f91; }
.dark .req-payload { background: #2a2420; border-color: rgba(255, 255, 255, 0.06); }
.dark .req-line { color: #e0d5c8; }
.dark .req-review { background: #2e1a1a; color: #ff9e9e; border-left-color: #ff7875; }
.dark .req-reviewed { color: #6d6458; }
.dark .req-empty { color: #a89f91; }
.dark .req-msg { color: #e0d5c8; }

.dark .rs-pending { background: #2e2a1a; color: #ffc069; }
.dark .rs-approved { background: #1a2e1a; color: #95de64; }
.dark .rs-rejected { background: #2e1a1a; color: #ff9e9e; }

.dark .pwd-btn.ghost { background: #1e1915; color: #e0d5c8; border-color: rgba(255, 255, 255, 0.08); }

.dark .td-avatar {
  background: linear-gradient(135deg, #8d6e63 0%, #a1887f 100%);
  box-shadow: 0 6rpx 20rpx rgba(141, 110, 99, 0.3);
}

.dark .td-name { color: #f5efe6; }
.dark .td-row { border-color: rgba(255, 255, 255, 0.06); }
.dark .td-label { color: #a89f91; }
.dark .td-val { color: #e0d5c8; }

.dark .teacher-role.head { background: #2e2a1a; color: #ffc069; }
.dark .teacher-role.subject { background: #1a2330; color: #69c0ff; }

.dark .spinner {
  border-color: rgba(184, 134, 11, 0.2);
  border-top-color: #d4a017;
}

.dark .loading-text { color: #a89f91; }

.dark .logout-btn {
  background: #2a2420;
  border-color: rgba(255, 120, 117, 0.2);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.dark .logout-btn .info-label { color: #ff9e9e; }
</style>
