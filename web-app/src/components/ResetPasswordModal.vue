<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'

const props = defineProps<{
  modelValue: boolean
  targetName?: string
  defaultPassword?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [string]
}>()

const password = ref('')

// 每次打开弹框时，将输入框默认填入系统默认密码，便于一键重置或自定义
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
      为「{{ targetName || '该用户' }}」设置新密码（留空或保持默认即重置为 <b>{{ defaultPassword }}</b>）
    </p>
    <div>
      <label class="text-sm text-cocoa-500">新密码</label>
      <input
        v-model="password"
        type="text"
        class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        :placeholder="`默认 ${defaultPassword}`"
      />
      <p class="text-xs text-cocoa-400 mt-1">支持自定义；长度 6-20 位。留空则使用上方默认密码。</p>
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
