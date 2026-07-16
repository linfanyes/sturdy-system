<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useClassStore } from '../stores/class'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'
import { getStorageKey } from '../utils/storage'
import { uid, now, formatDate } from '../utils'
import EmptyState from '../components/common/EmptyState.vue'
import Modal from '../components/common/Modal.vue'
import { Plus, Trash2, X, ChevronLeft, ChevronRight, FolderPlus, Folder } from 'lucide-vue-next'

interface Photo {
  id: string
  name: string
  dataUrl: string
  uploadAt: number
  desc?: string
  albumId: string
}

interface Album {
  id: string
  name: string
  icon: string
  createdAt: number
}

const PRESET_ALBUMS: { name: string; icon: string }[] = [
  { name: '班会活动', icon: '🎯' },
  { name: '获奖荣誉', icon: '🏆' },
  { name: '课堂瞬间', icon: '📚' },
  { name: '文体活动', icon: '⚽' },
  { name: '其他', icon: '📦' },
]

const classStore = useClassStore()
const userStore = useUserStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const photos = ref<Photo[]>([])
const albums = ref<Album[]>([])
const currentAlbumId = ref<string>('all')

const addModalOpen = ref(false)
const pending = ref<Photo[]>([])
const processing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadAlbumId = ref<string>('default')

const albumModalOpen = ref(false)
const newAlbumName = ref('')
const newAlbumIcon = ref('📁')

const lightboxIndex = ref<number | null>(null)

const hasClass = computed(() => !!classId.value && classStore.classes.length > 0)

function photosKey() {
  return getStorageKey(`class-gallery.${classId.value}`)
}
function albumsKey() {
  return getStorageKey(`class-gallery-albums.${classId.value}`)
}

function loadAll() {
  if (!classId.value) {
    photos.value = []
    albums.value = []
    return
  }
  try {
    const rawPhotos = localStorage.getItem(photosKey())
    photos.value = rawPhotos ? (JSON.parse(rawPhotos) as Photo[]) : []
  } catch {
    photos.value = []
  }
  try {
    const rawAlbums = localStorage.getItem(albumsKey())
    albums.value = rawAlbums ? (JSON.parse(rawAlbums) as Album[]) : []
  } catch {
    albums.value = []
  }
  if (!albums.value.length) {
    albums.value = PRESET_ALBUMS.map((a) => ({
      id: uid(),
      name: a.name,
      icon: a.icon,
      createdAt: now(),
    }))
    saveAlbums()
  }
  if (photos.value.length && !photos.value[0].albumId) {
    const fallback = albums.value[0]?.id || 'default'
    photos.value.forEach((p) => {
      if (!p.albumId) p.albumId = fallback
    })
    savePhotos()
  }
  currentAlbumId.value = 'all'
  uploadAlbumId.value = albums.value[0]?.id || 'default'
}

function savePhotos() {
  try {
    localStorage.setItem(photosKey(), JSON.stringify(photos.value))
  } catch {
    toast.error('存储空间不足，无法保存（localStorage 已满）')
  }
}

function saveAlbums() {
  try {
    localStorage.setItem(albumsKey(), JSON.stringify(albums.value))
  } catch {
    /* noop */
  }
}

watch([classId, () => userStore.user?.id], loadAll, { immediate: true })

watch(lightboxIndex, (v) => {
  if (typeof document !== 'undefined') document.body.style.overflow = v !== null ? 'hidden' : ''
})

const filteredPhotos = computed(() => {
  if (currentAlbumId.value === 'all') return photos.value
  return photos.value.filter((p) => p.albumId === currentAlbumId.value)
})

const albumCounts = computed(() => {
  const map: Record<string, number> = { all: photos.value.length }
  albums.value.forEach((a) => {
    map[a.id] = photos.value.filter((p) => p.albumId === a.id).length
  })
  return map
})

function dataUrlKB(dataUrl: string): number {
  const b64 = dataUrl.split(',')[1] || ''
  return Math.round((b64.length * 3) / 4 / 1024)
}

function compress(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (dataUrlKB(dataUrl) <= 500) {
      resolve(dataUrl)
      return
    }
    const img = new Image()
    img.onload = () => {
      const maxW = 800
      let w = img.width
      let h = img.height
      if (w > maxW) {
        h = Math.round(h * (maxW / w))
        w = maxW
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function triggerPick() {
  if (!classId.value) {
    toast.warning('请先选择班级')
    return
  }
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || !files.length) return
  processing.value = true
  const list: Photo[] = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    try {
      const raw = await readAsDataURL(file)
      const compressed = await compress(raw)
      if (dataUrlKB(compressed) > 200) {
        toast.warning('「' + file.name + '」压缩后仍约 ' + dataUrlKB(compressed) + 'KB，可能占用较多存储')
      }
      list.push({
        id: uid(),
        name: file.name,
        dataUrl: compressed,
        uploadAt: now(),
        desc: '',
        albumId: uploadAlbumId.value,
      })
    } catch {
      toast.error('「' + file.name + '」读取失败')
    }
  }
  processing.value = false
  input.value = ''
  if (list.length) {
    pending.value = list
    addModalOpen.value = true
  }
}

function confirmAdd() {
  const count = pending.value.length
  pending.value.forEach((p) => {
    p.albumId = uploadAlbumId.value
  })
  photos.value.unshift(...pending.value)
  savePhotos()
  pending.value = []
  addModalOpen.value = false
  toast.success('已添加 ' + count + ' 张照片到「' + currentAlbumName(uploadAlbumId.value) + '」')
}

function cancelAdd() {
  pending.value = []
  addModalOpen.value = false
}

function currentAlbumName(id: string): string {
  if (id === 'all') return '全部照片'
  return albums.value.find((a) => a.id === id)?.name || '未分类'
}

function removePhoto(p: Photo) {
  if (!window.confirm('确定删除这张照片？')) return
  photos.value = photos.value.filter((x) => x.id !== p.id)
  savePhotos()
  toast.info('已删除')
}

const moveModalOpen = ref(false)
const movePhotoTarget = ref<Photo | null>(null)
const moveTargetAlbumId = ref<string>('')

function openMoveModal(p: Photo) {
  movePhotoTarget.value = p
  moveTargetAlbumId.value = p.albumId
  moveModalOpen.value = true
}

function confirmMove() {
  if (!movePhotoTarget.value) return
  const target = moveTargetAlbumId.value
  if (!target) {
    toast.warning('请选择目标相册')
    return
  }
  const idx = photos.value.findIndex((x) => x.id === movePhotoTarget.value!.id)
  if (idx >= 0) {
    photos.value[idx].albumId = target
    savePhotos()
    toast.success('已移动到「' + currentAlbumName(target) + '」')
  }
  moveModalOpen.value = false
  movePhotoTarget.value = null
}

function addAlbum() {
  const name = newAlbumName.value.trim()
  if (!name) {
    toast.warning('请输入相册名称')
    return
  }
  if (albums.value.some((a) => a.name === name)) {
    toast.warning('该相册已存在')
    return
  }
  albums.value.push({
    id: uid(),
    name,
    icon: newAlbumIcon.value || '📁',
    createdAt: now(),
  })
  saveAlbums()
  newAlbumName.value = ''
  newAlbumIcon.value = '📁'
  toast.success('已创建相册')
}

function removeAlbum(a: Album) {
  const count = photos.value.filter((p) => p.albumId === a.id).length
  const msg = count
    ? '相册「' + a.name + '」内有 ' + count + ' 张照片，删除后照片将移至第一个相册。确定删除？'
    : '确定删除相册「' + a.name + '」？'
  if (!window.confirm(msg)) return
  const fallback = albums.value.find((x) => x.id !== a.id)?.id || 'default'
  photos.value.forEach((p) => {
    if (p.albumId === a.id) p.albumId = fallback
  })
  savePhotos()
  albums.value = albums.value.filter((x) => x.id !== a.id)
  saveAlbums()
  if (currentAlbumId.value === a.id) currentAlbumId.value = 'all'
  toast.info('已删除相册')
}

function openLightbox(idx: number) {
  lightboxIndex.value = idx
}
function closeLightbox() {
  lightboxIndex.value = null
}
function prevPhoto() {
  if (lightboxIndex.value === null || !filteredPhotos.value.length) return
  lightboxIndex.value =
    (lightboxIndex.value - 1 + filteredPhotos.value.length) % filteredPhotos.value.length
}
function nextPhoto() {
  if (lightboxIndex.value === null || !filteredPhotos.value.length) return
  lightboxIndex.value = (lightboxIndex.value + 1) % filteredPhotos.value.length
}
function onKeydown(e: KeyboardEvent) {
  if (lightboxIndex.value === null) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') prevPhoto()
  else if (e.key === 'ArrowRight') nextPhoto()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>


<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-sky2-100 via-cream-50 to-mint-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📸</div>
      <h2 class="title-display text-2xl">班级风采</h2>
      <p class="text-sm text-cocoa-500 mt-1">按相册归类班级照片，留存每个精彩瞬间</p>
    </section>

    <div class="flex items-center gap-3 flex-wrap">
      <select v-model="classId" class="input-soft !w-auto">
        <option value="" disabled>选择班级</option>
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn-primary" :disabled="processing || !hasClass" @click="triggerPick">
        <Plus :size="14" /> {{ processing ? '处理中...' : '添加照片' }}
      </button>
      <select v-model="uploadAlbumId" class="input-soft !w-auto" :disabled="!albums.length">
        <option value="default" disabled>上传到相册</option>
        <option v-for="a in albums" :key="a.id" :value="a.id">{{ a.icon }} {{ a.name }}</option>
      </select>
      <button class="btn-secondary" @click="albumModalOpen = true">
        <FolderPlus :size="14" /> 管理相册
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <div v-if="hasClass && albums.length" class="flex items-center gap-2 flex-wrap">
      <button
        class="chip !py-1.5 !px-3 transition"
        :class="currentAlbumId === 'all' ? 'bg-sky2-200 text-sky2-700' : 'bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200'"
        @click="currentAlbumId = 'all'"
      >
        🖼️ 全部照片 <span class="text-xs opacity-70">({{ albumCounts['all'] || 0 }})</span>
      </button>
      <button
        v-for="a in albums"
        :key="a.id"
        class="chip !py-1.5 !px-3 transition"
        :class="currentAlbumId === a.id ? 'bg-sky2-200 text-sky2-700' : 'bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200'"
        @click="currentAlbumId = a.id"
      >
        {{ a.icon }} {{ a.name }} <span class="text-xs opacity-70">({{ albumCounts[a.id] || 0 }})</span>
      </button>
    </div>

    <div v-if="!classStore.classes.length">
      <EmptyState title="还没有班级" desc="请先到「班级管理」创建班级" icon="🏫" />
    </div>
    <div v-else-if="!classId">
      <EmptyState title="请选择班级" desc="在上方下拉框中选择班级查看照片墙" icon="👈" />
    </div>
    <div v-else-if="!filteredPhotos.length">
      <EmptyState title="该相册暂无照片" desc="点击「添加照片」上传班级精彩瞬间" icon="📷" />
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="(p, i) in filteredPhotos" :key="p.id" class="card-soft overflow-hidden group">
        <div class="relative aspect-square cursor-pointer" @click="openLightbox(i)">
          <img
            :src="p.dataUrl"
            :alt="p.desc || p.name"
            class="w-full h-full object-cover transition group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-cocoa-900/0 group-hover:bg-cocoa-900/25 transition flex items-center justify-center">
            <span class="text-white text-xs opacity-0 group-hover:opacity-100 transition">点击查看大图</span>
          </div>
          <span class="absolute top-2 left-2 chip !py-0.5 !px-2 text-xs bg-cocoa-900/50 text-white">
            {{ currentAlbumName(p.albumId) }}
          </span>
        </div>
        <div class="p-3 space-y-1">
          <p v-if="p.desc" class="text-sm text-cocoa-700 truncate">{{ p.desc }}</p>
          <p class="text-xs text-cocoa-400">{{ formatDate(p.uploadAt, 'YYYY-MM-DD') }}</p>
          <div class="flex items-center gap-2 pt-1">
            <button class="text-xs text-cocoa-500 hover:text-sky2-600 transition" @click="openMoveModal(p)">
              移动
            </button>
            <button class="text-xs text-cocoa-500 hover:text-rose-500 transition" @click="removePhoto(p)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="addModalOpen" title="确认添加照片" width="640px" @close="cancelAdd">
      <div class="space-y-3">
        <p class="text-sm text-cocoa-500">为每张照片添加描述（可选），然后点击「确认添加」。</p>
        <div class="flex items-center gap-2">
          <label class="text-sm text-cocoa-600 shrink-0">上传到相册：</label>
          <select v-model="uploadAlbumId" class="input-soft !w-auto">
            <option v-for="a in albums" :key="a.id" :value="a.id">{{ a.icon }} {{ a.name }}</option>
          </select>
        </div>
        <div v-for="p in pending" :key="p.id" class="flex items-start gap-3 p-3 bg-cocoa-50 rounded-lg">
          <img :src="p.dataUrl" :alt="p.name" class="w-16 h-16 object-cover rounded shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-cocoa-400 truncate">{{ p.name }}</p>
            <input
              v-model="p.desc"
              type="text"
              placeholder="添加照片描述..."
              class="input-soft mt-1 !text-sm"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="cancelAdd">取消</button>
        <button class="btn-primary" @click="confirmAdd">确认添加 ({{ pending.length }})</button>
      </template>
    </Modal>

    <Modal :open="albumModalOpen" title="管理相册" width="640px" @close="albumModalOpen = false">
      <div class="space-y-4">
        <div class="flex items-center gap-2 p-3 bg-cocoa-50 rounded-lg">
          <input v-model="newAlbumName" type="text" placeholder="相册名称" class="input-soft flex-1" @keyup.enter="addAlbum" />
          <input v-model="newAlbumIcon" type="text" placeholder="📁" class="input-soft !w-16 text-center" maxlength="2" />
          <button class="btn-primary shrink-0" @click="addAlbum">
            <Plus :size="14" /> 新建
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="a in albums"
            :key="a.id"
            class="flex items-center gap-3 p-3 bg-cocoa-50 rounded-lg"
          >
            <Folder :size="20" class="text-sky2-500 shrink-0" />
            <span class="text-lg">{{ a.icon }}</span>
            <span class="flex-1 text-cocoa-700">{{ a.name }}</span>
            <span class="text-xs text-cocoa-400">{{ albumCounts[a.id] || 0 }} 张</span>
            <button class="text-cocoa-400 hover:text-rose-500 transition" @click="removeAlbum(a)">
              <Trash2 :size="16" />
            </button>
          </div>
          <div v-if="!albums.length" class="text-center text-cocoa-400 text-sm py-4">
            还没有相册，快创建一个吧
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="albumModalOpen = false">关闭</button>
      </template>
    </Modal>

    <Modal :open="moveModalOpen" title="移动到相册" width="420px" @close="moveModalOpen = false">
      <div class="space-y-2">
        <p class="text-sm text-cocoa-500">选择目标相册：</p>
        <div
          v-for="a in albums"
          :key="a.id"
          class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition"
          :class="moveTargetAlbumId === a.id ? 'bg-sky2-100 ring-2 ring-sky2-400' : 'bg-cocoa-50 hover:bg-cocoa-100'"
          @click="moveTargetAlbumId = a.id"
        >
          <span class="text-lg">{{ a.icon }}</span>
          <span class="flex-1 text-cocoa-700">{{ a.name }}</span>
          <span class="text-xs text-cocoa-400">{{ albumCounts[a.id] || 0 }} 张</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="moveModalOpen = false">取消</button>
        <button class="btn-primary" @click="confirmMove">确认移动</button>
      </template>
    </Modal>

    <Teleport to="body">
      <transition name="lightbox">
        <div
          v-if="lightboxIndex !== null && filteredPhotos.length"
          class="fixed inset-0 z-[300] bg-cocoa-900/90 flex items-center justify-center"
          @click.self="closeLightbox"
        >
          <button
            class="absolute top-4 right-4 text-white/80 hover:text-white transition p-2"
            @click="closeLightbox"
          >
            <X :size="28" />
          </button>
          <button
            v-if="filteredPhotos.length > 1"
            class="absolute left-4 text-white/80 hover:text-white transition p-2"
            @click="prevPhoto"
          >
            <ChevronLeft :size="36" />
          </button>
          <div class="max-w-[85vw] max-h-[85vh] flex flex-col items-center">
            <img
              :src="filteredPhotos[lightboxIndex]?.dataUrl"
              :alt="filteredPhotos[lightboxIndex]?.desc || filteredPhotos[lightboxIndex]?.name"
              class="max-w-[85vw] max-h-[75vh] object-contain rounded-lg"
            />
            <div class="mt-3 text-center text-white/80">
              <p v-if="filteredPhotos[lightboxIndex]?.desc" class="text-sm">{{ filteredPhotos[lightboxIndex].desc }}</p>
              <p class="text-xs mt-1">
                {{ lightboxIndex + 1 }} / {{ filteredPhotos.length }}
              </p>
            </div>
          </div>
          <button
            v-if="filteredPhotos.length > 1"
            class="absolute right-4 text-white/80 hover:text-white transition p-2"
            @click="nextPhoto"
          >
            <ChevronRight :size="36" />
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
