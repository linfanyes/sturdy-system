<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">评语生成</view>
    <view class="sub">AI 根据学生表现生成个性化评语</view>

    <!-- 班级选择 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">班级</text>
        <picker :range="classOpts" :value="classIdx" @change="onClassChange">
          <view class="form-pk">{{ classOpts[classIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">学生</text>
        <picker :range="studentOpts" :value="studentIdx" @change="studentIdx = +$event.detail.value">
          <view class="form-pk">{{ studentOpts[studentIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">评语类型</text>
        <picker :range="typeOptions" :value="typeIdx" @change="typeIdx = +$event.detail.value">
          <view class="form-pk">{{ typeOptions[typeIdx] }}</view>
        </picker>
      </view>
    </view>

    <button class="btn" :disabled="loading || classIdx < 0" @click="generate">
      {{ loading ? '生成中…' : '生成评语' }}
    </button>

    <!-- 结果展示 -->
    <view v-if="result" class="result">
      <view class="result-hd">评语内容</view>
      <scroll-view scroll-y class="result-body">
        <text class="result-text" selectable>{{ result }}</text>
      </scroll-view>
      <view class="result-actions">
        <button class="btn-copy" @click="copy">复制</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'
import { listClasses, listStudents } from '../../api/students'
import { chatSync } from '../../api/ai'

const classes = ref([])
const students = ref([])
const classIdx = ref(-1)
const studentIdx = ref(0)
const typeIdx = ref(0)
const loading = ref(false)
const result = ref('')

const typeOptions = ['期末评语', '期中评语', '日常评语', '鼓励性评语']

const classOpts = computed(() => classes.value.map((c) => c.name))
const studentOpts = computed(() => ['全部学生', ...students.value.map((s) => s.name)])

async function loadClasses() {
  try {
    classes.value = await listClasses({ silent: true })
    if (classes.value.length) {
      classIdx.value = 0
      await loadStudents()
    }
  } catch {
    classes.value = []
  }
}

async function loadStudents() {
  if (classIdx.value < 0) return
  const cls = classes.value[classIdx.value]
  if (!cls) return
  try {
    students.value = await listStudents(cls.id, { silent: true })
  } catch {
    students.value = []
  }
}

async function onClassChange(e) {
  classIdx.value = +e.detail.value
  studentIdx.value = 0
  result.value = ''
  await loadStudents()
}

async function generate() {
  if (classIdx.value < 0) {
    return uni.showToast({ title: '请先选择班级', icon: 'none' })
  }
  loading.value = true
  result.value = ''
  try {
    const cls = classes.value[classIdx.value]
    const stu = studentIdx.value > 0 ? students.value[studentIdx.value - 1] : null
    const stuPart = stu ? `学生${stu.name}（${stu.gender === '男' ? '男生' : stu.gender === '女' ? '女生' : ''}）` : '全班学生'
    const prompt = `请为${cls.name}的${stuPart}写一段${typeOptions[typeIdx.value]}。要求：语言亲切、有针对性，既肯定优点又提出改进建议，150字左右，直接输出评语正文。`
    const res = await chatSync([{ role: 'user', content: prompt }])
    result.value = res?.content || res?.data?.content || '（生成失败，请重试）'
  } catch (e) {
    result.value = '生成失败：' + (e?.message || '未知错误')
  } finally {
    loading.value = false
  }
}

function copy() {
  uni.setClipboardData({
    data: result.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

onMounted(loadClasses)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.form-row:last-child { margin-bottom: 0; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; }
.btn[disabled] { opacity: 0.6; }
.result { margin-top: 24rpx; background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.result-hd { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.result-body { max-height: 600rpx; }
.result-text { font-size: 26rpx; color: var(--c-text); line-height: 1.8; white-space: pre-wrap; }
.result-actions { margin-top: 16rpx; display: flex; justify-content: flex-end; }
.btn-copy { background: var(--c-input); border-radius: 10rpx; font-size: 24rpx; padding: 10rpx 24rpx; color: var(--c-text); }
</style>
