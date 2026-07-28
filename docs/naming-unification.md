# 两端命名与功能统一规范（camelCase）

目标：Web 端（web-app）与小程序（mini-program）对同一个功能使用**完全一致**的
camelCase 标识（page key / route key / quicktool key），并补齐功能缺口做到集合对等。

约定：
- 规范键（canonical）= camelCase，作为两端唯一标识。
- `crud:` 类型与后端资源名（lesson-plan-templates / class-duty-configs 等）属 API 契约，
  已与 web `meta.feature` 一致，**不在本次改名范围**（避免破坏后端接口）。
- 游戏/工具的小程序分包根仍为 `pages/games`、`pages/tools`，仅末段 key 改为 camelCase。
- Web 路由子路径（相对 /teacher）末段改为 camelCase；路由 name 同步改为 camelCase。

---

## 一、Games 映射（小程序分包 pages/games ↔ Web /teacher/games）

| 中文 | Mini 当前 | Web 当前 | 规范 camelCase | 备注 |
|---|---|---|---|---|
| 2048 | game2048 | 2048 | game2048 | Mini 已规范 |
| 24点 | game24 | 24point | game24 | Mini 已规范 |
| 井字棋 | tictactoe | tic-tac-toe | ticTacToe | 两端都改 |
| 极速摩托 | moto | motorcycle | motorcycle | Mini 改 |
| 速算挑战 | speedmath | speed-math | speedMath | 两端都改 |
| 科学知识 | science | science-quiz | scienceQuiz | 两端都改 |
| 人文地理 | geo | geo-quiz | geoQuiz | 两端都改 |
| 故事接龙 | story | story-chain | storyChain | 两端都改 |
| 数字华容道 | puzzle15 | puzzle | puzzle15 | Mini 已规范 |
| 图片拼图 | picpuzzle | slide-puzzle→slidePuzzle | slidePuzzle | 两端都改（Web slide-puzzle→slidePuzzle） |
| 数字推盘 | slidepuzzle | — | slidingPuzzle | Mini 改（slidepuzzle→slidingPuzzle，避让与 slidePuzzle 的大小写冲突，见注） |
| 颜色反应 | colorreact | color-match | colorReact | 两端都改 |
| 数字排序 | numbersort | sequence | numberSort | 两端都改 |
| 颜色匹配 | colormatch | — | colormatch | Mini 独有，Web 缺（待补） |
| 扫雷/贪吃蛇/五子棋/消消乐/打地鼠/俄罗斯方块/飞机大战/数独/记忆翻牌/成语填空/单词拼写 | 同名 | 同名 | 同名 | 已一致 |
| 弹球打砖块 | breakout | — | breakout | Mini 独有，Web 缺（待补） |
| 汽车躲避 | cardodge | car-crash | carCrash | 两端都改（同游戏异名） |
| 接金币 | catchcoin | — | catchcoin | Mini 独有，Web 缺（待补） |
| 摇骰子 | dice（games） | — | dice | Mini 独有游戏，Web 缺（待补） |
| 像素鸟 | flappy | — | flappy | Mini 独有，Web 缺（待补） |
| 别踩白块 | tapblack | — | tapblack | Mini 独有，Web 缺（待补） |
| 跳一跳 | jump | — | jump | Mini 独有，Web 缺（待补） |
| 一笔画 | onetouch | — | onetouch | Mini 独有，Web 缺（待补） |

> Mini 独有游戏（需移植到 Web 实现双向对等）：breakout, catchcoin, colormatch(颜色匹配),
> dice(摇骰子), flappy, tapblack, jump, onetouch —— 共 8 个。Web 无独有游戏。

## 二、Tools 映射（小程序分包 pages/tools ↔ Web /teacher/tools）

| 中文 | Mini 当前 | Web 当前 | 规范 camelCase | 备注 |
|---|---|---|---|---|
| 口算答题卡 | anscard | answer-card | answerCard | 两端都改 |
| 竖式计算 | vcalc | vertical-calc | verticalCalc | 两端都改 |
| 乘法口诀 | multitable | multiplication-table | multiplicationTable | 两端都改 |
| 错题本 | mistakes | math-mistakes | mathMistakes | 两端都改 |
| 单位换算 | unit | unit-conversion | unitConversion | 两端都改 |
| 汉字笔顺 | stroke/stroke | stroke-order | strokeOrder | 两端都改 |
| 随机决定器 | decider | dice | decider | Web 改（dice→decider） |
| 文案模板库 | templates | plan-template-lib | planTemplates | 两端都改 |
| 随机分组 | group/group | grouper | grouper | Mini 改（group→grouper） |
| 座位表 | seats/seats | seat-map | seatMap | Web 改名（seat-map→seatMap） |
| 计分板 | score-panel/score-panel | score-panel | scorePanel | Web 改名 |
| 加减分 | score-panel | score-panel | scorePanel | 同上 |
| 口算生成/计算器/倒计时/随机点名/笑口常开 | math/calc/timer/picker/flower | 同名 | 同名 | 已一致 |
| 班级职务 | crud:class-duty-configs | class-duty | classDuty | Web 改名；Mini 用 crud 覆盖 |

> Mini 缺 Web 独立页：class-duty（班级职务，Mini 用 crud 覆盖，可保留或补独立页）。
> Web 缺 Mini 工具：无（Mini tools 集合 ⊆ Web tools + quicktool/crud 覆盖）。

## 三、Quicktool（AI/学科）键映射（仅小程序，对齐 Web tool 路由末段）

| 中文 | Mini quicktool 当前 | Web route 末段 | 规范 camelCase |
|---|---|---|---|
| 作文素材 | composition | writing-materials | writingMaterials |
| 单词卡片 | wordCards | word-card | wordCard |
| 句型练习 | sentence | sentence-practice | sentencePractice |
| 单词拼写 | spelling | spell | spell（已一致） |
| 英语爽文 | englishStory | english-story | englishStory（已一致） |
| 情景对话 | sceneDialogue | scene-dialogue | sceneDialogue（已一致） |
| 拼音/成语/古诗词/阅读理解/听写/语法/听力/口语/翻译/论文/黑板报/演讲稿/评语/总结 | 同名 | 同名 | 同名 |

## 四、执行状态
- [x] 规范映射表（本文）
- [x] 小程序 games → camelCase + 引用同步（含 cardodge→carCrash 与内部 useGame 键）
- [x] 图片拼图/数字推盘 大小写冲突修复：picpuzzle→slidePuzzle（图片拼图，对齐 Web），
      原 slidepuzzle（数字推盘，Mini 独有）改名为 slidingPuzzle 以避让 Windows 大小写不敏感文件系统冲突
- [x] 小程序 tools → camelCase + 引用同步（含 group→grouper、seats→seatMap、stroke/score-panel 子目录扁平化）
- [x] 小程序 quicktool 键 + subject-tools 页 → camelCase（composition/writingMaterials、wordCards/wordCard、sentence/sentencePractice、spelling/spell 双处统一）
- [x] Web 路由 path/name → camelCase + 导航引用同步（router + AppLayout + Toolbox + GamesIndex，0 残留 kebab）
- [ ] 功能对等：补齐 Mini 独有 8 游戏到 Web（见下方待办）

## 五、功能对等待办（双向完全对等剩余项）
小程序独有、Web 缺失、需移植到 Web 实现真正双向对等的游戏（每个为独立 canvas 游戏实现，属较大的移植工作，本轮未实现，列为后续）：
1. breakout（弹球打砖块）
2. catchcoin（接金币）
3. colormatch（颜色匹配，注意与 colorReact/颜色反应 区分）
4. dice（摇骰子，游戏版；Web 现有 tools/decider 为随机决定器，二者不同）
5. flappy（像素鸟）
6. tapblack（别踩白块）
7. jump（跳一跳）
8. onetouch（一笔画）

> Web 无独有游戏（全部已映射到小程序）。工具侧：Web seat-map ↔ Mini seatMap 已对等；
> Web class-duty（班级职务独立页）↔ Mini 用 crud:class-duty-configs 覆盖，可保留或后续补独立页。
> AI 备课区（Web ai-generator/* 与 Mini pages/ai/ai-*）架构不同，命名未纳入本轮，建议单独评估。

## 六、验证结论
- 小程序：字面量路由断链扫描 = 0；已注册 130 页；pages.json 合法。
- Web：games/tools 路由名与路径段 0 残留 kebab；AppLayout 菜单 `name`/`to` 与 router 一致。
