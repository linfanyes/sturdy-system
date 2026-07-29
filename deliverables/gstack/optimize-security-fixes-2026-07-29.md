# 上线前检查问题整改报告（优化改进）

**日期**：2026-07-29
**场景**：基于 `pre-launch-check-garden-workbench-2026-07-29.md` 的整改实施
**参与成员**：主理人（调度）+ 安全卫士（B2/B3/B4）+ 质量门神（B1/构建验证）+ 产品官（P1/P2 评审）

---

## 📌 TL;DR（执行摘要）

- 原评估结论：🔴 No-Go（4 个 P0 阻塞项）
- 本次整改：4 个阻塞项（B1 构建阻断 / B2 SSRF / B3 家长弱密码 / B4 pdfjs CVE）**全部清零**
- 附带完成 P1（教师密码强度 + 删除事务健壮性）、P2（.env 泄露）加固
- 当前状态：🔡 待 `npm install` 重新解析依赖并跑构建/单测后判定 Go

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go（整改后） | 🟡 条件 Go（依赖重装 + 构建验证通过后即可上线） |
| 阻塞项剩余 | 0 |
| 关键行动项 | 1. server/mini-program 重新 `npm install`；2. 跑 web-app 构建 + server 单测；3. 回归家长登录/教师创建流程 |
| 建议负责人 | 主理人 / 校管 |

---

## 1. 各阻塞项整改结论

### 🔴 B1 · web-app 路由语法错误（构建阻断）
- **文件**：`web-app/src/router/index.ts`
- **问题**：`tools/lessonObservation` 路由对象 `path/name` 打开后未闭合，其 `component/meta/}` 被错置到 11 条路由之后，导致整个站点 esbuild 构建失败。
- **修复**：将 `{ path:'tools/lessonObservation', name:'toolLessonObservation', component, meta }` 内联闭合，删除错位的第 176 行。
- **验证**：需跑 `web-app` 构建确认 0 错误。

### 🔴 B2 · SSRF（AI 模型代理可请求内网/任意地址）
- **文件**：`server/src/config/provider-models.ts`、`server/src/config/config.controller.ts`
- **问题**：`POST ai/models` 仅 `@UseGuards(JwtAuthGuard)`，任意已登录角色可传入任意 `baseUrl` 触发服务端 fetch，存在 SSRF。
- **修复**：
  - 新增 `isPrivateOrReservedIpv4` / `isSafeHttpUrl` 校验（拒绝私有网段、回环、链路本地、169.254、100.64/10、IPv6、localhost/.internal/.local、非 https）。
  - `fetchProviderModels` 增加 `if (!baseUrl || !isSafeHttpUrl(baseUrl)) return fallbackResult(provider)`，fetch 增加 `redirect:'error'`。
  - 路由补 `@Roles('teacher','super')`。
- **验证**：静态审计通过；建议补充「传入 `http://169.254.169.254/` 应被拒」的回归用例。

### 🔴 B3 · 家长默认弱密码 123456（已按业务规则改为「学号后 6 位」）
- **文件**：`server/src/students/students.module.ts`、`server/src/parent-auth/parent-auth.service.ts`、`server/src/auth/auth.service.ts`、`server/src/parent-auth/parent-auth.controller.ts`
- **问题**：家长登录回退到硬编码 `PARENT_DEFAULT_PASSWORD='123456'`。
- **业务规则（用户确认）**：家长默认登录口令 = **学号后 6 位**；家长登录成功后可自行修改密码；班主任也可将口令重置回「学号后 6 位」。
- **修复**：
  - 新增派生助手 `parentDefaultPassword(studentNo) = (studentNo||'').trim().slice(-6)`。
  - 教师开启家长登录时（`toggleParentLogin`）将默认口令设为**学号后 6 位**，哈希存储并随响应返回 `initialPassword`（教师可告知家长）。缺学号时拒绝开启，避免产生空口令。
  - **新增**班主任重置接口 `POST students/:id/reset-parent-password`（`toggleParentLogin` 同权限，需 `parentLoginEnabled=true`），将 `parentPasswordHash` 重置回「学号后 6 位」并返回 `defaultPassword`。
  - 登录与改密路径移除 `123456` 回退：必须已有 `parentPasswordHash`，否则明确提示「密码尚未初始化，请联系老师重新开启家长登录以设置密码」。
  - `unifiedLogin` 家长分支同样改为 bcrypt 校验。
  - 家长登录接口加 `@UseGuards(ParentLoginRateLimit)`（单 IP+学号 每分钟 ≤10 次），缓解学号可枚举场景下的暴力破解。
- **注意（迁移）**：历史已开启但未设密码的家长（存量 `parentLoginEnabled=true` 且 `parentPasswordHash=null`）将被拒绝登录，需教师重新「关闭→开启」以按学号后 6 位初始化。属安全权衡，可接受。
- **残余风险**：默认口令由学号派生，仍属半公开信息；已用登录限速 + 鼓励首次登录改密缓解。如校方要求更强，可后续改为「开启时强制家长首次登录改密」。

### 🔴 B4 · pdfjs-dist 脆弱版本（CVE-2024-4367）
- **文件**：`server/package.json`、`server/src/ai/ai.service.ts`、`mini-program/package.json`
- **问题**：`pdfjs-dist@^3.11.174` 实际被 `pdf-parse@1.1.1` 嵌套的 `@2.16.105` 覆盖，命中 CVE-2024-4367（字体解析 RCE）；`mini-program` 的 `xlsx@0.18.5` 亦有原型污染/ReDoS CVE。
- **修复**：
  - 移除 `pdf-parse` 依赖，改用 pdfjs 直接 `getTextContent()` 提取数字版 PDF 文本（新增 `extractPdfText`），消除嵌套脆弱副本。
  - `server/package.json`：`pdfjs-dist` 升至 `^4.10.38`，并加 `overrides` 强制 `pdfjs-dist@4.10.38`；`ai.service.ts` 增加 `Promise.withResolvers` 兜底（兼容 Node 20）。
  - `mini-program/package.json`：`xlsx` 升至 `^0.20.3`（SheetJS 社区修复版）。
- **验证**：需 `npm install` 确认版本解析，并冒烟测试 PDF 解析（文本 + 扫描件 OCR）。

---

## 2. P1 / P2 加固（非阻塞）

| # | 严重度 | 类别 | 位置 | 修复 |
|---|--------|------|------|------|
| P1-1 | 🟠 | 密码强度 | `school-admin.service.ts:resetPassword` | 新密码非空且 ≥8 位 |
| P1-2 | 🟠 | 事务健壮性 | `school-admin.service.ts:deleteTeacher` | `TEACHER_ID_TABLES` 原始 SQL 循环加 try/catch（与 `deleteClass` 对齐） |
| P1-3 | 🟠 | 默认弱密码 | `school-admin.service.ts:createTeacher` | 不再默认 `123456`；未提供或 <8 位时生成随机初始密码并随响应返回 `initialPassword`（`batchCreateTeachers` 同步透传） |
| P2-1 | 🟡 | 配置泄露 | `.gitignore` | 忽略 `.env.*` / `.env.local`，保留 `.env.example`；并 `git rm --cached` 取消跟踪 `web-app/.env.development`、`web-app/.env.production`（文件保留在磁盘，构建期由 `public/config.js` 运行时覆盖） |

---

## ✅ 待执行 / 验证清单（上线前最后一步）

| # | 行动 | 负责方 | 紧急度 |
|---|------|--------|--------|
| 1 | `cd server && npm install` 重装依赖，确认 `pdfjs-dist@4.10.38` 解析 | 主理人 | P0 |
| 2 | `cd mini-program && npm install` 确认 `xlsx@0.20.3` | 主理人 | P0 |
| 3 | web-app 生产构建 0 错误（验证 B1） | 质量门神 | P0 |
| 4 | server 单测 + 家长登录/教师创建回归 | 质量门神 | P0 |
| 5 | 提交并推送至 Gitee master | 主理人 | P0 |

---

## ⚠️ 已知局限

- 依赖版本（`4.10.38` / `0.20.3`）为已知可用发布版本，但因本沙箱 `npm view` 受限，最终以 `npm install` 实际解析为准。
- 存量未设密码的家长需教师重新开关一次（见 B3 迁移说明）。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
