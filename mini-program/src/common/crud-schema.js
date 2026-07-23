// 园丁工作台 - 通用 CRUD 页面实体字段配置表
// 由后端 TypeORM 实体自动归纳生成。
// 字段 type 仅支持：input / textarea / picker / number / date
// 排除系统字段：id、teacherId、createdAt、updatedAt
// 说明：
//  - 与 *Name 同时存在的 studentId 视为冗余外键，已省略（保留可读的 *Name）。
//  - TypeORM simple-json 字段（数组/对象）无对应类型，统一用 textarea 存放 JSON 文本。
//  - boolean 字段统一用 picker(['是','否']) 表达开关。
//  - 含固定可选值的字段用 picker 并给出合理 options。

export const CRUD_SCHEMA = {
  // 1. 家长联系记录
  'parent-contacts': {
    title: '家长联系记录',
    prefix: '/parent-contacts',
    fields: [
      { key: 'studentName', label: '学生姓名', type: 'input', required: true },
      { key: 'parentName', label: '家长姓名', type: 'input', required: true },
      { key: 'relation', label: '关系', type: 'input' },
      { key: 'phone', label: '电话', type: 'input' },
      { key: 'wechat', label: '微信', type: 'input' },
      { key: 'method', label: '联系方式', type: 'picker', options: ['电话', '微信', '面谈', '其他'] },
      { key: 'content', label: '沟通内容', type: 'textarea', required: true },
      { key: 'date', label: '日期', type: 'date' },
      { key: 'followUp', label: '后续跟进', type: 'textarea' },
    ],
    display: ['studentName', 'parentName', 'date'],
    search: 'studentName',
  },

  // 2. 通知模板
  'notice-templates': {
    title: '通知模板',
    prefix: '/notice-templates',
    fields: [
      { key: 'title', label: '模板标题', type: 'input', required: true },
      { key: 'content', label: '模板内容', type: 'textarea', required: true },
      { key: 'category', label: '分类', type: 'picker', options: ['班级通知', '学校通知', '家长会', '其他'] },
    ],
    display: ['title', 'category'],
    search: 'title',
  },

  // 3. 智能组卷
  'generated/papers': {
    title: '智能组卷',
    prefix: '/generated/papers',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'grade', label: '年级', type: 'input' },
      { key: 'subject', label: '科目', type: 'input' },
      { key: 'prompt', label: '生成提示词', type: 'textarea' },
      { key: 'content', label: '内容', type: 'textarea' },
    ],
    display: ['title', 'subject', 'grade'],
    search: 'title',
  },

  // 4. 智能教案
  'generated/lesson-plans': {
    title: '智能教案',
    prefix: '/generated/lesson-plans',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'topic', label: '主题', type: 'input' },
      { key: 'subject', label: '科目', type: 'input' },
      { key: 'grade', label: '年级', type: 'input' },
      { key: 'prompt', label: '生成提示词', type: 'textarea' },
      { key: 'content', label: '内容', type: 'textarea' },
    ],
    display: ['title', 'subject', 'grade'],
    search: 'title',
  },

  // 5. 智能知识点
  'generated/knowledges': {
    title: '智能知识点',
    prefix: '/generated/knowledges',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'grade', label: '年级', type: 'input' },
      { key: 'subject', label: '科目', type: 'input' },
      { key: 'textbook', label: '教材', type: 'input' },
      { key: 'term', label: '学期', type: 'input' },
      { key: 'prompt', label: '生成提示词', type: 'textarea' },
      { key: 'content', label: '内容', type: 'textarea' },
    ],
    display: ['title', 'subject', 'grade'],
    search: 'title',
  },

  // 6. 试题检索
  'generated/queries': {
    title: '试题检索',
    prefix: '/generated/queries',
    fields: [
      { key: 'keyword', label: '关键词', type: 'input', required: true },
      { key: 'title', label: '标题', type: 'input' },
      { key: 'source', label: '来源', type: 'input' },
      { key: 'year', label: '年份', type: 'input' },
      { key: 'abstract', label: '摘要', type: 'textarea' },
      { key: 'content', label: '内容', type: 'textarea' },
    ],
    display: ['title', 'keyword'],
    search: 'keyword',
  },

  // 7. 值日排班
  'duty-rosters': {
    title: '值日排班',
    prefix: '/duty-rosters',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'type', label: '类型', type: 'picker', options: ['值日', '值周', '其他'] },
      { key: 'assignments', label: '排班安排(JSON)', type: 'textarea' },
    ],
    display: ['name', 'type', 'classId'],
    search: 'name',
  },

  // 8. 课程表
  'schedules': {
    title: '课程表',
    prefix: '/schedules',
    bulkImport: 'schedule',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'dayOfWeek', label: '星期(0-6)', type: 'number', required: true },
      { key: 'period', label: '节次(数字)', type: 'number', required: true },
      { key: 'weekType', label: '周次', type: 'picker', options: ['全周', '单周', '双周'] },
      { key: 'section', label: '节次类型(早读/晚自习等,可选)', type: 'input' },
      { key: 'subject', label: '科目', type: 'input' },
      { key: 'teacher', label: '教师', type: 'input' },
      { key: 'note', label: '备注', type: 'textarea' },
    ],
    display: ['subject', 'dayOfWeek', 'period', 'weekType'],
    search: 'subject',
  },

  // 9. 考勤记录
  'attendances': {
    title: '考勤记录',
    prefix: '/attendances',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'records', label: '考勤记录(JSON)', type: 'textarea' },
    ],
    display: ['classId', 'date'],
    search: 'classId',
  },

  // 10. 作业
  'homework': {
    title: '作业',
    prefix: '/homework',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'subject', label: '科目', type: 'input', required: true },
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'content', label: '内容', type: 'textarea' },
      { key: 'startDate', label: '开始日期', type: 'date' },
      { key: 'deadline', label: '截止日期', type: 'date' },
      { key: 'status', label: '状态', type: 'picker', options: ['待批改', '已批改', '逾期'] },
    ],
    display: ['title', 'subject', 'deadline'],
    search: 'title',
  },

  // 11. 通知公告
  'notices': {
    title: '通知公告',
    prefix: '/notices',
    fields: [
      { key: 'classId', label: '发布范围', type: 'picker', options: ['全校', '本班', '年级'] },
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'content', label: '内容', type: 'textarea' },
      { key: 'pinned', label: '置顶', type: 'picker', options: ['是', '否'] },
      { key: 'ended', label: '已结束', type: 'picker', options: ['是', '否'] },
      { key: 'endedAt', label: '结束时间', type: 'date' },
    ],
    display: ['title', 'classId'],
    search: 'title',
  },

  // 12. 资源库
  'resources': {
    title: '资源库',
    prefix: '/resources',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'url', label: '链接', type: 'input' },
      { key: 'category', label: '分类', type: 'input' },
      { key: 'tags', label: '标签(JSON)', type: 'textarea' },
      { key: 'description', label: '描述', type: 'textarea' },
    ],
    display: ['title', 'category'],
    search: 'title',
  },

  // 13. 班级经费
  'class-expenses': {
    title: '班级经费',
    prefix: '/class-expenses',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'type', label: '类型', type: 'input' },
      { key: 'category', label: '分类', type: 'input' },
      { key: 'amount', label: '金额', type: 'number', required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'description', label: '说明', type: 'textarea' },
      { key: 'handler', label: '经手人', type: 'input' },
    ],
    display: ['type', 'amount', 'date'],
    search: 'type',
  },

  // 14. 班级活动
  'class-activities': {
    title: '班级活动',
    prefix: '/class-activities',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'photos', label: '活动照片(JSON)', type: 'textarea' },
    ],
    display: ['title', 'date'],
    search: 'title',
  },

  // 15. 值日配置
  'class-duty-configs': {
    title: '值日配置',
    prefix: '/class-duty-configs',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'duties', label: '值日项目(JSON)', type: 'textarea' },
      { key: 'assignments', label: '值日分配(JSON)', type: 'textarea' },
    ],
    display: ['classId'],
    search: 'classId',
  },

  // 16. 成长档案
  'growth-entries': {
    title: '成长档案',
    prefix: '/growth-entries',
    fields: [
      { key: 'studentName', label: '学生姓名', type: 'input', required: true },
      { key: 'type', label: '类型', type: 'input' },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'content', label: '内容', type: 'textarea' },
    ],
    display: ['studentName', 'title', 'date'],
    search: 'studentName',
  },

  // 17. 行为记录
  'behavior-records': {
    title: '行为记录',
    prefix: '/behavior-records',
    fields: [
      { key: 'studentName', label: '学生姓名', type: 'input', required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'behavior', label: '行为', type: 'input', required: true },
      { key: 'note', label: '备注', type: 'textarea' },
    ],
    display: ['studentName', 'behavior', 'date'],
    search: 'studentName',
  },

  // 18. 笔记
  'notes': {
    title: '笔记',
    prefix: '/notes',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'content', label: '内容', type: 'textarea' },
      { key: 'category', label: '分类', type: 'picker', options: ['其他', '教学', '班级', '学生', '个人'] },
      { key: 'pinned', label: '置顶', type: 'picker', options: ['是', '否'] },
      { key: 'favorite', label: '收藏', type: 'picker', options: ['是', '否'] },
    ],
    display: ['title', 'category'],
    search: 'title',
  },

  // 19. 待办
  'todos': {
    title: '待办',
    prefix: '/todos',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'note', label: '备注', type: 'textarea' },
      { key: 'date', label: '日期', type: 'date' },
      { key: 'done', label: '已完成', type: 'picker', options: ['是', '否'] },
    ],
    display: ['title', 'date'],
    search: 'title',
  },

  // 20. 随机点名记录
  'picker-history': {
    title: '随机点名记录',
    prefix: '/picker-history',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'studentName', label: '学生姓名', type: 'input', required: true },
    ],
    display: ['studentName', 'classId'],
    search: 'studentName',
  },

  // 21. 获奖记录
  'award-records': {
    title: '获奖记录',
    prefix: '/award-records',
    fields: [
      { key: 'name', label: '奖项名称', type: 'input', required: true },
      { key: 'issuer', label: '颁发机构', type: 'input' },
      { key: 'date', label: '日期', type: 'date' },
      { key: 'level', label: '级别', type: 'input' },
      { key: 'image', label: '图片', type: 'textarea' },
      { key: 'tags', label: '标签(JSON)', type: 'textarea' },
      { key: 'note', label: '备注', type: 'textarea' },
      { key: 'ratingScore', label: '评分', type: 'number' },
    ],
    display: ['name', 'level', 'date'],
    search: 'name',
  },

  // 22. 奖项分类
  'award-categories': {
    title: '奖项分类',
    prefix: '/award-categories',
    fields: [
      { key: 'name', label: '分类名称', type: 'input', required: true },
      { key: 'color', label: '颜色', type: 'input' },
    ],
    display: ['name', 'color'],
    search: 'name',
  },

  // 23. 教师
  'teachers': {
    title: '教师',
    prefix: '/teachers',
    fields: [
      { key: 'name', label: '姓名', type: 'input', required: true },
      { key: 'position', label: '职务', type: 'input' },
      { key: 'phone', label: '电话', type: 'input' },
      { key: 'email', label: '邮箱', type: 'input' },
      { key: 'teachings', label: '任教信息(JSON)', type: 'textarea' },
      { key: 'remark', label: '备注', type: 'textarea' },
      { key: 'joinAt', label: '入职日期', type: 'date' },
      { key: 'avatar', label: '头像', type: 'input' },
      { key: 'isStarred', label: '星标', type: 'picker', options: ['是', '否'] },
    ],
    display: ['name', 'position'],
    search: 'name',
  },

  // 24. 听课记录
  'lesson-observations': {
    title: '听课记录',
    prefix: '/lesson-observations',
    fields: [
      { key: 'teacherName', label: '教师姓名', type: 'input', required: true },
      { key: 'classId', label: '班级ID', type: 'input' },
      { key: 'className', label: '班级名称', type: 'input' },
      { key: 'subject', label: '科目', type: 'input' },
      { key: 'topic', label: '课题', type: 'input' },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'strengths', label: '优点', type: 'textarea' },
      { key: 'suggestions', label: '建议', type: 'textarea' },
      { key: 'overallRating', label: '总体评价', type: 'picker', options: ['优秀', '良好', '合格', '待改进'] },
    ],
    display: ['teacherName', 'date'],
    search: 'teacherName',
  },

  // 25. 工作日志
  'work-logs': {
    title: '工作日志',
    prefix: '/work-logs',
    fields: [
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'content', label: '工作内容', type: 'textarea' },
      { key: 'classCount', label: '课时数', type: 'number' },
      { key: 'homeworkCount', label: '作业数', type: 'number' },
      { key: 'note', label: '备注', type: 'textarea' },
    ],
    display: ['date', 'classCount'],
    search: 'date',
  },

  // 26. 教案模板
  'lesson-plan-templates': {
    title: '教案模板',
    prefix: '/lesson-plan-templates',
    fields: [
      { key: 'title', label: '标题', type: 'input', required: true },
      { key: 'subject', label: '科目', type: 'input' },
      { key: 'lessonType', label: '课型', type: 'picker', options: ['新授课', '复习课', '讲评课', '实验课', '其他'] },
      { key: 'grade', label: '年级', type: 'input' },
      { key: 'content', label: '内容', type: 'textarea' },
      { key: 'isFavorite', label: '收藏', type: 'picker', options: ['是', '否'] },
    ],
    display: ['title', 'subject'],
    search: 'title',
  },

  // 27. 奖励记录
  'reward-records': {
    title: '奖励记录',
    prefix: '/reward-records',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'type', label: '类型', type: 'input' },
      { key: 'points', label: '积分', type: 'number', required: true },
      { key: 'reason', label: '原因', type: 'textarea' },
      { key: 'date', label: '日期', type: 'date', required: true },
    ],
    display: ['type', 'points', 'date'],
    search: 'type',
  },

  // 28. 加减分记录
  'score-records': {
    title: '加减分记录',
    prefix: '/score-records',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'studentName', label: '学生姓名', type: 'input', required: true },
      { key: 'delta', label: '加减分', type: 'number', required: true },
      { key: 'reason', label: '原因', type: 'textarea' },
    ],
    display: ['studentName', 'delta'],
    search: 'studentName',
  },

  // 29. 小组积分
  'group-scores': {
    title: '小组积分',
    prefix: '/group-scores',
    fields: [
      { key: 'classId', label: '班级ID', type: 'input', required: true },
      { key: 'name', label: '小组名称', type: 'input', required: true },
      { key: 'points', label: '积分', type: 'number', required: true },
      { key: 'color', label: '颜色', type: 'input' },
    ],
    display: ['name', 'points'],
    search: 'name',
  },
}
