<template>
  <view>
    <view class="stats">
      <text class="sc">共 {{ schools.length }} 所学校</text>
      <text class="act" @click="emit('open-create-school')">＋ 新增学校</text>
    </view>
    <view class="list">
      <view v-if="!schools.length" class="empty">暂无学校，点击右上角「新增学校」</view>
      <view class="row" v-for="s in schools" :key="s.id">
        <view class="info" @click="emit('open-edit-school', s)">
          <view class="nm-line">
            <text class="nm">{{ s.name }}</text>
            <text class="badge" :class="s.status === 'active' ? 'on' : 'off'">{{ s.status === 'active' ? '启用' : '停用' }}</text>
          </view>
          <text class="meta">编号：{{ s.code }}</text>
          <view class="meta-line" v-if="s.address">
            <text class="meta">地址：{{ s.address }}</text>
          </view>
        </view>
        <view class="acts">
          <text class="act" @click.stop="emit('open-school-features', s)">功能包</text>
          <text class="act" :class="s.status === 'active' ? 'stop' : 'start'" @click.stop="emit('toggle-school-status', s)">{{ s.status === 'active' ? '停用' : '启用' }}</text>
          <text class="act del" @click.stop="emit('del-school', s)">删除</text>
        </view>
      </view>
    </view>
    <!-- 一键重置 -->
    <view class="reset-section">
      <view class="reset-row" @click="emit('confirm-reset-all')">
        <text class="reset-icon">⚠️</text>
        <view class="reset-text">
          <text class="reset-name">一键重置</text>
          <text class="reset-sub">清除所有业务数据及本机登录缓存，保留基础演示数据和超管登录</text>
        </view>
      </view>
    </view>

    <!-- 新增/编辑学校（全屏） -->
    <view v-if="showForm" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showForm = false">← 返回</text>
          <text class="full-title">{{ editingId ? '维护学校' : '新增学校' }}</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view v-if="!editingId" class="hint-block">
            学校编号 = 您输入的「编号前缀」+ 中横线(-) + 6 位随机字符，由系统自动生成并保证唯一（不填前缀则只有 6 位随机字符）。
          </view>
          <view class="form-item">
            <text class="label">学校名称 <text class="req">*</text></text>
            <input v-model="form.name" class="inp" placeholder="如：阳光小学" />
          </view>
          <view v-if="!editingId" class="form-item">
            <text class="label">编号前缀 <text class="opt">（最多 6 位字母/数字，留空则无前缀）</text></text>
            <input v-model="form.prefix" class="inp" placeholder="如：YG" maxlength="6" />
          </view>
          <view v-else class="form-item">
            <text class="label">学校编号</text>
            <view class="code-display">{{ form.code }}</view>
          </view>
          <view class="form-item">
            <text class="label">地址</text>
            <input v-model="form.address" class="inp" placeholder="学校地址（选填）" />
          </view>
          <view class="form-item">
            <text class="label">联系人</text>
            <input v-model="form.contact" class="inp" placeholder="联系人（选填）" />
          </view>
          <view class="form-item">
            <text class="label">联系电话</text>
            <input v-model="form.phone" class="inp" placeholder="联系电话（选填）" @blur="checkPhone" />
            <text v-if="phoneError" class="field-err">{{ phoneError }}</text>
          </view>
          <view class="form-item switch-item">
            <view class="label-line">
              <text class="label">启用状态</text>
              <text class="switch-val">{{ form.enabled ? '启用' : '停用' }}</text>
            </view>
            <switch :checked="form.enabled" color="#4CAF50" @change="onEnabledChange" />
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="save-btn" :disabled="saving" @click="onSave">{{ saving ? '保存中…' : (editingId ? '保存修改' : '确认创建') }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { isPhone } from '../../../common/validators'

const props = defineProps({
  schools: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits([
  'open-create-school', 'open-edit-school', 'del-school', 'toggle-school-status',
  'open-school-features', 'confirm-reset-all', 'save-school',
])

const showForm = ref(false)
const editingId = ref('')
const form = reactive({ name: '', prefix: '', address: '', contact: '', phone: '', enabled: true, code: '' })
const phoneError = ref('')

function onEnabledChange(e) { form.enabled = e.detail.value }
function checkPhone() {
  if (form.phone && !isPhone(form.phone)) phoneError.value = '手机号格式错误，应为 11 位手机号'
  else phoneError.value = ''
}

function openCreate() {
  editingId.value = ''
  phoneError.value = ''
  Object.assign(form, { name: '', prefix: '', address: '', contact: '', phone: '', enabled: true, code: '' })
  showForm.value = true
}

function openEdit(s) {
  editingId.value = s.id
  phoneError.value = ''
  Object.assign(form, {
    name: s.name || '', prefix: '', address: s.address || '',
    contact: s.contact || '', phone: s.phone || '',
    enabled: s.status === 'active', code: s.code || '',
  })
  showForm.value = true
}

function onSave() {
  if (!form.name) return uni.showToast({ title: '学校名称必填', icon: 'none' })
  if (form.phone && !isPhone(form.phone)) {
    phoneError.value = '手机号格式错误，请修正后再提交'
    return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  }
  phoneError.value = ''
  emit('save-school', { ...form }, editingId.value)
  showForm.value = false
}

defineExpose({ openCreate, openEdit })
</script>

<style scoped>
.stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.act.stop { color: #d48806; background: rgba(230,162,60,.12); }
.act.start { color: var(--c-primary); background: rgba(245,179,66,.1); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.empty { padding: 80rpx 30rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); background: var(--c-card); border-radius: 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.nm { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge.on { background: rgba(245,179,66,.12); color: var(--c-primary); }
.badge.off { background: rgba(245,108,108,.12); color: var(--c-danger); }
.meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; line-height: 1.5; }
.meta-line { display: flex; gap: 16rpx; align-items: center; margin-top: 4rpx; }
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.reset-section { margin-top: 32rpx; background: linear-gradient(135deg, #ff6b6b, #e64340); border-radius: 20rpx; padding: 6rpx 24rpx; box-shadow: 0 6rpx 22rpx rgba(230,67,64,.22); }
.reset-row { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 0; }
.reset-icon { font-size: 36rpx; flex-shrink: 0; }
.reset-text { flex: 1; display: flex; flex-direction: column; }
.reset-name { font-size: 28rpx; font-weight: 700; color: #fff; }
.reset-sub { font-size: 22rpx; color: rgba(255,255,255,.85); margin-top: 4rpx; }
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
.label-line { flex: 1; }
.switch-item { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; background: var(--c-card2); border-radius: 16rpx; padding: 16rpx 20rpx; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2, #f5f5f5); padding: 14rpx 18rpx; border-radius: 12rpx; margin-bottom: 20rpx; line-height: 1.6; border-left: 4rpx solid var(--c-accent, #4CAF50); width: auto; }
.inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
.save-btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
.code-display { font-size: 28rpx; padding: 20rpx 22rpx; background: var(--c-card2); border-radius: 14rpx; color: var(--c-title); font-weight: 600; border: 1px dashed var(--c-border); }
.save-btn[disabled] { opacity: .6; }
</style>
