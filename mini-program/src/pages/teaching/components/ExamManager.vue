<template>
  <view>
    <!-- 选择器区域 -->
    <view class="sel">
      <view class="field">
        <text class="label">班级 <text v-if="isHomeroom" class="role-tag homeroom">班主任</text><text v-if="sharedClass" class="role-tag shared">共享</text></text>
        <picker :range="classOpts" :value="classIdx" @change="$emit('class-change', $event)">
          <view class="picker">{{ classOpts[classIdx] || '请选择班级' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">考试</text>
        <picker :range="examOpts" :value="examIdx" @change="$emit('exam-change', $event)">
          <view class="picker">{{ examOpts[examIdx] || '请选择考试' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">科目</text>
        <picker :range="subjectOpts" :value="subjectIdx" @change="$emit('subject-change', $event)">
          <view class="picker">{{ subjectOpts[subjectIdx] || '请选择科目' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">日期</text>
        <input :value="dateVal" placeholder="如 2026-05-12" @input="$emit('date-input', $event)" />
      </view>
      <view class="field" v-if="semesterList.length">
        <text class="label">学期</text>
        <picker :range="semesterList" range-key="name" :value="semesterIdx" @change="$emit('semester-change', $event)">
          <view class="picker">{{ semesterList[semesterIdx]?.name || '全部' }}</view>
        </picker>
      </view>
    </view>

    <!-- 操作按钮行（已有成绩时显示） -->
    <view v-if="existing" class="exp-row">
      <text class="exp-csv" @click="$emit('export-csv')">📋 导出 CSV</text>
      <text class="exp-rank" @click="$emit('export-rank')">🏆 导出名次表</text>
      <text class="exp-share" @click="shareAll">📤 分享全部</text>
      <text class="exp-csv" @click="aiAnalyze">🤖 AI 分析</text>
      <text class="exp-rank" @click="aiDiagnose">🔍 学生诊断</text>
    </view>

    <!-- 模式切换 -->
    <view class="mode-tabs">
      <view :class="['mtab', mode === 'single' ? 'on' : '']" @click="$emit('set-mode', 'single')">单科录入</view>
      <view :class="['mtab', mode === 'all' ? 'on' : '']" @click="$emit('set-mode', 'all')">全部科目录入</view>
    </view>
  </view>
</template>

<script setup>
import { analyzeExam, diagnoseStudent } from '@/api/grades'

const props = defineProps({
  classOpts: { type: Array, default: () => [] },
  classIdx: { type: Number, default: -1 },
  examOpts: { type: Array, default: () => [] },
  examIdx: { type: Number, default: -1 },
  subjectOpts: { type: Array, default: () => [] },
  subjectIdx: { type: Number, default: -1 },
  dateVal: { type: String, default: '' },
  semesterList: { type: Array, default: () => [] },
  semesterIdx: { type: Number, default: 0 },
  isHomeroom: { type: Boolean, default: false },
  sharedClass: { type: Boolean, default: false },
  existing: { type: Object, default: null },
  mode: { type: String, default: 'single' },
})

const emit = defineEmits([
  'class-change', 'exam-change', 'subject-change', 'date-input', 'semester-change',
  'export-csv', 'export-rank', 'share-all', 'set-mode',
  'ai-analyze', 'ai-diagnose',
])

function shareAll() { emit('share-all') }

async function aiAnalyze() { emit('ai-analyze') }
async function aiDiagnose() { emit('ai-diagnose') }
</script>

<style scoped>
.sel { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.role-tag { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; }
.homeroom { background: rgba(245,179,66, 0.15); color: #07c160; }
.shared { background: rgba(230, 162, 60, 0.15); color: #e6a23c; }
.picker, .sel input { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; background: var(--c-input); width: 100%; }
.exp-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.exp-csv, .exp-rank, .exp-share { flex: 1; text-align: center; font-size: 26rpx; padding: 16rpx 0; border-radius: 14rpx; background: var(--c-card2); color: var(--c-accent); border: 1px solid var(--c-border); }
.exp-csv:active, .exp-rank:active, .exp-share:active { opacity: 0.6; }
.exp-share { color: var(--c-blue); }
.mode-tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.mtab { flex: 1; text-align: center; font-size: 28rpx; padding: 18rpx 0; border-radius: 14rpx; background: var(--c-card2); color: var(--c-sub); border: 1px solid var(--c-border); }
.mtab.on { background: var(--c-primary); color: #fff; border-color: var(--c-primary); }
</style>
