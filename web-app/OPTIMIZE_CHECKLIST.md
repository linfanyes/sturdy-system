# Web 全页面排版优化清单

> 目标：所有页面美观、排版合理、风格统一、数据直观

## ✅ 一、全局基础（本轮优化）

| 优先级 | 项目 | 状态 |
|---|---|---|
| P0 | 图表组件：SvgBarChart / SvgPieChart | ✅ |
| P0 | 超管 Dashboard：增加统计看板 + 柱状图 + 饼图 | ✅ |
| P0 | 校管 Dashboard：增加统计看板 + 图表 | ✅ |
| P1 | 全局 style.css 增强 | ✅ |
| P1 | 共享组件升级：Modal backdrop-blur+缩放动画 | ✅ |
| P1 | 共享组件升级：CrudTable card-soft+空态美化 | ✅ |

## 📊 二、超管模块（5 页）

| 页面 | 优化要点 | 状态 |
|---|---|---|
| super/Dashboard | 图表看板（学校统计+饼图+柱状图） | ✅ |
| super/Schools | 表格卡片化、Modal 组件重构 | ✅ |
| super/Admins | 表格优化、Modal 组件重构 | ✅ |
| super/AuditLogs | 筛选优化、暖色统一 | ✅ |
| super/PlatformConfig | 折叠分组、表单卡片化 | ✅ |

## 🏫 三、校管模块（5 页）

| 页面 | 优化要点 | 状态 |
|---|---|---|
| school-admin/Dashboard | 图表看板+统计卡片 | ✅ |
| school-admin/Teachers | 表格/Modal/暖色统一 | ✅ |
| school-admin/Classes | 班级管理+Modal 重构 | ✅ |
| school-admin/Students | 表格优化+筛选 | ✅ |
| school-admin/Notices | 公告管理 | ✅ |

## 👨‍🏫 四、教师核心页

| 页面 | 优化要点 | 状态 |
|---|---|---|
| teacher/Dashboard | 横幅+统计+快捷工具+班级列表 | ✅ |
| workspace/Config | AI 配置升级 | ✅ |
| workspace/Profile | 个人信息 | ✅ |
| workspace/Notes | 使用 CrudTable 继承升级 | ✅ |
| workspace/Todos | 使用 CrudTable 继承升级 | ✅ |
| workspace/Schedule | 使用 CrudTable 继承升级 | ✅ |
| workspace/Notices | 暖色列表卡片 | ✅ |
| workspace/Notifications | 暖色通知卡片 | ✅ |
| workspace/Messages | 分类 Tab+暖色卡片 | ✅ |

## 📚 五、教师子模块（全部暖色统一）

| 模块 | 页面数 | 优化方式 | 状态 |
|---|---|---|---|
| 班级管理 | 7 页 | CrudTable / PhotoAlbum 暖色继承 | ✅ |
| 学情与考试 | 8 页 | CrudTable / 暖色自定义 | ✅ |
| 学生评价 | 10 页 | CrudTable / 暖色自定义 | ✅ |
| 家校沟通 | 3 页 | CrudTable / 暖色自定义 | ✅ |
| AI 与备课 | 9 页 | CrudTable / AiTextTool 暖色 | ✅ |
| 课堂工具 | 27 页 | AiTextTool 暖色 / 独立交互 UI | ✅ |
| 教师办公 | 9 页 | CrudTable / AiTextTool 暖色 | ✅ |
| 小游戏 | 22 页 | 各自完整 UI | ✅ |

## ⭐ 六、家长模块

| 页面 | 优化要点 | 状态 |
|---|---|---|
| parent/Dashboard | 暖色横幅+统计数据+孩子看板 | ✅ |

## 🎨 七、全局组件

| 组件 | 优化要点 | 状态 |
|---|---|---|
| AppLayout | 侧边栏优化 + 暖色背景 | ✅ |
| Login | 已有良好设计 | ✅ |
| Modal | backdrop-blur+缩放动画+暖色 | ✅ |
| CrudTable | card-soft 包装+美化空态/加载态+暖色 | ✅ |
| BatchImportDialog | 暖色+双格式模板(txt/xls) | ✅ |

---

**最终验证**：
- vue-tsc -b 通过 ✅
- Web jest **255/255** ✅
- Server nest build 通过 ✅
- Server jest **185/185** ✅
- 所有 129 个 Vue 页面暖色主题覆盖 ✅
