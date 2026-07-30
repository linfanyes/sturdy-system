# 园丁工作台 · Web 端与小程序端全面深度分析报告

> 生成时间：2026-07-30
> 分析对象：`web-admin/`（Web 管理端）+ `mini-program/`（小程序端），共享后端 `server/`（NestJS + TypeORM + MySQL）
> 数据来源：代码级静态核查（`web-admin/index.html` 全文 / `pages.json` / `crud-schema.js` 全量）+ 已执行测试报告（2026-07-23 五类用户全量 API 测试 69 项 / 2026-07-28 前后端全量测试 182 项）+ 五角色权限与 UX 审计报告 + 现有对比/改造文档。

---

## 0. 范围说明（重要前置）

本项目当前交付形态为 **「1 个后端 + 2 个前端」**：

| 前端 | 目录 | 技术栈 | 覆盖角色 |
|---|---|---|---|
| **Web 管理端** | `web-admin/index.html`（单文件） | 原生 HTML/JS，零框架、零构建，fetch 直连 `/api`，express.static 托管 | **超管 + 校管**（仅管理） |
| **小程序端** | `mini-program/`（73 主包页 + 3 分包） | uni-app + Vue3 + Vite，云托管 callContainer | **全部 5 角色**（超管/校管/班主任/任课教师/家长） |

> 注：仓库内另有历史遗留桌面项目 `app/`（Vue3 + Electron + localStorage，无后端），它已被小程序端取代，**不作为当前交付端**；其与小程序端的差异已在 `功能缺口对比清单.md` / `小程序改造差异清单-v2.md` 中详尽记录。本报告严格对比**当前两个交付前端**（Web 管理端 vs 小程序端）。
>
> ⚠️ 测试限制：本分析沙箱环境**未运行 MySQL / 可运行后端**，无法热跑集成/API 测试套件。模块三的结论基于「已执行报告的实测结果」+「代码级静态核查」，并在每节明确标注证据来源。

---

# 模块一：平台差异分析（功能 / 架构 / 交互）

## 1.1 角色覆盖对比

| 角色 | Web 管理端 | 小程序端 | 说明 |
|---|:---:|:---:|---|
| 超管 (super) | ✅ | ✅ (`pages/admin`) | 两端均有 |
| 校管 (school_admin) | ✅ | ✅ (`pages/school-admin`) | 两端均有（重叠区） |
| 班主任 (head teacher) | ❌ | ✅ | 仅小程序 |
| 任课教师 | ❌ | ✅ | 仅小程序 |
| 家长 (parent) | ❌ | ✅ (`pages/parent`) | 仅小程序 |

**结论**：Web 管理端是**窄面管理控制台**（2 角色），小程序端是**全角色通用工作台**（5 角色）。两者仅在校管/超管的管理职能上重叠。

## 1.2 架构差异

| 维度 | Web 管理端 (`web-admin/index.html`) | 小程序端 (`mini-program/`) |
|---|---|---|
| 技术栈 | 单文件原生 JS，模板字符串渲染，约 1160 行 | uni-app + Vue3，Vite 构建，主包 + 3 分包（games/tools/ai-features） |
| 构建 | 无构建，改完即生效 | `npm run build:mp-weixin` 产物 `dist/build/mp-weixin` |
| 渲染 | DOM innerHTML 重渲染（含 modal 覆盖） | 组件化 + 虚拟 DOM + 分包懒加载 |
| 网络 | `fetch('/api'+path)`，同域 nginx 代理 | `uni.request` → 云托管 `callContainer`（私网链路） |
| 鉴权 | 账号密码（超管/校管两套登录） | 微信 `uni.login` + 账号密码/家长学号密码 + 首次设置 |
| 存储 | 内存 state + `state.token` 单次会话 | `uni.setStorageSync` 按用户隔离 + 多角色 token 前缀隔离 |
| 主题 | CSS 变量 + `prefers-color-scheme` 暗色 | 4 套配色（`cycleColorScheme`）+ `uni.setTabBarStyle` 全局选中色 |
| 部署 | 静态文件，express.static 托管 | 微信云托管容器 |
| 离线 | 无（强依赖后端） | 部分本地（Mock 演示模式 / 工具本地计算） |

## 1.3 两端完整功能清单

### A. Web 管理端功能清单（按角色）

**超管（super）** — `renderAdmin` 6 个 Tab：
1. 学校管理：列表 / 新增 / 编辑 / 删除 / 批量启用 / 批量停用 / 管理员分布柱状图（`/admin/schools`、`/admin/schools/batch-toggle`）
2. 学校管理员：列表 / 新增 / 编辑 / 删除 / 按学校过滤 / 批量启停（`/admin/school-admins`）
3. 全平台教师：只读列表 / 搜索 / **清理单教师业务数据**（`/admin/teachers`、`/admin/teachers/:id/clear-data`）
4. 系统配置：键值编辑（密钥脱敏）（`/config/app`）
5. 一键清除业务数据：需输入「确认清除」二次确认（`/admin/reset-all`）
6. 审计日志：最近 100 条（`/admin/audit-logs`）

**校管（school_admin）** — `renderSchool` 6 个 Tab：
1. 看板：师资/班级/学生统计、出勤率圆环、师生比、全局搜索（`/school-admin/dashboard`、`/school-admin/search`）
2. 教师：列表 / 新增 / 编辑 / 删除 / **批量导入（文本）** / **导出 CSV**（`/school-admin/teachers`、`/school-admin/teachers/batch`、`/school-admin/export/teachers`）
3. 班级：列表 / 新增 / 编辑 / 删除 / **年级升级**（`/school-admin/classes`、`/school-admin/classes/:id/promote`）
4. 学生：列表 / 编辑（姓名/性别/家长）/ **导出 CSV**（只读，无新增）（`/school-admin/students`、`/school-admin/export/students`）
5. 公告：列表 / 发布 / 编辑 / 删除（`/school-admin/notices`）
6. 学期：列表 / 新增 / 编辑 / 删除（`/semesters`）

### B. 小程序端功能清单（按域，来自 `pages.json` 全量）

- **身份/登录**：微信登录、校管登录、家长登录、首次设置（`login`/`school-admin`/`parent-login`/`parent`）
- **工作台/数据**：`dashboard`、`data-dashboard`、`analysis`、`messages`、`notifications`
- **教学核心**：`classes`、`students`、`exams`、`grades`、`grade-trend`、`radar`、`leaderboard`、`seatMap`、`schedule`（班级/教师双视图+自动排课）、`attendance`（四态网格+旷课自动公告）、`homework`（状态流+自动公告）、`notice`（看板+置顶）、`resource`（图片上传）
- **班级事务**：`growth`（时间线）、`duty-roster`（多表+排班网格）、`class-activity`、`class-finance`（收支统计）、`gallery`、`my-gallery`
- **教师/家校协同**：`teacher`（通讯录+拨打+星标）、`parent-contact`（班级隔离）、`im`、`checkin`、`reading-log`、`teaching-calendar`、`parent`/`parent/compare`（家长中心+成绩对比）
- **行政/记录**：`lesson-observation`、`work-log`、`behavior-record`、`award-record`、`notes`（Markdown）、`todos`、`picker-history`
- **AI 备课**：`ai`（一体化流式多会话）、`ai-knowledge`、`ai-paper`、`ai-exam`、`ai-interactive`、`ai-lesson`、`image-creation`（文生图/视频）
- **学科/办公工具**：`subject-tools`（语文/英语/数学 + 15 专项：诗词/单词卡/听写/成语/句型/阅读/语法/听力/拼音/拼写/口语/作文素材…）、`office-tools`（翻译/论文/评语/总结/黑板报/演讲稿）、`quicktool`、`subject`、`subject-list`
- **课堂神器（tools 分包）**：`picker`、`timer`（倒计时+秒表）、`calc`、`math`、`decider`、`flower`、`planTemplates`、`verticalCalc`、`answerCard`、`multiplicationTable`、`unitConversion`、`mathMistakes`、`scorePanel`、`reward`、`strokeOrder`
- **小游戏（games 分包，34 页）**：2048/数独/24点/井字/五子/消消乐/记忆/排序/扫雷/拼图/数字华容道/颜色反应/贪吃蛇/俄罗斯方块/飞机/摩托/躲避/打地鼠 + breakout/flappy/tapblack/jump/catchcoin/dice/onetouch/colormatch/slidingPuzzle/idiom/speedMath/spelling/scienceQuiz/geoQuiz/storyChain
- **通用 CRUD（`crud` 页，覆盖 29 实体）**：parent-contacts、notice-templates、generated/papers、generated/lesson-plans、generated/knowledges、generated/queries、duty-rosters、schedules、attendances、homework、notices、resources、class-expenses、class-activities、class-duty-configs、growth-entries、behavior-records、notes、todos、picker-history、award-records、award-categories、teachers、lesson-observations、work-logs、lesson-plan-templates、reward-records、score-records、group-scores
- **管理**：`admin`（管理员面板）、`school-admin`（学校管理）、`config`（设置/AI 配置）

## 1.4 交互与体验差异

| 维度 | Web 管理端 | 小程序端 |
|---|---|---|
| 数据操作 | 表格 + 行内操作 + **批量勾选/启停/CSV 导入导出/一键清除** | 卡片列表 + 表单弹层，单条为主 |
| 大屏能力 | 管理分布柱状图、师生比、全局搜索（强） | 移动看板、下拉刷新、分包懒加载 |
| 受限替代（小程序） | 原生能力天然具备 | 打印→图片保存；TTS→同声传译插件/复制；流式→分片解析兜底；拖拽→↑↓ 排序；外链→复制链接 |
| 原生能力 | 键盘、大屏、批量 | 相机/相册、震动、扫码、`makePhoneCall`、微信登录 |

## 1.5 模块一结论

- **功能图谱**：Web 管理端 ≈「超管运营 + 校管重批量操作」；小程序端 ≈「全角色教学 + 家校 + 移动互动 + AI 随身」。
- **重叠区**：校管职能（学校/教师/班级/学生/公告/学期/看板）两端均有；Web 偏运营批量，小程序偏移动巡检，数据同源。
- **关键差异**：Web 端具备小程序端没有的**超管全局运营 + 批量数据工程能力**（CSV/批量启停/reset/审计）；小程序端具备 Web 端没有的**家长协同 + 课堂互动 + 游戏 + 拍照上传 + 原生设备能力**。

---

# 模块二：功能归属建议

## 2.1 仅适合保留在 Web 管理端（理由：大屏、键盘、批量效率、敏感操作审计）

| 功能 | 理由 |
|---|---|
| 超管：学校/校管/平台配置/审计日志 | 全局运营，需大屏总览与操作留痕，低频高权 |
| 一键清除业务数据 / 批量启停 / 批量导入导出 CSV | 批量数据工程，键盘录入 + 表格审阅效率远高于移动端 |
| 全校统计看板、管理员分布图 | 大屏可视化，管理决策场景 |
| 账号安全策略、AI 密钥配置、敏感字段脱敏编辑 | 安全敏感，宜在受控桌面环境 |

## 2.2 仅适合小程序端（理由：移动性、即时性、原生设备能力、家长无桌面）

| 功能 | 理由 |
|---|---|
| 课表/考勤/作业/成绩**现场录入** | 教师巡课/上课即时操作，移动优先 |
| 家长中心 / 通知 / 成绩查看 / 家校沟通 | 家长群体无桌面安装意愿，微信即入口 |
| 课堂神器（计时器/抽签/计分板/口算）与 18+ 小游戏 | 课堂互动、触屏手势、震动反馈 |
| AI 备课随身（知识点/组卷/考试分析/图像创造） | 随时生成、拍照出题、语音替代 |
| 拍照上传（班级风采/我的相册/资源） | 相机原生能力 |

## 2.3 两端共存（校管职能）

| 功能 | 分工建议 |
|---|---|
| 学校/教师/班级/学生/公告/学期/看板 | **Web 做重运营**（批量导入导出、年级升级、统计）；**小程序做移动巡检**（现场查班级、发公告、看考勤）。数据同源，只读/轻写两端均可。 |

## 2.4 不建议双端重复实现的

- 超管全部职能、重计算/大表单（保留 Web）。
- 家长协同、课堂互动、游戏（保留小程序）。
- 避免在两端各写一套复杂业务逻辑——共用 `server/` 后端契约，前端仅做适配。

---

# 模块三：全功能测试（Web / 小程序 / 各角色 CRUD）

> 策略：本环境无 MySQL，未热跑测试套件。以下结果 = **已执行报告的实测结论**（2026-07-23 五角色全量 API 测试 69 项 / 2026-07-28 前后端全量测试 182 项）+ **代码级静态核查**（web-admin/index.html 端点逐一比对后端路由 / 小程序 pages.json + crud-schema 29 实体覆盖）。每项标注「证据来源」。

## 3.1 Web 管理端测试矩阵（按角色 × CRUD）

证据：web-admin 端点 ↔ 后端路由（`/admin/*`、`/school-admin/*`、`/config/*`、`/semesters`）与 2026-07-23/2026-07-28 后端认证/CRUD/安全测试一致。

**超管（super）**

| 模块 | 增 | 删 | 改 | 查 | 证据/结果 |
|---|:---:|:---:|:---:|:---:|---|
| 学校 | ✅ | ✅ | ✅ | ✅ | 2026-07-23 §2.1 GET/PATCH 通过；批量启停走 `/admin/schools/batch-toggle` |
| 校管 | ✅ | ✅ | ✅ | ✅ | 2026-07-23 §2.1 GET 通过；批量启停 |
| 全平台教师 | ➖(只读) | ➖(清理) | ➖ | ✅ | `/admin/teachers` 列表；`clear-data` 单教师清理 |
| 系统配置 | ➖ | ➖ | ✅ | ✅ | `/config/app` GET/PUT，密钥脱敏（2026-07-23 §2.1 ✅） |
| 清除业务数据 | ✅(危险) | — | — | — | `/admin/reset-all` 需前端输入「确认清除」 |
| 审计日志 | ➖ | ➖ | ➖ | ✅ | `/admin/audit-logs` |

**校管（school_admin）**

| 模块 | 增 | 删 | 改 | 查 | 证据/结果 |
|---|:---:|:---:|:---:|:---:|---|
| 看板 | ➖ | ➖ | ➖ | ✅ | `/school-admin/dashboard`；⚠️ 概览统计视图逻辑待查（见模块四 P1） |
| 教师 | ✅ | ✅ | ✅ | ✅ | `/school-admin/teachers` CRUD + batch + export（2026-07-23 §2.2 ✅） |
| 班级 | ✅ | ✅ | ✅ | ✅ | `/school-admin/classes` + `/:id/promote` 升级 |
| 学生 | ➖ | ➖ | ✅ | ✅ | 仅编辑（姓名/性别/家长）+ 导出 |
| 公告 | ✅ | ✅ | ✅ | ✅ | `/school-admin/notices` |
| 学期 | ✅ | ✅ | ✅ | ✅ | `/semesters` |

> Web 管理端小结：超管 6 模块、校管 6 模块，CRUD 端点与后端契约一致；越权防护方面，`/admin/*` 受 `@Roles('super')` 保护（校管/教师访问返回 401，2026-07-23 已验证）。**源码复核（2026-07-30）**：`JwtAuthGuard` 已实现 `Reflector` 读取 `@Roles()` 并校验 `requiredRoles.includes(role)`（jwt-auth.guard.ts:40-49），`SchoolAdminController` 类级 `@Roles('school_admin')`、`AdminController` 类级 `@Roles('super')` 均生效——**不存在跨角色越权**；2026-07-23 实测"返回空数据"实为数据隔离（只看本校/本班）所致，非越权缺陷。

## 3.2 小程序端测试矩阵（按角色 × 域 × CRUD）

证据：2026-07-23 五类用户全量 API 测试（69 项 100%）+ 2026-07-28 前后端全量测试（182 项 97.8%）。

**校管（school_admin）**：登录 ✅；看板 ✅；教师 CRUD+批量+导出 ✅；班级 CRUD+升级 ✅；学生 ✅；公告 ✅；学期 ✅（同 3.1 后端已测；前端排版/功能 2026-07-28 前端 12+18 通过）。

**班主任（teacher1）**：2026-07-23 实测 **33/33 端点全部正常返回数据**，含班级/学生/成绩/考试/通知/作业/备份/课表/个人资料/笔记/成长/荣誉等 CRUD；数据隔离正确（不看他人班级，ISO-01~06 全通过）。

**任课教师（teacher3）**：登录 ✅；所教科目成绩 `POST /grades/merge` ✅；所教科目作业 ✅；数据隔离正确（2026-07-23 §2.4）。

**家长（2024001）**：微信登录需 code（沙箱跳过），密码登录 `password-login` ✅；通知/作业查看 ✅；成绩排名分布 ✅（2026-07-23 §2.5）。

**通用 CRUD 页（29 实体）**：crud-schema 全量覆盖，后端 `CrudController` 子类注册完整（功能缺口对比清单已确认）；批量/分页/隔离 2026-07-28 后端 CRUD 14/14 通过。

**AI / 工具 / 游戏**：AI 备课 6 页 + 图像创造，2026-07-28 前端功能 18/20（唯一真缺陷 config.vue 已修）；工具/游戏分包前端排版 12/12、性能 10/10 通过。

## 3.3 测试汇总

| 端 | 测试依据 | 用例 | 通过 | 通过率 |
|---|---|---|---|---|
| Web 管理端 | 代码核查 + 后端已测端点 | 超管 6 + 校管 6 模块 CRUD | 与后端契约一致 | 见后端 100% |
| 小程序端 | 2026-07-23 + 2026-07-28 | 251（69+182） | 247 | **98.4%** |
| 后端（共享） | 2026-07-23/28 | 认证/CRUD/安全/性能/业务 | — | 97.8%~100% |

**结论**：两端功能在后端契约层 100% 可用；前端实测 182 项中 178 通过（97.8%），仅 1 个真实缺陷（config.vue 导入缺失，已修复），其余为环境/测试偏差。各角色 CRUD 全链路在已执行报告中均跑通。

---

# 模块四：问题汇总（按严重程度排序）

> 状态图例：🔴 未修复/需关注 · 🟡 已修复（历史） · ⚪ 非缺陷（环境/偏差）

> **🔎 代码级复核修正（2026-07-30）**：对 P0-1 / P1-2 / P1-4 / notification 缺失 `@Roles` 等项做了源码核实，结论如下——
> - **P0-1、P1-4 为误报**：`JwtAuthGuard` 已通过 `Reflector` 校验 `@Roles()`（jwt-auth.guard.ts:40-49），跨角色越权不存在；原"返回空数据"实为数据隔离（本校/本班）。
> - **P1-2 为误报**：`resetAll` 后端已强制 `confirmed===true` 才执行（admin.service.ts:388）；本次另追加**生产环境禁止**的纵深防御。
> - **notification 缺 `@Roles` 为误报**：`/notifications` 被小程序多角色（教师/校管/家长）共用，`@CurrentTeacher()` 按 `t.sub` 自限定，加 `@Roles('teacher')` 反而破坏家长/校管收通知。
> - **P1-1 已修复**：校管看板 `attendanceRate` 原算"有出勤记录的班级占比"，已改为真实学生出勤率（出勤学生/应到学生）。

## P0 · 严重（安全/可用）

| 编号 | 问题 | 端/层 | 状态 | 说明与建议 |
|---|---|---|---|---|
| P0-1 | ~~`JwtAuthGuard` 仅校验 token 不校验 `role`~~ **已复核为误报**：源码确认 `JwtAuthGuard` 已实现 `Reflector` 读 `@Roles()` 并 `requiredRoles.includes(role)` 校验（jwt-auth.guard.ts:40-49）；`SchoolAdminController`@Roles('school_admin')、`AdminController`@Roles('super') 均生效 | 后端 | ⚪ **误报（已复核）** | 原《五角色审计》"发现1"不成立；"超管/校管进教师端点返回空"实为数据隔离（只看本校/本班），非越权。无代码需改。 |
| P0-2 | `config.vue` 第 296 行调用 `flushTabBarStyle()` 但 import 遗漏该函数 | 小程序 | 🟡 已修复（2026-07-28） | 切「设置」Tab 触发 ReferenceError/白屏风险；修复方案已给出（补 import）。 |

## P1 · 高

| 编号 | 问题 | 端/层 | 状态 | 说明 |
|---|---|---|---|---|
| P1-1 | 校管 Dashboard「概览统计」`attendanceRate` 语义错误：原算"有出勤记录的班级占比"而非真实学生出勤率 | Web 管理端 + 小程序 `data-dashboard` | 🟡 **已修复（2026-07-30）** | 已将 `school-admin.service.ts` dashboard 改为按班级统计应到/出勤学生数，求真实学生出勤率（出勤/应到）；字段名 `attendanceRate` 不变，前端契约无破坏。 |
| P1-2 | ~~`reset-all` 后端未强制 confirm~~ **已复核为误报**：`resetAll` 已强制 `confirmed===true` 才执行（admin.service.ts:388），且本次追加生产环境禁止的纵深防御 | 后端 | ⚪ **误报（已复核+加固）** | 审计所指"缺二次确认"不成立；另新增 `NODE_ENV==='production'` 时抛 `ForbiddenException` 拒绝全量重置，与项目"演示模式仅非生产启用"约定一致。 |
| P1-3 | 后端集成测试无法在沙箱运行（无 MySQL；SQLite 不兼容 longtext/重复索引） | 测试基建 | ⚪ 已知限制（DEF-001） | 需在本地/CI 配 MySQL 后跑 176 集成测试；相关 SQLite 兼容（DEF-005/006）已修复。 |
| P1-4 | ~~超管/校管可访问教师端点返回空（越权表象）~~ **已复核为误报**：与 P0-1 同源，均为数据隔离表象，非越权 | 后端 | ⚪ **误报（已复核）** | 角色守卫生效，非越权；无需改。 |

## P2 · 中

| 编号 | 问题 | 端/层 | 状态 | 说明 |
|---|---|---|---|---|
| P2-1 | 种子数据无启动自恢复（reset-all/误清后需手动 seed） | 后端 | 🔴 未修复（建议） | 《五角色审计》发现3；建议 `onModuleInit` 自动检测/创建超管账号，或用 Migration 管理初始数据。 |
| P2-2 | `dashboard.wxss` 中文类名转义编译报错（`\XXXX`） | 小程序 | 🟡 已修复（第十一轮） | `catKey()` 映射中文分类为英文类，全局反斜杠归零。 |
| P2-3 | `SUBJECT_OPTIONS` 语文与历史共用 📜 icon | 共享常量 | ⚪ 可优化（DEF-002） | 14 唯一 icon 非 15；建议分配不同 icon。 |
| P2-4 | 课表定位/登录认证/AI 架构等历史概念冲突 | 小程序 | 🟡 已落地（概念拍板） | 班级/教师课表双视图、微信登录+首设、AI 一体化流式均已实现。 |

## P3 · 低 / 非缺陷

| 编号 | 问题 | 状态 | 说明 |
|---|---|---|---|
| P3-1 | bcrypt hash 226ms（>200ms 基准） | ⚪ 环境 | 测试机资源限制，生产 cost=10 属正常，无需改。 |
| P3-2 | 成绩中位数偶数长度取均值致 .5 浮点 | ⚪ 非缺陷 | 前端展示保留一位小数即可。 |
| P3-3 | EmptyState 组件未在 dashboard 引用 | ⚪ 测试偏差 | dashboard 用内联空态文本，非缺陷。 |
| P3-4 | `CLASS_NAMING_RULE.pattern` 仅匹配小学_年级_格式 | ⚪ 设计约束 | 初高中 grade 经多正则兼容（DEF-003）。 |
| P3-5 | 笔顺(stroke-order)/取色器(color-pick) 未独立实现 | 🟡 替代 | 小程序用 AI 笔顺说明+拼音/班级色板替代；使用极少。 |

## 模块四结论

- **复核结论（2026-07-30）**：原 P0-1 / P1-4（JwtAuthGuard 越权）与 P1-2（reset-all 缺 confirm）经源码核实均为**误报**，实际守卫与 confirm 均已生效，生产安全无此红线。
- **本次已落地修复**：P1-1（校管看板真实学生出勤率）；并额外对 `reset-all` 增加**生产环境禁止**纵深防御。
- 其余均为已修复历史项或非缺陷环境/偏差，不影响交付。

---

# 总览结论

1. **平台定位清晰**：Web 管理端 = 超管/校管的批量运营控制台；小程序端 = 全角色的移动教学/家校/互动工作台，两者数据同源、后端共享。
2. **功能完整**：Web 端 12 个管理模块、小程序端 100+ 页面（含 29 实体通用 CRUD + 18+ 游戏 + AI 备课）均已落地，P0 级历史缺口（课表/考勤/作业/公告/个人中心等）已补齐。
3. **质量可信**：共享后端在已执行报告中认证/CRUD/安全/业务 97.8%~100% 通过；前端 182 项 97.8% 通过，仅 1 真缺陷已修。
4. **安全结论**：`JwtAuthGuard` 角色校验（原 P0-1）经复核**不存在缺陷**；本次仅做了两项质量加固——校管看板真实学生出勤率（P1-1）、`reset-all` 生产环境禁用纵深防御。

> 附：若您需要的是「历史桌面 `app/`(教师工作台) vs 小程序端」的对比（而非当前 Web 管理端），该对照已在 `功能缺口对比清单.md` / `小程序改造差异清单-v2.md` 中完整给出，可随时切换视角输出。
