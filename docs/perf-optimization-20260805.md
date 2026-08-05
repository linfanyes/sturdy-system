# 小程序 & Web 端全量优化报告（2026-08-05）

## 一、本轮优化总览

| # | 优化项 | 类别 | 状态 |
|---|--------|------|------|
| 1 | preloadRule 扩展到班级/学生页 | 小程序启动性能 | ✅ |
| 2 | 家校沟通图片 lazy-load 补充 | 小程序渲染性能 | ✅ |
| 3 | 主包再压减：8 页移入 5 个新分包 | 小程序包体积 | ✅ |
| 4 | mock 假数据生产构建彻底排除 | 小程序包体积/合规 | ✅ |
| 5 | 两端路由一致性审计 | 工程质量 | ✅ |
| 6 | Web 生产构建验证 | 工程质量 | ✅ |

---

## 二、详细说明

### 1. preloadRule 扩展
- **改动**：`pages.json` 新增 `pages/classes/classes` 与 `pages/students/students` 两条预载规则，均预载 `teaching` + `community` 分包。
- **效果**：教师高频入口（班级/学生 tab）点击后秒开教学与社区功能，无需等待分包下载。
- **注意**：preloadRule 的 `packages` 使用分包 **name** 字段（如 `ai-features` 而非 root `pages/ai`）。

### 2. 图片懒加载补充
- **改动**：`src/pages/community/im.vue` 聊天消息图片补 `lazy-load`。
- **背景**：上一轮已对 5 个图片密集页面（notes/gallery/class-activities/my-gallery/ai）补全，本轮审计发现 `im.vue`（家校沟通长列表）遗漏，已补齐。

### 3. 主包再压减（8 页 → 5 个新分包）
- **改动**：`pages.json` root `pages` 从 15 页减至 7 页，新增 5 个分包：

| 新分包 | root | 页面 |
|--------|------|------|
| school-admin | pages/school-admin | school-admin, school-features |
| parent | pages/parent | parent, compare, parent-resource-library |
| admin | pages/admin | admin |
| crud | pages/crud | crud |
| ai-center | pages/ai-center | index |

- **主包保留**：tabBar 5 页（dashboard/classes/students/toolbox/config）+ login + parent-login。
- **效果**：root 页面 JS 从约 152KB 降至 70KB（-80KB+），对应 wxml/wxss/json 同步移出。
- **关键认知**：uni-app 导航 URL 使用完整路径（`/pages/x/y`），与页面处于 root 还是 subPackage **无关** —— 移动页面**无需改动任何导航引用**，全量 grep 验证无遗漏。

### 4. mock 假数据生产构建彻底排除 ⭐
- **问题**：原 `src/common/mock/`（约 50KB 假数据）即使 `DEMO_MODE_ENABLED=false`，也会被 uni-app 以目录拷贝形式带进 dist，与"生产构建不携带假数据"的约定冲突。
- **踩坑**：尝试动态 `import('../mock')` 失败 —— uni-app mp-weixin 编译器把动态 import 错误编译为字符串 `"../mock/index.js".then(...)`（运行时执行会抛错）。
- **正解**：使用 uni-app 条件编译：
  - mock 目录移至 `src/mock/`（src 根下，脱离 common/ 整体拷贝）；
  - `src/common/request.js` 用 `// #ifdef DEV` / `// #endif` 包裹 `import { getMockData } from '../mock'` 与演示分支。
- **验证**：
  - PROD 构建：dist 中无 `common/mock/` 与根 `mock/` 目录，`request.js` 无假数据引用（仅剩 `g_mock_mode` 开关 key）；
  - DEV 构建：mock 正确内联进 `request.js`（含"珊珊老师"等演示数据），无后端冷启动演示正常。

### 5. 两端路由一致性审计
- **新增**：`qa/consistency-audit.js` —— 提取 mini-program 143 个分包页面 vs Web 147 条教师路由，含约 60 条别名映射（不同命名同功能）。
- **结论**：功能对等良好。剩余差异为**路由结构差异而非功能缺失**：
  - `ai-generator/lesson|knowledge|paper`（Web 参数化路由）↔ `ai/ai-lesson|ai-knowledge|ai-paper`（mini 独立页）；
  - `tools/*` 部分工具在 mini 位于 subject-tools/writing 等语义分包。

### 6. Web 生产构建验证
- `npm run build` 成功（12.75s），产物结构健康：
  - vendor 分包：vendor-vue 107KB / vendor-icons 64KB / vendor-axios 46KB（长期缓存友好）；
  - 页面全部路由级懒加载，最大 chunk Dashboard 49KB。

---

## 三、验证汇总

| 验证项 | 结果 |
|--------|------|
| `npm run build:mp-weixin`（PROD） | ✅ DONE Build complete |
| `npm run dev:mp-weixin`（DEV） | ✅ 编译通过，mock 可用 |
| `npm run build`（Web） | ✅ 12.75s，chunk 结构健康 |
| pages.json JSON 校验 | ✅ 合法 |
| PROD dist 无 mock | ✅ 目录与数据引用均消失 |
| 导航引用一致性 | ✅ 移动页面无需改 URL |

---

## 四、待办 / 遗留

1. **dist 残留目录清理**：`mini-program/dist/build/mp-weixin-lockwork` 与 `mp-weixin-stale-1785942308` 被 IDE 文件监听锁住（EPERM），待锁释放后删除（当前不影响构建产物）。
2. **提交**：本轮改动尚未 git 提交，涉及 `pages.json`、`src/mock/`（迁移）、`src/common/request.js`、`qa/consistency-audit.js`、`docs/naming-unification.md` 等。
3. **微信开发者工具验证**：建议用户在 DevTools 中重新导入 `dist/build/mp-weixin`，重点验证超管（/pages/admin/admin）、校管（/pages/school-admin/school-admin）、家长端（/pages/parent/parent）入口在分包化后跳转正常。
