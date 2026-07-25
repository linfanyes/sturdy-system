# Web 端（园丁工作台）全角色测试用例

> 覆盖范围：4 级角色（超级管理员 / 学校管理员 / 教师 / 家长）的全部页面、按钮、交互，以及布局、功能、性能三个维度。
> 测试框架：Jest 29 + Vue Test Utils + jsdom（组件/集成测试）；性能以 `vite build` 产物体积 + 人工 Lighthouse 清单为准（沙箱无无头浏览器，无法跑真实 E2E/Lighthouse）。
> 关联：路由表 `src/router/index.ts`、布局 `src/layouts/AppLayout.vue`、复用组件 `CrudTable/AiTextTool/PhotoAlbum/Modal`。

---

## 0. 测试策略

| 维度 | 方法 | 说明 |
|---|---|---|
| 功能 | 组件测试 + 路由集成测试 | 直接 mock API 层，验证按钮、表单、增删改、跳转 |
| 布局 | DOM 断言 + 人工核查 | 断言侧边栏/顶栏/主内容区存在、标题存在、无空白；像素级靠人工 + Lighthouse |
| 性能 | 构建产物分析 + 清单 | 统计 bundle 体积；提供 Core Web Vitals 人工核查清单 |
| 全页面 | 路由冒烟渲染 | 遍历全部叶子路由，挂载每个页面组件，断言不崩溃且有内容 |

**杠杆点**：约 100+ 个页面是 `CrudTable` / `AiTextTool` / `PhotoAlbum` 的薄封装。把这三个共享组件测透，即可覆盖它们背后的全部页面；再对 4 个角色 Dashboard、AppLayout 菜单、登录/守卫做针对性测试，最后用「全路由冒烟」兜底漏网页面（含 18 个 canvas 小游戏、各类工具）。

---

## 1. 登录页（公开，无角色）

| 用例 ID | 场景 | 操作 | 期望 |
|---|---|---|---|
| LOGIN-01 | 页面渲染 | 打开 `/#/login` | 显示「园丁工作台」「登录」、用户名/密码输入框、历史账号区 |
| LOGIN-02 | 空表单提交 | 直接点「开始工作」 | 提示「请输入用户名和密码」，不调用登录 |
| LOGIN-03 | 统一登录 | 输入 `admin/admin` 提交 | 调用 `auth.loginByUsername`，成功按后端角色跳转（super→`/super`） |
| LOGIN-04 | 角色自动识别 | 用家长账号提交 | 跳转 `/parent`；校管→`/school-admin`；教师→`/teacher` |
| LOGIN-05 | 登录失败 | 错误密码 | 显示后端错误信息，不跳转 |
| LOGIN-06 | 历史账号兼容 | 旧版对象格式 localStorage | 自动展平为数组，不报 `filter is not a function` |
| LOGIN-07 | 头像选择 | 点选 emoji 头像 | 顶部角标更新 + 写入 localStorage |
| LOGIN-08 | 标题间距 | 视觉 | 「欢迎回来」与「用爱浇灌…」两行间距合理（已修复） |

---

## 2. 超级管理员（super，`/super`）

菜单位：工作台 / 学校管理 / 管理员管理 / 审计日志 / 平台配置。

| 用例 ID | 页面 | 关键按钮/交互 | 期望 |
|---|---|---|---|
| SUP-01 | Dashboard | 统计卡片、快捷入口 | 渲染学校数/管理员数等统计，点击入口跳转对应页 |
| SUP-02 | 学校管理 | 新增/编辑/删除学校 | 打开模态框→保存→`createSchool/updateSchool/deleteSchool`；列表刷新 |
| SUP-03 | 管理员管理 | 新增校管、重置密码、启停、删除 | 调 `createSchoolAdmin`/`resetSchoolAdminPassword`/`toggleSchoolAdminEnabled`/`deleteSchoolAdmin` |
| SUP-04 | 审计日志 | 列表、分页/筛选 | `listAuditLogs` 返回表格，无数据显「暂无数据」 |
| SUP-05 | 平台配置 | 默认学科勾选标签（增/删）、保存 | 勾选标签形式；新增学科写入；删除学科；配置项保存调 `PUT /config/app/:key` |
| SUP-06 | 布局 | 侧边栏 | 5 个菜单项，当前页高亮 |

---

## 3. 学校管理员（school_admin，`/school-admin`）

菜单位：工作台 / 教师管理 / 班级管理 / 学生管理 / 学校公告。顶栏含全局搜索。

| 用例 ID | 页面 | 关键按钮/交互 | 期望 |
|---|---|---|---|
| SA-01 | Dashboard | 统计卡片 | 教师/班级/学生/家长登录数渲染 |
| SA-02 | 教师管理 | 新增/批量导入/编辑/功能权限/重置密码/删除/CSV 导出 | 调对应接口；导出触发 blob 下载 |
| SA-03 | 班级管理 | 新增/编辑/删除班级（含班主任/科目） | 调 `createClass/updateClass/deleteClass` |
| SA-04 | 学生管理 | 编辑姓名/家长信息 | 调 `updateStudent` |
| SA-05 | 学校公告 | 新增/删除公告、推送 | 调 `createSchoolNotice/deleteSchoolNotice` |
| SA-06 | 全局搜索 | 输入关键字 | 下拉展示教师/班级/学生；点击跳转对应管理页；无结果显示「未找到」 |
| SA-07 | 退出 | 点退出按钮 | `auth.logout()` + 跳转 `/login` |

---

## 4. 教师（teacher，`/teacher`，~130 子页）

菜单按功能分组，受 `features` 权限控制可见性。覆盖：工作台、班级与学生、学情与考试、学生评价、家校沟通、AI 与备课、工具箱、语文/数学/英语工具、小游戏、教师办公、个人空间。

### 4.1 通用组件（覆盖 100+ 薄封装页）
| 用例 ID | 组件 | 覆盖页面 | 期望 |
|---|---|---|---|
| TCH-CRUD | `CrudTable` | 待办/笔记/课表/考试/成绩/考勤/奖励/加减分/小组评分/排行榜/成长/行为/阅读/打卡/获奖/奖项/家长联系/通知模板/工作日志/听课/教师通讯录/教案模板库/知识点库/教案库/试卷库/试卷查询/教学资源 等 | 列表渲染、搜索过滤、班级筛选、新增/编辑模态、必填校验、保存(POST/PATCH)、删除(confirm) |
| TCH-AI | `AiTextTool` | 翻译/教育论文/黑板报/演讲稿/评语/期末总结/阅读理解/小作文/古诗词/汉字听写/成语/拼音/口算/竖式/单位换算/错题本/单词卡片/句型/听力/语法/情景对话/拼写/口语/英语故事 等 | 表单渲染、生成按钮调 `aiChatSync`、结果展示、复制(clipboard)、保存(POST, 有 savePath 才显示保存) |
| TCH-ALBUM | `PhotoAlbum` | 班级活动/班级风采/我的相册 | 网格渲染、空态、新增(必填标题+班级)、上传压缩(base64)、删除 |

### 4.2 重点自定义页
| 用例 ID | 页面 | 关键交互 | 期望 |
|---|---|---|---|
| TCH-01 | 教师工作台 Dashboard | 通知铃铛、快捷操作、统计卡片 | 渲染；点快捷操作跳转 |
| TCH-02 | 通知中心 | 列表/未读计数/标记已读/全部已读 | 调 `listNotifications`/`markRead`/`markAllRead` |
| TCH-03 | 消息中心 | 列表/标记已读 | 调 `listMessages`/`markMessageRead` |
| TCH-04 | 个人资料 | 编辑保存 | 调 `auth.updateUser` 同步本地 |
| TCH-05 | 班级成员 | 成员列表 | `listClassMembers` 渲染 |
| TCH-06 | 轮值表/值日配置 | 增删改 | 调 duty 接口 |
| TCH-07 | 作业 Homework | 双视图/班级分组/逾期列表/标记已批改 | 渲染、逾期高亮、已批改切换 |
| TCH-08 | 考试分析/数据看板/雷达图 | 数据可视化 | 调分析接口；图表(纯 DOM)渲染；学期筛选；导出 |
| TCH-09 | 家校 IM | 会话列表/发消息 | `listImConversations`/`sendImMessage` |
| TCH-10 | AI 对话/文生图/生成器 | 输入→生成 | 调 `aiChatStream`/`aiGenImage`/`aiChatSync` |
| TCH-11 | 工具箱总览 Toolbox | 9 分区、按 features 过滤 | 渲染分区入口；无权限项隐藏 |
| TCH-12 | 课堂工具（点名/分组/骰子/计时/计算器/座位/加减分…） | 纯前端交互 | 随机/计时/计算逻辑正确；座位 CRUD |
| TCH-13 | 小游戏（18 个） | canvas 渲染与基本交互 | 页面挂载不崩溃（canvas getContext 在 jsdom 需 stub） |
| TCH-14 | 功能权限 | 登录用户 features 受限 | 无权限菜单项隐藏；越权访问回退到工作台 |

---

## 5. 家长（parent，`/parent`）

| 用例 ID | 页面 | 关键交互 | 期望 |
|---|---|---|---|
| PAR-01 | 孩子动态 Dashboard | Tab：成绩分布图/优势薄弱学科/公告/作业 | `getParentMe`/`getParentNotices`/`getParentExams`/`getParentHomework` 渲染；柱状图(v-html) |
| PAR-02 | 布局 | 单一菜单「孩子动态」 | 侧边栏仅 1 项，当前高亮 |

---

## 6. 布局 / 导航 / 守卫（跨角色）

| 用例 ID | 场景 | 期望 |
|---|---|---|
| NAV-01 | 未登录访问受保护页 | 跳转 `/login` 且带 `redirect` |
| NAV-02 | 已登录访问 `/` | 按角色重定向到对应工作台 |
| NAV-03 | 角色不匹配（如 teacher 访问 `/super`） | 跳转 `/forbidden` (403) |
| NAV-04 | 登录后访问 `/login` | 跳转回角色首页 |
| NAV-05 | 未知路径 | 跳转 404 |
| NAV-06 | AppLayout 侧边栏 | 4 角色菜单正确；校管显示搜索；底部用户信息+退出 |
| NAV-07 | 嵌套路由渲染 | 主内容区经 `<router-view>` 渲染（修复空白 bug） |

---

## 7. 布局（UI）检查清单

- [ ] 左右分栏比例合理、垂直居中、无头重脚轻
- [ ] 侧边栏 56 宽固定、主内容区 `max-w-6xl` 居中
- [ ] 每个页面有 `<h1>` 标题，无空白主内容区
- [ ] 移动端无横向溢出（响应式断点 `lg:`）
- [ ] 字体层级（title-display / text-2xl / text-sm）清晰
- [ ] 颜色对比度满足 WCAG AA（cocoa/butter/cream 主题）
- [ ] 加载态/空态/错误态均有提示（「加载中…」「暂无数据」）
- [ ] 模态框遮罩、ESC/取消可关、焦点合理

---

## 8. 性能（Performance）检查清单

> 沙箱无无头浏览器，下列为**人工 + CI 构建**可核查项；真实 Lighthouse 需在你本地浏览器跑。

- [ ] **构建产物体积**（CI 基线，见测试报告）：`index`/`vendor-vue`/`Dashboard` 等 chunk 体积与 gzip 后大小
- [ ] **代码分割**：路由懒加载（`() => import(...)`）使首屏不含全部 170 页
- [ ] **首屏 LCP** < 2.5s（本地 Lighthouse 核查）
- [ ] **CLS** < 0.1（布局稳定，无闪烁）
- [ ] **TBT / 交互延迟** < 200ms
- [ ] **图片**：相册采用 base64 压缩(`compressImages`)，未用原图直传
- [ ] **API 请求**：列表 `take=500` 一次拉取，搜索 300ms 防抖
- [ ] Lighthouse Performance / Accessibility 均 > 90（本地 Chrome 核查）

---

## 9. 测试数据（fixtures）

位于 `test/data/fixtures.ts`，覆盖 4 角色：

- **账号**：`mockAccounts`（教师/校管/家长/超管）
- **超管**：schools、schoolAdmins、auditLogs、platformConfig
- **校管**：teachers、classes、students、schoolNotices、dashboard 统计、searchResults
- **教师**：班级、轮值、考试、成绩、作业、奖励、通知、IM 会话、工具所需本地数据
- **家长**：孩子信息、成绩分布、公告、作业
- **通用 CRUD**：todos/notes 等记录样例（供 `CrudTable` 测试）

---

## 10. 自动化映射

| 测试文件 | 覆盖用例 |
|---|---|
| `test/components/CrudTable.spec.ts` | TCH-CRUD |
| `test/components/AiTextTool.spec.ts` | TCH-AI |
| `test/components/PhotoAlbum.spec.ts` | TCH-ALBUM |
| `test/components/dashboards.spec.ts` | SUP-01 / SA-01 / TCH-01 / PAR-01 |
| `test/integration/AppLayout.menu.spec.ts` | NAV-06 / SA-06 / SA-07 |
| `test/integration/navigation.spec.ts` | NAV-01~05 |
| `test/integration/routes-smoke.spec.ts` | 全部 170 页冒烟（含 TCH-13 游戏、各工具） |
| `test/components/Login.spec.ts` | LOGIN-01~08（已有，回归） |
| `test/roles.spec.ts` / `test/pages.spec.ts` | 路由/重点页（已有） |
