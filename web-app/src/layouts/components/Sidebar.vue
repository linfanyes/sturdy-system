<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { teacherMenu, superMenu, schoolAdminMenu, flatNavItems, palette, roleLabel } from '../layoutMenus'
import type { Role } from '@/types/user'
import type { MenuCategory, MenuItem } from '../layoutMenus'
import { useParentKids } from '@/composables/useParentKids'

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

// 跨娃比对仅在家长关联 ≥2 名学生（同手机号多娃）时出现，否则默认隐藏
const parentKids = useParentKids()
const showCompare = computed(() => {
  if (auth.role !== 'parent') return true
  const c = parentKids.kidCount.value
  return c !== null && c > 1
})
const visibleFlatItems = computed<MenuItem[]>(() =>
  flatItems.value.filter((i) => i.name !== 'parent-compare' || showCompare.value),
)

const activeCategory = ref<string>('')
const openCats = ref<string[]>([])

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

// 家长端：预取关联孩子数，驱动「跨娃比对」菜单显隐
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
const profilePanel = ref<HTMLElement | null>(null)
const userAvatar = ref(localStorage.getItem('g_login_avatar') || '🍎')
const showManualPreview = ref(false)
const manualContent = ref('')

function toggleProfile() { showProfile.value = !showProfile.value }
function closeProfile() { showProfile.value = false }

function onDocumentClick(e: MouseEvent) {
  if (showProfile.value && profilePanel.value && !profilePanel.value.contains(e.target as Node)) {
    closeProfile()
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

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

// Simple markdown-to-HTML renderer
function renderMarkdown(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 border-b pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-cream-100 px-1 rounded text-xs">$1</code>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-butter-300 pl-3 italic text-cocoa-500 my-2">$1</blockquote>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-butter-600 underline">$1</a>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.length < 3) return match
      return '<div class="flex gap-2 my-1">' + cells.map(c => '<span class="flex-1 text-xs px-2 py-1 bg-cream-50 rounded">' + c.trim() + '</span>').join('') + '</div>'
    })
  return html
}

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'activeCategoryChange', value: string): void
}>()

watch(activeCategory, (val) => emit('activeCategoryChange', val))
</script>

<template>
  <aside class="w-20 shrink-0 border-r border-cream-200 bg-gradient-to-b from-cream-100/95 to-cream-50/95 backdrop-blur flex flex-col items-center py-4">
    <!-- Logo -->
    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-butter-300 to-butter-500 flex items-center justify-center text-white font-bold text-sm shadow-soft mb-6 leading-none">
      园丁
    </div>

    <!-- 一级分类图标按钮 -->
    <nav class="flex-1 w-full px-2 overflow-y-auto space-y-2">
      <!-- 教师三级菜单 -->
      <template v-if="auth.role === 'teacher'">
        <button
          v-for="cat in visibleTeacherMenu"
          :key="cat.label"
          class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
          :class="activeCategory === cat.label ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
          :aria-label="cat.label"
          :aria-expanded="activeCategory === cat.label"
          @click="toggleCat(cat.label)"
        >
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
          >
            <component :is="cat.icon" class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
        </button>
      </template>
      <!-- 超管 -->
      <template v-else-if="auth.role === 'super'">
        <template v-for="cat in superMenu" :key="cat.label">
          <router-link
            v-if="cat.direct"
            :to="(cat.groups[0]?.items[0]?.to) || '#'"
            @click="activeCategory = ''; openCats = []"
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="route.name === (cat.groups[0]?.items[0]?.name) ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            :aria-label="cat.label"
            :aria-current="route.name === (cat.groups[0]?.items[0]?.name) ? 'page' : undefined"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              :class="route.name === (cat.groups[0]?.items[0]?.name) ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
            >
              <component :is="cat.icon" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
          </router-link>
          <button
            v-else
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="activeCategory === cat.label ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            @click="toggleCat(cat.label)"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
            >
              <component :is="cat.icon" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
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
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="route.name === (cat.groups[0]?.items[0]?.name) ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            :aria-label="cat.label"
            :aria-current="route.name === (cat.groups[0]?.items[0]?.name) ? 'page' : undefined"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              :class="route.name === (cat.groups[0]?.items[0]?.name) ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
            >
              <component :is="cat.icon" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
          </router-link>
          <button
            v-else
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="activeCategory === cat.label ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            @click="toggleCat(cat.label)"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
            >
              <component :is="cat.icon" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
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
          class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
          :class="route.name === item.name ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
        >
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            :class="route.name === item.name ? palette(item.color || 'cream').bg : palette(item.color || 'cream').soft + ' ' + palette(item.color || 'cream').text"
          >
            <component :is="item.icon || User" class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ item.label }}</span>
        </router-link>
      </template>
    </nav>

    <!-- 用户头像+弹出面板 -->
    <div class="relative border-t border-cream-200/60 pt-3 w-full flex flex-col items-center">
      <button
        class="w-10 h-10 rounded-full bg-butter-300 hover:bg-butter-400 flex items-center justify-center transition-colors text-lg"
        :title="auth.user?.name || roleLabel[auth.role || 'teacher']"
        @click="toggleProfile"
      >
        {{ userAvatar }}
      </button>

      <!-- 弹出面板 -->
      <div
        v-if="showProfile"
        ref="profilePanel"
        class="absolute bottom-14 left-2 w-56 rounded-2xl bg-surface shadow-xl border border-cream-200 p-4 z-50 text-left"
      >
        <!-- 个人信息 -->
        <div class="flex items-center gap-3 mb-3 pb-3 border-b border-cream-100">
          <div class="w-10 h-10 rounded-full bg-butter-300 flex items-center justify-center shrink-0 text-lg">
            {{ userAvatar }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-cocoa-900 truncate">{{ auth.user?.name || '用户' }}</div>
            <div class="text-xs text-cocoa-400">{{ roleLabel[auth.role || 'teacher'] || auth.role }}</div>
            <div v-if="auth.user?.schoolName" class="text-xs text-cocoa-400 truncate">{{ auth.user.schoolName }}</div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-cocoa-700 hover:bg-cream-50 transition-colors"
          @click="previewManual"
        >
          <BookOpen class="w-4 h-4 text-butter-500" />
          <span>操作手册</span>
          <ChevronRight class="w-3 h-3 ml-auto text-cocoa-300" />
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-colors mt-1"
          @click="emit('logout')"
        >
          <LogOut class="w-4 h-4" />
          <span>退出登录</span>
        </button>
      </div>
    </div>

    <!-- 手册预览弹窗 -->
    <Teleport to="body">
      <div
        v-if="showManualPreview"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
        @click.self="showManualPreview = false"
      >
        <div class="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-surface shadow-xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-cream-200">
            <h3 class="text-lg font-bold text-cocoa-900">操作手册</h3>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1.5 rounded-lg text-sm text-cocoa-600 hover:bg-cream-100 transition-colors" @click="downloadManual">
                <Download class="w-4 h-4 inline mr-1" />下载
              </button>
              <button class="px-3 py-1.5 rounded-lg text-sm text-cocoa-600 hover:bg-cream-100 transition-colors" @click="showManualPreview = false">✕ 关闭</button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <div v-if="manualContent" class="prose prose-sm max-w-none text-cocoa-800" v-html="renderMarkdown(manualContent)" />
            <div v-else class="text-cocoa-400 py-10 text-center">加载中…</div>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>
