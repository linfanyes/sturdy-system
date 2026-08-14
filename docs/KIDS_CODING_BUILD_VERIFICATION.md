# 少儿编程（kids-coding）功能 — 构建与逻辑验证报告

> 生成时间：2026-08-15（终稿）
> 范围：全栈实现（#1~#6）完成并通过编译 / 类型 / 逻辑 / 部署四重验证。
> 状态：**已提交并推送至 Gitee（commit `0dde502`，master），部署自动建表已实机验证。**

## 1. 构建验证结果

| 项目 | 命令 | 结果 | 说明 |
|------|------|------|------|
| shared | `npm install && npm run build` (tsc) | ✅ 通过 | 产出 `shared/dist`（server 的 `@gardener/shared` 解析依赖它） |
| web-app | `npm run build` (vite build) | ✅ 通过 | `✓ built in 6.54s`，产物含 `KidsCoding-BXBFGJ2W.js` |
| web-app | `npm run typecheck` (vue-tsc -b) | ✅ 通过 | **0 错误**（含已修复的 `TeacherIM.vue` 存量错误，见 §3） |
| server | `npx tsc --noEmit` | ✅ 通过 | 0 错误 |
| server | `npm run build` (nest build) | ✅ 通过 | 产出 `dist/main.js` 与 `dist/kids-coding/*`（entity/dto/module 均已编译） |

> 结论：少儿编程功能**未引入任何编译或类型回归**。修复 `TeacherIM.vue` 后，前端全量类型检查亦归零。

## 2. 关键链路逻辑走查（已逐条端到端核查）

### 2.1 默认不开放（opt-in）链路 ✅
- `feature-flags.constants.ts`：`OPT_IN_FEATURES = ['kids-coding']`。
- `school-level.resolver.ts`：`featureFlags` 为 `null/[]` 时返回
  `FEATURE_FLAGS.filter(k => !OPT_IN_FEATURES.includes(k))` → **默认剔除 kids-coding**。
- 效果：学校未显式勾选时，教师端菜单（`hasFeature('kids-coding')`）与路由守卫（`@Feature('kids-coding')`）均拦截，功能不可见不可用。

### 2.2 教师开启链路 ✅
- 学校功能包（校管/超管）将 `kids-coding` 加入 `featureFlags` → resolver 原样返回。
- 教师 `effectiveFeatures` 含 `kids-coding` → 菜单显隐与 `@Feature` 守卫同时通过 → 可进入拖拽积木编辑器 CRUD 作品。

### 2.3 开放给家长链路（端到端已查证）✅
**后端 class 模块**（既有，已确认挂载）：
- `classes.module.ts` `GET ':id/parent-features'`（getParentFeatures，L406）+ `PATCH ':id/parent-features'`（updateParentFeatures，L412）。
- `class.entity.ts`：`parentFeatures: string[] | null` 字段存在。
- `feature.service.ts`：**L156–160** 将 `parentOverrideFeatures`（班主任在班级显式配置的家长功能包，含空数组即生效）并回家长 `effectiveFeatures` → 班主任把 `kids-coding` 加入班级 `parentFeatures` 后，家长端 `effectiveFeatures` 即含该键。

**前端编辑器**（`views/teacher/KidsCoding.vue`）「开放给家长」逻辑：
- 调 `listMyClasses()`（api/teacher.ts L53）→ `getClassParentFeatures(c.id)`（L137，`GET /classes/:id/parent-features`）拉取班级已开放功能。
- `togglePublish` 调 `updateClassParentFeatures(c.id, feats)`（L146，`PATCH /classes/:id/parent-features`，`{features}`）→ 默认**不勾选** kids-coding。
- 作品另需 `publishedToParent = true` 且 `class_id` 指向该班级。

**家长只读端**：
- `ParentCodingController`：`@Roles('parent') @Feature('kids-coding')`，`@Controller('parent/kids-coding')`（已注册进 `KidsCodingModule` 的 `controllers`）。
- 按 `p.classId + publishedToParent = true` 只读查询，仅暴露 `id/title/description/blocks/teacherName/updatedAt`，不泄露教师私有信息。
- 前端 `api/kidsCoding.ts`：`listParentCodingProjects()`（`GET /parent/kids-coding`，L51）、`getParentCodingProject(id)`（`GET /parent/kids-coding/:id`，L56），与家长端 `views/parent/KidsCoding.vue` 的 `BlockView` 只读渲染一一对应。

> 结论：从「班主任勾选班级家长功能」→「家长 effectiveFeatures 计算」→「侧边栏显隐 + @Feature 守卫」→「家长只读接口 + 作品 publishedToParent 过滤」整条链路前后端一致、可闭环。

## 3. 已修复的存量问题（非少儿编程引入）

`web-app/src/views/workspace/TeacherIM.vue`（原 216/224 行）引用 `imGroupId`，而原班级类型未声明该字段 → 3 处 `TS2339`。
- 根因：后端 `class.entity.ts` 本就持久化 `@Column({default:''}) imGroupId`，IM 模块也回写该字段，属前端类型漂移。
- 修复：在 `web-app/src/composables/useClasses.ts` 的 `MyClass` 接口补 `imGroupId?: string`，与后端对齐。
- 结果：`vue-tsc -b` 全量类型检查 **0 错误**。

## 4. CI 一致性

`shared/constants/index.ts` 与 `server/src/common/feature/feature-flags.constants.ts` 的 `FEATURE_FLAGS` / `OPT_IN_FEATURES` / `PARENT_FEATURE_KEYS` / 标签均已对齐，`FEATURE_LABELS['kids-coding']='少儿编程'`，CI 一致性校验应通过。

## 5. 后台部署自动建表（实机验证）✅

项目已有启动迁移器（`server/src/main.ts` 的 `runMigrations()`）：
- 每次 `bootstrap()` 扫描 `migrations/*.sql` 并顺序执行；
- 用 `_migrations_applied` 表记录已执行文件 → **幂等可重复**；
- 用 MySQL 命名锁 `GET_LOCK` → **多副本并发安全**；
- 独立连接开启 `multipleStatements` → 支持多语句 SQL；
- `server/Dockerfile` 第 71 行 `COPY --from=build /app/migrations ./migrations` → 部署镜像内含迁移脚本。

`server/src/migrations/AddKidsCoding.sql` 与既有已验证迁移（`AddSchoolFeatureFlags.sql` 等）同目录同模式（先查 `information_schema` 判定表存在，再 `PREPARE/EXECUTE` 建表），**部署启动即自动建表，无需手动执行**。

**实机端到端证明（MySQL 8.4 容器，复刻 `runMigrations()` 逻辑）**：
- 首次执行 → 成功创建 `kids_coding_projects`，字段齐全：`id`(uuid PK)、`teacher_id`、`title`、`description`、`blocks`(JSON)、`class_id`、`published_to_parent`(tinyint)、`teacher_name`、`created_at`/`updated_at`(datetime(6))；索引 `PRIMARY / idx_kc_tch / idx_kc_cls_pub`。
- 二次执行 → 经 `_migrations_applied` 判定已应用，**干净跳过（不报错、不重复建表）** → 幂等成立。
- 验证后已停止测试容器、删除临时脚本，工作区干净。

## 6. 提交与推送状态

- 提交 `0dde502`（master），27 个文件变更，+1328 / -4847（删除主要为 7 个已完成测试报告）。
- 已推送至 `https://gitee.com/yoyoliner/work-system.git`，远端 `master = 0dde502` 经 `git ls-remote` / `git fetch` 双重确认。
- 远端树已包含 `server/src/migrations/AddKidsCoding.sql` 与整个 `server/src/kids-coding/` 模块。

### 本次入库内容
| 类别 | 文件 |
|------|------|
| 功能开关 | `shared/constants/index.ts`、`server/.../feature-flags.constants.ts`、`server/.../school-level.resolver.ts`（opt-in 默认关闭） |
| 后端 | `server/src/kids-coding/`（entity/dto/module）、`server/src/migrations/AddKidsCoding.sql`、`server/src/app.module.ts` |
| 前端 | `web-app/src/api/kidsCoding.ts`、`views/teacher/KidsCoding.vue`、`views/parent/KidsCoding.vue`、`components/BlockNode.vue`、`components/BlockView.vue`、`router/index.ts`、`layouts/Sidebar.vue`、`layouts/layoutMenus.ts`、`views/super/SchoolFeatures.vue`、`composables/useClasses.ts`（修复） |
| 文档 | `docs/FEATURE_MATRIX.md`（更新）、`docs/KIDS_CODING_BUILD_VERIFICATION.md`（新增） |
| 清理 | 删除 7 个已完成测试报告（git 可恢复） |

## 7. 下一步（可选）

1. **上线开启**：由校管/超管在学校功能包勾选 `kids-coding` 启用；如需家长可见，班主任在班级家长功能中加入 `kids-coding` 并发布作品（`publishedToParent=true`）。
2. **无需手动建表**：部署启动自动执行 `AddKidsCoding.sql`；如需本地回滚，删除 `kids_coding_projects` 表及 `_migrations_applied` 对应行。
3. 多端联调（Web 教师端编辑器 / 家长端只读器 / 小程序）建议在实际 MySQL 8 环境下走一遍真机数据流。
