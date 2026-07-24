<script setup lang="ts">
/**
 * 家校沟通 IM：基于腾讯云 IM（体验版）。
 * 后端 /im 提供 UserSig 签名、家长花名册、班级群号管理。
 * Web 端展示家长花名册与群号配置；实时聊天需接入腾讯 IM Web SDK。
 */
import { ref, onMounted } from 'vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import request from '@/api/request'
import { MessageCircle, Phone, Users, Copy, Check } from 'lucide-vue-next'

const { classes } = useClasses()
const classId = ref('')
const parents = ref<any[]>([])
const loading = ref(false)
const userSig = ref<{ sdkAppId: string; userSig: string } | null>(null)
const classGroup = ref('')
const savingGroup = ref(false)
const copiedId = ref('')

async function loadParents() {
  if (!classId.value) { parents.value = []; return }
  loading.value = true
  try {
    const res = await request.get('/im/parents', { params: { classId: classId.value } })
    parents.value = Array.isArray(res) ? res : []
  } catch (e: any) {
    alert(e?.message || '加载家长列表失败')
    parents.value = []
  } finally {
    loading.value = false
  }
}

async function loadUserSig() {
  try {
    const res = await request.post('/im/user-sig', {})
    userSig.value = res
  } catch {
    userSig.value = null
  }
}

async function saveGroup() {
  if (!classId.value) return
  savingGroup.value = true
  try {
    await request.post('/im/class-group', { classId: classId.value, groupId: classGroup.value })
    alert('群号已保存')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    savingGroup.value = false
  }
}

function copy(text: string, id: string) {
  navigator.clipboard.writeText(text)
  copiedId.value = id
  setTimeout(() => { copiedId.value = '' }, 1500)
}

onMounted(async () => {
  await loadClasses()
  await loadUserSig()
  if (classes.value[0]) {
    classId.value = classes.value[0].id
    await loadParents()
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">家校沟通</h1>
      <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400" @change="loadParents">
        <option value="">请选择班级</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <!-- IM 配置状态 -->
    <div class="bg-white rounded-2xl p-5 shadow-softer">
      <div class="flex items-center gap-2 mb-3">
        <MessageCircle class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">IM 配置</h2>
      </div>
      <div v-if="!userSig?.userSig" class="text-sm text-cocoa-400 bg-cream-50 rounded-xl p-3">
        未配置腾讯云 IM（SDKAppID/密钥），当前为演示模式。实时聊天功能请在小程序端使用，或联系管理员在系统配置中填写 IM 密钥。
      </div>
      <template v-else>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="border border-cream-200 rounded-xl p-3">
            <div class="text-cocoa-400 text-xs">SDKAppID</div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-cocoa-900 font-mono">{{ userSig.sdkAppId }}</span>
              <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="copy(userSig.sdkAppId, 'appid')">
                <component :is="copiedId === 'appid' ? Check : Copy" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div class="border border-cream-200 rounded-xl p-3">
            <div class="text-cocoa-400 text-xs">UserSig（已生成）</div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-cocoa-900 text-xs truncate max-w-[12rem]">••••••••</span>
              <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="copy(userSig.userSig, 'sig')">
                <component :is="copiedId === 'sig' ? Check : Copy" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <!-- 班级群号 -->
        <div class="mt-3 flex items-center gap-2">
          <Users class="w-4 h-4 text-cocoa-400" />
          <span class="text-sm text-cocoa-500">班级群号</span>
          <input v-model="classGroup" placeholder="腾讯 IM 群 ID" class="flex-1 px-3 py-1.5 rounded-lg border border-cream-200 text-sm focus:outline-none focus:border-butter-400" />
          <button class="px-3 py-1.5 rounded-lg bg-butter-500 text-white text-sm hover:bg-butter-600 disabled:opacity-60" :disabled="savingGroup" @click="saveGroup">保存</button>
        </div>
      </template>
    </div>

    <!-- 家长花名册 -->
    <div class="bg-white rounded-2xl p-5 shadow-softer">
      <div class="flex items-center gap-2 mb-3">
        <Phone class="w-5 h-5 text-mint-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">家长花名册</h2>
        <span class="text-sm text-cocoa-400 ml-auto">{{ parents.length }} 位家长</span>
      </div>
      <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>
      <div v-else-if="!classId" class="text-cocoa-400 text-sm py-4 text-center">请先选择班级</div>
      <div v-else-if="!parents.length" class="text-cocoa-400 text-sm py-4 text-center">暂无家长信息</div>
      <div v-else class="grid grid-cols-2 gap-3">
        <div v-for="p in parents" :key="p.studentId || p.id" class="border border-cream-200 rounded-xl p-3">
          <div class="flex items-center justify-between">
            <div class="font-medium text-cocoa-900 text-sm">{{ p.studentName }}</div>
            <span class="text-xs text-cocoa-400">{{ p.parentName }}（{{ p.relation || '家长' }}）</span>
          </div>
          <div class="flex items-center gap-2 mt-2 text-xs text-cocoa-500">
            <span v-if="p.phone" class="flex items-center gap-1">
              <Phone class="w-3 h-3" /> {{ p.phone }}
              <button class="p-0.5 hover:text-butter-500" @click="copy(p.phone, 'p-' + p.studentId)">
                <component :is="copiedId === 'p-' + p.studentId ? Check : Copy" class="w-3 h-3" />
              </button>
            </span>
            <span v-if="p.loginEnabled" class="px-1.5 py-0.5 rounded bg-mint-100 text-mint-600">已开通登录</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
