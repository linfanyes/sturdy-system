import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/user'

/**
 * 路由表 + 角色守卫。
 * - meta.roles 标记该路由允许的角色；未标记则仅需登录
 * - meta.feature 标记该教师路由所需的功能权限 key（空数组或 features 含空串时放行）
 * - 未登录访问受保护路由 → 跳转登录页
 * - 已登录但角色不匹配 → 跳转 403
 */
export const routes: RouteRecordRaw[] = [
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
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['super'] as Role[] },
    children: [
      { path: '', name: 'super-dashboard', component: () => import('@/views/super/Dashboard.vue'), meta: { title: '超管工作台' } },
      { path: 'schools', name: 'super-schools', component: () => import('@/views/super/Schools.vue'), meta: { title: '学校管理' } },
      { path: 'admins', name: 'super-admins', component: () => import('@/views/super/Admins.vue'), meta: { title: '管理员管理' } },
      { path: 'audit-logs', name: 'super-audit-logs', component: () => import('@/views/super/AuditLogs.vue'), meta: { title: '审计日志' } },
      { path: 'config', name: 'super-config', component: () => import('@/views/super/PlatformConfig.vue'), meta: { title: '平台配置' } },
    ],
  },
  // 校管
  {
    path: '/school-admin',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['school_admin'] as Role[] },
    children: [
      { path: '', name: 'school-admin-dashboard', component: () => import('@/views/school-admin/Dashboard.vue'), meta: { title: '校管工作台' } },
      { path: 'teachers', name: 'school-admin-teachers', component: () => import('@/views/school-admin/Teachers.vue'), meta: { title: '教师管理' } },
      { path: 'classes', name: 'school-admin-classes', component: () => import('@/views/school-admin/Classes.vue'), meta: { title: '班级管理' } },
      { path: 'students', name: 'school-admin-students', component: () => import('@/views/school-admin/Students.vue'), meta: { title: '学生管理' } },
      { path: 'notices', name: 'school-admin-notices', component: () => import('@/views/school-admin/Notices.vue'), meta: { title: '学校公告' } },
    ],
  },
  // 教师：全部子路由，meta.feature 控制可见性
  {
    path: '/teacher',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] as Role[] },
    children: [
      { path: '', name: 'teacher-dashboard', component: () => import('@/views/teacher/Dashboard.vue'), meta: { title: '教师工作台' } },
      { path: 'notifications', name: 'teacher-notifications', component: () => import('@/views/workspace/Notifications.vue'), meta: { title: '通知中心' } },
      { path: 'messages', name: 'teacher-messages', component: () => import('@/views/workspace/Messages.vue'), meta: { title: '消息中心' } },
      // 个人空间
      { path: 'profile', name: 'teacher-profile', component: () => import('@/views/workspace/Profile.vue'), meta: { title: '个人资料' } },
      { path: 'config', name: 'teacher-config', component: () => import('@/views/workspace/Config.vue'), meta: { title: '设置' } },
      { path: 'todos', name: 'teacher-todos', component: () => import('@/views/workspace/Todos.vue'), meta: { title: '待办事项', feature: 'todos' } },
      { path: 'notes', name: 'teacher-notes', component: () => import('@/views/workspace/Notes.vue'), meta: { title: '笔记', feature: 'notes' } },
      { path: 'schedule', name: 'teacher-schedule', component: () => import('@/views/workspace/Schedule.vue'), meta: { title: '课表', feature: 'schedule' } },
      { path: 'notices', name: 'teacher-notices', component: () => import('@/views/workspace/Notices.vue'), meta: { title: '公告', feature: 'notices' } },
      // 班级与学生
      { path: 'classes', name: 'teacher-classes', component: () => import('@/views/classes/ClassMembers.vue'), meta: { title: '班级成员', feature: 'classes' } },
      { path: 'duty-roster', name: 'teacher-duty-roster', component: () => import('@/views/classes/DutyRoster.vue'), meta: { title: '轮值表', feature: 'duty' } },
      { path: 'duty-config', name: 'teacher-duty-config', component: () => import('@/views/classes/DutyConfig.vue'), meta: { title: '值日配置', feature: 'duty' } },
      { path: 'class-finance', name: 'teacher-class-finance', component: () => import('@/views/classes/ClassFinance.vue'), meta: { title: '班费', feature: 'finance' } },
      { path: 'class-activities', name: 'teacher-class-activities', component: () => import('@/views/classes/ClassActivities.vue'), meta: { title: '班级活动', feature: 'activities' } },
      { path: 'gallery', name: 'teacher-gallery', component: () => import('@/views/classes/Gallery.vue'), meta: { title: '班级风采', feature: 'gallery' } },
      { path: 'my-gallery', name: 'teacher-my-gallery', component: () => import('@/views/classes/MyGallery.vue'), meta: { title: '我的相册', feature: 'gallery' } },
      // 学情与考试
      { path: 'exams', name: 'teacher-exams', component: () => import('@/views/exams/Exams.vue'), meta: { title: '考试管理', feature: 'exams' } },
      { path: 'grades', name: 'teacher-grades', component: () => import('@/views/exams/Grades.vue'), meta: { title: '成绩管理', feature: 'grades' } },
      { path: 'exam-analysis', name: 'teacher-exam-analysis', component: () => import('@/views/exams/ExamAnalysis.vue'), meta: { title: '考试分析', feature: 'analysis' } },
      { path: 'data-dashboard', name: 'teacher-data-dashboard', component: () => import('@/views/exams/DataDashboard.vue'), meta: { title: '数据看板', feature: 'analysis' } },
      { path: 'radar', name: 'teacher-radar', component: () => import('@/views/exams/Radar.vue'), meta: { title: '雷达图', feature: 'analysis' } },
      { path: 'attendance', name: 'teacher-attendance', component: () => import('@/views/exams/Attendance.vue'), meta: { title: '考勤', feature: 'attendance' } },
      { path: 'homework', name: 'teacher-homework', component: () => import('@/views/exams/Homework.vue'), meta: { title: '作业', feature: 'homework' } },
      // 学生评价
      { path: 'rewards', name: 'teacher-rewards', component: () => import('@/views/evaluation/RewardRecords.vue'), meta: { title: '奖励记录', feature: 'rewards' } },
      { path: 'score-records', name: 'teacher-score-records', component: () => import('@/views/evaluation/ScoreRecords.vue'), meta: { title: '加减分记录', feature: 'rewards' } },
      { path: 'group-scores', name: 'teacher-group-scores', component: () => import('@/views/evaluation/GroupScores.vue'), meta: { title: '小组评分', feature: 'rewards' } },
      { path: 'leaderboard', name: 'teacher-leaderboard', component: () => import('@/views/evaluation/Leaderboard.vue'), meta: { title: '排行榜', feature: 'rewards' } },
      { path: 'growth', name: 'teacher-growth', component: () => import('@/views/evaluation/Growth.vue'), meta: { title: '成长记录', feature: 'growth' } },
      { path: 'behavior', name: 'teacher-behavior', component: () => import('@/views/evaluation/Behavior.vue'), meta: { title: '行为记录', feature: 'behavior' } },
      { path: 'reading-log', name: 'teacher-reading-log', component: () => import('@/views/evaluation/ReadingLog.vue'), meta: { title: '课外阅读', feature: 'reading' } },
      { path: 'checkin', name: 'teacher-checkin', component: () => import('@/views/evaluation/Checkin.vue'), meta: { title: '学生打卡', feature: 'checkin' } },
      { path: 'awards', name: 'teacher-awards', component: () => import('@/views/evaluation/Awards.vue'), meta: { title: '我获奖啦', feature: 'rewards' } },
      { path: 'award-categories', name: 'teacher-award-categories', component: () => import('@/views/evaluation/AwardCategories.vue'), meta: { title: '奖项管理', feature: 'rewards' } },
      // 家校沟通
      { path: 'parent-contacts', name: 'teacher-parent-contacts', component: () => import('@/views/home/ParentContacts.vue'), meta: { title: '家长联系', feature: 'parents' } },
      { path: 'im', name: 'teacher-im', component: () => import('@/views/home/Im.vue'), meta: { title: '家校沟通', feature: 'im' } },
      { path: 'notice-templates', name: 'teacher-notice-templates', component: () => import('@/views/home/NoticeTemplates.vue'), meta: { title: '通知模板', feature: 'notices' } },
      // AI 与备课
      { path: 'ai-chat', name: 'teacher-ai-chat', component: () => import('@/views/ai/AiChat.vue'), meta: { title: 'AI 对话', feature: 'ai' } },
      { path: 'ai-image', name: 'teacher-ai-image', component: () => import('@/views/ai/ImageCreation.vue'), meta: { title: 'AI 文生图', feature: 'ai' } },
      { path: 'ai-resources', name: 'teacher-ai-resources', component: () => import('@/views/ai/Resources.vue'), meta: { title: '教学资源', feature: 'ai' } },
      { path: 'lesson-plans', name: 'teacher-lesson-plans', component: () => import('@/views/ai/LessonPlans.vue'), meta: { title: '教案库', feature: 'ai' } },
      { path: 'knowledges', name: 'teacher-knowledges', component: () => import('@/views/ai/Knowledges.vue'), meta: { title: '知识点库', feature: 'ai' } },
      { path: 'papers', name: 'teacher-papers', component: () => import('@/views/ai/Papers.vue'), meta: { title: '试卷库', feature: 'ai' } },
      { path: 'paper-queries', name: 'teacher-paper-queries', component: () => import('@/views/ai/PaperQueries.vue'), meta: { title: '试卷查询', feature: 'ai' } },
      { path: 'lesson-plan-templates', name: 'teacher-lesson-plan-templates', component: () => import('@/views/ai/LessonPlanTemplates.vue'), meta: { title: '教案模板', feature: 'ai' } },
      { path: 'ai-generator/lesson', name: 'teacher-ai-lesson', component: () => import('@/views/ai/AiGenerator.vue'), props: { type: 'lesson' }, meta: { title: '优质教案生成', feature: 'ai' } },
      { path: 'ai-generator/knowledge', name: 'teacher-ai-knowledge', component: () => import('@/views/ai/AiGenerator.vue'), props: { type: 'knowledge' }, meta: { title: '知识点生成', feature: 'ai' } },
      { path: 'ai-generator/paper', name: 'teacher-ai-paper', component: () => import('@/views/ai/AiGenerator.vue'), props: { type: 'paper' }, meta: { title: '优选试卷生成', feature: 'ai' } },
      // 教师办公
      { path: 'work-log', name: 'teacher-work-log', component: () => import('@/views/office/WorkLog.vue'), meta: { title: '工作日志', feature: 'worklog' } },
      { path: 'lesson-obs', name: 'teacher-lesson-obs', component: () => import('@/views/office/LessonObs.vue'), meta: { title: '听课记录', feature: 'observation' } },
      { path: 'teaching-calendar', name: 'teacher-teaching-calendar', component: () => import('@/views/office/TeachingCalendar.vue'), meta: { title: '教学日历', feature: 'calendar' } },
      { path: 'teacher-directory', name: 'teacher-directory', component: () => import('@/views/office/TeacherDirectory.vue'), meta: { title: '教师通讯录', feature: 'teachers' } },
      { path: 'office-translate', name: 'teacher-office-translate', component: () => import('@/views/office/Translate.vue'), meta: { title: '翻译', feature: 'worklog' } },
      { path: 'office-paper', name: 'teacher-office-paper', component: () => import('@/views/office/Paper.vue'), meta: { title: '教育论文', feature: 'worklog' } },
      { path: 'office-blackboard', name: 'teacher-office-blackboard', component: () => import('@/views/office/Blackboard.vue'), meta: { title: '黑板报', feature: 'worklog' } },
      { path: 'office-speech', name: 'teacher-office-speech', component: () => import('@/views/office/Speech.vue'), meta: { title: '演讲稿', feature: 'worklog' } },
      { path: 'plan-template-lib', name: 'teacher-plan-template-lib', component: () => import('@/views/office/PlanTemplateLib.vue'), meta: { title: '文案模板库', feature: 'worklog' } },
      // 工具箱聚合入口
      { path: 'toolbox', name: 'teacher-toolbox', component: () => import('@/views/tools/Toolbox.vue'), meta: { title: '工具箱', feature: 'tools' } },
      // 课堂互动工具
      { path: 'tools/picker', name: 'tool-picker', component: () => import('@/views/tools/RandomPicker.vue'), meta: { title: '随机点名', feature: 'tools' } },
      { path: 'tools/grouper', name: 'tool-grouper', component: () => import('@/views/tools/RandomGrouper.vue'), meta: { title: '随机分组', feature: 'tools' } },
      { path: 'tools/dice', name: 'tool-dice', component: () => import('@/views/tools/Dice.vue'), meta: { title: '随机决定器', feature: 'tools' } },
      { path: 'tools/timer', name: 'tool-timer', component: () => import('@/views/tools/Timer.vue'), meta: { title: '倒计时', feature: 'tools' } },
      { path: 'tools/calc', name: 'tool-calc', component: () => import('@/views/tools/Calc.vue'), meta: { title: '课堂计算器', feature: 'tools' } },
      { path: 'tools/seat-map', name: 'tool-seat-map', component: () => import('@/views/tools/SeatMap.vue'), meta: { title: '座位表', feature: 'seats' } },
      { path: 'tools/score-panel', name: 'tool-score-panel', component: () => import('@/views/tools/ScorePanel.vue'), meta: { title: '加减分', feature: 'rewards' } },
      { path: 'tools/flower', name: 'tool-flower', component: () => import('@/views/tools/FlowerGame.vue'), meta: { title: '笑口常开', feature: 'games' } },
      { path: 'tools/comment', name: 'tool-comment', component: () => import('@/views/tools/CommentGen.vue'), meta: { title: '评语生成', feature: 'tools' } },
      { path: 'tools/summary', name: 'tool-summary', component: () => import('@/views/tools/Summary.vue'), meta: { title: '期末总结', feature: 'tools' } },
      { path: 'tools/class-duty', name: 'tool-class-duty', component: () => import('@/views/tools/ClassDuty.vue'), meta: { title: '班级职务', feature: 'duty' } },
      { path: 'tools/schedule-maker', name: 'tool-schedule-maker', component: () => import('@/views/tools/ScheduleMaker.vue'), meta: { title: '课表排版', feature: 'schedule' } },
      // 语文工具
      { path: 'tools/stroke-order', name: 'tool-stroke-order', component: () => import('@/views/tools/StrokeOrder.vue'), meta: { title: '汉字笔顺', feature: 'tools' } },
      { path: 'tools/writing-materials', name: 'tool-writing-materials', component: () => import('@/views/tools/WritingMaterials.vue'), meta: { title: '作文素材', feature: 'tools' } },
      { path: 'tools/poetry', name: 'tool-poetry', component: () => import('@/views/tools/Poetry.vue'), meta: { title: '古诗词助手', feature: 'tools' } },
      { path: 'tools/dictation', name: 'tool-dictation', component: () => import('@/views/tools/Dictation.vue'), meta: { title: '汉字听写', feature: 'tools' } },
      { path: 'tools/reading', name: 'tool-reading', component: () => import('@/views/tools/Reading.vue'), meta: { title: '阅读理解生成', feature: 'tools' } },
      { path: 'tools/essay', name: 'tool-essay', component: () => import('@/views/tools/Essay.vue'), meta: { title: '小作文助手', feature: 'tools' } },
      { path: 'tools/idiom', name: 'tool-idiom', component: () => import('@/views/tools/Idiom.vue'), meta: { title: '成语词典', feature: 'tools' } },
      { path: 'tools/pinyin', name: 'tool-pinyin', component: () => import('@/views/tools/Pinyin.vue'), meta: { title: '拼音标注', feature: 'tools' } },
      // 数学工具
      { path: 'tools/math', name: 'tool-math', component: () => import('@/views/tools/MathGen.vue'), meta: { title: '口算生成', feature: 'tools' } },
      { path: 'tools/vertical-calc', name: 'tool-vertical-calc', component: () => import('@/views/tools/VerticalCalc.vue'), meta: { title: '竖式计算', feature: 'tools' } },
      { path: 'tools/answer-card', name: 'tool-answer-card', component: () => import('@/views/tools/AnswerCard.vue'), meta: { title: '口算答题卡', feature: 'tools' } },
      { path: 'tools/multiplication-table', name: 'tool-multiplication-table', component: () => import('@/views/tools/MultiplicationTable.vue'), meta: { title: '乘法口诀', feature: 'tools' } },
      { path: 'tools/unit-conversion', name: 'tool-unit-conversion', component: () => import('@/views/tools/UnitConversion.vue'), meta: { title: '单位换算', feature: 'tools' } },
      { path: 'tools/math-mistakes', name: 'tool-math-mistakes', component: () => import('@/views/tools/MathMistakes.vue'), meta: { title: '错题本', feature: 'tools' } },
      // 英语工具
      { path: 'tools/word-card', name: 'tool-word-card', component: () => import('@/views/tools/WordCard.vue'), meta: { title: '单词卡片', feature: 'tools' } },
      { path: 'tools/sentence-practice', name: 'tool-sentence-practice', component: () => import('@/views/tools/SentencePractice.vue'), meta: { title: '句型练习', feature: 'tools' } },
      { path: 'tools/listening', name: 'tool-listening', component: () => import('@/views/tools/Listening.vue'), meta: { title: '英语听力', feature: 'tools' } },
      { path: 'tools/grammar', name: 'tool-grammar', component: () => import('@/views/tools/Grammar.vue'), meta: { title: '语法练习', feature: 'tools' } },
      { path: 'tools/scene-dialogue', name: 'tool-scene-dialogue', component: () => import('@/views/tools/SceneDialogue.vue'), meta: { title: '情景对话', feature: 'tools' } },
      { path: 'tools/spell', name: 'tool-spell', component: () => import('@/views/tools/Spell.vue'), meta: { title: '单词拼写', feature: 'tools' } },
      { path: 'tools/speaking', name: 'tool-speaking', component: () => import('@/views/tools/Speaking.vue'), meta: { title: '口语练习', feature: 'tools' } },
      { path: 'tools/english-story', name: 'tool-english-story', component: () => import('@/views/tools/EnglishStory.vue'), meta: { title: '英语爽文', feature: 'tools' } },
      // 游戏合集
      { path: 'games', name: 'games', component: () => import('@/views/games/GamesIndex.vue'), meta: { title: '小游戏合集', feature: 'games' } },
      { path: 'games/24point', name: 'game-24point', component: () => import('@/views/games/Game24Point.vue'), meta: { title: '24点', feature: 'games' } },
      { path: 'games/2048', name: 'game-2048', component: () => import('@/views/games/Game2048.vue'), meta: { title: '2048', feature: 'games' } },
      { path: 'games/minesweeper', name: 'game-minesweeper', component: () => import('@/views/games/GameMinesweeper.vue'), meta: { title: '扫雷', feature: 'games' } },
      { path: 'games/snake', name: 'game-snake', component: () => import('@/views/games/GameSnake.vue'), meta: { title: '贪吃蛇', feature: 'games' } },
      { path: 'games/tic-tac-toe', name: 'game-tic-tac-toe', component: () => import('@/views/games/GameTicTacToe.vue'), meta: { title: '井字棋', feature: 'games' } },
      { path: 'games/gomoku', name: 'game-gomoku', component: () => import('@/views/games/GameGomoku.vue'), meta: { title: '五子棋', feature: 'games' } },
      { path: 'games/match3', name: 'game-match3', component: () => import('@/views/games/GameMatch3.vue'), meta: { title: '消消乐', feature: 'games' } },
      { path: 'games/whack', name: 'game-whack', component: () => import('@/views/games/GameWhack.vue'), meta: { title: '打地鼠', feature: 'games' } },
      { path: 'games/puzzle', name: 'game-puzzle', component: () => import('@/views/games/GamePuzzle.vue'), meta: { title: '数字华容道', feature: 'games' } },
      { path: 'games/tetris', name: 'game-tetris', component: () => import('@/views/games/GameTetris.vue'), meta: { title: '俄罗斯方块', feature: 'games' } },
      { path: 'games/plane', name: 'game-plane', component: () => import('@/views/games/GamePlane.vue'), meta: { title: '飞机大战', feature: 'games' } },
      { path: 'games/motorcycle', name: 'game-motorcycle', component: () => import('@/views/games/GameMotorcycle.vue'), meta: { title: '极速摩托', feature: 'games' } },
      { path: 'games/car-crash', name: 'game-car-crash', component: () => import('@/views/games/GameCarCrash.vue'), meta: { title: '汽车躲避', feature: 'games' } },
      { path: 'games/sudoku', name: 'game-sudoku', component: () => import('@/views/games/GameSudoku.vue'), meta: { title: '数独', feature: 'games' } },
      { path: 'games/sequence', name: 'game-sequence', component: () => import('@/views/games/GameSequence.vue'), meta: { title: '数字排序', feature: 'games' } },
      { path: 'games/memory', name: 'game-memory', component: () => import('@/views/games/GameMemory.vue'), meta: { title: '记忆翻牌', feature: 'games' } },
      { path: 'games/slide-puzzle', name: 'game-slide-puzzle', component: () => import('@/views/games/GameSlidePuzzle.vue'), meta: { title: '图片拼图', feature: 'games' } },
      { path: 'games/color-match', name: 'game-color-match', component: () => import('@/views/games/GameColorMatch.vue'), meta: { title: '颜色反应', feature: 'games' } },
    ],
  },
  // 家长
  {
    path: '/parent',
    component: () => import('@/layouts/RouteOutlet.vue'),
    meta: { requiresAuth: true, roles: ['parent'] as Role[] },
    children: [
      { path: '', name: 'parent-dashboard', component: () => import('@/views/parent/Dashboard.vue'), meta: { title: '家长中心' } },
    ],
  },
  // 根路径：按角色重定向到对应工作台（优先用 auth store，兜底读 localStorage）
  {
    path: '/',
    name: 'home',
    redirect: () => {
      const auth = useAuthStore()
      const role = auth.role
      const map: Record<string, string> = {
        super: '/super',
        school_admin: '/school-admin',
        teacher: '/teacher',
        parent: '/parent',
      }
      return role ? (map[role] || '/login') : '/login'
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

// 全局守卫：登录态 + 角色校验 + 功能权限校验
// 注意：localStorage 中的 role / features 仅用于 UX 层跳转与菜单显隐，
// 真正的数据权限由后端 @Roles + JWT（t.sub）强制校验，本地篡改无法越权读取数据；
// 且 api/request.ts 在收到 401 时会清除本地登录态并跳转登录，形成闭环防御。
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  const roles = to.meta.roles as Role[] | undefined
  if (roles && auth.role && !roles.includes(auth.role)) {
    return { name: 'forbidden' }
  }
  // 教师功能权限：features 为空数组或包含空串时放行全部；否则检查是否包含所需 feature
  const feature = to.meta.feature as string | undefined
  if (feature && auth.role === 'teacher') {
    const features = auth.user?.features || []
    const allowed = features.length === 0 || features.includes('') || features.includes(feature)
    if (!allowed) return { name: 'teacher-dashboard' }
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'home' }
  }
  return true
})

export default router
