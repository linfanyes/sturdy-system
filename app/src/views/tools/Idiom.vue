<!--
  Idiom.vue
  成语词典与接龙：内置 30+ 小学常用成语库（含拼音、释义、出处、造句），
  支持关键字搜索、朗读、AI 兜底查询；成语接龙模式由 AI 接续并展示接龙链条。
  适合语文课堂成语教学与拓展练习。
-->
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  Search, Volume2, Sparkles, Loader2, AlertCircle, RotateCcw,
  BookOpen, Link2, ChevronRight,
} from 'lucide-vue-next'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const ai = useAIStore()
const toast = useToastStore()

const hasApiKey = computed(() => !!ai.settings.apiKey?.trim())

// ============ Tab 切换 ============
type Tab = 'search' | 'chain'
const activeTab = ref<Tab>('search')

// ============ 成语库 ============
interface IdiomItem {
  idiom: string
  pinyin: string
  meaning: string
  origin: string
  example: string
}

const idiomLibrary: IdiomItem[] = [
  {
    idiom: '画蛇添足',
    pinyin: 'huà shé tiān zú',
    meaning: '比喻做了多余的事，非但无益，反而不合适。',
    origin: '《战国策·齐策二》',
    example: '文章本已写完，你又加这段话，简直是画蛇添足。',
  },
  {
    idiom: '守株待兔',
    pinyin: 'shǒu zhū dài tù',
    meaning: '比喻不主动努力，而存万一的侥幸心理，希望得到意外的收获。',
    origin: '《韩非子·五蠹》',
    example: '学习要靠勤奋，守株待兔是不可能取得好成绩的。',
  },
  {
    idiom: '亡羊补牢',
    pinyin: 'wáng yáng bǔ láo',
    meaning: '羊逃跑了再去修补羊圈，还不算晚。比喻出了问题以后想办法补救，可以防止继续受损失。',
    origin: '《战国策·楚策四》',
    example: '这次没考好不要紧，亡羊补牢为时不晚，下次努力就行。',
  },
  {
    idiom: '刻舟求剑',
    pinyin: 'kè zhōu qiú jiàn',
    meaning: '比喻不懂事物已发展变化而仍静止地看问题。',
    origin: '《吕氏春秋·察今》',
    example: '时代在进步，用老办法解决新问题无异于刻舟求剑。',
  },
  {
    idiom: '井底之蛙',
    pinyin: 'jǐng dǐ zhī wā',
    meaning: '井底的蛙只能看到井口那么大的一块天。比喻见识狭窄的人。',
    origin: '《庄子·秋水》',
    example: '我们要多读书多看世界，不能做井底之蛙。',
  },
  {
    idiom: '狐假虎威',
    pinyin: 'hú jiǎ hǔ wēi',
    meaning: '狐狸借老虎的威风去吓唬其他野兽。比喻依仗别人的势力欺压人。',
    origin: '《战国策·楚策一》',
    example: '他不过是狐假虎威罢了，并没有真本事。',
  },
  {
    idiom: '自相矛盾',
    pinyin: 'zì xiāng máo dùn',
    meaning: '比喻自己说话做事前后抵触。',
    origin: '《韩非子·难一》',
    example: '你刚才说的话自相矛盾，让人怎么相信你？',
  },
  {
    idiom: '滥竽充数',
    pinyin: 'làn yú chōng shù',
    meaning: '比喻没有真才实学的人混在行家里面充数，或比喻拿不好的东西混在好的里面。',
    origin: '《韩非子·内储说上》',
    example: '我不会唱歌，参加合唱团只是滥竽充数而已。',
  },
  {
    idiom: '揠苗助长',
    pinyin: 'yà miáo zhù zhǎng',
    meaning: '把苗拔起，帮助其生长。比喻违反事物发展的客观规律，急于求成，反而把事情弄糟。',
    origin: '《孟子·公孙丑上》',
    example: '教育孩子要循序渐进，揠苗助长只会适得其反。',
  },
  {
    idiom: '南辕北辙',
    pinyin: 'nán yuán běi zhé',
    meaning: '想往南而车子却向北行。比喻行动和目的正好相反。',
    origin: '《战国策·魏策四》',
    example: '你想提高成绩却整天玩游戏，这岂不是南辕北辙？',
  },
  {
    idiom: '买椟还珠',
    pinyin: 'mǎi dú huán zhū',
    meaning: '买下装珍珠的匣子，退还了珍珠。比喻没有眼力，取舍不当。',
    origin: '《韩非子·外储说左上》',
    example: '只看包装不看内容，无异于买椟还珠。',
  },
  {
    idiom: '杞人忧天',
    pinyin: 'qǐ rén yōu tiān',
    meaning: '杞国有人担心天会塌下来。比喻不必要的或缺乏根据的忧虑和担心。',
    origin: '《列子·天瑞》',
    example: '事情还没发生你就这么担心，真是杞人忧天。',
  },
  {
    idiom: '愚公移山',
    pinyin: 'yú gōng yí shān',
    meaning: '比喻坚持不懈地改造自然和坚定不移地进行斗争。',
    origin: '《列子·汤问》',
    example: '只要有愚公移山的精神，再大的困难也能克服。',
  },
  {
    idiom: '精卫填海',
    pinyin: 'jīng wèi tián hǎi',
    meaning: '比喻意志坚决，不畏艰难。',
    origin: '《山海经·北山经》',
    example: '她以精卫填海般的毅力，终于完成了这部著作。',
  },
  {
    idiom: '夸父追日',
    pinyin: 'kuā fù zhuī rì',
    meaning: '比喻人有宏大的志向，或比喻不自量力。',
    origin: '《山海经·海外北经》',
    example: '夸父追日的故事激励着我们勇敢追求梦想。',
  },
  {
    idiom: '卧薪尝胆',
    pinyin: 'wò xīn cháng dǎn',
    meaning: '薪：柴草。睡觉睡在柴草上，吃饭睡觉都尝一尝苦胆。形容人刻苦自励，发奋图强。',
    origin: '《史记·越王勾践世家》',
    example: '经过卧薪尝胆的努力，他终于考上了理想的大学。',
  },
  {
    idiom: '破釜沉舟',
    pinyin: 'pò fǔ chén zhōu',
    meaning: '比喻下定决心，不顾一切地干到底。',
    origin: '《史记·项羽本纪》',
    example: '既然决定了，就要有破釜沉舟的勇气去完成它。',
  },
  {
    idiom: '背水一战',
    pinyin: 'bèi shuǐ yī zhàn',
    meaning: '表示没有退路。比喻与敌人决一死战。',
    origin: '《史记·淮阴侯列传》',
    example: '面对强大的对手，我们只能背水一战了。',
  },
  {
    idiom: '四面楚歌',
    pinyin: 'sì miàn chǔ gē',
    meaning: '比喻陷入四面受敌、孤立无援的境地。',
    origin: '《史记·项羽本纪》',
    example: '公司现在四面楚歌，处境十分艰难。',
  },
  {
    idiom: '草木皆兵',
    pinyin: 'cǎo mù jiē bīng',
    meaning: '把山上的草木都当做敌兵。形容人在惊慌时疑神疑鬼。',
    origin: '《晋书·苻坚载记》',
    example: '别草木皆兵了，那只是风吹动树枝的声音。',
  },
  {
    idiom: '风声鹤唳',
    pinyin: 'fēng shēng hè lì',
    meaning: '听到风声和鹤叫声，都疑心是追兵。形容惊慌失措，或自相惊扰。',
    origin: '《晋书·谢玄传》',
    example: '战败后，士兵们风声鹤唳，狼狈逃窜。',
  },
  {
    idiom: '唇亡齿寒',
    pinyin: 'chún wáng chǐ hán',
    meaning: '嘴唇没有了，牙齿就会感到寒冷。比喻双方关系密切，相互依存。',
    origin: '《左传·僖公五年》',
    example: '两国唇亡齿寒，理应相互支援。',
  },
  {
    idiom: '完璧归赵',
    pinyin: 'wán bì guī zhào',
    meaning: '本指蔺相如将和氏璧完好地自秦送回赵国。后比喻把原物完好地归还本人。',
    origin: '《史记·廉颇蔺相如列传》',
    example: '借的书我会完璧归赵，请放心。',
  },
  {
    idiom: '负荆请罪',
    pinyin: 'fù jīng qǐng zuì',
    meaning: '背着荆条向对方请罪。表示向人认错赔罪。',
    origin: '《史记·廉颇蔺相如列传》',
    example: '我知道错了，明天就去向他负荆请罪。',
  },
  {
    idiom: '纸上谈兵',
    pinyin: 'zhǐ shàng tán bīng',
    meaning: '在纸面上谈论打仗。比喻空谈理论，不能解决实际问题。',
    origin: '《史记·廉颇蔺相如列传》',
    example: '只会纸上谈兵的人，遇到实际问题往往束手无策。',
  },
  {
    idiom: '邯郸学步',
    pinyin: 'hán dān xué bù',
    meaning: '比喻模仿别人不到家，反把原来自己会的东西忘了。',
    origin: '《庄子·秋水》',
    example: '学习别人的长处要结合自身实际，否则会邯郸学步。',
  },
  {
    idiom: '东施效颦',
    pinyin: 'dōng shī xiào pín',
    meaning: '比喻盲目模仿，效果适得其反。',
    origin: '《庄子·天运》',
    example: '不顾自身条件盲目效仿，只会东施效颦，惹人笑话。',
  },
  {
    idiom: '班门弄斧',
    pinyin: 'bān mén nòng fǔ',
    meaning: '在鲁班门前摆弄斧子。比喻在行家面前卖弄本领，不自量力。',
    origin: '明·梅之涣《题李白墓》',
    example: '在您这位专家面前谈这个，我真是班门弄斧了。',
  },
  {
    idiom: '锦上添花',
    pinyin: 'jǐn shàng tiān huā',
    meaning: '在锦上再绣花。比喻好上加好，美上添美。',
    origin: '宋·黄庭坚《了了庵颂》',
    example: '这件礼物送给本来就富有的他，不过是锦上添花。',
  },
  {
    idiom: '雪中送炭',
    pinyin: 'xuě zhōng sòng tàn',
    meaning: '在下雪天给人送炭取暖。比喻在别人急需时给以物质上或精神上的帮助。',
    origin: '宋·范成大《大雪送炭与芥隐》',
    example: '你在我最困难的时候帮忙，真是雪中送炭。',
  },
  {
    idiom: '望梅止渴',
    pinyin: 'wàng méi zhǐ kě',
    meaning: '原意是梅子酸，人想吃梅子就会流涎，因而止渴。后比喻愿望无法实现，用空想安慰自己。',
    origin: '《世说新语·假谲》',
    example: '画饼充饥、望梅止渴，都解决不了眼前的实际问题。',
  },
  {
    idiom: '画饼充饥',
    pinyin: 'huà bǐng chōng jī',
    meaning: '画个饼来解除饥饿。比喻用空想来安慰自己。',
    origin: '《三国志·魏志·卢毓传》',
    example: '不付诸行动的计划，不过是画饼充饥罢了。',
  },
  {
    idiom: '对牛弹琴',
    pinyin: 'duì niú tán qín',
    meaning: '比喻说话不看对象，或对愚蠢的人讲深奥的道理。',
    origin: '汉·牟融《理惑论》',
    example: '跟不讲道理的人讲道理，无异于对牛弹琴。',
  },
  {
    idiom: '杯弓蛇影',
    pinyin: 'bēi gōng shé yǐng',
    meaning: '将映在酒杯里的弓影误认为蛇。比喻因疑神疑鬼而引起恐惧。',
    origin: '汉·应劭《风俗通义》',
    example: '你别杯弓蛇影了，那只是根绳子而已。',
  },
  {
    idiom: '叶公好龙',
    pinyin: 'yè gōng hào lóng',
    meaning: '比喻口头上说爱好某事物，实际上并不真爱好。',
    origin: '《新序·杂事五》',
    example: '他说喜欢冒险，可一听到真要去登山就退缩了，真是叶公好龙。',
  },
]

// ============ 查询 ============
const searchQuery = ref('')

const searchResults = computed<IdiomItem[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return idiomLibrary
  return idiomLibrary.filter(
    (it) =>
      it.idiom.toLowerCase().includes(q) ||
      it.pinyin.toLowerCase().includes(q) ||
      it.meaning.toLowerCase().includes(q),
  )
})

const hasLocalMatch = computed(() => searchResults.value.length > 0)

// AI 兜底查询
type AiStatus = 'idle' | 'loading' | 'done' | 'error'
const aiStatus = ref<AiStatus>('idle')
const aiError = ref('')
const aiResult = ref<IdiomItem | null>(null)
let aiAbort: AbortController | null = null

function parseAiIdiom(text: string): IdiomItem | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (!t.startsWith('{')) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) t = m[0]
  }
  try {
    const obj = JSON.parse(t)
    if (!obj || typeof obj.idiom !== 'string') return null
    return {
      idiom: String(obj.idiom),
      pinyin: String(obj.pinyin || ''),
      meaning: String(obj.meaning || ''),
      origin: String(obj.origin || ''),
      example: String(obj.example || ''),
    }
  } catch {
    return null
  }
}

async function aiSearch() {
  if (aiStatus.value === 'loading') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  const q = searchQuery.value.trim()
  if (!q) {
    toast.warning('请输入要查询的成语或关键字')
    return
  }
  aiStatus.value = 'loading'
  aiError.value = ''
  aiResult.value = null
  aiAbort = new AbortController()
  try {
    const text = await aiChat({
      messages: [
        {
          role: 'system',
          content:
            '你是一位成语词典专家，熟悉汉语成语的拼音、释义、出处和造句。' +
            '请严格按 JSON 格式输出，不要 markdown 代码块，不要任何解释文字。',
        },
        {
          role: 'user',
          content:
            `请查询成语"${q}"，输出如下 JSON：\n` +
            `{"idiom":"成语","pinyin":"拼音(带声调,空格分隔)","meaning":"释义","origin":"出处","example":"造句"}\n` +
            `若查询的不是成语或查不到，返回 {"idiom":"","pinyin":"","meaning":"未查到该成语","origin":"","example":""}`,
        },
      ],
      temperature: 0.3,
      stream: false,
      signal: aiAbort.signal,
    })
    const payload = parseAiIdiom(text)
    if (!payload) {
      aiStatus.value = 'error'
      aiError.value = 'AI 返回内容无法解析，请重试'
      toast.error('查询失败，请重试')
      return
    }
    aiResult.value = payload
    aiStatus.value = 'done'
    if (!payload.idiom) toast.info('未查到该成语')
    else toast.success('已查询到成语')
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      aiStatus.value = 'idle'
      toast.info('已取消查询')
      return
    }
    aiStatus.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      aiError.value = e.message
      toast.error(e.message)
    } else {
      aiError.value = '查询失败：' + (e?.message || '未知错误')
      toast.error('查询失败，请稍后重试')
    }
  } finally {
    aiAbort = null
  }
}

function stopAi() {
  aiAbort?.abort()
}

// ============ 朗读 ============
const speakingKey = ref<string | null>(null)

function speakIdiom(item: IdiomItem, key: string) {
  try {
    if (speakingKey.value === key) {
      window.speechSynthesis.cancel()
      speakingKey.value = null
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(`${item.idiom}。${item.meaning}`)
    u.lang = 'zh-CN'
    u.rate = 0.9
    u.onend = () => {
      speakingKey.value = null
    }
    u.onerror = () => {
      speakingKey.value = null
    }
    speakingKey.value = key
    window.speechSynthesis.speak(u)
  } catch {
    speakingKey.value = null
    toast.error('朗读功能不可用')
  }
}

// ============ 成语接龙 ============
interface ChainItem {
  idiom: string
  pinyin: string
}
interface ChainResult {
  chain: ChainItem[]
  nextChar: string
}

const chainInput = ref('')
const chain = ref<ChainItem[]>([])
const nextChar = ref('')
type ChainStatus = 'idle' | 'loading' | 'done' | 'error'
const chainStatus = ref<ChainStatus>('idle')
const chainError = ref('')
let chainAbort: AbortController | null = null

function parseChain(text: string, expectedCount?: number): ChainResult | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (!t.startsWith('{')) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) t = m[0]
  }
  try {
    const obj = JSON.parse(t)
    if (!obj || !Array.isArray(obj.chain)) return null
    const items = obj.chain
      .filter((c: any) => c && typeof c.idiom === 'string')
      .map((c: any) => ({
        idiom: String(c.idiom),
        pinyin: String(c.pinyin || ''),
      }))
      .filter((c: ChainItem) => c.idiom)
    if (!items.length) return null
    if (expectedCount && items.length < expectedCount) return null
    return {
      chain: items,
      nextChar: String(obj.nextChar || items[items.length - 1].idiom.slice(-1) || ''),
    }
  } catch {
    return null
  }
}

async function startChain() {
  if (chainStatus.value === 'loading') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  const start = chainInput.value.trim()
  if (!start) {
    toast.warning('请输入起始成语')
    return
  }
  if (start.length < 2) {
    toast.warning('请输入有效的成语')
    return
  }
  chainStatus.value = 'loading'
  chainError.value = ''
  chain.value = [{ idiom: start, pinyin: '' }]
  nextChar.value = start.slice(-1)
  chainAbort = new AbortController()
  try {
    const text = await aiChat({
      messages: [
        {
          role: 'system',
          content:
            '你是一位成语接龙高手，熟悉汉语成语。' +
            '接龙规则：后一个成语的首字必须与前一个成语的尾字同字（或同音）。' +
            '严格只输出 JSON，不要 markdown 代码块，不要任何解释文字。',
        },
        {
          role: 'user',
          content:
            `请从成语"${start}"开始接龙，续接 4 个成语，共 5 个成语（含起始成语）。\n` +
            `严格只输出如下 JSON：\n` +
            `{"chain":[{"idiom":"成语1(=起始)","pinyin":"拼音1"},{"idiom":"成语2","pinyin":"拼音2"},...],"nextChar":"最后一个成语的尾字"}\n` +
            `要求：每个成语必须是真实存在的四字成语；拼音带声调，空格分隔；chain 第一个就是"${start}"。`,
        },
      ],
      temperature: 0.6,
      stream: false,
      signal: chainAbort.signal,
    })
    const payload = parseChain(text, 1)
    if (!payload) {
      chainStatus.value = 'error'
      chainError.value = 'AI 返回内容无法解析，请重试'
      toast.error('接龙失败，请重试')
      return
    }
    chain.value = payload.chain
    nextChar.value = payload.nextChar || payload.chain[payload.chain.length - 1].idiom.slice(-1)
    chainStatus.value = 'done'
    toast.success(`已接龙 ${payload.chain.length} 个成语`)
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      chainStatus.value = 'idle'
      toast.info('已取消接龙')
      return
    }
    chainStatus.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      chainError.value = e.message
      toast.error(e.message)
    } else {
      chainError.value = '接龙失败：' + (e?.message || '未知错误')
      toast.error('接龙失败，请稍后重试')
    }
  } finally {
    chainAbort = null
  }
}

async function continueChain() {
  if (chainStatus.value === 'loading') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  if (!chain.value.length) {
    toast.warning('请先开始接龙')
    return
  }
  const last = chain.value[chain.value.length - 1].idiom
  chainStatus.value = 'loading'
  chainError.value = ''
  chainAbort = new AbortController()
  try {
    const text = await aiChat({
      messages: [
        {
          role: 'system',
          content:
            '你是一位成语接龙高手，熟悉汉语成语。' +
            '接龙规则：后一个成语的首字必须与前一个成语的尾字同字（或同音）。' +
            '严格只输出 JSON，不要 markdown 代码块，不要任何解释文字。',
        },
        {
          role: 'user',
          content:
            `请从成语"${last}"开始继续接龙，续接 4 个成语（不含"${last}"本身）。\n` +
            `严格只输出如下 JSON：\n` +
            `{"chain":[{"idiom":"新成语1","pinyin":"拼音1"},...],"nextChar":"最后一个成语的尾字"}\n` +
            `要求：每个成语必须是真实存在的四字成语；新成语的首字必须与"${last}"的尾字"${last.slice(-1)}"同字或同音。`,
        },
      ],
      temperature: 0.6,
      stream: false,
      signal: chainAbort.signal,
    })
    const payload = parseChain(text, 1)
    if (!payload) {
      chainStatus.value = 'error'
      chainError.value = 'AI 返回内容无法解析，请重试'
      toast.error('接龙失败，请重试')
      return
    }
    chain.value = [...chain.value, ...payload.chain]
    nextChar.value = payload.nextChar || payload.chain[payload.chain.length - 1].idiom.slice(-1)
    chainStatus.value = 'done'
    toast.success(`已续接 ${payload.chain.length} 个成语`)
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      chainStatus.value = 'done'
      toast.info('已取消续接')
      return
    }
    chainStatus.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      chainError.value = e.message
      toast.error(e.message)
    } else {
      chainError.value = '接龙失败：' + (e?.message || '未知错误')
      toast.error('接龙失败，请稍后重试')
    }
  } finally {
    chainAbort = null
  }
}

function stopChain() {
  chainAbort?.abort()
}

function resetChain() {
  stopChain()
  chain.value = []
  nextChar.value = ''
  chainStatus.value = 'idle'
  chainError.value = ''
  toast.info('已重置接龙')
}

function switchTab(tab: Tab) {
  if (aiStatus.value === 'loading') stopAi()
  if (chainStatus.value === 'loading') stopChain()
  activeTab.value = tab
}

onUnmounted(() => {
  if (aiAbort) aiAbort.abort()
  if (chainAbort) chainAbort.abort()
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* noop */
  }
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-rose-100 via-amber-50 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-2xl shadow-softer">
          📚
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">成语词典</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            内置小学常用成语（含拼音、释义、出处、造句），支持朗读与 AI 兜底查询；成语接龙由 AI 续接。
          </p>
        </div>
      </div>
    </section>

    <!-- Tab 切换 -->
    <section class="card-flat p-2 flex gap-1">
      <button
        class="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
        :class="activeTab === 'search' ? 'bg-rose-500 text-white shadow-sm' : 'text-cocoa-600 hover:bg-cream-100'"
        @click="switchTab('search')"
      >
        <Search :size="14" /> 成语查询
      </button>
      <button
        class="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
        :class="activeTab === 'chain' ? 'bg-rose-500 text-white shadow-sm' : 'text-cocoa-600 hover:bg-cream-100'"
        @click="switchTab('chain')"
      >
        <Link2 :size="14" /> 成语接龙
      </button>
    </section>

    <!-- ============ 成语查询 ============ -->
    <template v-if="activeTab === 'search'">
      <section class="card-flat p-4">
        <label class="text-xs text-cocoa-500 ml-1">搜索成语（支持成语 / 拼音 / 释义关键字）</label>
        <div class="relative mt-1">
          <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-cocoa-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="如：画蛇添足 / huà shé / 蛇"
            class="w-full pl-7 pr-3 py-2 card-flat text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
            @keydown.enter="aiStatus = 'idle'; aiResult = null"
          />
        </div>
        <div class="mt-2 flex items-center justify-between flex-wrap gap-2">
          <span class="text-xs text-cocoa-500">
            内置库共 {{ idiomLibrary.length }} 个成语
            <span v-if="searchQuery.trim()"> · 匹配 {{ searchResults.length }} 个</span>
          </span>
          <div class="flex items-center gap-2">
            <span v-if="speakingKey" class="flex items-center gap-1 text-xs text-rose-500">
              <Volume2 :size="12" class="animate-pulse" /> 朗读中
            </span>
            <button
              v-if="aiStatus === 'loading'"
              class="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
              @click="stopAi"
            >
              <Loader2 :size="12" class="animate-spin" /> 停止
            </button>
            <button
              v-else
              class="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1"
              :class="!hasApiKey || !searchQuery.trim() ? 'opacity-50 cursor-not-allowed' : ''"
              :disabled="!hasApiKey || !searchQuery.trim()"
              @click="aiSearch"
            >
              <Sparkles :size="12" /> 用 AI 查询
            </button>
          </div>
        </div>
      </section>

      <!-- API Key 缺失提示（AI 查询场景） -->
      <div
        v-if="!hasApiKey"
        class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2"
      >
        <AlertCircle :size="12" />
        <span>内置成语库可正常使用；AI 兜底查询需先在「AI 对话 → 设置」中配置 API Key</span>
      </div>

      <!-- AI 查询中 -->
      <section v-if="aiStatus === 'loading'" class="card-flat p-8 text-center">
        <Loader2 :size="32" class="animate-spin mx-auto text-rose-500 mb-3" />
        <p class="text-cocoa-700 text-sm">AI 正在查询成语...</p>
      </section>

      <!-- AI 查询错误 -->
      <section v-else-if="aiStatus === 'error'" class="card-flat p-6 text-center">
        <AlertCircle :size="28" class="mx-auto text-rose-500 mb-2" />
        <p class="text-cocoa-700 text-sm">{{ aiError }}</p>
        <button class="btn-primary mt-3 px-4 py-1.5 text-sm" @click="aiSearch">重新查询</button>
      </section>

      <!-- AI 查询结果 -->
      <section v-else-if="aiStatus === 'done' && aiResult" class="card-flat p-5">
        <h3 class="text-sm font-medium text-rose-600 mb-3 flex items-center gap-1.5">
          <Sparkles :size="14" /> AI 查询结果
        </h3>
        <div v-if="aiResult.idiom" class="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="text-2xl font-bold text-cocoa-900 font-serif">{{ aiResult.idiom }}</div>
              <div class="text-xs text-cocoa-500 mt-1">{{ aiResult.pinyin }}</div>
            </div>
            <button
              class="p-1.5 rounded-lg hover:bg-rose-100 text-cocoa-500 hover:text-rose-600 transition-colors"
              :class="speakingKey === 'ai' ? 'bg-rose-100 text-rose-600' : ''"
              title="朗读"
              @click="speakIdiom(aiResult, 'ai')"
            >
              <Volume2 :size="16" />
            </button>
          </div>
          <div class="space-y-1.5 text-sm">
            <p><span class="text-rose-500 font-medium text-xs">释义：</span><span class="text-cocoa-700">{{ aiResult.meaning }}</span></p>
            <p><span class="text-rose-500 font-medium text-xs">出处：</span><span class="text-cocoa-700">{{ aiResult.origin }}</span></p>
            <p><span class="text-rose-500 font-medium text-xs">造句：</span><span class="text-cocoa-700">{{ aiResult.example }}</span></p>
          </div>
        </div>
        <p v-else class="text-sm text-cocoa-600 text-center py-4">{{ aiResult.meaning }}</p>
      </section>

      <!-- 内置成语卡片网格 -->
      <div v-if="hasLocalMatch" class="px-1 text-xs text-cocoa-500 flex items-center gap-1">
        <BookOpen :size="12" class="text-rose-500" /> 内置成语库结果
      </div>
      <section v-if="hasLocalMatch" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="item in searchResults"
          :key="item.idiom"
          class="card-flat p-4 flex flex-col transition-all hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-cocoa-900 font-serif truncate">{{ item.idiom }}</h3>
              <div class="text-xs text-cocoa-500 mt-0.5">{{ item.pinyin }}</div>
            </div>
            <button
              class="shrink-0 p-1.5 rounded-lg hover:bg-rose-100 text-cocoa-500 hover:text-rose-600 transition-colors"
              :class="speakingKey === item.idiom ? 'bg-rose-100 text-rose-600' : ''"
              title="朗读"
              @click="speakIdiom(item, item.idiom)"
            >
              <Volume2 :size="16" />
            </button>
          </div>
          <div class="space-y-1.5 text-xs flex-1">
            <p><span class="text-rose-500 font-medium">释义：</span><span class="text-cocoa-700 leading-relaxed">{{ item.meaning }}</span></p>
            <p><span class="text-rose-500 font-medium">出处：</span><span class="text-cocoa-700">{{ item.origin }}</span></p>
            <p><span class="text-rose-500 font-medium">造句：</span><span class="text-cocoa-700 leading-relaxed">{{ item.example }}</span></p>
          </div>
        </div>
      </section>

      <!-- 内置库无匹配提示 -->
      <section v-else-if="searchQuery.trim() && !hasLocalMatch && aiStatus !== 'loading'" class="card-flat p-8 text-center">
        <div class="text-4xl mb-3">🔍</div>
        <p class="text-cocoa-700 text-sm">内置库未找到 "{{ searchQuery.trim() }}" 相关成语</p>
        <p class="text-cocoa-400 text-xs mt-1">可尝试点击"用 AI 查询"由 AI 兜底查询</p>
        <button
          class="btn-primary mt-4 px-4 py-1.5 text-sm flex items-center gap-1.5 mx-auto"
          :disabled="!hasApiKey"
          @click="aiSearch"
        >
          <Sparkles :size="14" /> 用 AI 查询
        </button>
      </section>
    </template>

    <!-- ============ 成语接龙 ============ -->
    <template v-else>
      <section class="card-flat p-4">
        <label class="text-xs text-cocoa-500 ml-1">起始成语</label>
        <div class="flex gap-2 mt-1">
          <input
            v-model="chainInput"
            type="text"
            placeholder="如：一马当先 / 海阔天空"
            class="flex-1 card-flat px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
            :disabled="chainStatus === 'loading'"
            @keydown.enter="startChain"
          />
          <button
            v-if="chainStatus === 'loading'"
            class="btn-secondary px-4 py-2 flex items-center gap-1.5"
            @click="stopChain"
          >
            <Loader2 :size="14" class="animate-spin" /> 停止
          </button>
          <button
            v-else-if="chainStatus === 'done'"
            class="btn-secondary px-4 py-2 flex items-center gap-1.5"
            :disabled="!hasApiKey || !chainInput.trim()"
            @click="startChain"
          >
            <RotateCcw :size="14" /> 重新开始
          </button>
          <button
            v-else
            class="btn-primary px-5 py-2 flex items-center gap-1.5"
            :disabled="!hasApiKey || !chainInput.trim()"
            @click="startChain"
          >
            <Sparkles :size="14" /> 开始接龙
          </button>
        </div>
        <div
          v-if="!hasApiKey"
          class="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2"
        >
          <AlertCircle :size="12" />
          <span>成语接龙需调用 AI，请先在「AI 对话 → 设置」中配置 API Key</span>
        </div>
      </section>

      <!-- 接龙中 -->
      <section v-if="chainStatus === 'loading' && !chain.length" class="card-flat p-8 text-center">
        <Loader2 :size="32" class="animate-spin mx-auto text-rose-500 mb-3" />
        <p class="text-cocoa-700 text-sm">AI 正在接龙...</p>
      </section>

      <!-- 错误 -->
      <section v-else-if="chainStatus === 'error'" class="card-flat p-6 text-center">
        <AlertCircle :size="28" class="mx-auto text-rose-500 mb-2" />
        <p class="text-cocoa-700 text-sm">{{ chainError }}</p>
        <button class="btn-primary mt-3 px-4 py-1.5 text-sm" @click="startChain">重新开始</button>
      </section>

      <!-- 接龙链条 -->
      <template v-else-if="chain.length">
        <section class="card-flat p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 class="text-base font-medium text-cocoa-900 flex items-center gap-1.5">
              <Link2 :size="16" class="text-rose-500" /> 接龙链条（{{ chain.length }} 个）
            </h3>
            <span v-if="nextChar" class="text-xs text-cocoa-500">
              下一成语首字：
              <span class="text-rose-600 font-semibold text-base">{{ nextChar }}</span>
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <template v-for="(item, i) in chain" :key="i">
              <div
                class="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col items-center min-w-[88px]"
              >
                <span class="text-lg font-semibold text-cocoa-900 font-serif">{{ item.idiom }}</span>
                <span v-if="item.pinyin" class="text-[10px] text-cocoa-500 mt-0.5">{{ item.pinyin }}</span>
              </div>
              <ChevronRight v-if="i < chain.length - 1" :size="16" class="text-rose-300 shrink-0" />
            </template>
          </div>

          <!-- 接龙中提示 -->
          <div v-if="chainStatus === 'loading'" class="mt-4 flex items-center justify-center gap-1.5 text-xs text-rose-500">
            <Loader2 :size="12" class="animate-spin" /> AI 续接中...
          </div>

          <!-- 控制按钮 -->
          <div v-else class="mt-5 flex items-center justify-center gap-2 flex-wrap">
            <button
              class="btn-primary px-4 py-2 flex items-center gap-1.5"
              :disabled="!hasApiKey"
              @click="continueChain"
            >
              <Sparkles :size="14" /> 继续接龙
            </button>
            <button
              class="btn-ghost !px-3 !py-2 text-sm flex items-center gap-1.5"
              @click="resetChain"
            >
              <RotateCcw :size="14" /> 重新开始
            </button>
          </div>
        </section>
      </template>

      <!-- 空状态 -->
      <section v-else class="card-flat p-10 text-center">
        <div class="text-5xl mb-3">🐉</div>
        <p class="text-cocoa-700 text-sm">输入一个起始成语，点击"开始接龙"</p>
        <p class="text-cocoa-400 text-xs mt-1">AI 将续接 4 个成语，可继续接龙或重新开始</p>
      </section>
    </template>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：内置库支持关键字搜索与朗读；查不到时可用 AI 兜底查询；接龙由 AI 续接
    </div>
  </div>
</template>
