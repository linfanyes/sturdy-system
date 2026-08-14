// ⚠️ 运行时配置（部署后可单独修改本文件来更换后端域名，无需重新构建前端）
//
// 当前已生效：微信云托管后台服务地址（结尾必须带 /api/v1，与后端 setGlobalPrefix('api/v1') 一致）。
// 解析优先级：本文件 API_BASE_URL  >  构建期 VITE_API_BASE(.env.production)  >  '/api/v1'
//
// 后续更换域名（任选其一）：
//   1) 免重建：直接改下面这一行的值，重新部署 config.js 即可生效；
//   2) 走 CI：改 .env.production 的 VITE_API_BASE 后重新打包。
//
// 本地联调（指向本地 server:3000）时，将下面这一行注释掉即可回退到 /api/v1（Vite 代理 localhost:3000）。
window.__APP_CONFIG__ = {
  API_BASE_URL: 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1',
}
