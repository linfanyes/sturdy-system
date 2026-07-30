# 功能管理现状调研与「更细化」实施方案

> 调研范围：园丁工作台（Gardener Workbench）`server/`（NestJS）、`web-app/`（Vue3）、`mini-program/`（uni-app）
> 调研性质：**仅调研 + 规划，未改动任何代码**
> 日期：2026-07-30

---

## 一、现状小结（TL;DR）

当前系统**已经具备一套"按教师粒度"的功能开关机制**，但存在三个结构性缺口，导致"功能管理"看似可用、实则偏脆弱、且无法再细化：

1. **功能标识已存在，但是"包级"的**：目录里有 `games / tools / ai` 等约 30+ 个功能 key，三个分包 `games(34) / tools(15) / ai(6)` 实际是硬编码的路由/页面集合，**没有独立的子项 key**，只能整包开关。
2. **开关只在 Web 端 UI 生效，小程序端完全不校验**：小程序 `route-guard.js` 只校验角色（role），不读取 `user.features`；工作台首页的功能入口也是写死的数组。
3. **后端没有 feature 守卫**：`features` 只是"菜单/路由隐藏"用的 UX 开关，服务端所有接口仍只靠 `@Roles` + JWT 校验，**知道接口地址即可越权调用**。

> 结论：现在的"功能管理"是一名**校管在 Web 端给每位教师逐个勾选功能包**的粗粒度工具。要"更细化"，本质是三件事：把开关**下沉到更细的层级（项/校/组）**、把开关**变成服务端真正生效**、把配置**从"每人手写"变成"按层继承"**。

---

## 二、现有机制详细盘点（带证据）

### 2.1 角色模型（4 个鉴权角色，5 个岗位）

- 鉴权角色定义：`shared/constants/index.ts:80` → `Role = 'super' | 'school_admin' | 'teacher' | 'parent'`
- "5 大角色"实际是岗位：超管 / 校管 / 班主任(head) / 科任老师 / 家长；其中"班主任"和"科任老师"**共用 `teacher` 鉴权角色**（班主任是班级内的子角色，见 `classes.module.ts: getRole()` 返回 `'head'`）。
- 后端守卫：`@Roles('super'|'school_admin'|'teacher'|'parent')`（`common/decorators/roles.decorator.ts`），粒度是**角色整体**，没有"权限点/权限位"。

### 2.2 功能标识（feature key）的定义——分散在 3 处，需对齐

| 位置 | 内容 | 用途 |
|------|------|------|
| `web-app/src/constants/features.ts` → `ALL_FEATURES` | ~40 个 `{key,label}`（含 games/tools/ai 等包级 key） | Web 校管"功能权限"勾选 UI 的数据源 |
| `shared/constants/index.ts:102` → `FEATURE_FLAGS` | ~33 个 key（与 ALL_FEATURES 对齐） | 跨端共享的权威 key 列表 + `FEATURE_FLAGS_SET` 快速查找 |
| `shared/constants/index.ts:88` → `ROLE_OPTIONS[].features` | 每个角色默认的功能集模板（teacher 全量、parent 8 项等） | 角色默认能力模板，`hasFeature()` 校验器（`shared/validators/index.ts:228`） |

> 校验器语义：`hasFeature(features, feature)` —— **空数组 = 全部放行**；否则 `features.includes(feature)`。这是目前唯一"功能是否可用"的判断逻辑，且只在前端用。

### 2.3 开关的存储位置

| 实体 / 表 | 字段 | 含义 |
|-----------|------|------|
| `users`（教师/家长账号） | `features: string[]` | **逐教师功能白名单**，空/null = 全部可用（注释原文："管理员配置的功能权限,空数组或null=全部可用"） |
| `school_admin`（校管） | `permissions: string[]` | 校管"可管理的模块"（teachers/classes/notices…），**不是面向教师的功能开关** |
| `ai_providers` | `enabled: boolean`, `sortOrder` | AI 服务商清单的启停（已是"单项开关"范例） |
| `app_config` | `key/value` 通用 KV | 平台级配置，但**无功能包开关项** |
| `schools` | 仅 code/name/address/contact/phone/status | **无功能字段** ← 缺学校级开关 |

### 2.4 开关的配置入口（UI）

- **Web 校管** `web-app/src/views/school-admin/Teachers.vue`：导入 `ALL_FEATURES`，对每位教师弹窗勾选 `features`，调用 `updateTeacherFeatures(id, selectedFeatures)`。**这是目前唯一真正的功能开关 UI**。
- **Web 超管** `web-app/src/views/super/PlatformConfig.vue`：仅 AI 服务商 + 全局 `app_config`（密钥/模型）。**无功能包开关**。
- **小程序超管** `mini-program/src/pages/admin/admin.vue`：配置分组（app_config KV）、AI 服务商启停、学校启停、管理员启停。**无功能包开关**。
- **后端 API**：`school-admin.controller.ts:76` → `updateTeacherFeatures`；`school-admin.service.ts:287` 落库 `user.features`。

### 2.5 开关在前端的生效方式（关键缺口来源）

- **Web 端**：`web-app/src/router/index.ts` 教师路由带 `meta.feature`；全局 `beforeEach` 守卫对 `auth.user.features` 校验，不匹配则跳回 dashboard。**仅 UI/路由层**。
- **小程序端**：`mini-program/src/common/route-guard.js` 只有 `PAGE_ROLES` 角色表，**完全不读 `user.features`**；games/tools/ai 子包默认"仅教师可访问"。`pages/dashboard/dashboard.vue:363` 的功能入口是写死数组，**不随 `features` 变化**。
- **服务端**：无任何 `@Feature()` 守卫，接口只认 `@Roles`。`router/index.ts:254` 注释也承认"真正的数据权限由后端 @Roles + JWT 强制校验" —— 即 feature 开关**不守数据**。

---

## 三、「更细化」候选方向（A/B/C/D）

下面每个方向都给出：要解决的问题、数据模型草图、改动点（后端 / Web / 小程序）、工作量（S≤2人日 / M 3–5人日 / L 1–2周 / XL >2周）、风险。

### 维度 A：按功能包 / 功能项粒度开关（games/tools/ai 整体或单项）

**问题**：现在只能整包开关 `games`/`tools`/`ai`，包内 55+ 个子项（如 2048、计时器、AI 对话）无法单独控；想"只关掉游戏里的贪吃蛇"做不到。

**数据模型草图（项级 + 前缀继承）**：

```ts
// shared/constants → 层级化 FEATURE_FLAGS
export const FEATURE_TREE = {
  games: ['games.2048','games.snake','games.tetris', /* …34 项 */],
  tools: ['tools.timer','tools.picker','tools.calc', /* … */],
  ai:    ['ai.chat','ai.image','ai.lesson', /* … */],
}
// users.features 支持前缀通配：'games.*' = 整包；'games.2048' = 单项
// 校验器升级：
function hasFeature(features: string[], key: string): boolean {
  if (!features?.length) return true            // 空 = 全开
  if (features.includes(key)) return true
  const pkg = key.split('.')[0]
  return features.includes(`${pkg}.*`)          // 包级通配
}
```

**改动点**：
- 后端：无新表（复用 `users.features` + `school.featureFlags`，见 C）；升级 `hasFeature` 支持前缀；新增 `@Feature(key)` 守卫（见"地基加固"）。
- Web：`ALL_FEATURES` 改树形；`Teachers.vue` 勾选 UI 改"包→项"两级复选；所有教师路由 `meta.feature` 从 `'games'` 改为 `'games.2048'` 等。
- 小程序：`dashboard.vue` 入口数组改为按 `user.features` 过滤；`route-guard.js` 增加项级 feature 校验。

**工作量**：项级 = **L（1–2 周）**；若只做"平台/校级整包开关"（A1，不拆项）= **S（≤2人日）**。
**风险**：项级需重做 catalog + 全部路由 meta + 校验器，易漏改；需与现有"包级 key"向后兼容（旧 `features:['games']` 应等价于 `['games.*']`）。

---

### 维度 B：按角色 / 用户组粒度（突破 5 大角色整体）

**问题**：现在功能配置是**逐教师手写白名单**，运营成本高；无法"给所有数学老师一键套用同一套功能"。`ROLE_OPTIONS` 里已有角色级 feature 模板但没被用作"可配置的组"。

**数据模型草图**：

```ts
// 新增 feature_presets（或复用 ROLE_OPTIONS 模板 + 扩展组维度）
FeaturePreset {
  id; name;
  groupType: 'role' | 'grade' | 'subject';  // 角色 / 年级 / 学科
  groupKey:  string;                         // 'math' | 'grade3' | 'teacher'
  features:  string[];                        // 该组功能集
}
// teacher.features 作为"个人覆盖层"，空 = 继承所属组预设
```

**改动点**：
- 后端：新增 `feature_presets` 表 + CRUD；登录时 `auth.service.ts` 合并（组预设 ∪ 个人 override）。
- Web：校管"功能配置"增加"按组套用 / 按教师覆盖"两种模式。
- 小程序：登录后拿到的 `features` 已是合并结果，UI 无需大改（但需先修 2.5 的 gating 缺口）。

**工作量**：**M（3–5 人日）**（模板已大半存在，主要是 UI 与合并逻辑）。
**风险**：组与教师多对多时合并规则需明确（取并集？还是组为默认、个人为排除项？）。

---

### 维度 C：按学校粒度（校管配置本校功能子集）★推荐优先

**问题**：**当前没有任何学校级功能字段**（已核对 `school.entity.ts` 无 feature 列）。校管想"本校统一关掉小游戏"只能逐个教师改，无法全校一键。

**数据模型草图（分层继承，复用现有机制）**：

```ts
// School 实体新增一列（复用 users.features 的同构设计）
School {
  // …原有 code/name/status
  featureFlags: string[]   // 本校允许的功能集；空 = 继承平台默认(全开)
}
// 解析优先级：平台默认 ⊇ School.featureFlags ⊇ teacher.features(个人覆盖)
```

**改动点**：
- 后端：`school.entity.ts` 加 `featureFlags` + migration；`auth.service.ts` 登录时按"平台默认 → 校 → 师"三级合并出最终 `features` 下发给两端；`school-admin` 模块加"本校功能"配置接口。
- Web：新增"本校功能"配置页（`school-admin` 下）；`Teachers.vue` 显示"继承自本校"提示。
- 小程序：校管 `school-admin.vue` 增加本校功能配置；登录合并逻辑同 Web。

**工作量**：**M（3–5 人日）**。
**风险**：低。完全复用已验证的 `users.features` + `hasFeature` 模式，不引入新概念；向后兼容（旧校 `featureFlags` 为空 = 全开，行为不变）。

---

### 维度 D：功能使用配额 / 上下架时间窗口

**问题**：无任何用量或时间控制（如"AI 每月调用上限""游戏仅课后开放"）。属增强型需求，非当前痛点。

**数据模型草图**：

```ts
FeatureQuota   { feature; scope:'platform'|'school'|'teacher'; limit; window:'day'|'month' }
FeatureSchedule{ feature; availableFrom; availableTo; days; periods }  // 如 games 仅 16:30–18:00
```

**改动点**：后端新增两表 + 中间件计数/时间判定；两端 UI 新增配额/时段配置与超限提示。
**工作量**：**XL（>2 周）**。
**风险**：高。需要调用埋点、配额计数、时段服务，且与 A/B/C 正交，建议单独立项。

---

## 四、优先级建议（Boil the lake，先打地基）

| 顺序 | 动作 | 对应方向 | 工作量 | 理由 |
|------|------|----------|--------|------|
| 0 | **地基加固**：后端加 `@Feature()` 守卫 + 小程序端 gating（修 2.5 缺口） | 跨方向前提 | M | 否则任何"更细化"都只是装饰；安全闭环必须补 |
| 1 | **维度 C：学校级开关** | C | M | 复用现有机制、成本低、校管最刚需、风险最小 |
| 2 | **维度 A1：平台/校级整包开关**（不拆项） | A(轻量) | S | 快速让超管/校管能整包控 games/tools/ai |
| 3 | **维度 B：角色/组预设** | B | M | 把"逐人配置"升级为"按组套用"，降运营成本 |
| 4 | **维度 A（项级）** | A(重) | L | 价值中、成本高，放到 catalog 稳定后再做 |
| 5 | **维度 D：配额/时间窗** | D | XL | 需求最弱、成本最高，单独立项 |

> 原则：**先让现有开关"真正生效"（地基加固），再用最小改动把开关"下沉一层到校级"（C），而不是一上来就重写项级 catalog（A 重）。** 这遵循"煮湖（boil lakes）"——选一个小湖煮透，而非煮整个海洋。

---

## 五、需要用户拍板的关键选择题

### 选择题 1：细化到哪一层级？（决定工作量与一个季度排期）

- **选项 1 — 包级下沉（推荐起步）**：只做"平台/校级整包开关"（games/tools/ai 整体启停）+ 学校级继承层（维度 C）。≈ 1 周，能立刻解决"校管无法全校统一控功能"。
- **选项 2 — 项级开关**：把 55+ 子项全部拆成独立 key，可单游戏/单工具开关（维度 A 重）。≈ 1–2 周，需重做 catalog 与全部路由 meta。
- **选项 3 — 分层全集**：平台默认 → 校级覆盖 → 教师覆盖 →（可选）项级（A+C+B 组合）。最完整，但排期最长（≈ 3 周）。

> 我的建议：**选项 1 先上线（见效快、风险低），选项 3 作为演进路线**，项级（选项 2）等 catalog 稳定后再开。

### 选择题 2：功能开关由谁配置 + 是否服务端强校验？（决定架构与安全）

- **选项 A — 仅超管集中管控**：功能开关只在 Web 超管 `PlatformConfig` 配置，校管不可改。
- **选项 B — 超管设默认 + 校管在本校覆盖（推荐）**：契合现有 `school-admin` 体系，校管拥有"本校功能子集"配置权，教师再可个人微调。
- **并请一并确认**：是否现在就把功能开关做成**服务端强校验**（加 `@Feature()` 守卫，越权调用直接 403）？—— 是则工作量 +M、安全性闭环；否则开关仍只是 UI 装饰（小程序端甚至当前完全不校验）。

> 我的建议：**选项 B + 服务端强校验（地基加固）**。理由：现有 `school-admin` 已具备校管配置教师功能的闭环，顺延到"校级"最自然；且小程序端不校验是真实越权漏洞，应一并修。

---

## 六、一句话总结

当前功能管理的实际粒度是**"校管在 Web 端逐教师勾选功能包（games/tools/ai 等约 30 个包级 key）"**——底层 `users.features` 白名单与 `ALL_FEATURES` 目录都已就位，但开关**只在 Web 端 UI 生效、小程序端不校验、服务端无 feature 守卫**，且**没有学校级/项级开关**。我最推荐的方向是**先做"地基加固"（后端 `@Feature()` 守卫 + 小程序 gating，补上真实越权漏洞），再落地"维度 C：学校级功能子集"**——因为它完全复用已验证的 `users.features` + `hasFeature` 模式、成本最低（M）、校管最刚需、且能立刻让"功能管理更细化"从装饰变成可用；项级拆分（维度 A 重）和配额时间窗（维度 D）建议作为其后的演进路线，而非第一刀。
