# 园丁工作台 · 2026-08-07 功能增强与全面测试交付报告

## 一、本次变更概览

### 1. 新功能：班级列表显示学生人数
- **后端**：校管 `GET /school-admin/classes` 与教师端 `GET /classes` 均回填 `studentCount`（按 classId 分组统计 students 表）。
- **Web 校管端** `school-admin/Classes.vue`：表格新增「学生人数」列（人数 + 图标，无数据显 `-`）。
- **小程序** `classes.vue`：班级列表 meta 增加「N 名学生」，详情弹窗花名册数优先用后端回填值（免去前端全量拉取）。

### 2. 缺陷修复（含此前遗留）
| 缺陷 | 修复 | 文件 |
|---|---|---|
| `StudentsService` 未按班级集合过滤，转交班主任后新班主任看不到学生 | `isClassScopedEntity() = true` | `server/src/students/students.module.ts` |
| 校管转交班主任不同步 `students.teacherId` | `updateClass` 转交分支同步更新该班学生 | `server/src/school-admin/school-admin.service.ts` |
| 审计日志为空（`BaseEntity.teacherId` NOT NULL 无默认值，写入被静默吞错） | entity 加 `default: ''` + service 显式传 `teacherId: ''` | `server/src/audit/audit.entity.ts` / `audit.service.ts` |
| Web 路由断链（`RewardRecords.vue` 不存在）、导入缺失（`GAME_KEY_TO_NAME`/`GAME_SCORE_SUBMIT_THROTTLE_MS`）、重复导入（`Languages`）、Google Fonts 外链 | 均已修复 | 见 `deliverables/import-integrity-scan-2026-08-07.md` |
| 小程序 7 个游戏页 `env()` CSS 告警 | 迁移到内联 `:style` | `mini-program/src/pages/games/*` |

### 3. 测试数据与工具（重新编写）
- `test-deliverables/a-test-seed-data.js`（增强版）：
  - **补写 class_members 6 条**（head 2 + subject 4，含跨班科任）——此前为空导致教师端列表全空
  - **补家长密码哈希**（sha256('123456')）——此前为 NULL 致家长登录 400
  - 清理表清单从 14 张扩至 29 张（避免重复执行残留）
- `test-deliverables/c-full-function-test-cases.md`：五角色 × 全模块测试案例矩阵（40+ 案例）
- `test-deliverables/d-regression-verify.mjs`：本次修复专项回归（26 断言）
- `scripts/check-routes.mjs`：路由断链检查（181 处组件全存在）

## 二、测试结果

| 测试项 | 结果 |
|---|---|
| 五角色全量 API（`b-test-suite.js`，69 用例） | ✅ **100%**（修正 8 处过时断言后全绿） |
| 专项回归（`d-regression-verify.mjs`，26 断言） | ✅ **100%** |
| 前端导入完整性（951 处具名导入） | ✅ 0 缺失 |
| 路由断链（181 处懒加载组件） | ✅ 0 断链 |
| Web 关键页面 vite 编译 | ✅ HTTP 200 |
| 小程序构建 | ✅ exit 0（1 条历史遗留无害 circular 警告，见下） |
| 审计日志写入实测 | ✅ 有数据，`teacherId` 默认值生效 |

## 三、验证过的关键行为（本地后端 + 本地 MySQL 实测）
- 校管/教师班级列表均带 `studentCount`（一班 6 / 二班 4）
- 教师端学生列表按班级集合可见：王老师 10 名（一班 head + 二班科任）、张老师 10 名（跨班）、李老师 4 名（二班）
- 转交班主任：`classes.teacherId` 与全班 `students.teacherId` 同步更新
- 家长登录（学号 2024001 / 123456）成功，`/parent-auth/me` 200
- 越权：无 token 401、教师调超管接口 401、非班主任删班 403、非班主任批量导入 403

## 四、已知遗留（非本次引入，建议后续处理）
1. **小程序 circular chunk 警告**：`common/store → common/auth-machine → common/request → common/store` 循环依赖（历史结构）。已尝试按 Rollup 建议将 App.vue 直连 `auth-machine`，但因该环本质是 `store ↔ request`（request 依赖 store 的 token），需重构 request 的 token 获取方式，风险大于收益，暂缓。构建成功不受影响。
2. **云托管部署**：`students.module.ts` / `school-admin.service.ts` / `classes.module.ts` 的后端改动需重新部署云托管后端才在生产生效（本次在本地后端实测通过）。

## 五、交付文件
- `test-deliverables/c-full-function-test-cases.md`（测试案例与数据文档）
- `test-deliverables/a-test-seed-data.js`（增强版种子）
- `test-deliverables/b-test-suite.js`（五角色全量套件，已修正过时断言）
- `test-deliverables/d-regression-verify.mjs`（专项回归）
- `scripts/check-routes.mjs`（路由断链检查）
- `deliverables/import-integrity-scan-2026-08-07.md`（导入完整性报告）
