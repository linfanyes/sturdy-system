/**
 * 教材种子数据：小学人教版语文、人教版数学、外研版三起英语
 * 共 32 本教材（语文 12 + 数学 12 + 英语 8），每本含单元与核心知识点。
 * 由校管触发「一键初始化」写入本校教材库，后续可由学科组长精修。
 */

export interface SeedKnowledgePoint {
  title: string
  type: string      // 概念 / 重点 / 例题 / 易错点 / 拓展
  content: string
  difficulty: string // 简单 / 中等 / 困难
  keywords: string
}

export interface SeedUnit {
  title: string
  summary?: string
  points: SeedKnowledgePoint[]
}

export interface SeedTextbook {
  publisher: string
  subject: string
  grade: string
  term: string
  name: string
  units: SeedUnit[]
}

// ============ 人教版语文 ============

const PEP_CHINESE: SeedTextbook[] = [
  {
    publisher: '人教版', subject: '语文', grade: '一年级', term: '上册',
    name: '人教版一年级语文上册',
    units: [
      { title: '第一单元 识字', summary: '天地人、金木水火土等基础识字',
        points: [
          { title: '天地人', type: '重点', content: '认识"天、地、人、你、我、他"七个生字，了解汉字的基本笔画和笔顺规则。', difficulty: '简单', keywords: '识字,生字,笔画' },
          { title: '金木水火土', type: '概念', content: '学习"金、木、水、火、土"五个汉字，理解五行概念，掌握横、竖两种基本笔画。', difficulty: '简单', keywords: '识字,五行,笔画' },
          { title: '口耳目', type: '重点', content: '认识"口、耳、目、手、足"等身体器官相关汉字，了解象形字特点。', difficulty: '简单', keywords: '象形字,身体器官' },
        ] },
      { title: '第二单元 汉语拼音', summary: 'a-o-e、i-u-ü等韵母和声母学习',
        points: [
          { title: '单韵母 a o e', type: '重点', content: '掌握单韵母 a、o、e 的发音方法和四声调，能正确书写。', difficulty: '简单', keywords: '拼音,韵母,声调' },
          { title: '声母 b p m f', type: '重点', content: '掌握声母 b、p、m、f 的发音，学会拼读音节。', difficulty: '简单', keywords: '拼音,声母,拼读' },
          { title: '声母 d t n l', type: '重点', content: '掌握声母 d、t、n、l 的发音，能进行两拼音节的拼读练习。', difficulty: '中等', keywords: '拼音,声母,拼读' },
        ] },
      { title: '第三单元 汉语拼音', summary: 'g-k-h、z-c-s等声母',
        points: [
          { title: '声母 g k h', type: '重点', content: '掌握 g、k、h 的发音方法，学习三拼音节。', difficulty: '中等', keywords: '拼音,三拼音节' },
          { title: '平舌音 z c s', type: '易错点', content: '区分平舌音 z、c、s 与翘舌音 zh、ch、sh 的发音区别。', difficulty: '中等', keywords: '平舌音,翘舌音,易错' },
        ] },
      { title: '第四单元 课文', summary: '秋天、小小的船等课文',
        points: [
          { title: '《秋天》', type: '重点', content: '学习课文《秋天》，认识季节变化，掌握"秋、气、了"等生字。', difficulty: '简单', keywords: '课文,秋天,生字' },
          { title: '《小小的船》', type: '重点', content: '学习课文《小小的船》，感受诗歌的韵律美，认识"月、儿、头"等生字。', difficulty: '简单', keywords: '课文,诗歌,生字' },
        ] },
      { title: '第五单元 识字', summary: '画、大小多少等',
        points: [
          { title: '《画》', type: '重点', content: '学习古诗《画》，理解诗意，认识反义词"远-近、有-无、来-去"。', difficulty: '中等', keywords: '古诗,反义词' },
          { title: '《大小多少》', type: '概念', content: '学习量词的使用（一头牛、一只猫等），掌握"大-小、多-少"的反义词。', difficulty: '简单', keywords: '量词,反义词' },
        ] },
      { title: '第六单元 课文', summary: '影子、比尾巴等',
        points: [
          { title: '《影子》', type: '重点', content: '学习课文《影子》，认识前后左右方位词，理解影子的形成。', difficulty: '简单', keywords: '方位词,影子' },
          { title: '《比尾巴》', type: '重点', content: '学习课文《比尾巴》，掌握问句的读法，了解动物尾巴的特点。', difficulty: '简单', keywords: '问句,动物' },
        ] },
      { title: '第七单元 课文', summary: '青蛙写诗、雨点儿等',
        points: [
          { title: '《青蛙写诗》', type: '重点', content: '学习逗号、句号的用法，理解诗歌的趣味性。', difficulty: '中等', keywords: '标点符号,逗号,句号' },
          { title: '《项链》', type: '拓展', content: '学习课文《项链》，积累"蓝蓝的、黄黄的"等词语搭配。', difficulty: '简单', keywords: '词语搭配' },
        ] },
      { title: '第八单元 课文', summary: '雪地里的小画家、乌鸦喝水等',
        points: [
          { title: '《雪地里的小画家》', type: '重点', content: '学习课文，了解动物脚印的形状，认识"竹、牙、用"等生字。', difficulty: '中等', keywords: '课文,生字' },
          { title: '《乌鸦喝水》', type: '重点', content: '学习课文《乌鸦喝水》，理解"渐渐"的含义，懂得遇到困难要动脑筋。', difficulty: '中等', keywords: '课文,渐渐' },
        ] },
    ],
  },
  {
    publisher: '人教版', subject: '语文', grade: '一年级', term: '下册',
    name: '人教版一年级语文下册',
    units: [
      { title: '第一单元 识字', summary: '春夏秋冬、姓氏歌等',
        points: [
          { title: '《春夏秋冬》', type: '重点', content: '学习四季相关词语，了解四季的特征变化。', difficulty: '简单', keywords: '四季,识字' },
          { title: '《姓氏歌》', type: '重点', content: '了解中国姓氏文化，学习介绍姓氏的方法（加一加、说偏旁等）。', difficulty: '中等', keywords: '姓氏,识字' },
        ] },
      { title: '第二单元 课文', summary: '吃水不忘挖井人、我多想去看看等',
        points: [
          { title: '《吃水不忘挖井人》', type: '重点', content: '学习课文，懂得感恩，认识"吃、忘、井"等生字。', difficulty: '中等', keywords: '感恩,生字' },
          { title: '《四个太阳》', type: '拓展', content: '学习课文《四个太阳》，培养想象力，积累表示颜色的词语。', difficulty: '简单', keywords: '想象力,颜色词' },
        ] },
      { title: '第三单元 课文', summary: '小公鸡和小鸭子、树和喜鹊等',
        points: [
          { title: '《小公鸡和小鸭子》', type: '重点', content: '学习课文，理解伙伴间互相帮助的道理，掌握"也、他、地"等生字。', difficulty: '中等', keywords: '伙伴,生字' },
          { title: '《树和喜鹊》', type: '重点', content: '学习课文，理解孤独与快乐的变化，认识"单、居、招"等生字。', difficulty: '中等', keywords: '孤独,快乐' },
        ] },
      { title: '第四单元 课文', summary: '静夜思、夜色等',
        points: [
          { title: '《静夜思》', type: '重点', content: '背诵古诗《静夜思》，理解思乡之情，认识"思、床、前"等生字。', difficulty: '中等', keywords: '古诗,背诵,思乡' },
          { title: '《端午粽》', type: '重点', content: '学习课文，了解端午节的习俗，认识"午、节、叶"等生字。', difficulty: '简单', keywords: '端午节,习俗' },
        ] },
      { title: '第五单元 识字', summary: '动物儿歌、古对今等',
        points: [
          { title: '《动物儿歌》', type: '重点', content: '学习形声字"虫字旁"的规律，认识蜻蜓、蝴蝶等动物名称。', difficulty: '中等', keywords: '形声字,虫字旁' },
          { title: '《古对今》', type: '重点', content: '学习对韵歌，了解古今、晨暮等反义词，感受汉语的对仗美。', difficulty: '中等', keywords: '对韵歌,反义词' },
        ] },
      { title: '第六单元 课文', summary: '古诗二首、荷叶圆圆等',
        points: [
          { title: '《池上》《小池》', type: '重点', content: '背诵两首古诗，感受夏日池塘的美景，理解诗意。', difficulty: '中等', keywords: '古诗,背诵,夏日' },
          { title: '《荷叶圆圆》', type: '重点', content: '学习课文，体会荷叶给小动物带来的快乐，积累"圆圆的、绿绿的"等词语。', difficulty: '简单', keywords: '荷叶,词语积累' },
        ] },
      { title: '第七单元 课文', summary: '文具的家、一分钟等',
        points: [
          { title: '《文具的家》', type: '重点', content: '学习课文，养成整理文具的好习惯，认识"具、次、丢"等生字。', difficulty: '中等', keywords: '习惯,生字' },
          { title: '《一分钟》', type: '重点', content: '学习课文，懂得珍惜时间的道理，理解"迟到"的原因。', difficulty: '中等', keywords: '珍惜时间' },
        ] },
      { title: '第八单元 课文', summary: '棉花姑娘、咕咚等',
        points: [
          { title: '《棉花姑娘》', type: '重点', content: '学习课文，了解益虫益鸟的作用，认识"棉、娘、治"等生字。', difficulty: '中等', keywords: '益虫,生字' },
          { title: '《咕咚》', type: '拓展', content: '学习课文，懂得遇事要动脑筋、不盲从的道理。', difficulty: '简单', keywords: '动脑筋,不盲从' },
        ] },
    ],
  },
]

// ============ 人教版数学 ============

const PEP_MATH: SeedTextbook[] = [
  {
    publisher: '人教版', subject: '数学', grade: '一年级', term: '上册',
    name: '人教版一年级数学上册',
    units: [
      { title: '第一单元 准备课', summary: '数一数、比多少',
        points: [
          { title: '数一数', type: '重点', content: '学习1-10以内物体的数数方法，初步建立数感。', difficulty: '简单', keywords: '数数,数感' },
          { title: '比多少', type: '重点', content: '学习"同样多、多、少"的概念，掌握一一对应的比较方法。', difficulty: '简单', keywords: '比多少,一一对应' },
        ] },
      { title: '第二单元 位置', summary: '上下前后左右',
        points: [
          { title: '上下前后', type: '重点', content: '认识物体的上下、前后位置关系，能用语言描述方位。', difficulty: '简单', keywords: '位置,方位' },
          { title: '左右', type: '易错点', content: '区分左右方向，注意以自身为参照物判断左右。', difficulty: '中等', keywords: '左右,方位,易错' },
        ] },
      { title: '第三单元 1-5的认识和加减法', summary: '',
        points: [
          { title: '1-5的认识', type: '重点', content: '认识1-5各数，会读会写，理解数的基数和序数含义。', difficulty: '简单', keywords: '认数,基数,序数' },
          { title: '加法', type: '重点', content: '理解加法的含义（合起来），掌握1-5的加法计算。', difficulty: '简单', keywords: '加法,合起来' },
          { title: '减法', type: '重点', content: '理解减法的含义（去掉），掌握1-5的减法计算。', difficulty: '简单', keywords: '减法,去掉' },
        ] },
      { title: '第四单元 认识图形（一）', summary: '立体图形',
        points: [
          { title: '认识立体图形', type: '重点', content: '认识长方体、正方体、圆柱、球四种立体图形的特征。', difficulty: '中等', keywords: '立体图形,长方体,正方体' },
        ] },
      { title: '第五单元 6-10的认识和加减法', summary: '',
        points: [
          { title: '6-10的认识', type: '重点', content: '认识6-10各数，掌握数的组成（如8由2和6组成）。', difficulty: '中等', keywords: '认数,数的组成' },
          { title: '10以内的加减法', type: '重点', content: '熟练计算10以内的加减法，理解一图四式。', difficulty: '中等', keywords: '加减法,一图四式' },
          { title: '连加连减', type: '易错点', content: '掌握连加连减的计算顺序（从左到右），理解运算步骤。', difficulty: '中等', keywords: '连加,连减,易错' },
        ] },
      { title: '第六单元 11-20各数的认识', summary: '',
        points: [
          { title: '11-20的认识', type: '重点', content: '认识11-20各数，理解十位和个位的概念，掌握数的组成。', difficulty: '中等', keywords: '认数,十位,个位' },
          { title: '10加几和相应减法', type: '重点', content: '掌握10加几（如10+3=13）及相应减法的计算方法。', difficulty: '简单', keywords: '10加几,减法' },
        ] },
      { title: '第七单元 认识钟表', summary: '',
        points: [
          { title: '认识整时', type: '重点', content: '认识钟面上的时针和分针，学会看整时。', difficulty: '简单', keywords: '钟表,整时,时针' },
        ] },
      { title: '第八单元 20以内的进位加法', summary: '',
        points: [
          { title: '9加几', type: '重点', content: '掌握"凑十法"计算9加几的进位加法。', difficulty: '中等', keywords: '凑十法,进位加法' },
          { title: '8、7、6加几', type: '重点', content: '运用凑十法计算8、7、6加几的进位加法。', difficulty: '中等', keywords: '凑十法,进位加法' },
          { title: '5、4、3、2加几', type: '拓展', content: '灵活运用凑十法或交换加数位置计算5、4、3、2加几。', difficulty: '中等', keywords: '凑十法,交换加数' },
        ] },
    ],
  },
  {
    publisher: '人教版', subject: '数学', grade: '一年级', term: '下册',
    name: '人教版一年级数学下册',
    units: [
      { title: '第一单元 认识图形（二）', summary: '平面图形',
        points: [
          { title: '认识平面图形', type: '重点', content: '认识长方形、正方形、三角形、圆和平行四边形五种平面图形。', difficulty: '中等', keywords: '平面图形,长方形,正方形' },
        ] },
      { title: '第二单元 20以内的退位减法', summary: '',
        points: [
          { title: '十几减9', type: '重点', content: '掌握"破十法"和"想加算减法"计算十几减9。', difficulty: '中等', keywords: '破十法,退位减法' },
          { title: '十几减8、7、6', type: '重点', content: '运用破十法或想加算减法计算十几减8、7、6。', difficulty: '中等', keywords: '破十法,退位减法' },
          { title: '十几减5、4、3、2', type: '易错点', content: '灵活选择计算方法，注意退位减法的计算准确性。', difficulty: '中等', keywords: '退位减法,易错' },
        ] },
      { title: '第三单元 分类与整理', summary: '',
        points: [
          { title: '分类统计', type: '重点', content: '学会按不同标准给物体分类，能用表格记录分类结果。', difficulty: '简单', keywords: '分类,统计' },
        ] },
      { title: '第四单元 100以内数的认识', summary: '',
        points: [
          { title: '数数和数的组成', type: '重点', content: '学会数100以内的数，理解数的组成（几个十和几个一）。', difficulty: '中等', keywords: '数数,数的组成' },
          { title: '读数和写数', type: '重点', content: '掌握100以内数的读写方法，理解数位意义。', difficulty: '中等', keywords: '读数,写数,数位' },
          { title: '数的顺序和比较大小', type: '重点', content: '掌握100以内数的顺序，会用">""<"比较大小。', difficulty: '中等', keywords: '数序,比较大小' },
        ] },
      { title: '第五单元 认识人民币', summary: '',
        points: [
          { title: '认识人民币', type: '重点', content: '认识1元、5角、1角等面值的人民币，掌握元角分之间的进率。', difficulty: '中等', keywords: '人民币,元角分' },
          { title: '简单的计算', type: '易错点', content: '学会人民币的简单换算和计算，注意单位统一。', difficulty: '中等', keywords: '人民币,换算,易错' },
        ] },
      { title: '第六单元 100以内的加法和减法（一）', summary: '',
        points: [
          { title: '整十数加减整十数', type: '重点', content: '掌握整十数加减整十数的口算方法。', difficulty: '简单', keywords: '整十数,加减法' },
          { title: '两位数加一位数和整十数', type: '重点', content: '掌握不进位和进位的两位数加一位数/整十数的计算。', difficulty: '中等', keywords: '两位数加法,进位' },
          { title: '两位数减一位数和整十数', type: '重点', content: '掌握不退位和退位的两位数减一位数/整十数的计算。', difficulty: '中等', keywords: '两位数减法,退位' },
        ] },
      { title: '第七单元 找规律', summary: '',
        points: [
          { title: '图形和数字的规律', type: '拓展', content: '发现图形和数字排列中的简单规律，能按规律续画/续填。', difficulty: '中等', keywords: '找规律,图形规律' },
        ] },
    ],
  },
]

// ============ 外研版三起英语 ============

const FLTRP_ENGLISH: SeedTextbook[] = [
  {
    publisher: '外研版', subject: '英语', grade: '三年级', term: '上册',
    name: '外研版三年级英语上册（三起）',
    units: [
      { title: 'Module 1 Greetings', summary: '打招呼与自我介绍',
        points: [
          { title: 'Hello/Hi/Goodbye', type: '重点', content: '掌握打招呼用语 Hello, Hi, Goodbye, I\'m... 的读音和用法。', difficulty: '简单', keywords: '打招呼,Hello,Goodbye' },
          { title: '自我介绍 I\'m...', type: '重点', content: '学会用 I\'m + 名字 进行自我介绍，如 I\'m Sam.', difficulty: '简单', keywords: '自我介绍,I am' },
        ] },
      { title: 'Module 2 Introduction', summary: '介绍他人',
        points: [
          { title: 'This is...', type: '重点', content: '掌握介绍他人的句型 This is + 人名，如 This is Amy.', difficulty: '简单', keywords: '介绍他人,This is' },
          { title: 'How are you?', type: '重点', content: '学会问候语 How are you? 及回答 I\'m fine, thank you.', difficulty: '中等', keywords: '问候,How are you' },
        ] },
      { title: 'Module 3 Classroom', summary: '教室物品',
        points: [
          { title: '教室物品词汇', type: '重点', content: '学习 door, window, blackboard, desk, chair 等教室物品单词。', difficulty: '简单', keywords: '教室,door,window' },
          { title: 'Stand up/Sit down', type: '重点', content: '掌握课堂指令用语 Stand up, Sit down, Point to...', difficulty: '简单', keywords: '课堂指令,Stand up' },
        ] },
      { title: 'Module 4 Animals', summary: '动物',
        points: [
          { title: '动物词汇', type: '重点', content: '学习 cat, dog, bird, panda, elephant 等动物单词。', difficulty: '简单', keywords: '动物,cat,dog,bird' },
          { title: 'What\'s this? It\'s a...', type: '重点', content: '掌握询问事物的句型 What\'s this? 及回答 It\'s a/an...', difficulty: '中等', keywords: 'What is this,It is a' },
        ] },
      { title: 'Module 5 Food', summary: '食物',
        points: [
          { title: '食物词汇', type: '重点', content: '学习 rice, meat, noodles, fish, milk 等食物单词。', difficulty: '简单', keywords: '食物,rice,meat,milk' },
          { title: 'Do you like...?', type: '重点', content: '掌握询问喜好的句型 Do you like...? 及回答 Yes, I do./No, I don\'t.', difficulty: '中等', keywords: '喜好,Do you like' },
        ] },
      { title: 'Module 6 School', summary: '学校',
        points: [
          { title: '学校场所词汇', type: '重点', content: '学习 school, classroom, playground, teacher 等学校相关单词。', difficulty: '简单', keywords: '学校,school,classroom' },
          { title: 'What\'s this/that?', type: '重点', content: '区分 this（近）和 that（远）的用法，进行问答练习。', difficulty: '中等', keywords: 'this,that,远近' },
        ] },
      { title: 'Module 7 Body', summary: '身体部位',
        points: [
          { title: '身体部位词汇', type: '重点', content: '学习 head, arm, hand, leg, foot 等身体部位单词。', difficulty: '简单', keywords: '身体部位,head,arm,hand' },
          { title: 'This is his/her...', type: '重点', content: '掌握描述身体部位的句型 This is his/her + 身体部位。', difficulty: '中等', keywords: 'his,her,身体部位' },
        ] },
      { title: 'Module 8 Friends', summary: '朋友',
        points: [
          { title: '描述朋友', type: '重点', content: '学习用 He\'s/She\'s + 形容词描述朋友的外貌特征。', difficulty: '中等', keywords: '描述朋友,He is,She is' },
          { title: 'Is he/she...?', type: '重点', content: '掌握一般疑问句 Is he/she...? 及肯定/否定回答。', difficulty: '中等', keywords: '一般疑问句,Is he,Is she' },
        ] },
      { title: 'Module 9 Family', summary: '家庭',
        points: [
          { title: '家庭成员词汇', type: '重点', content: '学习 father, mother, brother, sister, grandpa, grandma 等家庭成员单词。', difficulty: '简单', keywords: '家庭,father,mother,brother' },
          { title: 'This is my...', type: '重点', content: '掌握介绍家庭成员的句型 This is my + 家庭成员。', difficulty: '简单', keywords: '介绍家庭,This is my' },
        ] },
      { title: 'Module 10 Body and Actions', summary: '身体与动作',
        points: [
          { title: '动作指令', type: '重点', content: '学习 Point to..., Touch..., Show me... 等动作指令。', difficulty: '简单', keywords: '动作指令,Point to,Touch' },
          { title: '复习与综合运用', type: '拓展', content: '综合运用本学期所学词汇和句型进行简单交流。', difficulty: '中等', keywords: '复习,综合运用' },
        ] },
    ],
  },
  {
    publisher: '外研版', subject: '英语', grade: '三年级', term: '下册',
    name: '外研版三年级英语下册（三起）',
    units: [
      { title: 'Module 1 Alphabet', summary: '字母',
        points: [
          { title: '26个英文字母', type: '重点', content: '学习26个英文字母的大小写，掌握字母顺序和书写。', difficulty: '简单', keywords: '字母,alphabet,大小写' },
          { title: '字母发音', type: '重点', content: '了解字母在单词中的基本发音规律。', difficulty: '中等', keywords: '字母发音,自然拼读' },
        ] },
      { title: 'Module 2 Zoo', summary: '动物园',
        points: [
          { title: '动物词汇拓展', type: '重点', content: '学习 tiger, lion, elephant, monkey, panda 等动物单词。', difficulty: '简单', keywords: '动物,tiger,lion,elephant' },
          { title: 'They are...', type: '重点', content: '掌握复数句型 They are + 动物复数形式。', difficulty: '中等', keywords: '复数,They are' },
        ] },
      { title: 'Module 3 Sports', summary: '运动',
        points: [
          { title: '运动词汇', type: '重点', content: '学习 football, basketball, table tennis, swimming 等运动单词。', difficulty: '简单', keywords: '运动,football,basketball' },
          { title: 'I like/don\'t like...', type: '重点', content: '掌握表达喜好的句型 I like.../I don\'t like...', difficulty: '中等', keywords: '喜好,I like,I do not like' },
        ] },
      { title: 'Module 4 Food and Drink', summary: '饮食',
        points: [
          { title: '饮食词汇', type: '重点', content: '学习 rice, meat, fish, milk, juice, water 等饮食单词。', difficulty: '简单', keywords: '饮食,rice,milk,juice' },
          { title: 'Do you want...?', type: '重点', content: '掌握询问需求的句型 Do you want...? 及回答。', difficulty: '中等', keywords: '需求,Do you want' },
        ] },
      { title: 'Module 5 Time', summary: '时间',
        points: [
          { title: '整点时间表达', type: '重点', content: '学习用 It\'s + 数字 + o\'clock 表达整点时间。', difficulty: '中等', keywords: '时间,o\'clock,整点' },
          { title: '日常活动时间', type: '重点', content: '结合时间表达描述日常活动，如 I get up at 7.', difficulty: '中等', keywords: '日常活动,时间表达' },
        ] },
      { title: 'Module 6 Activities', summary: '活动',
        points: [
          { title: '现在进行时', type: '重点', content: '学习现在进行时 be + doing 的构成和用法。', difficulty: '困难', keywords: '现在进行时,be doing' },
          { title: 'What are you doing?', type: '重点', content: '掌握询问正在做某事的句型 What are you doing? 及回答。', difficulty: '中等', keywords: '现在进行时,What are you doing' },
        ] },
      { title: 'Module 7 Festivals', summary: '节日',
        points: [
          { title: '节日词汇', type: '重点', content: '学习 New Year, Christmas, Spring Festival 等节日单词。', difficulty: '简单', keywords: '节日,New Year,Christmas' },
          { title: '节日祝福', type: '重点', content: '学习 Happy New Year! Merry Christmas! 等节日祝福语。', difficulty: '简单', keywords: '祝福,Happy New Year' },
        ] },
      { title: 'Module 8 Clothes', summary: '服装',
        points: [
          { title: '服装词汇', type: '重点', content: '学习 shirt, T-shirt, dress, shoes, hat 等服装单词。', difficulty: '简单', keywords: '服装,shirt,dress,shoes' },
          { title: 'He/She is wearing...', type: '重点', content: '掌握描述穿着的句型 He/She is wearing + 服装。', difficulty: '中等', keywords: '穿着,is wearing' },
        ] },
      { title: 'Module 9 Feelings', summary: '感受',
        points: [
          { title: '感受词汇', type: '重点', content: '学习 happy, sad, hungry, thirsty, tired 等感受形容词。', difficulty: '简单', keywords: '感受,happy,sad,hungry' },
          { title: 'Are you...?', type: '重点', content: '掌握询问感受的句型 Are you + 形容词? 及回答。', difficulty: '中等', keywords: '感受,Are you' },
        ] },
      { title: 'Module 10 Review', summary: '复习',
        points: [
          { title: '本册综合复习', type: '拓展', content: '综合复习本册词汇和句型，进行简单对话练习。', difficulty: '中等', keywords: '复习,综合' },
        ] },
    ],
  },
]

// ============ 二~六年级语文（精简版，每本4-6单元） ============

function genChinese(grade: string, term: string, units: { title: string; points: { title: string; content: string }[] }[]): SeedTextbook {
  return {
    publisher: '人教版', subject: '语文', grade, term,
    name: `人教版${grade}语文${term}`,
    units: units.map(u => ({
      title: u.title,
      summary: '',
      points: u.points.map(p => ({
        title: p.title, type: '重点', content: p.content, difficulty: '中等', keywords: p.title,
      })),
    })),
  }
}

PEP_CHINESE.push(
  genChinese('二年级', '上册', [
    { title: '第一单元 课文', points: [
      { title: '《小蝌蚪找妈妈》', content: '学习课文，了解青蛙的生长过程，认识"塘、脑、袋"等生字。' },
      { title: '《我是什么》', content: '学习课文，了解水的三态变化（冰、水、水蒸气）。' },
    ]},
    { title: '第二单元 识字', points: [
      { title: '《场景歌》', content: '学习量词的正确使用（一只海鸥、一片沙滩等）。' },
      { title: '《树之歌》', content: '认识杨树、榕树、梧桐树等树木名称，了解形声字规律。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《曹冲称象》', content: '学习课文，理解曹冲称象的方法，培养动脑思考的习惯。' },
      { title: '《玲玲的画》', content: '学习课文，懂得"只要肯动脑筋，坏事也能变成好事"的道理。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《古诗二首》', content: '背诵《登鹳雀楼》《望庐山瀑布》，理解诗句意境。' },
      { title: '《黄山奇石》', content: '学习课文，感受黄山的奇石美景，积累描写景物的词语。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《坐井观天》', content: '学习寓言故事，理解"目光短浅"的含义。' },
      { title: '《寒号鸟》', content: '学习课文，懂得懒惰的后果，理解"得过且过"的含义。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《大禹治水》', content: '学习课文，了解大禹治水的故事，学习奉献精神。' },
    ]},
  ]),
  genChinese('二年级', '下册', [
    { title: '第一单元 课文', points: [
      { title: '《古诗二首》', content: '背诵《村居》《咏柳》，感受春天的美景。' },
      { title: '《找春天》', content: '学习课文，感受春天的气息，积累描写春天的词语。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《雷锋叔叔，你在哪里》', content: '学习诗歌，了解雷锋精神，学习乐于助人的品质。' },
      { title: '《千人糕》', content: '学习课文，懂得劳动成果来之不易，学会珍惜。' },
    ]},
    { title: '第三单元 识字', points: [
      { title: '《神州谣》', content: '学习识字课文，了解祖国山河壮丽，培养爱国情感。' },
      { title: '《传统节日》', content: '了解春节、元宵、清明、端午等中国传统节日及其习俗。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《彩色的梦》', content: '学习诗歌，感受彩色铅笔描绘的美丽梦境。' },
      { title: '《枫树上的喜鹊》', content: '学习课文，培养观察力和想象力。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《寓言二则》', content: '学习《亡羊补牢》《揠苗助长》，理解寓言蕴含的道理。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《古诗二首》', content: '背诵《晓出净慈寺送林子方》《绝句》，感受夏日景色。' },
    ]},
  ]),
  genChinese('三年级', '上册', [
    { title: '第一单元 课文', points: [
      { title: '《大青树下的小学》', content: '学习课文，了解少数民族小学的特点，感受民族团结。' },
      { title: '《花的学校》', content: '学习泰戈尔的诗歌，感受丰富的想象力。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《山行》《赠刘景文》《夜书所见》，理解秋景诗意。' },
      { title: '《铺满金色巴掌的水泥道》', content: '学习课文，积累描写秋天的优美语句。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《卖火柴的小女孩》', content: '学习安徒生童话，感受小女孩的悲惨遭遇，培养同情心。' },
      { title: '《在牛肚子里旅行》', content: '学习科学童话，了解牛的反刍现象。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《总也倒不了的老屋》', content: '学习预测故事情节的方法，培养阅读预测能力。' },
      { title: '《胡萝卜先生的长胡子》', content: '学习续编故事，发挥想象力。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《搭船的鸟》', content: '学习仔细观察的方法，描写动物的外形和动作。' },
      { title: '《金色的草地》', content: '学习观察自然变化，感受自然的奇妙。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《望天门山》《饮湖上初晴后雨》《望洞庭》，感受山河壮美。' },
      { title: '《富饶的西沙群岛》', content: '学习课文，了解西沙群岛的物产丰富，积累优美词句。' },
    ]},
  ]),
  genChinese('三年级', '下册', [
    { title: '第一单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《绝句》《惠崇春江晚景》《三衢道中》，感受春日美景。' },
      { title: '《燕子》', content: '学习课文，感受燕子的活泼可爱，积累描写春天的词句。' },
    ]},
    { title: '第二单元 寓言', points: [
      { title: '《守株待兔》', content: '学习文言文寓言，理解"不劳而获"的错误。' },
      { title: '《陶罐和铁罐》', content: '学习课文，懂得每个人都有长处和短处。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《元日》', content: '学习古诗，了解春节的习俗和热闹场景。' },
      { title: '《纸的发明》', content: '学习课文，了解造纸术的发明过程和意义。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《花钟》', content: '学习课文，了解不同花开花的时间规律，培养观察力。' },
      { title: '《蜜蜂》', content: '学习法布尔的实验，了解蜜蜂辨认方向的能力。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《宇宙的另一边》', content: '学习想象作文范文，发挥想象力。' },
      { title: '《我变成了一棵树》', content: '学习想象类课文，培养创造性思维。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《童年的水墨画》', content: '学习诗歌，感受童年的快乐生活。' },
    ]},
  ]),
  genChinese('四年级', '上册', [
    { title: '第一单元 课文', points: [
      { title: '《观潮》', content: '学习课文，感受钱塘江大潮的壮观景象，积累描写顺序。' },
      { title: '《走月亮》', content: '学习课文，感受月光下的美景和亲情。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《蝙蝠和雷达》', content: '学习科普课文，了解雷达的发明原理。' },
      { title: '《一个豆荚里的五粒豆》', content: '学习安徒生童话，感受生命的力量。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《暮江吟》《题西林壁》《雪梅》，理解哲理诗意。' },
      { title: '观察日记', content: '学习写观察日记的方法，培养持续观察的习惯。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《盘古开天地》', content: '学习神话故事，感受盘古开天辟地的奉献精神。' },
      { title: '《精卫填海》', content: '学习文言文神话，理解精卫坚韧不拔的精神。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《爬天都峰》', content: '学习按事情发展顺序写作的方法。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《牛和鹅》', content: '学习课文，懂得从不同角度看待事物的道理。' },
    ]},
  ]),
  genChinese('四年级', '下册', [
    { title: '第一单元 课文', points: [
      { title: '《古诗词三首》', content: '背诵《四时田园杂兴》《宿新市徐公店》《清平乐·村居》，感受乡村生活。' },
      { title: '《乡下人家》', content: '学习课文，感受乡村风景的和谐美好。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《琥珀》', content: '学习科普课文，了解琥珀的形成过程。' },
      { title: '《飞向蓝天的恐龙》', content: '学习课文，了解恐龙向鸟类演化的科学发现。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《短诗三首》', content: '学习现代诗《繁星》，感受诗歌的韵律美。' },
      { title: '《绿》', content: '学习艾青的诗歌，感受绿色的丰富意象。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《猫》', content: '学习老舍的散文，体会对猫的喜爱之情，学习抓住特点描写动物。' },
      { title: '《母鸡》', content: '学习老舍的散文，感受母爱的伟大。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《海上日出》', content: '学习巴金的散文，感受日出壮景，学习按顺序描写景物。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《文言文二则》', content: '学习《囊萤夜读》《铁杵成针》，理解勤奋学习的道理。' },
    ]},
  ]),
  genChinese('五年级', '上册', [
    { title: '第一单元 课文', points: [
      { title: '《白鹭》', content: '学习郭沫若的散文，感受白鹭的美，学习借物喻人的写法。' },
      { title: '《落花生》', content: '学习许地山的散文，理解"人要做有用的人"的道理。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《搭石》', content: '学习课文，感受乡亲们的美好情感，学习提高阅读速度。' },
      { title: '《将相和》', content: '学习历史故事，理解完璧归赵、负荆请罪的含义，学习人物描写。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《民间故事》', content: '学习《猎人海力布》《牛郎织女》，了解民间故事的特点。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《示儿》《题临安邸》《己亥杂诗》，感受爱国情怀。' },
      { title: '《圆明园的毁灭》', content: '学习课文，了解圆明园的辉煌与毁灭，勿忘国耻。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《太阳》', content: '学习说明文，了解太阳的特点，学习列数字、作比较等说明方法。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《慈母情深》', content: '学习课文，感受深沉的母爱，学习细节描写。' },
    ]},
  ]),
  genChinese('五年级', '下册', [
    { title: '第一单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《四时田园杂兴》（其三十一）《稚子弄冰》《村晚》，感受童趣。' },
      { title: '《祖父的园子》', content: '学习萧红的散文，感受自由快乐的童年。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《草船借箭》', content: '学习《三国演义》故事，分析诸葛亮的智慧和周瑜的心胸。' },
      { title: '《景阳冈》', content: '学习《水浒传》故事，分析武松的英雄形象。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '汉字真有趣', content: '综合性学习：了解汉字的起源、演变和谐音特点。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《从军行》《秋夜将晓出篱门迎凉有感》《闻官军收河南河北》，感受爱国情。' },
      { title: '《青山处处埋忠骨》', content: '学习课文，感受毛泽东主席的伟人情怀。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《人物描写一组》', content: '学习《摔跤》《他像一棵挺脱的树》《两茎灯草》，掌握人物描写方法。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《威尼斯的小艇》', content: '学习马克·吐温的散文，了解威尼斯风情，学习动静结合的写法。' },
    ]},
  ]),
  genChinese('六年级', '上册', [
    { title: '第一单元 课文', points: [
      { title: '《草原》', content: '学习老舍的散文，感受草原的美景和民族情谊。' },
      { title: '《丁香结》', content: '学习宗璞的散文，理解"结"的象征意义。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《七律·长征》', content: '背诵毛泽东诗词，感受红军长征的伟大精神。' },
      { title: '《狼牙山五壮士》', content: '学习课文，感受英雄的壮烈牺牲精神。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《竹节人》', content: '学习课文，根据不同阅读目的采用不同阅读策略。' },
      { title: '《宇宙生命之谜》', content: '学习科普说明文，了解宇宙中是否存在生命的科学探索。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《桥》', content: '学习微型小说，感受老党支部书记的崇高精神，学习环境描写。' },
      { title: '《穷人》', content: '学习托尔斯泰的小说，感受桑娜夫妇的善良品质。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《夏天里的成长》', content: '学习课文，理解"围绕中心意思写"的写作方法。' },
    ]},
    { title: '第六单元 课文', points: [
      { title: '《古诗三首》', content: '背诵《浪淘沙》《江南春》《书湖阴先生壁》，感受诗中的自然之美。' },
    ]},
  ]),
  genChinese('六年级', '下册', [
    { title: '第一单元 课文', points: [
      { title: '《北京的春节》', content: '学习老舍的散文，了解北京春节的习俗，学习按时间顺序写作。' },
      { title: '《腊八粥》', content: '学习沈从文的散文，感受腊八粥的美味和八儿的馋嘴。' },
    ]},
    { title: '第二单元 课文', points: [
      { title: '《鲁滨逊漂流记》', content: '学习世界名著节选，感受鲁滨逊的生存智慧和坚韧精神。' },
      { title: '《骑鹅旅行记》', content: '学习童话故事节选，感受尼尔斯的变化。' },
    ]},
    { title: '第三单元 课文', points: [
      { title: '《那个星期天》', content: '学习史铁生的散文，感受心理描写，理解时光与期盼。' },
    ]},
    { title: '第四单元 课文', points: [
      { title: '《十六年前的回忆》', content: '学习课文，感受李大钊的革命精神，学习前后照应的写法。' },
      { title: '《金色的鱼钩》', content: '学习课文，感受老班长的牺牲精神。' },
    ]},
    { title: '第五单元 课文', points: [
      { title: '《文言文二则》', content: '学习《学弈》《两小儿辩日》，理解专心致志的道理和孔子的求实精神。' },
    ]},
    { title: '第六单元 综合复习', points: [
      { title: '难忘的小学生活', content: '综合性学习：回忆小学生活，制作毕业纪念册。' },
    ]},
  ]),
)

// ============ 二~六年级数学（精简版） ============

function genMath(grade: string, term: string, units: { title: string; points: { title: string; content: string }[] }[]): SeedTextbook {
  return {
    publisher: '人教版', subject: '数学', grade, term,
    name: `人教版${grade}数学${term}`,
    units: units.map(u => ({
      title: u.title,
      summary: '',
      points: u.points.map(p => ({
        title: p.title, type: '重点', content: p.content, difficulty: '中等', keywords: p.title,
      })),
    })),
  }
}

PEP_MATH.push(
  genMath('二年级', '上册', [
    { title: '第一单元 长度单位', points: [
      { title: '认识厘米和米', content: '认识长度单位厘米和米，建立1厘米和1米的长度观念，掌握换算关系。' },
    ]},
    { title: '第二单元 100以内的加法和减法（二）', points: [
      { title: '两位数加两位数', content: '掌握两位数加两位数（不进位和进位）的笔算方法。' },
      { title: '两位数减两位数', content: '掌握两位数减两位数（不退位和退位）的笔算方法。' },
    ]},
    { title: '第三单元 角的初步认识', points: [
      { title: '认识角', content: '认识角的特征（一个顶点两条边），区分直角、锐角和钝角。' },
    ]},
    { title: '第四单元 表内乘法（一）', points: [
      { title: '乘法的初步认识', content: '理解乘法的含义（求几个相同加数的和），认识乘号和乘法算式。' },
      { title: '2-6的乘法口诀', content: '熟练背诵2-6的乘法口诀，能进行相应乘法计算。' },
    ]},
    { title: '第五单元 观察物体（一）', points: [
      { title: '从不同方向观察物体', content: '学会从前面、侧面、上面观察物体，理解不同角度看到的形状不同。' },
    ]},
    { title: '第六单元 表内乘法（二）', points: [
      { title: '7-9的乘法口诀', content: '熟练背诵7-9的乘法口诀，能进行相应乘法计算和解决实际问题。' },
    ]},
    { title: '第七单元 认识时间', points: [
      { title: '认识几时几分', content: '学会看钟表上的几时几分，理解1时=60分。' },
    ]},
    { title: '第八单元 数学广角', points: [
      { title: '搭配问题', content: '学习简单的排列组合，用连线或列表法解决搭配问题。' },
    ]},
  ]),
  genMath('二年级', '下册', [
    { title: '第一单元 数据收集整理', points: [
      { title: '数据收集', content: '学会用画"正"字等方法收集数据，能看懂简单的统计表。' },
    ]},
    { title: '第二单元 表内除法（一）', points: [
      { title: '除法的初步认识', content: '理解除法的含义（平均分），认识除号和除法算式。' },
      { title: '用2-6的乘法口诀求商', content: '掌握用乘法口诀求商的方法，能熟练计算表内除法。' },
    ]},
    { title: '第三单元 图形的运动（一）', points: [
      { title: '轴对称图形', content: '认识轴对称图形的特征，能判断和画出对称轴。' },
      { title: '平移和旋转', content: '区分平移和旋转两种运动方式，能在方格纸上画平移后的图形。' },
    ]},
    { title: '第四单元 表内除法（二）', points: [
      { title: '用7-9的乘法口诀求商', content: '掌握用7-9乘法口诀求商，能解决简单的除法实际问题。' },
    ]},
    { title: '第五单元 混合运算', points: [
      { title: '运算顺序', content: '掌握没有括号的混合运算顺序（先乘除后加减），认识小括号的作用。' },
    ]},
    { title: '第六单元 有余数的除法', points: [
      { title: '有余数除法', content: '理解余数的含义，掌握有余数除法的计算方法，余数必须小于除数。' },
    ]},
    { title: '第七单元 万以内数的认识', points: [
      { title: '万以内数的读写', content: '认识万以内数，掌握数位顺序，能正确读写和比较大小。' },
    ]},
    { title: '第八单元 克和千克', points: [
      { title: '质量单位', content: '认识质量单位克和千克，了解1千克=1000克，能估测物体质量。' },
    ]},
  ]),
  genMath('三年级', '上册', [
    { title: '第一单元 时、分、秒', points: [
      { title: '秒的认识', content: '认识时间单位秒，理解1分=60秒，能进行时间计算。' },
    ]},
    { title: '第二单元 万以内的加法和减法（一）', points: [
      { title: '两位数加减法口算', content: '掌握两位数加减两位数的口算方法。' },
    ]},
    { title: '第三单元 测量', points: [
      { title: '长度单位', content: '认识毫米、分米、千米，掌握长度单位间的换算关系。' },
      { title: '质量单位吨', content: '认识质量单位吨，理解1吨=1000千克。' },
    ]},
    { title: '第四单元 万以内的加法和减法（二）', points: [
      { title: '三位数加减法', content: '掌握三位数加三位数（进位）和三位数减三位数（退位）的笔算方法。' },
    ]},
    { title: '第五单元 倍的认识', points: [
      { title: '倍的概念', content: '理解"倍"的含义，能解决"求一个数是另一个数的几倍"的实际问题。' },
    ]},
    { title: '第六单元 多位数乘一位数', points: [
      { title: '笔算乘法', content: '掌握多位数乘一位数的笔算方法（含进位和中间/末尾有0的情况）。' },
    ]},
    { title: '第七单元 长方形和正方形', points: [
      { title: '周长', content: '理解周长的含义，掌握长方形和正方形周长的计算公式。' },
    ]},
    { title: '第八单元 分数的初步认识', points: [
      { title: '分数的认识', content: '初步认识分数（几分之一、几分之几），能读写简单分数。' },
    ]},
  ]),
  genMath('三年级', '下册', [
    { title: '第一单元 位置与方向（一）', points: [
      { title: '八个方向', content: '认识东、南、西、北、东南、东北、西南、西北八个方向，能看简单路线图。' },
    ]},
    { title: '第二单元 除数是一位数的除法', points: [
      { title: '笔算除法', content: '掌握除数是一位数的笔算除法方法，理解试商和余数。' },
    ]},
    { title: '第三单元 复式统计表', points: [
      { title: '复式统计表', content: '认识复式统计表，能根据数据填写和分析复式统计表。' },
    ]},
    { title: '第四单元 两位数乘两位数', points: [
      { title: '笔算乘法', content: '掌握两位数乘两位数的笔算方法，理解竖式计算的过程。' },
    ]},
    { title: '第五单元 面积', points: [
      { title: '面积的概念和单位', content: '理解面积的含义，认识平方厘米、平方分米、平方米等面积单位。' },
      { title: '长方形和正方形面积', content: '掌握长方形面积=长×宽、正方形面积=边长×边长的计算公式。' },
    ]},
    { title: '第六单元 年、月、日', points: [
      { title: '年月日', content: '认识年月日的关系，掌握大月小月、平年闰年的判断方法。' },
      { title: '24时计时法', content: '掌握24时计时法，能进行12时与24时计时法的转换。' },
    ]},
    { title: '第七单元 小数的初步认识', points: [
      { title: '小数的认识', content: '初步认识小数，能读写简单小数，理解小数的含义。' },
    ]},
  ]),
  genMath('四年级', '上册', [
    { title: '第一单元 大数的认识', points: [
      { title: '亿以内数的认识', content: '认识亿以内的数，掌握数位顺序表，能正确读写大数。' },
      { title: '近似数', content: '掌握用"四舍五入"法求近似数的方法。' },
    ]},
    { title: '第二单元 公顷和平方千米', points: [
      { title: '大面积单位', content: '认识面积单位公顷和平方千米，掌握1公顷=10000平方米。' },
    ]},
    { title: '第三单元 角的度量', points: [
      { title: '角的度量', content: '认识量角器，掌握用量角器量角和画角的方法。' },
      { title: '角的分类', content: '认识锐角、直角、钝角、平角、周角，掌握它们之间的关系。' },
    ]},
    { title: '第四单元 三位数乘两位数', points: [
      { title: '笔算乘法', content: '掌握三位数乘两位数的笔算方法，理解积的变化规律。' },
    ]},
    { title: '第五单元 平行四边形和梯形', points: [
      { title: '平行与垂直', content: '理解平行线和垂线的概念，能画平行线和垂线。' },
      { title: '平行四边形和梯形', content: '认识平行四边形和梯形的特征，理解高和底的概念。' },
    ]},
    { title: '第六单元 除数是两位数的除法', points: [
      { title: '笔算除法', content: '掌握除数是两位数的笔算除法方法，掌握"四舍五入"试商法。' },
    ]},
    { title: '第七单元 条形统计图', points: [
      { title: '条形统计图', content: '认识条形统计图，能根据数据绘制和分析条形统计图。' },
    ]},
  ]),
  genMath('四年级', '下册', [
    { title: '第一单元 四则运算', points: [
      { title: '四则运算顺序', content: '掌握加减乘除四则运算的顺序，理解中括号的作用。' },
    ]},
    { title: '第二单元 观察物体（二）', points: [
      { title: '从不同方向观察', content: '学会从前面、上面、左面观察由小正方体搭成的几何体。' },
    ]},
    { title: '第三单元 运算定律', points: [
      { title: '运算定律', content: '掌握加法交换律、结合律，乘法交换律、结合律、分配律，能简便计算。' },
    ]},
    { title: '第四单元 小数的意义和性质', points: [
      { title: '小数的意义', content: '理解小数的意义，掌握小数的读写和比较大小。' },
      { title: '小数的性质', content: '理解小数的性质（末尾添0去0大小不变），掌握小数点移动规律。' },
    ]},
    { title: '第五单元 三角形', points: [
      { title: '三角形的特性', content: '认识三角形的特征（稳定性），理解三角形任意两边之和大于第三边。' },
      { title: '三角形分类', content: '按角分类（锐角、直角、钝角三角形）和按边分类（等腰、等边三角形）。' },
      { title: '三角形内角和', content: '理解三角形内角和为180度，能求未知角的度数。' },
    ]},
    { title: '第六单元 小数的加法和减法', points: [
      { title: '小数加减法', content: '掌握小数加减法的计算方法（小数点对齐），能进行小数加减混合运算。' },
    ]},
    { title: '第七单元 图形的运动（二）', points: [
      { title: '轴对称和平移', content: '能画出轴对称图形的另一半，掌握在方格纸上画平移图形的方法。' },
    ]},
  ]),
  genMath('五年级', '上册', [
    { title: '第一单元 小数乘法', points: [
      { title: '小数乘法', content: '掌握小数乘法的计算方法，理解积的小数位数确定规律。' },
    ]},
    { title: '第二单元 位置', points: [
      { title: '用数对表示位置', content: '学会用数对（列,行）表示物体的位置。' },
    ]},
    { title: '第三单元 小数除法', points: [
      { title: '小数除法', content: '掌握小数除以整数、小数除以小数的计算方法，理解商的近似值。' },
      { title: '循环小数', content: '认识循环小数、有限小数和无限小数的概念。' },
    ]},
    { title: '第四单元 可能性', points: [
      { title: '可能性大小', content: '理解可能性的大小与事件发生概率的关系。' },
    ]},
    { title: '第五单元 简易方程', points: [
      { title: '用字母表示数', content: '学会用字母表示数和数量关系，理解代数式。' },
      { title: '解方程', content: '掌握等式的性质，能解简单的一元一次方程。' },
    ]},
    { title: '第六单元 多边形的面积', points: [
      { title: '面积计算', content: '掌握平行四边形、三角形、梯形面积的计算公式及其推导过程。' },
    ]},
    { title: '第七单元 植树问题', points: [
      { title: '植树问题', content: '掌握植树问题（两端都栽、一端栽、两端不栽）的解题规律。' },
    ]},
  ]),
  genMath('五年级', '下册', [
    { title: '第一单元 观察物体（三）', points: [
      { title: '空间想象', content: '根据三视图还原几何体，培养空间想象力。' },
    ]},
    { title: '第二单元 因数与倍数', points: [
      { title: '因数和倍数', content: '理解因数和倍数的概念，掌握找因数和倍数的方法。' },
      { title: '质数和合数', content: '区分质数和合数，掌握2、3、5的倍数特征。' },
    ]},
    { title: '第三单元 长方体和正方体', points: [
      { title: '表面积', content: '掌握长方体和正方体表面积的计算方法。' },
      { title: '体积', content: '理解体积的含义，掌握长方体和正方体体积的计算公式。' },
    ]},
    { title: '第四单元 分数的意义和性质', points: [
      { title: '分数的意义', content: '理解分数的意义，掌握分数与除法的关系。' },
      { title: '约分和通分', content: '掌握约分（最大公因数）和通分（最小公倍数）的方法。' },
    ]},
    { title: '第五单元 分数的加法和减法', points: [
      { title: '分数加减法', content: '掌握同分母和异分母分数加减法的计算方法。' },
    ]},
    { title: '第六单元 分数乘法', points: [
      { title: '分数乘法', content: '掌握分数乘分数的计算方法，能解决分数乘法实际问题。' },
    ]},
  ]),
  genMath('六年级', '上册', [
    { title: '第一单元 分数乘法', points: [
      { title: '分数乘法应用', content: '掌握"求一个数的几分之几是多少"的解题方法。' },
    ]},
    { title: '第二单元 位置与方向（二）', points: [
      { title: '方向与距离', content: '根据方向和距离确定物体的位置，能描述简单的路线图。' },
    ]},
    { title: '第三单元 分数除法', points: [
      { title: '分数除法', content: '掌握分数除法的计算方法（乘以倒数），能解决分数除法实际问题。' },
    ]},
    { title: '第四单元 比', points: [
      { title: '比的意义和性质', content: '理解比的意义，掌握比的基本性质和化简比的方法。' },
    ]},
    { title: '第五单元 圆', points: [
      { title: '圆的认识', content: '认识圆的各部分名称（圆心、半径、直径），理解直径与半径的关系。' },
      { title: '圆的周长和面积', content: '掌握圆周长公式C=πd和圆面积公式S=πr²。' },
    ]},
    { title: '第六单元 百分数（一）', points: [
      { title: '百分数', content: '理解百分数的意义，掌握百分数与分数、小数的互化。' },
    ]},
    { title: '第七单元 扇形统计图', points: [
      { title: '扇形统计图', content: '认识扇形统计图的特点，能从图中获取信息并分析。' },
    ]},
  ]),
  genMath('六年级', '下册', [
    { title: '第一单元 负数', points: [
      { title: '负数的认识', content: '初步认识负数，理解正负数表示相反意义的量。' },
    ]},
    { title: '第二单元 百分数（二）', points: [
      { title: '百分数应用', content: '掌握折扣、成数、税率、利率等百分数在生活中的应用。' },
    ]},
    { title: '第三单元 圆柱与圆锥', points: [
      { title: '圆柱', content: '掌握圆柱表面积和体积的计算方法。' },
      { title: '圆锥', content: '掌握圆锥体积的计算公式 V=1/3Sh。' },
    ]},
    { title: '第四单元 比例', points: [
      { title: '比例的意义和性质', content: '理解比例的意义，掌握比例的基本性质和解比例。' },
      { title: '正比例和反比例', content: '区分正比例和反比例关系，能判断两种量是否成正/反比例。' },
    ]},
    { title: '第五单元 数学广角——鸽巢问题', points: [
      { title: '鸽巢原理', content: '理解鸽巢原理（抽屉原理），能解决简单的鸽巢问题。' },
    ]},
    { title: '第六单元 整理和复习', points: [
      { title: '数与代数', content: '复习整数、小数、分数、百分数的相关概念和运算。' },
      { title: '图形与几何', content: '复习平面图形和立体图形的特征、周长、面积、体积计算。' },
    ]},
  ]),
)

// ============ 四~六年级英语（精简版） ============

function genEnglish(grade: string, term: string, modules: { title: string; topic: string; keyPoints: string[] }[]): SeedTextbook {
  return {
    publisher: '外研版', subject: '英语', grade, term,
    name: `外研版${grade}英语${term}（三起）`,
    units: modules.map((m, i) => ({
      title: `Module ${i + 1} ${m.topic}`,
      summary: '',
      points: m.keyPoints.map(kp => ({
        title: kp, type: '重点', content: `${m.topic}主题：${kp}`, difficulty: '中等', keywords: kp,
      })),
    })),
  }
}

FLTRP_ENGLISH.push(
  genEnglish('四年级', '上册', [
    { title: '1', topic: 'Directions', keyPoints: ['Turn left/right', 'Where is...?', 'Go straight on'] },
    { title: '2', topic: 'Activities', keyPoints: ['reading a book', 'listening to music', 'playing football'] },
    { title: '3', topic: 'Sports Day', keyPoints: ['be going to...', 'Sports Day', 'run/jump/throw'] },
    { title: '4', topic: 'Festivals', keyPoints: ['Happy Halloween!', 'Happy New Year!', 'Christmas'] },
    { title: '5', topic: 'Can I...?', keyPoints: ['Can I have...?', 'Can you...?', '请求许可'] },
    { title: '6', topic: 'Past Tense', keyPoints: ['一般过去时', 'was/were', 'went/did'] },
  ]),
  genEnglish('四年级', '下册', [
    { title: '1', topic: 'Friends', keyPoints: ['描述朋友性格', 'nice/naughty/clever', 'This is...'] },
    { title: '2', topic: 'London', keyPoints: ['London landmarks', 'Big Ben', 'Tower Bridge'] },
    { title: '3', topic: 'Picnic', keyPoints: ['Will you...?', 'picnic', '一般将来时 will'] },
    { title: '4', topic: 'Robots', keyPoints: ['robots', 'will do everything', '一般将来时'] },
    { title: '5', topic: 'Sizes', keyPoints: ['big/small/long/short', '比较大小', 'It\'s...'] },
    { title: '6', topic: 'Music', keyPoints: ['instruments', 'play the piano', 'can/can\'t'] },
  ]),
  genEnglish('五年级', '上册', [
    { title: '1', topic: 'Past Events', keyPoints: ['一般过去时', 'went to...', 'saw/ate/bought'] },
    { title: '2', topic: 'Shopping', keyPoints: ['How much...?', '购物对话', '数字表达'] },
    { title: '3', topic: 'Halloween', keyPoints: ['Halloween', 'Easter', '节日文化'] },
    { title: '4', topic: 'Help', keyPoints: ['Can you help me?', '请求帮助', 'offering help'] },
    { title: '5', topic: 'Abilities', keyPoints: ['can/can\'t', 'abilities', 'could/couldn\'t'] },
    { title: '6', topic: 'Assessment', keyPoints: ['期末复习', '综合运用', '评价'] },
  ]),
  genEnglish('五年级', '下册', [
    { title: '1', topic: 'Life', keyPoints: ['used to...', '过去习惯', 'life changes'] },
    { title: '2', topic: 'Future', keyPoints: ['will/be going to', 'future plans', '将来计划'] },
    { title: '3', topic: 'Travel', keyPoints: ['travel', 'by plane/train', '行程描述'] },
    { title: '4', topic: 'Rules', keyPoints: ['must/mustn\'t', 'should/shouldn\'t', 'rules'] },
    { title: '5', topic: 'Feelings', keyPoints: ['feelings', 'happy/sad/excited', 'expressing emotions'] },
    { title: '6', topic: 'Review', keyPoints: ['综合复习', '语法总结', '词汇归纳'] },
  ]),
  genEnglish('六年级', '上册', [
    { title: '1', topic: 'Travel', keyPoints: ['一般过去时复习', 'travel experiences', 'went/visited'] },
    { title: '2', topic: 'Festivals', keyPoints: ['Mid-Autumn Festival', 'Thanksgiving', '节日比较'] },
    { title: '3', topic: 'Hobbies', keyPoints: ['collecting stamps', 'hobbies', 'like/love doing'] },
    { title: '4', topic: 'Future', keyPoints: ['will/won\'t', 'future predictions', '将来预测'] },
    { title: '5', topic: 'Animals', keyPoints: ['animals', 'endangered species', 'protecting animals'] },
    { title: '6', topic: 'Review', keyPoints: ['时态总结', '综合复习', '毕业准备'] },
  ]),
  genEnglish('六年级', '下册', [
    { title: '1', topic: 'Memories', keyPoints: ['school memories', 'used to', '回忆小学生活'] },
    { title: '2', topic: 'Plans', keyPoints: ['middle school', 'future plans', '初中计划'] },
    { title: '3', topic: 'Review', keyPoints: ['小学英语总结', '语法复习', '词汇总复习'] },
    { title: '4', topic: 'Assessment', keyPoints: ['毕业评价', '学习成果', '综合测试'] },
    { title: '5', topic: 'Transition', keyPoints: ['升初中衔接', '学习方法', '英语学习建议'] },
    { title: '6', topic: 'Goodbye', keyPoints: ['告别', '感谢老师', '展望未来'] },
  ]),
)

/** 全部种子教材数据 */
export const SEED_TEXTBOOKS: SeedTextbook[] = [...PEP_CHINESE, ...PEP_MATH, ...FLTRP_ENGLISH]
