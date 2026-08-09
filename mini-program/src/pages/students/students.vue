<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">{{ className }}</view>

    <view class="toolbar">
      <input v-model="kw" class="search" placeholder="搜索姓名/学号" />
      <picker :range="genderOpts" @change="(e) => (genderFilter = genderOpts[e.detail.value])">
        <view class="mini-picker">{{ genderFilter }}</view>
      </picker>
      <picker :range="sortOpts" @change="(e) => (sortBy = sortVals[e.detail.value])">
        <view class="mini-picker">{{ sortLabel }}</view>
      </picker>
    </view>
    <view class="toolbar2">
      <text class="tbtn" :class="batchMode && 'on'" @click="batchMode = !batchMode">{{ batchMode ? '取消批量' : '批量管理' }}</text>
      <text v-if="batchMode && selected.size !== shown.length" class="tbtn" @click="selectAll">全选</text>
      <text v-if="batchMode && selected.size === shown.length && shown.length" class="tbtn" @click="deselectAll">取消全选</text>
      <text class="tbtn" @click="exportCsv">导出 CSV</text>
      <text class="tcount">共 {{ shown.length }} 人</text>
    </view>

    <scroll-view scroll-y class="list-scroll" :scroll-top="scrollTop" lower-threshold="150" @scrolltolower="loadMore">
      <Skeleton v-if="loading" :rows="4" />
      <block v-else>
        <view v-for="s in shown" :key="s.id" class="item" :class="batchMode && 'selectable'" @click="batchMode ? toggleSel(s) : openProfile(s)">
          <view v-if="batchMode" class="check" :class="selected.has(s.id) && 'on'">✓</view>
          <view class="top">
            <text class="name">{{ s.name }}</text>
            <text class="no">学号 {{ s.studentNo || '—' }}</text>
            <text class="auth-badge" :class="s.parentLoginEnabled && 'on'">{{ s.parentLoginEnabled ? '家长已授权' : '未授权' }}</text>
          </view>
          <view class="meta">
            <text>{{ s.gender }}</text>
            <text v-if="s.duty" class="duty">· {{ s.duty }}</text>
            <text v-if="s.seatRow" class="seat">· 座号{{ s.seatNo || '—' }}（第{{ s.seatRow }}行第{{ s.seatCol }}列）</text>
            <text v-else class="seat">· 未排座</text>
          </view>
          <view class="tags" v-if="s.tags && s.tags.length">
            <text v-for="t in s.tags" :key="t" class="tag">{{ t }}</text>
          </view>
          <view class="row-acts" v-if="s.parentPhone || s.parentLoginEnabled || !batchMode">
            <text v-if="s.parentPhone" class="dial" @click.stop="dial(s.parentPhone)">📞 拨号家长</text>
            <text v-if="s.parentLoginEnabled" class="dial reset" @click.stop="resetParentPwd(s)">🔑 重置密码</text>
            <text v-if="!batchMode" class="dial del" @click.stop="deleteOne(s)">🗑 删除</text>
          </view>
          <text v-if="s.parentLoginEnabled" class="hint">默认口令：学号后6位（{{ defaultPwd(s) }}）</text>
        </view>
      </block>
      <EmptyState v-if="!loading && !shown.length" icon="🧒" text="暂无学生" hint="点下方添加或批量导入" />
      <view v-if="!loading && hasMore" class="load-more">下滑加载更多（剩余 {{ shownAll.length - shown.length }} 人）</view>
      <view v-if="!loading && !hasMore && shown.length" class="load-more end">— 已经到底了 —</view>
    </scroll-view>

    <view v-if="batchMode && selected.size" class="batchbar">
      <text class="bsel">已选 {{ selected.size }} 人</text>
      <text class="bauth" @click="batchAuthParent(true)">📱 授权家长</text>
      <text class="bauth" @click="batchAuthParent(false)">取消授权</text>
      <text class="bdel" @click="batchDelete">删除所选</text>
    </view>

    <view class="actions">
      <button class="add" @click="toggleForm">{{ showForm ? '收起' : '＋ 添加学生' }}</button>
      <button class="import" @click="toggleImport">{{ showImport ? '收起' : '📥 批量导入' }}</button>
    </view>

    <view v-if="showForm" class="form">
      <picker :range="classOptions" :value="classIdx" @change="onClassPick">
        <view class="picker">所属班级：{{ classOptions[classIdx] || '请选择班级' }}</view>
      </picker>
      <input v-model="form.name" maxlength="50" placeholder="姓名" />
      <picker :range="['男', '女']" :value="['男','女'].indexOf(form.gender)" @change="(e) => (form.gender = ['男', '女'][e.detail.value])">
        <view class="picker">性别：{{ form.gender }}</view>
      </picker>
      <input v-model="form.studentNo" maxlength="32" placeholder="学号" />
      <input v-model="form.parentName" maxlength="50" placeholder="家长姓名" />
      <input v-model="form.parentPhone" maxlength="11" placeholder="家长电话" @blur="checkPhone" /><text v-if="phoneError" class="field-err">{{ phoneError }}</text>
      <input v-model="form.studentPhone" maxlength="11" placeholder="学生电话（选填）" />
      <input v-model="form.address" maxlength="100" placeholder="地址（选填，家庭住址）" />
      <input v-model="form.duty" maxlength="30" placeholder="班级职务（如 班长/课代表）" />
      <picker mode="date" :value="form.birthDate" @change="(e) => (form.birthDate = e.detail.value)">
        <view class="picker">🎂 生日：{{ form.birthDate || '请选择日期（可选）' }}</view>
      </picker>
      <input v-model="form.tags" placeholder="标签（逗号分隔，如 活跃,进步）" />
      <textarea v-model="form.note" class="area" placeholder="备注（联系方式、特殊事项等）"></textarea>
      <button class="save" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
    </view>

    <view v-if="showImport" class="form import-box">
      <view class="imp-title">批量导入学生</view>
      <view class="imp-target">导入到：<text class="imp-class">{{ className || '请先选择班级' }}</text></view>
      <view class="imp-tip">支持 Excel(.xlsx/.xls) 或 TXT/CSV，每行：姓名,性别,学号,家长姓名,家长电话</view>
      <button class="tpl" @click="showTpl = true">📄 下载/查看模板</button>
      <button class="pick" @click="pickFile">📂 选择文件</button>
      <button class="pick ai" @click="pickImage" :disabled="aiRecognizing">{{ aiRecognizing ? '识别中…' : '📷 拍照/选图识别' }}</button>
      <view class="imp-tip ai-tip">用 AI 识别学生名单图片（需后端配置多模态模型）</view>

      <view v-if="preview" class="preview">
        <view class="pv-sum">
          校验结果：<text class="ok">有效 {{ preview.validCount }}</text> ·
          <text class="bad">异常 {{ preview.errorCount }}</text> / 共 {{ preview.rows.length }} 行
        </view>
        <view v-if="preview.errorCount" class="pv-errs">
          <view v-for="(r, i) in preview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
            第{{ r.line }}行 {{ r.name || '(空)' }}：{{ r.error }}
          </view>
        </view>
        <button class="confirm" :disabled="!preview.validCount" @click="commit">确认导入 {{ preview.validCount }} 条</button>
      </view>
    </view>

    <!-- 模板弹窗 -->
    <view v-if="showTpl" class="mask" @click="showTpl = false">
      <view class="dialog" @click.stop>
        <view class="d-title">导入模板格式</view>
        <view class="d-sub">第一行可写表头（姓名,性别,学号,家长姓名,家长电话），数据从下一行开始：</view>
        <view class="d-code">姓名,性别,学号,家长姓名,家长电话
张三,男,2026001,张父,13800000001
李四,女,2026002,李母,13800000002</view>
        <button class="d-copy" @click="copyTpl">📋 复制示例</button>
        <button class="d-close" @click="showTpl = false">关闭</button>
      </view>
    </view>

    <!-- 学生档案（雷达图）：顶部固定雷达，底部固定按钮，中间可滚动评语 -->
    <view v-if="showProfile" class="mask" @click="showProfile = false">
      <view class="dialog dialog-profile" @click.stop>
        <view class="dp-top">
          <view class="d-title">{{ profile.name }} 的档案</view>
          <view class="pf-meta">{{ profile.gender }} · 学号 {{ profile.studentNo || '—' }}<text v-if="profile.duty"> · {{ profile.duty }}</text></view>
          <view class="pf-line" v-if="profile.birthDate">🎂 生日：{{ profile.birthDate }}</view>
          <view class="pf-line" v-if="profile.seatRow">座位：座号 {{ profile.seatNo || '—' }}（第{{ profile.seatRow }}行第{{ profile.seatCol }}列）</view>
          <view class="pf-composite" :class="levelClass">
            <text class="pf-c-n">{{ radar.composite }}</text>
            <text class="pf-c-l">综合能力评分 · {{ radar.level }}</text>
          </view>
          <view class="pf-tags" v-if="profile.tags && profile.tags.length">
            <text v-for="t in profile.tags" :key="t" class="pf-tag">{{ t }}</text>
          </view>
          <view class="pf-line" v-if="profile.parentName">家长：{{ profile.parentName }} <text v-if="profile.parentPhone" class="pf-dial" @click="dial(profile.parentPhone)">📞 拨号</text></view>
          <view class="pf-note" v-if="profile.note">备注：{{ profile.note }}</view>
          <canvas type="2d" id="radarCanvas" class="radar"></canvas>
          <view class="pf-stats">
            <view class="pf-st"><text class="pf-n">{{ radar.avg }}</text><text class="pf-l">成绩均分</text></view>
            <view class="pf-st"><text class="pf-n">{{ radar.attRate }}%</text><text class="pf-l">出勤率</text></view>
            <view class="pf-st"><text class="pf-n">{{ radar.behScore }}</text><text class="pf-l">行为活跃</text></view>
          </view>
          <view class="pf-tip">雷达基于成绩 / 考勤 / 行为观察数据自动生成（0–100）。</view>
        </view>
        <scroll-view scroll-y class="dp-scroll">
          <view class="pf-comment" v-if="profile.comment">
            <text class="pf-cm-h">📝 评语</text>
            <text class="pf-cm-t">{{ profile.comment }}</text>
          </view>
          <view class="pf-comment" v-else-if="profile.id">
            <text class="pf-cm-h">📝 评语</text>
            <text class="pf-cm-t pf-cm-empty">暂无评语</text>
          </view>
        </scroll-view>
        <view class="pf-acts">
          <button class="btn-gen" :disabled="genCommentLoading" @click="genComment(profile)">{{ genCommentLoading ? '生成中…' : '🤖 AI 生成本学期评语' }}</button>
          <button class="d-close" @click="showProfile = false">关闭</button>
        </view>
      </view>
    </view>
  </view>

  <!-- 家长密码重置弹窗 -->
  <view v-if="pwdUser" class="mask" @click="pwdUser = null">
    <view class="dialog" @click.stop>
      <view class="d-title">重置「{{ pwdUser.name }}」家长密码</view>
      <input v-model="newPwd" class="pwd-inp" placeholder="新密码（6-20位）" />
      <view class="d-sub">默认密码 123456，也可自行设置（6-20位）</view>
      <view class="btn-row2">
        <button class="cancel-btn" @click="pwdUser = null">取消</button>
        <button class="confirm" :disabled="resetSaving" @click="doResetParentPwd">确认重置</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { onShow, onLoad, onPullDownRefresh, onUnload } from '@dcloudio/uni-app'
import api, { batchRun } from '../../common/request'
import {
  listStudents, listClasses, createStudent, updateStudent, removeStudent,
  batchRemoveStudents, toggleParentLogin, resetParentPassword,
  importStudents, importStudentsAi, importStudentsCommit, generateComment,
  getStudentGrades, getStudentAttendances, getStudentBehaviorRecords,
} from '@/api/students'
import { listGrades, getGrades } from '@/api/grades'
import { isPhone, isStudentNo } from '../../common/validators'
import { defaultParentPassword } from '@gardener/shared/utils/student'
import { safeParse } from '../../common/util'
import { theme, flushTabBarStyle, switchTabParams } from '../../common/store'
import { copyText } from '../../common/print'
import { compressImage } from '../../common/image'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import Skeleton from '../../components/Skeleton/Skeleton.vue'

const classId = ref('')
const className = ref('')
const list = ref([])
const loading = ref(false)
const kw = ref('')
// 班级下拉列表
const classList = ref([])
const classIdx = ref(0)
const classOptions = computed(() => classList.value.map(c => c.name))
const saving = ref(false)
const phoneError = ref('')

const form = ref({ name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '', studentPhone: '', address: '', duty: '', birthDate: '', tags: '', note: '' })

onLoad(() => {
  // 从 switchTabParams 读取班级参数（由 classes.vue 通过 switchTab 跳转时设置）
  const p = switchTabParams.students
  if (p && p.classId) {
    classId.value = p.classId
    className.value = p.name || '学生管理'
    delete switchTabParams.students
  }
})
// P2-2: 搜索关键词防抖（200ms），避免每次输入立即触发 computed 重新过滤
const kwDebounced = ref('')
let kwTimer = null
watch(kw, (v) => {
  if (kwTimer) clearTimeout(kwTimer)
  kwTimer = setTimeout(() => {
    kwDebounced.value = v
    resetPage()
  }, 200)
})
const genderOpts = ['全部', '男', '女']
const genderFilter = ref('全部')
const sortOpts = ['按学号', '按座位', '按姓名']
const sortVals = ['studentNo', 'seat', 'name']
const sortBy = ref('studentNo')
const sortLabel = computed(() => sortOpts[sortVals.indexOf(sortBy.value)])
const batchMode = ref(false)
const selected = ref(new Set())
// 长列表分页：避免大班级一次渲染几十上百项卡顿
const PAGE_SIZE = 20
// scroll-view 滚动位置（搜索/筛选用）
const scrollTop = ref(0)
const page = ref(1)
const loadingMore = ref(false)
const shownAll = computed(() => {
  // list 已由服务端按 classId 过滤，此处仅做搜索/性别/排序
  let arr = list.value
  // 用防抖后的关键词，避免每次按键触发过滤
  const k = kwDebounced.value.trim().toLowerCase()
  if (k) arr = arr.filter((s) => (s.name || '').toLowerCase().includes(k) || (s.studentNo || '').toLowerCase().includes(k))
  if (genderFilter.value !== '全部') arr = arr.filter((s) => s.gender === genderFilter.value)
  arr.sort((a, b) => {
    if (sortBy.value === 'studentNo') return String(a.studentNo || '').localeCompare(String(b.studentNo || ''))
    if (sortBy.value === 'seat') return (a.seatRow || 0) - (b.seatRow || 0) || (a.seatCol || 0) - (b.seatCol || 0)
    return (a.name || '').localeCompare(b.name || '', 'zh')
  })
  return arr
})
// 实际渲染的切片：前 page * PAGE_SIZE 条
const shown = computed(() => shownAll.value.slice(0, page.value * PAGE_SIZE))
const hasMore = computed(() => shown.value.length < shownAll.value.length)
// 筛选/搜索/排序变化时重置分页
function resetPage() { page.value = 1; scrollTop.value = 0 }
function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  page.value++
  setTimeout(() => { loadingMore.value = false }, 300)
}
const showForm = ref(false)
const showImport = ref(false)
const showTpl = ref(false)
const preview = ref(null)
// AI 识别图片进行中标记：用于按钮 disabled 与文案切换
const aiRecognizing = ref(false)
const showProfile = ref(false)
const profile = ref({})
const radar = ref({ avg: 0, attRate: 0, behScore: 0, composite: 0, level: '' })
const genCommentLoading = ref(false)

async function genComment(stu) {
  if (genCommentLoading.value) return
  // 获取该生本学期考试成绩作为评语依据
  const allGrades = await listGrades({ silent: true })
  const semester = form.value.semesterId || ''
  const myGrades = allGrades.filter((g) => g.scores && g.scores.some((s) => s.studentId === stu.id && s.score != null))
  const lines = myGrades.map((g) => {
    const sc = g.scores.find((s) => s.studentId === stu.id)
    return `${g.subject}：${sc.score}分`
  })
  if (!lines.length) return uni.showToast({ title: '该生暂无成绩数据', icon: 'none' })
  genCommentLoading.value = true
  try {
    const prompt = `请根据以下学生考试成绩，为该学生写一段学期评语。评语要求：语气亲切、重点突出优点和进步方向，约100-150字。不要出现具体分数数字，用描述性语言代替。\n学生姓名：${stu.name}\n成绩：\n${lines.join('\n')}`
    const r = await generateComment({
      messages: [{ role: 'user', content: prompt }],
      modelType: 'text',
    })
    const comment = r.content || ''
    if (comment) {
      await updateStudent(stu.id, { comment })
      profile.value.comment = comment
      stu.comment = comment
      uni.showToast({ title: '评语已生成并保存', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: '生成失败', icon: 'none' })
  } finally {
    genCommentLoading.value = false
  }
}
const levelClass = computed(() => {
  const c = radar.value.composite
  return c >= 85 ? 'lv-excellent' : c >= 70 ? 'lv-good' : c >= 60 ? 'lv-mid' : 'lv-low'
})

async function load() {
  loading.value = true
  try {
    // 首次加载时若没有 classId，从 switchTabParams 读取或取第一个班级
    if (!classId.value) {
      const p = switchTabParams.students
      if (p && p.classId) {
        classId.value = p.classId
        className.value = p.name || '学生管理'
        delete switchTabParams.students
      } else {
        await loadClasses()
        if (classList.value.length) {
          classId.value = classList.value[0].id
          className.value = classList.value[0].name
        }
      }
    }
    if (classId.value) {
      list.value = await listStudents(classId.value, { loading: false })
    }
  } finally { loading.value = false }
  resetPage()
}

async function loadClasses() {
  try { classList.value = await listClasses() || [] } catch (e) { classList.value = [] }
}
onShow(async () => {
  await load()
  flushTabBarStyle()
})
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
// 筛选/排序变化时重置分页到第 1 页（kw 由防抖 watch 内部触发 resetPage）
watch([genderFilter, sortBy], () => resetPage())

// 页面卸载时清理防抖定时器，避免实例残留
onUnload(() => {
  if (kwTimer) { clearTimeout(kwTimer); kwTimer = null }
})

function toggleForm() {
  showForm.value = !showForm.value
}

function toggleImport() {
  showImport.value = !showImport.value
}

// 批量操作：全选 / 取消全选
function selectAll() { selected.value = new Set(shown.value.map((s) => s.id)) }
function deselectAll() { selected.value = new Set() }

// 批量授权/取消授权家长：调专用 toggle-parent-login（后端会初始化/清空密码，避免直写字段漏设口令）
async function batchAuthParent(enabled) {
  const ids = [...selected.value]
  if (!ids.length) return uni.showToast({ title: '请先选择学生', icon: 'none' })
  uni.showLoading({ title: enabled ? '授权中…' : '取消授权中…', mask: true })
  try {
    // toggle-parent-login 会翻转状态；仅对当前状态与目标不一致的学生调用
    const tasks = ids
      .map((id) => shown.value.find((s) => s.id === id))
      .filter((s) => s && s.parentLoginEnabled !== enabled)
      .map((s) => toggleParentLogin(s.id))
    const { success, failed } = await batchRun(tasks)
    uni.hideLoading()
    uni.showToast({
      title: enabled
        ? `已开通 ${success} 人，默认口令为学号后6位${failed ? '，失败 ' + failed + ' 人' : ''}`
        : `操作完成：成功 ${success} 条${failed ? '，失败 ' + failed + ' 条' : ''}`,
      icon: 'none',
    })
    selected.value = new Set()
    load()
  } catch (e) { uni.hideLoading(); uni.showToast({ title: '操作失败', icon: 'none' }) }
}

// 班主任重置某学生家长登录口令（弹框：默认 123456，可自定义）
const pwdUser = ref(null)
const newPwd = ref('')
const resetSaving = ref(false)

function resetParentPwd(s) {
  pwdUser.value = s
  newPwd.value = '123456'
}

async function doResetParentPwd() {
  if (!pwdUser.value || resetSaving.value) return
  resetSaving.value = true
  uni.showLoading({ title: '重置中…', mask: true })
  try {
    const res = await resetParentPassword(pwdUser.value.id, { password: newPwd.value })
    pwdUser.value = null
    uni.hideLoading()
    uni.showModal({
      title: '重置成功',
      content: '家长登录口令已重置为：' + (res && res.defaultPassword ? res.defaultPassword : newPwd.value),
      showCancel: false,
    })
    load()
  } catch (e) { uni.hideLoading(); uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
  finally { resetSaving.value = false }
}

// 家长默认口令 = 学号后6位（复用 shared，与后端规则一致，仅用于界面展示）
function defaultPwd(s) {
  return defaultParentPassword(s.studentNo)
}

function toggleSel(s) {
  const ns = new Set(selected.value)
  if (ns.has(s.id)) ns.delete(s.id)
  else ns.add(s.id)
  selected.value = ns
}
// 单条删除学生（与批量删除同后端接口，带确认弹窗）
async function deleteOne(s) {
  uni.showModal({
    title: '删除学生',
    content: `确定删除学生「${s.name}」（${s.studentNo || '无学号'}）吗？\n该操作不可恢复。`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…' })
      try {
        await removeStudent(s.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || ''), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
async function batchDelete() {
  const ids = [...selected.value]
  if (!ids.length) return
  uni.showModal({
    title: '批量删除',
    content: `确定删除选中的 ${ids.length} 名学生吗？`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      uni.showLoading({ title: '删除中…' })
      try {
        const { success, failed } = await batchRun(ids.map((id) => removeStudent(id)))
        selected.value = new Set()
        batchMode.value = false
        if (failed === 0) {
          uni.showToast({ title: `已删除 ${success} 人`, icon: 'success' })
        } else {
          uni.showToast({ title: `成功 ${success} 失败 ${failed}`, icon: 'none' })
        }
        load()
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || ''), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
function exportCsv() {
  const rows = shown.value
  if (!rows.length) return uni.showToast({ title: '没有可导出的学生', icon: 'none' })
  const head = '姓名,性别,学号,家长姓名,家长电话,职务,标签,备注,座位'
  const body = rows
    .map((s) =>
      [s.name, s.gender, s.studentNo || '', s.parentName || '', s.parentPhone || '', s.duty || '', (s.tags || []).join('/'), s.note || '', s.seatRow ? s.seatRow + '行' + (s.seatCol || '') + '列' : '']
        .map((x) => '"' + String(x).replace(/"/g, '""') + '"')
        .join(','),
    )
    .join('\n')
  copyText('\uFEFF' + head + '\n' + body)
}

function checkPhone() {
  if (form.value.parentPhone && !isPhone(form.value.parentPhone)) {
    phoneError.value = '家长电话格式错误，应为 11 位手机号'
  } else {
    phoneError.value = ''
  }
}

function onClassPick(e) {
  classIdx.value = e.detail.value
  const c = classList.value[classIdx.value]
  if (c) {
    classId.value = c.id
    className.value = c.name
  }
}

async function save() {
  if (phoneError.value) return uni.showToast({ title: phoneError.value, icon: 'none' })
  if (saving.value) return
  if (!form.value.name.trim()) return uni.showToast({ title: '请填写姓名', icon: 'none' })
  if (form.value.gender !== '男' && form.value.gender !== '女')
    return uni.showToast({ title: '请选择性别', icon: 'none' })
  if (!isStudentNo(form.value.studentNo)) return uni.showToast({ title: '学号格式错误（仅字母数字，2-32位）', icon: 'none' })
  if (form.value.parentPhone && !isPhone(form.value.parentPhone)) return uni.showToast({ title: '家长电话格式错误（应为 11 位手机号）', icon: 'none' })
  if (!classId.value) return uni.showToast({ title: '请先选择所属班级', icon: 'none' })
  saving.value = true
  try {
    // 显式构造 payload，只发送实体所需字段，空字符串转为 null 避免数据库约束问题
    const payload = {
      name: form.value.name.trim(),
      gender: form.value.gender,
      studentNo: form.value.studentNo.trim(),
      parentName: form.value.parentName.trim(),
      parentPhone: form.value.parentPhone.trim(),
      studentPhone: form.value.studentPhone.trim() || null,
      address: form.value.address.trim() || null,
      duty: form.value.duty.trim() || null,
      birthDate: form.value.birthDate || null,
      note: form.value.note.trim() || null,
      tags: parseTags(form.value.tags),
      classId: classId.value,
    }
    await createStudent(payload)
    uni.showToast({ title: '已保存', icon: 'success' })
    showForm.value = false
    form.value = { name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '', studentPhone: '', address: '', duty: '', birthDate: '', tags: '', note: '' }
    load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none', duration: 3000 })
  } finally {
    saving.value = false
  }
}

function parseTags(str) {
  return String(str || '')
    .split(/[,，、\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}
function dial(phone) {
  if (!phone) return uni.showToast({ title: '无联系电话', icon: 'none' })
  uni.makePhoneCall({ phoneNumber: String(phone), fail: () => {} })
}

function copyTpl() {
  uni.setClipboardData({
    data: '姓名,性别,学号,家长姓名,家长电话\n张三,男,2026001,张父,13800000001\n李四,女,2026002,李母,13800000002',
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

function pickFile() {
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
        const r = await importStudents({ filename: f.name, data })
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

// AI 识图导入（P3-g/h）：选图 → 压缩 → base64 → POST /students/import-ai
// 返回结构与 /students/import 一致，可直接复用 preview UI 与 commit 函数
function pickImage() {
  if (aiRecognizing.value) return
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed', 'original'],
    success: async (res) => {
      const tempPath = res.tempFiles[0].tempFilePath
      aiRecognizing.value = true
      uni.showLoading({ title: 'AI 识别中…', mask: true })
      try {
        // 离屏 canvas 压缩到 1280px / 质量 80，控制 base64 体积
        const cmp = await compressImage({
          src: tempPath,
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 80,
          fileType: 'jpg',
        })
        // 压缩失败时 compressImage 会返回原图路径，统一用结果路径读 base64
        const compressedPath = cmp?.tempFilePath || tempPath
        const base64 = await readAsBase64(compressedPath)
        const r = await importStudentsAi({
          mode: 'image',
          data: base64,
          filename: 'student_list.jpg',
        })
        preview.value = r
        if (!r.validCount) {
          uni.showToast({ title: '未识别到有效学生，请换张图试试', icon: 'none' })
        } else {
          uni.showToast({ title: `识别到 ${r.validCount} 名学生`, icon: 'success' })
        }
      } catch (e) {
        uni.showToast({ title: '识别失败：' + (e.message || '请先配置 AI'), icon: 'none' })
      } finally {
        uni.hideLoading()
        aiRecognizing.value = false
      }
    },
    fail: () => {},
  })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data),
      fail: reject,
    })
  })
}

async function commit() {
  const items = preview.value.rows.filter((r) => r.valid)
  if (!items.length) return
  // 校验班级选择：若 classId 为空则尝试第一个班级
  if (!classId.value) {
    if (classList.value.length) {
      classId.value = classList.value[0].id
      className.value = classList.value[0].name
    } else {
      await loadClasses()
      if (classList.value.length) {
        classId.value = classList.value[0].id
        className.value = classList.value[0].name
      } else {
        uni.showToast({ title: '请先创建班级再导入学生', icon: 'none' })
        return
      }
    }
  }
  uni.showLoading({ title: '导入中…' })
  try {
    const r = await importStudentsCommit({ classId: classId.value, items })
    uni.showToast({ title: `成功导入 ${r.count} 名学生`, icon: 'success' })
    preview.value = null
    showImport.value = false
    load()
  } catch (e) {
    uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function openProfile(s) {
  profile.value = s
  showProfile.value = true
  radar.value = { avg: 0, attRate: 0, behScore: 0 }
  await computeProfile(s)
}
async function computeProfile(s) {
  const [grades, atts, beh] = await Promise.all([
    getStudentGrades().catch(() => []),
    getStudentAttendances(),
    getStudentBehaviorRecords(),
  ])
  // 成绩均分
  const sc = []
  ;(grades || []).forEach((g) => (g.scores || []).forEach((x) => { if (x.studentId === s.id && x.score != null) sc.push(Number(x.score)) }))
  const avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0
  // 出勤率
  let total = 0
  let present = 0
  ;(atts || []).forEach((a) => {
    const recs = safeParse(a.records, [])
    recs.forEach((r) => { if (r.studentId === s.id) { total++; if (r.status === '出勤') present++ } })
  })
  const attRate = total ? Math.round((present / total) * 100) : 0
  // 行为活跃（封顶 20 条 = 100）
  const behCount = (beh || []).filter((b) => b.studentId === s.id).length
  const behScore = Math.min(100, Math.round((behCount / 20) * 100))
  // 综合能力评分：成绩 50% + 出勤 30% + 行为 20%
  const composite = Math.round(avg * 0.5 + attRate * 0.3 + behScore * 0.2)
  const level = composite >= 85 ? '优秀' : composite >= 70 ? '良好' : composite >= 60 ? '中等' : '待提升'
  radar.value = { avg, attRate, behScore, composite, level }
  nextTick(drawRadar)
}
function drawRadar() {
  const q = uni.createSelectorQuery()
  q.select('#radarCanvas').fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) return
    const canvas = res[0].node
    const dpr = (uni.getSystemInfoSync().pixelRatio || 2)
    const size = 300
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const cx = size / 2
    const cy = size / 2
    const R = 100
    const vals = [radar.value.avg, radar.value.attRate, radar.value.behScore]
    const labels = ['成绩', '出勤', '行为']
    const n = 3
    // 网格环
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
        const rr = (R * r) / 4
        const x = cx + rr * Math.cos(a)
        const y = cy + rr * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = '#e3e3e3'
      ctx.stroke()
    }
    // 轴线 + 标签
    ctx.font = '13px sans-serif'
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const x = cx + R * Math.cos(a)
      const y = cy + R * Math.sin(a)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#eee'
      ctx.stroke()
      const lx = cx + (R + 18) * Math.cos(a)
      const ly = cy + (R + 18) * Math.sin(a)
      ctx.fillStyle = '#888'
      ctx.textAlign = 'center'
      ctx.fillText(labels[i], lx, ly + 4)
    }
    // 数据多边形
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const rr = (R * vals[i]) / 100
      const x = cx + rr * Math.cos(a)
      const y = cy + rr * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(230,162,60,0.35)'
    ctx.strokeStyle = '#e6a23c'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const rr = (R * vals[i]) / 100
      const x = cx + rr * Math.cos(a)
      const y = cy + rr * Math.sin(a)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#e6a23c'
      ctx.fill()
    }
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0; }
.bar { flex-shrink: 0; font-size: 34rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.toolbar { flex-shrink: 0; display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.search { flex: 1; border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 14rpx 24rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; min-width: 0; }
.mini-picker { border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 14rpx 24rpx; font-size: 24rpx; background: var(--c-card); color: var(--c-title); white-space: nowrap; }
.toolbar2 { flex-shrink: 0; display: flex; align-items: center; gap: 20rpx; margin-bottom: 16rpx; }
.tbtn { font-size: 26rpx; color: var(--c-blue); padding: 10rpx 22rpx; border-radius: 30rpx; background: var(--c-card); border: 1px solid var(--c-border); }
.tbtn.on { background: #e8f1fb; color: #3a8ee6; }
.tcount { margin-left: auto; font-size: 24rpx; color: var(--c-sub); }
.item.selectable { display: flex; align-items: center; gap: 16rpx; }
.check { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid var(--c-border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #fff; }
.check.on { background: var(--c-primary); border-color: var(--c-primary); }
.batchbar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--c-card); border-top: 1px solid var(--c-border); padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -4rpx 16rpx var(--c-shadow); z-index: 40; }
.bsel { font-size: 26rpx; color: var(--c-title); }
.bdel { font-size: 28rpx; color: #fff; background: var(--c-danger); padding: 14rpx 36rpx; border-radius: 40rpx; }
.dark .search { border-color: var(--c-input-border); }
.dark .mini-picker, .dark .tbtn { border-color: var(--c-input-border); background: var(--c-card); color: var(--c-title); }
.item { background: var(--c-card); border-radius: 24rpx; padding: 26rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; color: var(--c-text); }
.no { color: var(--c-sub); font-size: 24rpx; }
.auth-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #f0f0f0; color: var(--c-sub); flex-shrink: 0; }
.auth-badge.on { background: #e8f5e9; color: #43a047; }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.duty { color: var(--c-blue); }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.list-scroll { flex: 1; min-height: 0; overflow: hidden; padding: 4rpx; }
.load-more { text-align: center; color: var(--c-accent); padding: 24rpx 0; font-size: 26rpx; border-top: 1px solid var(--c-border); }
.load-more.end { color: var(--c-sub); }
.actions { flex-shrink: 0; display: flex; gap: 20rpx; margin-top: 16rpx; }
.add, .import { flex: 1; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.add { background: var(--c-accent); }
.import { background: var(--c-blue); }
.form { flex-shrink: 0; margin-top: 24rpx; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); max-height: 60vh; overflow-y: auto; }
.form input, .picker { border: 1px solid var(--c-input-border); border-radius: 18rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); width: 100%; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.field-err { display:block; font-size:22rpx; color:#e64340; margin-top:4rpx; }
.import-box { background: var(--c-card2); }
.imp-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.imp-target { font-size: 24rpx; color: var(--c-sub); margin-bottom: 12rpx; }
.imp-class { color: var(--c-accent); font-weight: 600; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.tpl, .pick { background: var(--c-card); color: #2a6fbb; border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; }
.pick { background: var(--c-blue); color: #fff; border: none; }
/* AI 识别按钮使用绿色突出，与普通文件导入区分；disabled 时半透明 */
.pick.ai { background: var(--c-primary); color: #fff; }
.pick.ai[disabled] { opacity: 0.6; }
.ai-tip { margin-top: -8rpx; margin-bottom: 14rpx; }
.preview { margin-top: 10rpx; border-top: 1px dashed var(--c-border); padding-top: 16rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.pv-errs { margin: 10rpx 0; }
.pv-err { font-size: 24rpx; color: var(--c-danger); line-height: 1.6; }
.confirm { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 6rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.confirm[disabled] { opacity: 0.5; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { width: 86%; max-width: 640rpx; max-height: 80vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
/* 学生档案弹窗：顶部雷达固定，中间评语滚动，底部按钮固定 */
.dialog-profile { display: flex; flex-direction: column; padding: 0; max-height: 82vh; overflow: hidden; }
.dp-top { padding: 36rpx 36rpx 0; flex-shrink: 0; overflow: visible; }
.dp-scroll { padding: 0 36rpx; overflow-y: auto; flex: 1; min-height: 0; }
.d-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.d-sub { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.d-code { background: var(--c-title); color: var(--c-card2); font-size: 22rpx; padding: 20rpx; border-radius: 12rpx; white-space: pre-wrap; line-height: 1.7; font-family: monospace; margin-bottom: 20rpx; }
.d-copy { background: var(--c-blue); color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.d-close { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.radar { width: 300px; height: 300px; display: block; margin: 10rpx auto; }
.pf-meta { font-size: 24rpx; color: var(--c-sub); text-align: center; margin-bottom: 6rpx; }
.pf-stats { display: flex; justify-content: space-around; margin: 10rpx 0; }
.pf-st { display: flex; flex-direction: column; align-items: center; }
.pf-n { font-size: 34rpx; font-weight: 800; color: var(--c-accent); }
.pf-l { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.pf-tip { font-size: 20rpx; color: var(--c-sub); text-align: center; line-height: 1.5; margin-bottom: 16rpx; }
.pf-comment { background: var(--c-card2); border-radius: 14rpx; padding: 16rpx; margin: 14rpx 0; }
.pf-cm-h { display: block; font-size: 24rpx; font-weight: 700; color: var(--c-accent); margin-bottom: 8rpx; }
.pf-cm-t { display: block; font-size: 26rpx; color: var(--c-title); line-height: 1.7; }
.pf-cm-empty { color: var(--c-sub); }
.pf-acts { margin-top: 6rpx; }
.btn-gen { background: var(--c-accent); color: #fff; border-radius: 50rpx; font-size: 26rpx; padding: 20rpx 0; width: 100%; margin-bottom: 12rpx; }
.pf-composite { text-align: center; margin: 12rpx 0 4rpx; padding: 16rpx; border-radius: 16rpx; background: var(--c-card2); }
.pf-c-n { display: block; font-size: 48rpx; font-weight: 800; line-height: 1.1; color: var(--c-title); }
.pf-c-l { display: block; font-size: 24rpx; margin-top: 4rpx; color: var(--c-sub); }
.lv-excellent .pf-c-n, .lv-excellent .pf-c-l { color: #07c160; }
.lv-good .pf-c-n, .lv-good .pf-c-l { color: var(--c-blue); }
.lv-mid .pf-c-n, .lv-mid .pf-c-l { color: #e6a23c; }
.lv-low .pf-c-n, .lv-low .pf-c-l { color: #e64340; }
.tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 10rpx; }
.tag { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 20rpx; background: #e8f1fb; color: #3a8ee6; }
.row-acts { margin-top: 10rpx; }
.dial { font-size: 24rpx; color: var(--c-primary); background: rgba(245,179,66,.12); padding: 8rpx 20rpx; border-radius: 30rpx; }
.dial.reset { color: #e6a23c; background: #fef3e6; }
.dial.del { color: #e64340; background: #fde8e8; }
.pf-tags { display: flex; flex-wrap: wrap; gap: 10rpx; justify-content: center; margin: 8rpx 0; }
.pf-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; background: #e8f1fb; color: #3a8ee6; }
.pf-line { font-size: 24rpx; color: var(--c-sub); text-align: center; margin-bottom: 6rpx; }
.pf-dial { color: var(--c-primary); margin-left: 8rpx; }
.pf-note { font-size: 22rpx; color: var(--c-sub); text-align: center; line-height: 1.6; margin-bottom: 8rpx; }
.form .area { height: 120rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; box-sizing: border-box; color: var(--c-text); background: var(--c-input); width: 100%; }
.dark .tag, .dark .pf-tag { background: var(--c-card2); color: #6db3f2; }
.dark .dial { background: rgba(245,179,66,.2); }
.pwd-inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 18rpx 20rpx; font-size: 28rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; margin: 16rpx 0 8rpx; }
.btn-row2 { display: flex; gap: 20rpx; margin-top: 12rpx; }
.cancel-btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; background: var(--c-card2); color: var(--c-sub); }
</style>
