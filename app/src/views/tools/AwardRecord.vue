<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Award,
  Plus,
  Search,
  Tag,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  Settings,
  Save,
  ImagePlus,
  Zap,
} from 'lucide-vue-next'
import { useAwardStore } from '../../stores/award'
import { useToastStore } from '../../stores/toast'
import { useAIStore } from '../../stores/ai'
import { AI_DASHSCOPE_BASE_URL } from '../../utils/aiBase'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import Modal from '../../components/common/Modal.vue'
import { isVisionModel, VISION_MODEL_EXAMPLES } from '../../utils/aiCall'

const awardStore = useAwardStore()
const toast = useToastStore()
const ai = useAIStore()

// ========== 筛选 ==========
const searchKeyword = ref('')
const filterYear = ref('')
const filterTag = ref('')
const filterCategory = ref('')

// 展开/收起的年份
const expandedYears = ref<Set<string>>(new Set())

// 获奖记录表单
const formOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({
  name: '',
  issuer: '',
  date: new Date().toISOString().slice(0, 10),
  level: '',
  image: '',
  tags: [] as string[],
  note: '',
  ratingScore: 0,
})

// 图片识别相关
const recognizing = ref(false)
const imageInputEl = ref<HTMLInputElement | null>(null)

// 分类管理
const categoryModalOpen = ref(false)
const newCategoryName = ref('')
const newCategoryColor = ref('#f5c542')

// 预设颜色
const presetColors = [
  '#f5c542', '#f472b6', '#60a5fa', '#4ade80', '#a78bfa',
  '#fb923c', '#34d399', '#f87171', '#38bdf8', '#c084fc',
]

// 批量设置评级分
const ratingBatchOpen = ref(false)
const batchRatingScore = ref(0)
function onRatingPreset(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  if (Number.isFinite(v)) form.value.ratingScore = v
}
function openRatingBatch() {
  batchRatingScore.value = 0
  ratingBatchOpen.value = true
}
function applyRatingBatch() {
  awardStore.setAllRatingScore(Number(batchRatingScore.value))
  toast.success('已批量设置评级分')
  ratingBatchOpen.value = false
}

// ========== 计算属性 ==========
const filteredRecords = computed(() => {
  let list = [...awardStore.records]
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.issuer.toLowerCase().includes(kw) ||
        r.level.toLowerCase().includes(kw) ||
        r.note.toLowerCase().includes(kw),
    )
  }
  if (filterYear.value) {
    list = list.filter((r) => r.date?.startsWith(filterYear.value))
  }
  if (filterTag.value) {
    list = list.filter((r) => r.tags.includes(filterTag.value))
  }
  if (filterCategory.value) {
    list = list.filter((r) => r.tags.includes(filterCategory.value))
  }
  // 按日期降序
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const filteredByYear = computed(() => {
  const map = new Map<string, typeof filteredRecords.value>()
  for (const r of filteredRecords.value) {
    const year = r.date ? r.date.slice(0, 4) : '未知'
    if (!map.has(year)) map.set(year, [])
    map.get(year)!.push(r)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
})

const totalCount = computed(() => awardStore.records.length)

// ========== 方法 ==========
function openAddForm() {
  editingId.value = null
  form.value = {
    name: '',
    issuer: '',
    date: new Date().toISOString().slice(0, 10),
    level: '',
    image: '',
    tags: [],
    note: '',
    ratingScore: 0,
  }
  formOpen.value = true
}

function openEditForm(id: string) {
  const r = awardStore.getAward(id)
  if (!r) return
  editingId.value = id
  form.value = {
    name: r.name,
    issuer: r.issuer,
    date: r.date,
    level: r.level,
    image: r.image || '',
    tags: [...r.tags],
    note: r.note,
    ratingScore: r.ratingScore ?? 0,
  }
  formOpen.value = true
}

function saveForm() {
  if (!form.value.name.trim()) {
    toast.warning('请填写奖项名称')
    return
  }
  if (editingId.value) {
    awardStore.updateAward(editingId.value, { ...form.value })
    toast.success('已更新获奖记录')
  } else {
    awardStore.addAward({ ...form.value })
    toast.success('已添加获奖记录')
  }
  formOpen.value = false
}

function deleteAward(id: string) {
  if (!confirm('确定删除这条获奖记录吗？')) return
  awardStore.removeAward(id)
  toast.success('已删除')
}

function toggleYear(year: string) {
  if (expandedYears.value.has(year)) {
    expandedYears.value.delete(year)
  } else {
    expandedYears.value.add(year)
  }
  expandedYears.value = new Set(expandedYears.value)
}

// 选择奖状图片
function pickImage() {
  imageInputEl.value?.click()
}

function onImagePicked(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.value.image = reader.result as string
  }
  reader.readAsDataURL(file)
  target.value = ''
}

function removeImage() {
  form.value.image = ''
}

// AI 识别奖状图片
async function recognizeImage() {
  if (!form.value.image) {
    toast.warning('请先上传奖状图片')
    return
  }
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话」中配置 API Key')
    return
  }
  if (!isVisionModel(ai.settings.model)) {
    toast.error(
      `当前模型「${ai.settings.model}」不支持图片识别。请在 AI 设置中切换到多模态模型，如：${VISION_MODEL_EXAMPLES.slice(0, 3).join(' / ')}`,
    )
    return
  }

  recognizing.value = true
  try {
    const baseUrl = (ai.settings.baseUrl || AI_DASHSCOPE_BASE_URL).replace(/\/$/, '')
    const resp = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ai.settings.apiKey,
      },
      body: JSON.stringify({
        model: ai.settings.model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              '你是一名奖状文字识别助手。请仔细识别图片中的奖状内容，提取以下信息：\n' +
              '1. name: 奖项名称（如：优秀教师、一等奖、教学能手等）\n' +
              '2. issuer: 颁发机构（如：教育局、学校等）\n' +
              '3. date: 获奖日期（格式 YYYY-MM-DD，识别不到具体年月日就填最近的合理日期）\n' +
              '4. level: 奖项等级（如：一等奖、二等奖、优秀奖、国家级、省级、市级等）\n' +
              '5. note: 其他重要信息摘要\n\n' +
              '请严格以 JSON 格式输出，不要任何额外说明。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请识别这张奖状的内容' },
              { type: 'image_url', image_url: { url: form.value.image } },
            ],
          },
        ],
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error('请求失败: ' + resp.status + ' ' + errText.slice(0, 200))
    }
    const data = await resp.json()
    const text = data.choices?.[0]?.message?.content || ''

    // 解析 JSON
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    try {
      const result = JSON.parse(cleaned)
      if (result.name) form.value.name = result.name
      if (result.issuer) form.value.issuer = result.issuer
      if (result.date) form.value.date = result.date
      if (result.level) form.value.level = result.level
      if (result.note) form.value.note = result.note
      toast.success('识别成功，请核对信息')
    } catch {
      // 如果不是 JSON，就把内容填到备注里
      form.value.note = text
      toast.warning('未能解析为结构化数据，已将识别内容填入备注')
    }
  } catch (e: any) {
    toast.error('识别失败：' + (e?.message || '未知错误'))
  } finally {
    recognizing.value = false
  }
}

// 标签输入
const tagInput = ref('')
function addTag(tag: string) {
  const t = tag.trim()
  if (!t || form.value.tags.includes(t)) return
  form.value.tags.push(t)
  tagInput.value = ''
}
function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter((t) => t !== tag)
}

// 分类管理
function addCategory() {
  if (!newCategoryName.value.trim()) {
    toast.warning('请输入分类名称')
    return
  }
  awardStore.addCategory(newCategoryName.value.trim(), newCategoryColor.value)
  newCategoryName.value = ''
  toast.success('已添加分类')
}
function deleteCategory(id: string) {
  if (!confirm('确定删除这个分类吗？')) return
  awardStore.removeCategory(id)
  toast.success('已删除')
}

// 重置筛选
function resetFilters() {
  searchKeyword.value = ''
  filterYear.value = ''
  filterTag.value = ''
  filterCategory.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🏆"
      title="获奖记录"
      description="记录你的每一份荣誉，支持图片AI识别、年份分类、自定义标签"
      gradient="from-butter-100 via-cream-50 to-sakura-100"
      status-text="AI 智能识别"
      status-color="bg-butter-100 text-butter-700"
    />

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-flat p-4 text-center">
        <div class="text-2xl font-bold text-butter-500">
          {{ totalCount }}
        </div>
        <div class="text-xs text-cocoa-400 mt-1">获奖总数</div>
      </div>
      <div class="card-flat p-4 text-center">
        <div class="text-2xl font-bold text-sakura-500">
          {{ awardStore.ratingTotal }}
        </div>
        <div class="text-xs text-cocoa-400 mt-1">有效评级分合计</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="card-flat p-4 space-y-3">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative flex-1 min-w-[180px]">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300"
            :size="16"
          />
          <input
            v-model="searchKeyword"
            class="input-soft w-full !pl-9"
            placeholder="搜索奖项名称、颁发机构..."
          />
        </div>
        <button
          class="btn-primary"
          @click="openAddForm"
        >
          <Plus :size="16" /> 新增记录
        </button>
        <button
          class="btn-secondary"
          @click="categoryModalOpen = true"
        >
          <Settings :size="16" /> 分类管理
        </button>
        <button
          class="btn-secondary"
          @click="openRatingBatch"
        >
          <Zap :size="16" /> 批量设评级分
        </button>
      </div>

      <!-- 筛选器 -->
      <div class="flex items-center gap-2 flex-wrap text-xs">
        <span class="text-cocoa-400 flex items-center gap-1">
          <Filter :size="12" /> 筛选：
        </span>
        <select
          v-model="filterYear"
          class="input-soft !py-1 !px-2 text-xs w-auto"
        >
          <option value="">全部年份</option>
          <option
            v-for="y in awardStore.allYears"
            :key="y"
            :value="y"
          >
            {{ y }}年
          </option>
        </select>
        <select
          v-model="filterCategory"
          class="input-soft !py-1 !px-2 text-xs w-auto"
        >
          <option value="">全部分类</option>
          <option
            v-for="c in awardStore.categories"
            :key="c.id"
            :value="c.name"
          >
            {{ c.name }}
          </option>
        </select>
        <select
          v-model="filterTag"
          class="input-soft !py-1 !px-2 text-xs w-auto"
        >
          <option value="">全部标签</option>
          <option
            v-for="t in awardStore.allTags"
            :key="t"
            :value="t"
          >
            #{{ t }}
          </option>
        </select>
        <button
          v-if="filterYear || filterTag || filterCategory || searchKeyword"
          class="text-xs text-cocoa-400 hover:text-sakura-500"
          @click="resetFilters"
        >
          重置
        </button>
      </div>
    </div>

    <!-- 获奖列表 - 按年份分组 -->
    <div class="space-y-4">
      <div
        v-if="!filteredRecords.length"
        class="card-flat p-10 text-center"
      >
        <div class="text-4xl mb-3">🏆</div>
        <div class="text-cocoa-500 text-sm">
          {{ searchKeyword || filterYear || filterTag ? '没有找到匹配的获奖记录' : '还没有获奖记录，点击「新增记录」开始记录你的荣誉吧' }}
        </div>
      </div>

      <div
        v-for="[year, records] in filteredByYear"
        :key="year"
        class="card-flat overflow-hidden"
      >
        <div
          class="px-4 py-3 bg-gradient-to-r from-butter-50 to-cream-50 border-b border-cocoa-100/50 flex items-center justify-between cursor-pointer hover:from-butter-100/50 transition-colors"
          @click="toggleYear(year)"
        >
          <div class="flex items-center gap-2">
            <Calendar
              :size="16"
              class="text-butter-500"
            />
            <span class="font-medium text-cocoa-700">{{ year }}年</span>
            <span class="text-xs text-cocoa-400">{{ records.length }} 项</span>
          </div>
          <component
            :is="expandedYears.has(year) ? ChevronUp : ChevronDown"
            :size="18"
            class="text-cocoa-400"
          />
        </div>

        <div
          v-show="expandedYears.has(year) || filteredByYear.length <= 2"
          class="divide-y divide-cocoa-50"
        >
          <div
            v-for="r in records"
            :key="r.id"
            class="p-4 hover:bg-cream-50/50 transition-colors"
          >
            <div class="flex gap-3">
              <!-- 奖状缩略图 -->
              <div
                v-if="r.image"
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-cream-100 flex-shrink-0 cursor-pointer"
                @click="openEditForm(r.id)"
              >
                <img
                  :src="r.image"
                  :alt="r.name"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-else
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-butter-100 to-sakura-100 flex items-center justify-center flex-shrink-0"
              >
                <Award
                  :size="28"
                  class="text-butter-500"
                />
              </div>

              <!-- 主要信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="font-medium text-cocoa-800 text-base">
                      {{ r.name }}
                    </h3>
                    <div class="text-xs text-cocoa-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span v-if="r.issuer">{{ r.issuer }}</span>
                      <span v-if="r.issuer && r.level">·</span>
                      <span
                        v-if="r.level"
                        class="text-butter-600"
                      >{{ r.level }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button
                      class="w-7 h-7 rounded-lg hover:bg-cream-100 text-cocoa-400 hover:text-butter-600 flex items-center justify-center transition-colors"
                      title="编辑"
                      @click="openEditForm(r.id)"
                    >
                      <Edit2 :size="14" />
                    </button>
                    <button
                      class="w-7 h-7 rounded-lg hover:bg-sakura-50 text-cocoa-400 hover:text-sakura-500 flex items-center justify-center transition-colors"
                      title="删除"
                      @click="deleteAward(r.id)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-2 mt-2 flex-wrap">
                  <span class="text-[10px] text-cocoa-400 flex items-center gap-0.5">
                    <Calendar :size="10" /> {{ r.date || '日期未知' }}
                  </span>
                  <div
                    v-if="r.tags.length"
                    class="flex items-center gap-1 flex-wrap"
                  >
                    <span
                      v-for="t in r.tags.slice(0, 4)"
                      :key="t"
                      class="chip text-[10px] !py-0.5 bg-cream-100 text-cocoa-500"
                    >
                      #{{ t }}
                    </span>
                  </div>
                </div>

                <p
                  v-if="r.note"
                  class="text-xs text-cocoa-400 mt-2 line-clamp-2"
                >
                  {{ r.note }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <Modal
      :open="formOpen"
      :title="editingId ? '编辑获奖记录' : '新增获奖记录'"
      width="560px"
      @close="formOpen = false"
    >
      <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <!-- 图片上传 + AI识别 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">
            奖状图片（可选，支持 AI 识别）
          </label>
          <div
            v-if="form.image"
            class="relative rounded-xl overflow-hidden border border-cocoa-100 bg-cream-50"
          >
            <img
              :src="form.image"
              alt="奖状图片"
              class="w-full max-h-[200px] object-contain"
            />
            <button
              class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
              @click="removeImage"
            >
              <X :size="14" />
            </button>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button
              class="btn-secondary !py-1.5 flex-1"
              @click="pickImage"
            >
              <ImagePlus :size="14" /> {{ form.image ? '更换图片' : '上传图片' }}
            </button>
            <button
              v-if="form.image"
              class="btn-primary !py-1.5 flex-1"
              :disabled="recognizing"
              @click="recognizeImage"
            >
              <Sparkles
                :size="14"
                :class="recognizing ? 'animate-spin' : ''"
              />
              {{ recognizing ? '识别中...' : 'AI 识别内容' }}
            </button>
          </div>
          <input
            ref="imageInputEl"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onImagePicked"
          />
        </div>

        <!-- 奖项名称 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">
            奖项名称 <span class="text-sakura-400">*</span>
          </label>
          <input
            v-model="form.name"
            class="input-soft w-full"
            placeholder="如：优秀教师、教学能手一等奖等"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- 颁发机构 -->
          <div>
            <label class="text-sm text-cocoa-600 block mb-1.5">颁发机构</label>
            <input
              v-model="form.issuer"
              class="input-soft w-full"
              placeholder="如：市教育局"
            />
          </div>
          <!-- 奖项等级 -->
          <div>
            <label class="text-sm text-cocoa-600 block mb-1.5">奖项等级</label>
            <input
              v-model="form.level"
              class="input-soft w-full"
              placeholder="如：一等奖 / 国家级"
            />
          </div>
        </div>

        <!-- 评级分 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">
            评级分（0-3 分，可自定义）
          </label>
          <div class="flex items-center gap-2">
            <select
              class="input-soft w-auto"
              :value="[0, 1, 2, 3].includes(form.ratingScore) ? form.ratingScore : ''"
              @change="onRatingPreset"
            >
              <option
                value=""
                disabled
              >
                自定义
              </option>
              <option :value="0">
                0 分
              </option>
              <option :value="1">
                1 分
              </option>
              <option :value="2">
                2 分
              </option>
              <option :value="3">
                3 分
              </option>
            </select>
            <input
              v-model.number="form.ratingScore"
              type="number"
              min="0"
              step="1"
              class="input-soft w-24"
            >
            <span class="text-xs text-cocoa-400">分</span>
          </div>
        </div>

        <!-- 获奖日期 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">获奖日期</label>
          <input
            v-model="form.date"
            type="date"
            class="input-soft w-full"
          />
        </div>

        <!-- 分类标签 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">
            分类标签
          </label>
          <div class="flex items-center gap-1 flex-wrap mb-2">
            <button
              v-for="c in awardStore.categories"
              :key="c.id"
              class="chip text-xs !py-1 transition-all"
              :class="
                form.tags.includes(c.name)
                  ? 'text-white'
                  : 'bg-cream-100 text-cocoa-500 hover:bg-cream-200'
              "
              :style="form.tags.includes(c.name) ? { backgroundColor: c.color } : {}"
              @click="
                form.tags.includes(c.name) ? removeTag(c.name) : addTag(c.name)
              "
            >
              {{ c.name }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="tagInput"
              class="input-soft flex-1"
              placeholder="输入自定义标签，回车添加"
              @keyup.enter="addTag(tagInput)"
            />
          </div>
          <div
            v-if="form.tags.length"
            class="flex items-center gap-1 flex-wrap mt-2"
          >
            <span
              v-for="t in form.tags"
              :key="t"
              class="chip text-xs !py-1 bg-butter-100 text-butter-700 flex items-center gap-1"
            >
              #{{ t }}
              <button
                class="w-3 h-3 rounded-full hover:bg-butter-200 flex items-center justify-center"
                @click="removeTag(t)"
              >
                <X :size="9" />
              </button>
            </span>
          </div>
        </div>

        <!-- 备注 -->
        <div>
          <label class="text-sm text-cocoa-600 block mb-1.5">备注</label>
          <textarea
            v-model="form.note"
            class="input-soft w-full min-h-[60px]"
            placeholder="其他需要记录的信息..."
          />
        </div>
      </div>

      <template #footer>
        <button
          class="btn-secondary"
          @click="formOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="saveForm"
        >
          <Save :size="14" /> {{ editingId ? '保存修改' : '添加记录' }}
        </button>
      </template>
    </Modal>

    <!-- 批量设置评级分弹窗 -->
    <Modal
      :open="ratingBatchOpen"
      title="批量设置评级分"
      width="400px"
      @close="ratingBatchOpen = false"
    >
      <div class="space-y-3">
        <p class="text-sm text-cocoa-600">
          将为<span class="font-medium">全部 {{ awardStore.records.length }} 条</span>获奖记录统一设置评级分：
        </p>
        <div class="flex items-center gap-2">
          <select
            class="input-soft w-auto"
            :value="[0, 1, 2, 3].includes(batchRatingScore) ? batchRatingScore : ''"
            @change="(e) => (batchRatingScore = Number((e.target as HTMLSelectElement).value))"
          >
            <option
              value=""
              disabled
            >
              自定义
            </option>
            <option :value="0">
              0 分
            </option>
            <option :value="1">
              1 分
            </option>
            <option :value="2">
              2 分
            </option>
            <option :value="3">
              3 分
            </option>
          </select>
          <input
            v-model.number="batchRatingScore"
            type="number"
            min="0"
            step="1"
            class="input-soft w-24"
          >
          <span class="text-xs text-cocoa-400">分</span>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="ratingBatchOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="applyRatingBatch"
        >
          <Save :size="14" /> 确定设置
        </button>
      </template>
    </Modal>

    <!-- 分类管理弹窗 -->
    <Modal
      :open="categoryModalOpen"
      title="分类管理"
      width="400px"
      @close="categoryModalOpen = false"
    >
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <input
            v-model="newCategoryName"
            class="input-soft flex-1"
            placeholder="新分类名称"
          />
          <div class="flex items-center gap-1">
            <button
              v-for="c in presetColors.slice(0, 6)"
              :key="c"
              class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              :class="newCategoryColor === c ? 'border-cocoa-700' : 'border-transparent'"
              :style="{ backgroundColor: c }"
              @click="newCategoryColor = c"
            />
          </div>
          <button
            class="btn-primary !py-1.5"
            @click="addCategory"
          >
            <Plus :size="14" /> 添加
          </button>
        </div>

        <div class="space-y-1.5 max-h-[300px] overflow-y-auto">
          <div
            v-for="c in awardStore.categories"
            :key="c.id"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-cream-50"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: c.color }"
              />
              <span class="text-sm text-cocoa-700">{{ c.name }}</span>
            </div>
            <button
              class="text-xs text-sakura-400 hover:text-sakura-500"
              @click="deleteCategory(c.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
