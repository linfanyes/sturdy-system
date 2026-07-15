<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, RotateCcw, Shuffle, Star, Bookmark, Check, X } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface Character {
  char: string
  pinyin: string
  strokes: number
  meaning: string
  order: string[]
}

interface CharList {
  name: string
  characters: Character[]
}

const characterLists = [
  {
    name: '一年级上册',
    characters: [
      { char: '一', pinyin: 'yī', strokes: 1, meaning: '数目字', order: ['一'] },
      { char: '二', pinyin: 'èr', strokes: 2, meaning: '数目字', order: ['一', '一'] },
      { char: '三', pinyin: 'sān', strokes: 3, meaning: '数目字', order: ['一', '一', '一'] },
      { char: '十', pinyin: 'shí', strokes: 2, meaning: '数目字', order: ['一', '|'] },
      { char: '人', pinyin: 'rén', strokes: 2, meaning: '人类', order: ['丿', '㇏'] },
      { char: '大', pinyin: 'dà', strokes: 3, meaning: '大小', order: ['一', '丿', '㇏'] },
      { char: '小', pinyin: 'xiǎo', strokes: 3, meaning: '大小', order: ['亅', '丿', '丶'] },
      { char: '口', pinyin: 'kǒu', strokes: 3, meaning: '嘴巴', order: ['丨', '𠃍', '一'] },
      { char: '日', pinyin: 'rì', strokes: 4, meaning: '太阳', order: ['丨', '𠃍', '一', '一'] },
      { char: '月', pinyin: 'yuè', strokes: 4, meaning: '月亮', order: ['丿', '𠃍', '一', '一'] },
      { char: '水', pinyin: 'shuǐ', strokes: 4, meaning: '液体', order: ['亅', '㇇', '㇈', '㇏'] },
      { char: '火', pinyin: 'huǒ', strokes: 4, meaning: '火焰', order: ['丶', '丿', '丿', '㇏'] },
      { char: '山', pinyin: 'shān', strokes: 3, meaning: '山峰', order: ['丨', '𠃊', '丨'] },
      { char: '石', pinyin: 'shí', strokes: 5, meaning: '石头', order: ['一', '丿', '𠃍', '一', '一'] },
      { char: '田', pinyin: 'tián', strokes: 5, meaning: '田地', order: ['丨', '𠃍', '一', '丨', '一'] },
    ],
  },
  {
    name: '二年级上册',
    characters: [
      { char: '学', pinyin: 'xué', strokes: 8, meaning: '学习', order: ['丶', '丶', '丿', '丶', '𠃍', '一', '一', '一'] },
      { char: '校', pinyin: 'xiào', strokes: 10, meaning: '学校', order: ['一', '丨', '丿', '丶', '丶', '丶', '一', '丿', '丶', '丶'] },
      { char: '明', pinyin: 'míng', strokes: 8, meaning: '明亮', order: ['丨', '𠃍', '一', '一', '丿', '𠃍', '一', '一'] },
      { char: '白', pinyin: 'bái', strokes: 5, meaning: '白色', order: ['丿', '丨', '𠃍', '一', '一'] },
      { char: '红', pinyin: 'hóng', strokes: 6, meaning: '红色', order: ['纟', '纟', '纟', '一', '𠃍', '一'] },
      { char: '绿', pinyin: 'lǜ', strokes: 11, meaning: '绿色', order: ['纟', '纟', '纟', '丨', '一', '一', '𠃍', '一', '一', '一', '一'] },
      { char: '花', pinyin: 'huā', strokes: 7, meaning: '花朵', order: ['艹', '艹', '艹', '亅', '丿', '丶', '丶'] },
      { char: '草', pinyin: 'cǎo', strokes: 9, meaning: '小草', order: ['艹', '艹', '艹', '一', '丨', '𠃍', '一', '丨', '一'] },
      { char: '鸟', pinyin: 'niǎo', strokes: 5, meaning: '小鸟', order: ['丿', '𠃍', '丶', '一', '㇏'] },
      { char: '虫', pinyin: 'chóng', strokes: 6, meaning: '虫子', order: ['丨', '𠃍', '一', '丨', '一', '丶'] },
      { char: '鱼', pinyin: 'yú', strokes: 8, meaning: '鱼儿', order: ['丿', '𠃍', '一', '丨', '一', '一', '一', '一'] },
      { char: '雨', pinyin: 'yǔ', strokes: 8, meaning: '下雨', order: ['一', '丨', '𠃍', '一', '丶', '丶', '丶', '丶'] },
      { char: '雪', pinyin: 'xuě', strokes: 11, meaning: '雪花', order: ['一', '丨', '𠃍', '一', '丶', '丶', '丶', '丶', '𠃍', '一', '一'] },
      { char: '风', pinyin: 'fēng', strokes: 4, meaning: '大风', order: ['丿', '⺄', '丿', '丶'] },
      { char: '云', pinyin: 'yún', strokes: 4, meaning: '云朵', order: ['一', '一', '𠃊', '丶'] },
    ],
  },
  {
    name: '三年级上册',
    characters: [
      { char: '春', pinyin: 'chūn', strokes: 9, meaning: '春天', order: ['一', '一', '一', '丿', '𠃍', '一', '一', '丿', '丶'] },
      { char: '夏', pinyin: 'xià', strokes: 10, meaning: '夏天', order: ['一', '丿', '𠃍', '一', '一', '丿', '丶', '一', '丿', '丶'] },
      { char: '秋', pinyin: 'qiū', strokes: 9, meaning: '秋天', order: ['丿', '一', '𠃍', '丿', '丶', '丿', '𠃍', '一', '一'] },
      { char: '冬', pinyin: 'dōng', strokes: 5, meaning: '冬天', order: ['丿', '丶', '𠃍', '一', '一'] },
      { char: '家', pinyin: 'jiā', strokes: 10, meaning: '家庭', order: ['丶', '丶', '𠃍', '一', '丿', '丶', '丿', '丿', '丿', '丶'] },
      { char: '国', pinyin: 'guó', strokes: 8, meaning: '国家', order: ['丨', '𠃍', '一', '丨', '一', '丶', '𠃍', '一'] },
      { char: '城', pinyin: 'chéng', strokes: 9, meaning: '城市', order: ['土', '土', '土', '一', '丿', '𠃍', '一', '丿', '丶'] },
      { char: '乡', pinyin: 'xiāng', strokes: 3, meaning: '家乡', order: ['𠃊', '𠃊', '㇏'] },
      { char: '想', pinyin: 'xiǎng', strokes: 13, meaning: '想法', order: ['一', '丨', '𠃍', '一', '一', '丶', '丿', '丶', '𠃍', '一', '丨', '一', '丶'] },
      { char: '念', pinyin: 'niàn', strokes: 8, meaning: '思念', order: ['丿', '丶', '丿', '丶', '𠃍', '一', '丨', '一'] },
      { char: '爱', pinyin: 'ài', strokes: 10, meaning: '爱心', order: ['丿', '丶', '冖', '丿', '丿', '丶', '𠃍', '一', '丿', '丶'] },
      { char: '情', pinyin: 'qíng', strokes: 11, meaning: '感情', order: ['忄', '忄', '忄', '一', '𠃍', '一', '丶', '一', '丿', '丶', '一'] },
      { char: '师', pinyin: 'shī', strokes: 6, meaning: '老师', order: ['𠃊', '𠃊', '一', '一', '丿', '丶'] },
      { char: '教', pinyin: 'jiào', strokes: 11, meaning: '教育', order: ['一', '丨', '丿', '丶', '𠃍', '一', '一', '丿', '丶', '𠃍', '一'] },
      { char: '书', pinyin: 'shū', strokes: 4, meaning: '书本', order: ['𠃊', '𠃊', '𠃊', '丶'] },
    ],
  },
]

const strokeNames: Record<string, string> = {
  '一': '横',
  '|': '竖',
  '丿': '撇',
  '㇏': '捺',
  '丶': '点',
  '亅': '竖钩',
  '𠃍': '横折',
  '𠃊': '竖折',
  '㇇': '横撇',
  '㇈': '竖提',
  '⺄': '横折弯钩',
  '纟': '撇折',
  '艹': '横',
  '冖': '点',
  '忄': '点',
  '土': '横',
}

const selectedList = ref(characterLists[0])
const currentIndex = ref(0)
const currentStroke = ref(0)
const isAnimating = ref(false)
const bookmarks = ref<string[]>([])
const isShuffled = ref(false)
const shuffledChars = ref<Character[]>([])

const currentChar = computed(() => {
  const chars = isShuffled.value ? shuffledChars.value : selectedList.value.characters
  return chars[currentIndex.value]
})

const progress = computed(() => {
  const chars = isShuffled.value ? shuffledChars.value : selectedList.value.characters
  return ((currentIndex.value + 1) / chars.length) * 100
})

const strokeProgress = computed(() => {
  if (!currentChar.value) return 0
  return ((currentStroke.value + 1) / currentChar.value.strokes) * 100
})

const currentStrokeName = computed(() => {
  if (!currentChar.value || currentStroke.value >= currentChar.value.order.length) return ''
  return strokeNames[currentChar.value.order[currentStroke.value]] || '笔画'
})

function shuffleChars() {
  shuffledChars.value = [...selectedList.value.characters].sort(() => Math.random() - 0.5)
}

function toggleShuffle() {
  isShuffled.value = !isShuffled.value
  if (isShuffled.value) {
    shuffleChars()
  }
  reset()
}

function playAnimation() {
  if (isAnimating.value) return
  isAnimating.value = true
  currentStroke.value = 0
  
  const interval = setInterval(() => {
    if (currentStroke.value < (currentChar.value?.strokes || 0) - 1) {
      currentStroke.value++
    } else {
      clearInterval(interval)
      isAnimating.value = false
    }
  }, 800)
}

function nextStroke() {
  if (currentStroke.value < (currentChar.value?.strokes || 0) - 1) {
    currentStroke.value++
  }
}

function prevStroke() {
  if (currentStroke.value > 0) {
    currentStroke.value--
  }
}

function nextChar() {
  const chars = isShuffled.value ? shuffledChars.value : selectedList.value.characters
  if (currentIndex.value < chars.length - 1) {
    currentIndex.value++
    currentStroke.value = 0
    isAnimating.value = false
  }
}

function prevChar() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    currentStroke.value = 0
    isAnimating.value = false
  }
}

function toggleBookmark() {
  if (!currentChar.value) return
  const char = currentChar.value.char
  const idx = bookmarks.value.indexOf(char)
  if (idx >= 0) {
    bookmarks.value.splice(idx, 1)
    toast.success('已取消收藏')
  } else {
    bookmarks.value.push(char)
    toast.success('已收藏')
  }
}

function isBookmarked(char: string) {
  return bookmarks.value.includes(char)
}

function copyChar() {
  if (!currentChar.value) return
  const text = `${currentChar.value.char} ${currentChar.value.pinyin} ${currentChar.value.meaning}`
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制'),
    () => toast.error('复制失败'),
  )
}

function reset() {
  currentIndex.value = 0
  currentStroke.value = 0
  isAnimating.value = false
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    
    <section class="card-soft p-5 bg-gradient-to-br from-sakura-100 via-butter-100 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sakura-300 to-butter-300 flex items-center justify-center text-2xl shadow-softer">
          ✏️
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">汉字笔顺练习</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            学习汉字正确笔顺，支持动画演示和分步练习，帮助学生掌握正确书写方法。
          </p>
        </div>
      </div>
    </section>
    
    <section class="card-flat p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-[200px]">
          <label class="text-xs text-cocoa-500 ml-1">选择年级</label>
          <select
            v-model="selectedList"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
          >
            <option v-for="list in characterLists" :key="list.name" :value="list">
              {{ list.name }} ({{ list.characters.length }}字)
            </option>
          </select>
        </div>
        <button
          class="btn-ghost !px-3 !py-2 flex items-center gap-1"
          :class="isShuffled ? 'bg-mint-100 text-mint-600' : ''"
          @click="toggleShuffle"
        >
          <Shuffle :size="14" /> 随机
        </button>
        <button
          class="btn-ghost !px-3 !py-2 flex items-center gap-1"
          @click="reset"
        >
          <RotateCcw :size="14" /> 重置
        </button>
      </div>
    </section>
    
    <div class="card-flat p-1">
      <div class="h-1.5 bg-cream-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-sakura-300 to-butter-300 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <div class="flex items-center justify-between mt-1.5 px-1">
        <span class="text-xs text-cocoa-500">
          {{ currentIndex + 1 }} / {{ isShuffled ? shuffledChars.length : selectedList.characters.length }}
        </span>
      </div>
    </div>
    
    <section class="card-flat p-6">
      <div class="text-center">
        <div class="flex items-center justify-between mb-4">
          <button
            class="p-2 rounded-full hover:bg-butter-100 transition-colors"
            @click="toggleBookmark"
          >
            <Bookmark :size="20" :class="isBookmarked(currentChar?.char || '') ? 'text-butter-500 fill-butter-500' : 'text-cocoa-400'" />
          </button>
          <button
            class="p-2 rounded-full hover:bg-butter-100 transition-colors"
            @click="copyChar"
          >
            <Copy :size="20" class="text-cocoa-400" />
          </button>
        </div>
        
        <div class="text-8xl font-bold text-cocoa-900 mb-4">
          {{ currentChar?.char }}
        </div>
        
        <div class="text-2xl text-cocoa-600 mb-2">{{ currentChar?.pinyin }}</div>
        <div class="text-lg text-cocoa-500 mb-6">{{ currentChar?.meaning }}</div>
        
        <div class="mb-4">
          <div class="text-xs text-cocoa-400 mb-1">笔画进度</div>
          <div class="h-1.5 bg-cream-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-butter-300 to-sakura-300 transition-all duration-300"
              :style="{ width: `${strokeProgress}%` }"
            />
          </div>
          <div class="text-xs text-cocoa-500 mt-1">
            第 {{ currentStroke + 1 }} 笔 / 共 {{ currentChar?.strokes }} 笔
            <span v-if="currentStrokeName" class="ml-2 text-butter-600">{{ currentStrokeName }}</span>
          </div>
        </div>
        
        <div class="flex items-center justify-center gap-3">
          <button
            class="btn-secondary px-4 py-2"
            :disabled="currentStroke === 0"
            @click="prevStroke"
          >
            上一笔
          </button>
          <button
            class="btn-primary px-6 py-2"
            :disabled="isAnimating"
            @click="playAnimation"
          >
            {{ isAnimating ? '演示中...' : '播放笔顺' }}
          </button>
          <button
            class="btn-secondary px-4 py-2"
            :disabled="currentStroke >= (currentChar?.strokes || 0) - 1"
            @click="nextStroke"
          >
            下一笔
          </button>
        </div>
        
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <span
            v-for="(stroke, idx) in currentChar?.order"
            :key="idx"
            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
            :class="idx <= currentStroke ? 'bg-butter-200 text-cocoa-800' : 'bg-cream-100 text-cocoa-400'"
          >
            {{ stroke }}
          </span>
        </div>
        
        <div class="mt-4 text-sm text-cocoa-500">
          笔画顺序：{{ currentChar?.order.join(' → ') }}
        </div>
      </div>
    </section>
    
    <section class="flex items-center justify-center gap-4">
      <button
        class="btn-secondary px-4 py-2"
        :disabled="currentIndex === 0"
        @click="prevChar"
      >
        上一字
      </button>
      <button
        class="btn-primary px-6 py-2"
        :disabled="currentIndex >= (isShuffled ? shuffledChars.length : selectedList.characters.length) - 1"
        @click="nextChar"
      >
        {{ currentIndex >= (isShuffled ? shuffledChars.length : selectedList.characters.length) - 1 ? '已完成' : '下一字' }}
      </button>
    </section>
    
    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：点击"播放笔顺"可以观看动画演示，也可以手动控制笔画进度
    </div>
  </div>
</template>
