# Web 端后端服务地址配置（API_CONFIG）

本文件说明 web-app 如何对接后端（NestJS，部署于微信云托管），以及如何**后续更换域名**。

---

## 1. 当前生产后端域名

```
https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com
```

前端调用时自动追加 `/api` 路由前缀，即实际接口基址为：

```
https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api
```

> 该地址当前同时写入两处（保持一致）：
> - `web-app/public/config.js` 的 `API_BASE_URL` —— **运行时生效，最高优先级，开发预览与生产都直接调用云后端**；
> - `web-app/.env.production` 的 `VITE_API_BASE` —— 构建期默认值（config.js 缺失时的兜底）。
> 所有后端路由均以 `/api` 开头（如 `/api/auth/password-login`、`/api/health`）。

---

## 2. 地址解析优先级（三层兜底）

前端按以下顺序决定 `API_BASE_URL`（`src/api/request.ts` 的 `getApiBase()` 实现）：

| 优先级 | 来源 | 文件 | 说明 |
|--------|------|------|------|
| 1（最高，已生效） | 运行时配置 | `public/config.js` 的 `window.__APP_CONFIG__.API_BASE_URL` | 当前=微信云托管域名；改这里可**免重建换域名** |
| 2 | 构建期环境变量 | `.env.production` 的 `VITE_API_BASE` | 打包时写死进产物，作为兜底默认值 |
| 3（兜底） | 硬编码 | `'/api'` | 仅本地开发代理场景（无变量时） |

> `config.js` 已带云托管地址，因此 `npm run dev` 预览与 `npm run build` 生产都会调用云后端。
> 若要在本地联调指向 `server:3000`，将 `config.js` 的 `API_BASE_URL` 行注释掉即可回退到 `.env.development` 的 `localhost:3000`。

统一取值函数 `getApiBase()` 被 `request.ts`、`teacher.ts`（AI 流式）、`AiChat.vue`（AI 流式 fetch）三处复用。

---

## 3. 如何更换域名（两种做法，任选其一）

### ✅ 做法 A：仅改运行时配置（推荐，免重新构建）

适用于「云托管域名变了，但不想重新打包前端」的场景。

1. 打开 `web-app/public/config.js`，把已存在的 `API_BASE_URL` 改成新地址：
   ```js
   window.__APP_CONFIG__ = {
     API_BASE_URL: 'https://你的新域名.sh.run.tcloudbase.com/api',
   }
   ```
2. 保留结尾的 `/api`（后端 NestJS 路由前缀）。
3. 将 `config.js` 单独重新部署 / 覆盖到线上静态资源目录即可生效。

> `index.html` 通过 `<script src="./config.js"></script>`（经典脚本，在应用启动前同步加载）引入，`config.js` 的值即覆盖构建默认值，改动即时生效。

### 做法 B：改构建期环境变量（走 CI / 重新打包）

适用于「前端随后端一起走发布流水线」的场景。

1. 打开 `web-app/.env.production`：
   ```
   VITE_API_BASE=https://你的新域名.sh.run.tcloudbase.com/api
   ```
2. 重新构建：`npm run build`（产物 `dist/` 会内置新地址）。
3. 部署 `dist/`。

> 若同时用了做法 A，请保持两者值一致，避免运行时与构建默认值分歧。

---

## 4. 开发环境（本地联调）

开发服务器（`npm run dev`，端口 5202）默认使用 `web-app/.env.development` 的 `localhost:3000`；但因 `public/config.js` 已带云托管地址（运行时优先级最高），**dev 预览实际会调用云后端**。

```
VITE_API_BASE=http://localhost:3000/api   # .env.development，本地后端（config.js 未覆盖时生效）
```

- 想在开发预览里直连云后端：无需改动（config.js 已生效）。
- 想改回本地联调 `server:3000`：将 `config.js` 的 `API_BASE_URL` 行注释掉即可（注意本地需先启动 `server` 并具备可用 MySQL）。

---

## 5. 跨域（CORS）提醒

- 后端通过 `@nestjs` 的 CORS 配置放行来源，关键变量 `CORS_ORIGIN`（见 `server/.env.example`）。
- 若从浏览器调用云托管域名报 CORS 错误，请在后端 `.env` 将 `CORS_ORIGIN` 设为前端实际来源（如 `http://localhost:5202` 或你的 web 域名），并重启后端。
- 微信云托管本身通常已配置网关，但仍需后端显式允许前端来源。

---

## 6. 健康检查

部署后可用以下命令验证后端可达（替换为你当前域名）：

```bash
curl https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/health
```

返回 200 / JSON 即说明地址配置正确、后端在线。

---

## 7. 相关文件清单

| 文件 | 作用 |
|------|------|
| `web-app/public/config.js` | 运行时后端地址（换域名首选改这里） |
| `web-app/.env.production` | 生产构建期默认地址 |
| `web-app/.env.development` | 本地开发地址（localhost:3000） |
| `web-app/index.html` | 在应用启动前加载 `config.js` |
| `web-app/src/api/request.ts` | `getApiBase()` 解析逻辑 + axios 实例 |
| `web-app/src/api/teacher.ts` | AI 流式接口（复用 `getApiBase`） |
| `web-app/src/views/ai/AiChat.vue` | AI 流式 fetch（复用 `getApiBase`） |
