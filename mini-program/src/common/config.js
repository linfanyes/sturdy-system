// 微信云托管「私有链路（微信私有网络）」配置 —— 无需公网/自定义域名
// 前置条件（云托管控制台）：
//   1. 已开通云开发环境，并将云托管服务关联到该环境（服务设置里开启「微信私有链路」）。
//   2. 小程序已绑定同一云开发环境（公众平台 → 云开发 → 关联）。
// 小程序端用 wx.cloud.callContainer 通过该链路访问后端，免公网流量、免登记 request 合法域名。
// ⚠️ 安全说明：CLOUDRUN_ENV 为环境标识符（非密钥），在小程序网络请求中明文传输不可避免。
//   真正的安全依赖微信私有链路 + 后端 JWT 鉴权，环境 ID 本身不用于身份验证。
//   若需轮换环境，在云托管控制台创建新环境后更新此值即可。
export const CLOUDRUN_ENV = 'prod-d6g1zoq8c7be4ce53' // 云开发/云托管环境 ID（控制台「环境」页复制）
export const CLOUDRUN_SERVICE = 'tec-work' // 云托管服务名（创建服务时填的名字；单服务时可留空）

// 后端接口路径前缀（与后端 main.ts 的 setGlobalPrefix('api/v1') 一致；旧 /api 路径由后端 307 重定向）
export const API_PREFIX = '/api/v1'

// —— 长列表分页常量（统一为 scroll-view + PAGE_SIZE 触底加载） ——
export const PAGE_SIZE = 20
export const SCROLL_THRESHOLD = 150 // lower-threshold 触底距离（px）

// —— 鉴权 Token Storage Key（统一管理，避免散落在各文件中硬编码） ——
export const TOKEN_KEY = 'g_token' // 教师端 token
export const ADMIN_TOKEN_KEY = 'admin_token' // 超管 token
export const SA_TOKEN_KEY = 'sa_token' // 校管 token
export const PARENT_TOKEN_KEY = 'g_parent_token' // 家长端 token
// 用户信息 key（与 token 配对）
export const USER_KEY = 'g_user'
export const ADMIN_USER_KEY = 'admin_user'
export const SA_USER_KEY = 'sa_user'
export const PARENT_USER_KEY = 'g_parent_user'

// 演示模式（Mock）发布隔离开关：
// - 开发/预览构建（uni 默认 NODE_ENV=development）保持 true，支持无后端冷启动全功能演示；
// - 生产构建（uni build 默认 NODE_ENV=production）自动为 false，演示模式与桩代码被隔离出发布包，
//   避免生产误开返回全量假数据。
// 说明：uni-app(vite) 在构建时会将 process.env.NODE_ENV 静态替换为字面量（"development"/"production"），
// 因此运行时不会出现裸 process 引用。注意：不要写成 `process.env && process.env.NODE_ENV`——
// 其中 `process.env`（不带 .NODE_ENV 链）不会被 uni-app 替换，会残留裸引用，在小程序运行时抛
// ReferenceError: process is not defined。故此处只保留 `process.env.NODE_ENV` 单一引用，由构建期彻底替换。
let _nodeEnv = 'production'
try { _nodeEnv = process.env.NODE_ENV || 'production' } catch (e) { console.error('[mini catch]', e) }
export const DEMO_MODE_ENABLED = _nodeEnv !== 'production'
