<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useAdminStore } from '../stores/admin'
import { useToastStore } from '../stores/toast'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Eye } from 'lucide-vue-next'
import type { LessonObservation } from '../types'

const classStore = useClassStore()
const adminStore = useAdminStore()
const toast = useToastStore()

const observations = computed(() => [...adminStore.observations].sort((a, b) => b.createdAt - a.createdAt))

const ratings: LessonObservation['overallRating'][] = ['优秀', '良好', '一般', '待改进']
const ratingColor: Record<string, string> = {
  '优秀': 'bg-mint-100 text-mint-500',
  '良好': 'bg-sky2-100 text-sky2-500',
  '一般': 'bg-butter-100 text-butter-600',
  '待改进': 'bg-sakura-100 text-sakura-500',
}

const modalOpen = ref(false)
const editing = ref<LessonObservation | null>(null)
const draft = ref({
  teacherName: '',
  classId: '',
  className: '',
  subject: '',
  topic: '',
  date: new Date().toISOString().slice(0, 10),
  strengths: '',
  suggestions: '',
  overallRating: '良好' as LessonObservation['overallRating'],
})

function openCreate() {
  editing.value = null
  draft.value = {
    teacherName: '', classId: classStore.classes[0]?.id || '', className: classStore.classes[0]?.name || '',
    subject: '', topic: '', date: new Date().toISOString().slice(0, 10),
    strengths: '', suggestions: '', overallRating: '良好',
  }
  modalOpen.value = true
}

function openEdit(o: LessonObservation) {
  editing.value = o
  draft.value = {
    teacherName: o.teacherName, classId: o.classId, className: o.className,
    subject: o.subject, topic: o.topic, date: o.date,
    strengths: o.strengths, suggestions: o.suggestions, overallRating: o.overallRating,
  }
  modalOpen.value = true
}

function onClassChange() {
  const c = classStore.getClass(draft.value.classId)
  draft.value.className = c?.name || ''
}

function save() {
  if (!draft.value.teacherName.trim()) { toast.warning('请输入授课教师'); return }
  if (!draft.value.topic.trim()) { toast.warning('请输入听课主题'); return }
  if (editing.value) {
    adminStore.updateObservation(editing.value.id, draft.value)
    toast.success('已更新')
  } else {
    adminStore.addObservation(draft.value)
    toast.success('已记录')
  }
  modalOpen.value = false
}

function remove(o: LessonObservation) {
  if (!confirm(`确定删除此听课记录？`)) return
  adminStore.removeObservation(o.id)
  toast.info('已删除')
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-sky2-100 via-cream-50 to-butter-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📝</div>
      <h2 class="title-display text-2xl">听课记录</h2>
      <p class="text-sm text-cocoa-500 mt-1">记录听课心得，促进教学交流与提升</p>
    </section>

    <div class="flex items-center gap-3">
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新增听课记录
      </button>
    </div>

    <div v-if="!observations.length" class="mt-8">
      <EmptyState title="还没有听课记录" desc="记录听课过程中的亮点与建议" icon="📝" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="o in observations" :key="o.id" class="card-soft p-5 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ o.teacherName }}</span>
              <span class="text-sm text-cocoa-500">{{ o.className }}</span>
              <span class="text-sm text-cocoa-500">{{ o.subject }}</span>
              <span class="chip text-[10px]" :class="ratingColor[o.overallRating] || ''">{{ o.overallRating }}</span>
              <span class="text-xs text-cocoa-400">{{ o.date }}</span>
            </div>
            <h4 class="text-sm font-medium text-cocoa-800 mt-2">📌 {{ o.topic }}</h4>
            <div v-if="o.strengths" class="mt-2">
              <span class="text-xs text-mint-500 font-medium">✅ 亮点：</span>
              <p class="text-sm text-cocoa-600">{{ o.strengths }}</p>
            </div>
            <div v-if="o.suggestions" class="mt-1">
              <span class="text-xs text-sky2-500 font-medium">💡 建议：</span>
              <p class="text-sm text-cocoa-600">{{ o.suggestions }}</p>
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(o)">编辑</button>
            <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(o)"><Trash2 :size="12" /></button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑听课记录' : '新增听课记录'" width="600px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">授课教师</label>
            <input v-model="draft.teacherName" class="input-soft" placeholder="如：王老师" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">班级</label>
            <select v-model="draft.classId" class="input-soft" @change="onClassChange">
              <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">科目</label>
            <input v-model="draft.subject" class="input-soft" placeholder="如：语文" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">日期</label>
            <input v-model="draft.date" type="date" class="input-soft" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">听课主题/课题</label>
          <input v-model="draft.topic" class="input-soft" placeholder="如：《草船借箭》第二课时" />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">总体评价</label>
          <div class="flex gap-2 mt-1">
            <button v-for="r in ratings" :key="r" class="chip cursor-pointer"
              :class="draft.overallRating === r ? ratingColor[r] : 'bg-cocoa-100 text-cocoa-500'"
              @click="draft.overallRating = r">{{ r }}</button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">亮点</label>
          <textarea v-model="draft.strengths" class="input-soft" rows="3" placeholder="教学中的亮点..." />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">建议</label>
          <textarea v-model="draft.suggestions" class="input-soft" rows="3" placeholder="改进建议..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
