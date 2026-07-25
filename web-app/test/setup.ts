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
