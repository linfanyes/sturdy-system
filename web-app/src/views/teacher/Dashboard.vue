<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">教师工作台</h1>
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">当前教师</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">{{ auth.user?.name }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">所属学校</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">{{ auth.user?.schoolName || auth.user?.schoolId || '-' }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">功能权限</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">
          {{ (auth.user?.features?.length ?? 0) === 0 ? '全部可用' : `${auth.user?.features?.length} 项` }}
        </div>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <p class="text-cocoa-500 text-sm">
        教师端将提供班级管理、学生管理、成绩、考勤、作业、公告、AI 备课、课堂工具等全部功能（与小程序教师端对齐）。后续功能模块将逐步扩展。
      </p>
    </div>
  </div>
</template>
