<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { teacherMenu, superMenu, schoolAdminMenu, flatNavItems, palette, roleLabel } from '../layoutMenus'
import { LayoutDashboard, School, LogOut, User, Users, GraduationCap, ToggleLeft, Trash2, Bot, Settings, BookOpen, ChevronRight, Download } from 'lucide-vue-next'
import type { Role } from '@/types/user'
import type { MenuCategory, MenuItem } from '../layoutMenus'
import { useParentKids } from '@/composables/useParentKids'
import { escapeHtml } from '@gardener/shared/utils'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function hasFeature(feature?: string): boolean {
  if (!feature) return true
  const features = auth.user?.effectiveFeatures
  if (!features) return true
  return features.includes(feature)
}

const visibleTeacherMenu = computed<MenuCategory[]>(() => {
  const teacherSubject = auth.user?.subjects?.[0] || auth.user?.subject || ''
  return teacherMenu
    .map((cat) => ({
      ...cat,
      groups: cat.groups
        .map((g) => {
          if (g.subject && teacherSubject && g.subject !== teacherSubject) {
            return { ...g, items: [] }
          }
          return { ...g, items: g.items.filter((it) => hasFeature(it.feature)) }
        })
        .filter((g) => g.items.length > 0),
    }))
    .filter((cat) => cat.groups.length > 0)
})

const flatItems = computed<MenuItem[]>(() => (auth.role && auth.role !== 'teacher' ? flatNavItems[auth.role] : []))

const parentKids = useParentKids()
const showCompare = computed(() => {
  if (auth.role !== 'parent') return true
  const c = parentKids.kidCount.value
  return c !== null && c > 1
})
const visibleFlatItems = computed<MenuItem[]>(() =>
  flatItems.value.filter((i) => (i.name !== 'parent-compare' || showCompare.value) && hasFeature(i.feature)),
)

const activeCategory = ref<string>('')
const openCats = ref<string[]>([])

// 侧边栏展开状态
const isExpanded = ref(false)
let expandTimer: ReturnType<typeof setTimeout> | null = null
function handleMouseEnter() {
  expandTimer = setTimeout(() => { isExpanded.value = true }, 150)
}
function handleMouseLeave() {
  if (expandTimer) clearTimeout(expandTimer)
  isExpanded.value = false
}

function findCategoryForRoute(targetName: any) {
  for (const cat of visibleTeacherMenu.value) {
    if (cat.direct) continue
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  for (const cat of superMenu) {
    if (cat.direct) continue
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  for (const cat of schoolAdminMenu) {
    if (cat.direct) continue
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  return ''
}

function syncActiveCat() {
  const rootNames = ['teacher-dashboard', 'super-dashboard', 'school-admin-dashboard']
  if (rootNames.includes(route.name as string)) return
  const c = findCategoryForRoute(route.name)
  activeCategory.value = c
  if (c && !openCats.value.includes(c)) openCats.value = [...openCats.value, c]
}
onMounted(syncActiveCat)
watch(() => route.name, syncActiveCat)

onMounted(() => {
  if (auth.role === 'parent') parentKids.ensure()
})

function toggleCat(label: string) {
  const role = auth.role
  const menu = role === 'super' ? superMenu : role === 'school_admin' ? schoolAdminMenu : visibleTeacherMenu.value
  const cat = menu.find((c) => c.label === label)
  if (cat?.direct) {
    activeCategory.value = ''
    openCats.value = []
    router.push(cat.to || cat.groups[0]?.items[0]?.to || '/')
    return
  }
  if (activeCategory.value === label) {
    activeCategory.value = ''
    openCats.value = []
  } else {
    activeCategory.value = label
    openCats.value = [label]
  }
  router.push(role === 'super' ? '/super' : role === 'school_admin' ? '/school-admin' : '/teacher')
}

const showProfile = ref(false)
const userAvatar = ref(localStorage.getItem('g_login_avatar') || '🍎')
const showManualPreview = ref(false)
const manualContent = ref('')

function toggleProfile(e: Event) { e.stopPropagation(); showProfile.value = !showProfile.value }
function closeProfile() { showProfile.value = false }

const manualMap: Record<string, string> = {
  super: '/docs/super-admin-guide.md',
  school_admin: '/docs/school-admin-guide.md',
  teacher: '/docs/teacher-guide.md',
  parent: '/docs/parent-guide.md',
}
function openManual() {
  const url = manualMap[auth.role || 'teacher'] || '/docs/teacher-guide.md'
  window.open(url, '_blank')
}
async function previewManual() {
  const url = manualMap[auth.role || 'teacher'] || '/docs/teacher-guide.md'
  try {
    const resp = await fetch(url)
    manualContent.value = await resp.text()
    showManualPreview.value = true
  } catch { manualContent.value = '# 加载失败\n请检查网络连接' }
}
function downloadManual() {
  const url = manualMap[auth.role || 'teacher'] || '/docs/teacher-guide.md'
  const a = document.createElement('a')
  a.href = url
  a.download = url.split('/').pop() || 'manual.md'
  a.click()
}

function md2html(md: string): string {
  if (!md) return ''
  const raw = escapeHtml(md)
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '<br><br>')
  return raw.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
}

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'activeCategoryChange', value: string): void
}>()

watch(activeCategory, (val) => emit('activeCategoryChange', val))
</script>

<template>
  <aside
    class="sidebar"
    :class="{ expanded: isExpanded, collapsed: !isExpanded }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-icon">园丁</div>
      <Transition name="fade">
        <span v-if="isExpanded" class="logo-text">园丁工作台</span>
      </Transition>
    </div>

    <!-- 一级分类图标按钮 -->
    <nav class="sidebar-nav">
      <!-- 教师三级菜单 -->
      <template v-if="auth.role === 'teacher'">
        <button
          v-for="cat in visibleTeacherMenu"
          :key="cat.label"
          class="nav-item"
          :class="{ active: activeCategory === cat.label }"
          :aria-label="cat.label"
          :aria-expanded="activeCategory === cat.label"
          @click="toggleCat(cat.label)"
        >
          <div class="nav-indicator" />
          <div class="nav-icon-wrap" :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text">
            <component :is="cat.icon" class="w-[22px] h-[22px]" />
          </div>
          <span class="nav-label">{{ cat.label }}</span>
        </button>
      </template>
      <!-- 超管 -->
      <template v-else-if="auth.role === 'super'">
        <template v-for="cat in superMenu" :key="cat.label">
          <router-link
            v-if="cat.direct"
            :to="(cat.groups[0]?.items[0]?.to) || '#'"
            @click="activeCategory = ''; openCats = []"
            class="nav-item"
            :class="{ active: route.name === (cat.groups[0]?.items[0]?.name) }"
            :aria-label="cat.label"
            :aria-current="route.name === (cat.groups[0]?.items[0]?.name) ? 'page' : undefined"
          >
            <div class="nav-indicator" />
            <div class="nav-icon-wrap" :class="route.name === (cat.groups[0]?.items[0]?.name) ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text">
              <component :is="cat.icon" class="w-[22px] h-[22px]" />
            </div>
            <span class="nav-label">{{ cat.label }}</span>
          </router-link>
          <button
            v-else
            class="nav-item"
            :class="{ active: activeCategory === cat.label }"
            @click="toggleCat(cat.label)"
          >
            <div class="nav-indicator" />
            <div class="nav-icon-wrap" :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text">
              <component :is="cat.icon" class="w-[22px] h-[22px]" />
            </div>
            <span class="nav-label">{{ cat.label }}</span>
          </button>
        </template>
      </template>
      <!-- 校管 -->
      <template v-else-if="auth.role === 'school_admin'">
        <template v-for="cat in schoolAdminMenu" :key="cat.label">
          <router-link
            v-if="cat.direct"
            :to="(cat.groups[0]?.items[0]?.to) || '#'"
            @click="activeCategory = ''; openCats = []"
            class="nav-item"
            :class="{ active: route.name === (cat.groups[0]?.items[0]?.name) }"
            :aria-label="cat.label"
            :aria-current="route.name === (cat.groups[0]?.items[0]?.name) ? 'page' : undefined"
          >
            <div class="nav-indicator" />
            <div class="nav-icon-wrap" :class="route.name === (cat.groups[0]?.items[0]?.name) ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text">
              <component :is="cat.icon" class="w-[22px] h-[22px]" />
            </div>
            <span class="nav-label">{{ cat.label }}</span>
          </router-link>
          <button
            v-else
            class="nav-item"
            :class="{ active: activeCategory === cat.label }"
            @click="toggleCat(cat.label)"
          >
            <div class="nav-indicator" />
            <div class="nav-icon-wrap" :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text">
              <component :is="cat.icon" class="w-[22px] h-[22px]" />
            </div>
            <span class="nav-label">{{ cat.label }}</span>
          </button>
        </template>
      </template>
      <!-- 其他非教师扁平菜单（家长） -->
      <template v-else>
        <router-link
          v-for="item in visibleFlatItems"
          :key="item.name"
          :to="item.to"
          replace
          class="nav-item"
          :class="{ active: route.name === item.name }"
        >
          <div class="nav-indicator" />
          <div class="nav-icon-wrap" :class="route.name === item.name ? palette(item.color || 'cream').bg : palette(item.color || 'cream').soft + ' ' + palette(item.color || 'cream').text">
            <component :is="item.icon || User" class="w-[22px] h-[22px]" />
          </div>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </template>
    </nav>

    <!-- 用户头像+弹出面板 -->
    <div class="sidebar-footer">
      <button
        class="footer-avatar"
        :title="auth.user?.name || roleLabel[auth.role || 'teacher']"
        @click="toggleProfile"
      >
        {{ userAvatar }}
      </button>

      <!-- 弹出面板 -->
      <Teleport to="body">
        <div v-if="showProfile" class="fixed inset-0 z-50" @click="closeProfile">
          <div class="absolute bottom-16 left-6 w-56 rounded-2xl bg-surface shadow-xl border border-cream-200 p-4" @click.stop>
            <div class="flex items-center gap-3 mb-3 pb-3 border-b border-cream-100">
              <div class="w-10 h-10 rounded-full bg-butter-300 flex items-center justify-center shrink-0 text-lg">{{ userAvatar }}</div>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-cocoa-900 truncate">{{ auth.user?.name || '用户' }}</div>
                <div class="text-xs text-cocoa-400">{{ roleLabel[auth.role || 'teacher'] || auth.role }}</div>
                <div v-if="auth.user?.schoolName" class="text-xs text-cocoa-400 truncate">{{ auth.user.schoolName }}</div>
              </div>
            </div>
            <button class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-cocoa-700 hover:bg-cream-50 transition-colors" @click="previewManual">
              <BookOpen class="w-4 h-4 text-butter-500" /><span>操作手册</span><ChevronRight class="w-3 h-3 ml-auto text-cocoa-300" />
            </button>
            <button class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-colors mt-1" @click="emit('logout')">
              <LogOut class="w-4 h-4" /><span>退出登录</span>
            </button>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- 手册预览弹窗 -->
    <Teleport to="body">
      <div v-if="showManualPreview" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" @click.self="showManualPreview = false">
        <div class="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-surface shadow-xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-cream-200">
            <h3 class="text-lg font-bold text-cocoa-900">操作手册</h3>
            <div class="flex items-center gap-2">
              <button class="btn-ghost px-3 py-1.5 text-sm" @click="downloadManual"><Download class="w-4 h-4 inline mr-1" />下载</button>
              <button class="btn-ghost px-3 py-1.5 text-sm" @click="showManualPreview = false">✕ 关闭</button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <div v-if="manualContent" class="prose prose-sm max-w-none text-cocoa-800" v-html="md2html(manualContent)" />
            <div v-else class="text-cocoa-400 py-10 text-center">加载中…</div>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.sidebar {
  --w-collapsed: 72px;
  --w-expanded: 220px;
  width: var(--w-collapsed);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  background: linear-gradient(to bottom, rgba(255, 248, 232, 0.95), rgba(255, 243, 220, 0.95));
  backdrop-filter: blur(12px);
  border-right: 1px solid rgb(var(--cream-200) / 0.6);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}
.sidebar.expanded {
  width: var(--w-expanded);
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 16px;
  min-height: 56px;
}
.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgb(var(--butter-300)), rgb(var(--butter-500)));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(214, 148, 38, 0.25);
}
.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: rgb(var(--cocoa-800));
  white-space: nowrap;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgb(var(--cream-300));
  border-radius: 2px;
}

/* Nav Item */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.15s, transform 0.1s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
}
.nav-item:hover {
  background: rgb(var(--cream-100));
}
.nav-item:active {
  transform: scale(0.98);
}
.nav-item.active {
  background: rgb(var(--butter-50));
}

/* Active Indicator */
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

/* Icon */
.nav-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.nav-item:hover .nav-icon-wrap {
  transform: scale(1.05);
}

/* Label */
.nav-label {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--cocoa-700));
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.2s 0.05s, transform 0.2s 0.05s;
}
.sidebar.expanded .nav-label {
  opacity: 1;
  transform: translateX(0);
}

/* Footer */
.sidebar-footer {
  border-top: 1px solid rgb(var(--cream-200) / 0.5);
  padding-top: 12px;
  display: flex;
  justify-content: center;
  position: relative;
}
.footer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(var(--butter-300)), rgb(var(--butter-400)));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: none;
}
.footer-avatar:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(214, 148, 38, 0.3);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dark mode */
.dark .sidebar {
  background: linear-gradient(to bottom, rgba(35, 38, 45, 0.95), rgba(28, 30, 35, 0.95));
  border-right-color: rgba(255, 255, 255, 0.06);
}
.dark .logo-text {
  color: rgb(var(--cream-100));
}
.dark .nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
}
.dark .nav-item.active {
  background: rgba(245, 179, 66, 0.1);
}
.dark .nav-label {
  color: rgb(var(--cream-200));
}
.dark .sidebar-footer {
  border-top-color: rgba(255, 255, 255, 0.06);
}
</style>
