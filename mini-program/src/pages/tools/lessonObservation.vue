<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">听课记录</view>
    <view class="sub">记录课堂教学观察</view>

    <!-- 记录列表 -->
    <view v-if="list.length" class="list">
      <view v-for="rec in list" :key="rec.id" class="card">
        <view class="card-hd">
          <view>
            <text class="topic">{{ rec.topic }}</text>
            <view class="meta">
              <text>👤 {{ rec.teacherName }}</text>
              <text>📚 {{ rec.subject }}</text>
              <text>📅 {{ rec.date }}</text>
            </view>
          </view>
          <view class="card-actions">
            <text class="rating" :class="ratingClass(rec.overallRating)">{{ rec.overallRating }}</text>
            <text class="edit" @click="openEdit(rec)">编辑</text>
            <text class="del" @click="remove(rec)">删除</text>
          </view>
        </view>
        <view v-if="rec.strengths" class="strengths">
          <text class="label">亮点：</text>
          <text>{{ rec.strengths }}</text>
        </view>
        <view v-if="rec.suggestions" class="suggestions">
          <text class="label">建议：</text>
          <text>{{ rec.suggestions }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text>暂无听课记录</text>
      <text class="empty-tip">点击下方按钮添加记录</text>
    </view>

    <button class="btn" @click="openCreate">+ 新增听课记录</button>

    <!-- 编辑弹窗 -->
    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="modal" @click.stop>
        <view class="modal-hd">{{ editing ? '编辑' : '新增' }}听课记录</view>
        <scroll-view scroll-y class="modal-body">
          <view class="m-row">
            <text class="m-lb">授课教师 *</text>
            <input v-model="form.teacherName" class="m-ipt" placeholder="教师姓名" maxlength="20" />
          </view>
          <view class="m-row">
            <text class="m-lb">科目</text>
            <input v-model="form.subject" class="m-ipt" placeholder="语文/数学..." maxlength="20" />
          </view>
          <view class="m-row">
            <text class="m-lb">日期</text>
            <picker mode="date" :value="form.date" @change="form.date = $event.detail.value">
              <view class="m-pk">{{ form.date }}</view>
            </picker>
          </view>
          <view class="m-row">
            <text class="m-lb">听课主题 *</text>
            <input v-model="form.topic" class="m-ipt" placeholder="如：分数的基本性质" maxlength="30" />
          </view>
          <view class="m-row">
            <text class="m-lb">总体评价</text>
            <view class="ratings">
              <text
                v-for="r in ratings"
                :key="r"
                class="rating-tag"
                :class="{ active: form.overallRating === r }"
                @click="form.overallRating = r"
              >{{ r }}</text>
            </view>
          </view>
          <view class="m-row">
            <text class="m-lb">亮点</text>
            <textarea v-model="form.strengths" class="m-ta" placeholder="课堂教学亮点" maxlength="200" />
          </view>
          <view class="m-row">
            <text class="m-lb">改进建议</text>
            <textarea v-model="form.suggestions" class="m-ta" placeholder="改进建议" maxlength="200" />
          </view>
        </scroll-view>
        <view class="modal-ft">
          <button class="m-btn cancel" @click="showForm = false">取消</button>
          <button class="m-btn ok" @click="save">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { theme } from '../../common/store'

const STORAGE_KEY = 'mini_lesson_observations'

const list = ref([])
const showForm = ref(false)
const editing = ref(null)
const form = ref(defaultForm())
const ratings = ['优秀', '良好', '一般', '待改进']

function defaultForm() {
  return {
    id: '', teacherName: '', subject: '', topic: '',
    date: new Date().toISOString().slice(0, 10),
    strengths: '', suggestions: '', overallRating: '良好', createdAt: '',
  }
}

function load() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    list.value = raw ? JSON.parse(raw) : []
    list.value.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  } catch {
    list.value = []
  }
}

function persist() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(list.value))
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function openCreate() {
  form.value = defaultForm()
  editing.value = null
  showForm.value = true
}

function openEdit(rec) {
  form.value = { ...rec }
  editing.value = rec
  showForm.value = true
}

function save() {
  if (!form.value.teacherName.trim() || !form.value.topic.trim()) {
    return uni.showToast({ title: '请填写授课教师和主题', icon: 'none' })
  }
  if (editing.value) {
    const idx = list.value.findIndex((i) => i.id === editing.value.id)
    if (idx >= 0) list.value[idx] = { ...form.value, createdAt: editing.value.createdAt }
  } else {
    list.value.unshift({ ...form.value, id: uid(), createdAt: new Date().toISOString() })
  }
  persist()
  showForm.value = false
}

function remove(rec) {
  uni.showModal({
    title: '确认删除',
    content: `确定删除「${rec.topic}」这条记录？`,
    success: (res) => {
      if (res.confirm) {
        list.value = list.value.filter((i) => i.id !== rec.id)
        persist()
      }
    },
  })
}

function ratingClass(r) {
  const map = { '优秀': 'r-excellent', '良好': 'r-good', '一般': 'r-average', '待改进': 'r-poor' }
  return map[r] || ''
}

onMounted(load)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.list { margin-bottom: 24rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.card-hd { display: flex; justify-content: space-between; align-items: flex-start; }
.topic { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.meta { display: flex; flex-wrap: wrap; gap: 16rpx; font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; }
.card-actions { display: flex; align-items: center; gap: 12rpx; }
.rating { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 20rpx; }
.r-excellent { background: #e8f8f0; color: #07c160; }
.r-good { background: #e8f4ff; color: #1890ff; }
.r-average { background: #fff8e0; color: #faad14; }
.r-poor { background: #fff0f0; color: #ff4d4f; }
.edit { font-size: 24rpx; color: var(--c-primary); }
.del { font-size: 24rpx; color: #ff4d4f; }
.strengths, .suggestions { margin-top: 12rpx; font-size: 26rpx; color: var(--c-text); }
.label { font-weight: 600; }
.strengths .label { color: #07c160; }
.suggestions .label { color: #faad14; }
.empty { text-align: center; padding: 80rpx 0; color: var(--c-sub); font-size: 28rpx; }
.empty-tip { display: block; font-size: 24rpx; margin-top: 8rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 100; }
.modal { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 24rpx; max-height: 85vh; }
.modal-hd { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; }
.modal-body { max-height: 60vh; }
.m-row { margin-bottom: 16rpx; }
.m-lb { font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; display: block; }
.m-ipt { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.m-pk { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.m-ta { width: 100%; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; min-height: 120rpx; box-sizing: border-box; }
.ratings { display: flex; gap: 12rpx; flex-wrap: wrap; }
.rating-tag { font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 30rpx; background: var(--c-input); color: var(--c-text); }
.rating-tag.active { background: var(--c-primary); color: #fff; }
.modal-ft { display: flex; gap: 16rpx; justify-content: flex-end; margin-top: 20rpx; }
.m-btn { border-radius: 10rpx; font-size: 26rpx; padding: 12rpx 24rpx; }
.m-btn.cancel { background: var(--c-input); color: var(--c-text); }
.m-btn.ok { background: var(--c-primary); color: #fff; } </longcat_think>
