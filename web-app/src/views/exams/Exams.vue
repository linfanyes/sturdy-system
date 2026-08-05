<script setup lang="ts">
/**
 * 考试管理
 * - 新增考试时学期默认为当前学期，无需手动设置
 * - 双击考试行查看本次考试的汇总信息（各科成绩统计）
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import Modal from '@/components/Modal.vue'
import { Plus, Search, Edit3, Trash2, BarChart3, X, Upload } from 'lucide-vue-next'

const router = useRouter()

const { classes } = useClasses()
const loading = ref(false)
const items = ref<any[]>([])
const keyword = ref('')
const classId = ref('')
const showForm = ref(false)
const editing = ref<any | null>(null)
const formLoading = ref(false)

const SUBJECTS = ['语文', '数学', '英语', '科学', '物理', '化学', '生物', '政治', '历史', '地理', '音乐', '体育', '美术', '信息技术', '道德与法治']

const form = ref<Record<string, any>>({})

/** 当前学期：9月-次年2月为第一学期，3-8月为第二学期 */
function currentTerm() {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 8 ? `${y}-${y + 1}学年第一学期` : `${y - 1}-${y}学年第二学期`
}

const filtered = computed(() => {
  let list = items.value
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(e =>
      e.name?.toLowerCase().includes(kw) ||
      e.term?.toLowerCase().includes(kw),
    )
  }
  return list
})

async function loadList() {
  loading.value = true
  try {
    const params: Record<string, any> = { take: 500 }
    if (classId.value) params.classId = classId.value
    const res = await request.get('/exams', { params })
    items.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  await loadList()
})

function className(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

function openCreate() {
  editing.value = null
  form.value = {
    name: '',
    classId: classId.value || '',
    term: currentTerm(),
    subjects: [],
    date: new Date().toISOString().slice(0, 10),
    note: '',
    subjectFullScores: {},
  }
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  form.value = { ...row, subjects: [...(row.subjects || [])] }
  showForm.value = true
}

async function submitForm() {
  if (!form.value.name) { alert('请填写考试名称'); return }
  if (!form.value.classId) { alert('请选择班级'); return }
  formLoading.value = true
  try {
    if (editing.value) {
      const res = await request.patch(`/exams/${editing.value.id}`, form.value)
      const idx = items.value.findIndex(x => x.id === editing.value.id)
      if (idx >= 0) items.value[idx] = { ...items.value[idx], ...form.value, ...res }
    } else {
      const res = await request.post('/exams', form.value)
      if (res?.id) items.value.unshift(res)
    }
    showForm.value = false
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(row: any) {
  if (!await confirm(`确定删除考试「${row.name}」？`)) return
  try {
    await request.delete(`/exams/${row.id}`)
    items.value = items.value.filter(x => x.id !== row.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 考试汇总（双击查看） ============ */
const summaryVisible = ref(false)
const summaryExam = ref<any | null>(null)
const summaryLoading = ref(false)
const summaryData = ref<any[]>([])

async function openSummary(row: any) {
  summaryExam.value = row
  summaryVisible.value = true
  summaryLoading.value = true
  summaryData.value = []
  try {
    // 查询该班级、该考试名称的所有成绩记录
    const res = await request.get('/grades', { params: { classId: row.classId, take: 500 } })
    const grades = Array.isArray(res) ? res : (res?.items || [])
    // 过滤出本次考试的成绩
    const examGrades = grades.filter((g: any) => g.examName === row.name || g.examId === row.id)
    // 按科目汇总
    const subjects = row.subjects?.length ? row.subjects : [...new Set(examGrades.map((g: any) => g.subject))]
    summaryData.value = subjects.map((subj: string) => {
      const grade = examGrades.find((g: any) => g.subject === subj)
      const scores = (grade?.scores || []).filter((s: any) => s.score != null).map((s: any) => s.score)
      if (!scores.length) {
        return { subject: subj, count: 0, avg: '-', max: '-', min: '-', passRate: '-', excellentRate: '-', status: '未录入' }
      }
      const avg = (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1)
      const max = Math.max(...scores)
      const min = Math.min(...scores)
      const passCount = scores.filter((s: number) => s >= 60).length
      const excellentCount = scores.filter((s: number) => s >= 85).length
      return {
        subject: subj,
        count: scores.length,
        avg,
        max,
        min,
        passRate: ((passCount / scores.length) * 100).toFixed(1) + '%',
        excellentRate: ((excellentCount / scores.length) * 100).toFixed(1) + '%',
        status: '已录入',
      }
    })
  } catch (e: any) {
    alert(e?.message || '加载汇总失败')
  } finally {
    summaryLoading.value = false
  }
}

function onRowDblClick(row: any) {
  router.push({ path: '/teacher/exam-detail', query: { examId: row.id, classId: row.classId } })
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">考试管理</h1>
      <div class="flex items-center gap-2">
        <select
          v-model="classId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          @change="loadList"
        >
          <option value="">全部班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="keyword"
            placeholder="搜索考试名称"
            class="pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm w-48 focus:outline-none focus:border-butter-400"
          />
        </div>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
          @click="openCreate"
        >
          <Plus class="w-4 h-4" /> 新增考试
        </button>
      </div>
    </div>

    <div class="text-xs text-cocoa-400">提示：双击考试行可查看本次考试的汇总信息</div>

    <!-- 列表 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">考试名称</th>
            <th class="px-4 py-3 font-medium">班级</th>
            <th class="px-4 py-3 font-medium">学期</th>
            <th class="px-4 py-3 font-medium">科目</th>
            <th class="px-4 py-3 font-medium">日期</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">加载中…</td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">暂无考试数据</td>
          </tr>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="hover:bg-cream-50 transition-colors cursor-pointer"
            @dblclick="onRowDblClick(row)"
          >
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ row.name }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ className(row.classId) }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.term || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">
              <span v-if="row.subjects?.length" class="flex flex-wrap gap-1">
                <span v-for="s in row.subjects" :key="s" class="text-xs px-1.5 py-0.5 rounded bg-butter-100 text-butter-600">{{ s }}</span>
              </span>
              <span v-else>-</span>
            </td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.date || '-' }}</td>
            <td class="px-4 py-3 text-right space-x-1">
              <button class="p-1.5 rounded-lg hover:bg-butter-100 text-butter-500" title="查看详情" @click.stop="onRowDblClick(row)">
                <BarChart3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-500" title="编辑" @click.stop="openEdit(row)">
                <Edit3 class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click.stop="handleDelete(row)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 新增/编辑模态框 -->
  <Modal v-model="showForm" :title="editing ? '编辑考试' : '新增考试'" width="max-w-2xl">
    <div class="space-y-3">
      <div>
        <label class="text-sm text-cocoa-500">考试名称 *</label>
        <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" placeholder="如：2024春季期中考试" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">班级 *</label>
          <select v-model="form.classId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">学期（默认当前学期）</label>
          <input v-model="form.term" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 bg-cream-50 focus:outline-none focus:border-butter-400" />
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">考试日期</label>
        <input v-model="form.date" type="date" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
      </div>
      <div>
        <label class="text-sm text-cocoa-500">考试科目</label>
        <div class="mt-1 flex flex-wrap gap-2">
          <label
            v-for="s in SUBJECTS"
            :key="s"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 rounded-xl border cursor-pointer text-sm transition-colors',
              (form.subjects || []).includes(s)
                ? 'border-butter-400 bg-butter-100/50 text-cocoa-900'
                : 'border-cream-200 hover:bg-cream-50 text-cocoa-700',
            ]"
          >
            <input
              type="checkbox"
              :checked="(form.subjects || []).includes(s)"
              class="rounded text-butter-500"
              @change="() => {
                if (!form.subjects) form.subjects = []
                const i = form.subjects.indexOf(s)
                if (i >= 0) form.subjects.splice(i, 1)
                else form.subjects.push(s)
              }"
            />
            {{ s }}
          </label>
        </div>
      </div>
      <div>
        <label class="text-sm text-cocoa-500">备注</label>
        <textarea v-model="form.note" rows="2" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none" />
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showForm = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="formLoading || !form.name || !form.classId" @click="submitForm">
        {{ formLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 考试汇总弹窗 -->
  <Modal v-model="summaryVisible" :title="`考试汇总 · ${summaryExam?.name || ''}`" width="max-w-3xl">
    <div v-if="summaryLoading" class="text-center text-cocoa-400 py-8">加载中…</div>
    <div v-else>
      <div class="text-sm text-cocoa-500 mb-3">
        班级：{{ className(summaryExam?.classId || '') }} · 学期：{{ summaryExam?.term || '-' }} · 日期：{{ summaryExam?.date || '-' }}
      </div>
      <div v-if="!summaryData.length" class="text-center text-cocoa-400 py-8">暂无成绩数据</div>
      <div v-else class="overflow-x-auto"><table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-3 py-2 font-medium">科目</th>
            <th class="px-3 py-2 font-medium">状态</th>
            <th class="px-3 py-2 font-medium">参评人数</th>
            <th class="px-3 py-2 font-medium">平均分</th>
            <th class="px-3 py-2 font-medium">最高分</th>
            <th class="px-3 py-2 font-medium">最低分</th>
            <th class="px-3 py-2 font-medium">及格率</th>
            <th class="px-3 py-2 font-medium">优秀率</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="s in summaryData" :key="s.subject" class="hover:bg-cream-50">
            <td class="px-3 py-2 font-medium text-cocoa-900">{{ s.subject }}</td>
            <td class="px-3 py-2">
              <span :class="['text-xs px-2 py-0.5 rounded-full', s.status === '已录入' ? 'bg-mint-100 text-mint-500' : 'bg-cream-100 text-cocoa-400']">{{ s.status }}</span>
            </td>
            <td class="px-3 py-2 text-cocoa-700">{{ s.count }}</td>
            <td class="px-3 py-2 text-cocoa-700 font-semibold">{{ s.avg }}</td>
            <td class="px-3 py-2 text-cocoa-700">{{ s.max }}</td>
            <td class="px-3 py-2 text-cocoa-700">{{ s.min }}</td>
            <td class="px-3 py-2 text-cocoa-700">{{ s.passRate }}</td>
            <td class="px-3 py-2 text-cocoa-700">{{ s.excellentRate }}</td>
          </tr>
        </tbody>
      </table>
</div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="summaryVisible = false">关闭</button>
    </template>
  </Modal>
</template>
