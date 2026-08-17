<script>
import { onLaunch } from '@dcloudio/uni-app'
import { mockMode, initTheme, auth, bindAuthMachine, authMachine } from './common/store'
import { setMockMode } from './common/request'
import { CLOUDRUN_ENV, DEMO_MODE_ENABLED, TOKEN_KEY, ADMIN_TOKEN_KEY, SA_TOKEN_KEY, PARENT_TOKEN_KEY } from './common/config'
import { setupRouteGuard } from './common/route-guard'
import { initMonitor, onAppError, onAppUnhandledRejection } from './common/monitor'

export default {
  onLaunch() {
    // 前端监控（错误 / 异常上报，仅生产）
    initMonitor()
    // 注册前端路由角色守卫（拦截越权导航，如教师进入管理员面板）
    setupRouteGuard()
    // 鉴权状态机桥接：machine ↔ reactive auth，使 machine 事件能更新 reactive 对象
    bindAuthMachine(auth)
    // 屏蔽 uni-app 运行框架内置的 DCloud CDN 阴影图预加载（wx.preloadAssets）。
    // 该预加载仅作性能优化，非页面实际渲染图；在无法访问 cdn1.dcloud.net.cn 的环境会
    // 持续刷「渲染层网络层错误 / ERR_TIMED_OUT」且无任何功能影响。仅拦截此 CDN 的预加载，
    // 其余 wx.preloadAssets 调用正常放行。
    if (typeof wx !== 'undefined' && typeof wx.preloadAssets === 'function') {
      const _preloadAssets = wx.preloadAssets
      wx.preloadAssets = function (opts) {
        if (
          opts && Array.isArray(opts.data) &&
          opts.data.some(d => d && typeof d.src === 'string' && d.src.indexOf('cdn1.dcloud.net.cn') > -1)
        ) {
          return
        }
        return _preloadAssets.call(wx, opts)
      }
    }
    // 微信云托管私有链路初始化已统一收敛到 main.js（仅调用一次，避免重复 init 触发
    // SystemError: Cannot read property 'errMsg' of undefined）。此处不再重复调用。
    // 演示模式：启动时自动恢复（仅开发/预览构建；生产构建 DEMO_MODE_ENABLED=false，不会进入）
    if (DEMO_MODE_ENABLED && uni.getStorageSync('g_mock_mode') === 'true') {
      mockMode.enabled = true
      setMockMode(true)
    }
    initTheme()
    // 鉴权状态机冷启动恢复：从 wx storage 读取最新 token 写入 machine → reactive auth
    // （异步，不阻塞首页跳转；跳转逻辑仍基于 route-guard 同步 token 检测）
    authMachine.restore().then((r) => {
      if (r && r.user && r.user.effectiveFeatures) {
        // 通过 store.setFeatureProfile 更新 reactive 的 effectiveFeatures
        if (auth && auth.setFeatureProfile) auth.setFeatureProfile({ effectiveFeatures: r.user.effectiveFeatures })
      }
    })
    // 多角色会话恢复：任一角色令牌存在即视为已登录，并跳转对应首页，
    // 避免超管 / 校管 / 家长 / 教师登录态在冷启动时被判为未登录而被强制退回登录页。
    // 无任何登录态时，停留在登录页（pages/login/login 为首页），不再自动进入演示模式。
    const hasTeacher = !!uni.getStorageSync(TOKEN_KEY)
    const hasAdmin = !!uni.getStorageSync(ADMIN_TOKEN_KEY)
    const hasSa = !!uni.getStorageSync(SA_TOKEN_KEY)
    const hasParent = !!uni.getStorageSync(PARENT_TOKEN_KEY)
    if (hasAdmin) {
      uni.reLaunch({ url: '/pages/admin/admin' })
    } else if (hasSa) {
      uni.reLaunch({ url: '/pages/school-admin/school-admin' })
    } else if (hasParent) {
      uni.reLaunch({ url: '/pages/parent/parent' })
    } else if (hasTeacher) {
      uni.switchTab({ url: '/pages/dashboard/dashboard' })
    }
  },
  onError(err) {
    onAppError(err)
  },
  onUnhandledRejection(res) {
    onAppUnhandledRejection(res)
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
  /* 主操作色：黄油琥珀（对齐 Web 端 butter 系），绿色降级为成功/达标语义色 */
  --c-primary: #f5b342;
  --c-primary-d: #d69426;
  --c-success: #07c160;
  --c-accent: #e6a23c;
  --c-danger: #f56c6c;
  --c-pink: #C9436D;
  --c-pink-soft: #FCE9EE;
  --c-blue: #1C6FB3;
  --c-blue-soft: #E0F0FC;
  --c-shadow: rgba(0, 0, 0, 0.04);
  /* 有机三层投影（模拟纸张悬浮）+ 光照 token（统一光源左上） */
  --c-shadow-paper: 0 2rpx 4rpx rgba(174,140,90,.04), 0 8rpx 24rpx rgba(174,140,90,.06), 0 24rpx 48rpx rgba(174,140,90,.04);
  --c-shadow-lift: 0 4rpx 8rpx rgba(174,140,90,.06), 0 16rpx 40rpx rgba(174,140,90,.10), 0 40rpx 80rpx rgba(190,140,80,.08);
  --c-shade-warm: 174, 140, 90;
  /* 圆角体系（排版布局统一）：胶囊按钮 > 主卡片 > 输入框/小卡 > 标签/徽章 */
  --r-pill: 999rpx;
  --r-lg: 24rpx;
  --r-md: 18rpx;
  --r-sm: 12rpx;
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
  /* 暗色主操作色：更亮的黄油（暗背景上保持醒目），语义绿同亮色 */
  --c-primary: #ffce54;
  --c-primary-d: #f5b342;
  --c-success: #07c160;
  --c-accent: #e6a23c;
  --c-danger: #f56c6c;
  --c-pink: #e06c8a;
  --c-pink-soft: #3a2530;
  --c-blue: #5aa9e6;
  --c-blue-soft: #1c2a3a;
  --c-shadow: rgba(0, 0, 0, 0.35);
  --c-shadow-paper: 0 2rpx 4rpx rgba(0,0,0,.25), 0 8rpx 24rpx rgba(0,0,0,.2), 0 24rpx 48rpx rgba(0,0,0,.15);
  --c-shadow-lift: 0 4rpx 8rpx rgba(0,0,0,.3), 0 16rpx 40rpx rgba(0,0,0,.25), 0 40rpx 80rpx rgba(0,0,0,.2);
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

/* 全局输入框/文本域/下拉防挤压：确保宽度撑满容器、border 计入宽度 */
input, textarea {
  box-sizing: border-box;
  max-width: 100%;
}
/* picker 内的 view 也需要撑满，避免点击区域过小 */
picker {
  max-width: 100%;
}

/* ===================== 跨设备适配（安卓 / iOS / 华为 / 全面屏） ===================== */
/* 1) 全局盒模型：避免 padding 把宽度撑破导致窄屏（华为小屏 / 大字号）横向溢出 */
view, text, input, textarea, picker, image, scroll-view,
button, navigator, swiper, swiper-item {
  box-sizing: border-box;
  max-width: 100%;
}
/* 2) 页面级防横向滚动；关闭 iOS 横竖屏切换时的字体自动放大 */
page {
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
/* 3) 图片自适应：防止大图把页面撑宽 */
image {
  max-width: 100%;
  height: auto;
}

/* 4) 安全区工具类（刘海 / 挖孔屏 / 底部 Home 指示条 / 全面屏手势）
   覆盖 iOS、华为（灵动岛 / 挖孔 / 药丸）、安卓全面屏；
   无安全区机型 env() 返回 0，不影响布局。需避让安全区的容器自行添加 class。 */
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-all {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 5) 全站通用底部组件统一避让安全区（无需逐页修改）。
   这些组件均为各页 scoped 样式，普通全局选择器会被页面 scoped 覆盖。
   解决方案：使用 :global() 选择器穿透 scoped（uni-app 支持），避免 !important 带来的特异性战争。 */
/* 底部抽屉 .modal（left/right 5%、bottom:0）：底部加安全区留白 */
:global(.modal) {
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}
/* 底部固定操作栏（如学生批量操作条 .batchbar） */
:global(.batchbar) {
  padding-bottom: env(safe-area-inset-bottom);
}
/* 右下悬浮按钮 .fab：底部基准上移安全区高度 */
:global(.fab) {
  bottom: calc(60rpx + env(safe-area-inset-bottom));
}
/* 底部抽屉 .sheet / .sheet2（width:100%、border-radius:… 0 0、mask 内 flex-end）：底部加安全区留白 */
:global(.sheet),
:global(.sheet2) {
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

/* 6) 字体缩放变量（与「设置-字体大小」小/标准/大 对齐）。
   各页面根 view 可绑定 .fz-sm/.fz-md/.fz-lg 生效；此处给出全局默认值。 */
page {
  --fz-scale: 1;
}

/* ===================== 晨光入场动效（L1）：内容从下向上 stagger 淡入 ===================== */
@keyframes grow-in {
  from { opacity: 0; transform: translateY(14rpx); }
  to   { opacity: 1; transform: translateY(0); }
}
.grow-in > * {
  animation: grow-in 0.5s ease both;
}
.grow-in > *:nth-child(1) { animation-delay: 0.05s; }
.grow-in > *:nth-child(2) { animation-delay: 0.12s; }
.grow-in > *:nth-child(3) { animation-delay: 0.19s; }
.grow-in > *:nth-child(4) { animation-delay: 0.26s; }
.grow-in > *:nth-child(5) { animation-delay: 0.33s; }
.grow-in > *:nth-child(6) { animation-delay: 0.40s; }
.grow-in > *:nth-child(7) { animation-delay: 0.47s; }
.grow-in > *:nth-child(8) { animation-delay: 0.54s; }
</style>
