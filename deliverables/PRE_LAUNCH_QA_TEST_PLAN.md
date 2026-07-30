# 师者小站（Work System）上线前 QA 测试计划

> 版本：1.0 | 日期：2025-08-01 | 作者：QA Lead | 扫描基线：代码层面全量扫描，未参考任何已有文档
>
> 覆盖范围：Web 端（Vue3 + TypeScript）+ 小程序端（uni-app）+ 后端（NestJS + TypeORM + MySQL）

---

## 0. 系统概览（扫描结果）

### 0.1 五角色定义

| 编号 | 角色 | 标识 | 登录方式 | 权限范围 |
|------|------|------|----------|----------|
| R1 | 超级管理员 (Super Admin) | `super` | 统一登录入口 | 所有学校、所有管理员、审计日志、平台配置、AI 服务商 |
| R2 | 学校管理员 (School Admin) | `school_admin` | 统一登录入口 | 本校教师/班级/学生/公告 CRUD、数据导入导出、搜索 |
| R3 | 教师 (Teacher) | `teacher` | 账号密码 / 微信扫码绑定 | 个人工作台 + 班级管理 + 学情考试 + 学生评价 + 家校沟通 + AI 备课 + 课堂工具 + 办公 + 游戏（功能权限按 features 控制） |
| R4 | 家长 (Parent) | `parent` | 学号+密码 / 微信绑定 | 孩子成绩、作业、考勤、行为、课表、家校沟通（数据隔离到其绑定的 studentId） |
| R5 | 访客 (Anonymous) | — | 无 | 仅登录页 |

### 0.2 三端页面 / API 统计

| 端 | 数量 | 说明 |
|----|------|------|
| Web 路由 | 125+ 条 | 5 角色，教师端 60+ 页面，含 20+ 游戏 |
| 小程序页面 | 70+ 个主包 + 40+ 分包 | TabBar 5 项，游戏/工具/AI 3 分包 |
| 后端 API | 45+ 控制器 | auth(6) + admin(14) + school-admin(25+) + 教师 CRUD(40+ 资源) + AI(11) + config(10+) + parent-auth(9) + notifications(4) + health(1) + security + IM + backup |

### 0.3 CRUD 模式说明

所有教师端资源类控制器（~40个）继承 `CrudController<T>`，统一暴露 5 个端点：
- `POST /` — 创建
- `GET /` — 分页列表 (支持 ?classId=&skip=&take=&term=&date=)
- `GET /:id` — 详情
- `PATCH /:id` — 更新
- `DELETE /:id` — 删除

---

## 1. 测试用例矩阵（5 角色 × 页面 × CRUD）

### 1.1 R1 超管测试矩阵（优先 P0）

| TC-ID | 页面/模块 | 操作类型 | 测试场景 | 预期结果 | 优先级 |
|-------|-----------|---------|----------|----------|--------|
| TC-001 | 统一登录 `/auth/unified-login` | 认证 | 超管账号+密码登录 | 返回 JWT，role=super，重定向到 /super | P0 |
| TC-002 | 统一登录 | 认证 | 空用户名 | 400 错误 | P1 |
| TC-003 | 统一登录 | 认证 | 错误密码连续 7 次 | 第 7+ 次触发限流（10/min），返回 429 | P0 |
| TC-004 | 超管工作台 `/super` | 查询 | 登录后进入 | 展示学校总数、管理员总数、快捷入口卡片 | P0 |
| TC-005 | 学校管理 `/super/schools` | 查询 | 分页列表 | 展示所有学校，支持 skip/take 分页 | P0 |
| TC-006 | 学校管理 | 创建 | `POST /admin/schools` 含完整字段 | 创建成功，返回新学校 id | P0 |
| TC-007 | 学校管理 | 创建 | 学校名称为空 | 400 参数校验失败 | P1 |
| TC-008 | 学校管理 | 创建 | 学校名称重复 | 409 冲突 | P1 |
| TC-009 | 学校管理 | 查询 | `GET /admin/schools/:id` 详情 | 返回学校完整信息 | P1 |
| TC-010 | 学校管理 | 更新 | `PATCH /admin/schools/:id` 修改名称 | 更新成功 | P0 |
| TC-011 | 学校管理 | 删除 | `DELETE /admin/schools/:id` | 软删除，该学校数据不再展示 | P0 |
| TC-012 | 学校管理 | 批量 | `POST /admin/schools/batch-toggle` 批量停用 | 所选学校 enabled=false | P0 |
| TC-013 | 学校管理 | 批量 | 空 ids 数组 | 返回成功，无变更 | P2 |
| TC-014 | 管理员管理 `/super/admins` | 查询 | `GET /admin/school-admins` 分页 | 列表含学校名称、状态、创建时间 | P0 |
| TC-015 | 管理员管理 | 创建 | 含 schoolId、username、password | 创建成功，管理员可登录 | P0 |
| TC-016 | 管理员管理 | 创建 | username 重复 | 400/409 提示已存在 | P1 |
| TC-017 | 管理员管理 | 启停 | `PATCH .../:id/enabled` | 禁用后管理员无法登录 | P0 |
| TC-018 | 管理员管理 | 重置密码 | `PATCH .../:id/password` | 新密码生效，旧密码失效 | P0 |
| TC-019 | 管理员管理 | 删除 | `DELETE .../:id` | 移除成功 | P1 |
| TC-020 | 管理员管理 | 批量 | `batch-toggle` 批量启停 | 所有选中管理员状态一致变化 | P1 |
| TC-021 | 审计日志 `/super/audit-logs` | 查询 | `GET /admin/audit-logs` 含 schoolId 过滤 | 分页返回操作日志 | P0 |
| TC-022 | 审计日志 | 查询 | 不带过滤参数 | 返回全局日志 | P1 |
| TC-023 | 审计日志 | 查询 | 分页 skip/take | 分页正确 | P2 |
| TC-024 | 平台配置 `/super/config` | 查询 | `GET /config/app` | 返回所有配置项，密钥脱敏 | P0 |
| TC-025 | 平台配置 | 更新 | `PUT /config/app` 批量保存 | 配置即时生效 | P0 |
| TC-026 | 平台配置 | 单键 | `PUT /config/app/:key` | 单个键更新 | P1 |
| TC-027 | AI 服务商 `/super/ai-providers` | 查询 | `GET /ai-providers` | 列出所有服务商 | P0 |
| TC-028 | AI 服务商 | 创建 | `POST /ai-providers` | 新服务商可用 | P1 |
| TC-029 | AI 服务商 | 更新 | `PATCH /ai-providers/:code` | 配置更新 | P1 |
| TC-030 | AI 服务商 | 删除 | `DELETE /ai-providers/:code` | 移除服务商 | P1 |
| TC-031 | 教师管理 `/admin/teachers` | 查询 | 查看所有教师分页 | 跨学校列表 | P1 |
| TC-032 | 教师管理 | 清理 | `POST /admin/teachers/:id/clear-data` | 教师数据清空 | P1 |
| TC-033 | 全局重置 | 危险操作 | `POST /admin/reset-all` confirm=true | 全量数据重置 | P2 |
| TC-034 | 角色守卫 | 鉴权 | 超管访问 /teacher 路由 | 跳转 403 无权限 | P0 |
| TC-035 | 角色守卫 | 鉴权 | 超管访问 /school-admin 路由 | 跳转 403 无权限 | P0 |
| TC-036 | 角色守卫 | 鉴权 | 超管访问 /parent 路由 | 跳转 403 无权限 | P0 |

### 1.2 R2 校管测试矩阵（优先 P0）

| TC-ID | 页面/模块 | 操作类型 | 测试场景 | 预期结果 | 优先级 |
|-------|-----------|---------|----------|----------|--------|
| TC-101 | 登录 | 认证 | `POST /school-admin/login` | 返回 JWT，role=school_admin | P0 |
| TC-102 | 校管工作台 `/school-admin` | 查询 | `GET /school-admin/dashboard` | 本校教师数、班级数、学生数统计 | P0 |
| TC-103 | 教师列表 `/school-admin/teachers` | 查询 | `GET /school-admin/teachers` 分页 | 仅返回本校教师 | P0 |
| TC-104 | 教师管理 | 创建 | `POST /school-admin/teachers` | 教师创建成功，可登录 | P0 |
| TC-105 | 教师管理 | 批量创建 | `POST /school-admin/teachers/batch` | 批量写入成功 | P0 |
| TC-106 | 教师管理 | 导入 CSV | `POST /school-admin/teachers/import` base64 CSV | 解析成功，有效行入库 | P0 |
| TC-107 | 教师管理 | 导入预览 | `POST /school-admin/teachers/import-preview` | 返回校验明细含错误行 | P1 |
| TC-108 | 教师管理 | 导入 AI | `POST /school-admin/teachers/import-ai` 图片 | OCR + 大模型结构化 | P1 |
| TC-109 | 教师管理 | 更新 | `PATCH /school-admin/teachers/:id` | 信息更新成功 | P1 |
| TC-110 | 教师管理 | 功能权限 | `PATCH .../:id/features` 设置 features | 教师可见菜单变化 | P0 |
| TC-111 | 教师管理 | 重置密码 | `POST .../:id/reset-password` | 密码重置成功 | P0 |
| TC-112 | 教师管理 | 删除 | `DELETE .../:id` | 教师移除 | P1 |
| TC-113 | 教师管理 | 停用全部 | `POST /school-admin/teachers/deactivate-all` | 全校教师停用 | P2 |
| TC-114 | 教师管理 | 导出 CSV | `GET /school-admin/export/teachers` | 下载 CSV（BOM + UTF-8） | P0 |
| TC-115 | 教师管理 | 导出 XLSX | `GET /school-admin/export/teachers-xls` | 下载 xlsx 文件 | P1 |
| TC-116 | 班级列表 `/school-admin/classes` | 查询 | 列表含教师姓名、年级 | P0 |
| TC-117 | 班级管理 | 创建 | `POST /school-admin/classes` | 班级创建成功 | P0 |
| TC-118 | 班级管理 | 批量 | `POST /school-admin/classes/batch` | 批量写入 | P1 |
| TC-119 | 班级管理 | 导入 | `POST /school-admin/classes/import` | 解析 CSV 写入 | P1 |
| TC-120 | 班级管理 | 班级升级 | `POST .../:id/promote` | 年级+1，学生保留 | P0 |
| TC-121 | 班级管理 | 更新 | `PATCH .../:id` | 班主任/名称修改 | P1 |
| TC-122 | 班级管理 | 删除 | `DELETE .../:id` | 空班级可删除 | P1 |
| TC-123 | 班级管理 | 删除非空 | 班级有学生时删除 | 错误提示或学生转移 | P0 |
| TC-124 | 学生列表 `/school-admin/students` | 查询 | 全校学生列表 | 含班级、学号、家长信息 | P0 |
| TC-125 | 学生管理 | 批量创建 | `POST /school-admin/students/batch` | 跨班级批量写入 | P1 |
| TC-126 | 学生管理 | 导入文件 | `POST /school-admin/students/import` | 文件解析入库 | P0 |
| TC-127 | 学生管理 | 导入预览 | `POST /school-admin/students/import-preview` | 校验明细 | P1 |
| TC-128 | 学生管理 | 更新 | `PATCH .../:id` | 学生信息更新 | P1 |
| TC-129 | 学生管理 | 导出 CSV/XLSX | `export/students` / `export/students-xls` | 下载成功 | P1 |
| TC-130 | 学校公告 `/school-admin/notices` | 创建 | `POST /school-admin/notices` | 本校教师可见 | P0 |
| TC-131 | 学校公告 | 置顶 | `PATCH .../:id` pinned=true | 公告置顶显示 | P1 |
| TC-132 | 学校公告 | 删除 | `DELETE .../:id` | 公告移除 | P1 |
| TC-133 | 全局搜索 | 搜索 | `GET /school-admin/search?q=` | 返回教师/班级/学生匹配项 | P1 |
| TC-134 | 角色守卫 | 鉴权 | 校管访问 /super | 跳转 403 | P0 |
| TC-135 | 角色守卫 | 鉴权 | 校管访问 /teacher | 跳转 403 | P0 |
| TC-136 | 校管数据隔离 | 验证 | 校管 A 查看校管 B 的学校数据 | 不可见，仅返回本校 | P0 |

### 1.3 R3 教师测试矩阵（核心角色，覆盖 ≥ 25 个页面）

| TC-ID | 页面/模块 | 操作类型 | 测试场景 | 预期结果 | 优先级 |
|-------|-----------|---------|----------|----------|--------|
| **认证与个人空间** | | | | | |
| TC-201 | 教师登录 | 认证 | 账号+密码 `POST /auth/password-login` | JWT + role=teacher | P0 |
| TC-202 | 微信登录 | 认证 | `POST /auth/wechat-login` code | 未绑定返回 needsBind | P0 |
| TC-203 | 微信绑定 | 认证 | `POST /auth/bind-by-number` | 绑定成功后可微信登录 | P0 |
| TC-204 | 教师工作台 `/teacher` | 查询 | 进入 Dashboard | 班级概览、快捷入口 | P0 |
| TC-205 | 个人资料 `/teacher/profile` | 查询/更新 | `GET/PUT /users/me` | 信息读写 | P1 |
| TC-206 | 通知中心 `/teacher/notifications` | 查询 | `GET /notifications` 列表 | 分页通知 | P1 |
| TC-207 | 通知中心 | 已读 | `PATCH /notifications/:id/read` | 标记已读 | P2 |
| TC-208 | 通知中心 | 全部已读 | `POST /notifications/mark-all-read` | 全部标记 | P2 |
| TC-209 | 信息中心 `/teacher/messages` | 查询 | 消息列表 | 正确展示 | P1 |
| TC-210 | 待办事项 `/teacher/todos` | CRUD | 完整 CRUD 流程 | `POST/GET/PATCH/DELETE /todos` | P1 |
| TC-211 | 笔记 `/teacher/notes` | CRUD | 完整 CRUD 流程 | `POST/GET/PATCH/DELETE /notes` | P1 |
| TC-212 | 课表 `/teacher/schedule` | CRUD | `POST/GET/PATCH/DELETE /schedules` | 按学期/周展示 | P1 |
| TC-213 | 公告 `/teacher/notices` | 查询 | `GET /notices` classId 过滤 | 本校公告可见 | P1 |
| **班级与学生管理** | | | | | |
| TC-214 | 班级成员 `/teacher/classes` | 查询 | `GET /classes` + 学生列表 | 展示班级学生 | P0 |
| TC-215 | 班级成员 | CRUD | 学生 `POST/GET/PATCH/DELETE /students` | 完整 CRUD | P0 |
| TC-216 | 轮值表 `/teacher/duty-roster` | CRUD | `POST/GET/PATCH/DELETE /duty-rosters` | 按班级过滤 | P1 |
| TC-217 | 值日配置 `/teacher/duty-config` | CRUD | `POST/GET/PATCH/DELETE /class-duty-configs` | 配置模板 | P2 |
| TC-218 | 班费管理 `/teacher/class-finance` | CRUD | `POST/GET/PATCH/DELETE /class-expenses` | 收支记录 | P1 |
| TC-219 | 班级活动 `/teacher/class-activities` | CRUD | `POST/GET/PATCH/DELETE /class-activities` | 活动记录 | P1 |
| TC-220 | 班级风采 `/teacher/gallery` | CRUD | `POST/GET/PATCH/DELETE /class-galleries` | 图片上传展示 | P1 |
| TC-221 | 我的相册 `/teacher/my-gallery` | CRUD | `POST/GET/PATCH/DELETE /my-galleries` | 个人相册 | P2 |
| TC-222 | 座位表 `/teacher/tools/seatMap` | CRUD | `POST/GET/PATCH/DELETE /seat-layouts` | 拖拽排座 | P0 |
| **学情考试** | | | | | |
| TC-223 | 考试管理 `/teacher/exams` | CRUD | `POST/GET/PATCH/DELETE /exams` | 含科目设置 | P0 |
| TC-224 | 成绩管理 `/teacher/grades` | CRUD | `POST/GET/PATCH/DELETE /grades` | 按考试/科目录入 | P0 |
| TC-225 | 成绩管理 | 批量导入 | 批量录入 scores 数组 | 多学生一次写入 | P0 |
| TC-226 | 考试分析 `/teacher/exam-analysis` | AI | `POST /ai/analyze-exam` | SSE 流式分析报告 | P0 |
| TC-227 | 数据看板 `/teacher/data-dashboard` | 查询 | 班级成绩统计图表 | 趋势/分布可视 | P1 |
| TC-228 | 雷达图 `/teacher/radar` | 查询 | 学生多维度雷达图 | 各科对比可视化 | P1 |
| TC-229 | 成绩趋势 `/teacher/grade-trend` | 查询 | 历次成绩趋势 | 折线图 | P2 |
| TC-230 | 考勤 `/teacher/attendance` | CRUD | `POST/GET/PATCH/DELETE /attendances` | 按日/按人记录 | P0 |
| TC-231 | 作业 `/teacher/homework` | CRUD | `POST/GET/PATCH/DELETE /homework` | 按日期/科目 | P1 |
| **学生评价** | | | | | |
| TC-232 | 奖励记录 `/teacher/rewards` | CRUD | `POST/GET/PATCH/DELETE /reward-records` | 积分奖励 | P0 |
| TC-233 | 加减分 `/teacher/score-records` | CRUD | `POST/GET/PATCH/DELETE /score-records` | 加分/扣分 | P0 |
| TC-234 | 小组评分 `/teacher/group-scores` | CRUD | `POST/GET/PATCH/DELETE /group-scores` | 小组竞赛 | P1 |
| TC-235 | 排行榜 `/teacher/leaderboard` | 查询 | 积分排序展示 | 实时更新 | P1 |
| TC-236 | 成长记录 `/teacher/growth` | CRUD | `POST/GET/PATCH/DELETE /growth-entries` | 成长档案 | P0 |
| TC-237 | 行为记录 `/teacher/behavior` | CRUD | `POST/GET/PATCH/DELETE /behavior-records` | 行为观察 | P1 |
| TC-238 | 课外阅读 `/teacher/reading-log` | CRUD | `POST/GET/PATCH/DELETE /reading-logs` | 阅读记录 | P2 |
| TC-239 | 学生打卡 `/teacher/checkin` | CRUD | `POST/GET/PATCH/DELETE /checkins` | 打卡任务 | P1 |
| TC-240 | 奖项管理 `/teacher/awards` | CRUD | `POST/GET/PATCH/DELETE /award-records` | 获奖记录 | P1 |
| TC-241 | 奖项分类 `/teacher/award-categories` | CRUD | `POST/GET/PATCH/DELETE /award-categories` | 奖项模板 | P2 |
| **家校沟通** | | | | | |
| TC-242 | 家长联系 `/teacher/parent-contacts` | CRUD | `POST/GET/PATCH/DELETE /parent-contacts` | 沟通记录 | P0 |
| TC-243 | 家校沟通 `/teacher/im` | 即时通讯 | `GET /im/user-sig` → SDK 登录 | 消息收发 | P0 |
| TC-244 | 通知模板 `/teacher/notice-templates` | CRUD | `POST/GET/PATCH/DELETE /notice-templates` | 模板复用 | P1 |
| **AI 备课** | | | | | |
| TC-245 | AI 对话 `/teacher/ai-chat` | AI | `POST /ai/chat` SSE 流式 | 多轮对话 | P0 |
| TC-246 | AI 对话 | AI | `POST /ai/chat-sync` 同步 | 非流式响应 | P1 |
| TC-247 | 文生图 `/teacher/ai-image` | AI | `POST /ai/gen-image` | 返回图片 URL/base64 | P0 |
| TC-248 | AI 结构化解析 | AI | `POST /ai/parse` text+instruction | 返回结构化对象 | P1 |
| TC-249 | 文件解析 | AI | `POST /ai/parse-file` base64 文件 | 返回纯文本 | P1 |
| TC-250 | OCR | AI | `POST /ai/ocr` 图片 | 返回识别文本 | P2 |
| TC-251 | ASR | AI | `POST /ai/asr` 音频 | 返回转写文本 | P2 |
| TC-252 | 学情诊断 | AI | `POST /ai/diagnose` studentId | 个体诊断报告 | P1 |
| TC-253 | 考试分析 | AI | `POST /ai/analyze-exam` | 全班分析报告 | P0 |
| TC-254 | AI 限流 | 安全 | 教师连续 11 次 AI 调用/分钟 | 第 11+ 次返回 429 | P0 |
| TC-255 | 教案库 `/teacher/lesson-plans` | CRUD | `generated/lesson-plans` | 教案增删改查 | P0 |
| TC-256 | 知识点库 `/teacher/knowledges` | CRUD | `generated/knowledges` | 知识点管理 | P0 |
| TC-257 | 试卷库 `/teacher/papers` | CRUD | `generated/papers` | 试卷管理 | P1 |
| TC-258 | AI 生成教案 | AI | `POST /ai/chat` 教案 prompt | 教案模板生成 | P1 |
| TC-259 | AI 生成知识点 | AI | `POST /ai/chat` 知识点 prompt | 知识点结构化输出 | P1 |
| TC-260 | AI 生成试卷 | AI | `POST /ai/chat` 组卷 prompt | 试卷结构输出 | P1 |
| **课堂工具（抽样 10 个核心）** | | | | | |
| TC-261 | 随机点名 `/teacher/tools/picker` | 功能 | 从班级名单随机选 | 公平随机 | P1 |
| TC-262 | 随机分组 `/teacher/tools/grouper` | 功能 | 指定人数分组 | 无重叠 | P1 |
| TC-263 | 倒计时 `/teacher/tools/timer` | 功能 | 计时器正/倒计时 | 时间准确 | P2 |
| TC-264 | 加减分面板 `/teacher/tools/scorePanel` | 功能 | 快速加减分 | 同步服务端 | P0 |
| TC-265 | 座位表 `/teacher/tools/seatMap` | 功能 | 拖拽排座 + 保存 | 持久化 | P0 |
| TC-266 | 汉字笔顺 `/teacher/tools/strokeOrder` | 功能 | 输入汉字展示笔顺 | 动画正确 | P2 |
| TC-267 | 口算生成 `/teacher/tools/math` | 功能 | 配置参数生成题目 | 题目有效 | P1 |
| TC-268 | 单词卡片 `/teacher/tools/wordCard` | 功能 | 翻页展示 | 正确发音 | P2 |
| TC-269 | 评语生成 `/teacher/tools/comment` | AI | AI 生成评语 | 可复制使用 | P1 |
| TC-270 | 期末总结 `/teacher/tools/summary` | AI | AI 生成总结 | 可编辑 | P1 |
| **教师办公** | | | | | |
| TC-271 | 工作日志 `/teacher/work-log` | CRUD | `POST/GET/PATCH/DELETE /work-logs` | 日志管理 | P1 |
| TC-272 | 听课记录 `/teacher/lesson-obs` | CRUD | `POST/GET/PATCH/DELETE /lesson-observations` | 记录保存 | P1 |
| TC-273 | 教学日历 `/teacher/teaching-calendar` | CRUD | `POST/GET/PATCH/DELETE /teaching-calendar` | 按月查询 | P1 |
| TC-274 | 教师通讯录 `/teacher/teacher-directory` | 查询 | `GET /teachers` 本校列表 | 联系方式展示 | P1 |
| TC-275 | 教案模板 `/teacher/lesson-plan-templates` | CRUD | `lesson-plan-templates` | 模板复用 | P2 |
| TC-276 | 翻译 `/teacher/office-translate` | 功能 | 中英互译 | 翻译准确 | P2 |
| TC-277 | 文案模板库 `/teacher/plan-template-lib` | 查询 | 模板列表 | 分类清晰 | P2 |
| **游戏（抽样 5 个）** | | | | | |
| TC-278 | 24点 `/teacher/games/game24` | 功能 | 随机出题+判断 | 得分正确 | P2 |
| TC-279 | 成语填空 `/teacher/games/idiom` | 功能 | 填空+验证 | 判断正确 | P2 |
| TC-280 | 速算挑战 `/teacher/games/speedMath` | 功能 | 限时计算 | 计时准确 | P2 |
| TC-281 | 单词拼写 `/teacher/games/spelling` | 功能 | 听音拼写 | 正确判断 | P2 |
| TC-282 | 五子棋 `/teacher/games/gomoku` | 功能 | 双人对弈 | 胜负判定 | P2 |
| **教师功能权限** | | | | | |
| TC-283 | features 控制 | 鉴权 | 校管不给 features 的页面 | 不可见/不可访问 | P0 |
| TC-284 | features 控制 | 鉴权 | features=[''] 教师 | 全部可见 | P0 |
| TC-285 | features 控制 | 鉴权 | features=['exams','grades'] | 仅考试/成绩可见 | P0 |
| TC-286 | 数据隔离 | 验证 | 教师A查看教师B的班级数据 | 仅返回自己的数据 | P0 |
| TC-287 | 越权操作 | 安全 | 篡改 teacherId 字段创建资源 | 服务端覆盖为 JWT sub | P0 |

### 1.4 R4 家长测试矩阵

| TC-ID | 页面/模块 | 操作类型 | 测试场景 | 预期结果 | 优先级 |
|-------|-----------|---------|----------|----------|--------|
| TC-401 | 家长登录 | 认证 | `POST /parent-auth/login` 学号+密码 | JWT + role=parent | P0 |
| TC-402 | 家长登录 | 认证 | 错误密码连续 11 次 | 触发限流 429 | P1 |
| TC-403 | 微信绑定 | 认证 | `POST /parent-auth/bind-wechat` | openId 绑定成功 | P0 |
| TC-404 | 家长信息 | 查询 | `GET /parent-auth/me` | 本人信息+孩子列表 | P0 |
| TC-405 | 家长中心 `/parent` | 查询 | Dashboard 进入 | 孩子概览卡片 | P0 |
| TC-406 | 修改密码 | 操作 | `POST /parent-auth/change-password` | 旧密码校验 + 更新 | P1 |
| TC-407 | 班级通知 | 查询 | `GET /parent-auth/notices` | 孩子班级的通知 | P1 |
| TC-408 | 考试成绩 | 查询 | `GET /parent-auth/exams` | 孩子成绩明细+趋势 | P0 |
| TC-409 | 作业 | 查询 | `GET /parent-auth/homework` | 孩子班级作业 | P1 |
| TC-410 | 考勤 | 查询 | `GET /parent-auth/attendance` | 仅限绑定学生 | P0 |
| TC-411 | 行为表现 | 查询 | `GET /parent-auth/behavior` | 仅限绑定学生 | P1 |
| TC-412 | 课表+值日 | 查询 | `GET /parent-auth/schedule` | classId 隔离 | P1 |
| TC-413 | 家校沟通记录 | 查询 | `GET /parent-auth/communications` | 仅限绑定学生 | P0 |
| TC-414 | 微信订阅 | 操作 | `POST /parent-auth/subscribe` | openId 落库 | P2 |
| TC-415 | IM 通信 | 查询 | `GET /parent-auth/im-user-sig` | UserSig 可用于 IM SDK | P1 |
| TC-416 | 多娃切换 | 操作 | `POST /parent-auth/switch-student` | 切换视角，数据隔离 | P0 |
| TC-417 | 跨娃比对 `/parent/compare` | 查询 | `GET /parent-auth/compare-kids` | ≥2 娃可对比 | P0 |
| TC-418 | 师兼家激活 | 操作 | `POST /parent-auth/activate-parent` | 教师身份获得家长视图 | P2 |
| TC-419 | 家长数据隔离 | 验证 | 家长A访问非绑定学生数据 | 返回空或无权限 | P0 |
| TC-420 | 家长数据隔离 | 验证 | 直接调用教师 API | 角色守卫拦截 | P0 |
| TC-421 | 角色守卫 | 鉴权 | 家长访问 /teacher | 跳转 403 | P0 |
| TC-422 | 角色守卫 | 鉴权 | 家长访问 /school-admin | 跳转 403 | P0 |
| TC-423 | 角色守卫 | 鉴权 | 家长访问 /super | 跳转 403 | P0 |

### 1.5 R5 访客 + 通用测试矩阵

| TC-ID | 页面/模块 | 操作类型 | 测试场景 | 预期结果 | 优先级 |
|-------|-----------|---------|----------|----------|--------|
| TC-501 | 登录页 `/login` | 页面 | 访问登录页 | 正常渲染登录表单 | P0 |
| TC-502 | 未登录守卫 | 鉴权 | 直接访问 /teacher | 重定向到 /login?redirect= | P0 |
| TC-503 | 未登录守卫 | 鉴权 | 直接访问 /school-admin | 重定向到 /login | P0 |
| TC-504 | 未登录守卫 | 鉴权 | 直接访问 /super | 重定向到 /login | P0 |
| TC-505 | 未登录守卫 | 鉴权 | 直接访问 /parent | 重定向到 /login | P0 |
| TC-506 | 404 页面 | 页面 | 访问 /nonexistent | 展示 404 页面 | P1 |
| TC-507 | 已登录跳转 | 鉴权 | 已登录访问 /login | 重定向到角色工作台 | P1 |
| TC-508 | 后门登录码 | 认证 | loginCode 登录 | 无需密码直接进入 | P0 |
| TC-509 | JWT 过期 | 鉴权 | 使用过期 token | 401 → 清除状态 → 跳转登录 | P0 |
| TC-510 | 健康检查 | 运维 | `GET /health` | 返回 200 OK | P1 |
| TC-511 | Rate Limit 全局 | 安全 | 单 IP 60+ 次/分钟 | 429 Too Many Requests | P1 |
| TC-512 | CORS 配置 | 安全 | 跨域请求 | 正确 CORS 头 | P1 |

---

## 2. 测试数据准备方案

### 2.1 种子数据（Seed Data）

#### 2.1.1 超管账号

| 字段 | 值 | 说明 |
|------|-----|------|
| username | `superadmin` | 超管登录名 |
| password | `Super@2025!` | 强密码 |
| role | `super` | — |

#### 2.1.2 学校数据（2 所）

| 字段 | 学校 A | 学校 B |
|------|--------|--------|
| name | 阳光实验小学 | 星辰中学 |
| code | YG2025 | XC2025 |
| enabled | true | true |

#### 2.1.3 校管数据（每校 1 人）

| 字段 | 校管 A | 校管 B |
|------|--------|--------|
| username | admin_yg | admin_xc |
| password | Admin@2025! | Admin@2025! |
| schoolId | 学校A的ID | 学校B的ID |

#### 2.1.4 教师数据（每校 3 人，共 6 人）

| 序号 | 姓名 | 性别 | 学科 | 班级 | features |
|------|------|------|------|------|----------|
| T1 | 张老师 | 男 | 语文 | 三年级一班 | ['']（全功能） |
| T2 | 李老师 | 女 | 数学 | 三年级二班 | ['exams','grades','analysis','attendance'] |
| T3 | 王老师 | 女 | 英语 | 三年级一班 | ['ai','resources'] |
| T4 | 赵老师 | 男 | 物理 | 八年级一班 | ['']（全功能） |
| T5 | 钱老师 | 女 | 化学 | 八年级二班 | ['exams','grades','homework'] |
| T6 | 孙老师 | 女 | 生物 | 八年级一班 | ['rewards','growth','behavior'] |

#### 2.1.5 班级数据

| 学校 | 班级名 | 年级 | 班主任 | 学生数 |
|------|--------|------|--------|--------|
| A | 三年级一班 | 3 | 张老师 | 40 |
| A | 三年级二班 | 3 | 李老师 | 38 |
| A | 四年级一班 | 4 | — | 35 |
| B | 八年级一班 | 8 | 赵老师 | 45 |
| B | 八年级二班 | 8 | 钱老师 | 42 |

#### 2.1.6 学生数据（每班 5 人用于测试）

```
三年级一班 S001~S005: 姓名,性别,学号,家长姓名,家长电话
三年级二班 S006~S010
八年级一班 S011~S015
```

父账号使用学号+统一密码 `Parent@2025!`

#### 2.1.7 考试+成绩数据

| 考试名称 | 班级 | 科目 | 日期 | 学期 |
|----------|------|------|------|------|
| 期中考试 | 三年级一班 | 语文,数学,英语 | 2025-04-15 | 2025春 |
| 单元测验1 | 三年级一班 | 语文 | 2025-03-20 | 2025春 |
| 期中考试 | 八年级一班 | 物理,化学,生物 | 2025-04-20 | 2025春 |

每场考试录入 5 个学生的各科成绩（含 60 分以下、满分、缺考 null 场景）。

### 2.2 边界数据（Boundary Data）

| 场景 | 数据 | 预期行为 |
|------|------|----------|
| 极长名称 | 学校名称 200 字符 | 截断或报错 |
| 特殊字符 | 学生姓名含 emoji/Unicode | 正常存储和展示 |
| 空字段 | 家长电话为空 | 允许 null，前端不崩 |
| 超大班级 | 学生数 500 | 列表分页正常 |
| 分数边界 | 成绩 -1, 0, 100, 101, 999 | -1/101/999 拒绝，0/100 通过 |
| 分页边界 | skip=0, skip=99999, take=0, take=501 | take 截断到 500 |
| 日期边界 | 考试日期 1900-01-01, 2099-12-31 | 正常接受或范围校验 |
| 并发写入 | 2 个教师同时创建同名考试 | 不冲突，分别创建 |
| JSON 嵌套 | exam.subjects 为超大数组 [100 项] | 正常存储，响应不超时 |
| Base64 大文件 | parse-file 传 50MB 图片 | 拒绝或限流 |

### 2.3 异常数据（Error Data）

| 场景 | 请求 | 预期响应 |
|------|------|----------|
| SQL 注入 | `username: "'; DROP TABLE users;--"` | 参数化查询防护，正常返回 401 |
| XSS 攻击 | `name: "<script>alert(1)</script>"` | 存储原始字符串，前端编码展示 |
| 无效 JWT | `Authorization: Bearer fake.token.here` | 401 Unauthorized |
| 篡改 JWT | role 字段改为 super 的教师 token | 服务端不理客户端 role，仍按 sub 校验 |
| 缺失必填字段 | `POST /admin/schools` name 为空 | 400 参数校验 |
| 重复主键 | `POST /students` 重复 studentNo | 409 Conflict |
| 不存在的资源 | `GET /classes/nonexistent-id` | 404 |
| 越权访问 | 教师A `GET /grades` 教师B的 classId | 返回空列表（非 404，不暴露存在性） |
| 超大请求体 | `POST /students` body 10MB | 413 或截断 |
| 关闭学校 | 使用已关闭学校的教师 token | 401 或功能降级提示 |
| AI 服务商不可用 | `POST /ai/chat` 时 baseUrl 不通 | 返回错误消息，不崩溃 |
| 微信 code 无效 | `POST /auth/wechat-login` 无效 code | 返回错误，不泄露内部信息 |

---

## 3. 端到端测试场景（E2E）

### 3.1 E2E-01：超管全生命周期

```
场景：超管登录 → 建学校 → 建校管 → 查看审计日志 → 配置平台 → 退出

步骤：
1. 访问 /login → 输入 superadmin 凭证 → 登录成功
2. 重定向到 /super → Dashboard 加载完成
3. 进入学校管理 → 新建学校「育英中学」→ 验证列表中出现
4. 进入管理员管理 → 新建校管 admin_yy → 设置密码
5. 用 admin_yy 在新窗口登录 → 验证可进入 /school-admin
6. 返回超管窗口 → 进入审计日志 → 验证刚才的操作被记录
7. 进入平台配置 → 修改学期为「2025秋」→ 保存
8. 进入 AI 服务商 → 查看列表
9. 退出 → 验证跳转到 /login
10. 重新访问 /super → 验证被重定向到 /login（无 JWT）
```

### 3.2 E2E-02：校管教师管理全流程

```
场景：校管登录 → 批量导入教师 → 设置功能权限 → 教师登录验证 → 导出

步骤：
1. 校管 admin_yg 登录 → 进入 /school-admin
2. 查看 Dashboard → 验证现有教师/班级/学生数
3. 进入教师管理 → 点击批量导入 → 上传 CSV（含 10 名教师）
4. 验证导入成功 → 10 名新教师出现在列表中
5. 选一名教师 → 修改 features 为 ['exams','grades']
6. 重置某教师密码
7. 用该教师新密码登录 → 验证仅能看到考试和成绩菜单
8. 返回校管 → 导出教师 CSV/XLSX → 验证下载文件内容正确
9. 退出
```

### 3.3 E2E-03：教师核心教学流程（最长链）

```
场景：教师登录 → 管班级 → 排座 → 录成绩 → AI 分析 → 家校沟通 → 评价学生

步骤：
1. 张老师登录 → Dashboard 展示三年级一班
2. 进入班级成员 → 查看 40 名学生列表
3. 进入座位表 → 拖拽排座 → 保存布局
4. 进入考试管理 → 新建「期末模拟考」→ 设置语数英三科
5. 进入成绩管理 → 选择该考试 → 逐学生录入分数
6. 进入考试分析 → 点击「AI 分析」→ 等待 SSE 流式报告
7. 查看数据看板 → 验证图表数据正确
8. 进入雷达图 → 选择一名学生 → 查看各科雷达图
9. 进入家校沟通 → 给某家长发送消息
10. 进入奖励记录 → 给满分学生加积分
11. 进入排行榜 → 验证积分排序正确
12. 退出
```

### 3.4 E2E-04：家长全流程

```
场景：家长登录 → 查看孩子 → 多娃切换 → 跨娃对比 → 查成绩 → 查作业 → 退出

步骤：
1. 家长用学号 S001 + 密码登录 → 进入 /parent
2. Dashboard 展示孩子信息
3. 查看考试成绩 → 验证历次成绩趋势
4. 查看作业 → 验证当天/本周作业
5. 查看考勤 → 验证孩子出勤记录
6. 查看行为表现 → 验证记录
7. 查看课表 → 验证本周课表
8. （多娃家长）切换学生 → 切换到另一个孩子 → 数据变化
9. 进入跨娃比对 → 两娃成绩对比图表
10. 退出
```

### 3.5 E2E-05：微信小程序全流程

```
场景：小程序启动 → 微信登录 → 绑定教师 → 核心操作 → 退出

步骤：
1. 打开小程序 → 进入登录页
2. 点击微信登录 → wx.login 获取 code → POST /auth/wechat-login
3. 首次使用：needsBind=true → 输入教师编号和密码 → 绑定成功
4. 进入工作台 Tab → 查看班级概览
5. 进入班级 Tab → 学生列表 + 下拉刷新
6. 进入学生 Tab → 搜索学生 → 查看详情
7. 进入工具箱 Tab → 随机点名 → 倒计时
8. 进入设置 Tab → 个人资料
9. 切换页面 → 验证分包预加载正常
10. 退出/切换账号
```

### 3.6 E2E-06：CORS + 鉴权 + 限流全局链

```
场景：验证全站安全基础设施

步骤：
1. 未登录访问任意教师 API → 401
2. 教师登录后访问 /admin/schools → 403（角色不匹配）
3. 教师连续调用 AI chat 11 次 → 第 11 次 429
4. 使用过期 JWT 访问 → 401 → 前端清除状态 → 跳转登录
5. 在请求 body 中注入 teacherId → 服务端覆盖为 JWT sub
6. 跨域 OPTIONS 预检请求 → 正确的 CORS 头
7. XSS payload 在名称字段 → 前端正确转义
```

---

## 4. 每角色页面覆盖清单（≥ 10 个页面/角色）

### 4.1 超管（6 个页面 — 全覆盖）

| 页面 | TC 覆盖 |
|------|---------|
| Super Dashboard | TC-004 |
| Schools 学校管理 | TC-005~013 |
| Admins 管理员管理 | TC-014~020 |
| AuditLogs 审计日志 | TC-021~023 |
| PlatformConfig 平台配置 | TC-024~026 |
| AiProviders AI 服务商 | TC-027~030 |

### 4.2 校管（5 个页面 — 全覆盖）

| 页面 | TC 覆盖 |
|------|---------|
| SchoolAdmin Dashboard | TC-102 |
| Teachers 教师管理 | TC-103~115 |
| Classes 班级管理 | TC-116~123 |
| Students 学生管理 | TC-124~129 |
| Notices 学校公告 | TC-130~132 |

### 4.3 教师（25+ 个页面 — 核心覆盖）

| 分类 | 覆盖页面 |
|------|---------|
| 个人空间 | Dashboard, Notifications, Messages, Profile, Todos, Notes, Schedule |
| 班级学生 | Classes, DutyRoster, ClassFinance, ClassActivities, Gallery, SeatMap |
| 学情考试 | Exams, Grades, ExamAnalysis, DataDashboard, Radar, Attendance, Homework |
| 学生评价 | Rewards, ScoreRecords, Leaderboard, Growth, Checkin, Awards |
| 家校沟通 | ParentContacts, Im, NoticeTemplates |
| AI 备课 | AiChat, ImageCreation, LessonPlans, Knowledges, Papers |
| 课堂工具 | Picker, Grouper, Timer, ScorePanel, Math, StrokeOrder, WordCard, Comment |
| 办公 | WorkLog, LessonObs, TeachingCalendar, TeacherDirectory |
| 游戏 | Game24, Idiom, SpeedMath, Spelling, Gomoku |

### 4.4 家长（2 个页面 — 全覆盖）

| 页面 | TC 覆盖 |
|------|---------|
| Parent Dashboard | TC-404~416 |
| KidsCompare | TC-417 |

---

## 5. 可执行测试脚本伪代码结构

### 5.1 测试框架选型建议

```
端          框架              说明
Web         Playwright        E2E + API 测试合一，支持多浏览器
小程序       miniprogram-automator  微信官方自动化，结合 Jest
后端 API     Supertest + Jest  NestJS 集成测试，可直接注入模块
性能        k6 / Artillery    压力 + 限流验证
```

### 5.2 Web 端 Playwright 伪代码

```typescript
// test/web/pre-launch.spec.ts

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'
const API  = 'http://localhost:3000'

// ============ TC-001 超管登录 ============
test('TC-001: Super admin login', async ({ page }) => {
  await page.goto(`${BASE}/#/login`)
  await page.fill('[data-testid="username"]', 'superadmin')
  await page.fill('[data-testid="password"]', 'Super@2025!')
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL('**/super')
  expect(await page.textContent('[data-testid="page-title"]')).toContain('超管工作台')
})

// ============ TC-003 登录限流 ============
test('TC-003: Login rate limit', async ({ request }) => {
  for (let i = 0; i < 11; i++) {
    const res = await request.post(`${API}/auth/unified-login`, {
      data: { username: 'superadmin', password: 'wrong' }
    })
    if (i >= 10) expect(res.status()).toBe(429)
    else expect(res.status()).toBe(401)
  }
})

// ============ TC-005 学校分页 ============
test('TC-005: School pagination', async ({ request }) => {
  const token = await getSuperToken(request)
  const res = await request.get(`${API}/admin/schools?skip=0&take=10`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeLessThanOrEqual(10)
})

// ============ TC-010 更新学校 ============
test('TC-010: Update school', async ({ request }) => {
  const token = await getSuperToken(request)
  // 先创建
  const create = await request.post(`${API}/admin/schools`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: '测试学校_TC010', code: 'TC010' }
  })
  const { id } = await create.json()
  // 更新
  const update = await request.patch(`${API}/admin/schools/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: '测试学校_TC010_已修改' }
  })
  expect(update.status()).toBe(200)
  // 验证
  const get = await request.get(`${API}/admin/schools/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect((await get.json()).name).toBe('测试学校_TC010_已修改')
})

// ============ TC-034 角色守卫 ============
test('TC-034: Role guard - super accesses teacher route', async ({ page }) => {
  await loginAsSuper(page)
  await page.goto(`${BASE}/#/teacher`)
  await page.waitForURL('**/forbidden')
  expect(await page.textContent('body')).toContain('无权限')
})

// ============ TC-201 教师 CRUD 流程 ============
test('TC-201: Teacher full CRUD flow', async ({ request }) => {
  const token = await getTeacherToken(request, 'teacher1', 'Teacher@2025!')

  // CREATE
  const create = await request.post(`${API}/students`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: '测试学生', gender: '男', studentNo: 'TEST001' }
  })
  expect(create.status()).toBe(201)
  const { id } = await create.json()

  // READ LIST
  const list = await request.get(`${API}/students?take=100`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(list.status()).toBe(200)

  // READ ONE
  const get = await request.get(`${API}/students/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(get.status()).toBe(200)

  // UPDATE
  const update = await request.patch(`${API}/students/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: '测试学生_已修改' }
  })
  expect(update.status()).toBe(200)

  // DELETE
  const del = await request.delete(`${API}/students/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(del.status()).toBe(200)

  // VERIFY DELETED
  const afterDel = await request.get(`${API}/students/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(afterDel.status()).toBe(404)
})

// ============ TC-254 AI 限流 ============
test('TC-254: AI rate limit', async ({ request }) => {
  const token = await getTeacherToken(request, 'teacher1')
  for (let i = 0; i < 11; i++) {
    const res = await request.post(`${API}/ai/chat-sync`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { messages: [{ role: 'user', content: 'hi' }] }
    })
    if (i >= 10) expect(res.status()).toBe(429)
  }
})

// ============ TC-286 数据隔离 ============
test('TC-286: Teacher data isolation', async ({ request }) => {
  const t1 = await getTeacherToken(request, 'teacher1')
  const t2 = await getTeacherToken(request, 'teacher2')

  // teacher1 创建学生
  const c = await request.post(`${API}/students`, {
    headers: { Authorization: `Bearer ${t1}` },
    data: { name: 'T1学生', gender: '女', studentNo: 'ISO001' }
  })
  const { id } = await c.json()

  // teacher2 尝试读取
  const r = await request.get(`${API}/students/${id}`, {
    headers: { Authorization: `Bearer ${t2}` }
  })
  expect(r.status()).toBe(404) // 不暴露存在性

  // teacher2 列表不包含
  const l = await request.get(`${API}/students`, {
    headers: { Authorization: `Bearer ${t2}` }
  })
  const list = await l.json()
  expect(list.find((s: any) => s.id === id)).toBeUndefined()
})

// ============ TC-509 JWT 过期 ============
test('TC-509: Expired JWT handling', async ({ request }) => {
  const expiredToken = 'eyJhbGciOi...expired...'
  const res = await request.get(`${API}/students`, {
    headers: { Authorization: `Bearer ${expiredToken}` }
  })
  expect(res.status()).toBe(401)
})
```

### 5.3 小程序端自动化伪代码

```javascript
// test/mini-program/pre-launch.spec.js
const automator = require('miniprogram-automator')

describe('小程序冒烟测试', () => {
  let miniProgram

  beforeAll(async () => {
    miniProgram = await automator.launch({
      projectPath: 'mini-program/dist/build/mp-weixin'
    })
  })

  test('TC-MP-001: 启动 → 登录页 → TabBar 展示', async () => {
    const page = await miniProgram.currentPage()
    expect(page.path).toBe('pages/login/login')

    // 模拟登录
    await page.callMethod('doLogin', 'teacher1', 'Teacher@2025!')
    await miniProgram.waitFor(1000)

    // 验证跳转到工作台
    const dp = await miniProgram.currentPage()
    expect(dp.path).toBe('pages/dashboard/dashboard')

    // 验证 TabBar
    const tabBar = await miniProgram.evaluate(() => {
      return getApp().globalData.tabBarVisible
    })
    expect(tabBar).toBe(true)
  })

  test('TC-MP-002: 五个 Tab 切换', async () => {
    const tabs = ['工作台', '班级', '学生', '工具箱', '设置']
    for (const tab of tabs) {
      await miniProgram.switchTab(tab)
      const page = await miniProgram.currentPage()
      expect(page.path).not.toBeNull()
    }
  })

  test('TC-MP-003: 课堂教学工具链', async () => {
    await miniProgram.navigateTo('/pages/toolbox/toolbox')
    // 随机点名
    await miniProgram.navigateTo('/pages/tools/picker')
    const picker = await miniProgram.currentPage()
    // 点击随机点名按钮
    await picker.tapElement('.random-btn')
    // 验证结果
    const result = await picker.$('.result-name')
    expect(await result.text()).toBeTruthy()
  })

  test('TC-MP-004: 分包加载', async () => {
    // 游戏分包
    await miniProgram.navigateTo('/pages/games/index')
    let page = await miniProgram.currentPage()
    expect(page.path).toBe('pages/games/index')

    // 工具分包
    await miniProgram.navigateTo('/pages/tools/timer')
    page = await miniProgram.currentPage()
    expect(page.path).toBe('pages/tools/timer')

    // AI 分包
    await miniProgram.navigateTo('/pages/ai/ai')
    page = await miniProgram.currentPage()
    expect(page.path).toBe('pages/ai/ai')
  })

  test('TC-MP-005: 下拉刷新', async () => {
    await miniProgram.switchTab('班级')
    const page = await miniProgram.currentPage()
    // 触发下拉刷新
    await page.callMethod('onPullDownRefresh')
    await miniProgram.waitFor(1000)
    // 验证刷新完成
    const refreshed = await miniProgram.evaluate(() => {
      return getApp().globalData.lastRefreshTime
    })
    expect(refreshed).toBeTruthy()
  })

  afterAll(async () => {
    await miniProgram.close()
  })
})
```

### 5.4 后端 API 集成测试伪代码

```typescript
// test/server/pre-launch.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Pre-Launch API Integration', () => {
  let app: INestApplication
  let superToken: string
  let adminToken: string
  let teacherToken: string
  let parentToken: string
  let schoolId: string
  let classId: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
  })

  // ===== 认证流程 =====
  describe('Auth Flow', () => {
    it('TC-001: super admin login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/unified-login')
        .send({ username: 'superadmin', password: 'Super@2025!' })
      expect(res.status).toBe(201)
      expect(res.body.access_token).toBeDefined()
      expect(res.body.role).toBe('super')
      superToken = res.body.access_token
    })

    it('admin login', async () => {
      const res = await request(app.getHttpServer())
        .post('/school-admin/login')
        .send({ username: 'admin_yg', password: 'Admin@2025!' })
      expect(res.status).toBe(201)
      adminToken = res.body.access_token
    })

    it('teacher login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/password-login')
        .send({ username: 'teacher1', password: 'Teacher@2025!' })
      expect(res.status).toBe(201)
      teacherToken = res.body.access_token
    })

    it('parent login', async () => {
      const res = await request(app.getHttpServer())
        .post('/parent-auth/login')
        .send({ studentNo: 'S001', password: 'Parent@2025!' })
      expect(res.status).toBe(201)
      parentToken = res.body.access_token
    })
  })

  // ===== 超管 CRUD =====
  describe('Super Admin CRUD', () => {
    it('TC-006: create school', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/schools')
        .auth(superToken, { type: 'bearer' })
        .send({ name: 'E2E测试学校', code: 'E2E001' })
      expect(res.status).toBe(201)
      schoolId = res.body.id
    })

    it('should reject empty school name', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/schools')
        .auth(superToken, { type: 'bearer' })
        .send({ name: '' })
      expect(res.status).toBe(400)
    })
  })

  // ===== 角色守卫 =====
  describe('Role Guards', () => {
    it('TC-034: super cannot access teacher routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .auth(superToken, { type: 'bearer' })
      expect(res.status).toBe(403)
    })

    it('teacher cannot access admin routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/schools')
        .auth(teacherToken, { type: 'bearer' })
      expect(res.status).toBe(403)
    })

    it('anonymous cannot access protected routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
      expect(res.status).toBe(401)
    })
  })

  // ===== 数据隔离 =====
  describe('Data Isolation', () => {
    it('TC-286: teacher data isolation', async () => {
      // 教师A创建
      const c = await request(app.getHttpServer())
        .post('/students')
        .auth(teacherToken, { type: 'bearer' })
        .send({ name: '隔离测试', gender: '女', studentNo: 'ISO001' })
      const id = c.body.id

      // 教师B无法访问（换成 teacher2 token）
      const teacher2Token = await getToken('teacher2')
      const r = await request(app.getHttpServer())
        .get(`/students/${id}`)
        .auth(teacher2Token, { type: 'bearer' })
      expect(r.status).toBe(404)
    })

    it('TC-419: parent data isolation', async () => {
      // 家长只能看到自己孩子的数据
      const res = await request(app.getHttpServer())
        .get('/parent-auth/attendance')
        .auth(parentToken, { type: 'bearer' })
      expect(res.status).toBe(200)
      // 不应包含其他学生的考勤记录
    })
  })

  // ===== 限流 =====
  describe('Rate Limiting', () => {
    it('TC-254: AI rate limit 10/min', async () => {
      for (let i = 0; i < 11; i++) {
        const res = await request(app.getHttpServer())
          .post('/ai/chat-sync')
          .auth(teacherToken, { type: 'bearer' })
          .send({ messages: [{ role: 'user', content: 'hi' }] })
        if (i >= 10) {
          expect(res.status).toBe(429)
        }
      }
    })
  })

  afterAll(async () => {
    await app.close()
  })
})
```

### 5.5 性能与压力测试伪代码（k6）

```javascript
// test/perf/k6-load-test.js
import http from 'k6/http'
import { check, sleep, group } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 爬坡到 20 VU
    { duration: '1m',  target: 50 },   // 到 50 VU
    { duration: '30s', target: 0  },   // 冷却
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% 请求 < 2s
    http_req_failed:    ['rate<0.05'], // 错误率 < 5%
  },
}

export default function () {
  // 登录
  const loginRes = http.post(`${BASE}/auth/password-login`, JSON.stringify({
    username: 'teacher1', password: 'Teacher@2025!'
  }), { headers: { 'Content-Type': 'application/json' } })
  const token = loginRes.json('access_token')
  const headers = { Authorization: `Bearer ${token}` }

  group('Dashboard', () => {
    const res = http.get(`${BASE}/students?take=20`, { headers })
    check(res, { 'status 200': (r) => r.status === 200 })
  })

  group('CRUD cycle', () => {
    // CREATE
    const c = http.post(`${BASE}/students`, JSON.stringify({
      name: `Perf_${Date.now()}`, gender: '男', studentNo: `P${Date.now()}`
    }), { headers: { ...headers, 'Content-Type': 'application/json' } })
    check(c, { 'created': (r) => r.status === 201 })

    const id = c.json('id')
    if (id) {
      // READ
      http.get(`${BASE}/students/${id}`, { headers })
      // UPDATE
      http.patch(`${BASE}/students/${id}`, JSON.stringify({ name: 'updated' }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
      // DELETE
      http.del(`${BASE}/students/${id}`, null, { headers })
    }
  })

  sleep(1)
}
```

---

## 6. 测试执行计划

### 6.1 分阶段执行

| 阶段 | 内容 | 预估工时 | 阻塞条件 |
|------|------|----------|----------|
| Phase 0 | 环境准备：种子数据入库、测试账号创建、Playwright/Supertest 环境搭建 | 2h | 数据库连接 |
| Phase 1 | P0 用例执行（TC-001 ~ TC-509 中标注 P0 的用例） | 8h | Phase 0 |
| Phase 2 | P1 用例执行 | 12h | Phase 1 完成 |
| Phase 3 | P2 用例 + 边界/异常测试 | 6h | Phase 2 |
| Phase 4 | E2E 场景（6 条完整链路） | 8h | Phase 1 |
| Phase 5 | 小程序端冒烟测试 | 4h | 小程序环境 |
| Phase 6 | 性能测试（k6 脚本） | 4h | Phase 1 |
| Phase 7 | 缺陷修复 + 回归测试 | TBD | Bug 数量 |
| Phase 8 | 上线前最终冒烟 | 2h | 所有已知 P0/P1 缺陷关闭 |

### 6.2 测试环境要求

| 环境 | 说明 |
|------|------|
| 数据库 | MySQL 8.0，独立测试库，种子数据预导入 |
| Web 前端 | Vite dev server (port 5173) 或生产构建 |
| 后端 API | NestJS (port 3000)，`.env.test` 配置 |
| 小程序 | 微信开发者工具 + miniprogram-automator |
| AI 模拟 | Mock AI 服务商端点（避免依赖外部 API + 消耗额度） |

---

## 7. 报告模板

### 7.1 单轮测试报告

```
# QA Report — Round N
Date: YYYY-MM-DD | Environment: {env} | Branch: {branch}

## Summary
- Total: N | Passed: P | Failed: F | Blocked: B | Skipped: S
- Health Score: {P/N * 100}

## Failed Cases
| TC-ID | Module | Severity | Description | Reproduction | Screenshot |
|-------|--------|----------|-------------|-------------|------------|
|       |        |          |             |             |            |

## New Issues Found
| ID | Module | Type | Severity | Steps |
|----|--------|------|----------|-------|
|    |        |      |          |       |

## Recommendations
- 
```

### 7.2 上线签核清单

```
☐ P0 测试全部通过（TC-xxx ~ TC-xxx）
☐ E2E 场景全部通过（6/6）
☐ 角色守卫无绕过
☐ 数据隔离验证通过
☐ 限流机制生效
☐ JWT 过期/篡改防护验证
☐ 小程序分包预加载正常
☐ 性能压测通过（p95 < 2s）
☐ 无已知 P0/P1 缺陷
☐ 种子数据可用于全新部署
☐ 回滚方案已验证
☐ QA Lead 签核: ________
☐ 开发负责人签核: ________
```

---

*本文档基于代码扫描自动生成，覆盖 Web 端 125+ 路由、小程序端 70+ 页面、后端 45+ 控制器。未参考任何已有文档。*
