# 前端风格改进方案

## 现状分析

### 优点
- 暖色系（奶油/黄油/樱花）契合教育场景，温馨不刺眼
- 有机三层投影系统统一，纸张悬浮感好
- 暗色模式完整，光照 token 统一
- 无障碍支持到位（reduced-motion、字号档位、大写锁定提示）
- 入场动效细腻（grow-in stagger）

### 可优化点

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 侧边栏仅 80px，图标+10px 小字，老年教师辨识困难 | 可用性 | 高 |
| 主按钮（butter 渐变）与次按钮对比不够强烈 | 操作效率 | 中 |
| 菜单色彩分类多（8 色），视觉噪音 | 认知负担 | 中 |
| 卡片圆角统一 24rpx，缺少层级区分 | 信息层次 | 低 |

---

## 改进方案一：Web 端侧边栏导航体验升级

### 问题
当前侧边栏仅 80px 宽，一级分类只显示图标 + 10px 小标签。对于中老年教师群体：
- 图标抽象难理解（如 `LayoutDashboard`、`School`、`Wrench`）
- 10px 标签在 1080p 屏幕上几乎不可读
- 当前选中态仅靠底色变化，视觉反馈弱

### 方案：可展开智能侧边栏

**交互逻辑**：
- 默认折叠态 72px（仅图标 + 微标签）
- 鼠标悬停 / 点击展开至 220px（图标 + 完整标签 + 分组预览）
- 展开时有 200ms 弹性动画
- 移动端保持抽屉式（已有 Sidebar 可复用）

**视觉优化**：
- 选中项增加左侧 3px 强调条（butter-400）
- 图标尺寸从 20px → 24px
- 展开后标签字号 14px，字重 500
- 分组标题显示（小字号、大写、字间距加宽）

### 核心代码

```vue
<!-- Sidebar.vue 改造要点 -->
<template>
  <aside 
    class="sidebar"
    :class="{ expanded: isExpanded, collapsed: !isExpanded }"
    @mouseenter="isExpanded = true"
    @mouseleave="isExpanded = false"
  >
    <!-- Logo 区 -->
    <div class="sidebar-logo">
      <div class="logo-icon">园丁</div>
      <transition name="fade">
        <span v-if="isExpanded" class="logo-text">园丁工作台</span>
      </transition>
    </div>

    <!-- 导航区 -->
    <nav class="sidebar-nav">
      <button
        v-for="cat in menu"
        :key="cat.label"
        class="nav-item"
        :class="{ active: activeCategory === cat.label }"
        @click="toggleCat(cat.label)"
      >
        <div class="nav-indicator" />
        <component :is="cat.icon" class="nav-icon" />
        <transition name="fade">
          <span v-if="isExpanded" class="nav-label">{{ cat.label }}</span>
        </transition>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  --w-collapsed: 72px;
  --w-expanded: 220px;
  width: var(--w-collapsed);
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.sidebar.expanded {
  width: var(--w-expanded);
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  transition: background 0.15s;
}
.nav-item:hover {
  background: rgb(var(--cream-100));
}
.nav-item.active {
  background: rgb(var(--butter-50));
}
.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  border-radius: 0 3px 3px 0;
  background: rgb(var(--butter-400));
  transition: height 0.2s;
}
.nav-item.active .nav-indicator {
  height: 24px;
}
.nav-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.nav-label {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

---

## 改进方案二：按钮层次与色彩体系优化

### 问题
当前按钮层次：
- `btn-primary`: butter 渐变（#ffd479 → #f5b342）
- `btn-secondary`: cream-100 底色
- 缺少第三级（ghost / text button）
- 缺少危险操作按钮（红色）
- 焦点状态不明显（仅 ring-butter-100）

### 方案：四级按钮体系 + 无障碍焦点

**层次定义**：

| 级别 | 样式 | 用途 |
|------|------|------|
| Primary | 深黄油渐变 + 投影 | 主操作（保存、提交、登录） |
| Secondary | 浅色底 + 边框 | 次要操作（取消、返回） |
| Ghost | 透明底 + hover 底色 | 表格内操作、图标按钮 |
| Danger | 红渐变 | 删除、注销 |

**色彩调整**：
- Primary 加深：`#f5b342` → `#e09e2c`（提升对比度至 WCAG AA）
- 增加 `ring-2 ring-butter-300` 焦点态（键盘导航可见）
- Disabled 态：opacity-50 + cursor-not-allowed

### 核心代码

```css
/* style.css 追加 */
@layer components {
  /* === 四级按钮体系 === */
  .btn-primary {
    @apply btn-pill;
    background: linear-gradient(135deg, #f5b342 0%, #d69426 100%);
    color: #fff;
    box-shadow: 0 4px 12px rgba(214, 148, 38, 0.3);
  }
  .btn-primary:hover {
    filter: brightness(1.05);
    box-shadow: 0 6px 16px rgba(214, 148, 38, 0.4);
  }
  .btn-primary:active {
    transform: scale(0.97);
  }
  .btn-primary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(245, 179, 66, 0.4);
  }

  .btn-secondary {
    @apply btn-pill;
    background: rgb(var(--cream-100));
    color: rgb(var(--cocoa-700));
    border: 1px solid rgb(var(--cream-200));
  }
  .btn-secondary:hover {
    background: rgb(var(--cream-200));
  }
  .btn-secondary:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(232, 221, 200, 0.5);
  }

  .btn-ghost {
    @apply btn-pill;
    background: transparent;
    color: rgb(var(--cocoa-600));
  }
  .btn-ghost:hover {
    background: rgb(var(--cream-100));
  }
  .btn-ghost:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(232, 221, 200, 0.5);
  }

  .btn-danger {
    @apply btn-pill;
    background: linear-gradient(135deg, #f56c6c 0%, #e04545 100%);
    color: #fff;
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
  }
  .btn-danger:hover {
    filter: brightness(1.05);
  }
  .btn-danger:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.4);
  }

  /* 禁用态 */
  .btn-primary:disabled,
  .btn-secondary:disabled,
  .btn-ghost:disabled,
  .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
}
```

---

## 实施建议

### 优先级排序
1. **按钮体系优化**（影响全站，改动小，收益大）
2. **侧边栏升级**（仅 Web 端，需测试 hover 交互）

### 渐进式实施
- 先在新组件中使用新样式，旧组件逐步迁移
- 通过 CSS 变量控制，支持 A/B 回滚
- 保留旧 class 作为 deprecated，6 个月后移除

### 验证方式
- 无障碍：axe-core 扫描对比度 ≥ 4.5:1
- 可用性：邀请 3-5 名教师实测任务完成率
- 性能：CSS 增量 < 2KB gzip
