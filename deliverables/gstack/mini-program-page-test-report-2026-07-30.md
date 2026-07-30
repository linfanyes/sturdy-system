# 小程序端页面级功能测试报告

**日期**：2026-07-30
**测试对象**：`mini-program/src`（uni-app 微信小程序）
**测试负责人**：gstack-qa-lead（QA / 发布）
**测试类型**：源码级 + 接口级 灰盒测试（静态核对，非运行时点击）

---

## 0. 测试方法说明与已知局限（务必先读）

> ⚠️ **本环境无法运行微信开发者工具 GUI，无法做真实点击式 E2E。** 本次采用**源码级 + 接口级**验证：
> 1. 通读 `pages.json` 建立完整页面清单；
> 2. 通读全局取数/拦截逻辑（`App.vue`、`main.js`、`common/request.js`、`common/route-guard.js`、`common/store.js`、`common/config.js`）；
> 3. 对**每个页面**核对生命周期取数、API 调用、空/加载/错误态兜底、角色守卫、表单校验；
> 4. 把每个页面的接口调用与 `server/src` 对应 controller 的路由/方法/参数**逐一比对**；
> 5. 抽样精读 + 全量 API 映射（grep 全量调用点）+ server controller 全量前缀清单交叉验证。

**结论可靠性边界**：接口契约、空数据兜底、角色守卫、逻辑空指针风险已高置信度覆盖；**像素级布局、真机渲染、网络真实往返、动画/手势**等需真机或模拟器验证，本报告不涵盖。所有结论基于源码静态分析。

---

## 1. 页面清单与覆盖率

`pages.json` 共声明 **131 页**（主包 76 + 子包 55）。实际 `.vue` 文件 137 个，差值 6 个为**未注册孤儿页**（见问题 #5）。

| 包 | 声明页数 | 已核对 | 核对方式 | 覆盖率 |
|----|---------|--------|----------|--------|
| 主包 pages | 76 | 76 | 10 页逐行精读 + 全量 API 映射 + server 比对 | 100% |
| 子包 games | 34 | 34 | 全量 grep 确认 0 后端调用（纯本地） | 100% |
| 子包 tools | 15 | 15 | 4 页有 API（已比对），11 页纯本地 | 100% |
| 子包 ai | 6 | 6 | 全量 API 映射 + server 比对 | 100% |
| **合计** | **131** | **131** | — | **100%** |

**逐行精读（onLoad/onShow + 核心 API + 错误/空态 + 角色守卫）页面清单**：
`login`、`parent-login`、`parent`、`parent/compare`、`dashboard`、`classes`、`students`、`config`、`im`、`ai/ai-exam`（共 10 页）。

**子包页确认**：
- games（34）：全部为 canvas 小游戏，**无任何 `api.*`/`parentApi.*`/`request` 调用** → 无后端依赖，无接口不匹配风险。
- tools（15）：仅 `picker`、`reward/reward`、`strokeOrder`、`scorePanel` 调接口（`/classes`、`/students`、`/reward-records`、`/group-scores`、`/ai/chat-sync`），其余为计算器/抽签等纯本地工具。上述接口均已在 server 确认存在。
- ai（6）：调用 `/ai/chat-sync`、`/ai/analyze-exam`、`/generated/papers`、`/generated/knowledges`、`/generated/lesson-plans`、`/exams`、`/grades`，均比对一致（1 处路径 bug 见 #2）。

---

## 2. 分模块结论

### 2.1 家长端（parent / parent-login / compare）
- **整体：通过（1 个阻断级问题 #1）**
- `parent.vue`：取数严谨，`Promise.allSettled` 并行拉 8 个接口，单接口失败不拖垮整体；空数据用 `me?.kids`、`|| []`、空态卡片兜底；含加载中/失败重试态；多娃切换、微信绑定、改密入口完整。
- `parent-login.vue`：学号/密码校验 + 微信登录；错误 toast 友好。
- ⚠️ **`compare.vue`（跨娃比对）对家长不可达**（见 #1，🔴）。

### 2.2 教师端 / 主包业务页（dashboard / classes / students / grades / exams / homework / notice / attendance / schedule / profile / growth / resource / 等）
- **整体：通过**
- 统一模式成熟：`api.getList(...)` 失败自动返回 `[]` 并 toast；列表页均有 `v-if="!list.length"` 空态卡片；表单页有必填校验与提交反馈（如 `classes.vue` 班级名自动拼接、`students.vue` 手机号格式校验、`config.vue` URL/温度校验）。
- `dashboard.vue` 用 `Promise.all([...].map(p => p.catch(()=>[])))` + try/finally，鲁棒性高。
- 细节瑕疵：`config.vue` 的 `load()` 缺 try/catch（见 #6，🟢）。

### 2.3 游戏（games ×34）
- **整体：通过**。纯前端 canvas 游戏，无网络请求，无接口/守卫风险。

### 2.4 工具（tools ×15）
- **整体：通过**。本地工具无风险；含接口的工具页（`picker`/`reward`/`scorePanel`/`strokeOrder`）接口均已比对存在。

### 2.5 AI（ai 子包 ×6 + office-tools/subject-tools 的 AI 工具）
- **整体：通过（1 个中危问题 #2）**
- 流式/同步对话走 `streamChat` / `/ai/chat-sync`，后端 `@Controller('ai')` 路由齐全（`chat-sync`/`analyze-exam`/`diagnose`/`gen-image`/`gen-video`/`asr`/`ocr`/`parse-file`）。
- `ai-exam.vue` 历史记录接口路径写错（见 #2，🟡）。

### 2.6 通用 / 全局层
- `common/request.js`：统一封装，401 自动登出回登录页、30s 超时保护、mock 模式隔离（生产构建 `DEMO_MODE_ENABLED=false` 强制关闭）、`getList` 自动空数组兜底 —— **健壮**。
- `common/route-guard.js`：角色守卫**逻辑正确但声明不完整**（见 #1）。
- `common/store.js`：多角色令牌隔离、双角色切换（`setDualTokens`/`switchRole`）、主题/字号落地 —— **健壮**。

---

## 3. 问题清单

| # | 严重度 | 位置 | 描述 | 建议 |
|---|--------|------|------|------|
| 1 | 🔴 | `common/route-guard.js:23-31` + `pages/parent/compare.vue:94,643` | **家长「跨娃比对」页不可达**。该页为家长功能（用 `parentApi` 调 `/parent-auth/compare-kids`），但 `PAGE_ROLES` 未登记，按默认规则仅教师可进。家长点击 `goCompare` → `navigateTo` 被拦截 → 提示「无权访问该页面」。教师虽可进，但 `parent.token` 为空 → 调接口 401。核心家长功能完全失效。 | 在 `PAGE_ROLES` 增加 `'pages/parent/compare': [ROLE.PARENT]`（双角色教师因 `getCurrentRole` 优先级 parent>teacher，会被识别为家长，可正常进入）。 |
| 2 | 🟡 | `pages/ai/ai-exam.vue:100` | **考试分析历史接口路径错误**。代码调 `api.get('/generated-papers', {type:'exam-analysis'})`，但后端 controller 为 `@Controller('generated/papers')`（路径 `/generated/papers`）。`/generated-papers`（连字符）不存在 → 404。该页用 `catch` 兜底为 `history=[]`，**不崩溃但历史列表恒空**。其他 AI 页（`ai-paper`/`ai-knowledge`/`ai-lesson`）路径正确。 | 改为 `api.get('/generated/papers', { type: 'exam-analysis' })`。 |
| 3 | 🟡 | `pages/admin/admin.vue:510,533,535,546,560` | **AI 服务商列表路径错误（已知「AI 模型列表空」根因）**。代码调 `/admin/ai-providers`，但后端 controller 为 `@Controller('ai-providers')`（路径 `/ai-providers`，无 `/admin/` 前缀）。`/admin/ai-providers` → 404 → 列表恒空。页面有 `|| { items: [] }` 兜底，不崩但管理员无法配置 AI 服务商。 | 改为 `/ai-providers`（GET/PATCH/POST/DELETE）。属超管后台范围，不影响教师/家长主流程，但阻断「AI 模型列表空」已知项修复。 |
| 4 | 🟢 | `pages/messages/messages.vue:162` | **调用不存在的 `/messages` 接口**。server 无 `@Controller('messages')`，该调用 404；页面已 `.catch(() => [])` 兜底，且消息中心内容实际由 `/notifications`、`/todos`、`/notes`、`/notices` 驱动，故不影响功能，仅冗余死调用。 | 删除该行或改读真实消息源；建议确认消息中心数据契约。 |
| 5 | 🟢 | `pages/home-visit-route/*`、`pages/ai-exam/*`、`pages/ai-interactive/*`、`pages/ai-knowledge/*`、`pages/ai-lesson/*`、`pages/ai-paper/*`（共 6 个目录） | **孤儿页（未在 pages.json 注册）**。`pages.json` 仅注册 `pages/ai/*` 作为 ai 子包；上述 6 个目录的 `.vue` 与主包 `pages/ai-exam/` 等重复/遗留，uni-app 路由不可达，属死代码。 | 删除遗留重复文件，避免维护歧义（注意：活体 AI 页在 `pages/ai/` 下）。 |
| 6 | 🟢 | `pages/config/config.vue:269-292` | **`load()` 缺 try/catch**。三个 `await`（`/users/me`、`/config/ai`、`/config/app`）任一非 401 异常会令 `onShow` 裸 reject；该页为 tabBar 页，表现为停留在默认/半载态、无错误提示（401 已被 request 层拦截跳转，故仅瞬时网络错误有此风险）。 | 给 `load()` 包 try/catch 并渲染错误态；`me` 变量赋值后未使用，可顺手清理。 |

---

## 4. 已知问题源码层降级核对（5 项）

| 已知问题 | 源码层现状 | 结论 |
|----------|-----------|------|
| `parent-auth/me` 空 body | `parent.vue` 用 `me?.kids`、`kids = (meResult.value && meResult.value.kids) || []`、`activeKidId = meResult.value?.studentId || ''`，空 body 不引发空指针/白屏 | ✅ 已合理降级 |
| `ai-providers` 模型列表空 | 根因为 #3 路径错（`/admin/ai-providers`→404）；`admin.vue` 有 `|| {items:[]}` 兜底，**不崩但恒空** | ⚠️ 已降级但功能空（待 #3 修复） |
| IM 未配置 | `im.vue` 默认 `demoMode=true`，`onShow` 调 `/im/user-sig` 无 `sdkAppId/userSig` 即回落演示会话；`tim-wx-sdk` 动态导入失败有 toast 兜底 | ✅ 已合理降级 |
| 单娃 `compare-kids` 403 | 后端对单娃家长返回 403；`compare.vue` 入口仅在 `me.kids.length>1` 时显示。但 **#1 路由守卫使 compare 整体对家长不可达**，故该 403 实际被 #1 覆盖（家长根本进不去） | ⚠️ 被 #1 阻断，需先修 #1 |
| 家长密码需教师授权 | 设计如此：`students.vue` 提供教师「重置为学号后6位」+ `parent.vue` 提供家长凭旧密码自助改密，文案清晰 | ✅ 设计正确、已实现 |

---

## 5. 与 Web 端功能对齐缺口

参考 `deliverables/gstack/parent-feature-alignment-2026-07-30.md`：
- **P3（小程序家长顶部统计卡片）**：当前 `parent.vue` 已实现 4 张统计卡（待读通知/待完成作业/考试次数/最新排名），**缺口已闭合**。
- **P2（订阅文案统一）**：仍待执行，低优先级体验项。
- **主要新增缺口**：小程序「跨娃比对」（`pages/parent/compare`）因 #1 路由守卫对家长不可达，而 Web 端家长中心具备该能力 → **当前小程序家长端缺失此能力**，建议随 #1 一并修复。
- 其余教师端功能（班级/学生/成绩/作业/通知/考勤/课表/工具箱/AI 备课等）小程序与 Web 功能面基本对齐，接口契约一致。

---

## 6. 已知局限（环境约束）

- 无法运行微信开发者工具 GUI → **无真实点击 E2E、无真机渲染、无真实网络往返验证**。
- 无法验证：像素级布局/适配、手势/动画、wx 原生 API 真机行为（如 `wx.login`、`requestSubscribeMessage`、相册/录音权限）、云托管链路真实连通性。
- 以上需真机/模拟器 + 后端联调补齐；本报告结论基于源码静态分析与接口契约比对。

---

## 7. 总结

- **覆盖页数**：`pages.json` 声明 **131 页 100% 核对**（主包 76 + games 34 + tools 15 + ai 6）；另识别 6 个未注册孤儿页。10 个核心页逐行精读，全部 131 页接口调用与 server controller 逐一比对。
- **发现问题**：共 **6 项** —— 🔴 1（家长 compare 路由守卫阻断）、🟡 2（`/generated-papers` 路径错、`/admin/ai-providers` 路径错=已知「AI模型列表空」根因）、🟢 3（`/messages` 死调用、6 孤儿页、`config.load` 缺 try/catch）。
- **能否上线**：**教师端与家长端核心流程（登录、工作台、班级/学生/成绩/作业/通知/考勤/课表/AI 备课/家校沟通/IM 演示兜底/家长中心）质量高、兜底完善，可上线**。**上线前建议必须修复 🔴 #1**（否则家长「跨娃比对」完全不可用，且与 Web 端能力不对齐）；🟡 #2/#3 为接口路径笔误，影响范围有限（AI 历史列表空、超管 AI 服务商配置空），建议同批修复；🟢 项可后续清理。

> 注：本次为纯测试，**未修改任何源码**；以上建议均为报告标注，供开发侧采纳。
