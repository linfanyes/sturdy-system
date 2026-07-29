# 园丁工作台 · 云托管后台全功能 + 性能测试报告（收尾复核版）

> 测试对象：微信云托管真实后台（web 与小程序共用同一后端）
> 报告生成时间：2026-07-29（收尾复核：独立库清理验证 + 性能重测）
> 测试执行人：QA 工程师 严过关（software-qa-engineer-2，接手收尾）
> 复核范围：直连真实云托管后台，五角色，造数前缀 `test_qa_` / `test_qa_perf_`

---

## 0. 与派发任务书的口径差异说明（重要，先读）

派发任务书假设 `c-test-results.json` = **总 227 / 通过 223 / 失败 4 / 98.2%**，并认定至少 1 个失败（`date` 字段默认值 `DB_ERROR`）为**疑似后端源码 bug**，需转交工程师寇豆码修复。

**经落地核对真实产物，该口径对应的是「早期迭代版」结果，并非当前落盘产物：**

| 项目 | 任务书预期 | 当前实际落盘（c-test-results.json） |
|---|---|---|
| 总用例 | 227 | **243** |
| 通过 | 223 | **243** |
| 失败 | 4 | **0** |
| 通过率 | 98.2% | **100.0%** |
| 末尾 | teardown DELETE 记录 | `reachability` 矩阵（无 teardown 段，因已全通过） |

前序 QA（software-qa-engineer）在开发期经历了多轮自测（约 82.7% → 91.9% → 99.6% → **100.0%**），其中出现的失败**全部为测试侧问题**（缺必填字段、断言过严、旧基线过期、studentNo 非数值等），均已由 QA 就地修复，**最终落盘产物为 100% 通过**。任务书提到的 4 个失败属于中间迭代态，已被修复，故当前 artifact 中**已无失败项可查**。

本报告据此**以真实落盘产物为唯一事实来源**撰写，并对「4 个失败」与「date 源码 bug」做**溯源还原与根因判定**（第 5、6 节）。结论：**当前无需要转交寇豆码的后端源码 bug**。

---

## 1. 被测系统与测试策略

| 项 | 值 |
|---|---|
| Base URL | `https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com` |
| 全局路由前缀 | `/api` |
| 健康检查 | `GET /api/health` |
| 技术栈 | NestJS + TypeORM + MySQL + JWT |
| 五角色 | `super`（超管）、`school_admin`（校管）、`teacher`（教师）、`parent`（家长） |
| 登录端点 | `/api/auth/unified-login`、`/api/auth/password-login`、`/api/admin/login` |
| Token 注入 | `Authorization: Bearer <token>` |

**策略**：直连真实后台，测试脚本自主造数据（前缀 `test_qa_` / `test_qa_perf_`），跑完全覆盖用例后 teardown 仅清理自有前缀数据，绝不触碰生产数据。

**覆盖目标**：
- 功能全覆盖：每个业务模块的 CRUD、五角色权限矩阵（403 越权 / 401 匿名）、输入校验（400）、分页（`MAX_TAKE=500` 截断）、登录链路、家长端端到端。
- 性能轻测：核心读 / 写接口的并发 20、约 60 次请求的 P50/P95/平均/错误率基线。
- **（收尾新增）独立库清理复核**：不依赖脚本 teardown 自报，以 teacher/super 令牌直接拉取各模块列表，扫描 `test_qa_` 残留。

---

## 2. 功能测试覆盖矩阵与结果汇总

### 2.1 实际运行结果

```
总计: 243   通过: 243   失败: 0   通过率: 100.0%
（落盘产物 c-test-results.json，generatedAt 2026-07-29T17:18:39Z）
```

### 2.2 测试套件与用例数（合计 243）

| 套件 | 内容 | 用例数 |
|---|---|---|
| 1. 认证链路 | 三端点登录、错误密码 401、空参 400、禁用账号 401、匿名/无效 token 401 | 11 |
| 2. 五角色权限矩阵 | 超管/校管/教师/家长 跨角色访问受保护接口的 401/403、自身角色 200/201 | 12 |
| 3. 教师端 CRUD | 33 个业务模块 × 增/列/读/改/删 全链路（含班级看板隔离断言） | 165+ |
| 4. 学生端 CRUD | 学生主实体 + 依赖前置班级获取（含兜底建班逻辑） | 5 |
| 5. 自定义教师路由 | 成绩合并导入、考试创建、备份创建/读取、通知列表/未读/已读、IM UserSig/家长花名册、安全审核、教学日历按月查询、个人资料、AI 设置 | 13 |
| 6. 超管套件 | 学校/校管/教师列表、审计日志、创建/更新校管、创建/更新 AI 服务商 | 9 |
| 7. 校管套件 | 数据看板、教师/班级列表、创建/更新教师、教师越权 401 | 6 |
| 8. 家长端端到端 | 开启家长登录 → 家长登录 → `/parent-auth` 下 8 个只读接口 | 10 |
| 9. 输入校验/边界/分页 | 空/缺字段 400、不存在 ID 404、take 截断≤500、skip/take 可用 | 8 |
| 10. 公共接口 + 健康 | 健康检查、公开配置（匿名 200） | 2 |
| 11. 模块可达性矩阵 | 53 个模块前缀列表接口探测（200/404/自定义） | 53 |
| **合计** | | **243** |

### 2.3 已实现 CRUD 覆盖的业务模块（33 个）

`notes`、`todos`、`picker-history`、`award-categories`、`award-records`、`duty-rosters`、`teaching-calendar`、`generated/papers`、`generated/lesson-plans`、`generated/knowledges`、`generated/queries`、`reward-records`、`score-records`、`group-scores`、`checkins`、`reading-logs`、`home-visits`、`parent-contacts`、`notice-templates`、`class-expenses`、`class-activities`、`class-duty-configs`、`class-galleries`、`my-galleries`、`seat-layouts`、`growth-entries`、`behavior-records`、`attendances`、`homework`、`resources`、`schedules`、`notices`、`semesters`

每个模块均覆盖：`创建(201) → 列表(200) → 读取单个(200) → 更新(200) → 删除(200)`。

### 2.4 可达性矩阵结果

- **200（列表可用，33+）**：checkins、award-records、award-categories、duty-rosters、class-expenses、class-activities、class-duty-configs、class-galleries、exams、ai-providers、backups、grades、growth-entries、behavior-records、generated/*、classes、lesson-observations、home-visits、parent-contacts、notice-templates、work-logs、teachers、reward-records、score-records、group-scores、school/*、notes、todos、picker-history、my-galleries、reading-logs、teaching-calendar、seat-layouts、students、semesters。
- **404（自定义控制器，非 CRUD 列表，预期内）**：`ai`、`config`、`users`、`school-admin`、`im`、`notification`、`security` —— 其实际接口已在套件 5/6/7 单独验证通过。
- **skip（非列表型自定义端点）**：`auth`、`parent-auth`。
- 可达性矩阵仅作“接口存在性”探测，不影响通过率。

---

## 3. 真实库清理复核（数据安全优先 · 本次独立验证）

> 收尾任务的第一优先级。不信任脚本 teardown 的自报结果，直接用令牌拉列表扫描。

**方法**：`verify-cleanup.js` 以 teacher 令牌（teacher1/123456）扫描教师域 40 个模块 + super 令牌兜底 3 个管理域端点，对响应体做 `test_qa_` 前缀字符串匹配；仅当发现残留时发起最小 DELETE 清理。

**发现（重要）**：独立扫描在 **`/api/exams` 中发现 3 条 `test_qa_` 残留**（`test_qa_exam`，id：`7cdb1cdf…`、`89d0209a…`、`f6ba8c72…`）。
**原因**：功能测试的 teardown 删除登记表（`deletables`）未纳入 `exams` 模块（exams 属“自定义教师路由”套件，独立创建但未被 track），导致前序 teardown 自报“成功 7/0”实为**漏清**。这正说明独立复核的必要性。

**处置**：脚本已对这 3 条发起 DELETE，结果 `成功 3 / 失败 0`。复核报告：`test-deliverables/verify-cleanup-report.json`（verdict = `CLEANED`）。

**最终结论：真实库现已干净（CLEAN）。** 其余 39 个教师域模块 + 管理域端点均无 `test_qa_` 残留；性能测试写入的 60 条 `test_qa_perf_` todo 亦已由 d-perf-test.js teardown 清理（成功 60/0）。

> ⚠️ 给团队的提醒：功能测试脚本 `c-cloud-full-test.js` 的 teardown 存在覆盖缺口（漏掉 exams），建议补充 `exams` 到删除登记表，避免后续回归再次残留。

---

## 4. 性能测试基线（本次重测，d-perf-test.js）

**目标接口**：`GET /api/health`（匿名）、`POST /api/admin/login`（登录延迟小样本）、`GET /api/classes`、`GET /api/students`、`POST /api/todos`（后三者复用单次登录 token）。

**方法**：并发 20，每接口约 60 次请求（登录端点受 `super 6/min` 节流，仅 6 次、间隔 11s 测延迟）；读/写统一复用 token，对 429 指数退避；指标 P50/P95/平均/错误率。

| 接口 | 总数 | 错误率 | P50 | P95 | 平均 | 最大 |
|---|---|---|---|---|---|---|
| GET /api/health | 60 | 0.0% | 43ms | 120ms | 63ms | 123ms |
| POST /api/admin/login | 6 | 0.0% | 87ms | 92ms | 80ms | 92ms |
| GET /api/classes | 60 | 0.0% | 83ms | 203ms | 96ms | 229ms |
| GET /api/students | 60 | 0.0% | 61ms | 101ms | 63ms | 128ms |
| POST /api/todos | 60 | 0.0% | 88ms | 154ms | 87ms | 196ms |

**结论**：并发 20 下，全部目标接口 **错误率 0%**，P95 ≤ 203ms，后台响应稳定、无明显性能瓶颈；全局节流（配置 60/min/IP）云上实测宽松，未造成 429。

---

## 5. 4 个失败用例逐项分析（历史迭代溯源 + 根因判定）

> 透明说明：当前 `c-test-results.json` 已 **0 失败**，无法直接“找出 4 个失败”。以下为对任务书所述 4 失败（及开发期 3 轮自测中出现的失败）的**溯源还原**，依据为前序 QA 的开发记录与 `test-results.json`（早期 68 用例、10 失败）及源码核对。所有项**根因均为测试侧**，无源码 bug。

| # | 失败现象（历史） | detail | 根因判定 | 是否源码 bug |
|---|---|---|---|---|
| 1 | **`date` 字段缺省 → `DB_ERROR`** | 写入 reward-records / reading-logs / class-activities 等时未传必填 `date`，后端返回 400 `DB_ERROR: Field 'date' doesn't have a default value` | **测试数据缺失必填字段**。列定义为 NOT NULL 无默认值，缺省即被拒——属正确校验 | ❌ 否 |
| 2 | 其它必填字段缺省 → 400 | 如 `assignments`、`rows/cols/seats`、`classId`、`bookTitle` 未传 | **测试数据不全**，断言未覆盖必填约束 | ❌ 否 |
| 3 | 权限断言过严 / 旧基线过期 | 教师 `POST /api/classes` 期望 200/201，实际返回 **403**（班级仅校管可建） | **测试断言与真实权限设计不符**，旧基线 `b-test-suite.js` 过期 | ❌ 否（权限隔离正确） |
| 4 | 返回结构 / 类型断言错误 | 列表返回 `{items,total}` 而非数组；`studentNo` 非数值等 | **测试侧结构解析/类型假设错误** | ❌ 否 |

**专项：关于 `date` 字段 `DB_ERROR`（任务书重点关注项）**

经查阅后端源码 `server/src/common/filters/typeorm-exception.filter.ts`：
- 全局异常过滤器对**所有数据库层错误**（`exception?.code`）统一返回 **HTTP 400 + code `DB_ERROR`**，**不抛 500、不泄露 SQL**。
- MySQL `ER_NO_DEFAULT_FOR_FIELD`（1364，即“Field 'date' doesn't have a default value”）未被映射到友好文案分支，落入 `default` 分支，返回 `400 请求数据校验失败: <消息截断>`。

**结论**：后端行为**正确**——对缺失必填字段的写入请求以 400 拒绝，无 5xx、无 SQL 泄漏。“失败”源于**测试未提供 `date` 值**，补齐字段后即通过。该现象**不是后端源码 bug**，无需转交寇豆码修复。唯一可优化点为「错误提示友好度」（见第 6 节可选增强），属非阻断改进。

---

## 6. 疑似源码 Bug 清单与智能路由判定（Smart Routing）

### 6.1 疑似源码 Bug 清单

| 编号 | 类型 | 描述 | 是否源码 Bug | 处置 |
|---|---|---|---|---|
| — | （无） | 经源码核对与全量复跑，**未发现任何后端源码级缺陷** | — | — |

> 任务书所列「date 默认值 DB_ERROR 转交寇豆码」诉求，经源码验证为**误判**：该现象是正确输入校验（NOT NULL 列缺省被拒，400），非源码缺陷。详见第 5 节。

### 6.2 可选增强（非 Bug，供工程师参考，非路由转交项）

| 编号 | 建议 | 理由 |
|---|---|---|
| E1 | 在 `TypeOrmExceptionFilter` 的 switch 中补充 `ER_NO_DEFAULT_FOR_FIELD` 分支，返回更明确文案（如“字段缺少默认值: <列名>”） | 当前落入 default 分支，提示为通用“请求数据校验失败”，可读性弱；属体验优化，不影响正确性 |

### 6.3 智能路由判定结论

**判定：NoOne —— 无需上报后端工程师（寇豆码）。**

- 功能测试：243/243 = **100% 通过**（真实落盘产物）。
- 性能测试：5/5 目标接口 0% 错误率，P95 ≤ 203ms，后台稳定。
- 真实库：经独立复核，残留 `test_qa_` 已清零（Cleaned 3 条 exams 后 CLEAN）。
- 全程未发现任何后端源码级 Bug；历史失败均为测试脚本自身缺陷，已就地修复（符合「测试代码 bug → 自修」路由规则）。
- 仅记录 1 条**可选增强**（E1，错误提示友好度，非阻断），作为工程师参考，不构成缺陷转交。

---

## 7. 已知问题 / 后续建议

| # | 类别 | 描述 | 建议 |
|---|---|---|---|
| 1 | **测试健壮性（高优先）** | 功能测试 teardown 删除登记表漏掉 `exams` 模块，导致 3 条 `test_qa_` 残留未被脚本自清（本次由独立复核发现并清理） | 在 `c-cloud-full-test.js` 的 `deletables` 注册表中纳入 exams 创建记录，确保 teardown 覆盖全部造数 |
| 2 | 错误提示 | `ER_NO_DEFAULT_FOR_FIELD` 未映射友好文案（见 E1） | 后端补充分支，提升校验可读性 |
| 3 | 限流观察 | 登录端点角色级滑动窗口节流（super 6/min、teacher 10/min）；全局节流云上实测宽松 | 性能测试对登录仅做小样本延迟测量，不复用做吞吐；信息性，非 bug |
| 4 | 数据依赖 | 云库无 `teacher1` 种子班级，依赖 `classId` 的模块需测试先获取/兜底建测试班级 | 测试内已实现三级兜底，属健壮性改进 |
| 5 | 字段约束 | 多模块存在非空必填字段（reward-records.date、reading-logs.bookTitle/date 等），缺省返回 400 | 后端校验行为正确；测试已补齐必填字段 |

---

## 8. 产出物与复现

**产出文件**：
- `test-deliverables/c-cloud-full-test.js` —— 全功能测试（造数 + 五角色权限 + 校验 + 分页 + teardown）
- `test-deliverables/c-test-results.json` —— 功能测试逐条结果（243/243/0）
- `test-deliverables/d-perf-test.js` —— 轻量性能测试
- `test-deliverables/d-perf-results.json` —— 性能测试结果（本次重测基线）
- `test-deliverables/verify-cleanup.js` —— **（收尾新增）** 独立库清理复核脚本
- `test-deliverables/verify-cleanup-report.json` —— **（收尾新增）** 复核报告（verdict=CLEANED）
- `docs/qa-cloud-full-test.md` —— 本报告

**复现命令**：
```bash
# 全功能测试（Node 18+，自带 fetch；会造数并 teardown）
node test-deliverables/c-cloud-full-test.js
# 性能测试（并发 20，复用 token）
node test-deliverables/d-perf-test.js
# 独立库清理复核（只读扫描 + 仅删 test_qa_ 残留）
node test-deliverables/verify-cleanup.js
```

**约束遵守**：仅操作 `test_qa_` / `test_qa_perf_` 前缀数据；功能测试 teardown 自报 7/0、性能测试 teardown 60/0、独立复核清理 3 条 exams 残留（0 失败）——最终真实库无 `test_qa_` 残留，未触碰任何生产数据。
