# Web 端前端 CI 与覆盖率

本文件说明 web-app 的自动化测试接入方式，以及覆盖率报告的产出与查看。

---

## 1. 本地运行

```bash
cd web-app

# 仅跑测试（快速，不收集覆盖率）
npm test

# 跑测试并生成覆盖率报告
npm run test:coverage

# 输出 JSON 测试报告（供 CI / 可视化工具消费）
npm run test:report
```

测试框架：**Jest 29 + ts-jest + @vue/vue3-jest + jest-environment-jsdom**。
测试根目录：`web-app/test/`，匹配 `*.spec.ts`。

---

## 2. 覆盖率配置

`jest.config.cjs` 中已声明采集范围（仅 `src`，排除入口/类型/测试文件）：

- 文本摘要：终端直接打印
- `lcov`：供 SonarQube / Codecov 等平台消费
- `html`：`coverage/index.html`，浏览器打开可看逐文件覆盖
- `clover`：JetBrains / 部分平台用

产物目录：`web-app/coverage/`（已被 `.gitignore` 忽略，勿入库）。

> 默认 `npm test` 不收集覆盖率（`collectCoverage: false`），仅 `test:coverage` 通过 `--coverage` 开启，保证日常开发速度。

---

## 3. CI（GitHub Actions）

配置文件：`.github/workflows/ci.yml`

- 触发：`master` 分支的 push / PR，且仅当 `web-app/**` 有改动时运行（避免无关改动空跑）。
- 流程：`checkout → setup-node@22（含 npm 缓存）→ npm ci → npm run test:coverage → 上传 coverage 产物`。
- 覆盖率报告作为构建产物（artifact）保留 14 天，可在 Actions 页面下载 `coverage-report`。

若仓库镜像到 GitHub，该工作流即自动生效。

---

## 4. CI（Gitee Go，本仓库主托管平台）

Gitee 原生 CI 为 **Gitee Go**，配置放在仓库根 `.workflow/ci.yml`（已提供，语法与 GitHub Actions 兼容子集）。

启用步骤：

1. 进入 Gitee 仓库页面 → **DevOps → Gitee Go**；
2. 新建流水线，选择「代码仓库中的 `.workflow` 文件」作为配置源；
3. 绑定 `.workflow/ci.yml`，保存并开启；
4. 后续 `master` 推送即自动跑 `npm ci && npm run test:coverage`。

> 注意：Gitee Go 对 `actions/*` 的支持为兼容子集；若平台版本差异导致 `uses: actions/checkout@v3` 不可用，可在 Gitee Go 控制台改用平台内置步骤（如「代码拉取」节点）替代，核心命令 `cd web-app && npm ci && npm run test:coverage` 不变。

---

## 5. 后续建议（可选）

- **覆盖率门禁**：在 `jest.config.cjs` 增加 `coverageThreshold` 设最小百分比，低于阈值则 CI 失败，倒逼测试覆盖。
- **上报平台**：将 `coverage/lcov.info` 上传至 Codecov / SonarQube，做趋势看板。
- **端到端测试**：当前为单元 + 组件测试；关键用户流（登录→首页→登出）可补 Playwright E2E，纳入 CI 单独 job。
