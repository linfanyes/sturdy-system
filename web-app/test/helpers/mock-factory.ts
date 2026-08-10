/**
 * Mock Factory - 统一 Mock 工厂
 * 提供统一的 Mock 数据创建、API Mock、组件 Mock 等工具
 */

import { vi, type MockInstance } from 'vitest'

/**
 * 用户角色枚举
 */
export enum UserRole {
  SUPER = 'super',
  SCHOOL_ADMIN = 'school_admin',
  TEACHER = 'teacher',
  PARENT = 'parent',
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: string
  name: string
  role: UserRole
  avatar?: string
  schoolId?: string
  classId?: string
}

/**
 * 创建 Mock 用户信息
 */
export function createMockUser(overrides: Partial<UserInfo> = {}): UserInfo {
  return {
    id: 'user-001',
    name: '测试用户',
    role: UserRole.TEACHER,
    avatar: '👨‍🏫',
    schoolId: 'school-001',
    classId: 'class-001',
    ...overrides,
  }
}

/**
 * 创建不同角色的 Mock 用户
 */
export const mockUsers = {
  super: createMockUser({ id: 'super-001', name: '超级管理员', role: UserRole.SUPER, avatar: '👑' }),
  schoolAdmin: createMockUser({ id: 'admin-001', name: '校管理员', role: UserRole.SCHOOL_ADMIN, avatar: '🏫', schoolId: 'school-001' }),
  teacher: createMockUser({ id: 'teacher-001', name: '张老师', role: UserRole.TEACHER, avatar: '👨‍🏫', schoolId: 'school-001', classId: 'class-001' }),
  parent: createMockUser({ id: 'parent-001', name: '李家长', role: UserRole.PARENT, avatar: '👨‍👩‍👧', schoolId: 'school-001', classId: 'class-001' }),
}

/**
 * 创建 Mock API 响应
 */
export function createApiResponse<T>(data: T, success = true, message = 'success'): { success: boolean; data: T; message: string } {
  return { success, data, message }
}

/**
 * 创建 Mock 分页响应
 */
export function createPaginatedResponse<T>(items: T[], page = 1, pageSize = 10, total?: number) {
  return createApiResponse({
    items,
    page,
    pageSize,
    total: total ?? items.length,
    totalPages: Math.ceil((total ?? items.length) / pageSize),
  })
}

/**
 * Mock 请求函数工厂
 */
export function createMockRequest() {
  const mockGet = vi.fn()
  const mockPost = vi.fn()
  const mockPatch = vi.fn()
  const mockPut = vi.fn()
  const mockDelete = vi.fn()

  return {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    put: mockPut,
    delete: mockDelete,
    // 重置所有 mock
    resetAll: () => {
      mockGet.mockReset()
      mockPost.mockReset()
      mockPatch.mockReset()
      mockPut.mockReset()
      mockDelete.mockReset()
    },
    // 设置默认成功响应
    setupDefaults: (defaults: Record<string, any>) => {
      Object.entries(defaults).forEach(([method, responses]) => {
        const mockFn = { get: mockGet, post: mockPost, patch: mockPatch, put: mockPut, delete: mockDelete }[method]
        if (mockFn && responses) {
          Object.entries(responses).forEach(([url, response]) => {
            mockFn.mockImplementation((url: string) => {
              if (url.includes(response.url || '')) {
                return Promise.resolve(createApiResponse(response.data))
              }
              return Promise.resolve(createApiResponse(null, false, 'Not mocked'))
            })
          })
        }
      })
    },
  }
}

/**
 * Mock localStorage
 */
export function mockLocalStorage(initialData: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initialData }

  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _store: store,
  }

  Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true })
  return mockStorage
}

/**
 * Mock sessionStorage
 */
export function mockSessionStorage(initialData: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initialData }

  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _store: store,
  }

  Object.defineProperty(global, 'sessionStorage', { value: mockStorage, writable: true })
  return mockStorage
}

/**
 * Mock navigator.clipboard
 */
export function mockClipboard() {
  const mockWriteText = vi.fn().mockResolvedValue(undefined)
  const mockReadText = vi.fn().mockResolvedValue('')

  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText, readText: mockReadText },
    writable: true,
    configurable: true,
  })

  return { writeText: mockWriteText, readText: mockReadText }
}

/**
 * Mock window.location
 */
export function mockLocation(href = 'http://localhost:3000/') {
  const mockHref = href
  const mockOrigin = new URL(href).origin
  const mockPathname = new URL(href).pathname

  Object.defineProperty(window, 'location', {
    value: {
      href: mockHref,
      origin: mockOrigin,
      pathname: mockPathname,
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
    configurable: true,
  })

  return { href: mockHref, origin: mockOrigin, pathname: mockPathname }
}

/**
 * Mock router
 */
export function createMockRouter(routes: any[] = []) {
  const mockPush = vi.fn().mockResolvedValue(undefined)
  const mockReplace = vi.fn().mockResolvedValue(undefined)
  const mockGo = vi.fn()
  const mockBack = vi.fn()
  const mockForward = vi.fn()

  return {
    push: mockPush,
    replace: mockReplace,
    go: mockGo,
    back: mockBack,
    forward: mockForward,
    currentRoute: { value: { path: '/', params: {}, query: {} } },
    getRoutes: () => routes,
    addRoute: vi.fn(),
    removeRoute: vi.fn(),
    hasRoute: vi.fn(),
    resolve: vi.fn(),
    isReady: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * 创建 Mock 组件挂载选项
 */
export function createMountOptions(overrides: Record<string, any> = {}) {
  return {
    global: {
      plugins: [],
      stubs: {
        'router-link': true,
        'router-view': true,
        'font-awesome-icon': true,
        ...overrides.stubs,
      },
      mocks: {
        $t: (key: string) => key,
        $route: { path: '/', params: {}, query: {} },
        $router: createMockRouter(),
        ...overrides.mocks,
      },
      provide: {
        ...overrides.provide,
      },
    },
    attachTo: document.body,
    ...overrides,
  }
}

/**
 * 等待所有异步操作完成
 */
export async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await vi.runAllTimersAsync()
}

/**
 * 创建延迟 Promise（用于测试加载态）
 */
export function createDelayedPromise<T>(value: T, delay = 100): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), delay))
}

/**
 * 创建会失败的 Promise
 */
export function createRejectedPromise<T>(error: Error | string, delay = 100): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(error instanceof Error ? error : new Error(String(error))), delay))
}

/**
 * Mock API 模块
 */
export function mockApiModule(modulePath: string, mockImplementation: Record<string, any>) {
  vi.doMock(modulePath, () => mockImplementation)
}

/**
 * 创建 Mock 类别/班级/学校数据
 */
export function createMockSchools(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `school-${String(i + 1).padStart(3, '0')}`,
    name: `第${i + 1}中学`,
    address: `某市第${i + 1}区`,
    principal: `校长${i + 1}`,
    phone: `010-8888${String(i + 1).padStart(4, '0')}`,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}

export function createMockClasses(schoolId: string, count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `class-${schoolId}-${String(i + 1).padStart(3, '0')}`,
    schoolId,
    name: `${i + 1}年级${String.fromCharCode(65 + (i % 5))}班`,
    grade: i + 1,
    studentCount: 30 + i * 2,
    teacherId: `teacher-${schoolId}-${String(i + 1).padStart(3, '0')}`,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}

export function createMockStudents(classId: string, count = 30) {
  return Array.from({ length: count }, (_, i) => ({
    id: `student-${classId}-${String(i + 1).padStart(3, '0')}`,
    classId,
    name: `学生${i + 1}`,
    studentNo: `2024${String(i + 1).padStart(4, '0')}`,
    gender: i % 2 === 0 ? 'male' : 'female',
    birthDate: `2010-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    parentPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}

export function createMockTeachers(schoolId: string, count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: `teacher-${schoolId}-${String(i + 1).padStart(3, '0')}`,
    schoolId,
    name: `教师${i + 1}`,
    employeeNo: `T${String(i + 1).padStart(6, '0')}`,
    subjects: ['语文', '数学', '英语', '物理', '化学'].slice(0, (i % 3) + 1),
    classes: [`class-${schoolId}-${String(i + 1).padStart(3, '0')}`],
    phone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    email: `teacher${i + 1}@school.edu.cn`,
    status: 'active',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}

/**
 * 边界/异常测试数据
 */
export const edgeCaseData = {
  emptyArray: [],
  emptyString: '',
  nullValue: null,
  undefinedValue: undefined,
  veryLongString: 'a'.repeat(10000),
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  unicodeChars: '🎉🎊🎈🎁🎀🌟✨💫⭐🌈',
  chineseChars: '中文测试数据包含特殊字符！@#￥%……&*（）',
  htmlScript: '<script>alert("xss")</script>',
  sqlInjection: "'; DROP TABLE users; --",
  largeNumber: Number.MAX_SAFE_INTEGER,
  negativeNumber: -999999,
  floatNumber: 3.141592653589793,
  deepNested: { a: { b: { c: { d: { e: 'deep' } } } } },
  circularRef: (() => { const obj: any = { a: 1 }; obj.self = obj; return obj })(),
}

/**
 * 重置所有 Mock
 */
export function resetAllMocks() {
  vi.clearAllMocks()
  vi.resetModules()
}