<template>
  <view>
    <view class="bar">
      <text class="sc">共 {{ teachers.length }} 位教师</text>
      <view class="bar-acts">
        <text class="act" @click="$emit('open-create')">＋ 新增</text>
        <text class="act" @click="showBatchImport = true">📋 批量</text>
        <text class="act export" @click="$emit('export-teachers')">📥 导出</text>
      </view>
    </view>
    <scroll-view scroll-y class="tm-list-scroll" lower-threshold="150" @scrolltolower="$emit('load-more')">
      <EmptyState v-if="!teachers.length" icon="👩‍🏫" text="暂无教师" hint="点击右上角「新增」创建第一位教师" />
      <view class="row" v-for="u in teachers" :key="u.id">
        <view class="info" @click="$emit('open-edit', u)">
          <view class="nm-line">
            <text class="nm">{{ u.name }}</text>
            <text class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? '启用' : '禁用' }}</text>
          </view>
          <view class="meta">用户名：{{ u.username || '微信登录' }}</view>
          <view class="meta" v-if="u.teacherNo">编号：{{ u.teacherNo }}</view>
          <view class="meta" v-if="u.phone">电话：{{ u.phone }}</view>
        </view>
        <view class="acts">
          <text class="act" @click.stop="$emit('go-teacher-detail', u)">详情</text>
          <text class="act" @click.stop="$emit('open-features', u)">功能配置</text>
          <text class="act" @click.stop="$emit('reset-pwd', u)">重置密码</text>
          <text class="act del" @click.stop="$emit('del-teacher', u)">删除</text>
        </view>
      </view>
      <view v-if="teachers.length < teacherTotal" class="load-more">下滑加载更多（共 {{ teacherTotal }} 位）</view>
    </scroll-view>

    <!-- 新增/编辑教师（全屏） -->
    <view v-if="showForm" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showForm = false">← 返回</text>
          <text class="full-title">{{ editingId ? '编辑教师' : '新增教师' }}</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="form-item">
            <text class="label">用户名 <text class="req">*</text></text>
            <input v-model="form.username" class="inp" placeholder="登录用，如：zhangsan" />
            <text class="tip">用户名不可重复，系统会自动校验</text>
          </view>
          <view class="form-item">
            <text class="label">姓名 <text class="req">*</text></text>
            <input v-model="form.name" class="inp" placeholder="如：张老师" />
          </view>
          <view class="form-item">
            <text class="label">学科</text>
            <picker class="picker" :range="ALL_SUBJECTS" @change="(e)=>form.subject=ALL_SUBJECTS[e.detail.value]">
              <view class="picker-inp">{{ form.subject || '请选择学科' }}</view>
            </picker>
          </view>
          <view v-if="!editingId" class="form-item">
            <text class="label">密码 <text class="req">*</text></text>
            <input v-model="form.password" class="inp" placeholder="登录密码" password />
          </view>
          <view v-else class="form-item">
            <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
            <input v-model="form.password" class="inp" placeholder="输入新密码可重置" password />
          </view>
          <view class="form-item">
            <text class="label">手机号</text>
            <input v-model="form.phone" class="inp" placeholder="可选" @blur="checkPhone" />
            <text v-if="phoneError" class="field-err">{{ phoneError }}</text>
          </view>
          <view class="form-item switch-item">
            <view class="label-line">
              <text class="label">启用标志</text>
              <text class="switch-val">{{ form.enabled ? '启用' : '禁用' }}</text>
            </view>
            <switch :checked="form.enabled" color="#4CAF50" @change="onEnabledChange" />
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving" @click="$emit('save-form', { ...form }, editingId)">{{ saving ? '保存中…' : (editingId ? '保存修改' : '确认创建') }}</button>
        </view>
      </view>
    </view>

    <!-- 密码重置弹窗 -->
    <view v-if="pwdUser" class="mask" @click="pwdUser=null">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">重置「{{ pwdUser.name }}」密码</view>
        <view class="inp-wrap"><input v-model="newPwd" class="inp" placeholder="新密码（6-20位，留空随机生成）" password /></view>
        <view class="sh-sub">自定义密码长度须为 6-20 位；留空则由系统随机生成。</view>
        <button class="btn" :disabled="saving" @click="$emit('do-reset-pwd', pwdUser, newPwd)">确认重置</button>
      </view>
    </view>

    <!-- 批量导入教师（全屏） -->
    <view v-if="showBatchImport" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showBatchImport = false">← 返回</text>
          <text class="full-title">批量导入教师</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="hint-block">
            每行一条：姓名,用户名,密码（英文逗号分隔）
            例如：张三,zhangsan,123456
          </view>
          <textarea v-model="batchText" class="inp batch-area" placeholder="张三,zhangsan,123456（每行一条）" />
          <view v-if="batchResult.length" class="batch-result">
            <view class="batch-summary">共 {{ batchResult.length }} 条，成功 {{ batchResult.filter(r => r.status==='成功').length }}/{{ batchResult.length }}</view>
            <view class="batch-item" :class="r.status==='成功'?'ok':'fail'" v-for="r in batchResult" :key="r.username">
              <text>{{ r.name }}({{ r.username }})：{{ r.status }}</text>
              <text v-if="r.error" class="batch-err">{{ r.error }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving || !batchText.trim()" @click="$emit('do-batch-import', batchText)">{{ saving ? '导入中…' : '确认导入' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { isPhone } from '../../../common/validators'
import { ALL_SUBJECTS } from '../../../common/subject-schema'
import EmptyState from '../../../components/EmptyState/EmptyState.vue'

const props = defineProps({
  teachers: { type: Array, default: () => [] },
  teacherTotal: { type: Number, default: 0 },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits([
  'open-create', 'open-edit', 'go-teacher-detail', 'open-features', 'reset-pwd', 'del-teacher',
  'save-form', 'do-reset-pwd', 'do-batch-import', 'export-teachers', 'load-more',
  'teachers-updated',
])

const showForm = ref(false)
const editingId = ref('')
const form = ref({ username: '', password: '', name: '', subject: '', phone: '', enabled: true })
const phoneError = ref('')
const pwdUser = ref(null)
const newPwd = ref('')
const showBatchImport = ref(false)
const batchText = ref('')
const batchResult = ref([])

function checkPhone() {
  if (form.value.phone && !isPhone(form.value.phone)) {
    phoneError.value = '手机号格式错误，应为 11 位手机号'
  } else {
    phoneError.value = ''
  }
}

function onEnabledChange(e) {
  form.value.enabled = e.detail.value
}

// Expose methods to parent
function openCreateForm() {
  editingId.value = ''
  phoneError.value = ''
  form.value = { username: '', password: '', name: '', subject: '', phone: '', enabled: true }
  showForm.value = true
}

function openEditForm(u) {
  editingId.value = u.id
  phoneError.value = ''
  form.value = {
    username: u.username || '',
    password: '',
    name: u.name || '',
    subject: u.subject || '',
    phone: u.phone || '',
    enabled: u.enabled !== false,
  }
  showForm.value = true
}

function resetPwd(u) {
  pwdUser.value = u
  newPwd.value = ''
}

function setBatchResult(r) {
  batchResult.value = r
}

defineExpose({
  openCreateForm,
  openEditForm,
  resetPwd,
  setBatchResult,
  showBatchImportRef: showBatchImport,
})
</script>

<style scoped>
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; flex-wrap: wrap; gap: 10rpx; }
.bar-acts { display: flex; gap: 12rpx; align-items: center; }
.export { font-size: 22rpx; color: var(--c-primary); font-weight: 600; padding: 8rpx 18rpx; background: rgba(245,179,66,.1); border-radius: 28rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.tm-list-scroll { min-height: 300rpx; max-height: 60vh; overflow: hidden; }
.load-more { text-align: center; padding: 24rpx 0; font-size: 24rpx; color: var(--c-primary); font-weight: 600; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge.on { background: rgba(245,179,66,.12); color: var(--c-primary); }
.badge.off { background: rgba(245,108,108,.12); color: var(--c-danger); }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; line-height: 1.5; }
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 36rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); max-height: 82vh; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; margin-bottom: 6rpx; font-size: 28rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.sh-sub { font-size: 24rpx; color: var(--c-sub); margin: 8rpx 2rpx 18rpx; line-height: 1.6; }
.btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 88rpx; line-height: 88rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.btn[disabled] { opacity: .6; }
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.form-item { margin-bottom: 26rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.tip { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
.switch-item { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; background: var(--c-card2); border-radius: 16rpx; padding: 16rpx 20rpx; }
.label-line { flex: 1; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
.picker { width: 100%; box-sizing: border-box; }
.picker-inp { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2); padding: 18rpx 22rpx; border-radius: 16rpx; margin-bottom: 20rpx; line-height: 1.7; border-left: 6rpx solid var(--c-accent); }
.batch-area { min-height: 220rpx; margin-top: 14rpx; }
.batch-result { margin-top: 16rpx; }
.batch-summary { font-size: 24rpx; font-weight: 600; color: var(--c-title); margin-bottom: 8rpx; }
.batch-item { font-size: 22rpx; padding: 8rpx 0; }
.batch-item.ok { color: #07c160; }
.batch-item.fail { color: #e64340; }
.batch-err { display: block; font-size: 20rpx; color: var(--c-sub); margin-left: 16rpx; }
</style>
