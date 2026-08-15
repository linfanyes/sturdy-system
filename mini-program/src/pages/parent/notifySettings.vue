<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <text class="back" @tap="back">‹ 返回</text>
      <text class="title">通知与隐私设置</text>
    </view>

    <view class="card">
      <view class="card-title">🔕 免打扰时段</view>
      <view class="row">
        <text class="label">开启免打扰</text>
        <switch :checked="pref.quietEnabled" color="#4f86ff" @change="onQuietToggle" />
      </view>
      <view class="row" v-if="pref.quietEnabled">
        <text class="label">开始</text>
        <picker mode="time" :value="pref.quietStart" @change="onQuietStart">
          <view class="picker">{{ pref.quietStart }}</view>
        </picker>
      </view>
      <view class="row" v-if="pref.quietEnabled">
        <text class="label">结束</text>
        <picker mode="time" :value="pref.quietEnd" @change="onQuietEnd">
          <view class="picker">{{ pref.quietEnd }}</view>
        </picker>
      </view>
      <view class="hint">开启后，免打扰时段内的通知仅做站内留存，不弹窗打扰。</view>
    </view>

    <view class="card">
      <view class="card-title">📊 成绩分级可见</view>
      <view class="row">
        <text class="label">首页展示分数</text>
        <switch :checked="pref.showGrade" color="#4f86ff" @change="onShowGrade" />
      </view>
      <view class="row">
        <text class="label">首页展示排名</text>
        <switch :checked="pref.showRank" color="#4f86ff" @change="onShowRank" />
      </view>
      <view class="hint">关闭后，孩子一屏首页将不再显示具体分数与排名，保护孩子心理。</view>
    </view>

    <view class="card">
      <view class="card-title">🔔 通知类别</view>
      <view class="row" v-for="c in categoryList" :key="c.key">
        <text class="label">{{ c.label }}</text>
        <switch :checked="pref.categories[c.key]" color="#4f86ff" @change="(e) => onCategory(c.key, e)" />
      </view>
      <view class="row">
        <text class="label">合并推送（同类按日汇总）</text>
        <switch :checked="pref.digestMode" color="#4f86ff" @change="onDigest" />
      </view>
    </view>

    <view class="save-bar">
      <text class="saved" v-if="saved">已保存 ✓</text>
      <text class="btn" :class="{ disabled: saving }" @tap="save">{{ saving ? '保存中…' : '保存设置' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { getNotifyPref, upsertNotifyPref } from '../../api/notifyPref'

const dark = computed(() => theme.dark)
const saving = ref(false)
const saved = ref(false)

const DEFAULT_CATS = { notice: true, homework: true, grade: true, mood: true, message: true }
const categoryList = [
  { key: 'notice', label: '📢 学校公告' },
  { key: 'homework', label: '📝 作业提醒' },
  { key: 'grade', label: '📊 成绩通知' },
  { key: 'mood', label: '🌤️ 心情预警' },
  { key: 'message', label: '💬 老师留言' },
]

const pref = reactive({
  quietEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  digestMode: false,
  showGrade: true,
  showRank: true,
  categories: { ...DEFAULT_CATS },
})

function applyPref(p) {
  if (!p) return
  pref.quietEnabled = !!p.quietEnabled
  pref.quietStart = p.quietStart || '22:00'
  pref.quietEnd = p.quietEnd || '08:00'
  pref.digestMode = !!p.digestMode
  pref.showGrade = p.showGrade !== false
  pref.showRank = p.showRank !== false
  pref.categories = { ...DEFAULT_CATS, ...(p.categories || {}) }
}

async function load() {
  try {
    const p = await getNotifyPref()
    applyPref(p)
  } catch (e) {
    uni.showToast({ title: '加载失败，使用默认', icon: 'none' })
  }
}

function back() { uni.navigateBack() }
function onQuietToggle(e) { pref.quietEnabled = e.detail.value; markDirty() }
function onQuietStart(e) { pref.quietStart = e.detail.value; markDirty() }
function onQuietEnd(e) { pref.quietEnd = e.detail.value; markDirty() }
function onShowGrade(e) { pref.showGrade = e.detail.value; markDirty() }
function onShowRank(e) { pref.showRank = e.detail.value; markDirty() }
function onDigest(e) { pref.digestMode = e.detail.value; markDirty() }
function onCategory(key, e) { pref.categories[key] = e.detail.value; markDirty() }
let dirty = false
function markDirty() { dirty = true; saved.value = false }

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    await upsertNotifyPref({
      quietEnabled: pref.quietEnabled,
      quietStart: pref.quietStart,
      quietEnd: pref.quietEnd,
      digestMode: pref.digestMode,
      showGrade: pref.showGrade,
      showRank: pref.showRank,
      categories: { ...pref.categories },
    })
    saved.value = true
    dirty = false
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onShow(() => load())
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f7fa; padding: 0 0 40rpx; }
.page.dark { background: #15171c; }
.hd { display: flex; align-items: center; padding: 28rpx 28rpx 12rpx; }
.back { font-size: 30rpx; color: #4f86ff; width: 120rpx; }
.title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; flex: 1; text-align: center; }
.page.dark .title { color: #e8e8e8; }
.card { background: #fff; margin: 18rpx 24rpx; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.04); }
.page.dark .card { background: #23262e; }
.card-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 16rpx; }
.page.dark .card-title { color: #e8e8e8; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.page.dark .row { border-color: #333; }
.row:last-child { border-bottom: none; }
.label { font-size: 28rpx; color: #333; }
.page.dark .label { color: #cfd3da; }
.picker { background: #f0f2f5; padding: 10rpx 24rpx; border-radius: 10rpx; font-size: 28rpx; color: #333; }
.page.dark .picker { background: #2f333c; color: #cfd3da; }
.hint { font-size: 24rpx; color: #9aa0a6; margin-top: 12rpx; line-height: 1.5; }
.save-bar { display: flex; align-items: center; justify-content: center; margin-top: 20rpx; }
.saved { font-size: 26rpx; color: #2bb673; margin-right: 16rpx; }
.btn { background: #4f86ff; color: #fff; font-size: 30rpx; padding: 20rpx 80rpx; border-radius: 40rpx; }
.btn.disabled { opacity: .6; }
</style>
