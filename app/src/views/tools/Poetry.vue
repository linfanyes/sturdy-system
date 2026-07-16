<!--
  Poetry.vue
  古诗词助手：内置小学常见古诗（按年级分组），支持按年级/主题/关键词筛选、
  朗读原文、复制原文、展开查看译文与赏析。适合语文老师课堂展示与学生背诵复习。
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Volume2, Search, BookOpen, ChevronDown } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface Poem {
  title: string
  author: string
  dynasty: string
  content: string
  translation: string
  appreciation: string
  category: '思乡' | '咏物' | '写景' | '送别' | '节庆'
}

interface PoemGroup {
  grade: string
  poems: Poem[]
}

// ============ 内置古诗词库 ============
const poemLibrary: PoemGroup[] = [
  {
    grade: '一二年级',
    poems: [
      {
        title: '静夜思',
        author: '李白',
        dynasty: '唐',
        content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。',
        translation: '明亮的月光洒在床前的窗户纸上，好像地上泛起了一层霜。\n我禁不住抬起头，看那天窗外空中的一轮明月，不由得低下头来沉思，想起远方的家乡。',
        appreciation: '这首诗以平实的语言写出了诗人在静夜里思念家乡的心情。"举头"与"低头"两个动作，生动地表现出诗人由望月而思乡的过程，寥寥二十字，意味深长。',
        category: '思乡',
      },
      {
        title: '春晓',
        author: '孟浩然',
        dynasty: '唐',
        content: '春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。',
        translation: '春日里贪睡不知不觉天就亮了，到处可以听到小鸟的鸣叫声。\n回想昨夜的阵阵风雨声，不知吹落了多少美丽的春花。',
        appreciation: '诗人通过春晨初醒时的所闻所想，描绘出一幅生机盎然的春晓图。语言自然平易，却含蓄地表达了惜春之情，意境清新悠远。',
        category: '写景',
      },
      {
        title: '咏鹅',
        author: '骆宾王',
        dynasty: '唐',
        content: '鹅，鹅，鹅，曲项向天歌。\n白毛浮绿水，红掌拨清波。',
        translation: '鹅啊鹅，弯着脖子向天欢叫。\n洁白的羽毛漂浮在碧绿的水面上，红色的脚掌拨动着清清的水波。',
        appreciation: '相传这是诗人七岁时的作品。以儿童的视角观察鹅在水中游弋的姿态，色彩鲜明，动静结合，活灵活现，是咏物诗的佳作。',
        category: '咏物',
      },
      {
        title: '悯农',
        author: '李绅',
        dynasty: '唐',
        content: '锄禾日当午，汗滴禾下土。\n谁知盘中餐，粒粒皆辛苦。',
        translation: '农民在正午烈日的暴晒下锄禾，汗水滴入禾苗生长的土壤里。\n又有谁知道盘中的饭食，每颗每粒都是农民用辛勤的劳动换来的呢？',
        appreciation: '诗人以通俗的语言描绘了农民劳作的艰辛，告诫人们要珍惜粮食。全诗对比鲜明，寓意深刻，千百年来广为传诵。',
        category: '咏物',
      },
      {
        title: '登鹳雀楼',
        author: '王之涣',
        dynasty: '唐',
        content: '白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。',
        translation: '夕阳依傍着西山慢慢地沉没，滔滔黄河朝着东海汹涌奔流。\n若想把千里的风光景物看够，那就要登上更高的一层城楼。',
        appreciation: '前两句写景，气势磅礴；后两句抒情，蕴含哲理。"欲穷千里目，更上一层楼"已成为激励人们不断进取的千古名句。',
        category: '写景',
      },
      {
        title: '望庐山瀑布',
        author: '李白',
        dynasty: '唐',
        content: '日照香炉生紫烟，遥看瀑布挂前川。\n飞流直下三千尺，疑是银河落九天。',
        translation: '太阳照射的香炉峰生起紫色烟霞，远远望去瀑布像白绢悬挂在山前。\n瀑布凌空而起飞流直下三千尺，让人怀疑是银河从九天倾泻而下。',
        appreciation: '诗人运用大胆的想象和夸张的比喻，把庐山瀑布写得雄伟奇丽。"飞流直下三千尺，疑是银河落九天"成为描写瀑布的千古绝唱。',
        category: '写景',
      },
      {
        title: '赋得古原草送别',
        author: '白居易',
        dynasty: '唐',
        content: '离离原上草，一岁一枯荣。\n野火烧不尽，春风吹又生。',
        translation: '原野上长满茂盛的青草，每年秋冬枯黄春来草色绿。\n无情的野火只能烧掉干叶，春风吹来大地又是绿茸茸。',
        appreciation: '此诗通过对古原上野草的描绘，抒发送别友人时的依依惜别之情。"野火烧不尽，春风吹又生"歌颂了野草顽强的生命力，成为流传千古的名句。',
        category: '咏物',
      },
      {
        title: '游子吟',
        author: '孟郊',
        dynasty: '唐',
        content: '慈母手中线，游子身上衣。\n临行密密缝，意恐迟迟归。\n谁言寸草心，报得三春晖。',
        translation: '慈母用手中的针线，为远行的儿子赶制身上的衣衫。\n临行前一针针密密地缝缀，怕的是儿子回来得晚衣服破损。\n有谁敢说，子女像小草那样微弱的孝心，能够报答得了像春晖普泽的慈母恩情呢？',
        appreciation: '这是一首母爱的颂歌。诗人通过回忆临行前母亲为自已缝制衣衫的平凡小事，表现了母亲对儿女深挚的爱，语言通俗而感情真挚。',
        category: '思乡',
      },
    ],
  },
  {
    grade: '三四年级',
    poems: [
      {
        title: '春夜喜雨',
        author: '杜甫',
        dynasty: '唐',
        content: '好雨知时节，当春乃发生。\n随风潜入夜，润物细无声。\n野径云俱黑，江船火独明。\n晓看红湿处，花重锦官城。',
        translation: '好雨似乎会挑选时辰，降临在万物萌生之春。\n伴随和风，悄悄进入夜幕。细细密密，滋润大地万物。\n浓浓乌云，笼罩田野小路，点点灯火，闪烁江上渔船。\n明早再看带露的鲜花，成都满城必将繁花盛开。',
        appreciation: '诗人以细致入微的观察，描绘了春夜降雨、润泽万物的美景。"随风潜入夜，润物细无声"用拟人手法写出春雨润物之功，成为描写春雨的千古佳句。',
        category: '写景',
      },
      {
        title: '题西林壁',
        author: '苏轼',
        dynasty: '宋',
        content: '横看成岭侧成峰，远近高低各不同。\n不识庐山真面目，只缘身在此山中。',
        translation: '从正面看庐山是连绵不断的山岭，从侧面看庐山是高耸入云的山峰。从远处、近处、高处、低处看庐山，庐山呈现各种不同的样子。\n我之所以认不清庐山真正的面目，是因为我人身处在庐山之中。',
        appreciation: '此诗写景寄理。"不识庐山真面目，只缘身在此山中"既写出了庐山雄奇多变的风貌，又蕴含着"当局者迷，旁观者清"的深刻哲理，是宋诗理趣的代表。',
        category: '写景',
      },
      {
        title: '饮湖上初晴后雨',
        author: '苏轼',
        dynasty: '宋',
        content: '水光潋滟晴方好，山色空蒙雨亦奇。\n欲把西湖比西子，淡妆浓抹总相宜。',
        translation: '晴日阳光照耀下的西湖水波荡漾，光彩熠熠，美极了；雨天的西湖群山迷迷茫茫，若有若无，非常奇妙。\n如果把西湖比作美人西施，那么淡妆浓抹都十分美丽。',
        appreciation: '诗人运用新颖贴切的比喻，把西湖比作西施，无论是晴天还是雨天都各具风韵，成为咏赞西湖最负盛名的佳篇。',
        category: '写景',
      },
      {
        title: '元日',
        author: '王安石',
        dynasty: '宋',
        content: '爆竹声中一岁除，春风送暖入屠苏。\n千门万户曈曈日，总把新桃换旧符。',
        translation: '阵阵轰鸣的爆竹声中，旧的一年已经过去；和暖的春风吹来了新年，人们欢乐地畅饮着新酿的屠苏酒。\n初升的太阳照耀着千家万户，都把旧的桃符取下换上新的桃符。',
        appreciation: '此诗描写春节除旧迎新的景象，"爆竹声中一岁除"渲染了浓烈的节日气氛，体现了人们迎新春的喜悦心情。',
        category: '节庆',
      },
      {
        title: '泊船瓜洲',
        author: '王安石',
        dynasty: '宋',
        content: '京口瓜洲一水间，钟山只隔数重山。\n春风又绿江南岸，明月何时照我还。',
        translation: '京口和瓜洲不过一水之遥，钟山也只隔着几重青山。\n温柔的春风又吹绿了大江南岸，可是天上的明月呀，你什么时候才能照着我回家呢？',
        appreciation: '"春风又绿江南岸"是千古名句，一个"绿"字化静为动，把春风吹绿江南的景象写得生动传神，也寄托了诗人深切的思乡之情。',
        category: '思乡',
      },
      {
        title: '清明',
        author: '杜牧',
        dynasty: '唐',
        content: '清明时节雨纷纷，路上行人欲断魂。\n借问酒家何处有，牧童遥指杏花村。',
        translation: '江南清明时节细雨纷纷飘洒，路上羁旅行人个个落魄断魂。\n借问当地之人何处买酒浇愁，牧童笑而不答遥指杏花山村。',
        appreciation: '此诗写清明春雨中所见，色彩清淡，心境凄冷。"借问酒家何处有，牧童遥指杏花村"一问一答，情景生动，余味无穷。',
        category: '节庆',
      },
      {
        title: '七步诗',
        author: '曹植',
        dynasty: '三国',
        content: '煮豆燃豆萁，豆在釜中泣。\n本是同根生，相煎何太急？',
        translation: '锅里煮着豆子，豆茎在锅下燃烧。\n豆子在锅里哭泣着说：我们本来是同一条根上生长出来的，你为什么要这样紧紧逼迫我呢？',
        appreciation: '相传曹植七步成诗，以萁豆相煎为喻，控诉其兄曹丕对自己的迫害。"本是同根生，相煎何太急"成为后世表达骨肉相残的名句。',
        category: '咏物',
      },
    ],
  },
  {
    grade: '五六年级',
    poems: [
      {
        title: '望天门山',
        author: '李白',
        dynasty: '唐',
        content: '天门中断楚江开，碧水东流至此回。\n两岸青山相对出，孤帆一片日边来。',
        translation: '长江犹如巨斧劈开天门雄峰，碧绿江水东流到此回旋澎湃。\n两岸青山对峙美景难分高下，遇见一叶孤舟悠悠来自天边。',
        appreciation: '诗人通过描写天门山的雄奇壮观和长江的浩荡气势，展现了祖国山川的壮美。"两岸青山相对出，孤帆一片日边来"动静相宜，画面感强。',
        category: '写景',
      },
      {
        title: '江雪',
        author: '柳宗元',
        dynasty: '唐',
        content: '千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。',
        translation: '所有的山，飞鸟全都断绝；所有的路，不见人影踪迹。\n江上孤舟，渔翁披蓑戴笠；独自垂钓，不怕雪浸侵袭。',
        appreciation: '诗人用"千山""万径"之广阔与"孤舟""独钓"之孤寂形成强烈对比，描绘出一幅幽静寒冷的画面，寄托了自己孤傲不屈的情怀。',
        category: '写景',
      },
      {
        title: '枫桥夜泊',
        author: '张继',
        dynasty: '唐',
        content: '月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。',
        translation: '月亮已落下乌鸦啼叫寒气满天，对着江边枫树和渔火忧愁而眠。\n姑苏城外那寂寞清静寒山古寺，半夜里敲钟的声音传到了客船。',
        appreciation: '此诗精确而细腻地讲述了一个客船夜泊者对江南深秋夜景的观察和感受。"姑苏城外寒山寺，夜半钟声到客船"以声衬静，意境清远。',
        category: '思乡',
      },
      {
        title: '寻隐者不遇',
        author: '贾岛',
        dynasty: '唐',
        content: '松下问童子，言师采药去。\n只在此山中，云深不知处。',
        translation: '苍松下，我询问了年少的学童；他说，师傅已经采药去了山中。\n他还对我说：就在这座大山里，可是林深云密，我不知他行踪。',
        appreciation: '此诗采用问答体，通过寻访隐者未遇的对话，烘托出隐者的高洁和山的深邃。"只在此山中，云深不知处"含蓄隽永，耐人寻味。',
        category: '写景',
      },
      {
        title: '黄鹤楼送孟浩然之广陵',
        author: '李白',
        dynasty: '唐',
        content: '故人西辞黄鹤楼，烟花三月下扬州。\n孤帆远影碧空尽，惟见长江天际流。',
        translation: '老朋友向我频频挥手，告别了黄鹤楼，在这柳絮如烟、繁花似锦的阳春三月去扬州远游。\n友人的孤船帆影渐渐地远去，消失在碧空的尽头，只看见一线长江向邈远的天际奔流。',
        appreciation: '此诗以绚丽的春景衬托送别之情。"孤帆远影碧空尽，惟见长江天际流"写友人之船渐行渐远，最后消失在天际，只余江水东流，含不尽之意于言外。',
        category: '送别',
      },
      {
        title: '赠汪伦',
        author: '李白',
        dynasty: '唐',
        content: '李白乘舟将欲行，忽闻岸上踏歌声。\n桃花潭水深千尺，不及汪伦送我情。',
        translation: '李白坐上小船刚刚准备启程，忽然听到岸上传来告别的歌声。\n即使桃花潭水有一千尺那么深，也不及汪伦送别我的一片情深。',
        appreciation: '诗人用比兴手法，以潭水之深喻友谊之深，化无形为有形。"桃花潭水深千尺，不及汪伦送我情"成为表达深厚友谊的千古名句。',
        category: '送别',
      },
      {
        title: '送元二使安西',
        author: '王维',
        dynasty: '唐',
        content: '渭城朝雨浥轻尘，客舍青青柳色新。\n劝君更尽一杯酒，西出阳关无故人。',
        translation: '清晨的微雨湿润了渭城地面的浮尘，旅店旁的棵棵杨柳显得格外新鲜葱翠。\n真诚地劝我的朋友再干一杯美酒，向西出了阳关就难以遇到故旧亲人。',
        appreciation: '此诗是送别名作。"劝君更尽一杯酒，西出阳关无故人"把深厚情谊融于劝酒之中，惜别之意尽在言外，后来被编为乐府《阳关三叠》广为传唱。',
        category: '送别',
      },
    ],
  },
]

// ============ 筛选状态 ============
const categories = ['全部', '思乡', '咏物', '写景', '送别', '节庆'] as const
const selectedGrade = ref<string>('全部')
const selectedCategory = ref<string>('全部')
const searchQuery = ref('')

const gradeOptions = computed(() => ['全部', ...poemLibrary.map((g) => g.grade)])

const filteredPoems = computed<Poem[]>(() => {
  let list: Poem[] = []
  if (selectedGrade.value === '全部') {
    list = poemLibrary.flatMap((g) => g.poems)
  } else {
    const group = poemLibrary.find((g) => g.grade === selectedGrade.value)
    list = group ? group.poems : []
  }
  if (selectedCategory.value !== '全部') {
    list = list.filter((p) => p.category === selectedCategory.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q),
    )
  }
  return list
})

// ============ 详情面板 ============
const expandedTitle = ref<string | null>(null)

function toggleExpand(poem: Poem) {
  expandedTitle.value = expandedTitle.value === poem.title ? null : poem.title
}

// ============ 朗读 / 复制 ============
const speakingTitle = ref<string | null>(null)

function speakPoem(poem: Poem) {
  try {
    if (speakingTitle.value === poem.title) {
      window.speechSynthesis.cancel()
      speakingTitle.value = null
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`${poem.title}，${poem.dynasty}，${poem.author}。${poem.content.replace(/\n/g, '。')}`)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.onend = () => {
      speakingTitle.value = null
    }
    utterance.onerror = () => {
      speakingTitle.value = null
    }
    speakingTitle.value = poem.title
    window.speechSynthesis.speak(utterance)
  } catch {
    speakingTitle.value = null
    toast.error('朗读功能不可用')
  }
}

function copyPoem(poem: Poem) {
  const text = `《${poem.title}》\n[${poem.dynasty}] ${poem.author}\n\n${poem.content}`
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制原文'),
    () => toast.error('复制失败'),
  )
}

// 主题标签颜色映射
const categoryColor: Record<string, string> = {
  思乡: 'bg-rose-100 text-rose-600',
  咏物: 'bg-amber-100 text-amber-700',
  写景: 'bg-emerald-100 text-emerald-600',
  送别: 'bg-sky-100 text-sky-600',
  节庆: 'bg-violet-100 text-violet-600',
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />

    <section class="card-soft p-5 bg-gradient-to-br from-rose-100 via-amber-50 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center text-2xl shadow-softer">
          📜
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">古诗词助手</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            小学常见古诗词库，按年级与主题分类，支持朗读、复制与赏析查看，方便课堂展示与学生背诵。
          </p>
        </div>
      </div>
    </section>

    <!-- 筛选区 -->
    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select
            v-model="selectedGrade"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
          >
            <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">主题</label>
          <select
            v-model="selectedCategory"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
          >
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">搜索</label>
          <div class="relative mt-1">
            <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-cocoa-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="按标题 / 作者 / 诗句"
              class="w-full pl-7 pr-3 py-2 card-flat text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 结果统计 -->
    <div class="flex items-center justify-between px-1 text-xs text-cocoa-500">
      <span>共 {{ filteredPoems.length }} 首</span>
      <span v-if="speakingTitle" class="flex items-center gap-1 text-rose-500">
        <Volume2 :size="12" class="animate-pulse" /> 朗读中...
      </span>
    </div>

    <!-- 诗词卡片网格 -->
    <section v-if="filteredPoems.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="poem in filteredPoems"
        :key="poem.title"
        class="card-flat p-4 flex flex-col transition-all hover:shadow-md"
        :class="expandedTitle === poem.title ? 'ring-2 ring-rose-300' : ''"
      >
        <!-- 卡片头部 -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-cocoa-900 truncate">《{{ poem.title }}》</h3>
            <div class="text-xs text-cocoa-500 mt-0.5">
              [{{ poem.dynasty }}] {{ poem.author }}
            </div>
          </div>
          <span
            class="shrink-0 text-[10px] px-2 py-0.5 rounded-full"
            :class="categoryColor[poem.category]"
          >
            {{ poem.category }}
          </span>
        </div>

        <!-- 原文 -->
        <div class="text-sm text-cocoa-800 leading-relaxed whitespace-pre-line font-serif flex-1 my-2">
          {{ poem.content }}
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-cream-200">
          <button
            class="p-1.5 rounded-lg hover:bg-rose-100 text-cocoa-500 hover:text-rose-600 transition-colors"
            :class="speakingTitle === poem.title ? 'bg-rose-100 text-rose-600' : ''"
            title="朗读"
            @click="speakPoem(poem)"
          >
            <Volume2 :size="16" />
          </button>
          <button
            class="p-1.5 rounded-lg hover:bg-rose-100 text-cocoa-500 hover:text-rose-600 transition-colors"
            title="复制原文"
            @click="copyPoem(poem)"
          >
            <Copy :size="16" />
          </button>
          <button
            class="flex-1 ml-1 btn-ghost !py-1.5 !px-2 text-xs flex items-center justify-center gap-1"
            :class="expandedTitle === poem.title ? 'bg-rose-100 text-rose-600' : ''"
            @click="toggleExpand(poem)"
          >
            <BookOpen :size="12" />
            {{ expandedTitle === poem.title ? '收起' : '查看译文/赏析' }}
            <ChevronDown
              :size="12"
              :class="expandedTitle === poem.title ? 'rotate-180' : ''"
              class="transition-transform"
            />
          </button>
        </div>

        <!-- 展开详情 -->
        <div v-if="expandedTitle === poem.title" class="mt-3 space-y-3 border-t border-cream-200 pt-3">
          <div>
            <div class="text-[11px] text-rose-500 font-medium mb-1">译文</div>
            <p class="text-xs text-cocoa-700 leading-relaxed whitespace-pre-line">{{ poem.translation }}</p>
          </div>
          <div>
            <div class="text-[11px] text-rose-500 font-medium mb-1">赏析</div>
            <p class="text-xs text-cocoa-700 leading-relaxed">{{ poem.appreciation }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 空状态 -->
    <section v-else class="card-flat p-10 text-center">
      <div class="text-4xl mb-3">📭</div>
      <p class="text-cocoa-600 text-sm">未找到符合条件的古诗词</p>
      <p class="text-cocoa-400 text-xs mt-1">尝试调整筛选条件或清空搜索框</p>
      <button
        class="btn-secondary mt-4 !py-1.5 !px-4 text-xs"
        @click="selectedGrade = '全部'; selectedCategory = '全部'; searchQuery = ''"
      >
        重置筛选
      </button>
    </section>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：点击"查看译文/赏析"展开详情，点击喇叭图标可朗读全诗
    </div>
  </div>
</template>
