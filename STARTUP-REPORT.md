# 园丁工作台 · 启动与构建报告（2026-08-01）

## ✅ 一、微信小程序已重建
- 命令：`cd mini-program && npm install && npm run build:mp-weixin`
- 结果：`DONE Build complete`
- 产物：`mini-program/dist/build/mp-weixin`（可导入微信开发者工具运行/上传）
- 后端连接：通过 `wx.cloud.callContainer` 走**微信私有链路**（环境 `prod-d6g1zoq8c7be4ce53` / 服务 `tec-work`），无需公网域名，已与云托管服务绑定。

## ✅ 二、Web 前端服务已启动
- 地址：**http://localhost:5201/**
- 命令：`cd web-app && npm run dev -- --port 5201 --strictPort`（Vite 6，host localhost）
- 状态：HTTP 200，标题「园丁工作台 · Web 端」，dev server 后台运行中。

## ✅ 三、后端连接（微信云托管，已开通外网）
- Web 前端运行时配置 `web-app/public/config.js` 已启用云地址：
  `API_BASE_URL = https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api`
- 云后端可达性验证：HTTP 404（服务存活，仅 `/api` 根路径无路由）。
- 小程序端走微信私有链路，与 Web 端共用同一云托管后端。

## 📌 注意事项
1. 根目录 `app/` 是**旧构建产物**（无 package.json），请始终用 `web-app/` 启动 Web 前端。
2. 若重启 Web 前端，5201 端口偶发被短暂占用会让 Vite 自动跳到 5202；用 `--strictPort` 强制即可稳定到 5201。
3. 更换后端域名：改 `web-app/public/config.js` 的 `API_BASE_URL` 一行即可，免重新构建。
4. 停止服务：结束占用 5201 的 node/vite 进程即可。
