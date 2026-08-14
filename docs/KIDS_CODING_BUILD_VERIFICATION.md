# 少儿编程（kids-coding）功能 — 构建与逻辑验证报告

> 生成时间：2026-08-15
> 范围：任务 #6「文档更新 + 构建验证」收尾。全栈实现（#1~#5）已完成并通过编译/类型/逻辑验证。

## 1. 构建验证结果

| 项目 | 命令 | 结果 | 说明 |
|------|------|------|------|
| shared | `npm install && npm run build` (tsc) | ✅ 通过 | 产出 `shared/dist`（server 的 `@gardener/shared` 解析依赖它） |
| web-app | `npm run build` (vite build) | ✅ 通过 | `✓ built in 6.54s`，产物含 `KidsCoding-BXBFGJ2W.js` |
| web-app | `npm run typecheck` (vue-tsc -b) | ⚠️ 仅存量错误 | 我的新增文件 0 错误；仅 `TeacherIM.vue` 有 3 处**存量**类型错误（见 §3） |
| server | `npx tsc --noEmit` | ✅ 通过 | 0 错误 |
| server | `npm run build` (nest build) | ✅ 通过 | 产出 `dist/main.js` 与 `dist/kids-coding/*`（entity/dto/module 均已编译） |

> 结论：本次新增的少儿编程功能**未引入任何编译或类型回归**。Vite 与 Nest 两条构建链路均成功。

## 2. 关键链路逻辑走查（无需数据库）

### 2.1 默认不开放（opt-in）链路
- `feature-flags.constants.ts`：`OPT_IN_FEATURES = ['kids-coding']`。
- `school-level.resolver.ts`：`featureFlags` 为 `null/[]` 时返回
  `FEATURE_FLAGS.filter(k => !OPT_IN_FEATURES.includes(k))` → **默认剔除 kids-coding**。
- 效果：学校未显式勾选时，教师端菜单（`hasFeature('kids-coding')`）与路由守卫（`@Feature('kids-coding')`）均拦截，功能不可见不可用。

### 2.2 教师开启链路
- 学校功能包（校管/超管）将 `kids-coding` 加入 `featureFlags` → resolver 原样返回。
- 教师 `effectiveFeatures` 含 `kids-coding` → 菜单显隐与 `@Feature` 守卫同时通过 → 可进入编辑器 CRUD 作品。

### 2.3 开放给家长链路
- 班主任在班级 `parentFeatures` 加入 `kids-coding`（默认不勾选，`SchoolFeatures`/`FeatureFlags` 管理页自动同步 shared 常量）。
- 作品需 `publishedToParent = true` 且 `class_id` 指向该班级。
- 家长端 `ParentCodingController`：`@Roles('parent') @Feature('kids-coding')`，按 `p.classId + publishedToParent=true` 只读查询，仅暴露 `id/title/description/blocks/teacherName/updatedAt`，不泄露教师私有信息。

## 3. 已知存量问题（非本次引入，未处理）

`web-app/src/views/workspace/TeacherIM.vue`（第 216/224 行）引用 `imGroupId`，但该字段不在班级类型定义中 → 3 处 `TS2339`。该文件**不在本次改动范围内**（git diff 相对 HEAD 为空），属仓库历史债。建议另立任务修复（在班级类型补 `imGroupId` 或移除引用），本次为保持改动聚焦未触碰。

## 4. CI 一致性

`shared/constants/index.ts` 与 `server/src/common/feature/feature-flags.constants.ts` 的 `FEATURE_FLAGS` / `OPT_IN_FEATURES` / `PARENT_FEATURE_KEYS` / 标签均已对齐，`FEATURE_LABELS['kids-coding']='少儿编程'`，CI 一致性校验应通过。

## 5. 迁移脚本

`server/src/migrations/AddKidsCoding.sql`：幂等建表 `kids_coding_projects`（含 `idx_kc_tch`、`idx_kc_cls_pub` 索引），基于 `information_schema` 判定已存在则跳过，兼容 MySQL 8，依赖 `multipleStatements` 已开启。

## 6. 当前改动清单（均未提交）

修改（M）：
- `docs/FEATURE_MATRIX.md`、`server/src/app.module.ts`、`server/src/common/feature/feature-flags.constants.ts`、`server/src/common/feature/school-level.resolver.ts`、`shared/constants/index.ts`、`web-app/src/layouts/components/Sidebar.vue`、`web-app/src/layouts/layoutMenus.ts`、`web-app/src/router/index.ts`、`web-app/src/views/super/SchoolFeatures.vue`

新增（??）：
- `server/src/kids-coding/`（entity / dto / module）、`server/src/migrations/AddKidsCoding.sql`、`web-app/src/api/kidsCoding.ts`、`web-app/src/components/BlockNode.vue`、`web-app/src/components/BlockView.vue`、`web-app/src/views/parent/KidsCoding.vue`、`web-app/src/views/teacher/KidsCoding.vue`

删除（D，与历史清理一致，git 可恢复）：
- 7 个测试报告文件：`docs/TEST_REPORT.md`、`docs/TEST_RESULTS.md`、`qa/TEST_REPORT.md`、`test/REPORT.md`、`test/backend/api-parity-result.json`、`test/backend/api-test-report-cloud.txt`、`test/backend/api-test-report.txt`

## 7. 下一步

1. **提交/推送决策**：以上改动均未 commit。是否提交并推送至 `gitee.com/yoyoliner/work-system` 需用户拍板（删除的 7 个测试报告同样未提交）。
2. （可选）另立任务修复 `TeacherIM.vue` 的 `imGroupId` 存量类型错误。
3. 部署前在含 MySQL 8 的环境执行 `AddKidsCoding.sql` 建表。
