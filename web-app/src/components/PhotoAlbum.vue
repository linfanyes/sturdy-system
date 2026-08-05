<script setup lang="ts">
/**
 * 通用照片相册组件：列表 + 新增/编辑/删除，支持批量图片上传（压缩为 base64）。
 * 复用后端统一 CRUD 接口（class-galleries / my-galleries）。
 */
import { ref, onMounted, computed } from 'vue'
import { Plus, Trash2, Edit3, Image as ImageIcon, X } from 'lucide-vue-next'
import Modal from './Modal.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { compressImages } from '@/composables/usePhotoUpload'
import request from '@/api/request'

const props = defineProps<{
  apiPath: string
  title: string
  /** 是否按班级筛选（班级风采=true，我的相册=false） */
  classFilterable?: boolean
}>()

const { classes } = useClasses()
const loading = ref(false)
const items = ref<any[]>([])
const classId = ref('')
const showForm = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)
const form = ref<{ title: string; date: string; description: string; photos: string[]; classId?: string }>({
  title: '', date: '', description: '', photos: [],
})
const uploadProgress = ref('')

const filtered = computed(() => items.value)

async function loadList() {
  loading.value = true
  try {
    const params: Record<string, any> = { take: 200 }
    if (props.classFilterable !== false && classId.value) params.classId = classId.value
    const res = await request.get(props.apiPath, { params })
    items.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.classFilterable !== false) loadClasses()
  loadList()
})

function openCreate() {
  editing.value = null
  form.value = { title: '', date: new Date().toISOString().slice(0, 10), description: '', photos: [], classId: classId.value || undefined }
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  form.value = { title: row.title, date: row.date, description: row.description || '', photos: row.photos || [], classId: row.classId }
  showForm.value = true
}

async function onPickPhotos(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const files = Array.from(input.files)
  uploadProgress.value = '压缩上传中 0/' + files.length
  const dataUrls = await compressImages(files, (done, total) => {
    uploadProgress.value = `压缩上传中 ${done}/${total}`
  })
  form.value.photos.push(...dataUrls)
  uploadProgress.value = ''
  input.value = ''
}

function removePhoto(idx: number) {
  form.value.photos.splice(idx, 1)
}

async function submit() {
  if (!form.value.title) { alert('请填写标题'); return }
  if (props.classFilterable !== false && !form.value.classId) { alert('请选择班级'); return }
  saving.value = true
  try {
    const payload: any = { ...form.value }
    if (editing.value) {
      await request.patch(`${props.apiPath}/${editing.value.id}`, payload)
      const idx = items.value.findIndex(x => x.id === editing.value.id)
      if (idx >= 0) items.value[idx] = { ...items.value[idx], ...payload }
    } else {
      const res = await request.post(props.apiPath, payload)
      if (res?.id) items.value.unshift(res)
    }
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function del(row: any) {
  if (!await confirm(`确定删除「${row.title}」？`)) return
  try {
    await request.delete(`${props.apiPath}/${row.id}`)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">{{ title }}</h1>
      <div class="flex items-center gap-2">
        <select
          v-if="classFilterable !== false"
          v-model="classId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          @change="loadList"
        >
          <option value="">全部班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600" @click="openCreate">
          <Plus class="w-4 h-4" /> 新增
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-cocoa-400 py-10">加载中…</div>
    <div v-else-if="!filtered.length" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <ImageIcon class="w-10 h-10 mx-auto mb-2 text-cocoa-300" />
      暂无照片，点击「新增」上传
    </div>

    <div v-else class="grid grid-cols-3 gap-4">
      <div v-for="row in filtered" :key="row.id" class="table-wrap">
        <!-- 照片网格 -->
        <div class="grid grid-cols-2 gap-0.5 bg-cream-100" style="min-height: 8rem">
          <template v-if="row.photos?.length">
            <img v-for="(p, i) in row.photos.slice(0, 4)" :key="i" :src="p" class="w-full h-32 object-cover" />
          </template>
          <div v-else class="col-span-2 flex items-center justify-center h-32 text-cocoa-300">
            <ImageIcon class="w-8 h-8" />
          </div>
        </div>
        <div class="p-3">
          <div class="flex items-center justify-between">
            <div class="font-semibold text-cocoa-900 text-sm truncate">{{ row.title }}</div>
            <div class="flex items-center gap-1">
              <button class="p-1 rounded hover:bg-cream-100 text-cocoa-500" @click="openEdit(row)" title="编辑" aria-label="编辑"><Edit3 class="w-3.5 h-3.5" /></button>
              <button class="p-1 rounded hover:bg-red-50 text-red-500" @click="del(row)" title="删除" aria-label="删除"><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div class="text-xs text-cocoa-400 mt-1 flex items-center justify-between">
            <span>{{ row.date || '-' }}</span>
            <span v-if="row.photos?.length">{{ row.photos.length }} 张</span>
          </div>
          <div v-if="row.description" class="text-xs text-cocoa-500 mt-1 line-clamp-2">{{ row.description }}</div>
        </div>
      </div>
    </div>
  </div>

  <Modal v-model="showForm" :title="editing ? '编辑' + title : '新增' + title" width="max-w-3xl">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">标题<span class="text-red-500">*</span></label>
          <input v-model="form.title" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">日期</label>
          <input v-model="form.date" type="date" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
      </div>
      <div v-if="classFilterable !== false">
        <label class="text-sm text-cocoa-500">班级<span class="text-red-500">*</span></label>
        <select v-model="form.classId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
          <option value="">请选择</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">描述</label>
        <textarea v-model="form.description" rows="2" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none" />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">照片</label>
        <div class="mt-1 flex flex-wrap gap-2">
          <div v-for="(p, i) in form.photos" :key="i" class="relative w-24 h-24">
            <img :src="p" class="w-24 h-24 object-cover rounded-lg border border-cream-200" />
            <button class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center" @click="removePhoto(i)"><X class="w-3 h-3" /></button>
          </div>
          <label class="w-24 h-24 rounded-lg border-2 border-dashed border-cream-300 flex flex-col items-center justify-center cursor-pointer hover:border-butter-400 text-cocoa-400">
            <Plus class="w-5 h-5" />
            <span class="text-xs mt-1">添加</span>
            <input type="file" accept="image/*" multiple class="hidden" @change="onPickPhotos" />
          </label>
        </div>
        <div v-if="uploadProgress" class="text-xs text-butter-500 mt-1">{{ uploadProgress }}</div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="saving" @click="submit">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>
</template>
