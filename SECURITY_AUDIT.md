# 园丁工作台（work-system）安全与缺陷审计报告

- **审计范围**：`mini-program/`（uni-app 微信小程序）、`web-app/`（Vue3+Vite 家长/教师 Web 端）、`server/`（NestJS + MySQL 后端）
- **审计日期**：2026-07-18
- **方法论**：静态代码审计（XSS / 危险函数 / 密钥泄露 / SQL 拼接 / 鉴权覆盖 / 输入校验 / 依赖漏洞 / CORS / 限流 / 租户隔离）
- **结论**：发现 **1 项高危（服务端文件解析 RCE 链路）**、**2 项中危（XSS / 限流缺失）** 及若干中低危配置项。**生产 Web 依赖 0 漏洞**，核心鉴权/租户隔离设计正确。

---

## 一、发现总览（按严重级）

| # | 严重级 | 类型 | 位置 | 一句话结论 |
|---|--------|------|------|-----------|
| 1 | 🔴 高危 | 依赖漏洞 / RCE | `server/src/ai/ai.service.ts:140,148` | 解析用户上传 PDF 触发 `pdfjs-dist@2.16.105` CVE-2024-4367 任意 JS 执行 |
| 2 | 🔴 高危 | 依赖漏洞 / 原型污染 | `server/src/ai/ai.service.ts:7,104`；`grades/school-admin/students` 模块 | 解析用户上传 Excel 触发 `xlsx@0.18.5` CVE-2023-30533 / CVE-2024-22363 |
| 3 | 🟠 中危 | 存储型 XSS | `web-app/src/views/parent/Dashboard.vue:69-85,304` | `v-html` 注入未转义的 `d.label`（成绩分布学科名） |
| 4 | 🟠 中危 | 限流缺失 / DoS | `server/src/main.ts`（无全局 Throttler） | 仅登录接口限流；AI/文件解析等昂贵接口可被滥用 |
| 5 | 🟠 中危 | CORS 配置 | `server/src/main.ts:55-60`；`server/.env.example:5` | 默认 `CORS_ORIGIN=*`，生产若沿用则任意源可调用 |
| 6 | 🟠 中危 | 依赖 SSRF | `server/package.json:25`（axios 1.7.7） | 出站请求存在重定向 SSRF/凭据泄露通告（修复于 1.8.2） |
| 7 | 🟡 低危 | 客户端越权(UI) | `web-app/src/router/index.ts:221-241` + `stores/auth.ts:13-22` | 路由守卫信任 localStorage 中的 role/features，可本地篡改 |
| 8 | 🟡 低危 | 文件类型校验弱 | `server/src/ai/ai.service.ts:97,101-124` | 以扩展名路由解析，未校验 magic bytes |
| 9 | 🟡 低危 | 不安全默认配置 | `server/.env.example:20,31,36-37` | `DB_SYNCHRONIZE=true`/默认 JWT/默认 admin 口令 |
| 10 | 🟢 信息 | dev 依赖告警 | `web-app` devDeps | 26 个 high 均为 dev 工具链（brace-expansion DoS），**生产依赖 0 漏洞** |

---

## 二、详细发现

### 🔴 #1 服务端解析用户上传 PDF → CVE-2024-4367（任意 JS 执行）
- **证据**：`ai.service.ts:90` `extractFilesText(files)` 接收教师上传的 `{name, data(base64)}`（**不可信输入**）；当 PDF 文本过短时调用 `ocrPdf`（:140 `pdfjs.getDocument({data})` → :148 `page.render(...)`）。`pdfjs-dist@2.16.105` 存在 CVE-2024-4367：渲染含特制字体的恶意 PDF 时可在 Node 进程执行任意 JavaScript。
- **影响**：攻击者（任意教师账号）上传恶意 PDF，即可在后端服务进程执行代码（RCE / 读密钥 / 内网 SSRF / 数据外泄）。**可远程利用，无需特权**。
- **修复**：
  1. 升级 `pdfjs-dist` 至 **≥ 4.4.168**（或 3.11.174 的修复线）；2.x 已 EOL 无官方修复。
  2. 渲染时显式关闭脚本执行：`isEvalSupported: false`，并避免 `page.render`（仅文本提取可绕过该 CVE）。
  3. 将文件解析放入沙箱/独立 worker，限制 CPU/内存/网络出口。

### 🔴 #2 服务端解析用户上传 Excel → xlsx@0.18.5 已知漏洞
- **证据**：`ai.service.ts:7` 导入 `xlsx`，`:104` `parseExcel(buf)`；`grades.module.ts:21`、`school-admin.service.ts:18`、`students.module.ts:17` 均用 `XLSX` 解析上传的成绩/学生表。`xlsx@0.18.5`（npm 版本）含 CVE-2023-30533（原型污染，通过 `__proto__`）与 CVE-2024-22363（ReDoS）。
- **影响**：上传特制 xlsx 可触发原型污染（影响全局对象，可能绕过安全校验）或 ReDoS（单请求拖垮进程）。
- **修复**：
  1. SheetJS 的修复版本 **≥ 0.20.2 仅通过官方 CDN（cdn.sheetjs.com）发布**，npm 上的 0.18.5 不会修复 —— 改用 `npm i https://cdn.sheetjs.com/xlsx-0.20.2.tgz` 或迁移到 `exceljs`。
  2. 解析前对结果对象做原型净化；限制单文件大小与行列上限。

### 🟠 #3 web-app 成绩分布图 `v-html` 未转义（存储型 XSS）
- **证据**：`Dashboard.vue:304` `<div v-html="barChart(ex.distribution)">`，`barChart()`（:69-85）把 `d.label`（字符串）直接插值进 SVG `<text>`：`${d.label}`，**无任何 HTML 转义**。`d.count` 为数字安全，`d.label` 为学科名等字符串。
- **影响**：若成绩分布 label 含 `<`/`&` 等（如教师建考试时填入 `<img src=x onerror=...>` 类学科名），家长端渲染时执行脚本，可窃取 `localStorage` 中的 `trace_web_token`。
- **修复**：
  1. 最简：`barChart` 内对 `d.label` 做 HTML 实体转义（`<`→`&lt;` 等）后再拼接。
  2. 更优：移除 `v-html`，用 Vue 模板/轻量图表组件（如 `<rect>`+`<text>` 直接绑定，Vue 自动转义）渲染 SVG。

### 🟠 #4 全局速率限制缺失（仅登录接口有限流）
- **证据**：`main.ts` 仅 `auth/admin` 登录用 `LoginRateLimit`/`AdminLoginRateLimit` 守卫；全项目无 `ThrottlerModule`/`APP_GUARD`。`main.ts:52` 把 JSON 体上限放宽到 `5mb`，AI 接口会拿此 body 调外部大模型并解析上传文件。
- **影响**：AI 对话/文件解析属高成本操作，单账号可高频调用造成费用滥用与 DoS；缺乏按用户配额。
- **修复**：引入 `@nestjs/throttler`，全局兜底限流（如 60 次/分钟/IP），对 `/api/ai/*` 单独更严格配额；限制上传解析频率与文件大小。

### 🟠 #5 CORS 默认宽松
- **证据**：`main.ts:55` `cors = config.get('CORS_ORIGIN') || '*'`；当为 `*` 时 `origin: true`（允许任意源）、`credentials: false`。`.env.example:5` 即 `CORS_ORIGIN=*`。
- **影响**：Bearer Token 非 cookie，故非传统 CSRF；但若生产沿用 `*`，任意网站可代用户携带其 token 调用 API 读取响应（token 一旦经 XSS/泄露即被滥用）。违背最小权限。
- **修复**：生产环境在 `.env` 显式填可信来源逗号列表（小程序/管理域名），不要保留 `*`；CI 部署校验 `CORS_ORIGIN != '*'`。

### 🟠 #6 axios 1.7.7 出站请求通告
- **证据**：`server/package.json:25` `axios@^1.7.7`；`ai.service.ts` 向外部 AI（`${s.baseUrl}/chat/completions`）发请求。
- **影响**：该版本存在重定向相关 SSRF/凭据泄露通告（修复于 1.8.2）。若 AI 网关返回重定向到内网地址，可能泄露 `Authorization` 头或探测内网。
- **修复**：升级 `axios` 至 **≥ 1.8.2**；对出站请求禁用自动跟随重定向或限制 allowed hosts。

### 🟡 #7 客户端路由守卫信任可篡改的本地状态
- **证据**：`router/index.ts:221-241` 用 `auth.isLoggedIn`/`auth.role`/`auth.user?.features` 判定；这些值来自 `stores/auth.ts:13-22`，即从 `localStorage.trace_web_token` / `trace_web_user`（JSON）读取。用户可手动改 localStorage 把 `role` 改为 `super`。
- **影响**：仅能**本地**看到管理 UI 外壳；真正的数据 API 由服务端 `@Roles`（基于 JWT `role` 声明）拦截，故不构成数据越权，属防御纵深缺口。
- **修复**：路由守卫仅做 UX 层跳转；关键功能以服务端下发的权限为准；不在客户端保存可篡改的权限声明。

### 🟡 #8 文件类型以扩展名路由
- **证据**：`ai.service.ts:97` 取 `name.split('.').pop()` 决定解析方式（:101-124）。扩展名由上传者控制。
- **影响**：低风险（改名不会绕过安全解析，仅可能解析失败）；但更严谨应校验 magic bytes。
- **修复**：按文件头（magic bytes）/MIME 判定真实类型，维护允许类型白名单。

### 🟡 #9 不安全默认配置（.env.example）
- **证据**：`server/.env.example` 含 `DB_SYNCHRONIZE=true`（:20）、`JWT_SECRET=change_me_to_a_long_random_secret`（:31）、`SUPER_ADMIN_PASSWORD=admin`（:37）。
- **影响**：若直接复制为生产 `.env`：自动建表可能改结构；可伪造 JWT（server 已在 `main.ts:78-83` 生产环境拒绝默认 JWT，良好）；弱口令超级管理员。
- **修复**：生产模板设 `DB_SYNCHRONIZE=false`；部署文档强制修改超级管理员口令与 JWT_SECRET；CI 校验。

### 🟢 #10 dev 依赖告警（非生产）
- **证据**：`web-app` `npm audit` 报告 26 个 high，但 `npm audit --omit=dev` 结果为 **found 0 vulnerabilities**。根因为 `brace-expansion` DoS 经 `minimatch` → `vue-tsc`/`jest`/`@vue/test-utils`/`js-beautify`（均为 devDep）。
- **影响**：仅开发/构建期 DoS，不进入生产产物。
- **修复**：`npm audit fix`（非破坏）；在 devDependencies 升级 `vue-tsc` 至 3.x（接受一次 breaking）。

---

## 三、已确认的安全强项（正面控制）

- **无 SQL 注入**：全程 TypeORM 参数化；唯一 raw query（`admin.service.ts:309-313` 的 `DELETE`）表名来自白名单循环，非用户输入。
- **密钥不落地前端**：`apiKey` 仅存于后端，仅在出站 `Authorization: Bearer` 头使用（`ai.service.ts`），从不下发前端。
- **鉴权与租户隔离正确**：`JwtAuthGuard`（`jwt-auth.guard.ts`）基于**签名 JWT** 校验并强制 `@Roles`；所有 CRUD 经 `base.controller.ts` 用 `t.sub`（JWT 中的 teacherId）做数据归属，`stripUnsafe()`（:31）剔除 `teacherId/id/role` 等键，防越权批量赋值与跨租户访问。全仓无 `teacherId = body/query/params` 赋值。
- **小程序富文本安全**：`mini-program` 无 `v-html`，AI 回复经 `ai.vue` 令牌化 renderer + 明文 HTML 转义防御渲染（设计合理）。
- **JWT 启动自检**：`main.ts:78-84` 生产环境若 JWT_SECRET 为默认/缺失则拒绝启动。
- **密钥不入库**：`.env` 已被 gitignore；仅 `.env.example`/`.env.*` 模板入库，且不含真实密钥（仅公开 `VITE_API_BASE` 与占位符）。
- **密码安全**：`auth.service.ts` 使用 bcrypt 校验与自动升级（`verifyAndUpgrade`），登录仅返回安全字段。

---

## 四、修复优先级建议

| 优先级 | 项 | 工作量 | 阻塞风险 |
|--------|----|--------|---------|
| P0 | #1 PDF 解析升级/禁用脚本执行（CVE-2024-4367） | 中 | 可远程 RCE |
| P0 | #2 Excel 解析升级至 SheetJS ≥0.20.2 / 迁移 exceljs | 中 | 原型污染/ReDoS |
| P1 | #3 Dashboard `v-html` 转义或换模板渲染 | 低 | 家长端 XSS |
| P1 | #4 引入 @nestjs/throttler 全局限流（AI 更严） | 低-中 | 成本/DoS |
| P1 | #5 生产 CORS 白名单化 | 低 | 横向调用 |
| P2 | #6 axios 升级 ≥1.8.2 | 低 | SSRF |
| P2 | #7/#8/#9 客户端权限以服务端为准、magic bytes 校验、生产配置收紧 | 中 | 纵深/配置 |

---

## 五、与既有待办的关系

- 待办 #182（拆分 `mock-data.js`）、#181（启动 web-app:5202）、#183（启动 server:3000）与本审计独立；审计发现的 #3 修复应在 web-app 重构时一并处理。
- 后端 #183 启动仍受限于本地无 MySQL/Docker（`.env` 中 `DB_HOST` 为腾讯云占位符），需云端 TencentDB 或自备 MySQL 方可连库启动。

---

## 六、改造实施状态（2026-07-25 已落地）

按「高危 → 中危 → 低危」次序已全部实施。**server 与 web-app 均 `npm run build` 通过**（0 编译错误）。

### ✅ #1 高危 pdfjs（CVE-2024-4367）
- `server/package.json`：`pdfjs-dist` `2.16.105` → `^3.11.174`。
- `server/src/ai/ai.service.ts`：`page.render(...)` 增加 `isEvalSupported: false`，关闭 CVE 触发所需的 eval 字体编译路径（**实际利用面已封堵**）。
- ⚠️ 说明：CVE-2024-4367 的“版本级”完整修复需 `pdfjs-dist ≥ 4.4.168`，该线改为 ESM 且移除 legacy `require` 入口，需把 NestJS 构建迁移为 ESM（破坏性改动），本次未做；当前以 `isEvalSupported:false` 配置封堵利用路径，残留仅体现在 `npm audit` 对版本号的标记，运行时不触发。

### ✅ #2 高危 xlsx（CVE-2023-30533 / CVE-2024-22363）
- 改用 **`exceljs`**（npm 官方源，无同类 CVE）完整替换 `xlsx@0.18.5`；`package.json` 已移除 `xlsx`。
- 新增 `server/src/common/excel.util.ts`（`xlsxFirstSheetToRows` / `xlsxToCsvText`，等价原 `sheet_to_json(header:1,defval:'')` 与 `sheet_to_csv`）。
- 迁移调用点：`ai/ai.service.ts`、`grades/grades.module.ts`、`students/students.module.ts`、`school-admin/school-admin.service.ts` + `school-admin/school-admin.controller.ts`（含 `parseFile`/`parseStudentFile` 改 async + 调用方 `await`）。

### ✅ #3 中危 Dashboard `v-html` XSS（web-app）
- `web-app/src/views/parent/Dashboard.vue`：`barChart()` 新增 `escapeHtml()` 对 `d.label` 做 HTML 实体转义后拼接 SVG（保留 `v-html` 但注入失效）。
- 小程序侧核查：分布图用 `{{ d.label }}` 文本插值（自动转义），**无等价漏洞，无需改**。

### ✅ #4 中危 全局限流
- `server/package.json`：新增 `@nestjs/throttler@^6`。
- `server/src/app.module.ts`：`ThrottlerModule.forRoot` 注册全局兜底 **60 次/分钟/IP**；`ai.controller.ts` 对 `/api/ai/*` 加 `@Throttle(10, 60)` 更严配额。

### ✅ #5 中危 CORS 白名单化
- `server/src/main.ts`：改为 fail-closed —— `CORS_ORIGIN` 缺失/为空/`*` 且处于 `production`（`NODE_ENV=production`）时，**启动即抛错**；否则按逗号拆分白名单 + `credentials:true`。
- `server/.env.example`：`CORS_ORIGIN` 改为占位 `https://admin.example.com,https://web.example.com`。

### ✅ #6 中危 axios SSRF
- `server/package.json`：`axios` `^1.7.7` → `^1.18.1`（≥1.8.2）。
- `server/src/ai/ai.service.ts`：出站 AI 请求 `maxRedirects: 0`，杜绝重定向 SSRF / 凭据泄露。

### ✅ #7 低危 客户端权限以服务端为准
- 核查：web `api/request.ts:31-36`、小程序 `request.js:94-98` 均已实现「401 → 清登录态」，服务端 `@Roles` 为权威。仅补防御性注释（不改行为，避免误用）。

### ✅ #8 低危 magic bytes 文件校验
- `server/src/ai/ai.service.ts`：新增 `assertSafeUpload(buf, ext)` —— 按 magic bytes 校验真实类型（PDF `%PDF`、XLSX `PK\x03\x04`+`[Content_Types].xml`、DOCX `PK`+`word/`、TXT/CSV 拒绝含 NUL 二进制），并限制单文件 ≤ 15MB；在 `extractFilesText` 与 `parseFile` 两处入口强制校验。

### ✅ #9 低危 生产默认配置收紧
- `server/.env.example`：`DB_SYNCHRONIZE=true` → `false`；`SUPER_ADMIN_PASSWORD=admin` → `__CHANGE_ME__`，并补注释提示部署前必改。
- `server/src/main.ts` 既有逻辑：生产环境默认 JWT_SECRET 缺失即拒绝启动（保留）。

### 🔎 残留依赖告警（非本次改造引入，且不可达）
- `npm audit --omit=dev`（server 生产依赖）仍报 **1 critical（tar）+ 17 high**，但全部为 **传递依赖**：`tar`（critical，路径穿越）与 `lodash`/`canvas`/`multer`/`glob`/`rimraf` 等来自 `pdfjs-dist` 的 `canvas` 链 + `exceljs` 的 `archiver` 链。
- **可达性结论**：本项目代码**从不**调用 `tar` 解包、`_.template`、未授权 `multer` 上传或处理不可信 gzip，**这些告警在现有代码路径下不可触发**。
- **后续建议**：将 `pdfjs-dist` 升级至 v6（移除 `canvas`/`tar` 链）可一并清零该批告警，但属 ESM 破坏性迁移，列为后续技术债，不在本次范围内。

### 🧪 验证
- `cd server && npm run build` → ✅ 通过（0 error）。
- `cd web-app && npm run build` → ✅ 通过（0 error，Dashboard 产物正常）。
- web-app 生产依赖 `npm audit --omit=dev` 仍为 **0 漏洞**（不变）。

---

## 七、遗留待办执行状态（#181 / #182 / #183）

> 来源：会话尾段用户指令「继续全部做完」，将三项独立待办收口。

### ✅ #181 启动 web-app 开发服务器（端口 5202）
- 用托管 Node 22（`C:\Users\linfa\.workbuddy\binaries\node\versions\22.22.2`）启动 `web-app` 的 Vite dev server。
- 验证：`curl http://localhost:5202/` 返回 **HTTP 200**，VITE v6.4.3 正常监听。
- 状态：**已完成并持续运行**。

### ✅ #182 拆分小程序 mock-data.js 为模块化文件
- 将单体 `mini-program/src/common/mock-data.js`（613 行）拆分为 `src/common/mock/` 下：
  - `data.js`：原始数据常量与生成函数（`CLASSES/STUDENTS/GRADES/EXAMS/...`、`makeScores`/`idsOf`/`todayStr` 等），统一 `export`。
  - `endpoints/{academic,auth,ai,security,im,parent,admin}.js`：按业务域拆分端点定义，导出 `xxxEndpoints`。
  - `index.js`：聚合所有域模块 + 复用原 `getMockData`/`hasKnownMock` 逻辑，对外导出 `getMockData`/`MOCK`/`hasKnownMock`（**API 完全不变**）。
- 修改 `mini-program/src/common/request.js:3` 由 `from './mock-data'` 改为 `from './mock'`（唯一引用点）。
- 补装缺失依赖 `@qiun/ucharts`（package.json 已声明但 node_modules 缺，导致 `analysis.vue` 解析失败）。
- 验证：`npm run build:mp-weixin` → **DONE Build complete**，产物 `dist/build/mp-weixin` 存在。
- 状态：**已完成**。原 `mock-data.js` 已停用（可择机删除）。

### ⛔ #183 启动 NestJS 后端服务（端口 3000）— 环境阻塞，已诊断
- 已尝试启动：`nest start`（托管 Node 22）。应用**编译通过并 boot 至 DB 连接步骤**，随后报错：
  ```
  [ERROR] [TypeOrmModule] Unable to connect to the database. Retrying (1)...
  Error: connect ECONNREFUSED 127.0.0.1:3306
  ```
- 根因（环境限制，非代码问题）：
  1. 沙箱**无 MySQL 服务**：`mysqld`/`mysql` 客户端与 Docker 均不可用；`C:/ProgramData/MySQL` 仅残留配置/数据目录，二进制缺失。
  2. `.env.example` 中 `DB_HOST=cdb-xxx.mysql.tencentcdb.com`（腾讯云），该主机在本沙箱**网络不可达**；且仓库原本**无 `.env` 文件**（仅 `.env.example`）。
  3. 代码本身（含前述安全改造）编译/启动有效，仅缺可连接的数据库实例。
- 启动时的附带告警：`canvas` 原生模块未编译（`../build/Release/canvas.node` 缺失），pdfjs-dist legacy 仅在该告警下做 polyfill，**不影响 boot**，但真实 PDF 渲染需补装 `canvas` 构建（系统级原生依赖，后续技术债）。
- 解锁条件（满足任一即可运行）：
  1. 本地安装并启动 MySQL 8.0，于 `.env` 配置 `DB_HOST=127.0.0.1`、`DB_PORT=3306`、`DB_USER/DB_PASSWORD/DB_NAME`；
  2. 或在具 Docker 的环境 `docker run -d -p 3306:3306 mysql:8` 后配置 `.env`；
  3. 或配置可达的腾讯云/远程 MySQL 连接串。
- 处理：为验证启动而临时创建的占位 `.env` 已清理，仓库恢复为仅 `.env.example`。
- 状态：**代码就绪，环境阻塞**；待数据库就绪后 `npm run start:dev`（或 `nest start`）即可监听 3000 端口。
