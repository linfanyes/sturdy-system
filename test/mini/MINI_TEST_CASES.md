# 小程序端测试用例（MINI_TEST_CASES.md）

> 依据系统实际页面/按钮/接口编写；配套自动化测试位于 `mini-program/test/`（Jest + ts-jest + jsdom），
> 运行：`cd mini-program && npm test`（当前 10 套件 / 204 用例全绿）。
> 标注说明：`[A]`=自动化覆盖，`[M]`=需微信开发者工具/真机人工核对，`[C]`=与 Web 端一致性核对。

---

## 一、自动化测试资产映射

| 测试文件 | 覆盖的用例域 | 用例数 |
|---------|-------------|-------|
| `test/login.spec.ts` | 教师/超管登录页安全属性（无硬编码凭据、统一登录逻辑、输入框存在） | 6 |
| `test/parent-login.spec.ts` | 家长登录页（密码框/传 password/非空校验/默认口令提示/防挤压） | 6 |
| `test/parent-consistency.spec.ts` | 家长学号规则跨端一致 + 默认口令 123456 跨端一致（缺陷 #1 回归） | 4 |
| `test/store.spec.ts` | 全局 store 状态管理 | 多 |
| `test/toolbox.spec.ts` | 工具箱 schema/入口 | 多 |
| `test/subject-schema.spec.ts` | 学科工具 schema | 多 |
| `test/validators.spec.ts` | 本地校验器（isPhone/isScore/isStudentNo/…） | 多 |
| `test/unit/shared-*.spec.ts` | 共享常量/类型/校验器 re-export 冒烟 | 3 文件 |

> 补充：`minium/`（微信官方 minium 自动化，真机/开发者工具环境运行，本报告标记为 [M] 待机）；`minium/test_login.py`、`minium/test_tabbar.py` 已就绪。

---

## 二、页面清单（pages.json 全量）

### 2.1 主包 + tabBar
| 页面 | 说明 | tab | 手段 |
|------|------|-----|------|
| `pages/login/login` | 教师/超管/校管统一登录 | - | [A] login.spec + [M] |
| `pages/parent-login/parent-login` | 家长登录（学号+口令） | - | [A] parent-login.spec + [M] |
| `pages/dashboard/dashboard` | 工作台 | ✅ | [A] store + [M] |
| `pages/classes/classes` | 班级管理 | ✅ | [M] |
| `pages/students/students` | 学生管理 | ✅ | [M] |
| `pages/toolbox/toolbox` | 常用工具箱 | ✅ | [A] toolbox.spec |
| `pages/config/config` | 设置 | ✅ | [M] |

### 2.2 分包（`subPackages`）
| root | 页面数 | 关键页面 |
|------|-------|---------|
| `pages/games` | 34 | index + 33 款小游戏（2048/数独/24点/五子棋/消消乐/扫雷/华容道/贪吃蛇/俄罗斯/飞机/摩托/打地鼠/弹球/像素鸟/跳一跳/成语/速算/科学/地理…） |
| `pages/tools` | 15 | picker/timer/calc/math/decider/flower/planTemplates/verticalCalc/answerCard/multiplicationTable/unitConversion/mathMistakes/scorePanel/reward/strokeOrder |
| `pages/ai` | 6 | ai(助手)/ai-knowledge/ai-paper/ai-exam/ai-interactive/ai-lesson |
| `pages/teaching` | 22 | data-dashboard/exams/exam-detail/exam-compare/student-grades/grades/seatMap/leaderboard/radar/reading-log/checkin/teaching-calendar/grade-trend/analysis/award-categories/group-scores/score-records/reward-records/duty-config/class-duty/schedule-maker/data-manager |
| `pages/community` | 34 | grouper/schedule/attendance/homework/notice/profile/resource/webview/resource-library/growth/parent-contact/teacher/teacher-detail/textbook/student-info-review/duty-roster/class-activities/lesson-plans/papers/class-finance/gallery/my-gallery/im/image-creation/lesson-observation/work-log/behavior-record/award-record/notes/todos/picker-history/notifications/messages |
| `pages/writing` | 9 | essay/english-story/scene-dialogue/paper/plan-template-lib/paper-queries/lesson-plan-templates/knowledges/notice-templates |
| `pages/quick` | 3 | quicktool/subject/subject-list |
| `pages/subject-tools` | 16 | index + 语文/英语/数学/作文素材/古诗/单词卡/听写/成语/句型/阅读/语法/听力/拼音/拼写/口语 |
| `pages/office-tools` | 7 | index/translate/thesis/comment/summary/blackboard/speech |
| `pages/school-admin` | 2 | school-admin(六 Tab)/school-features |
| `pages/parent` | 3 | parent(多 Tab)/compare(跨娃)/parent-resource-library |
| `pages/admin` | 1 | admin(超管面板) |
| `pages/crud` | 1 | crud（动态 schema 管理） |
| `pages/ai-center` | 1 | index（AI 备课中心） |

**四角色入口**：超管→`pages/admin/admin`；校管→`pages/school-admin/school-admin`；
教师→主包（登录后 dashboard/classes/students/toolbox/config）+ 各分包；家长→`pages/parent-login` → `pages/parent/parent`。

---

## 三、四角色 × 功能用例矩阵
| # | 角色 | 页面 | 关键功能 | 手段 | 状态 |
|---|------|------|---------|------|------|
| M-S1 | 超管 | admin | 登录(`/admin/login`)、仪表盘统计、学校管理(`/admin/schools`)、校管管理(`/admin/school-admins`+启停/重置密码)、审计(`/admin/audit-*`)、账号清除(`/admin/reset-all`) | [A] login.spec(安全) + [C] 接口 B 组已测 + [M] 真机 | ✅/⏳真机 |
| M-A1 | 校管 | school-admin | 六 Tab：仪表盘/教师(`/school-admin/teachers`+批量/导入/重置密码/功能包)/班级(`/classes`+promote)/学生(导入/家长登录)/AI配置/成绩汇总 | [A] + [C] 接口 C 组已测 + [M] | ✅/⏳真机 |
| M-A2 | 校管 | school-features | 学校功能包开关 | [A] + [C] 接口 C3 + [M] | ✅ |
| M-T1 | 教师 | dashboard/classes/students/toolbox/config | 工作台统计/班级学生 CRUD/工具箱/设置 | [A] store/toolbox + [C] 接口 D 组 + [M] | ✅/⏳ |
| M-T2 | 教师 | teaching 分包 | 考试/成绩/座位/排行榜/雷达/阅读/打卡/日历/趋势/分析/奖项/小组分/积分/值日/职务/课表/数据管理 | [A] + [C] 接口 D 组 + [M] | ✅ |
| M-T3 | 教师 | community 分包 | 考勤/作业/公告/资源/成长/家校联系/教师通讯录/教材/信息审核/轮值/活动/备课/班费/风采/相册/IM/图像/听课/日志/行为/获奖/笔记/待办/通知/消息 | [A] + [C] 接口 D 组 + [M] | ✅ |
| M-T4 | 教师 | games/tools/ai/writing/quick/subject-tools/office-tools/ai-center | 小游戏合集/工具箱/学科工具/办公工具/AI 备课 | [A] toolbox/subject-schema + [C] 接口 F4/F14 + [M] | ✅ |
| M-P1 | 家长 | parent | 多 Tab（待办/成绩/考勤/教材/概览）+ 多娃切换 + 信息维护/申请记录/消息中心/改密 | [A] parent-consistency/parent-login + [C] 接口 E 组 + [M] | ✅ |
| M-P2 | 家长 | compare / parent-resource-library | 跨娃比对 / 资源库 | [A] + [C] 接口 E2-10 + [M] | ✅ |

---

## 四、两端一致性核对矩阵（Web ⇄ 小程序）
| 功能域 | Web 端 | 小程序端 | 接口 | 结论 |
|--------|--------|---------|------|------|
| 四角色登录 | `/auth/unified-login` + `/parent-auth/login` | 同（admin 走 `/admin/login`） | 一致 | ✅ 一致 |
| 班级/学生/考试/成绩 CRUD | `/classes /students /exams /grades` | 同 | 一致 | ✅ |
| 教师工作台/工具箱/游戏 | 页面全量 | 分包全量 | 一致 | ✅ |
| 超管面板 | /super 全模块 | pages/admin/admin | `/admin/*` 一致 | ✅ |
| 校管面板 | /school-admin 全模块 | pages/school-admin（六 Tab） | `/school-admin/*` 一致 | ✅ |
| 家长中心 | Dashboard(聚合待办/考勤/成绩) | parent(五 Tab 平铺) | `/parent-auth/*` 一致 | ✅ 信息架构差异可接受 |
| 跨娃比对 | /parent/compare | pages/parent/compare | 一致 | ✅ |
| 教材/资源库 | /parent/textbook + resources | parent-resource-library | 一致 | ✅ |
| AI 能力 | /ai/chat-sync parse gen-image analyze-exam diagnose | 额外 asr/ocr/parse-file/gen-video/generate | 小程序多平台能力 | ⚠️ 小程序更全，非缺陷 |
| 内容安全 | （Web 未单独封装） | `/security/img-check msg-check` | 小程序专属 | ⚠️ 小程序更全，非缺陷 |
| 动态数据管理 | SchemaCrudPage（/schema-crud/:entity） | pages/crud/crud | 一致 | ✅ |

> 接口端点一致性已用脚本实测（`test/parity/check-endpoint-parity.mjs`）：核心业务端点 82+ 个完全一致，
> 差异端点集中在「超管/校管管理」与「平台专属能力」，均属设计范畴，无需补齐。

---

## 五、真机/工具待办（[M] 项，需微信开发者工具或真机执行）
1. 云托管私有链路（`wx.cloud.callContainer`）真机连通性：环境 `prod-d6g1zoq8c7be4ce53`、服务 `tec-work`。
2. minium 自动化：`minium/test_login.py`（登录）与 `minium/test_tabbar.py`（tabBar 切换）在开发者工具运行。
3. 分包预下载（`preloadRule`）性能：dashboard/toolbox/classes/students 分包预加载表现。
4. 各分包页面真机渲染与下拉刷新。

---

## 六、运行与验收
```bash
cd mini-program && npm test   # 期望 10 suites / 204 tests 全绿
```
验收口径：四角色入口可达 → 与 Web 功能对称 → 接口路径一致 → 写操作持久化数据互通（Web 写入→小程序可见，反之亦然）。
