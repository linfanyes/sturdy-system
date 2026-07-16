import { createRouter, createWebHashHistory, type RouteRecordRaw, type Router } from 'vue-router'
import { useUserStore } from '../stores/user'
import { toolRoutes } from './tools'
import { gameRoutes } from './games'

/**
 * 是否启用 /dev/seed 等开发专用路由.
 * 按项目硬约束: 仅在开发环境 (import.meta.env.DEV) 注册,
 * 例外: Electron 打包构建通过 preload 暴露的 window.__ELECTRON_PACKAGED__ 显式启用.
 */
declare global {
  interface Window {
    __ELECTRON_PACKAGED__?: boolean
  }
}
const ENABLE_DEV_SEED = import.meta.env.DEV || Boolean(
  typeof window !== 'undefined' && window.__ELECTRON_PACKAGED__,
)

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { layout: 'blank' },
  },
  {
    path: '/',
    name: 'app',
    component: () => import('../components/layout/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '工作台', icon: '🏠' },
      },
      {
        path: 'notes',
        name: 'notes',
        component: () => import('../views/Note.vue'),
        meta: { title: '我的笔记', icon: '📒' },
      },
      {
        path: 'classes',
        name: 'classes',
        component: () => import('../views/ClassManage.vue'),
        meta: { title: '班级管理', icon: '🏫' },
      },
      {
        path: 'students',
        name: 'students',
        component: () => import('../views/StudentManage.vue'),
        meta: { title: '学生管理', icon: '🧒' },
      },
      {
        path: 'grades',
        name: 'grades',
        component: () => import('../views/GradeManage.vue'),
        meta: { title: '成绩管理', icon: '📊' },
      },
      {
        path: 'exams',
        name: 'exams',
        component: () => import('../views/ExamManage.vue'),
        meta: { title: '考试管理', icon: '📋' },
      },
      {
        path: 'teachers',
        name: 'teachers',
        component: () => import('../views/TeacherDirectory.vue'),
        meta: { title: '教师通讯录', icon: '📇' },
      },
      {
        path: 'toolbox',
        name: 'toolbox',
        component: () => import('../views/Toolbox.vue'),
        meta: { title: '常用工具箱', icon: '🧰' },
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: () => import('../views/Schedule.vue'),
        meta: { title: '我的课表', icon: '📅' },
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('../views/Attendance.vue'),
        meta: { title: '考勤管理', icon: '✅' },
      },
      {
        path: 'homework',
        name: 'homework',
        component: () => import('../views/Homework.vue'),
        meta: { title: '作业管理', icon: '📝' },
      },
      {
        path: 'notice',
        name: 'notice',
        component: () => import('../views/Notice.vue'),
        meta: { title: '班级公告', icon: '📣' },
      },
      {
        path: 'resource',
        name: 'resource',
        component: () => import('../views/Resource.vue'),
        meta: { title: '教学资源', icon: '📚' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '个人中心', icon: '👤' },
      },
      {
        path: 'parent-contact',
        name: 'parent-contact',
        component: () => import('../views/ParentContact.vue'),
        meta: { title: '家长联系', icon: '📞' },
      },
      {
        path: 'growth',
        name: 'growth',
        component: () => import('../views/GrowthArchive.vue'),
        meta: { title: '成长档案', icon: '🌱' },
      },
      {
        path: 'behavior',
        name: 'behavior',
        component: () => import('../views/BehaviorObs.vue'),
        meta: { title: '行为观察', icon: '👀' },
      },
      {
        path: 'lesson-obs',
        name: 'lesson-obs',
        component: () => import('../views/LessonObs.vue'),
        meta: { title: '听课记录', icon: '📝' },
      },
      {
        path: 'work-log',
        name: 'work-log',
        component: () => import('../views/WorkLogView.vue'),
        meta: { title: '工作日志', icon: '📓' },
      },
      {
        path: 'class-finance',
        name: 'class-finance',
        component: () => import('../views/ClassFinance.vue'),
        meta: { title: '班费管理', icon: '💰' },
      },
      {
        path: 'duty-roster',
        name: 'duty-roster',
        component: () => import('../views/DutyRosterView.vue'),
        meta: { title: '轮值表', icon: '📋' },
      },
      {
        path: 'class-activity',
        name: 'class-activity',
        component: () => import('../views/ClassActivityView.vue'),
        meta: { title: '班级活动', icon: '🎉' },
      },
      {
        path: 'class-gallery',
        name: 'class-gallery',
        component: () => import('../views/ClassGallery.vue'),
        meta: { title: '班级风采', icon: '📸' },
      },
      {
        path: 'games',
        name: 'games',
        component: () => import('../views/games/GamesIndex.vue'),
        meta: { title: '小游戏合集', icon: '🎮', keepAlive: true },
      },
      ...toolRoutes,
      ...gameRoutes,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { layout: 'blank' },
  },
]

// 按环境隔离开发路由: 仅 dev 模式或 Electron 打包态注册 /dev/seed
if (ENABLE_DEV_SEED) {
  routes.splice(routes.length - 1, 0, {
    path: '/dev/seed',
    name: 'dev-seed',
    component: () => import('../views/DevSeed.vue'),
    meta: { layout: 'blank' as const, requiresAuth: true, title: '测试数据生成器' },
  })
}

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && userStore.user) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
