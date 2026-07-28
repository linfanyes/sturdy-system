// 通用「文字办公 / 其他」AI 工具配置（非学科类）
// 每个工具：icon/title + fields(表单字段) + build(form)->prompt
// 页面 pages/quicktool/quicktool.vue 按 type 动态渲染并调用 /api/ai/chat-sync

export const QUICK_TOOLS = {
  translate: {
    icon: '🌐',
    title: '翻译',
    hint: '输入待翻译文本，AI 多语种互译，适合英语教研与班级公告。',
    fields: [
      { k: 'from', label: '源语言', type: 'picker', required: true, options: ['中文', '英文', '日文', '韩文'] },
      { k: 'to', label: '目标语言', type: 'picker', required: true, options: ['英文', '中文', '日文', '韩文'] },
      { k: 'text', label: '待翻译文本', type: 'textarea', required: true, placeholder: '粘贴需要翻译的内容…' },
    ],
    build: (f) => `请将以下${f.from}翻译成${f.to}，只输出翻译结果，不要解释：\n\n${f.text}`,
  },
  comment: {
    icon: '✍️',
    title: '评语生成',
    hint: '填写学生特点，一键生成贴合的期末 / 阶段评语。',
    fields: [
      { k: 'name', label: '学生姓名', type: 'text', required: true, placeholder: '如：李明' },
      { k: 'grade', label: '年级', type: 'picker', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'] },
      { k: 'traits', label: '学生特点', type: 'textarea', required: true, placeholder: '成绩、性格、特长、需改进处…' },
      { k: 'tone', label: '语气风格', type: 'picker', options: ['鼓励型', '中肯型', '正式型'] },
    ],
    build: (f) => `请为${f.grade || ''}学生「${f.name}」生成一段评语。\n学生特点：${f.traits}\n语气风格：${f.tone || '中肯型'}。\n要求：100 字左右，先肯定优点再提期望，语言温暖具体，避免套话。`,
  },
  summary: {
    icon: '📑',
    title: '期末总结生成',
    hint: '基于关键要点，生成学生 / 班级 / 学科总结。',
    fields: [
      { k: 'scope', label: '总结对象', type: 'picker', required: true, options: ['学生个人总结', '班级总结', '学科总结'] },
      { k: 'grade', label: '年级', type: 'picker', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'] },
      { k: 'points', label: '关键要点 / 数据', type: 'textarea', placeholder: '成绩变化、活动、典型事例…' },
    ],
    build: (f) => `请生成一份${f.scope}（${f.grade || ''}）。\n参考要点：${f.points || '（无）'}\n要求：结构清晰（总体情况 / 亮点 / 不足 / 展望），语言正式得体。`,
  },
  speech: {
    icon: '🎤',
    title: '演讲稿生成',
    hint: '国旗下讲话、班会、家长会等场景演讲稿。',
    fields: [
      { k: 'scene', label: '场景', type: 'picker', required: true, options: ['国旗下讲话', '班会', '家长会', '开学典礼', '毕业典礼'] },
      { k: 'topic', label: '演讲主题', type: 'text', required: true, placeholder: '如：节约粮食，从我做起' },
      { k: 'duration', label: '时长', type: 'picker', options: ['约3分钟', '约5分钟', '约10分钟'] },
    ],
    build: (f) => `请写一篇${f.scene}演讲稿，主题「${f.topic}」，篇幅${f.duration || '约5分钟'}。\n要求：开头亲切有感染力，主体分 2-3 个论点，结尾升华号召；口语化、适合朗读。`,
  },
  paper: {
    icon: '📝',
    title: '教育论文',
    hint: '围绕主题生成论文提纲与核心段落，辅助教研写作。',
    fields: [
      { k: 'topic', label: '论文主题', type: 'text', required: true, placeholder: '如：核心素养导向的小学数学作业设计' },
      { k: 'level', label: '类型', type: 'picker', options: ['期刊论文', '教学随笔', '课题报告', '评课稿'] },
      { k: 'outline', label: '已有提纲 / 要点', type: 'textarea', placeholder: '可填关键词或段落思路' },
    ],
    build: (f) => `请围绕「${f.topic}」撰写一篇${f.level || '教学随笔'}的提纲与核心段落。\n已有要点：${f.outline || '（无）'}\n要求：含标题、摘要、正文结构（问题提出 / 实践做法 / 成效反思），引用教育常用表述。`,
  },
  blackboard: {
    icon: '🟢',
    title: '黑板报生成',
    hint: '按主题生成多套黑板报方案，含版面与文字内容。',
    fields: [
      { k: 'theme', label: '主题', type: 'text', required: true, placeholder: '如：网络安全教育' },
      { k: 'grade', label: '年级', type: 'picker', options: ['小学', '初中', '高中', '通用'] },
      { k: 'style', label: '风格', type: 'picker', options: ['节日庆祝', '安全教育', '学习园地', '德育园地', '卫生健康'] },
    ],
    build: (f) => `请生成 3 套黑板报设计方案，主题「${f.theme}」，适用${f.grade || '通用'}，风格偏向${f.style || '学习园地'}。\n每套包含：① 版面布局（分块说明）② 大标题与栏目小标题 ③ 各板块文字内容（可直接抄写）④ 插图 / 花边建议。`,
  },
  // —— 语文学科工具 ——
  pinyin: {
    icon: '🔊',
    title: '拼音标注',
    hint: '为汉字/文章标注拼音，多音字智能判断。',
    fields: [
      { k: 'text', label: '待标注文本', type: 'textarea', required: true, placeholder: '输入需要标注拼音的汉字或文章' },
    ],
    build: (f) => `请为以下汉字标注拼音（多音字根据上下文判断），格式：汉字(拼音)，标出声调：\n${f.text}`,
  },
  idiom: {
    icon: '🔤',
    title: '成语词典',
    hint: '查询成语释义、出处、近反义词、接龙。',
    fields: [
      { k: 'query', label: '成语/关键字', type: 'text', required: true, placeholder: '如：一、开心、画蛇添足' },
    ],
    build: (f) => `请介绍成语「${f.query}」的释义、出处、近义词、反义词、例句，并给出 5 个接龙成语。`,
  },
  composition: {
    icon: '✏️',
    title: '作文素材',
    hint: '按主题生成好词好句、开头结尾、结构提纲。',
    fields: [
      { k: 'topic', label: '作文主题', type: 'text', required: true, placeholder: '如：我的妈妈' },
      { k: 'grade', label: '年级', type: 'picker', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
    ],
    build: (f) => `请为${f.grade || '小学'}学生提供作文《${f.topic}》的写作素材（包括好词好句、开头结尾范例、结构提纲）。`,
  },
  poetry: {
    icon: '📜',
    title: '古诗词助手',
    hint: '查询古诗词原文、赏析、创作背景。',
    fields: [
      { k: 'query', label: '诗名/作者/诗句', type: 'text', required: true, placeholder: '如：静夜思、李白' },
    ],
    build: (f) => `请详细介绍古诗词「${f.query}」的原文、作者、创作背景、诗句赏析、艺术特色，适合小学教师备课使用。`,
  },
  reading: {
    icon: '📖',
    title: '阅读理解',
    hint: '按年级生成阅读理解短文+理解题。',
    fields: [
      { k: 'topic', label: '主题', type: 'text', required: true, placeholder: '如：环保、友谊' },
      { k: 'grade', label: '年级', type: 'picker', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
    ],
    build: (f) => `请为${f.grade || '小学'}学生生成一篇关于「${f.topic}」的阅读理解短文（200-400字），附 3 道理解题（含答案）。`,
  },
  dictation: {
    icon: '🎯',
    title: '汉字听写',
    hint: '按年级生成听写词语列表（含拼音）。',
    fields: [
      { k: 'grade', label: '年级', type: 'picker', required: true, options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
      { k: 'unit', label: '单元/课题', type: 'text', placeholder: '可选' },
      { k: 'count', label: '词语数量', type: 'number', placeholder: '默认 10 个' },
    ],
    build: (f) => `请生成${f.count || 10}个${f.grade}语文听写词语（含拼音），${f.unit ? `来自${f.unit}。` : ''}每行一个词语，格式：词语（拼音）。`,
  },
  // —— 英语学科工具 ——
  wordCards: {
    icon: '🃏',
    title: '单词卡片',
    hint: '按主题生成英语单词卡片（含音标/释义/例句）。',
    fields: [
      { k: 'topic', label: '主题', type: 'text', required: true, placeholder: '如：动物、水果、颜色' },
      { k: 'count', label: '单词数量', type: 'number', placeholder: '默认 10 个' },
    ],
    build: (f) => `请生成${f.count || 10}个关于「${f.topic}」的英语单词卡片，每个单词包含：英文、音标、中文释义、例句。以清晰的表格格式呈现。`,
  },
  sentence: {
    icon: '💬',
    title: '句型练习',
    hint: '按主题和难度生成英语句型练习。',
    fields: [
      { k: 'topic', label: '主题', type: 'text', required: true, placeholder: '如：购物、问路' },
      { k: 'level', label: '难度', type: 'picker', options: ['初级', '中级', '高级'] },
    ],
    build: (f) => `请生成关于「${f.topic}」的英语句型练习（${f.level || '初级'}难度），包含 5 个核心句型、中文释义、例句，以及 3 道填空练习题。`,
  },
  grammar: {
    icon: '📐',
    title: '语法练习',
    hint: '按语法点生成讲解+例句+练习题。',
    fields: [
      { k: 'topic', label: '语法点', type: 'text', required: true, placeholder: '如：一般现在时、被动语态' },
    ],
    build: (f) => `请生成关于「${f.topic}」的英语语法练习，包含：语法规则说明、5 个例句、10 道练习题（选择题/填空题）及答案。`,
  },
  listening: {
    icon: '🎧',
    title: '英语听力',
    hint: '生成英语听力材料+理解题。',
    fields: [
      { k: 'topic', label: '主题', type: 'text', required: true, placeholder: '如：日常对话、校园生活' },
    ],
    build: (f) => `请生成一段英语听力材料（适合小学生），主题：${f.topic}。包含：听力原文（5-8句）、3 道理解题（选择题）及答案。`,
  },
  spelling: {
    icon: '🔤',
    title: '单词拼写',
    hint: '生成英语单词拼写练习题。',
    fields: [
      { k: 'topic', label: '主题', type: 'text', required: true, placeholder: '如：动物、水果' },
      { k: 'count', label: '单词数量', type: 'number', placeholder: '默认 10 个' },
    ],
    build: (f) => `请生成${f.count || 10}个关于「${f.topic}」的英语单词拼写练习（给出中文，填写英文），附答案。`,
  },
  speaking: {
    icon: '🎤',
    title: '口语练习',
    hint: '生成英语口语对话练习材料。',
    fields: [
      { k: 'topic', label: '主题', type: 'text', required: true, placeholder: '如：自我介绍、购物' },
      { k: 'level', label: '难度', type: 'picker', options: ['初级', '中级', '高级'] },
    ],
    build: (f) => `请生成关于「${f.topic}」的英语口语对话练习（${f.level || '初级'}难度），包含：场景说明、核心句型、2 组示范对话、3 个练习提示。`,
  },
}

export function getQuickTool(type) {
  return QUICK_TOOLS[type] || null
}
