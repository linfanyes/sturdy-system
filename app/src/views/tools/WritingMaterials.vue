<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Volume2, Star, Bookmark, RefreshCw, Download, Search } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface Topic {
  title: string
  keywords: string[]
  examples: string[]
}

interface WritingCategory {
  name: string
  icon: string
  topics: Topic[]
}

const writingTopics = [
  {
    name: '写人篇',
    icon: '👤',
    topics: [
      { title: '我的老师', keywords: ['老师', '教育', '关心', '教导'], examples: ['老师像辛勤的园丁，用心培育每一朵花。', '每当我遇到困难时，老师总是耐心地帮助我。', '老师的教诲让我受益终身。'] },
      { title: '我的妈妈', keywords: ['妈妈', '母爱', '辛苦', '温暖'], examples: ['妈妈的爱是世界上最伟大的爱。', '每天早上，妈妈都会为我准备美味的早餐。', '妈妈无微不至地照顾着我们全家。'] },
      { title: '我的好朋友', keywords: ['朋友', '友谊', '帮助', '快乐'], examples: ['好朋友就像一面镜子，能照出自己的缺点。', '我们一起学习，一起玩耍，度过了许多快乐的时光。', '真正的友谊经得起时间的考验。'] },
      { title: '我敬佩的人', keywords: ['敬佩', '榜样', '精神', '学习'], examples: ['他那种坚持不懈的精神值得我们学习。', '在他身上，我看到了什么是真正的勇气。', '他用行动告诉我们，只要努力就能成功。'] },
    ],
  },
  {
    name: '记事篇',
    icon: '📝',
    topics: [
      { title: '一件难忘的事', keywords: ['难忘', '记忆', '感动', '成长'], examples: ['那一天发生的事情，我永远不会忘记。', '这件事让我明白了一个深刻的道理。', '回忆起那件事，我的心里依然暖暖的。'] },
      { title: '快乐的一天', keywords: ['快乐', '开心', '游玩', '时光'], examples: ['那天，我们度过了非常快乐的一天。', '阳光明媚，我们怀着愉快的心情出发了。', '笑声回荡在整个公园，久久不能散去。'] },
      { title: '一次有趣的实验', keywords: ['实验', '科学', '探索', '发现'], examples: ['科学实验真有趣，让我发现了许多奥秘。', '通过这次实验，我对科学产生了浓厚的兴趣。', '小小的实验，蕴含着大大的道理。'] },
      { title: '我的第一次', keywords: ['第一次', '尝试', '勇气', '挑战'], examples: ['人生中有许多第一次，每一次都是宝贵的经历。', '虽然有些害怕，但我还是鼓起勇气尝试了。', '第一次的经历让我成长了许多。'] },
    ],
  },
  {
    name: '写景篇',
    icon: '🌳',
    topics: [
      { title: '美丽的春天', keywords: ['春天', '美丽', '生机', '万物'], examples: ['春天来了，大地披上了绿装。', '小草偷偷地从土里钻出来，嫩嫩的，绿绿的。', '春天是万物复苏的季节，充满了生机与活力。'] },
      { title: '我的家乡', keywords: ['家乡', '美丽', '思念', '回忆'], examples: ['我的家乡是一个美丽的地方，我深深地爱着它。', '每当我想起家乡，心中就充满了温暖。', '家乡的一草一木都让我感到亲切。'] },
      { title: '秋天的田野', keywords: ['秋天', '丰收', '金黄', '喜悦'], examples: ['秋天是丰收的季节，田野里一片金黄。', '沉甸甸的稻穗弯下了腰，好像在向我们点头。', '农民伯伯脸上洋溢着丰收的喜悦。'] },
      { title: '校园的早晨', keywords: ['校园', '早晨', '阳光', '读书'], examples: ['校园的早晨是宁静而美好的。', '阳光透过树叶，洒下斑驳的光影。', '朗朗的读书声回荡在校园的每个角落。'] },
    ],
  },
  {
    name: '状物篇',
    icon: '🌻',
    topics: [
      { title: '我最喜欢的小动物', keywords: ['动物', '可爱', '陪伴', '成长'], examples: ['我家有一只可爱的小狗，它是我的好朋友。', '小猫的眼睛像两颗明亮的宝石。', '小动物是人类的好朋友，我们要爱护它们。'] },
      { title: '我的文具盒', keywords: ['文具', '学习', '陪伴', '记忆'], examples: ['我的文具盒陪伴我度过了许多学习时光。', '打开文具盒，里面整整齐齐地摆放着各种文具。', '小小的文具盒，装满了我童年的回忆。'] },
      { title: '美丽的菊花', keywords: ['菊花', '美丽', '坚强', '秋天'], examples: ['秋天来了，菊花盛开，五颜六色，美丽极了。', '菊花在秋风中傲然挺立，展现出顽强的生命力。', '菊花不仅美丽，更有着不畏严寒的精神。'] },
      { title: '我的小台灯', keywords: ['台灯', '学习', '夜晚', '温暖'], examples: ['每当夜幕降临，我的小台灯就会亮起温暖的光芒。', '在台灯的陪伴下，我完成了一次又一次的作业。', '小台灯虽然不起眼，却默默地为我照亮了学习的道路。'] },
    ],
  },
]

const idioms = [
  { idiom: '春暖花开', pinyin: 'chūn nuǎn huā kāi', meaning: '春天气候温暖，百花盛开', example: '春天来了，公园里春暖花开，美丽极了。' },
  { idiom: '鸟语花香', pinyin: 'niǎo yǔ huā xiāng', meaning: '鸟儿鸣叫，花儿飘香', example: '清晨的花园里鸟语花香，让人心情舒畅。' },
  { idiom: '五颜六色', pinyin: 'wǔ yán liù sè', meaning: '形容色彩丰富多样', example: '商店里的玩具五颜六色，吸引了许多小朋友。' },
  { idiom: '阳光明媚', pinyin: 'yáng guāng míng mèi', meaning: '形容天气晴朗，阳光充足', example: '今天阳光明媚，是出游的好日子。' },
  { idiom: '兴高采烈', pinyin: 'xìng gāo cǎi liè', meaning: '形容兴致高，心情好', example: '同学们兴高采烈地参加了学校的运动会。' },
  { idiom: '专心致志', pinyin: 'zhuān xīn zhì zhì', meaning: '形容一心一意，非常专注', example: '他专心致志地做作业，连妈妈叫他都没听见。' },
  { idiom: '助人为乐', pinyin: 'zhù rén wéi lè', meaning: '把帮助别人当作快乐', example: '小红是个助人为乐的好孩子，经常帮助同学。' },
  { idiom: '坚持不懈', pinyin: 'jiān chí bù xiè', meaning: '坚持到底，不放弃', example: '只要坚持不懈，就一定能取得成功。' },
]

const selectedCategory = ref(writingTopics[0])
const selectedTopic = ref(writingTopics[0].topics[0])
const searchQuery = ref('')
const favorites = ref<string[]>([])

const filteredTopics = computed(() => {
  if (!searchQuery.value) return selectedCategory.value.topics
  const q = searchQuery.value.toLowerCase()
  return selectedCategory.value.topics.filter(t => 
    t.title.toLowerCase().includes(q) ||
    t.keywords.some(k => k.toLowerCase().includes(q))
  )
})

function selectTopic(topic: Topic) {
  selectedTopic.value = topic
}

function toggleFavorite(id: string) {
  const idx = favorites.value.indexOf(id)
  if (idx >= 0) {
    favorites.value.splice(idx, 1)
    toast.success('已取消收藏')
  } else {
    favorites.value.push(id)
    toast.success('已收藏')
  }
}

function isFavorite(id: string) {
  return favorites.value.includes(id)
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制'),
    () => toast.error('复制失败'),
  )
}

function playAudio(text: string) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  speechSynthesis.speak(utterance)
}

function exportTopics() {
  const text = writingTopics.flatMap(cat => 
    cat.topics.map(t => `${t.title}\n关键词：${t.keywords.join('、')}\n例句：${t.examples.join('；')}\n`).join('\n')
  ).join('\n')
  
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '作文素材.txt'
  a.click()
  URL.revokeObjectURL(url)
  toast.success('已导出')
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    
    <section class="card-soft p-5 bg-gradient-to-br from-butter-100 via-sakura-100 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-butter-300 to-sakura-300 flex items-center justify-center text-2xl shadow-softer">
          📖
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">作文素材库</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            小学作文写作素材大全，包含写人、记事、写景、状物四大类，帮助学生积累写作素材。
          </p>
        </div>
      </div>
    </section>
    
    <section class="card-flat p-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cat in writingTopics"
          :key="cat.name"
          class="chip !py-1.5 !px-3"
          :class="selectedCategory === cat ? 'bg-butter-300 text-cocoa-900' : 'bg-cream-100 text-cocoa-700'"
          @click="selectedCategory = cat; selectedTopic = cat.topics[0]"
        >
          {{ cat.icon }} {{ cat.name }}
        </button>
      </div>
    </section>
    
    <section class="card-flat p-4">
      <div class="relative mb-3">
        <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-cocoa-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索题目或关键词..."
          class="w-full pl-7 pr-3 py-2 bg-butter-50 border border-butter-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-butter-400"
        />
      </div>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          v-for="topic in filteredTopics"
          :key="topic.title"
          class="text-left p-3 rounded-xl transition-all"
          :class="selectedTopic === topic ? 'bg-butter-100 ring-1 ring-butter-300' : 'bg-cream-50 hover:bg-cream-100'"
          @click="selectTopic(topic)"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-cocoa-800">{{ topic.title }}</span>
            <button
              class="p-1 rounded-full hover:bg-butter-200 transition-colors"
              @click.stop="toggleFavorite(topic.title)"
            >
              <Star :size="12" :class="isFavorite(topic.title) ? 'text-butter-500 fill-butter-500' : 'text-cocoa-400'" />
            </button>
          </div>
          <div class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="kw in topic.keywords.slice(0, 3)"
              :key="kw"
              class="text-[10px] px-1.5 py-0.5 rounded-full bg-butter-100 text-cocoa-600"
            >
              {{ kw }}
            </span>
          </div>
        </button>
      </div>
    </section>
    
    <section class="card-flat p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-cocoa-900">{{ selectedTopic?.title }}</h3>
        <button
          class="btn-ghost !px-3 !py-1 text-xs"
          @click="exportTopics"
        >
          <Download :size="12" /> 导出全部素材
        </button>
      </div>
      
      <div class="mb-4">
        <div class="text-xs text-cocoa-500 mb-2">关键词</div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="kw in selectedTopic?.keywords"
            :key="kw"
            class="px-3 py-1 rounded-full bg-butter-100 text-butter-700 text-sm"
          >
            {{ kw }}
          </span>
        </div>
      </div>
      
      <div>
        <div class="text-xs text-cocoa-500 mb-2">精彩例句</div>
        <div class="space-y-2">
          <div
            v-for="(ex, idx) in selectedTopic?.examples"
            :key="idx"
            class="p-3 rounded-xl bg-cream-50 border border-cream-200 flex items-start gap-2"
          >
            <span class="w-5 h-5 rounded-full bg-butter-200 flex items-center justify-center text-xs text-cocoa-700 shrink-0">
              {{ idx + 1 }}
            </span>
            <div class="flex-1">
              <p class="text-sm text-cocoa-800">{{ ex }}</p>
            </div>
            <div class="flex gap-1 shrink-0">
              <button
                class="p-1.5 rounded-lg hover:bg-butter-100 text-cocoa-400 hover:text-butter-600 transition-colors"
                @click="playAudio(ex)"
              >
                <Volume2 :size="14" />
              </button>
              <button
                class="p-1.5 rounded-lg hover:bg-butter-100 text-cocoa-400 hover:text-butter-600 transition-colors"
                @click="copyText(ex)"
              >
                <Copy :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <section class="card-flat p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-cocoa-900">常用成语</h3>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="idiom in idioms"
          :key="idiom.idiom"
          class="p-3 rounded-xl bg-sakura-50 border border-sakura-200"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="text-lg font-bold text-cocoa-800">{{ idiom.idiom }}</span>
            <button
              class="p-1 rounded-full hover:bg-sakura-200 text-cocoa-400 hover:text-sakura-600 transition-colors"
              @click="playAudio(idiom.idiom + '，' + idiom.meaning)"
            >
              <Volume2 :size="12" />
            </button>
          </div>
          <div class="text-xs text-cocoa-500 mb-1">{{ idiom.pinyin }}</div>
          <div class="text-xs text-cocoa-600 mb-1">{{ idiom.meaning }}</div>
          <div class="text-xs text-cocoa-700 bg-white/60 px-2 py-1 rounded-lg">
            例：{{ idiom.example }}
          </div>
        </div>
      </div>
    </section>
    
    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：积累更多好词句，写作时就能得心应手！可以收藏喜欢的素材方便复习
    </div>
  </div>
</template>
