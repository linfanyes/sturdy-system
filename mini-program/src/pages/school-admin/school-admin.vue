<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">🏫 学校管理</view>
      <view class="out" @click="logout">退出</view>
    </view>

    <view class="tabs">
      <view class="tab" :class="tab==='teachers'&&'on'" @click="tab='teachers'">👥 教师管理</view>
      <view class="tab" :class="tab==='parents'&&'on'" @click="tab='parents'">👨‍👩‍👧 家长登录</view>
    </view>

    <!-- 教师管理 -->
    <template v-if="tab==='teachers'">
      <view class="bar"><text class="sc">共 {{ teachers.length }} 位教师</text><text class="act" @click="showForm=!showForm">{{ showForm?'取消':'＋ 新增教师' }}</text></view>
      <view v-if="showForm" class="card">
        <input v-model="form.username" class="inp" placeholder="用户名（必填）" />
        <input v-model="form.password" class="inp" placeholder="密码（必填）" password />
        <input v-model="form.name" class="inp" placeholder="姓名（必填）" />
        <input v-model="form.subject" class="inp" placeholder="任教学科" />
        <input v-model="form.phone" class="inp" placeholder="手机号" />
        <button class="btn" :disabled="saving" @click="createTeacher">{{ saving?'创建中…':'创建教师' }}</button>
      </view>
      <view class="list">
        <view class="row" v-for="u in teachers" :key="u.id">
          <view class="info"><view class="nm">{{ u.name }}</view><view class="meta">{{ u.username }} · {{ u.subject }} · {{ u.school }}</view></view>
          <view class="acts">
            <text class="act" @click="openFeatures(u)">功能</text>
            <text class="act" @click="resetPwd(u)">重置密码</text>
            <text class="act del" @click="delTeacher(u)">删除</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 家长登录 -->
    <template v-if="tab==='parents'">
      <view class="sc">已授权家长登录的学生</view>
      <view class="list">
        <view class="row" v-for="s in parentLogins" :key="s.studentId">
          <view class="info"><view class="nm">{{ s.name }}（{{ s.parentName }}）</view><view class="meta">学号 {{ s.studentNo }} · 电话 {{ s.parentPhone }}</view></view>
          <view class="acts"><text class="act on">已授权</text></view>
        </view>
      </view>
    </template>

    <!-- 功能配置弹窗 -->
    <view v-if="featUser" class="mask" @click="featUser=null">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ featUser.name }} 功能配置</view>
        <scroll-view scroll-y class="flist">
          <label class="frow" v-for="f in allFeatures" :key="f.key" @click="sel.includes(f.key)?sel.splice(sel.indexOf(f.key),1):sel.push(f.key)">
            <text class="ck" :class="sel.includes(f.key)&&'on'"></text><text>{{ f.label }}</text>
          </label>
        </scroll-view>
        <button class="btn" :disabled="saving" @click="saveFeatures">{{ saving?'保存中…':'保存' }}</button>
      </view>
    </view>

    <!-- 密码重置弹窗 -->
    <view v-if="pwdUser" class="mask" @click="pwdUser=null">
      <view class="sheet" @click.stop>
        <view class="sh-t">重置「{{ pwdUser.name }}」密码</view>
        <input v-model="newPwd" class="inp" placeholder="新密码" password />
        <button class="btn" :disabled="saving" @click="doResetPwd">确认重置</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'

const dark = computed(() => theme.mode === 'dark')
const tab = ref('teachers')
const teachers = ref([])
const parentLogins = ref([])
const saving = ref(false)
const showForm = ref(false)
const form = ref({ username:'', password:'', name:'', subject:'', phone:'' })

const featUser = ref(null), sel = ref([])
const pwdUser = ref(null), newPwd = ref('')
const allFeatures = [
  { key:'classes',label:'班级管理' },{ key:'students',label:'学生管理' },{ key:'exams',label:'考试管理' },
  { key:'grades',label:'成绩管理' },{ key:'attendance',label:'考勤' },{ key:'schedule',label:'课表' },
  { key:'homework',label:'作业' },{ key:'notices',label:'公告' },{ key:'ai',label:'AI助手/备课' },
  { key:'tools',label:'课堂工具' },{ key:'finance',label:'班费' },{ key:'activities',label:'班级活动' },
  { key:'rewards',label:'奖励/积分' },{ key:'parents',label:'家长联系' },{ key:'teachers',label:'教师通讯录' },
]

function getToken() { return uni.getStorageSync('sa_token') }

async function apiCall(method, path, data) {
  const token = getToken()
  if (!token) { uni.reLaunch({ url:'/pages/login/login' }); return }
  return new Promise((resolve, reject) => {
    const cloud = typeof wx!=='undefined' && wx.cloud
    if (!cloud) return reject(new Error('环境异常'))
    cloud.callContainer({
      config: { env:'prod-d6g1zoq8c7be4ce53' },
      path: '/api' + path, method, data,
      header: { Authorization:'Bearer '+token, 'content-type':'application/json' },
      success: r => resolve(r.data),
      fail: reject,
    })
  })
}

async function loadTeachers() { try { teachers.value = await apiCall('GET','/school-admin/teachers')||[] } catch{} }
async function loadParents() { try { parentLogins.value = await apiCall('GET','/school-admin/parent-logins')||[] } catch{} }

async function createTeacher() {
  const f = form.value
  if (!f.username || !f.password || !f.name) return uni.showToast({ title:'请填用户名/密码/姓名', icon:'none' })
  saving.value = true
  try { await apiCall('POST','/school-admin/teachers',f); showForm.value=false; form.value={username:'',password:'',name:'',subject:'',phone:''}; await loadTeachers(); uni.showToast({ title:'已创建', icon:'success' }) }
  catch(e) { uni.showToast({ title:e?.message||'创建失败', icon:'none' }) }
  saving.value = false
}

async function delTeacher(u) {
  uni.showModal({ title:'删除教师', content:'确定删除「'+u.name+'」？', confirmColor:'#e64340',
    success:async m=>{ if(!m.confirm)return; try{await apiCall('DELETE','/school-admin/teachers/'+u.id); await loadTeachers()}catch{} }
  })
}

function openFeatures(u) { featUser.value=u; sel.value=u.features?.length?[...u.features]:[...allFeatures.map(f=>f.key)] }
async function saveFeatures() {
  saving.value=true
  try { await apiCall('PATCH','/school-admin/teachers/'+featUser.value.id+'/features',{features:sel.value}); featUser.value=null; await loadTeachers(); uni.showToast({ title:'已保存', icon:'success' }) }
  catch(e) { uni.showToast({ title:'保存失败', icon:'none' }) }
  saving.value=false
}

function resetPwd(u) { pwdUser.value=u; newPwd.value='' }
async function doResetPwd() {
  if (!newPwd.value) return uni.showToast({ title:'请输入新密码', icon:'none' })
  saving.value=true
  try { await apiCall('POST','/school-admin/teachers/'+pwdUser.value.id+'/reset-password',{password:newPwd.value}); pwdUser.value=null; uni.showToast({ title:'已重置', icon:'success' }) }
  catch(e) { uni.showToast({ title:'重置失败', icon:'none' }) }
  saving.value=false
}

function logout() {
  uni.removeStorageSync('sa_token'); uni.removeStorageSync('sa_user')
  uni.reLaunch({ url:'/pages/login/login' })
}

onShow(() => { loadTeachers(); loadParents() })
</script>

<style scoped>
.page { padding:24rpx; background:var(--c-bg); min-height:100vh; }
.hd { display:flex; justify-content:space-between; align-items:center; margin-bottom:16rpx; }
.t { font-size:34rpx; font-weight:800; color:var(--c-title); }
.out { font-size:26rpx; color:var(--c-accent); }
.tabs { display:flex; gap:12rpx; margin-bottom:18rpx; }
.tab { font-size:26rpx; padding:14rpx 26rpx; border-radius:30rpx; background:var(--c-card2); color:var(--c-sub); }
.tab.on { background:var(--c-accent); color:#fff; font-weight:700; }
.bar { display:flex; justify-content:space-between; margin-bottom:14rpx; }
.sc { font-size:26rpx; color:var(--c-sub); }
.act { font-size:24rpx; color:#409eff; }
.act.del { color:#e64340; }
.act.on { color:#07c160; }
.card { background:var(--c-card); border-radius:16rpx; padding:20rpx; margin-bottom:14rpx; }
.inp { border:1px solid var(--c-input-border); border-radius:12rpx; padding:14rpx 16rpx; margin-bottom:12rpx; font-size:26rpx; background:var(--c-input); color:var(--c-text); }
.btn { background:var(--c-primary); color:#fff; border-radius:50rpx; font-size:28rpx; height:76rpx; line-height:76rpx; margin-top:6rpx; }
.btn[disabled] { opacity:.6; }
.list { background:var(--c-card); border-radius:16rpx; padding:6rpx 20rpx; }
.row { display:flex; align-items:center; justify-content:space-between; padding:16rpx 0; border-bottom:1px solid var(--c-border); }
.info { flex:1; }
.nm { font-size:28rpx; font-weight:700; color:var(--c-title); }
.meta { font-size:22rpx; color:var(--c-sub); }
.acts { display:flex; gap:16rpx; }
.mask { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:flex-end; z-index:100; }
.sheet { width:100%; background:var(--c-card); border-radius:24rpx 24rpx 0 0; padding:30rpx; max-height:80vh; box-sizing:border-box; }
.sh-t { font-size:30rpx; font-weight:700; color:var(--c-title); margin-bottom:14rpx; }
.flist { max-height:500rpx; }
.frow { display:flex; align-items:center; gap:12rpx; padding:14rpx 0; border-bottom:1px solid var(--c-border); font-size:28rpx; color:var(--c-title); }
.ck { width:26rpx; height:26rpx; border-radius:50%; border:3rpx solid var(--c-sub); flex-shrink:0; }
.ck.on { background:var(--c-primary); border-color:var(--c-primary); }
</style>
