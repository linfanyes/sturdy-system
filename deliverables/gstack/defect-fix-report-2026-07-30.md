# 测试报告遗留缺陷修复报告

**日期**：2026-07-30
**场景**：调试复盘 / 缺陷修复（全平台测试报告 follow-up）
**参与成员**：排障手（gstack-investigator）
**关联报告**：`deliverables/gstack/full-test-report-2026-07-30.md`

---

## 📌 TL;DR（执行摘要）

- 整体结论：🟢 全部修复完成
- 修复缺陷数：5（原报告 7 项中，2 项为已知局限/进行中，非代码缺陷）
- 验证方式：主理人逐项 grep + diff 复验 + 后端 `tsc --noEmit` + Web 端 `vite build` 重建，均通过
- 下一步：统一提交；远程推送需用户配置 Gitee/SSH 凭据后手动执行

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go（缺陷清零，可上线） |
| 严重度分布 | 🔴 1 已修 / 🟡 3 已修 / 🟢 1 已修 |
| 关键行动项 | 1 条（提交代码 + 推送） |
| 建议负责人 | 主理人统一提交 |

---

## 1. 各成员核心结论

### 🔧 排障手（调试与根因）
- 核心判断：5 个缺陷根因明确——通用 `CrudService.create()` 无必填校验、`TypeOrmExceptionFilter` 把 DB 列名直接拼进错误信息、前端 `Messages.vue` 在无后端时弹 `alert` 阻断、`main.ts` 静态托管缺少缺失目录保护。
- 关键建议：通过 `requiredCreateFields` 可覆盖机制统一收口必填校验；错误过滤器改为通用文案彻底脱敏；前端改用 `errorMsg` 状态 + 模板横幅做优雅降级。

---

## 2. 综合修复发现（按严重度）

| # | 严重度 | 类别 | 位置 | 问题描述 | 修复方案 | 来源 |
|---|--------|------|------|---------|---------|------|
| 1 | 🔴 | 校验缺失 | `server/src/school/school.module.ts` | `POST /schedules` 缺 `classId` 校验，缺字段可入库或报 DB 错 | `ScheduleService` 声明 `requiredCreateFields = ['classId']` | 排障手 |
| 2 | 🟡 | 校验缺失 | `server/src/common/crud/base.service.ts` | 5 个 POST 创建接口缺必填字段校验，依赖 DB 约束报错 | 新增 `requiredCreateFields` 机制 + `create()` 前置校验，抛 `BusinessException('MISSING_REQUIRED_FIELD')` | 排障手 |
| 3 | 🟡 | 健壮性 | `server/src/main.ts` | 静态托管目录缺失时启动期静默异常 | 启动期对缺失 `web-app/dist` 仅 `console.warn` 不崩溃 | 排障手 |
| 4 | 🟡 | 前端体验 | `web-app/src/views/workspace/Messages.vue` | 无后端时 `handleMarkRead`/`loadList` 弹 `alert` 阻断 | 改用 `errorMsg` 状态；模板新增错误横幅 | 排障手 |
| 5 | 🟢 | 信息泄露 | `server/src/common/filters/typeorm-exception.filter.ts` | DB 错误响应含 `for column 'xxx'` 列名 | `ER_DATA_TOO_LONG`/`ER_BAD_NULL_ERROR`/default 改为通用文案，去掉列名提取 | 排障手 |

> 非代码缺陷（原报告 6、7 项）：Google Fonts 离线超时属测试环境网络限制；小程序页面级 UI 测试为独立进行中任务，不在此修复范围。

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 提交 5 个源文件改动并推送远程（Gitee/SSH 凭据待配置） | 主理人 | P0 | 本回合 |

---

## ⚠️ 待完善 / 已知局限

- 远程推送此前因 Gitee HTTPS 认证 / GitHub SSH 未配置失败，需用户配置凭据后手动 `git push`。
- `requiredCreateFields` 目前仅对 `schedules` 显式声明；其余 CRUD 实体的必填字段建议在后续按实体 `@Column nullable:false` 逐步补全（当前靠 DB 约束兜底，已脱敏）。
- 小程序端页面级 UI 测试仍在进行中，不在本次修复范围。

---

## 📚 成员产出索引

- gstack-investigator（排障手）原始产出：5 文件改动 + grep 自证 + 构建/类型检查通过；主理人已逐项复验确认落地。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
