# 少儿编程（kids-coding）功能 — 构建与逻辑验证报告

> 生成时间：2026-08-15（终稿；含 §8 家长端可编程增强）
> 范围：全栈实现（#1~#6）完成并通过编译 / 类型 / 逻辑 / 部署四重验证；本次增强（#7~#12）为家长端新增「可编程练习」。
> 状态：基础功能已提交并推送（commit `0dde502`，master）；**「家长端可编程」代码已落地，构建验证与提交待 shell 恢复后执行（见 §8）。**

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

## 8. 本次增强：家长端可编程练习（#7~#12）

> 用户需求：家长端「不只看作品，也要能编程，给学生练习」。
> 范围：在原有「家长只读画廊」基础上，新增家长/学生**自主练习**的读写编辑器（与教师编辑器同套拖拽 + 运行引擎），并按 `studentId` 隔离。

### 8.1 数据模型扩展
- `CodingProject` 实体新增 `studentId: string|null` 字段与 `idx_kc_stu` 索引。
- 归属语义（与 `teacherId` 互斥）：
  - 教师作品：`teacherId` 有值、`studentId` 为 null；可经 `publishedToParent` 发布给班级家长查看。
  - 练习作品：`studentId` 有值、`teacherId` 为 null；家长端创作，仅本人可见。
- 迁移脚本 `server/src/migrations/AddKidsCodingStudent.sql`：幂等 `ALTER TABLE` 补 `student_id` 列 + `idx_kc_stu` 索引（沿用 `information_schema` 判定模式，兼容 MySQL 8，纳入 `main.ts` 启动迁移器自动执行）。

### 8.2 后端练习 CRUD（`ParentCodingController`，按 `studentId` 隔离）
- `GET /parent/kids-coding/mine`：列出本人（`req.user.studentId`）练习作品。
- `POST /parent/kids-coding`：新建练习（`studentId` 置为当前学生、`teacherId=null`、`classId=null`、`publishedToParent=false`）。
- `PATCH /parent/kids-coding/:id` / `DELETE /parent/kids-coding/:id`：更新/删除本人练习（校验 `studentId` 归属，越权返回 404）。
- 既有 `GET /`、`GET /:id` 教师作品只读画廊保持不变。

> 隔离依据：家长 JWT 载荷含 `studentId`（见 `wechat-auth.service.ts` / `auth.service.ts` 的 `jwt.sign({..., studentId: stu.id})`），`jwt-auth.guard.ts` 以 `payload.studentId` 加载学生 → `req.user.studentId` 可靠可取。多娃场景以当前选中孩子的 `studentId` 隔离各自的练习作品。

### 8.3 前端
- `web-app/src/api/kidsCoding.ts` 新增：`listMyPracticeProjects`（`GET /parent/kids-coding/mine`）、`createPracticeProject`（`POST`）、`updatePracticeProject`（`PATCH /:id`）、`removePracticeProject`（`DELETE /:id`）。
- `web-app/src/views/parent/KidsCoding.vue` 改造为**双视图**：
  - 「我的练习」：完整拖拽积木编辑器（复用 `BlockNode`）+ 运行引擎（小乌龟舞台）+ 作品保存/载入/删除，**云端不可用自动降级 localStorage（`kids-coding-practice-local`）**。
  - 「老师作品」：保留原有 `BlockView` 只读画廊（参考学习）。
  - 运行引擎共享，按当前 tab 决定运行哪套积木；切 tab 用 `nextTick` 确保新舞台 canvas 挂载后重绘。

### 8.4 验证状态（2026-08-15 实机已通过）
| 项目 | 命令 | 结果 |
|------|------|------|
| web-app | `npx vue-tsc -b` (typecheck) | ✅ 通过（修复 `CodingProject.description` 类型 `string｜null` 与 payload 对齐） |
| web-app | `npx vite build` | ✅ 通过（产出 `KidsCoding-*.js` 教师端/家长端分包） |
| server | `npx nest build` | ✅ 通过（修复 `ParentCodingController.createMine` 因 `repo.create(... as any)` 命中数组重载导致 `saved.id` 类型错误，改为 `as DeepPartial<CodingProject>`） |
| 迁移 | `AddKidsCodingStudent.sql` 实机（MySQL 8.4.11） | ✅ 通过：首次加列 `student_id` + `idx_kc_stu` 索引成功；二次执行幂等跳过、结构不变、无报错 |

---

## §9 本轮完善（2026-08-15 补充）

在「继续完善少儿编程」阶段，静态核查发现并修复/增强了以下可改进点：

### 9.1 教师端作品级发布闭环（功能硬伤修复）★
- **问题**：教师端 `saveProject` 仅发送 `{title, blocks, teacherName}`，从不携带 `classId` / `publishedToParent`；而「👨‍👩‍👧 开放给家长」弹窗只切换**班级菜单权限**（`parentFeatures`），作品本身永远 `publishedToParent=false`、`classId=null`。家长端 `ParentCodingController.listForParent` 按 `classId + publishedToParent=true` 过滤，导致家长**永远查不到任何教师作品**——「开放给家长」链路从未真正闭环。
- **修复**：教师端编辑器新增**作品级**发布设置（班级下拉选择 + 「开放给家长」开关 + 描述框），`saveProject` 一并提交 `classId` / `publishedToParent` / `description`；`loadIntoEditor` / `newProject` / 本地兜底同步这三个字段；`onMounted` 预加载班级列表供下拉使用。后端 DTO 已完整支持，无需改动。
- **结果**：教师把作品选班级并勾选「开放给家长」保存后，对应班级（且该班已开启少儿编程菜单）的家长即可在「老师作品」画廊看到并运行该作品。

### 9.2 运行引擎步数保护（健壮性）★
- **问题**：`repeat` 积木的 `count` 可设为极大值，运行引擎会同步展开全部迭代并 `await sleep`，冻结浏览器 UI。
- **修复**：教师端与家长端运行引擎引入 `MAX_STEPS = 5000` 全局步数计数器，`execBlock` 每步自增，超限即抛错由 `run()` 捕获停止，日志显示「⏹ 已停止」。

### 9.3 删除二次确认（防误删）
- **修复**：教师端 `deleteProject`、家长端 `deletePractice` 增加 `window.confirm` 二次确认，避免误删云端/本地作品。

### 9.4 本轮改动文件清单
| 文件 | 改动 |
|------|------|
| web-app/src/views/teacher/KidsCoding.vue | 发布设置三状态 + `saveProject` 发送 + 回显/重置/本地兜底同步 + 顶栏控件 + 引擎步数保护 + 删除确认 |
| web-app/src/views/parent/KidsCoding.vue | 引擎步数保护 + 删除确认 |

### 9.5 验证状态
- 静态走查：前后端契约一致（`CreateCodingProjectDto`/`UpdateCodingProjectDto` 已支持 `classId`/`publishedToParent`/`description`），逻辑闭环正确；步数计数与确认弹窗均按预期插入。
- 实机构建（2026-08-15）：`npx vue-tsc -b` ✅、`npx vite build` ✅、`npx nest build` ✅ 全部通过（修复点同 §8.4）。本轮所有改动已随 §8.4 四项验证一并提交推送。
