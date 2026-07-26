/**
 * 扩充的测试数据 Fixtures
 * 包含：正常数据、边界数据、异常数据、跨端对齐数据
 */

import { ref } from 'vue'

// ============================================================================
// 基础基础数据（正常业务数据）
// ============================================================================

export const baseFixtures = {
  // 用户角色
  roles: {
    super: { code: 'super', name: '超级管理员', permissions: ['*'] },
    school_admin: { code: 'school_admin', name: '校区管理员', permissions: ['school:*', 'class:*', 'teacher:*', 'student:*'] },
    teacher: { code: 'teacher', name: '教师', permissions: ['class:read', 'student:read', 'homework:*', 'grade:*'] },
    parent: { code: 'parent', name: '家长', permissions: ['child:read', 'grade:read', 'notice:read'] },
  },

  // 用户账号
  users: {
    super: { username: 'super', password: 'super123', role: 'super', realName: '超管', avatar: '👑' },
    school_admin: { username: 'school_admin', password: 'admin123', role: 'school_admin', realName: '校管', avatar: '🏫' },
    teacher: { username: 'teacher', password: 'teacher123', role: 'teacher', realName: '张老师', avatar: '👨‍🏫' },
    parent: { username: 'parent', password: 'parent123', role: 'parent', realName: '李家长', avatar: '👨‍👩‍👧' },
    admin: { username: 'admin', password: 'admin', role: 'school_admin', realName: '管理员', avatar: '👤' }, // 统一登录测试账号
  },

  // 学校
  schools: [
    { id: 'school-001', name: '第一中学', address: '市区一路1号', principal: '王校长', phone: '010-88881111', status: 'active' },
    { id: 'school-002', name: '第二小学', address: '市区二路2号', principal: '李校长', phone: '010-88882222', status: 'active' },
    { id: 'school-003', name: '第三高中', address: '市区三路3号', principal: '张校长', phone: '010-88883333', status: 'inactive' },
  ],

  // 班级
  classes: [
    { id: 'class-001', schoolId: 'school-001', name: '一年级一班', grade: 1, studentCount: 35, teacherId: 'teacher-001' },
    { id: 'class-002', schoolId: 'school-001', name: '一年级二班', grade: 1, studentCount: 32, teacherId: 'teacher-002' },
    { id: 'class-003', schoolId: 'school-001', name: '二年级一班', grade: 2, studentCount: 38, teacherId: 'teacher-003' },
    { id: 'class-004', schoolId: 'school-002', name: '三年级一班', grade: 3, studentCount: 40, teacherId: 'teacher-004' },
    { id: 'class-005', schoolId: 'school-002', name: '四年级二班', grade: 4, studentCount: 36, teacherId: 'teacher-005' },
  ],

  // 教师
  teachers: [
    { id: 'teacher-001', schoolId: 'school-001', name: '王老师', employeeNo: 'T001', subjects: ['语文'], classes: ['class-001'], phone: '13800000001', email: 'wang@school.edu', status: 'active' },
    { id: 'teacher-002', schoolId: 'school-001', name: '李老师', employeeNo: 'T002', subjects: ['数学'], classes: ['class-002'], phone: '13800000002', email: 'li@school.edu', status: 'active' },
    { id: 'teacher-003', schoolId: 'school-001', name: '张老师', employeeNo: 'T003', subjects: ['英语'], classes: ['class-003'], phone: '13800000003', email: 'zhang@school.edu', status: 'active' },
    { id: 'teacher-004', schoolId: 'school-002', name: '刘老师', employeeNo: 'T004', subjects: ['科学'], classes: ['class-004'], phone: '13800000004', email: 'liu@school.edu', status: 'active' },
    { id: 'teacher-005', schoolId: 'school-002', name: '陈老师', employeeNo: 'T005', subjects: ['体育'], classes: ['class-005'], phone: '13800000005', email: 'chen@school.edu', status: 'inactive' },
  ],

  // 学生
  students: [
    { id: 'student-001', classId: 'class-001', name: '小明', studentNo: '20240001', gender: 'male', birthDate: '2017-05-15', parentPhone: '13900000001', parentName: '明爸', avatar: '👦' },
    { id: 'student-002', classId: 'class-001', name: '小红', studentNo: '20240002', gender: 'female', birthDate: '2017-08-22', parentPhone: '13900000002', parentName: '红妈', avatar: '👧' },
    { id: 'student-003', classId: 'class-001', name: '小刚', studentNo: '20240003', gender: 'male', birthDate: '2017-11-10', parentPhone: '13900000003', parentName: '刚爸', avatar: '👦' },
    { id: 'student-004', classId: 'class-002', name: '小美', studentNo: '20240004', gender: 'female', birthDate: '2017-03-18', parentPhone: '13900000004', parentName: '美妈', avatar: '👧' },
    { id: 'student-005', classId: 'class-002', name: '小强', studentNo: '20240005', gender: 'male', birthDate: '2017-09-30', parentPhone: '13900000005', parentName: '强爸', avatar: '👦' },
  ],

  // 家长
  parents: [
    { id: 'parent-001', studentIds: ['student-001'], name: '明爸', phone: '13900000001', relation: 'father' },
    { id: 'parent-002', studentIds: ['student-002'], name: '红妈', phone: '13900000002', relation: 'mother' },
    { id: 'parent-003', studentIds: ['student-003'], name: '刚爸', phone: '13900000003', relation: 'father' },
    { id: 'parent-004', studentIds: ['student-004'], name: '美妈', phone: '13900000004', relation: 'mother' },
    { id: 'parent-005', studentIds: ['student-005'], name: '强爸', phone: '13900000005', relation: 'father' },
  ],

  // 头像选项
  avatars: ['👤', '👨', '👩', '👦', '👧', '👨‍🏫', '👩‍🏫', '👨‍💼', '👩‍💼', '👨‍👩‍👧', '👨‍👩‍👦', '👨‍👩‍👧‍👦', '🧑‍🏫', '🧑‍💼', '🧑‍🎓', '🧒', '👶', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧟', '👻', '👽', '🤖', '🎃', '🎄', '🎁', '🎀', '🏀', '⚽', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '🥏', '🎱', '⛳', '🎣', '🏊', '🏄', '🏊‍♂️', '🏊‍♀️', '🤿', '🚣', '🚣‍♂️', '🚣‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️', '🧘', '🧘‍♂️', '🧘‍♀️'],

  // AI 工具配置
  aiTools: [
    { id: 'ai-homework', name: '作业生成器', description: '根据知识点自动生成作业题目', icon: '📝', savePath: '/api/homework/save' },
    { id: 'ai-lesson', name: '教案生成器', description: '根据课程大纲生成教案', icon: '📚', savePath: '/api/lesson/save' },
    { id: 'ai-grade', name: '批改助手', description: 'AI 辅助批改作业', icon: '✏️', savePath: '/api/grade/save' },
    { id: 'ai-notice', name: '通知生成器', description: '生成家校通知', icon: '📢', savePath: '/api/notice/save' },
    { id: 'ai-report', name: '成长报告', description: '生成学生成长档案', icon: '📊', savePath: '' }, // 无保存路径
  ],

  // 相册
  albums: [
    { id: 'album-001', classId: 'class-001', title: '春季运动会', description: '2024年春季运动会精彩瞬间', coverImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', images: ['img1', 'img2', 'img3'], createdAt: '2024-04-15T10:00:00Z' },
    { id: 'album-002', classId: 'class-001', title: '六一儿童节', description: '六一儿童节文艺汇演', coverImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', images: ['img4', 'img5'], createdAt: '2024-06-01T14:00:00Z' },
    { id: 'album-003', classId: 'class-002', title: '秋游活动', description: '秋季郊游合影', coverImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', images: ['img6', 'img7', 'img8', 'img9'], createdAt: '2024-10-20T09:30:00Z' },
  ],
}

// ============================================================================
// 边界/异常测试数据
// ============================================================================

export const edgeCaseFixtures = {
  // 空数据
  empty: {
    users: [],
    schools: [],
    classes: [],
    teachers: [],
    students: [],
    parents: [],
    albums: [],
    aiTools: [],
  },

  // 超长字符串
  longStrings: {
    name: 'a'.repeat(256),
    description: 'b'.repeat(5000),
    title: 'c'.repeat(1000),
    content: 'd'.repeat(10000),
  },

  // 特殊字符
  specialChars: {
    xss: '<script>alert("xss")</script>',
    sqlInjection: "'; DROP TABLE users; --",
    html: '<div onclick="alert(1)">test</div>',
    emoji: '🎉🎊🎈🎁🎀🌟✨💫⭐🌈',
    unicode: '中文测试🎉特殊字符！@#￥%……&*（）',
    newlines: 'line1\nline2\r\nline3\t\ttab',
    quotes: '"双引号" \'单引号\' `反引号`',
    pathTraversal: '../../../etc/passwd',
  },

  // 极值数字
  extremeNumbers: {
    maxInt: Number.MAX_SAFE_INTEGER,
    minInt: Number.MIN_SAFE_INTEGER,
    maxFloat: Number.MAX_VALUE,
    minFloat: Number.MIN_VALUE,
    negative: -999999999,
    zero: 0,
    decimal: 3.14159265358979323846,
  },

  // 空值和未定义
  nullish: {
    null: null,
    undefined: undefined,
    emptyString: '',
    emptyArray: [],
    emptyObject: {},
  },

  // 循环引用
  circularRef: (() => {
    const obj: any = { name: 'circular' }
    obj.self = obj
    return obj
  })(),

  // 深层嵌套
  deepNested: {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              value: 'deep',
            },
          },
        },
      },
    },
  },

  // 大数组
  largeArray: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `item-${i}` })),

  // 无效 ID
  invalidIds: {
    empty: '',
    null: null as any,
    undefined: undefined as any,
    notFound: 'non-existent-id',
    specialChars: 'id@#$%',
    sqlInjection: "1' OR '1'='1",
    xss: '<script>alert(1)</script>',
  },

  // 无效日期
  invalidDates: {
    future: '2099-12-31',
    past: '1900-01-01',
    invalid: 'not-a-date',
    malformed: '2024-13-45',
    empty: '',
  },
}

// ============================================================================
// 错误响应 Mock 数据
// ============================================================================

export const errorFixtures = {
  // 网络错误
  networkError: {
    message: 'Network Error',
    code: 'ECONNABORTED',
    status: 0,
  },

  // 400 错误
  badRequest: {
    code: 400,
    message: '请求参数错误',
    errors: {
      username: '用户名不能为空',
      password: '密码长度不能少于6位',
    },
  },

  // 401 未授权
  unauthorized: {
    code: 401,
    message: '未登录或登录已过期',
  },

  // 403 禁止
  forbidden: {
    code: 403,
    message: '权限不足，无法访问该资源',
  },

  // 404 未找到
  notFound: {
    code: 404,
    message: '请求的资源不存在',
  },

  // 409 冲突
  conflict: {
    code: 409,
    message: '资源冲突，该记录已存在',
  },

  // 422 验证失败
  validationError: {
    code: 422,
    message: '数据验证失败',
    errors: {
      title: '标题不能为空',
      classId: '请选择班级',
      images: '至少上传一张图片',
    },
  },

  // 429 限流
  tooManyRequests: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
    retryAfter: 60,
  },

  // 500 服务器错误
  serverError: {
    code: 500,
    message: '服务器内部错误',
  },

  // 503 服务不可用
  serviceUnavailable: {
    code: 503,
    message: '服务暂时不可用，请稍后重试',
  },

  // 业务错误码
  bizErrors: {
    LOGIN_FAILED: { code: 'LOGIN_FAILED', message: '用户名或密码错误' },
    ACCOUNT_LOCKED: { code: 'ACCOUNT_LOCKED', message: '账号已被锁定，请联系管理员' },
    PASSWORD_EXPIRED: { code: 'PASSWORD_EXPIRED', message: '密码已过期，请修改密码' },
    TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', message: '登录凭证已过期，请重新登录' },
    PERMISSION_DENIED: { code: 'PERMISSION_DENIED', message: '权限不足' },
    RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', message: '资源不存在' },
    DUPLICATE_RESOURCE: { code: 'DUPLICATE_RESOURCE', message: '资源已存在' },
    OPERATION_FAILED: { code: 'OPERATION_FAILED', message: '操作失败，请稍后重试' },
  },
}

// ============================================================================
// API 响应 Mock 工厂函数
// ============================================================================

export function createApiResponse<T>(data: T, success = true, message = 'success', code = 200) {
  return {
    code,
    success,
    message,
    data,
    timestamp: Date.now(),
  }
}

export function createPaginatedResponse<T>(items: T[], page = 1, pageSize = 10, total?: number) {
  return createApiResponse({
    items,
    total: total ?? items.length,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? items.length) / pageSize),
  })
}

export function createErrorResponse(error: typeof errorFixtures[keyof typeof errorFixtures] | any) {
  return createApiResponse(null, false, error.message, error.code)
}

// ============================================================================
// API Mock 响应映射
// ============================================================================

export const apiMockResponses = {
  // 认证相关
  '/api/auth/login': {
    POST: (payload: any) => {
      const { username, password } = payload
      const users = baseFixtures.users as any
      const user = Object.values(users).find((u: any) => u.username === username && u.password === password)

      if (user) {
        return createApiResponse({
          token: `mock-token-${user.role}-${Date.now()}`,
          user: { ...user, password: undefined },
          permissions: baseFixtures.roles[user.role as keyof typeof baseFixtures.roles]?.permissions || [],
        })
      }
      return createErrorResponse(errorFixtures.bizErrors.LOGIN_FAILED)
    },
  },

  '/api/auth/logout': {
    POST: () => createApiResponse({ message: '登出成功' }),
  },

  '/api/auth/me': {
    GET: (headers: any) => {
      const token = headers?.authorization?.replace('Bearer ', '')
      if (token && token.startsWith('mock-token-')) {
        const role = token.split('-')[2]
        const user = Object.values(baseFixtures.users).find((u: any) => u.role === role)
        return createApiResponse({ ...user, password: undefined })
      }
      return createErrorResponse(errorFixtures.unauthorized)
    },
  },

  // 学校
  '/api/schools': {
    GET: (params: any) => createPaginatedResponse(baseFixtures.schools, params.page, params.pageSize),
    POST: (payload: any) => createApiResponse({ id: `school-${Date.now()}`, ...payload }, true, '创建成功', 201),
  },
  '/api/schools/:id': {
    GET: (params: any) => {
      const school = baseFixtures.schools.find(s => s.id === params.id)
      return school ? createApiResponse(school) : createErrorResponse(errorFixtures.notFound)
    },
    PATCH: (params: any, payload: any) => {
      const school = baseFixtures.schools.find(s => s.id === params.id)
      return school ? createApiResponse({ ...school, ...payload }) : createErrorResponse(errorFixtures.notFound)
    },
    DELETE: (params: any) => createApiResponse({ id: params.id }, true, '删除成功'),
  },

  // 班级
  '/api/classes': {
    GET: (params: any) => {
      let classes = [...baseFixtures.classes]
      if (params.schoolId) classes = classes.filter(c => c.schoolId === params.schoolId)
      if (params.keyword) classes = classes.filter(c => c.name.includes(params.keyword))
      return createPaginatedResponse(classes, params.page, params.pageSize)
    },
    POST: (payload: any) => createApiResponse({ id: `class-${Date.now()}`, ...payload }, true, '创建成功', 201),
  },
  '/api/classes/:id': {
    GET: (params: any) => {
      const cls = baseFixtures.classes.find(c => c.id === params.id)
      return cls ? createApiResponse(cls) : createErrorResponse(errorFixtures.notFound)
    },
    PATCH: (params: any, payload: any) => {
      const cls = baseFixtures.classes.find(c => c.id === params.id)
      return cls ? createApiResponse({ ...cls, ...payload }) : createErrorResponse(errorFixtures.notFound)
    },
    DELETE: (params: any) => createApiResponse({ id: params.id }, true, '删除成功'),
  },

  // 教师
  '/api/teachers': {
    GET: (params: any) => {
      let teachers = [...baseFixtures.teachers]
      if (params.schoolId) teachers = teachers.filter(t => t.schoolId === params.schoolId)
      if (params.keyword) teachers = teachers.filter(t => t.name.includes(params.keyword))
      return createPaginatedResponse(teachers, params.page, params.pageSize)
    },
    POST: (payload: any) => createApiResponse({ id: `teacher-${Date.now()}`, ...payload }, true, '创建成功', 201),
  },
  '/api/teachers/:id': {
    GET: (params: any) => {
      const teacher = baseFixtures.teachers.find(t => t.id === params.id)
      return teacher ? createApiResponse(teacher) : createErrorResponse(errorFixtures.notFound)
    },
    PATCH: (params: any, payload: any) => {
      const teacher = baseFixtures.teachers.find(t => t.id === params.id)
      return teacher ? createApiResponse({ ...teacher, ...payload }) : createErrorResponse(errorFixtures.notFound)
    },
    DELETE: (params: any) => createApiResponse({ id: params.id }, true, '删除成功'),
  },

  // 学生
  '/api/students': {
    GET: (params: any) => {
      let students = [...baseFixtures.students]
      if (params.classId) students = students.filter(s => s.classId === params.classId)
      if (params.keyword) students = students.filter(s => s.name.includes(params.keyword))
      return createPaginatedResponse(students, params.page, params.pageSize)
    },
    POST: (payload: any) => createApiResponse({ id: `student-${Date.now()}`, ...payload }, true, '创建成功', 201),
  },
  '/api/students/:id': {
    GET: (params: any) => {
      const student = baseFixtures.students.find(s => s.id === params.id)
      return student ? createApiResponse(student) : createErrorResponse(errorFixtures.notFound)
    },
    PATCH: (params: any, payload: any) => {
      const student = baseFixtures.students.find(s => s.id === params.id)
      return student ? createApiResponse({ ...student, ...payload }) : createErrorResponse(errorFixtures.notFound)
    },
    DELETE: (params: any) => createApiResponse({ id: params.id }, true, '删除成功'),
  },

  // 家长
  '/api/parents': {
    GET: (params: any) => createPaginatedResponse(baseFixtures.parents, params.page, params.pageSize),
    POST: (payload: any) => createApiResponse({ id: `parent-${Date.now()}`, ...payload }, true, '创建成功', 201),
  },

  // AI 工具
  '/api/ai/chat/sync': {
    POST: (payload: any) => {
      const { toolId, prompt, params } = payload
      const tool = baseFixtures.aiTools.find(t => t.id === toolId)
      if (!tool) return createErrorResponse(errorFixtures.notFound)

      // 模拟 AI 响应
      const responses: Record<string, string> = {
        'ai-homework': `根据知识点"${prompt}"生成的作业题目：\n1. 选择题...\n2. 填空题...\n3. 简答题...`,
        'ai-lesson': `教案：${prompt}\n教学目标：\n教学重难点：\n教学过程：\n教学反思：`,
        'ai-grade': `批改结果：\n得分：95/100\n错误分析：\n建议：`,
        'ai-notice': `【通知】${prompt}\n尊敬的家长您好：\n\n正文内容...\n\n${baseFixtures.schools[0].name}`,
        'ai-report': `学生成长报告：${prompt}\n\n综合评价：\n学科表现：\n德育表现：\n建议：`,
      }

      return createDelayedResponse(
        createApiResponse({
          result: responses[toolId] || `AI 生成结果：${prompt}`,
          toolId,
          timestamp: Date.now(),
        }),
        500 // 模拟 AI 处理延迟
      )
    },
  },

  '/api/ai/save': {
    POST: (payload: any) => createApiResponse({ id: `ai-save-${Date.now()}`, ...payload }, true, '保存成功', 201),
  },

  // 相册
  '/api/albums': {
    GET: (params: any) => {
      let albums = [...baseFixtures.albums]
      if (params.classId) albums = albums.filter(a => a.classId === params.classId)
      return createPaginatedResponse(albums, params.page, params.pageSize)
    },
    POST: (payload: any) => createApiResponse({ id: `album-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, true, '创建成功', 201),
  },
  '/api/albums/:id': {
    GET: (params: any) => {
      const album = baseFixtures.albums.find(a => a.id === params.id)
      return album ? createApiResponse(album) : createErrorResponse(errorFixtures.notFound)
    },
    PATCH: (params: any, payload: any) => {
      const album = baseFixtures.albums.find(a => a.id === params.id)
      return album ? createApiResponse({ ...album, ...payload }) : createErrorResponse(errorFixtures.notFound)
    },
    DELETE: (params: any) => createApiResponse({ id: params.id }, true, '删除成功'),
  },

  // 图片压缩
  '/api/upload/compress': {
    POST: (payload: any) => {
      const { images, quality = 0.8, maxWidth = 1920 } = payload
      return createApiResponse(
        images.map((img: string, i: number) => ({
          original: img,
          compressed: `data:image/jpeg;base64,compressed_${i}_${quality}_${maxWidth}`,
          size: Math.floor(Math.random() * 100000) + 50000,
          originalSize: Math.floor(Math.random() * 500000) + 200000,
        }))
      )
    },
  },
}

// ============================================================================
// 延迟响应工具
// ============================================================================

export function createDelayedResponse<T>(response: T, delay = 300): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(response), delay))
}

// ============================================================================
// 表单验证测试数据
// ============================================================================

export const validationFixtures = {
  // 登录表单
  login: {
    valid: { username: 'admin', password: 'admin' },
    emptyUsername: { username: '', password: 'admin' },
    emptyPassword: { username: 'admin', password: '' },
    emptyBoth: { username: '', password: '' },
    wrongPassword: { username: 'admin', password: 'wrong' },
    sqlInjection: { username: "admin'--", password: 'anything' },
    xss: { username: '<script>alert(1)</script>', password: 'password' },
    longUsername: { username: 'a'.repeat(100), password: 'password' },
    longPassword: { username: 'admin', password: 'b'.repeat(100) },
  },

  // 学校表单
  school: {
    valid: { name: '测试学校', address: '测试地址', principal: '测试校长', phone: '010-88888888' },
    emptyName: { name: '', address: '测试地址', principal: '测试校长', phone: '010-88888888' },
    emptyAddress: { name: '测试学校', address: '', principal: '测试校长', phone: '010-88888888' },
    invalidPhone: { name: '测试学校', address: '测试地址', principal: '测试校长', phone: 'invalid-phone' },
    longName: { name: 'a'.repeat(100), address: '测试地址', principal: '测试校长', phone: '010-88888888' },
  },

  // 班级表单
  class: {
    valid: { name: '测试班级', grade: 1, schoolId: 'school-001', teacherId: 'teacher-001' },
    emptyName: { name: '', grade: 1, schoolId: 'school-001', teacherId: 'teacher-001' },
    invalidGrade: { name: '测试班级', grade: 13, schoolId: 'school-001', teacherId: 'teacher-001' },
    missingSchool: { name: '测试班级', grade: 1, schoolId: '', teacherId: 'teacher-001' },
  },

  // 教师表单
  teacher: {
    valid: { name: '测试教师', employeeNo: 'T999', subjects: ['数学'], schoolId: 'school-001', phone: '13800000000', email: 'test@school.edu' },
    emptyName: { name: '', employeeNo: 'T999', subjects: ['数学'], schoolId: 'school-001', phone: '13800000000', email: 'test@school.edu' },
    invalidEmail: { name: '测试教师', employeeNo: 'T999', subjects: ['数学'], schoolId: 'school-001', phone: '13800000000', email: 'invalid-email' },
    invalidPhone: { name: '测试教师', employeeNo: 'T999', subjects: ['数学'], schoolId: 'school-001', phone: 'invalid', email: 'test@school.edu' },
    emptySubjects: { name: '测试教师', employeeNo: 'T999', subjects: [], schoolId: 'school-001', phone: '13800000000', email: 'test@school.edu' },
  },

  // 学生表单
  student: {
    valid: { name: '测试学生', studentNo: '20249999', gender: 'male', birthDate: '2017-01-01', classId: 'class-001', parentPhone: '13900000000', parentName: '测试家长' },
    emptyName: { name: '', studentNo: '20249999', gender: 'male', birthDate: '2017-01-01', classId: 'class-001', parentPhone: '13900000000', parentName: '测试家长' },
    invalidGender: { name: '测试学生', studentNo: '20249999', gender: 'invalid', birthDate: '2017-01-01', classId: 'class-001', parentPhone: '13900000000', parentName: '测试家长' },
    futureBirthDate: { name: '测试学生', studentNo: '20249999', gender: 'male', birthDate: '2030-01-01', classId: 'class-001', parentPhone: '13900000000', parentName: '测试家长' },
    invalidPhone: { name: '测试学生', studentNo: '20249999', gender: 'male', birthDate: '2017-01-01', classId: 'class-001', parentPhone: 'invalid', parentName: '测试家长' },
  },

  // 相册表单
  album: {
    valid: { title: '测试相册', classId: 'class-001', description: '测试描述', images: ['data:image/png;base64,test1', 'data:image/png;base64,test2'] },
    emptyTitle: { title: '', classId: 'class-001', description: '测试描述', images: ['data:image/png;base64,test1'] },
    emptyClass: { title: '测试相册', classId: '', description: '测试描述', images: ['data:image/png;base64,test1'] },
    noImages: { title: '测试相册', classId: 'class-001', description: '测试描述', images: [] },
    tooManyImages: { title: '测试相册', classId: 'class-001', description: '测试描述', images: Array(50).fill('data:image/png;base64,test') },
  },

  // AI 工具表单
  aiTool: {
    valid: { toolId: 'ai-homework', prompt: '小学一年级数学加减法', params: { difficulty: 'easy', count: 10 } },
    emptyPrompt: { toolId: 'ai-homework', prompt: '', params: { difficulty: 'easy', count: 10 } },
    invalidTool: { toolId: 'invalid-tool', prompt: '测试', params: {} },
    longPrompt: { toolId: 'ai-homework', prompt: 'a'.repeat(5000), params: { difficulty: 'easy', count: 10 } },
  },
}

// ============================================================================
// 角色权限测试矩阵
// ============================================================================

export const permissionMatrix = {
  // 资源 -> 角色 -> 权限
  schools: {
    super: ['create', 'read', 'update', 'delete'],
    school_admin: ['read'],
    teacher: ['read'],
    parent: [],
  },
  classes: {
    super: ['create', 'read', 'update', 'delete'],
    school_admin: ['create', 'read', 'update', 'delete'],
    teacher: ['read'],
    parent: ['read'],
  },
  teachers: {
    super: ['create', 'read', 'update', 'delete'],
    school_admin: ['create', 'read', 'update', 'delete'],
    teacher: ['read'],
    parent: [],
  },
  students: {
    super: ['create', 'read', 'update', 'delete'],
    school_admin: ['create', 'read', 'update', 'delete'],
    teacher: ['read'],
    parent: ['read'], // 只能看自己孩子
  },
  parents: {
    super: ['create', 'read', 'update', 'delete'],
    school_admin: ['create', 'read', 'update', 'delete'],
    teacher: ['read'],
    parent: ['read'],
  },
  albums: {
    super: ['create', 'read', 'update', 'delete'],
    school_admin: ['create', 'read', 'update', 'delete'],
    teacher: ['create', 'read', 'update', 'delete'],
    parent: ['read'],
  },
  aiTools: {
    super: ['use', 'manage'],
    school_admin: ['use', 'manage'],
    teacher: ['use'],
    parent: [],
  },
}

// ============================================================================
// 跨端对齐测试数据（Web 端与小程序端数据结构一致性）
// ============================================================================

export const crossPlatformFixtures = {
  // 用户信息结构（Web 端 localStorage 对象格式 vs 小程序数组格式）
  userStorageFormats: {
    // 旧版 Web 格式（对象）
    webLegacy: {
      user: { username: 'admin', role: 'school_admin', avatar: '👤' },
      token: 'token-123',
    },
    // 新版 Web 格式（数组，与小程序对齐）
    webNew: [
      { username: 'admin', role: 'school_admin', avatar: '👤', token: 'token-123' },
    ],
    // 小程序格式（数组）
    miniprogram: [
      { username: 'admin', role: 'school_admin', avatar: '👤', token: 'token-123' },
    ],
  },

  // 班级数据结构对齐
  classDataAlignment: {
    web: {
      id: 'class-001',
      name: '一年级一班',
      grade: 1,
      studentCount: 35,
      teacher: { id: 'teacher-001', name: '王老师' },
    },
    miniprogram: {
      classId: 'class-001',
      className: '一年级一班',
      grade: 1,
      studentNum: 35,
      teacherInfo: { teacherId: 'teacher-001', teacherName: '王老师' },
    },
  },

  // 相册数据结构对齐
  albumDataAlignment: {
    web: {
      id: 'album-001',
      classId: 'class-001',
      title: '春季运动会',
      description: '精彩瞬间',
      coverImage: 'data:image/png;base64,...',
      images: ['img1', 'img2'],
      createdAt: '2024-04-15T10:00:00Z',
    },
    miniprogram: {
      albumId: 'album-001',
      classId: 'class-001',
      albumTitle: '春季运动会',
      albumDesc: '精彩瞬间',
      coverUrl: 'data:image/png;base64,...',
      imageUrls: ['img1', 'img2'],
      createTime: '2024-04-15 10:00:00',
    },
  },
}

// ============================================================================
// 测试场景组合
// ============================================================================

export const testScenarios = {
  // 登录流程场景
  loginFlows: [
    { name: '超管登录', user: baseFixtures.users.super, expectRedirect: '/super' },
    { name: '校管登录', user: baseFixtures.users.school_admin, expectRedirect: '/school-admin' },
    { name: '教师登录', user: baseFixtures.users.teacher, expectRedirect: '/teacher' },
    { name: '家长登录', user: baseFixtures.users.parent, expectRedirect: '/parent' },
    { name: '统一登录 admin/admin', user: baseFixtures.users.admin, expectRedirect: '/school-admin' },
  ],

  // CRUD 标准流程
  crudFlows: [
    { resource: 'schools', name: '学校管理' },
    { resource: 'classes', name: '班级管理' },
    { resource: 'teachers', name: '教师管理' },
    { resource: 'students', name: '学生管理' },
    { resource: 'parents', name: '家长管理' },
  ],

  // AI 工具流程
  aiToolFlows: baseFixtures.aiTools.map(tool => ({
    toolId: tool.id,
    name: tool.name,
    hasSave: !!tool.savePath,
  })),

  // 相册流程
  albumFlows: [
    { name: '有班级相册', classId: 'class-001', albums: baseFixtures.albums.filter(a => a.classId === 'class-001') },
    { name: '无相册班级', classId: 'class-005', albums: [] },
    { name: '跨班级相册', classId: 'all', albums: baseFixtures.albums },
  ],
}

// ============================================================================
// Mock 请求处理器（用于 MSW 或 jest.mock）
// ============================================================================

export function createMockRequestHandler() {
  return (url: string, options: RequestInit = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const body = options.body ? JSON.parse(options.body as string) : {}

    // 匹配路由
    for (const [pattern, handlers] of Object.entries(apiMockResponses)) {
      const regex = new RegExp('^' + pattern.replace(/:id/g, '([^/]+)') + '$')
      const match = url.match(regex)

      if (match && handlers[method as keyof typeof handlers]) {
        const handler = handlers[method as keyof typeof handlers]
        const params = match.slice(1).reduce((acc, val, i) => {
          const key = pattern.split('/').find(p => p.startsWith(':') && p.slice(1))
          if (key) acc[key] = val
          return acc
        }, {} as Record<string, string>)

        return handler(body, params)
      }
    }

    // 默认 404
    return Promise.resolve(createErrorResponse(errorFixtures.notFound))
  }
}

// 导出默认 fixture 集合
export const fixtures = {
  base: baseFixtures,
  edgeCases: edgeCaseFixtures,
  errors: errorFixtures,
  validation: validationFixtures,
  permissions: permissionMatrix,
  crossPlatform: crossPlatformFixtures,
  scenarios: testScenarios,
  apiMocks: apiMockResponses,
}

export default fixtures