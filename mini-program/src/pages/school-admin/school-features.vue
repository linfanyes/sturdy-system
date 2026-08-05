<template>
  <view class="page" :class="dark && 'dark'">
    <!-- 顶栏 -->
    <view class="head">
      <text class="back" @click="goBack">← 返回</text>
      <text class="title">学校功能包</text>
      <text class="placeholder"></text>
    </view>

    <!-- 说明（与 Web 端 SchoolFeatures.vue 同文案） -->
    <view class="tip">
      <text class="tip-t">学校级关闭后，该校教师即使勾选也不可用。</text>
      <text class="tip-s">关闭某功能包后，该校教师与家长访问该功能将被后端拦截（403「当前功能未开放：&lt;key&gt;」）。默认全部开启（featureFlags 为 null/空数组）。超管与学校管理员不受学校级影响，始终拥有全部功能。</text>
    </view>

    <!-- 学校选择（仅超管需选择学校；校管操作本校，不显示选择器） -->
    <view class="bar" v-if="!isSa">
      <text class="bar-label">选择学校</text>
      <picker
        mode="selector"
        :range="schoolLabels"
        :value="schoolIndex"
        :disabled="loadingSchools || !schools.length"
        @change="onSchoolChange"
      >
        <view class="picker">
          <text class="picker-t">{{ currentSchoolLabel || (loadingSchools ? '加载中…' : '暂无学校') }}</text>
          <text class="picker-arrow">▾</text>
        </view>
      </picker>
    </view>

    <view class="bar">
      <text class="sc">已开启 {{ enabledCount }} / {{ allKeys.length }}</text>
      <view class="bar-acts">
        <text class="act" @click="setAll(true)">全部开启</text>
        <text class="act" @click="setAll(false)">全部关闭</text>
      </view>
    </view>

    <view v-if="loading" class="empty">加载中…</view>

    <scroll-view v-else scroll-y class="body">
      <view class="group" v-for="g in groups" :key="g.title">
        <view class="group-head">
          <text class="group-title">{{ g.title }}</text>
          <view class="group-acts">
            <text class="act sm" @click="setGroup(g.keys, true)">全开</text>
            <text class="act sm" @click="setGroup(g.keys, false)">全关</text>
          </view>
        </view>
        <view class="flist">
          <label class="frow" v-for="k in g.keys" :key="k" @click="toggle(k)">
            <text class="ck" :class="selected[k] && 'on'"></text>
            <text class="frow-label" :class="!selected[k] && 'off'">{{ labelOf(k) }}</text>
          </label>
        </view>
      </view>
      <view class="foot-gap"></view>
    </scroll-view>

    <view class="foot">
      <button class="btn" :disabled="saving || loading || (!isSa && !selectedSchoolId)" @click="save">
        {{ saving ? '保存中…' : (dirty ? '保存修改' : '保存') }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { api } from '../../common/request'
import {
  getSchoolFeatures,
  updateSchoolFeatures,
  getSchoolAdminFeatures,
  updateSchoolAdminFeatures,
  FEATURE_FLAGS,
  FEATURE_FLAG_LABELS,
} from '../../common/feature'
import { getCurrentRole, ROLE } from '../../common/route-guard'

const dark = computed(() => theme.mode === 'dark')

/** 是否为校管角色：校管无学校选择器，直接操作本校功能包（与 Web 端 FeatureFlags.vue 对齐） */
const isSa = ref(getCurrentRole() === ROLE.SCHOOL_ADMIN)

/** 全量功能包 key（单一事实来源：shared/constants，与 Web 端 40 项一致） */
const allKeys = FEATURE_FLAGS

/** 功能包分组（与 Web 端 SchoolFeatures.vue 的 GROUPS 完全一致） */
const groups = [
  { title: '班级与学生', keys: ['classes', 'students'] },
  { title: '学情与考试', keys: ['exams', 'grades', 'analysis', 'attendance', 'homework'] },
  { title: '课堂工具', keys: ['tools', 'seats', 'games'] },
  { title: '学生评价', keys: ['rewards', 'growth', 'behavior', 'reading', 'checkin'] },
  { title: '班级管理', keys: ['finance', 'activities', 'duty', 'gallery'] },
  { title: '家校沟通', keys: ['parents', 'im', 'notices'] },
  { title: 'AI 与备课', keys: ['ai', 'schedule'] },
  { title: '教师办公', keys: ['worklog', 'observation', 'calendar', 'teachers'] },
  { title: '个人', keys: ['todos', 'notes', 'demo'] },
  {
    title: '办公/学科/快捷工具',
    keys: ['office_tools', 'subject_tools', 'quicktool', 'grade_trend', 'picker_history', 'reward', 'translate', 'blackboard', 'speech'],
  },
]

function labelOf(key) {
  return FEATURE_FLAG_LABELS[key] || key
}

// ==================== 状态 ====================
const schools = ref([])
const schoolIndex = ref(0)
const selectedSchoolId = ref('')
const loadingSchools = ref(false)
const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)
/** 每个 key 的开关态（true=启用） */
const selected = reactive({})

const schoolLabels = computed(() =>
  schools.value.map((s) => s.name + (s.code ? '（' + s.code + '）' : '')),
)
const currentSchoolLabel = computed(() => schoolLabels.value[schoolIndex.value] || '')
const enabledCount = computed(() => allKeys.filter((k) => selected[k]).length)

function goBack() {
  if (isSa.value) {
    uni.redirectTo({ url: '/pages/school-admin/school-admin' })
    return
  }
  const pages = getCurrentPages()
  if (pages && pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pages/admin/admin' })
}

async function loadSchools(preferId) {
  if (isSa.value) return
  loadingSchools.value = true
  try {
    const r = await api.get('/admin/schools')
    schools.value = Array.isArray(r) ? r : (r && r.items) || []
    if (schools.value.length) {
      // 由学校列表跳转进来时定位到指定学校，否则默认第一所
      const idx = preferId ? schools.value.findIndex((s) => s.id === preferId) : -1
      schoolIndex.value = idx >= 0 ? idx : 0
      selectedSchoolId.value = schools.value[schoolIndex.value].id
    }
  } catch (e) {
    uni.showToast({ title: String((e && e.message) || '加载学校列表失败').slice(0, 40), icon: 'none' })
  }
  loadingSchools.value = false
}

/** 把服务端 featureFlags（null/[]=全部开启）映射为开关态 */
function applyFlags(featureFlags) {
  const on = !Array.isArray(featureFlags) || featureFlags.length === 0
  for (const k of allKeys) {
    selected[k] = on ? true : featureFlags.indexOf(k) >= 0
  }
  dirty.value = false
}

async function loadFeatures() {
  if (!isSa.value && !selectedSchoolId.value) return
  loading.value = true
  try {
    const res = isSa.value
      ? await getSchoolAdminFeatures()
      : await getSchoolFeatures(selectedSchoolId.value)
    applyFlags(res && res.featureFlags)
  } catch (e) {
    uni.showToast({ title: String((e && e.message) || '加载功能包开关失败').slice(0, 40), icon: 'none' })
  }
  loading.value = false
}

function onSchoolChange(e) {
  const idx = Number(e.detail.value) || 0
  schoolIndex.value = idx
  const s = schools.value[idx]
  selectedSchoolId.value = s ? s.id : ''
  loadFeatures()
}

function toggle(key) {
  selected[key] = !selected[key]
  dirty.value = true
}

function setGroup(keys, on) {
  for (const k of keys) selected[k] = on
  dirty.value = true
}

function setAll(on) {
  for (const k of allKeys) selected[k] = on
  dirty.value = true
}

async function save() {
  if (!isSa.value && !selectedSchoolId.value) return
  saving.value = true
  try {
    const enabled = allKeys.filter((k) => selected[k])
    if (isSa.value) {
      await updateSchoolAdminFeatures(enabled)
    } else {
      await updateSchoolFeatures(selectedSchoolId.value, enabled)
    }
    dirty.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: String((e && e.message) || '保存失败').slice(0, 40), icon: 'none' })
  }
  saving.value = false
}

onLoad(async (options) => {
  await loadSchools(options && options.schoolId)
  await loadFeatures()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #faf7f2; padding-bottom: 140rpx; box-sizing: border-box; }
.page.dark { background: #1c1b19; }

.head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; background: #fff; border-bottom: 1rpx solid #f0e9df; }
.dark .head { background: #262421; border-bottom-color: #3a3733; }
.back { font-size: 28rpx; color: #b8894a; }
.title { font-size: 32rpx; font-weight: 600; color: #4a3b2a; }
.dark .title { color: #f0e9df; }
.placeholder { width: 96rpx; }

.tip { margin: 20rpx 24rpx; padding: 20rpx 24rpx; background: #fff8ec; border: 1rpx solid #f5e3c4; border-radius: 20rpx; display: flex; flex-direction: column; }
.dark .tip { background: #302b23; border-color: #4a4238; }
.tip-t { font-size: 26rpx; font-weight: 600; color: #a97227; }
.tip-s { margin-top: 8rpx; font-size: 22rpx; line-height: 1.6; color: #96826a; }

.bar { margin: 16rpx 24rpx; padding: 18rpx 24rpx; background: #fff; border-radius: 20rpx; display: flex; align-items: center; justify-content: space-between; }
.dark .bar { background: #262421; }
.bar-label { font-size: 26rpx; color: #96826a; margin-right: 16rpx; }
.sc { font-size: 26rpx; color: #96826a; }
.bar-acts { display: flex; align-items: center; }
.picker { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 10rpx 16rpx; border: 1rpx solid #f0e9df; border-radius: 14rpx; min-width: 380rpx; }
.dark .picker { border-color: #3a3733; }
.picker-t { font-size: 26rpx; color: #4a3b2a; }
.dark .picker-t { color: #f0e9df; }
.picker-arrow { font-size: 24rpx; color: #b8894a; }

.act { font-size: 24rpx; color: #b8894a; padding: 8rpx 16rpx; margin-left: 12rpx; border: 1rpx solid #f0e0c4; border-radius: 12rpx; }
.act.sm { font-size: 22rpx; padding: 6rpx 14rpx; }

.body { max-height: calc(100vh - 460rpx); }
.group { margin: 16rpx 24rpx; padding: 20rpx 24rpx; background: #fff; border-radius: 20rpx; }
.dark .group { background: #262421; }
.group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.group-title { font-size: 28rpx; font-weight: 600; color: #4a3b2a; }
.dark .group-title { color: #f0e9df; }
.group-acts { display: flex; align-items: center; }

.flist { display: flex; flex-wrap: wrap; }
.frow { width: 50%; display: flex; align-items: center; padding: 14rpx 0; box-sizing: border-box; }
.ck { width: 32rpx; height: 32rpx; border: 2rpx solid #d9cbb6; border-radius: 8rpx; margin-right: 14rpx; flex-shrink: 0; }
.ck.on { background: #e6a23c; border-color: #e6a23c; }
.frow-label { font-size: 26rpx; color: #4a3b2a; }
.dark .frow-label { color: #f0e9df; }
.frow-label.off { color: #b3a693; }

.empty { padding: 80rpx 0; text-align: center; font-size: 26rpx; color: #b3a693; }
.foot-gap { height: 40rpx; }
.foot { position: fixed; left: 0; right: 0; bottom: 0; padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid #f0e9df; }
.dark .foot { background: #262421; border-top-color: #3a3733; }
.btn { background: #e6a23c; color: #fff; border-radius: 16rpx; font-size: 30rpx; }
</style>
