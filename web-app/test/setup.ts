// 测试环境初始化：每个用例前清理本地存储与运行时域名配置，避免互相污染
beforeEach(() => {
  localStorage.clear()
  try {
    delete (window as unknown as { __APP_CONFIG__?: unknown }).__APP_CONFIG__
  } catch {
    /* ignore */
  }
  jest.useRealTimers()
})

// 屏蔽 jsdom 弹窗（组件中的 alert/confirm 改为可断言的 mock）
global.alert = jest.fn()
global.confirm = jest.fn(() => true)

// jsdom 无 canvas：为游戏/图片压缩提供 2D context 桩，避免挂载时崩溃。
// 用 Proxy 兜底，任意未显式声明的方法都返回 no-op，属性赋值正常存储。
const gradientStub = { addColorStop() {} }
const noop = () => {}
const canvasCtxStub: any = new Proxy({}, {
  get(target: Record<string, any>, prop: string | symbol) {
    if (prop in target) return target[prop as string]
    if (prop === 'measureText') return () => ({ width: 0 })
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
      return () => gradientStub
    }
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
    if (prop === 'getLineDash') return () => []
    return noop
  },
  set(target: Record<string, any>, prop: string | symbol, value: any) {
    target[prop as string] = value
    return true
  },
})
HTMLCanvasElement.prototype.getContext = jest.fn(() => canvasCtxStub) as unknown as typeof HTMLCanvasElement.prototype.getContext
