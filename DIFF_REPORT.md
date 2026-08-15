# 小程序与 Web 端差异报告

> 目标：确认两端是否都具备四角色管理、功能是否基本无差异、是否调用相同后端 API、关键操作是否具备幂等性。

## 1. 总结论
- **统一后端 API**：两端均调用同一套 NestJS 后端 `/api/v1/*`，仅传输层不同（小程序通过云托管私有链路 `wx.cloud.callContainer`，Web 通过浏览器 HTTP）。
- **四角色管理**：两端均支持超管 / 校管 / 教师 / 家长四角色登录与鉴权。
- **功能差异**：教师端功能基本对称；**家长端 Web 路由明显少于小程序**，是当前最大差异点；小程序有独立的 `parent-login` 页面与 `school-features` 页面。
- **幂等性**：后端关键写操作已有唯一索引或显式幂等逻辑（成绩、课表、游戏分数、家长绑定等），但通知/作业/成绩录入等重复提交防护仍需专项验证。

## 2. 四角色管理对比

| 维度 | 小程序 | Web | 结论 |
| --- | --- | --- | --- |
| 超管登录 | `/pages/login/login.vue` 角色选择 `admin`，走 `/auth/unified-login` | `/views/Login.vue` 角色选择 `super`，走 `POST /auth/unified-login` | ✅ 一致 |
| 校管登录 | 角色选择 `schoolAdmin`，token 存 `sa_token` | 角色选择 `school_admin`，由 `authMachine` 管理 | ✅ 一致 |
| 教师登录 | 角色选择 `teacher`，token 存 `g_token` | 角色选择 `teacher`，支持师兼家切换 | ✅ 一致 |
| 家长登录 | 角色选择 `parent`，走 `/auth/unified-login`；另有 `/pages/parent-login` 支持学号密码登录 | 角色选择 `parent`，走 `POST /parent-auth/login` | ✅ 基本一致，入口形式不同 |
| Token 存储 | 按角色分 key：`admin_token` / `sa_token` / `g_token` / `g_parent_token` | 由 `authMachine` / localStorage 统一管理，支持多角色切换 | ✅ 策略不同但均有效 |
| 鉴权体系 | `JwtAuthGuard` + `FeatureGuard`，按角色与学校功能开关控制 | 同上，路由 `meta.roles` + `meta.feature` 与后端双重校验 | ✅ 一致 |
| 登录态刷新 | `GET /auth/me` 返回 `role / effectiveFeatures / schoolFeatureFlags` | `POST /auth/me` 同样返回权限档案 | ✅ 一致 |

## 3. 功能差异清单

### 3.1 超管
| 能力 | 小程序 | Web | 差异 |
| --- | --- | --- | --- |
| 学校管理 | `admin.vue` 提供学校增删改查 | 超管路由存在，对应 API 一致 | ✅ 基本对称 |
| 校管账号管理 | `admin.vue` 提供校管账号管理 | Web API 一致 | ✅ 基本对称 |
| AI 供应商管理 | `admin.vue` 提供 AI 供应商增删改查 | Web API 一致 | ✅ 基本对称 |
| 系统配置 | `admin.vue` 读写 `config/app` | Web API 一致 | ✅ 基本对称 |
| 成绩/考试审计 | `admin.vue` 提供 audit-exams / audit-grades / audit-grade-summary / audit-logs | Web 路由未全量核读，API 一致 | ⚠️ 待页面级抽样确认 |

### 3.2 校管
| 能力 | 小程序 | Web | 差异 |
| --- | --- | --- | --- |
| 仪表盘 | `school-admin.vue` dashboard 统计 | Web 校管页存在，API 一致 | ✅ 基本对称 |
| 教师管理 | CRUD + 批量导入 + 重置密码 + 功能标记 | Web API 一致 | ✅ 基本对称 |
| 班级管理 | CRUD + 批量导入 + AI 识别导入 + 升级 | Web API 一致 | ✅ 基本对称 |
| 学生管理 | 查询 + 批量导入 + 家长登录开关 | Web API 一致 | ✅ 基本对称 |
| AI 设置 | AI 设置 + AI 供应商查询 | Web API 一致 | ✅ 基本对称 |
| 学术概览 | summary / exams / grades 统计图表 | Web API 一致 | ✅ 基本对称 |
| 学校功能开关 | `school-features` 独立页面 | Web 未见独立路由，可能嵌套在设置页 | ⚠️ 待确认 |

### 3.3 教师
| 能力 | 小程序 | Web | 差异 |
| --- | --- | --- | --- |
| 工作台 | `dashboard.vue` 快捷入口 + 消息提醒 | Web `/teacher/dashboard` 存在 | ✅ 对称 |
| 班级/学生/成绩/考试/作业/考勤/奖励/通知/资源/社区/AI/设置/我 | `pages.json` 均有对应页面 | Web 路由几乎一一对应（见 `router/index.ts`） | ✅ 基本对称 |
| 班级管理详情 | `classes.vue` 含班级详情 tabs（学生/成绩/考试/导入/作业/通知/考勤/行为/沟通/科目/成就） | Web `/teacher/class-management` 含 12 个 tabs，结构一致 | ✅ 对称 |
| 游戏中心 | `games` 页面（13 个小游戏） | Web `/teacher/games/*` 路由完整 | ✅ 对称 |
| 工具页 | `tools` 页面（schema-crud） | Web `/teacher/schema-crud/:entity` | ✅ 对称（实现形式不同） |
| 听课记录/工作日志/备课 | `pages.json` 存在对应页面 | Web 路由未全量核读 | ⚠️ 待页面级抽样确认 |
| 学生信息修改申请 | `student-info-update` 页面 | Web `/teacher/student-info-update` 路由存在 | ✅ 对称 |
| 请假审批/值日表 | `leave`、`duty-roster` 页面 | Web `/teacher/leave-approvals`、`/teacher/duty-roster` | ✅ 对称 |

### 3.4 家长（差异最大）
| 能力 | 小程序 `parent.vue` | Web `router/index.ts` | 差异 |
| --- | --- | --- | --- |
| 工作台 | dashboard 概览 | `/parent/dashboard` | ✅ 对称 |
| 孩子管理 | `students` tab（多娃列表/切换/绑定/添加） | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 成绩 | `grades` tab（多娃成绩/趋势） | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 考试 | `exams` tab（考试安排/成绩/详情） | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 作业 | `homework` tab（作业列表/详情/截止提醒） | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 通知 | `notices` tab（班级通知/已读回执） | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 考勤 | `attendance` tab（出勤统计/异常） | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 教材 | `textbook` tab | `/parent/textbook` | ✅ 对称 |
| 课表与值日 | `schedule` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 家校沟通 | `communications` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 科任老师 | `teachers` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 行为表现 | `behavior` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 奖励 | `awards` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| AI 对话 | `ai` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 设置 | `settings` tab | **无对应路由**；API 存在但未挂路由 | ❌ Web 缺失 |
| 资源库 | `resource` tab | `/parent/resources` | ✅ 对称 |
| 多娃对比 | `compare` tab | `/parent/compare` | ✅ 对称 |
| 独立家长登录页 | `/pages/parent-login`（学号+密码） | Web 集成在 `/views/Login.vue` | ⚠️ 入口形式不同，能力一致 |

> **关键发现**：`api/parent.ts` 与 `stores/parent.ts` 已封装 `parentStudents`、`parentGrades`、`parentHomework`、`parentExams`、`parentNotices`、`parentAttendance`、`parentAwards`、`parentSchedule`、`parentContact`、`parentSettings` 等完整能力，但 `router/index.ts` 的 parent children 仅 4 条路由。结论：**Web 家长端存在明显的路由/页面缺失**。

## 4. API 一致性验证

| 类别 | 小程序调用方式 | Web 调用方式 | 路径 | 结论 |
| --- | --- | --- | --- | --- |
| 基础请求 | `wx.cloud.callContainer` + `CLOUDRUN_ENV` + `CLOUDRUN_SERVICE` | `axios` + `request.ts` 拦截器注入 token | `/api/v1/*` | ✅ 同一后端 |
| 四角色登录 | `POST /auth/unified-login` | `POST /auth/unified-login` | `/auth/unified-login` | ✅ 一致 |
| 家长独立登录 | `POST /parent-auth/login`（`parent-login.vue`） | `POST /parent-auth/login`（`Login.vue`） | `/parent-auth/login` | ✅ 一致 |
| 微信登录/绑定 | `/auth/wechat-login`、`/auth/bind-*` | Web API 文件存在对应方法 | `/auth/wechat-login` 等 | ✅ 一致 |
| 教师业务 | `/teachers`、`/classes`、`/students`、`/grades`、`/exams`、`/homework`、`/attendance`、`/awards`、`/notices`、`/resources`、`/community`、`/ai` 等 | Web `api/teacher.ts` 覆盖同路径 | 各模块路径一致 | ✅ 一致 |
| 校管业务 | `/school-admin/*` | Web `api/school-admin.ts` 覆盖同路径 | 各模块路径一致 | ✅ 一致 |
| 家长业务 | `/parent-auth/*` | Web `api/parent.ts` 覆盖同路径 | 各模块路径一致 | ✅ 一致 |
| 超管业务 | `/admin/*` | Web `api/admin.ts` 覆盖同路径 | 各模块路径一致 | ✅ 一致 |

## 5. 幂等性评估

### 5.1 已确认的幂等机制
| 模块 | 机制 | 说明 |
| --- | --- | --- |
| 成绩录入 | 唯一索引（班级 + 考试 + 科目） | `grades/grade.entity.ts` 明确记录：唯一索引防止并发提交重复成绩 |
| 课表管理 | 按 `classId + dayOfWeek + period` 幂等 upsert | `school.module.ts` 提交阶段事务包裹 |
| 游戏分数 | 幂等 upsert 最高分 | `game-scores.service.ts`：同一游戏每人仅保留一条最高分记录 |
| 家长微信绑定 | 唯一约束 `(studentId, openId)`，已存在则返回现有记录 | `student-parent.module.ts` |
| 资源库/教材初始化 | 按 `title/word` 或 `publisher+subject+grade+term` 判重，已存在则跳过 | `resource-library.service.ts`、`textbook.service.ts` |
| 系统初始化 | 全局资源库/教材初始化为幂等逻辑 | `admin.service.ts` |

### 5.2 待专项验证的写操作
- **通知发布**：`POST /notices` 是否支持重复提交防护（幂等键或后端去重）。
- **作业布置**：`POST /homework` 是否具备幂等性。
- **成绩录入**：唯一索引已在数据库层兜底，但前端是否在重复提交时给出明确提示。
- **考勤打卡**：同一学生同一日期是否允许重复写入。
- **行为记录/家校沟通**：是否存在重复提交可能。
- **家长端 switchStudent / activateParent**：是否存在并发切换的一致性问题。

## 6. 两端数据与部署一致性
| 维度 | 现状 | 结论 |
| --- | --- | --- |
| 数据库 | 统一 MySQL（NestJS TypeORM） | ✅ 数据相通 |
| 缓存/会话 | JWT 无状态；未接入 Redis（遵循用户要求不做 Redis 改造） | ✅ 不影响当前目标 |
| 部署 | 小程序走微信云托管私有链路；Web 直连后端 `/api` | ✅ 同一后端服务 |
| 外网域名 | 云托管外网服务已开通，计划本地测完后再直连云托管外网域名 | ✅ 符合用户要求 |

## 7. 后续建议
1. **优先修复 Web 家长端路由缺失**：把 `api/parent.ts` 中已有但未挂路由的能力（students/grades/exams/homework/notices/attendance/awards/schedule/communications/teachers/behavior/settings/ai）补全到 `router/index.ts`，或确认这些能力已通过 `/parent/dashboard` 内部路由承载。
2. **补充 Web 家长端页面组件**：若路由补全后页面组件缺失，需按小程序 `parent.vue` 的 tab 结构补齐 Vue 组件。
3. **专项验证通知/作业/考勤幂等性**：通过重复提交接口验证后端是否有重复数据产生。
4. **排版/UI 一致性检查**：选取教师 dashboard、成绩录入、通知详情三类核心页面，对比两端布局与操作路径是否一致。
5. **测试数据准备**：覆盖四角色 + 多娃家长场景，准备边界数据（禁用账号、未开启家长登录的学生、重复学号等）。
