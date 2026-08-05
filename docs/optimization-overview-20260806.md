# 园丁工作台 · 全量优化总览（2026-08-05 ~ 08-06）

## 一、性能优化（小程序）

| 项 | 效果 |
|----|------|
| **主包分包压减** | 根页面 15 → 7（8 页移入 5 个新分包），主包 **2.04MB → 1.03MB（-50%）**，远低于 2MB 硬限制 / 1.5MB 理想线 |
| **mock 生产排除** | 条件编译 DEV/PROD 隔离，生产 dist 零假数据（目录与引用全无），DEV 演示正常 |
| **preloadRule 扩展** | dashboard + classes + students 三个入口预载 teaching/community 分包，高频页秒开 |
| **图片懒加载** | 6 个图片密集页面补齐 `lazy-load`（notes/gallery/class-activities/my-gallery/ai/im） |

## 二、UI 统一（两端）

| 项 | 改动 |
|----|------|
| **主色统一** | 小程序微信绿 → 黄油琥珀（`--c-primary #f5b342`），绿降级为成功语义（`--c-success`）；22 文件按钮 + 19 文件阴影 + 全局变量 |
| **登录页对齐** | 小程序登录页重写：光斑背景 + 品牌 chip + 黄油按钮 + 标语；Web 端已精致 |
| **工作台欢迎横幅** | 小程序 dashboard header → Web WelcomeHero 同款黄油渐变横幅（头像/光斑/名字高亮） |
| **tabBar 升级** | 5 组双态图标（灰/黄油，脚本生成）+ selectedColor 黄油化 |
| **圆角体系** | App.vue 新增 `--r-pill/lg/md/sm` token，高频页卡片统一 24rpx |

## 三、排版布局审计修复

| 项 | 改动 |
|----|------|
| **Element 蓝清理** | `#409eff` → 品牌蓝 `#1C6FB3`（小程序 58 文件 117 处 + Web 3 文件 5 处），白字对比度 3.1 → 4.6（达 WCAG AA） |
| **暗色内联类适配** | Web 新增 `--surface` 变量，`bg-white` → `bg-surface`（119 文件 368 处），暗色自动转暖棕 |
| **暗色巡检** | 小程序 132 页有暗色入口，compare.vue 3 处浅色背景 token 化 |
| **safe-area 补齐** | 小程序 18 页贴底弹层/FAB 补 `env(safe-area-inset-bottom)`（含已合规核验） |
| **可可棕 token 化** | `#4a3f35` → `var(--c-title)/var(--c-primary)`（15 文件 33 处） |
| **空状态组件** | 新增 Web `EmptyState.vue`（对齐小程序 EmptyState），核心视图覆盖确认 8/8 |

## 四、工程质量

- `.impeccable.md`：品牌设计上下文固化（温暖 · 手作 · 有光）
- `qa/consistency-audit.js`：两端路由一致性审计（143 mini vs 147 web 功能对等）
- `scripts/gen-tabbar-icons.py`：tabBar 图标生成脚本（Pillow，可重跑）
- 报告：`docs/perf-optimization-20260805.md` / `docs/ui-unification-20260805.md` / `docs/layout-audit-20260806.md`

## 五、最终状态

- 主包：**1.03 MB**（14 个分包，7 根页面）
- 两端构建：均通过（uni-app mp-weixin / Vite Web）
- 提交：`97af75f` → `686682f` → `1ae1379` → `64aa4d1`（已推送 gitee）

## 六、待办 / 已知限制

1. **github 远程推送失败**：本机未配 github SSH key，需用户配置后 `git push github master`
2. Web 端 `bg-cream-*` 内联类已随变量自动适配；个别富文本/canvas 字符串色值不可 token 化（保留）
3. 建议微信开发者工具导入 `dist/build/mp-weixin` 目检：登录页、工作台横幅、tabBar 图标、班级/学生页卡片、底部弹层 safe-area
