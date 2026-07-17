<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'
import './style.css'

onLaunch(() => {
  const userStore = useUserStore()
  if (userStore.theme === 'dark') {
    uni.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#FFF9EE',
    })
  }
})

onShow(() => {})

onHide(() => {})
</script>

<style>
page {
  height: 100%;
}
</style>
