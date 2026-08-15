<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useClasses, classNameById } from '@/composables/useClasses'
import { getAssignments, createAssignment, updateAssignment, deleteAssignment } from '@/api/assignment'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const items = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const form = ref<any>({})

async function load() {
  if (!classId.value) return
  loading.value = true
  try {
    items.value = await getAssignments(classId.value)
  } finally {
    loading.value = false
  }
}
function openAdd() {
  form.value = { subject: '', title: '', content: '', contentBasic: '', contentImprove: '', contentExtend: '', dueDate: '' }
  showModal.value = true
}
function openEdit(it: any) {
  form.value = { ...it }
  showModal.value = true
}
async function save() {
  const f = { ...form.value, classId: classId.value, className: classNameById(classId.value) }
  if (f.id) await updateAssignment(f.id, f)
  else await createAssignment(f)
  showModal.value = false
  load()
}
async function remove() {
  if (!form.value.id) return
  await deleteAssignment(form.value.id)
  showModal.value = false
  load()
}

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) {
    classId.value = classes.value[0].id
    load()
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl p-4">
    <div class="mb-4 flex items-center gap-3">
      <h2 class="text-xl font-semibold text-gray-800">分层作业布置</h2>
      <select v-model="classId" @change="load" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="rounded bg-sky-500 px-3 py-1.5 text-sm text-white hover:bg-sky-600" @click="openAdd">＋ 布置作业</button>
    </div>

    <div v-if="loading" class="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-400">加载中…</div>
    <div v-else-if="!items.length" class="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-gray-400">
      暂无作业，点击「布置作业」按 基础 / 提高 / 拓展 三层发布。
    </div>

    <div v-else class="space-y-3">
      <div v-for="it in items" :key="it.id" class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="mb-2 flex items-center justify-between">
          <div>
            <span class="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">{{ it.subject }}</span>
            <span class="ml-2 font-medium text-gray-800">{{ it.title }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span v-if="it.dueDate">截止 {{ it.dueDate }}</span>
            <button class="text-sky-500 hover:underline" @click="openEdit(it)">编辑</button>
          </div>
        </div>
        <p v-if="it.content" class="mb-2 text-sm text-gray-600">{{ it.content }}</p>
        <div class="grid gap-2 sm:grid-cols-3">
          <div class="rounded bg-emerald-50 p-2">
            <div class="text-xs font-medium text-emerald-700">基础层</div>
            <div class="mt-1 text-xs text-gray-600">{{ it.contentBasic || '—' }}</div>
          </div>
          <div class="rounded bg-amber-50 p-2">
            <div class="text-xs font-medium text-amber-700">提高层</div>
            <div class="mt-1 text-xs text-gray-600">{{ it.contentImprove || '—' }}</div>
          </div>
          <div class="rounded bg-purple-50 p-2">
            <div class="text-xs font-medium text-purple-700">拓展层</div>
            <div class="mt-1 text-xs text-gray-600">{{ it.contentExtend || '—' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑 / 新增弹窗 -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showModal = false">
      <div class="w-[480px] max-h-[88vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">{{ form.id ? '编辑作业' : '布置作业' }}</h3>
        <div class="space-y-3">
          <div class="flex gap-3">
            <label class="flex-1 text-sm">学科
              <input v-model="form.subject" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="如 数学" />
            </label>
            <label class="flex-1 text-sm">标题
              <input v-model="form.title" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="如 第一单元练习" />
            </label>
          </div>
          <label class="block text-sm">总说明
            <textarea v-model="form.content" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="作业总体要求" />
          </label>
          <label class="block text-sm">截止日期
            <input v-model="form.dueDate" type="date" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label class="block text-sm">基础层（全员）
            <textarea v-model="form.contentBasic" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="基础必做" />
          </label>
          <label class="block text-sm">提高层（学有余力）
            <textarea v-model="form.contentImprove" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="进阶练习" />
          </label>
          <label class="block text-sm">拓展层（探究）
            <textarea v-model="form.contentExtend" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" placeholder="探究/项目" />
          </label>
          <div class="flex justify-end gap-2 pt-2">
            <button v-if="form.id" class="rounded bg-rose-50 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-100" @click="remove">删除</button>
            <button class="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200" @click="showModal = false">取消</button>
            <button class="rounded bg-sky-500 px-4 py-1.5 text-sm text-white hover:bg-sky-600" @click="save">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
