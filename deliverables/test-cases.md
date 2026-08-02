# 园丁工作台 · 全面测试用例文档（Test Cases）

> 版本：v1.0 ｜ 2026-08-02 ｜ 测试环境：云端后端 `https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api` + Web 前端 `http://localhost:5201`（连云端）+ 小程序 H5 等价编译
> 覆盖范围：**全部页面（Web 155 路由 / 166 组件、小程序 160 页）× 功能按钮 × 全部后端接口（约 200+）**
> 用例编号规则：`TC-<模块>-<序号>`；级别：N=正常，E=异常；优先级：P0 核心 / P1 重要 / P2 一般

---

## 0. 测试数据策略

- 数据来源：**自造测试数据**——超管创建专用测试学校「QA-代码审查测试学校」+ 测试校管 + 测试教师 + 测试班级/学生/家长，所有 CRUD 用例在其内执行，测试结束清理。
- 通用账号：超管 `admin/admin`；测试校管 `qa_sa/Test@2026`；测试教师 `qa_teacher/Test@2026`；家长=学生学号。
- 依赖链：学校 → 校管 → 教师 → 班级 → 学生 → 家长账号（学号/Test@2026）。

## 1. 认证与登录（Auth）

| 用例ID | 级别 | 前置 | 步骤 | 预期结果 |
|---|---|---|---|---|
| TC-AUTH-001 | N/P0 | 无 | POST /admin/login {admin/admin} | 200，返回 token |
| TC-AUTH-002 | E/P0 | 无 | POST /admin/login {admin/wrong} | 401 密码错误，不返回 token |
| TC-AUTH-003 | N/P0 | 无 | POST /school-admin/login {qa_sa/Test@2026} | 200 token |
| TC-AUTH-004 | E/P0 | 无 | POST /school-admin/login {qa_sa/wrong} | 401 |
| TC-AUTH-005 | N/P0 | 教师已建 | POST /auth/password-login {qa_teacher/Test@2026} | 200 token+user |
| TC-AUTH-006 | E/P0 | 无 | POST /auth/password-login {不存在用户/Test@2026} | 401 账号不存在 |
| TC-AUTH-007 | N/P0 | 家长已建 | POST /parent-auth/login {学号/Test@2026} | 200 token |
| TC-AUTH-008 | E/P0 | 无 | POST /auth/unified-login {qa_teacher/wrong} | 401 |
| TC-AUTH-009 | E/P1 | 无 | POST /auth/unified-login {}（缺参） | 400 参数校验 |
| TC-AUTH-010 | N/P1 | 任意 token | GET /auth/me | 200 返回 role/effectiveFeatures |
| TC-AUTH-011 | E/P1 | 无 token | GET /auth/me | 401 未登录 |
| TC-AUTH-012 | E/P1 | 伪造 token | GET /auth/me {Authorization: Bearer invalid} | 401 |
| TC-AUTH-013 | N/P1 | 无 | GET /health | 200 {status:ok} |
| TC-AUTH-014 | E/P1 | 无 | 连续 10+ 次错误登录同一账号 | 触发 429 限流 |
| TC-AUTH-015 | E/P1 | 教师 token | 用教师 token 调 POST /admin/schools | 401 权限不足 |
| TC-AUTH-016 | E/P1 | 教师 token | 用教师 token 调 POST /school-admin/teachers | 401 权限不足 |

## 2. 超管模块（Admin，7 页 / 19 接口）

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-ADM-001 | N/P0 | GET /admin/schools?skip=0&take=10 | 200，含测试学校 |
| TC-ADM-002 | E/P1 | GET /admin/schools?take=99999 | take 被钳制 ≤500，不 500 |
| TC-ADM-003 | N/P1 | POST /admin/schools {name:QA测试校A,prefix,platform} | 201，返回学校 |
| TC-ADM-004 | E/P1 | POST /admin/schools {}（缺 name） | 400 校验失败 |
| TC-ADM-005 | N/P1 | PATCH /admin/schools/:id {contact} | 200 更新成功 |
| TC-ADM-006 | E/P1 | PATCH /admin/schools/不存在的id | 404 |
| TC-ADM-007 | N/P1 | GET /admin/schools/:id/features → PATCH 设置功能包 | 读取/写入成功 |
| TC-ADM-008 | N/P1 | POST /admin/schools/batch-toggle {ids,enabled:false} | 200 批量停用 |
| TC-ADM-009 | E/P1 | POST /admin/schools/batch-toggle {ids:[],enabled} | 400 空列表 |
| TC-ADM-010 | N/P1 | POST /admin/school-admins {username:qa_sa2,...} | 201 |
| TC-ADM-011 | E/P1 | POST /admin/school-admins {重复username} | 409/400 唯一冲突 |
| TC-ADM-012 | N/P1 | PATCH /admin/school-admins/:id/password {新密码} | 200，旧密码失效新密码可登录 |
| TC-ADM-013 | N/P1 | PATCH /admin/school-admins/:id/enabled {false} | 200，该账号登录 401 |
| TC-ADM-014 | N/P1 | POST /admin/school-admins/batch-toggle | 200 |
| TC-ADM-015 | N/P1 | GET /admin/audit-logs?skip=0&take=20 | 200 列表非空（含操作记录） |
| TC-ADM-016 | E/P1 | GET /admin/audit-logs（无 super token） | 401 |
| TC-ADM-017 | E/P0 | POST /admin/reset-all {confirm:false} | 400/403 拒绝（必须确认） |
| TC-ADM-018 | E/S0 | POST /admin/reset-all {confirm:true} | ⚠️ 数据清零，仅测试学校内预演；**不执行**（改代码审查发现项） |
| TC-ADM-019 | N/P1 | GET /admin/teachers?skip=0&take=5 | 200 平台教师列表 |
| TC-ADM-020 | N/P1 | POST /admin/teachers/:id/clear-data | 200 清理该教师数据（测试教师） |

## 3. 学校管理员模块（School Admin，8 页 / 约 40 接口）

### 3.1 仪表盘与教师

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-SA-001 | N/P0 | GET /school-admin/dashboard | 200 统计卡片数据 |
| TC-SA-002 | N/P0 | GET /school-admin/teachers?skip=0&take=10 | 200 本校正管教师 |
| TC-SA-003 | N/P0 | POST /school-admin/teachers {name,username,password,subject,positions,grade} | 201 教师可登录 |
| TC-SA-004 | E/P1 | POST /school-admin/teachers {无name/无username} | 400 |
| TC-SA-005 | E/P1 | POST /school-admin/teachers {重复username} | 409 唯一冲突 |
| TC-SA-006 | N/P1 | POST /school-admin/teachers/batch {2名教师} | 201 批量建成功 |
| TC-SA-007 | N/P1 | PATCH /school-admin/teachers/:id {subject} | 200 更新生效 |
| TC-SA-008 | N/P1 | PATCH /school-admin/teachers/:id/features {features:[...]} | 200 功能包生效（该教师 /auth/me 反映） |
| TC-SA-009 | N/P1 | POST /school-admin/teachers/:id/reset-password | 200 新密码登录成功 |
| TC-SA-010 | N/P1 | DELETE /school-admin/teachers/:id | 200 删除后登录 401 |
| TC-SA-011 | E/P1 | DELETE /school-admin/teachers/不存在id | 404 |
| TC-SA-012 | N/P1 | 导出：GET /school-admin/export/teachers | 200 text/csv 附件含表头 |
| TC-SA-013 | N/P1 | 导出 XLS：GET /school-admin/export/teachers-xls | 200 application/vnd...xlsx |
| TC-SA-014 | N/P1 | 导入预览：POST /school-admin/teachers/import-preview {filename:teachers.csv,data:base64} | 200 解析出行数与预览 |
| TC-SA-015 | E/P1 | 导入预览：非法文件（data 非 base64/空） | 400 明确错误 |
| TC-SA-016 | N/P1 | 导入：POST /school-admin/teachers/import | 200 创建成功 |

### 3.2 班级

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-SA-101 | N/P0 | GET /school-admin/classes | 200 列表含 headTeacherId/subjectTeachers 回填 |
| TC-SA-102 | N/P0 | POST /school-admin/classes {name:QA一班,grade,classNo,term,subjectTeachers} | 201 班级+班级成员(head/subject)落库 |
| TC-SA-103 | E/P1 | POST /school-admin/classes {} | 400 |
| TC-SA-104 | N/P1 | PATCH /school-admin/classes/:id {headTeacherId 变更} | 200 class_members 角色同步 |
| TC-SA-105 | N/P1 | POST /school-admin/classes/:id/promote {targetGrade} | 200 年级+1，班级成员同步 |
| TC-SA-106 | N/P1 | DELETE /school-admin/classes/:id | 200 班级删除 |
| TC-SA-107 | E/P1 | DELETE /school-admin/classes/不存在id | 404 |
| TC-SA-108 | N/P1 | 导入班级：import-preview + import | 200 预览/创建 |
| TC-SA-109 | N/P1 | 导出 XLS：GET /school-admin/export/classes-xls | 200 xlsx 附件 |

### 3.3 学生与家长登录

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-SA-201 | N/P0 | GET /school-admin/students | 200 列表含家长信息 |
| TC-SA-202 | N/P1 | PATCH /school-admin/students/:id {name} | 200 |
| TC-SA-203 | E/P1 | PATCH /school-admin/students/不存在id | 404 |
| TC-SA-204 | N/P1 | DELETE /school-admin/students/:id | 200 级联清理 |
| TC-SA-205 | N/P1 | POST /students/:id/toggle-parent-login | 200 家长登录开关生效 |
| TC-SA-206 | N/P1 | POST /students/:id/reset-parent-password | 200 学号/123456 可登录 |
| TC-SA-207 | N/P1 | GET /school-admin/parent-logins | 200 可开通家长账号列表 |
| TC-SA-208 | N/P1 | POST /school-admin/students/batch | 201 批量建学生 |
| TC-SA-209 | N/P1 | 导入学生：import-preview/import | 200 |
| TC-SA-210 | N/P1 | 导出：export/students + students-xls | 200 附件 |

### 3.4 公告、搜索、功能包、资源库、教材

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-SA-301 | N/P1 | GET /school-admin/notices → POST 创建 → PATCH 置顶 → DELETE | 200 全链路 |
| TC-SA-302 | E/P1 | POST /school-admin/notices {} | 400 |
| TC-SA-303 | N/P1 | GET /school-admin/search?q=教师名 | 200 命中教师/班级/学生 |
| TC-SA-304 | N/P1 | GET /school-admin/search?q=（空） | 200 空结果不 500 |
| TC-SA-305 | N/P1 | GET /school-admin/school-features → PATCH 修改 | 读取/写入成功 |
| TC-SA-306 | N/P1 | 资源库：POST /school-admin/resource-library/seed-defaults | 200 种子数据 |
| TC-SA-307 | N/P1 | 资源库 CRUD：poems/formulas/words 三组增改删查 | 200 全链路 |
| TC-SA-308 | E/P1 | 资源库：POST poems {} | 400 |
| TC-SA-309 | N/P1 | 教材：GET/POST /school-admin/textbooks + units + points CRUD | 200 树形维护 |
| TC-SA-310 | N/P1 | POST /school-admin/textbooks/seed-defaults | 200 32 本教材 |
| TC-SA-311 | N/P1 | 教师 token 调 /school-admin/* | 401 越权拦截 |

## 4. 教师模块（Teacher，核心业务 / 约 120 接口）

### 4.1 个人中心与工作台

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-001 | N/P0 | 教师登录 → GET /users/me | 200 个人信息含 subjects/positions/features |
| TC-T-002 | N/P1 | PUT/PATCH /users/me {motto,theme,fontSize} | 200 保存生效 |
| TC-T-003 | E/P1 | PATCH /users/me {非法字段:teacherId} | 400/剔除，不越权写入 |
| TC-T-004 | N/P1 | GET /config/ai + GET /config/ai-settings + GET /config/app-config | 200 三项配置读取 |
| TC-T-005 | N/P1 | PATCH /config/app-config {theme,semester} | 200 |
| TC-T-006 | N/P1 | GET /config/ai-providers | 200 启用项列表 |
| TC-T-007 | N/P1 | POST /config/ai/models（无 key 时） | 200/4xx 明确返回，不 500 |

### 4.2 班级与学生

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-101 | N/P0 | GET /classes（教师） | 200 我的班级 |
| TC-T-102 | E/P0 | POST /classes（教师创建） | **403** 恒拒绝 |
| TC-T-103 | N/P1 | POST /classes/:id/members/list | 200 班级成员（head+subject） |
| TC-T-104 | N/P1 | POST /classes/:id/members {teacherId,subjects}（班主任） | 201 添加科任 |
| TC-T-105 | N/P1 | PATCH /classes/:id/members/:tid/subjects | 200 改科任学科 |
| TC-T-106 | N/P1 | PATCH /classes/:id/my-subjects | 200 更新自己任教学科 |
| TC-T-107 | E/P1 | 非班主任 PATCH /classes/:id/members | 403 权限不足 |
| TC-T-108 | N/P1 | DELETE /classes/:id/members/:tid | 200 移除科任 |
| TC-T-109 | N/P1 | POST /classes/school-teachers | 200 本校教师列表 |
| TC-T-110 | N/P1 | GET /classes/:id/dashboard | 200 班级看板 |
| TC-T-201 | N/P0 | GET /students?classId= | 200 本班学生 |
| TC-T-202 | N/P1 | POST /students {name,classId,gender,parentName,parentPhone} | 201 学生创建 |
| TC-T-203 | E/P1 | POST /students {} | 400 |
| TC-T-204 | E/P1 | POST /students {parentPhone:123}（非法手机号） | 400 手机号校验 |
| TC-T-205 | N/P1 | PATCH /students/:id {seatNo} | 200 |
| TC-T-206 | N/P1 | POST /students/:id/toggle-parent-login | 200 |
| TC-T-207 | N/P1 | POST /students/:id/reset-parent-password | 200 学号/123456 登录 |
| TC-T-208 | N/P1 | GET /students/:id/parent-bindings | 200 绑定列表 |
| TC-T-209 | N/P1 | 批量：POST /students/bulk | 201 |
| TC-T-210 | E/P1 | 非本班教师 DELETE /students/别班id | 403/404 越权拦截 |
| TC-T-211 | N/P1 | 导入：POST /students/import（预览）→ import-commit | 200 事务写入 |
| TC-T-212 | E/P1 | import-commit 含非法学号 | 400 明确错误，无部分写入 |

### 4.3 考试与成绩

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-301 | N/P0 | POST /exams {classId,term,name,subjects,subjectFullScores,date} | 201 考试+空成绩自动建 |
| TC-T-302 | E/P1 | POST /exams {} | 400 |
| TC-T-303 | N/P1 | GET /exams?classId= | 200 本班考试 |
| TC-T-304 | N/P1 | PATCH /exams/:id {name} | 200 |
| TC-T-305 | E/P1 | 非创建者 DELETE /exams/:id | 403 |
| TC-T-306 | N/P1 | DELETE /exams/:id（创建者） | 200 级联删成绩 |
| TC-T-307 | N/P0 | POST /grades {classId,subject,examName,scores[]} | 201 成绩保存 |
| TC-T-308 | N/P1 | POST /grades/merge {classId,examName,subject,scores} | 200 合并 upsert 幂等 |
| TC-T-309 | E/P1 | POST /grades/merge {scores 含不存在 studentId} | 400 明确错误 |
| TC-T-310 | N/P1 | GET /grades?classId=&subject=&examName= | 200 成绩矩阵 |
| TC-T-311 | N/P1 | GET /grades/analysis/exam?classId=&examId= | 200 统计（均分/及格率/分布） |
| TC-T-312 | N/P1 | GET /grades/analysis/trend?classId=&subject= | 200 趋势数据 |
| TC-T-313 | N/P1 | GET /grades/analysis/rank?classId=&examId= | 200 排名 |
| TC-T-314 | N/P1 | GET /grades/analysis/student/:studentId | 200 学生历次成绩 |
| TC-T-315 | N/P1 | GET /grades/analysis/weak?classId=&examId= | 200 薄弱学生 |
| TC-T-316 | E/P1 | GET /grades/analysis/exam?classId=不存在 | 200 空结果/404 明确，不 500 |
| TC-T-317 | N/P1 | 成绩导入：import-preview → import-commit | 200 事务写入 |
| TC-T-318 | E/P1 | 成绩 import-preview 非法格式 | 400 |

### 4.4 课表/考勤/作业/公告

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-401 | N/P1 | GET /schedules?classId= → POST 课表 → PATCH → DELETE | 200 CRUD |
| TC-T-402 | N/P1 | GET /schedules/my | 200 我的课表（按姓名匹配） |
| TC-T-403 | N/P1 | POST /schedules/import-ai + import-commit | 200 课表 AI 导入 |
| TC-T-404 | N/P1 | GET /attendances?classId= → POST 考勤（records[]）→ PATCH | 200 CRUD |
| TC-T-405 | N/P1 | GET /homework?classId= → POST → PATCH 标记批改 → DELETE | 200 CRUD |
| TC-T-406 | N/P1 | GET /notices?scope=class → POST 公告 → PATCH 置顶/结束 | 200 CRUD |
| TC-T-407 | E/P1 | 非班主任 POST /notices（他人班级） | 403 |
| TC-T-408 | N/P1 | POST /notices/push {noticeId,classId,...} | 200 {sent:0} 不报错（模板未配） |

### 4.5 评价/积分/行为/成长/打卡（engagement 系列）

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-501 | N/P1 | 各组 CRUD：reward-records / score-records / group-scores / award-records / award-categories / behavior-records / growth-entries / checkins / reading-logs | 200 增改删查全链路 |
| TC-T-502 | E/P1 | 各 POST {}（缺必填） | 400 |
| TC-T-503 | N/P1 | GET /leaderboard?classId= | 200 排行聚合 |
| TC-T-504 | N/P1 | DELETE /score-records/:id | 200 |

### 4.6 通用 CRUD 域（CrudTable 系列）

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-601 | N/P1 | 以下每组：GET 列表 → POST 创建 → PATCH 更新 → DELETE 删除：duty-rosters / class-duty-configs / class-expenses / class-activities / class-galleries / my-galleries / notes / todos / picker-history / parent-contacts / notice-templates / work-logs / lesson-observations / teaching-calendar / class-finance / resources / generated/papers / generated/lesson-plans / generated/knowledges / generated/queries / lesson-plan-templates / home-visits / semesters / math-mistakes | 200 全链路 |
| TC-T-602 | E/P1 | 上述任一组 DELETE 不存在 id | 404 |
| TC-T-603 | E/P1 | 上述任一组 POST {} | 400 |
| TC-T-604 | N/P1 | 列表过滤：?classId=&term= 关键词 | 200 过滤生效 |
| TC-T-605 | N/P1 | 分页：?skip=0&take=10 → skip=10&take=10 | 200 两页不重叠 |
| TC-T-606 | E/P1 | 越权：教师 A 操作教师 B 的 id | 403/404 拦截 |

### 4.7 备份/消息/通知/IM

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-701 | N/P1 | POST /backups {label} → GET /backups → GET /backups/:id → DELETE | 200 快照全链路 |
| TC-T-702 | N/P1 | POST /backups/auto | 200 自动备份 |
| TC-T-703 | N/P1 | GET /notifications + /unread-count → POST /mark-all-read → 单条已读 | 200 |
| TC-T-704 | N/P1 | GET /messages + /sent + /recipients → POST 发送 → PATCH 已读 → DELETE | 200 |
| TC-T-705 | E/P1 | POST /messages {recipientId 不存在} | 400/404 |
| TC-T-706 | N/P1 | POST /im/user-sig | 200 sig 字符串 |
| TC-T-707 | N/P1 | GET /im/parents?classId= | 200 家长花名册 |
| TC-T-708 | N/P1 | POST /im/class-group {classId,groupId} | 200 群号落库 |
| TC-T-709 | N/P1 | POST /security/msg-check {content} | 200 检测结果 |
| TC-T-710 | E/P1 | POST /security/msg-check {} | 400 |

### 4.8 教材/资源库/通讯录/日历

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-T-801 | N/P1 | GET /textbooks/tree?subject=&grade= | 200 教材树 |
| TC-T-802 | N/P1 | GET /textbooks/search?keyword= | 200 知识点检索 |
| TC-T-803 | E/P1 | GET /textbooks/search?keyword=（空） | 200 空结果不 500 |
| TC-T-804 | N/P1 | GET /resource-library/poems + /search + formulas + words + words/categories | 200 全部可读 |
| TC-T-805 | N/P1 | GET /teachers + /teachers/:id/detail | 200 通讯录/详情 |
| TC-T-806 | N/P1 | GET /teaching-calendar?year=&month= → POST → PATCH → DELETE | 200 按月查询 |

## 5. 家长模块（Parent，3 页 / 15 接口）

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-P-001 | N/P0 | POST /parent-auth/login {学号/Test@2026} | 200 token |
| TC-P-002 | E/P0 | POST /parent-auth/login {学号/wrong} | 401 |
| TC-P-003 | E/P1 | POST /parent-auth/login {不存在学号} | 401 账号不存在 |
| TC-P-004 | N/P0 | GET /parent-auth/me | 200 孩子/班级信息 |
| TC-P-005 | N/P1 | GET /parent-auth/notices + exams + homework + attendance + behavior + schedule + teachers + communications | 200 全部可读 |
| TC-P-006 | N/P1 | POST /parent-auth/change-password {old,new} → 新密码登录 | 200 生效 |
| TC-P-007 | E/P1 | POST /parent-auth/change-password {old 错误} | 400/401 |
| TC-P-008 | N/P1 | POST /parent-auth/switch-student {studentId}（多孩） | 200 切换上下文 |
| TC-P-009 | N/P1 | GET /parent-auth/compare-kids | 200 多孩对比 |
| TC-P-010 | N/P1 | POST /parent-auth/student-update-request {payload} → GET 列表 | 200 提交/查看 |
| TC-P-011 | N/P1 | GET /parent-auth/bindings | 200 绑定状态（只读展示） |
| TC-P-012 | E/P1 | 家长 token 调 /admin/schools | 401 越权拦截 |
| TC-P-013 | E/P1 | 家长 token 调 POST /students | 401 越权拦截 |
| TC-P-014 | N/P1 | POST /parent-auth/subscribe {code}（未配模板） | 200 明确返回/降级，不 500 |
| TC-P-015 | N/P1 | POST /student-info-updates/:id/review {action:approve}（教师审家长申请） | 200 状态流转 |

## 6. 通用前端组件模板用例（复用组件：CrudTable / PhotoAlbum / AiTextTool / BatchImport）

> 适用于所有基于该组件的页面（约 30+ CrudTable 页、20+ AiTextTool 工具页）。各页面实例见对应模块清单，行为一致。

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-U-001 | N/P0 | 列表页加载：进入页面 | 渲染数据行，无 console 报错，无白屏 |
| TC-U-002 | N/P1 | 班级筛选 + 关键词搜索 | 列表按条件过滤 |
| TC-U-003 | N/P1 | 新增：填表单 → 保存 | POST 成功，列表出现新行 |
| TC-U-004 | E/P1 | 新增：必填项留空 → 保存 | 前端校验拦截/后端 400，不 500 |
| TC-U-005 | E/P1 | 新增：非法输入（超长文本/非法手机号） | 校验提示 |
| TC-U-006 | N/P1 | 编辑：改字段 → 保存 | PATCH 成功，数据更新 |
| TC-U-007 | N/P1 | 删除：点击删除 → confirm → 确认 | DELETE 成功，行消失 |
| TC-U-008 | E/P1 | 删除：confirm 取消 | 不发起请求 |
| TC-U-009 | N/P1 | 分页：下一页/上一页 | 页码数据正确切换 |
| TC-U-010 | E/P1 | 空数据：删除全部行后刷新 | 显示空态，不 500 |
| TC-U-011 | N/P1 | PhotoAlbum：新增照片（base64 压缩）→ 保存 | 200，照片墙显示 |
| TC-U-012 | N/P1 | PhotoAlbum：编辑/删除照片 | 200 |
| TC-U-013 | N/P1 | AiTextTool：填表单 → 生成 | /ai/chat-sync 返回内容，展示结果 |
| TC-U-014 | E/P1 | AiTextTool：表单为空 → 生成 | 前端拦截，不发请求 |
| TC-U-015 | N/P1 | AiTextTool：复制/下载/保存 | 剪贴板/文件下载/保存到 savePath |
| TC-U-016 | N/P1 | BatchImport：上传文件 → 解析预览 → 确认导入 | 预览行数 → 导入成功 |
| TC-U-017 | E/P1 | BatchImport：非法文件 | 明确错误提示 |

## 7. Web 页面级用例（路由渲染冒烟，166 组件全量）

> 执行方式：e2e 浏览器冒烟，逐路由验证「渲染不崩 + 无 console.error + 无 pageerror + 非白屏」。权限不足路由（如校管端）按角色隔离验证。P0 核心页面另做交互验证。

| 用例ID | 级别 | 覆盖 | 预期结果 |
|---|---|---|---|
| TC-W-001 | N/P0 | 登录页/登出/无权限页/404 页 | 跳转正确、提示正确 |
| TC-W-002 | N/P0 | super 7 页全部路由 | 渲染正常、菜单高亮 |
| TC-W-003 | N/P0 | school_admin 8 页全部路由 | 渲染正常 |
| TC-W-004 | N/P0 | teacher 133 页全部路由 | 渲染正常（含 34 游戏页、42 工具页） |
| TC-W-005 | N/P0 | parent 3 页全部路由 | 渲染正常 |
| TC-W-006 | E/P1 | 教师访问 /super/* | 跳 /forbidden |
| TC-W-007 | E/P1 | 家长访问 /teacher/* | 跳 /forbidden |
| TC-W-008 | E/P1 | 未登录访问受保护路由 | 跳 /login |
| TC-W-009 | N/P1 | 路由级刷新重试（后端抖动隔离） | 重试后渲染成功 |
| TC-W-010 | N/P1 | 各角色 Dashboard 卡片跳转 | 跳转目标正确 |

## 8. 小程序页面用例（160 页）

> 执行方式：uni-app 同源编译 H5 + wx 垫片（`e2e/mini.smoke.mjs`），验证渲染与核心 API 链路。真机无法 CI 无头跑，H5 为等价替代。KNOWN 基线（`e2e/mini-baseline.json`）内缺陷单列。

| 用例ID | 级别 | 覆盖 | 预期结果 |
|---|---|---|---|
| TC-M-001 | N/P0 | 登录页（教师/家长两种登录入口） | 渲染 + 登录链路 |
| TC-M-002 | N/P0 | tabBar 5 页（工作台/班级/学生/工具箱/设置） | 渲染 + 下拉刷新 |
| TC-M-003 | N/P0 | 教师主包 105 页 | 渲染无白屏，接口 401 隔离处理 |
| TC-M-004 | N/P0 | 校管端 6 页 | 渲染（权限基线内已知 401 单列） |
| TC-M-005 | N/P0 | 家长端 3 页 | 渲染 |
| TC-M-006 | N/P1 | games 子包 34 页 | 渲染无 JS 错误 |
| TC-M-007 | N/P1 | tools 子包 15 页 | 渲染无 JS 错误 |
| TC-M-008 | N/P1 | ai 子包 6 页 | 渲染无 JS 错误 |
| TC-M-009 | N/P1 | 工具页 /ai/chat-sync 调用 | 生成链路可用或明确降级 |

## 9. 安全与健壮性专项（横切）

| 用例ID | 级别 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-S-001 | E/S0 | 越权：teacher 访问 teacherId 隔离的其他教师数据（拼接 id） | 403/404，无数据泄露 |
| TC-S-002 | E/S0 | 越权：school_admin A 校操作 B 校数据 | 403/404 |
| TC-S-003 | E/S0 | 注入：搜索/创建参数注入 SQL 片段 | 参数化，返回空/错误而非执行 |
| TC-S-004 | E/S1 | XSS：公告/作业 title 含 <script> | 转义存储，前端不执行 |
| TC-S-005 | E/S1 | 敏感字段：POST 携带 teacherId/id/role | stripUnsafe 剔除，无法伪造 |
| TC-S-006 | E/S1 | 限流：AI 接口短时高频调用 | 429 |
| TC-S-007 | E/S1 | 超大 body（>5MB base64） | 413/400 明确错误 |
| TC-S-008 | E/S1 | 请求体非法 JSON | 400 不 500 |
| TC-S-009 | N/S3 | 全接口 404 路径（/api/不存在的路由） | 404 JSON，不 500 |
| TC-S-010 | E/S2 | 重复提交：快速连点保存 | 无重复数据/幂等 |

## 10. 用例统计

| 维度 | 用例数 | P0 | P1 | S0/S1 异常专项 |
|---|---|---|---|---|
| 认证 AUTH | 16 | 6 | 10 | 4 |
| 超管 ADM | 20 | 1 | 19 | 1 |
| 校管 SA | 35 | 6 | 29 | - |
| 教师 T | 70 | 8 | 62 | - |
| 家长 P | 15 | 3 | 12 | 3 |
| 通用组件 U | 17 | 2 | 15 | - |
| Web 页面 W | 10 | 8 | 2 | 3 |
| 小程序 M | 9 | 8 | 1 | - |
| 安全 S | 10 | - | 1 | 9 |
| **合计** | **202** | **42** | **151** | **20** |

> 注：CrudTable 系列 TC-T-601 单条覆盖 24 组接口全链路；页面冒烟 TC-W-004 覆盖教师 133 条子路由；小程序 TC-M-003 覆盖 105 页。实际断言点约 **800+**。

---

*执行结果见 `deliverables/test-report.md` 与原始数据 `deliverables/api-test-results.json`。*
