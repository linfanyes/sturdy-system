<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { Upload, ScanLine, FileText, CheckCircle2, XCircle } from 'lucide-vue-next'
import {
  previewTeachersFile, aiTeachersFile, importTeachersFile, batchCreateTeachers,
  previewStudentsFile, aiStudentsFile, importStudentsFile, batchCreateStudents,
  previewClassesFile, aiClassesFile, importClassesFile, batchCreateClasses,
  type ClassItem,
} from '@/api/school-admin'

const props = defineProps<{
  modelValue: boolean
  type: 'teacher' | 'student' | 'class'
  classes?: ClassItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'imported'): void
}>()

const TITLE: Record<string, string> = {
  teacher: '教师批量导入',
  student: '学生批量导入',
  class: '班级批量导入',
}

const COLUMN_META: Record<string, { key: string; label: string }[]> = {
  teacher: [
    { key: 'name', label: '姓名' },
    { key: 'gender', label: '性别' },
    { key: 'subject', label: '学科' },
    { key: 'phone', label: '手机号' },
  ],
  student: [
    { key: 'name', label: '姓名' },
    { key: 'gender', label: '性别' },
    { key: 'studentNo', label: '学号' },
    { key: 'parentName', label: '家长姓名' },
    { key: 'parentPhone', label: '家长电话' },
  ],
  class: [
    { key: 'name', label: '班级名称' },
    { key: 'grade', label: '年级' },
    { key: 'classNo', label: '班级序号' },
    { key: 'headTeacher', label: '班主任' },
    { key: 'term', label: '学期' },
  ],
}

const SAMPLES: Record<string, Record<string, string>> = {
  teacher: { name: '张三', gender: '男', subject: '语文', phone: '13800138000' },
  student: { name: '李四', gender: '女', studentNo: '2024001', parentName: '李四爸爸', parentPhone: '13900139000' },
  class: { name: '一年级1班', grade: '一年级', classNo: '1', headTeacher: '王老师', term: '2026秋季' },
}

const columns = computed(() => COLUMN_META[props.type] || [])
const acceptHint = '支持 .txt / .csv / .xls / .xlsx / .json（文本可用逗号或制表符分隔）'

const file = ref<File | null>(null)
const fileData = ref('')
const fileName = ref('')
const loading = ref(false)
const errorMsg = ref('')
const previewRows = ref<any[]>([])
const mode = ref<'file' | 'ai' | null>(null)

const classId = ref('')
const importing = ref(false)
const importResult = ref<any>(null)

function reset() {
  file.value = null
  fileData.value = ''
  fileName.value = ''
  loading.value = false
  errorMsg.value = ''
  previewRows.value = []
  mode.value = null
  classId.value = ''
  importing.value = false
  importResult.value = null
}

watch(() => props.modelValue, (open) => {
  if (open) reset()
})

function readFileBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(f)
  })
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0]
  if (!f) return
  errorMsg.value = ''
  previewRows.value = []
  mode.value = null
  file.value = f
  fileName.value = f.name
  try {
    fileData.value = await readFileBase64(f)
  } catch (err: any) {
    errorMsg.value = err?.message || '文件读取失败'
  }
}

async function parsePreview() {
  if (!fileData.value) { errorMsg.value = '请先选择文件'; return }
  loading.value = true
  errorMsg.value = ''
  try {
    const api = props.type === 'teacher' ? previewTeachersFile : props.type === 'student' ? previewStudentsFile : previewClassesFile
    const res = await api({ filename: fileName.value, data: fileData.value })
    previewRows.value = res.rows || []
    mode.value = 'file'
  } catch (e: any) {
    errorMsg.value = e?.message || '解析失败'
  } finally {
    loading.value = false
  }
}

async function aiRecognize() {
  if (!fileData.value) { errorMsg.value = '请先选择文件'; return }
  loading.value = true
  errorMsg.value = ''
  try {
    const api = props.type === 'teacher' ? aiTeachersFile : props.type === 'student' ? aiStudentsFile : aiClassesFile
    const res = await api({ filename: fileName.value, data: fileData.value })
    previewRows.value = res.rows || []
    mode.value = 'ai'
  } catch (e: any) {
    errorMsg.value = e?.message || 'AI 识别失败（请确认已在平台配置 AI 密钥）'
  } finally {
    loading.value = false
  }
}

function buildPayloadRows(): any[] {
  // 仅导入校验通过的有效行
  const valid = previewRows.value.filter((r) => r.valid)
  if (props.type === 'teacher') {
    return valid.map((r) => ({ name: r.name, gender: r.gender, subject: r.subject, phone: r.phone }))
  }
  if (props.type === 'student') {
    return valid.map((r) => ({ name: r.name, gender: r.gender, studentNo: r.studentNo, parentName: r.parentName, parentPhone: r.parentPhone, classId: classId.value }))
  }
  return valid.map((r) => ({ name: r.name, grade: r.grade, classNo: r.classNo, headTeacher: r.headTeacher, term: r.term }))
}

async function confirmImport() {
  if (!previewRows.value.length) { errorMsg.value = '请先解析或 AI 识别文件'; return }
  const valid = previewRows.value.filter((r) => r.valid)
  if (!valid.length) { errorMsg.value = '没有可导入的有效数据'; return }

  if (props.type === 'student' && !classId.value) {
    errorMsg.value = '请选择目标班级'
    return
  }

  importing.value = true
  errorMsg.value = ''
  try {
    let res: any
    if (mode.value === 'ai') {
      const rows = buildPayloadRows()
      if (props.type === 'teacher') res = await batchCreateTeachers(rows)
      else if (props.type === 'student') res = await batchCreateStudents(rows)
      else res = await batchCreateClasses(rows)
    } else {
      // 文件模式：后端按文件重新解析后再写入
      if (props.type === 'teacher') res = await importTeachersFile({ filename: fileName.value, data: fileData.value })
      else if (props.type === 'student') res = await importStudentsFile({ classId: classId.value, filename: fileName.value, data: fileData.value })
      else res = await importClassesFile({ filename: fileName.value, data: fileData.value })
    }
    importResult.value = res
    emit('imported')
  } catch (e: any) {
    errorMsg.value = e?.message || '导入失败'
  } finally {
    importing.value = false
  }
}

function downloadTemplate() {
  const meta = columns.value
  const header = meta.map((m) => m.label).join('\t')
  const sample = meta.map((m) => SAMPLES[props.type]?.[m.key] || '').join('\t')
  const content = header + '\n' + sample + '\n'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.type}-template.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Modal :model-value="modelValue" @update:model-value="(v: boolean) => emit('update:modelValue', v)" :title="TITLE[type]" width="max-w-3xl">
    <!-- 操作区 -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 cursor-pointer transition-colors">
          <Upload class="w-4 h-4" /> 选择文件
          <input type="file" class="hidden" accept=".txt,.csv,.xls,.xlsx,.json" @change="onFileChange" />
        </label>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30 transition-colors disabled:opacity-60"
          :disabled="!fileData || loading"
          @click="parsePreview"
        >
          <FileText class="w-4 h-4" /> 解析预览
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-200 text-cocoa-700 text-sm font-medium hover:bg-cream-300 transition-colors disabled:opacity-60"
          :disabled="!fileData || loading"
          @click="aiRecognize"
        >
          <ScanLine class="w-4 h-4" /> AI 识别
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cream-200 text-cocoa-500 text-sm hover:bg-cream-50 transition-colors"
          @click="downloadTemplate"
        >
          下载模板
        </button>
        <span v-if="fileName" class="text-xs text-cocoa-500 truncate max-w-[200px]">{{ fileName }}</span>
      </div>

      <p class="text-xs text-cocoa-400">{{ acceptHint }}；模板首行为标题，可删；性别填 男/女，班级导入的班主任须为校内已有教师姓名。</p>

      <div v-if="type === 'student'" class="flex items-center gap-2">
        <label class="text-sm text-cocoa-500">目标班级 *</label>
        <select v-model="classId" class="px-3 py-1.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400">
          <option value="">请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div v-if="errorMsg" class="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ errorMsg }}</div>

      <!-- 预览表 -->
      <div v-if="previewRows.length" class="border border-cream-200 rounded-xl overflow-auto max-h-72">
        <table class="w-full text-sm">
          <thead class="bg-cream-100 text-cocoa-500 text-left sticky top-0">
            <tr>
              <th class="px-3 py-2 font-medium">行</th>
              <th v-for="m in columns" :key="m.key" class="px-3 py-2 font-medium">{{ m.label }}</th>
              <th class="px-3 py-2 font-medium">校验</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="(r, idx) in previewRows" :key="idx" :class="r.valid ? '' : 'bg-red-50/40'">
              <td class="px-3 py-1.5 text-cocoa-400">{{ r.line || idx + 1 }}</td>
              <td v-for="m in columns" :key="m.key" class="px-3 py-1.5 text-cocoa-800">{{ r[m.key] || '-' }}</td>
              <td class="px-3 py-1.5">
                <span v-if="r.valid" class="text-mint-500 text-xs inline-flex items-center gap-0.5"><CheckCircle2 class="w-3.5 h-3.5" />有效</span>
                <span v-else class="text-red-500 text-xs inline-flex items-center gap-0.5"><XCircle class="w-3.5 h-3.5" />{{ r.error }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 导入结果 -->
      <div v-if="importResult" class="rounded-xl bg-mint-50 border border-mint-200 px-3 py-2 text-sm text-mint-600">
        导入完成：共 {{ importResult.total }} 条，成功 <b>{{ importResult.success }}</b> 条，失败 <b>{{ importResult.failed }}</b> 条。
        <ul v-if="importResult.failed > 0" class="mt-1 space-y-0.5 text-xs text-red-500">
          <li v-for="(it, i) in (importResult.results || []).filter((x: any) => x.status === '失败')" :key="i">
            {{ it.name || it.headTeacher || '-' }}：{{ it.error }}
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="close">关闭</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="!previewRows.length || importing || (type === 'student' && !classId)"
        @click="confirmImport"
      >
        {{ importing ? '导入中…' : '确认导入' }}
      </button>
    </template>
  </Modal>
</template>
