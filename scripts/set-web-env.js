#!/usr/bin/env node
/**
 * 切换 web-app/public/config.js 的后端模式。
 * 用法:
 *   node scripts/set-web-env.js cloud   // 连微信云托管后端（公网）
 *   node scripts/set-web-env.js local   // 本地联调（回退到 /api，由 Vite 代理到 localhost:3000）
 *
 * 该文件由 start-web-cloud.bat / start-web-local.bat 调用，也可单独执行。
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '..', 'web-app', 'public', 'config.js');
const CLOUD_URL = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api';

const mode = (process.argv[2] || '').toLowerCase();
if (mode !== 'cloud' && mode !== 'local') {
  console.error('[set-web-env] 用法: node scripts/set-web-env.js cloud | local');
  process.exit(1);
}

const cloudContent = `// ⚠️ 运行时配置（部署后可单独修改本文件来更换后端域名，无需重新构建前端）
//
// 当前已生效：微信云托管后台服务地址（结尾必须带 /api，后端 NestJS 路由前缀）。
// 解析优先级：本文件 API_BASE_URL  >  构建期 VITE_API_BASE(.env.production)  >  '/api'
//
// 后续更换域名（任选其一）：
//   1) 免重建：直接改下面这一行的值，重新部署 config.js 即可生效；
//   2) 走 CI：改 .env.production 的 VITE_API_BASE 后重新打包。
//
// 本地联调（指向本地 server:3000）时，将下面这一行注释掉即可回退到 .env.development。
window.__APP_CONFIG__ = {
  API_BASE_URL: '${CLOUD_URL}',
}
`;

const localContent = `// ⚠️ 运行时配置（部署后可单独修改本文件来更换后端域名，无需重新构建前端）
//
// 当前已生效：本地联调（回退到 /api，由 Vite 代理到 localhost:3000 的本地 server）。
// 解析优先级：本文件 API_BASE_URL  >  构建期 VITE_API_BASE(.env.production)  >  '/api'
//
// 要使用微信云托管后台，取消下面这段注释并保留地址即可（无需重新构建）：
// window.__APP_CONFIG__ = {
//   API_BASE_URL: '${CLOUD_URL}',
// }
`;

fs.writeFileSync(CONFIG_PATH, mode === 'cloud' ? cloudContent : localContent, 'utf8');
console.log(
  `[set-web-env] web-app/public/config.js -> ${
    mode === 'cloud' ? '云后端 (' + CLOUD_URL + ')' : '本地回退 (/api -> localhost:3000)'
  }`
);
