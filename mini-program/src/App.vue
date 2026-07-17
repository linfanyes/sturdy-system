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
</style>
