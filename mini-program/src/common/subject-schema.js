// 语文 / 数学 / 英语 学科专项工具（AI 生成类）配置
// 每项：title 标题；icon 图标；subject 学科；fields 表单字段；build(f) 生成 prompt
// 字段 type: input 文本 / number 数字 / picker 选项(带 options) / textarea 多行

const GRADE = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']

export const SUBJECT_TOOLS = {
  // ============ 语文 ============
  poetry: {
    title: '古诗词助手', icon: '📜', subject: '语文',
    fields: [
      { k: 'keyword', label: '诗词/作者/主题', type: 'input', placeholder: '如：静夜思 / 李白 / 思乡', required: true },
    ],
    build: (f) =>
      `请作为语文老师，围绕「${f.keyword}」提供古诗词赏析。若为具体诗词，请给出：1) 完整原文（标注朝代与作者）；2) 逐句注释；3) 白话译文；4) 思想感情与写作手法赏析；5) 作者简介。若为作者或主题，请精选 2-3 首代表作分别按上述结构讲解。中文输出，条理清晰，可直接用于课堂。`,
  },
  dictation: {
    title: '汉字听写', icon: '🎧', subject: '语文',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'textbook', label: '教材', type: 'input', placeholder: '如：人教版' },
      { k: 'theme', label: '主题/单元', type: 'input', placeholder: '如：第一单元 / 春天' },
      { k: 'count', label: '词语数量', type: 'number', placeholder: '如：15' },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}${f.textbook ? '（' + f.textbook + '）' : ''}」学生生成一份汉字听写词语表，主题：${f.theme || '综合'}，数量：${f.count || 15} 个。以编号列表输出，每个词语给出：词语、拼音、简要释义、一个例句。用词难度贴合年级，可直接用于听写练习。`,
  },
  reading: {
    title: '阅读理解生成', icon: '📖', subject: '语文',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'genre', label: '体裁', type: 'picker', options: ['记叙文', '说明文', '议论文', '寓言故事', '散文'] },
      { k: 'theme', label: '主题', type: 'input', placeholder: '如：亲情 / 环保' },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生生成一篇阅读理解练习。体裁：${f.genre || '记叙文'}，主题：${f.theme || '成长'}。要求：1) 一篇 400-600 字短文（标注题目）；2) 配 4-5 道阅读理解题（含 1 道开放题）；3) 附参考答案与解题思路。语言与难度贴合年级。`,
  },
  essay: {
    title: '小作文助手', icon: '✍️', subject: '语文',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'type', label: '类型', type: 'picker', options: ['写人', '写景', '记事', '状物', '想象', '应用文'] },
      { k: 'topic', label: '题目/主题', type: 'input', placeholder: '如：我的妈妈', required: true },
      { k: 'words', label: '字数', type: 'input', placeholder: '如：400字' },
    ],
    build: (f) =>
      `请作为语文老师，围绕作文题「${f.topic}」（${f.grade || '小学'}，类型：${f.type || '记叙'}，字数：${f.words || '400字左右'}）提供写作辅导：1) 审题与立意思路；2) 详细写作提纲；3) 一篇范文；4) 可用的好词好句摘录。中文输出，贴合年级水平。`,
  },
  idiom: {
    title: '成语词典', icon: '🔤', subject: '语文',
    fields: [
      { k: 'keyword', label: '成语/关键字', type: 'input', placeholder: '如：画蛇添足 / 含"马"的成语', required: true },
    ],
    build: (f) =>
      `请围绕「${f.keyword}」讲解成语。若为具体成语，给出：释义、拼音、出处、典故故事、近义词、反义词、造句示例（2 句）。若为关键字/主题，请精选 5 个相关成语分别按上述结构简要讲解。中文输出。`,
  },
  pinyin: {
    title: '拼音标注', icon: '🎵', subject: '语文',
    fields: [
      { k: 'text', label: '要标注的文字', type: 'textarea', placeholder: '粘贴一段文字，自动逐字标注拼音', required: true },
    ],
    build: (f) =>
      `请为下面这段文字逐字标注汉语拼音（带声调），输出格式为「汉字(pīnyīn)」依次排列，标点原样保留；随后另起一行给出整段的连续拼音版本。文字如下：\n${f.text}`,
  },
  'writing-materials': {
    title: '作文素材', icon: '📚', subject: '语文',
    fields: [
      { k: 'theme', label: '主题', type: 'input', placeholder: '如：坚持 / 感恩', required: true },
      { k: 'type', label: '素材类型', type: 'picker', options: ['名人名言', '典型事例', '优美开头', '精彩结尾', '综合'] },
    ],
    build: (f) =>
      `请围绕作文主题「${f.theme}」提供写作素材，类型：${f.type || '综合'}。分类整理输出：1) 名人名言 3-5 条（注明出处）；2) 典型事例 2-3 个（简述）；3) 优美的开头与结尾各 2 段。语言适合中小学生使用。`,
  },

  // ============ 英语 ============
  'word-card': {
    title: '英语单词卡片', icon: '🃏', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'theme', label: '主题', type: 'input', placeholder: '如：动物 / 食物 / 学校', required: true },
      { k: 'count', label: '数量', type: 'number', placeholder: '如：12' },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生生成一组英语单词卡片，主题：${f.theme}，数量：${f.count || 12} 个。以编号列表输出，每个单词包含：单词、音标、词性、中文释义、一个简单例句（含中文翻译）。难度贴合年级。`,
  },
  'sentence-practice': {
    title: '英语句型练习', icon: '✨', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'pattern', label: '句型', type: 'input', placeholder: '如：There be / 一般现在时', required: true },
    ],
    build: (f) =>
      `请围绕英语句型「${f.pattern}」（${f.grade || '小学'}）设计练习：1) 用中文讲清句型结构与用法；2) 给出 5 个例句（含中文）；3) 出 8 道练习题（造句/填空/改写混合）并附答案。`,
  },
  listening: {
    title: '英语听力', icon: '📻', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'topic', label: '话题', type: 'input', placeholder: '如：问路 / 购物', required: true },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生生成一份英语听力练习（话题：${f.topic}）。输出：1) 听力材料原文（对话或短文，配中文翻译，供老师朗读）；2) 5 道听力理解题（选择/判断）；3) 参考答案。语速与词汇贴合年级。`,
  },
  grammar: {
    title: '英语语法练习', icon: '🔡', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'point', label: '语法点', type: 'input', placeholder: '如：现在进行时 / 名词复数', required: true },
    ],
    build: (f) =>
      `请围绕英语语法点「${f.point}」（${f.grade || '小学'}）讲解并出题：1) 中文讲清规则与常见错误；2) 5 个例句（含中文）；3) 10 道练习题（选择/填空/改错）并附答案与简要解析。`,
  },
  'scene-dialogue': {
    title: '英语情景对话', icon: '💬', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'scene', label: '情景', type: 'input', placeholder: '如：在餐厅点餐', required: true },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生编写一段英语情景对话，情景：${f.scene}。输出：1) 8-12 轮的对话（A/B 角色，含中文翻译）；2) 重点单词与常用表达清单；3) 2-3 句可替换的拓展表达。难度贴合年级。`,
  },
  spell: {
    title: '单词拼写', icon: '⌨️', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'theme', label: '主题', type: 'input', placeholder: '如：颜色 / 数字' },
      { k: 'count', label: '数量', type: 'number', placeholder: '如：15' },
    ],
    build: (f) =>
      `请生成一份英语单词拼写练习，年级：${f.grade || '小学'}，主题：${f.theme || '综合'}，数量：${f.count || 15} 个。以编号列表输出，每题给出：中文提示 + 首字母提示（如 a____），另在末尾统一附上答案（完整单词与音标）。难度贴合年级。`,
  },
  speaking: {
    title: '口语练习', icon: '🎙️', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'topic', label: '话题', type: 'input', placeholder: '如：My Family', required: true },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生设计英语口语练习，话题：${f.topic}。输出：1) 3-5 个引导问题（含中文）；2) 常用句型与词汇；3) 一段示范回答（含中文翻译）；4) 发音或表达小贴士。`,
  },
  'english-story': {
    title: '英语爽文', icon: '📕', subject: '英语',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'theme', label: '主题', type: 'input', placeholder: '如：冒险 / 友谊', required: true },
      { k: 'length', label: '篇幅', type: 'picker', options: ['短篇(150词)', '中篇(300词)', '长篇(500词)'] },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生创作一篇有趣的英语分级读物，主题：${f.theme}，篇幅：${f.length || '短篇'}。要求：1) 英文正文（用词贴合年级，情节轻松吸引人）；2) 逐段中文对照翻译；3) 重点词汇表（单词+音标+中文）。`,
  },

  // ============ 科学 ============
  'experiment-design': {
    title: '实验设计助手', icon: '🧪', subject: '科学',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'topic', label: '实验主题', type: 'input', placeholder: '如：水的三态变化 / 光的折射', required: true },
      { k: 'duration', label: '课时', type: 'picker', options: ['1课时(40分)', '2课时', '短课(20分)'] },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」科学课设计一份实验方案，主题：${f.topic}，课时：${f.duration || '1课时'}。要求包含：1) 实验目的（核心素养目标）；2) 实验材料清单（注明可替代的家用材料）；3) 详细实验步骤（含安全提示与教师演示要点）；4) 观察记录表模板；5) 实验结论引导问题；6) 拓展思考题。语言贴合年级，可直接用于课堂教学。`,
  },
  'science-knowledge': {
    title: '科学知识图解', icon: '🔬', subject: '科学',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'concept', label: '科学概念', type: 'input', placeholder: '如：浮力 / 食物链 / 磁场', required: true },
    ],
    build: (f) =>
      `请围绕科学概念「${f.concept}」（${f.grade || '小学'}）生成图解化教学资料：1) 概念的通俗定义（用生活化比喻）；2) 概念的形成过程或原理图示（用文字描述可画出的示意图）；3) 3 个生活中的实例；4) 常见误区辨析；5) 3 道分层练习题（含答案）；6) 拓展阅读建议。输出便于教师直接讲授课件使用。`,
  },
  'observation-record': {
    title: '观察记录生成', icon: '📝', subject: '科学',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'object', label: '观察对象', type: 'input', placeholder: '如：种子发芽 / 月相变化', required: true },
      { k: 'days', label: '观察周期(天)', type: 'number', placeholder: '如：7' },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」学生设计一份「${f.object}」的长期观察记录表，观察周期：${f.days || 7} 天。输出包含：1) 观察目的与背景知识；2) 每日观察记录表（含日期、天气、观察现象、绘图区、疑问栏）；3) 观察小结引导问题；4) 家长协助建议；5) 评估标准。表格清晰可打印，便于学生填写。`,
  },

  // ============ 道德与法治 ============
  'moral-case': {
    title: '案例分析', icon: '⚖️', subject: '道德与法治',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'topic', label: '主题', type: 'picker', options: ['诚实守信', '尊重他人', '遵守规则', '保护环境', '爱国教育', '网络安全', '消费维权', '校园安全'] },
      { k: 'scene', label: '情境描述(选填)', type: 'textarea', placeholder: '如：同学捡到钱包后的处理方式' },
    ],
    build: (f) =>
      `请为「${f.grade || '小学'}」道德与法治课设计一份案例分析，主题：${f.topic || '诚实守信'}${f.scene ? '，情境：' + f.scene : ''}。输出包含：1) 一个贴近学生生活的典型案例（200字左右）；2) 3-5 个分层讨论问题（从事实理解到价值判断）；3) 法律/道德依据说明（引用相关条款或价值观）；4) 教学引导建议；5) 行为实践延伸活动。语言与情境贴合年级。`,
  },
  'moral-discussion': {
    title: '情境讨论', icon: '💬', subject: '道德与法治',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'dilemma', label: '两难情境', type: 'textarea', placeholder: '如：朋友作弊该不该告诉老师', required: true },
    ],
    build: (f) =>
      `请围绕道德两难情境「${f.dilemma}」（${f.grade || '小学'}）设计一堂讨论课。输出包含：1) 情境的完整描述（增加细节让两难更突出）；2) 两种对立观点的论据分析（各 3 条）；3) 讨论流程设计（小组讨论→全班分享→教师引导）；4) 价值观引导要点（避免简单说教）；5) 总结反思问题；6) 课后实践任务。`,
  },
  'moral-value': {
    title: '价值观辨析', icon: '🌟', subject: '道德与法治',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', options: GRADE },
      { k: 'value', label: '价值观关键词', type: 'input', placeholder: '如：公平 / 责任 / 包容', required: true },
    ],
    build: (f) =>
      `请围绕价值观「${f.value}」（${f.grade || '小学'}）生成辨析教学资料：1) 概念的多维度解读（个人/他人/社会三个层面）；2) 3 个正反对比的小故事（每个100字左右）；3) 名人名言或经典语录 3-5 条（注明出处）；4) "我会怎么做"行为选择卡 5 题（含情境与选项）；5) 跨学科融合建议（如何与语文/班会结合）；6) 家校共育延伸活动。`,
  },
}

export function getSubjectTool(type) {
  return SUBJECT_TOOLS[type] || null
}

/**
 * 学科清单（用于工具箱"学科工具"上层菜单的学科入口展示）。
 * subject 字段对应 SUBJECT_TOOLS 中工具的 subject 属性。
 * 数学学科工具用独立 path 页面，extraPaths 字段声明该学科的独立工具入口。
 */
export const SUBJECT_LIST = [
  { subject: '语文', icon: '📜', color: '#e6a23c', desc: '诗词/听写/作文/阅读' },
  { subject: '数学', icon: '🔢', color: '#3a8ee6', desc: '口算/竖式/单位换算' },
  { subject: '英语', icon: '🔤', color: '#07c160', desc: '单词/听力/口语/语法' },
  { subject: '科学', icon: '🔬', color: '#9b59b6', desc: '实验设计/知识图解/观察记录' },
  { subject: '道德与法治', icon: '⚖️', color: '#e06c75', desc: '案例分析/情境讨论/价值观辨析' },
]

/**
 * 数学学科独立工具入口（不在 SUBJECT_TOOLS 中，跳转到独立页面）。
 * 集中声明便于 subject-list 子页面统一展示。
 */
export const MATH_TOOLS = [
  { label: '口算生成', icon: '➕', path: '/pages/tools/math' },
  { label: '竖式计算', icon: '📐', path: '/pages/tools/vcalc' },
  { label: '口算答题卡', icon: '📋', path: '/pages/tools/anscard' },
  { label: '乘法口诀', icon: '🔢', path: '/pages/tools/multitable' },
  { label: '单位换算', icon: '⚖️', path: '/pages/tools/unit' },
  { label: '错题本', icon: '📕', path: '/pages/tools/mistakes' },
]

/**
 * 按学科名称返回该学科的所有工具列表。
 * 返回统一格式：[{ key, title, icon, subject, path? }]
 * - 语文/英语/科学/道德与法治：从 SUBJECT_TOOLS 提取，path 跳转到 /pages/subject/subject?type=key
 * - 数学：从 MATH_TOOLS 提取，path 跳转到独立页面
 */
export function getToolsBySubject(subject) {
  if (subject === '数学') {
    return MATH_TOOLS.map((t) => ({
      key: t.label,
      title: t.label,
      icon: t.icon,
      subject: '数学',
      path: t.path,
    }))
  }
  return Object.keys(SUBJECT_TOOLS)
    .filter((k) => SUBJECT_TOOLS[k].subject === subject)
    .map((k) => ({
      key: k,
      title: SUBJECT_TOOLS[k].title,
      icon: SUBJECT_TOOLS[k].icon,
      subject,
      subjectKey: k,
    }))
}
