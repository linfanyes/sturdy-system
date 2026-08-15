# 测试计划

## 1. 测试目标
- 验证小程序与 Web 端功能一致性、布局/交互可用性
- 验证四角色管理登录与完整功能覆盖
- 验证两端调用同一套后端 API，关键操作具备幂等性
- 执行接口、功能、性能、边界、排版与兼容性测试并输出测试报告

## 2. 测试范围
### 2.1 角色矩阵
- super
- school_admin
- teacher
- parent

### 2.2 页面列表
#### 小程序
- admin
- school-admin
- dashboard
- classes
- students
- grades
- exams
- homework
- attendance
- awards
- notices
- resource
- community
- ai
- settings
- me
- parent
- parent-login
- games
- tools
- leave
- duty-config
- duty-roster

#### Web
- super
- school-admin
- teacher/dashboard
- teacher/classes
- teacher/students
- teacher/grades
- teacher/exams
- teacher/homework
- teacher/attendance
- teacher/awards
- teacher/notices
- teacher/resources
- teacher/community
- teacher/ai
- teacher/settings
- teacher/me
- teacher/class-management
- teacher/teacher-management
- teacher/role-switch
- teacher/games
- teacher/tools
- teacher/leave-approvals
- teacher/duty-roster
- teacher/student-info-update
- teacher/ask
- parent/dashboard
- parent/textbook
- parent/resources
- parent/compare

### 2.3 关键接口列表
- POST /auth/unified-login
- POST /parent-auth/login
- GET/POST /teachers
- GET/POST /classes
- GET/POST /students
- GET/POST /grades
- GET/POST /exams
- GET/POST /homework
- GET/POST /attendance
- GET/POST /notices
- GET/POST /resources
- GET/POST /community
- GET/POST /ai
- GET/POST /school-admin/*
- GET/POST /admin/*

## 3. 测试环境
- 后端：本地 NestJS + MySQL
- Web：本地 Vue dev server
- 小程序：微信开发者工具

## 4. 角色与数据准备
### 4.1 种子数据
- SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD
- 1 所学校 + 1 名校管
- 2 名教师 + 2 个班级 + 8 名学生
- 4 名家长（2 已开启家长登录，2 未开启）
- 基础业务数据：2 场考试 + 对应成绩 + 2 份作业 + 2 条通知 + 考勤记录

### 4.2 边界数据
- 禁用教师账号
- 重复学号学生
- 空班级
- 家长未开启登录状态

## 5. 功能测试用例
### 5.1 超管
- 登录 /auth/unified-login
- 学校 CRUD
- 校管账号管理
- AI 供应商管理
- 系统配置读写
- 审计日志查看

### 5.2 校管
- 登录 /auth/unified-login
- 仪表盘统计
- 教师 CRUD + 批量导入 + 重置密码 + 功能标记
- 班级 CRUD + 批量导入 + AI 识别 + 升级
- 学生 CRUD + 批量导入 + 家长登录开关
- AI 设置
- 学术概览

### 5.3 教师
- 登录 /auth/unified-login
- 工作台 dashboard
- 班级管理（含 tabs）
- 学生管理
- 成绩录入与趋势
- 考试管理
- 作业布置与批改
- 考勤打卡
- 奖励管理
- 通知发布
- 资源上传
- 社区互动
- AI 对话
- 游戏中心
- 工具箱
- 请假审批
- 值日表
- 学生信息修改审核

### 5.4 家长
- 登录 /parent-auth/login
- 工作台 dashboard
- 孩子管理（多娃切换）
- 成绩查看
- 考试查看
- 作业查看
- 通知查看
- 考勤查看
- 教材查看
- 课表查看
- 家校沟通
- 科任老师查看
- 行为表现查看
- 奖励查看
- AI 对话
- 设置
- 资源库
- 多娃对比

## 6. 接口测试用例
### 6.1 登录态
- 正确密码登录成功
- 错误密码提示密码错误
- 禁用账号提示已被禁用
- 未开启家长登录的学生学号登录被拒绝
- 微信登录（小程序）/ 密码登录（Web）双入口

### 6.2 业务接口
- 成绩录入：同一班级同一考试同一科目重复提交，数据库唯一索引报错
- 课表提交：按 classId+dayOfPeriod+period 幂等 upsert
- 游戏分数：同一游戏每人仅保留一条最高分
- 家长绑定：(studentId, openId) 唯一约束
- 资源库初始化：按 title/word 判重跳过
- 通知发布：重复提交验证（待专项测试）
- 作业布置：重复提交验证（待专项测试）

## 7. 性能测试用例
### 7.1 接口性能
- 登录接口 QPS 50，持续 1 分钟
- 仪表盘统计接口 QPS 20，持续 1 分钟
- 成绩列表接口 QPS 30，持续 1 分钟

### 7.2 边界测试
- 空班级成绩录入
- 1000 条成绩批量提交
- 家长多娃切换（5 个孩子）
- 通知发送给 500 人班级

## 8. 差异专项测试
### 8.1 Web 家长端缺失功能清单
- students、grades、exams、homework、notices、attendance、awards、schedule、communications、teachers、behavior、settings、ai
- 验证方法：对比 api/parent.ts API 列表与 router/index.ts parent children

### 8.2 功能一致性
- 教师 dashboard 快捷入口对比
- 成绩录入界面与流程对比
- 通知发布流程对比

## 9. 缺陷管理
- 严重级别：P0（阻断）/ P1（主要功能异常）/ P2（次要）/ P3（优化）
- 缺陷模板：标题、 steps、 expected、 actual、 截图/日志、 环境

## 10. 通过标准
- P0 缺陷 0 个
- P1 缺陷修复率 100%
- 核心流程（登录、成绩、通知）两端通过率 100%
- 接口错误率 < 0.1%
- 平均响应时间 < 500ms

## 11. 测试进度
- Day 1：测试计划评审 + 种子数据准备
- Day 2：后端接口测试
- Day 3：Web 端功能测试
- Day 4：小程序端功能测试
- Day 5：性能测试 + 差异专项测试
- Day 6：缺陷修复 + 回归测试
- Day 7：云托管外网回归测试
