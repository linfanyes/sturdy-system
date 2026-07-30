# 功能管理精细化改造 — 后端交付文档

> 工程师：寇豆码（接力收尾轮）
> 状态：编译通过（`npx tsc --noEmit` exit 0），**IS_PASS: YES**

---

## 1. 新增 / 修改文件清单

### 1.1 新增（功能包核心）

| 文件 | 说明 |
| --- | --- |
| `server/src/common/decorators/feature.decorator.ts` | `@Feature(...keys)` 装饰器，SetMetadata('features', keys) |
| `server/src/common/feature/level-resolver.interface.ts` | `FeatureLevelResolver` / `FeatureContext` 接口（有序层级链抽象） |
| `server/src/common/feature/school-level.resolver.ts` | 学校级解析器（order=10）：`School.featureFlags`，null/[] = 不收窄 |
| `server/src/common/feature/teacher-level.resolver.ts` | 教师级解析器（order=20）：`User.features`，null/[] = 不收窄 |
| `server/src/common/feature/feature.service.ts` | 核心算法：super/school_admin → ALL；teacher/parent → FEATURE_FLAGS ∩ 各级 resolver；parent 经 studentId→Student.teacherId→User 解析 |
| `server/src/common/feature/feature.guard.ts` | `FeatureGuard`：读 'features' 元数据，空放行；未命中抛 403「当前功能未开放：\<key\>」 |
| `server/src/common/feature/feature.module.ts` | `@Global()` 模块，FEATURE_RESOLVERS 令牌注入有序链（未来可插 ProjectLevelResolver） |
| `server/src/migrations/AddSchoolFeatureFlags.ts` | TypeORM MigrationInterface 形式迁移（幂等 up / 可逆 down） |
| `server/migrations/0017_school_feature_flags.sql` | 启动期自动执行的 SQL 迁移（与既有 000x 风格一致） |

### 1.2 修改（既有文件）

| 文件 | 改动 |
| --- | --- |
| `server/src/school/school.entity.ts` | 新增 `featureFlags: string[] \| null`（JSON 列 `feature_flags`） |
| `server/src/app.module.ts` | 引入 `FeatureModule`（全局） |
| `server/src/auth/auth.service.ts` | 各登录路径（账号/微信/家长/校管/超管）响应注入 `effectiveFeatures`；新增 profile 构建复用 `FeatureService.buildProfile` |
| `server/src/auth/auth.controller.ts` | `GET /auth/me` 返回 role / schoolId / rawFeatures / schoolFeatureFlags / effectiveFeatures |
| `shared/constants/index.ts` | 新增 `FEATURE_FLAGS`（40 key 单一事实来源）、`FEATURE_FLAG_LABELS`、`FEATURE_FLAGS_SET`、`FEATURE_FLAG_LIST` |
| 28 个业务模块文件 | 补 `@Feature(key)` + `@UseGuards(JwtAuthGuard, FeatureGuard)`（见 §2） |

### 1.3 本轮收尾修复（3 项）

1. **30 处编译错误**：18 个 `*.module.ts` 使用了 `@UseGuards` 但未从 `@nestjs/common` 导入 → 批量补入既有 import；修复后 `tsc --noEmit` 通过。
2. **key 笔误**：`award.module.ts` 的 `award-categories`（奖励类别）误标 `@Feature('reward')`（AI 奖赏文书 key）→ 改为 `@Feature('rewards')`（奖励/积分域）。
3. **冗余守卫**：`messages/message.controller.ts` 类上重复标注了两次 `@UseGuards(JwtAuthGuard)` → 保留 `@UseGuards(JwtAuthGuard, FeatureGuard)` 一处。

## 2. @Feature 标注清单（controller → key）

| 路由 | 功能 key | 文件 |
| --- | --- | --- |
| `/ai` | ai | ai/ai.controller.ts |
| `/generated/papers` `/generated/lesson-plans` `/generated/knowledges` `/generated/queries` | ai | generated/generated.module.ts |
| `/award-records` `/award-categories` | rewards | award/award.module.ts |
| `/reward-records` `/score-records` `/group-scores` | rewards | engagement/engagement.module.ts |
| `/checkins` | checkin | checkin/checkin.module.ts |
| `/class-expenses` | finance | class-ops/class-ops.module.ts |
| `/class-activities` | activities | class-ops/class-ops.module.ts |
| `/class-duty-configs` | duty | class-ops/class-ops.module.ts |
| `/duty-rosters` | duty | duty-roster/duty-roster.module.ts |
| `/classes` | classes | classes/classes.module.ts |
| `/students` | students | students/students.module.ts |
| `/exams` | exams | exams/exams.module.ts |
| `/grades` | grades | grades/grades.module.ts |
| `/class-galleries` | gallery | gallery/gallery.module.ts |
| `/my-galleries` | gallery | my-gallery/my-gallery.module.ts |
| `/growth-entries` | growth | growth/growth.module.ts |
| `/behavior-records` | behavior | growth/growth.module.ts |
| `/home-visits` | parents | home-visit/home-visit.module.ts |
| `/parent-contacts` | parents | parent-contact/parent-contact.module.ts |
| `/notice-templates` | notices | parent-contact/parent-contact.module.ts |
| `/notifications` | notices | notification/notification.controller.ts |
| `/notices` | notices | school/school.module.ts |
| `/im` | im | im/im.module.ts |
| `/messages` | im | messages/message.controller.ts |
| `/lesson-observations` | observation | lesson-observation/lesson-observation.module.ts |
| `/reading-logs` | reading | reading-log/reading-log.module.ts |
| `/seat-layouts` | seats | seats/seats.module.ts |
| `/schedules`（CRUD + 导入） | schedule | school/school.module.ts |
| `/attendances` | attendance | school/school.module.ts |
| `/homework` | homework | school/school.module.ts |
| `/resources` | subject_tools | school/school.module.ts |
| `/notes` | notes | notes/notes.module.ts |
| `/todos` | todos | notes/notes.module.ts |
| `/picker-history` | picker_history | notes/notes.module.ts |
| `/teachers` | teachers | teacher/teacher.module.ts |
| `/teaching-calendar` | calendar | teaching-calendar/teaching-calendar.controller.ts |
| `/work-logs` | worklog | work-log/work-log.module.ts |

全部 key 均已核对存在于 `shared/constants/index.ts` 的 `FEATURE_FLAGS`（40 个）之中。
**未标注**（按约束）：`/admin/*`、`/school-admin/*` 管理端点、`/auth/*`、上传等基础设施端点 —— 扫描确认无误标。

## 3. 登录 / me 返回字段

### 3.1 登录响应（各角色登录路径均注入）

```jsonc
{
  "role": "teacher",
  "token": "…",
  "user": { /* 脱敏用户 */ },
  "effectiveFeatures": ["classes", "students", "exams", "…"]  // 学校级 ∩ 教师级
}
```

- super / school_admin：`effectiveFeatures` = FEATURE_FLAGS 全集（后端 @Feature 永不拦截）。
- parent：经「studentId → Student.teacherId → User」按孩子教师所在学校+教师功能计算。

### 3.2 `GET /auth/me`（FeatureProfile）

```jsonc
{
  "role": "teacher",
  "schoolId": "sch_xxx",
  "rawFeatures": ["exams", "grades"],   // 教师级原始配置；超管/校管为 "*"
  "schoolFeatureFlags": ["exams"],      // School.featureFlags；null = 学校级不限制
  "effectiveFeatures": ["exams"]        // 实际可用 = 层级链交集
}
```

## 4. 核心算法（已抽查确认）

- **super / school_admin** → effective = ALL（`feature.service.ts:83`），学校级开关只影响 teacher/parent（安全红线 ✓）。
- **层级链交集**：`effective = FEATURE_FLAGS`，依次与各 resolver（school order=10 → teacher order=20）返回集合求交；resolver 返回 **null/[] = 该级不收窄**（全集），上级关闭的 key 下级无法补回 ✓。
- **FeatureGuard**：`Reflector.getAllAndOverride('features', [handler, class])`，空放行；未命中抛 `ForbiddenException('当前功能未开放：<key>')` ✓。**DEMO_MODE 不禁用本校验** ✓。
- **迁移**：`AddSchoolFeatureFlags.ts` 用 information_schema 判列存在，up 幂等 / down 可逆 ✓；`0017_school_feature_flags.sql` 走项目启动期自动迁移。

## 5. 本地验证步骤

```bash
# 1) 编译验证（已通过）
cd server && npx tsc --noEmit          # exit 0

# 2) 迁移：启动服务即自动执行 server/migrations/*.sql（幂等）
npm run start:dev
# 或使用 TypeORM 运行器环境：
# npx typeorm migration:run   /   npx typeorm migration:revert（回滚）

# 3) 模拟：把某校学校级只开 exams
# UPDATE schools SET feature_flags = '["exams"]' WHERE id = '<schoolId>';

# 4) 教师登录拿 token，观察 effectiveFeatures 只剩 exams（∩ 教师级）
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<teacher>","password":"<pwd>"}'

# 5) 越权访问未开放功能 → 403
curl -s http://localhost:3000/api/grades -H "Authorization: Bearer <teacherToken>"
# => { "statusCode": 403, "code": "FORBIDDEN", "message": "当前功能未开放：grades" }

# 6) 已开放功能正常 → 200
curl -s http://localhost:3000/api/exams -H "Authorization: Bearer <teacherToken>"

# 7) 校管/超管不受影响（effective=ALL）
curl -s http://localhost:3000/api/auth/me -H "Authorization: Bearer <adminToken>"
```

## 6. IS_PASS 结论

**IS_PASS: YES**

- `npx tsc --noEmit` 通过（0 错误）；本轮修复 30 处 `UseGuards` 缺导入、1 处 key 笔误、1 处冗余守卫。
- 核心算法 / 守卫 / 迁移三处抽查符合设计；FeatureModule 已在 app.module 全局装配；`effectiveFeatures` 已进入全部登录路径与 `/auth/me`。
- 未改 `SchoolAdmin.permissions`；管理端点无 @Feature 误标；DEMO_MODE 不绕过校验。

### 遗留说明（不阻塞）

1. 运行时 e2e（登录→403）依赖本地 MySQL 环境，本轮仅做静态编译与代码审查，由 QA 按 §5 步骤执行。
2. `AddSchoolFeatureFlags.ts` 的多语句 `queryRunner.query` 在个别驱动配置下需开启 `multipleStatements`；实际生效路径为启动期 `0017_school_feature_flags.sql`，双保险。
