<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useClassOpsStore } from '../stores/classOps'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Camera } from 'lucide-vue-next'
import type { ClassActivity } from '../types'
import { formatDate } from '../utils'

const classStore = useClassStore()
const opsStore = useClassOpsStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const activities = computed(() =>
  opsStore.activities.filter(a => a.classId === classId.value).sort((a, b) => b.createdAt - a.createdAt)
)

const modalOpen = ref(false)
const editing = ref<ClassActivity | null>(null)
const draft = ref({
  title: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  photos: [] as string[],
})

function openCreate() {
  editing.value = null
  draft.value = { title: '', date: new Date().toISOString().slice(0, 10), description: '', photos: [] }
  modalOpen.value = true
}

function openEdit(a: ClassActivity) {
  editing.value = a
  draft.value = { title: a.title, date: a.date, description: a.description, photos: [...a.photos] }
  modalOpen.value = true
}

function onPhotoUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  for (const file of input.files) {
    const reader = new FileReader()
    reader.onload = () => {
      draft.value.photos.push(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removePhoto(idx: number) {
  draft.value.photos.splice(idx, 1)
}

function save() {
  if (!draft.value.title.trim()) { toast.warning('请输入活动标题'); return }
  const payload = { ...draft.value, classId: classId.value }
  if (editing.value) {
    opsStore.updateActivity(editing.value.id, payload)
    toast.success('已更新')
  } else {
    opsStore.addActivity(payload)
    toast.success('已创建')
  }
  modalOpen.value = false
}

function remove(a: ClassActivity) {
  if (!confirm(`确定删除「${a.title}」？`)) return
  opsStore.removeActivity(a.id)
  toast.info('已删除')
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-sakura-100 via-cream-50 to-butter-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">🎉</div>
      <h2 class="title-display text-2xl">班级活动记录</h2>
      <p class="text-sm text-cocoa-500 mt-1">记录每一次精彩活动，留存美好回忆</p>
    </section>

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新增活动
      </button>
    </div>

    <div v-if="!activities.length" class="mt-8">
      <EmptyState title="还没有活动记录" desc="记录班级活动，留下美好回忆" icon="🎉" />
    </div>

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <div v-for="a in activities" :key="a.id" class="card-soft p-5 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="title-display text-base">{{ a.title }}</h3>
              <span class="text-xs text-cocoa-400">{{ a.date }}</span>
            </div>
            <p class="text-sm text-cocoa-600 mt-2 whitespace-pre-line">{{ a.description }}</p>
            <div v-if="a.photos.length" class="flex flex-wrap gap-2 mt-3">
              <img v-for="(p, i) in a.photos.slice(0, 4)" :key="i" :src="p" class="w-16 h-16 object-cover rounded-lg" />
              <span v-if="a.photos.length > 4" class="text-xs text-cocoa-400 self-center">+{{ a.photos.length - 4 }}张</span>
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(a)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(a)"><Trash2 :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑活动' : '新增活动'" width="560px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">标题</label>
            <input v-model="draft.title" class="input-soft" placeholder="如：秋季运动会" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">日期</label>
            <input v-model="draft.date" type="date" class="input-soft" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">活动描述</label>
          <textarea v-model="draft.description" class="input-soft" rows="4" placeholder="记录活动内容、参与情况等..." />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">活动照片</label>
          <div class="flex flex-wrap gap-2 mt-1">
            <div v-for="(p, i) in draft.photos" :key="i" class="relative group">
              <img :src="p" class="w-16 h-16 object-cover rounded-lg" />
              <button class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sakura-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition" @click="removePhoto(i)">×</button>
            </div>
            <label class="w-16 h-16 rounded-lg border-2 border-dashed border-cocoa-200 flex items-center justify-center cursor-pointer hover:border-mint-400 transition">
              <Camera :size="20" class="text-cocoa-300" />
              <input type="file" accept="image/*" multiple class="hidden" @change="onPhotoUpload" />
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
