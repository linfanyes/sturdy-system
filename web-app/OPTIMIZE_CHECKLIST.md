# Web 全页面排版优化清单

> 目标：所有页面美观、排版合理、风格统一、数据直观

## ✅ 一、全局基础（本轮优化）

| 优先级 | 项目 | 状态 |
|---|---|---|
| P0 | 图表组件：SvgBarChart / SvgPieChart / SvgLineChart | 待做 |
| P0 | 超管 Dashboard：增加统计看板 + 柱状图 + 饼图 | 待做 |
| P0 | 校管 Dashboard：增加统计看板 + 图表 | 待做 |
| P1 | 全局 style.css 增强（已优化卡片/表格/空态样式）| ✅ |

## 📊 二、超管模块（5 页）

| 页面 | 优化要点 | 状态 |
|---|---|---|
| super/Dashboard | 增加图表看板（学校注册趋势、角色分布饼图等）| 待做 |
| super/Schools | 表格卡片化、搜索优化 | 待做 |
| super/Admins | 状态筛选、表格优化 | 待做 |
| super/AuditLogs | 时间线样式、筛选优化 | 待做 |
| super/PlatformConfig | 折叠分组、表单卡片化 | 待做 |

## 🏫 三、校管模块（5 页）

| 页面 | 优化要点 | 状态 |
|---|---|---|
| school-admin/Dashboard | 图表（教师学科分布、班级学生数柱状图）| 待做 |
| school-admin/Teachers | 教师卡片网格、头像显示 | 待做 |
| school-admin/Classes | 班级卡片化、状态标签 | 待做 |
| school-admin/Students | 表格优化、导出按钮统一 | 待做 |
| school-admin/Notices | 公告卡片、时间线显示 | 待做 |

## 👨‍🏫 四、教师核心页（重点）

| 页面 | 优化要点 | 状态 |
|---|---|---|
| teacher/Dashboard | ✅ 已优化（横幅+统计+快捷工具+班级列表）| ✅ |
| workspace/Config | ✅ 已优化（AI 配置升级+ max-w-4xl） | ✅ |
| workspace/Profile | ✅ 已优化（max-w-4xl） | ✅ |
| workspace/Notes | 编辑器布局优化 | 待做 |
| workspace/Todos | 待办卡片化 + 状态拖拽 | 待做 |
| workspace/Schedule | 课表卡片化 | 待做 |
| workspace/Notices | 公告列表美化 | 待做 |
| workspace/Notifications | 通知列表 | 待做 |
| workspace/Messages | 消息列表 | 待做 |

## 📚 五、教师子模块（批量优化）

| 模块 | 页面数 | 当前模式 | 优化手段 |
|---|---|---|---|
| 班级管理 | 7 页 | CrudTable / PhotoAlbum | 共享组件已优化 |
| 学情与考试 | 7 页 | CrudTable / 自定义 | 空态/加载统一 |
| 学生评价 | 10 页 | CrudTable / 自定义 | 表格卡片化 |
| 家校沟通 | 3 页 | 自定义 | 布局优化 |
| AI 与备课 | 10 页 | CrudTable / AI 工具 | 已较好 |
| 课堂工具 | 27 页 | 各自小组件 | 卡片统一 |
| 教师办公 | 9 页 | 自定义 | 排版统一 |
| 小游戏 | 24 页 | 各自组件 | 已有基础 |

## ⭐ 六、家长模块

| 页面 | 优化要点 | 状态 |
|---|---|---|
| parent/Dashboard | ✅ 已优化 | ✅ |

## 🎨 七、全局组件

| 组件 | 优化要点 | 状态 |
|---|---|---|
| AppLayout | ✅ 侧边栏优化 + 暖色背景 | ✅ |
| Login | ✅ 已有良好设计 | ✅ |
| CrudTable | 表头固定优化 | 待做 |
| Modal | 圆角/阴影优化 | 待做 |
| BatchImportDialog | 拖拽区域美化 | 待做 |

---

**策略**：优先 P0 图表+管理看板 → 批量优化使用共享组件的页面 → 逐个优化自定义页面
