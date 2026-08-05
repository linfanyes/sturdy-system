<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, Edit3, Trash2, ClipboardList, Star, RefreshCw } from 'lucide-vue-next'

const router = useRouter()

interface LessonRecord {
  id: string
  teacherName: string
  subject: string
  topic: string
  date: string
  strengths: string
  suggestions: string
  overallRating: string
  createdAt: string
}

const STORAGE_KEY = 'web_lesson_observations'
const list = ref<LessonRecord[]>([])
const show = ref(false)
const editing = ref<LessonRecord | null>(null)
const form = ref<LessonRecord>(defaultForm())

const ratings = ['优秀', '良好', '一般', '待改进']

function defaultForm(): LessonRecord {
  return {
    id: '', teacherName: '', subject: '', topic: '',
    date: new Date().toISOString().slice(0, 10),
    strengths: '', suggestions: '', overallRating: '良好',
    createdAt: '',
  }
}

function load() {
  try {
    list.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    list.value.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch { list.value = [] }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value))
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function openCreate() {
  form.value = defaultForm()
  editing.value = null
  show.value = true
}

function openEdit(rec: LessonRecord) {
  form.value = { ...rec }
  editing.value = rec
  show.value = true
}

function save() {
  if (!form.value.teacherName.trim() || !form.value.topic.trim()) {
    alert('请填写授课教师和听课主题')
    return
  }
  if (editing.value) {
    const idx = list.value.findIndex((i) => i.id === editing.value!.id)
    if (idx >= 0) list.value[idx] = { ...form.value, createdAt: editing.value!.createdAt }
  } else {
    list.value.unshift({ ...form.value, id: uid(), createdAt: new Date().toISOString() })
  }
  persist()
  show.value = false
}

async function remove(rec: LessonRecord) {
  if (!await confirm(`确认删除「${rec.topic}」这条听课记录？`)) return
  list.value = list.value.filter((i) => i.id !== rec.id)
  persist()
}

function ratingColor(r: string): string {
  const map: Record<string, string> = {
    '优秀': 'text-green-600 bg-green-50 border-green-200',
    '良好': 'text-blue-600 bg-blue-50 border-blue-200',
    '一般': 'text-orange-600 bg-orange-50 border-orange-200',
    '待改进': 'text-red-600 bg-red-50 border-red-200',
  }
  return map[r] || 'text-cocoa-600 bg-cream-100 border-cocoa-200'
}

load()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/tools')">
      <ArrowLeft class="w-4 h-4" /> 返回工具箱
    </button>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <ClipboardList class="w-6 h-6 text-butter-500" /> 听课记录
      </h1>
      <div class="flex gap-2">
        <button class="flex items-center gap-1 px-3 py-2 text-cocoa-500 rounded-xl text-sm border border-cocoa-200 hover:bg-cream-100" @click="load">
          <RefreshCw class="w-4 h-4" /> 刷新
        </button>
        <button class="flex items-center gap-1 px-4 py-2 bg-butter-500 text-white rounded-xl text-sm hover:bg-butter-600" @click="openCreate">
          <Plus class="w-4 h-4" /> 新增
        </button>
      </div>
    </div>

    <p v-if="list.length" class="text-cocoa-400 text-xs">共 {{ list.length }} 条记录（本地保存）</p>

    <!-- 空状态 -->
    <div v-if="list.length === 0" class="text-center py-12 text-cocoa-400 bg-surface rounded-2xl shadow-softer">
      <ClipboardList class="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p>暂无听课记录</p>
      <p class="text-xs mt-1">点击「新增」添加记录</p>
    </div>

    <!-- 记录列表 -->
    <div v-for="rec in list" :key="rec.id" class="bg-surface rounded-2xl p-4 shadow-softer space-y-2">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="font-semibold text-cocoa-800">{{ rec.topic }}</h3>
          <div class="flex flex-wrap gap-2 text-xs text-cocoa-500 mt-1">
            <span>👤 {{ rec.teacherName }}</span>
            <span>📚 {{ rec.subject }}</span>
            <span>📅 {{ rec.date }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <span class="px-2 py-0.5 rounded-full text-xs font-medium border" :class="ratingColor(rec.overallRating)">
            <Star class="w-3 h-3 inline mr-0.5" />{{ rec.overallRating }}
          </span>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-400" title="编辑" @click="openEdit(rec)">
            <Edit3 class="w-4 h-4" />
          </button>
          <button class="p-1.5 rounded-lg hover:bg-cream-100 text-red-400" title="删除" @click="remove(rec)">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div v-if="rec.strengths" class="text-sm">
        <span class="text-green-600 font-medium">亮点：</span>
        <span class="text-cocoa-600">{{ rec.strengths }}</span>
      </div>
      <div v-if="rec.suggestions" class="text-sm">
        <span class="text-orange-600 font-medium">建议：</span>
        <span class="text-cocoa-600">{{ rec.suggestions }}</span>
      </div>
    </div>

    <!-- 遮罩 + 表单弹窗 -->
    <div v-if="show" class="fixed inset-0 z-50 flex items-end justify-center" @click.self="show = false">
      <div class="fixed inset-0 bg-black/30" @click="show = false"></div>
      <div class="relative bg-surface rounded-t-2xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto shadow-xl">
        <h2 class="text-lg font-bold text-cocoa-800 mb-4">{{ editing ? '编辑' : '新增' }}听课记录</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-cocoa-500">授课教师 *</label>
            <input v-model="form.teacherName" placeholder="教师姓名" class="w-full mt-1 px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-cocoa-500">科目</label>
              <input v-model="form.subject" placeholder="语文/数学..." class="w-full mt-1 px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300" />
            </div>
            <div>
              <label class="text-xs text-cocoa-500">日期</label>
              <input v-model="form.date" type="date" class="w-full mt-1 px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300" />
            </div>
          </div>
          <div>
            <label class="text-xs text-cocoa-500">听课主题 *</label>
            <input v-model="form.topic" placeholder="如：分数的基本性质" class="w-full mt-1 px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">总体评价</label>
            <div class="flex gap-2 mt-1">
              <button v-for="r in ratings" :key="r"
                class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                :class="form.overallRating === r ? ratingColor(r).split(' ').slice(0,2).join(' ') : 'text-cocoa-500 border-cocoa-200 bg-surface hover:bg-cream-50'"
                @click="form.overallRating = r">{{ r }}</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-cocoa-500">亮点</label>
            <textarea v-model="form.strengths" placeholder="课堂教学亮点" rows="3" class="w-full mt-1 px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300 resize-y"></textarea>
          </div>
          <div>
            <label class="text-xs text-cocoa-500">改进建议</label>
            <textarea v-model="form.suggestions" placeholder="改进建议" rows="3" class="w-full mt-1 px-3 py-2 border border-cocoa-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-butter-300 resize-y"></textarea>
          </div>
          <div class="flex gap-2 pt-2">
            <button class="flex-1 py-2.5 bg-butter-500 text-white rounded-xl text-sm font-medium hover:bg-butter-600" @click="save">保存</button>
            <button class="flex-1 py-2.5 bg-cream-100 text-cocoa-600 rounded-xl text-sm border border-cocoa-200 hover:bg-cream-200" @click="show = false">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
