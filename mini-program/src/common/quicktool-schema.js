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
}

export function getQuickTool(type) {
  return QUICK_TOOLS[type] || null
}
