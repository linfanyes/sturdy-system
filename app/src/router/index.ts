import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'

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
        path: 'toolbox/picker',
        name: 'tool-picker',
        component: () => import('../views/tools/RandomPicker.vue'),
        meta: { title: '随机点名', icon: '🎯' },
      },
      {
        path: 'toolbox/timer',
        name: 'tool-timer',
        component: () => import('../views/tools/Timer.vue'),
        meta: { title: '倒计时', icon: '⏱️' },
      },
      {
        path: 'toolbox/calc',
        name: 'tool-calc',
        component: () => import('../views/tools/Calc.vue'),
        meta: { title: '课堂计算器', icon: '🧮' },
      },
      {
        path: 'toolbox/comment',
        name: 'tool-comment',
        component: () => import('../views/tools/CommentGen.vue'),
        meta: { title: '评语生成', icon: '✍️' },
      },
      {
        path: 'toolbox/test-paper',
        name: 'tool-test-paper',
        component: () => import('../views/tools/TestPaper.vue'),
        meta: { title: '优选试卷', icon: '📝' },
      },
      {
        path: 'toolbox/lesson-plan',
        name: 'tool-lesson-plan',
        component: () => import('../views/tools/LessonPlan.vue'),
        meta: { title: '优质教案', icon: '📚' },
      },
      {
        path: 'toolbox/math',
        name: 'tool-math',
        component: () => import('../views/tools/MathGen.vue'),
        meta: { title: '口算生成', icon: '➕' },
      },
      {
        path: 'toolbox/schedule-maker',
        name: 'tool-schedule',
        component: () => import('../views/tools/ScheduleMaker.vue'),
        meta: { title: '课表排版', icon: '🗓️' },
      },
      {
        path: 'toolbox/color',
        name: 'tool-color',
        component: () => import('../views/tools/ColorPick.vue'),
        meta: { title: '取色器', icon: '🎨' },
      },
      {
        path: 'toolbox/reward',
        name: 'tool-reward',
        component: () => import('../views/tools/Reward.vue'),
        meta: { title: '奖惩记录', icon: '🏅' },
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
        path: 'toolbox/ai',
        name: 'tool-ai',
        component: () => import('../views/AI.vue'),
        meta: { title: 'AI 对话', icon: '🤖' },
      },
      {
        path: 'toolbox/translate',
        name: 'tool-translate',
        component: () => import('../views/tools/Translate.vue'),
        meta: { title: '翻译', icon: '🌐' },
      },
      {
        path: 'toolbox/flower',
        name: 'tool-flower',
        component: () => import('../views/tools/FlowerGame.vue'),
        meta: { title: '笑口常开', icon: '🌸' },
      },
      {
        path: 'toolbox/award',
        name: 'tool-award',
        component: () => import('../views/tools/AwardRecord.vue'),
        meta: { title: '获奖记录', icon: '🏆' },
      },
      // ---- 新增功能模块 ----
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
        path: 'grade-trend',
        name: 'grade-trend',
        component: () => import('../views/GradeTrend.vue'),
        meta: { title: '成绩趋势', icon: '📈' },
      },
      {
        path: 'toolbox/seat-map',
        name: 'tool-seat',
        component: () => import('../views/tools/SeatMap.vue'),
        meta: { title: '座位表', icon: '💺' },
      },
      {
        path: 'toolbox/score-panel',
        name: 'tool-score',
        component: () => import('../views/tools/ScorePanel.vue'),
        meta: { title: '加减分', icon: '🏅' },
      },
      {
        path: 'toolbox/notice-template',
        name: 'tool-notice-tpl',
        component: () => import('../views/tools/NoticeTemplate.vue'),
        meta: { title: '通知模板', icon: '📋' },
      },
      {
        path: 'toolbox/plan-template',
        name: 'tool-plan-tpl',
        component: () => import('../views/tools/PlanTemplateLib.vue'),
        meta: { title: '教案模板库', icon: '📑' },
      },
      {
        path: 'toolbox/paper',
        name: 'tool-paper',
        component: () => import('../views/tools/Paper.vue'),
        meta: { title: '教育论文', icon: '📝' },
      },
      // 小游戏合集
      {
        path: 'games',
        name: 'games',
        component: () => import('../views/games/GamesIndex.vue'),
        meta: { title: '小游戏合集', icon: '🎮', keepAlive: true },
      },
      {
        path: 'games/2048',
        name: 'game-2048',
        component: () => import('../views/games/Game2048.vue'),
        meta: { title: '2048', icon: '🔢', keepAlive: true },
      },
      {
        path: 'games/minesweeper',
        name: 'game-minesweeper',
        component: () => import('../views/games/GameMinesweeper.vue'),
        meta: { title: '扫雷', icon: '💣', keepAlive: true },
      },
      {
        path: 'games/snake',
        name: 'game-snake',
        component: () => import('../views/games/GameSnake.vue'),
        meta: { title: '贪吃蛇', icon: '🐍', keepAlive: true },
      },
      {
        path: 'games/tic-tac-toe',
        name: 'game-tic-tac-toe',
        component: () => import('../views/games/GameTicTacToe.vue'),
        meta: { title: '井字棋', icon: '⭕', keepAlive: true },
      },
      {
        path: 'games/gomoku',
        name: 'game-gomoku',
        component: () => import('../views/games/GameGomoku.vue'),
        meta: { title: '五子棋', icon: '⚫', keepAlive: true },
      },
      {
        path: 'games/match3',
        name: 'game-match3',
        component: () => import('../views/games/GameMatch3.vue'),
        meta: { title: '消消乐', icon: '🧩', keepAlive: true },
      },
      {
        path: 'games/whack',
        name: 'game-whack',
        component: () => import('../views/games/GameWhack.vue'),
        meta: { title: '打地鼠', icon: '🔨', keepAlive: true },
      },
      {
        path: 'games/puzzle',
        name: 'game-puzzle',
        component: () => import('../views/games/GamePuzzle.vue'),
        meta: { title: '数字华容道', icon: '🧠', keepAlive: true },
      },
      {
        path: 'games/tetris',
        name: 'game-tetris',
        component: () => import('../views/games/GameTetris.vue'),
        meta: { title: '俄罗斯方块', icon: '🎮', keepAlive: true },
      },
      {
        path: 'games/plane',
        name: 'game-plane',
        component: () => import('../views/games/GamePlane.vue'),
        meta: { title: '飞机大战', icon: '✈️', keepAlive: true },
      },
      {
        path: 'games/motorcycle',
        name: 'game-motorcycle',
        component: () => import('../views/games/GameMotorcycle.vue'),
        meta: { title: '极速摩托', icon: '🏍️', keepAlive: true },
      },
      {
        path: 'games/car-crash',
        name: 'game-car-crash',
        component: () => import('../views/games/GameCarCrash.vue'),
        meta: { title: '汽车躲避', icon: '🚗', keepAlive: true },
      },
    ],
  },
  // dev-only: 测试数据生成器
  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev/seed',
          name: 'dev-seed',
          component: () => import('../views/DevSeed.vue'),
          meta: { layout: 'blank' as const, requiresAuth: true, title: '测试数据生成器' },
        },
      ]
    : []),
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { layout: 'blank' },
  },
]

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
