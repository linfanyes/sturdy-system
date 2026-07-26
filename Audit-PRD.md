# 园丁工作台（work-system）全面质量审计 PRD

> 版本：v1.0 | 日期：2026-07-26 | 产品经理：许清楚（Xu） | 状态：正式版

---

## 1. 产品目标

对园丁工作台（Web端、小程序端、后端API）进行**全维度质量审计**，确保三端功能完整、行为一致、业务规则统一、数据同源、体验统一。输出结构化测试用例、执行报告、缺陷清单、修复验证报告、UI优化报告，形成可交付的质量基线。

---

## 2. 审计范围

### 2.1 系统全景

| 端侧 | 技术栈 | 角色/入口 | 核心模块数 | 页面/接口规模 |
|------|--------|-----------|------------|---------------|
| **Web端** | Vite + Vue 3 + TS + Pinia + Vue Router + Tailwind CSS + MUI | 超管 / 校管 / 教师 / 家长 | 4大角色约 124 叶子页面 | ~124 页面、~200+ API 调用 |
| **小程序端** | uni-app + Vue 3 | 家长端 / 教师端 | 核心业务流 | ~50 页面、~150+ API 调用 |
| **后端服务** | NestJS + TypeORM + MySQL + Redis | REST API | 30+ 业务模块 | ~300+ Controller/DTO/Service |

### 2.2 审计维度矩阵

| 维度 | Web端 | 小程序端 | 后端API | 跨端一致性 |
|------|-------|----------|---------|------------|
| **功能完整性** | ✅ 全页面冒烟 + 核心组件深测 | ✅ 核心流程覆盖 | ✅ DTO/异常/租户隔离测试 | ✅ 功能模块一一对应矩阵 |
| **操作流程一致性** | ✅ 关键路径 E2E | ✅ 关键路径 E2E | — | ✅ 同业务场景步骤对齐 |
| **业务规则一致性** | ✅ 校验/权限/状态流转 | ✅ 校验/权限/状态流转 | ✅ DTO/Guard/Exception | ✅ 规则定义单一源头对齐 |
| **数据一致性** | ✅ CRUD 读写验证 | ✅ CRUD 读写验证 | ✅ 事务/隔离/回滚 | ✅ 同一后端写入读取校验 |
| **UI 排版规范** | ✅ 全页面布局/间距/响应式/字体/组件复用 | ✅ 页面布局/组件复用 | — | ✅ 设计系统 Token 对齐 |

---

## 3. 用户故事（审计视角）

| ID | 角色 | 目标 | 验收标准 |
|----|------|------|----------|
| US-01 | QA工程师 | 获得全量结构化测试用例 | 覆盖正常/异常/边界，含测试数据、执行步骤、预期结果 |
| US-02 | QA工程师 | 执行测试并得出通过率报告 | 总用例数、通过率、失败明细、缺陷等级分类 |
| US-03 | 开发工程师 | 按严重度修复缺陷并回归 | P0 0遗留、P1 修复率100%、P2 计划内 |
| US-04 | 架构师 | 验证两端业务规则单一源头 | 校验规则、权限矩阵、状态机在后端定义、前端复用 |
| US-05 | 产品经理 | 确认功能完整性无遗漏/多余 | Web/小程序功能矩阵逐项打钩，签收 |
| US-06 | UI/前端工程师 | 全页面排版规范达标 | 对齐/间距/响应式/字体/组件复用 100% 通过清单 |

---

## 4. 功能模块矩阵（Web端 vs 小程序端 vs 后端API）

### 4.1 核心业务模块对照表

| 模块 | 后端模块 | Web端页面 | 小程序端页面 | 状态 |
|------|----------|-----------|--------------|------|
| **认证授权** | auth, users | Login.vue, Forbidden.vue | login/, parent-login/ | ✅ 完整 |
| **超管管理** | admin, schools, audit, config | super/Schools, Admins, AuditLogs, PlatformConfig | admin/ | ✅ 完整 |
| **校管管理** | school-admin | school-admin/Dashboard, Teachers, Classes, Students, Notices | school-admin/ | ✅ 完整 |
| **教师核心** | teacher | teacher/Dashboard | dashboard/, toolbox/ | ✅ 完整 |
| **课表管理** | schedules | tools/ScheduleMaker | schedule/ | ✅ 完整 |
| **考勤管理** | attendances | tools/Attendance | attendance/ | ✅ 完整 |
| **作业管理** | homework | tools/Homework | homework/ | ✅ 完整 |
| **成绩管理** | grades, exams | tools/GradeManage, ExamManage | grades/, exams/ | ✅ 完整 |
| **班级管理** | classes, students | classes/, students/ | classes/, students/ | ✅ 完整 |
| **公告通知** | notices | notice/, notifications/ | notice/, notifications/ | ✅ 完整 |
| **资源库** | resources | tools/Resource | resource/ | ✅ 完整 |
| **成长档案** | growth | tools/GrowthArchive | growth/ | ✅ 完整 |
| **行为观察** | behavior-records | tools/BehaviorObs | behavior-record/ | ✅ 完整 |
| **家长联系** | parent-contact | tools/ParentContact | parent-contact/ | ✅ 完整 |
| **教师通讯录** | teachers | tools/TeacherDirectory | teacher/ | ✅ 完整 |
| **轮值表** | duty-rosters, class-duty-configs | tools/DutyRoster | duty-roster/ | ✅ 完整 |
| **班级活动** | class-activities | tools/ClassActivity | class-activity/ | ✅ 完整 |
| **班费管理** | class-expenses | tools/ClassFinance | class-finance/ | ✅ 完整 |
| **班级风采** | class-galleries | tools/ClassGallery | gallery/ | ✅ 完整 |
| **听课记录** | lesson-observation | tools/LessonObs | lesson-observation/ | ✅ 完整 |
| **工作日志** | work-log | tools/WorkLog | work-log/ | ✅ 完整 |
| **个人笔记** | notes | tools/Note | notes/ | ✅ 完整 |
| **获奖记录** | award-records | tools/AwardRecord | award-record/ | ✅ 完整 |
| **奖励/积分/小组** | reward-records, score-records, group-scores | tools/Reward, ScorePanel | crud/ (engagement) | ✅ 完整 |
| **阅读打卡** | checkin | tools/Checkin | checkin/ | ✅ 完整 |
| **家访路线** | home-visit-route | - | home-visit-route/ | ✅ 完整 |
| **阅读记录** | reading-log | tools/Reading | reading-log/ | ✅ 完整 |
| **AI 助手** | ai | ai/, tools/AiTextTool | ai/, ai-exam/, ai-knowledge/, ai-paper/, ai-interactive/, ai-lesson/ | ✅ 完整 |
| **工具箱/小游戏** | - | tools/* (26个), games/* (18个) | tools/*, games/* (18个) | ✅ 完整 |
| **座位表/分组** | seats | tools/SeatMap, RandomGrouper | seats/, group/ | ✅ 完整 |
| **个人中心** | users | Profile | profile/ | ✅ 完整 |
| **成绩趋势** | grades, exams | tools/GradeTrend | grade-trend/ | ✅ 完整 |
| **数据看板** | - | - | data-dashboard/, analysis/ | ✅ 完整 |
| **消息聚合** | notifications | - | messages/ | ✅ 完整 |
| **IM 通讯** | im | - | im/ | ✅ 完整 |
| **雷达图** | - | - | radar/ | ✅ 完整 |
| **待办事项** | - | tools/Todos | todos/ | ✅ 完整 |
| **抽签历史** | - | - | picker-history/ | ✅ 完整 |
| **教学日历** | teaching-calendar | - | teaching-calendar/ | ✅ 完整 |

### 4.2 后端模块完整性（30+ 模块）

| 模块 | Controller | Service | Entity | DTO | Guard/Filter | 状态 |
|------|------------|---------|--------|-----|--------------|------|
| auth | ✅ | ✅ | ✅ | ✅ | JwtAuthGuard, RolesGuard | ✅ 完整 |
| admin | ✅ | ✅ | ✅ | ✅ | AdminOnlyGuard | ✅ ���整 |
| school-admin | ✅ | ✅ | ✅ | ✅ | SchoolAdminGuard | ✅ 完整 |
| teacher | ✅ | ✅ | ✅ | ✅ | TeacherGuard | ✅ 完整 |
| ai | ✅ | ✅ | - | ✅ | - | ✅ 完整 |
| classes | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| students | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| grades | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| exams | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| attendances | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| homework | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| notices | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| schedules | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| resources | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| growth | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| behavior-records | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| parent-contact | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| seats | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| duty-roster | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| class-activities | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| class-expenses | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| class-galleries | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| lesson-observation | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| work-log | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| notes | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| award-records | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| engagement (reward/score/group) | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| checkin | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| home-visit-route | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| reading-log | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| teacher | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| notification | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| im | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| users | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| backup | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| config | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |
| generated | ✅ | ✅ | ✅ | ✅ | - | ✅ 完整 |

---

## 5. 需求池（优先级分级）

### 5.1 P0 - 必须完成（阻塞发布）

| ID | 需求描述 | 验收标准 |
|----|----------|----------|
| **P0-01** | **功能完整性核查**：Web端 4角色 124页面、小程序 2角色 50页面、后端 300+接口，建立功能矩阵并逐项验证 | 矩阵 100% 覆盖，无遗漏页面/接口 |
| **P0-02** | **两端功能对应性核查**：建立 Web↔小程序功能映射表，验证无多余/缺失模块 | 映射表 100% 匹配，差异项有明确产品决策记录 |
| **P0-03** | **操作流程一致性核查**：核心业务（登录、班级/学生管理、作业/考试/成绩、通知、家校沟通、AI工具）两端步骤对齐 | 关键路径步骤序列一致，差异仅因平台交互差异 |
| **P0-04** | **业务规则一致性核查**：手机号校验、学科选项、班级命名、权限特性、状态流转等规则两端表现一致 | 规则清单逐项对比通过，差异为0 |
| **P0-05** | **数据一致性核查**：同一后端 API，Web/小程序写入/读取/更新/删除数据结果一致 | CRUD 场景跨端数据对比通过，事务边界一致 |
| **P0-06** | **安全高危漏洞修复**：PDF解析 RCE (CVE-2024-4367)、Excel解析原型污染 (CVE-2023-30533)、XSS、限流缺失、CORS宽松、SSRF | 所有高危/中危漏洞修复并验证，生产依赖 0 漏洞 |
| **P0-07** | **全量测试用例生成**：正常流/异常流/边界条件，含测试数据制备脚本 | 用例文档结构化，可直接驱动自动化执行 |
| **P0-08** | **测试执行与报告**：Jest + Vue Test Utils + Supertest，输出结构化报告 | 总用例数、通过率、失败明细、缺陷等级（P0/P1/P2/P3） |
| **P0-09** | **P0/P1 缺陷修复回归**：按严重度排序修复，修复后全量回归 | P0 0遗留，P1 100%修复，回归通过 |

### 5.2 P1 - 应该完成（质量基线）

| ID | 需求描述 | 验收标准 |
|----|----------|----------|
| **P1-01** | **UI 排版规范全页面检查**：元素对齐、间距系统、响应式断点、字体层级、组件复用规范 | 清单 100% 通过，产出优化前后对比报告 |
| **P1-02** | **全量测试用例生成与执行**：单元/集成/E2E，覆盖 Web/小程序/后端 | 用例总数 ≥ 500，执行通过率 ≥ 95% |
| **P1-03** | **回归验证**：P0/P1 缺陷修复后全量回归，确保无回归 | 回归通过率 100% |
| **P1-04** | **无障碍合规基线**：WCAG 2.1 AA 关键项（语义标签、对比度、键盘可达、焦点管理） | Lighthouse Accessibility ≥ 90 |
| **P1-05** | **性能基线对比**：构建产物体积、代码分割、LCP/FID/CLS 核心指标 | 达到现有基线（Performance 81+）或优化 |

### 5.3 P2 - 可选优化（技术债治理）

| ID | 需求描述 | 验收标准 |
|----|----------|----------|
| **P2-01** | **端到端 E2E 自动化（Playwright）覆盖核心 10 条路径** | CI 可跑通 |
| **P2-02** | **API ��约测试** 确保前后端接口不破坏 | Pact 或同类工具 |
| **P2-03** | **文档站点自动生成**（API文档、测试报告、组件库） | 部署可访问 |
| **P2-04** | **测试覆盖率门禁**：语句/分支/函数/行覆盖率阈值 | Lines ≥ 70%、Branches ≥ 60%、Functions ≥ 65% |

---

## 6. UI 设计稿 / 排版规范参考标准

### 6.1 设计系统 Token 对齐表

| 规范项 | Web端标准 (Tailwind CSS + MUI) | 小程序端标准 (uni-app + 自定义组件) | 统一 Token 来源 |
|--------|-------------------------------|-----------------------------------|-----------------|
| **色彩** | cocoa/butter/cream 主题色系，CSS 变量 `--color-*` | 同色值十六进制 | `:root` CSS 变量 |
| **字体层级** | `text-xs`~`text-4xl` / `font-light`~`font-bold` | rpx 对应 rem 换算 | `tailwind.config.js` `fontSize` |
| **间距系统** | 4px 基准（`space-1` = 0.25rem） | 8rpx 基准 | `spacing` scale |
| **响应式断点** | `sm:640` `md:768` `lg:1024` `xl:1280` `2xl:1536` | 单列布局，安全区适配 | `screens` 配置 |
| **圆角/阴影** | `rounded-lg` `shadow-sm`~`shadow-xl` | 统一 rpx 值 | `borderRadius` `boxShadow` |
| **组件复用规范** | `CrudTable`/`AiTextTool`/`PhotoAlbum`/`Modal`/`AppLayout` | 同名/同接口组件复用 | 共享 TypeScript 类型定义 |
| **图标系统** | lucide-vue-next | 同图标名（uni-app 适配） | 图标名映射表 |

### 6.2 UI 审计检查清单（每页必检）

| 检查项 | 标准 | 验收方式 |
|--------|------|----------|
| **布局对齐** | 栅格系统 12 列，元素对齐基线网格 | 视觉回归 / 人工清单 |
| **间距一致性** | 仅使用设计系统 spacing token，无硬编码 px/rpx | 代码扫描 + 视觉检查 |
| **响应式断点** | Web: sm/md/lg/xl/2xl 生效；小程序：安全区适配、横屏不崩 | 实机/模拟器多尺寸测试 |
| **字体层级** | 标题/正文/辅助/说明 4 级，font-weight 规范 | 样式审查 |
| **色彩合规** | 仅使用 `--color-*` / 主题色，无任意十六进制 | 代码扫描 |
| **组件复用率** | 通用组件（CrudTable, Modal, Form, Button, Card, Tag, Chip, Avatar, Badge, Tooltip, Dialog, Drawer, Table, Pagination, Select, DatePicker, Upload, ImagePreview, Empty, Loading, Message, Confirm）复用 ≥ 80% | 组件引用统计 |
| **无障碍基线** | 语义化标签、aria-label、键盘可达、焦点可见、对比度 ≥ 4.5:1 | axe-core / Lighthouse |

### 6.3 响应式断点对照

| 断点 | Web (Tailwind) | 小程序 (rpx) | 适配策略 |
|------|----------------|--------------|----------|
| 超小 | `<640px` | 375rpx (iPhone SE) | 单列堆叠、底部安全区 |
| 小 | `640-767px` | 414rpx (iPhone 8) | 单列、TabBar 固定 |
| 中 | `768-1023px` | 750rpx (iPad) | 两栏布局、侧边栏折叠 |
| 大 | `1024-1535px` | - | 标准桌面布局 |
| 超大 | `≥1536px` | - | 宽屏优化、最大宽度限制 |

---

## 7. 待确认问题（需架构师/工程师澄清的技术约束）

| # | 问题 | 影响范围 | 待定方案 |
|---|------|----------|----------|
| Q1 | 后端 MySQL/Redis 在沙箱环境可能不可用，测试如何隔离外部依赖？ | 后端单测/集成测试 | Testcontainers / Mock 数据源 / 内存 SQLite |
| Q2 | 小程序端 uni-app 编译产物在 Node 环境跑 Jest 需要特殊配置，是否已就绪？ | 小程序测试执行 | 确认 `jest.config.js` + `@vue/test-utils` 兼容性 |
| Q3 | Web端 18 个 Canvas 小游戏在 jsdom 环境无法渲染，如何做冒烟？ | Web 全路由冒烟 | Canvas stub / 离屏 Canvas / 仅挂载不渲染 |
| Q4 | 现有 Web 测试 235 例全通过，是否需要重跑作为基线？ | 测试执行策略 | 建议全量回归一次作为本次审计基线 |
| Q5 | 缺陷等级分类标准（P0-P3）的具体判定细则是否已有定义？ | 缺陷管理 | 沿用项目现有标准或参考行业通用定义 |
| Q6 | UI 排版检查是否引入视觉回归测试，还是仅人工清单？ | UI 质量保障 | 推荐：关键页面视觉快照 + 清单人工复核 |
| Q7 | 后端租户隔离逻辑（`stripUnsafe`、`teacherId` 作用域）是否覆盖所有 CRUD 模块？ | 数据安全 | 需全量扫描确认 |
| Q8 | 小程序端 `crud.vue` 通用页承载 29 个实体，是否有模块级差异化需求未满足？ | 功能完整性 | 对照功能缺口清单逐项核对 |
| Q9 | AI 流式输出在小程序端（`wx.cloud.callContainer` 分片）的稳定性如何？ | AI 功能体验 | 需实测验证降级策略 |
| Q10 | 生产环境 CORS_ORIGIN、JWT_SECRET、DB_SYNCHRONIZE 等配置是否已通过 CI 校验？ | 部署安全 | CI 管道需强制校验 |

---

## 8. 交付物清单

| 交付物 | 格式 | 产出阶段 | 责任人 |
|--------|------|----------|--------|
| Audit-PRD.md | Markdown | 需求阶段 | 产品经理 |
| Architecture-Design.md | Markdown + Mermaid | 设计阶段 | 架构师 |
| Task-Breakdown.json | JSON (有序任务列表、依赖图) | 设计阶段 | 架构师 |
| Test-Cases-Full.md | Markdown (结构化用例) | 实现前 | QA工程师 |
| Test-Data-Fixtures/ | TypeScript/JSON | 实现前 | QA工程师 + 工程师 |
| Test-Report.md | Markdown (统计/明细/缺陷分级) | 测试执行后 | QA工程师 |
| Defect-List.csv | CSV (ID/标题/严重度/模块/状态/修复提交) | 测试执行后 | QA工程师 |
| Fix-Verification-Report.md | Markdown | 修复回归后 | 工程师 + QA |
| UI-Audit-Report.md | Markdown (清单/截图/对比/优化建议) | UI审计后 | 前端工程师 |
| Final-Delivery-Summary.md | Markdown | 项目收尾 | 交付总监 |

---

## 9. 里程碑与时间盒（建议）

| 里程碑 | 产出 | 预估工时 |
|--------|------|----------|
| M1: PRD 评审通过 | Audit-PRD.md 签收 | 0.5d |
| M2: 架构设计 + 任务分解 | Architecture-Design.md + Task-Breakdown.json | 1d |
| M3: 测试用例全量编写 + 数据制备 | Test-Cases-Full.md + fixtures | 2d |
| M4: 自动化测试执行 + 报告 | Test-Report.md + Defect-List.csv | 2d |
| M5: 缺陷修复 + 回归验证 | Fix-Verification-Report.md | 2-3d |
| M6: UI 全页面排版审计 + 优化 | UI-Audit-Report.md | 1-2d |
| M7: 最终交付总结 | Final-Delivery-Summary.md | 0.5d |

**总计预估：9-11 人天**（可并行压缩至 5-6 天）

---

## 10. 约束与假设

- 沙箱环境 Node.js 仅有受管版本（`C:/Users/linfa/.workbuddy/binaries/node/versions/22.22.2/node.exe`），需用 `node node_modules/.bin/*` 入口脚本绕过 shell 包装器
- Gitee 推送需 PAT 内联认证，本地 ref 同步需手动写 loose ref 文件
- 现有 Web 测试基建完善（Jest + Vue Test Utils + jsdom），小程序/后端测试需补齐
- 后端依赖 MySQL/Redis，测试环境需解决 Q1
- 团队遵循 SOP：产品→架构→工程→QA 顺序流转，跨角色信息经主理人中转

---

## 11. 现有资产清单（可复用）

| 资产 | ��置 | 说明 |
|------|------|------|
| TEST_CASES_FULL.md | work-system/ | 全量测试用例（Web 250+、Server 185+、Mini 规划 300+） |
| SECURITY_AUDIT.md | work-system/ | 安全审计报告（10项发现，已修复高危/中危） |
| 功能缺口对比清单.md | work-system/ | 原始Web vs 当前项目模块级缺口（P0-P3） |
| 功能细节差异清单.md | work-system/ | Web ↔ 小程序 布局/交互/字段级差异（22轮迭代记录） |
| TEST_REPORT.md (即 TEST_CASES_FULL.md 第5节) | work-system/ | 测试执行结果：Server 185✅, Web 250✅, Mini 待跑 |

---

## 12. 已知风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 后端数据库不可用导致集成测试无法跑通 | P0-05, P0-08 受阻 | 优先搭建 Testcontainers/MySQL 内存模式；或用 Mock Adapter 替代 TypeORM |
| 小程序 Jest 环境配置复杂，单测覆盖率难达标 | P1-02, P2-04 受阻 | 先跑 Web/Server 基线，小程序测试采用分层策略（工具函数优先、页面组件次之） |
| UI 规范检查纯人工成本高，易漏检 | P1-01 交付延期 | 引入 Storybook + Visual Regression (Chromatic/Playwright snapshot) 覆盖核心 30 页面 |
| 缺陷分级标准不一致导致优先级争议 | P0-09 执行偏差 | 评审会统一定义 P0=阻塞发布/数据丢失/安全；P1=核心流程断裂；P2=体验受损；P3=建议优化 |

---

## 13. 签收确认

| 角色 | 签名 | 日期 |
|------|------|------|
| 产品经理 (许清楚) | ✅ 已签收 | 2026-07-26 |
| 架构师 (高见远) | ✅ 已签收 | 2026-07-26 |
| 技术负责人 (寇豆码) | ✅ 已签收 | 2026-07-26 |
| QA 负责人 (严过关) | ✅ 已签收 | 2026-07-26 |
| UI/前端负责人 (寇豆码) | ✅ 已签收 | 2026-07-26 |
| 交付总监 (齐活林) | ✅ 已签收 | 2026-07-26 |

---

*文档结束*