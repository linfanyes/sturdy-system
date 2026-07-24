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
    </template>

    <!-- ====== 教师管理 Tab ====== -->
    <template v-if="tab === 'teachers'">
      <view class="bar">
        <text class="sc">共 {{ teachers.length }} 位教师</text>
        <view class="bar-acts">
          <text class="act" @click="openCreate">＋ 新增</text>
          <text class="act" @click="showBatchImport = true">📋 批量</text>
          <text class="act export" @click="exportTeachers">📥 导出</text>
        </view>
      </view>
    <view class="list">
      <EmptyState v-if="!teachers.length" icon="👩‍🏫" text="暂无教师" hint="点击右上角「新增」创建第一位教师" />
      <view class="row" v-for="u in teachers" :key="u.id">
        <view class="info" @click="openEdit(u)">
          <view class="nm-line">
            <text class="nm">{{ u.name }}</text>
            <text class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? '启用' : '禁用' }}</text>
          </view>
          <view class="meta">用户名：{{ u.username || '微信登录' }}</view>
          <view class="meta" v-if="u.teacherNo">编号：{{ u.teacherNo }}</view>
          <view class="meta" v-if="u.phone">电话：{{ u.phone }}</view>
        </view>
        <view class="acts">
          <text class="act" @click.stop="openFeatures(u)">功能配置</text>
          <text class="act" @click.stop="resetPwd(u)">重置密码</text>
          <text class="act del" @click.stop="delTeacher(u)">删除</text>
        </view>
      </view>
      <view v-if="teachers.length < teacherTotal" class="load-more" @click="loadMoreTeachers">加载更多（共 {{ teacherTotal }} 位）</view>
    </view>
    </template>

    <!-- ====== 班级管理 Tab ====== -->
    <template v-if="tab === 'classes'">
      <view class="bar">
        <text class="sc">共 {{ classes.length }} 个班级</text>
        <text class="act" @click="openCreateClass">＋ 新增班级</text>
      </view>
      <view class="list">
        <EmptyState v-if="!classes.length" icon="🏫" text="暂无班级" hint="点击右上角「新增」创建第一个班级" />
        <view class="row" v-for="c in classes" :key="c.id">
          <view class="info" @click="openEditClass(c)">
            <view class="nm-line">
              <text class="nm">{{ c.name }}</text>
              <text class="badge on">{{ c.headTeacher }}</text>
            </view>
            <view class="meta">年级：{{ c.grade }} · 班号：{{ c.classNo }} · 学期：{{ c.term || '未设置' }}</view>
          </view>
          <view class="acts">
            <text class="act del" @click.stop="delClass(c)">删除</text>
          </view>
        </view>
      </view>
      <!-- 新增/编辑班级（全屏） -->
      <view v-if="showClassForm" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="showClassForm=false">← 返回</text>
            <text class="full-title">{{ editingClassId ? '编辑班级' : '新增班级' }}</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view class="form-item">
              <text class="label">班级名称 <text class="req">*</text></text>
              <input v-model="classForm.name" class="inp" placeholder="如：一年级一班" />
            </view>
            <view class="form-item">
              <text class="label">年级 <text class="req">*</text></text>
              <input v-model="classForm.grade" class="inp" placeholder="如：一年级" />
            </view>
            <view class="form-item">
              <text class="label">班号</text>
              <input v-model="classForm.classNo" class="inp" placeholder="如：1" />
            </view>
            <view class="form-item">
              <text class="label">班主任 <text class="req">*</text></text>
              <picker class="picker" mode="selector" :range="teacherOptions" range-key="label" @change="onTeacherPick">
                <view class="picker-inp">{{ classForm.headTeacherId ? teacherLabel(classForm.headTeacherId) : '请选择班主任' }}</view>
              </picker>
            </view>
            <view class="form-item">
              <text class="label">学期</text>
              <input v-model="classForm.term" class="inp" placeholder="如：2026春季学期" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="btn" :disabled="saving" @click="saveClass">{{ saving ? '保存中…' : (editingClassId ? '保存修改' : '确认创建') }}</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 新增/编辑教师（全屏） -->
    <view v-if="showForm" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showForm=false">← 返回</text>
          <text class="full-title">{{ editingId ? '编辑教师' : '新增教师' }}</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="form-item">
            <text class="label">用户名 <text class="req">*</text></text>
            <input v-model="form.username" class="inp" placeholder="登录用，如：zhangsan" />
            <text class="tip">用户名不可重复，系统会自动校验</text>
          </view>
          <view class="form-item">
            <text class="label">姓名 <text class="req">*</text></text>
            <input v-model="form.name" class="inp" placeholder="如：张老师" />
          </view>
          <view v-if="!editingId" class="form-item">
            <text class="label">密码 <text class="req">*</text></text>
            <input v-model="form.password" class="inp" placeholder="登录密码" password />
          </view>
          <view v-else class="form-item">
            <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
            <input v-model="form.password" class="inp" placeholder="输入新密码可重置" password />
          </view>
          <view class="form-item">
            <text class="label">手机号</text>
            <input v-model="form.phone" class="inp" placeholder="可选" @blur="checkPhone" />
            <text v-if="phoneError" class="field-err">{{ phoneError }}</text>
          </view>
          <view class="form-item switch-item">
            <view class="label-line">
              <text class="label">启用标志</text>
              <text class="switch-val">{{ form.enabled ? '启用' : '禁用' }}</text>
            </view>
            <switch :checked="form.enabled" color="#4CAF50" @change="onEnabledChange" />
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving" @click="saveForm">{{ saving ? '保存中…' : (editingId ? '保存修改' : '确认创建') }}</button>
        </view>
      </view>
    </view>

    <!-- 功能配置（全屏） -->
    <view v-if="featUser" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="featUser=null">← 返回</text>
          <text class="full-title">{{ featUser.name }} 功能配置</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="feat-toolbar">
            <text class="act" @click="selectAll">全选</text>
            <text class="act" @click="selectNone">全不选</text>
            <text class="sc">{{ sel.length }}/{{ allFeatures.length }} 项已启用</text>
          </view>
          <view class="flist">
            <label class="frow" v-for="f in allFeatures" :key="f.key" @click="toggleFeat(f.key)">
              <text class="ck" :class="sel.includes(f.key)&&'on'"></text>
              <text class="frow-label">{{ f.label }}</text>
            </label>
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving" @click="saveFeatures">{{ saving ? '保存中…' : '保存配置' }}</button>
        </view>
      </view>
    </view>

    <!-- ====== 学生管理 Tab ====== -->
    <template v-if="tab === 'students'">
      <view class="bar">
        <text class="sc">共 {{ schoolStudents.length }} 名学生</text>
        <view class="bar-acts">
          <input v-model="studentFilter" class="filter-inp" placeholder="输入姓名搜索…" />
          <text class="act export" @click="exportStudents">📥 导出</text>
        </view>
      </view>
      <view class="list">
        <EmptyState v-if="!schoolStudents.length" icon="🧑‍🎓" text="暂无学生" hint="需先创建班级和教师" />
        <view class="row" v-for="s in filteredStudents" :key="s.id">
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

    <!-- 批量导入教师（全屏） -->
    <view v-if="showBatchImport" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showBatchImport = false">← 返回</text>
          <text class="full-title">批量导入教师</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="hint-block">
            每行一条：姓名,用户名,密码（英文逗号分隔）
            例如：张三,zhangsan,123456
          </view>
          <textarea v-model="batchText" class="inp batch-area" placeholder="张三,zhangsan,123456&#10;李四,lisi,123456" />
          <view v-if="batchResult.length" class="batch-result">
            <view class="batch-summary">共 {{ batchResult.length }} 条，成功 {{ batchResult.filter(r => r.status==='成功').length }}/{{ batchResult.length }}</view>
            <view class="batch-item" :class="r.status==='成功'?'ok':'fail'" v-for="r in batchResult" :key="r.username">
              <text>{{ r.name }}({{ r.username }})：{{ r.status }}</text>
              <text v-if="r.error" class="batch-err">{{ r.error }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving || !batchText.trim()" @click="doBatchImport">{{ saving ? '导入中…' : '确认导入' }}</button>
        </view>
      </view>
    </view>

    <!-- 密码重置弹窗 -->
    <view v-if="pwdUser" class="mask" @click="pwdUser=null">
      <view class="sheet" @click.stop>
        <view class="sh-t">重置「{{ pwdUser.name }}」密码</view>
        <view class="inp-wrap"><input v-model="newPwd" class="inp" placeholder="新密码" password /></view>
        <button class="btn" :disabled="saving" @click="doResetPwd">确认重置</button>
      </view>
    </view>

    <!-- 学期管理 -->
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

    <!-- 演示模式：以教师身份进入教师系统 -->
    <view class="demo-section">
      <view class="demo-row">
        <view class="demo-text">
          <text class="demo-name">🛝 教师系统演示</text>
          <text class="demo-sub">以教师身份预览所有功能，体验教师端完整流程</text>
        </view>
      </view>
      <button class="demo-btn" @click="enterDemoMode">进入教师系统演示</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { setMockMode } from '../../common/request'
import { auth, setAuth } from '../../common/store'
import { isPhone } from '../../common/validators'

const dark = computed(() => theme.mode === 'dark')
const teachers = ref([])
const saving = ref(false)
// 分页
const teacherPage = ref(0)
const teacherTotal = ref(0)
const TEACHER_PAGE_SIZE = 50

// 看板数据
const dash = ref({ totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0, totalClasses: 0, totalStudents: 0, attendanceRate: null, pendingHomework: 0, parentEnabled: 0 })
async function loadDashboard() {
  try { dash.value = await apiCall('GET', '/school-admin/dashboard') || dash.value } catch (e) {}
}

// 从本地存储读取学校管理员信息（登录时保存）
const saUser = (() => {
  try { return JSON.parse(uni.getStorageSync('sa_user') || '{}') } catch (e) { return {} }
})()
const schoolName = ref(saUser.schoolName || '')
const schoolCode = ref(saUser.schoolCode || '')

// 统一表单（新增/编辑）
const showForm = ref(false)
const editingId = ref('')
const form = ref({ username: '', password: '', name: '', phone: '', enabled: true })
const phoneError = ref('')

const featUser = ref(null), sel = ref([])
const pwdUser = ref(null), newPwd = ref('')

const CLOUDRUN_ENV = 'prod-d6g1zoq8c7be4ce53'
const CLOUDRUN_SERVICE = 'tec-work'

const allFeatures = [
  // 班级与学生
  { key:'classes',label:'班级管理' },{ key:'students',label:'学生管理' },
  // 学情与考试
  { key:'exams',label:'考试管理' },{ key:'grades',label:'成绩管理' },{ key:'analysis',label:'考试分析/试卷查询' },
  { key:'attendance',label:'考勤' },{ key:'homework',label:'作业' },
  // 课堂工具
  { key:'tools',label:'课堂工具' },{ key:'seats',label:'座位表' },{ key:'games',label:'小游戏' },
  // 学生评价
  { key:'rewards',label:'奖励/积分' },{ key:'growth',label:'成长记录' },{ key:'behavior',label:'行为记录' },
  { key:'reading',label:'课外阅读' },{ key:'checkin',label:'学生打卡' },
  // 班级管理
  { key:'finance',label:'班费' },{ key:'activities',label:'班级活动' },{ key:'duty',label:'轮值表/值日' },
  { key:'gallery',label:'班级风采/相册' },
  // 家校沟通
  { key:'parents',label:'家长联系' },{ key:'im',label:'家校沟通' },{ key:'notices',label:'公告' },
  // AI 与备课
  { key:'ai',label:'AI助手/备课' },{ key:'schedule',label:'课表' },
  // 教师办公
  { key:'worklog',label:'工作日志' },{ key:'observation',label:'听课记录' },{ key:'calendar',label:'教学日历' },
  { key:'teachers',label:'教师通讯录' },
  // 个人
  { key:'todos',label:'待办事项' },{ key:'notes',label:'笔记' },{ key:'demo',label:'演示模式' },
]

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
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + token,
      },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          const msg = r.data && (r.data.message || r.data.error)
          uni.removeStorageSync('sa_token')
          uni.removeStorageSync('sa_user')
          uni.removeStorageSync('g_token')
          uni.removeStorageSync('g_user')
          uni.removeStorageSync('g_mock_mode')
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error(msg || '登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else {
          const msg = (r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')
          reject(new Error(msg))
        }
      },
      fail: (e) => {
        const msg = (e && (e.errMsg || e.message)) || '网络异常'
        reject(new Error(msg))
      },
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      opts.data = data
    }
    cloud.callContainer(opts)
  })
}

async function loadTeachers() {
  try {
    const r = await apiCall('GET', '/school-admin/teachers?skip=0&take=' + TEACHER_PAGE_SIZE) || { items: [], total: 0 }
    teachers.value = r.items || r
    teacherTotal.value = r.total || teachers.value.length
    teacherPage.value = 1
  } catch (e) { teachers.value = []; console.error('loadTeachers', e) }
}

async function loadMoreTeachers() {
  const skip = teacherPage.value * TEACHER_PAGE_SIZE
  try {
    const r = await apiCall('GET', `/school-admin/teachers?skip=${skip}&take=${TEACHER_PAGE_SIZE}`) || { items: [], total: 0 }
    const more = r.items || r
    if (more.length) {
      teachers.value = [...teachers.value, ...more]
      teacherPage.value++
    }
  } catch (e) { console.error('loadMoreTeachers', e) }
}

function openCreate() {
  editingId.value = ''
  phoneError.value = ''
  form.value = { username: '', password: '', name: '', phone: '', enabled: true }
  showForm.value = true
}

function openEdit(u) {
  editingId.value = u.id
  phoneError.value = ''
  form.value = {
    username: u.username || '',
    password: '',
    name: u.name || '',
    phone: u.phone || '',
    enabled: u.enabled !== false,
  }
  showForm.value = true
}

function onEnabledChange(e) {
  form.value.enabled = e.detail.value
}

function checkPhone() {
  if (form.value.phone && !isPhone(form.value.phone)) {
    phoneError.value = '手机号格式错误，应为 11 位手机号'
  } else {
    phoneError.value = ''
  }
}

async function saveForm() {
  const f = form.value
  if (!f.username || !f.name) return uni.showToast({ title: '用户名/姓名必填', icon: 'none' })
  if (!editingId.value && !f.password) return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  if (f.phone && !isPhone(f.phone)) {
    phoneError.value = '手机号格式错误，请修正后再提交'
    return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  }
  phoneError.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      const payload = { username: f.username, name: f.name, phone: f.phone, enabled: f.enabled }
      await apiCall('PATCH', '/school-admin/teachers/' + editingId.value, payload)
      if (f.password) {
        await apiCall('POST', '/school-admin/teachers/' + editingId.value + '/reset-password', { password: f.password })
      }
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await apiCall('POST', '/school-admin/teachers', {
        username: f.username, name: f.name, password: f.password,
        phone: f.phone, enabled: f.enabled,
      })
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已创建', icon: 'success' })
    }
  } catch (e) {
    console.error('saveForm error', e)
    uni.showToast({ title: e.message || '操作失败', icon: 'none', duration: 3000 })
  }
  saving.value = false
  phoneError.value = ''
}

async function delTeacher(u) {
  uni.showModal({
    title: '删除教师',
    content: '确定删除「' + u.name + '」？该教师的所有关联数据将无法访问。',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/teachers/' + u.id)
        teachers.value = teachers.value.filter(x => x.id !== u.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => { loadTeachers() }, 500)
      } catch (e) {
        console.error('delTeacher', e)
        uni.showToast({ title: e.message || '删除失败', icon: 'none', duration: 3000 })
      }
    },
  })
}

function openFeatures(u) {
  featUser.value = u
  sel.value = u.features && u.features.length ? [...u.features] : allFeatures.map(f => f.key)
}

function toggleFeat(key) {
  const i = sel.value.indexOf(key)
  if (i >= 0) sel.value.splice(i, 1)
  else sel.value.push(key)
}

function selectAll() { sel.value = allFeatures.map(f => f.key) }
function selectNone() { sel.value = [] }

async function saveFeatures() {
  saving.value = true
  try {
    await apiCall('PATCH', '/school-admin/teachers/' + featUser.value.id + '/features', { features: sel.value })
    featUser.value = null
    await loadTeachers()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
  saving.value = false
}

function resetPwd(u) { pwdUser.value = u; newPwd.value = '' }
async function doResetPwd() {
  if (!newPwd.value) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/school-admin/teachers/' + pwdUser.value.id + '/reset-password', { password: newPwd.value })
    pwdUser.value = null
    uni.showToast({ title: '已重置', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '重置失败', icon: 'none' })
  }
  saving.value = false
}

function logout() {
  setMockMode(false)
  uni.removeStorageSync('sa_token')
  uni.removeStorageSync('sa_user')
  // 清除校管登录时写入的共享 token + 演示模式标记，
  // 防止冷启动时 App.vue 误读 g_token 判为教师登录态
  uni.removeStorageSync('g_token')
  uni.removeStorageSync('g_user')
  uni.removeStorageSync('g_mock_mode')
  uni.reLaunch({ url: '/pages/login/login' })
}

// ===== 演示模式：以教师身份进入教师系统 =====
async function enterDemoMode() {
  uni.showLoading({ title: '进入演示…' })
  try {
    setMockMode(true)
    // 设置教师模拟身份
    const demoUser = {
      name: '珊珊老师', school: '阳光实验小学（演示版）',
      schoolId: 'demo-school', features: [],
    }
    setAuth('mock-teacher-token', demoUser)
    uni.hideLoading()
    uni.switchTab({ url: '/pages/dashboard/dashboard' })
  } catch (e) {
    uni.hideLoading()
  }
}

// ===== Tab 切换 =====
const tab = ref('dashboard')
function switchTab(t) { tab.value = t; if (t === 'classes') loadClasses(); if (t === 'students') loadStudents() }

// ===== 批量导入教师 =====
const showBatchImport = ref(false)
const batchText = ref('')
const batchResult = ref([])
async function doBatchImport() {
  const lines = batchText.value.trim().split('\n').filter(Boolean)
  const teachers = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return { name: parts[0] || '', username: parts[1] || '', password: parts[2] || '' }
  }).filter(t => t.name && t.username && t.password)
  if (!teachers.length) return uni.showToast({ title: '格式错误，请按「姓名,用户名,密码」每行一条', icon: 'none' })
  saving.value = true
  batchResult.value = []
  try {
    const r = await apiCall('POST', '/school-admin/teachers/batch', { teachers })
    batchResult.value = r.results || []
    uni.showToast({ title: `成功 ${r.success || 0} / ${r.total || 0}`, icon: r.failed > 0 ? 'none' : 'success' })
    await loadTeachers()
  } catch (e) { uni.showToast({ title: e.message || '导入失败', icon: 'none' }) }
  saving.value = false
}

// ===== 数据导出 =====
async function exportTeachers() {
  const blob = await apiCall('GET', '/school-admin/export/teachers')
  downloadBlob(blob, 'teachers.csv')
}
async function exportStudents() {
  const blob = await apiCall('GET', '/school-admin/export/students')
  downloadBlob(blob, 'students.csv')
}
function downloadBlob(data, name) {
  // 小程序环境下无法下载文件，走复制链接/提示
  uni.showToast({ title: '导出功能需在 Web 端使用', icon: 'none' })
}

// ===== 班级管理 =====
const classes = ref([])
const showClassForm = ref(false)
const editingClassId = ref('')
const classForm = ref({ name: '', grade: '', classNo: '', headTeacherId: '', term: '' })

const teacherOptions = computed(() =>
  teachers.value.map(t => ({ id: t.id, label: t.name + (t.subject ? '(' + t.subject + ')' : '') }))
)
function teacherLabel(id) {
  const t = teachers.value.find(x => x.id === id)
  return t ? t.name + (t.subject ? '(' + t.subject + ')' : '') : '请选择班主任'
}

async function loadClasses() {
  try {
    const r = await apiCall('GET', '/school-admin/classes') || { items: [], total: 0 }
    classes.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { classes.value = [] }
}

function openCreateClass() {
  editingClassId.value = ''
  classForm.value = { name: '', grade: '', classNo: '', headTeacherId: '', term: '' }
  showClassForm.value = true
}

function openEditClass(c) {
  editingClassId.value = c.id
  classForm.value = {
    name: c.name || '', grade: c.grade || '', classNo: c.classNo || '',
    headTeacherId: c.teacherId || '', term: c.term || '',
  }
  showClassForm.value = true
}

function onTeacherPick(e) {
  const idx = e.detail.value
  const opt = teacherOptions.value[idx]
  classForm.value.headTeacherId = opt ? opt.id : ''
}

async function saveClass() {
  const f = classForm.value
  if (!f.name || !f.grade || !f.headTeacherId) {
    return uni.showToast({ title: '班级名称/年级/班主任必填', icon: 'none' })
  }
  saving.value = true
  try {
    if (editingClassId.value) {
      await apiCall('PATCH', '/school-admin/classes/' + editingClassId.value, f)
      showClassForm.value = false
      await loadClasses()
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await apiCall('POST', '/school-admin/classes', f)
      showClassForm.value = false
      await loadClasses()
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
  saving.value = false
}

async function delClass(c) {
  uni.showModal({
    title: '删除班级',
    content: '确定删除「' + c.name + '」？关联的学生数据不会自动迁移。',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/classes/' + c.id)
        classes.value = classes.value.filter(x => x.id !== c.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

// ===== 学校公告 =====
const schoolNotices = ref([])
const showNoticeForm = ref(false)
const noticeForm = ref({ title: '', content: '' })

// ===== 学期管理 =====
const semesters = ref([])
const showSemesterForm = ref(false)
const semesterForm = ref({ name: '', startDate: '', endDate: '' })

async function loadSemesters() {
  try {
    const r = await apiCall('GET', '/semesters') || { items: [], total: 0 }
    semesters.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { semesters.value = [] }
}

function openCreateSemester() {
  semesterForm.value = { name: '', startDate: '', endDate: '' }
  showSemesterForm.value = true
}

async function saveSemester() {
  const f = semesterForm.value
  if (!f.name) return uni.showToast({ title: '学期名称必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/semesters', { ...f })
    showSemesterForm.value = false
    await loadSemesters()
    uni.showToast({ title: '学期已创建', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '创建失败', icon: 'none' }) }
  saving.value = false
}

async function loadNotices() {
  try {
    const r = await apiCall('GET', '/school-admin/notices') || { items: [], total: 0 }
    schoolNotices.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { schoolNotices.value = [] }
}

async function sendNotice() {
  if (!noticeForm.value.title) return uni.showToast({ title: '公告标题必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/school-admin/notices', { title: noticeForm.value.title, content: noticeForm.value.content })
    showNoticeForm.value = false
    noticeForm.value = { title: '', content: '' }
    await loadNotices()
    uni.showToast({ title: '公告已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  }
  saving.value = false
}

async function delNotice(n) {
  uni.showModal({
    title: '删除公告',
    content: '确定删除「' + n.title + '」？',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/notices/' + n.id)
        schoolNotices.value = schoolNotices.value.filter(x => x.id !== n.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

// ===== 学生管理 =====
const schoolStudents = ref([])
const studentFilter = ref('')
const editingStudent = ref(null)
const editStudentForm = ref({ name: '', gender: '', parentName: '', parentPhone: '' })
const filteredStudents = computed(() => {
  if (!studentFilter.value) return schoolStudents.value
  const q = studentFilter.value.trim().toLowerCase()
  return schoolStudents.value.filter(s => s.name?.toLowerCase().includes(q))
})

function openEditStudent(s) {
  editingStudent.value = s
  editStudentForm.value = {
    name: s.name || '', gender: s.gender || '',
    parentName: s.parentName || '', parentPhone: s.parentPhone || '',
  }
}

async function saveStudent() {
  if (!editStudentForm.value.name) return uni.showToast({ title: '姓名必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('PATCH', '/school-admin/students/' + editingStudent.value.id, editStudentForm.value)
    editingStudent.value = null
    await loadStudents()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '保存失败', icon: 'none' }) }
  saving.value = false
}

async function loadStudents() {
  try {
    const r = await apiCall('GET', '/school-admin/students') || { items: [], total: 0 }
    schoolStudents.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { schoolStudents.value = [] }
}

onShow(async () => {
  await Promise.all([loadTeachers(), loadDashboard(), loadNotices(), loadStudents(), loadSemesters()])
})
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); background: var(--c-bg); min-height: 100vh; }
.hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
/* Tab 切换 */
.tabs { display: flex; gap: 10rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; font-size: 26rpx; padding: 14rpx 0; border-radius: 12rpx; background: var(--c-card); color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; }
.hd-left { flex: 1; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.out { font-size: 26rpx; color: var(--c-accent); }
.load-more { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: var(--c-accent); }
/* 看板统计 */
.dashboard { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.dash-card { flex: 1; background: var(--c-card); border-radius: 16rpx; padding: 18rpx 0; text-align: center; box-shadow: 0 2rpx 8rpx var(--c-shadow); }
.dash-n { display: block; font-size: 38rpx; font-weight: 800; color: var(--c-accent); }
.dash-n.warn { color: #e6a23c; }
.dash-row2 { margin-top: -10rpx; }
.dash-l { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; flex-wrap: wrap; gap: 8rpx; }
.bar-acts { display: flex; gap: 12rpx; align-items: center; }
.export { font-size: 22rpx; color: #07c160; padding: 4rpx 12rpx; background: rgba(7,193,96,.1); border-radius: 8rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.empty { padding: 60rpx 0; text-align: center; font-size: 26rpx; color: var(--c-sub); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 2rpx 14rpx; border-radius: 16rpx; }
.badge.on { background: rgba(76, 175, 80, .15); color: #4CAF50; }
.badge.off { background: rgba(230, 67, 64, .15); color: #e64340; }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.acts { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; margin-bottom: 6rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.btn[disabled] { opacity: .6; }
/* 全屏表单 */
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 88rpx; background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 24rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 16rpx 30rpx 30rpx; background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.form-item { margin-bottom: 18rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.tip { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.switch-item { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; width: 100%; box-sizing: border-box; }
.label-line { flex: 1; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
/* 全屏表单内的输入框：覆盖共享 .inp 的 margin，确保宽度撑满 */
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 72rpx; }
/* 功能配置 */
.feat-toolbar { display: flex; align-items: center; gap: 24rpx; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); margin-bottom: 10rpx; }
.flist { padding: 4rpx 0; }
.frow { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); font-size: 28rpx; color: var(--c-title); }
.frow-label { flex: 1; }
.ck { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
/* 演示模式 */
.demo-section { margin-top: 40rpx; padding: 26rpx; background: var(--c-card); border-radius: 20rpx; }
/* 学校公告 */
.notice-section { margin-top: 24rpx; background: var(--c-card); border-radius: 16rpx; padding: 20rpx 24rpx; }
.notice-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.notice-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.notice-form { margin-bottom: 16rpx; }
.notice-textarea { min-height: 120rpx; margin-top: 10rpx; }
.notice-send { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; margin-top: 14rpx; }
.notice-list { margin-top: 8rpx; }
.notice-item { padding: 14rpx 0; border-bottom: 1px solid var(--c-border); }
.notice-item:last-child { border-bottom: none; }
.notice-item-hd { display: flex; justify-content: space-between; align-items: center; }
.notice-item-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.notice-item-content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.notice-item-time { display: block; font-size: 20rpx; color: var(--c-sub2); margin-top: 4rpx; }
/* 学期管理 */
.semester-date-row { display: flex; gap: 10rpx; align-items: center; margin-top: 10rpx; }
.sem-date { flex: 1; }
.sem-date-sep { font-size: 24rpx; color: var(--c-sub); }
.dark .semester-date-row .inp { background: var(--c-input); }
/* 批量导入 */
.batch-area { min-height: 200rpx; margin-top: 14rpx; }
.batch-result { margin-top: 16rpx; }
.batch-summary { font-size: 24rpx; font-weight: 600; color: var(--c-title); margin-bottom: 8rpx; }
.batch-item { font-size: 22rpx; padding: 6rpx 0; }
.batch-item.ok { color: #07c160; }
.batch-item.fail { color: #e64340; }
.batch-err { display: block; font-size: 20rpx; color: var(--c-sub); margin-left: 16rpx; }
.hint-example { display: block; color: var(--c-sub); font-size: 22rpx; margin-top: 6rpx; white-space: pre; }
.demo-row { display: flex; align-items: center; justify-content: space-between; }
.demo-text { flex: 1; padding-right: 20rpx; }
.demo-name { display: block; font-size: 28rpx; color: var(--c-title); font-weight: 600; }
.demo-sub { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.demo-btn { width: 100%; margin-top: 14rpx; background: linear-gradient(135deg, #409eff, #3a8ee6); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
</style>
