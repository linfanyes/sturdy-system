# 三端全量测试计划（Web / 小程序 / 后端）

> 目标：实现终极目标（两端体验一致、四角色功能完整、数据互通持久化、后端稳定）。
> 本文档是测试总纲：先记录摸底结论，再定义测试数据、三端测试用例、性能边界与验收口径。

---

## 一、摸底结论（排查阶段产出）

### 1.1 四角色在两端的入口与功能覆盖

| 角色 | Web 端入口 | 小程序端入口 | 覆盖情况 |
|------|-----------|-------------|---------|
| super 超管 | `/super`（学校管理/校管管理/平台配置/AI服务商/成绩审计/审计日志/账号清除） | `pages/admin/admin`（登录 + 仪表盘 + 学校/校管/配置/AI/成绩审计/审计日志） | ✅ 两端均有完整面板 |
| school_admin 校管 | `/school-admin`（工作台/教师/班级/学生/公告/教材/资源库/功能包/成绩汇总/AI配置/智慧中小学） | `pages/school-admin/school-admin`（仪表盘/教师/班级/学生/AI配置/成绩 六个Tab） | ⚠️ 功能基本一致，Web 多「智慧中小学」入口，小程序以 Tab 聚合 |
| teacher 教师 | `/teacher` + `/exams` `/classes` `/evaluation` `/attendance` `/tools` `/workspace` `/ai` `/office` `/games` 等大量页面 | 主包 dashboard/classes/students/toolbox/config + community 分包（班级/作业/考勤/公告/资源/成长/家校等）+ games/ai 分包 | ✅ 教师端为最大功能面，两端页面基本对称 |
| parent 家长 | `/parent`（工作台/教材/资源库/跨娃比对） | `pages/parent/parent`（待办/成绩/考勤/教材/概览 五Tab + 多娃切换 + 信息维护/申请记录/消息中心） | ⚠️ Web 端家长页相对精简，小程序端 Tab 更丰富（待办/成绩/考勤/教材/概览） |

**差异点（后续测试重点关注，判断是否需补齐）：**
1. 家长端：小程序有「待办通知/考勤」Tab，Web 家长 Dashboard 是否有等价功能？→ 需 Web 端页面核对
2. 超管端：Web 有 `AccountClear`(账号清除)，小程序 admin 面板是否有对应入口？→ 需核对
3. 校管端：Web 有 `Zhxue`(智慧中小学) 与 `Academic`(成绩汇总) 独立页，小程序用 Tab 合并，功能等价性需验证
4. 教师端页面量大，两端均有，但需逐一核对按钮/功能点等价

### 1.2 两端 API 一致性

- 两端请求均基于同一套后端 `/api/v1` 前缀；`web-app/public/config.js` 与 `scripts/set-web-env.js` 已统一为 `/api/v1`（此前 `/api`→307 重定向问题已修复）
- 小程序 `src/api/` 与 Web `src/api/` 均直接复用 `shared/api/endpoints.ts` 的路径常量（如 game-scores、chat-sessions），并各自封装 request 层
- 关键 CRUD（classes/students/exams/grades/notes/todos 等）两端调用路径一致（`GET/POST /classes`、`PATCH/DELETE /classes/:id` 等）
- 登录：教师/超管/校管走 `POST /auth/unified-login`；家长走 `POST /parent-auth/login`；两端一致
- **结论：两端 API 对齐良好，未发现调用不同后端接口的分叉；后续以接口集成测试覆盖验证**

### 1.3 幂等性排查结论

| 写操作 | 幂等机制 | 结论 |
|--------|---------|------|
| `POST /game-scores` | 按 `teacherId+gameKey` upsert 最高分 | ✅ 幂等 |
| 校管新增教师 | username 唯一性校验（拼音冲突自动+后缀） | ✅ 防重 |
| 校管新增校管（超管） | username 唯一性校验 | ✅ 防重 |
| 新增学生 | 学号唯一性校验（含批内/库内双重查重） | ✅ 防重（班级维度） |
| 新增学校 | code 自动生成（前缀+平台后缀+序号） | ✅ 生成唯一编号 |
| 新增班级 | 班级名称+年级+序号，DB 部分唯一索引兜底 | ✅ 防重 |
| 成绩导入 | `import-commit` 走事务 + 覆盖/合并逻辑 | ⚠️ 需验证 merge 语义 |
| 消息/通知 | 发送即落库，无业务级幂等（同一请求不重复发的场景由前端防抖） | ⚠️ 前端需防连点，测试需确认 |
| 家长信息修改申请 | 提交即创建申请（未做同字段去重） | ⚠️ 测试观察 |

**测试要点：所有 POST 创建类接口做「重复提交」用例，验证不会产生重复脏数据或返回可预期的错误。**

---

## 二、测试范围与测试数据方案

### 2.0 进度状态（滚动更新）

| 阶段 | 状态 | 结果 |
|------|------|------|
| 1. 后端接口全量测试 | ✅ 完成 | `test/backend/api-tests.mjs` 147/147 全绿（连续 3 轮） |
| 2. 性能/边界测试 | ✅ 完成 | 分页边界/限流/重复提交/并发 20 学生写入 通过 |
| 3. 大数据量 QA（可选） | ✅ 已有 | `server/qa` 164 功能 + 10 性能 全过（2万级数据） |
| 4. Web 端测试（四角色） | ⏳ 进行中 | 见 `test/web/WEB_TEST_CASES.md` |
| 5. 小程序端测试（四角色+一致性） | ⏳ 待执行 | 见 `test/mini/MINI_TEST_CASES.md` |
| 6. 汇总三端测试报告 → 修复 → 回归 | ⏳ 待执行 | `test/REPORT.md` |

> 已修复的后端问题（见 git/报告）：全局限流 60/min 过严导致并发 429 → 提升至 600/min
> （AI 接口仍 10/min）；学生学号唯一性校验；分页 skip 负数兜底；game 功能开关名对齐。

### 2.1 测试数据（自建数据工厂）

通过超管/校管接口按下列规格造数据，保证可回溯、可清理：

- **超管账号**：`admin`（已有）
- **学校**：创建 `测试小学`（web 平台）与 `测试中学`（mini 平台）两所，记录各自 code
- **校管账号**：每所学校 1 个（如 `sadmin_test1` / `sadmin_test2`）
- **教师**：每校至少 3 名（班主任1 + 科任2），覆盖 `teacher` 角色与班级协作
- **班级**：每校 2 个班（含一个可升级班级）
- **学生**：每班 3 名（学号唯一，含一个开启家长登录的）
- **家长**：由开启家长登录的学生生成默认口令 `123456`
- **考试/成绩**：每班 1 次考试、每生 ≥2 科成绩（用于成绩 CRUD/分析/雷达/趋势/榜单）
- **业务数据**：考勤、通知、作业、资源库、教材、游戏得分、AI 会话、消息、打卡、成长记录、值日等各造 2~3 条
- **清理策略**：测试结束按「测试学校」删除（`reset-all` 仅限非生产；局部清理用 delete 接口）

### 2.2 测试执行顺序

1. **后端接口全量测试**（集成脚本打真实接口，覆盖全部 controller）
2. **性能/边界测试**（分页上限、限流、重复提交、大 take、并发）
3. **Web 端测试**（四角色逐页面：渲染/按钮/表单/跳转/排版/响应式）
4. **小程序端测试**（四角色逐页面 + 两端一致性核对）
5. **汇总三端测试报告** → 缺陷清单 → 修复 → 回归

---

## 三、后端接口测试用例（按模块）

> 统一约定：`BASE=http://127.0.0.1:3000/api/v1`；用例格式 `方法 路径 → 期望`。

### 3.1 认证 `auth`
| # | 用例 | 期望 |
|---|------|------|
| A1 | POST /auth/unified-login (超管/校管/教师) | 200 返回 token+role |
| A2 | POST /auth/unified-login (错误密码) | 401/400 |
| A3 | POST /auth/password-login (教师) | 200 |
| A4 | POST /auth/change-password (校验原密码) | 200 / 原密码错误则拒绝 |
| A5 | GET /auth/me (带 token) | 200 返回 role/effectiveFeatures |
| A6 | 登录限流 | 同 IP 连续 >10 次/min → 429 |

### 3.2 超管 `admin`
| # | 用例 | 期望 |
|---|------|------|
| B1 | GET/POST/PATCH/DELETE /admin/schools | CRUD 正常，code 唯一 |
| B2 | POST /admin/schools (重名校) | 允许（name 不查重）→ 记录行为 |
| B3 | GET /admin/schools/export | 200 导出 |
| B4 | GET/PATCH /admin/schools/:id/features | 功能包读写 |
| B5 | POST /admin/school-admins (username 重复) | 400「用户名已存在」|
| B6 | PATCH /admin/school-admins/:id/enabled | 停启用 |
| B7 | POST /admin/school-admins/:id/password | 重置密码后可登录 |
| B8 | GET /admin/teachers /admin/classes /admin/students | 跨校审计视图 |
| B9 | GET /admin/audit-logs /admin/audit-exams /admin/audit-grades | 审计查询 |
| B10 | GET /admin/audit-grade-summary | 汇总 |
| B11 | POST /admin/reset-all (confirm=true, 非生产) | 全量清空（最后执行）|

### 3.3 校管 `school-admin`
| # | 用例 | 期望 |
|---|------|------|
| C1 | POST /school-admin/login | 200 |
| C2 | GET /school-admin/dashboard | 统计 |
| C3 | GET/PATCH /school-admin/school-features | 本校功能包 |
| C4 | CRUD /school-admin/teachers + batch + batch-import + import-preview + import-ai | 全链路 |
| C5 | PATCH /school-admin/teachers/:id/features /reset-password /delete /deactivate-all | 教师管理 |
| C6 | CRUD /school-admin/classes + promote + batch + import | 班级全链路 |
| C7 | CRUD /school-admin/notices | 公告 |
| C8 | GET /school-admin/students + export + PATCH/DELETE + batch + import | 学生全链路 |
| C9 | GET /school-admin/export/teachers-xls /students-xls /classes-xls | 二进制导出 |
| C10 | GET /school-admin/search | 全局搜索 |
| C11 | GET /school-admin/academic/exams /grades /summary /class-comparison /class-trend | 成绩只读分析 |
| C12 | GET /school-admin/homework | 作业聚合 |

### 3.4 教师端动态 CRUD（classes/students/exams/grades 等）
| # | 用例 | 期望 |
|---|------|------|
| D1 | POST/GET/PATCH/DELETE /classes | 班级 CRUD + teacherId 隔离 |
| D2 | POST /classes/:id/members/list /school-teachers /members /DELETE members/:teacherId /PATCH my-subjects /PATCH members/:teacherId/subjects /GET :id/dashboard + GET/PATCH /classes/:id/parent-features | 班级协作全链路 + 家长功能包管理（班主任） |
| D3 | POST/GET/PATCH/DELETE /students + /students/:id/toggle-parent-login /reset-parent-password /parent-bindings(+/unbind/set-primary) /import /import-commit /import-ai /bulk | 学生全链路 |
| D4 | POST/GET/PATCH/DELETE /exams | 考试 CRUD |
| D5 | POST/GET/PATCH/DELETE /grades + /grades/merge /import-preview /import-commit /import-ai + GET /grades/analysis/exam /trend /rank /student/:id /weak /export | 成绩全链路 |
| D6 | 动态 CRUD 同族接口：/notes /todos /picker-history /checkins /semesters /duty-rosters /lesson-observations /work-logs /reading-logs /math-mistakes /growth-entries /behavior-records /reward-records /score-records /group-scores /award-records /award-categories /class-expenses /class-activities /class-duty-configs /parent-contacts /notice-templates /home-visits /seat-layouts /my-galleries /schedules /attendances /homework /notices /resources /class-galleries /generated/* /backups | 逐一 CRUD 冒烟 |

### 3.5 家长 `parent-auth`
| # | 用例 | 期望 |
|---|------|------|
| E1 | POST /parent-auth/login (学号+默认口令) | 200 |
| E2 | GET /parent-auth/me /notices /exams /homework /attendance /behavior /schedule /communications /teachers /bindings /compare-kids | 只读聚合 |
| E3 | POST /parent-auth/change-password | 改密后可重新登录 |
| E4 | POST /parent-auth/switch-student | 多娃切换 |
| E5 | POST /parent-auth/student-update-request + GET /student-update-requests | 信息修改申请闭环 |
| E6 | 家长登录返回 `effectiveFeatures`（家长功能包），家长端按包隐藏功能；无师兼家 | 功能包生效 + 独立登录 |

### 3.6 通用业务接口
| # | 用例 | 期望 |
|---|------|------|
| F1 | GET /users/me + PUT/PATCH /users/me | 教师资料 |
| F2 | GET /messages + /sent + /unread-count + /recipients + POST /messages + PATCH /:id/read + /mark-all-read + DELETE /:id | 四角色站内消息 |
| F3 | GET /notifications + /unread-count + PATCH /:id/read + POST /mark-all-read | 通知 |
| F4 | GET/POST /game-scores + GET /:gameKey（重复提交幂等） | 游戏得分 |
| F5 | CRUD /chat-sessions + /:id/messages + /:id/pin | AI 会话 |
| F6 | GET /config/public + GET/PUT /config/app(super) + GET/PUT/PATCH /config/ai + /ai-settings + /ai/models + /ai-providers + /app-config | 配置 |
| F7 | CRUD /ai-providers (super) | AI 服务商 |
| F8 | GET /resource-library/* + /textbooks/tree|search + /online-resources/zhzx/courses | 资源/教材/在线资源 |
| F9 | GET /teaching-calendar + CRUD | 教学日历 |
| F10 | GET /leaderboard?classId | 排行榜 |
| F11 | GET /analysis/student-trend /class-trend /subject-strength | 学情分析 |
| F12 | POST /monitor/log + GET /monitor/logs(super) | 监控 |
| F13 | GET /health + /health/cache | 健康检查 |
| F14 | AI：POST /ai/chat-sync /parse /parse-file /asr /ocr /gen-image /chat(SSE) | AI 链路（含超时/限流）|
| F15 | 越权用例：teacher token 访问 admin/school-admin 接口 | 403 |
| F16 | 分页边界：take=99999 → 截断 ≤500；skip 负值 → 0 | 不 500 |

### 3.7 幂等/边界/性能用例
| # | 用例 | 期望 |
|---|------|------|
| G1 | 重复 POST /game-scores 同 gameKey | 最高分不重复、playCount 递增 |
| G2 | 重复 POST /admin/school-admins 同 username | 400 |
| G3 | 重复新增学生同学号 | 400/失败明细 |
| G4 | 重复新增教师同 username | 400/自动加后缀 |
| G5 | 并发 50 次创建学生（同班） | 无重复、无异常 |
| G6 | 大列表 take=5000 查询 grades/students | 响应 <3s 且被截断 |
| G7 | 登录暴力破解 10 次/分钟 | 429 |
| G8 | 全局限流 60/min/IP | 超限 429 |

---

## 四、Web 端测试用例（四角色）

> 手段：浏览器自动化 + 组件渲染检查；每个页面核对「渲染/按钮/表单/跳转/空态/排版响应式」。

### 4.1 通用
- W1 登录页：四角色登录入口、错误提示、记住登录
- W2 路由守卫：未登录访问受保护页 → 跳登录；越权角色访问 → Forbidden
- W3 布局：导航、面包屑、页脚、响应式（1280/768/375 三档）

### 4.2 超管
- W-S1 Dashboard 统计卡片与数据一致性
- W-S2 学校管理：列表/新增/编辑/删除/搜索/分页/导出
- W-S3 校管管理：增删改/启停/重置密码/批量
- W-S4 平台配置：读取/保存/密钥脱敏
- W-S5 AI 服务商：CRUD/启停
- W-S6 学校功能包：按校配置
- W-S7 成绩审计：列表/筛选/汇总
- W-S8 审计日志：筛选/分页
- W-S9 账号清除：确认弹窗/防误触

### 4.3 校管
- W-A1 工作台统计
- W-A2 教师管理：CRUD/批量/导入预览/导入AI/重置密码/功能包
- W-A3 班级管理：CRUD/升级/批量/导入/成员
- W-A4 学生管理：CRUD/批量/导入/导出/家长登录开关
- W-A5 公告/教材/资源库/功能包/AI配置/成绩汇总/智慧中小学：各自 CRUD 与只读

### 4.4 教师
- W-T1 工作台快捷入口与统计
- W-T2 班级/学生管理：CRUD/协作成员/家长登录/信息审核
- W-T3 考试/成绩：CRUD/导入预览/提交/分析(考试/趋势/排名/雷达/学生)/导出
- W-T4 考勤/打卡/阅读/排行榜/成长记录
- W-T5 工具箱/游戏/学科工具/办公工具/AI(对话/生成/文生图)/日历/留言板/通知
- W-T6 个人资料/配置/数据管理

### 4.5 家长
- W-P1 工作台：孩子信息/统计卡片/多娃
- W-P2 成绩查询/待办/考勤/教材/资源库/跨娃比对
- **（与小程序家长 Tab 差异核对）**

---

## 五、小程序端测试用例（四角色）

> 手段：静态页面核对 + API 契约比对 + 真机不可用部分标注；重点做「与 Web 功能对称性」。

### 5.1 通用
- M1 pages.json 全页面可达性（主包/分包/tabBar）
- M2 request 封装 baseURL /api/v1 与错误处理
- M3 四角色登录：超管(admin页)/校管(school-admin页)/教师(主登录)/家长(parent-login)

### 5.2 角色页
- M-S 超管 admin：登录/仪表盘统计/学校/校管/配置/AI/成绩审计/审计日志 入口
- M-A 校管 school-admin：仪表盘/教师/班级/学生/AI配置/成绩 六 Tab
- M-T 教师：dashboard/classes/students/toolbox/config + community(班级/作业/考勤/公告/资源/成长/家校/消息/信息审核) + games + ai 分包
- M-P 家长 parent：待办/成绩/考勤/教材/概览 + 多娃切换 + 信息维护/申请记录/消息中心/改密

### 5.3 两端一致性核对矩阵（输出到报告）
- 每个功能点：Web 有/小程序 有/等价性/差异说明/结论（需补齐 or 可接受）

---

## 六、验收口径（终极目标）

1. 四角色在两端均可登录，登录链路与数据一致
2. 两端功能清单对称（差异项逐条给出结论：补齐 or 说明原因）
3. 两端所有写操作均持久化，数据互通（同账号 Web 写入 → 小程序可见，反之亦然）
4. 所有接口用例通过（含幂等、限流、越权、分页边界）
5. 性能边界在可接受范围（列表分页、并发写入不拖垮 DB）
6. 汇总三端测试报告，缺陷全量修复并回归

---

## 七、产物清单
- `test/TEST_PLAN.md`（本文档）
- `test/backend/api-tests.mjs`（后端接口集成测试脚本 + 测试数据工厂）
- `test/backend/perf-tests.mjs`（性能/边界测试）
- `test/web/WEB_TEST_CASES.md`（Web 用例明细）
- `test/mini/MINI_TEST_CASES.md`（小程序用例明细）
- `test/REPORT.md`（三端测试报告 + 缺陷清单）
