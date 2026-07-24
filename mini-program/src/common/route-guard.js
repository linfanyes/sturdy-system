/**
 * 路由角色守卫：基于五级岗位架构（超管/校管/班主任+老师/科任老师/家长）。
 * 通过 uni.addInterceptor 拦截所有导航方法，校验目标页面的角色权限，
 * 防止越权访问（如教师进入管理员面板、家长进入教师工作台等）。
 *
 * 角色与 token 对应：
 *   super        → admin_token
 *   school_admin → sa_token
 *   teacher      → g_token
 *   parent       → g_parent_token
 *
 * 安全说明：前端守卫仅作体验兜底，真正的权限边界在后端 Guard。
 */

export const ROLE = {
  SUPER: 'super',
  SCHOOL_ADMIN: 'school_admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
}

// 页面路径 → 允许的角色列表；未列出的业务页默认仅教师可访问
const PAGE_ROLES = {
  // 公开页：任一角色（含未登录）均可访问
  'pages/login/login': [ROLE.SUPER, ROLE.SCHOOL_ADMIN, ROLE.TEACHER, ROLE.PARENT],
  'pages/parent-login/parent-login': [ROLE.SUPER, ROLE.SCHOOL_ADMIN, ROLE.TEACHER, ROLE.PARENT],
  // 角色专属页
  'pages/admin/admin': [ROLE.SUPER],
  'pages/school-admin/school-admin': [ROLE.SCHOOL_ADMIN],
  'pages/parent/parent': [ROLE.PARENT],
}

// 各角色首页（越权时回退目标）
const ROLE_HOME = {
  [ROLE.SUPER]: '/pages/admin/admin',
  [ROLE.SCHOOL_ADMIN]: '/pages/school-admin/school-admin',
  [ROLE.TEACHER]: '/pages/dashboard/dashboard',
  [ROLE.PARENT]: '/pages/parent/parent',
}

/** 获取当前登录角色（按 token 存在性判断；优先级：超管 > 校管 > 家长 > 教师） */
export function getCurrentRole() {
  if (uni.getStorageSync('admin_token')) return ROLE.SUPER
  if (uni.getStorageSync('sa_token')) return ROLE.SCHOOL_ADMIN
  if (uni.getStorageSync('g_parent_token')) return ROLE.PARENT
  if (uni.getStorageSync('g_token')) return ROLE.TEACHER
  return null
}

/** 规范化页面路径：去掉前导 / 和 query 参数 */
function normalizePath(url) {
  if (!url) return ''
  let p = String(url).split('?')[0]
  if (p.startsWith('/')) p = p.slice(1)
  return p
}

/** 校验当前角色是否可访问目标页面 */
export function canAccess(url) {
  const path = normalizePath(url)
  if (!path) return true
  const role = getCurrentRole()
  const allowedRoles = PAGE_ROLES[path]
  if (!allowedRoles) {
    // 未在 PAGE_ROLES 声明的业务页（含子包 games/tools/ai）默认仅教师可访问
    return role === ROLE.TEACHER
  }
  if (!role) {
    // 未登录：仅允许公开页
    return path === 'pages/login/login' || path === 'pages/parent-login/parent-login'
  }
  return allowedRoles.includes(role)
}

/** 获取当前角色应回退的首页 */
export function getRoleHome() {
  const role = getCurrentRole()
  return ROLE_HOME[role] || '/pages/login/login'
}

/**
 * 注册全局导航拦截器：拦截 navigateTo / switchTab / redirectTo / reLaunch。
 * 越权访问时阻止跳转并提示，引导用户回到对应角色首页。
 */
export function setupRouteGuard() {
  const methods = ['navigateTo', 'switchTab', 'redirectTo', 'reLaunch']
  methods.forEach((method) => {
    uni.addInterceptor(method, {
      invoke(args) {
        const url = args && args.url
        if (!url || canAccess(url)) return args
        // 越权：阻止本次跳转并提示
        uni.showToast({ title: '无权访问该页面', icon: 'none', duration: 1500 })
        const home = getRoleHome()
        // 延迟回退，避免与当前拦截冲突
        setTimeout(() => {
          if (home.indexOf('dashboard') > -1) {
            uni.switchTab({ url: home, fail: () => {} })
          } else {
            uni.reLaunch({ url: home, fail: () => {} })
          }
        }, 300)
        return false
      },
    })
  })
}
