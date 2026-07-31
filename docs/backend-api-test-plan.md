# 后端 API 测试文档

> 基于代码分析自动生成 - 2026-07-31  
> 测试范围：NestJS 后端所有 API 端点、权限验证、角色隔离

---

## 1. 系统架构概述

### 1.1 技术栈
- **框架**: NestJS + TypeORM
- **数据库**: MySQL (utf8mb4)
- **认证**: JWT (Bearer Token)
- **权限**: 基于角色 (Roles) + 功能包 (Features) 的双层权限体系
- **限流**: 全局 60次/分钟/IP，AI接口 10次/分钟/IP

### 1.2 四级角色体系

| 角色 | 标识 | 说明 |
|------|------|------|
| 超级管理员 | `super` | 平台最高权限，管理学校和校管 |
| 学校管理员 | `school_admin` | 管理单个学校内的教师、学生、班级 |
| 教师 | `teacher` | 班主任或科任老师，管理自己的班级 |
| 家长 | `parent` | 查看孩子信息，家校沟通 |

### 1.3 班主任 vs 科任老师

通过 `class_members` 表中的 `role` 字段区分：
- `head` = 班主任：拥有班级管理权
- `subject` = 科任老师：只能查看和管理自己任教的学科

---

## 2. 认证模块 API 测试

### 2.1 统一登录 `POST /api/auth/unified-login`

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**测试用例**:

| 用例ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|--------|----------|------|----------|--------|
| AUTH-001 | 超级管理员登录 | username=admin, password=admin | 返回 role=super, token, effectiveFeatures | P0 |
| AUTH-002 | 超级管理员密码错误 | username=admin, password=wrong | 返回 401 "密码错误" | P0 |
| AUTH-003 | 学校管理员登录 | username=校管账号, password=正确密码 | 返回 role=school_admin, token, school信息 | P0 |
| AUTH-004 | 学校管理员密码错误 | username=校管账号, password=错误密码 | 返回 401 "密码错误" | P0 |
| AUTH-005 | 学校管理员账号被禁用 | username=被禁用校管, password=正确密码 | 返回 401 "账号已被禁用" | P1 |
| AUTH-006 | 教师登录 | username=教师账号, password=正确密码 | 返回 role=teacher, token, 用户信息 | P0 |
| AUTH-007 | 教师密码错误 | username=教师账号, password=错误密码 | 返回 401 "密码错误" | P0 |
| AUTH-008 | 教师账号被禁用 | username=被禁用教师, password=正确密码 | 返回 401 "账号已被禁用" | P1 |
| AUTH-009 | 教师未设置密码 | username=无密码教师, password=任意 | 返回 401 "该账号未设置密码，请用微信登录" | P1 |
| AUTH-010 | 家长登录(学号) | username=学生学号, password=家长密码 | 返回 role=parent, token, 孩子信息 | P0 |
| AUTH-011 | 家长登录未授权 | username=未开启家长登录的学号, password=密码 | 返回 401 "该学生家长登录尚未被老师授权" | P1 |
| AUTH-012 | 家长密码错误 | username=学号, password=错误密码 | 返回 401 "密码错误" | P0 |
| AUTH-013 | 师兼家双角色登录 | username=兼任家长的教师, password=正确密码 | 返回 needsRoleChoice=true, roles=["teacher","parent"] | P1 |
| AUTH-014 | 账号不存在 | username=不存在账号, password=任意 | 返回 401 "账号不存在" | P1 |
| AUTH-015 | 空用户名密码 | username="", password="" | 返回 400 "请输入用户名和密码" | P2 |

### 2.2 微信登录 `POST /api/auth/wechat-login`

**请求体**:
```json
{
  "code": "string"  // 微信登录 code
}
```

**测试用例**:

| 用例ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|--------|----------|------|----------|--------|
| AUTH-020 | 教师微信登录 | 有效code | 返回 role=teacher, token | P0 |
| AUTH-021 | 家长微信登录 | 有效code(已绑定家长) | 返回 role=parent, token | P0 |
| AUTH-022 | 双角色微信登录 | 有效code(既是教师又是家长) | 返回 needsRoleChoice=true | P1 |
| AUTH-023 | 未绑定账号微信登录 | 有效code(未绑定) | 返回 needsBind=true, openid | P1 |
| AUTH-024 | 无效code登录 | 无效code | 返回 401 "登录失败" | P1 |
| AUTH-025 | 缺少code参数 | code="" | 返回 400 "缺少 code" | P2 |

### 2.3 微信绑定 `POST /api/auth/bind-wechat`

**测试用例**:

| 用例ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|--------|----------|------|----------|--------|
| AUTH-030 | 绑定教师账号 | code + username + password | 返回绑定成功, teacher token | P0 |
| AUTH-031 | 绑定家长账号 | code + studentNo + password | 返回绑定成功, parent token | P0 |
| AUTH-032 | 已绑定其他账号的微信 | code(已绑定其他教师) | 返回 400 "该微信已绑定其他账号" | P1 |
| AUTH-033 | 参数缺失 | 缺少必要参数 | 返回 400 "参数不全" | P2 |

### 2.4 当前用户信息 `GET /api/auth/me`

**请求头**: `Authorization: Bearer <token>`

**测试用例**:

| 用例ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|--------|----------|------|----------|--------|
| AUTH-040 | 教师获取信息 | teacher token | 返回 role, schoolId, effectiveFeatures, user | P0 |
| AUTH-041 | 家长获取信息 | parent token | 返回 role=parent, studentId 等信息 | P0 |
| AUTH-042 | 校管获取信息 | school_admin token | 返回 role=school_admin 信息 | P0 |
| AUTH-043 | 超管获取信息 | super token | 返回 role=super 信息 | P0 |
| AUTH-044 | 无Token访问 | 无Authorization头 | 返回 401 "未登录或缺少令牌" | P0 |
| AUTH-045 | 过期Token访问 | 过期token | 返回 401 "登录已过期" | P1 |

### 2.5 教师密码登录 `POST /api/auth/password-login`

**测试用例**:

| 用例ID | 测试场景 | 输入 | 预期结果 | 优先级 |
|--------|----------|------|----------|--------|
| AUTH-050 | 教师密码登录成功 | username + password | 返回 token, user, effectiveFeatures | P0 |
| AUTH-051 | 密码错误 | username + wrong_password | 返回 401 "密码错误" | P0 |
| AUTH-052 | 不存在账号 | 不存在username | 返回 401 "账号不存在或未设密码" | P1 |

---

## 3. 超级管理员模块 API 测试

### 3.1 学校管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| ADMIN-001 | /api/admin/schools | GET | 查询学校列表 | 返回学校数组 | super |
| ADMIN-002 | /api/admin/schools/:id | GET | 查询单个学校 | 返回学校详情 | super |
| ADMIN-003 | /api/admin/schools | POST | 创建学校 | 返回创建的学校 | super |
| ADMIN-004 | /api/admin/schools/:id | PATCH | 更新学校信息 | 返回更新后的学校 | super |
| ADMIN-005 | /api/admin/schools/:id | DELETE | 删除学校 | 返回成功 | super |
| ADMIN-006 | /api/admin/schools/:id/features | GET | 获取学校功能包 | 返回 featureFlags | super |
| ADMIN-007 | /api/admin/schools/:id/features | PATCH | 更新学校功能包 | 返回更新后的配置 | super |
| ADMIN-008 | /api/admin/schools/batch-toggle | POST | 批量启用/禁用学校 | 返回操作结果 | super |

### 3.2 学校管理员管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| ADMIN-010 | /api/admin/school-admins | GET | 查询校管列表 | 返回校管数组 | super |
| ADMIN-011 | /api/admin/school-admins | POST | 创建校管 | 返回创建的校管 | super |
| ADMIN-012 | /api/admin/school-admins/:id | PATCH | 更新校管信息 | 返回更新后的校管 | super |
| ADMIN-013 | /api/admin/school-admins/:id/enabled | PATCH | 启用/禁用校管 | 返回操作结果 | super |
| ADMIN-014 | /api/admin/school-admins/:id/password | PATCH | 重置校管密码 | 返回成功 | super |
| ADMIN-015 | /api/admin/school-admins/:id | DELETE | 删除校管 | 返回成功 | super |

### 3.3 审计日志

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| ADMIN-020 | /api/admin/audit-logs | GET | 查询审计日志 | 返回日志数组 | super |
| ADMIN-021 | /api/admin/audit-logs?schoolId=xxx | GET | 按学校筛选日志 | 返回该校日志 | super |

### 3.4 超管权限验证

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| PERM-SUPER-001 | 教师访问超管接口 | 教师token访问 /api/admin/schools | 返回 401 "权限不足" |
| PERM-SUPER-002 | 校管访问超管接口 | 校管token访问 /api/admin/schools | 返回 401 "权限不足" |
| PERM-SUPER-003 | 家长访问超管接口 | 家长token访问 /api/admin/schools | 返回 401 "权限不足" |

---

## 4. 学校管理员模块 API 测试

### 4.1 教师管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| SA-001 | /api/school-admin/teachers | GET | 查询教师列表 | 返回本校教师数组 | school_admin |
| SA-002 | /api/school-admin/teachers | POST | 创建教师 | 返回创建的教师 | school_admin |
| SA-003 | /api/school-admin/teachers/batch | POST | 批量创建教师 | 返回创建结果 | school_admin |
| SA-004 | /api/school-admin/teachers/:id | PATCH | 更新教师信息 | 返回更新后的教师 | school_admin |
| SA-005 | /api/school-admin/teachers/:id/features | PATCH | 更新教师功能权限 | 返回更新结果 | school_admin |
| SA-006 | /api/school-admin/teachers/:id/reset-password | POST | 重置教师密码 | 返回新密码 | school_admin |
| SA-007 | /api/school-admin/teachers/:id | DELETE | 删除教师 | 返回成功 | school_admin |
| SA-008 | /api/school-admin/teachers/deactivate-all | POST | 批量禁用所有教师 | 返回操作结果 | school_admin |
| SA-009 | /api/school-admin/teachers/import | POST | 从文件导入教师 | 返回导入结果 | school_admin |
| SA-010 | /api/school-admin/teachers/import-ai | POST | AI识别导入教师 | 返回AI识别结果 | school_admin |

### 4.2 班级管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| SA-020 | /api/school-admin/classes | GET | 查询班级列表 | 返回本校班级数组 | school_admin |
| SA-021 | /api/school-admin/classes | POST | 创建班级 | 返回创建的班级 | school_admin |
| SA-022 | /api/school-admin/classes/:id | PATCH | 更新班级信息 | 返回更新后的班级 | school_admin |
| SA-023 | /api/school-admin/classes/:id | DELETE | 删除班级 | 返回成功 | school_admin |
| SA-024 | /api/school-admin/classes/:id/promote | POST | 班级升级 | 返回升级后的班级 | school_admin |
| SA-025 | /api/school-admin/classes/batch | POST | 批量创建班级 | 返回创建结果 | school_admin |

### 4.3 学生管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| SA-030 | /api/school-admin/students | GET | 查询学生列表 | 返回本校学生数组 | school_admin |
| SA-031 | /api/school-admin/students/:id | PATCH | 更新学生信息 | 返回更新后的学生 | school_admin |
| SA-032 | /api/school-admin/students/:id | DELETE | 删除学生 | 返回成功 | school_admin |
| SA-033 | /api/school-admin/students/batch | POST | 批量创建学生 | 返回创建结果 | school_admin |
| SA-034 | /api/school-admin/students/import | POST | 从文件导入学生 | 返回导入结果 | school_admin |

### 4.4 学校功能包

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| SA-040 | /api/school-admin/school-features | GET | 获取学校功能开关 | 返回 featureFlags | school_admin |
| SA-041 | /api/school-admin/school-features | PATCH | 更新学校功能开关 | 返回更新后的配置 | school_admin |

### 4.5 公告管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| SA-050 | /api/school-admin/notices | GET | 查询学校公告 | 返回公告数组 | school_admin |
| SA-051 | /api/school-admin/notices | POST | 创建公告 | 返回创建的公告 | school_admin |
| SA-052 | /api/school-admin/notices/:id | PATCH | 更新公告 | 返回更新后的公告 | school_admin |
| SA-053 | /api/school-admin/notices/:id | DELETE | 删除公告 | 返回成功 | school_admin |

### 4.6 数据导出

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| SA-060 | /api/school-admin/export/teachers | GET | 导出教师CSV | 返回CSV文件流 | school_admin |
| SA-061 | /api/school-admin/export/students | GET | 导出学生CSV | 返回CSV文件流 | school_admin |
| SA-062 | /api/school-admin/export/teachers-xls | GET | 导出教师Excel | 返回XLSX文件流 | school_admin |
| SA-063 | /api/school-admin/export/students-xls | GET | 导出学生Excel | 返回XLSX文件流 | school_admin |
| SA-064 | /api/school-admin/export/classes-xls | GET | 导出班级Excel | 返回XLSX文件流 | school_admin |

### 4.7 校管权限验证

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| PERM-SA-001 | 教师访问校管接口 | 教师token访问 /api/school-admin/teachers | 返回 401 "权限不足" |
| PERM-SA-002 | 家长访问校管接口 | 家长token访问 /api/school-admin/teachers | 返回 401 "权限不足" |
| PERM-SA-003 | 跨校数据访问 | A校管token尝试操作B校数据 | 返回空或401 |

---

## 5. 教师模块 API 测试

### 5.1 班级管理（教师端）

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| TCH-001 | /api/classes | GET | 查询我的班级列表 | 返回教师所在班级 | teacher |
| TCH-002 | /api/classes | POST | 教师尝试创建班级 | 返回 403 "班级需由学校管理员创建" | teacher |
| TCH-003 | /api/classes/:id | GET | 查询班级详情 | 返回班级详情 | teacher(成员) |
| TCH-004 | /api/classes/:id | PATCH | 更新班级信息(班主任) | 返回更新后的班级 | teacher(head) |
| TCH-005 | /api/classes/:id | PATCH | 更新班级信息(科任) | 返回 403 "仅班主任可执行此操作" | teacher(subject) |
| TCH-006 | /api/classes/:id | DELETE | 删除班级(班主任) | 返回成功 | teacher(head) |
| TCH-007 | /api/classes/:id | DELETE | 删除班级(科任) | 返回 403 "仅班主任可执行此操作" | teacher(subject) |
| TCH-008 | /api/classes/:id/dashboard | GET | 班级看板 | 返回学生数、成员、成绩 | teacher(成员) |
| TCH-009 | /api/classes/:id/members/list | POST | 查询班级成员 | 返回成员列表 | teacher(成员) |
| TCH-010 | /api/classes/:id/members | POST | 添加科任老师(班主任) | 返回成功 | teacher(head) |
| TCH-011 | /api/classes/:id/members | POST | 添加科任老师(科任) | 返回 403 "仅班主任可执行此操作" | teacher(subject) |
| TCH-012 | /api/classes/:id/members/:teacherId | DELETE | 移除科任老师(班主任) | 返回成功 | teacher(head) |
| TCH-013 | /api/classes/:id/members/:teacherId | DELETE | 移除科任老师(科任) | 返回 403 "仅班主任可执行此操作" | teacher(subject) |
| TCH-014 | /api/classes/:id/my-subjects | PATCH | 更新我的任教学科 | 返回更新结果 | teacher(成员) |
| TCH-015 | /api/classes/school-teachers | POST | 查询同校教师 | 返回同校教师列表 | teacher |

### 5.2 学生管理（教师端）

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| TCH-020 | /api/students | GET | 查询学生列表 | 返回教师所管班级的学生 | teacher |
| TCH-021 | /api/students | POST | 创建学生 | 返回创建的学生 | teacher |
| TCH-022 | /api/students/:id | PATCH | 更新学生信息 | 返回更新后的学生 | teacher |
| TCH-023 | /api/students/:id | DELETE | 删除学生 | 返回成功 | teacher |
| TCH-024 | /api/students/:id/toggle-parent-login | POST | 开启/关闭家长登录 | 返回操作结果 | teacher |
| TCH-025 | /api/students/:id/reset-parent-password | POST | 重置家长密码 | 返回新密码 | teacher |

### 5.3 成绩管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| TCH-030 | /api/grades | GET | 查询成绩列表 | 返回教师班级的成绩 | teacher |
| TCH-031 | /api/grades | POST | 创建成绩记录 | 返回创建的成绩 | teacher |
| TCH-032 | /api/grades/:id | PATCH | 更新成绩 | 返回更新后的成绩 | teacher |
| TCH-033 | /api/grades/:id | DELETE | 删除成绩 | 返回成功 | teacher |

### 5.4 考试管理

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| TCH-040 | /api/exams | GET | 查询考试列表 | 返回教师班级的考试 | teacher |
| TCH-041 | /api/exams | POST | 创建考试 | 返回创建的考试 | teacher |
| TCH-042 | /api/exams/:id | PATCH | 更新考试 | 返回更新后的考试 | teacher |
| TCH-043 | /api/exams/:id | DELETE | 删除考试 | 返回成功 | teacher |

### 5.5 个人信息

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| TCH-050 | /api/users/me | GET | 获取当前教师信息 | 返回教师详细信息 | teacher |
| TCH-051 | /api/users/me | PUT | 更新教师信息 | 返回更新后的信息 | teacher |

### 5.6 教师权限验证

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| PERM-TCH-001 | 班主任编辑班级 | 班主任token更新班级 | 成功 |
| PERM-TCH-002 | 科任编辑班级 | 科任token更新班级 | 返回 403 |
| PERM-TCH-003 | 班主任添加科任 | 班主任token添加成员 | 成功 |
| PERM-TCH-004 | 科任添加科任 | 科任token添加成员 | 返回 403 |
| PERM-TCH-005 | 科任仅能管理自己学科 | 科任token查看看板 | 仅显示自己学科数据 |
| PERM-TCH-006 | 访问不存在的班级 | 教师token访问其他校班级 | 返回 403 "无权访问" |

---

## 6. 家长模块 API 测试

### 6.1 家长认证

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| PAR-001 | /api/parent-auth/login | POST | 家长登录 | 返回 token, parent信息 | parent |
| PAR-002 | /api/parent-auth/me | GET | 获取家长信息 | 返回家长和孩子信息 | parent |
| PAR-003 | /api/parent-auth/change-password | POST | 修改密码 | 返回成功 | parent |
| PAR-004 | /api/parent-auth/bind-wechat | POST | 绑定微信 | 返回绑定结果 | parent |

### 6.2 家长查看孩子信息

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| PAR-010 | /api/parent-auth/exams | GET | 查询考试成绩 | 返回孩子成绩列表 | parent |
| PAR-011 | /api/parent-auth/homework | GET | 查询作业 | 返回孩子作业 | parent |
| PAR-012 | /api/parent-auth/attendance | GET | 查询考勤 | 返回孩子考勤 | parent |
| PAR-013 | /api/parent-auth/behavior | GET | 查询行为表现 | 返回孩子行为记录 | parent |
| PAR-014 | /api/parent-auth/schedule | GET | 查询课表值日 | 返回班级课表 | parent |
| PAR-015 | /api/parent-auth/notices | GET | 查询班级通知 | 返回班级公告 | parent |
| PAR-016 | /api/parent-auth/communications | GET | 查询家校沟通 | 返回沟通记录 | parent |

### 6.3 多娃支持

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| PAR-020 | /api/parent-auth/switch-student | POST | 切换到另一个孩子 | 返回新孩子的视角 | parent |
| PAR-021 | /api/parent-auth/compare-kids | GET | 多娃对比 | 返回对比数据 | parent(多娃) |

### 6.4 家长权限验证

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| PERM-PAR-001 | 家长查看他人孩子 | 家长token查询其他学生成绩 | 返回 403 或空数据 |
| PERM-PAR-002 | 教师访问家长接口 | 教师token访问 /parent-auth/me | 返回 401 "权限不足" |
| PERM-PAR-003 | 家长越权修改数据 | 家长token尝试修改成绩 | 返回 401/403 |

---

## 7. 通知与消息模块 API 测试

### 7.1 通知

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| NTFC-001 | /api/notifications | GET | 查询通知列表 | 返回通知数组 | teacher |
| NTFC-002 | /api/notifications/unread-count | GET | 查询未读数 | 返回 count | teacher |
| NTFC-003 | /api/notifications/:id/read | PATCH | 标记已读 | 返回成功 | teacher |
| NTFC-004 | /api/notifications/mark-all-read | POST | 全部已读 | 返回成功 | teacher |

### 7.2 消息中心

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| MSG-001 | /api/messages | GET | 查询消息列表 | 返回消息数组 | teacher/parent |
| MSG-002 | /api/messages | POST | 发送消息 | 返回创建的消息 | teacher/parent |
| MSG-003 | /api/messages/:id/read | PATCH | 标记已读 | 返回成功 | teacher/parent |

---

## 8. AI 模块 API 测试

### 8.1 AI 对话

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| AI-001 | /api/ai/chat | POST | AI流式对话 | 返回SSE流 | teacher |
| AI-002 | /api/ai/chat-sync | POST | AI同步对话 | 返回content | teacher |
| AI-003 | /api/ai/parse | POST | 结构化解析 | 返回解析结果 | teacher |

### 8.2 AI 生成

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| AI-010 | /api/ai/gen-image | POST | AI文生图 | 返回图片URL | teacher |
| AI-011 | /api/ai/gen-video | POST | AI文生视频 | 返回视频URL | teacher |

### 8.3 AI 工具

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| AI-020 | /api/ai/asr | POST | 语音识别 | 返回识别文本 | teacher |
| AI-021 | /api/ai/ocr | POST | 图片OCR | 返回识别文本 | teacher |
| AI-022 | /api/ai/parse-file | POST | 文件解析 | 返回解析文本 | teacher |
| AI-023 | /api/ai/analyze-exam | POST | 考试AI分析 | 返回分析报告 | teacher |
| AI-024 | /api/ai/diagnose | POST | 学生学情诊断 | 返回诊断报告 | teacher |

### 8.4 AI 限流测试

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| AI-RATE-001 | 正常使用 | 每分钟调用10次以内 | 成功 |
| AI-RATE-002 | 超出限流 | 每分钟调用超过10次 | 返回 429 Too Many Requests |
| AI-RATE-003 | 全局限流 | 每分钟全局60次 | 返回 429 |

---

## 9. 教学日历 API 测试

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| CAL-001 | /api/teaching-calendar | GET | 查询日历列表 | 返回日历数组 | teacher |
| CAL-002 | /api/teaching-calendar?year=2026&month=7 | GET | 按月查询 | 返回该月事件 | teacher |
| CAL-003 | /api/teaching-calendar/:id | GET | 查询单个事件 | 返回事件详情 | teacher |
| CAL-004 | /api/teaching-calendar | POST | 创建事件 | 返回创建的事件 | teacher |
| CAL-005 | /api/teaching-calendar/:id | PATCH | 更新事件 | 返回更新后的事件 | teacher |
| CAL-006 | /api/teaching-calendar/:id | DELETE | 删除事件 | 返回成功 | teacher |

---

## 10. 配置模块 API 测试

### 10.1 公开配置

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| CFG-001 | /api/config/public | GET | 获取公开配置 | 返回公开配置项 | 无 |

### 10.2 超管配置

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| CFG-010 | /api/config/app | GET | 获取平台配置 | 返回配置列表(密钥脱敏) | super |
| CFG-011 | /api/config/app | PUT | 批量保存配置 | 返回成功 | super |
| CFG-012 | /api/config/app/:key | PUT | 保存单个配置 | 返回成功 | super |

### 10.3 教师 AI 配置

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| CFG-020 | /api/config/ai | GET | 获取AI设置 | 返回AI配置 | teacher |
| CFG-021 | /api/config/ai | PUT | 保存AI设置 | 返回成功 | teacher |
| CFG-022 | /api/config/ai-settings | PATCH | 保存个人AI设置 | 返回成功 | teacher |
| CFG-023 | /api/config/ai/models | POST | 查询可用模型 | 返回模型列表 | teacher/super |

---

## 11. 健康检查 API 测试

| 用例ID | 接口 | 方法 | 测试场景 | 预期结果 | 权限 |
|--------|------|------|----------|----------|------|
| HLT-001 | /api/health | GET | 健康检查 | 返回 {status: "ok", time: "..."} | 无 |
| HLT-002 | /api/health | GET | 数据库异常时 | 返回错误信息或503 | 无 |

---

## 12. 通用 CRUD 接口测试

### 12.1 通用接口列表

以下模块遵循统一的 CRUD 模式（由 `base.controller.ts` 实现）：

| 模块 | 前缀 | 功能包 |
|------|------|--------|
| 班级成员 | /api/class-members | classes |
| 座位表 | /api/seats | seats |
| 轮值表 | /api/duty-roster | duty |
| 班费 | /api/class-expenses | finance |
| 班级活动 | /api/class-activities | activities |
| 班级风采 | /api/class-galleries | gallery |
| 我的相册 | /api/my-galleries | gallery |
| 家长联系 | /api/parent-contacts | parents |
| 奖励记录 | /api/rewards | rewards |
| 加减分 | /api/score-records | rewards |
| 小组评分 | /api/group-scores | rewards |
| 奖项 | /api/award-categories, /api/awards | rewards |
| 成长记录 | /api/growth-records | growth |
| 行为记录 | /api/behaviors | behavior |
| 课外阅读 | /api/reading-logs | reading |
| 学生打卡 | /api/checkins | checkin |
| 工作日志 | /api/work-logs | worklog |
| 听课记录 | /api/lesson-observations | observation |
| 错题本 | /api/math-mistakes | tools |
| 抽签历史 | /api/picker-history | tools |

### 12.2 通用 CRUD 测试用例

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| CRUD-001 | 列表查询 | GET /api/{module}?classId=xxx | 返回当前教师相关数据 |
| CRUD-002 | 列表分页 | GET /api/{module}?classId=xxx&skip=0&take=10 | 返回分页数据 |
| CRUD-003 | 创建记录 | POST /api/{module} | 返回创建的记录(含teacherId) |
| CRUD-004 | 查询详情 | GET /api/{module}/:id | 返回记录详情 |
| CRUD-005 | 更新记录 | PATCH /api/{module}/:id | 返回更新后的记录 |
| CRUD-006 | 删除记录 | DELETE /api/{module}/:id | 返回成功 |
| CRUD-007 | 跨班级访问 | 教师A访问教师B的班级数据 | 返回空或403 |

---

## 13. 功能包权限测试

### 13.1 功能包定义

系统共有约 40 个功能包，通过 `FEATURE_FLAGS` 定义：

```
classes, students, exams, grades, analysis, attendance, homework,
tools, seats, games, rewards, growth, behavior, reading, checkin,
finance, activities, duty, gallery, parents, im, notices, ai, schedule,
worklog, observation, calendar, teachers, todos, notes, demo,
office_tools, subject_tools, quicktool, grade_trend, picker_history
```

### 13.2 功能包测试用例

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| FEAT-001 | 功能包开启 | 功能包已开启时访问对应接口 | 正常访问 |
| FEAT-002 | 功能包关闭 | 功能包关闭时访问对应接口 | 返回 403 "功能未启用" |
| FEAT-003 | 教师级限制 | 教师个人功能列表限制 | 仅允许列表内的功能 |
| FEAT-004 | 学校级限制 | 学校功能包开关限制 | 学校关闭的功能教师无法使用 |
| FEAT-005 | 超管不受限 | 超管访问任意功能 | 不受功能包限制 |
| FEAT-006 | 校管不受限 | 校管访问任意功能 | 不受功能包限制 |

### 13.3 层级权限链测试

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| FEAT-LVL-001 | 全开配置 | 学校不限制,教师全选 | 所有功能可用 |
| FEAT-LVL-002 | 学校关闭部分 | 学校关闭ai功能 | ai功能包不可用 |
| FEAT-LVL-003 | 教师功能限制 | 学校全开,教师限制 | 仅教师允许的功能可用 |
| FEAT-LVL-004 | 双重限制 | 学校+教师都限制 | 取交集 |

---

## 14. 安全测试

### 14.1 认证安全

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| SEC-001 | SQL注入 | 在登录框输入SQL注入语句 | 登录失败,无异常 |
| SEC-002 | XSS攻击 | 在输入框输入XSS脚本 | 脚本被转义 |
| SEC-003 | 暴力破解 | 连续错误登录10次以上 | 返回 429 限流 |
| SEC-004 | Token伪造 | 伪造JWT token | 返回 401 |
| SEC-005 | 越权访问 | 修改token中的role字段 | 返回 401/403 |

### 14.2 数据隔离

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| SEC-010 | 教师访问其他班级 | 教师A访问教师B的班级数据 | 返回空或403 |
| SEC-011 | 家长访问其他学生 | 家长A查询学生B的信息 | 返回 403 |
| SEC-012 | 校管访问其他学校 | 校管A操作学校B的数据 | 返回空或403 |
| SEC-013 | 跨租户数据泄露 | 通过ID猜测其他租户数据 | 返回 404 或空 |

### 14.3 敏感信息保护

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| SEC-020 | 密码哈希不泄露 | 查看用户详情 | passwordHash不返回给前端 |
| SEC-021 | 密钥脱敏 | 获取平台配置 | AI密钥等脱敏显示 |
| SEC-022 | 审计日志记录 | 执行敏感操作 | 审计日志正确记录 |

---

## 15. 性能测试点

### 15.1 接口响应时间

| 接口类型 | 预期响应时间 | 测试工具 |
|----------|--------------|----------|
| 简单查询(<100条) | <500ms | JMeter / k6 |
| 复杂查询(分页) | <1s | JMeter / k6 |
| 写操作 | <500ms | JMeter / k6 |
| AI对话 | <3s(首token) | JMeter / 手动 |
| AI文件解析 | <5s | JMeter / 手动 |

### 15.2 并发测试

| 测试场景 | 并发用户数 | 持续时间 | 通过标准 |
|----------|------------|----------|----------|
| 登录接口 | 100 | 1min | 错误率<1% |
| 列表查询 | 200 | 5min | 错误率<1%,响应<2s |
| AI对话 | 10 | 1min | 错误率<5% |
| 数据写入 | 50 | 5min | 错误率<1% |

### 15.3 数据库性能

| 测试场景 | 数据量 | 通过标准 |
|----------|--------|----------|
| 学生列表查询 | 10000条 | <1s |
| 成绩记录查询 | 50000条 | <2s |
| 班级成员统计 | 1000个班级 | <500ms |
| 成绩写入批量 | 100条/次 | <2s |

---

## 16. 测试数据准备

### 16.1 角色账号

```
# 超级管理员
username: admin
password: admin

# 学校管理员
username: school_admin_001
password: (创建时设置)

# 班主任
username: teacher_head_001
password: (创建时设置)

# 科任老师
username: teacher_subject_001
password: (创建时设置)

# 家长
studentNo: (学生学号)
password: (教师开通家长登录时生成)
```

### 16.2 测试数据范围

- **学校**: 至少 1 所测试学校
- **校管**: 至少 2 名(1启用,1禁用)
- **班级**: 至少 3 个班级(不同学期)
- **教师**: 至少 10 名(含班主任和科任)
- **学生**: 至少 100 名
- **成绩**: 至少 500 条记录
- **考试**: 至少 10 场考试
- **通知**: 至少 20 条
- **消息**: 至少 50 条

### 16.3 数据初始化 SQL

```sql
-- 创建测试学校
INSERT INTO schools (id, name, code, featureFlags) 
VALUES ('test-school-001', '测试学校', 'TS001', NULL);

-- 创建校管
INSERT INTO school_admins (id, username, passwordHash, name, schoolId, enabled) 
VALUES ('sa-001', 'school_admin_001', '<bcrypt_hash>', '张校管', 'test-school-001', true);

-- 创建教师
INSERT INTO users (id, name, username, passwordHash, schoolId, subject, features, enabled) 
VALUES ('t-001', '李老师', 'teacher_head_001', '<bcrypt_hash>', 'test-school-001', '语文', NULL, true);

-- 创建班级成员关系(班主任)
INSERT INTO class_members (id, classId, teacherId, role, subjects, term) 
VALUES ('cm-001', 'class-001', 't-001', 'head', ['语文'], '2026春季');
```

---

## 附录 A：API 端点速查表

### 按角色分组

**超级管理员专属**:
- `POST /api/admin/login` - 超管登录
- `GET /api/admin/schools` - 学校列表
- `POST /api/admin/schools` - 创建学校
- `GET /api/admin/school-admins` - 校管列表
- `POST /api/admin/school-admins` - 创建校管
- `GET /api/admin/audit-logs` - 审计日志
- `GET /api/config/app` - 平台配置
- `PUT /api/config/app` - 保存平台配置

**学校管理员专属**:
- `POST /api/school-admin/login` - 校管登录
- `GET /api/school-admin/teachers` - 教师列表
- `POST /api/school-admin/teachers` - 创建教师
- `GET /api/school-admin/classes` - 班级列表
- `POST /api/school-admin/classes` - 创建班级
- `GET /api/school-admin/students` - 学生列表
- `GET /api/school-admin/notices` - 学校公告

**教师可用**:
- `POST /api/auth/password-login` - 教师登录
- `GET /api/auth/me` - 当前用户信息
- `GET /api/classes` - 我的班级
- `GET /api/students` - 学生列表
- `GET /api/grades` - 成绩列表
- `GET /api/exams` - 考试列表
- `POST /api/ai/chat` - AI对话
- `GET /api/notifications` - 通知列表

**家长可用**:
- `POST /api/parent-auth/login` - 家长登录
- `GET /api/parent-auth/me` - 家长信息
- `GET /api/parent-auth/exams` - 孩子成绩
- `GET /api/parent-auth/homework` - 孩子作业
- `GET /api/parent-auth/attendance` - 孩子考勤

### 通用接口

- `GET /api/health` - 健康检查(公开)
- `GET /api/config/public` - 公开配置(公开)

---

## 附录 B：错误码说明

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| - | 400 | 请求参数错误 |
| - | 401 | 未授权(未登录/Token无效/密码错误) |
| - | 403 | 禁止访问(权限不足/功能包未启用) |
| - | 404 | 资源不存在 |
| - | 429 | 请求过多(触发限流) |
| - | 500 | 服务器内部错误 |

## 附录 C：测试执行计划

### 阶段一：基础功能测试
- 认证流程测试
- CRUD接口测试
- 角色权限测试

### 阶段二：业务场景测试
- 班主任完整工作流
- 科任老师完整工作流
- 家长查看流程
- 双角色切换流程

### 阶段三：异常场景测试
- 边界条件测试
- 并发测试
- 安全测试

### 阶段四：性能测试
- 压力测试
- 稳定性测试
- 数据库性能测试
