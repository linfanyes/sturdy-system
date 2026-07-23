<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDebouncedSearch } from '../composables/useDebouncedSearch'
import { useSchoolStore } from '../stores/school'
import type { Resource } from '../types'
import Modal from '../components/common/Modal.vue'
import { Plus, Trash2, Search, ExternalLink, Save, X, Link2, Tag, FolderOpen } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'

const schoolStore = useSchoolStore()
const toast = useToastStore()

const { search, searchDebounced } = useDebouncedSearch(200)
const catFilter = ref('all')

const categories = computed(() =>
  Array.from(new Set(schoolStore.resources.map((r) => r.category))),
)

const filtered = computed(() => {
  let list = [...schoolStore.resources]
  if (catFilter.value !== 'all')
    list = list.filter((r) => r.category === catFilter.value)
  if (searchDebounced.value.trim()) {
    const kw = searchDebounced.value.trim().toLowerCase()
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.tags.some((t) => t.toLowerCase().includes(kw)),
    )
  }
  return list
})

const modalOpen = ref(false)
const draft = ref<Omit<Resource, 'id' | 'createdAt'>>({
  title: '',
  url: '',
  category: '教学素材',
  tags: [],
  description: '',
})

function openCreate() {
  draft.value = {
    title: '',
    url: '',
    category: '教学素材',
    tags: [],
    description: '',
  }
  modalOpen.value = true
}

function save() {
  if (!draft.value.title.trim()) {
    toast.warning('请填写资源名称')
    return
  }
  if (!draft.value.url.trim()) {
    toast.warning('请填写资源链接')
    return
  }
  schoolStore.addResource(draft.value)
  toast.success('已添加')
  modalOpen.value = false
}

function remove(r: Resource) {
  if (!confirm(`确定删除「${r.title}」吗？`)) return
  schoolStore.removeResource(r.id)
  toast.info('已删除')
}

const tagInput = ref('')
function addTag() {
  const t = tagInput.value.trim()
  if (t && !draft.value.tags.includes(t)) {
    draft.value.tags.push(t)
    tagInput.value = ''
  }
}

const catColor: Record<string, string> = {
  官方平台: 'bg-butter-100 text-butter-600',
  教学素材: 'bg-sakura-100 text-sakura-500',
  工具: 'bg-mint-100 text-mint-500',
  班级管理: 'bg-sky2-100 text-sky2-500',
  其他: 'bg-cream-200 text-cocoa-700',
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300"
            :size="14"
          />
          <input
            v-model="search"
            class="input-soft !pl-9 !py-2 text-sm w-56"
            placeholder="搜索标题/标签/描述"
          >
        </div>
        <select
          v-model="catFilter"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部分类
          </option>
          <option
            v-for="c in categories"
            :key="c"
            :value="c"
          >
            {{ c }}
          </option>
        </select>
      </div>
      <button
        class="btn-primary"
        @click="openCreate"
      >
        <Plus :size="14" /> 添加资源
      </button>
    </div>

    <div
      v-if="filtered.length"
      class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <article
        v-for="r in filtered"
        :key="r.id"
        class="card-soft p-5 hover:-translate-y-0.5 transition relative"
      >
        <div class="flex items-start justify-between">
          <div
            class="w-11 h-11 rounded-2xl bg-butter-300/70 flex items-center justify-center text-xl"
          >
            <FolderOpen :size="20" />
          </div>
          <button
            class="p-1.5 rounded-full hover:bg-sakura-100"
            @click="remove(r)"
          >
            <Trash2 :size="13" />
          </button>
        </div>
        <h3 class="title-display text-base mt-3 line-clamp-1">
          {{ r.title }}
        </h3>
        <p class="text-xs text-cocoa-500 mt-1.5 line-clamp-2">
          {{ r.description || '暂无描述' }}
        </p>
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span
            class="chip text-[10px]"
            :class="catColor[r.category] || 'bg-cream-200 text-cocoa-700'"
          >
            {{ r.category }}
          </span>
          <span
            v-for="t in r.tags"
            :key="t"
            class="chip text-[10px] bg-white/70 text-cocoa-500"
          >
            #{{ t }}
          </span>
        </div>
        <a
          :href="r.url"
          target="_blank"
          rel="noopener"
          class="mt-3 inline-flex items-center gap-1 text-sm text-sky2-500 hover:underline"
        >
          <ExternalLink :size="12" /> 打开链接
        </a>
      </article>
    </div>
    <div
      v-else
      class="card-soft p-12 text-center text-cocoa-500"
    >
      <div class="text-5xl mb-2">
        📚
      </div>
      <div>还没有资源，先收藏一个吧</div>
    </div>

    <Modal
      :open="modalOpen"
      title="添加资源"
      width="560px"
      @close="modalOpen = false"
    >
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">资源名称</label>
          <input
            v-model="draft.title"
            class="input-soft mt-1"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">链接</label>
          <div class="relative mt-1">
            <Link2
              class="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300"
              :size="14"
            />
            <input
              v-model="draft.url"
              class="input-soft !pl-9"
              placeholder="https://..."
            >
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">分类</label>
            <select
              v-model="draft.category"
              class="input-soft mt-1"
            >
              <option>官方平台</option>
              <option>教学素材</option>
              <option>工具</option>
              <option>班级管理</option>
              <option>其他</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">标签</label>
            <div class="flex gap-1 mt-1">
              <input
                v-model="tagInput"
                class="input-soft"
                placeholder="输入后回车"
                @keyup.enter="addTag"
              >
              <button
                class="btn-secondary shrink-0"
                @click="addTag"
              >
                <Tag :size="14" />
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="(t, i) in draft.tags"
                :key="t"
                class="chip bg-butter-100 text-butter-600 text-[10px]"
              >
                {{ t }}
                <button @click="draft.tags.splice(i, 1)">
                  <X :size="10" />
                </button>
              </span>
            </div>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">简介</label>
          <textarea
            v-model="draft.description"
            class="input-soft mt-1 min-h-[80px]"
          />
        </div>
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
          <Save :size="14" /> 添加
        </button>
      </template>
    </Modal>
  </div>
</template>
