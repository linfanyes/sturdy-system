# 家长端功能对齐优化清单

**日期**：2026-07-30
**范围**：Web 端 `web-app/src/views/parent/Dashboard.vue` + 小程序端 `mini-program/src/pages/parent/parent.vue`
**目标**：两端家长功能完全对齐，核心数据展示一致

---

## 📌 优化项总览

| # | 优先级 | 平台 | 优化项 | 状态 | 影响 |
|---|--------|------|--------|------|------|
| 1 | P1 | Web端 | 成绩查询区补充「年级排名」展示 | ✅ 已完成 | 中 — 信息完整性 |
| 2 | P2 | 两端 | 统一通知订阅文案 | ⏳ 待执行 | 低 — 体验一致性 |
| 3 | P3 | 小程序 | 增加顶部统计卡片（待读通知/待完成作业/考试次数/最新排名） | ⏳ 待执行 | 低 — 信息密度 |
| 4 | P4 | Web端 | 微信绑定入口改为二维码引导页 | ⏳ 可选 | 低 — 微信生态 |

---

## 1. P1 — Web端 年级排名展示（已完成）

**问题**：小程序家长中心已展示「年级第 X 名」，Web 端 Dashboard.vue 未渲染 `gradeRank` 字段。

**实现**：
- 在 `web-app/src/views/parent/Dashboard.vue` 成绩查询卡片中，增加 `selectedExam.gradeRank` 渲染
- 与班级排名并列展示，格式：`年级排名：第 X 名`
- 数据来源：`/parent-auth/exams` 接口已返回 `gradeRank` 字段

**验证**：
- [x] 代码修改完成
- [x] 本地构建通过
- [ ] 浏览器真实验证（需登录家长账号）

---

## 2. P2 — 统一通知订阅文案

**问题**：小程序使用具体模板 ID 的 `requestSubscribeMessage`，Web 端使用通用按钮，文案不一致。

**对齐方案**：
- 两端统一为「开启通知订阅」
- 小程序保留 `requestSubscribeMessage` 逻辑
- Web 端保留通用订阅按钮，仅改文案

**待执行**：
- [ ] 修改小程序 `parent.vue` 订阅引导文案
- [ ] 修改 Web 端 `Dashboard.vue` 订阅按钮文案

---

## 3. P3 — 小程序增加顶部统计卡片

**问题**：Web 端家长中心有顶部统计卡片（待读通知/待完成作业/考试次数/最新排名），小程序缺少。

**对齐方案**：
- 在 `mini-program/src/pages/parent/parent.vue` 的 kid selector 下方增加 4 个统计卡片
- 数据来源：`/parent-auth/me`、`/parent-auth/notices`、`/parent-auth/exams` 等
- UI 风格：与小程序现有卡片风格保持一致

**待执行**：
- [ ] 小程序 `parent.vue` 增加统计卡片区域
- [ ] 调用对应 API 填充数据
- [ ] 真机验证

---

## 4. P4 — Web端 微信绑定入口优化（可选）

**问题**：Web 端微信绑定仅 alert 提示「请在微信小程序中完成」，体验不友好。

**优化方案**：
- 增加二维码引导页，展示小程序码
- 或保持 alert 提示，但在帮助中心补充图文说明

**待执行**：
- [ ] 产品确认方案后实施

---

## ✅ 执行记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-07-30 15:44 | 创建优化清单 | ✅ 已完成 |
| 2026-07-30 15:44 | P1 年级排名展示 | ✅ 代码已实现，待验证 |
| 2026-07-30 15:44 | 小程序重新构建 | ✅ `uni build -p mp-weixin` 通过 |
| 2026-07-30 15:44 | Git 提交 | ✅ commit `8c85c6e` |
| 2026-07-30 15:44 | Git 推送 | ❌ 认证失败，需手动推送 |

---

## 📝 备注

- 推送失败原因：Gitee HTTPS 需认证，GitHub SSH 密钥未配置
- 手动推送命令：
  ```bash
  cd D:/workspace/my-prj/tercher-work/work-system
  git push origin master
  ```
