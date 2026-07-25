# 园丁工作台 Web 端 — 全角色测试报告

> 测试日期：2026-07-25
> 覆盖角色：超级管理员 / 学校管理员 / 教师 / 家长（4 级）
> 框架：Jest 29 + Vue Test Utils + jsdom（组件 / 集成）；性能以 `vite build` 产物 + 清单核查
> 结论：**全部 235 个用例通过（14 个测试套件），0 失败；生产构建通过。**

---

## 1. 测试策略

| 维度 | 手段 | 说明 |
|---|---|---|
| 功能 | 组件测试 + 路由集成测试 | 直接 mock API 层，验证按钮、表单、增删改、跳转、守卫 |
| 布局 | DOM 断言 + 人工核查清单 | 断言侧边栏/顶栏/主内容区、标题存在、无空白；像素级靠人工 + Lighthouse |
| 性能 | 构建产物分析 + CWV 清单 | 统计 bundle 体积、代码分割；提供 Core Web Vitals 人工核查清单 |
| 全页面 | 路由冒烟渲染 | 遍历全部 124 个叶子路由，挂载每个页面组件，断言不崩溃且有内容 |

**杠杆点**：约 100+ 页面是 `CrudTable` / `AiTextTool` / `PhotoAlbum` 的薄封装。把这三个共享组件测透，即可覆盖它们背后的全部 CRUD / AI 工具 / 相册页面；再对 4 个角色 Dashboard、AppLayout 菜单、登录/守卫做针对性测试，最后用「全路由冒烟」兜底漏网页面（含 18 个 canvas 小游戏、各类工具箱）。

---

## 2. 测试数据（fixtures）

文件 `test/data/fixtures.ts` 构造了 4 角色完整数据，供所有用例复用：

- 4 角色 `mockAccounts` 与 `makeAuthUser(role, override)`
- 班级、学校、校管、审计日志、平台配置
- 教师：班级列表、作业、考试、成绩、奖惩、通知、IM 会话
- 家长：孩子、考试、作业、公告、成绩分布
- 通用：`crudSampleRows`、`listResponse(rows)`（统一 CRUD 响应封装）
- 相册、Dashboard 统计、搜索结果、值日表等

---

## 3. 测试用例（详见 `TEST_CASES.md`）

用例文档共 10 节：策略、登录、super、school_admin、teacher（含 4.1 通用组件 / 4.2 重点自定义页）、parent、布局/导航/守卫、布局 UI 检查清单、性能检查清单、数据映射、自动化映射。覆盖了每个角色的菜单、按钮、表单、增删改查、跳转，以及布局与性能两个维度。

---

## 4. 测试结果

### 4.1 用例执行（组件 / 集成，110 例）
| 套件 | 覆盖 | 结果 |
|---|---|---|
| `Login.spec.ts` | 登录页空校验/统一登录/历史账号兼容等 | ✅ |
| `CrudTable.spec.ts` | 列表/空态/搜索/新增(POST)/必填校验/编辑(PATCH)/删除(DELETE) — 覆盖 ~60 个 CRUD 页 | ✅ 7/7 |
| `AiTextTool.spec.ts` | 渲染/生成(aiChatSync)/空守卫/保存(POST)/无 savePath/复制 | ✅ 6/6 |
| `PhotoAlbum.spec.ts` | 网格/空态/新增(POST)/编辑(PATCH)/删除(DELETE) — 覆盖班级活动/风采/我的相册 | ✅ 5/5 |
| `dashboards.spec.ts` | 四角色工作台渲染（SUP/SA/TCH/PAR） | ✅ 4/4 |
| `AppLayout.menu.spec.ts` | 超管 5 项菜单 / 校管搜索+5 项 / 家长 1 项 / 教师分组 / 退出跳转 | ✅ 5/5 |
| `navigation.spec.ts` | 路由守卫 NAV-01~05：未登录跳登录、角色重定向、角色不匹配跳 403、未知路径跳 404、已登录访问登录页跳回首页 | ✅ 5/5 |
| 静态/单元 | `auth.spec.ts` / `request.spec.ts` / `roles.spec.ts` / `pages.spec.ts` / `apiBase.spec.ts`（源码安全属性 + 优先级解析） | ✅ |

### 4.2 全路由冒烟（routes-smoke，125 例）
- 收集全部 **124 个叶子路由**（实际页面数；此前估算 ~170 偏高，已校正断言阈值）。
- 每个页面用 `SafeApi` 全量 mock 后端 + lucide 图标 mock，挂载渲染并断言产出非空 DOM。
- **124/124 页面渲染通过**，含 18 个 canvas 小游戏（赛车/摩托/数独/记忆/拼图/颜色等）、各工具箱、AI 工具、图表页。

### 4.3 汇总
```
Test Suites: 14 passed, 14 total
Tests:       235 passed, 235 total
```

---

## 5. 覆盖率（不含冒烟套件，避免大批量挂载导致内存溢出）

| 模块 | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| **All files** | **67.61%** | **56.20%** | **60.56%** | **71.06%** |
| AiTextTool.vue | 81.17% | 71.62% | 88.57% | 84.56% |
| CrudTable.vue | 73.08% | 58.94% | 75.00% | 79.10% |
| PhotoAlbum.vue | 75.19% | 67.39% | 76.66% | 79.16% |
| Modal.vue | 52.17% | — | — | 52.17% |
| Login.vue | 85.79% | 78.52% | 87.80% | 88.95% |
| views/super/Dashboard | 75.86% | 68.80% | 85.18% | 79.41% |
| views/school-admin/Dashboard | 77.39% | 77.51% | 84.21% | 81.48% |
| views/teacher/Dashboard | 64.04% | 59.84% | 51.47% | 66.92% |
| views/parent/Dashboard | 63.05% | 40.53% | 52.00% | 68.58% |
| api/*（axios 封装层） | ~35% | — | — | — |

> 说明：api 层为薄 axios 封装，绝大多数已被组件/冒烟的 mock 间接验证；其语句级覆盖率低属预期。其余页面（教师 ~130 子页）主要通过 `CrudTable/AiTextTool/PhotoAlbum` 共享组件 + 冒烟挂载间接覆盖，故未逐个展开单测，符合「测透共享组件即覆盖其薄封装页」的策略。

---

## 6. 性能基线（vite build）

- `vite build` **成功**，1952 个模块，耗时 ~12s。
- **代码分割良好**：每个路由为独立懒加载 chunk，最大单页 chunk ≈ 15KB（gzip ≈ 4.7KB）。
- 关键 chunk：`vendor-vue` 108KB（gzip 42.3KB）、入口 `index` 108KB（gzip 35.2KB）、主 CSS `index` 40.8KB（gzip 7.27KB）。
- `dist` 总体积 ~1.1MB，`index.html` 3.5KB（gzip 1.43KB）。
- 性能检查清单（CWV 人工核查项）见 `TEST_CASES.md` 第 8 节：LCP/FID/CLS 目标、图片 WebP、CDN/缓存、首屏体积等。沙箱无无头浏览器，Lighthouse 跑分需在本机/CI 执行。

---

## 7. 测试中发现并修复的问题

| # | 类型 | 问题 | 处理 |
|---|---|---|---|
| 1 | 可访问性 | `PhotoAlbum.vue` 的编辑/删除按钮仅含图标、无 `title`/`aria-label`，屏幕阅读器无法识别，且测试无法定位 | 已添加 `title="编辑"/"删除"` 与 `aria-label`，同时修复测试选择器 |
| 2 | 测试隔离 | `navigation.spec.ts` 在完整运行中 NAV-03 误判：router 为模块单例，上一测试停留在 `/super` 子路由，再 `push('/super')` 被判同路由 no-op，守卫不再触发 | 在 `beforeEach` 先将 router 重置到中性路由 `/forbidden`（无鉴权、无重定向），保证每次 push 必跑守卫 |
| 3 | 测试基建 | `navigation.spec.ts` 导入真实 router → 间接加载 `request.ts`，其中包含 `import.meta`（Vite 注入），CJS 下解析报 SyntaxError | 与组件测试一致，对 `@/api/request` 做 jest mock（项目约定：测试可导入模块应避免 `import.meta`，见 `apiBase.ts` 注释） |
| 4 | 测试基建 | 18 个 canvas 小游戏挂载时调用 `ctx.setLineDash` 等，`jsdom` 无 canvas 2D 实现导致崩溃 | 将 `setup.ts` 的 canvas stub 升级为 Proxy，任意方法 no-op、关键方法返回合理默认值 |
| 5 | 断言校正 | 路由叶子数实际为 124（非此前估算的 ~170） | 将冒烟断言阈值由 `>150` 校正为 `>100` |

> 上述 1 为真实产品体验改进（a11y）；2–5 为测试基建/断言修正，不影响线上功能。

---

## 8. 遗留与建议

- **Lighthouse / 真实 E2E（✅ 已执行，2026-07-25）**：沙箱原本无可用浏览器，后发现系统已装 **Microsoft Edge（Chromium 内核）**，复用其无头模式完成真实渲染冒烟 + Lighthouse CWV 跑分——**无需下载 Chromium**。脚本 `scripts/lighthouse-smoke.mjs`：Playwright 加载登录页做真实渲染冒烟（SPA 挂载 / 标题 / 关键元素 / 控制台错误 / 截图），并自行拉起 Edge 调试端口交由 Lighthouse 跑分。实测（目标 `vite preview` 生产构建）：
  - **Lighthouse 分数**：性能 **81** / 无障碍 **92** / 最佳实践 **96** / SEO **82**
  - **真实浏览器冒烟**：标题「园丁工作台 · Web 端」、登录表单 2 个输入框、欢迎文案命中、SPA `#app` 成功挂载、控制台仅 1 个 404（无后端联调时的预期 API 报错，不影响渲染）。
  - **产物**：`lighthouse-report.html` / `lighthouse-report.json` / `lighthouse-summary.json` / `lighthouse-smoke.png`。
  - **运行命令**：`node scripts/lighthouse-smoke.mjs http://127.0.0.1:4173/ .`（先 `vite build` + `vite preview --port 4173`）。
  - **后续建议**：本机/CI 接入 Playwright + Lighthouse CI 做跨浏览器与分数趋势回归；当前 CWV 中性能 81 仍有优化空间（LCP/JS 体积），可后续针对首屏再压。
- **API 层单测（✅ 已解决，2026-07-25）**：新增 `test/request.spec.ts` 行为测试，覆盖请求/响应拦截、JWT 注入、401 清理 localStorage 并重定向、错误解包，共 12 例全部通过（原 `request.ts` 的 `import.meta` 读取已抽到 `src/config/viteEnv.ts` 以便 Jest 导入）。
- **覆盖率提升（✅ 已解决，2026-07-25）**：`test/components/dashboards.spec.ts` 扩展 7 例，覆盖教师/家长 Dashboard 的加载中、空班级/空通知/空成绩、接口报错回退与告警态，共 11 例通过；分支覆盖由 ~40–60% 提升。
- **回归门禁（✅ 已解决，2026-07-25）**：`jest.config.cjs` 新增 `coverageThreshold`（当前基线：lines 55 / statements 55 / branches 40 / functions 45，已能稳定通过）。报告目标 Lines ≥ 70% 记为技术债，待后续补测试逼近。
- **后端 DTO 校验层（✅ 已解决，2026-07-25）**：新增 `admin`/`parent-auth`/`school-admin` 三处 DTO（`class-validator` 装饰器），`admin.controller`/`parent-auth.controller`/`school-admin.controller` 的全部 `any` 入参改为强类型 DTO；`test/dto-validation.spec.ts` 以真实 `ValidationPipe` 驱动 12 例参数校验，全部通过。
- **后端统一异常（✅ 已解决，2026-07-25）**：新增 `BusinessException`（`code` + `message` + `status`），`typeorm-exception.filter` 改为统一 `{ statusCode, code, message }` 输出；`admin.service.createAdmin` 改用 `BusinessException`（`ADMIN_FIELDS_REQUIRED` / `SCHOOL_NOT_FOUND` / `ADMIN_USERNAME_EXISTS`）；`test/business-exception.filter.spec.ts` 4 例验证输出形态。
- **租户隔离回归固化（✅ 已解决，2026-07-25）**：`test/tenant-isolation.spec.ts` 共 10 例固化 `CrudService`（`ISO-01~06`：teacherId/classId 作用域、跨租户 404、create 强制 owner、class 作用域 `In(classIds)`、空 classIds 回退）与 `BackupService`（`D1` 回归：list/get/remove 均按 `teacherId` 作用域），全部通过。
- **部署类建议项核对**：前端会话态已在 #185 以服务端为准；微信 TLS 已在后端实现；超级管理员凭证为部署期环境变量控制项（非代码缺陷）。以上均非遗留代码问题，本次仅记录确认。

---

**Frontend Developer（像素匠）**
实现日期：2026-07-25
性能：代码分割 + 懒加载，首屏/单页 chunk 体积可控
可访问性：WCAG 2.1 AA 基线（已修复相册按钮语义标签，待补读屏回归）
