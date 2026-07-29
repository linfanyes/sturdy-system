# 园丁工作台 · 上线前检查综合报告

**日期**：2026-07-29
**场景**：上线前检查（代码审查 + 安全审计 + QA 测试）
**参与成员**：产品评审员（gstack-product-reviewer） + 安全官（gstack-security-officer） + QA 负责人（gstack-qa-lead）

---

## 📌 TL;DR（执行摘要）

- 整体结论：🔴 **不通过（No-Go）**
- 阻塞项数量：**4**（1 项构建阻断 + 3 项高危安全）
- 核心问题：前端路由文件存在**实测确认的语法错误**，整站生产构建必崩；后端存在 SSRF、家长默认口令+无限速、PDF 解析 RCE 三类高危面。
- 下一步：先修路由语法错误跑通构建 + 修 3 项高危安全面；在具备后端+MySQL 环境补跑 69 条 API 测试后再评估 Go。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🔴 No-Go |
| 严重度分布 | 🔴 4 / 🟠 6 / 🟡 9 / 🟢 0 |
| 关键行动项 | 9 条（见行动清单，P0×4 / P1×4 / P2×1） |
| 建议负责人 | 前端（路由/游戏）、后端（权限/SSRF/依赖）、QA（回归测试） |
| 发布就绪度 | 后端健壮（高），前端构建阻断使所有前端验证归零 |

---

## 1. 各成员核心结论

### 🔍 产品评审员（代码审查）
- 核心判断：**整体"需改进"**。权限/删除 P0 修复已落地（config 隔离、家长校验、删除教师保留学生），但 `web-app/src/router/index.ts:163-176` 路由对象语法断裂（esbuild 实测 SYNTAX ERROR），会导致整站路由表无法解析、构建/运行必崩——**硬阻塞**。
- 关键建议：立即闭合 `toolLessonObservation` 路由对象并删除 176 行悬挂片段；抽取 9 款游戏公共组合式函数 `useGameShell`/`useHighScore` 消除复制粘贴；`GameDice` 错误 import 与定时器泄漏需修。

### 🛡️ 安全官（OWASP + STRIDE 审计）
- 核心判断：**整体风险中高（Medium-High）**。认证与权限基线扎实（@Roles 守卫层统一生效、TypeORM 参数化、密钥脱敏、启动自检拒超管默认口令），但存在「家长登录无限速+默认口令」「任意角色可调用的 SSRF」「PDF 解析依赖 CVE」三类高优先风险。
- 关键建议：家长登录加限速+强制首登改密移除默认口令；`/config/ai/models` 仅允预设 provider baseUrl 并禁私网/重定向；`pdfjs-dist` 升级至 4.x 并沙箱化解析。

### ✅ QA 负责人（测试与发布）
- 核心判断：**发布未就绪（Not Ready）**。web-app 路由语法错误致整站构建失败，本次重点验证的 9 款 Web 游戏/AI 备课/工具页面全部不可达。sandbox 无后端+MySQL，69 条 API 测试仅静态评审（已诚实标注），源码级确认后端鉴权/限速/MAX_TAKE/删除保留等基线达标。
- 关键建议：修 F1 后补 web-app 构建 + /games /tools /ai 冒烟；上线前在具备后端环境跑通 69 条 API 测试；修租户隔离断言"真空通过"与高频列表 filesort 索引。

---

## 2. 综合审查发现（去重合并，按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源 |
|---|--------|------|------|---------|------|------|
| 1 | 🔴 | 构建阻断 | web-app/src/router/index.ts:163-176 | `toolLessonObservation` 路由对象未闭合即嵌套 11 条匿名路由，esbuild 实测 `Expected identifier but found "{"`，整站构建/运行必崩 | 补全第163-164行为独立对象并删除176行悬挂片段，重跑 esbuild/vue-tsc 0 error | 产品评审员 + QA |
| 2 | 🔴 | 安全(SSRF/A01) | server/src/config/config.controller.ts:83-87 | `POST /config/ai/models` 仅 `@UseGuards(JwtAuthGuard)` 无 `@Roles`，任意已登录角色(含家长)可传任意 baseUrl/apiKey，服务端 fetch 无白名单/私网/重定向拦截 → 可探测内网与云元数据(169.254.169.254) | 仅允许预设 provider baseUrl；禁 file/内网/链路本地；禁用自动重定向或限定 https；补 `@Roles` 收敛越权面 | 安全官 + 产品评审员 |
| 3 | 🔴 | 安全(默认口令/A07) | server/src/parent-auth/*(.service.ts:18,63 / controller:14) | 家长登录无滑动窗口限速，且未设密码时回退默认 `123456`，学号数字可枚举 → 可暴力破解/撞库 | 家长登录加 10次/分限速；强制首登改密，移除默认口令回退 | 安全官 |
| 4 | 🔴 | 安全(依赖CVE/A06) | server/package.json: pdfjs-dist ^3.11.174 | CVE-2024-4367（PDF 字体 RCE）3.x 未修复，服务端解析上传 PDF | 升级至 4.x(≥4.4) 并沙箱化解析 | 安全官 |
| 5 | 🟠 | 健壮性 | server/src/school-admin/school-admin.service.ts:247-249 | `deleteTeacher` 事务内对 `TEACHER_ID_TABLES` 逐表 `DELETE FROM \`${table}\` WHERE teacherId=?` 无 try/catch，任一表缺列即整事务回滚、教师删除彻底失败（与 `deleteClass` 已用 try/catch 不一致） | 对齐 `deleteClass` 逐条包 try/catch 或预校验表结构 | 产品评审员 |
| 6 | 🟠 | 安全(空密码/A07) | server/src/school-admin/* reset-password | `reset-password` 接受 `b?.password||''`，可重置为空密码且无限长校验 | 强制非空且最小长度≥8 | 安全官 |
| 7 | 🟠 | 安全(种子口令/A05/A07) | server/src/admin/admin.service.ts:45-101 seedDemoData | 生产若库空仍创建 sa1/sa2/teacher1-4=‘123456’（自检只拦超管默认） | 生产禁用种子，或首登强制改密/随机口令 | 安全官 |
| 8 | 🟠 | 配置泄露(A05) | web-app/.env.production, .env.development 被 git 跟踪 | 根 .gitignore 仅忽略 `.env`，`.env.*` 入库；当前仅含 API 地址，但后续写入密钥即泄露 | .gitignore 增加 `.env.*`（保留 .env.example）；旋转已暴露密钥 | 安全官 |
| 9 | 🟠 | 测试缺陷 | test-deliverables/b-test-suite.js:308-310 | 租户隔离断言 `ids.classB?.id ? (真隔离) : true` —— 种子若未生成李老师班级则直接返回 true 通过，隔离未被真正验证 | 种子保证每师≥1班；断言强制要求 classB 存在否则显式 fail | QA |
| 10 | 🟠 | 性能 | e-add-business-indexes.js / p2-monitor.js:16-23 | 业务索引仅 (teacherId[/classId/studentId])，高频"按时间倒序列表"仍 filesort，监控持续 ⚠️ | 高频列表索引改 (teacherId, createdAt DESC) 或 (teacherId, classId, createdAt)；明确 filesort 可接受阈值 | QA |
| 11 | 🟡 | 代码缺陷 | web-app/src/views/games/GameDice.vue:4,163/329/334 | import `Gamepad2` 未使用，模板实际用 `<Dice>` 未导入 → 骰子图标不渲染 | import 改用 `Dice` | 产品评审员 |
| 12 | 🟡 | 可维护性 | server/src/school-admin/school-admin.service.ts:248 | 裸表名拼入 SQL 缺白名单校验（参数为占位符、无注入风险，属隐患） | 集中维护表名白名单并加类型校验 | 产品评审员 |
| 13 | 🟡 | 重复/资源泄漏 | web-app/src/views/games/*（9 款新游戏） | 各游戏重复实现返回按钮/筹码/历史条，高分硬编码各自 `localStorage` 键；GameDice setInterval 无 `onUnmounted` 清理 → 定时器泄漏 | 抽 `useGameShell`/`useHighScore`；补 `onUnmounted` 清定时器 | 产品评审员 |
| 14 | 🟡 | 安全(XSS/A03) | mini-program 多页 rich-text :nodes 渲染 AI markdown | 外链 img/javascript: 需净化（平台限制下风险较低） | formatMd/md() 过滤 img/link/script 节点，禁外链与 javascript: | 安全官 |
| 15 | 🟡 | 依赖CVE/A06 | mini-program/package.json: xlsx ^0.18.5 | CVE-2024-22363 ReDoS/原型污染 | 升级 0.20.3+ | 安全官 |
| 16 | 🟡 | 安全(限速失效) | rate-limit.guard.ts 进程内 Map 限速 | 多实例不聚合，生产多副本失效 | 改用 Redis 集中限速 | 安全官 |
| 17 | 🟡 | 测试覆盖 | web-app/src/views/games/* + test-deliverables | 9 款 Web 游戏无自动化运行时测试（Canvas/定时器逻辑） | 补"进入→退出无残留定时器"轻量用例；按小程序清单人工过一遍 | QA |
| 18 | 🟡 | 边界覆盖 | test-deliverables/b-test-suite.js:373-375 | 超长字段异常仅覆盖 /classes，其余写接口未覆盖 | 对 students/grades/notices 补长度/类型边界用例 | QA |
| 19 | 🟡 | 安全(A09审计) | 多处 audit.log(...).catch(()=>{}) | 安全事件审计写入失败静默丢失，无防篡改/不可变存储，抗抵赖不足 | 失败告警/落库重试，独立不可变存储 | 安全官 |

---

## 🚫 阻塞项清单（发布前必须清零）

| ID | 阻塞项 | 类型 | 修复方 |
|----|--------|------|--------|
| B1 | web-app 路由语法错误致整站构建失败（发现#1） | 构建阻断 | 前端 |
| B2 | `/config/ai/models` SSRF + 越权（发现#2） | 高危安全 | 后端 |
| B3 | 家长默认口令 + 登录无限速（发现#3） | 高危安全 | 后端 |
| B4 | pdfjs-dist CVE-2024-4367 RCE（发现#4） | 高危安全 | 后端 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 修复 web-app/src/router/index.ts:163-176：闭合 `toolLessonObservation` 对象（补 `component:()=>import('@/views/tools/LessonObservation.vue'), meta:{title:'听课记录',feature:'tools'}`，删除176行悬挂片段），重跑 esbuild/vue-tsc 0 error + /games /tools /ai 冒烟 | 前端 | P0 | 发布前必修 |
| 2 | 修复 SSRF：仅允许预设 provider baseUrl，禁 file/内网/链路本地，禁用自动重定向或限定 https；并补 `@Roles` 收敛越权面 | 后端 | P0 | 发布前必修 |
| 3 | 家长登录加 10次/分滑动窗口限速 + 强制首登改密，移除默认口令 `123456` 回退；学号枚举加固 | 后端 | P0 | 发布前必修 |
| 4 | 升级 pdfjs-dist 3.11.174 → 4.x(≥4.4) 并沙箱化解析上传 PDF | 后端 | P0 | 发布前必修 |
| 5 | `deleteTeacher` 逐表 DELETE 对齐 `deleteClass` 加 try/catch 兜底；`reset-password` 强制非空且最小长度≥8 | 后端 | P1 | 本周 |
| 6 | web-app/.env.* 加入 .gitignore（保留 .env.example），旋转已暴露密钥；生产禁用种子或首登强制改密 | 运维/后端 | P1 | 本周 |
| 7 | 修租户隔离断言"真空通过"（种子保证每师≥1班，断言强制 fail）；高频列表索引改 (teacherId, createdAt DESC) | QA/后端 | P1 | 本周 |
| 8 | GameDice import 改 `Dice`；9 游戏抽 `useGameShell`/`useHighScore` 并补 `onUnmounted` 清定时器；升级 xlsx 0.20.3+；rich-text 净化 | 前端 | P2 | 下版本 |
| 9 | 在具备后端+MySQL 环境跑通 69 条 b-test-suite，补游戏/超长字段边界用例 | QA | P1 | 发布前 |

---

## ⚠️ 待完善 / 已知局限

- sandbox 无后端 + MySQL，`b-test-suite.js`（69 条五角色 API 测试）仅静态评审，**未运行态验证**；建议在 CI/预发环境补跑并纳入门禁。
- 小程序旧绝对路径 `/pages/ai-knowledge` 引用未彻底 grep 验证（产品评审员建议再查一遍以防分包重构断裂）。
- 演示模式/生产密钥替换（API_BASE/AppID/AI 密钥）未验证，属上线前置项（见小程序冒烟验证清单）。
- 产品评审员指出 `shared/constants/index.ts` 首读"乱码"为 Read 工具渲染假象，实际为干净 UTF-8（仅混合换行符），非缺陷。

---

## 🔄 回滚预案

- **DB**：迁移幂等（`e-add-business-indexes` 可重复执行；新增索引不阻塞回滚）。
- **后端**：按 Git 标签/commit 回退；schema 需向后兼容（`synchronize` 兼容旧实体）。
- **前端 web-app**：保留上一可用构建产物，CDN/静态托管回退上一版本；B1 为纯前端路由错误，hotfix 改 router 后重新构建发布即可。
- **小程序**：保留已审核版本，回退需重新提审（注意提前量）。
- **监控**：回滚后对比 `p2-monitor` 慢查询基线与错误率，关注 401/429 是否异常升高。

---

## 📚 成员产出索引

- gstack-product-reviewer（产品评审员）原始产出：聚焦最近 10 次提交，真实读取 parent-auth/school-admin/GameDice/router/shared/constants/config 并用 esbuild 验证；结论"需改进"，含 6 条发现。
- gstack-security-officer（安全官）原始产出：OWASP Top 10 + STRIDE 框架审查，结论"中高风险"，含 9 条发现 + 依赖/配置泄露专项。
- gstack-qa-lead（QA 负责人）原始产出：真实执行 `node --check` 校验脚本 + esbuild 前端解析验证；因无后端/DB 做静态评审；结论"未就绪"，含 7 条发现 + 发布检查清单 + 回滚预案。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
