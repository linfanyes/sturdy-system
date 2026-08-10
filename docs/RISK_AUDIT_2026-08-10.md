# 园丁工作台 / 师者小站 — 风险·缺陷·漏洞排查报告

- **日期**：2026-08-10
- **范围**：后端 `server/`（NestJS + TypeORM + MySQL）、Web 管理端 `web-app/`、微信小程序 `mini-program/`、构建部署（`server/Dockerfile`、`.workflow/ci.yml`、vendor 机制）
- **方法**：只读静态审计 + 本地复现验证（grep / read / 受控脚本），所有结论附**文件:行号**证据
- **结论基调**：鉴权与多租户隔离设计**扎实**（非走过场）；发现 1 个中高危信息泄露、1 个弱默认凭据、若干可靠性/依赖/前端加固项

---

## 一、已确认风险（按严重度排序）

### 🔴 中高 — 信息泄露：`/api/monitor/logs` 完全公开

- **证据**：`server/src/monitor/monitor.controller.ts:24-28`
  ```ts
  @Get('logs')   // 无 @UseGuards(JwtAuthGuard)
  async list(@Query('limit') limit?: string, @Query('type') type?: string) {
    return { items: await this.monitor.list(Number(limit) || 50, type || undefined) }
  }
  ```
- **现象**：该端点无任何鉴权（仅全局 Throttler 限速），返回前端上报的监控/错误日志。监控日志通常含**堆栈、内部文件路径、SQL 片段、请求 URL、可能的学生/教师 PII**。
- **风险**：未授权者可持续拉取系统错误情报，辅助进一步攻击；注释自身承认"生产可加鉴权"。
- **建议**：加 `@Roles('super') + @UseGuards(JwtAuthGuard)`；或至少校验内部网段/IP。

### 🟠 中 — 弱默认凭据：`LOGIN_CODE` 硬编码回退 `1314520`

- **证据**：`server/src/config/config.service.ts:109-110`
  ```ts
  key: 'loginCode',
  value: this.env.get('LOGIN_CODE') || '1314520',
  ```
- **现象**：超管/家长登录码若环境未设 `LOGIN_CODE`，则回退为可猜测的默认值 `1314520`（谐音"一生一世我爱你"）。
- **风险**：若运维漏配环境变量，攻击者可用该弱码登录超管/家长面。随 `.env` 已被 gitignore（见下），本地不泄露，但默认值本身即弱点。
- **建议**：fail-closed——无配置时**拒绝启动**或强制首次登录改码，不要给可猜测默认值。

### 🟠 中 — 前端令牌存 `localStorage`（XSS 可窃取）

- **证据**：`web-app/src/api/request.ts:30` `localStorage.getItem('trace_web_token')`；`stores/auth-machine.ts:97` 写入。
- **现象**：Web 令牌明文存 localStorage。
- **风险**：一旦前端出现 XSS，令牌即被窃取、可 impersonate。当前业务源码**未发现 `v-html`/`innerHTML`**（XSS 面低，属正面），故当下可利用性低，但属残留风险。
- **建议**：改用 **HttpOnly + Secure + SameSite Cookie**（由后端 Set-Cookie），或至少对高风险页面做 CSP。小程序端 `rich-text` 不执行脚本、且 `ai.vue:196` 对明文 HTML 做了转义，风险低。

### 🟠 中 — 依赖供应链漏洞（构建日志实测 16 处）

- **证据**：最近一次云构建日志 `npm install` 输出 `16 vulnerabilities (11 moderate, 5 high)`；源码中命中 `uuid@8/9`、`lodash.isequal`、`inflight`、`glob@7`、`rimraf@2`、`prebuild-install` 等已知弃用/有 CVE 包。
- **风险**：运行时依赖（含 `prebuild-install` 等原生加载器）存在中高危漏洞；npm registry 为 npmmirror 时 `npm audit` 返回 404，需临时 `--registry=https://registry.npmjs.org`。
- **建议**：`npm audit fix`（非破坏性优先），对 `high` 项升级或加 override；CI 增加 `npm audit --audit-level=high` 门禁。

### 🟠 中 — 可靠性债务：179 个 TS 文件 0 单元测试

- **证据**：`server/src` 约 179 个 ts 文件，本次排查未发现任何 `*.spec.ts`；记忆亦记录"server/src 179 ts 文件 0 个单测"。
- **风险**：`@gardener/shared` vendor 脆弱性（本次已修）、多租户隔离、事务回滚等关键逻辑无回归保护，任何重构易无声破坏。
- **建议**：优先为 `jwt-auth.guard`、`base.controller`/`base.service`（含 `stripUnsafe`/`clampTake`）、`exams.findAll` 的 `canAccess` 补单测；CI 加 `jest --coverage` 门禁。

### 🟡 低/中 — 管理端分页未统一 `MAX_TAKE` 上限

- **证据**：`server/src/common/crud/base.controller.ts:20-24` 主路径 `MAX_TAKE=500`；但 `admin.controller.ts:34/78/119/...` 直接把 `@Query('take')` 透传给 `admin.service`，仅依赖 service 默认值（100/500/5000）。`admin.service.ts:617` `gradeRepo.find({ take: 5000 })`、`ai.service.ts:257` `take: 2000`。
- **风险**：超管专属，越权面低；但 5000 级拉取在大数据量下可拖垮 DB。
- **建议**：admin 路径也过 `clampTake`；超大查询改流式/分页。

### 🟡 低 — `forbidNonWhitelisted: false`

- **证据**：`main.ts:123-129` 全局 ValidationPipe `whitelist:true, forbidNonWhitelisted:false`。
- **风险**：未知字段被静默剥离而非拒绝；主流 CRUD 已用 `stripUnsafe` 兜底，但**裸 `@Body()` 的端点**（如 `config.controller` 部分、`backup`）依赖各自 DTO 严谨度。
- **建议**：对写类敏感端点显式 `forbidNonWhitelisted:true` 或严格 DTO。

### 🟡 低 — vendor 机制的操作脆弱性（已修，残留纪律风险）

- **证据**：`server/vendor/gardener-shared/`（仅 `package.json`+`dist/`）、`server/tsconfig.json` paths 双候选、`Dockerfile` 已加 COPY vendor + 兜底 cp。
- **风险**：今后改 `shared/` 后若**未**跑 `npm run vendor:shared` 并重新提交 `dist`，云构建会再次失败（本次三次迭代的根源）。
- **建议**：将该步骤固化进 `pre-commit` 钩子或 CI 校验（比对 `shared/dist` 与 `vendor` 哈希）。

---

## 二、关键正面结论（设计扎实，非走过场）

1. **鉴权守卫设计严谨**（`common/guards/jwt-auth.guard.ts:39-104`）：
   - 强制 `Bearer ` 前缀，无前缀抛"未登录或缺少令牌"；
   - JWT 校验失败不记录 token 前缀（防日志泄露，S05 修复注释可见）；
   - 禁用/删除账号即时失效（按角色查库 `assertAccountActive`）；
   - `@Roles()` 经 `Reflector` 防跨角色越权。
2. **多租户/对象级授权有效**（IDOR 疑虑已排除）：
   - 通用 CRUD 基类的 `teacherId` 一律来自 JWT（`@CurrentTeacher().sub`），不从请求体取；`stripUnsafe` 拦截 `teacherId/id/role` 等键防 mass-assignment；`clampTake` 上限 500（`base.controller.ts:31-40/58-59`）。
   - `exams.findAll` 对传入 `classId` 先 `classMemberSvc.canAccess` 校验归属，否则返回空（`exams.module.ts:40-49`）——杜绝任意 classId 越权读。
3. **CORS fail-closed**（`main.ts:105-121`）：未配置默认 `false`；生产环境禁 `*`；仅可信来源列表才带 `credentials`。
4. **限速完善**：全局 `ThrottlerGuard`(60/min/IP) + 登录专用限流（超管 6 / 教师·校管·家长 10 / 微信 30 次每分，`auth/parent-auth/school-admin/admin.controller` 均有 `@UseGuards(LoginRateLimit)`）。
5. **密钥不入库**：`server/.env` 含 `DB_PASSWORD/JWT_SECRET/SUPER_ADMIN_PASSWORD/WECHAT_SECRET` 等，但 `.gitignore` 第 18 行 `.env` 规则生效，`git ls-files server/.env` 为空——**未泄露到仓库**（此前误报已纠正）。AI `apiKey` 还做了 `decryptSecret` 加密存储 + 下发脱敏（`config.service.ts:340`、`config.controller.ts:37/107`）。
6. **无文件上传端点**（grep `FileInterceptor/UploadedFile` 无命中）——无上传类攻击面。
7. **小程序 `rich-text` 安全**：微信 `rich-text` 不执行脚本；`ai.vue:196` 对明文 HTML 转义为纯文本，AI 富文本渲染无脚本执行风险。
8. **公开配置端点洁身自好**：`GET /api/config/public` 仅返回 `defaultSubjects` 学科列表（`config.service.ts:327-332`），不含 `loginCode`/`wxAppId`/密钥。

---

## 三、修复优先级建议

| 优先级 | 项 | 工作量 | 影响 |
|---|---|---|---|
| P0 | `/api/monitor/logs` 加超管鉴权 | 极小（2 行） | 关闭公开信息泄露 |
| P0 | `LOGIN_CODE` 去硬编码默认/fail-closed | 小 | 消除弱默认凭据 |
| P1 | Web 令牌改 HttpOnly Cookie | 中 | 降低 XSS 窃取面 |
| P1 | `npm audit fix` + CI 审计门禁 | 小 | 消除 5 high 依赖漏洞 |
| P1 | 补核心单测（guard/CRUD/事务） | 中 | 防回归 |
| P2 | admin 分页统一 `clampTake` | 小 | 防重查询拖垮 DB |
| P2 | vendor 同步固化进 pre-commit/CI | 小 | 防云构建再次断裂 |
| P2 | Web 可访问性 aria/role 补全 | 中 | 合规/体验 |

---

## 四、附：本轮已验证排除的"假风险"

- ❌ "`.env` 被 git 跟踪导致密钥泄露" —— **误报**：`.gitignore` 已忽略，`git ls-files` 为空。
- ❌ "SQL 注入（`DELETE FROM \`${t}\``）" —— **安全**：`t` 来自常量白名单 `TEACHER_ID_TABLES/CLASS_ID_TABLES`（非用户输入），且 `teacherIds/classIds` 走参数化 `?`（`admin.service.ts:214-224`）。
- ❌ "IDOR 水平越权" —— **已防**：`teacherId` 恒从 JWT 注入 + classId 归属校验。
- ❌ "小程序 `rich-text` XSS" —— **安全**：平台渲染器不执行脚本 + 上游转义。

> 说明：本报告基于静态审计与本地受控复现。建议 P0 两项立即修，其余纳入迭代。
