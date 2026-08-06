<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 顶部卡 -->
    <view class="hd">
      <view class="av" v-if="detail && detail.avatar && !String(detail.avatar).startsWith('http')">{{ detail.avatar || '🧑' }}</view>
      <image v-else-if="detail && detail.avatar" :src="detail.avatar" class="av-img" mode="aspectFill" />
      <view class="av" v-else>🧑</view>
      <view class="info">
        <view class="top">
          <text class="name">{{ detail ? detail.name : '教师详情' }}</text>
          <text class="star" v-if="detail && detail.isStarred">⭐ 常用</text>
        </view>
        <text class="sub" v-if="detail && detail.position">{{ detail.position }}</text>
        <text class="sub" v-if="detail && detail.school">{{ detail.school }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="!detail && !loading" class="empty">暂无数据</view>

    <view v-else>
      <!-- 基础信息 -->
      <view class="card">
        <view class="card-h">基础信息</view>
        <view class="row" v-if="detail.gender"><text class="k">性别</text><text class="v">{{ detail.gender }}</text></view>
        <view class="row" v-if="detail.teacherNo"><text class="k">教师编号</text><text class="v">{{ detail.teacherNo }}</text></view>
        <view class="row" v-if="detail.joinAt"><text class="k">入职时间</text><text class="v">{{ detail.joinAt }}</text></view>
      </view>

      <!-- 联系方式 -->
      <view class="card contacts">
        <view class="card-h">联系方式</view>
        <view class="row" v-if="detail.phone">
          <text class="k">电话</text>
          <view class="vAction">
            <text class="link" @click="call(detail.phone)">{{ detail.phone }}</text>
            <text class="copy" @click="copyText(detail.phone)">复制</text>
          </view>
        </view>
        <view class="row" v-if="detail.email">
          <text class="k">邮箱</text>
          <view class="vAction">
            <text class="v">{{ detail.email }}</text>
            <text class="copy" @click="copyText(detail.email)">复制</text>
          </view>
        </view>
        <view class="row" v-if="!detail.phone && !detail.email">
          <text class="k">联系方式</text><text class="v muted">未录入</text>
        </view>
      </view>

      <!-- 任教学科 -->
      <view class="card" v-if="subjects.length">
        <view class="card-h">任教学科</view>
        <view class="tags">
          <text class="tag" v-for="s in subjects" :key="s">{{ s }}</text>
        </view>
      </view>

      <!-- 任课班级 -->
      <view class="card" v-if="teachings.length">
        <view class="card-h">任课班级</view>
        <view class="tlist">
          <view class="trow" v-for="(t, i) in teachings" :key="i">
            <text class="cname">{{ t.className || t.classId || '-' }}</text>
            <text class="csub">{{ t.subject || '-' }}</text>
            <text class="cterm" v-if="t.term">{{ t.term }}</text>
          </view>
        </view>
      </view>

      <!-- 班主任身份 -->
      <view class="card" v-if="headClasses.length">
        <view class="card-h">班主任身份</view>
        <view class="tags">
          <text class="tag head" v-for="(c, i) in headClasses" :key="i">
            {{ c.className || c.classId }}<text class="term" v-if="c.term"> · {{ c.term }}</text>
          </text>
        </view>
      </view>

      <!-- 座右铭 -->
      <view class="card" v-if="detail.motto">
        <view class="card-h">座右铭</view>
        <text class="p">「{{ detail.motto }}」</text>
      </view>

      <!-- 备注 -->
      <view class="card" v-if="detail.remark">
        <view class="card-h">备注</view>
        <text class="p">{{ detail.remark }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onLoad } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const loading = ref(false)
const detail = ref(null)
const params = ref({ id: '', userId: '' })

const subjects = computed(() => {
  const d = detail.value
  if (!d) return []
  return d.subjects || (d.subject ? [d.subject] : [])
})
const teachings = computed(() => detail.value?.teachings || [])
const headClasses = computed(() => detail.value?.headClasses || [])

async function loadDetail() {
  const { id, userId } = params.value
  if (!id) return
  loading.value = true
  try {
    // 后端 GET /teachers/:id/detail?userId=xxx 聚合账号 + 通讯录 + 任课班级
    detail.value = await api.get('/teachers/' + id + '/detail', { params: { userId: userId || id } })
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
    detail.value = null
  } finally {
    loading.value = false
  }
}

onLoad((q) => {
  // 优先 id，回退 userId；userId 默认用 id
  const id = q?.id || q?.userId || ''
  const userId = q?.userId || q?.id || ''
  params.value = { id, userId }
  loadDetail()
})

function call(p) {
  uni.makePhoneCall({ phoneNumber: p, fail: () => {} })
}
function copyText(t) {
  if (!t) return
  uni.setClipboardData({ data: t, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 60rpx; }
.hd { display: flex; align-items: center; gap: 20rpx; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.av { width: 96rpx; height: 96rpx; border-radius: 50%; background: #f7f1e6; text-align: center; line-height: 96rpx; font-size: 56rpx; flex: 0 0 auto; }
.av-img { width: 96rpx; height: 96rpx; border-radius: 50%; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.top { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.name { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.star { font-size: 22rpx; color: #e6a23c; background: #f7f1e6; padding: 2rpx 12rpx; border-radius: 16rpx; }
.sub { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.card-h { font-size: 26rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.row { display: flex; align-items: center; padding: 10rpx 0; border-bottom: 1px solid var(--c-card2); }
.row:last-child { border-bottom: none; }
.k { width: 160rpx; font-size: 26rpx; color: var(--c-sub); flex: 0 0 auto; }
.v { flex: 1; font-size: 26rpx; color: var(--c-title); word-break: break-all; }
.v.muted { color: #bbb; }
.vAction { flex: 1; display: flex; align-items: center; gap: 16rpx; }
.link { font-size: 26rpx; color: var(--c-blue); }
.copy { font-size: 22rpx; padding: 4rpx 14rpx; background: var(--c-card2); border-radius: 16rpx; color: var(--c-sub); }
.tags { display: flex; flex-wrap: gap; flex-wrap: wrap; gap: 10rpx; }
.tag { font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 20rpx; background: #f7f1e6; color: #a07b3b; }
.tag.head { background: #e6f5e6; color: var(--c-primary); }
.term { color: #999; font-size: 20rpx; }
.tlist { background: var(--c-card2); border-radius: 12rpx; padding: 12rpx; }
.trow { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 8rpx; border-bottom: 1px solid var(--c-input-border); }
.trow:last-child { border-bottom: none; }
.cname { font-size: 26rpx; color: var(--c-title); font-weight: 600; flex: 1; }
.csub { font-size: 22rpx; color: var(--c-sub); }
.cterm { font-size: 20rpx; color: var(--c-sub); }
.p { font-size: 26rpx; color: var(--c-title); line-height: 1.7; white-space: pre-wrap; }
.loading, .empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.dark .page { background: var(--c-bg); }
.dark .card, .dark .hd { background: var(--c-card); }
.dark .name, .dark .card-h, .dark .v, .dark .cname, .dark .p { color: var(--c-title); }
.dark .sub, .dark .k, .dark .csub, .dark .cterm { color: var(--c-sub); }
.dark .row { border-color: var(--c-input-border); }
.dark .copy { background: var(--c-card2); color: var(--c-sub); }
.dark .tlist { background: var(--c-input); }
.dark .trow { border-color: var(--c-input-border); }
</style>
