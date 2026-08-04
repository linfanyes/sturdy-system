<script setup lang="ts">
import { ref } from 'vue'
import { resetAll } from '@/api/admin'
import { Trash2 } from 'lucide-vue-next'

const resetting = ref(false)
const resetConfirmText = ref('')
const showResetDialog = ref(false)

function toast(msg: string) {
  // 使用简单的浏览器 toast，避免引入新依赖
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:9999;animation:toastIn .3s'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}

async function doResetAll() {
  if (resetConfirmText.value.trim() !== '确认清除') {
    toast('请输入「确认清除」以继续')
    return
  }
  resetting.value = true
  try {
    await resetAll(true)
    toast('已清除所有业务数据，演示数据已保留')
    showResetDialog.value = false
    resetConfirmText.value = ''
  } catch (e: any) {
    toast(e?.message || '操作失败')
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Trash2 class="w-6 h-6 text-red-500" /> 清除业务数据
    </h1>

    <div class="bg-red-50/60 rounded-2xl p-5 shadow-softer border border-red-100">
      <div class="text-sm font-semibold text-red-700 mb-2">⚠️ 危险操作区</div>
      <div class="text-xs text-red-500/80 mb-3">以下操作不可恢复，请谨慎操作。一键清除会清除所有业务数据（考试/成绩/作业/考勤/通知等），保留演示数据（学校/校管/教师/班级/学生）。</div>
      <button class="btn-danger" :disabled="resetting" @click="showResetDialog = true">
        <Trash2 class="w-4 h-4 inline-block mr-1" />
        {{ resetting ? '处理中…' : '一键清除（保留演示数据）' }}
      </button>
    </div>

    <!-- 一键清除确认弹窗 -->
    <div v-if="showResetDialog" class="modal-mask" @click.self="showResetDialog = false">
      <div class="modal">
        <div class="modal-h"><h3>确认一键清除</h3><span class="modal-close" @click="showResetDialog = false">×</span></div>
        <div class="modal-body">
          <div class="text-sm text-cocoa-700 mb-2">此操作将：</div>
          <ul class="text-sm text-cocoa-600 list-disc pl-5 space-y-1 mb-3">
            <li>清除所有考试、成绩、作业、考勤、课表</li>
            <li>清除所有通知、公告、班级活动、班级风采、值日</li>
            <li>清除所有 AI 生成内容、教学资源、教学日志</li>
            <li>清除所有学生奖惩、成长记录、家长联系记录</li>
            <li><b>保留</b>：学校、校管、教师、班级、学生等演示数据</li>
            <li><b>保留</b>：超管账号、平台配置</li>
          </ul>
          <div class="text-sm text-red-600 mb-2">此操作不可撤销，请谨慎操作。</div>
          <div class="form-group">
            <label class="block text-sm font-semibold text-cocoa-700 mb-1">请输入「确认清除」继续</label>
            <input v-model="resetConfirmText" class="w-full" placeholder="确认清除" />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-outline" @click="showResetDialog = false">取消</button>
          <button class="btn-danger" :disabled="resetting || resetConfirmText.trim() !== '确认清除'" @click="doResetAll()">
            {{ resetting ? '处理中…' : '确认清除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
