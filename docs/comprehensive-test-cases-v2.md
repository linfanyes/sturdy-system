# 教学管理系统 - 全面测试用例 V2

> **版本**: 2.0  
> **日期**: 2026-07-31  
> **覆盖范围**: 后端 API、Web 前端、微信小程序三端；super / school_admin / teacher / parent 四种角色  
> **用例总数**: 约 320 条

---

## 目录

- [一、认证模块 (Auth)](#一认证模块-auth)
- [二、超管模块 (Super)](#二超管模块-super)
- [三、校管模块 (School Admin)](#三校管模块-school-admin)
- [四、教师模块 (Teacher) - 班级与学生](#四教师模块-teacher---班级与学生)
- [五、教师模块 - 考试与成绩](#五教师模块-teacher---考试与成绩)
- [六、教师模块 - 成绩分析](#六教师模块-teacher---成绩分析)
- [七、教师模块 - 学生评价与考勤](#七教师模块-teacher---学生评价与考勤)
- [八、教师模块 - 家校沟通](#八教师模块-teacher---家校沟通)
- [九、教师模块 - AI 能力](#九教师模块-teacher---ai-能力)
- [十、教师模块 - 办公与教学](#十教师模块-teacher---办公与教学)
- [十一、教师模块 - 工具箱与游戏](#十一教师模块-teacher---工具箱与游戏)
- [十二、家长模块 (Parent)](#十二家长模块-parent)
- [十三、通知与消息](#十三通知与消息)
- [十四、数据导出与批量操作](#十四数据导出与批量操作)
- [十五、权限与安全](#十五权限与安全)
- [附录：用例统计汇总](#附录用例统计汇总)

---

## 一、认证模块 (Auth)

### 1.1 登录功能

| # | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 角色 | 端 |
|---|---------|---------|---------|---------|------|-----|
| AUTH-001 | 超管账号密码登录 | 存在有效超管账号 | 1. 访问登录页 2. 输入用户名密码 3. 点击登录 | 登录成功，跳转至 /super | super | Web |
| AUTH-002 | 校管账号密码登录 | 存在有效校管账号 | 1. 访问登录页 2. 输入用户名密码 3. 点击登录 | 登录成功，跳转至 /school-admin | school_admin | Web |
| AUTH-003 | 教师账号密码登录 | 存在有效教师账号 | 1. 访问登录页 2. 输入用户名密码 3. 点击登录 | 登录成功，跳转至 /teacher | teacher | Web |
| AUTH-004 | 家长学号密码登录 | 存在有效家长账号 | 1. 访问家长登录页 2. 输入学号密码 3. 点击登录 | 登录成功，跳转至 /parent | parent | Web/小程序 |
| AUTH-005 | 错误密码登录失败 | 账号存在 | 1. 输入正确用户名和错误密码 2. 点击登录 | 返回错误提示，不跳转 | 全部 | 全部 |
| AUTH-006 | 不存在的用户名登录 | 无 | 1. 输入不存在的用户名 2. 点击登录 | 返回"用户不存在" | 全部 | 全部 |
| AUTH-007 | 登录频率限制 | 正常账号 | 1. 60秒内连续登录11次 | 触发限流，返回 429 | 全部 | 后端 |
| AUTH-008 | JWT Token 过期自动登出 | Token 已过期 | 1. 等待 Token 过期或使用过期 Token 调用 API | 返回 401，前端跳转登录页 | 全部 | Web |
| AUTH-009 | 未登录访问受保护路由 | 未登录状态 | 1. 直接访问 /teacher | 重定向至 /login?redirect=/teacher | 未登录 | Web |

### 1.2 微信登录

| # | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 角色 | 端 |
|---|---------|---------|---------|---------|------|-----|
| AUTH-010 | 教师微信登录（已绑定） | 教师已绑定微信 | 1. 小程序点击微信登录 2. 获取 code 发送请求 | 登录成功，返回教师 Token | teacher | 小程序 |
| AUTH-011 | 教师微信登录（未绑定） | 教师未绑定微信 | 1. 点击微信登录 | 返回 needsBind=true + openid | teacher | 小程序 |
| AUTH-012 | 绑定教师账号 | 未绑定状态 | 1. 输入教师账号密码 2. 提交绑定 | 绑定成功并自动登录 | teacher | 小程序 |
| AUTH-013 | 家长微信登录 | 家长已绑定微信 | 1. 家长端微信登录 | 登录成功，返回家长 Token | parent | 小程序 |
| AUTH-014 | 家长绑定微信 | 家长未绑定 | 1. 家长登录后绑定微信 | 绑定成功 | parent | 小程序 |

### 1.3 用户信息

| # | 用例标题 | 前置条件 | 操作步骤 | 预期结果 | 角色 | 端 |
|---|---------|---------|---------|---------|------|-----|
| AUTH-015 | 获取当前用户信息 | 已登录 | `GET /api/auth/me` | 返回 role/schoolId/effectiveFeatures/user | 全部 | 后端 |
| AUTH-016 | 更新个人资料 | 已登录 | `PUT /api/users/me` 修改昵称/手机号 | 更新成功 | teacher | Web |
| AUTH-017 | 家长修改密码 | 已登录家长 | 1. 进入家长设置 2. 修改密码 | 修改成功 | parent | Web/小程序 |

---

## 二、超管模块 (Super)

### 2.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| SUP-API-001 | POST | /api/admin/login | 超管登录 | 存在超管账号 | POST {username, password} | 返回 Token |
| SUP-API-002 | GET | /api/admin/schools | 获取学校列表 | 超管已登录 | 访问 URL | 返回学校分页列表 |
| SUP-API-003 | POST | /api/admin/schools | 创建学校 | 超管已登录 | POST学校信息 | 学校创建成功 |
| SUP-API-004 | PATCH | /api/admin/schools/:id | 更新学校信息 | 学校存在 | PATCH 更新字段 | 更新成功 |
| SUP-API-005 | DELETE | /api/admin/schools/:id | 删除学校 | 学校存在且无关联数据 | DELETE | 软删除成功 |
| SUP-API-006 | GET | /api/admin/schools/:id/features | 获取学校功能包 | 超管已登录 | GET | 返回该校 featureFlags |
| SUP-API-007 | PATCH | /api/admin/schools/:id/features | 更新学校功能包 | 超管已登录 | PATCH {featureFlags} | 功能包更新成功 |
| SUP-API-008 | POST | /api/admin/schools/batch-toggle | 批量启停学校 | 超管已登录 | POST {ids, enabled} | 批量操作成功 |
| SUP-API-009 | GET | /api/admin/admins | 获取管理员列表 | 超管已登录 | GET | 返回管理员列表 |
| SUP-API-010 | POST | /api/admin/admins | 创建管理员 | 超管已登录 | POST管理员信息 | 创建成功 |
| SUP-API-011 | PATCH | /api/admin/admins/:id | 更新管理员 | 管理员存在 | PATCH | 更新成功 |
| SUP-API-012 | POST | /api/admin/admins/:id/reset-password | 重置管理员密码 | 管理员存在 | POST | 密码重置成功 |
| SUP-API-013 | GET | /api/ai-providers | 获取 AI 服务商列表 | 已登录（任意角色） | GET | 返回服务商列表 |
| SUP-API-014 | POST | /api/ai-providers | 创建 AI 服务商 | 超管已登录 | POST | 创建成功 |
| SUP-API-015 | PATCH | /api/ai-providers/:code | 更新 AI 服务商 | 服务商存在 | PATCH | 更新成功 |
| SUP-API-016 | DELETE | /api/ai-providers/:code | 删除 AI 服务商 | 服务商存在 | DELETE | 删除成功 |

### 2.2 Web 前端用例

| # | 路由 | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|------|---------|---------|---------|
| SUP-WEB-001 | /super | 超管工作台 | 工作台数据统计 | 1. 登录超管 2. 查看仪表盘 | 显示学校数/教师数/学生数等统计 |
| SUP-WEB-002 | /super/schools | 学校管理 | 学校列表展示 | 1. 点击学校管理菜单 | 显示学校列表表格 |
| SUP-WEB-003 | /super/schools | 学校管理 | 新增学校 | 1. 点击新增 2. 填写学校信息 3. 保存 | 学校创建成功 |
| SUP-WEB-004 | /super/schools | 学校管理 | 编辑学校 | 1. 点击学校行编辑按钮 2. 修改信息 3. 保存 | 学校信息更新 |
| SUP-WEB-005 | /super/schools | 学校管理 | 删除学校 | 1. 点击删除 2. 确认 | 学校被软删除 |
| SUP-WEB-006 | /super/schools | 学校管理 | 批量启停 | 1. 选择多所学校 2. 点击批量启停 | 批量状态变更成功 |
| SUP-WEB-007 | /super/admins | 管理员管理 | 管理员列表 | 1. 点击管理员管理 | 显示管理员列表 |
| SUP-WEB-008 | /super/admins | 管理员管理 | 新增管理员 | 1. 新增 2. 填写账号 3. 保存 | 管理员创建成功 |
| SUP-WEB-009 | /super/audit-logs | 审计日志 | 查看审计日志 | 1. 访问审计日志 | 显示操作记录列表 |
| SUP-WEB-010 | /super/audit-logs | 审计日志 | 筛选审计日志 | 1. 按角色/操作类型筛选 | 筛选结果正确 |
| SUP-WEB-011 | /super/config | 平台配置 | 查看/修改平台配置 | 1. 查看配置 2. 修改保存 | 配置保存成功 |
| SUP-WEB-012 | /super/ai-providers | AI 服务商 | 服务商列表 | 1. 查看 AI 服务商 | 显示服务商列表 |
| SUP-WEB-013 | /super/ai-providers | AI 服务商 | 新增服务商 | 1. 新增 2. 填写 API 配置 | 服务商创建成功 |
| SUP-WEB-014 | /super/school-features | 学校功能包 | 查看功能包 | 1. 查看功能包矩阵 | 显示各学校功能包状态 |
| SUP-WEB-015 | /super/school-features | 学校功能包 | 开启/关闭功能包 | 1. 点击开关 | 功能包状态变更 |

---

## 三、校管模块 (School Admin)

### 3.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| SA-API-001 | POST | /api/school-admin/login | 校管登录 | 校管账号存在 | POST {username, password} | 返回 Token + schoolId |
| SA-API-002 | GET | /api/school-admin/dashboard | 校管工作台数据 | 校管已登录 | GET | 返回学校统计数据 |
| SA-API-003 | GET | /api/school-admin/teachers | 获取教师列表 | 校管已登录 | GET?skip=0&take=200 | 返回本校教师分页列表 |
| SA-API-004 | POST | /api/school-admin/teachers | 创建教师 | 校管已登录 | POST教师信息 | 教师账号创建成功 |
| SA-API-005 | POST | /api/school-admin/teachers/batch | 批量创建教师 | 校管已登录 | POST {teachers: [...]} | 批量创建成功 |
| SA-API-006 | POST | /api/school-admin/teachers/import | 导入教师（CSV/Excel） | 校管已登录 | POST {filename, data(base64)} | 解析并导入教师 |
| SA-API-007 | PATCH | /api/school-admin/teachers/:id | 更新教师信息 | 教师存在 | PATCH | 更新成功 |
| SA-API-008 | DELETE | /api/school-admin/teachers/:id | 删除教师 | 教师存在且无班级 | DELETE | 软删除成功 |
| SA-API-009 | POST | /api/school-admin/teachers/:id/reset-password | 重置教师密码 | 教师存在 | POST | 密码重置 |
| SA-API-010 | GET | /api/school-admin/classes | 获取班级列表 | 校管已登录 | GET | 返回本校班级列表 |
| SA-API-011 | POST | /api/school-admin/classes | 创建班级 | 校管已登录 | POST班级信息（指定班主任） | 班级创建成功 |
| SA-API-012 | PATCH | /api/school-admin/classes/:id | 更新班级 | 班级存在 | PATCH | 更新成功 |
| SA-API-013 | DELETE | /api/school-admin/classes/:id | 删除班级 | 班级存在且无学生 | DELETE | 软删除成功 |
| SA-API-014 | POST | /api/school-admin/classes/:id/transfer | 转交班主任 | 班级存在 | POST {newTeacherId} | 班主任转交成功 |
| SA-API-015 | GET | /api/school-admin/students | 获取学生列表 | 校管已登录 | GET?skip=&take= | 本校学生列表 |
| SA-API-016 | POST | /api/school-admin/students | 创建学生 | 校管已登录 | POST学生信息 | 学生创建成功 |
| SA-API-017 | POST | /api/school-admin/students/batch | 批量创建学生 | 校管已登录 | POST {students: [...]} | 批量创建成功 |
| SA-API-018 | POST | /api/school-admin/students/import | 导入学生 | 校管已登录 | POST {filename, data} | 解析并导入学生 |
| SA-API-019 | PATCH | /api/school-admin/students/:id | 更新学生信息 | 学生存在 | PATCH | 更新成功 |
| SA-API-020 | DELETE | /api/school-admin/students/:id | 删除学生 | 学生存在 | DELETE | 软删除成功 |
| SA-API-021 | GET | /api/school-admin/notices | 获取学校公告 | 校管已登录 | GET | 返回公告列表 |
| SA-API-022 | POST | /api/school-admin/notices | 创建公告 | 校管已登录 | POST | 公告创建成功 |
| SA-API-023 | PATCH | /api/school-admin/notices/:id | 更新公告 | 公告存在 | PATCH | 更新成功 |
| SA-API-024 | DELETE | /api/school-admin/notices/:id | 删除公告 | 公告存在 | DELETE | 删除成功 |
| SA-API-025 | GET | /api/school-admin/school-features | 获取学校功能开关 | 校管已登录 | GET | 返回 featureFlags |
| SA-API-026 | PATCH | /api/school-admin/school-features | 更新学校功能开关 | 校管已登录 | PATCH {featureFlags} | 开关更新成功 |

### 3.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| SA-WEB-001 | /school-admin | 校管工作台数据 | 1. 登录校管 2. 查看仪表盘 | 显示教师/班级/学生统计 |
| SA-WEB-002 | /school-admin/teachers | 教师列表 | 1. 点击教师管理 | 显示教师列表 |
| SA-WEB-003 | /school-admin/teachers | 新增教师 | 1. 新增 2. 填写信息 3. 保存 | 教师创建成功 |
| SA-WEB-004 | /school-admin/teachers | 批量新增教师 | 1. 批量新增 2. 批量填写 3. 提交 | 批量创建成功 |
| SA-WEB-005 | /school-admin/teachers | 导入教师 | 1. 点击导入 2. 选择文件/粘贴数据 3. 解析确认 4. 导入 | 导入成功 |
| SA-WEB-006 | /school-admin/teachers | 编辑教师 | 1. 编辑教师信息 | 保存成功 |
| SA-WEB-007 | /school-admin/teachers | 删除教师 | 1. 删除确认 | 软删除 |
| SA-WEB-008 | /school-admin/teachers | 重置教师密码 | 1. 点击重置密码 | 密码重置成功 |
| SA-WEB-009 | /school-admin/classes | 班级列表 | 1. 点击班级管理 | 显示班级列表 |
| SA-WEB-010 | /school-admin/classes | 新增班级 | 1. 新增 2. 选择班主任 3. 保存 | 班级创建成功 |
| SA-WEB-011 | /school-admin/classes | 转交班主任 | 1. 点击转交 2. 选择新班主任 | 转交成功 |
| SA-WEB-012 | /school-admin/students | 学生列表 | 1. 点击学生管理 | 显示学生列表 |
| SA-WEB-013 | /school-admin/students | 批量导入学生 | 1. 导入 2. 上传文件 3. AI 识别 4. 确认导入 | 批量导入成功 |
| SA-WEB-014 | /school-admin/students | 编辑/删除学生 | 1. 编辑/删除 | 操作成功 |
| SA-WEB-015 | /school-admin/notices | 学校公告管理 | 1. 新增/编辑/删除公告 | 操作成功 |
| SA-WEB-016 | /school-admin/features | 功能包开关 | 1. 开启/关闭功能包 | 开关状态变更 |

---

## 四、教师模块 (Teacher) - 班级与学生

### 4.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| CLS-API-001 | GET | /api/classes | 获取班级列表 | 教师已登录 | GET?classId=xxx | 返回教师可访问的班级 |
| CLS-API-002 | GET | /api/classes/:id | 获取班级详情 | 班级存在且教师可访问 | GET | 返回班级详情 |
| CLS-API-003 | POST | /api/classes | 创建班级 | 教师已登录 | POST | 返回 403（需校管创建） |
| CLS-API-004 | PATCH | /api/classes/:id | 更新班级 | 教师为班主任 | PATCH | 班级信息更新 |
| CLS-API-005 | DELETE | /api/classes/:id | 删除班级 | 教师为班主任且班级无学生 | DELETE | 软删除成功 |
| CLS-API-006 | GET | /api/students | 获取学生列表 | 教师已登录 | GET?classId=xxx | 本班学生列表 |
| CLS-API-007 | GET | /api/students/:id | 获取学生详情 | 学生存在且教师可访问 | GET | 返回学生详情 |
| CLS-API-008 | POST | /api/students | 创建学生 | 教师已登录 | POST学生信息 | 学生创建成功 |
| CLS-API-009 | POST | /api/students/batch | 批量创建学生 | 教师已登录 | POST {students} | 批量创建成功 |
| CLS-API-010 | POST | /api/students/import | 导入学生（AI 识别） | 教师已登录 | POST {filename, data(base64)} | AI 解析并导入 |
| CLS-API-011 | PATCH | /api/students/:id | 更新学生信息 | 学生存在 | PATCH | 更新成功 |
| CLS-API-012 | DELETE | /api/students/:id | 删除学生 | 学生存在 | DELETE | 软删除成功 |
| CLS-API-013 | POST | /api/students/export | 导出学生 | 教师已登录 | POST {classId} | 返回 Excel 文件 |
| CLS-API-014 | GET | /api/class-members | 获取班级成员 | 教师已登录 | GET?classId=xxx | 返回成员列表 |
| CLS-API-015 | POST | /api/class-members | 添加班级成员 | 班主任权限 | POST {teacherId, role} | 添加成功 |
| CLS-API-016 | DELETE | /api/class-members/:id | 移除班级成员 | 班主任权限 | DELETE | 移除成功 |
| CLS-API-017 | POST | /api/classes/:id/transfer | 转交班主任 | 班主任权限 | POST {newTeacherId} | 转交成功 |

### 4.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| CLS-WEB-001 | /teacher/classes | 班级成员列表 | 1. 点击班级成员 | 显示本班成员列表 |
| CLS-WEB-002 | /teacher/classes | 添加科任老师 | 1. 添加科任 2. 选择教师 | 添加成功 |
| CLS-WEB-003 | /teacher/classes | 移除科任老师 | 1. 移除成员 | 移除成功 |
| CLS-WEB-004 | /teacher/classes | 转交班主任 | 1. 转交 2. 选择新班主任 | 转交成功 |
| CLS-WEB-005 | /teacher/students | 学生列表 | 1. 点击学生管理 | 显示学生列表 |
| CLS-WEB-006 | /teacher/students | 新增学生 | 1. 新增 2. 填写信息 | 学生创建成功 |
| CLS-WEB-007 | /teacher/students | 批量新增学生 | 1. 批量新增 2. 填写 3. 保存 | 批量创建成功 |
| CLS-WEB-008 | /teacher/students | AI 识别导入学生 | 1. 导入 2. 上传图片 3. AI 识别 4. 确认导入 | AI 解析并导入 |
| CLS-WEB-009 | /teacher/students | 编辑学生 | 1. 编辑 2. 保存 | 更新成功 |
| CLS-WEB-010 | /teacher/students | 删除学生 | 1. 删除确认 | 软删除 |
| CLS-WEB-011 | /teacher/students | 导出学生名单 | 1. 点击导出 | 下载 Excel 文件 |
| CLS-WEB-012 | /teacher/duty-roster | 轮值表列表 | 1. 点击轮值表 | 显示轮值日安排 |
| CLS-WEB-013 | /teacher/duty-roster | 设置轮值 | 1. 新增 2. 选择日期/值日生 3. 保存 | 设置成功 |
| CLS-WEB-014 | /teacher/duty-config | 值日配置 | 1. 配置值日规则 | 配置保存 |
| CLS-WEB-015 | /teacher/class-finance | 班费记录 | 1. 查看/新增班费收支 | 操作成功 |
| CLS-WEB-016 | /teacher/class-activities | 班级活动 | 1. 查看/新增活动 | 操作成功 |
| CLS-WEB-017 | /teacher/gallery | 班级风采 | 1. 上传/查看照片 | 操作成功 |
| CLS-WEB-018 | /teacher/my-gallery | 我的相册 | 1. 上传/查看个人照片 | 操作成功 |

### 4.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| CLS-MP-001 | pages/dashboard | 工作台数据展示 | 1. 登录后查看工作台 | 显示班级/学生/待办统计 |
| CLS-MP-002 | pages/dashboard | 下拉刷新 | 1. 下拉工作台 | 刷新数据 |
| CLS-MP-003 | pages/classes | 班级列表 | 1. 点击班级 tab | 显示班级成员 |
| CLS-MP-004 | pages/students | 学生列表 | 1. 点击学生 tab | 显示学生列表 |
| CLS-MP-005 | pages/students | 学生详情 | 1. 点击学生卡片 | 显示学生详情 |
| CLS-MP-006 | pages/seatMap | 座位表 | 1. 查看座位表 | 显示座位布局 |
| CLS-MP-007 | pages/duty-roster | 轮值表 | 1. 查看轮值日 | 显示轮值日安排 |
| CLS-MP-008 | pages/class-activity | 班级活动 | 1. 查看/新增活动 | 操作成功 |
| CLS-MP-009 | pages/class-finance | 班费管理 | 1. 查看/新增收支 | 操作成功 |
| CLS-MP-010 | pages/gallery | 班级风采 | 1. 查看/上传照片 | 操作成功 |

---

## 五、教师模块 - 考试与成绩

### 5.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| EXAM-API-001 | GET | /api/exams | 获取考试列表 | 教师已登录 | GET?classId=xxx | 返回考试列表 |
| EXAM-API-002 | POST | /api/exams | 创建考试 | 教师为班主任 | POST考试信息 | 考试创建成功 |
| EXAM-API-003 | PATCH | /api/exams/:id | 更新考试 | 考试存在 | PATCH | 更新成功 |
| EXAM-API-004 | DELETE | /api/exams/:id | 删除考试 | 考试存在 | DELETE | 软删除 |
| EXAM-API-005 | GET | /api/grades | 获取成绩列表 | 教师已登录 | GET?classId=&term= | 返回成绩列表 |
| EXAM-API-006 | POST | /api/grades | 创建成绩 | 考试存在 | POST成绩信息 | 成绩创建成功 |
| EXAM-API-007 | POST | /api/grades/merge | 合并成绩 | 成绩存在 | POST合并数据 | 合并成功 |
| EXAM-API-008 | POST | /api/grades/import-preview | 预览导入成绩 | 教师已登录 | POST {classId, filename, data} | 返回预览数据 |
| EXAM-API-009 | POST | /api/grades/import-commit | 确认导入成绩 | 已预览 | POST {classId, examName, subject, rows} | 成绩导入成功 |
| EXAM-API-010 | POST | /api/grades/import-ai | AI 导入成绩 | 教师已登录 | POST {classId, mode, data} | AI 解析并导入 |
| EXAM-API-011 | PATCH | /api/grades/:id | 更新成绩 | 成绩存在 | PATCH | 更新成功 |
| EXAM-API-012 | DELETE | /api/grades/:id | 删除成绩 | 成绩存在 | DELETE | 软删除 |
| EXAM-API-013 | POST | /api/grades/export | 导出成绩 | 教师已登录 | POST | 返回 Excel 文件 |

### 5.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| EXAM-WEB-001 | /teacher/exams | 考试列表 | 1. 点击考试管理 | 显示考试列表 |
| EXAM-WEB-002 | /teacher/exams | 新增考试 | 1. 新增 2. 填写考试信息 3. 保存 | 考试创建成功 |
| EXAM-WEB-003 | /teacher/exams | 编辑/删除考试 | 1. 编辑/删除 | 操作成功 |
| EXAM-WEB-004 | /teacher/grades | 成绩列表 | 1. 点击成绩管理 | 显示成绩列表 |
| EXAM-WEB-005 | /teacher/grades | 录入成绩 | 1. 录入成绩 2. 保存 | 成绩保存成功 |
| EXAM-WEB-006 | /teacher/grades | 批量录入成绩 | 1. 批量录入 2. 保存 | 批量保存成功 |
| EXAM-WEB-007 | /teacher/grades | AI 识别导入成绩 | 1. 导入 2. 上传图片 3. AI 识别 4. 确认导入 | AI 解析并导入 |
| EXAM-WEB-008 | /teacher/grades | 导出成绩 | 1. 点击导出 | 下载 Excel |
| EXAM-WEB-009 | /teacher/grades | 编辑/删除成绩 | 1. 编辑/删除 | 操作成功 |

### 5.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| EXAM-MP-001 | pages/exams | 考试列表 | 1. 点击考试管理 | 显示考试列表 |
| EXAM-MP-002 | pages/exams | 新增考试 | 1. 新增考试 2. 填写信息 | 创建成功 |
| EXAM-MP-003 | pages/grades | 成绩列表 | 1. 点击成绩管理 | 显示成绩列表 |
| EXAM-MP-004 | pages/grades | 录入成绩 | 1. 录入 2. 保存 | 保存成功 |
| EXAM-MP-005 | pages/grades | AI 导入成绩 | 1. 导入 2. 上传 3. AI 识别 4. 确认 | AI 导入成功 |
| EXAM-MP-006 | pages/grade-trend | 成绩趋势 | 1. 查看学生成绩趋势 | 显示趋势图 |

---

## 六、教师模块 - 成绩分析

### 6.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| ANA-API-001 | GET | /api/grades/analysis/exam | 考试成绩统计 | 教师已登录，classId+examId | GET?classId=&examId=&fullScoreMap= | 返回各科统计数据 |
| ANA-API-002 | GET | /api/grades/analysis/trend | 考试成绩趋势 | 教师已登录，classId | GET?classId=&subject= | 返回历次考试趋势 |
| ANA-API-003 | GET | /api/grades/analysis/rank | 班级排名 | 教师已登录，classId+examId | GET?classId=&examId=&subject= | 返回班级排名 |
| ANA-API-004 | GET | /api/grades/analysis/student/:studentId | 学生成绩历史 | 教师已登录，studentId | GET | 返回学生历次成绩 |
| ANA-API-005 | GET | /api/grades/analysis/weak | 薄弱学生分析 | 教师已登录，classId | GET?classId=&examId= | 返回薄弱学生列表 |
| ANA-API-006 | POST | /api/ai/analyze-exam | AI 考试分析报告 | 教师已登录 | POST {examId} | 返回 AI 分析报告 |
| ANA-API-007 | POST | /api/ai/diagnose | AI 学情诊断 | 教师已登录 | POST {studentId} | 返回 AI 诊断报告 |

### 6.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| ANA-WEB-001 | /teacher/exam-analysis | 考试分析总览 | 1. 点击考试分析 | 显示分析总览 |
| ANA-WEB-002 | /teacher/exam-analysis | 选择考试查看分析 | 1. 选择考试 | 显示该考试详细分析 |
| ANA-WEB-003 | /teacher/data-dashboard | 数据看板 | 1. 点击数据看板 | 显示班级成绩数据 |
| ANA-WEB-004 | /teacher/data-dashboard | 按科目筛选 | 1. 选择科目 | 筛选数据正确 |
| ANA-WEB-005 | /teacher/data-dashboard | 按时间范围筛选 | 1. 选择时间范围 | 筛选数据正确 |
| ANA-WEB-006 | /teacher/radar | 雷达图 | 1. 点击雷达图 | 显示学生各科雷达图 |
| ANA-WEB-007 | /teacher/radar | 选择学生查看雷达 | 1. 选择学生 | 显示该生雷达图 |
| ANA-WEB-008 | /teacher/grade-trend | 成绩趋势 | 1. 查看成绩趋势 | 显示趋势折线图 |
| ANA-WEB-009 | /teacher/grade-trend | 按学生筛选趋势 | 1. 选择学生 | 显示该生趋势 |
| ANA-WEB-010 | /teacher/exam-analysis | AI 生成考试分析 | 1. 点击 AI 分析 | AI 生成分析报告 |
| ANA-WEB-011 | /teacher/exam-analysis | AI 学情诊断 | 1. 选择学生 2. 点击 AI 诊断 | AI 生成诊断报告 |

### 6.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| ANA-MP-001 | pages/analysis | 数据统计总览 | 1. 点击数据统计 | 显示统计总览 |
| ANA-MP-002 | pages/analysis | 选择考试查看分析 | 1. 选择考试 | 显示考试分析 |
| ANA-MP-003 | pages/radar | 雷达图 | 1. 点击雷达图 | 显示雷达图 |
| ANA-MP-004 | pages/grade-trend | 成绩趋势 | 1. 查看趋势 | 显示趋势图 |
| ANA-MP-005 | pages/analysis | AI 考试分析 | 1. AI 分析考试 | 生成分析报告 |

---

## 七、教师模块 - 学生评价与考勤

### 7.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| EVA-API-001 | GET | /api/rewards | 获取奖励记录 | 教师已登录 | GET?classId= | 返回奖励记录列表 |
| EVA-API-002 | POST | /api/rewards | 创建奖励记录 | 教师已登录 | POST | 记录创建成功 |
| EVA-API-003 | PATCH | /api/rewards/:id | 更新奖励记录 | 记录存在 | PATCH | 更新成功 |
| EVA-API-004 | DELETE | /api/rewards/:id | 删除奖励记录 | 记录存在 | DELETE | 软删除 |
| EVA-API-005 | GET | /api/growth | 获取成长记录 | 教师已登录 | GET?studentId= | 返回成长记录 |
| EVA-API-006 | POST | /api/growth | 创建成长记录 | 教师已登录 | POST | 创建成功 |
| EVA-API-007 | GET | /api/behavior | 获取行为记录 | 教师已登录 | GET?classId= | 返回行为记录 |
| EVA-API-008 | POST | /api/behavior | 创建行为记录 | 教师已登录 | POST | 创建成功 |
| EVA-API-009 | GET | /api/checkin | 获取打卡记录 | 教师已登录 | GET?date= | 返回打卡记录 |
| EVA-API-010 | POST | /api/checkin | 学生打卡 | 教师/学生已登录 | POST {studentId} | 打卡成功 |
| ATT-API-001 | GET | /api/attendance | 获取考勤记录 | 教师已登录 | GET?classId=&date= | 返回考勤列表 |
| ATT-API-002 | POST | /api/attendance | 记录考勤 | 教师已登录 | POST | 考勤记录创建成功 |

### 7.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| EVA-WEB-001 | /teacher/rewards | 奖励记录列表 | 1. 点击奖励记录 | 显示奖励记录 |
| EVA-WEB-002 | /teacher/rewards | 新增奖励 | 1. 新增 2. 填写 3. 保存 | 创建成功 |
| EVA-WEB-003 | /teacher/score-records | 加减分记录 | 1. 查看加减分 | 显示记录列表 |
| EVA-WEB-004 | /teacher/score-records | 批量加减分 | 1. 批量加减分 | 操作成功 |
| EVA-WEB-005 | /teacher/group-scores | 小组评分 | 1. 小组评分 | 保存成功 |
| EVA-WEB-006 | /teacher/leaderboard | 排行榜 | 1. 查看排行榜 | 显示排行榜 |
| EVA-WEB-007 | /teacher/growth | 成长记录 | 1. 查看/新增成长记录 | 操作成功 |
| EVA-WEB-008 | /teacher/behavior | 行为记录 | 1. 查看/新增行为记录 | 操作成功 |
| EVA-WEB-009 | /teacher/reading-log | 课外阅读 | 1. 查看/新增阅读记录 | 操作成功 |
| EVA-WEB-010 | /teacher/checkin | 学生打卡 | 1. 查看打卡 2. 标记打卡 | 打卡成功 |
| ATT-WEB-001 | /teacher/attendance | 考勤管理 | 1. 查看考勤列表 | 显示考勤 |
| ATT-WEB-002 | /teacher/attendance | 记录考勤 | 1. 标记出勤/缺勤 | 保存成功 |

### 7.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| EVA-MP-001 | pages/leaderboard | 排行榜 | 1. 查看排行榜 | 显示排名 |
| EVA-MP-002 | pages/behavior-record | 行为记录 | 1. 查看/新增记录 | 操作成功 |
| EVA-MP-003 | pages/award-record | 获奖记录 | 1. 查看/新增 | 操作成功 |
| EVA-MP-004 | pages/growth | 成长档案 | 1. 查看成长记录 | 显示档案 |
| EVA-MP-005 | pages/reading-log | 课外阅读 | 1. 查看/新增阅读 | 操作成功 |
| EVA-MP-006 | pages/checkin | 学生打卡 | 1. 打卡 | 打卡成功 |
| ATT-MP-001 | pages/attendance | 考勤管理 | 1. 标记考勤 | 操作成功 |

---

## 八、教师模块 - 家校沟通

### 8.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| PC-API-001 | GET | /api/parent-contacts | 获取家长联系人 | 教师已登录 | GET?classId= | 返回家长联系人列表 |
| PC-API-002 | POST | /api/parent-contacts | 创建家长联系人 | 教师已登录 | POST | 创建成功 |
| PC-API-003 | PATCH | /api/parent-contacts/:id | 更新家长联系人 | 联系人存在 | PATCH | 更新成功 |
| PC-API-004 | DELETE | /api/parent-contacts/:id | 删除家长联系人 | 联系人存在 | DELETE | 软删除 |
| IM-API-001 | GET | /api/messages | 获取消息列表 | 教师已登录 | GET?skip=&take= | 返回消息列表 |
| IM-API-002 | POST | /api/messages | 发送消息 | 教师/家长已登录 | POST {toRole, toUserId, content} | 消息发送成功 |
| IM-API-003 | PATCH | /api/messages/:id/read | 标记消息已读 | 消息存在 | PATCH | 标记成功 |
| IM-API-004 | GET | /api/messages/unread-count | 获取未读消息数 | 已登录 | GET | 返回未读数量 |

### 8.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| PC-WEB-001 | /teacher/parent-contacts | 家长联系人列表 | 1. 点击家长联系 | 显示联系人列表 |
| PC-WEB-002 | /teacher/parent-contacts | 新增家长联系人 | 1. 新增 2. 填写 3. 保存 | 创建成功 |
| PC-WEB-003 | /teacher/parent-contacts | 编辑/删除联系人 | 1. 编辑/删除 | 操作成功 |
| PC-WEB-004 | /teacher/im | 家校沟通 | 1. 点击家校沟通 | 显示聊天列表 |
| PC-WEB-005 | /teacher/im | 发送消息 | 1. 选择联系人 2. 发送消息 | 消息发送成功 |
| PC-WEB-006 | /teacher/im | 实时接收消息 | 1. 等待家长回复 | 消息实时送达 |
| PC-WEB-007 | /teacher/notice-templates | 通知模板 | 1. 查看/新增模板 | 操作成功 |

### 8.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| PC-MP-001 | pages/parent-contact | 家长联系 | 1. 点击家长联系 | 显示联系人 |
| PC-MP-002 | pages/im | 家校沟通 | 1. 点击家校沟通 | 显示聊天列表 |
| PC-MP-003 | pages/im | 发送消息 | 1. 选择联系人 2. 发送 | 发送成功 |

---

## 九、教师模块 - AI 能力

### 9.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| AI-API-001 | POST | /api/ai/chat | AI 流式对话 | 教师已登录，AI 已配置 | POST {messages} | SSE 流式返回对话 |
| AI-API-002 | POST | /api/ai/chat-sync | AI 同步对话 | 教师已登录，AI 已配置 | POST {messages} | 返回完整对话内容 |
| AI-API-003 | POST | /api/ai/parse | AI 结构化解析 | 教师已登录 | POST {text, instruction} | 解析为 JSON 数组 |
| AI-API-004 | POST | /api/ai/gen-image | AI 文生图 | 教师已登录 | POST {prompt, ...} | 返回图片 URL |
| AI-API-005 | POST | /api/ai/gen-video | AI 文生视频 | 教师已登录 | POST {prompt, ...} | 返回视频 URL |
| AI-API-006 | POST | /api/ai/asr | 语音识别 | 教师已登录 | POST {audio(base64)} | 返回识别文本 |
| AI-API-007 | POST | /api/ai/ocr | 图片 OCR | 教师已登录 | POST {image(base64)} | 返回识别文字 |
| AI-API-008 | POST | /api/ai/parse-file | 文件解析 | 教师已登录 | POST {fileName, fileData(base64)} | 返回解析文本 |
| AI-API-009 | POST | /api/ai/analyze-exam | AI 考试分析 | 教师已登录 | POST {examId} | 返回分析报告 |
| AI-API-010 | POST | /api/ai/diagnose | AI 学情诊断 | 教师已登录 | POST {studentId} | 返回诊断报告 |

### 9.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| AI-WEB-001 | /teacher/ai-chat | AI 对话 | 1. 点击 AI 对话 2. 输入问题 3. 发送 | AI 返回回答 |
| AI-WEB-002 | /teacher/ai-chat | AI 流式对话 | 1. 发送问题 2. 观察流式返回 | 逐字显示回答 |
| AI-WEB-003 | /teacher/ai-image | AI 文生图 | 1. 输入提示词 2. 点击生成 | 返回生成图片 |
| AI-WEB-004 | /teacher/ai-resources | 教学资源 | 1. 查看/生成资源 | 操作成功 |
| AI-WEB-005 | /teacher/lesson-plans | 教案库 | 1. 查看教案列表 | 显示教案列表 |
| AI-WEB-006 | /teacher/knowledges | 知识点库 | 1. 查看/新增知识点 | 操作成功 |
| AI-WEB-007 | /teacher/papers | 试卷库 | 1. 查看试卷列表 | 显示试卷列表 |
| AI-WEB-008 | /teacher/ai-generator/lesson | AI 生成教案 | 1. 输入要求 2. 生成 | 返回教案 |
| AI-WEB-009 | /teacher/ai-generator/knowledge | AI 生成知识点 | 1. 输入要求 2. 生成 | 返回知识点 |
| AI-WEB-010 | /teacher/ai-generator/paper | AI 生成试卷 | 1. 输入要求 2. 生成 | 返回试卷 |
| AI-WEB-011 | /teacher/ai-chat | AI 限流测试 | 1. 1 分钟内连续发送 11 次 | 触发 429 限流 |
| AI-WEB-012 | /teacher/ai-chat | AI 未配置测试 | 1. AI 服务商未配置 | 返回配置提示 |

### 9.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| AI-MP-001 | pages/ai/ai | AI 助手对话 | 1. 输入问题 2. 发送 | AI 返回回答 |
| AI-MP-002 | pages/ai/ai-lesson | AI 教案生成 | 1. 输入要求 2. 生成 | 返回教案 |
| AI-MP-003 | pages/ai/ai-knowledge | AI 知识点生成 | 1. 输入要求 2. 生成 | 返回知识点 |
| AI-MP-004 | pages/ai/ai-paper | AI 组卷 | 1. 输入要求 2. 生成 | 返回试卷 |
| AI-MP-005 | pages/ai/ai-exam | AI 考试分析 | 1. 选择考试 2. AI 分析 | 返回分析 |
| AI-MP-006 | pages/ai/ai-interactive | AI 互动答疑 | 1. 提问 2. AI 答疑 | 返回解答 |
| AI-MP-007 | pages/image-creation | AI 文生图 | 1. 输入提示 2. 生成 | 返回图片 |
| AI-MP-008 | pages/ai-center/index | AI 备课中心 | 1. 查看 AI 工具集 | 显示工具列表 |

---

## 十、教师模块 - 办公与教学

### 10.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| OFC-API-001 | GET | /api/work-logs | 获取工作日志列表 | 教师已登录 | GET?date= | 返回日志列表 |
| OFC-API-002 | POST | /api/work-logs | 创建工作日志 | 教师已登录 | POST | 创建成功 |
| OFC-API-003 | PATCH | /api/work-logs/:id | 更新工作日志 | 日志存在 | PATCH | 更新成功 |
| OFC-API-004 | DELETE | /api/work-logs/:id | 删除工作日志 | 日志存在 | DELETE | 软删除 |
| OFC-API-005 | GET | /api/lesson-observations | 获取听课记录 | 教师已登录 | GET?classId= | 返回听课记录 |
| OFC-API-006 | POST | /api/lesson-observations | 创建听课记录 | 教师已登录 | POST | 创建成功 |
| OFC-API-007 | GET | /api/teaching-calendar | 获取教学日历 | 教师已登录 | GET?year=&month= | 返回月历数据 |
| OFC-API-008 | POST | /api/teaching-calendar | 创建教学日历项 | 教师已登录 | POST | 创建成功 |
| OFC-API-009 | PATCH | /api/teaching-calendar/:id | 更新教学日历项 | 日历项存在 | PATCH | 更新成功 |
| OFC-API-010 | DELETE | /api/teaching-calendar/:id | 删除教学日历项 | 日历项存在 | DELETE | 软删除 |
| OFC-API-011 | GET | /api/lesson-plan-templates | 获取教案模板 | 教师已登录 | GET | 返回模板列表 |
| OFC-API-012 | POST | /api/lesson-plan-templates | 创建教案模板 | 教师已登录 | POST | 创建成功 |
| OFC-API-013 | GET | /api/notes | 获取笔记列表 | 教师已登录 | GET | 返回笔记列表 |
| OFC-API-014 | POST | /api/notes | 创建笔记 | 教师已登录 | POST | 创建成功 |
| OFC-API-015 | GET | /api/todos | 获取待办列表 | 教师已登录 | GET | 返回待办列表 |
| OFC-API-016 | POST | /api/todos | 创建待办 | 教师已登录 | POST | 创建成功 |

### 10.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| OFC-WEB-001 | /teacher/work-log | 工作日志列表 | 1. 点击工作日志 | 显示日志列表 |
| OFC-WEB-002 | /teacher/work-log | 新增工作日志 | 1. 新增 2. 填写 3. 保存 | 创建成功 |
| OFC-WEB-003 | /teacher/work-log | 编辑/删除日志 | 1. 编辑/删除 | 操作成功 |
| OFC-WEB-004 | /teacher/lesson-obs | 听课记录列表 | 1. 点击听课记录 | 显示记录列表 |
| OFC-WEB-005 | /teacher/lesson-obs | 新增听课记录 | 1. 新增 2. 填写 3. 保存 | 创建成功 |
| OFC-WEB-006 | /teacher/teaching-calendar | 教学日历 | 1. 查看月历 | 显示日历视图 |
| OFC-WEB-007 | /teacher/teaching-calendar | 新增日历项 | 1. 点击日期 2. 新增 | 创建成功 |
| OFC-WEB-008 | /teacher/todos | 待办列表 | 1. 点击待办事项 | 显示待办列表 |
| OFC-WEB-009 | /teacher/todos | 新增待办 | 1. 新增 2. 填写 3. 保存 | 创建成功 |
| OFC-WEB-010 | /teacher/todos | 完成待办 | 1. 勾选完成 | 状态变更 |
| OFC-WEB-011 | /teacher/notes | 笔记列表 | 1. 点击笔记 | 显示笔记列表 |
| OFC-WEB-012 | /teacher/notes | 新增笔记 | 1. 新增 2. 输入内容 3. 保存 | 创建成功 |
| OFC-WEB-013 | /teacher/lesson-plan-templates | 教案模板 | 1. 查看/新增模板 | 操作成功 |

### 10.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| OFC-MP-001 | pages/work-log | 工作日志 | 1. 查看/新增日志 | 操作成功 |
| OFC-MP-002 | pages/lesson-observation | 听课记录 | 1. 查看/新增记录 | 操作成功 |
| OFC-MP-003 | pages/teaching-calendar | 教学日历 | 1. 查看月历 | 显示日历 |
| OFC-MP-004 | pages/notes | 笔记 | 1. 查看/新增笔记 | 操作成功 |
| OFC-MP-005 | pages/todos | 待办 | 1. 查看/新增/完成待办 | 操作成功 |
| OFC-MP-006 | pages/messages | 消息中心 | 1. 查看消息列表 | 显示消息 |

---

## 十一、教师模块 - 工具箱与游戏

### 11.1 工具箱 Web 用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| TLS-WEB-001 | /teacher/toolbox | 工具箱聚合页 | 1. 点击工具箱 | 显示工具分类入口 |
| TLS-WEB-002 | /teacher/tools/picker | 随机点名 | 1. 选择班级 2. 点击随机抽取 | 随机选中学生 |
| TLS-WEB-003 | /teacher/tools/grouper | 随机分组 | 1. 选择人数 2. 点击分组 | 随机分组结果 |
| TLS-WEB-004 | /teacher/tools/decider | 随机决定器 | 1. 点击骰子 | 显示随机结果 |
| TLS-WEB-005 | /teacher/tools/timer | 倒计时 | 1. 设置时间 2. 开始 | 倒计时运行 |
| TLS-WEB-006 | /teacher/tools/seatMap | 座位表 | 1. 查看/编辑座位 | 保存成功 |
| TLS-WEB-007 | /teacher/tools/scorePanel | 加减分面板 | 1. 对学生加减分 | 分数变更成功 |
| TLS-WEB-008 | /teacher/tools/flower | 笑口常开 | 1. 点击游戏 | 游戏运行 |
| TLS-WEB-009 | /teacher/tools/comment | 评语生成 | 1. 输入要求 2. 生成 | 返回评语 |
| TLS-WEB-010 | /teacher/tools/summary | 期末总结 | 1. 输入要求 2. 生成 | 返回总结 |
| TLS-WEB-011 | /teacher/tools/classDuty | 班级职务 | 1. 查看/分配职务 | 操作成功 |
| TLS-WEB-012 | /teacher/tools/scheduleMaker | 课表排版 | 1. 编辑课表 | 保存成功 |
| TLS-WEB-013 | /teacher/tools/strokeOrder | 汉字笔顺 | 1. 输入汉字 | 显示笔顺动画 |
| TLS-WEB-014 | /teacher/tools/writingMaterials | 作文素材 | 1. 搜索素材 | 显示素材 |
| TLS-WEB-015 | /teacher/tools/poetry | 古诗词助手 | 1. 搜索诗词 | 显示诗词 |
| TLS-WEB-016 | /teacher/tools/dictation | 汉字听写 | 1. 开始听写 | 听写运行 |
| TLS-WEB-017 | /teacher/tools/reading | 阅读理解 | 1. 输入文章 2. 生成题目 | 返回题目 |
| TLS-WEB-018 | /teacher/tools/math | 口算生成 | 1. 设置参数 2. 生成 | 返回口算题 |
| TLS-WEB-019 | /teacher/tools/verticalCalc | 竖式计算 | 1. 生成题目 | 显示题目 |
| TLS-WEB-020 | /teacher/tools/wordCard | 单词卡片 | 1. 查看/生成卡片 | 操作成功 |
| TLS-WEB-021 | /teacher/tools/listening | 英语听力 | 1. 播放听力 | 听力播放 |
| TLS-WEB-022 | /teacher/tools/grammar | 语法练习 | 1. 生成练习 | 显示题目 |
| TLS-WEB-023 | /teacher/tools/planTemplates | 文案模板 | 1. 选择模板 | 显示模板 |

### 11.2 小程序工具箱用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| TLS-MP-001 | pages/toolbox | 工具箱首页 | 1. 点击工具箱 tab | 显示工具分类 |
| TLS-MP-002 | pages/tools/picker | 随机点名 | 1. 抽取学生 | 随机选中 |
| TLS-MP-003 | pages/tools/timer | 倒计时 | 1. 设置时间 | 倒计时运行 |
| TLS-MP-004 | pages/tools/calc | 课堂计算器 | 1. 使用计算器 | 计算正确 |
| TLS-MP-005 | pages/tools/decider | 随机决定器 | 1. 摇动骰子 | 随机结果 |
| TLS-MP-006 | pages/tools/math | 口算生成 | 1. 生成题目 | 显示题目 |
| TLS-MP-007 | pages/subject-tools/index | 学科工具 | 1. 进入学科工具 | 显示学科列表 |
| TLS-MP-008 | pages/subject-tools/chinese | 语文工具 | 1. 查看语文工具 | 显示工具列表 |
| TLS-MP-009 | pages/subject-tools/english | 英语工具 | 1. 查看英语工具 | 显示工具列表 |
| TLS-MP-010 | pages/subject-tools/math | 数学工具 | 1. 查看数学工具 | 显示工具列表 |
| TLS-MP-011 | pages/office-tools/index | 办公工具 | 1. 查看办公工具 | 显示工具列表 |
| TLS-MP-012 | pages/quicktool | 智能工具 | 1. 输入需求 | AI 返回工具建议 |

### 11.3 游戏模块用例

| # | 平台 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| GM-WEB-001 | Web | 24 点游戏 | 1. 点击游戏 2. 开始游戏 | 游戏可玩 |
| GM-WEB-002 | Web | 2048 游戏 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-WEB-003 | Web | 俄罗斯方块 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-WEB-004 | Web | 贪吃蛇 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-WEB-005 | Web | 五子棋 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-WEB-006 | Web | 消消乐 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-WEB-007 | Web | 成语填空 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-MP-001 | 小程序 | 2048 游戏 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-MP-002 | 小程序 | 数独 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-MP-003 | 小程序 | 井字棋 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-MP-004 | 小程序 | 成语填空 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-MP-005 | 小程序 | 速算挑战 | 1. 点击游戏 2. 开始 | 游戏可玩 |
| GM-MP-006 | 小程序 | 单词拼写 | 1. 点击游戏 2. 开始 | 游戏可玩 |

---

## 十二、家长模块 (Parent)

### 12.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| PAR-API-001 | POST | /api/parent-auth/login | 家长登录 | 家长账号存在 | POST {studentNo, password} | 返回 Token |
| PAR-API-002 | GET | /api/parent-auth/me | 获取家长信息 | 家长已登录 | GET | 返回家长+孩子信息 |
| PAR-API-003 | GET | /api/parent-auth/notices | 孩子班级通知 | 家长已登录 | GET | 返回班级通知 |
| PAR-API-004 | GET | /api/parent-auth/exams | 孩子考试成绩 | 家长已登录 | GET | 返回成绩+趋势分析 |
| PAR-API-005 | GET | /api/parent-auth/homework | 孩子作业 | 家长已登录 | GET | 返回作业列表 |
| PAR-API-006 | GET | /api/parent-auth/attendance | 孩子考勤 | 家长已登录 | GET | 返回考勤汇总 |
| PAR-API-007 | GET | /api/parent-auth/behavior | 孩子行为记录 | 家长已登录 | GET | 返回行为记录 |
| PAR-API-008 | GET | /api/parent-auth/schedule | 孩子课表+值日 | 家长已登录 | GET | 返回课表+值日 |
| PAR-API-009 | GET | /api/parent-auth/communications | 家校沟通记录 | 家长已登录 | GET | 返回沟通记录 |
| PAR-API-010 | POST | /api/parent-auth/change-password | 修改密码 | 家长已登录 | POST {oldPassword, newPassword} | 修改成功 |
| PAR-API-011 | POST | /api/parent-auth/bind-wechat | 绑定微信 | 家长已登录 | POST {code, nickName} | 绑定成功 |
| PAR-API-012 | POST | /api/parent-auth/subscribe | 订阅微信通知 | 家长已登录 | POST {code} | 订阅成功 |
| PAR-API-013 | GET | /api/parent-auth/im-user-sig | 获取 IM UserSig | 家长已登录 | GET | 返回 UserSig |
| PAR-API-014 | POST | /api/parent-auth/switch-student | 切换孩子 | 家长已登录（多娃） | POST {studentId} | 切换成功 |
| PAR-API-015 | GET | /api/parent-auth/compare-kids | 多娃对比 | 家长已登录（≥2 娃） | GET | 返回对比数据 |
| PAR-API-016 | POST | /api/parent-auth/activate-parent | 教师激活家长身份 | 教师已登录 | POST | 激活成功 |

### 12.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| PAR-WEB-001 | /parent | 家长中心 | 1. 登录家长 | 显示孩子信息 |
| PAR-WEB-002 | /parent | 查看孩子成绩 | 1. 点击成绩 | 显示成绩列表 |
| PAR-WEB-003 | /parent | 查看成绩趋势 | 1. 点击趋势 | 显示趋势图 |
| PAR-WEB-004 | /parent | 查看孩子考勤 | 1. 点击考勤 | 显示考勤记录 |
| PAR-WEB-005 | /parent | 查看孩子行为 | 1. 点击行为记录 | 显示行为记录 |
| PAR-WEB-006 | /parent | 查看班级通知 | 1. 点击通知 | 显示通知列表 |
| PAR-WEB-007 | /parent | 查看作业 | 1. 点击作业 | 显示作业列表 |
| PAR-WEB-008 | /parent | 家校沟通 | 1. 点击沟通 | 进入聊天界面 |
| PAR-WEB-009 | /parent | 多娃切换 | 1. 切换孩子视角 | 视角切换成功 |
| PAR-WEB-010 | /parent/compare | 多娃对比 | 1. 点击跨娃比对 | 显示对比数据 |
| PAR-WEB-011 | /parent | 修改密码 | 1. 修改密码 | 修改成功 |
| PAR-WEB-012 | /parent | 绑定微信 | 1. 绑定微信 | 绑定成功 |

### 12.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| PAR-MP-001 | pages/parent-login | 家长登录 | 1. 输入学号密码 2. 登录 | 登录成功 |
| PAR-MP-002 | pages/parent/parent | 家长中心 | 1. 登录后查看 | 显示孩子信息 |
| PAR-MP-003 | pages/parent/parent | 查看成绩 | 1. 点击成绩 | 显示成绩列表 |
| PAR-MP-004 | pages/parent/parent | 查看趋势 | 1. 点击趋势 | 显示趋势图 |
| PAR-MP-005 | pages/parent/parent | 查看考勤 | 1. 点击考勤 | 显示考勤 |
| PAR-MP-006 | pages/parent/parent | 查看行为 | 1. 点击行为 | 显示行为记录 |
| PAR-MP-007 | pages/parent/parent | 查看通知 | 1. 点击通知 | 显示通知 |
| PAR-MP-008 | pages/parent/parent | 查看作业 | 1. 点击作业 | 显示作业 |
| PAR-MP-009 | pages/parent/parent | 家校沟通 | 1. 点击沟通 | 进入聊天 |
| PAR-MP-010 | pages/parent/compare | 多娃对比 | 1. 点击对比 | 显示对比 |

---

## 十三、通知与消息

### 13.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| NTF-API-001 | GET | /api/notifications | 获取通知列表 | 已登录（教师） | GET?skip=&take= | 返回通知列表 |
| NTF-API-002 | GET | /api/notifications/unread-count | 获取未读通知数 | 已登录 | GET | 返回未读数量 |
| NTF-API-003 | PATCH | /api/notifications/:id/read | 标记通知已读 | 通知存在 | PATCH | 标记成功 |
| NTF-API-004 | POST | /api/notifications/mark-all-read | 全部标记已读 | 已登录 | POST | 全部标记成功 |
| MSG-API-001 | GET | /api/messages | 获取消息列表 | 已登录 | GET?skip=&take= | 返回消息列表 |
| MSG-API-002 | POST | /api/messages | 发送消息 | 已登录 | POST {toRole, toUserId, content} | 发送成功 |
| MSG-API-003 | PATCH | /api/messages/:id/read | 标记消息已读 | 消息存在 | PATCH | 标记成功 |

### 13.2 Web 前端用例

| # | 路由 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| NTF-WEB-001 | /teacher/notifications | 通知中心 | 1. 查看通知列表 | 显示通知 |
| NTF-WEB-002 | /teacher/notifications | 标记已读 | 1. 点击标记已读 | 已读状态变更 |
| NTF-WEB-003 | /teacher/notifications | 全部已读 | 1. 点击全部已读 | 全部标记已读 |
| MSG-WEB-001 | /teacher/messages | 消息中心 | 1. 查看消息列表 | 显示消息 |
| MSG-WEB-002 | /teacher/messages | 发送消息 | 1. 选择联系人 2. 发送 | 发送成功 |

### 13.3 小程序用例

| # | 页面 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| NTF-MP-001 | pages/notifications | 通知中心 | 1. 查看通知 | 显示通知列表 |
| MSG-MP-001 | pages/messages | 消息中心 | 1. 查看消息 | 显示消息列表 |

---

## 十四、数据导出与批量操作

### 14.1 HTTP API 用例

| # | HTTP 方法 | URL | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|----------|-----|---------|---------|---------|---------|
| EXP-API-001 | POST | /api/students/export | 导出学生 Excel | 教师已登录 | POST {classId} | 返回 xlsx 文件流 |
| EXP-API-002 | POST | /api/grades/export | 导出成绩 Excel | 教师已登录 | POST {classId, examId} | 返回 xlsx 文件流 |
| EXP-API-003 | POST | /api/students/import | 导入学生（Excel） | 教师已登录 | POST {filename, data(base64)} | 解析并返回预览 |
| EXP-API-004 | POST | /api/grades/import-preview | 预览导入成绩 | 教师已登录 | POST {classId, filename, data} | 返回预览数据 |
| EXP-API-005 | POST | /api/grades/import-commit | 确认导入成绩 | 已预览 | POST {rows} | 批量导入成功 |
| EXP-API-006 | POST | /api/grades/import-ai | AI 识别导入成绩 | 教师已登录 | POST {classId, mode, data} | AI 解析并导入 |
| EXP-API-007 | POST | /api/ai/parse-file | AI 文件解析 | 教师已登录 | POST {fileName, fileData} | 返回解析文本 |
| EXP-API-008 | POST | /api/school-admin/teachers/import | 校管导入教师 | 校管已登录 | POST {filename, data} | 解析导入教师 |
| EXP-API-009 | POST | /api/school-admin/students/import | 校管导入学生 | 校管已登录 | POST {filename, data} | 解析导入学生 |

### 14.2 Web 前端用例

| # | 模块 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|---------|---------|---------|
| EXP-WEB-001 | 学生管理 | 导出学生名单 | 1. 点击导出 | 下载 Excel |
| EXP-WEB-002 | 学生管理 | AI 识别导入学生 | 1. 导入 2. 上传图片 3. 确认 | AI 识别导入 |
| EXP-WEB-003 | 学生管理 | Excel 导入学生 | 1. 导入 2. 上传文件 3. 确认 | 解析导入 |
| EXP-WEB-004 | 成绩管理 | 导出成绩 | 1. 点击导出 | 下载 Excel |
| EXP-WEB-005 | 成绩管理 | AI 导入成绩 | 1. 导入 2. 上传 3. AI 识别 | AI 导入 |
| EXP-WEB-006 | 成绩管理 | Excel 导入成绩 | 1. 导入 2. 上传 3. 确认导入 | 批量导入 |

---

## 十五、权限与安全

### 15.1 权限校验用例

| # | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|---------|---------|---------|---------|
| PERM-001 | 教师访问教师路由 | 教师已登录 | 1. 访问 /teacher/* | 正常访问 |
| PERM-002 | 家长访问教师路由 | 家长已登录 | 1. 访问 /teacher | 跳转至 /forbidden |
| PERM-003 | 校管访问超管路由 | 校管已登录 | 1. 访问 /super | 跳转至 /forbidden |
| PERM-004 | 超管访问教师路由 | 超管已登录 | 1. 访问 /teacher | 跳转至 /forbidden |
| PERM-005 | 教师访问需要 feature 的页面 | 教师已登录，无对应 feature | 1. 访问 /teacher/todos | 跳转至 /teacher-dashboard |
| PERM-006 | 教师访问 feature 页面 | 教师已登录，有 feature | 1. 访问 /teacher/todos | 正常访问 |
| PERM-007 | 未登录访问受保护路由 | 未登录 | 1. 访问 /teacher | 重定向至登录页 |
| PERM-008 | 篡改前端 role 测试 | 教师已登录，修改 localStorage | 1. 修改 role 为 super 2. 访问 /super | 路由守卫拦截，跳 forbidden |
| PERM-009 | 后端越权访问数据 | 教师 A 尝试访问教师 B 的班级数据 | GET /api/students?classId=B的班级 | 返回空列表 |
| PERM-010 | 班主任 vs 科任老师权限 | 科任老师已登录 | 1. 尝试转交班主任 | 返回 403 |
| PERM-011 | 家长仅能看自己孩子数据 | 家长 A 已登录 | 1. 尝试访问家长 B 孩子的成绩 | 返回 403 或空 |
| PERM-012 | 教师禁止自建班级 | 教师已登录 | POST /api/classes | 返回 403 |
| PERM-013 | AI 接口限流 | 教师已登录 | 1 分钟内连续 11 次 POST /api/ai/chat | 返回 429 |
| PERM-014 | 登录频率限制 | 正常账号 | 60 秒内 11 次登录 | 返回 429 |
| PERM-015 | JWT 过期访问 | Token 已过期 | 1. 调用 API | 返回 401，前端清除登录态 |

### 15.2 数据安全用例

| # | 用例标题 | 前置条件 | 操作步骤 | 预期结果 |
|---|---------|---------|---------|---------|
| SEC-001 | mass assignment 防护 | 教师已登录 | POST 包含 teacherId/id 等不可写字段 | 服务端剥离不安全字段 |
| SEC-002 | 软删除验证 | 已删除记录 | 1. 查询已删除记录 | 查询不到（isDeleted 过滤） |
| SEC-003 | 密码加密存储 | 新用户注册 | 1. 创建用户 | 密码 hash 存储 |
| SEC-004 | 审计日志记录 | 敏感操作 | 1. 执行创建/删除/重置密码等 | 审计日志记录操作 |
| SEC-005 | 租户隔离 | 校管 A 已登录 | 1. 访问校管 B 的学校数据 | 返回空列表 |
| SEC-006 | 输入校验 | 教师已登录 | 1. 提交空值/非法数据 | DTO 校验拦截，返回 400 |

---

## 附录：用例统计汇总

### 按模块统计

| 模块 | 后端 API | Web 前端 | 小程序 | 合计 |
|------|---------|---------|--------|------|
| 认证 (Auth) | 17 | 9 | 5 | 31 |
| 超管 (Super) | 16 | 15 | - | 31 |
| 校管 (School Admin) | 26 | 16 | - | 42 |
| 班级与学生 | 17 | 18 | 10 | 45 |
| 考试与成绩 | 13 | 9 | 6 | 28 |
| 成绩分析 | 7 | 11 | 5 | 23 |
| 学生评价与考勤 | 12 | 14 | 7 | 33 |
| 家校沟通 | 7 | 7 | 3 | 17 |
| AI 能力 | 10 | 12 | 8 | 30 |
| 办公与教学 | 16 | 13 | 6 | 35 |
| 工具箱与游戏 | - | 23 | 12 | 35 |
| 家长 (Parent) | 16 | 12 | 10 | 38 |
| 通知与消息 | 7 | 5 | 2 | 14 |
| 导出与批量 | 9 | 6 | - | 15 |
| 权限与安全 | - | - | - | 21 |
| **合计** | **156** | **169** | **74** | **373** |

### 按角色覆盖统计

| 角色 | 覆盖模块数 | 关键用例数 |
|------|-----------|-----------|
| super (超管) | 7 | 31 |
| school_admin (校管) | 8 | 42 |
| teacher (班主任/科任) | 15 | 234 |
| parent (家长) | 6 | 38 |
| 未登录/权限校验 | 5 | 21 |

### 覆盖特性标记

- ✅ 三端覆盖（Web / 小程序 / 后端 API）
- ✅ 四种角色差异（super / school_admin / teacher / parent）
- ✅ CRUD 全流程（增删改查）
- ✅ 批量操作（批量创建/批量导入/批量导出）
- ✅ AI 能力（对话/文生图/OCR/ASR/解析/分析）
- ✅ 成绩分析（examStats/examTrend/classRank/studentHistory/weakStudents）
- ✅ 权限校验（角色守卫/功能守卫/数据隔离）
- ✅ 安全测试（限流/Token/防篡改/审计）
- ✅ 微信集成（微信登录/绑定/消息推送）
- ✅ 实时通信（消息中心/IM 聊天）

---

> **文档结束** | **用例总数: 373 条** | **覆盖模块: 15 个** | **覆盖角色: 4 种**