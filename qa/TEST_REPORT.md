# 测试报告（Test Report）

> 执行时间：2026-08-10　|　执行人：QA 自动化　|　被测版本：`master`（本轮整改后）
> 结论：**三端测试全部通过；本轮共发现并修复 7 个缺陷（含 3 个严重级），均已回归验证。**

---

## 一、测试结果汇总

| 端 | 套件 | 通过 | 总数 | 结果 |
| --- | --- | --- | --- | --- |
| 后端 | 功能（server/qa/functional） | 65 | 65 | ✅ |
| 后端 | 性能（server/qa/performance） | 6 | 6 | ✅ |
| Web | 交互体验 + 全页面冒烟 + 路由权限（8 套件） | 242 | 242 | ✅ |
| 小程序 | 登录安全 + 跨端一致性（10 套件） | 204 | 204 | ✅ |
| **合计** | | **517** | **517** | **✅** |

构建与类型检查：Web `vue-tsc` + `vite build` ✅；Server `tsc --noEmit` ✅；小程序 `uni build` ✅（主包 1540KB，低于 2MB 门禁）。

---

## 二、后端性能结果（数据集：10 校 × 5000 生 × 1000 考试 × 6000 成绩记录）

| ID | 场景 | p50 | p95 | 吞吐 | 结果 |
| --- | --- | --- | --- | --- | --- |
| PERF-01 | 统一登录并发（bcrypt CPU 密集） | 278ms | 569ms | 35.6 RPS | ✅ |
| PERF-02 | 家长成绩查询（10 考试×6 科） | 1ms | 2ms | 100 RPS | ✅ |
| PERF-03 | 家长看板聚合（9 接口×30 家长，并发 15） | 14ms | 34ms | 270 RPS | ✅ |
| PERF-04 | 教师班级成绩查询（50 生×6 科 JSON） | 3ms | 4ms | 100 RPS | ✅ |
| PERF-05 | 5000 学生分页遍历（40 页） | 8ms | 9ms | 40 RPS | ✅ |
| PERF-06 | 混合并发只读（三角色 300 请求/并发 20） | 24ms | 27ms | 300 RPS | ✅ |

说明：登录吞吐受 bcrypt（cost=10）校验主导，属预期 CPU 瓶颈；查询类接口在 5000 学生规模下 p95 均 < 35ms，满足交互体验要求。

---

## 三、本轮发现并修复的缺陷

| # | 级别 | 缺陷 | 影响 | 修复 | 回归用例 |
| --- | --- | --- | --- | --- | --- |
| 1 | 严重 | 服务端引用 `@gardener/shared` 运行时无法解析：shared 以 ESM 编译且相对导入缺扩展名，Docker 构建上下文（仅 server/）也不含 shared | 含 shared 引用的版本**部署后启动即崩溃** | shared 改 CommonJS 编译 + 补全 exports 子路径 + `server/scripts/sync-shared.cjs` vendor 化 + `file:` 依赖 | 启动 Harness + FUNC 全量 |
| 2 | 严重 | 校管「成绩查询与汇总」恒 500：`classRepo` 误用 `{classId}` 条件，而 ClassItem 无 classId 列 | 校管成绩汇总页不可用 | 改为按主键 `id` 查询 | FUNC-SA-10 |
| 3 | 严重 | 纯家长统一登录 JWT 缺 `parentId`：`/parent-auth/me` 返回 null | 家长看板丢失学生信息/孩子列表 | 登录时复用/创建 Parent 记录并回填 parentId、签发进 JWT | FUNC-PAR-04/18、UX-PAR |
| 4 | 高 | 无 classId 列的实体（如 checkins）按班级查询恒 500：CrudService 无条件附加 classScopeField | 教师「学生打卡」页不可用 | 仅当实体确有该列才按班级过滤，否则回退 teacherId 隔离 | FUNC-TCH-13 |
| 5 | 高 | 小程序家长登录仅允许纯数字学号，与统一登录/学号管理（字母数字 2-32 位）不一致 | 字母学号学生家长无法从小程序登录 | 后端与小程序页统一采用 `isStudentNo` 口径 | FUNC-CONS-02、MINI-CONS |
| 6 | 中 | 小程序学生列表默认口令展示「学号后6位」，与后端实际初始口令 `123456` 不符 | 家长按提示登录失败 | 展示改为 `123456`（与后端一致） | MINI-CONS |
| 7 | 低 | shared exports 缺 `utils/gender`、`utils/student` 等子路径 | Node 运行时报 ERR_PACKAGE_PATH_NOT_EXPORTED | 补全 9 个子路径并统一 `default` 条件 | 启动 Harness |

另记录产品改进项（非缺陷）：教师端无自助改密入口，密码需校管重置（FUNC-TCH-18 已覆盖重置流程）。

---

## 四、覆盖说明

- **四级用户全功能**：超管 13 例、校管 12 例、教师 20 例、家长 18 例、跨端 2 例（见 [TEST_CASES.md](./TEST_CASES.md)）。
- **页面级**：Web 183 个路由全量渲染冒烟（routes-smoke）；小程序关键页面安全属性 + 跨端一致性。
- **权限隔离**：跨校（FUNC-SA-11）、跨租户（FUNC-TCH-05）、跨角色（FUNC-SUP-13 / FUNC-PAR-16）、无 token（FUNC-SUP-05 / FUNC-TCH-20）。
- **安全**：SQL 注入（FUNC-SUP-04）、登录限流、密码哈希（bcrypt）、错误凭据 401。

## 五、遗留风险与建议

1. 教师端自助改密入口缺失（当前依赖校管重置），建议后续迭代补充。
2. 云托管横向扩容后登录限流为进程内存计数，配额随实例倍增（历史债 #6），如需严格全局限流建议接入 Redis 存储。
3. 性能测试基于单核内存库，生产 MySQL/多核环境表现应更优；建议上线后以 RUM 监控 Core Web Vitals 持续跟踪。

---

*原始结果数据：`server/qa/server-results.json`（后端）、各端 jest 输出。*
