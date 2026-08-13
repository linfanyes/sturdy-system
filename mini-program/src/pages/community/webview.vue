<template>
  <view class="wv">
    <web-view v-if="url" :src="url"></web-view>
    <view v-else class="empty">未指定播放地址</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 通用 web-view 播放页：接收 ?url= 跳转到智慧中小学等官方平台播放页
const ALLOWED_DOMAINS = [
  'basic.smartedu.cn',
]
const url = ref('')

onLoad((q) => {
  try {
    url.value = decodeURIComponent(q?.url || '')
  } catch (e) {
    url.value = q?.url || ''
  }
  if (!/^https?:\/\//i.test(url.value)) {
    url.value = ''
    uni.showToast({ title: '播放地址格式不正确', icon: 'none' })
    return
  }
  try {
    const hostname = new URL(url.value).hostname
    const allowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
    if (!allowed) {
      url.value = ''
      uni.showToast({ title: '不允许访问该域名', icon: 'none' })
    }
  } catch {
    url.value = ''
    uni.showToast({ title: '播放地址无效', icon: 'none' })
  }
})
</script>

<style scoped>
.wv {
  width: 100%;
  height: 100vh;
}
.empty {
  padding: 60rpx 40rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}
</style>
