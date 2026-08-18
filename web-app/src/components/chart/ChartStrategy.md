# 图表组件策略

## 使用规范

### ECharts（echarts）
适用场景：
- 雷达图（多维度对比）
- 复杂交互图表（缩放、拖拽、数据区域选择）
- 大数据量图表（>100 数据点）
- 需要动态更新/动画的图表

使用位置：
- `views/teacher/FiveEduProfile.vue` — 五育雷达图

### SVG 图表（SvgPieChart / SvgLineChart / SvgBarChart）
适用场景：
- 简单静态图表（<20 数据点）
- 无需交互的展示型图表
- 对加载性能敏感的首屏位置

使用位置：
- `views/super/Dashboard.vue` — 学校状态饼图
- `views/parent/components/GradeOverview.vue` — 成绩趋势线图/柱图

## 原则
1. 新图表默认使用 ECharts（功能更全、维护成本低）
2. 已有 SVG 图表保持不动（避免不必要重构）
3. 首屏关键指标卡片如需图表，优先 SVG（轻量）
