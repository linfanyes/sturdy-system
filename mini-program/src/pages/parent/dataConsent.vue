<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <text class="back" @tap="back">‹ 返回</text>
      <text class="title">🔐 数据授权</text>
    </view>

    <view class="banner">
      <text class="b-icon">🛡️</text>
      <text class="b-text">我们严格保护未成年人数据。以下授权可随时开启或撤回，撤回后相关功能将停止使用该数据。</text>
    </view>

    <view class="card">
      <view class="card-title">授权项</view>
      <view class="row" v-for="c in list" :key="c.key">
        <view class="r-left">
          <text class="r-label">{{ c.label }}</text>
          <text class="r-desc">{{ c.desc }}</text>
        </view>
        <switch :checked="consent[c.key]" color="#4f86ff" :disabled="withdrawn" @change="(e) => onToggle(c.key, e)" />
      </view>
    </view>

    <view class="card" v-if="withdrawn">
      <view class="warn">⚠️ 你已于 {{ fmtTime(withdrawnAt) }} 撤回全部授权。重新开启任意一项即恢复有效。</view>
    </view>

    <view class="actions">
      <text class="btn primary" :class="{ disabled: saving }" @tap="save">{{ saving ? '保存中…' : '保存授权' }}</text>
      <text class="btn danger" @tap="withdraw">撤回全部授权（被遗忘权）</text>
    </view>

    <view class="foot">条款版本 {{ version }} · 所有变更均留痕审计</view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { getConsent, upsertConsent, withdrawConsent } from '../../api/dataConsent'

const dark = computed(() => theme.mode === 'dark')
const saving = ref(false)
const version = ref('1.0')
const withdrawn = ref(false)
const withdrawnAt = ref(null)
const consent = reactive({ mood: true, worksPublic: false, aiAnalysis: true })
const dirtyKeys = reactive({})

const list = [
  { key: 'mood', label: '🌤️ 心情与树洞数据', desc: '允许教师关怀看板使用孩子的心情打卡与倾诉内容' },
  { key: 'worksPublic', label: '🎨 作品公开展示', desc: '允许将孩子的编程/学习作品在班级风采中公开展示' },
  { key: 'aiAnalysis', label: '🤖 AI 学情分析', desc: '允许基于孩子数据生成个性化学习建议与洞察' },
]

function applyConsent(c) {
  if (!c) return
  consent.mood = c.mood !== false
  consent.worksPublic = !!c.worksPublic
  consent.aiAnalysis = c.aiAnalysis !== false
  version.value = c.version || '1.0'
  withdrawn.value = !!c.withdrawnAt
  withdrawnAt.value = c.withdrawnAt || null
  for (const k of Object.keys(dirtyKeys)) delete dirtyKeys[k]
}

async function load() {
  try {
    const c = await getConsent()
    applyConsent(c)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function onToggle(key, e) {
  consent[key] = e.detail.value
  dirtyKeys[key] = true
}
function fmtTime(d) {
  if (!d) return ''
  return String(d).replace('T', ' ').slice(0, 16)
}
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const dto = { consents: { ...consent }, version: version.value }
    const c = await upsertConsent(dto)
    applyConsent(c)
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
async function withdraw() {
  uni.showModal({
    title: '撤回全部授权',
    content: '撤回后，平台将停止在相关功能中使用孩子的数据，且需重新授权方可恢复。确认撤回？',
    confirmColor: '#e64340',
    success: async (res) => {
      if (!res.confirm) return
      try {
        const c = await withdrawConsent()
        applyConsent(c)
        uni.showToast({ title: '已撤回', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
      }
    },
  })
}
function back() { uni.navigateBack() }

onShow(() => load())
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f7fa; padding: 0 0 40rpx; }
.page.dark { background: #15171c; }
.hd { display: flex; align-items: center; padding: 28rpx 28rpx 8rpx; }
.back { font-size: 30rpx; color: #4f86ff; width: 120rpx; }
.title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; flex: 1; text-align: center; }
.page.dark .title { color: #e8e8e8; }
.banner { display: flex; margin: 16rpx 24rpx; padding: 20rpx; background: #eef4ff; border-radius: 16rpx; }
.page.dark .banner { background: #1d2738; }
.b-icon { font-size: 36rpx; margin-right: 12rpx; }
.b-text { font-size: 24rpx; color: #4a5a7a; line-height: 1.5; }
.page.dark .b-text { color: #9fb3d6; }
.card { background: #fff; margin: 18rpx 24rpx; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.04); }
.page.dark .card { background: #23262e; }
.card-title { font-size: 30rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 8rpx; }
.page.dark .card-title { color: #e8e8e8; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.page.dark .row { border-color: #333; }
.row:last-child { border-bottom: none; }
.r-left { flex: 1; padding-right: 20rpx; }
.r-label { font-size: 28rpx; color: #333; font-weight: 600; }
.page.dark .r-label { color: #e0e3ea; }
.r-desc { display: block; font-size: 22rpx; color: #9aa0a6; margin-top: 6rpx; line-height: 1.4; }
.warn { font-size: 26rpx; color: #e6772e; line-height: 1.5; }
.actions { margin: 28rpx 24rpx; display: flex; flex-direction: column; gap: 18rpx; }
.btn { text-align: center; padding: 24rpx; border-radius: 40rpx; font-size: 30rpx; }
.primary { background: #4f86ff; color: #fff; }
.primary.disabled { opacity: .6; }
.danger { background: #fff; color: #e64340; border: 1rpx solid #f0c0c0; }
.page.dark .danger { background: #2a2326; }
.foot { text-align: center; font-size: 22rpx; color: #b0b6bd; margin-top: 10rpx; }
</style>
