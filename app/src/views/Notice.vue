<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useSchoolStore } from '../stores/school'
import type { Notice } from '../types'
import Modal from '../components/common/Modal.vue'
import { Plus, Edit, Trash2, Save, X, Pin, Megaphone, CheckCircle2, RotateCcw } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'
import { formatDate } from '../utils'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const toast = useToastStore()

const showEnded = ref(false)

const classFilter = ref('all')

const filtered = computed(() => {
  let list = [...schoolStore.notices]
  if (!showEnded.value) list = list.filter((n) => !n.ended)
  if (classFilter.value !== 'all') {
    list = list.filter(
      (n) => n.classId === classFilter.value || n.classId === '全校',
    )
  }
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt - a.createdAt
  })
})

const modalOpen = ref(false)
const editing = ref<Notice | null>(null)
const draft = ref<Omit<Notice, 'id' | 'createdAt'>>({
  classId: '',
  title: '',
  content: '',
  pinned: false,
})

function openCreate() {
  editing.value = null
  draft.value = {
    classId: classFilter.value !== 'all' && classFilter.value !== 'all' ? classFilter.value : '全校',
    title: '',
    content: '',
    pinned: false,
  }
  modalOpen.value = true
}

function openEdit(n: Notice) {
  editing.value = n
  draft.value = { ...n }
  modalOpen.value = true
}

function save() {
  if (!draft.value.title.trim()) {
    toast.warning('请填写公告标题')
    return
  }
  if (editing.value) {
    schoolStore.updateNotice(editing.value.id, draft.value)
    toast.success('已更新')
  } else {
    schoolStore.addNotice(draft.value)
    toast.success('已发布公告')
  }
  modalOpen.value = false
}

function remove(n: Notice) {
  if (!confirm(`确定删除公告「${n.title}」吗？`)) return
  schoolStore.removeNotice(n.id)
  toast.info('已删除')
}

function endOne(n: Notice) {
  if (!confirm(`确定将「${n.title}」标记为已结束吗？\n结束后将自动取消置顶。`)) return
  schoolStore.endNotice(n.id)
  toast.success('已结束')
}

function reopenOne(n: Notice) {
  schoolStore.reopenNotice(n.id)
  toast.success('已重新发布')
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center gap-3 justify-between flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="classFilter"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部公告
          </option>
          <option value="全校">
            全校公告
          </option>
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
        <label class="flex items-center gap-1.5 text-xs text-cocoa-500 cursor-pointer select-none">
          <input
            v-model="showEnded"
            type="checkbox"
            class="accent-cocoa-500"
          >
          显示已结束
        </label>
      </div>
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 发布公告
      </button>
    </div>

    <div
      v-if="filtered.length"
      class="grid lg:grid-cols-2 gap-4"
    >
      <article
        v-for="n in filtered"
        :key="n.id"
        class="card-soft p-5 relative"
        :class="[
          n.pinned && !n.ended ? 'ring-2 ring-sakura-300' : '',
          n.ended ? 'opacity-70' : '',
        ]"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-if="n.ended"
              class="chip bg-cocoa-200 text-cocoa-700"
              title="该公告已结束，不会再置顶"
            >
              <CheckCircle2 :size="10" /> 已结束
            </span>
            <span
              v-else-if="n.pinned"
              class="chip bg-sakura-300 text-cocoa-900"
            >
              <Pin :size="10" /> 置顶
            </span>
            <span
              class="chip"
              :class="
                n.classId === '全校'
                  ? 'bg-butter-300 text-butter-600'
                  : 'bg-mint-100 text-mint-500'
              "
            >
              {{ n.classId === '全校' ? '全校' : classStore.getClass(n.classId)?.name }}
            </span>
          </div>
          <div class="flex gap-1">
            <button
              v-if="!n.ended"
              class="p-1.5 rounded-full hover:bg-butter-100"
              :title="n.pinned ? '取消置顶' : '置顶'"
              @click="schoolStore.togglePinNotice(n.id)"
            >
              <Pin
                :size="13"
                :class="n.pinned ? 'text-sakura-500' : ''"
              />
            </button>
            <button
              v-if="!n.ended"
              class="p-1.5 rounded-full hover:bg-mint-100"
              title="一键结束（自动取消置顶）"
              @click="endOne(n)"
            >
              <CheckCircle2
                :size="13"
                class="text-mint-500"
              />
            </button>
            <button
              v-else
              class="p-1.5 rounded-full hover:bg-butter-100"
              title="重新发布"
              @click="reopenOne(n)"
            >
              <RotateCcw
                :size="13"
                class="text-butter-500"
              />
            </button>
            <button
              class="p-1.5 rounded-full hover:bg-butter-100"
              title="编辑"
              @click="openEdit(n)"
            >
              <Edit :size="13" />
            </button>
            <button
              class="p-1.5 rounded-full hover:bg-sakura-100"
              title="删除"
              @click="remove(n)"
            >
              <Trash2 :size="13" />
            </button>
          </div>
        </div>
        <h3
          class="title-display text-lg mt-2"
          :class="n.ended ? 'line-through text-cocoa-500' : ''"
        >
          {{ n.title }}
        </h3>
        <p class="text-sm text-cocoa-700 mt-2 whitespace-pre-wrap leading-relaxed">
          {{ n.content }}
        </p>
        <div class="text-xs text-cocoa-300 mt-3 flex items-center gap-1 flex-wrap">
          <Megaphone :size="12" /> 发布于 {{ formatDate(n.createdAt) }}
          <span v-if="n.ended && n.endedAt">· 结束于 {{ formatDate(n.endedAt) }}</span>
        </div>
      </article>
    </div>
    <div
      v-else
      class="card-soft p-12 text-center text-cocoa-500"
    >
      <div class="text-5xl mb-2">
        📣
      </div>
      <div>{{ showEnded ? '暂无公告' : '暂无进行中的公告' }}</div>
      <button
        class="btn-primary mt-4"
        @click="openCreate"
      >
        <Plus :size="14" /> 发布第一条
      </button>
    </div>

    <Modal
      :open="modalOpen"
      :title="editing ? '编辑公告' : '发布公告'"
      width="560px"
      @close="modalOpen = false"
    >
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">公告范围</label>
          <select
            v-model="draft.classId"
            class="input-soft mt-1"
          >
            <option value="全校">
              全校
            </option>
            <option
              v-for="c in classStore.classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">标题</label>
          <input
            v-model="draft.title"
            class="input-soft mt-1"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">内容</label>
          <textarea
            v-model="draft.content"
            class="input-soft mt-1 min-h-[160px]"
          />
        </div>
        <label
          v-if="!editing?.ended"
          class="flex items-center gap-2 text-sm"
        >
          <input
            v-model="draft.pinned"
            type="checkbox"
            class="accent-butter-500"
          >
          置顶这条公告
        </label>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="modalOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="save"
        >
          <Save :size="14" /> 发布
        </button>
      </template>
    </Modal>
  </div>
</template>
