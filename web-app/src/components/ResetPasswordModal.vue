<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'

const props = defineProps<{
  modelValue: boolean
  targetName?: string
  defaultPassword?: string
  currentPassword?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [string]
}>()

const password = ref('')

  // 每次打开弹框时，预填默认密码（若已指定）；留空则由后端生成随机密码
watch(
  () => props.modelValue,
  (open) => {
    if (open) password.value = props.defaultPassword || ''
  },
)

function close() {
  emit('update:modelValue', false)
}

function submit() {
  emit('confirm', password.value)
}
</script>

<template>
  <Modal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" title="重置密码" width="max-w-md">
    <p class="text-sm text-cocoa-500 mb-4">
      为「{{ targetName || '该用户' }}」设置新密码（留空则由系统生成 8 位随机密码）
    </p>
    <div v-if="currentPassword" class="mb-4">
      <label class="text-sm text-cocoa-500">原密码</label>
      <input
        :value="currentPassword"
        type="text"
        readonly
        class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-700"
      />
    </div>
    <div>
      <label class="text-sm text-cocoa-500">新密码</label>
      <input
        v-model="password"
        type="text"
        class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        placeholder="请输入新密码（6-20 位，留空随机生成）"
      />
      <p class="text-xs text-cocoa-400 mt-1">自定义密码长度须为 6-20 位；留空则使用系统随机生成的密码。</p>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="close">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600"
        @click="submit"
      >
        确认重置
      </button>
    </template>
  </Modal>
</template>
