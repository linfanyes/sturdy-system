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
}

export function getSubjectTool(type) {
  return SUBJECT_TOOLS[type] || null
}
