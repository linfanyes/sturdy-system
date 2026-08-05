/**
 * AI 生成内容表种子数据脚本
 *
 * 向以下 5 张表插入示例数据（仅在表为空时插入，幂等）：
 *   - generated_papers        3 条示例试卷（语文/数学/英语）
 *   - generated_lesson_plans  3 条示例教案
 *   - generated_knowges       5 条示例知识点
 *   - paper_queries           3 条示例试卷查询
 *   - ai_settings             1 条默认 AI 设置（如不存在）
 *
 * 所有记录 teacherId='system'，标题前缀 "[示例数据]"。
 *
 * 运行：在 server/ 目录执行 `npx tsx src/scripts/seed-ai-tables.ts`
 *   或编译后 `node dist/scripts/seed-ai-tables.js`
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'
import { randomUUID } from 'node:crypto'

/* ===================== DB 配置 ===================== */
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gardener',
  charset: 'utf8mb4' as const,
  timezone: '+08:00',
}

/* ===================== 工具 ===================== */
function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

/** 生成 UUID（去横线，与 TypeORM uuid 一致） */
function uuid(): string {
  return randomUUID()
}

/* ===================== 示例数据 ===================== */

const SAMPLE_PAPERS = [
  {
    title: '[示例数据] 语文期中试卷',
    grade: '六年级',
    subject: '语文',
    prompt: '请生成一份六年级语文期中试卷，包含基础知识、阅读理解、作文三部分，满分100分。',
    content: JSON.stringify({
      title: '[示例数据] 六年级语文期中试卷',
      subject: '语文',
      grade: '六年级',
      totalScore: 100,
      sections: [
        {
          name: '一、基础知识（30分）',
          questions: [
            { type: '填空', question: '"随风潜入夜，润物细无声"出自唐代诗人____的《____》。', answer: '杜甫；春夜喜雨', score: 3 },
            { type: '选择', question: '下列词语中读音完全正确的一项是（  ）。A. 倔强(jué jiàng) B. 憎恶(zēng è) C. 模仿(mó fǎng) D. 包庇(bāo bì)', answer: 'B', score: 3 },
            { type: '改错', question: '修改病句：通过这次活动，使我受到了很大的教育。', answer: '删去"通过"或"使"', score: 3 },
          ],
        },
        {
          name: '二、阅读理解（30分）',
          questions: [
            { type: '阅读', question: '阅读《背影》选段，回答问题。文中父亲买橘子的背影为什么让作者流泪？', answer: '体现了父亲深沉的爱与作者对父亲的感恩之情。', score: 15 },
          ],
        },
        {
          name: '三、作文（40分）',
          questions: [
            { type: '作文', question: '请以"那一刻，我长大了"为题，写一篇不少于400字的记叙文。', answer: '略', score: 40 },
          ],
        },
      ],
    }),
  },
  {
    title: '[示例数据] 数学期中试卷',
    grade: '六年级',
    subject: '数学',
    prompt: '请生成一份六年级数学期中试卷，包含填空、选择、计算、应用题四部分，满分100分。',
    content: JSON.stringify({
      title: '[示例数据] 六年级数学期中试卷',
      subject: '数学',
      grade: '六年级',
      totalScore: 100,
      sections: [
        {
          name: '一、填空题（20分）',
          questions: [
            { type: '填空', question: '一个圆的半径是3cm，它的面积是____cm²（π取3.14）。', answer: '28.26', score: 4 },
            { type: '填空', question: '把0.75化成分数是____，化成百分数是____%。', answer: '3/4；75', score: 4 },
          ],
        },
        {
          name: '二、选择题（20分）',
          questions: [
            { type: '选择', question: '一件商品打八折出售，比原价便宜了（  ）。A. 80% B. 20% C. 8% D. 2%', answer: 'B', score: 5 },
          ],
        },
        {
          name: '三、计算题（30分）',
          questions: [
            { type: '计算', question: '解方程：3x + 7 = 22', answer: 'x = 5', score: 6 },
            { type: '计算', question: '简便计算：25 × 44', answer: '25 × 4 × 11 = 1100', score: 6 },
          ],
        },
        {
          name: '四、应用题（30分）',
          questions: [
            { type: '应用', question: '一项工程，甲单独做10天完成，乙单独做15天完成。两人合做几天可以完成？', answer: '1/(1/10+1/15) = 6天', score: 10 },
          ],
        },
      ],
    }),
  },
  {
    title: '[示例数据] 英语期中试卷',
    grade: '六年级',
    subject: '英语',
    prompt: '请生成一份六年级英语期中试卷，包含听力、选择、阅读、写作四部分，满分100分。',
    content: JSON.stringify({
      title: '[示例数据] 六年级英语期中试卷',
      subject: '英语',
      grade: '六年级',
      totalScore: 100,
      sections: [
        {
          name: '一、Listening (20分)',
          questions: [
            { type: '听力', question: 'Listen and choose the correct picture.', answer: '略', score: 10 },
          ],
        },
        {
          name: '二、Multiple Choice (30分)',
          questions: [
            { type: '选择', question: 'She ____ to school every day. A. go B. goes C. going D. went', answer: 'B', score: 3 },
            { type: '选择', question: '— ____ is your birthday? — In May. A. What B. When C. Where D. Why', answer: 'B', score: 3 },
          ],
        },
        {
          name: '三、Reading (30分)',
          questions: [
            { type: '阅读', question: 'Read the passage and answer: What did Tom do last weekend?', answer: 'He visited his grandparents.', score: 15 },
          ],
        },
        {
          name: '四、Writing (20分)',
          questions: [
            { type: '写作', question: 'Write a short paragraph (50+ words) about "My Favourite Season".', answer: '略', score: 20 },
          ],
        },
      ],
    }),
  },
]

const SAMPLE_LESSON_PLANS = [
  {
    title: '[示例数据] 语文教案《桂林山水》',
    topic: '桂林山水',
    subject: '语文',
    grade: '六年级',
    prompt: '请为《桂林山水》一课编写六年级语文教案，包含教学目标、重难点、教学过程。',
    content: JSON.stringify({
      title: '[示例数据] 《桂林山水》教学设计',
      subject: '语文',
      grade: '六年级',
      duration: '40分钟',
      objectives: [
        '认识并理解"观赏、波澜壮阔、峰峦雄伟"等词语。',
        '有感情地朗读课文，背诵全文。',
        '感受桂林山水的美，激发热爱祖国山河的情感。',
      ],
      keyPoints: ['了解桂林山水的特点。', '学习作者运用对比、排比等修辞手法描写景物的方法。'],
      difficulties: ['理解"舟行碧波上，人在画中游"的含义。'],
      process: [
        { step: '导入', detail: '播放桂林山水风光视频，激发兴趣，导入新课。' },
        { step: '初读感知', detail: '自由朗读课文，思考：桂林的水和山各有什么特点？' },
        { step: '精读赏析', detail: '分析"静、清、绿"的水与"奇、秀、险"的山，体会修辞手法。' },
        { step: '拓展延伸', detail: '配乐朗诵，想象画面，谈感受。' },
        { step: '作业布置', detail: '背诵全文；仿照课文第二段写一处景物。' },
      ],
    }),
  },
  {
    title: '[示例数据] 数学教案《圆的面积》',
    topic: '圆的面积',
    subject: '数学',
    grade: '六年级',
    prompt: '请为《圆的面积》一课编写六年级数学教案，包含教学目标、重难点、教学过程。',
    content: JSON.stringify({
      title: '[示例数据] 《圆的面积》教学设计',
      subject: '数学',
      grade: '六年级',
      duration: '40分钟',
      objectives: [
        '理解圆面积公式的推导过程。',
        '掌握圆面积计算公式 S=πr²，能正确计算圆的面积。',
        '培养转化与极限的数学思想。',
      ],
      keyPoints: ['圆面积公式的推导。', '运用公式计算。'],
      difficulties: ['理解"化曲为直"的转化思想。'],
      process: [
        { step: '复习导入', detail: '回顾圆的周长公式，提出求圆面积的问题。' },
        { step: '探究新知', detail: '将圆等分为16份，拼成近似长方形，推导面积公式。' },
        { step: '巩固练习', detail: '已知半径求面积、已知直径求面积。' },
        { step: '拓展提升', detail: '求环形面积。' },
        { step: '课堂小结', detail: '总结公式推导过程与转化思想。' },
      ],
    }),
  },
  {
    title: '[示例数据] 英语教案《My Family》',
    topic: 'My Family',
    subject: '英语',
    grade: '六年级',
    prompt: '请为《My Family》一课编写六年级英语教案，包含教学目标、重难点、教学过程。',
    content: JSON.stringify({
      title: '[示例数据] 《My Family》教学设计',
      subject: '英语',
      grade: '六年级',
      duration: '40分钟',
      objectives: [
        '掌握核心句型：This is my... / He/She is a...',
        '能流利介绍自己的家庭成员。',
        '培养热爱家庭的情感。',
      ],
      keyPoints: ['核心词汇与句型。', '能够进行简单的家庭成员介绍。'],
      difficulties: ['正确使用 He/She 区分性别。'],
      process: [
        { step: 'Warm-up', detail: 'Sing "Finger Family" song to warm up.' },
        { step: 'Presentation', detail: 'Show family photo, introduce "father, mother, brother, sister, grandfather, grandmother".' },
        { step: 'Practice', detail: 'Pair work: "Who is this?" "This is my..."' },
        { step: 'Production', detail: 'Draw and talk about your family tree.' },
        { step: 'Homework', detail: 'Record a short video introducing your family.' },
      ],
    }),
  },
]

const SAMPLE_KNOWLEDGES = [
  {
    title: '[示例数据] 知识点：比喻修辞手法',
    grade: '六年级',
    subject: '语文',
    textbook: '人教版六年级语文上册',
    term: '上册',
    prompt: '请生成一个关于"比喻修辞手法"的知识点讲解。',
    content: JSON.stringify({
      title: '[示例数据] 比喻修辞手法',
      subject: '语文',
      grade: '六年级',
      definition: '比喻就是"打比方"，用一种事物来比方另一种事物。通常由本体（被比喻的事物）、喻体（用来比方的事物）和比喻词（如"像、仿佛、犹如"）组成。',
      types: [
        { name: '明喻', example: '弯弯的月亮像小船。' },
        { name: '暗喻', example: '老师是辛勤的园丁。' },
        { name: '借喻', example: '天上挂着一轮玉盘。（"玉盘"喻"月亮"）' },
      ],
      keyPoint: '本体和喻体必须是不同类的事物，且必须有相似之处。',
      exercises: [
        { question: '"蒲公英像一团的雪"是哪种比喻？', answer: '明喻' },
        { question: '判断："他是活字典"是暗喻。', answer: '正确' },
      ],
    }),
  },
  {
    title: '[示例数据] 知识点：圆的周长',
    grade: '六年级',
    subject: '数学',
    textbook: '人教版六年级数学上册',
    term: '上册',
    prompt: '请生成一个关于"圆的周长"的知识点讲解。',
    content: JSON.stringify({
      title: '[示例数据] 圆的周长',
      subject: '数学',
      grade: '六年级',
      definition: '圆的周长 C = πd = 2πr，其中 d 为直径，r 为半径，π（圆周率）≈3.14159。',
      keyPoint: '任意一个圆的周长与它的直径的比值是一个固定的数，叫作圆周率，用π表示。',
      examples: [
        { question: '已知圆半径 r=5cm，求周长。', solution: 'C=2×3.14×5=31.4cm' },
        { question: '已知圆直径 d=10cm，求周长。', solution: 'C=3.14×10=31.4cm' },
      ],
      tips: 'π是一个无限不循环小数，计算中一般取3.14。',
    }),
  },
  {
    title: '[示例数据] 知识点：一般现在时',
    grade: '六年级',
    subject: '英语',
    textbook: '人教版PEP六年级英语',
    term: '上册',
    prompt: '请生成一个关于"一般现在时"的英语知识点讲解。',
    content: JSON.stringify({
      title: '[示例数据] Simple Present Tense (一般现在时)',
      subject: '英语',
      grade: '六年级',
      usage: '表示经常性或习惯性的动作，或客观真理。常与 always, usually, often, sometimes, every day 等连用。',
      structure: [
        { form: '肯定句', example: 'I go to school every day.' },
        { form: '否定句', example: 'I do not (don\'t) go to school on Sundays.' },
        { form: '疑问句', example: 'Do you go to school every day?' },
      ],
      rules: '主语是第三人称单数（he/she/it）时，动词加 -s 或 -es。',
      examples: [
        { question: 'She ____ (like) reading books.', answer: 'likes' },
        { question: 'Tom ____ (go) to school by bus.', answer: 'goes' },
      ],
    }),
  },
  {
    title: '[示例数据] 知识点：分数加减法',
    grade: '六年级',
    subject: '数学',
    textbook: '人教版六年级数学上册',
    term: '上册',
    prompt: '请生成一个关于"分数加减法"的知识点讲解。',
    content: JSON.stringify({
      title: '[示例数据] 分数加减法',
      subject: '数学',
      grade: '六年级',
      definition: '同分母分数相加减，分母不变，分子相加减。异分母分数相加减，先通分，再按同分母分数加减法计算。',
      keyPoint: '计算结果能约分的要约分成最简分数。',
      examples: [
        { question: '1/4 + 1/4 = ?', solution: '1/4+1/4 = 2/4 = 1/2' },
        { question: '1/3 + 1/4 = ?', solution: '先通分：4/12 + 3/12 = 7/12' },
      ],
      tips: '通分时要找到最小公倍数作为公分母。',
    }),
  },
  {
    title: '[示例数据] 知识点：修改病句',
    grade: '六年级',
    subject: '语文',
    textbook: '人教版六年级语文下册',
    term: '下册',
    prompt: '请生成一个关于"修改病句"的知识点讲解。',
    content: JSON.stringify({
      title: '[示例数据] 修改病句',
      subject: '语文',
      grade: '六年级',
      definition: '修改病句就是找出句子中的语病并加以改正。常见病句类型有：成分残缺、搭配不当、语序不当、重复啰嗦、前后矛盾等。',
      types: [
        { name: '成分残缺', example: '通过这次活动，使我受到了教育。', fix: '删去"通过"或"使"，使句子有主语。' },
        { name: '搭配不当', example: '他的写作水平有了很大的改善。', fix: '"水平"应与"提高"搭配，改为"有了很大的提高"。' },
        { name: '重复啰嗦', example: '我忍不住不禁笑了起来。', fix: '"忍不住"和"不禁"重复，删去其一。' },
        { name: '前后矛盾', example: '在半路上，我遇到了张老师。', fix: '没有明确起点不能用"半路上"，改为"在路上"。' },
      ],
      steps: '一读（读懂原句）→ 二找（找出病因）→ 三改（对症修改）→ 四查（检查是否通顺）。',
    }),
  },
]

const SAMPLE_PAPER_QUERIES = [
  {
    keyword: '桂林山水',
    title: '[示例数据] 2025年六年级语文《桂林山水》阅读理解专题',
    source: '人教版同步练习',
    year: '2025',
    abstract: '本文档精选了《桂林山水》课文相关阅读理解题，涵盖词语理解、段落分析、修辞手法赏析等题型。',
    content: JSON.stringify({
      title: '[示例数据] 六年级语文《桂林山水》阅读理解专题',
      year: '2025',
      source: '人教版同步练习',
      questions: [
        { type: '简答', question: '桂林的山有什么特点？', answer: '奇、秀、险。', score: 5 },
        { type: '简答', question: '漓江的水有什么特点？', answer: '静、清、绿。', score: 5 },
        { type: '赏析', question: '作者是如何运用对比手法来突出桂林山水特点的？', answer: '将桂林山水与波澜壮阔的大海、水平如镜的西湖对比，突出其独特之美。', score: 10 },
      ],
    }),
  },
  {
    keyword: '圆的面积',
    title: '[示例数据] 2025年六年级数学圆的面积专题训练',
    source: '名校期末汇编',
    year: '2025',
    abstract: '本文档包含圆的面积公式推导及计算题，涵盖已知半径、直径、周长求面积等多种题型。',
    content: JSON.stringify({
      title: '[示例数据] 六年级数学圆的面积专题训练',
      year: '2025',
      source: '名校期末汇编',
      questions: [
        { type: '填空', question: '圆的面积公式 S=____。', answer: 'πr²', score: 5 },
        { type: '计算', question: '已知圆半径 r=4cm，求面积（π取3.14）。', answer: 'S=3.14×4²=50.24cm²', score: 10 },
        { type: '应用', question: '一个圆形花坛直径为10米，求花坛的面积。', answer: 'r=5m，S=3.14×5²=78.5m²', score: 10 },
      ],
    }),
  },
  {
    keyword: '一般现在时',
    title: '[示例数据] 2025年六年级英语一般现在时专项练习',
    source: '人教版PEP配套',
    year: '2025',
    abstract: '本文档包含一般现在时的句型转换、动词变型、阅读理解等练习题。',
    content: JSON.stringify({
      title: '[示例数据] 六年级英语一般现在时专项练习',
      year: '2025',
      source: '人教版PEP配套',
      questions: [
        { type: '填空', question: 'He ____ (play) football every Sunday.', answer: 'plays', score: 5 },
        { type: '改写', question: 'I go to school by bus.（改为否定句）', answer: 'I don\'t go to school by bus.', score: 5 },
        { type: '选择', question: 'She ____ TV now. A. watch B. watches C. is watching D. watched', answer: 'C', score: 5 },
      ],
    }),
  },
]

/* ===================== 主流程 ===================== */
async function main() {
  const conn = await mysql.createConnection(dbConfig)
  console.log('✅ 数据库连接成功')

  try {
    // ---- generated_papers ----
    {
      const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM generated_papers')
      const count = (rows as any)[0].cnt
      if (count > 0) {
        console.log(`⏭  generated_papers 已有 ${count} 条数据，跳过`)
      } else {
        for (const item of SAMPLE_PAPERS) {
          await conn.execute(
            `INSERT INTO generated_papers (id, teacherId, title, grade, subject, prompt, content, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid(), 'system', item.title, item.grade, item.subject, item.prompt, item.content, now(), now()],
          )
        }
        console.log(`✅  generated_papers 插入 ${SAMPLE_PAPERS.length} 条示例试卷`)
      }
    }

    // ---- generated_lesson_plans ----
    {
      const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM generated_lesson_plans')
      const count = (rows as any)[0].cnt
      if (count > 0) {
        console.log(`⏭  generated_lesson_plans 已有 ${count} 条数据，跳过`)
      } else {
        for (const item of SAMPLE_LESSON_PLANS) {
          await conn.execute(
            `INSERT INTO generated_lesson_plans (id, teacherId, title, topic, subject, grade, prompt, content, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid(), 'system', item.title, item.topic, item.subject, item.grade, item.prompt, item.content, now(), now()],
          )
        }
        console.log(`✅  generated_lesson_plans 插入 ${SAMPLE_LESSON_PLANS.length} 条示例教案`)
      }
    }

    // ---- generated_knowledges ----
    {
      const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM generated_knowledges')
      const count = (rows as any)[0].cnt
      if (count > 0) {
        console.log(`⏭  generated_knowledges 已有 ${count} 条数据，跳过`)
      } else {
        for (const item of SAMPLE_KNOWLEDGES) {
          await conn.execute(
            `INSERT INTO generated_knowledges (id, teacherId, title, grade, subject, textbook, term, prompt, content, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid(), 'system', item.title, item.grade, item.subject, item.textbook, item.term, item.prompt, item.content, now(), now()],
          )
        }
        console.log(`✅  generated_knowledges 插入 ${SAMPLE_KNOWLEDGES.length} 条示例知识点`)
      }
    }

    // ---- paper_queries ----
    {
      const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM paper_queries')
      const count = (rows as any)[0].cnt
      if (count > 0) {
        console.log(`⏭  paper_queries 已有 ${count} 条数据，跳过`)
      } else {
        for (const item of SAMPLE_PAPER_QUERIES) {
          await conn.execute(
            `INSERT INTO paper_queries (id, teacherId, keyword, title, source, year, abstract, content, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid(), 'system', item.keyword, item.title, item.source, item.year, item.abstract, item.content, now(), now()],
          )
        }
        console.log(`✅  paper_queries 插入 ${SAMPLE_PAPER_QUERIES.length} 条示例试卷查询`)
      }
    }

    // ---- ai_settings ----
    {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM ai_settings WHERE ownerId = 'system'`,
      )
      const count = (rows as any)[0].cnt
      if (count > 0) {
        console.log(`⏭  ai_settings 已有 system 配置，跳过`)
      } else {
        await conn.execute(
          `INSERT INTO ai_settings
             (id, teacherId, ownerType, ownerId, providerCode, baseUrl, apiKey,
              textModel, visionModel, imageModel, videoModel, temperature, aiName,
              systemPrompt, resourceModels, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuid(),
            'system',
            'teacher',
            'system',
            'ali-qwen',
            process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            '', // apiKey 为空，仅占位
            process.env.AI_TEXT_MODEL || 'qwen-plus',
            process.env.AI_VISION_MODEL || 'qwen-vl-plus',
            '',
            '',
            parseFloat(process.env.AI_TEMPERATURE || '0.7'),
            process.env.AI_NAME || '小林子',
            process.env.AI_SYSTEM_PROMPT || '你是一位耐心、专业的中国中小学班主任助手。',
            JSON.stringify({}),
            now(),
            now(),
          ],
        )
        console.log('✅  ai_settings 插入 1 条默认 AI 配置')
      }
    }

    console.log('\n✅ AI 内容表种子数据生成完成')
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('❌ 种子数据生成失败:', err?.message || err)
  if (err?.stack) console.error(err.stack)
  process.exit(1)
})
