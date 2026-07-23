# 优化缺口执行报告（第六轮 · P0-1 / P0-2）

> 对象：园丁工作台（NestJS 后端 + 微信小程序前端）
> 数据库：MySQL 8.0.42 `gardener_test`（root/admin）
> 执行时间：2026-07-23

## 背景
上一轮缺口分析发现：**28 张业务表为空**（其中 17 张直接影响页面渲染），且所有业务表 **teacherId/classId 列无任何二级索引**，每次租户过滤查询均为全表扫描。

按计划依次执行 P0-1（补齐核心表种子数据）与 P0-2（补齐业务索引）。

---

## ✅ P0-1：核心表种子数据补齐

**新增脚本**：`test-deliverables/d-seed-core-tables.js`（可重复执行，幂等清插）

### 补齐范围（23 张表）
| 类别 | 表 | 插入行数 |
|---|---|---|
| 17 核心表 | todos(7) attendances(3) behavior_records(5) class_activities(3) class_expenses(4) class_galleries(3) reading_logs(4) reward_records(4) score_records(5) semesters(3) work_logs(4) lesson_plan_templates(4) parent_contacts(4) seat_layouts(2) duty_rosters(2) my_galleries(3) checkins(6) | 62 |
| 强相关引用表 | award_categories(5) group_scores(7) lesson_observations(2) home_visits(2) notice_templates(3) picker_history(3) | 22 |

### 关键设计
- 复用真实 `teacher / class / student` ID，租户隔离（teacherId/classId）与既有数据一致。
- simple-json / longtext 列以 `JSON.stringify` 写入；座位表/值日表生成结构化网格。
- 执行中修复 2 处脚本缺陷：
  - `parent_contacts` 数据数组错位（10 个变量仅提供 9 值 → `follow` 为 undefined）；
  - `seat_layouts` 的 `rows`/`cols` 为 MySQL 保留字，INSERT 需反引号包裹。

### 验证
- 23 张表行数均 > 0；租户隔离抽查（reward_records 按 classId+teacherId 分组）正确；无孤儿外键。
- REST 冒烟测试 **23/23** 端点返回数据（注意 `reward-records` 路由用连字符）。

---

## ✅ P0-2：业务索引补齐

**新增脚本**：`test-deliverables/e-add-business-indexes.js`（幂等，已存在索引跳过）

### 索引方案（33 个）
- 仅 teacherId：`todos / semesters / work_logs / lesson_plan_templates / my_galleries / award_categories / notice_templates / backup_snapshots / resources / notes / award_records`
- (teacherId, classId)：`attendances / class_activities / class_expenses / class_galleries / seat_layouts / duty_rosters / group_scores / lesson_observations / picker_history / grades / exams / notices / homework / schedules`
- (teacherId, classId, studentId)：`reward_records / score_records / parent_contacts`
- (teacherId, studentId)：`behavior_records / reading_logs / checkins / home_visits / growth_entries`

### 持久化
- 所有实体补 `@Index('idx_*', [...])` 装饰器（同名），重启 synchronize 自动保持；`npx nest build` 通过。

### 验证
- `CREATE INDEX` 新增 33 个，0 跳过。
- EXPLAIN 确认查询走索引：todos 扫描 3 行、reward_records 3 行、reading_logs 1 行（此前为全表）。
- 服务已用新 dist 重启（PID 10312），健康检查正常，23 端点数据可用。

---

## 后续建议（P1 / P2，未执行）
- **P1**：AI 生成类表（generated_papers / generated_lesson_plans / generated_knowledges / paper_queries / ai_settings）可按需造样例；前端 mock 与真实接口字段对齐复核。
- **P2**：慢查询日志监控、列表接口分页/排序统一性、统计类聚合接口（如积分排行榜）索引覆盖优化。
