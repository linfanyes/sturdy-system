<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ALL_FEATURES } from '@/constants/features'
import { getSchoolAdminFeatures, updateSchoolAdminFeatures } from '@/api/feature'
import { Loader2, Save, ArrowLeft, Check, X } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const featureFlags = ref<string[] | null>(null)
const schoolId = ref('')
const saved = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getSchoolAdminFeatures()
    schoolId.value = res.schoolId
    featureFlags.value = res.featureFlags
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function isEnabled(key: string): boolean {
  // null = 全部开启
  if (!Array.isArray(featureFlags.value)) return true
  return featureFlags.value.includes(key)
}

function toggle(key: string) {
  if (!Array.isArray(featureFlags.value)) {
    // 当前是全开状态，切到只保留未勾选的
    featureFlags.value = ALL_FEATURES.filter((f) => f.key !== key).map((f) => f.key)
  } else {
    const idx = featureFlags.value.indexOf(key)
    if (idx >= 0) {
      featureFlags.value = featureFlags.value.filter((k) => k !== key)
      // 如果全部取消勾选 => null（全开）
      if (featureFlags.value.length === 0) featureFlags.value = null
    } else {
      featureFlags.value = [...featureFlags.value, key]
    }
  }
}

async function save() {
  saving.value = true
  saved.value = false
  try {
    await updateSchoolAdminFeatures(featureFlags.value)
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch {
    // ignore
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button class="p-2 rounded-xl hover:bg-cocoa-100 transition-colors" @click="router.push('/school-admin')">
          <ArrowLeft class="w-5 h-5 text-cocoa-600" />
        </button>
        <div>
          <h1 class="text-xl font-bold text-cocoa-900">功能包开关</h1>
          <p class="text-sm text-cocoa-500 mt-0.5">配置本校可用的功能子集，关闭后教师端对应功能将不可访问</p>
        </div>
      </div>
      <button
        class="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
        :disabled="saving"
        @click="save"
      >
        <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
        <Save v-else class="w-4 h-4" />
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>

    <!-- 状态提示 -->
    <div
      v-if="saved"
      class="flex items-center gap-2 px-4 py-3 rounded-xl bg-mint-50 text-mint-700 text-sm border border-mint-200"
    >
      <Check class="w-4 h-4" /> 配置已保存
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-butter-500" />
    </div>

    <!-- 功能包列表 -->
    <div v-else class="bg-white rounded-2xl border border-cocoa-200 divide-y divide-cocoa-100">
      <div class="px-5 py-3 flex items-center gap-2 bg-cocoa-50 rounded-t-2xl">
        <span class="text-sm font-medium text-cocoa-600">
          {{ featureFlags === null ? '全部开放' : `已选 ${featureFlags?.length || 0} / ${ALL_FEATURES.length}` }}
        </span>
        <span class="text-xs text-cocoa-400 ml-auto">
          null = 全部开启，空数组 = 全关
        </span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
        <label
          v-for="f in ALL_FEATURES"
          :key="f.key"
          class="flex items-center gap-3 px-5 py-3.5 hover:bg-cocoa-50 transition-colors cursor-pointer select-none border-b border-cocoa-50"
        >
          <div
            class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
            :class="isEnabled(f.key)
              ? 'bg-butter-500 border-butter-500 text-white'
              : 'border-cocoa-300'"
          >
            <Check v-if="isEnabled(f.key)" class="w-3.5 h-3.5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-cocoa-900 truncate">{{ f.label }}</div>
            <div class="text-xs text-cocoa-400 truncate">{{ f.key }}</div>
          </div>
        </label>
      </div>
    </div>

    <!-- 底部说明 -->
    <div class="text-xs text-cocoa-400 px-1 space-y-1">
      <p>• 当「全部开放」时，教师端所有功能包均可用，由教师本人 features 自行控制。</p>
      <p>• 关闭某功能包后，本校所有教师均无法访问该功能（后端 @Feature 守卫强制拦截）。</p>
      <p>• 超管可在「学校管理」中配置各校默认开关，校管在本页覆盖本校子集。</p>
    </div>
  </div>
</template>

<style scoped>
.btn-primary {
  @apply bg-butter-500 text-white font-medium transition-all;
}
.btn-primary:hover:not(:disabled) {
  @apply bg-butter-600;
}
.btn-primary:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>
