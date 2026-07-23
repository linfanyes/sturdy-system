<script setup lang="ts">
import { ref, computed } from 'vue'
import { useParentContactStore } from '../../stores/parentContact'
import { useToastStore } from '../../stores/toast'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import Modal from '../../components/common/Modal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Copy } from 'lucide-vue-next'
import type { NoticeTemplate } from '../../types'

const templateStore = useParentContactStore()
const toast = useToastStore()

const categories = ['考试通知', '家长会', '活动通知', '放假通知', '作业提醒', '安全提醒', '其他']
const activeCat = ref<string>('全部')

const modalOpen = ref(false)
const editing = ref<NoticeTemplate | null>(null)
const draft = ref<{ title: string; category: NoticeTemplate['category']; content: string }>({
  title: '',
  category: '考试通知',
  content: '',
})

const filtered = computed(() => {
  let list = [...templateStore.templates].sort((a, b) => b.createdAt - a.createdAt)
  if (activeCat.value !== '全部') list = list.filter(t => t.category === activeCat.value)
  return list
})

function openCreate() {
  editing.value = null
  draft.value = { title: '', category: '考试通知', content: '' }
  modalOpen.value = true
}

function openEdit(t: NoticeTemplate) {
  editing.value = t
  draft.value = { title: t.title, category: t.category, content: t.content }
  modalOpen.value = true
}

function save() {
  if (!draft.value.title.trim()) { toast.warning('请输入模板标题'); return }
  if (!draft.value.content.trim()) { toast.warning('请输入模板内容'); return }
  if (editing.value) {
    templateStore.updateTemplate(editing.value.id, draft.value)
    toast.success('已更新')
  } else {
    templateStore.addTemplate(draft.value)
    toast.success('已创建')
  }
  modalOpen.value = false
}

function remove(t: NoticeTemplate) {
  if (!confirm(`确定删除「${t.title}」？`)) return
  templateStore.removeTemplate(t.id)
  toast.info('已删除')
}

function copyContent(t: NoticeTemplate) {
  navigator.clipboard.writeText(t.content).then(() => toast.success('已复制到剪贴板'))
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="📋"
      title="通知模板管理"
      description="常用通知模板，一键复制快速发送"
      gradient="from-mint-100 via-cream-50 to-sky2-100"
    />

    <div class="flex items-center gap-2 flex-wrap">
      <button v-for="cat in ['全部', ...categories]" :key="cat"
        class="chip cursor-pointer" :class="activeCat === cat ? 'bg-mint-300 text-mint-700' : 'bg-cocoa-100 text-cocoa-500'"
        @click="activeCat = cat">{{ cat }}</button>
      <button class="btn-primary ml-auto" @click="openCreate">
        <Plus :size="14" /> 新建模板
      </button>
    </div>

    <div v-if="!filtered.length" class="mt-8">
      <EmptyState title="还没有通知模板" desc="创建模板后，一键复制快速发送通知" icon="📋" />
    </div>

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <div v-for="t in filtered" :key="t.id" class="card-soft p-5 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="title-display text-base">{{ t.title }}</h3>
              <span class="chip bg-mint-100 text-mint-500 text-[10px]">{{ t.category }}</span>
            </div>
            <p class="text-sm text-cocoa-600 mt-2 whitespace-pre-line line-clamp-6">{{ t.content }}</p>
          </div>
        </div>
        <div class="flex gap-1 mt-3">
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="copyContent(t)"><Copy :size="12" /> 复制</button>
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(t)">编辑</button>
          <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(t)"><Trash2 :size="12" /></button>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑模板' : '新建模板'" width="560px" @close="modalOpen = false">
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500">标题</label>
          <input v-model="draft.title" class="input-soft" placeholder="如：期中考试成绩通知" />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">分类</label>
          <select v-model="draft.category" class="input-soft">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">模板内容</label>
          <textarea v-model="draft.content" class="input-soft" rows="8" placeholder="尊敬的家长...&#10;&#10;  模板中可使用 {学生姓名}、{班级} 等占位符" />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
