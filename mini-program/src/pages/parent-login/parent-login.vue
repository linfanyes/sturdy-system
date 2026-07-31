<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🎒</view>
    <view class="title">家长中心</view>
    <view class="sub">输入孩子学号与密码，即可查看成绩、班级通知，并与老师沟通</view>
    <input v-model="studentNo" class="inp" type="number" maxlength="20" placeholder="请输入学生学号" />
    <input v-model="password" class="inp" password placeholder="请输入密码（默认 123456）" />
    <button class="btn" :disabled="loading" @click="login">{{ loading ? '登录中…' : '用学号登录' }}</button>
    <view class="or">— 或 —</view>
    <button class="btn wechat-btn" :disabled="loading" @click="wxLogin">微信一键登录</button>
    <view class="tip-row">
      <text class="tip" @click="back">返回教师登录</text>
      <text class="tip" @click="goUnified">统一登录</text>
    </view>

    <!-- 微信绑定弹窗：微信未绑定任何账号时弹框，输入学号完成绑定 -->
    <view class="mask" v-if="bindOpenid" @click="bindOpenid = ''">
      <view class="sheet" @click.stop>
        <view class="sh-bar">
          <view class="sh-t">绑定家长账号</view>
          <text class="sh-close" @click="bindOpenid = ''">✕</text>
        </view>
        <view class="sh-sub">该微信尚未绑定家长账号，请输入孩子学号完成绑定后即可登录</view>
        <input v-model="bindStudentNo" class="inp" type="number" maxlength="20" confirm-type="done" placeholder="请输入学生学号" placeholder-style="color:#b5a890;" @confirm="doBind" />
        <input v-model="bindPassword" class="inp" password placeholder="家长密码（默认 123456）" placeholder-style="color:#b5a890;" />
        <button class="ok" :disabled="bindLoading" @click="doBind">{{ bindLoading ? '绑定中…' : '完成绑定' }}</button>
      </view>
    </view>

    <!-- 角色选择弹层（教师兼家长身份二选一） -->
    <view class="role-mask" v-if="showRoleChoice">
      <view class="role-modal">
        <view class="role-title">选择登录身份</view>
        <view class="role-desc">该微信账号同时关联了教师和家长身份，请选择进入哪个端</view>
        <view class="role-buttons">
          <view class="role-btn parent" @tap="selectRole('parent')">
            <text>👨‍👩‍👧‍👦 以家长身份进入</text>
          </view>
          <view class="role-btn teacher" @tap="selectRole('teacher')">
            <text>👨‍🏫 以老师身份进入</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parentApi, api } from '../../common/request'
import { setParent, setAuth, setDualTokens, setFeatureProfile, theme, auth } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const studentNo = ref('')
const password = ref('')
const loading = ref(false)

async function login() {
  const no = studentNo.value.trim()
  if (!no || !/^\d+$/.test(no)) {
    return uni.showToast({ title: '请输入正确的学号', icon: 'none' })
  }
  if (!password.value) {
    return uni.showToast({ title: '请输入密码', icon: 'none' })
  }
  loading.value = true
  try {
    const res = await parentApi.post('/parent-auth/login', { studentNo: no, password: password.value })
    setParent(res.token, res.parent)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/parent/parent' }), 600)
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || '登录失败'
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
  }
  loading.value = false
}

function back() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/login/login' }) })
}
function goUnified() {
  uni.reLaunch({ url: '/pages/login/login' })
}

/* -------- 微信登录：处理 needsRoleChoice / needsBind / 单角色 -------- */
const bindOpenid = ref('')
const bindStudentNo = ref('')
const bindPassword = ref('')
const bindLoading = ref(false)
let wechatNickName = ''

// 角色选择（教师兼家长）
const showRoleChoice = ref(false)
const roleChoiceData = ref(null)

async function wxLogin() {
  loading.value = true
  try {
    const { code } = await uni.login()
    // 尝试获取微信昵称（绑定家长时作为称呼默认值）
    try {
      const uinfo = await uni.getUserProfile({ desc: '用于显示家长昵称' })
      wechatNickName = uinfo?.userInfo?.nickName || ''
    } catch (e) { wechatNickName = '' }
    const res = await api.post('/auth/wechat-login', { code })
    if (res.needsRoleChoice) {
      // 教师兼家长身份，需用户选择
      roleChoiceData.value = res
      showRoleChoice.value = true
      return
    }
    if (res.needsBind) {
      // 未绑定任何账号，弹框输入学号完成绑定
      bindOpenid.value = res.openid || code
      bindStudentNo.value = ''
      bindPassword.value = ''
    } else if (res.role === 'parent') {
      handleParentLogin(res)
    } else if (res.role === 'teacher') {
      // 微信登录命中教师身份：提示用户去教师登录
      uni.showModal({
        title: '已绑定教师账号',
        content: '该微信绑定的是教师账号，是否进入教师端？',
        confirmText: '进入教师端',
        cancelText: '留在家长登录',
        success: (m) => {
          if (m.confirm) {
            setAuth(res.token, res.user)
            setFeatureProfile(res)
            uni.reLaunch({ url: '/pages/dashboard/dashboard' })
          }
        },
      })
    } else {
      uni.showToast({ title: '微信登录异常，请重试', icon: 'none' })
    }
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || '微信登录失败'
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
  }
  loading.value = false
}

/** 家长登录成功：写入登录态并跳转 */
function handleParentLogin(res) {
  setFeatureProfile(res)
  setParent(res.token, res.parent || { studentId: res.studentId, studentName: res.studentName, studentNo: res.studentNo, classId: res.classId })
  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => uni.redirectTo({ url: '/pages/parent/parent' }), 500)
}

/** 角色选择：教师兼家长身份二选一 */
function selectRole(role) {
  const data = roleChoiceData.value
  if (!data) return
  if (role === 'parent') {
    // 以家长身份进入
    setFeatureProfile(data.parent)
    setParent(data.parent.token, data.parent)
    setDualTokens(data.teacher.token, data.parent.token, data.parent)
    auth.token = data.parent.token
    uni.setStorageSync('g_token', data.parent.token)
    showRoleChoice.value = false
    roleChoiceData.value = null
    uni.reLaunch({ url: '/pages/parent/parent' })
  } else if (role === 'teacher') {
    // 以教师身份进入（同时保存双角色令牌，便于后续切换）
    setAuth(data.teacher.token, data.teacher.user)
    setFeatureProfile(data.teacher)
    setDualTokens(data.teacher.token, data.parent.token, data.parent)
    showRoleChoice.value = false
    roleChoiceData.value = null
    uni.reLaunch({ url: '/pages/dashboard/dashboard' })
  }
}

/** 微信绑定家长账号：用学号 + 密码完成绑定 */
async function doBind() {
  const no = bindStudentNo.value.trim()
  if (!no || !/^\d+$/.test(no)) {
    return uni.showToast({ title: '请输入正确的学号', icon: 'none' })
  }
  bindLoading.value = true
  try {
    const { code } = await uni.login()
    const res = await api.post('/auth/bind-by-number', {
      code,
      number: no,
      password: bindPassword.value || undefined,
      nickName: wechatNickName || undefined,
    })
    bindOpenid.value = ''
    if (res.role === 'parent') {
      handleParentLogin(res)
    } else {
      uni.showToast({ title: '绑定成功，请重新登录', icon: 'success' })
    }
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || '绑定失败'
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
  }
  bindLoading.value = false
}
</script>

<style scoped>
.login {
  background: var(--c-bg);
  color: var(--c-text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  box-sizing: border-box;
}
.logo { font-size: 140rpx; }
.title { font-size: 52rpx; font-weight: 700; color: var(--c-title); margin-top: 20rpx; }
.sub { color: var(--c-sub); margin: 16rpx 0 60rpx; font-size: 26rpx; text-align: center; line-height: 1.6; }
.inp {
  width: 100%;
  max-width: 620rpx;
  background: var(--c-input);
  border: 1px solid var(--c-input-border);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  font-size: 30rpx;
  color: var(--c-text);
  margin-bottom: 24rpx;
  box-sizing: border-box;
}
.btn {
  width: 100%;
  max-width: 620rpx;
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
}
.btn[disabled] { opacity: 0.6; }
.wechat-btn { background: #409eff; margin-bottom: 30rpx; }
.or { color: var(--c-sub); font-size: 24rpx; margin: 14rpx 0; }
.tip-row { display: flex; gap: 30rpx; margin-top: 40rpx; }
.tip { color: var(--c-sub); font-size: 24rpx; text-decoration: underline; }
/* 绑定弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.sh-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.sh-t { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.sh-close { font-size: 36rpx; color: var(--c-sub); padding: 0 8rpx; }
.sh-sub { font-size: 26rpx; color: var(--c-sub); margin: 8rpx 0 20rpx; line-height: 1.5; }
.ok { width: 100%; background: #07c160; color: #fff; border-radius: 50rpx; font-size: 32rpx; height: 96rpx; line-height: 96rpx; margin-top: 10rpx; }
.ok[disabled] { opacity: .6; }
.ok::after { border: none; }
/* 角色选择弹层 */
.role-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999; display: flex; align-items: center; justify-content: center; }
.role-modal { background: #fff; border-radius: 32rpx; padding: 48rpx; width: 600rpx; text-align: center; }
.role-title { font-size: 36rpx; font-weight: bold; margin-bottom: 16rpx; color: #333; }
.role-desc { font-size: 26rpx; color: #999; margin-bottom: 40rpx; }
.role-buttons { display: flex; flex-direction: column; gap: 24rpx; }
.role-btn { padding: 24rpx; border-radius: 20rpx; font-size: 30rpx; font-weight: 500; }
.role-btn.parent { border: 2rpx solid #E6A23C; color: #E6A23C; }
.role-btn.teacher { border: 2rpx solid #07c160; color: #07c160; }
</style>
