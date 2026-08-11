# 园丁工作台 · 4 项问题修复计划

> 前置：本地后端已恢复 `DB_SYNCHRONIZE=true` 运行，Web 端 dist@5210 四角色登录验证通过

---

## 一、分页选择 50 后消失（Web + 小程序同步）

**根因**：前端用 `v-if="totalFiltered > pageSize"` 控制分页栏。当 total 恰好等于 pageSize（如 50）时条件为 false，分页栏隐藏，用户无法翻页。

**Web 端修复（6 文件）**：
- `web-app/src/views/exams/Exams.vue`
- `web-app/src/views/exams/Grades.vue`
- `web-app/src/views/school-admin/Students.vue`
- `web-app/src/views/teacher/Students.vue`
- `web-app/src/views/workspace/Notices.vue`
- `web-app/src/components/CrudTable.vue`

统一将 `v-if="totalFiltered > pageSize"` 改为 `v-if="totalFiltered > 0 && pageSize < totalFiltered"`。

**小程序端修复（2 文件）**：
- `mini-program/src/pages/school-admin/school-admin.vue`
- `mini-program/src/pages/students/students.vue`

改为显式分页控件，total == pageSize 时仍显示分页栏。

**后端无需改动**（skip/take 分页逻辑正确）。

---

## 二、首次登录超管 404（Web + 小程序同步）

**排查方向**：
1. Web 端复现抓包：确认是前端路由 404 还是后端接口 404
2. 检查 `dist/` 是否包含 `/super` 路由 chunk
3. 检查 `router.beforeEach` 中 `auth.isLoggedIn` 和 `auth.role` 在跳转前是否已正确设置
4. 检查是否有竞态：登录 API 未返回就执行 `router.push`
5. 小程序端检查 `pages/login/login.vue` 超管分支 `uni.redirectTo('/pages/admin/admin')` 及 `pages.json` 注册

**修复方案**：
- 若前端竞态：`handleLogin()` 中 `await nextTick()` 确保路由守卫拿到最新 auth state
- 若构建产物缺失：重新构建 `web-app/dist/` 并验证 chunk
- 若小程序路由缺失：补注册 `pages/admin/admin`

---

## 三、家长开通数据可视化（Web + 小程序同步）

**需求**：校管 Dashboard 去掉"家长开通"纯数字卡，改为图表；教师 Dashboard 新增家长开通图表。

**Web 端**：
- 校管 `Dashboard.vue`：移除第 4 张概览数字卡，在资源分布区新增"家长开通率"横向条形图（各班开通数/学生数）
- 教师 `Dashboard.vue`：在"数据一览"区新增"家长开通率"卡片组（各班一行，进度条 + 百分比 + 趋势）

**小程序端**：
- 校管 `school-admin.vue`：去掉家长开通数字卡，改为迷你柱状图
- 教师 `dashboard.vue`：新增家长开通率横向条形图

---

## 四、全量图表优化（Web + 小程序同步）

**优化原则**：概览卡片保留数字但增加微型 sparkline 趋势；能用图表的不用纯数字；统一复用现有图表组件。

**Web 端优化清单**：
| 页面 | 优化内容 |
|------|----------|
| 教师 Dashboard | 6 张概览卡各增加微型 sparkline（最近 7 天变化） |
| 校管 Dashboard | 4 张概览卡各增加 sparkline |
| 超管 Dashboard | 4 张概览卡各增加 sparkline |
| 家长 Dashboard | 4 张概览卡 + 每周小结 4 张卡增加 sparkline |
| DataDashboard | 8 项核心指标卡增加迷你柱状图/趋势线 |
| Analysis.vue | 纯表格增加各科均分横向条形图 |
| GradeTrend.vue | 纯 CSS 横向条改为纵向柱状图 + Y 轴刻度 + 网格线 |

**小程序端优化清单**：
| 页面 | 优化内容 |
|------|----------|
| 教师 Dashboard | 今日出勤/待批改/课程增加微型柱状图 |
| 校管看板 | 两排统计卡增加图表 |
| data-dashboard | 已有 uCharts，优化交互和视觉统一 |
| grade-trend | 已有 Canvas，补充坐标轴/刻度/图例 |

---

## 五、实施顺序与验证

1. **分页 bug**（1-2h）→ 逐页面验证 50/100 选择后分页不消失
2. **超管 404**（1-2h）→ Web + 小程序清缓存首次登录验证
3. **家长开通图表**（2-3h）→ 截图对比确认图表展示
4. **全量图表优化**（3-4h）→ 逐页面截图存档确认视觉提升

**总预估：7-11 小时**

---

请确认后我将按顺序实施。