/**
 * 教学资源库种子数据：小学必背古诗词、常用数学公式定理、英语分类单词。
 * 由校管触发「一键初始化」写入本校资源库，后续可由学科组长精修。
 *  - SEED_POEMS：30 首小学必背古诗词（覆盖一年级至五年级）
 *  - SEED_MATH_FORMULAS：23 条小学常用公式定理（运算定律/几何公式/单位换算/分数小数/比例百分数/思维方法）
 *  - SEED_ENGLISH_WORDS：120 个英语分类单词（10 个场景，每类 12 个）
 */

import { Poem, MathFormula, EnglishWord } from './resource-library.entity'

export interface SeedPoem {
  title: string; dynasty: string; author: string; content: string;
  translation?: string; appreciation?: string; grade: string; keywords: string;
}
export interface SeedMathFormula {
  title: string; category: string; formula: string;
  explanation?: string; example?: string; grade: string; keywords: string;
}
export interface SeedEnglishWord {
  word: string; phonetic: string; meaning: string; category: string;
  example?: string; grade: string;
}

// ============ 古诗词（小学必背） ============

export const SEED_POEMS: SeedPoem[] = [
  {
    title: '咏鹅', dynasty: '唐', author: '骆宾王',
    content: '鹅，鹅，鹅，\n曲项向天歌。\n白毛浮绿水，\n红掌拨清波。',
    translation: '鹅啊，鹅啊，鹅啊，你弯曲着脖子向天鸣叫。雪白的羽毛浮在碧绿的水面上，红色的脚掌拨动着清清的水波。',
    appreciation: '相传为骆宾王七岁所作。诗中连用三个"鹅"字，生动传神；"白毛""红掌""绿水""清波"色彩鲜明，描绘出白鹅戏水的可爱画面。',
    grade: '一年级', keywords: '咏物,动物,儿童诗',
  },
  {
    title: '静夜思', dynasty: '唐', author: '李白',
    content: '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。',
    translation: '明亮的月光洒在床前，让人疑心是地上结了一层白霜。抬起头望着天上明月，低下头不禁思念起远方的故乡。',
    appreciation: '语言浅近而情深。以"疑"字写月光之白，以"举头""低头"两个动作传达由望月到思乡的心理变化，是思乡诗的千古名篇。',
    grade: '一年级', keywords: '思乡,月亮,夜景',
  },
  {
    title: '春晓', dynasty: '唐', author: '孟浩然',
    content: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
    translation: '春天的夜晚睡得香甜，不知不觉就到了天亮，醒来时到处都能听到鸟儿的啼叫。回想昨夜的风声雨声，不知娇美的花儿被吹落了多少。',
    appreciation: '不写醒时之景而写醒后所闻所想，以"知多少"的疑问含蓄表达惜春之情，意境清新自然。',
    grade: '一年级', keywords: '春天,写景,惜春',
  },
  {
    title: '村居', dynasty: '清', author: '高鼎',
    content: '草长莺飞二月天，\n拂堤杨柳醉春烟。\n儿童散学归来早，\n忙趁东风放纸鸢。',
    translation: '农历二月，青草生长黄莺飞翔，杨柳的枝条轻拂着堤岸，好像沉醉在迷蒙的春烟中。孩子们放学回来得很早，赶忙趁着东风放起了风筝。',
    appreciation: '前两句写春景生机盎然，后两句写儿童放风筝的欢快，动静结合，充满浓郁的乡村生活气息。',
    grade: '一年级', keywords: '春天,乡村,儿童,风筝',
  },
  {
    title: '所见', dynasty: '清', author: '袁枚',
    content: '牧童骑黄牛，\n歌声振林樾。\n意欲捕鸣蝉，\n忽然闭口立。',
    translation: '牧童骑在黄牛背上，嘹亮的歌声在树林里回荡。他忽然想要捕捉树上鸣叫的蝉，便立刻停止歌唱，静静地站在那里。',
    appreciation: '刻画牧童由"歌"到"静"的瞬间变化，"忽然闭口立"动作传神，表现了儿童的天真机灵。',
    grade: '一年级', keywords: '牧童,夏日,蝉,童趣',
  },
  {
    title: '小池', dynasty: '宋', author: '杨万里',
    content: '泉眼无声惜细流，\n树阴照水爱晴柔。\n小荷才露尖尖角，\n早有蜻蜓立上头。',
    translation: '泉眼静静地流淌，仿佛舍不得细小的水流；树荫映照在水面，像是喜爱这晴日里柔和的风光。嫩嫩的荷叶刚刚露出尖尖的小角，早就有蜻蜓停在上面了。',
    appreciation: '"惜""爱"二字赋予泉眼、树荫以人情。"小荷才露尖尖角，早有蜻蜓立上头"是千古名句，写初夏小池生机，新颖别致。',
    grade: '一年级', keywords: '夏天,写景,荷花,蜻蜓',
  },
  {
    title: '咏柳', dynasty: '唐', author: '贺知章',
    content: '碧玉妆成一树高，\n万条垂下绿丝绦。\n不知细叶谁裁出，\n二月春风似剪刀。',
    translation: '高高的柳树像是用碧玉装饰而成，千万条垂下的柳枝如同绿色的丝带。不知道这细细的柳叶是谁裁剪出来的，原来是二月的春风像剪刀一样把它裁出。',
    appreciation: '把春风比作剪刀，想象奇特新颖。前三句写柳，末句点出春的创造力，赞美了春天的生机。',
    grade: '二年级', keywords: '春天,咏物,柳树,比喻',
  },
  {
    title: '赠汪伦', dynasty: '唐', author: '李白',
    content: '李白乘舟将欲行，\n忽闻岸上踏歌声。\n桃花潭水深千尺，\n不及汪伦送我情。',
    translation: '我李白正要乘船出发，忽然听到岸上传来踏歌送行的声音。桃花潭的水纵然有千尺之深，也比不上汪伦送我的情谊深厚。',
    appreciation: '以桃花潭水之深比喻朋友情谊之深，化无形为有形，真挚感人，是送别诗中传诵名篇。',
    grade: '二年级', keywords: '送别,友情,比喻',
  },
  {
    title: '赋得古原草送别', dynasty: '唐', author: '白居易',
    content: '离离原上草，一岁一枯荣。\n野火烧不尽，春风吹又生。\n远芳侵古道，晴翠接荒城。\n又送王孙去，萋萋满别情。',
    translation: '原野上的青草繁茂绵延，一年一度枯萎又繁荣。野火无法把它烧尽，春风吹来它又重新生长。远处的芳草蔓延到古道，晴日下翠绿的草色连接着荒城。今天又在这里送别友人，茂盛的春草也满含离别的情意。',
    appreciation: '"野火烧不尽，春风吹又生"千古传诵，赞美了野草顽强的生命力，也象征不灭的希望。全诗借草写别情，借景抒情。',
    grade: '二年级', keywords: '送别,咏物,草,生命力',
  },
  {
    title: '望庐山瀑布', dynasty: '唐', author: '李白',
    content: '日照香炉生紫烟，\n遥看瀑布挂前川。\n飞流直下三千尺，\n疑是银河落九天。',
    translation: '阳光照射在香炉峰上，升起一片紫色的烟雾；远远望去，瀑布像一条白练挂在山前。飞腾的水流直泻而下，足有三千尺长，让人怀疑是银河从九天之上倾泻下来。',
    appreciation: '"飞流直下三千尺，疑是银河落九天"极尽夸张想象之能事，气势磅礴，写出了庐山瀑布的雄奇壮观。',
    grade: '二年级', keywords: '写景,瀑布,庐山,夸张',
  },
  {
    title: '绝句', dynasty: '唐', author: '杜甫',
    content: '两个黄鹂鸣翠柳，\n一行白鹭上青天。\n窗含西岭千秋雪，\n门泊东吴万里船。',
    translation: '两只黄鹂在翠绿的柳枝间鸣叫，一行白鹭飞上了蔚蓝的天空。从窗口望去，西岭上终年不化的积雪仿佛镶嵌在窗框中；门外江边停泊着即将驶向东吴、行程万里的船只。',
    appreciation: '四句诗如四幅画：黄鹂翠柳、白鹭青天、西岭积雪、东吴归船。色彩明丽，对仗工整，动静相宜，意境开阔。',
    grade: '二年级', keywords: '春天,写景,对仗',
  },
  {
    title: '悯农', dynasty: '唐', author: '李绅',
    content: '锄禾日当午，\n汗滴禾下土。\n谁知盘中餐，\n粒粒皆辛苦。',
    translation: '正午烈日当空时，农民还在田里给禾苗锄草松土，汗水一滴滴落在禾苗下的泥土里。谁知道我们盘中的饭菜，每一粒都饱含着农民的辛勤劳动。',
    appreciation: '以通俗语言描写农民劳作的艰辛，"粒粒皆辛苦"告诫人们珍惜粮食，是一首家喻户晓的悯农诗。',
    grade: '二年级', keywords: '悯农,劳动,珍惜粮食',
  },
  {
    title: '黄鹤楼送孟浩然之广陵', dynasty: '唐', author: '李白',
    content: '故人西辞黄鹤楼，\n烟花三月下扬州。\n孤帆远影碧空尽，\n唯见长江天际流。',
    translation: '老朋友在黄鹤楼与我辞别，在这柳絮如烟、繁花似锦的阳春三月，顺江而下前往扬州。他那一片孤帆的影子渐渐消失在碧蓝的天空尽头，眼前只见长江水向天边流去。',
    appreciation: '"孤帆远影碧空尽，唯见长江天际流"以景结情，帆尽江流，写尽送别时依依不舍之情，意境开阔悠远。',
    grade: '三年级', keywords: '送别,友情,长江,写景',
  },
  {
    title: '凉州词', dynasty: '唐', author: '王之涣',
    content: '黄河远上白云间，\n一片孤城万仞山。\n羌笛何须怨杨柳，\n春风不度玉门关。',
    translation: '黄河奔流直上，仿佛来自白云之间；一座孤城矗立在万仞高山之中。羌笛何必吹奏那哀怨的《折杨柳》曲呢？要知道春风是吹不到玉门关外的。',
    appreciation: '前两句写边塞苍凉壮阔，后两句借羌笛抒戍卒思乡之情，"春风不度玉门关"含蓄深沉，是边塞诗名篇。',
    grade: '三年级', keywords: '边塞,思乡,黄河,玉门关',
  },
  {
    title: '出塞', dynasty: '唐', author: '王昌龄',
    content: '秦时明月汉时关，\n万里长征人未还。\n但使龙城飞将在，\n不教胡马度阴山。',
    translation: '依然是秦汉时的明月和边关，万里长征的将士至今仍未生还。只要像李广那样的飞将军还在，就绝不会让胡人的骑兵越过阴山南下。',
    appreciation: '"秦时明月汉时关"以互文手法把历史与现实相连，慨叹战事绵延。全诗雄浑壮阔，抒发了盼良将守边、保家卫国的豪情。',
    grade: '三年级', keywords: '边塞,爱国,思乡',
  },
  {
    title: '芙蓉楼送辛渐', dynasty: '唐', author: '王昌龄',
    content: '寒雨连江夜入吴，\n平明送客楚山孤。\n洛阳亲友如相问，\n一片冰心在玉壶。',
    translation: '满江的寒雨在夜间降临吴地，清晨送别友人，只觉得楚山孤零零地立在那里。洛阳的亲友如果问起我的情况，请告诉他们，我的心就像玉壶中的冰一样晶莹纯洁。',
    appreciation: '"一片冰心在玉壶"以冰心玉壶自喻，表达自己高洁清白的品格，是送别诗中寄托情怀的名句。',
    grade: '三年级', keywords: '送别,抒怀,冰心玉壶',
  },
  {
    title: '鹿柴', dynasty: '唐', author: '王维',
    content: '空山不见人，\n但闻人语响。\n返景入深林，\n复照青苔上。',
    translation: '空旷的山谷里看不见人影，只能听到人说话的声音。夕阳的余晖返照进深林里，又映照在青苔之上。',
    appreciation: '以"人语响"反衬空山之静，以"返景"反衬深林之幽。以动衬静，以声衬寂，是王维山水诗的代表作，禅意盎然。',
    grade: '三年级', keywords: '山水,写景,静谧,禅意',
  },
  {
    title: '送元二使安西', dynasty: '唐', author: '王维',
    content: '渭城朝雨浥轻尘，\n客舍青青柳色新。\n劝君更尽一杯酒，\n西出阳关无故人。',
    translation: '渭城的晨雨湿润了轻扬的尘土，客舍旁的柳树被雨水洗过，颜色格外青翠清新。朋友啊，请你再喝一杯酒吧，向西出了阳关，就再也见不到老朋友了。',
    appreciation: '"劝君更尽一杯酒，西出阳关无故人"以劝酒写别情，情深意长，后来被谱为《阳关三叠》传唱，成为送别名篇。',
    grade: '三年级', keywords: '送别,友情,酒,阳关',
  },
  {
    title: '九月九日忆山东兄弟', dynasty: '唐', author: '王维',
    content: '独在异乡为异客，\n每逢佳节倍思亲。\n遥知兄弟登高处，\n遍插茱萸少一人。',
    translation: '我一个人独自生活在异乡，作为异乡的客人，每到佳节就加倍思念亲人。遥想兄弟们今天登高的地方，他们插遍茱萸时，会发现少了一个人——那就是我。',
    appreciation: '"每逢佳节倍思亲"道出所有游子的心声，成为千古名句。全诗从对面落笔，借想象兄弟思念自己来写自己思亲，含蓄深情。',
    grade: '三年级', keywords: '思乡,重阳节,思亲',
  },
  {
    title: '望洞庭', dynasty: '唐', author: '刘禹锡',
    content: '湖光秋月两相和，\n潭面无风镜未磨。\n遥望洞庭山水翠，\n白银盘里一青螺。',
    translation: '秋夜的月光与洞庭湖水光交相辉映，湖面风平浪静，像一面没有打磨的铜镜。远远望去，洞庭湖的山水一片青翠，就像白银盘里放着一只青青的田螺。',
    appreciation: '"白银盘里一青螺"以银盘比湖、青螺比山，比喻新奇贴切，描绘出洞庭湖月夜山水的宁静秀美。',
    grade: '三年级', keywords: '写景,洞庭湖,秋天,比喻',
  },
  {
    title: '枫桥夜泊', dynasty: '唐', author: '张继',
    content: '月落乌啼霜满天，\n江枫渔火对愁眠。\n姑苏城外寒山寺，\n夜半钟声到客船。',
    translation: '月亮落下，乌鸦啼叫，寒霜弥漫天空；江边的枫树与渔船上的灯火，伴着我这个满怀愁绪的旅人难以入眠。姑苏城外寒山寺的半夜钟声，悠悠地传到了我的客船上。',
    appreciation: '通过月落、乌啼、霜天、江枫、渔火、钟声等意象，营造出凄美清冷的意境，"夜半钟声到客船"以声衬静，写尽旅人愁思。',
    grade: '四年级', keywords: '写景,愁思,夜泊,寒山寺',
  },
  {
    title: '江雪', dynasty: '唐', author: '柳宗元',
    content: '千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。',
    translation: '千山万岭不见飞鸟的踪影，千路万径不见行人的足迹。只有一只孤零零的小船，船上坐着一位披蓑戴笠的老翁，独自在风雪交加的江面上垂钓。',
    appreciation: '"千山""万径"极写空旷，"孤舟""独钓"凸显孤高。渔翁形象实为诗人清高孤傲、不屈不挠品格的写照。',
    grade: '四年级', keywords: '写景,冬天,孤高,垂钓',
  },
  {
    title: '寻隐者不遇', dynasty: '唐', author: '贾岛',
    content: '松下问童子，\n言师采药去。\n只在此山中，\n云深不知处。',
    translation: '我在松树下向童子打听隐者，童子说师傅采药去了。他就在这座山里，可是云雾深深，不知道他究竟在哪里。',
    appreciation: '以问答体写成，寓问于答。"云深不知处"既写山高云深，又暗示隐者的高洁难觅，余味无穷。',
    grade: '四年级', keywords: '寻访,隐者,云山',
  },
  {
    title: '渔歌子', dynasty: '唐', author: '张志和',
    content: '西塞山前白鹭飞，\n桃花流水鳜鱼肥。\n青箬笠，绿蓑衣，\n斜风细雨不须归。',
    translation: '西塞山前白鹭自由飞翔，桃花飘落在流水上，水中的鳜鱼正肥美。渔翁头戴青色竹笠，身披绿色蓑衣，在斜风细雨中垂钓，不愿归家。',
    appreciation: '色彩明丽：白鹭、桃花、青笠、绿蓑。描绘出一幅清新悠闲的渔翁垂钓图，表现了对自由闲适生活的向往。',
    grade: '四年级', keywords: '写景,渔翁,田园,悠闲',
  },
  {
    title: '塞下曲', dynasty: '唐', author: '卢纶',
    content: '月黑雁飞高，\n单于夜遁逃。\n欲将轻骑逐，\n大雪满弓刀。',
    translation: '没有月光的黑夜，大雁高飞，单于趁夜色率兵逃遁。将士们正要率领轻骑兵去追击，大雪已经落满了弓和刀。',
    appreciation: '"大雪满弓刀"以细节写苦寒，衬托将士不畏严寒、奋勇追敌的英雄气概，全诗雄健有力。',
    grade: '五年级', keywords: '边塞,战争,英雄,雪',
  },
  {
    title: '浪淘沙', dynasty: '唐', author: '刘禹锡',
    content: '九曲黄河万里沙，\n浪淘风簸自天涯。\n如今直上银河去，\n同到牵牛织女家。',
    translation: '弯弯曲曲的黄河挟带着万里黄沙，波涛翻滚、风浪簸荡，从天边奔腾而来。如今我要沿着黄河直上银河去，一同到牛郎织女的家中做客。',
    appreciation: '由黄河联想到银河，化用张骞寻河源至银河的典故，想象奇特豪迈，表现了诗人奋发向上的精神。',
    grade: '五年级', keywords: '黄河,想象,豪迈',
  },
  {
    title: '赠花卿', dynasty: '唐', author: '杜甫',
    content: '锦城丝管日纷纷，\n半入江风半入云。\n此曲只应天上有，\n人间能得几回闻。',
    translation: '锦城每天乐声纷扬，那悠扬的乐曲声，一半随江风飘散，一半飞入云霄。这样美妙的乐曲只应该天上有，人间能听到几回呢？',
    appreciation: '"此曲只应天上有，人间能得几回闻"以夸张赞美乐曲之美，似褒似讽，意味深长，流传甚广。',
    grade: '五年级', keywords: '音乐,赞美,夸张',
  },
  {
    title: '春夜喜雨', dynasty: '唐', author: '杜甫',
    content: '好雨知时节，当春乃发生。\n随风潜入夜，润物细无声。\n野径云俱黑，江船火独明。\n晓看红湿处，花重锦官城。',
    translation: '好雨仿佛懂得时节，在春天万物萌发时便降临。它伴随微风在夜间悄悄下起，默默地滋润万物没有一点声响。田间小路上空的云黑沉沉的，江中渔船的灯火却格外明亮。清晨去看那被雨打湿的红花，锦官城里的花一定沉甸甸地开满了。',
    appreciation: '"随风潜入夜，润物细无声"以"潜""润"写春雨之好，传神入化。全诗紧扣"喜"字，描绘春夜雨景，表达了诗人对春雨润物的喜悦。',
    grade: '五年级', keywords: '春天,春雨,喜雨,写景',
  },
  {
    title: '游子吟', dynasty: '唐', author: '孟郊',
    content: '慈母手中线，游子身上衣。\n临行密密缝，意恐迟迟归。\n谁言寸草心，报得三春晖。',
    translation: '慈祥的母亲手里穿针引线，为即将远行的儿子缝制衣裳。临行前把衣裳缝得密密实实，只怕儿子迟迟不能回家。谁说小草那一点点心意，能够报答春天阳光般的母爱呢？',
    appreciation: '"谁言寸草心，报得三春晖"以小草难报春光比喻子女难报母爱，成为歌颂母爱的千古名句，情深意切，感人至深。',
    grade: '五年级', keywords: '母爱,感恩,游子,比喻',
  },
  {
    title: '忆江南', dynasty: '唐', author: '白居易',
    content: '江南好，风景旧曾谙。\n日出江花红胜火，\n春来江水绿如蓝。\n能不忆江南？',
    translation: '江南真好啊，那里的风景我曾经十分熟悉。太阳升起时，江边的鲜花比火还要红；春天到来时，江水绿得就像蓝草一样。怎么能不让人怀念江南呢？',
    appreciation: '"日出江花红胜火，春来江水绿如蓝"色彩浓烈，对仗工整，把江南春色写得明艳动人。首尾以"江南好""忆江南"呼应，情真意切。',
    grade: '五年级', keywords: '江南,写景,春天,回忆',
  },
]

// ============ 数学公式定理（小学常用） ============

export const SEED_MATH_FORMULAS: SeedMathFormula[] = [
  // ---- 运算定律 ----
  {
    title: '加法交换律', category: '运算定律', formula: 'a + b = b + a',
    explanation: '两个数相加，交换加数的位置，和不变。这是加法运算的基本定律之一。',
    example: '3 + 5 = 5 + 3 = 8',
    grade: '四年级', keywords: '加法,交换律,运算定律',
  },
  {
    title: '加法结合律', category: '运算定律', formula: '(a + b) + c = a + (b + c)',
    explanation: '三个数相加，先把前两个数相加，或者先把后两个数相加，和不变。',
    example: '(25 + 38) + 62 = 25 + (38 + 62) = 25 + 100 = 125',
    grade: '四年级', keywords: '加法,结合律,简便计算',
  },
  {
    title: '乘法交换律', category: '运算定律', formula: 'a × b = b × a',
    explanation: '两个数相乘，交换因数的位置，积不变。',
    example: '4 × 25 = 25 × 4 = 100',
    grade: '四年级', keywords: '乘法,交换律,运算定律',
  },
  {
    title: '乘法结合律', category: '运算定律', formula: '(a × b) × c = a × (b × c)',
    explanation: '三个数相乘，先把前两个数相乘，或者先把后两个数相乘，积不变。常用于简便计算。',
    example: '(8 × 25) × 4 = 8 × (25 × 4) = 8 × 100 = 800',
    grade: '四年级', keywords: '乘法,结合律,简便计算',
  },
  {
    title: '乘法分配律', category: '运算定律', formula: '(a + b) × c = a × c + b × c',
    explanation: '两个数的和与一个数相乘，可以先把它们分别与这个数相乘，再相加。这是简便计算中最常用、最重要的运算定律。',
    example: '(40 + 8) × 25 = 40 × 25 + 8 × 25 = 1000 + 200 = 1200',
    grade: '四年级', keywords: '乘法,分配律,简便计算',
  },
  // ---- 几何公式 ----
  {
    title: '长方形面积', category: '几何公式', formula: 'S = a × b',
    explanation: '长方形的面积等于长乘以宽。其中 S 表示面积，a 表示长，b 表示宽。',
    example: '一个长方形长 5 厘米、宽 3 厘米，面积 = 5 × 3 = 15（平方厘米）。',
    grade: '三年级', keywords: '长方形,面积,几何',
  },
  {
    title: '正方形面积', category: '几何公式', formula: 'S = a × a = a²',
    explanation: '正方形的面积等于边长乘边长。其中 S 表示面积，a 表示边长。',
    example: '一个正方形边长 4 分米，面积 = 4 × 4 = 16（平方分米）。',
    grade: '三年级', keywords: '正方形,面积,几何',
  },
  {
    title: '三角形面积', category: '几何公式', formula: 'S = a × h ÷ 2',
    explanation: '三角形的面积等于底乘以高除以 2。其中 a 表示底，h 表示高。',
    example: '一个三角形底 6 厘米、高 4 厘米，面积 = 6 × 4 ÷ 2 = 12（平方厘米）。',
    grade: '五年级', keywords: '三角形,面积,几何',
  },
  {
    title: '长方体体积', category: '几何公式', formula: 'V = a × b × c',
    explanation: '长方体的体积等于长乘宽乘高。其中 V 表示体积，a、b、c 分别表示长、宽、高。',
    example: '一个长方体长 5 厘米、宽 4 厘米、高 3 厘米，体积 = 5 × 4 × 3 = 60（立方厘米）。',
    grade: '五年级', keywords: '长方体,体积,几何',
  },
  {
    title: '圆的面积', category: '几何公式', formula: 'S = π × r²',
    explanation: '圆的面积等于圆周率乘半径的平方。其中 π 取 3.14，r 表示半径。',
    example: '一个圆半径 2 厘米，面积 = 3.14 × 2² = 3.14 × 4 = 12.56（平方厘米）。',
    grade: '六年级', keywords: '圆,面积,π,半径',
  },
  {
    title: '圆的周长', category: '几何公式', formula: 'C = 2 × π × r = π × d',
    explanation: '圆的周长等于圆周率乘直径，或圆周率乘 2 倍半径。其中 π 取 3.14，r 表示半径，d 表示直径。',
    example: '一个圆直径 6 厘米，周长 = 3.14 × 6 = 18.84（厘米）。',
    grade: '六年级', keywords: '圆,周长,π,直径',
  },
  // ---- 单位换算 ----
  {
    title: '长度单位换算（米与分米）', category: '单位换算', formula: '1 米 = 10 分米',
    explanation: '米和分米是常用长度单位，1 米等于 10 分米。1 分米 = 10 厘米，1 厘米 = 10 毫米。',
    example: '3 米 = 30 分米；25 分米 = 2 米 5 分米。',
    grade: '三年级', keywords: '长度,米,分米,单位换算',
  },
  {
    title: '长度单位换算（分米与厘米）', category: '单位换算', formula: '1 分米 = 10 厘米',
    explanation: '分米和厘米是比米小的长度单位，1 分米等于 10 厘米，1 厘米等于 10 毫米。',
    example: '4 分米 = 40 厘米；15 厘米 = 1 分米 5 厘米。',
    grade: '三年级', keywords: '长度,分米,厘米,单位换算',
  },
  {
    title: '长度单位换算（千米与米）', category: '单位换算', formula: '1 千米 = 1000 米',
    explanation: '千米是较大的长度单位，也叫公里。1 千米等于 1000 米，常用于计量较长的路程。',
    example: '5 千米 = 5000 米；8000 米 = 8 千米。',
    grade: '三年级', keywords: '长度,千米,米,单位换算',
  },
  {
    title: '质量单位换算（吨与千克）', category: '单位换算', formula: '1 吨 = 1000 千克',
    explanation: '吨是较大的质量单位，1 吨等于 1000 千克。1 千克 = 1000 克。常用于计量较重的物体。',
    example: '3 吨 = 3000 千克；2000 千克 = 2 吨。',
    grade: '三年级', keywords: '质量,吨,千克,单位换算',
  },
  {
    title: '时间单位换算（时与分）', category: '单位换算', formula: '1 时 = 60 分',
    explanation: '时和分是常用时间单位，1 时等于 60 分，1 分等于 60 秒。',
    example: '2 时 = 120 分；90 分 = 1 时 30 分。',
    grade: '三年级', keywords: '时间,时,分,单位换算',
  },
  // ---- 分数小数 ----
  {
    title: '分数化小数', category: '分数小数', formula: '分子 ÷ 分母 = 小数',
    explanation: '把分数化成小数，用分子除以分母即可。能除尽的得到有限小数，除不尽的得到循环小数或保留若干位小数。',
    example: '3/4 = 3 ÷ 4 = 0.75；1/2 = 0.5；1/3 ≈ 0.333。',
    grade: '五年级', keywords: '分数,小数,转换',
  },
  {
    title: '小数化分数', category: '分数小数', formula: '小数 → 分数（再约分为最简分数）',
    explanation: '把小数化成分数，原来有几位小数，就在 1 后面写几个 0 作分母，把原来的小数去掉小数点作分子，能约分的要约成最简分数。',
    example: '0.7 = 7/10；0.25 = 25/100 = 1/4；1.2 = 12/10 = 6/5。',
    grade: '五年级', keywords: '小数,分数,转换,约分',
  },
  // ---- 比例百分数 ----
  {
    title: '比例的基本性质', category: '比例百分数', formula: 'a : b = c : d ⇒ a × d = b × c',
    explanation: '在比例中，两个外项的积等于两个内项的积，这叫做比例的基本性质，常用于解比例。',
    example: '若 2 : 3 = 4 : x，则 2x = 3 × 4，解得 x = 6。',
    grade: '六年级', keywords: '比例,外项,内项,解比例',
  },
  {
    title: '百分数化小数', category: '比例百分数', formula: '百分数 → 小数（去掉%，小数点左移两位）',
    explanation: '把百分数化成小数，只要去掉百分号，同时把小数点向左移动两位即可。反之，小数化百分数则小数点右移两位并加 %。',
    example: '25% = 0.25；120% = 1.2；0.4 = 40%。',
    grade: '六年级', keywords: '百分数,小数,转换',
  },
  // ---- 思维方法 ----
  {
    title: '画图法', category: '思维方法', formula: '用线段图/示意图辅助分析数量关系',
    explanation: '通过画线段图、示意图等把题目中的数量关系直观地表示出来，帮助理解题意、找到解题思路，是解决应用题的重要方法。',
    example: '小明比小红多 5 朵花，两人共 17 朵，画线段图可直观看出小红有 (17-5)÷2=6 朵，小明 11 朵。',
    grade: '通用', keywords: '画图,线段图,应用题,思维方法',
  },
  {
    title: '列表法', category: '思维方法', formula: '用表格列举所有可能情况',
    explanation: '把题目中的条件和可能的情况用表格一一列举出来，从而找出答案，适用于搭配、组合、鸡兔同笼等问题。',
    example: '3 件上衣 2 条裤子有多少种搭配？列表可得 3×2=6 种。',
    grade: '通用', keywords: '列表,列举,搭配,思维方法',
  },
  {
    title: '假设法', category: '思维方法', formula: '先假设，再调整',
    explanation: '先对问题做出某种假设，再根据假设与实际的差异进行调整，从而求出答案。常用于鸡兔同笼等经典问题。',
    example: '鸡兔同笼，共 10 个头 26 条腿。假设全是鸡，则有 20 条腿，少 6 条；每换一只兔多 2 条腿，故兔 6÷2=3 只，鸡 7 只。',
    grade: '通用', keywords: '假设,鸡兔同笼,思维方法',
  },
]

// ============ 英语分类单词（按场景） ============

export const SEED_ENGLISH_WORDS: SeedEnglishWord[] = [
  // ---- 季节天气 ----
  { word: 'spring', phonetic: '/sprɪŋ/', meaning: '春天', category: '季节天气', example: 'Spring is my favorite season.', grade: '五年级' },
  { word: 'summer', phonetic: '/ˈsʌmə(r)/', meaning: '夏天', category: '季节天气', example: 'It is very hot in summer.', grade: '五年级' },
  { word: 'autumn', phonetic: '/ˈɔːtəm/', meaning: '秋天', category: '季节天气', example: 'Leaves fall in autumn.', grade: '五年级' },
  { word: 'winter', phonetic: '/ˈwɪntə(r)/', meaning: '冬天', category: '季节天气', example: 'It snows in winter.', grade: '五年级' },
  { word: 'sun', phonetic: '/sʌn/', meaning: '太阳', category: '季节天气', example: 'The sun is shining.', grade: '三年级' },
  { word: 'rain', phonetic: '/reɪn/', meaning: '雨；下雨', category: '季节天气', example: 'It is going to rain.', grade: '四年级' },
  { word: 'snow', phonetic: '/snəʊ/', meaning: '雪；下雪', category: '季节天气', example: 'We can make a snowman.', grade: '四年级' },
  { word: 'wind', phonetic: '/wɪnd/', meaning: '风', category: '季节天气', example: 'The wind is strong today.', grade: '五年级' },
  { word: 'cloud', phonetic: '/klaʊd/', meaning: '云', category: '季节天气', example: 'There are many clouds in the sky.', grade: '五年级' },
  { word: 'hot', phonetic: '/hɒt/', meaning: '热的', category: '季节天气', example: 'The water is very hot.', grade: '四年级' },
  { word: 'cold', phonetic: '/kəʊld/', meaning: '冷的', category: '季节天气', example: 'It is cold in winter.', grade: '四年级' },
  { word: 'warm', phonetic: '/wɔːm/', meaning: '温暖的', category: '季节天气', example: 'Spring is warm and nice.', grade: '五年级' },
  // ---- 食物 ----
  { word: 'rice', phonetic: '/raɪs/', meaning: '米饭；大米', category: '食物', example: 'I eat rice every day.', grade: '四年级' },
  { word: 'bread', phonetic: '/bred/', meaning: '面包', category: '食物', example: 'I have bread for breakfast.', grade: '四年级' },
  { word: 'noodles', phonetic: '/ˈnuːdlz/', meaning: '面条', category: '食物', example: 'She likes noodles.', grade: '四年级' },
  { word: 'meat', phonetic: '/miːt/', meaning: '肉', category: '食物', example: 'He does not eat meat.', grade: '五年级' },
  { word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼；鱼肉', category: '食物', example: 'The fish is very fresh.', grade: '四年级' },
  { word: 'egg', phonetic: '/eɡ/', meaning: '鸡蛋', category: '食物', example: 'I eat an egg every morning.', grade: '四年级' },
  { word: 'milk', phonetic: '/mɪlk/', meaning: '牛奶', category: '食物', example: 'I drink milk every day.', grade: '四年级' },
  { word: 'cake', phonetic: '/keɪk/', meaning: '蛋糕', category: '食物', example: 'Let us eat the birthday cake.', grade: '四年级' },
  { word: 'soup', phonetic: '/suːp/', meaning: '汤', category: '食物', example: 'The soup is delicious.', grade: '五年级' },
  { word: 'hamburger', phonetic: '/ˈhæmbɜːɡə(r)/', meaning: '汉堡包', category: '食物', example: 'He wants a hamburger.', grade: '五年级' },
  { word: 'pizza', phonetic: '/ˈpiːtsə/', meaning: '披萨', category: '食物', example: 'We had pizza for dinner.', grade: '五年级' },
  { word: 'ice cream', phonetic: '/aɪs kriːm/', meaning: '冰淇淋', category: '食物', example: 'I like ice cream in summer.', grade: '五年级' },
  // ---- 水果 ----
  { word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', category: '水果', example: 'An apple a day keeps the doctor away.', grade: '四年级' },
  { word: 'banana', phonetic: '/bəˈnɑːnə/', meaning: '香蕉', category: '水果', example: 'The monkey likes bananas.', grade: '四年级' },
  { word: 'orange', phonetic: '/ˈɒrɪndʒ/', meaning: '橙子', category: '水果', example: 'I drink orange juice.', grade: '四年级' },
  { word: 'grape', phonetic: '/ɡreɪp/', meaning: '葡萄', category: '水果', example: 'These grapes are sweet.', grade: '五年级' },
  { word: 'pear', phonetic: '/peə(r)/', meaning: '梨', category: '水果', example: 'The pear is juicy.', grade: '五年级' },
  { word: 'peach', phonetic: '/piːtʃ/', meaning: '桃子', category: '水果', example: 'I like peaches very much.', grade: '五年级' },
  { word: 'watermelon', phonetic: '/ˈwɔːtəmelən/', meaning: '西瓜', category: '水果', example: 'Watermelon is sweet in summer.', grade: '五年级' },
  { word: 'strawberry', phonetic: '/ˈstrɔːbəri/', meaning: '草莓', category: '水果', example: 'She eats a strawberry.', grade: '五年级' },
  { word: 'lemon', phonetic: '/ˈlemən/', meaning: '柠檬', category: '水果', example: 'The lemon is sour.', grade: '五年级' },
  { word: 'cherry', phonetic: '/ˈtʃeri/', meaning: '樱桃', category: '水果', example: 'The cherries are red.', grade: '五年级' },
  { word: 'mango', phonetic: '/ˈmæŋɡəʊ/', meaning: '芒果', category: '水果', example: 'I like mango juice.', grade: '五年级' },
  { word: 'pineapple', phonetic: '/ˈpaɪnæpl/', meaning: '菠萝', category: '水果', example: 'The pineapple is yellow.', grade: '五年级' },
  // ---- 数字 ----
  { word: 'one', phonetic: '/wʌn/', meaning: '一', category: '数字', example: 'I have one book.', grade: '三年级' },
  { word: 'two', phonetic: '/tuː/', meaning: '二', category: '数字', example: 'I have two eyes.', grade: '三年级' },
  { word: 'three', phonetic: '/θriː/', meaning: '三', category: '数字', example: 'There are three apples.', grade: '三年级' },
  { word: 'four', phonetic: '/fɔː(r)/', meaning: '四', category: '数字', example: 'A car has four wheels.', grade: '三年级' },
  { word: 'five', phonetic: '/faɪv/', meaning: '五', category: '数字', example: 'I have five fingers.', grade: '三年级' },
  { word: 'six', phonetic: '/sɪks/', meaning: '六', category: '数字', example: 'It is six oclock.', grade: '三年级' },
  { word: 'seven', phonetic: '/ˈsevn/', meaning: '七', category: '数字', example: 'A week has seven days.', grade: '三年级' },
  { word: 'eight', phonetic: '/eɪt/', meaning: '八', category: '数字', example: 'I am eight years old.', grade: '三年级' },
  { word: 'nine', phonetic: '/naɪn/', meaning: '九', category: '数字', example: 'There are nine birds.', grade: '三年级' },
  { word: 'ten', phonetic: '/ten/', meaning: '十', category: '数字', example: 'I have ten pencils.', grade: '三年级' },
  { word: 'eleven', phonetic: '/ɪˈlevn/', meaning: '十一', category: '数字', example: 'I am eleven years old.', grade: '四年级' },
  { word: 'twelve', phonetic: '/twelv/', meaning: '十二', category: '数字', example: 'There are twelve months in a year.', grade: '四年级' },
  // ---- 颜色 ----
  { word: 'red', phonetic: '/red/', meaning: '红色', category: '颜色', example: 'The apple is red.', grade: '三年级' },
  { word: 'blue', phonetic: '/bluː/', meaning: '蓝色', category: '颜色', example: 'The sky is blue.', grade: '三年级' },
  { word: 'yellow', phonetic: '/ˈjeləʊ/', meaning: '黄色', category: '颜色', example: 'The banana is yellow.', grade: '三年级' },
  { word: 'green', phonetic: '/ɡriːn/', meaning: '绿色', category: '颜色', example: 'The grass is green.', grade: '三年级' },
  { word: 'black', phonetic: '/blæk/', meaning: '黑色', category: '颜色', example: 'My hair is black.', grade: '三年级' },
  { word: 'white', phonetic: '/waɪt/', meaning: '白色', category: '颜色', example: 'The snow is white.', grade: '三年级' },
  { word: 'pink', phonetic: '/pɪŋk/', meaning: '粉色', category: '颜色', example: 'She has a pink dress.', grade: '四年级' },
  { word: 'purple', phonetic: '/ˈpɜːpl/', meaning: '紫色', category: '颜色', example: 'I like purple flowers.', grade: '四年级' },
  { word: 'orange', phonetic: '/ˈɒrɪndʒ/', meaning: '橙色', category: '颜色', example: 'The orange is orange.', grade: '四年级' },
  { word: 'brown', phonetic: '/braʊn/', meaning: '棕色', category: '颜色', example: 'The bear is brown.', grade: '四年级' },
  { word: 'gray', phonetic: '/ɡreɪ/', meaning: '灰色', category: '颜色', example: 'The elephant is gray.', grade: '五年级' },
  { word: 'gold', phonetic: '/ɡəʊld/', meaning: '金色', category: '颜色', example: 'She has a gold ring.', grade: '五年级' },
  // ---- 动物 ----
  { word: 'cat', phonetic: '/kæt/', meaning: '猫', category: '动物', example: 'The cat is sleeping.', grade: '三年级' },
  { word: 'dog', phonetic: '/dɒɡ/', meaning: '狗', category: '动物', example: 'The dog is running.', grade: '三年级' },
  { word: 'pig', phonetic: '/pɪɡ/', meaning: '猪', category: '动物', example: 'The pig is fat.', grade: '四年级' },
  { word: 'cow', phonetic: '/kaʊ/', meaning: '奶牛', category: '动物', example: 'The cow gives us milk.', grade: '四年级' },
  { word: 'horse', phonetic: '/hɔːs/', meaning: '马', category: '动物', example: 'The horse can run fast.', grade: '四年级' },
  { word: 'sheep', phonetic: '/ʃiːp/', meaning: '绵羊', category: '动物', example: 'There are many sheep on the farm.', grade: '四年级' },
  { word: 'chicken', phonetic: '/ˈtʃɪkɪn/', meaning: '鸡', category: '动物', example: 'The chicken is on the farm.', grade: '四年级' },
  { word: 'duck', phonetic: '/dʌk/', meaning: '鸭子', category: '动物', example: 'The duck can swim.', grade: '四年级' },
  { word: 'rabbit', phonetic: '/ˈræbɪt/', meaning: '兔子', category: '动物', example: 'The rabbit has long ears.', grade: '四年级' },
  { word: 'mouse', phonetic: '/maʊs/', meaning: '老鼠', category: '动物', example: 'The cat catches the mouse.', grade: '五年级' },
  { word: 'bird', phonetic: '/bɜːd/', meaning: '鸟', category: '动物', example: 'The bird can fly.', grade: '三年级' },
  { word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼', category: '动物', example: 'The fish swims in the water.', grade: '三年级' },
  // ---- 身体 ----
  { word: 'head', phonetic: '/hed/', meaning: '头', category: '身体', example: 'My head hurts.', grade: '四年级' },
  { word: 'eye', phonetic: '/aɪ/', meaning: '眼睛', category: '身体', example: 'I have two eyes.', grade: '四年级' },
  { word: 'ear', phonetic: '/ɪə(r)/', meaning: '耳朵', category: '身体', example: 'I hear with my ears.', grade: '四年级' },
  { word: 'nose', phonetic: '/nəʊz/', meaning: '鼻子', category: '身体', example: 'I smell with my nose.', grade: '四年级' },
  { word: 'mouth', phonetic: '/maʊθ/', meaning: '嘴', category: '身体', example: 'Open your mouth, please.', grade: '四年级' },
  { word: 'hand', phonetic: '/hænd/', meaning: '手', category: '身体', example: 'Wash your hands.', grade: '三年级' },
  { word: 'foot', phonetic: '/fʊt/', meaning: '脚', category: '身体', example: 'My foot is big.', grade: '四年级' },
  { word: 'leg', phonetic: '/leɡ/', meaning: '腿', category: '身体', example: 'His leg is long.', grade: '四年级' },
  { word: 'arm', phonetic: '/ɑːm/', meaning: '胳膊', category: '身体', example: 'Raise your arm.', grade: '四年级' },
  { word: 'hair', phonetic: '/heə(r)/', meaning: '头发', category: '身体', example: 'She has long hair.', grade: '四年级' },
  { word: 'tooth', phonetic: '/tuːθ/', meaning: '牙齿', category: '身体', example: 'Brush your tooth every day.', grade: '五年级' },
  { word: 'face', phonetic: '/feɪs/', meaning: '脸', category: '身体', example: 'Wash your face in the morning.', grade: '四年级' },
  // ---- 家庭 ----
  { word: 'father', phonetic: '/ˈfɑːðə(r)/', meaning: '父亲', category: '家庭', example: 'My father is a teacher.', grade: '四年级' },
  { word: 'mother', phonetic: '/ˈmʌðə(r)/', meaning: '母亲', category: '家庭', example: 'My mother is kind.', grade: '四年级' },
  { word: 'brother', phonetic: '/ˈbrʌðə(r)/', meaning: '兄弟', category: '家庭', example: 'My brother is tall.', grade: '四年级' },
  { word: 'sister', phonetic: '/ˈsɪstə(r)/', meaning: '姐妹', category: '家庭', example: 'My sister is a student.', grade: '四年级' },
  { word: 'grandfather', phonetic: '/ˈɡrænfɑːðə(r)/', meaning: '祖父', category: '家庭', example: 'My grandfather is old.', grade: '五年级' },
  { word: 'grandmother', phonetic: '/ˈɡrænmʌðə(r)/', meaning: '祖母', category: '家庭', example: 'My grandmother tells stories.', grade: '五年级' },
  { word: 'son', phonetic: '/sʌn/', meaning: '儿子', category: '家庭', example: 'He is his fathers son.', grade: '五年级' },
  { word: 'daughter', phonetic: '/ˈdɔːtə(r)/', meaning: '女儿', category: '家庭', example: 'She is her mothers daughter.', grade: '五年级' },
  { word: 'uncle', phonetic: '/ˈʌŋkl/', meaning: '叔叔；舅舅', category: '家庭', example: 'My uncle lives in Beijing.', grade: '五年级' },
  { word: 'aunt', phonetic: '/ɑːnt/', meaning: '阿姨；姑姑', category: '家庭', example: 'My aunt is a doctor.', grade: '五年级' },
  { word: 'baby', phonetic: '/ˈbeɪbi/', meaning: '婴儿', category: '家庭', example: 'The baby is sleeping.', grade: '四年级' },
  { word: 'family', phonetic: '/ˈfæməli/', meaning: '家庭', category: '家庭', example: 'I love my family.', grade: '五年级' },
  // ---- 衣物 ----
  { word: 'shirt', phonetic: '/ʃɜːt/', meaning: '衬衫', category: '衣物', example: 'He wears a white shirt.', grade: '五年级' },
  { word: 'dress', phonetic: '/dres/', meaning: '连衣裙', category: '衣物', example: 'She has a new dress.', grade: '五年级' },
  { word: 'skirt', phonetic: '/skɜːt/', meaning: '短裙', category: '衣物', example: 'Her skirt is pink.', grade: '五年级' },
  { word: 'pants', phonetic: '/pænts/', meaning: '裤子', category: '衣物', example: 'These pants are too long.', grade: '五年级' },
  { word: 'shoes', phonetic: '/ʃuːz/', meaning: '鞋子', category: '衣物', example: 'I put on my shoes.', grade: '四年级' },
  { word: 'hat', phonetic: '/hæt/', meaning: '帽子', category: '衣物', example: 'He wears a hat.', grade: '五年级' },
  { word: 'coat', phonetic: '/kəʊt/', meaning: '外套', category: '衣物', example: 'Put on your coat.', grade: '五年级' },
  { word: 'socks', phonetic: '/sɒks/', meaning: '袜子', category: '衣物', example: 'I need new socks.', grade: '五年级' },
  { word: 'jacket', phonetic: '/ˈdʒækɪt/', meaning: '夹克', category: '衣物', example: 'His jacket is blue.', grade: '五年级' },
  { word: 'T-shirt', phonetic: '/ˈtiːʃɜːt/', meaning: 'T恤衫', category: '衣物', example: 'I like this T-shirt.', grade: '五年级' },
  { word: 'gloves', phonetic: '/ɡlʌvz/', meaning: '手套', category: '衣物', example: 'Wear gloves in winter.', grade: '五年级' },
  { word: 'scarf', phonetic: '/skɑːf/', meaning: '围巾', category: '衣物', example: 'She has a red scarf.', grade: '五年级' },
  // ---- 交通 ----
  { word: 'car', phonetic: '/kɑː(r)/', meaning: '小汽车', category: '交通', example: 'My father has a car.', grade: '四年级' },
  { word: 'bus', phonetic: '/bʌs/', meaning: '公共汽车', category: '交通', example: 'I go to school by bus.', grade: '四年级' },
  { word: 'bike', phonetic: '/baɪk/', meaning: '自行车', category: '交通', example: 'He rides a bike to school.', grade: '四年级' },
  { word: 'train', phonetic: '/treɪn/', meaning: '火车', category: '交通', example: 'We go by train.', grade: '五年级' },
  { word: 'plane', phonetic: '/pleɪn/', meaning: '飞机', category: '交通', example: 'The plane is in the sky.', grade: '五年级' },
  { word: 'ship', phonetic: '/ʃɪp/', meaning: '大船', category: '交通', example: 'The ship is big.', grade: '五年级' },
  { word: 'boat', phonetic: '/bəʊt/', meaning: '小船', category: '交通', example: 'We row a boat on the lake.', grade: '五年级' },
  { word: 'taxi', phonetic: '/ˈtæksi/', meaning: '出租车', category: '交通', example: 'Let us take a taxi.', grade: '五年级' },
  { word: 'subway', phonetic: '/ˈsʌbweɪ/', meaning: '地铁', category: '交通', example: 'I go home by subway.', grade: '五年级' },
  { word: 'truck', phonetic: '/trʌk/', meaning: '卡车', category: '交通', example: 'The truck carries goods.', grade: '五年级' },
  { word: 'airplane', phonetic: '/ˈeəpleɪn/', meaning: '飞机', category: '交通', example: 'The airplane flies high.', grade: '五年级' },
  { word: 'motorcycle', phonetic: '/ˈməʊtəsaɪkl/', meaning: '摩托车', category: '交通', example: 'He rides a motorcycle.', grade: '六年级' },
]
