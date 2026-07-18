<script>
import { onLaunch } from '@dcloudio/uni-app'
import { auth } from './common/store'

export default {
  onLaunch() {
    if (!auth.token) {
      uni.reLaunch({ url: '/pages/login/login' })
    }
  },
}
</script>

<style>
page {
  background: #fff7e6;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}
/* 小字提示/说明类文本默认换行，避免被截断显示不全 */
text {
  word-break: break-word;
}
.tip,
.hint,
.sub,
.meta,
.note {
  word-break: break-word;
  white-space: normal;
}
</style>
