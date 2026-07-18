// 微信云托管「私有链路（微信私有网络）」配置 —— 无需公网/自定义域名
// 前置条件（云托管控制台）：
//   1. 已开通云开发环境，并将云托管服务关联到该环境（服务设置里开启「微信私有链路」）。
//   2. 小程序已绑定同一云开发环境（公众平台 → 云开发 → 关联）。
// 小程序端用 wx.cloud.callContainer 通过该链路访问后端，免公网流量、免登记 request 合法域名。
export const CLOUDRUN_ENV = 'your-env-id' // 云开发/云托管环境 ID（控制台「环境」页复制）
export const CLOUDRUN_SERVICE = 'gardener-api' // 云托管服务名（创建服务时填的名字；单服务时可留空）

// 后端接口路径前缀（与后端 main.ts 的 setGlobalPrefix('api') 一致）
export const API_PREFIX = '/api'
