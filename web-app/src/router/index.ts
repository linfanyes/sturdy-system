import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/user'

/**
 * 路由表 + 角色守卫。
 * - meta.roles 标记该路由允许的角色；未标记则仅需登录
 * - 未登录访问受保护路由 → 跳转登录页
 * - 已登录但角色不匹配 → 跳转 403
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { layout: 'blank', title: '登录' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: { layout: 'blank', title: '无权限' },
  },
  // 超管
  {
    path: '/super',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true, roles: ['super'] as Role[] },
    children: [
      { path: '', name: 'super-dashboard', component: () => import('@/views/super/Dashboard.vue'), meta: { title: '超管工作台' } },
    ],
  },
  // 校管
  {
    path: '/school-admin',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true, roles: ['school_admin'] as Role[] },
    children: [
      { path: '', name: 'school-admin-dashboard', component: () => import('@/views/school-admin/Dashboard.vue'), meta: { title: '校管工作台' } },
      { path: 'teachers', name: 'school-admin-teachers', component: () => import('@/views/school-admin/Teachers.vue'), meta: { title: '教师管理' } },
      { path: 'classes', name: 'school-admin-classes', component: () => import('@/views/school-admin/Classes.vue'), meta: { title: '班级管理' } },
      { path: 'students', name: 'school-admin-students', component: () => import('@/views/school-admin/Students.vue'), meta: { title: '学生管理' } },
      { path: 'notices', name: 'school-admin-notices', component: () => import('@/views/school-admin/Notices.vue'), meta: { title: '学校公告' } },
    ],
  },
  // 教师
  {
    path: '/teacher',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] as Role[] },
    children: [
      { path: '', name: 'teacher-dashboard', component: () => import('@/views/teacher/Dashboard.vue'), meta: { title: '教师工作台' } },
    ],
  },
  // 家长
  {
    path: '/parent',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true, roles: ['parent'] as Role[] },
    children: [
      { path: '', name: 'parent-dashboard', component: () => import('@/views/parent/Dashboard.vue'), meta: { title: '家长查看' } },
    ],
  },
  // 根路径：按角色重定向到对应工作台
  {
    path: '/',
    name: 'home',
    redirect: () => {
      const raw = localStorage.getItem('trace_web_user')
      if (!raw) return { name: 'login' }
      const role = (JSON.parse(raw) as { role: string }).role
      const map: Record<string, string> = {
        super: '/super',
        school_admin: '/school-admin',
        teacher: '/teacher',
        parent: '/parent',
      }
      return map[role] || '/login'
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
    meta: { layout: 'blank', title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局守卫：登录态 + 角色校验
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  const roles = to.meta.roles as Role[] | undefined
  if (roles && auth.role && !roles.includes(auth.role)) {
    return { name: 'forbidden' }
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'home' }
  }
  return true
})

export default router
