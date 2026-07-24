<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">家长查看</h1>
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">家长</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">{{ auth.user?.name }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">孩子姓名</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">{{ auth.user?.studentName || '-' }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">所属班级</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">{{ auth.user?.classId || '-' }}</div>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <p class="text-cocoa-500 text-sm">
        家长端可查看孩子的成绩、作业、公告、考勤、成长档案（只读）。后续功能模块将逐步扩展。
      </p>
    </div>
  </div>
</template>
