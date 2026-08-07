import { reactive } from 'vue'
import { DEMO_MODE_ENABLED } from './config'
import { SCHEMES, FONT_SIZES } from '@gardener/shared/constants'
import { authMachine, bindAuthMachine } from './auth-machine'
import { onAuthReset } from './auth-events'

export { SCHEMES, FONT_SIZES, authMachine, bindAuthMachine }

// 监听 request.js 发出的鉴权重置事件（打破 circular chunk：request.js 不直接 import store.js）
onAuthReset(() => {
  auth.token = ''
  auth.user = null
  auth.features = []
  auth.effectiveFeatures = []
  auth.schoolFeatureFlags = null
  parent.token = ''
  parent.user = null
  parent.teacherToken = ''
  parent.parentToken = ''
  parent.currentRole = 'parent'
})

const TOKEN_KEY = 'g_token'
const USER_KEY = 'g_user'
const THEME_KEY = 'g_theme'
const SCHEME_KEY = 'g_scheme'
const FONT_KEY = 'g_fontsize'
const MOCK_KEY = 'g_mock_mode'
const PARENT_TOKEN_KEY = 'g_parent_token'
const PARENT_USER_KEY = 'g_parent_user'
const PARENT_TEACHER_TOKEN_KEY = 'g_parent_teacher_token'
const PARENT_PARENT_TOKEN_KEY = 'g_parent_parent_token'
const PARENT_ROLE_KEY = 'g_parent_role'
const PARENT_DATA_KEY = 'g_parent_data'
const EFFECTIVE_FEATURES_KEY = 'g_effective_features'
const SCHOOL_FEATURE_FLAGS_KEY = 'g_school_feature_flags'
const ADMIN_TOKEN_KEY = 'admin_token'
const SA_TOKEN_KEY = 'sa_token'
const SA_USER_KEY = 'sa_user'

/**
 * 冷启动恢复登录令牌：按角色优先级读取，与 route-guard.js 的角色判定链一致
 * （admin_token > sa_token > g_token）。
 *
 * 修复历史隐患：超管/校管登录曾把令牌「同时」写入 g_token（教师 token key），
 * 目的仅是让通用 api 层冷启动后还能带上 Bearer。副作用是角色靠 token 存在性反推时，
 * 一旦 admin_token / sa_token 被单独清除，用户会被降级误识别为教师。
 * 现改由本函数按优先级恢复，超管/校管不再污染 g_token。
 */
function readToken() {
  return uni.getStorageSync(ADMIN_TOKEN_KEY)
    || uni.getStorageSync(SA_TOKEN_KEY)
    || uni.getStorageSync(TOKEN_KEY)
    || ''
}

/** 冷启动恢复用户信息：教师 g_user 优先，回退校管 sa_user（登录时以 JSON 字符串写入） */
function readUser() {
  const u = uni.getStorageSync(USER_KEY)
  if (u) return u
  const sa = uni.getStorageSync(SA_USER_KEY)
  if (!sa) return null
  try {
    return typeof sa === 'string' ? JSON.parse(sa) : sa
  } catch (e) {
    return null
  }
}

/** 冷启动恢复：实际可用功能包（非数组一律回退空数组 = 未加载） */
function readEffectiveFeatures() {
  const v = uni.getStorageSync(EFFECTIVE_FEATURES_KEY)
  return Array.isArray(v) ? v : []
}

/** 冷启动恢复：学校级功能包开关（空字符串表示 null = 全开） */
function readSchoolFeatureFlags() {
  const v = uni.getStorageSync(SCHOOL_FEATURE_FLAGS_KEY)
  return Array.isArray(v) ? v : null
}

export const auth = reactive({
  token: readToken(),
  user: readUser(),
  features: [], // 管理员配置的功能列表,空数组=全部可用
  // 后端下发的实际可用功能包（effective = 学校级 ∩ 教师级），空数组=未加载，显隐回退 features
  effectiveFeatures: readEffectiveFeatures(),
  // 本校学校级功能包开关（null/[]=全开），用于教师「有效权限预览」
  schoolFeatureFlags: readSchoolFeatureFlags(),
})

// tabBar 页面清单：微信限制 setTabBarStyle 只能在 tabBar 页面调用，
// 否则报 "setTabBarStyle:fail not TabBar page"
const TABBAR_PAGES = [
  'pages/dashboard/dashboard',
  'pages/classes/classes',
  'pages/students/students',
  'pages/toolbox/toolbox',
  'pages/config/config',
]

// 当前是否处于 tabBar 页面（微信要求 setTabBarStyle 的调用前提）
export function isOnTabBarPage() {
  try {
    const pages = getCurrentPages()
    if (!pages || !pages.length) return false
    const cur = pages[pages.length - 1].route
    return TABBAR_PAGES.includes(cur)
  } catch (e) {
    return false
  }
}

// 待应用的 tabBar 样式：在非 tabBar 页面修改主题时先缓存，待进入 tabBar 页面再落地
let pendingTabBarStyle = null

// 安全调用 setTabBarStyle：非 tabBar 页面仅缓存不调用（避免微信报 not TabBar page）
function updateTabBarStyle(partial) {
  pendingTabBarStyle = { ...(pendingTabBarStyle || {}), ...partial }
  if (!isOnTabBarPage()) return
  flushTabBarStyle()
}

// 立即把待应用样式落地（仅在 tabBar 页面生效）
export function flushTabBarStyle() {
  if (!pendingTabBarStyle) return
  if (!isOnTabBarPage()) return
  const opts = pendingTabBarStyle
  pendingTabBarStyle = null
  uni.setTabBarStyle({
    ...opts,
    fail: () => {},
  })
}

// 主题：light / dark。默认跟随系统；用户手动切换后持久化。
const sysDark =
  typeof uni.getSystemInfoSync === 'function' &&
  uni.getSystemInfoSync().theme === 'dark'
export const theme = reactive({
  mode: uni.getStorageSync(THEME_KEY) || (sysDark ? 'dark' : 'light'),
  colorScheme: uni.getStorageSync(SCHEME_KEY) || 'butter',
  fontSize: uni.getStorageSync(FONT_KEY) || 'md',
})

// 演示模式开关（持久化到 localStorage，页面层通过 import { setMockMode } 生效）
// 生产构建下 DEMO_MODE_ENABLED=false，初始即 false，即使本地残留 g_mock_mode 标记也不会误激活
export const mockMode = reactive({
  enabled: DEMO_MODE_ENABLED && uni.getStorageSync(MOCK_KEY) === 'true',
})

// tabBar 页面之间传递参数（uni.switchTab 不支持 URL 参数，通过此桥接）
export const switchTabParams = reactive({})

// 家长端登录态（与教师端隔离，各自独立存储）
// 双角色支持：当教师同时拥有家长身份时，teacherToken/parentToken 分别存两套令牌
export const parent = reactive({
  token: uni.getStorageSync(PARENT_TOKEN_KEY) || '',
  user: uni.getStorageSync(PARENT_USER_KEY) || null,
  // 双角色切换支持
  teacherToken: uni.getStorageSync(PARENT_TEACHER_TOKEN_KEY) || '',
  parentToken: uni.getStorageSync(PARENT_PARENT_TOKEN_KEY) || '',
  currentRole: uni.getStorageSync(PARENT_ROLE_KEY) || 'parent',
  parentId: '',
  kids: [],
})

export function setDualTokens(teacherToken, parentToken, parentData) {
  parent.teacherToken = teacherToken
  parent.parentToken = parentToken
  parent.token = parentToken
  if (parentData) {
    parent.parentId = parentData.parentId || ''
    parent.kids = parentData.kids || []
  }
  parent.currentRole = 'parent'
  // 持久化
  uni.setStorageSync(PARENT_TEACHER_TOKEN_KEY, teacherToken)
  uni.setStorageSync(PARENT_PARENT_TOKEN_KEY, parentToken)
  uni.setStorageSync(PARENT_TOKEN_KEY, parentToken)
  uni.setStorageSync(PARENT_ROLE_KEY, 'parent')
  if (parentData) {
    uni.setStorageSync(PARENT_DATA_KEY, { parentId: parentData.parentId, kids: parentData.kids })
  }
  // machine 快照写入（双身份）
  const snap = {
    teacher: { token: teacherToken, user: auth.user },
    parent: { token: parentToken, user: parent.user || auth.user },
  }
  uni.setStorageSync('__auth_multi_role__', JSON.stringify(snap))
}

export function switchRole(targetRole) {
  if (targetRole === 'teacher' && parent.teacherToken) {
    // 切换到教师：备份当前 parentToken，激活 teacherToken
    parent.parentToken = parent.token
    parent.token = parent.teacherToken
    parent.currentRole = 'teacher'
    auth.token = parent.teacherToken
    uni.setStorageSync(PARENT_PARENT_TOKEN_KEY, parent.parentToken)
    uni.setStorageSync(PARENT_TOKEN_KEY, parent.teacherToken)
    uni.setStorageSync(PARENT_ROLE_KEY, 'teacher')
    // machine 快照同步：把双身份写入 multiRole 快照
    syncMachineMultiRole()
    uni.reLaunch({ url: '/pages/dashboard/dashboard' })
  } else if (targetRole === 'parent' && parent.parentToken) {
    // 切换到家长：备份当前 teacherToken，激活 parentToken
    parent.teacherToken = parent.token
    parent.token = parent.parentToken
    parent.currentRole = 'parent'
    auth.token = parent.parentToken
    uni.setStorageSync(PARENT_TEACHER_TOKEN_KEY, parent.teacherToken)
    uni.setStorageSync(PARENT_TOKEN_KEY, parent.parentToken)
    uni.setStorageSync(PARENT_ROLE_KEY, 'parent')
    // machine 快照同步
    syncMachineMultiRole()
    uni.reLaunch({ url: '/pages/parent/parent' })
  }
}

/**
 * 把当前双身份（parent.teacherToken/parent.parentToken）同步到 machine 的 multiRole 快照，
 * 从而使 authMachine.switchRole 可正常工作。
 * 内部调用 persistence。
 */
function syncMachineMultiRole() {
  const snap = {}
  if (parent.teacherToken && auth.user) {
    snap.teacher = { token: parent.teacherToken, user: auth.user }
  }
  if (parent.parentToken && parent.user) {
    snap.parent = { token: parent.parentToken, user: parent.user }
  }
  if (Object.keys(snap).length) {
    uni.setStorageSync('__auth_multi_role__', JSON.stringify(snap))
  }
}

export function setParent(token, user) {
  parent.token = token
  parent.user = user
  parent.parentToken = token
  parent.currentRole = 'parent'
  uni.setStorageSync(PARENT_TOKEN_KEY, token)
  uni.setStorageSync(PARENT_USER_KEY, typeof user === 'string' ? user : JSON.stringify(user))
  uni.setStorageSync(PARENT_PARENT_TOKEN_KEY, token)
  uni.setStorageSync(PARENT_ROLE_KEY, 'parent')
  // 同步更新 machine 快照 + auth reactive，使 getToken / effectiveFeatures 一致
  auth.token = token
  auth.user = user
  const snap = { parent: { token, user } }
  uni.setStorageSync('__auth_multi_role__', JSON.stringify(snap))
}

export function logoutParent() {
  parent.token = ''
  parent.user = null
  parent.teacherToken = ''
  parent.parentToken = ''
  parent.currentRole = 'parent'
  parent.parentId = ''
  parent.kids = []
  uni.removeStorageSync(PARENT_TOKEN_KEY)
  uni.removeStorageSync(PARENT_USER_KEY)
  uni.removeStorageSync(PARENT_TEACHER_TOKEN_KEY)
  uni.removeStorageSync(PARENT_PARENT_TOKEN_KEY)
  uni.removeStorageSync(PARENT_ROLE_KEY)
  uni.removeStorageSync(PARENT_DATA_KEY)
}

export function setTheme(mode) {
  theme.mode = mode === 'dark' ? 'dark' : 'light'
  uni.setStorageSync(THEME_KEY, theme.mode)
  applyAppearance(theme.mode)
}

export function toggleTheme() {
  setTheme(theme.mode === 'dark' ? 'light' : 'dark')
}

// 应用系统级外观：背景、导航栏、tabBar
export function applyAppearance(mode) {
  const dark = mode === 'dark'
  try {
    uni.setBackgroundColor({
      backgroundColor: dark ? '#15171c' : '#fff7e6',
      backgroundColorTop: dark ? '#15171c' : '#fff7e6',
      backgroundColorBottom: dark ? '#15171c' : '#fff7e6',
    })
  } catch (e) { console.error('[mini catch]', e) }
  try {
    uni.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: dark ? '#1f232b' : '#fff7e6',
    })
  } catch (e) { console.error('[mini catch]', e) }
  // setTabBarStyle 仅允许在 tabBar 页面调用：非 tabBar 页面时仅缓存，待进入 tabBar 页落地
  updateTabBarStyle({
    color: dark ? '#8a909a' : '#9aa0a6',
    selectedColor: dark ? '#3fd07f' : '#e6a23c',
    backgroundColor: dark ? '#1a1d23' : '#ffffff',
    borderStyle: dark ? 'white' : 'black',
  })
}

export function initTheme() {
  applyAppearance(theme.mode)
  applyColorScheme(theme.colorScheme)
  applyFontSize(theme.fontSize)
}

// 应用主题色：同步全局 tabBar 选中色，使主题色在全局可见（对齐 web 强调色变化）
export function applyColorScheme(scheme) {
  const s = SCHEMES.find((x) => x.value === scheme) || SCHEMES[0]
  updateTabBarStyle({ selectedColor: s.color })
}

// 切换主题色（循环到下一个）
export function cycleColorScheme() {
  const idx = SCHEMES.findIndex((x) => x.value === theme.colorScheme)
  const next = SCHEMES[(idx + 1) % SCHEMES.length]
  setColorScheme(next.value)
  return next.value
}

export function setColorScheme(scheme) {
  if (!SCHEMES.find((x) => x.value === scheme)) scheme = 'butter'
  theme.colorScheme = scheme
  uni.setStorageSync(SCHEME_KEY, scheme)
  applyColorScheme(scheme)
}

// 字体大小：sm / md / lg
export function setFontSize(size) {
  if (!FONT_SIZES.find((x) => x.value === size)) size = 'md'
  theme.fontSize = size
  uni.setStorageSync(FONT_KEY, size)
  applyFontSize(size)
}

// 应用字体大小：通过 setTabBarStyle 不可调字体，仅作为页面 CSS 变量来源
export function applyFontSize(size) {
  const f = FONT_SIZES.find((x) => x.value === size) || FONT_SIZES[1]
  // 仅作记录，由页面 root view 的 :class 控制 CSS 变量缩放
  theme.fontScale = f.scale
}

export function getToken() {
  // 优先 machine（冷启动 restore 后 machine 是最新的），回退 auth reactive
  return authMachine.token || auth.token
}

export function setAuth(token, user) {
  auth.token = token
  auth.user = user
  uni.setStorageSync(TOKEN_KEY, token)
  const u = typeof user === 'string' ? user : JSON.stringify(user)
  uni.setStorageSync(USER_KEY, u)
}

export function setUser(user) {
  auth.user = user
  // 自动从 user 对象提取管理员配置的功能权限
  if (user && Array.isArray(user.features)) auth.features = user.features
  uni.setStorageSync(USER_KEY, user)
}

/**
 * 写入后端下发的功能档案（登录响应 / GET /auth/me 均含）。
 * effectiveFeatures = 学校级 ∩ 教师级实际可用；schoolFeatureFlags 供校管端预览使用。
 * @param {{ effectiveFeatures?: string[], schoolFeatureFlags?: string[]|null }} profile
 */
export function setFeatureProfile(profile) {
  if (!profile) return
  if (Array.isArray(profile.effectiveFeatures)) {
    auth.effectiveFeatures = profile.effectiveFeatures
    uni.setStorageSync(EFFECTIVE_FEATURES_KEY, profile.effectiveFeatures)
  }
  if ('schoolFeatureFlags' in profile) {
    const flags = Array.isArray(profile.schoolFeatureFlags) ? profile.schoolFeatureFlags : null
    auth.schoolFeatureFlags = flags
    uni.setStorageSync(SCHOOL_FEATURE_FLAGS_KEY, flags === null ? '' : flags)
  }
}

export function logout() {
  // 通过 shared machine 统一清除：machine 内部已清 storage 全量
  authMachine.logout()
  // reactive 字段同步（machine logout 已发事件由 bindAuthMachine 桥接更新 auth.token/user；
  // 这里再补一次 immediate 同步，避免桥接时序问题）
  auth.token = ''
  auth.user = null
  auth.features = []
  auth.effectiveFeatures = []
  auth.schoolFeatureFlags = null
  // 双身份 / 家长端 key 也清理（machine.clearLogin 未包 parent 双身份 key）
  uni.removeStorageSync(PARENT_TEACHER_TOKEN_KEY)
  uni.removeStorageSync(PARENT_PARENT_TOKEN_KEY)
  uni.removeStorageSync(PARENT_ROLE_KEY)
  uni.removeStorageSync(PARENT_DATA_KEY)
  // 演示模式标记也清理
  uni.removeStorageSync(MOCK_KEY)
}
