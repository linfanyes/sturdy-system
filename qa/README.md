# QA 测试中心

本目录是园丁工作台的测试资产中心：**测试案例目录 + 测试数据设计 + 测试结果报告**。
可执行测试分布于三端：

```
qa/                        # 本目录：案例与报告（文档）
server/qa/                 # 后端自动化：内存库真实服务 + 功能/性能用例
server/qa/server-results.json   # 后端执行结果（每次运行覆盖）
web-app/test/              # Web 自动化：交互体验 + 全页面冒烟 + 路由权限
mini-program/test/         # 小程序自动化：登录安全 + 跨端一致性
```

## 快速执行

```bash
# 后端（功能 65 例 + 性能 6 例，自动灌入 10 校 × 5000 生数据集）
cd server && npm run qa

# Web（242 例：ux/ + integration/）
cd web-app && npm test

# 小程序（204 例）
cd mini-program && npm test
```

## 测试分层

| 层 | 内容 | 位置 |
| --- | --- | --- |
| 后端功能 | 四级用户全链路 API（登录/组织/成绩/家校/权限隔离） | `server/qa/functional.ts` |
| 后端性能 | 登录吞吐、大数据集查询、看板聚合、分页、混合并发 | `server/qa/performance.ts` |
| 测试数据 | 10 校 × 20 师 × 10 班 × 50 生 × 10 考试（多分布场景） | `server/qa/seed.ts` |
| 服务 Harness | 内存库 NestJS（与 AppModule 同模块面）+ HTTP 客户端 | `server/qa/harness.ts` |
| Web 交互 | 登录页/家长看板真实组件挂载交互断言 | `web-app/test/ux/*.spec.ts` |
| Web 冒烟 | 183 页面全量渲染 + 路由守卫/角色权限 | `web-app/test/integration/` |
| 小程序 | 家长登录安全属性、学号/默认口令跨端一致性 | `mini-program/test/` |

## QA 环境说明

- 后端 QA 使用 better-sqlite3 内存库，无需 MySQL；实体中 MySQL 专有列类型（longtext）在 `QA_MODE=1` 时自动降级。
- 登录防暴力破解限流（10 次/分钟）在 QA 下通过 `LOGIN_RATE_LIMIT_MAX` 放宽，**生产默认值不变**。
- `server/vendor/gardener-shared` 为 shared 包的 CJS 构建副本（`node server/scripts/sync-shared.cjs` 刷新）；
  云托管部署打包 server/ 时该目录随包上传，保证 `@gardener/shared/*` 运行时可解析。

## 文档索引

- [TEST_CASES.md](./TEST_CASES.md) —— 全量测试案例目录（四级用户 × 功能/性能/交互）
- [TEST_DATA.md](./TEST_DATA.md) —— 测试数据设计（规模、账号、成绩场景）
- [TEST_REPORT.md](./TEST_REPORT.md) —— 最近一次测试报告（结果 + 缺陷 + 修复）
