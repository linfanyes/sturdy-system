<template>
  <view class="page" :class="{ dark }">
    <!-- 错误/重试态 -->
    <view class="load-err" v-if="loadError" @tap="load">⚠️ 数据加载失败，点击重试</view>
    <!-- 加载态 -->
    <view class="loading-mask" v-if="loading">
      <view class="spinner"></view>
      <text class="loading-text">加载中…</text>
    </view>
    <view class="hd">
      <view class="t">🏡 {{ greeting }}{{ me?.studentName ? me.studentName + '同学家长' : '家长' }}</view>
      <view class="hd-actions">
        <text class="out" @click="openEditStudentInfo">📝 维护信息</text>
        <text class="out" @click="openStudentRequests">📋 申请记录</text>
        <text class="out" @click="openMessageCenter">💬 留言</text>
        <text class="out" @click="goKidsCoding">🧩 少儿编程</text>
        <text class="out" @click="goMood">🌤️ 心情打卡</text>
        <text class="out" @click="goTimeline">🌈 成长时光机</text>
        <text class="out" @click="goNotifySettings">🔔 通知设置</text>
        <text class="out" @click="showPwdModal = true">🔑 改密</text>
        <text class="out" @click="logout">退出</text>
      </view>
    </view>
    <view class="stu-bar" v-if="me && me.studentName">
      <text class="sb-item">姓名：{{ me.studentName }}</text>
      <text class="sb-item">学号：{{ me.studentNo || '--' }}</text>
      <text class="sb-item">班级：{{ me.className || '--' }}</text>
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
      <view v-if="hasPf('notices')" class="stat-card clickable" @tap="tab = 'pending'">
        <view class="stat-label">📢 待读通知</view>
        <view class="stat-value">{{ stats.notices }}</view>
      </view>
      <view v-if="hasPf('homework')" class="stat-card clickable" @tap="tab = 'pending'">
        <view class="stat-label">📝 待完成作业</view>
        <view class="stat-value">{{ stats.homework }}</view>
      </view>
      <view v-if="(hasPf('grades') || hasPf('analysis')) && notifyPref.showGrade" class="stat-card clickable" @tap="tab = 'scores'">
        <view class="stat-label">📊 最近考试</view>
        <view class="stat-value">{{ stats.pct }}</view>
        <view v-if="stats.pctDelta != null && stats.pctDelta !== 0" class="stat-delta" :class="stats.pctDelta > 0 ? 'up' : 'down'">
          较上次 {{ stats.pctDelta > 0 ? '+' : '' }}{{ stats.pctDelta }}%
        </view>
      </view>
      <view v-if="(hasPf('grades') || hasPf('analysis')) && notifyPref.showRank" class="stat-card clickable" @tap="tab = 'scores'">
        <view class="stat-label">🏆 最新排名</view>
        <view class="stat-value">{{ stats.rank }}</view>
        <view v-if="stats.rankDelta != null && stats.rankDelta !== 0" class="stat-delta" :class="stats.rankDelta > 0 ? 'up' : 'down'">
          较上次 {{ stats.rankDelta > 0 ? '上升' : '下降' }}{{ Math.abs(stats.rankDelta) }}名
        </view>
      </view>
      <view v-if="moodStat" class="stat-card clickable" @tap="goMood">
        <view class="stat-label">🌤️ 今日心情</view>
        <view class="stat-value">{{ moodStat }}</view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <text v-if="showPendingTab" class="tab" :class="{ on: tab === 'pending' }" @click="tab = 'pending'">📋 待办公告</text>
      <text v-if="showScoresTab" class="tab" :class="{ on: tab === 'scores' }" @click="tab = 'scores'">📊 成绩查询</text>
      <text v-if="showAttendanceTab" class="tab" :class="{ on: tab === 'attendance' }" @click="tab = 'attendance'">📈 考勤</text>
      <text class="tab" :class="{ on: tab === 'textbook' }" @click="tab = 'textbook'; loadTextbooks()">📚 教材</text>
      <text class="tab" :class="{ on: tab === 'overview' }" @click="tab = 'overview'">💡 总览</text>
    </view>

    <!-- 订阅消息引导 -->
    <view class="subscribe-card" v-if="showSubscribeGuide">
      <view class="sub-icon">🔔</view>
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
 * - 未携带功能包（undefined/非数组，旧会话）→ 不限制，全部可见
 * - 空数组 → 班主任关闭该班家长全部功能
 * - 非空数组 → 仅开放数组内功能
 * 安全边界以后端为准。
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

// 作业「已完成」口径与 Web 端一致：已批改/已发还 同样视为完成
const DONE_HW_STATUSES = ['已完成', '已批改', '已发还']
const pendingHomework = computed(() => homework.value.filter(h => !DONE_HW_STATUSES.includes(h.status)).length)

// 考试按日期排序，取最近两次（用于「较上次」变化量，与 Web 端口径一致）
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
  return p - l // 正数 = 名次上升
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

// 联系老师：直接拨打班主任（或任一有电话的老师）号码，与 Web 端一致不再空提示
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
    success: (res) => {
      if (res.confirm) {
        uni.makePhoneCall({ phoneNumber: String(target.phone) })
      }
    },
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
      // 缺陷修复：切换孩子后通过 setParent 持久化新令牌 g_parent_token + 更新 machine。
      // 此前仅写内存 parent.token 不持久化，后续 parentApi 请求仍用旧令牌（从 storage 读），
      // 冷启动后也恢复为旧令牌→旧孩子。
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
function openTeacher(t) {
  teacherDetail.value = t
  showTeacherModal.value = true
}
function callTeacher(t) {
  if (t && t.phone) uni.makePhoneCall({ phoneNumber: String(t.phone) })
}
function messageThisTeacher(t) {
  showTeacherModal.value = false
  openMessageTeacher(t)
}

// 家长留言功能（给科任/班主任留言，复用后端 /messages）
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
  msgViewSent.value = false
  msgContent.value = ''
  msgError.value = ''
  msgOk.value = false
  if ((teachers.value || []).length) msgTeacherIdx.value = 0
  showMsgModal.value = true
}
function goKidsCoding() {
  uni.navigateTo({ url: '/pages/parent/kidsCoding' })
}
function goMood() {
  uni.navigateTo({ url: '/pages/parent/mood' })
}
function goTimeline() {
  uni.navigateTo({ url: '/pages/parent/timeline' })
}
function goNotifySettings() {
  uni.navigateTo({ url: '/pages/parent/notifySettings' })
}

// 今日心情卡：优先显示今天打卡，否则提示未打卡
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
  msgViewSent.value = false
  msgContent.value = ''
  msgError.value = ''
  msgOk.value = false
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
    msgOk.value = true
    msgContent.value = ''
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
    // 家长功能包：/parent-auth/me 返回当前孩子的有效功能，驱动页面显隐
    if (meResult.value && Array.isArray(meResult.value.effectiveFeatures)) {
      parent.user = { ...(parent.user || {}), effectiveFeatures: meResult.value.effectiveFeatures }
    }
    // 当前 Tab 被班主任关闭时回退到「总览」
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
.page { display: flex; flex-direction: column; height: 100vh; padding: 24rpx; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.hd-actions { display: flex; gap: 16rpx; flex-wrap: wrap; justify-content: flex-end; }
.stu-bar { display: flex; flex-wrap: wrap; gap: 20rpx; margin-bottom: 10rpx; background: var(--c-card); border-radius: 12rpx; padding: 16rpx 20rpx; }
.sb-item { font-size: 24rpx; color: var(--c-title); font-weight: 600; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.out { font-size: 24rpx; color: #9aa0a6; }
.tabs { display: flex; gap: 10rpx; margin-bottom: 14rpx; }
.tab { flex: 1; text-align: center; font-size: 28rpx; padding: 16rpx 0; border-radius: 12rpx; background: var(--c-card); color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; margin-bottom: 14rpx; }
.stat-card { background: var(--c-card); border-radius: 12rpx; padding: 14rpx 10rpx; text-align: center; }
.stat-card.clickable { transition: transform 0.15s, box-shadow 0.15s; }
.stat-card.clickable:active { transform: scale(0.96); }
.stat-label { font-size: 22rpx; color: var(--c-sub); margin-bottom: 6rpx; }
.stat-value { font-size: 28rpx; font-weight: 800; color: var(--c-title); }
.stat-delta { font-size: 18rpx; margin-top: 4rpx; line-height: 1.2; }
.stat-delta.up { color: #07c160; }
.stat-delta.down { color: #f56c6c; }
.subscribe-card { display: flex; align-items: center; gap: 12rpx; background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; position: relative; }
.sub-icon { font-size: 36rpx; flex-shrink: 0; }
.sub-text { flex: 1; min-width: 0; }
.sub-title { font-size: 26rpx; font-weight: 700; color: #2e7d32; display: block; }
.sub-desc { font-size: 22rpx; color: #558b2f; margin-top: 2rpx; }
.sub-btn { flex-shrink: 0; font-size: 24rpx; color: #fff; background: #43a047; padding: 8rpx 20rpx; border-radius: 30rpx; font-weight: 600; }
.sub-close { position: absolute; top: 6rpx; right: 12rpx; font-size: 28rpx; color: #9e9e9e; line-height: 1; }
.loading-mask { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20rpx; padding: 80rpx 0; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid var(--c-sub); border-top-color: #07c160; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: var(--c-sub); }
.load-err { background: #E6A23C; color: #fff; font-size: 26rpx; text-align: center; padding: 20rpx; border-radius: 14rpx; margin-bottom: 12rpx; }
.switch-role { text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #07c160; border-top: 1rpx solid #f0f0f0; margin-top: 20rpx; }
.pwd-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.pwd-box { width: 600rpx; background: var(--c-card); border-radius: 28rpx; padding: 40rpx; }
.pwd-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.pwd-title { font-size: 32rpx; font-weight: 800; color: var(--c-title); }
.pwd-close { font-size: 36rpx; color: var(--c-sub); }
.pwd-ok { font-size: 24rpx; color: #07c160; background: #e8f5e9; border-radius: 10rpx; padding: 14rpx; margin-bottom: 16rpx; }
.pwd-err { font-size: 24rpx; color: #e06c75; background: #fde8e8; border-radius: 10rpx; padding: 14rpx; margin-bottom: 16rpx; }
.pwd-label { font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; display: block; }
.pwd-input { background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--c-title); margin-bottom: 20rpx; }
.pwd-btn { background: var(--c-primary); color: #fff; font-size: 28rpx; font-weight: 700; border-radius: 14rpx; padding: 22rpx; margin-top: 8rpx; }
.pwd-btn[disabled] { opacity: 0.6; }
.pwd-tip { font-size: 22rpx; color: #9aa0a6; margin-bottom: 16rpx; display: block; }
.pwd-textarea { background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--c-title); margin-bottom: 20rpx; width: 100%; box-sizing: border-box; height: 120rpx; }
.req-box { max-height: 80vh; display: flex; flex-direction: column; }
.req-list { max-height: 600rpx; margin-bottom: 16rpx; }
.req-item { background: var(--c-input); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; }
.req-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.req-name { font-size: 26rpx; font-weight: 700; color: var(--c-title); }
.req-status { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.rs-pending { background: #fef3e0; color: #E6A23C; }
.rs-approved { background: #e8f5e9; color: #07c160; }
.rs-rejected { background: #fde8e8; color: #e06c75; }
.req-date { font-size: 20rpx; color: var(--c-sub); display: block; margin-bottom: 8rpx; }
.req-payload { background: var(--c-card); border-radius: 10rpx; padding: 12rpx; margin-bottom: 8rpx; }
.req-line { font-size: 22rpx; color: var(--c-title); display: block; line-height: 1.6; }
.req-review { font-size: 22rpx; color: #e06c75; background: #fde8e8; border-radius: 8rpx; padding: 8rpx 12rpx; display: block; margin-top: 6rpx; }
.req-reviewed { font-size: 20rpx; color: #9aa0a6; display: block; margin-top: 6rpx; }
.req-empty { font-size: 24rpx; color: var(--c-sub); text-align: center; padding: 40rpx 0; }
.req-msg { font-size: 24rpx; color: var(--c-title); display: block; line-height: 1.6; margin-top: 6rpx; }
.pwd-btn.ghost { background: var(--c-input); color: var(--c-title); }
.teacher-detail { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 10rpx 0; }
.td-avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: #fdf6ec; color: #E6A23C; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 600; }
.td-name { font-size: 32rpx; font-weight: 800; color: var(--c-title); display: flex; align-items: center; gap: 12rpx; }
.teacher-role { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 20rpx; }
.teacher-role.head { background: #fdf6ec; color: #E6A23C; }
.teacher-role.subject { background: #e8f4fd; color: #1C6FB3; }
.td-row { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.td-label { font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.td-val { font-size: 24rpx; color: var(--c-title); font-weight: 600; text-align: right; flex: 1; margin-left: 16rpx; }
</style>
