<script>
import { onLaunch } from '@dcloudio/uni-app'
import { auth, mockMode, initTheme } from './common/store'
import { setMockMode } from './common/request'
import { CLOUDRUN_ENV } from './common/config'

export default {
  onLaunch() {
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
    // 初始化微信云托管私有链路：必须先 wx.cloud.init 才能调用 wx.cloud.callContainer，
    // 否则请求会一直挂起无回调（表现为登录超时 / Error: timeout）。
    if (typeof wx !== 'undefined' && wx.cloud && typeof wx.cloud.init === 'function') {
      wx.cloud.init({ env: CLOUDRUN_ENV, traceUser: true })
    }
    // 演示模式：启动时自动恢复
    if (uni.getStorageSync('g_mock_mode') === 'true') {
      mockMode.enabled = true
      setMockMode(true)
    }
    initTheme()
    // 多角色会话恢复：任一角色令牌存在即视为已登录，并跳转对应首页，
    // 避免超管 / 校管 / 家长登录态在冷启动时被判为未登录而被强制退回登录页。
    const hasTeacher = !!uni.getStorageSync('g_token')
    const hasAdmin = !!uni.getStorageSync('admin_token')
    const hasSa = !!uni.getStorageSync('sa_token')
    const hasParent = !!uni.getStorageSync('g_parent_token')
    if (!hasTeacher && !hasAdmin && !hasSa && !hasParent) {
      // 演示模式：无登录态时自动进入，完全跳过登录页
      uni.setStorageSync('g_mock_mode', 'true')
      setMockMode(true)
      mockMode.enabled = true
      auth.token = 'mock-token'
      auth.user = { name: '珊珊老师', school: '阳光实验小学（演示版）' }
      uni.switchTab({ url: '/pages/dashboard/dashboard' })
    } else if (hasAdmin) {
      uni.reLaunch({ url: '/pages/admin/admin' })
    } else if (hasSa) {
      uni.reLaunch({ url: '/pages/school-admin/school-admin' })
    } else if (hasParent) {
      uni.reLaunch({ url: '/pages/parent/parent' })
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
   这些组件均为各页 scoped 样式，普通全局选择器会被页面 scoped 覆盖，
   故用 !important 保证全站一致生效。 */
/* 底部抽屉 .modal（left/right 5%、bottom:0）：底部加安全区留白 */
.modal {
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom)) !important;
}
/* 底部固定操作栏（如学生批量操作条 .batchbar） */
.batchbar {
  padding-bottom: env(safe-area-inset-bottom) !important;
}
/* 右下悬浮按钮 .fab：底部基准上移安全区高度 */
.fab {
  bottom: calc(60rpx + env(safe-area-inset-bottom)) !important;
}

/* 6) 字体缩放变量（与「设置-字体大小」小/标准/大 对齐）。
   各页面根 view 可绑定 .fz-sm/.fz-md/.fz-lg 生效；此处给出全局默认值。 */
page {
  --fz-scale: 1;
}
</style>
