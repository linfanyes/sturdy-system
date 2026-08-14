# 功能清单与跨端对比矩阵

> 本文档由代码扫描生成（Web 路由/菜单 + 小程序 pages.json/toolbox + 后端 @Controller），不依赖任何历史文档。
> 生成日期：2026-08-14

## 一、Web 端功能清单（按角色）

数据来源：`web-app/src/router/index.ts`、`web-app/src/layouts/layoutMenus.ts`

### 1. 超级管理员 `/super`
- 工作台
- 账户管理：学校管理、校管理员
- 审计日志
- 设置：平台配置、AI 服务商、学校功能包、清除业务数据
- 成绩审计
- 教师管理 / 学生管理（跨校）

### 2. 学校管理员 `/school-admin`
- 工作台
- 人员管理：教师管理、班级管理、班级详情、学生管理、成绩查询与汇总
- 资源：学校公告、教材知识库、专项资源库、智慧中小学
- 设置：AI 配置、学校功能包

### 3. 教师 `/teacher`
- **工作台**：教师工作台、通知中心
- **教学管理**
  - 班级与学生：班级成员、学生管理、轮值表、班费、班级活动、班级风采
  - 学情与考试：考试管理、成绩管理、考试分析、数据看板、考勤、作业
  - 学生评价：奖励记录、加减分记录、小组评分、排行榜、成长记录、行为记录、课外阅读、学生打卡
  - 家校沟通：家长联系、留言板、公告、通知模板
- **AI 与备课**
  - AI 工具：AI 对话、AI 文生图、优质教案生成、知识点生成、优选试卷生成
  - 资源库：教案库、知识点库、教材知识库、专项资源库、试卷库、在线资源、智慧中小学、课表
- **课堂工具**
  - 通用：随机点名、随机分组、随机决定器、倒计时、课堂计算器、座位表、加减分、评语生成、期末总结、班级职务、课表排版
  - 语文：汉字笔顺、作文素材、古诗词助手、汉字听写、阅读理解、小作文助手、成语词典、拼音标注
  - 数学：口算生成、竖式计算、口算答题卡、乘法口诀、单位换算、错题本
  - 英语：单词卡片、句型练习、英语听力、语法练习、情景对话、单词拼写、口语练习、英语爽文
  - 小游戏：游戏合集、笑口常开
- **教师办公**：工作日志、听课记录、教学日历、教师通讯录、翻译、教育论文、黑板报、演讲稿、文案模板库
- **个人空间**：待办事项、笔记、我的相册、我获奖啦、个人资料、设置
- **游戏合集（30+ 款）**：24点、2048、扫雷、贪吃蛇、井字棋、五子棋、消消乐、打地鼠、数字华容道、俄罗斯方块、飞机大战、极速摩托、汽车躲避、数独、数字排序、记忆翻牌、图片拼图、颜色反应、摇骰子、别踩白块、颜色匹配、数字推盘、弹球打砖块、一笔画、接金币、像素鸟、跳一跳、成语填空、速算挑战、单词拼写、科学知识、人文地理、故事接龙
- **Schema 通用 CRUD**：`/schema-crud/:entity`（家长联系、通知模板、智能组卷、教案、知识点、试题检索、值日排班、课程表、考勤、作业、通知公告、资源库、班级经费、班级活动、值日配置、成长档案、行为记录、笔记、待办、点名历史、获奖记录、奖项分类、教师、听课记录、工作日志、教案模板、奖励记录、加减分记录、小组积分 等 30 类）

### 4. 家长 `/parent`
- 家长中心（孩子动态）
- 教材知识点
- 专项资源库
- 跨娃比对

## 二、小程序端功能清单

数据来源：`mini-program/src/pages.json`、`mini-program/src/pages/toolbox/toolbox.vue`

### TabBar 5 个主页面
工作台、班级、学生、工具箱、设置

### 分包功能
- **games（游戏合集，34 款）**：2048、数独、24点、井字棋、五子棋、消消乐、记忆翻牌、数字排序、扫雷、数字华容道、图片拼图、颜色反应、贪吃蛇、俄罗斯方块、飞机大战、极速摩托、汽车躲避、打地鼠、弹球打砖块、像素鸟、别踩白块、跳一跳、接金币、摇骰子、一笔画、颜色匹配、数字推盘、成语填空、速算挑战、单词拼写、科学知识、人文地理、故事接龙
- **tools**：随机点名、倒计时、计算器、口算、随机决定器、笑口常开、文案模板、竖式计算、答题卡、乘法口诀、单位换算、错题本、计分板、奖励兑换、笔顺演示
- **ai**：AI 助手、知识点生成、智能组卷、考试分析、互动答疑、智能教案
- **teaching**：数据看板、考试管理、考试详情、进退步对比、学生成绩、成绩管理、座位表、积分排行榜、成绩雷达图、课外阅读、学生打卡、教学日历、成绩趋势、数据统计、奖项类别、小组评分、积分记录、加减分记录、值日配置、班级职务、课表排版、数据管理
- **community**：随机分组、我的课表、考勤管理、作业管理、班级公告、个人中心、在线资源、在线观看、资源库、成长档案、家长联系、教师通讯录、教师详情、教材知识库、信息修改审核、轮值表、班级活动、备课记录、试卷查询、班费管理、班级风采、我的相册、家校沟通（IM）、图像创造、听课记录、工作日志、行为观察、获奖记录、笔记、待办、抽签历史、通知中心、消息中心
- **writing**：小作文助手、英语小故事、情景对话、教育论文、文案模板库、试卷查询、教案模板、知识点库、通知模板
- **quick**：智能工具、学科练习、学科工具
- **subject-tools**：语文/数学/英语工具（作文素材、古诗词、单词卡片、汉字听写、成语词典、句型练习、阅读理解、语法练习、听力训练、拼音学习、单词拼写、口语练习）
- **office-tools**：翻译助手、教育论文、评语生成、期末总结、黑板报生成、演讲稿生成
- **school-admin**：学校管理、学校功能包
- **parent**：家长中心、跨娃比对、资源库
- **admin**：超级管理员面板（学校管理、校管理员等，`SUPER_ADMIN_USER`/`SUPER_ADMIN_PASSWORD` 环境变量登录）
- **crud**：Schema 驱动通用管理页（30 类实体 + 课程表 AI 批量导入：拍照识别 / Excel/CSV）
- **ai-center**：AI 备课中心

## 三、Web vs 小程序 功能对比

| 功能模块 | Web 端 | 小程序端 | 差异 |
|---|---|---|---|
| 超管工作台/学校管理/校管理员 | ✅ 独立菜单页 | ✅ admin 面板（登录式） | 小程序仅入口页，细分为子面板，无独立"平台配置/AI服务商/审计日志"页 |
| 校管：教师/班级/学生/公告/教材库/资源库/功能包/成绩汇总/AI配置/智慧中小学 | ✅ 全部独立页面 | ⚠️ 仅"学校管理/学校功能包"2 页 | 小程序缺少教材知识库、专项资源库、成绩汇总、AI配置、智慧中小学的校管视图 |
| 教师工作台 | ✅ 侧边栏 + 悬浮快捷 | ✅ 横幅+快捷+搜索 | 小程序含情绪打卡、班级切换、全局搜索；Web 有 hover 预加载 |
| 考试/成绩/分析/看板/雷达/进退步 | ✅ 全部 | ✅ 全部 | 一致 |
| 考勤/作业/公告/课表 | ✅ | ✅ | 一致 |
| 家校沟通 | ✅ 留言板+家长联系 | ✅ 家校沟通 IM | 小程序有 IM 即时通讯；Web 留言板无 IM |
| 学生评价（奖励/加减分/小组/排行/成长/行为/阅读/打卡） | ✅ 全部 | ✅ 全部 | 一致 |
| AI（对话/文生图/教案/知识点/组卷/资源） | ✅ 全部独立页 | ✅ AI 分包 + 备课中心 | 小程序有互动答疑/图像创造专属页；Web 无"互动讲义"入口 |
| 课堂工具（点名/分组/决定器/计时/计算/座位） | ✅ | ✅ | 一致 |
| 学科工具（语文/数学/英语） | ✅ 独立路由 | ✅ subject-tools 分包 | 小程序含科学、道德与法治学科入口；Web 侧边栏按学科过滤 |
| 办公工具（翻译/论文/黑板报/演讲稿/评语/总结） | ✅ | ✅ | 一致 |
| 小游戏合集 | ✅ 30+ 款 | ✅ 34 款 | 基本一致 |
| Schema 通用 CRUD | ✅ /schema-crud/:entity | ✅ crud 页 | 一致，复用 shared crud-schema（30 实体） |
| 数据管理/批量导入 | ✅ 数据管理页 | ✅ 课程表 AI 批量导入 | 小程序支持课程表拍照/Excel AI 识别导入 |
| 家长端 | ✅ 家长中心/教材/资源/跨娃比对 | ✅ parent 分包 | 一致 |
| 教师通讯录/详情 | ✅ | ✅ | 一致 |
| 通知/消息中心 | ✅ 通知中心 | ✅ 通知+消息中心 | 小程序消息中心更完整 |

### 核心差异点
1. **小程序独有**：`pages/admin/admin.vue` 超管面板、`pages/crud/crud.vue` 课程表 AI 批量导入（拍照/Excel）、`pages/ai/ai-interactive.vue` 互动答疑、`pages/community/im.vue` 家校 IM、学科"科学/道德与法治"入口 — Web 端无对应页面。
2. **Web 独有**：超管"平台配置/AI 服务商/审计日志/成绩审计/清除业务数据"独立页、校管全量管理页（教材/资源库/AI配置/智慧中小学）、家长"教材知识点"路由。
3. **入口形态差异**：Web 用三级侧边栏菜单按角色+功能开关；小程序用 TabBar+分包+工具箱分区，工具箱支持隐藏/排序管理（本地存储）。

## 四、后端 API 接口清单

数据来源：`server/src` 全部 `@Controller`（含 module 内联控制器 + CrudController 继承）。

### 认证 / 账户
- `POST /auth/unified-login` `/auth/wechat-login` `/auth/bind-teacher` `/auth/bind-parent` `/auth/bind-by-number` `/auth/password-login` `/auth/change-password`；`GET /auth/me`
- `POST /admin/login` `/admin/reset-all`
- `POST /parent-auth/login` `/parent-auth/change-password` `/parent-auth/bind-wechat` `/parent-auth/subscribe` `/parent-auth/im-user-sig` `/parent-auth/switch-student` `/parent-auth/student-update-request`
- `GET /parent-auth/bindings` `/me` `/notices` `/exams` `/homework` `/attendance` `/behavior` `/schedule` `/communications` `/teachers` `/compare-kids` `/student-update-requests`
- `POST /school-admin/login`
- `GET/PUT/PATCH /users/me`

### 超管 `/admin`
- 学校：`GET/POST /schools`、`PATCH/DELETE /schools/:id`、`GET /schools/export`、`GET/PATCH /schools/:id/features`、`POST /schools/batch-toggle`
- 校管理员：`GET/POST /school-admins`、`PATCH/DELETE /school-admins/:id`、`PATCH /school-admins/:id/enabled`、`PATCH /school-admins/:id/password`、`POST /school-admins/batch`、`POST /school-admins/batch-toggle`
- 全局：`GET /teachers` `/classes` `/students`、`POST /teachers/:id/clear-data`
- 审计：`GET /audit-logs` `/audit-exams` `/audit-grades` `/audit-grade-summary`

### 校管 `/school-admin`
- `GET /dashboard`、`GET/PATCH /school-features`
- 教师：`GET/POST /teachers`、`GET/PATCH/DELETE /teachers/:id`、`POST /teachers/batch`、`/teachers/batch-import`、`/teachers/import`、`/teachers/import-preview`、`/teachers/import-ai`、`PATCH /teachers/:id/features`、`POST /teachers/:id/reset-password`、`POST /teachers/deactivate-all`
- 班级：`GET/POST /classes`、`GET/PATCH/DELETE /classes/:id`、`POST /classes/:id/promote`、`POST /classes/batch`、`/classes/import`、`/classes/import-preview`、`/classes/import-ai`
- 学生：`GET/PATCH/DELETE /students(/:id)`、`GET /students/export`、`POST /students/batch`、`/students/batch-import`、`/students/import`、`/students/import-preview`、`/students/import-ai`
- 通知：`GET/POST/PATCH/DELETE /notices`
- 成绩：`GET /academic/exams` `/academic/grades` `/academic/summary` `/academic/class-comparison` `/academic/class-trend`
- 其他：`GET /parent-logins` `/search` `/homework`
- 导出：`GET /export/teachers` `/export/students` `/export/teachers-xls` `/export/students-xls` `/export/classes-xls`

### 教师端核心业务
- **考试** `/exams`：`GET` `GET/:id` `POST` `PATCH`
- **成绩** `/grades`：`GET`、`POST /merge` `/import-preview` `/import-commit` `/import-ai`、`GET /analysis/exam` `/analysis/trend` `/analysis/rank` `/analysis/student/:studentId` `/analysis/weak`、`GET /export`
- **学生** `/students`：`GET/POST`、`GET/PATCH/DELETE /:id`、`POST /bulk` `/import` `/import-commit` `/import-ai`、`POST /:id/toggle-parent-login`、`POST /:id/reset-parent-password`、`GET /:id/parent-bindings`、`POST /:id/parent-bindings/:bindingId/unbind`、`POST /:id/parent-bindings/:bindingId/set-primary`
- **班级** `/classes`：`POST /:id/members/list`、`POST /school-teachers`、`POST/DELETE /:id/members(/:teacherId)`、`PATCH /:id/my-subjects`、`PATCH /:id/members/:teacherId/subjects`、`GET /:id/dashboard`、`GET/PATCH /:id/parent-features`
- **考勤/作业/公告/课表/资源**（统一模板）：`GET /my`、`POST`、`PATCH /:id`、`POST /push`、`GET`、`POST /import-ai`、`POST /import-commit`
  - `/attendances`、`/homework`、`/notices`、`/schedules`、`/resources`
- **教学日历** `/teaching-calendar`：`POST/GET/GET/:id/PATCH/DELETE`
- **AI** `/ai`：`POST /chat` `/parse` `/chat-sync` `/gen-image` `/gen-video` `/asr` `/ocr` `/parse-file` `/analyze-exam` `/diagnose` `/generate`
- **配置** `/config`：`GET /public` `/app` `/ai` `/teacher/ai-defaults` `/ai-settings` `/app-config` `/ai-providers`；`PUT /app` `/app/:key` `/ai`；`POST /ai/models`；`PATCH /ai-settings` `/app-config`
- **AI 服务商** `/ai-providers`：`GET/POST`、`PATCH/DELETE /:code`

### 评价/成长/家校
- `/reward-records`、`/score-records`、`/group-scores`、`/growth-entries`、`/behavior-records`、`/award-records`、`/award-categories`、`/reading-logs`、`/checkins`、`/leaderboard`、`/engagement`、`/duty-rosters`、`/class-duty-configs`、`/class-activities`、`/class-expenses`、`/home-visits`、`/lesson-observations`、`/work-logs`、`/notes`、`/todos`、`/picker-history`（含各自 CRUD）
- **消息/通知** `/messages`：`GET`、`/sent`、`/unread-count`、`/recipients`、`POST`、`PATCH /:id/read`、`/mark-all-read`、`DELETE`；`/notifications`：`GET`、`/unread-count`、`PATCH /:id/read`、`POST /mark-all-read`
- **家长联系** `/parent-contacts`、`/notice-templates`
- **IM** `/im`：`POST /user-sig`、`GET /parents`、`POST /class-group`；`/chat-sessions`：`POST/GET/GET/:id`、`PATCH /:id/messages`、`/:id/pin`、`DELETE`

### 资源/教材/知识库
- `/resource-library`、`/school-admin/resource-library`（poems/formulas/words/science/moral 各 CRUD + `/search`）
- `/textbooks`、`/school-admin/textbooks`（units/points CRUD、`/tree`、`/search`、`/ai-generate`、`/seed-defaults`）
- `/generated/papers`、`/generated/lesson-plans`、`/generated/knowledges`、`/generated/queries`（各 `/seed-defaults`）
- `/lesson-plan-templates`、`/online-resources/zhzx`（`GET /courses`、`/courses/:id`）
- `/my-galleries`、`/class-galleries`、`/gallery`

### 工具/其它
- `/game-scores`：`POST`、`GET`、`GET /:gameKey`
- `/seat-layouts`：`POST /:id/activate`
- `/backups`：`GET`、`GET/:id`、`POST`、`DELETE`、`POST /auto`
- `/monitor`：`POST /log`、`GET /logs`
- `/security`：`POST /msg-check` `/img-check` `/push-notice` `/push-homework`
- `/student-info-updates`：`GET`、`POST /:id/review`
- `/semesters`、`/math-mistakes`、`/teachers`（`GET /:id/detail`）、`/analysis`（`GET /student-trend` `/class-trend` `/subject-strength`）、`/health`、`/health/cache`

## 五、差异标注（按代码）

- 后端能力两端基本共享：所有业务 CRUD 走统一接口；`/school-admin/*`、`/admin/*` 由超管/校管端使用。
- **小程序独有的后端依赖**：`/ai/parse-file` + `/schedules/import-ai` + `/schedules/import-commit`（课程表 AI 批量导入）；`/im/user-sig`（家校 IM）；`/admin/login`（超管面板）。
- **Web 独有的后端依赖**：`/admin/audit-exams`、`/admin/audit-grades`、`/admin/audit-grade-summary`（成绩审计）；`/config/ai-providers`、`/ai-providers`（AI 服务商）；家长端接口（Web 家长端）。
- 两端均复用 `shared/schemas/crud-schema.ts`（30 类实体）驱动通用 CRUD。

## 六、模块缺口与补全建议

以下为两端功能差异中识别的缺口（按代码核实）。当前仅记录为文档，不进行代码改动，留待后续迭代决策。

### 6.1 Web 端缺失（小程序有、Web 无）
| 缺口 | 小程序参照实现 | 建议 |
|---|---|---|
| 互动讲义 / 互动答疑 | `pages/ai/ai-interactive.vue` | Web 增加 AI 互动讲义入口（复用 `/ai/chat` 等接口） |
| 家校 IM 即时通讯 | `pages/community/im.vue` | Web 在"家校沟通"补 IM 会话页（复用 `/im/user-sig`、`/chat-sessions`） |
| 课程表 AI 批量导入 | `pages/crud/crud.vue` 的拍照/Excel 识别 | Web 数据管理页补课程表导入（复用 `/ai/parse-file`、`/schedules/import-ai`、`/schedules/import-commit`） |
| 学科工具"科学/道德与法治"入口 | `pages/subject-tools/*` + toolbox 学科入口 | Web `layoutMenus.ts` 学科分组补两学科入口 |
| 消息中心（更完整） | `pages/community/messages.vue` | Web 留言板可扩展为消息中心（复用 `/messages/*`） |

### 6.2 小程序端缺失（Web 有、小程序无）
| 缺口 | Web 参照实现 | 建议 |
|---|---|---|
| 校管：教材知识库管理 | `views/school-admin/Textbooks.vue` | 若需在校管面板暴露，走 `pages/admin` 泛型 CRUD（`/school-admin/textbooks`） |
| 校管：专项资源库管理 | `views/school-admin/ResourceLibrary.vue` | 同上（`/school-admin/resource-library`） |
| 校管：成绩查询与汇总 | `views/school-admin/Academic.vue` | 同上（`/school-admin/academic/*`） |
| 校管：AI 配置 | `views/school-admin/AiConfig.vue` | 同上（`/config/ai*`） |
| 校管：智慧中小学 | `views/school-admin/Zhxue.vue` | 同上（`/online-resources/zhzx/*`） |
| 超管：平台配置 / AI 服务商 / 审计日志 / 成绩审计 / 清除业务数据 | `views/super/*` | 若需在超管面板暴露，走 `pages/admin` 泛型 CRUD（`/admin/*`、`/config/*`） |

> 说明：小程序端校管/超管功能当前设计为"面板 + 泛型 CRUD"精简形态，上述缺口多为设计取舍而非 bug。是否补齐需按产品规划决策。
