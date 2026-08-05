# 两端排版布局全量审计报告（2026-08-06）

## 一、扫描范围
- **小程序端**：`mini-program/src/pages/` 全部 150+ 页面（超管 admin / 校管 school-admin / 教师 dashboard+community+teaching / 家长 parent / 工具 games+tools 等）
- **Web 端**：`web-app/src/views/` 全部视图（super / school-admin / teacher / parent + 工具/游戏）

## 二、发现的问题与修复

### ✅ 已修复

| # | 问题 | 严重度 | 修复 |
|---|------|--------|------|
| 1 | **Element 蓝 `#409eff` 大量残留**（小程序 **58 文件 117 处**、Web 3 文件 5 处）——Web Element 风格遗留，与"温暖园丁风"冲突 | 🔴 高 | 统一为**品牌蓝**：小程序 `var(--c-blue)`（#1C6FB3，与 Web sky2-500 对齐）；Web `#1C6FB3`。附带收益：白字对比度 #409eff(3.1:1) → #1C6FB3(4.6:1)，**可达 WCAG AA** |
| 2 | **底部弹层缺 safe-area**（iPhone 底部横条遮挡）——75 个 fixed 元素仅 7 个处理 | 🟠 中 | 高频底部 sheet 补齐 `padding-bottom: calc(36rpx + env(safe-area-inset-bottom))`（classes 班级弹窗、messages 消息弹窗）；im 输入栏已合规 |

### ✅ 审计通过（无需改）

| 项 | 结论 |
|----|------|
| 过小字号（16-19rpx，18 页面） | 均为**徽章/角标/格子小数字**（caption 层），合理 |
| 红色 `#e64340`（73 处）vs `--c-danger` #f56c6c | 语义划分合理：#e64340=强警示（角标/删除按钮），f56c6c=错误提示（表单）。保留双红但语义明确 |
| 绿色 `#07c160`（53 处） | 成功/达标语义色，符合规范 |
| `#e6a23c`（113 处） | = `--c-accent` 琥珀，品牌色直写，视觉一致 |

### 🟡 后续可选（本轮未做，控制回归面）

| 项 | 说明 |
|----|------|
| 其余 ~68 个底部 fixed 元素补 safe-area | 多为居中弹窗/FAB，风险低收益低，建议按页面逐个补 |
| `#e06c75`（33 处，第三套红/粉） | 日历标记等，建议后续收敛到 pink 系 token |
| `#4a3f35`（33 处）直写 | = `--c-title`，可批量 token 化 |

## 三、验证
- 小程序 `npm run build:mp-weixin` ✅ 构建成功
- Web `npm run build` ✅ 构建成功（11.5s）
- `#409eff` 残留：小程序 **0**，Web 仅 GameBreakout（游戏砖块素材色，故意保留）
- Web 品牌蓝确认：school-admin Dashboard 2 处、super Dashboard 1 处 `#1C6FB3`

## 四、平台规范符合性小结
- ✅ 触控目标：按钮均 ≥ 88rpx（44px）
- ✅ 暗色模式：两端均有暖棕夜间风
- ✅ 胶囊按钮/卡片圆角：已 token 化（上轮）
- ✅ tabBar 图标 + 黄油选中色（上轮）
- ⚠️ safe-area：高频弹层已补，长尾待逐页补
