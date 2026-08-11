<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <view class="hd-left">
        <view class="t">🏫 {{ schoolName || '学校管理' }}</view>
        <view class="sub" v-if="schoolCode">编号：{{ schoolCode }}</view>
      </view>
      <view class="out" @click="logout">退出</view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <text class="tab" :class="{ on: tab === 'dashboard' }" @click="switchTab('dashboard')">📊 看板</text>
      <text class="tab" :class="{ on: tab === 'teachers' }" @click="switchTab('teachers')">👩‍🏫 教师</text>
      <text class="tab" :class="{ on: tab === 'classes' }" @click="switchTab('classes')">🏫 班级</text>
      <text class="tab" :class="{ on: tab === 'students' }" @click="switchTab('students')">🧑‍🎓 学生</text>
      <text class="tab" :class="{ on: tab === 'ai' }" @click="switchTab('ai')">🤖 AI 配置</text>
      <text class="tab" :class="{ on: tab === 'academic' }" @click="switchTab('academic')">📈 成绩</text>
    </view>

    <!-- ====== 看板 Tab ====== -->
    <template v-if="tab === 'dashboard'">
    <!-- 看板统计 -->
    <view class="dashboard">
      <view class="dash-card"><text class="dash-n">{{ dash.totalTeachers }}</text><text class="dash-l">教师</text></view>
      <view class="dash-card"><text class="dash-n">{{ dash.activeTeachers }}</text><text class="dash-l">启用</text></view>
      <view class="dash-card"><text class="dash-n">{{ dash.totalClasses }}</text><text class="dash-l">班级</text></view>
      <view class="dash-card"><text class="dash-n">{{ dash.totalStudents }}</text><text class="dash-l">学生</text></view>
    </view>
    <!-- 第二行统计 -->
    <view class="dashboard dash-row2">
      <view class="dash-card" v-if="dash.attendanceRate != null">
        <text class="dash-n" :class="dash.attendanceRate < 80 ? 'warn' : ''">{{ dash.attendanceRate }}%</text>
        <text class="dash-l">今日出勤</text>
      </view>
      <view class="dash-card">
        <text class="dash-n" :class="dash.pendingHomework > 0 ? 'warn' : ''">{{ dash.pendingHomework }}</text>
        <text class="dash-l">待批改</text>
      </view>
      <view class="dash-card">
        <text class="dash-n">{{ dash.parentEnabled || 0 }}</text>
        <text class="dash-l">家长开通</text>
      </view>
    </view>

    <!-- 学校功能包（与 Web 端 /school-admin/features 对齐，校管可编辑本校开关） -->
    <view class="notice-section">
      <view class="notice-hd">
        <text class="notice-title">⚙️ 学校功能包</text>
        <text class="act" @click="goSchoolFeatures">配置</text>
      </view>
      <view class="notice-list">
        <text class="notice-item-content">关闭某功能包后，该校教师与家长访问该功能将被后端拦截；默认全部开启。</text>
      </view>
    </view>

    <!-- 学校公告 -->
    <view class="notice-section">
      <view class="notice-hd">
        <text class="notice-title">📢 学校公告</text>
        <text v-if="!showNoticeForm" class="act" @click="showNoticeForm=true">写公告</text>
        <text v-else class="act" @click="showNoticeForm=false">收起</text>
      </view>
      <view v-if="showNoticeForm" class="notice-form">
        <input v-model="noticeForm.title" class="inp" placeholder="公告标题（必填）" />
        <textarea v-model="noticeForm.content" class="inp notice-textarea" placeholder="公告内容（选填）" />
        <button class="notice-send" :disabled="saving" @click="sendNotice">{{ saving ? '发送中…' : '发送公告' }}</button>
      </view>
      <view class="notice-list">
        <EmptyState v-if="!schoolNotices.length" icon="📢" text="暂无学校公告" hint="写一条公告发给全体教师" />
        <view class="notice-item" v-for="n in schoolNotices" :key="n.id">
          <view class="notice-item-hd">
            <text class="notice-item-title">{{ n.title }}</text>
            <text class="act del" @click.stop="delNotice(n)">删除</text>
          </view>
          <text class="notice-item-content" v-if="n.content">{{ n.content }}</text>
          <text class="notice-item-time">{{ n.createdAt ? n.createdAt.slice(0, 10) : '' }}</text>
        </view>
      </view>
    </view>

    <!-- 智慧中小学（与 Web 端 /school-admin/zhzx 对齐，校管可查看国家平台在线课程） -->
    <view class="notice-section">
      <view class="notice-hd">
        <text class="notice-title">🎓 智慧中小学</text>
        <text class="act" @click="goZhzx">进入</text>
      </view>
      <view class="notice-list">
        <text class="notice-item-content">国家中小学智慧教育平台 · 在线观看官方课程，与教师端资源中心一致。</text>
      </view>
    </view>

    <!-- 学期管理（仅看板 Tab 显示，避免占用其它 Tab 空间） -->
    <view class="notice-section">
      <view class="notice-hd">
        <text class="notice-title">🗓️ 学期管理</text>
        <text v-if="!showSemesterForm" class="act" @click="openCreateSemester">＋ 新增</text>
        <text v-else class="act" @click="showSemesterForm=false">收起</text>
      </view>
      <view v-if="showSemesterForm" class="notice-form">
        <input v-model="semesterForm.name" class="inp" placeholder="学期名称（如：2026春季学期）" />
        <view class="semester-date-row">
          <input v-model="semesterForm.startDate" class="inp sem-date" placeholder="开始日期 2026-02-17" />
          <text class="sem-date-sep">~</text>
          <input v-model="semesterForm.endDate" class="inp sem-date" placeholder="结束日期 2026-07-04" />
        </view>
        <button class="notice-send" :disabled="saving" @click="saveSemester">{{ saving ? '保存中…' : '创建学期' }}</button>
      </view>
      <view class="notice-list">
        <div v-if="!semesters.length" class="empty" style="padding:20rpx 0">暂无学期，点击上方「新增」创建</div>
        <view class="notice-item" v-for="s in semesters" :key="s.id">
          <view class="notice-item-hd">
            <text class="notice-item-title">{{ s.name }}</text>
            <text v-if="s.current" class="badge on">当前</text>
            <text class="ndate">{{ s.startDate }} ~ {{ s.endDate }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 演示模式（仅看板 Tab 显示） -->
    <view class="demo-section">
      <view class="demo-row">
        <view class="demo-text">
          <text class="demo-name">🛝 教师系统演示</text>
          <text class="demo-sub">以教师身份预览所有功能，体验教师端完整流程</text>
        </view>
      </view>
      <button class="demo-btn" @click="enterDemoMode">进入教师系统演示</button>
    </view>
    </template>

    <!-- ====== 教师管理 Tab ====== -->
    <template v-if="tab === 'teachers'">
      <TeacherManage
        ref="teacherManageRef"
        :teachers="teachers"
        :teacher-total="teacherTotal"
        :saving="saving"
        @open-create="openCreateTeacher"
        @open-edit="openEditTeacher"
        @go-teacher-detail="goTeacherDetail"
        @open-features="openFeatures"
        @reset-pwd="resetPwd"
        @del-teacher="delTeacher"
        @save-form="saveForm"
        @do-reset-pwd="doResetPwd"
        @do-batch-import="doBatchImport"
        @export-teachers="exportTeachers"
        @load-more="loadMoreTeachers"
      />
    </template>

    <!-- ====== 班级管理 Tab ====== -->
    <template v-if="tab === 'classes'">
      <ClassManage
        ref="classManageRef"
        :classes="classes"
        :teachers="teachers"
        :saving="saving"
        :class-preview="classPreview"
        :class-ai-recognizing="classAiRecognizing"
        @open-create-class="openCreateClass"
        @open-edit-class="openEditClass"
        @show-class-detail="onShowClassDetail"
        @del-class="delClass"
        @promote-class="onPromoteClass"
        @save-class="saveClass"
        @pick-class-file="pickClassFile"
        @pick-class-image="pickClassImage"
        @commit-class-import="commitClassImport"
        @copy-class-tpl="copyClassTpl"
        @do-promote-class="doPromoteClass"
        @go-class-students="goClassStudents"
        @export-xls="exportClassesXls"
      />
    </template>

    <!-- 功能配置（全屏） -->
    <FeatureConfig
      ref="featureConfigRef"
      :visible="!!featUser"
      :feat-user="featUser"
      :school-feature-flags="schoolFlags"
      :saving="saving"
      @close="featUser = null"
      @save="saveFeatures"
      @load-school-flags="loadSchoolFlags"
    />

    <!-- ====== 学生管理 Tab ====== -->
    <template v-if="tab === 'students'">
      <view class="bar">
        <text class="sc">共 {{ schoolStudents.length }} 名学生</text>
        <view class="bar-acts">
          <input v-model="studentFilter" class="filter-inp" placeholder="输入姓名搜索…" />
          <text class="act" @click="showStudentImport = true">📋 批量导入</text>
          <text class="act export" @click="exportStudentsXls">📥 XLS</text>
          <text class="act export" @click="exportStudents">📥 CSV</text>
        </view>
      </view>
      <scroll-view scroll-y class="sa-student-scroll" :scroll-top="studentScrollTop" lower-threshold="150" @scrolltolower="loadMoreStudents">
        <EmptyState v-if="!schoolStudents.length" icon="🧑‍🎓" text="暂无学生" hint="需先创建班级和教师" />
        <view class="row" v-for="s in studentShown" :key="s.id">
          <view class="info" @click="openEditStudent(s)">
            <view class="nm-line">
              <text class="nm">{{ s.name }}</text>
              <text class="badge on">{{ s.gender || '未知' }}</text>
            </view>
            <view class="meta">学号：{{ s.studentNo }} · 班级：{{ s.className || s.classId?.slice(0,8) }}</view>
          </view>
          <view class="acts" v-if="s.parentLoginEnabled">
            <text class="badge on">家长已开通</text>
          </view>
          <view class="acts">
            <text class="act" @click.stop="showStudentDetail(s)">详情</text>
          </view>
        </view>
        <view v-if="studentHasMore" class="sa-load-more">下滑加载更多（剩余 {{ filteredStudents.length - studentShown.length }} 人）</view>
        <view v-if="!studentHasMore && studentShown.length" class="sa-load-more end">— 已经到底了 —</view>
      </scroll-view>

      <!-- 学生档案弹窗 -->
      <view v-if="showStudentProfile" class="mask" @click="showStudentProfile = false">
        <view class="sheet safe-bottom" @click.stop>
          <view class="sh-t">{{ profile.name }} 的档案</view>
          <view class="sh-meta">{{ profile.gender }} · 学号 {{ profile.studentNo || '—' }}</view>
          <view class="sh-section" v-if="profile.className">
            <text class="sh-lbl">班级：</text><text class="sh-val">{{ profile.className }}</text>
          </view>
          <view class="sh-section" v-if="profile.parentName">
            <text class="sh-lbl">家长：</text><text class="sh-val">{{ profile.parentName }} <text v-if="profile.parentPhone" class="pf-dial" @click="dial(profile.parentPhone)">📞 拨号</text></text>
          </view>
          <view class="sh-section" v-if="profile.address">
            <text class="sh-lbl">地址：</text><text class="sh-val">{{ profile.address }}</text>
          </view>
          <view class="sh-section" v-if="profile.studentPhone">
            <text class="sh-lbl">学生电话：</text><text class="sh-val">{{ profile.studentPhone }}</text>
          </view>
          <view class="sh-section" v-if="profile.duty">
            <text class="sh-lbl">班级职务：</text><text class="sh-val">{{ profile.duty }}</text>
          </view>
          <view class="sh-section" v-if="profile.tags && profile.tags.length">
            <text class="sh-lbl">标签：</text>
            <text class="tag" v-for="t in profile.tags" :key="t">{{ t }}</text>
          </view>
          <view class="sh-section" v-if="profile.note">
            <text class="sh-lbl">备注：</text><text class="sh-val">{{ profile.note }}</text>
          </view>
          <button class="cancel" @click="showStudentProfile = false">关闭</button>
        </view>
      </view>

      <!-- 编辑学生（全屏） -->
      <view v-if="editingStudent" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="editingStudent=null">← 返回</text>
            <text class="full-title">编辑学生</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view class="form-item">
              <text class="label">姓名</text>
              <input v-model="editStudentForm.name" class="inp" placeholder="学生姓名" />
            </view>
            <view class="form-item">
              <text class="label">性别</text>
              <picker class="picker" mode="selector" :range="['男','女']" @change="(e) => editStudentForm.gender = ['男','女'][e.detail.value]">
                <view class="picker-inp">{{ editStudentForm.gender || '请选择' }}</view>
              </picker>
            </view>
            <view class="form-item">
              <text class="label">家长姓名</text>
              <input v-model="editStudentForm.parentName" class="inp" placeholder="选填" />
            </view>
            <view class="form-item">
              <text class="label">家长电话</text>
              <input v-model="editStudentForm.parentPhone" class="inp" placeholder="选填" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="btn" :disabled="saving" @click="saveStudent">{{ saving ? '保存中…' : '保存修改' }}</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 批量导入学生（全屏） -->
    <view v-if="showStudentImport" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showStudentImport = false">← 返回</text>
          <text class="full-title">批量导入学生</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="form-item">
            <text class="label">导入到班级 <text class="req">*</text></text>
            <picker class="picker" mode="selector" :range="importClassNames" @change="onImportClassPick">
              <view class="picker-inp">{{ importClassName || '请选择班级' }}</view>
            </picker>
          </view>
          <view class="hint-block">
            支持 Excel(.xlsx/.xls) 或 TXT/CSV，每行：姓名,性别,学号,家长姓名,家长电话
            <text class="hint-example">例：张三,男,2026001,张父,13800000001</text>
          </view>
          <button class="btn import-btn" @click="showStudentTpl = true">📄 查看模板</button>
          <button class="btn import-btn" @click="pickStudentFile">📂 选择文件</button>
          <button class="btn import-btn ai" :disabled="studentAiRecognizing" @click="pickStudentImage">{{ studentAiRecognizing ? '识别中…' : '📷 拍照/选图识别' }}</button>
          <view class="imp-tip ai-tip">用 AI 识别学生名单图片（需后端配置多模态模型）</view>

          <view v-if="studentPreview" class="preview">
            <view class="pv-sum">
              校验结果：<text class="ok">有效 {{ studentPreview.validCount }}</text> ·
              <text class="bad">异常 {{ studentPreview.errorCount }}</text> / 共 {{ studentPreview.rows.length }} 行
            </view>
            <view v-if="studentPreview.errorCount" class="pv-errs">
              <view v-for="(r, i) in studentPreview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
                第{{ r.line }}行 {{ r.name || '(空)' }}：{{ r.error }}
              </view>
            </view>
            <button class="btn" :disabled="!studentPreview.validCount || saving" @click="commitStudentImport">确认导入 {{ studentPreview.validCount }} 条</button>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 学生模板弹窗 -->
    <view v-if="showStudentTpl" class="mask" @click="showStudentTpl = false">
      <view class="dialog" @click.stop>
        <view class="d-title">学生导入模板格式</view>
        <view class="d-sub">第一行可写表头（姓名,性别,学号,家长姓名,家长电话），数据从下一行开始：</view>
        <view class="d-code">姓名,性别,学号,家长姓名,家长电话
张三,男,2026001,张父,13800000001
李四,女,2026002,李母,13800000002</view>
        <button class="d-copy" @click="copyStudentTpl">📋 复制示例</button>
        <button class="d-close" @click="showStudentTpl = false">关闭</button>
      </view>
    </view>

    <!-- ====== AI 配置 Tab ====== -->
    <template v-if="tab === 'ai'">
      <AiSettings
        ref="aiSettingsRef"
        :ai-config="ai"
        :ai-providers="aiProviders"
        :ai-provider-code="aiProviderCode"
        :ai-provider-idx="aiProviderIdx"
        :saving-ai="savingAi"
        @save-ai="saveAi"
      />
    </template>

    <!-- ====== 成绩 Tab（只读，P2：校管可跨班级查看本校成绩/考试/汇总） ====== -->
    <template v-if="tab === 'academic'">
      <!-- 学科汇总分析 -->
      <view class="notice-section">
        <view class="notice-hd">
          <text class="notice-title">📊 学科汇总分析</text>
          <text class="act" @click="loadAcademic">{{ acadLoading ? '加载中…' : '刷新' }}</text>
        </view>
        <view v-if="acadSummary.subjects.length" class="acad-grid">
          <view class="acad-card" v-for="s in acadSummary.subjects" :key="s.subject">
            <view class="acad-s">{{ s.subject }}</view>
            <view class="acad-line">样本 <text class="acad-v">{{ s.count }}</text></view>
            <view class="acad-line">均分 <text class="acad-v">{{ s.avg }}</text></view>
            <view class="acad-line">及格率 <text class="acad-v">{{ s.passRate }}%</text></view>
            <view class="acad-line">高 / 低 <text class="acad-v">{{ s.max }} / {{ s.min }}</text></view>
          </view>
        </view>
        <EmptyState v-else icon="📊" text="暂无成绩数据" hint="教师录入成绩后自动汇总" />
      </view>

      <!-- 考试列表 -->
      <view class="notice-section">
        <view class="notice-hd">
          <text class="notice-title">📝 考试列表</text>
          <text class="act-sub">{{ acadExams.length }} 场</text>
        </view>
        <view class="notice-list">
          <EmptyState v-if="!acadExams.length" icon="📝" text="暂无考试" />
          <view class="notice-item" v-for="e in acadExams" :key="e.id">
            <view class="notice-item-hd">
              <text class="notice-item-title">{{ e.name }}</text>
            </view>
            <text class="notice-item-content">{{ acadClassName(e.classId) }}{{ e.subjects && e.subjects.length ? ' · ' + e.subjects.join('、') : '' }} · {{ e.date || '' }} · {{ e.term || '' }}</text>
          </view>
        </view>
      </view>

      <!-- 成绩列表 -->
      <view class="notice-section">
        <view class="notice-hd">
          <text class="notice-title">📈 成绩记录</text>
          <text class="act-sub">{{ acadGrades.length }} 条</text>
        </view>
        <view class="notice-list">
          <EmptyState v-if="!acadGrades.length" icon="📈" text="暂无成绩记录" />
          <view class="notice-item" v-for="g in acadGrades" :key="g.id">
            <view class="notice-item-hd">
              <text class="notice-item-title">{{ g.examName }} · {{ g.subject }}</text>
            </view>
            <text class="notice-item-content">{{ acadClassName(g.classId) }} · {{ g.date || '' }} · {{ scoreSummary(g) }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { setMockMode } from '../../common/request'
import { DEMO_MODE_ENABLED, CLOUDRUN_ENV, CLOUDRUN_SERVICE } from '../../common/config'
import { auth, setAuth, setFeatureProfile } from '../../common/store'
import { isPhone } from '../../common/validators'
import { safeParse } from '../../common/util'
import { compressImage } from '../../common/image'
import { copyText } from '../../common/print'
import { ALL_SUBJECTS } from '../../common/subject-schema'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import TeacherManage from './components/TeacherManage.vue'
import ClassManage from './components/ClassManage.vue'
import FeatureConfig from './components/FeatureConfig.vue'
import AiSettings from './components/AiSettings.vue'

const dark = computed(() => theme.mode === 'dark')
const teachers = ref([])
const saving = ref(false)
const teacherPage = ref(0)
const teacherTotal = ref(0)
const TEACHER_PAGE_SIZE = 50
const teacherManageRef = ref(null)
const classManageRef = ref(null)
const featureConfigRef = ref(null)
const aiSettingsRef = ref(null)

// 看板数据（对接后端 GET /school-admin/dashboard，P0-1 修复：原先为空函数导致看板一直显示 0）
const dash = ref({ totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0, totalClasses: 0, totalStudents: 0, attendanceRate: null, pendingHomework: 0, parentEnabled: 0 })
async function loadDashboard() {
  try {
    const r = await apiCall('GET', '/school-admin/dashboard') || {}
    const d = (r && typeof r === 'object') ? r : {}
    dash.value = {
      totalTeachers: d.totalTeachers || 0,
      activeTeachers: d.activeTeachers || 0,
      inactiveTeachers: d.inactiveTeachers || 0,
      totalClasses: d.totalClasses || 0,
      totalStudents: d.totalStudents || 0,
      attendanceRate: d.attendanceRate != null ? d.attendanceRate : null,
      pendingHomework: d.pendingHomework || 0,
      parentEnabled: d.parentEnabled || 0,
    }
  } catch (e) {
    // 看板加载失败时保留初始 0 值，避免整页报错
  }
}

const saUser = safeParse(uni.getStorageSync('sa_user') || '{}', {})
const schoolName = ref(saUser.schoolName || '')
const schoolCode = ref(saUser.schoolCode || '')

// 功能配置相关
const featUser = ref(null)
const schoolFlags = ref(Array.isArray(auth.schoolFeatureFlags) && auth.schoolFeatureFlags.length ? auth.schoolFeatureFlags : null)
async function loadSchoolFlags() {
  try {
    const me = await apiCall('GET', '/auth/me')
    const flags = me && me.schoolFeatureFlags
    schoolFlags.value = Array.isArray(flags) && flags.length ? flags : null
    setFeatureProfile(me)
    if (featureConfigRef.value) featureConfigRef.value.setSchoolFlags(schoolFlags.value)
  } catch (e) {}
}
function blockedBySchool(key) {
  if (schoolFlags.value === null) return false
  return schoolFlags.value.indexOf(key) < 0
}
async function saveFeatures(user, features) {
  saving.value = true
  try {
    await apiCall('PATCH', '/school-admin/teachers/' + user.id + '/features', { features })
    featUser.value = null
    await loadTeachers()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
  saving.value = false
}
function openFeatures(u) {
  featUser.value = u
  loadSchoolFlags()
}

function getToken() { return uni.getStorageSync('sa_token') }

async function apiCall(method, path, data) {
  const token = getToken()
  if (!token) { uni.reLaunch({ url: '/pages/login/login' }); throw new Error('未登录') }
  const cloud = typeof wx !== 'undefined' && wx.cloud
  if (!cloud || typeof cloud.callContainer !== 'function') {
    throw new Error('当前环境不支持云托管私有链路')
  }
  return new Promise((resolve, reject) => {
    const opts = {
      config: { env: CLOUDRUN_ENV },
      path: '/api' + path,
      method,
      header: { 'content-type': 'application/json', 'X-WX-SERVICE': CLOUDRUN_SERVICE, Authorization: 'Bearer ' + token },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          const msg = r.data && (r.data.message || r.data.error)
          uni.removeStorageSync('sa_token'); uni.removeStorageSync('sa_user'); uni.removeStorageSync('g_token')
          uni.removeStorageSync('g_user'); uni.removeStorageSync('g_mock_mode')
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error(msg || '登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else { const msg = (r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')'); reject(new Error(msg)) }
      },
      fail: (e) => { reject(new Error((e && (e.errMsg || e.message)) || '网络异常')) },
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') opts.data = data
    cloud.callContainer(opts)
  })
}

async function loadTeachers() {
  try {
    const r = await apiCall('GET', '/school-admin/teachers?skip=0&take=' + TEACHER_PAGE_SIZE) || { items: [], total: 0 }
    teachers.value = r.items || r
    teacherTotal.value = r.total || teachers.value.length
    teacherPage.value = 1
  } catch (e) { teachers.value = [] }
}

async function loadMoreTeachers() {
  const skip = teacherPage.value * TEACHER_PAGE_SIZE
  try {
    const r = await apiCall('GET', `/school-admin/teachers?skip=${skip}&take=${TEACHER_PAGE_SIZE}`) || { items: [], total: 0 }
    const more = r.items || r
    if (more.length) { teachers.value = [...teachers.value, ...more]; teacherPage.value++ }
  } catch (e) {}
}

// Teacher manage events
function openCreateTeacher() { teacherManageRef.value?.openCreateForm() }
function openEditTeacher(u) { teacherManageRef.value?.openEditForm(u) }
function goTeacherDetail(u) { uni.navigateTo({ url: '/pages/community/teacher-detail?id=' + u.id + '&userId=' + (u.teacherId || u.id) }) }
function resetPwd(u) { teacherManageRef.value?.resetPwd(u) }
async function delTeacher(u) {
  uni.showModal({
    title: '删除教师',
    content: '确定删除「' + u.name + '」？',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/teachers/' + u.id)
        teachers.value = teachers.value.filter(x => x.id !== u.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => { loadTeachers() }, 500)
      } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none', duration: 3000 }) }
    },
  })
}
async function saveForm(formData, editingId) {
  const f = formData
  if (!f.username || !f.name) return uni.showToast({ title: '用户名/姓名必填', icon: 'none' })
  if (!editingId && !f.password) return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  if (f.phone && !isPhone(f.phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  saving.value = true
  try {
    if (editingId) {
      const payload = { username: f.username, name: f.name, subject: f.subject, phone: f.phone, enabled: f.enabled }
      await apiCall('PATCH', '/school-admin/teachers/' + editingId, payload)
      if (f.password) await apiCall('POST', '/school-admin/teachers/' + editingId + '/reset-password', { password: f.password })
    } else {
      await apiCall('POST', '/school-admin/teachers', { username: f.username, name: f.name, subject: f.subject, password: f.password, phone: f.phone, enabled: f.enabled })
    }
    await loadTeachers()
    uni.showToast({ title: editingId ? '已保存' : '已创建', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none', duration: 3000 }) }
  saving.value = false
}
async function doResetPwd(user, pwd) {
  // 与 Web 端保持一致：留空则由后端生成随机密码；填写则必须 6-20 位
  const raw = (pwd || '').trim()
  if (raw && (raw.length < 6 || raw.length > 20)) {
    return uni.showToast({ title: '密码须为6-20位字符', icon: 'none' })
  }
  saving.value = true
  try {
    const r = await apiCall('POST', '/school-admin/teachers/' + user.id + '/reset-password', { password: raw })
    const actualPwd = (r && r.defaultPassword) || raw
    uni.showModal({ title: '密码已重置', content: '新密码：' + actualPwd + '\n请将此密码告知教师', showCancel: false, confirmText: '知道了' })
  } catch (e) { uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
  saving.value = false
}
async function doBatchImport(batchText) {
  const lines = batchText.trim().split('\n').filter(Boolean)
  const tList = lines.map(line => { const p = line.split(',').map(s => s.trim()); return { name: p[0] || '', username: p[1] || '', password: p[2] || '' } }).filter(t => t.name && t.username && t.password)
  if (!tList.length) return uni.showToast({ title: '格式错误', icon: 'none' })
  saving.value = true
  try {
    const r = await apiCall('POST', '/school-admin/teachers/batch', { teachers: tList })
    teacherManageRef.value?.setBatchResult(r.results || [])
    uni.showToast({ title: `成功 ${r.success || 0} / ${r.total || 0}`, icon: r.failed > 0 ? 'none' : 'success' })
    await loadTeachers()
  } catch (e) { uni.showToast({ title: e.message || '导入失败', icon: 'none' }) }
  saving.value = false
}

function logout() {
  setMockMode(false)
  uni.removeStorageSync('sa_token'); uni.removeStorageSync('sa_user')
  uni.removeStorageSync('g_token'); uni.removeStorageSync('g_user'); uni.removeStorageSync('g_mock_mode')
  uni.reLaunch({ url: '/pages/login/login' })
}

async function enterDemoMode() {
  if (!DEMO_MODE_ENABLED) { uni.showToast({ title: '演示模式仅限开发/预览版', icon: 'none' }); return }
  uni.showLoading({ title: '进入演示…' })
  try {
    setMockMode(true)
    setAuth('mock-teacher-token', { name: '珊珊老师', school: '阳光实验小学（演示版）', schoolId: 'demo-school', features: [] })
    uni.hideLoading(); uni.switchTab({ url: '/pages/dashboard/dashboard' })
  } catch (e) { uni.hideLoading() }
}

const tab = ref('dashboard')
function switchTab(t) { tab.value = t; if (t === 'classes') loadClasses(); if (t === 'students') loadStudents(); if (t === 'ai') loadAi(); if (t === 'academic') loadAcademic() }

// 成绩 Tab
const acadSummary = ref({ subjects: [], totalGrades: 0 })
const acadExams = ref([])
const acadGrades = ref([])
const acadLoading = ref(false)
function acadClassName(id) { const c = classes.value.find(x => x.id === id); return c ? c.name : (id || '') }
function scoreSummary(g) {
  const scores = (g.scores || []).filter(s => s.score != null).map(s => Number(s.score))
  if (!scores.length) return '暂无'
  return `${scores.length}人 均${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)} 最高${Math.max(...scores)} 最低${Math.min(...scores)}`
}
async function loadAcademic() {
  acadLoading.value = true
  try {
    const [sum, exams, grades] = await Promise.all([
      apiCall('GET', '/school-admin/academic/summary'),
      apiCall('GET', '/school-admin/academic/exams'),
      apiCall('GET', '/school-admin/academic/grades'),
    ])
    acadSummary.value = (sum && Array.isArray(sum.subjects)) ? sum : { subjects: [], totalGrades: 0 }
    acadExams.value = (exams && exams.items) || (Array.isArray(exams) ? exams : [])
    acadGrades.value = (grades && grades.items) || (Array.isArray(grades) ? grades : [])
  } catch (e) { uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' }) }
  finally { acadLoading.value = false }
}

function goSchoolFeatures() { uni.navigateTo({ url: '/pages/school-admin/school-features' }) }
function goZhzx() { uni.navigateTo({ url: '/pages/community/resource' }) }

// 导出教师
async function exportTeachers() {
  const blob = await apiCall('GET', '/school-admin/export/teachers')
  downloadBlob(blob, 'teachers.csv')
}
async function exportStudents() {
  const blob = await apiCall('GET', '/school-admin/export/students')
  downloadBlob(blob, 'students.csv')
}
function downloadBlob(data, name) {
  if (typeof data === 'string' && data) { copyText('\uFEFF' + data); return }
  uni.showModal({ title: '导出', content: '小程序端暂不支持直接保存 ' + (name || '文件') + '，请使用 Web 端导出。', showCancel: false })
}
function exportClasses() {
  const list = classes.value
  if (!list.length) return uni.showToast({ title: '没有可导出的班级', icon: 'none' })
  const head = '班级名称,年级,班级序号,班主任,学期,学科'
  const body = list.map(c => [c.name, c.grade, c.classNo || '', c.headTeacher || '', c.term || '', (c.subjects && c.subjects.length) ? c.subjects.join('/') : ''].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n')
  copyText('\uFEFF' + head + '\n' + body)
}
async function exportClassesXls() {
  uni.showModal({ title: '导出 XLS', content: '小程序端暂不支持直接保存 XLS 文件，请使用 Web 端「班级管理」导出 XLS；或点击下方按钮复制 CSV 数据。', confirmText: '复制 CSV', cancelText: '取消', success: (m) => { if (m.confirm) exportClasses() } })
}
async function exportStudentsXls() {
  uni.showModal({ title: '导出 XLS', content: '小程序端暂不支持直接保存 XLS 文件，请使用 Web 端「学生管理」导出 XLS；或点击下方按钮复制 CSV 数据。', confirmText: '复制 CSV', cancelText: '取消', success: (m) => { if (m.confirm) exportStudents() } })
}

// 班级管理事件
const classes = ref([])
const classPreview = ref(null)
const classAiRecognizing = ref(false)
function openCreateClass() { classManageRef.value?.openCreateClassForm() }
function openEditClass(c) { classManageRef.value?.openEditClassForm(c) }
function onPromoteClass(c) { classManageRef.value?.setPromoteTarget(c) }
function onShowClassDetail(c, cb) {
  // Fetch class detail then callback
  apiCall('GET', '/school-admin/classes/' + c.id).then(r => {
    const detail = { name: c.name || r.name || '', grade: c.grade || r.grade || '', term: c.term || r.term || '', headTeacher: c.headTeacher || r.headTeacher || '', studentCount: r.studentCount || 0, memberCount: (r.members || []).length, noticesCount: r.noticesCount || 0, subjects: c.subjects || r.subjects || [], members: r.members || [] }
    classManageRef.value?.showClassDetailOf(c)
  }).catch(() => classManageRef.value?.showClassDetailOf(c))
}
async function saveClass(formData, editingClassId) {
  const f = formData
  const { generateClassName } = await import('@gardener/shared/validators')
  const autoName = generateClassName(f.grade, f.classNo, { lenient: true })
  if (!autoName || !f.grade || !f.headTeacherId) return uni.showToast({ title: '年级/班号/班主任必填', icon: 'none' })
  const subjects = f.subjectsText ? f.subjectsText.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
  saving.value = true
  try {
    const payload = { name: autoName, grade: f.grade, classNo: f.classNo, headTeacherId: f.headTeacherId, term: f.term, subjects }
    if (editingClassId) { await apiCall('PATCH', '/school-admin/classes/' + editingClassId, payload) }
    else { await apiCall('POST', '/school-admin/classes', payload) }
    await loadClasses()
    uni.showToast({ title: editingClassId ? '已保存' : '创建成功', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
  saving.value = false
}
async function delClass(c) {
  uni.showModal({ title: '删除班级', content: '确定删除「' + c.name + '」？', confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/school-admin/classes/' + c.id); classes.value = classes.value.filter(x => x.id !== c.id); uni.showToast({ title: '已删除', icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) } },
  })
}
async function doPromoteClass(c, targetGrade) {
  if (!c || !targetGrade) return
  saving.value = true
  try {
    const r = await apiCall('POST', '/school-admin/classes/' + c.id + '/promote', { targetGrade })
    uni.showToast({ title: (r && r.message) || '已升级', icon: 'success' })
    await loadClasses()
  } catch (e) { uni.showToast({ title: e.message || '升级失败', icon: 'none' }) }
  saving.value = false
}
function goClassStudents(c) { uni.redirectTo({ url: '/pages/students/students?classId=' + c.id }) }
async function loadClasses() { try { const r = await apiCall('GET', '/school-admin/classes') || { items: [], total: 0 }; classes.value = Array.isArray(r) ? r : (r.items || []) } catch (e) { classes.value = [] } }

function pickClassFile() {
  uni.chooseMessageFile({ count: 1, type: 'file', extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try { const data = await readAsBase64(f.path); const r = await apiCall('POST', '/school-admin/classes/import-preview', { filename: f.name, data }); classPreview.value = r; if (!r.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' }) }
      catch (e) { uni.showToast({ title: '解析失败', icon: 'none' }) }
      finally { uni.hideLoading() }
    }, fail: () => {},
  })
}
function pickClassImage() {
  if (classAiRecognizing.value) return
  uni.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed', 'original'],
    success: async (res) => {
      const tempPath = res.tempFiles[0].tempFilePath; classAiRecognizing.value = true; uni.showLoading({ title: 'AI 识别中…', mask: true })
      try { const cmp = await compressImage({ src: tempPath, maxWidth: 1280, maxHeight: 1280, quality: 80, fileType: 'jpg' }); const base64 = await readAsBase64(cmp?.tempFilePath || tempPath); const r = await apiCall('POST', '/school-admin/classes/import-ai', { mode: 'image', data: base64, filename: 'class_list.jpg' }); classPreview.value = r }
      catch (e) { uni.showToast({ title: '识别失败', icon: 'none' }) }
      finally { uni.hideLoading(); classAiRecognizing.value = false }
    }, fail: () => {},
  })
}
async function commitClassImport() {
  if (!classPreview.value) return
  const items = classPreview.value.rows.filter((r) => r.valid)
  if (!items.length) return
  uni.showLoading({ title: '导入中…' })
  try {
    const classesPayload = items.map((r) => ({ name: r.name, grade: r.grade, classNo: r.classNo, headTeacher: r.headTeacher, term: r.term }))
    const r = await apiCall('POST', '/school-admin/classes/batch', { classes: classesPayload })
    uni.showToast({ title: `成功 ${r.success || 0} / ${r.total || 0}`, icon: r.failed > 0 ? 'none' : 'success' })
    classPreview.value = null; await loadClasses()
  } catch (e) { uni.showToast({ title: '导入失败', icon: 'none' }) }
  finally { uni.hideLoading() }
}
function copyClassTpl() {
  uni.setClipboardData({ data: '班级名称,年级,班级序号,班主任姓名,学期\n三年级1班,三年级,1,张老师,2026春季\n五年级2班,五年级,2,李老师,2026春季', success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => { wx.getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: (r) => resolve(r.data), fail: reject }) })
}

// 学校公告
const schoolNotices = ref([])
const showNoticeForm = ref(false)
const noticeForm = ref({ title: '', content: '' })
async function loadSemesters() { try { const r = await apiCall('GET', '/semesters') || { items: [], total: 0 }; semesters.value = Array.isArray(r) ? r : (r.items || []) } catch (e) { semesters.value = [] } }
const semesters = ref([])
const showSemesterForm = ref(false)
const semesterForm = ref({ name: '', startDate: '', endDate: '' })
function openCreateSemester() { semesterForm.value = { name: '', startDate: '', endDate: '' }; showSemesterForm.value = true }
async function saveSemester() { const f = semesterForm.value; if (!f.name) return uni.showToast({ title: '学期名称必填', icon: 'none' }); saving.value = true; try { await apiCall('POST', '/semesters', { ...f }); showSemesterForm.value = false; await loadSemesters(); uni.showToast({ title: '学期已创建', icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '创建失败', icon: 'none' }) } saving.value = false }
async function loadNotices() { try { const r = await apiCall('GET', '/school-admin/notices') || { items: [], total: 0 }; schoolNotices.value = Array.isArray(r) ? r : (r.items || []) } catch (e) { schoolNotices.value = [] } }
async function sendNotice() { if (!noticeForm.value.title) return uni.showToast({ title: '公告标题必填', icon: 'none' }); saving.value = true; try { await apiCall('POST', '/school-admin/notices', { title: noticeForm.value.title, content: noticeForm.value.content }); showNoticeForm.value = false; noticeForm.value = { title: '', content: '' }; await loadNotices(); uni.showToast({ title: '公告已发送', icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '发送失败', icon: 'none' }) } saving.value = false }
async function delNotice(n) {
  uni.showModal({ title: '删除公告', content: '确定删除「' + n.title + '」？', confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/school-admin/notices/' + n.id); schoolNotices.value = schoolNotices.value.filter(x => x.id !== n.id); uni.showToast({ title: '已删除', icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) } },
  })
}

// 学生管理（P0-3：后端分页加载，搜索时拉取 500 条前端过滤）
const schoolStudents = ref([])
const studentFilter = ref('')
const editingStudent = ref(null)
const editStudentForm = ref({ name: '', gender: '', parentName: '', parentPhone: '' })
const filteredStudents = computed(() => {
  if (!studentFilter.value) return schoolStudents.value
  const q = studentFilter.value.trim().toLowerCase()
  return schoolStudents.value.filter(s => (s.name || '').toLowerCase().includes(q))
})
// 学生列表：服务端分页 + scroll-view 虚拟滚动
const STUDENT_PAGE_SIZE = 20
const studentTotal = ref(0)
const studentPage = ref(1)
const studentScrollTop = ref(0)
watch(studentFilter, () => { studentPage.value = 1; studentScrollTop.value = 0; loadStudents() })
const studentShown = computed(() => filteredStudents.value.slice(0, studentPage.value * STUDENT_PAGE_SIZE))
// 还有更多 = 虚拟滚动未到头 或 服务端还有未拉取数据
const studentHasMore = computed(() =>
  studentShown.value.length < filteredStudents.value.length ||
  schoolStudents.value.length < studentTotal.value
)
async function loadStudents() {
  const take = studentFilter.value ? 500 : STUDENT_PAGE_SIZE
  try {
    const r = await apiCall('GET', '/school-admin/students?skip=0&take=' + take) || { items: [], total: 0 }
    schoolStudents.value = Array.isArray(r) ? r : (r.items || [])
    studentTotal.value = r.total || schoolStudents.value.length
    studentPage.value = 1
  } catch (e) { schoolStudents.value = []; studentTotal.value = 0 }
}
async function loadMoreStudents() {
  // 先展示已加载数据中的更多（虚拟滚动）
  if (studentShown.value.length < filteredStudents.value.length) {
    studentPage.value++
    return
  }
  // 已加载数据展示完，向服务端拉取下一页
  if (schoolStudents.value.length >= studentTotal.value) return
  const take = studentFilter.value ? 500 : STUDENT_PAGE_SIZE
  const skip = schoolStudents.value.length
  try {
    const r = await apiCall('GET', `/school-admin/students?skip=${skip}&take=${take}`) || { items: [], total: 0 }
    const more = Array.isArray(r) ? r : (r.items || [])
    if (more.length) schoolStudents.value = [...schoolStudents.value, ...more]
  } catch (e) {}
}
function openEditStudent(s) { editingStudent.value = s; editStudentForm.value = { name: s.name || '', gender: s.gender || '', parentName: s.parentName || '', parentPhone: s.parentPhone || '' } }
async function saveStudent() { if (!editStudentForm.value.name) return uni.showToast({ title: '姓名必填', icon: 'none' }); saving.value = true; try { await apiCall('PATCH', '/school-admin/students/' + editingStudent.value.id, editStudentForm.value); editingStudent.value = null; await loadStudents(); uni.showToast({ title: '已保存', icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '保存失败', icon: 'none' }) } saving.value = false }
const showStudentProfile = ref(false)
const profile = ref({ name: '', gender: '', studentNo: '', className: '', parentName: '', parentPhone: '', address: '', studentPhone: '', duty: '', tags: [], note: '' })
function showStudentDetail(s) { profile.value = { name: s.name || '', gender: s.gender || '', studentNo: s.studentNo || '', className: s.className || s.classId || '', parentName: s.parentName || '', parentPhone: s.parentPhone || '', address: s.address || '', studentPhone: s.studentPhone || '', duty: s.duty || '', tags: s.tags || [], note: s.note || '' }; showStudentProfile.value = true }
function dial(phone) { if (!phone) return uni.showToast({ title: '无联系电话', icon: 'none' }); uni.makePhoneCall({ phoneNumber: String(phone), fail: () => {} }) }

// 批量导入学生
const showStudentImport = ref(false)
const showStudentTpl = ref(false)
const studentPreview = ref(null)
const studentAiRecognizing = ref(false)
const importClassId = ref('')
const importClassName = ref('')
const importClassNames = computed(() => classes.value.map((c) => c.name))
function onImportClassPick(e) { const idx = e.detail.value; const c = classes.value[idx]; if (c) { importClassId.value = c.id; importClassName.value = c.name } }
function copyStudentTpl() { uni.setClipboardData({ data: '姓名,性别,学号,家长姓名,家长电话\n张三,男,2026001,张父,13800000001\n李四,女,2026002,李母,13800000002', success: () => uni.showToast({ title: '已复制', icon: 'success' }) }) }
function pickStudentFile() {
  uni.chooseMessageFile({ count: 1, type: 'file', extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => { const f = res.tempFiles[0]; if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' }); uni.showLoading({ title: '解析中…' }); try { const data = await readAsBase64(f.path); const r = await apiCall('POST', '/school-admin/students/import-preview', { filename: f.name, data }); studentPreview.value = r } catch (e) { uni.showToast({ title: '解析失败', icon: 'none' }) } finally { uni.hideLoading() } }, fail: () => {},
  })
}
function pickStudentImage() {
  if (studentAiRecognizing.value) return
  uni.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed', 'original'],
    success: async (res) => { const tempPath = res.tempFiles[0].tempFilePath; studentAiRecognizing.value = true; uni.showLoading({ title: 'AI 识别中…', mask: true }); try { const cmp = await compressImage({ src: tempPath, maxWidth: 1280, maxHeight: 1280, quality: 80, fileType: 'jpg' }); const base64 = await readAsBase64(cmp?.tempFilePath || tempPath); const r = await apiCall('POST', '/school-admin/students/import-ai', { mode: 'image', data: base64, filename: 'student_list.jpg' }); studentPreview.value = r } catch (e) { uni.showToast({ title: '识别失败', icon: 'none' }) } finally { uni.hideLoading(); studentAiRecognizing.value = false } }, fail: () => {},
  })
}
async function commitStudentImport() {
  if (!studentPreview.value) return
  const items = studentPreview.value.rows.filter((r) => r.valid)
  if (!items.length || !importClassId.value) return
  uni.showLoading({ title: '导入中…' })
  try {
    const studentsPayload = items.map((r) => ({ name: r.name, gender: r.gender, studentNo: r.studentNo, parentName: r.parentName, parentPhone: r.parentPhone, classId: importClassId.value }))
    const r = await apiCall('POST', '/school-admin/students/batch', { students: studentsPayload })
    uni.showToast({ title: `成功 ${r.success || 0} / ${r.total || 0}`, icon: r.failed > 0 ? 'none' : 'success' })
    studentPreview.value = null; showStudentImport.value = false; await loadStudents()
  } catch (e) { uni.showToast({ title: '导入失败', icon: 'none' }) }
  finally { uni.hideLoading() }
}

// AI 配置
const aiProviders = ref([])
const aiProviderCode = ref('')
const aiProviderIdx = ref(0)
const ai = ref({})
const savingAi = ref(false)
async function loadAi() {
  try {
    await loadAiProviders()
    const a = await apiCall('GET', '/config/ai-settings').catch(() => ({}))
    if (aiSettingsRef.value) aiSettingsRef.value.setAiConfig(a)
    ai.value = a
  } catch (e) {}
}
async function loadAiProviders() {
  try {
    const res = await apiCall('GET', '/config/ai-providers')
    const list = (res && res.items) || (Array.isArray(res) ? res : [])
    if (list && list.length) { aiProviders.value = list; if (aiSettingsRef.value) aiSettingsRef.value.setAiProviders(list) }
  } catch (e) {}
}
async function saveAi(aiData, providerCode) {
  if (savingAi.value) return
  if (aiData.baseUrl && !/^https?:\/\//i.test(aiData.baseUrl)) return uni.showToast({ title: '接口地址格式错误', icon: 'none' })
  savingAi.value = true
  try {
    const payload = { providerCode: providerCode || '', baseUrl: aiData.baseUrl || '', apiKey: aiData.apiKey || '', textModel: aiData.textModel || '', visionModel: aiData.visionModel || '', imageModel: aiData.imageModel || '', videoModel: aiData.videoModel || '', temperature: Number(aiData.temperature) || 0.7, aiName: aiData.aiName || '', systemPrompt: aiData.systemPrompt || '', resourceModels: aiData.resourceModels || {} }
    await apiCall('PATCH', '/config/ai-settings', payload)
    uni.showToast({ title: 'AI 配置已保存', icon: 'success' })
  } catch (e) { uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' }) }
  finally { savingAi.value = false }
}

onShow(async () => { await Promise.all([loadTeachers(), loadDashboard(), loadNotices(), loadStudents(), loadSemesters()]) })
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; padding-top: 8rpx; }
.tabs { display: flex; gap: 8rpx; margin-bottom: 24rpx; padding: 10rpx; background: var(--c-card2); border-radius: 26rpx; }
.tab { flex: 1; text-align: center; font-size: 26rpx; padding: 18rpx 0; border-radius: 18rpx; background: transparent; color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; box-shadow: 0 4rpx 14rpx rgba(245,179,66,.28); }
.hd-left { flex: 1; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.out { font-size: 24rpx; color: var(--c-primary); font-weight: 600; padding: 10rpx 28rpx; border-radius: 32rpx; background: rgba(245,179,66,.1); }
.dashboard { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.dash-card { flex: 1; background: var(--c-card); border-radius: 20rpx; padding: 24rpx 0 20rpx; text-align: center; box-shadow: 0 4rpx 16rpx var(--c-shadow); border: 1px solid var(--c-border); }
.dash-n { display: block; font-size: 40rpx; font-weight: 800; color: var(--c-primary); }
.dash-n.warn { color: #d48806; }
.dash-row2 { margin-top: -10rpx; }
.dash-l { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.notice-section { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 26rpx 24rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.notice-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.notice-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.notice-form { margin-bottom: 18rpx; padding: 20rpx; background: var(--c-card2); border-radius: 16rpx; }
.notice-textarea { min-height: 140rpx; margin-top: 12rpx; }
.notice-send { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; height: 76rpx; line-height: 76rpx; font-size: 28rpx; margin-top: 16rpx; font-weight: 600; }
.notice-list { margin-top: 8rpx; }
.notice-item { padding: 18rpx 0; border-bottom: 1px solid var(--c-border); }
.notice-item:last-child { border-bottom: none; }
.notice-item-hd { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8rpx; }
.notice-item-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.notice-item-content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.notice-item-time { display: block; font-size: 20rpx; color: var(--c-sub2); margin-top: 4rpx; }
.demo-section { margin-top: 40rpx; padding: 28rpx 26rpx; background: linear-gradient(135deg, var(--c-card), var(--c-card2)); border-radius: 22rpx; border: 1px solid var(--c-border); }
.demo-row { display: flex; align-items: center; justify-content: space-between; }
.demo-text { flex: 1; padding-right: 20rpx; }
.demo-name { display: block; font-size: 28rpx; color: var(--c-title); font-weight: 600; }
.demo-sub { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.demo-btn { width: 100%; margin-top: 16rpx; background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; font-weight: 600; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge.on { background: rgba(245,179,66,.12); color: var(--c-primary); }
.act-sub { font-size: 23rpx; color: var(--c-sub); font-weight: 600; }
.acad-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; margin-top: 8rpx; }
.acad-card { background: var(--c-card2); border-radius: 16rpx; padding: 18rpx 20rpx; }
.acad-s { font-size: 26rpx; font-weight: 700; color: var(--c-accent); margin-bottom: 10rpx; }
.acad-line { display: flex; justify-content: space-between; font-size: 23rpx; color: var(--c-sub); line-height: 1.7; }
.acad-v { color: var(--c-title); font-weight: 600; }
.semester-date-row { display: flex; gap: 10rpx; align-items: center; margin-top: 10rpx; }
.sem-date { flex: 1; }
.sem-date-sep { font-size: 24rpx; color: var(--c-sub); }
.ndate { font-size: 20rpx; color: var(--c-sub2); margin-left: 10rpx; font-weight: 400; }
.filter-inp { flex: 1; min-width: 200rpx; border: 1px solid var(--c-input-border); border-radius: 16rpx; padding: 16rpx 22rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-text); box-sizing: border-box; }
.sa-student-scroll { min-height: 300rpx; max-height: 60vh; overflow: hidden; }
.sa-load-more { text-align: center; color: var(--c-primary); padding: 24rpx 0; font-size: 26rpx; }
.sa-load-more.end { color: var(--c-sub); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.empty { padding: 80rpx 30rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); background: var(--c-card); border-radius: 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; line-height: 1.5; }
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 36rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); max-height: 82vh; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.sh-meta { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; }
.sh-section { margin-top: 18rpx; padding-top: 14rpx; border-top: 1px dashed var(--c-border); }
.sh-lbl { font-size: 24rpx; color: var(--c-sub); font-weight: 600; }
.sh-val { font-size: 26rpx; color: var(--c-title); margin-left: 8rpx; }
.tag { font-size: 22rpx; color: var(--c-primary); background: rgba(245,179,66,.1); border-radius: 20rpx; padding: 6rpx 14rpx; margin-right: 10rpx; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.form-item { margin-bottom: 26rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
.btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 88rpx; line-height: 88rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.btn[disabled] { opacity: .6; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2); padding: 18rpx 22rpx; border-radius: 16rpx; margin-bottom: 20rpx; line-height: 1.7; border-left: 6rpx solid var(--c-accent); }
.hint-example { display: block; color: var(--c-sub); font-size: 22rpx; margin-top: 6rpx; white-space: pre; }
.import-btn { margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.import-btn.ai { background: var(--c-primary); }
.import-btn.ai[disabled] { opacity: 0.6; }
.preview { margin-top: 10rpx; border-top: 1px dashed var(--c-border); padding-top: 16rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.pv-errs { margin: 10rpx 0; }
.pv-err { font-size: 24rpx; color: var(--c-danger); line-height: 1.6; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; flex-wrap: wrap; gap: 10rpx; }
.bar-acts { display: flex; gap: 12rpx; align-items: center; }
.export { font-size: 22rpx; color: var(--c-primary); font-weight: 600; padding: 8rpx 18rpx; background: rgba(245,179,66,.1); border-radius: 28rpx; }
.dialog { width: 86%; max-width: 640rpx; max-height: 80vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
.d-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.d-sub { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.d-code { background: var(--c-title); color: var(--c-card2); font-size: 22rpx; padding: 20rpx; border-radius: 12rpx; white-space: pre-wrap; line-height: 1.7; font-family: monospace; margin-bottom: 20rpx; }
.d-copy { background: var(--c-blue); color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.d-close { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.pf-dial { color: var(--c-primary); font-weight: 600; margin-left: 8rpx; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.ai-tip { margin-top: -8rpx; margin-bottom: 14rpx; }
.picker { width: 100%; box-sizing: border-box; }
.picker-inp { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.dark .semester-date-row .inp { background: var(--c-input); }
.dark .facet { background: var(--c-card2); }
.dark .enter { background: var(--c-primary); }
</style>
