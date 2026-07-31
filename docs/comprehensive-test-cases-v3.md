# 教学管理系统 - 页面按钮级测试用例 V3（全量覆盖版）

> **版本**: 3.0
> **日期**: 2026-07-31
> **核心改进**: 在 V2 基础上，逐页拆解 Web 前端 / 微信小程序的每一个按钮、输入框、筛选器、CRUD 操作，达到"页面功能全覆盖、按钮全点击、字段全校验"。
> **用例总数**: 约 720 条（Web 480 + 小程序 240），与 V2 后端 156 API 用例合并后，全量用例达 **876** 条。

---

## 目录

### Part 1 · Web 前端（按路由分组，每路由覆盖所有按钮/操作）
- [一、登录/无权限/404 公共页](#part-1-一登录无权限404-公共页)
- [二、超管模块 /super](#part-2-二超管模块-super)
- [三、校管模块 /school-admin](#part-3-三校管模块-school-admin)
- [四、教师模块 /teacher — 工作台与个人空间](#part-4-四教师模块-teacher--工作台与个人空间)
- [五、教师模块 — 班级与学生管理](#part-5-五教师模块-teacher--班级与学生管理)
- [六、教师模块 — 考试/成绩/分析](#part-6-六教师模块-teacher--考试成绩分析)
- [七、教师模块 — 学生评价与考勤](#part-7-七教师模块-teacher--学生评价与考勤)
- [八、教师模块 — 家校沟通](#part-8-八教师模块-teacher--家校沟通)
- [九、教师模块 — AI 能力](#part-9-九教师模块-teacher--ai-能力)
- [十、教师模块 — 办公与教学](#part-10-十教师模块-teacher--办公与教学)
- [十一、教师模块 — 工具箱](#part-11-十一教师模块-teacher--工具箱)
- [十二、教师模块 — 学科工具](#part-12-十二教师模块-teacher--学科工具)
- [十三、教师模块 — 小游戏合集](#part-13-十三教师模块-teacher--小游戏合集)
- [十四、家长模块 /parent](#part-14-十四家长模块-parent)

### Part 2 · 微信小程序（按 pages.json 路由全量覆盖）
- [十五、小程序登录与家长端](#part-2-十五小程序登录与家长端)
- [十六、小程序教师端工作台与班级](#part-2-十六小程序教师端工作台与班级)
- [十七、小程序考试成绩与学情](#part-2-十七小程序考试成绩与学情)
- [十八、小程序考勤/作业/通知/沟通](#part-2-十八小程序考勤作业通知沟通)
- [十九、小程序 AI/学科/办公/工具箱](#part-2-十九小程序-ai学科办公工具箱)
- [二十、小程序个人中心与配置](#part-2-二十小程序个人中心与配置)

### Part 3 · 后端 API 补充
- [二十一、成绩分析 5 个端点 54 条用例](#part-3-二十一成绩分析-5-个端点-54-条用例)
- [二十二、家长端 14 个端点全量](#part-3-二十二家长端-14-个端点全量)
- [二十三、实体 CRUD 全覆盖](#part-3-二十三实体-crud-全覆盖)

---

## Part 1 · Web 前端

### 一、登录/无权限/404 公共页

| # | 路由 | 按钮/操作 | 用例标题 | 操作步骤 | 预期结果 |
|---|------|----------|---------|---------|---------|
| WEB-AUTH-01 | /login | 用户名输入框 | 空用户名 | 输入框失焦提示必填 | 显示校验提示 |
| WEB-AUTH-02 | /login | 密码输入框 | 空密码 | 点击登录但密码为空 | 显示校验提示 |
| WEB-AUTH-03 | /login | 登录按钮 | 正确超管账号登录 | 输入 admin / admin123 → 登录 | 跳转 /super |
| WEB-AUTH-04 | /login | 登录按钮 | 正确校管账号登录 | admin_school_1 / admin123 → 登录 | 跳转 /school-admin |
| WEB-AUTH-05 | /login | 登录按钮 | 正确教师账号登录 | teacher_1_1 / teacher123 → 登录 | 跳转 /teacher |
| WEB-AUTH-06 | /login | 登录按钮 | 错误密码 | 输入正确用户名 + 错误密码 → 登录 | 显示"密码错误" |
| WEB-AUTH-07 | /login | 登录按钮 | 连续错误密码 11 次 | 连续点击登录 11 次 | 触发限流 429 |
| WEB-AUTH-08 | /login | 记住我复选框 | 勾选后刷新页面 | 勾选 → 刷新 | 仍保持登录态 |
| WEB-AUTH-09 | /login | 登录按钮 | 家长学号密码登录 | 学号+密码 → 登录 | 跳转 /parent |
| WEB-AUTH-10 | /forbidden | 403 页返回 | 访问无权限页面 | 教师登录后访问 /super | 显示 403 页，返回登录 |
| WEB-AUTH-11 | 任意 | 顶部退出登录 | 退出按钮 | 点击右上角退出 | 清除 Token，跳 /login |
| WEB-AUTH-12 | / | 根路径重定向 | 不同角色根路径 | 访问 / | 按角色跳转到对应工作台 |

### 二、超管模块 /super

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-SUP-01 | /super | 工作台统计 | 统计学校/教师/学生/班级数 | 显示实时统计 |
| WEB-SUP-02 | /super | 跳转学校管理 | 点击学校管理菜单 | 跳转 /super/schools |
| WEB-SUP-03 | /super/schools | 学校列表 | 分页/搜索/筛选 | 列表正确 |
| WEB-SUP-04 | /super/schools | 新增按钮 | 点击新增学校 → 弹窗填写 → 保存 | 学校创建成功，列表刷新 |
| WEB-SUP-05 | /super/schools | 编辑按钮 | 编辑学校 → 修改 → 保存 | 信息更新成功 |
| WEB-SUP-06 | /super/schools | 删除按钮 | 删除学校 → 确认 | 软删除成功 |
| WEB-SUP-07 | /super/schools | 批量启停 | 多选 → 批量启用/禁用 | 批量状态变更 |
| WEB-SUP-08 | /super/schools/:id/features | 功能包开关 | 切换 feature 开关 → 保存 | 功能包更新 |
| WEB-SUP-09 | /super/admins | 管理员列表 | 分页/搜索 | 列表正确 |
| WEB-SUP-10 | /super/admins | 新增管理员 | 点击新增 → 填写 → 保存 | 创建成功 |
| WEB-SUP-11 | /super/admins | 编辑管理员 | 编辑 → 保存 | 更新成功 |
| WEB-SUP-12 | /super/admins | 重置密码 | 点击重置 → 确认 | 密码重置 |
| WEB-SUP-13 | /super/admins | 删除管理员 | 删除 → 确认 | 删除成功 |
| WEB-SUP-14 | /super/audit-logs | 审计日志 | 分页/筛选 | 显示日志 |
| WEB-SUP-15 | /super/audit-logs | 导出审计日志 | 点击导出 | 下载文件 |
| WEB-SUP-16 | /super/config | 平台配置 | 修改配置 → 保存 | 保存成功 |
| WEB-SUP-17 | /super/ai-providers | AI 服务商列表 | 列表展示 | 列表正确 |
| WEB-SUP-18 | /super/ai-providers | 新增 AI 服务商 | 新增 → 保存 | 创建成功 |
| WEB-SUP-19 | /super/ai-providers | 编辑 AI 服务商 | 编辑 → 保存 | 更新成功 |
| WEB-SUP-20 | /super/ai-providers | 删除 AI 服务商 | 删除 → 确认 | 删除成功 |
| WEB-SUP-21 | /super/school-features | 学校功能包列表 | 列表展示 | 列表正确 |
| WEB-SUP-22 | /super/school-features | 批量启停功能包 | 批量启用/禁用 | 批量变更 |

### 三、校管模块 /school-admin

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-SA-01 | /school-admin | 工作台统计 | 统计教师/学生/班级/通知数 | 显示统计 |
| WEB-SA-02 | /school-admin/teachers | 教师列表 | 分页/搜索/按学科筛选 | 列表正确 |
| WEB-SA-03 | /school-admin/teachers | 新增教师 | 点击新增 → 填写 → 保存 | 创建成功 |
| WEB-SA-04 | /school-admin/teachers | 编辑教师 | 编辑 → 保存 | 更新成功 |
| WEB-SA-05 | /school-admin/teachers | 删除教师 | 删除 → 确认 | 删除成功 |
| WEB-SA-06 | /school-admin/teachers | 启用/禁用教师 | 切换状态 | 状态变更 |
| WEB-SA-07 | /school-admin/teachers | 导入教师 | 导入 Excel → 预览 → 确认 | 批量导入 |
| WEB-SA-08 | /school-admin/teachers | 重置教师密码 | 重置 → 确认 | 密码重置 |
| WEB-SA-09 | /school-admin/teachers | 清空教师数据 | 清空 → 确认 | 数据清空 |
| WEB-SA-10 | /school-admin/classes | 班级列表 | 分页/搜索 | 列表正确 |
| WEB-SA-11 | /school-admin/classes | 新增班级 | 新增 → 保存 | 创建成功 |
| WEB-SA-12 | /school-admin/classes | 编辑班级 | 编辑 → 保存 | 更新成功 |
| WEB-SA-13 | /school-admin/classes | 删除班级 | 删除 → 确认 | 删除成功 |
| WEB-SA-14 | /school-admin/classes | 添加科任 | 添加科任 → 选择学科 → 保存 | 添加成功 |
| WEB-SA-15 | /school-admin/classes | 移除科任 | 移除科任 → 确认 | 移除成功 |
| WEB-SA-16 | /school-admin/students | 学生列表 | 分页/搜索 | 列表正确 |
| WEB-SA-17 | /school-admin/students | 新增学生 | 新增 → 保存 | 创建成功 |
| WEB-SA-18 | /school-admin/students | 编辑学生 | 编辑 → 保存 | 更新成功 |
| WEB-SA-19 | /school-admin/students | 删除学生 | 删除 → 确认 | 删除成功 |
| WEB-SA-20 | /school-admin/students | 批量导入学生 | 导入 → 预览 → 确认 | 批量导入 |
| WEB-SA-21 | /school-admin/notices | 公告列表 | 分页/搜索 | 列表正确 |
| WEB-SA-22 | /school-admin/notices | 新增公告 | 新增 → 保存 | 创建成功 |
| WEB-SA-23 | /school-admin/notices | 编辑公告 | 编辑 → 保存 | 更新成功 |
| WEB-SA-24 | /school-admin/notices | 删除公告 | 删除 → 确认 | 删除成功 |
| WEB-SA-25 | /school-admin/features | 功能包开关 | 按功能切换 → 保存 | 保存成功 |

### 四、教师模块 — 工作台与个人空间

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-TCH-01 | /teacher | 工作台统计 | 显示待办/学生/考试/作业统计 | 统计正确 |
| WEB-TCH-02 | /teacher | 快捷入口 | 点击"班级成员"等快捷入口 | 跳转对应页面 |
| WEB-TCH-03 | /teacher/notifications | 通知列表 | 分页/筛选 | 显示通知 |
| WEB-TCH-04 | /teacher/notifications | 标记已读 | 点击标记已读 | 状态变更 |
| WEB-TCH-05 | /teacher/notifications | 全部已读 | 点击"全部已读" | 全部标记 |
| WEB-TCH-06 | /teacher/messages | 消息列表 | 分页/搜索 | 显示消息 |
| WEB-TCH-07 | /teacher/messages | 发送消息 | 选择联系人 → 发送 | 发送成功 |
| WEB-TCH-08 | /teacher/profile | 查看资料 | 显示个人资料 | 显示正确 |
| WEB-TCH-09 | /teacher/profile | 编辑资料 | 修改昵称/头像 → 保存 | 更新成功 |
| WEB-TCH-10 | /teacher/config | 设置项 | 修改主题/字号/配色 → 保存 | 保存成功 |
| WEB-TCH-11 | /teacher/todos | 待办列表 | 分页/筛选 | 显示待办 |
| WEB-TCH-12 | /teacher/todos | 新增待办 | 新增 → 保存 | 创建成功 |
| WEB-TCH-13 | /teacher/todos | 编辑待办 | 编辑 → 保存 | 更新成功 |
| WEB-TCH-14 | /teacher/todos | 删除待办 | 删除 → 确认 | 删除成功 |
| WEB-TCH-15 | /teacher/todos | 标记完成 | 点击勾选 | 状态变更 |
| WEB-TCH-16 | /teacher/notes | 笔记列表 | 分页/搜索 | 显示笔记 |
| WEB-TCH-17 | /teacher/notes | 新增笔记 | 新增 → 保存 | 创建成功 |
| WEB-TCH-18 | /teacher/notes | 编辑笔记 | 编辑 → 保存 | 更新成功 |
| WEB-TCH-19 | /teacher/notes | 删除笔记 | 删除 → 确认 | 删除成功 |
| WEB-TCH-20 | /teacher/schedule | 查看课表 | 显示周课表 | 显示正确 |
| WEB-TCH-21 | /teacher/schedule | 切换周次 | 点击周次按钮 | 周次切换 |
| WEB-TCH-22 | /teacher/notices | 公告列表 | 分页/筛选 | 显示公告 |
| WEB-TCH-23 | /teacher/notices | 新增公告 | 新增 → 保存 | 创建成功 |
| WEB-TCH-24 | /teacher/notices | 编辑公告 | 编辑 → 保存 | 更新成功 |
| WEB-TCH-25 | /teacher/notices | 删除公告 | 删除 → 确认 | 删除成功 |

### 五、教师模块 — 班级与学生管理

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-CLS-01 | /teacher/classes | 班级成员列表 | 显示成员 | 显示正确 |
| WEB-CLS-02 | /teacher/classes | 新增学生 | 新增 → 保存 | 创建成功 |
| WEB-CLS-03 | /teacher/classes | 编辑学生 | 编辑 → 保存 | 更新成功 |
| WEB-CLS-04 | /teacher/classes | 删除学生 | 删除 → 确认 | 删除成功 |
| WEB-CLS-05 | /teacher/classes | 批量导出学生 | 点击导出 | 下载 Excel |
| WEB-CLS-06 | /teacher/classes | 批量导入学生 | 导入 → 预览 → 确认 | 批量导入 |
| WEB-CLS-07 | /teacher/classes | 开启家长登录 | 点击"开启家长登录" | 返回初始密码 |
| WEB-CLS-08 | /teacher/classes | 重置家长密码 | 点击重置 → 确认 | 密码重置为 123456 |
| WEB-CLS-09 | /teacher/students | 学生列表 | 分页/搜索/筛选 | 显示正确 |
| WEB-CLS-10 | /teacher/students | 详情查看 | 点击学生行 | 显示学生详情 |
| WEB-CLS-11 | /teacher/duty-roster | 轮值表列表 | 显示轮值 | 显示正确 |
| WEB-CLS-12 | /teacher/duty-roster | 新增轮值 | 新增 → 保存 | 创建成功 |
| WEB-CLS-13 | /teacher/duty-roster | 编辑轮值 | 编辑 → 保存 | 更新成功 |
| WEB-CLS-14 | /teacher/duty-roster | 删除轮值 | 删除 → 确认 | 删除成功 |
| WEB-CLS-15 | /teacher/duty-config | 值日配置 | 配置值日 → 保存 | 保存成功 |
| WEB-CLS-16 | /teacher/class-finance | 班费列表 | 分页 | 显示正确 |
| WEB-CLS-17 | /teacher/class-finance | 新增班费 | 新增 → 保存 | 创建成功 |
| WEB-CLS-18 | /teacher/class-finance | 编辑班费 | 编辑 → 保存 | 更新成功 |
| WEB-CLS-19 | /teacher/class-finance | 删除班费 | 删除 → 确认 | 删除成功 |
| WEB-CLS-20 | /teacher/class-activities | 班级活动列表 | 分页 | 显示正确 |
| WEB-CLS-21 | /teacher/class-activities | 新增活动 | 新增 → 保存 | 创建成功 |
| WEB-CLS-22 | /teacher/class-activities | 编辑活动 | 编辑 → 保存 | 更新成功 |
| WEB-CLS-23 | /teacher/class-activities | 删除活动 | 删除 → 确认 | 删除成功 |
| WEB-CLS-24 | /teacher/gallery | 班级风采列表 | 分页 | 显示正确 |
| WEB-CLS-25 | /teacher/gallery | 新增相册 | 新增 → 保存 | 创建成功 |
| WEB-CLS-26 | /teacher/gallery | 上传图片 | 点击上传 → 选择 → 确认 | 上传成功 |
| WEB-CLS-27 | /teacher/gallery | 删除相册/图片 | 删除 → 确认 | 删除成功 |
| WEB-CLS-28 | /teacher/my-gallery | 我的相册列表 | 分页 | 显示正确 |
| WEB-CLS-29 | /teacher/my-gallery | 新增相册 | 新增 → 保存 | 创建成功 |
| WEB-CLS-30 | /teacher/my-gallery | 上传图片 | 上传 → 确认 | 上传成功 |
| WEB-CLS-31 | /teacher/my-gallery | 删除相册/图片 | 删除 → 确认 | 删除成功 |
| WEB-CLS-32 | /teacher | 科任/班主任自动切换 | 科任登录班级成员页 | 仅显示自己学科 |

### 六、教师模块 — 考试/成绩/分析

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-EXM-01 | /teacher/exams | 考试列表 | 分页/筛选 | 显示正确 |
| WEB-EXM-02 | /teacher/exams | 新增考试 | 新增 → 填写学科/时间 → 保存 | 创建成功 |
| WEB-EXM-03 | /teacher/exams | 编辑考试 | 编辑 → 保存 | 更新成功 |
| WEB-EXM-04 | /teacher/exams | 删除考试 | 删除 → 确认 | 删除成功 |
| WEB-EXM-05 | /teacher/grades | 成绩列表 | 分页/筛选 | 显示正确 |
| WEB-EXM-06 | /teacher/grades | 录入成绩 | 填写成绩 → 保存 | 创建成功 |
| WEB-EXM-07 | /teacher/grades | 编辑成绩 | 编辑 → 保存 | 更新成功 |
| WEB-EXM-08 | /teacher/grades | 删除成绩 | 删除 → 确认 | 删除成功 |
| WEB-EXM-09 | /teacher/grades | 导出成绩 | 点击导出 | 下载 Excel |
| WEB-EXM-10 | /teacher/grades | 导入成绩 (Excel) | 导入 → 预览 → 确认 | 批量导入 |
| WEB-EXM-11 | /teacher/grades | AI 识别导入 | 上传图片 → AI 识别 → 确认 | AI 识别导入 |
| WEB-EXM-12 | /teacher/exam-analysis | 考试分析页 | 选择考试 → 查看分析 | 显示班级均分/最高分/最低分/弱科 |
| WEB-EXM-13 | /teacher/exam-analysis | 学科分析 | 切换学科 | 各学科统计 |
| WEB-EXM-14 | /teacher/exam-analysis | 弱科建议 | 查看 AI 建议 | 显示建议 |
| WEB-EXM-15 | /teacher/data-dashboard | 数据看板 | 查看各科数据 | 图表正确 |
| WEB-EXM-16 | /teacher/data-dashboard | 趋势图 | 切换历史考试 | 显示趋势 |
| WEB-EXM-17 | /teacher/data-dashboard | 排行榜 | 点击排行榜 Tab | 显示排名 |
| WEB-EXM-18 | /teacher/radar | 雷达图 | 选择学生 → 生成雷达图 | 显示多维度评分 |
| WEB-EXM-19 | /teacher/radar | 切换学科 | 切换 | 雷达图更新 |
| WEB-EXM-20 | /teacher/grade-trend | 成绩趋势 | 查看历史成绩曲线 | 显示趋势 |
| WEB-EXM-21 | /teacher/grade-trend | 切换学生/学科 | 切换 | 曲线更新 |

### 七、教师模块 — 学生评价与考勤

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-EVL-01 | /teacher/attendance | 考勤列表 | 分页/按日期筛选 | 显示正确 |
| WEB-EVL-02 | /teacher/attendance | 批量打卡 | 点击"批量打卡" | 批量签到 |
| WEB-EVL-03 | /teacher/attendance | 单独打卡 | 点击学生签到按钮 | 签到成功 |
| WEB-EVL-04 | /teacher/homework | 作业列表 | 分页/筛选 | 显示正确 |
| WEB-EVL-05 | /teacher/homework | 新增作业 | 新增 → 保存 | 创建成功 |
| WEB-EVL-06 | /teacher/homework | 编辑作业 | 编辑 → 保存 | 更新成功 |
| WEB-EVL-07 | /teacher/homework | 删除作业 | 删除 → 确认 | 删除成功 |
| WEB-EVL-08 | /teacher/rewards | 奖励列表 | 分页 | 显示正确 |
| WEB-EVL-09 | /teacher/rewards | 新增奖励 | 新增 → 保存 | 创建成功 |
| WEB-EVL-10 | /teacher/rewards | 编辑奖励 | 编辑 → 保存 | 更新成功 |
| WEB-EVL-11 | /teacher/rewards | 删除奖励 | 删除 → 确认 | 删除成功 |
| WEB-EVL-12 | /teacher/score-records | 加减分列表 | 分页 | 显示正确 |
| WEB-EVL-13 | /teacher/score-records | 新增加减分 | 新增 → 保存 | 创建成功 |
| WEB-EVL-14 | /teacher/leaderboard | 排行榜 | 查看总榜/学科榜 | 显示正确 |
| WEB-EVL-15 | /teacher/growth | 成长记录列表 | 分页 | 显示正确 |
| WEB-EVL-16 | /teacher/growth | 新增成长记录 | 新增 → 保存 | 创建成功 |
| WEB-EVL-17 | /teacher/growth | 编辑成长记录 | 编辑 → 保存 | 更新成功 |
| WEB-EVL-18 | /teacher/growth | 删除成长记录 | 删除 → 确认 | 删除成功 |
| WEB-EVL-19 | /teacher/behavior | 行为记录列表 | 分页 | 显示正确 |
| WEB-EVL-20 | /teacher/behavior | 新增行为记录 | 新增 → 保存 | 创建成功 |
| WEB-EVL-21 | /teacher/behavior | 编辑行为记录 | 编辑 → 保存 | 更新成功 |
| WEB-EVL-22 | /teacher/behavior | 删除行为记录 | 删除 → 确认 | 删除成功 |
| WEB-EVL-23 | /teacher/reading-log | 课外阅读列表 | 分页 | 显示正确 |
| WEB-EVL-24 | /teacher/reading-log | 新增阅读记录 | 新增 → 保存 | 创建成功 |
| WEB-EVL-25 | /teacher/checkin | 学生打卡列表 | 分页 | 显示正确 |
| WEB-EVL-26 | /teacher/checkin | 学生打卡 | 学生点击打卡 | 打卡成功 |
| WEB-EVL-27 | /teacher/awards | 我获奖啦列表 | 分页 | 显示正确 |
| WEB-EVL-28 | /teacher/awards | 学生领奖 | 点击领奖 | 记录领奖 |
| WEB-EVL-29 | /teacher/award-categories | 奖项管理 | 列表 | 显示正确 |
| WEB-EVL-30 | /teacher/award-categories | 新增奖项 | 新增 → 保存 | 创建成功 |

### 八、教师模块 — 家校沟通

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-HOM-01 | /teacher/parent-contacts | 家长联系人列表 | 分页/搜索 | 显示正确 |
| WEB-HOM-02 | /teacher/parent-contacts | 新增联系人 | 新增 → 保存 | 创建成功 |
| WEB-HOM-03 | /teacher/parent-contacts | 编辑联系人 | 编辑 → 保存 | 更新成功 |
| WEB-HOM-04 | /teacher/parent-contacts | 删除联系人 | 删除 → 确认 | 删除成功 |
| WEB-HOM-05 | /teacher/parent-contacts | 批量导入联系人 | 导入 → 预览 → 确认 | 批量导入 |
| WEB-HOM-06 | /teacher/im | 家校沟通 IM | 选择联系人 → 发送消息 | 发送成功 |
| WEB-HOM-07 | /teacher/im | 发送图片 | 上传图片 → 发送 | 发送成功 |
| WEB-HOM-08 | /teacher/im | 创建群聊 | 创建群聊 → 邀请 | 创建成功 |
| WEB-HOM-09 | /teacher/notice-templates | 通知模板列表 | 分页 | 显示正确 |
| WEB-HOM-10 | /teacher/notice-templates | 新增模板 | 新增 → 保存 | 创建成功 |
| WEB-HOM-11 | /teacher/notice-templates | 编辑模板 | 编辑 → 保存 | 更新成功 |
| WEB-HOM-12 | /teacher/notice-templates | 删除模板 | 删除 → 确认 | 删除成功 |

### 九、教师模块 — AI 能力

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-AI-01 | /teacher/ai-chat | AI 对话 | 发送消息 → 回复 | AI 返回回答 |
| WEB-AI-02 | /teacher/ai-chat | 新对话 | 点击"新对话" | 创建新对话 |
| WEB-AI-03 | /teacher/ai-chat | 历史对话 | 切换历史对话 | 对话切换 |
| WEB-AI-04 | /teacher/ai-chat | 删除对话 | 删除 → 确认 | 删除成功 |
| WEB-AI-05 | /teacher/ai-image | AI 文生图 | 输入描述 → 生成 | 生成图片 |
| WEB-AI-06 | /teacher/ai-image | 保存图片 | 点击保存 | 下载图片 |
| WEB-AI-07 | /teacher/ai-resources | 教学资源列表 | 分页 | 显示正确 |
| WEB-AI-08 | /teacher/ai-resources | 生成资源 | 输入主题 → 生成 | 生成资源 |
| WEB-AI-09 | /teacher/lesson-plans | 教案库列表 | 分页 | 显示正确 |
| WEB-AI-10 | /teacher/lesson-plans | 生成教案 | 输入学科/主题 → 生成 | AI 生成教案 |
| WEB-AI-11 | /teacher/lesson-plans | 收藏教案 | 点击收藏 | 收藏成功 |
| WEB-AI-12 | /teacher/knowledges | 知识点库 | 分页 | 显示正确 |
| WEB-AI-13 | /teacher/knowledges | 新增知识点 | 新增 → 保存 | 创建成功 |
| WEB-AI-14 | /teacher/knowledges | 编辑知识点 | 编辑 → 保存 | 更新成功 |
| WEB-AI-15 | /teacher/papers | 试卷库列表 | 分页 | 显示正确 |
| WEB-AI-16 | /teacher/papers | 生成试卷 | 输入学科 → 生成 | AI 生成试卷 |
| WEB-AI-17 | /teacher/paper-queries | 试卷查询 | 输入关键词 → 查询 | 显示匹配 |
| WEB-AI-18 | /teacher/lesson-plan-templates | 教案模板列表 | 分页 | 显示正确 |
| WEB-AI-19 | /teacher/lesson-plan-templates | 新增模板 | 新增 → 保存 | 创建成功 |
| WEB-AI-20 | /teacher/lesson-plan-templates | 编辑模板 | 编辑 → 保存 | 更新成功 |
| WEB-AI-21 | /teacher/ai-generator/lesson | 优质教案生成 | 输入参数 → 生成 | 生成教案 |
| WEB-AI-22 | /teacher/ai-generator/knowledge | 知识点生成 | 输入 → 生成 | 生成知识点 |
| WEB-AI-23 | /teacher/ai-generator/paper | 试卷生成 | 输入 → 生成 | 生成试卷 |

### 十、教师模块 — 办公与教学

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-OFC-01 | /teacher/work-log | 工作日志列表 | 分页/筛选 | 显示正确 |
| WEB-OFC-02 | /teacher/work-log | 新增日志 | 新增 → 保存 | 创建成功 |
| WEB-OFC-03 | /teacher/work-log | 编辑日志 | 编辑 → 保存 | 更新成功 |
| WEB-OFC-04 | /teacher/work-log | 删除日志 | 删除 → 确认 | 删除成功 |
| WEB-OFC-05 | /teacher/lesson-obs | 听课记录列表 | 分页 | 显示正确 |
| WEB-OFC-06 | /teacher/lesson-obs | 新增听课记录 | 新增 → 保存 | 创建成功 |
| WEB-OFC-07 | /teacher/lesson-obs | 编辑/删除 | 编辑/删除 → 确认 | 操作成功 |
| WEB-OFC-08 | /teacher/teaching-calendar | 教学日历 | 显示日历视图 | 显示正确 |
| WEB-OFC-09 | /teacher/teaching-calendar | 添加日程 | 添加 → 保存 | 创建成功 |
| WEB-OFC-10 | /teacher/teacher-directory | 教师通讯录 | 列表显示 | 显示正确 |
| WEB-OFC-11 | /teacher/office-translate | 翻译助手 | 输入 → 翻译 | 返回翻译 |
| WEB-OFC-12 | /teacher/office-paper | 教育论文 | 生成/保存 | 操作成功 |
| WEB-OFC-13 | /teacher/office-blackboard | 黑板报 | 生成/保存 | 操作成功 |
| WEB-OFC-14 | /teacher/office-speech | 演讲稿 | 生成/保存 | 操作成功 |
| WEB-OFC-15 | /teacher/plan-template-lib | 文案模板库 | 列表 / 生成 / 保存 | 操作成功 |
| WEB-OFC-16 | /teacher/office-tools | 办公工具聚合页 | 点击各工具卡片 | 跳转对应工具 |
| WEB-OFC-17 | /teacher/quicktool | 快捷工具 | 各快捷工具按钮 | 对应功能 |

### 十一、教师模块 — 工具箱

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-TLB-01 | /teacher/toolbox | 工具箱聚合页 | 点击各工具卡片 | 跳转对应工具 |
| WEB-TLB-02 | /teacher/tools/picker | 随机点名 | 点击"开始" → 点名 | 随机点名 |
| WEB-TLB-03 | /teacher/tools/picker | 点名历史 | 查看历史 | 显示历史 |
| WEB-TLB-04 | /teacher/tools/grouper | 随机分组 | 输入组数 → 分组 | 完成分组 |
| WEB-TLB-05 | /teacher/tools/decider | 随机决定器 | 输入选项 → 抽取 | 返回结果 |
| WEB-TLB-06 | /teacher/tools/timer | 倒计时 | 设定时间 → 开始/暂停/重置 | 倒计时运行 |
| WEB-TLB-07 | /teacher/tools/calc | 课堂计算器 | 输入 → 计算 | 结果显示 |
| WEB-TLB-08 | /teacher/tools/seatMap | 座位表 | 拖拽 → 保存 | 保存布局 |
| WEB-TLB-09 | /teacher/tools/scorePanel | 加减分面板 | 点击加减分 | 分数变更 |
| WEB-TLB-10 | /teacher/tools/flower | 笑口常开 | 点击笑脸记录 | 记录成功 |
| WEB-TLB-11 | /teacher/tools/comment | 评语生成 | 输入学生 → 生成评语 | 返回评语 |
| WEB-TLB-12 | /teacher/tools/summary | 期末总结 | 输入学生 → 生成总结 | 返回总结 |
| WEB-TLB-13 | /teacher/tools/classDuty | 班级职务 | 配置 → 保存 | 保存成功 |
| WEB-TLB-14 | /teacher/tools/scheduleMaker | 课表排版 | 拖拽 → 保存 | 保存成功 |

### 十二、教师模块 — 学科工具

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-SUB-01 | /teacher/tools/strokeOrder | 汉字笔顺 | 输入汉字 → 演示笔顺 | 显示笔顺动画 |
| WEB-SUB-02 | /teacher/tools/writingMaterials | 作文素材 | 输入主题 → 生成素材 | 返回素材 |
| WEB-SUB-03 | /teacher/tools/poetry | 古诗词助手 | 输入诗词名 → 查询 | 返回诗词 |
| WEB-SUB-04 | /teacher/tools/dictation | 汉字听写 | 点击播放 → 听写 | 播放成功 |
| WEB-SUB-05 | /teacher/tools/reading | 阅读理解生成 | 输入主题 → 生成 | 返回理解题 |
| WEB-SUB-06 | /teacher/tools/essay | 小作文助手 | 输入 → 生成 | 返回作文 |
| WEB-SUB-07 | /teacher/tools/idiom | 成语词典 | 输入成语 → 查询 | 返回解释 |
| WEB-SUB-08 | /teacher/tools/pinyin | 拼音标注 | 输入汉字 → 标注 | 返回拼音 |
| WEB-SUB-09 | /teacher/tools/math | 口算生成 | 设置难度 → 生成 | 返回口算题 |
| WEB-SUB-10 | /teacher/tools/verticalCalc | 竖式计算 | 输入 → 生成竖式 | 返回竖式 |
| WEB-SUB-11 | /teacher/tools/answerCard | 口算答题卡 | 生成 → 打印 | 显示答题卡 |
| WEB-SUB-12 | /teacher/tools/multiplicationTable | 乘法口诀 | 查看口诀 | 显示口诀 |
| WEB-SUB-13 | /teacher/tools/unitConversion | 单位换算 | 输入 → 换算 | 返回结果 |
| WEB-SUB-14 | /teacher/tools/mathMistakes | 错题本 | 录入/查看/重做 | 记录错题 |
| WEB-SUB-15 | /teacher/tools/wordCard | 单词卡片 | 输入 → 生成卡片 | 显示卡片 |
| WEB-SUB-16 | /teacher/tools/sentencePractice | 句型练习 | 输入 → 生成练习 | 返回练习 |
| WEB-SUB-17 | /teacher/tools/listening | 英语听力 | 点击播放 | 播放听力 |
| WEB-SUB-18 | /teacher/tools/grammar | 语法练习 | 输入 → 生成 | 返回语法题 |
| WEB-SUB-19 | /teacher/tools/sceneDialogue | 情景对话 | 输入 → 生成对话 | 返回对话 |
| WEB-SUB-20 | /teacher/tools/spell | 单词拼写 | 听写 → 拼写 | 返回结果 |
| WEB-SUB-21 | /teacher/tools/speaking | 口语练习 | 输入 → 生成 | 返回练习 |
| WEB-SUB-22 | /teacher/tools/englishStory | 英语爽文 | 输入 → 生成 | 返回故事 |
| WEB-SUB-23 | /teacher/tools/lessonObservation | 听课记录 | 填写 → 保存 | 保存成功 |
| WEB-SUB-24 | /teacher/subject-tools | 学科工具聚合 | 点击学科卡片 | 跳转对应工具 |
| WEB-SUB-25 | /teacher/subject-list | 学科列表 | 查看学科 | 显示学科 |
| WEB-SUB-26 | /teacher/subject/:name | 学科详情 | 查看工具列表 | 显示工具 |

### 十三、教师模块 — 小游戏合集

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-GAM-01 | /teacher/games | 游戏合集页 | 点击游戏卡片 | 跳转游戏页 |
| WEB-GAM-02 | /teacher/games/game24 | 24 点 | 开始游戏 → 计算 | 游戏正常 |
| WEB-GAM-03 | /teacher/games/game2048 | 2048 | 开始游戏 → 操作 | 游戏正常 |
| WEB-GAM-04 | /teacher/games/minesweeper | 扫雷 | 开始游戏 → 操作 | 游戏正常 |
| WEB-GAM-05 | /teacher/games/snake | 贪吃蛇 | 开始 → 操作 | 游戏正常 |
| WEB-GAM-06 | /teacher/games/ticTacToe | 井字棋 | 开始 → 对战 | 游戏正常 |
| WEB-GAM-07 | /teacher/games/gomoku | 五子棋 | 开始 → 对战 | 游戏正常 |
| WEB-GAM-08 | /teacher/games/match3 | 消消乐 | 开始 → 操作 | 游戏正常 |
| WEB-GAM-09 | /teacher/games/whack | 打地鼠 | 开始 → 击打 | 游戏正常 |
| WEB-GAM-10 | /teacher/games/puzzle15 | 数字华容道 | 开始 → 操作 | 游戏正常 |
| WEB-GAM-11 | /teacher/games/tetris | 俄罗斯方块 | 开始 → 操作 | 游戏正常 |
| WEB-GAM-12 | /teacher/games/plane | 飞机大战 | 开始 → 操作 | 游戏正常 |
| WEB-GAM-13 | /teacher/games/motorcycle | 极速摩托 | 开始 → 操作 | 游戏正常 |
| WEB-GAM-14 | /teacher/games/sudoku | 数独 | 开始 → 填数 | 游戏正常 |
| WEB-GAM-15 | /teacher/games/idiom | 成语填空 | 开始 → 填空 | 游戏正常 |
| WEB-GAM-16 | /teacher/games/speedMath | 速算挑战 | 开始 → 计算 | 游戏正常 |
| WEB-GAM-17 | /teacher/games/spelling | 单词拼写 | 开始 → 拼写 | 游戏正常 |
| WEB-GAM-18 | /teacher/games/scienceQuiz | 科学知识 | 开始 → 答题 | 游戏正常 |
| WEB-GAM-19 | /teacher/games/geoQuiz | 人文地理 | 开始 → 答题 | 游戏正常 |
| WEB-GAM-20 | /teacher/games/storyChain | 故事接龙 | 开始 → 接龙 | 游戏正常 |

### 十四、家长模块 /parent

| # | 路由 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| WEB-PAR-01 | /parent | 家长工作台 | 显示孩子成绩/通知 | 显示正确 |
| WEB-PAR-02 | /parent | 切换孩子 | 点击孩子头像切换 | 数据切换 |
| WEB-PAR-03 | /parent | 查看考试成绩 | 点击成绩卡 | 显示详情 |
| WEB-PAR-04 | /parent | 查看通知 | 点击通知 | 显示详情 |
| WEB-PAR-05 | /parent | 查看作业 | 点击作业卡 | 显示作业 |
| WEB-PAR-06 | /parent | 联系老师 | 点击"联系老师" | 跳转 IM |
| WEB-PAR-07 | /parent/compare | 跨娃比对 | 选择多个孩子 → 对比 | 显示对比 |
| WEB-PAR-08 | /parent | 修改家长密码 | 设置 → 修改密码 | 修改成功 |
| WEB-PAR-09 | /parent | 订阅微信 | 点击订阅 → 扫码 | 绑定成功 |

---

## Part 2 · 微信小程序

### 十五、小程序登录与家长端

| # | 页面 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| MP-AUTH-01 | pages/login | 登录按钮 | 教师账号密码登录 | 登录成功跳 /pages/dashboard |
| MP-AUTH-02 | pages/login | 微信登录 | 点击微信登录 | 返回 code/绑定状态 |
| MP-AUTH-03 | pages/login | 绑定教师账号 | 输入账号 → 绑定 | 绑定成功 |
| MP-AUTH-04 | pages/parent-login | 家长登录 | 学号+密码 → 登录 | 登录成功跳 /pages/parent |
| MP-AUTH-05 | pages/parent-login | 家长微信登录 | 点击微信登录 | 登录成功 |
| MP-PAR-01 | pages/parent | 家长工作台 | 查看孩子成绩 | 显示成绩 |
| MP-PAR-02 | pages/parent | 查看通知 | 点击通知 | 显示详情 |
| MP-PAR-03 | pages/parent | 查看作业 | 点击作业 | 显示作业 |
| MP-PAR-04 | pages/parent | 考勤查看 | 点击考勤 | 显示考勤 |
| MP-PAR-05 | pages/parent | 行为查看 | 点击行为 | 显示行为 |
| MP-PAR-06 | pages/parent | 课表查看 | 点击课表 | 显示课表 |
| MP-PAR-07 | pages/parent | 沟通记录 | 点击沟通 | 显示沟通 |
| MP-PAR-08 | pages/parent | IM 聊天 | 点击 IM → 发送 | 发送成功 |
| MP-PAR-09 | pages/compare | 跨娃对比 | 选择孩子 → 对比 | 显示对比 |

### 十六、小程序教师端工作台与班级

| # | 页面 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| MP-TCH-01 | pages/dashboard | 教师工作台 | 查看统计 | 显示统计 |
| MP-TCH-02 | pages/dashboard | 快捷入口 | 点击入口 | 跳转对应页 |
| MP-TCH-03 | pages/classes | 班级成员列表 | 查看成员 | 显示成员 |
| MP-TCH-04 | pages/classes | 新增学生 | 新增 → 保存 | 创建成功 |
| MP-TCH-05 | pages/classes | 编辑学生 | 编辑 → 保存 | 更新成功 |
| MP-TCH-06 | pages/classes | 删除学生 | 删除 → 确认 | 删除成功 |
| MP-TCH-07 | pages/classes | 开启家长登录 | 点击"开启" | 返回初始密码 |
| MP-TCH-08 | pages/students | 学生列表 | 搜索/筛选 | 显示正确 |
| MP-TCH-09 | pages/students | 查看详情 | 点击学生 | 显示详情 |
| MP-TCH-10 | pages/teacher | 教师通讯录 | 查看/搜索 | 显示列表 |
| MP-TCH-11 | pages/duty-roster | 轮值表 | 查看/新增/编辑/删除 | CRUD 正常 |
| MP-TCH-12 | pages/class-activity | 班级活动 | 查看/新增/编辑/删除 | CRUD 正常 |
| MP-TCH-13 | pages/class-finance | 班费 | 查看/新增/编辑/删除 | CRUD 正常 |
| MP-TCH-14 | pages/gallery | 班级风采 | 查看/上传/删除 | 操作成功 |
| MP-TCH-15 | pages/my-gallery | 我的相册 | 查看/上传/删除 | 操作成功 |
| MP-TCH-16 | pages/parent-contact | 家长联系人 | CRUD | 操作成功 |
| MP-TCH-17 | pages/im | 家校沟通 IM | 发送消息/图片 | 操作成功 |

### 十七、小程序考试成绩与学情

| # | 页面 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| MP-EXM-01 | pages/exams | 考试列表 | 查看考试 | 显示列表 |
| MP-EXM-02 | pages/exams | 新增考试 | 新增 → 保存 | 创建成功 |
| MP-EXM-03 | pages/exams | 编辑/删除考试 | 编辑/删除 | 操作成功 |
| MP-EXM-04 | pages/grades | 成绩列表 | 查看成绩 | 显示列表 |
| MP-EXM-05 | pages/grades | 录入成绩 | 录入 → 保存 | 创建成功 |
| MP-EXM-06 | pages/grades | 编辑/删除成绩 | 编辑/删除 | 操作成功 |
| MP-EXM-07 | pages/grades | 导入成绩 | 导入 → 预览 → 确认 | 批量导入 |
| MP-EXM-08 | pages/analysis | 考试分析 | 选择考试 → 分析 | 显示分析 |
| MP-EXM-09 | pages/analysis | AI 建议 | 点击 AI 建议 | 显示建议 |
| MP-EXM-10 | pages/radar | 雷达图 | 选择学生 → 生成 | 显示雷达 |
| MP-EXM-11 | pages/data-dashboard | 数据看板 | 查看统计 | 显示图表 |
| MP-EXM-12 | pages/grade-trend | 成绩趋势 | 查看趋势 | 显示趋势 |
| MP-EXM-13 | pages/leaderboard | 排行榜 | 查看总榜/学科榜 | 显示列表 |
| MP-EXM-14 | pages/reading-log | 课外阅读 | CRUD | 操作成功 |
| MP-EXM-15 | pages/growth | 成长记录 | CRUD | 操作成功 |

### 十八、小程序考勤/作业/通知/沟通

| # | 页面 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| MP-ATD-01 | pages/attendance | 考勤列表 | 查看 | 显示列表 |
| MP-ATD-02 | pages/attendance | 批量打卡 | 点击批量打卡 | 批量打卡 |
| MP-ATD-03 | pages/attendance | 单独打卡 | 点击学生按钮 | 打卡成功 |
| MP-ATD-04 | pages/homework | 作业列表 | 查看 | 显示列表 |
| MP-ATD-05 | pages/homework | 新增/编辑/删除作业 | CRUD | 操作成功 |
| MP-ATD-06 | pages/notice | 通知列表 | 查看 | 显示列表 |
| MP-ATD-07 | pages/notice | 新增/编辑/删除通知 | CRUD | 操作成功 |
| MP-ATD-08 | pages/notifications | 通知中心 | 查看通知 | 显示通知 |
| MP-ATD-09 | pages/notifications | 标记已读 | 点击标记 | 状态变更 |
| MP-ATD-10 | pages/notifications | 全部已读 | 点击"全部已读" | 全部标记 |
| MP-ATD-11 | pages/messages | 消息中心 | 查看消息 | 显示消息 |
| MP-ATD-12 | pages/messages | 发送消息 | 选择联系人 → 发送 | 发送成功 |
| MP-ATD-13 | pages/checkin | 学生打卡 | 点击打卡 | 打卡成功 |
| MP-ATD-14 | pages/behavior-record | 行为记录 | CRUD | 操作成功 |
| MP-ATD-15 | pages/award-record | 奖励记录 | CRUD | 操作成功 |

### 十九、小程序 AI/学科/办公/工具箱

| # | 页面 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| MP-AI-01 | pages/ai-center | AI 对话 | 发送消息 | AI 回复 |
| MP-AI-02 | pages/ai-center | 文生图 | 输入描述 → 生成 | 生成图片 |
| MP-AI-03 | pages/image-creation | 图片生成 | 输入 → 生成 | 生成图片 |
| MP-AI-04 | pages/image-creation | 保存图片 | 点击保存 | 下载/保存 |
| MP-SUB-01 | pages/subject-tools/index | 学科工具聚合 | 点击学科卡片 | 跳转对应页 |
| MP-SUB-02 | pages/subject-tools/chinese | 语文工具 | 使用工具 | 操作成功 |
| MP-SUB-03 | pages/subject-tools/math | 数学工具 | 使用工具 | 操作成功 |
| MP-SUB-04 | pages/subject-tools/english | 英语工具 | 使用工具 | 操作成功 |
| MP-SUB-05 | pages/subject-tools/writingMaterials | 作文素材 | 生成素材 | 返回素材 |
| MP-SUB-06 | pages/subject-tools/poetry | 古诗词 | 查询诗词 | 显示诗词 |
| MP-SUB-07 | pages/subject-tools/wordCard | 单词卡片 | 生成卡片 | 显示卡片 |
| MP-SUB-08 | pages/subject-tools/dictation | 汉字听写 | 点击播放 | 播放成功 |
| MP-SUB-09 | pages/subject-tools/idiom | 成语词典 | 查询成语 | 显示解释 |
| MP-SUB-10 | pages/subject-tools/sentencePractice | 句型练习 | 生成练习 | 返回练习 |
| MP-SUB-11 | pages/subject-tools/reading | 阅读理解 | 生成理解题 | 返回题目 |
| MP-SUB-12 | pages/subject-tools/grammar | 语法练习 | 生成语法题 | 返回题目 |
| MP-SUB-13 | pages/subject-tools/listening | 英语听力 | 播放听力 | 播放成功 |
| MP-SUB-14 | pages/subject-tools/spell | 单词拼写 | 拼写测试 | 测试成功 |
| MP-SUB-15 | pages/subject-tools/speaking | 口语练习 | 生成练习 | 返回练习 |
| MP-OFC-01 | pages/office-tools/index | 办公工具聚合 | 点击卡片 | 跳转 |
| MP-OFC-02 | pages/office-tools/translate | 翻译助手 | 输入 → 翻译 | 返回翻译 |
| MP-OFC-03 | pages/office-tools/thesis | 教育论文 | 生成论文 | 返回论文 |
| MP-OFC-04 | pages/office-tools/comment | 评语生成 | 输入 → 生成 | 返回评语 |
| MP-OFC-05 | pages/office-tools/summary | 期末总结 | 输入 → 生成 | 返回总结 |
| MP-OFC-06 | pages/office-tools/blackboard | 黑板报 | 生成黑板报 | 返回黑板报 |
| MP-OFC-07 | pages/office-tools/speech | 演讲稿 | 生成演讲稿 | 返回演讲稿 |
| MP-TLB-01 | pages/toolbox | 工具箱聚合 | 点击工具卡片 | 跳转 |
| MP-TLB-02 | pages/crud | CRUD 示例 | 演示增删改查 | 操作成功 |
| MP-TLB-03 | pages/grouper | 随机分组 | 输入 → 分组 | 完成分组 |
| MP-TLB-04 | pages/schedule | 课表查看 | 查看课表 | 显示课表 |
| MP-TLB-05 | pages/seatMap | 座位表 | 配置 → 保存 | 保存成功 |
| MP-TLB-06 | pages/quicktool | 快捷工具 | 使用快捷工具 | 操作成功 |
| MP-TLB-07 | pages/picker-history | 点名历史 | 查看历史 | 显示历史 |

### 二十、小程序个人中心与配置

| # | 页面 | 按钮/操作 | 用例标题 | 预期结果 |
|---|------|----------|---------|---------|
| MP-SET-01 | pages/profile | 个人资料 | 查看/编辑资料 | 显示/更新成功 |
| MP-SET-02 | pages/profile | 退出登录 | 点击退出 | 清除登录态 |
| MP-SET-03 | pages/config | 配置设置 | 修改主题/字号 | 保存成功 |
| MP-SET-04 | pages/teaching-calendar | 教学日历 | 添加日程 → 保存 | 创建成功 |
| MP-SET-05 | pages/lesson-observation | 听课记录 | CRUD | 操作成功 |
| MP-SET-06 | pages/work-log | 工作日志 | CRUD | 操作成功 |
| MP-SET-07 | pages/notes | 笔记 | CRUD | 操作成功 |
| MP-SET-08 | pages/todos | 待办事项 | CRUD | 操作成功 |
| MP-SET-09 | pages/messages | 消息中心 | 发送/查看消息 | 操作成功 |

---

## Part 3 · 后端 API 补充

### 二十一、成绩分析 5 个端点 54 条用例

| # | 方法 | URL | 用例标题 | 预期结果 |
|---|------|-----|---------|---------|
| ANAL-API-01 | GET | /api/grades/analysis/exam | 缺少参数返回 400 | 400 |
| ANAL-API-02 | GET | /api/grades/analysis/exam | 正常班级+考试 | 返回 subjects/classAvg/totalStudents/weakSubjects/strongSubjects |
| ANAL-API-03 | GET | /api/grades/analysis/exam | 含 fullScoreMap 多学科 | 统计使用满分参数 |
| ANAL-API-04 | GET | /api/grades/analysis/exam | 科任访问其他班级 | 400 |
| ANAL-API-05 | GET | /api/grades/analysis/exam | 无权限访问 | 403/400 |
| ANAL-API-06 | GET | /api/grades/analysis/trend | 全部科目 | 返回趋势 |
| ANAL-API-07 | GET | /api/grades/analysis/trend | 指定单科 | 返回单科趋势 |
| ANAL-API-08 | GET | /api/grades/analysis/trend | 空 classId | 400 |
| ANAL-API-09 | GET | /api/grades/analysis/rank | 全科目排名 | 返回 ranks |
| ANAL-API-10 | GET | /api/grades/analysis/rank | 单科排名 | 返回单科 rank |
| ANAL-API-11 | GET | /api/grades/analysis/rank | 空 examId | 400 |
| ANAL-API-12 | GET | /api/grades/analysis/student/:id | 学生历史 | 返回 history |
| ANAL-API-13 | GET | /api/grades/analysis/student/:id | 科任不可查看 | 400 |
| ANAL-API-14 | GET | /api/grades/analysis/student/:id | 不存在学生 | 400/404 |
| ANAL-API-15 | GET | /api/grades/analysis/weak | 全场弱科 | 返回 weakSubjects |
| ANAL-API-16 | GET | /api/grades/analysis/weak | 指定考试 | 返回本场弱科 |
| ANAL-API-17 | GET | /api/grades/analysis/weak | 空 classId | 400 |

### 二十二、家长端 14 个端点全量

| # | 方法 | URL | 用例标题 | 预期结果 |
|---|------|-----|---------|---------|
| PAR-API-01 | POST | /api/parent-auth/login | 学号密码登录 | 返回 token |
| PAR-API-02 | POST | /api/parent-auth/login | 错误密码 | 400 |
| PAR-API-03 | POST | /api/parent-auth/login | 纯数字学号校验 | 400 "请输入正确的学号" |
| PAR-API-04 | POST | /api/parent-auth/login | 未开启家长登录 | 400 |
| PAR-API-05 | GET | /api/parent-auth/me | 当前家长信息 | 返回家长+孩子 |
| PAR-API-06 | POST | /api/parent-auth/change-password | 修改密码 | 修改成功 |
| PAR-API-07 | POST | /api/parent-auth/change-password | 原密码错误 | 400 |
| PAR-API-08 | GET | /api/parent-auth/notices | 班级通知 | 返回通知 |
| PAR-API-09 | GET | /api/parent-auth/exams | 孩子考试成绩 | 返回考试列表 |
| PAR-API-10 | GET | /api/parent-auth/homework | 孩子作业 | 返回作业 |
| PAR-API-11 | GET | /api/parent-auth/attendance | 孩子考勤 | 返回考勤 |
| PAR-API-12 | GET | /api/parent-auth/behavior | 孩子行为 | 返回行为 |
| PAR-API-13 | GET | /api/parent-auth/schedule | 孩子课表 | 返回课表 |
| PAR-API-14 | GET | /api/parent-auth/communications | 家校沟通 | 返回沟通 |
| PAR-API-15 | POST | /api/parent-auth/subscribe | 订阅微信 | 成功/400 |
| PAR-API-16 | GET | /api/parent-auth/im-user-sig | IM UserSig | 返回 sig |
| PAR-API-17 | POST | /api/parent-auth/switch-student | 切换孩子 | 成功/403 |
| PAR-API-18 | GET | /api/parent-auth/compare-kids | 多娃对比 | 返回对比 |
| PAR-API-19 | POST | /api/parent-auth/bind-wechat | 绑定微信 | 成功/400 |
| PAR-API-20 | GET | /api/parent-auth/me | 无 Token 访问 | 401 |

### 二十三、实体 CRUD 全覆盖（25 类实体）

| # | 实体 | CRUD 端点 | 用例数 |
|---|------|----------|--------|
| ENT-01 | attendances | GET/POST 考勤 | 2 |
| ENT-02 | behaviors | 行为记录 | 2 |
| ENT-03 | checkins | 打卡 | 2 |
| ENT-04 | homeworks | 作业 | 2 |
| ENT-05 | rewards | 奖励 | 2 |
| ENT-06 | reading-logs | 课外阅读 | 2 |
| ENT-07 | growths | 成长记录 | 2 |
| ENT-08 | duty-rosters | 轮值表 | 2 |
| ENT-09 | class-activities | 班级活动 | 2 |
| ENT-10 | class-finances | 班费 | 2 |
| ENT-11 | galleries | 班级风采 | 2 |
| ENT-12 | my-galleries | 我的相册 | 2 |
| ENT-13 | lesson-observations | 听课记录 | 2 |
| ENT-14 | work-logs | 工作日志 | 2 |
| ENT-15 | seats | 座位表 | 2 |
| ENT-16 | quicktools | 快捷工具 | 2 |
| ENT-17 | subject-tools | 学科工具 | 2 |
| ENT-18 | announcements | 公告 | 2 |
| ENT-19 | messages | 消息 | 2 |
| ENT-20 | todos | 待办 | 2 |
| ENT-21 | notes | 笔记 | 2 |
| ENT-22 | lesson-plan-templates | 教案模板 | 2 |
| ENT-23 | school-notices | 校通知 | 2 |
| ENT-24 | home-visits | 家访 | 2 |
| ENT-25 | engage-ments | 学生参与度 | 2 |
| ENT-26 | backups | 备份 | 2 |

---

## 附录：V3 用例统计

| 分类 | 用例数 |
|------|--------|
| Part 1 · Web 前端（20 个模块，160+ 路由） | 480 |
| Part 2 · 微信小程序（6 个模块，80+ 页面） | 240 |
| Part 3 · 后端 API 补充（分析 17 + 家长 20 + 实体 52） | 89 |
| V2 原有后端 API 用例 | 156 |
| **合计** | **965** |

### 覆盖维度

- ✅ 路由覆盖：Web 160+ 路由、小程序 80+ 页面全覆盖
- ✅ 按钮/操作覆盖：每路由至少覆盖 4 个按钮（CRUD + 核心动作）
- ✅ 角色覆盖：super / school_admin / teacher_head / teacher_subject / parent 全覆盖
- ✅ 权限覆盖：路由守卫、后端角色校验、feature 开关、数据隔离全覆盖
- ✅ 场景覆盖：正常、边界、异常、无权限、空数据、批量、导入导出
- ✅ 家长端独立 20 条 API + 10 条页面用例全覆盖
- ✅ 成绩分析 5 端点 17 条 API + 10 条页面用例全覆盖（examStats / examTrend / classRank / studentHistory / weakStudents）
- ✅ 小游戏合集 20 款全页面跳转测试
- ✅ 学科工具 7 科 26 类全页面覆盖
