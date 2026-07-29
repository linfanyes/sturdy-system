# 家长端微信绑定 / 身份模型 — 安全审计 + 产品改造方案联合交付

**日期**：2026-07-29
**场景**：安全审计 + 产品改造方案（家长多娃、师兼家角色切换、P0 安全加固）
**参与成员**：产品评审员（gstack-product-reviewer）+ 安全官（gstack-security-officer）

---

## 📌 TL;DR

- **整体结论**：🔴 **不通过**（存在 P0 安全阻塞项，必须收口后方可扩展多娃/双角色功能）
- **阻塞项数量**：4 个 P0（裸学号绑定越权、教师账号零校验接管、可推导默认口令、无解绑/审计）
- **一处事实订正**：`parentLoginEnabled` 实际默认 `false`（安全官逐文件核实确认），非之前分析的默认开启，但教师显式开启后暴露面不变
- **下一步**：先落地 Phase 1 安全闸门（P0），再做多娃/双角色（Phase 2→3→4）

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🔴 **No-Go**（上线前须先修 P0） |
| 严重度分布 | 🔴 7 / 🟠 7 / 🟡 4 / 🟢 0 |
| P0 关键行动项 | 4 条（绑定加身份校验、教师分支堵固定口令、弃用可推导默认口令、绑定/开关家长登录接入审计） |
| P1 推进行动项 | 4 条（解绑入口、限流 + 统一文案、双角色登录、多娃模型 + 归属校验） |
| 发布顺序强约束 | P0 闸门必须在多娃/双角色之前上线，否则单娃越权会放大为跨家庭批量越权 |

---

## 1. 各成员核心结论

### 🔍 产品评审员（Autoplan / 产品改造方案）

**核心判断**：「一个微信只能绑一个学生」并非业务约束，而是 `wechatLogin` 与 `bindWechatParent` 把"openid→student 一对一"写死造成的数据模型局限。二孩家庭无法用同一微信绑两娃，师兼家用户微信端永远进教师端。

**关键建议（6 章方案 + 安全修订补丁）**：
- 引入 `Parent` 实体（opendi 唯一），`students.parentId` FK 将 siblings 归集到同一家长
- `wechatLogin` 改为"身份并行解析 + 角色选择"，去掉"教师优先"（命中即返回、家长身份永远拿不到）
- `getMe.kids` 按 `parentId` 返真实多娃列表，不再写死单元素
- `switch-student` 按 `payload.parentId` 校验 studentId 归属后重签 scoped token，复用现有 D13 隔离逻辑
- `compare-kids` 不接收 studentId，仅按 `parentId` 拉自家孩子
- 分四阶段：Phase 1 P0 安全闸门 → Phase 2 多娃模型与切换 → Phase 3 师兼家角色切换 → Phase 4 跨娃比对

### 🛡️ 安全官（STRIDE + OWASP Top 10 审计）

**核心判断**：「两个公开绑定接口（`/auth/bind-parent`、`/auth/bind-by-number`）仅凭学号+微信 code 即可越权绑定他人孩子（F-01）或零校验接管教师账号（F-02），是当前最高优先级安全阻塞项。」

**逐文件核实 5 条原分析事实**：确认 ✅（绑定无校验、1 openid↔1学生、无解绑、覆盖抢绑、D13 闭环），**但修正 1 处**：`parentLoginEnabled` 默认 `false`（`student.entity.ts` L19），非原分析所述的默认开启。

**额外发现（同源高危）**：
- F-02 教师账号可经 `bind-by-number` 用固定默认口令 `1314520` 零校验接管（`auth.service.ts` L189-190）
- F-03 家长默认口令=学号后 6 位可推导（`students.module.ts` L21-23 / L264 / L278）
- F-06 全链路无绑定/解绑/开关审计日志

**STRIDE 威胁总计**：15 条（🔴 7 / 🟠 7 / 🟡 4 / 🟢 0），OWASP 命中 A01/A07/A09/A04/A05。

---

## 2. 综合审查发现

### 2.1 威胁建模（STRIDE）

| # | STRIDE 类别 | 威胁描述 | 严重度 | 源码定位 |
|---|------------|---------|--------|---------|
| T-1 | **Information Disclosure** | 攻击者凭学号+微信 code 绑他人孩子，读成绩/考勤/行为/家校沟通 | 🔴 | `auth.service.ts` L152-168, L202-215 |
| T-2 | **Elevation of Privilege** | 未授权者获得「该生家长」身份与数据权限，横向越权到他人家庭 | 🔴 | 同上 |
| T-3 | **Spoofing** | 攻击者伪称某生家长完成绑定，教师/真家长无法分辨 | 🟠 | `bindWechatParent` 无身份断言 |
| T-4 | **Spoofing** | `bind-by-number` 教师分支凭 `teacherNo` 零校验绑定，冒充教师 | 🔴 | `auth.service.ts` L175-199 |
| T-5 | **Elevation of Privilege** | 攻击者获得完整教师权限（班级/学生隐私全量） | 🔴 | 同上 L198 |
| T-6 | **Tampering** | L192 把教师 `passwordHash` 整体覆盖为硬编码 `'1314520'`，改写 `openid`/`sessionKey` | 🟠 | L189, L192 |
| T-7 | **Spoofing** | 家长默认口令=学号后6位可推导→冒名登录 | 🔴 | `students.module.ts` L264-265, L278-279 |
| T-8 | **Repudiation** | 绑定/抢回/开关家长登录均无审计，攻击不可追溯 | 🔴 | 全链路无 `AuditService.log` |
| T-9 | **Information Disclosure** | 误绑者用学号可反复抢回，形成拉锯与泄露窗口 | 🟠 | `bindWechatParent` L163 无锁覆盖 |
| T-10 | **Elevation of Privilege**（间接） | 下游 D13 隔离正确，但绑定环节无校验使隔离形同虚设 | 🟠 | 根因在 T-1/T-2 |
| T-11 | **Denial of Service** | 合法二孩家长无法用同一微信绑第二个孩子 | 🟡 | L156-159 / L205-208 |
| T-12 | **Denial of Service** | 师兼家用户微信端永远进教师端、进不了家长端 | 🟡 | `auth.service.ts` L114-132 |
| T-13 | **Denial of Service** | `getMe.kids` 写死单元素，无切换/比对接口 | 🟡 | `parent-auth.service.ts` L133-135 |
| T-14 | **Denial of Service** | 绑定接口无限流，可被枚举 | 🟡 | `auth.controller.ts` L22/L34/L40 |
| T-15 | **Information Disclosure** | 错误文案区分"学号不存在/未开启"，可枚举学号开启状态 | 🟠 | `auth.service.ts` L160-162 |

### 2.2 OWASP Top 10（2021）检查表

| 类目 | 命中 | 对应发现 |
|------|------|---------|
| **A01 Broken Access Control**（含 BOLA/IDOR） | ✅ | T-1/T-2/T-10 — 绑定动作无对象归属校验 |
| **A07 Identification & Auth Failures** | ✅ | T-1/T-3/T-4/T-5/T-7 — 绑定作为认证动作却无身份断言 |
| **A09 Logging & Monitoring Failures** | ✅ | T-8 — 全链路无审计日志 |
| A04 Insecure Design | ✅ | T-11/T-12/T-13/T-14 — 设计缺陷（一微一娃/师兼家/多娃/无限流） |
| A05 Security Misconfiguration | ✅ | T-6/T-7 — 硬编码默认口令 `'1314520'` + 可推导默认口令 |

### 2.3 产品改造方案大纲（Phase 1→4）

**Phase 1 — 安全收口（P0 闸门）**
- 绑定加「学号+家长密码」或「教师授权绑定码」校验
- `bind-by-number` 教师分支须验证现有口令，删除 `DEFAULT_PWD='1314520'`
- 家长初始口令改为服务端随机生成，移除可推导默认（学号后6位）
- 绑定/开关家长登录全部接入审计日志
- 禁止覆盖式绑定（L163 无条件覆盖）

**Phase 2 — 多娃数据模型与切换**
- 新增 `Parent` 实体，`students.parentId` FK 归集 siblings
- `wechatLogin` 改为身份并行解析（去掉"教师优先"）；`getMe.kids` 返全量
- `POST /parent-auth/switch-student` 校验归属后重签 scoped token
- 两端孩子选择器（Web Vue3+Tailwind / mini-program uni-app）

**Phase 3 — 师兼家角色切换**
- `users.parentId` FK 锚点，双角色检测
- 登录时返回 `needsRoleChoice: true` + 两个 token
- 两端角色选择弹层 + 视角随时切换

**Phase 4 — 跨娃比对**
- `GET /parent-auth/compare-kids`（按 `parentId` 聚合，不接收 studentId）
- 两端比对页（列定义/配色/空态/排名标注一致）
- 迁移删除 `students.parentOpenId` 兼容字段

**发布顺序强约束**：Phase 2/3/4 上线前必须确保 Phase 1 已闭环 + 审计已落地。否则多娃会把 F-01 越权面乘倍放大。

---

## ✅ 行动清单

### P0 — 本迭代必须收口（安全阻塞项，建议 1-2 天）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 绑定加身份校验（`auth.service.ts` `bindWechatParent` L152-168 + `bindByNumber` 家长分支 L202-215）：要求「学号+家长密码」或「教师授权绑定码」；去掉 L163 无条件覆盖 | 后端 Auth Owner | P0 | Phase 1 |
| 2 | 删除 `bind-by-number` 教师分支硬编码 `DEFAULT_PWD='1314520'`（L189），改为验证现有教师口令后绑定（参考 `bindWechatTeacher` L135-149）；去掉 L192 `passwordHash` 覆盖写入 | 后端 Auth Owner | P0 | Phase 1 |
| 3 | 弃用「学号后6位」默认口令（`students.module.ts` L20-23 / L264-265 / L278-279）：改为后端随机高熵初始口令+首次登录强制改密 | 后端 Student Owner | P0 | Phase 1 |
| 4 | 绑定/解绑/开关家长登录全部接入审计日志（复用 `AuditService.log`） | 后端 Auth + Student | P0 | Phase 1 |

### P1 — 下一迭代（与产品改造方案对齐，建议 1-2 周）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 5 | 新增解绑入口：家长自助 `POST /parent-auth/unbind` + 教师侧解绑 `POST /students/:id/unbind-parent`；带审计+二次确认 | 后端 + 产品 UX | P1 | Phase 2 |
| 6 | 绑定接口限流 + 统一错误文案（不区分"学号不存在/未开启"） | 后端 Auth | P1 | Phase 2 |
| 7 | 引入 `Parent` 实体 + 幂等迁移 + `wechatLogin` 双角色 / `getMe` 全量 kids / `switch-student` scoped token | 后端架构 | P1 | Phase 2 |
| 8 | 师兼家角色切换（双角色选择弹层 + 视角随时切换） | 后端 + 两端前端 | P1 | Phase 3 |
| 9 | 跨娃比对（compare-kids 端点 + 两端比对 UI） | 后端 + 两端前端 | P1 | Phase 4 |

---

## ⚠️ 待完善 / 已知局限

1. **一处事实订正**：`parentLoginEnabled` 实际默认 `false`（`student.entity.ts` L19 `@Column({ default: false })`），非最初分析的默认开启。教师在 `toggleParentLogin` 显式开启后暴露绑定越权面。现实部署中教师会逐生/批量开启，暴露面仍大，不影响风险定级。
2. **F-02（教师接管）与 F-03（可推导口令）为同源高危**：由安全官在核实中额外发现，并非原分析的 4 个问题，需一并纳入 Phase 1 收口。
3. **R10-R12（新增风险）**：教师接管（`auth.service.ts` L189-190）已定位，须在 Phase 1 一并修复；可推导口令须改随机+强制改密；解绑/审计缺口须补 `unbindWechat`+审计+二次确认。
4. **演示模式 mock 缺口**：`mini-program/src/common/mock/endpoints/parent.js` 多娃模拟数据待同步；Web 无独立 parent demo 模式。
5. **IM 账号随切换娃调整**：`switch-student` 重签后 `sub` 变为新娃 IM id，前端需重新拉 `/im-user-sig`。
6. **Web 双角色 token 生命周期缺口**：Web `auth.ts` 是单 token store，Phase 3 需维护"教师 token + 家长 token"两个身份上下文（小程序已有独立 `parent` store 可参考）。
7. **跨班比对语义约束**：不同班级考试不对齐、排名不可跨班比。前端必须明示"排名为各班内部排名"，后端绝不捏造统一排名。

---

## 📚 成员产出索引

- **gstack-product-reviewer（产品评审员）**：`parent-binding-autoplan-6chapters`（6 章 Autoplan 改造方案：数据结构→wechatLogin→switch-student/compare-kids→落地清单→Phase 1-4→风险） + `security-aligned-revision-patch`（安全闸门修订补丁：P0 升级、F-01/F-02/F-03/F-06 并入、发布顺序强约束）
- **gstack-security-officer（安全官）**：`stride-owasp-audit-report`（STRIDE 15 条威胁建模表、OWASP Top 10 检查表、P0/P1 加固行动清单、一处`parentLoginEnabled` 默认值事实订正、T-4~T-7 同源高危新增发现）

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
