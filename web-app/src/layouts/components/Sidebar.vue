<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoleSwitchStore } from '@/stores/roleSwitch'
import { LayoutDashboard, School, LogOut, User, Repeat, Users, GraduationCap, ToggleLeft, Trash2, Bot, Settings } from 'lucide-vue-next'
import { teacherMenu, superMenu, schoolAdminMenu, flatNavItems, palette, roleLabel } from '../layoutMenus'
import type { Role } from '@/types/user'
import type { MenuCategory, MenuItem } from '../layoutMenus'
import { useParentKids } from '@/composables/useParentKids'

const auth = useAuthStore()
const roleSwitchStore = useRoleSwitchStore()
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

const canSwitchToParent = computed(() => !!roleSwitchStore.teacherToken && auth.role === 'teacher')

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'switchToParent'): void
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

    <!-- 用户信息底部 -->
    <div class="border-t border-cream-200/60 pt-3 w-full flex flex-col items-center gap-2">
      <div class="w-9 h-9 rounded-full bg-butter-300 flex items-center justify-center">
        <User class="w-4 h-4 text-cocoa-700" />
      </div>
      <button
        v-if="canSwitchToParent"
        class="p-1.5 rounded-lg hover:bg-cream-200 text-[#E6A23C] relative group"
        title="切换至家长端"
        @click="emit('switchToParent')"
      >
        <Repeat class="w-4 h-4" />
        <span class="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-cocoa-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          切换至家长端
        </span>
      </button>
      <button class="p-1.5 rounded-lg hover:bg-cream-200 text-cocoa-500" title="退出登录" @click="emit('logout')">
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>
