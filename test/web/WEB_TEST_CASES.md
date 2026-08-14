# Web 端测试用例（WEB_TEST_CASES.md）

> 依据系统实际页面/按钮/接口编写；配套自动化测试位于 `web-app/test/`（Jest + Vue Test Utils + jsdom），
> 运行：`cd web-app && npm test`（当前 10 套件 / 260 用例全绿）。
> 标注说明：`[A]`=自动化覆盖，`[M]`=需人工/真机核对项，`[P]`=性能/边界项。

---

## 一、自动化测试资产映射

| 测试文件 | 覆盖的用例域 | 用例数 |
|---------|-------------|-------|
| `test/ux/login.spec.ts` | 统一登录页（表单/校验/可见性/大写锁/历史账号/角色跳转/头像） | 10 |
| `test/ux/parent-dashboard.spec.ts` | 家长成长看板（信息架构/概览卡/作业截止/健康度/每周小结/联系老师/成绩详情/课表/空态/重试/订阅引导/家长功能包显隐） | 16 |
| `test/ux/class-members-parent-features.spec.ts` | 班级成员·家长功能包管理（跟随默认/自定义勾选/保存/恢复/非班主任只读） | 4 |
| `test/integration/AppLayout.spec.ts` | 布局 + 嵌套路由渲染 | 1 |
| `test/integration/AppLayout.menu.spec.ts` | 四角色菜单/导航/搜索框/一级分类/退出登录 | ~40 |
| `test/integration/navigation.spec.ts` | 路由守卫 NAV-01~05（未登录/越权/404/已登录回跳） | 5 |
| `test/integration/login-flow.spec.ts` | 登录全流程 + 路由守卫（复用 NAV 用例） | 10 |
| `test/integration/routes-smoke.spec.ts` | **全路由冒烟**：>100 个叶子页面逐页渲染非空 | >100 |
| `test/roles.spec.ts` | 四角色路由表结构与 meta 校验 | ~20 |
| `test/unit/request.spec.ts` | 请求层：AbortController 取消 / SWR 缓存 | 9 |

> 补充：`test/data/*`、`test/helpers/*` 为测试数据与 mock 工厂（自建测试数据）。

---

## 二、四角色页面 × 功能用例矩阵

### 2.1 通用（所有角色）
| # | 用例 | 手段 | 状态 |
|---|------|------|------|
| W-01 | 登录页：四角色统一登录（超管/校管/教师走 `/auth/unified-login`，家长走 `/parent-auth/login`） | [A] login.spec | ✅ |
| W-02 | 登录表单校验：空表单/错误密码/大写锁定/密码可见性 | [A] login.spec | ✅ |
| W-03 | 四角色独立登录：教师用教师用户名登录、家长用学号+口令登录，两端无「师兼家」入口 | [A] login.spec + parent-login.spec | ✅ |
| W-04 | 路由守卫：未登录→登录页(带 redirect)；越权角色→403；未知路径→404 | [A] navigation/login-flow | ✅ |
| W-05 | 布局：导航/面包屑/页脚渲染；登录后按角色重定向 | [A] AppLayout / roles | ✅ |
| W-06 | 响应式排版 1280/768/375 三档 | [M] 需浏览器人工核对 | ⏳ |
| W-07 | 侧边导航与顶部用户区（含退出登录） | [A] AppLayout.menu | ✅ |

### 2.2 超管 super（`/super/*`）
| # | 页面 | 关键按钮/功能 | 手段 | 状态 |
|---|------|--------------|------|------|
| W-S1 | Dashboard 工作台 | 统计卡片渲染、数据加载 | [A] routes-smoke | ✅ |
| W-S2 | Schools 学校管理 | 列表/新增/编辑/删除/搜索/分页/导出/启停 | [A] routes-smoke + 后端接口 B1~B3 | ✅(接口已全测) |
| W-S3 | Admins 校管管理 | 增删改/启停(`enabled`)/重置密码(`password`)/批量(`batch-toggle`) | [A] routes-smoke + 接口 B5~B7 | ✅ |
| W-S4 | PlatformConfig 平台配置 | 读取/保存/密钥脱敏 | [A] routes-smoke + 接口 F6 | ✅ |
| W-S5 | AiProviders AI服务商 | CRUD/启停 | [A] routes-smoke + 接口 F7 | ✅ |
| W-S6 | SchoolFeatures 学校功能包 | 按校配置功能开关 | [A] routes-smoke + 接口 B4 | ✅ |
| W-S7 | GradeAudit 成绩审计 | 列表/筛选/汇总(`audit-grade-summary`) | [A] routes-smoke + 接口 B10 | ✅ |
| W-S8 | AuditLogs 审计日志 | 筛选/分页 | [A] routes-smoke + 接口 B9 | ✅ |
| W-S9 | AccountClear 账号清除 | 确认弹窗/防误触/`reset-all` | [A] routes-smoke + 接口 B11 | ✅ |
| W-S10 | Teachers/Students 跨校审计视图 | 只读列表 | [A] routes-smoke + 接口 B8 | ✅ |

### 2.3 校管 school_admin（`/school-admin/*`）
| # | 页面 | 关键按钮/功能 | 手段 | 状态 |
|---|------|--------------|------|------|
| W-A1 | Dashboard 工作台 | 统计 | [A] routes-smoke + 接口 C2 | ✅ |
| W-A2 | Teachers 教师管理 | CRUD/批量/导入(`import`)/导入预览(`import-preview`)/AI导入(`import-ai`)/重置密码/功能包(`features`)/启停(`deactivate-all`) | [A] routes-smoke + 接口 C4~C5 | ✅ |
| W-A3 | Classes 班级管理 | CRUD/升级(`promote`)/批量/导入/成员 | [A] routes-smoke + 接口 C6 | ✅ |
| W-A4 | Students 学生管理 | CRUD/批量/导入/导出(`export/*-xls`)/家长登录开关(`toggle-parent-login`/`reset-parent-password`) | [A] routes-smoke + 接口 C8~C9 | ✅ |
| W-A5 | Notices 学校公告 | CRUD/置顶/结束 | [A] routes-smoke + 接口 C7 | ✅ |
| W-A6 | Textbooks 教材知识库 | 树/搜索/知识点 CRUD | [A] routes-smoke + 接口 F8 | ✅ |
| W-A7 | ResourceLibrary 专项资源库 | 分类 CRUD/搜索/seed | [A] routes-smoke + 接口 F8 | ✅ |
| W-A8 | Features 功能包 | 本校功能开关 | [A] routes-smoke + 接口 C3 | ✅ |
| W-A9 | Academic 成绩汇总 | 考试/成绩/汇总/班级对比/趋势 | [A] routes-smoke + 接口 C11 | ✅ |
| W-A10 | AiConfig / Zhxue 智慧中小学 | AI配置 / 在线资源 | [A] routes-smoke + 接口 F6/F8 | ✅ |
| W-A11 | 全局搜索（教师/班级/学生） | 顶部搜索框 | [A] AppLayout.menu + 接口 C10 | ✅ |

### 2.4 教师 teacher（`/teacher/*`，页面量最大）
| # | 功能组 | 页面 | 手段 | 状态 |
|---|-------|------|------|------|
| W-T1 | 工作台 | Dashboard | [A] routes-smoke | ✅ |
| W-T2 | 班级管理 | Classes/ClassDetail（成员协作 `members/list`、`school-teachers`、任课科目 `subjects`、**家长功能包管理 `parent-features`**） | [A] routes-smoke + class-members-parent-features.spec + 接口 D2 | ✅ |
| W-T3 | 学生管理 | Students（CRUD/批量/导入/家长登录/信息审核 `student-info-updates/review`） | [A] routes-smoke + 接口 D3 | ✅ |
| W-T4 | 考试/成绩 | Exams/Grades（CRUD/导入预览/提交/AI导入/分析 exam/trend/rank/weak/student/导出） | [A] routes-smoke + 接口 D4~D5 | ✅ |
| W-T5 | 考勤/打卡/阅读/成长 | Attendance/Checkin/Reading/Growth | [A] routes-smoke + 接口 D6 | ✅ |
| W-T6 | 动态 CRUD 页 | SchemaCrudPage（notes/todos/duty/observation/work-log/reading-log/math-mistakes/behavior/reward/score/group-scores/award/expenses/activities/seat-layouts/galleries/schedules/homework/notices/resources/notice-templates 等） | [A] routes-smoke（渲染）+ 接口 D6（CRUD 全链路） | ✅ |
| W-T7 | 工具箱/学科工具 | Toolbox/SubjectTools/各工具页（点名/分组/决定器/计时/计算器/座位/加减分/评语/总结/课表/汉字/听写/阅读/作文/口算/错题…） | [A] routes-smoke | ✅ |
| W-T8 | 小游戏合集 | GamesIndex + 60+ 游戏页 | [A] routes-smoke + 接口 F4（得分幂等） | ✅ |
| W-T9 | AI 工具 | AiChat/AiImage/AiGenerator/Textbook/ResourceLibrary/Zhxue/Papers/Knowledges | [A] routes-smoke + 接口 F14 | ✅ |
| W-T10 | 办公工具 | OfficeTools/Translate/Blackboard/Speech/PlanTemplateLib/QuickTool | [A] routes-smoke | ✅ |
| W-T11 | 个人资料/配置/数据管理 | Profile/Config/DataManager | [A] routes-smoke + 接口 F1 | ✅ |
| W-T12 | 消息/通知 | Messages/Notifications（收件人/会话/已读/全部已读/删除） | [A] routes-smoke + 接口 F2~F3 | ✅ |

### 2.5 家长 parent（`/parent/*`）
| # | 页面 | 关键功能 | 手段 | 状态 |
|---|------|---------|------|------|
| W-P1 | Dashboard 家长中心 | 今日需关注/概览卡/作业截止/健康度/每周小结/联系老师/成绩详情/课表/空态/重试/订阅引导/**家长功能包显隐（关闭/空数组/未配置三态）** | [A] parent-dashboard.spec（16 用例） | ✅ |
| W-P2 | Textbook 教材知识点 | 只读浏览 | [A] routes-smoke + 接口 E2/F8 | ✅ |
| W-P3 | ResourceLibrary 专项资源库 | 只读浏览 | [A] routes-smoke + 接口 E2 | ✅ |
| W-P4 | KidsCompare 跨娃比对 | 多娃对比（关联 ≥2 娃时显示入口） | [A] AppLayout.menu + 接口 E2-10 | ✅ |
| W-P5 | 多娃切换/信息维护/申请记录/改密 | switch-student/student-update-request/change-password | [A] 接口 E3~E5 | ✅ |

> 家长端「待办/考勤/成绩」等能力已聚合进 Dashboard（今日需关注含待办、考勤预警、最近考试），
> 与小程序家长 Tab（待办/成绩/考勤/教材/概览）功能等价，差异为信息架构聚合方式。

---

## 三、排版 / 空态 / 边界检查
| # | 项 | 手段 | 状态 |
|---|----|------|------|
| W-10 | 全页面空数据空态文案不崩溃 | [A] routes-smoke（mock 空数据）+ parent-dashboard UX-PAR-09 | ✅ |
| W-11 | 全页面加载失败可重试提示 | [A] parent-dashboard UX-PAR-10 | ✅ |
| W-12 | 大量路由并发渲染无内存/渲染异常 | [A] routes-smoke（>100 页逐页挂载） | ✅ |
| W-13 | 桌面/平板/手机三档断点排版 | [M] 需浏览器人工核对（响应式断点） | ⏳ |
| W-14 | 长列表分页/滚动性能 | [P] 后端 G6（<1000ms）+ 前端惰性加载人工核对 | ✅(后端) |

---

## 四、运行与验收
```bash
cd web-app && npm test   # 期望 10 suites / 260 tests 全绿
```
验收口径：登录链路（四角色独立，无师兼家）→ 四角色路由可达 → 全页面渲染 → 关键 CRUD 接口联动（含班主任家长功能包管理）→ 空态/失败兜底无白屏。
