<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">超管工作台</h1>
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">当前账号</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">{{ auth.user?.name }}</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">角色</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">超级管理员</div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm text-cocoa-500">功能待扩展</div>
        <div class="text-lg font-semibold text-cocoa-900 mt-1">学校管理 / 审计日志</div>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <p class="text-cocoa-500 text-sm">
        超管可管理所有学校、学校管理员账号，查看审计日志。后续功能模块将逐步扩展。
      </p>
    </div>
  </div>
</template>
