# Web 端 vs 小程序端 功能差异对照

> 统计时间：2026-07-28（基于提交 `5a26fae` + P0 游戏移植后）
> 说明：两端命名已完成 camelCase 统一（提交 `5a26fae`），9 个小程序独有游戏已移植到 Web（P0 完成），以下差异均为**剩余功能有无 / 架构不同**。

## 结论速览

| 维度 | 小程序 | Web | 差异概要 |
|------|--------|-----|----------|
| 页面/路由总数 | 130 页 | 136 路由 | Web 多出的主要是超管/校管管理分层 |
| 游戏 | 33 | 33 | ✅ **P0 已完成：9 个小程序独有游戏已移植到 Web** |
| 工具/办公 | 已对齐为主 | 已对齐为主 | 小程序独有 3 项，Web 独有 2 项 |
| 工具/办公 | 已对齐为主 | 已对齐为主 | 小程序独有 3 项，Web 独有 2 项 |
| AI | 生成向导式 | 库 + 对话式 | 能力对等，**架构不同** |
| 管理端 | 管理员面板（合一） | 超管 + 校管分层 | Web 拆出独立超管页 |
| 家长端 | 完整家长 App | 仅联系/沟通 | **小程序更强** |

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

### 小程序独有（Web 缺失）

| key | 名称 | 位置 |
|-----|------|------|
| `thesis` | 教育论文 | office-tools |
| `planTemplates` | 计划模板 | tools |
| `lesson-observation` | 听课记录 | 主包（教学 workflow） |

> 注：黑板报(`blackboard`)、演讲稿(`speech`)、翻译助手(`translate`)、期末总结(`summary`)、评语(`comment`) 等 office-tools **两端均已具备**，非差异。

### Web 独有（小程序缺失）

| key | 名称 |
|-----|------|
| `essay` | 小作文助手 |
| `notice-templates` | 通知模板 |

### 已对齐（举要，camelCase 一致）
随机点名 `picker` / 随机分组 `grouper` / 随机决定器 `decider` / 倒计时 `timer` / 课堂计算器 `calc` / 座位表 `seatMap` / 加减分 `scorePanel` / 汉字笔顺 `strokeOrder` / 竖式计算 `verticalCalc` / 口算答题卡 `answerCard` / 乘法口诀 `multiplicationTable` / 单位换算 `unitConversion` / 错题本 `mathMistakes` / 班级职务 `classDuty` / 课表排版 `scheduleMaker`，以及全部语数英学科工具（作文素材 / 单词卡片 / 句型练习 / 单词拼写 / 汉字听写 / 语法 / 成语 / 听力 / 拼音 / 古诗词 / 阅读理解 / 口语 / 英语爽文 / 情景对话）。

---

## 3. AI 功能（能力对等，架构不同）

| 能力 | Web | 小程序 |
|------|-----|--------|
| 智能教案 | `lesson-plans`（教案库） | `ai-lesson`（智能教案） |
| 知识点 | `knowledges`（知识点库） | `ai-knowledge`（知识点生成） |
| 智能组卷 | `papers`（试卷库） | `ai-paper`（智能组卷） |
| AI 对话 | `ai-chat` | `ai`（AI 助手）+ `ai-interactive`（互动答疑） |
| 文生图 | `ai-image` | `image-creation`（图像创造） |
| 教学资源 | `ai-resources` | `resource` + `quicktool` |
| 考试分析 | `exam-analysis` | `ai-exam`（考试分析） |
| 英语 AI | `toolEnglishStory` / `toolSceneDialogue` | `quicktool`（英语爽文 / 情景对话） |

**架构差异点**：
- Web 把 AI 产出沉淀为可复用的**"库"**（教案库 / 知识点库 / 试卷库），强调积累与二次使用。
- 小程序以**一次性生成向导**为主（`ai-lesson`/`ai-knowledge`/`ai-paper`/`ai`），缺持久化"库"概念。
- 小程序用 `quicktool` 聚合了一批 AI 文本工具，Web 以独立 `tool*` 页承载。
- 功能覆盖上两端基本对等，差异主要在"是否沉淀为库"。

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
- **Web**：仅 `parent-contacts`（家长联系）+ `im`（家校沟通），**无独立家长中心 / 家长登录页**。

→ 家长端是**小程序明显强于 Web** 的一块。Web 是否需补齐家长端取决于产品定位（Web 多为教师/管理后台，家长操作本就在小程序完成）。

---

## 6. 其他教学 workflow

- **已对齐**：考试管理 / 成绩管理 / 考试分析 / 数据看板 / 雷达图 / 考勤 / 作业 / 奖励记录 / 加减分记录 / 小组评分 / 排行榜 / 成长记录 / 行为记录 / 学生打卡 / 获奖 / 家长联系 / 家校沟通 / 通知 / 消息 / 课表 / 待办 / 笔记 / 教学日历 / 工作日志 / 班费 / 班级活动 / 班级风采 / 我的相册 / 积分排行榜 等。
- **小程序独有**：`lesson-observation`（听课记录，见 §2）。

---

## 建议补齐优先级（目标：双向完全对等）

1. ~~**P0**：移植 9 个小程序独有游戏到 Web（~~ **✅ 已完成，2026-07-28** ~~）~~。
2. **P1**：评估并补齐 Web 家长中心 / 家长登录（或明确 Web 不需要家长端）。
3. **P1**：Web 补 `planTemplates`（计划模板）、`thesis`（教育论文）、`lesson-observation`（听课记录）。
4. **P2**：评估小程序是否需补 `essay`（小作文助手）、`notice-templates`（通知模板）——取决于产品定位。
5. **架构**：评估是否把 AI "库"概念下沉到小程序（持久化教案 / 知识点 / 试卷）。

---

*数据来源：小程序 `pages.json`（130 页）+ Web `router/index.ts`（136 路由）静态提取与双向核对；游戏/工具以 camelCase key 匹配，AI/管理/家长以能力映射。*
