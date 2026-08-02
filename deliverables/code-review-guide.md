# 园丁工作台 · 代码审查标准与执行流程（Code Review Guide）

> 版本：v1.0 ｜ 适用仓库：`work-system` ｜ 生效日期：2026-08-02
> 适用范围：`web-app/`（Vue3 前端）、`server/`（NestJS 后端）、`mini-program/`（uni-app 小程序）、`shared/`（前后端共享 TS 包）、`e2e/`（测试工程）、`server/scripts/`（种子脚本）

---

## 1. 审查范围（Scope）

### 1.1 必须审查的变更（Gate 内）

| 变更类型 | 示例 | 强制审查 |
|---|---|---|
| 后端 API 变更 | 新增/修改/删除 Controller 路由、DTO、Service 逻辑、实体字段 | ✅ |
| 前端页面/组件变更 | 新增路由、页面组件、复用组件（CrudTable/PhotoAlbum/AiTextTool）、API 调用层 | ✅ |
| 数据模型变更 | 实体字段增删、迁移 SQL、TypeORM 关系 | ✅ |
| 鉴权/权限变更 | Guard、@Roles、@Feature、路由 meta、功能包开关 | ✅ |
| 安全相关 | 输入校验、SQL/注入、XSS、越权、敏感信息 | ✅ |
| 共享包变更 | `shared/` 常量、类型、校验器、feature-flags | ✅（**必须同步后端副本**） |
| 构建/部署/CI | package.json 依赖、vite 配置、.github/workflows、Dockerfile | ✅ |
| 数据库种子/迁移 | `server/scripts/*.ts`、`server/migrations/*.sql` | ✅ |

### 1.2 免审查（Gate 外）

- 仅格式化/重命名（不改变行为，且 IDE 格式化器统一）——仍须 CI 通过
- 纯文档/注释变更（README、md 文件）
- 依赖锁定文件（package-lock）由 CI 校验

### 1.3 审查单元定义

- **PR/合并请求 ≤ 800 行变更**（超出需拆分并说明理由）
- 每个 PR 对应一个主题，禁止「顺手改」混入无关变更

---

## 2. 角色与职责（RACI）

| 角色 | 职责 | 审查中做什么 |
|---|---|---|
| **作者（Author）** | 完成开发、自测、编写测试 | 提交前自检清单（§4.3）；PR 描述写明背景/改动/影响面/自测结果 |
| **审查者（Reviewer）** | 对代码质量负责 | 至少 1 人；复杂/安全变更至少 2 人；逐条评论，明确「必须改/建议/疑问」 |
| **模块负责人（Owner）** | 维护模块边界 | 对跨模块变更把关：shared→server/web-app/mini-program 的同步 |
| **测试/QA** | 验收与回归 | 依据 §7 验收标准做 DoD 确认；复验审查中标记「需要测试」的问题 |
| **合入者（Merger）** | 最终合入 | 确认：CI 全绿 + 审查通过 + DoD 达成；合入后跟进冒烟 |
| **架构师（Arch）** | 重大架构变更评审 | 路由/实体/鉴权体系的变更需架构评审 |

**红线（Blocking）**：以下情况任何 Reviewer 有一票否决权，合入者必须拦截：

1. 安全漏洞（SQL 注入、越权、明文密码/密钥入库、XSS）
2. 破坏既有 API 契约（改字段名/类型/删字段）而未走兼容策略
3. 数据迁移可能丢数据
4. 未同步 `shared` 与 `server` 的 feature-flags（CI `check-feature-sync.js` 会红）
5. 后端编译失败 / 前端类型错误（vue-tsc 不过）

---

## 3. 审查清单（Review Checklist）

> 每个维度按 `🔴 必须修复 / 🟡 建议修复 / 💭 提醒` 分级。审查者逐项确认，未覆盖项在评论中补充。

### 3.1 正确性（Correctness）

- [ ] 🔴 边界条件：空数组、空字符串、null/undefined、0、超大数、日期边界（跨年/闰年/月底）
- [ ] 🔴 异步竞态：并发写同一实体（如成绩 merge）、重复提交（防抖/幂等）
- [ ] 🔴 事务完整性：多表写入是否包在事务里（班级+班级成员、考试+成绩、导入）
- [ ] 🟡 分页/排序：`take` 上限（≤500）、`skip` 越界、排序稳定
- [ ] 🟡 级联行为：删除父实体时子数据（学生→成绩/座位/家长绑定）是否清理
- [ ] 🟡 租户隔离：所有 CRUD 是否按 `teacherId`/`schoolId` 过滤，是否存在跨租户读取
- [ ] 💭 时区/日期格式化统一

### 3.2 安全（Security）

- [ ] 🔴 鉴权：每个新路由是否带 `JwtAuthGuard` + 合适的 `@Roles`；是否误用无守卫
- [ ] 🔴 越权：按 ID 操作的资源是否校验归属（班主任才能改本班、创建者才能删）
- [ ] 🔴 注入：SQL 是否全部参数化；`like`/`in` 查询是否转义
- [ ] 🔴 敏感数据：密码哈希、JWT 密钥、API Key 不硬编码、不落日志
- [ ] 🟡 XSS：用户输入（公告/作业/消息/评语）在 v-html 处是否有过滤
- [ ] 🟡 上传/导入：base64 文件大小限制（5MB）、文件类型白名单、AI 解析内容
- [ ] 🟡 限流：登录接口、AI 接口是否受 RateLimit（10/min）
- [ ] 💭 审计：管理端写操作是否落 `audit_logs`

### 3.3 可维护性（Maintainability）

- [ ] 🟡 命名清晰：函数/变量/文件命名表达意图
- [ ] 🟡 复用：重复逻辑是否抽取（通用 CRUD 基类、CrudTable 组件、composable）
- [ ] 🟡 分层：Controller 不写业务逻辑；Service 不直接操作 HTTP
- [ ] 🟡 DTO：入参有 DTO + class-validator 校验（而非 any）
- [ ] 💭 注释：只注释「为什么」，不注释「是什么」
- [ ] 💭 死代码：无未使用的 import/变量/路由

### 3.4 性能（Performance）

- [ ] 🟡 N+1 查询：列表页循环内查库（应 JOIN/预取）
- [ ] 🟡 大表全量加载：无分页的列表、导出是否受限
- [ ] 🟡 前端：大列表是否虚拟滚动/懒加载；图片是否压缩（1280px/0.7）
- [ ] 💭 索引：高频查询字段是否有索引（外键、schoolId、teacherId）
- [ ] 💭 缓存：读多写少的数据（教材树、资源库）是否缓存

### 3.5 测试（Testing）

- [ ] 🟡 核心业务（登录/成绩/导入/越权）是否有测试用例
- [ ] 🟡 异常路径：参数非法、资源不存在（404）、无权限（401/403）是否被覆盖
- [ ] 💭 前端关键交互是否进 e2e 冒烟清单（新路由是否在 160 路由冒烟覆盖内）

### 3.6 项目特有约定（本项目强制项）

- [ ] 🔴 **禁止写死 `/api/` 前缀**：`web-app` 页面一律用相对路径（`/students`），axios baseURL 已含 `/api`；写死会拼成 `/api/api/...` 404
- [ ] 🔴 **更新操作用 PATCH**（不是 PUT），与前端 `api/teacher.ts` 等保持一致
- [ ] 🔴 **feature-flags 双副本同步**：改 `shared/.../feature-flags` 必须同步 `server/src/common/feature/feature-flags.constants.ts`
- [ ] 🟡 班级创建只能走校管 `/school-admin/classes`；教师端 `POST /classes` 恒 403，不得绕过
- [ ] 🟡 实体写保护：`stripUnsafe` 已剔除 `teacherId/id/role/createdAt/updatedAt/isDeleted`，不得在 DTO 中重新暴露
- [ ] 🟡 迁移 SQL 放 `server/migrations/`，编号递增，幂等（`IF NOT EXISTS`/`IF EXISTS`），main.ts 启动自动执行依赖 `multipleStatements`
- [ ] 💭 新页面/接口接入后更新 `e2e` 冒烟路由清单与 `mini-baseline.json`（如为已知缺陷）

---

## 4. 提交规范（Commit & PR Convention）

### 4.1 Commit Message（Conventional Commits）

```
<type>(<scope>): <subject>

[body: 为什么改，影响面]

[footer: Breaking Changes / 关联 Issue / 回归说明]
```

| type | 含义 |
|---|---|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `refactor` | 重构（不改行为） |
| `perf` | 性能优化 |
| `security` | 安全修复 |
| `test` | 测试代码 |
| `docs` | 文档 |
| `chore` | 构建/工具/依赖 |
| `revert` | 回滚 |

示例：`fix(school-admin): 班级列表因缺 teacherId 列报 EntityColumnNotFound`

### 4.2 分支策略

```
main            ← 保护分支，禁止直接 push
  └─ dev/feature/*   功能开发（PR → main）
  └─ hotfix/*        线上缺陷（PR → main，需优先审查）
```

- 分支生命周期短（≤ 3 天），频繁同步 main
- 禁止在 main 上直接提交

### 4.3 PR 模板（必须包含）

```markdown
## 背景（Why）
## 改动内容（What）— 列出变更文件与核心逻辑
## 影响面（Impact）— 涉及哪些页面/接口/角色/数据
## 自测结果（Test）— 跑过哪些用例、接口 curl 结果、冒烟结论
## 关联（Refs）— Issue # / 需求链接
## 待办（Follow-up）— 遗留项
```

### 4.4 提交前自检清单（Author Gate）

- [ ] 本地 `npm run build`（web-app）+ 后端 `tsc --noEmit` 通过
- [ ] 前端改动跑过 vue-tsc，无类型错误
- [ ] 涉及的接口用 curl/脚本实测通过（含异常路径）
- [ ] 无调试代码（console.log 残留、硬编码 token）
- [ ] 无密钥/敏感信息提交

---

## 5. 评审周期（Cadence）

| 环节 | 频率 | 内容 | 出口条件 |
|---|---|---|---|
| **PR 评审** | 每次合入 | 按 §3 清单逐项评审 | 无 🔴 遗留；CI 全绿 |
| **模块走查（每周）** | 每周五 | 本周合入代码抽查 + 技术债清单更新 | 走查记录归档 |
| **发布前门禁（Release Gate）** | 每次发版 | 全角色冒烟（e2e）+ 关键接口回归 + 迁移脚本核对 | 冒烟 0 硬失败 |
| **季度安全审计** | 每季度 | 鉴权矩阵核对、密钥轮换、依赖漏洞扫描 | 审计报告 |

**超时兜底**：PR 提交后 24 小时内必须有审查反馈；48 小时未合入且无阻塞问题的 PR，作者可升级处理。

---

## 6. 评审执行流程（Workflow）

```
作者提交 PR ──▶ CI 自动门禁（build + typecheck + lint + feature-sync）
                   │ 失败 → 打回作者修复
                   ▼
            分配 Reviewer（≥1 人，复杂/安全 ≥2 人）
                   │
                   ▼
        Reviewer 按 §3 清单评审，逐条评论（🔴/🟡/💭）
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   有 🔴 问题               无 🔴 问题
        │                     │
  作者修复 → 复审 →       QA 验收（§7 DoD）
        │                     │
        └──────────┬──────────┘
                   ▼
          Author 自测 + Reviewer 确认
                   ▼
              合入 main（Squash）
                   ▼
          合入后 1 小时冒烟观察
```

**评论规范**：
- 每条评论引用具体行号，说明「为什么」与「建议怎么做」
- 语气建设性：指出问题同时给出方向；好代码明确表扬
- 争议问题（架构/产品语义）拉评审会议，不在评论区来回拉扯

---

## 7. 验收标准（Definition of Done）

### 7.1 特性/缺陷 DoD

- [ ] 代码实现符合需求，无 🔴 审查遗留
- [ ] CI 全绿（build + 单测 + e2e 冒烟 + feature-sync 检查）
- [ ] 正常路径 + 至少一条异常路径（参数非法/无权限/不存在）已自测
- [ ] 前端：页面在目标角色下渲染无 console 报错；后端：无 500 未捕获异常
- [ ] 相关文档（README/接口说明/迁移说明）同步更新
- [ ] 变更涉及的功能包/角色菜单不回归（super/school_admin/teacher/parent 冒烟）

### 7.2 缺陷严重程度分级（评审/测试共用）

| 级别 | 定义 | 处理时限 |
|---|---|---|
| **S0 阻断** | 系统不可用、数据丢失、核心流程（登录/成绩/导入）不可用、安全漏洞 | 立即修复并回归 |
| **S1 严重** | 主功能异常但可绕行、数据不一致、性能明显劣化 | 当日修复 |
| **S2 一般** | 次要功能异常、边界条件不友好、错误提示不准确 | 本周修复 |
| **S3 轻微** | UI 细节、文案、兼容性小问题 | 可排期，不阻塞发版 |

### 7.3 发版 Gate

- S0/S1 缺陷清零；S2 缺陷列表评审通过
- e2e 冒烟（web + mini H5）无硬失败（KNOWN 基线外）
- 迁移脚本在预发库执行成功

---

## 8. 度量与持续改进

| 指标 | 目标 | 采集方式 |
|---|---|---|
| PR 平均审查时长 | ≤ 24h 首评 | 合入记录 |
| 每 PR 缺陷漏出率 | 合入后 30 天内回归 ≤ 1 个 S1 | 缺陷跟踪 |
| 冒烟通过率 | web ≥ 99%（KNOWN 除外） | e2e 报告 |
| 测试用例通过率 | ≥ 95% | 测试报告（见 test-report.md） |
| feature-flags 同步 | 100% 一致 | CI check-feature-sync.js |

每季度评审本指南，依据项目实际痛点（如安全事件、漏测缺陷）修订清单。

---

*本文档与 `deliverables/test-cases.md`（测试用例）、`deliverables/test-report.md`（测试报告）配套使用。*
