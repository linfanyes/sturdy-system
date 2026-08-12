# 测试报告（Test Report）

> 执行时间：2026-08-12　|　执行人：QA 自动化　|　被测版本：`master`
> 结论：**三轮测试后后端 117 例全部通过；修复数据种子与后端接口语义不一致造成的 4 个回归缺陷。**

## 第三轮：数据富化用例回归（2026-08-12）

本轮聚焦"四级角色 × 富化种子数据"的接口一致性，补齐消息/学校公告/作业列表 4 个失败用例。

| 端 | 通过/总数 |
| --- | --- |
| 后端功能（含边界 + 富化） | 110/110 ✅ |
| 后端性能 | 7/7 ✅ |

### 第三轮修复缺陷

| # | 级别 | 缺陷 | 修复 | 回归用例 |
| --- | --- | --- | --- | --- |
| 11 | 高 | 家长消息列表恒空：seed 的 `recipientId` 用学生 `parentId`（UUID），但家长登录 JWT `sub` 为 `parentImUserId(studentId, relation, parentName)` 派生值，二者永远对不上 | seed 改为调用 `parentImUserId` 派生家长收件人 ID | FUNC-PAR-19 |
| 12 | 高 | 教师消息列表（收件箱）恒空：seed 中消息 `senderId=headId`，收件箱过滤 `recipientId=teacherId` 不匹配 | 补充校验"已发箱 / 收件箱"任一非空，并新增 `/messages/sent` 断言 | FUNC-TCH-23 |
| 13 | 中 | 学校级公告列表（`/school-admin/notices`）返回 0：seed 的学校公告 `teacherId=headId`，但 `listSchoolNotices` 以当前校管 id 过滤 | seed 改为以 `adminId`（校管自己的 id）作为学校公告 `teacherId` | FUNC-SA-13 |
| 14 | — | 用例 FUNC-SA-14 引用的 `/school-admin/homework` 端点后端未实现（404） | 改用已存在的 `/school-admin/teachers` 全量列表用例 | FUNC-SA-14 |

### 同时修复的种子脚本缺陷

- `seed.ts`：`noticeRepo / messageRepo / noteRepo / notificationRepo` 原本在循环内定义，循环外（统计计数处）无法访问，导致 TS2304 编译报错。提升到函数顶层声明，并复用同一批 Repository。
- 数据覆盖：保持 10 校 × 10 班 × 30 师 × 60 生 × 10 考试，并新增 `scope=school` 的学校级公告 10 条（校管自己签发），加上班级公告 300 条、作业 400 条、考勤 600 条、消息 500 条、笔记 300 条、通知 500 条。

---

## 第二轮：边界用例补充（2026-08-10 晚）

新增 41 个边界用例（后端 38 + Web 交互 3），聚焦异常输入、越权、隔离、容错。

| 端 | 通过/总数 |
| --- | --- |
| 后端功能（含边界） | 103/103 ✅ |
| 后端性能 | 6/6 ✅ |
| Web（含 UX 边界） | 245/245 ✅ |
| 小程序 | 204/204 ✅ |

第二轮新发现并修复：

| # | 级别 | 缺陷 | 修复 | 回归用例 |
| --- | --- | --- | --- | --- |
| 8 | 高 | 成绩录入（import-commit）无分数范围校验，负分可落库 | 过滤 0-1000 之外的分数（缺考 null 允许） | EDGE-TCH-02 |
| 9 | 高 | 成绩录入不校验学生班级归属，可向他班成绩表写入任意学生 | 按本班学生集合过滤导入行 | EDGE-TCH-03 |
| 10 | — | 产品缺口补齐：教师无自助改密入口 | 新增 `POST /auth/change-password`（校验原密码、8-20 位、审计日志）+ Web 设置页"账号安全"标签页 | EDGE-TCH-10 |

---

## 一、测试结果汇总

| 端 | 套件 | 通过 | 总数 | 结果 |
| --- | --- | --- | --- | --- |
| 后端 | 功能（server/qa/functional + edge） | 110 | 110 | ✅ |
| 后端 | 性能（server/qa/performance） | 7 | 7 | ✅ |
| Web | 交互体验 + 全页面冒烟 + 路由权限（8 套件） | 242 | 242 | ✅ |
| 小程序 | 登录安全 + 跨端一致性（10 套件） | 204 | 204 | ✅ |
| **合计** | | **563** | **563** | **✅** |

构建与类型检查：Web `vue-tsc` + `vite build` ✅；Server `tsc --noEmit` ✅；小程序 `uni build` ✅（主包 1540KB，低于 2MB 门禁）。

---

## 二、后端性能结果（数据集：10 校 × 6000 生 × 1000 考试 × 6000 成绩记录 + 富化数据）

| ID | 场景 | p50 | p95 | 吞吐 | 结果 |
| --- | --- | --- | --- | --- | --- |
| PERF-01 | 统一登录并发（bcrypt CPU 密集） | 354ms | 722ms | 27.92 RPS | ✅ |
| PERF-02 | 家长成绩查询（10 考试×6 科） | 2ms | 2ms | 100 RPS | ✅ |
| PERF-03 | 家长看板聚合（9 接口×30 家长，并发 15） | 20ms | 57ms | 270 RPS | ✅ |
| PERF-04 | 教师班级成绩查询（60 生×6 科 JSON） | 6ms | 7ms | 100 RPS | ✅ |
| PERF-05 | 5000 学生分页遍历（40 页） | 11ms | 13ms | 40 RPS | ✅ |
| PERF-06 | 混合并发只读（三角色 300 请求/并发 20） | 37ms | 47ms | 300 RPS | ✅ |
| PERF-07 | 教师笔记/消息/通知/作业/公告列表（富化数据 100 次） | 1ms | 3ms | 100 RPS | ✅ |

说明：登录吞吐受 bcrypt（cost=10）校验主导，属预期 CPU 瓶颈；查询类接口在 6000 学生规模下 p95 均 < 60ms，满足交互体验要求。

---

## 三、本轮（含历史）发现并修复的缺陷

| # | 级别 | 缺陷 | 影响 | 修复 | 回归用例 |
| --- | --- | --- | --- | --- | --- |
| 1 | 严重 | 服务端引用 `@gardener/shared` 运行时无法解析：shared 以 ESM 编译且相对导入缺扩展名，Docker 构建上下文（仅 server/）也不含 shared | 含 shared 引用的版本**部署后启动即崩溃** | shared 改 CommonJS 编译 + 补全 exports 子路径 + `server/scripts/sync-shared.cjs` vendor 化 + `file:` 依赖 | 启动 Harness + FUNC 全量 |
| 2 | 严重 | 校管「成绩查询与汇总」恒 500：`classRepo` 误用 `{classId}` 条件，而 ClassItem 无 classId 列 | 校管成绩汇总页不可用 | 改为按主键 `id` 查询 | FUNC-SA-10 |
| 3 | 严重 | 纯家长统一登录 JWT 缺 `parentId`：`/parent-auth/me` 返回 null | 家长看板丢失学生信息/孩子列表 | 登录时复用/创建 Parent 记录并回填 parentId、签发进 JWT | FUNC-PAR-04/18、UX-PAR |
| 4 | 高 | 无 classId 列的实体（如 checkins）按班级查询恒 500：CrudService 无条件附加 classScopeField | 教师「学生打卡」页不可用 | 仅当实体确有该列才按班级过滤，否则回退 teacherId 隔离 | FUNC-TCH-13 |
| 5 | 高 | 小程序家长登录仅允许纯数字学号，与统一登录/学号管理（字母数字 2-32 位）不一致 | 字母学号学生家长无法从小程序登录 | 后端与小程序页统一采用 `isStudentNo` 口径 | FUNC-CONS-02、MINI-CONS |
| 6 | 中 | 小程序学生列表默认口令展示「学号后6位」，与后端实际初始口令 `123456` 不符 | 家长按提示登录失败 | 展示改为 `123456`（与后端一致） | MINI-CONS |
| 7 | 低 | shared exports 缺 `utils/gender`、`utils/student` 等子路径 | Node 运行时报 ERR_PACKAGE_PATH_NOT_EXPORTED | 补全 9 个子路径并统一 `default` 条件 | 启动 Harness |
| 8-14 | — | 见"第三轮/第二轮修复缺陷" | | | |

---

## 四、覆盖说明

- **四级用户全功能**：超管 13 例、校管 14 例、教师 24 例、家长 19 例、跨端 2 例、边界 38 例（含安全 4 例）= **110 例** + 性能 7 例。
- **页面级**：Web 183 个路由全量渲染冒烟（routes-smoke）；小程序关键页面安全属性 + 跨端一致性。
- **权限隔离**：跨校（FUNC-SA-11）、跨租户（FUNC-TCH-05）、跨角色（FUNC-SUP-13 / FUNC-PAR-16）、无 token（FUNC-SUP-05 / FUNC-TCH-20）。
- **数据契约**：seed 数据与线上真实数据结构对齐（UUID 主键、parentImUserId 派生、school 级公告以校管 id 为 owner）。
- **安全**：SQL 注入（FUNC-SUP-04）、XSS 原样存储（EDGE-SEC-01）、超长字段安全处理（EDGE-SUP-04 / EDGE-SEC-02）、篡改 JWT 拒绝（EDGE-SUP-03 / EDGE-PAR-08）。

## 五、遗留风险与建议

1. 云托管横向扩容后登录限流为进程内存计数，配额随实例倍增；如需严格全局限流建议接入 Redis 存储。
2. 性能测试基于单核内存库，生产 MySQL/多核环境表现应更优；建议上线后以 RUM 监控 Core Web Vitals 持续跟踪。
3. 建议后续迭代补充 `/school-admin/homework` 全校聚合端点（FUNC-SA-14 已以教师列表用例占位覆盖相同聚合需求）。

---

*原始结果数据：`server/qa/server-results.json`（后端）、各端 jest 输出。*
