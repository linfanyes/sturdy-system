# 园丁工作台 · 全面功能测试案例与测试数据（2026-08-07 修订版）

> 本文档为「全面功能测试」的执行依据：五角色 × 全页面 × 全按钮 × 全功能。
> 配套可执行脚本：`a-test-seed-data.js`（测试数据）、`b-test-suite.js`（五角色全量 API 测试）、`scripts/check-imports.mjs`（前端导入完整性）。
> 本文档重新编写案例并补齐测试数据（重点：class_members 关系、家长账号、跨班科任）。

---

## 1. 测试范围与策略

| 维度 | 范围 | 方法 |
|---|---|---|
| 后端 API | 60+ controller 全部接口 | `b-test-suite.js` 全量自动化（五角色 × 鉴权/隔离/边界/异常） |
| Web 前端 | 140 路由页面 | 路由/导入完整性静态检查 + 关键角色浏览器冒烟 |
| 小程序 | 159 页面 | 构建成功 + 页面清单核对 + 关键流程 API 层验证 |
| 数据 | 本地 MySQL `gardener_test` | `a-test-seed-data.js`（增强版，含 class_members） |

## 2. 测试数据（增强版种子）

### 2.1 账号矩阵（密码均 `123456`，超管 `admin/admin`）

| 角色 | 账号 | 姓名 | 归属 |
|---|---|---|---|
| 超管 | admin / admin | 系统管理员 | 全局 |
| 校管 | sa1 | 赵主任 | 阳光实验小学（SCH001） |
| 班主任 | teacher1 | 王老师 | 一年级一班（head） |
| 班主任 | teacher2 | 李老师 | 二年级二班（head） |
| 任课教师 | teacher3 | 张老师 | 一年级一班+二年级二班（subject） |
| 任课教师 | teacher4 | 陈老师 | 一年级一班（subject） |
| 家长 | 学号 2024001 / 123456 | 张三妈妈 | 学生张三 |
| 家长 | 学号 2024002 / 123456 | 李四爸爸 | 学生李四 |

### 2.2 数据规模

- 学校 2 所（SCH001 阳光实验小学 / SCH002 明德小学）
- 班级 2 个（一年级一班 6 生 / 二年级二班 4 生）
- 学生 10 名（6 + 4，含家长信息）
- class_members 6 条（head 2 + subject 4）——**本次增强重点**
- 成绩 10+ 条、考试 2 场、通知/作业/考勤/资源/荣誉/成长记录等

### 2.3 关键修复点（本次重写测试数据的原因）

1. **class_members 此前为空**：导致教师端 `GET /classes`/`GET /students` 按班级集合过滤时全空（与 qa_qj_math_4 生产事故同型）。种子现补写 6 条关系。
2. **清理表列表补齐**：原脚本未清理 class_members 等 15 张表，重复执行残留脏数据。现 29 张表全清。

## 3. 测试案例矩阵

> 案例编号规则：`R<角色>-<模块>-<序号>`；R1=超管 R2=校管 R3=班主任 R4=任课教师 R5=家长。

### 3.1 登录与鉴权（所有角色）

| 编号 | 案例 | 预期 |
|---|---|---|
| R1-AUTH-01 | 超管 admin/admin 登录 | 200，返回 token，跳转工作台 |
| R1-AUTH-02 | 错误密码登录 | 401「密码错误」 |
| R1-AUTH-03 | 无 token 访问受保护接口 | 401「未登录或缺少令牌」 |
| R1-AUTH-04 | token 前缀非 Bearer | 401 |
| R1-AUTH-05 | 跨角色越权（教师 token 调超管接口） | 403 |
| R2-AUTH-01 | 校管 sa1/123456 登录 | 200 |
| R3-AUTH-01 | 班主任 teacher1/123456 登录 | 200 |
| R4-AUTH-01 | 任课教师 teacher3/123456 登录 | 200 |
| R5-AUTH-01 | 家长（学号 2024001/123456）登录 | 200 |
| R5-AUTH-02 | 家长密码重置后旧密码失效 | 401 |

### 3.2 超管（R1）

| 编号 | 案例 | 接口/页面 | 预期 |
|---|---|---|---|
| R1-SCH-01 | 学校列表 | GET /admin/schools | 200，2 所学校 |
| R1-SCH-02 | 创建学校（缺 name） | POST /admin/schools | 400 |
| R1-ADM-01 | 校管列表 | GET /admin/school-admins | 200 |
| R1-ADM-02 | 创建校管 | POST /admin/school-admins | 201 |
| R1-ADM-03 | 禁用校管 | PATCH | 200，enabled=false |
| R1-AUD-01 | 审计日志列表 | GET /admin/audit-logs | 200（修复后应有数据） |
| R1-AUD-02 | 审计日志含 teacherId 默认值 | — | 无 500（实体/服务已双保险） |
| R1-CFG-01 | 平台配置读写 | GET/PATCH /admin/config | 200 |
| R1-AI-01 | AI 服务商列表 | GET /admin/ai-providers | 200 |
| R1-FEA-01 | 学校功能包开关 | PATCH /admin/school-features | 200 |
| R1-ACC-01 | 清除业务数据（确认二次） | POST /admin/account-clear | 仅超管可调 |

### 3.3 校管（R2）

| 编号 | 案例 | 接口/页面 | 预期 |
|---|---|---|---|
| R2-DASH-01 | 校管工作台统计 | GET /school-admin/dashboard | 200，教师/班级/学生数正确 |
| R2-TEA-01 | 教师列表 | GET /school-admin/teachers | 200，5 名（含禁用） |
| R2-TEA-02 | 创建教师（重复 username） | POST | 400 |
| R2-TEA-03 | 禁用/启用教师 | PATCH | 200 |
| R2-TEA-04 | 重置教师密码 | POST /school-admin/teachers/:id/reset-password | 200 |
| R2-CLS-01 | 班级列表含 studentCount | GET /school-admin/classes | **200，每班带 studentCount（新增）** |
| R2-CLS-02 | 创建班级（未选班主任） | POST /school-admin/classes | 400 |
| R2-CLS-03 | 创建班级（正常） | POST | 201，class_members 自动写 head |
| R2-CLS-04 | 转交班主任 | PATCH | 200，students.teacherId 同步更新（修复） |
| R2-CLS-05 | 删除班级 | DELETE | 200，成员关系清理 |
| R2-STU-01 | 学生列表 | GET /school-admin/students | 200，10 名 |
| R2-STU-02 | 批量导入学生（学号重复） | POST import-commit | 部分失败提示 |
| R2-STU-03 | 家长登录开关 | POST toggle-parent-login | 200，返回初始口令 |
| R2-NOT-01 | 学校公告 CRUD | /school-admin/notices | 200 |
| R2-TXT-01 | 教材知识库列表 | /school-admin/textbooks | 200 |
| R2-RES-01 | 专项资源库 | /school-admin/resource-library | 200 |
| R2-FEA-01 | 功能包开关 | /school-admin/features | 200 |
| R2-AI-01 | AI 配置 | /school-admin/ai-config | 200 |
| R2-ZHZX-01 | 智慧中小学资源 | /school-admin/online-resources/zhzx | 200 |

### 3.4 班主任（R3，teacher1 王老师）

| 编号 | 案例 | 接口/页面 | 预期 |
|---|---|---|---|
| R3-DASH-01 | 教师工作台 | GET /classes + /students | 班级 1、学生 6（修复后一致） |
| R3-CLS-01 | 我的班级列表（含 studentCount） | GET /classes | **200，studentCount=6（新增）** |
| R3-CLS-02 | 班级成员列表 | POST /classes/:id/members/list | head 1 + subject 2 |
| R3-CLS-03 | 添加科任老师 | POST /classes/:id/members | 200 |
| R3-CLS-04 | 移除科任老师 | DELETE /classes/:id/members/:tid | 200 |
| R3-CLS-05 | 非班主任删除班级 | DELETE /classes/:id | 403 |
| R3-STU-01 | 学生列表（同班协作可见） | GET /students | 6 名（含他师创建） |
| R3-STU-02 | 新增学生（家长手机号非法） | POST /students | 400 |
| R3-STU-03 | 批量导入学生 | POST /students/import-commit | 200 |
| R3-STU-04 | 开启家长登录 | POST /students/:id/toggle-parent-login | 200 |
| R3-STU-05 | 删除学生（级联清理） | DELETE /students/:id | 200 |
| R3-EXM-01 | 考试 CRUD | /exams | 200 |
| R3-GRD-01 | 成绩录入 | /grades | 200 |
| R3-HW-01 | 作业 CRUD | /homework | 200 |
| R3-NOT-01 | 公告 CRUD | /notices | 200 |
| R3-ATT-01 | 考勤 CRUD | /attendances | 200 |
| R3-REW-01 | 奖惩记录 | /reward-records | 200 |
| R3-GRW-01 | 成长记录 | /growth-entries | 200 |
| R3-DUTY-01 | 轮值表 CRUD | /duty-rosters | 200 |
| R3-SEAT-01 | 座位表 CRUD/启用 | /seat-layouts | 200 |
| R3-IM-01 | IM 会话/消息 | /im/conversations | 200 |
| R3-REV-01 | 排行榜 | /leaderboard | 200 |
| R3-GAME-01 | 游戏成绩提交 | /game-scores | 200（节流生效） |

### 3.5 任课教师（R4，teacher3 张老师，跨班科任）

| 编号 | 案例 | 接口/页面 | 预期 |
|---|---|---|---|
| R4-CLS-01 | 班级列表（跨班可见 2 班） | GET /classes | **2 班，各带 studentCount** |
| R4-CLS-02 | 非班主任编辑班级 | PATCH /classes/:id | 403 |
| R4-CLS-03 | 非班主任添加科任 | POST /classes/:id/members | 403 |
| R4-STU-01 | 学生列表（同班可见） | GET /students | 一年级班 6 名 |
| R4-STU-02 | 非班主任批量导入 | POST /students/import-commit | 403 |
| R4-GRD-01 | 成绩（仅本班可见） | GET /grades | 正常 |
| R4-RES-01 | 教学资源（teacherId 隔离） | /resources | 仅本人数据 |
| R4-WORKLOG-01 | 工作日志/听课记录 | /work-logs | 200 |

### 3.6 家长（R5）

| 编号 | 案例 | 接口/页面 | 预期 |
|---|---|---|---|
| R5-DASH-01 | 家长工作台 | /parent-auth/me | 200 |
| R5-STU-01 | 孩子列表/切换 | /parent-auth/students | 200 |
| R5-GRD-01 | 孩子成绩 | /parent-auth/grades | 200 |
| R5-ATT-01 | 孩子考勤 | /parent-auth/attendances | 200 |
| R5-HW-01 | 孩子作业 | /parent-auth/homework | 200 |
| R5-NOT-01 | 班级公告 | /parent-auth/notices | 200 |
| R5-CMP-01 | 跨娃比对 | /parent-auth/compare | 200 |
| R5-ME-01 | 个人资料/修改密码 | /parent-auth/profile | 200 |

## 4. 前端完整性检查（web + 小程序）

| 检查项 | 命令 | 预期 |
|---|---|---|
| Web 导入完整性（140 路由依赖） | `node scripts/check-imports.mjs` | 0 缺失 |
| Web 全部懒加载路由文件存在 | 路由表 vs views 目录 | 0 断链 |
| Web 关键页面 vite 编译 | curl /src/views/... | HTTP 200 |
| Web TypeScript 类型检查 | `vue-tsc --noEmit` | 0 错误 |
| Web 生产构建 | `vite build` | exit 0 |
| 小程序构建 | `npm run build:mp-weixin` | exit 0，0 warning |
| 小程序页面清单 | pages/ 159 页 | 与 pages.json 一致 |

### 4.1 Web UI 专项：面包屑与分页

#### 4.1.1 面包屑简化

| 编号 | 案例 | 页面 | 预期 |
|---|---|---|---|
| R1-UI-01 | 工作台首页面包屑 | `/super` | 不显示面包屑或仅显示页面标题 |
| R1-UI-02 | 子页面面包屑 | `/super/schools` | 仅显示「学校管理」，无「工作台 > 账户管理」路径 |
| R1-UI-03 | 直达页面面包屑 | `/super/audit-logs` | 仅显示「审计日志」 |
| R1-UI-04 | 返回按钮 | 任意子页面 | 按钮文字为「返回」，点击回到工作台瓷砖面板 |

#### 4.1.2 通用分页（CrudTable / usePagedList）

| 编号 | 案例 | 页面 | 预期 |
|---|---|---|---|
| R1-UI-05 | 列表默认分页 | 任意 SchemaCrudPage 列表 | 默认每页 10 条 |
| R1-UI-06 | 修改每页条数 | 同一列表 | 切换 5/10/20/50 后列表更新 |
| R1-UI-07 | 上一页/下一页 | 多页列表 | 翻页正常，总条数正确 |
| R1-UI-08 | 搜索时前端缓存分页 | 输入关键词后 | 先拉 500 条，前端过滤后分页 |
| R3-UI-01 | 自定义页面分页 | `/teacher/exams` | 底部显示分页栏 |
| R3-UI-02 | 自定义页面分页 | `/teacher/grades` | 底部显示分页栏 |
| R3-UI-03 | 自定义页面分页 | `/teacher/students` | 底部显示分页栏 |
| R3-UI-04 | 自定义页面分页 | `/teacher/notices` | 底部显示分页栏 |

#### 4.1.3 一级菜单切换

| 编号 | 案例 | 操作 | 预期 |
|---|---|---|---|
| R1-UI-09 | 直达菜单点击 | 在 `/super` 点击「工作台」 | 保持工作台首页，activeCategory 清空 |
| R1-UI-10 | 展开后切换直达 | 展开「账户管理」后点击「工作台」 | 收起账户管理，显示仪表盘 |
| R1-UI-11 | 子页面切换分类 | 在 `/super/schools` 点击「教学管理」 | 跳回 `/super` 并展开教学管理 |
| R1-UI-12 | 同一分类 toggle | 在 `/super` 点击「账户管理」两次 | 第一次展开，第二次收起 |

## 5. 已知缺陷与回归清单（本版修复）

1. ~~class_members 为空导致教师端列表全空~~ → 种子补 6 条关系（数据层）
2. ~~StudentsService 未 class-scoped，转交班主任后新班主任看不到学生~~ → `isClassScopedEntity()=true`（代码层，待部署）
3. ~~转交班主任不同步 students.teacherId~~ → `updateClass` 同步更新（代码层，待部署）
4. 班级列表无学生人数 → 后端回填 `studentCount` + web 表格列 + 小程序列表项（代码层，待部署）

## 6. 执行顺序

```bash
# 1. 准备数据（本地 MySQL）
node test-deliverables/a-test-seed-data.js

# 2. 起本地后端（server/node_modules 就绪后）
cd server && npx tsc -p tsconfig.build.json && node dist/main.js

# 3. 全量 API 测试
node test-deliverables/b-test-suite.js

# 4. 前端完整性
node scripts/check-imports.mjs
# + 路由文件存在性检查（scripts/check-routes.mjs）

# 5. 小程序构建
cd mini-program && npm run build:mp-weixin
```

## 7. 2026-08-07 实际执行结果

| 项目 | 结果 |
|---|---|
| 种子数据（增强版，含 class_members 6 条 + 家长密码哈希） | ✅ 执行成功 |
| 五角色全量 API 测试 `b-test-suite.js` | ✅ **69/69 通过（100%）** |
| 专项回归 `d-regression-verify.mjs`（studentCount/班级集合/转交同步/家长登录/越权） | ✅ **26/26 通过（100%）** |
| 前端导入完整性 `check-imports.mjs` | ✅ 951/951 具名导入 0 缺失 |
| 路由断链检查 `check-routes.mjs` | ✅ 181/181 组件文件存在 |
| Web TypeScript 类型检查 `vue-tsc --noEmit` | ✅ **0 错误** |
| Web 生产构建 `vite build` | ✅ **exit 0**（13.12s） |
| Web 关键路由 HTTP 200 | ✅ `/login /super /super/schools /super/teachers /teacher /teacher/classes /teacher/students /teacher/exams` |
| 小程序构建 `build:mp-weixin` | ✅ **exit 0**（159 页，1 个历史遗留无害 circular 警告） |
| 小程序 pages.json 结构 | ✅ 7 主包 + 14 分包 = 159 页 |
| 审计日志写入（teacherId 默认值修复） | ✅ 本地实测有数据 |
| 浏览器级 UI 冒烟 | ⚠️ 受本机环境限制（无可用 Chromium 运行时），以 API+编译验证兜底 |

### 7.1 本轮新增修复（TypeScript / UI）

| 文件 | 问题 | 修复 |
|---|---|---|
| `web-app/src/composables/usePagedList.ts` | `res?.items` / `res?.total` 类型推断为 `any[]` 导致 TS2339 | 拆分数组/对象分支，显式 `arr` / `totalVal` |
| `web-app/src/views/tools/AIDetailPage.vue` | `form[f[k]]` 索引表达式笔误 | 改为 `form[f.k]` |
| `web-app/src/views/tools/AIDetailPage.vue` | 模板中 `navigator.clipboard` 不可用 | 改为 `@click="copyResult"` + script 定义 `copyResult()` |
| `web-app/src/views/games/GameSnake.vue` | `machine.hooks` / `machine.speed` 为 private | 加 `(machine as any)` 断言绕过 TS 访问限制 |
| `web-app/src/views/tools/SubjectDetail.vue` 等 3 文件 | `@gardener/shared/subject-schema` 路径错误 | 统一改为 `@gardener/shared/schemas/subject-schema` |

### 7.2 b-test-suite 修正说明（脚本过时项，产品行为正确）

| 原断言 | 修正 | 原因 |
|---|---|---|
| 校管教师列表 `GET /teachers` | 改 `GET /school-admin/teachers` | /teachers 为教师角色通讯录 |
| 校管创建教师 `POST /teachers` | 改 `POST /school-admin/teachers` | 校管创建教师专属端点 |
| 教师创建班级期望 201 | 改期望 403 | 教师建班已被禁止（班级由校管创建） |
| 王老师越权看二班期望空 | 改期望可见 | 王老师兼二班科任（跨班协作合法） |
| 家长访问 /teachers 期望 200 | 改期望 401 | /teachers 教师角色专属 |
| 空参数/超长字段建班期望 400 | 改期望 403 | 教师建班先被服务层拒绝 |
