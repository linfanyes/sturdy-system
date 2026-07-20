<script>
import { onLaunch } from '@dcloudio/uni-app'
import { auth, mockMode, initTheme } from './common/store'
import { setMockMode } from './common/request'

export default {
  onLaunch() {
    // 演示模式：启动时自动恢复
    if (uni.getStorageSync('g_mock_mode') === 'true') {
      mockMode.enabled = true
      setMockMode(true)
    }
    initTheme()
    if (!auth.token) {
      uni.reLaunch({ url: '/pages/login/login' })
    }
  },
}
</script>

<style>
/* 主题色板：亮色定义在 page，深色覆盖在 .dark（页面根 view 绑定 :class="{dark}" 时生效，子元素继承） */
page {
  --c-bg: #fff7e6;
  --c-card: #ffffff;
  --c-card2: #f8f4ec;
  --c-text: #333333;
  --c-title: #4a3f35;
  --c-sub: #8a8a8a;
  --c-border: #ece4d7;
  --c-input: #f8f4ec;
  --c-input-border: #e0d5c4;
  --c-primary: #07c160;
  --c-primary-d: #19d27e;
  --c-accent: #e6a23c;
  --c-danger: #f56c6c;
  --c-shadow: rgba(0, 0, 0, 0.04);
  /* 字体大小档位：通过 --fz-scale 缩放 rpx，由根 view 的 .fz-sm/.fz-lg class 控制 */
  --fz-scale: 1;
  background: var(--c-bg);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}
.dark {
  --c-bg: #15171c;
  --c-card: #1f232b;
  --c-card2: #262b34;
  --c-text: #e6e6e6;
  --c-title: #f2f2f2;
  --c-sub: #9aa0a6;
  --c-border: #2c313a;
  --c-input: #262b34;
  --c-input-border: #2c313a;
  --c-primary: #07c160;
  --c-primary-d: #19d27e;
  --c-accent: #e6a23c;
  --c-danger: #f56c6c;
  --c-shadow: rgba(0, 0, 0, 0.35);
}
/* 字体大小档位：影响根 view 内文字大小（小程序 page font-size 不可改，仅影响 view 内 text） */
.fz-sm { --fz-scale: 0.9; font-size: calc(28rpx * 0.9); }
.fz-md { --fz-scale: 1; font-size: 28rpx; }
.fz-lg { --fz-scale: 1.15; font-size: calc(28rpx * 1.15); }

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
