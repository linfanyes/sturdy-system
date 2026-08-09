<template>
  <!-- 功能配置（全屏） -->
  <view v-if="visible" class="full-mask">
    <view class="full-page">
      <view class="full-head">
        <text class="full-back" @click="$emit('close')">← 返回</text>
        <text class="full-title">{{ featUser?.name }} 功能配置</text>
        <text class="full-placeholder"></text>
      </view>
      <scroll-view scroll-y class="full-body">
        <!-- 有效权限预览：effective = 学校级 ∩ 教师级（与 Web 端 Teachers.vue 同文案） -->
        <view class="eff-box">
          <view class="eff-head">
            <text class="eff-title">有效权限预览</text>
            <text class="eff-count">实际可用 {{ effectivePreview.length }} / {{ allFeatures.length }} 项</text>
          </view>
          <text class="eff-desc">实际可用 = 学校级 ∩ 教师级。学校级关闭后，该校教师即使勾选也不可用。<text v-if="schoolAllOn">当前学校级未做限制（全部开放）。</text></text>
          <view v-if="effectivePreview.length" class="eff-tags">
            <text class="eff-tag" v-for="f in effectivePreview" :key="f.key">{{ f.label }}</text>
          </view>
          <text v-else class="eff-none">当前配置下该教师无任何可用功能。</text>
          <view v-if="blockedSelected.length" class="eff-blocked">
            <text class="eff-blocked-t">以下 {{ blockedSelected.length }} 项已被学校级关闭，勾选也不生效：{{ blockedSelectedText }}</text>
          </view>
        </view>

        <view class="feat-toolbar">
          <text class="act" @click="selectAll">全选</text>
          <text class="act" @click="selectNone">全不选</text>
          <text class="sc">{{ sel.length }}/{{ allFeatures.length }} 项已启用</text>
        </view>
        <view class="flist">
          <label
            class="frow"
            :class="blockedBySchool(f.key) && 'locked'"
            v-for="f in allFeatures"
            :key="f.key"
            @click="toggleFeat(f.key)"
          >
            <text class="ck" :class="[sel.includes(f.key)&&'on', blockedBySchool(f.key)&&'dis']"></text>
            <text class="frow-label">{{ f.label }}</text>
            <text v-if="blockedBySchool(f.key)" class="frow-lock">被学校级关闭</text>
          </label>
        </view>
      </scroll-view>
      <view class="full-foot">
        <button class="btn" :disabled="saving" @click="$emit('save', featUser, sel)">{{ saving ? '保存中…' : '保存配置' }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { FEATURE_FLAG_LIST } from '@gardener/shared/constants'

const props = defineProps({
  visible: { type: Boolean, default: false },
  featUser: { type: Object, default: null },
  schoolFeatureFlags: { type: Array, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save', 'load-school-flags'])

const allFeatures = FEATURE_FLAG_LIST
const sel = ref([])

// 学校级功能包开关
const schoolFlags = ref(props.schoolFeatureFlags)
const schoolAllOn = computed(() => schoolFlags.value === null)

function blockedBySchool(key) {
  if (schoolAllOn.value) return false
  return schoolFlags.value.indexOf(key) < 0
}

const effectivePreview = computed(() =>
  allFeatures.filter(f => !blockedBySchool(f.key) && sel.value.indexOf(f.key) >= 0),
)
const blockedSelected = computed(() =>
  allFeatures.filter(f => blockedBySchool(f.key) && sel.value.indexOf(f.key) >= 0),
)
const blockedSelectedText = computed(() => blockedSelected.value.map(f => f.label).join('、'))

// Initialize sel when featUser changes
watch(() => props.featUser, (u) => {
  if (u) {
    sel.value = u.features && u.features.length ? [...u.features] : allFeatures.map(f => f.key)
    emit('load-school-flags')
  }
})

function toggleFeat(key) {
  if (blockedBySchool(key)) return
  const i = sel.value.indexOf(key)
  if (i >= 0) sel.value.splice(i, 1)
  else sel.value.push(key)
}

function selectAll() { sel.value = allFeatures.filter(f => !blockedBySchool(f.key)).map(f => f.key) }
function selectNone() { sel.value = [] }

function setSchoolFlags(flags) {
  schoolFlags.value = flags
}

defineExpose({
  setSchoolFlags,
})
</script>

<style scoped>
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 88rpx; line-height: 88rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.btn[disabled] { opacity: .6; }
.eff-box { margin: 12rpx 0 22rpx; padding: 22rpx 24rpx; border: 1px solid var(--c-border); border-radius: 20rpx; background: var(--c-card); }
.eff-head { display: flex; align-items: center; justify-content: space-between; }
.eff-title { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.eff-count { font-size: 22rpx; color: var(--c-sub); }
.eff-desc { display: block; margin-top: 8rpx; font-size: 22rpx; line-height: 1.6; color: var(--c-sub); }
.eff-tags { display: flex; flex-wrap: wrap; margin-top: 12rpx; }
.eff-tag { font-size: 20rpx; color: var(--c-primary); border: 1px solid rgba(245,179,66,.3); background: rgba(245,179,66,.06); border-radius: 20rpx; padding: 6rpx 16rpx; margin: 0 10rpx 10rpx 0; }
.eff-none { display: block; margin-top: 12rpx; font-size: 22rpx; color: #e06c75; }
.eff-blocked { margin-top: 12rpx; padding-top: 12rpx; border-top: 1px solid var(--c-border); }
.eff-blocked-t { font-size: 22rpx; line-height: 1.6; color: var(--c-sub); }
.feat-toolbar { display: flex; align-items: center; gap: 24rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); margin-bottom: 12rpx; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.flist { padding: 4rpx 0; }
.frow { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 18rpx; border-radius: 16rpx; font-size: 28rpx; color: var(--c-title); }
.frow:active { background: var(--c-card2); }
.frow-label { flex: 1; }
.ck { width: 32rpx; height: 32rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
.ck.dis { background: transparent; border-color: var(--c-border); opacity: .5; }
.frow.locked { opacity: .55; }
.frow.locked .frow-label { text-decoration: line-through; }
.frow-lock { font-size: 20rpx; color: #d48806; flex-shrink: 0; padding: 4rpx 14rpx; background: rgba(230,162,60,.12); border-radius: 16rpx; }
</style>
