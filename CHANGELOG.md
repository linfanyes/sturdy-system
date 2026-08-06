# 更新日志 (Changelog)

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。记录所有版本的显著变更。

---

## [Unreleased]

### 安全修复
- **CI/CD**：移除 `continue-on-error: true` 和 `|| true` 绕过，确保测试和类型检查真正拦截问题
- **小程序依赖升级**：将 `xlsx` 从 `^0.18.5` 升级到 `^0.20.3`，修复 CVE-2023-30533 原型污染漏洞
- **超管密码加密**：`SUPER_ADMIN_PASSWORD` 现在支持 bcrypt 哈希格式（`$2b$...` 开头）
- **生产环境启动检查**：如果 `SUPER_ADMIN_PASSWORD` 未使用 bcrypt 哈希格式，生产环境拒绝启动

### Bug 修复
- **switchRole 逻辑矛盾**：从 `switchRole` 中移除 `g_token` 写入操作，修复与 `readToken()` 修复冲突导致的角色误判问题
- **多实例迁移锁**：使用 MySQL 命名锁 `GET_LOCK()` 保护迁移过程，防止云托管多副本并发执行迁移

### 重构
- **AuthService 拆分**：将 ~460 行的巨型 AuthService 重构为 Facade，新增 `WechatAuthService` 专门处理微信登录和绑定逻辑
- **AiService 拆分**：将 ~730 行的巨型 AiService 重构为 Facade，拆分为：
  - `AiChatService` - 对话核心（流式/同步/结构化解析/上下文缓存）
  - `AiFileParserService` - 文件解析（TXT/PDF/Excel/Magic Bytes）
  - `AiVisionService` - 视觉识别（OCR/图片识别）
  - `AiMediaService` - 媒体生成（文生图/文生视频/ASR）

### 改进
- **安全自检增强**：生产环境新增超管密码格式验证
- **废弃代码隔离**：将 `_deprecated_orphan_pages` 加入 .gitignore
- **TypeORM 产物排除**：将 `server/dist/` 加入 .gitignore

### 重构（复用改造阶段 2：跨端 API 层统一 + 鉴权抽象 + 图片规范）
- **shared/api/endpoints.ts**：后端端点契约集中化 —— game-scores（submit/list/byKey）+ chat-sessions（create/list/byId/messages/pin/remove）端点路径常量 + 请求/响应 DTO 类型。Web 端 `web-app/src/api/games.ts`、`chat.ts` 改为从 shared 导入（适配器层仍走 request，行为零变化）。
- **shared/utils/sse-parser.ts**：新增 `createSSEParser` + `parseSSELn`，统一 SSE 分片解析 + `[DONE]` 协议。Web 端 `teacher.ts::aiChatStream` 内联逐行解析已替换为 `parseSSELn`（TS）。小程序端 `mini-program/src/common/request.js::streamChat::feed()`（JS）内联 SSE 分片解析已替换为 `createSSEParser` Promise 包装（I1）—— 两端 SSE 分片协议处理至此完全收敛到 shared。
- **shared/utils/security.ts**：导出 `isSessionInvalid(msgText)` 函数（正则：登录已过期|未登录|缺少令牌|账号已禁用|登录已关闭|账号已被禁用）。Web `request.ts` 和 mini `request.js` 两端 401 会话失效判断统一调用此函数，消除正则字面量漂移。
- **shared/utils/game-mappings.ts + game-helpers.ts**：gameKey→显示名权威映射（35+ 游戏）+ `GAME_SCORE_SUBMIT_THROTTLE_MS`（5000ms）+ `rand/shuffle/clamp/fmtTime/createThrottle` 通用工具。小程序 `common/game-score.js` 已切换从 shared 导入。
- **shared/utils/student.ts + general.ts**：`defaultParentPassword(studentNo)` + `safeParse/isNotNull/delay/deepClone` 等通用工具，后续步骤继续接入两端。
- **shared/auth/machine.ts**（新增）：鉴权状态机接口 `IAuthStateMachine` / `IAuthStateMachineWithEvents` / `AuthPersistence` / `IAuthMachineOptions`，统一 login/logout/restore/switchRole 语义；类型 `AuthUser / Credentials / LoginResult / Role / AuthError`；JWT 辅助 `isJwtLike / parseJwtPayload / isJwtExpired`（跨端 atob base64 解码，无 Node Buffer 依赖）。作为阶段 2 契约层 —— 各端 store 实现保留；阶段 3 可收敛为同一状态机 + Persistence Adapter。
- **shared/constants/index.ts**：Role 类型改为从 `auth/machine` re-export，auth 作为权威源；shared/index.ts 星导出 auth 模块。
- **shared/index.ts / package.json / tsconfig.json**：导出映射新增 `api/*` / `utils/*` / `auth/*` 子路径；tsconfig include 扩容。
- 小程序端 `chat-history.js` 的本地会话同步逻辑保留不动（行为零变化）；~~`util.js::safeParse` 因行为差异保留不动，待阶段 3 统一。~~ ✅ 阶段 2 收尾：`util.js::safeParse` 实现已删除，改为 `export { safeParse } from '@gardener/shared/utils/general'`，行为收敛为单一源。
- shared `package.json` exports 新增 `./utils/general` 映射。
- 共享 dist 重建（含新增 `utils/general` 产物）。
- **docs/image-compression-spec.md**（新增）：图片压缩策略规范 v1.0 —— 统一 Web / 小程序端 maxWidth=1280 / quality 0.8（/80）参数；明确降级、校验清单、后端无关化原则。

### 重构（复用改造阶段 3 完成：auth 状态机收敛 + schema 提升 + Web 端 schema-driven 渲染器 + 工具中心）
- **shared/schemas/crud-schema.ts**（迁移自 `mini-program/src/common/crud-schema.js`）：通用 CRUD 实体字段配置（29 个实体），新增 `CrudFieldType / CrudFieldDef / CrudEntityDef / CrudSchema` 类型。
- **shared/schemas/subject-schema.ts**（迁移自 `mini-program/src/common/subject-schema.js`）：学科 AI 工具配置（21 项 = 语文 7 + 英语 9 + 科学 3 + 道德与法治 3）、学科清单（SUBJECT_LIST 5 科 / ALL_SUBJECTS 15 科）、数学独立工具（MATH_TOOLS 6 项）。新增 `SubjectToolFieldDef / SubjectToolDef / SubjectListItem / MathToolItem / ToolMenuItem` 类型。函数 `getSubjectTool / getToolsBySubject` 直接导出。
- **shared/schemas/quicktool-schema.ts**（迁移自 `mini-program/src/common/quicktool-schema.js`）：通用 AI 工具配置（18 项）。新增 `QuickToolFieldDef / QuickToolDef / QuickToolSchema` 类型。函数 `getQuickTool` 直接导出。
- **shared/schemas/index.ts**：星导出三份 schema。
- **shared/package.json**：exports 新增 `./schemas` `./schemas/crud-schema` `./schemas/subject-schema` `./schemas/quicktool-schema`。
- **shared/tsconfig.json**：include 加 `schemas/**/*.ts`；移除 `noPropertyAccessFromIndexSignature`（schema 场景触发过于频繁，其余 strict 项仍生效）。
- **shared/index.ts** 星导出 `./schemas/index.js`。
- 小程序端 `mini-program/src/common/crud-schema.js / subject-schema.js / quicktool-schema.js` 从直接实现改为 re-export from `@gardener/shared/schemas/*`，保留原 import 路径（5 处 importer 无感）。
- 小程序端 `mini-program/test/subject-schema.spec.ts` 路径与正则适配 TS 版 schema。
- **web-app/src/views/_schema_crud/SchemaCrudPage.vue**（新增）：Schema-driven 通用 CRUD 渲染器。支持两种调用方式：`route.params.entity`（独立 URL `/schema-crud/:entity`）或 `<SchemaCrudPage entity="x" />`（router component props 模式，prop 优先）；从 `CRUD_SCHEMA[entity]` 取配置、映射为 `FieldDef[]`，复用已有 `CrudTable.vue`。
- **web-app/src/router/index.ts**（深度批量替换，复用改造关键推进）：原教师模块 26 条手工 view 路由（均基于 `CrudTable.vue` 直配 FieldDef 数组）批量替换为 SchemaCrudPage + props.entity 映射。原 view 文件 27 个移至 `web-app/src/views_deprecated/manual_views/` 备份（保留回滚能力）。路由名 / title / feature 全部保留 → 菜单通过 route name 引用自动生效。新增 27 条 `schema-crud/:entity` 路由（可作为独立 URL 进入）。路由 ↔ 实体映射示例：route `papers` → entity `generated/papers`、`duty-roster` → `duty-rosters`、`attendance` → `attendances`、`class-finance` → `class-expenses` 等。SchemaCrudPage 升级：`props.entity` 优先 + 保留 `route.params.entity` 兼容。
- shared dist 完整重建（含 schemas/ 产物）。
- **鉴权状态机收敛（阶段 3 核心）**：
  - **shared/auth/factory.ts**（新增）：跨端通用鉴权状态机工厂 `createAuthMachine(opts)` —— 注入 `loginFn + persistence + revokeFn`，实现 login/logout/restore/switchRole 四大操作统一语义；多角色快照 `multiRole`（师兼家 / 超管/校管 token 分存）；事件系统 `on('login'|'logout'|'switchRole'|'restore'|'tokenExpired')` 订阅导出；通用 persistence 工厂 `createKvPersistence / createLocalStoragePersistence`。
  - **shared/auth/index.ts** 星导出 `./factory.js`。shared `package.json` exports 新增 `./auth/factory`。
  - **web-app/src/stores/auth-machine.ts**（新增）：Web 侧 Pinia store 包装。localStorage 适配器（key 沿用 `trace_web_token/trace_web_user` 向后兼容 + 新增 `trace_web_multi_role`）；loginFn 适配 `authApi.unifiedLogin`；事件订阅 → 同步更新 Pinia token/user/role/effectiveFeatures/schoolFeatureFlags ref；保留 Web 侧 `fetchMe / applyFeatureProfile / loginByUserName / loginAs*` 旧 API。
  - **mini-program/src/common/auth-machine.js**（新增）：小程序侧适配器。wxStorage 持久化 key 对齐 route-guard 角色优先级（`admin_token > sa_token > g_parent_token > g_token`），`loadLogin` 同链路回读；loginFn 走 `api.post('/auth/unified-login')` 适配返回结构（含 needsRoleChoice、双身份 parent）；`bindAuthMachine(authReactive)` 注册事件桥接 → 把 machine 状态同步写入 reactive `auth.token / auth.user`。
  - **mini-program/src/common/store.js** 接入 authMachine：`logout()` 走 machine.logout()（清 storage 全量）、reactive immediate 同步兜底；`getToken()` 优先 `authMachine.token`；`switchRole` / `setDualTokens` / `setParent` 写双身份 machine 多角色快照。
  - **mini-program/src/App.vue** 启动集成：`onLaunch` 注册 `bindAuthMachine(auth)` + `authMachine.restore()` 异步冷启动恢复（不阻塞首页跳转；route-guard 同步检测仍基于 storage）。
- **Web 端工具中心 schema 驱动落地**：
  - **web-app/src/views/tools/AIDetailPage.vue**（新增）：通用 AI 工具详情页，根据 `?key=subject-tool-key` 或 `?q=quicktool-type` 动态渲染表单（input/number/textarea/select四类），submit 走 `schema.build(form)` → `/ai/chat-sync`。统一替代此前各学科分散的人工表单 view。
  - **web-app/src/views/tools/SubjectTools.vue / SubjectList.vue / SubjectDetail.vue** 改为消费 shared schema：`SUBJECT_LIST` (SubjectTools/SubjectList) 与 `getToolsBySubject(subject)` (SubjectDetail) 替换内部写死数据。
  - **web-app/src/router/index.ts** 新增 `tools/ai`（name: teacher-ai-detail）路由指向 AIDetailPage（同时 subject/:subject 路由也引 SubjectDetail → 点具体工具跳 `tools/ai?key=...` / `tools/ai?q=...`）。

### 新增（Web / 小程序功能对齐）
- **小游戏得分云端同步**：
  - 后端新增 `game-scores` 模块（按教师租户隔离，幂等 upsert 最高分）+ 迁移 `0022_game_scores.sql`（root `migrations/`）。
  - Web 端：`api/games.ts` 上报/查询接口 + `GamesIndex.vue` 得分榜 + `installGameScoreReporter` 全局自动上报（补丁 `Storage.setItem`，覆盖全部游戏，零侵入）。
  - 小程序端：`common/game-score.js` + `useGame.submitScore` 自动上报 + 游戏索引得分榜。
- **AI 对话历史**：
  - 后端新增 `chat-sessions` 模块（会话增删改查 + 置顶 + 消息追加）+ 迁移 `0023_chat_sessions.sql`（root `migrations/`）。
  - Web 端：`api/chat.ts` + `AiChat.vue` 新增会话历史侧栏（新对话/打开/置顶/删除）、自动持久化用户与 AI 消息。
  - 小程序端：`common/chat-history.js` 将本地会话同步到后端，实现跨端历史打通。
- **家长端补缺**：Web 新增家长「专项资源库」页面（古诗词/数学公式/英语单词，`/parent/resources`），家长看板新增「教材知识点」「专项资源库」快捷入口。
- **小程序校管补缺**（对齐 Web 校管）：`school-admin.vue` 新增班级/学生批量导入（Excel/CSV + AI 识图）、班级升级（`/classes/:id/promote`）、班级/学生 XLS 导出入口。
- **复用改造计划**：产出 `复用改造实施计划.md`（分 3 阶段，首推先统一本次新增的得分/会话两端 API 层）。
- **A 类对齐（小程序补缺）**：
  - 经页面级 diff，小程序已覆盖 Web 所有核心功能模块（AI、班级、学生、成绩、教材、办公、通知、家长……）且调用相同后端 API。
  - 唯一真缺：小程序「教师通讯录」仅含列表/增删，现已新增 `pages/community/teacher-detail.vue` 教师详情页（调用已有 `GET /teachers/:id/detail`，聚合账号 + 通讯录 + 任课班级 + 班主任身份）、在通讯录列表每一项加「详情」入口、在 `pages.json` 注册路由。

---

## [3.0.0] - 2025-08-01

### 新增
- 微信小程序云托管部署支持
- AI 助手功能（多模态对话、图片 OCR、文生图、语音识别）
- 家长-教师双角色切换支持
- 三级页返回条
- 教师导入学生功能修复
- 专项资源库改名

### 安全
- CORS fail-closed 策略
- SSRF 防护（AI 出站地址仅允许 HTTPS 公网）
- 文件 Magic Bytes 校验
- 密码 bcrypt 升级路径
- 登录安全自检（JWT_SECRET 弱密钥检测、默认超管账号检测）

### 修复
- 校管 401 误判为会话失效
- 微信小程序登录兼容性

---

## [2.x.x] - 2025-06

### 新增
- uni-app 小程序 H5 支持
- 教师通讯录
- 成绩管理模块
- 多校区管理

---

## 版本格式说明

- `Added`：新功能
- `Changed`：已有功能变更
- `Deprecated`：即将移除的功能
- `Removed`：已移除的功能
- `Fixed`：Bug 修复
- `Security`：安全相关修复

---

## 升级指南

### 超管密码加密升级

如果你当前在生产环境使用明文 `SUPER_ADMIN_PASSWORD`：

1. 生成 bcrypt 哈希：
   ```bash
   node -e "const b=require('bcrypt');console.log(b.hashSync('你的强密码',10))"
   ```

2. 更新环境变量 `SUPER_ADMIN_PASSWORD` 为生成的哈希值（以 `$2b$` 开头）

3. 重启服务验证

### xlsx 依赖升级

```bash
cd mini-program
# 修改 package.json 中 xlsx 版本后
npm ci
```

升级后请验证 Excel 导入功能是否正常。

---

## 报告安全问题

如发现安全问题，请通过 Issue 或邮件联系维护者。严重安全问题可直接提交至项目安全频道。
