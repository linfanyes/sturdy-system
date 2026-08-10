# Web 端令牌安全加固方案（渐进式）

> 关联风险报告：`docs/RISK_AUDIT_2026-08-10.md` — 「Web 令牌存 localStorage，XSS 可窃」
> 状态：**渐进式加固已落地**，全量 HttpOnly Cookie 改造为后续迭代项（见 §3）。

---

## 1. 现状与风险

- Web 端 JWT 令牌存 `localStorage['trace_web_token']`（`web-app/src/stores/auth-machine.ts`），请求时注入 `Authorization: Bearer <token>`（`web-app/src/api/request.ts`）。
- **风险**：`localStorage` 对同源所有脚本可见。一旦出现 XSS（注入脚本执行），攻击者可直接 `localStorage.getItem('trace_web_token')` 窃取令牌，伪造任意角色请求。
- **缓解现状（已具备）**：
  - 业务源码**无 `v-html` / `innerHTML` / `document.write`**（实测仅 `node_modules` 内框架自带），XSS 面低；
  - 后端 CORS fail-closed（`server/src/main.ts`），令牌无法被跨站脚本静默携带读取；
  - `strict-origin-when-cross-origin` referrer 策略（本次新增）减少 Referer 泄露。

## 2. 已落地的渐进加固（本次）

| 项 | 变更 | 说明 |
|---|---|---|
| Referrer Policy | `web-app/index.html` 增加 `<meta name="referrer" content="strict-origin-when-cross-origin" />` | 防止跨站跳转时泄露完整 URL（可能含查询参数/路径） |
| 审计结论固化 | 无 `v-html`/`innerHTML` 面已确认 | 见风险报告 §正面结论 |

> 说明：未直接上 CSP meta —— 本 SPA `index.html` 含内联主题脚本，且云托管静态托管无法配响应头；CSP 一旦放行策略不当会破坏生产功能，须在生产环境逐项验证后落地（见 §3.3）。

## 3. 全量改造方案（HttpOnly Cookie，建议迭代）

目标：令牌移出 `localStorage`，改为 **HttpOnly + Secure + SameSite** Cookie，使 XSS 无法读取。

### 3.1 后端（server/）

1. **登录成功时下发 Cookie**：`auth` 模块登录接口（admin/auth 教师/家长登录）响应头增加
   ```
   Set-Cookie: trace_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
   ```
   - `Secure`：仅 HTTPS（微信云托管默认 HTTPS，满足）；
   - `SameSite=Strict`：防 CSRF（同站携带，跨站不发送）；若需跨站（如 Web 与 API 不同域但非 https）则评估 `SameSite=None; Secure` + CSRF token 双提交；
   - `Max-Age` 与 JWT 过期时间一致（当前约 30 天）。
2. **JwtAuthGuard 双通道读取**（`server/src/common/guards/jwt-auth.guard.ts`）：
   - 先读 `Authorization: Bearer`（小程序走此通道，保持不动）；
   - 无头时读 `req.cookies?.trace_token`（需 `cookie-parser` 中间件，`main.ts` 注册）。
3. **CSRF 防护**（若 SameSite=Strict 仍不满足业务跨站场景）：写操作校验 `X-CSRF-Token` 头（由后端下发、随 Cookie 双提交），或校验 `Origin`/`Referer` 白名单。
4. **退出登录**：清 Cookie（`Set-Cookie: trace_token=; Max-Age=0`）+ 现有 localStorage 清理逻辑保留双保险。

### 3.2 前端（web-app/）

1. `api/request.ts`：`axios` 实例加 `withCredentials: true`，**移除** `localStorage.getItem('trace_web_token')` 注入逻辑（或保留为降级分支：有 Cookie 则不再需要手动注入）；
2. `stores/auth-machine.ts`：令牌持久化改为「读 Cookie 存在性判断登录态」，不再写 `localStorage`；
3. 登录页/401 处理：401 时仅清理内存状态与 localStorage 缓存，不依赖手动删 Cookie（Cookie 由服务端控制）。

### 3.3 CSP（可选，须生产验证）

若要在云托管加 CSP，需先在测试环境验证（本 SPA 含内联脚本 + 构建产物 hash）：

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.sh.run.tcloudbase.com
```

> 云托管静态托管如需自定义响应头，联系云托管控制台「静态托管 → 自定义响应头」或在部署平台层配置；当前平台无此能力则维持现状（XSS 面已低）。

## 4. 权衡记录

- **为何不立即全量改造**：涉及后端签发、CORS 凭证、CSRF 全套、小程序 `Authorization` 通道并存，改动面大且需回归验证 Web+小程序两端一致性；当前 localStorage 风险因「无 v-html 面 + CORS fail-closed」已显著收敛，按风险优先级后置为迭代项。
- **前提条件**：改造前需确认微信云托管静态托管支持自定义响应头/Cookie 传递；否则 Cookie 方案在跨域场景可能被浏览器 SameSite 拦截，需同步调整。

## 5. 验收标准（改造完成后）

- [ ] 登录后 DevTools → Application → Cookies 可见 `trace_token`（HttpOnly 勾选，JS 读取返回空）
- [ ] `localStorage` 无 `trace_web_token`
- [ ] XSS 注入脚本无法 `document.cookie` 读到令牌
- [ ] 小程序登录通道不受影响（仍走 Authorization）
- [ ] 退出登录后 Cookie 清除，刷新不恢复登录态
