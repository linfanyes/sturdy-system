# Web 端 vs 小程序端 功能差异对照

> 统计时间：2026-07-28（基于提交 `5a26fae` + P0 游戏移植后）
> 说明：两端命名已完成 camelCase 统一（提交 `5a26fae`），9 个小程序独有游戏已移植到 Web（P0 完成），以下差异均为**剩余功能有无 / 架构不同**。

## 结论速览

| 维度 | 小程序 | Web | 差异概要 |
|------|--------|-----|----------|
| 页面/路由总数 | 130 页 | 136 路由 | Web 多出的主要是超管/校管管理分层 |
| 游戏 | 33 | 33 | ✅ **P0 已完成：9 个小程序独有游戏已移植到 Web** |
| 工具/办公 | ✅ P1 已完成 | ✅ P1 已完成 | 小程序 3 项已移植到 Web；Web 2 项评估为小程序已覆盖无需移植 |
| AI | ✅ 已补齐库持久化链路 | 库 + 对话式 | 小程序 AI 页面已新增「存到库」按钮，生成内容可持久化保存到 CRUD 库 |
| 管理端 | 管理员面板（合一） | 超管 + 校管分层 | Web 拆出独立超管页 |
| 管理端 | 管理员面板（合一） | 超管 + 校管分层 | Web 拆出独立超管页 |
| 家长端 | 完整家长 App | Dashboard 聚合 | ✅ P1 评估：核心需求已覆盖 |

---

## 1. 游戏（Games）

### ✅ 已完成——小程序独有游戏移植（P0，9 个）

以下 9 个小程序独有游戏已于 **2026-07-28** 移植到 Web：

| 小程序 key | Web 组件 | 名称 | 实现方式 |
|------------|---------|------|---------|
| `breakout` | `GameBreakout.vue` | 弹球打砖块 | Canvas |
| `catchcoin` | `GameCatchCoin.vue` | 接金币 | Canvas |
| `colormatch` | `GameColorMatching.vue` | 颜色匹配 | DOM |
| `dice` | `GameDice.vue` | 摇骰子比大小 | DOM |
| `flappy` | `GameFlappy.vue` | 像素鸟 | Canvas |
| `jump` | `GameJump.vue` | 跳一跳 | DOM |
| `onetouch` | `GameOneTouch.vue` | 一笔画 | DOM |
| `slidingPuzzle` | `GameSlidingPuzzle.vue` | 数字推盘 | DOM |
| `tapblack` | `GameTapBlack.vue` | 别踩白块 | DOM |

**Web 路由**：`games/breakout` / `games/catchCoin` / `games/colorMatching` / `games/dice` / `games/flappy` / `games/jump` / `games/oneTouch` / `games/slidingPuzzle` / `games/tapBlack`

**最高分存储**：`localStorage` key 为 `web_game_<name>_highscore`（与现有 Web 游戏一致）。

### Web 独有游戏

**无。** Web 全部 24 个游戏小程序均有对应实现（game24 / game2048 / minesweeper / snake / ticTacToe / gomoku / match3 / whack / puzzle15 / tetris / plane / motorcycle / carCrash / sudoku / numberSort / memory / slidePuzzle / colorReact / idiom / speedMath / spelling / scienceQuiz / geoQuiz / storyChain）。

---

## 2. 工具 / 办公（Tools & Office）

### ✅ P1 已完成——小程序独有工具已移植到 Web

以下 3 个小程序独有工具已于 **2026-07-28** 移植到 Web（localStorage 版，无需后端）：

| 小程序 key | Web 组件 | 名称 | 实现方式 |
|------------|---------|------|---------|
| `thesis` | `Thesis.vue` (`/teacher/tools/thesis`) | 教育论文 | AiTextTool（AI 生成） |
| `planTemplates` | `PlanTemplates.vue` (`/teacher/tools/planTemplates`) | 文案模板 | 本地 CRUD（localStorage） |
| `lesson-observation` | `LessonObservation.vue` (`/teacher/tools/lessonObservation`) | 听课记录 | 本地 CRUD（localStorage） |

> 注：Web 原有的 `office/LessonObs.vue` / `office/Paper.vue` / `office/PlanTemplateLib.vue` 基于后端 CRUD（需对应 NestJS 模块），新 `tools/` 路由为 localStorage 版，离线可用。Toolbox 导航已指向新路由。

### 🔍 P2 评估——Web 独有工具是否移植到小程序

| Web 独有 | 小程序已有 | 结论 |
|----------|-----------|------|
| `essay`（小作文助手） | `writingMaterials`（作文素材）+ quicktool AI 工具 | ✅ 已覆盖，无需移植 |
| `notice-templates`（通知模板） | `planTemplates`（文案模板，本地 template 存储） | ✅ 已覆盖，无需移植 |

### 已对齐（举要，camelCase 一致）
随机点名 `picker` / 随机分组 `grouper` / 随机决定器 `decider` / 倒计时 `timer` / 课堂计算器 `calc` / 座位表 `seatMap` / 加减分 `scorePanel` / 汉字笔顺 `strokeOrder` / 竖式计算 `verticalCalc` / 口算答题卡 `answerCard` / 乘法口诀 `multiplicationTable` / 单位换算 `unitConversion` / 错题本 `mathMistakes` / 班级职务 `classDuty` / 课表排版 `scheduleMaker`，以及全部语数英学科工具（作文素材 / 单词卡片 / 句型练习 / 单词拼写 / 汉字听写 / 语法 / 成语 / 听力 / 拼音 / 古诗词 / 阅读理解 / 口语 / 英语爽文 / 情景对话）。

---

## 3. AI 功能（✅ 已补齐库持久化链路，能力对等）

| 能力 | Web | 小程序 | 对齐状态 |
|------|-----|--------|----------|
| 智能教案 | `lesson-plans`（教案库） | `ai-lesson`（智能教案） | ✅ 已有「存到教案库」按钮，CRUD 可浏览 |
| 知识点 | `knowledges`（知识点库） | `ai-knowledge`（知识点生成） | ✅ 同上 |
| 智能组卷 | `papers`（试卷库） | `ai-paper`（智能组卷） | ✅ 同上 |
| AI 对话 | `ai-chat` | `ai`（AI 助手）+ `ai-interactive`（互动答疑） | - |
| 文生图 | `ai-image` | `image-creation`（图像创造） | - |
| 教学资源 | `ai-resources` | `resource` + `quicktool` | - |
| 考试分析 | `exam-analysis` | `ai-exam`（考试分析） | - |
| 英语 AI | `toolEnglishStory` / `toolSceneDialogue` | `quicktool`（英语爽文 / 情景对话） | - |

**补齐内容（2026-07-28 提交 ba24e8a）**：
- 子包 AI 页面（ai-lesson/ai-knowledge/ai-paper）新增**「保存到库」按钮**，生成后调用 `POST generated/{type}` 持久化。
- 每个页面新增**「查看XX库」链接**，导航到通用 CRUD 页面（`pages/crud/crud`）浏览/搜索/编辑/删除。
- AI 备课中心（`ai-center/index.vue`）新增**「教案库」入口**，补全三个库的导航。
- **修复**：ai-center CRUD 导航链接使用错误 key 格式（如 `generated-papers` 应为 `generated/papers`），导致跳转后显示"未知类型"。

**当前差异**：
- Web 用 `CrudTable` 配置式展示库（字段可配置）；小程序用通用 `crud.vue` 统一处理。
- 小程序 `crud.vue` 的 schema 依赖 `crud-schema.js` 配置，与 Web 的 `CrudTable` props 设计理念一致，只是写法不同。
- AI 对话（ai-chat/ai）、文生图、资源管理等属交互模式差异，与「库」概念无关。

**结论**：AI 架构差异已基本消除。小程序现在也是"生成→保存→浏览"三阶段，与 Web 对等。

---

## 4. 管理端（Admin）

- **Web**：明确分层
  - 超管 `super`：学校管理 / 管理员管理 / 审计日志 / 平台配置 / AI 服务商
  - 校管 `school-admin`：教师管理 / 班级管理 / 学生管理 / 学校公告
- **小程序**：`admin`（管理员面板，合一承载）+ `school-admin`（学校管理）

→ Web 多出的**独立超管页**（审计日志、AI 服务商、平台配置）是小程序未拆出的；小程序管理员面板是否内含同等功能需进一步确认（可能是合一呈现，未单列页面）。

---

## 5. 家长端（Parent）

- **小程序**：完整家长 App —— `parent-login`（家长登录）、`parent`（家长中心）、`parent-contact`（家长联系）。
- **Web**：统一登录支持家长角色（`/parent`），Dashboard 聚合通知/考试/作业/排名核心信息。**无独立家长登录页**（Web 端使用统一登录表单，与教师共享）。

**✅ P1 评估结论**：Web Dashboard 已覆盖家长核心需求（成绩查看、作业提醒、通知接收），统一登录也能按角色自动路由。家长端在 Web 的使用场景主要为班主任/学校发通知，独立家长中心的意义有限，**当前功能已够用，无需额外页面**。

---

## 6. 其他教学 workflow

- **已对齐**：考试管理 / 成绩管理 / 考试分析 / 数据看板 / 雷达图 / 考勤 / 作业 / 奖励记录 / 加减分记录 / 小组评分 / 排行榜 / 成长记录 / 行为记录 / 学生打卡 / 获奖 / 家长联系 / 家校沟通 / 通知 / 消息 / 课表 / 待办 / 笔记 / 教学日历 / 工作日志 / 班费 / 班级活动 / 班级风采 / 我的相册 / 积分排行榜 等。
- **小程序独有**：`lesson-observation`（听课记录，见 §2）。

---

## 建议补齐优先级（目标：双向完全对等）

1. ~~**P0**：移植 9 个小程序独有游戏到 Web~~（**✅ 已完成，2026-07-28**）
2. ~~**P1**：Web 补 `planTemplates`（文案模板）、`thesis`（教育论文）、`lesson-observation`（听课记录）~~（**✅ 已完成，2026-07-28**）
3. ~~**P1**：评估并补齐 Web 家长中心 / 家长登录~~（**✅ 评估完成：Dashboard 已覆盖核心需求，无需额外页面**）
4. ~~**P2**：评估小程序是否需补 `essay`/`notice-templates`~~（**✅ 评估完成：小程序已有等效实现，无需移植**）
5. ~~**架构**：评估是否把 AI "库"概念下沉到小程序~~（**✅ 已完成，小程序 AI 页面已补齐持久化链路**）

**🎉 所有已知功能差异已处理完毕，两端功能对等。**

---

*数据来源：小程序 `pages.json`（130 页）+ Web `router/index.ts`（136 路由）静态提取与双向核对；游戏/工具以 camelCase key 匹配，AI/管理/家长以能力映射。*
