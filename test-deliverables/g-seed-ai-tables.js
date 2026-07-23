/**
 * g-seed-ai-tables.js
 * 为 6 张仍为空的业务表补齐演示数据（P1-A）：
 *   - generated_papers       (AI 出卷)
 *   - generated_lesson_plans (AI 教案)
 *   - generated_knowledges   (AI 知识点)
 *   - paper_queries          (卷宗检索结果)
 *   - ai_settings            (教师 AI 设置)
 *   - class_duty_configs     (值日排班配置)
 *
 * 幂等：先按真实 teacher/class ID 清空再插入，可重复执行。
 * 运行：cd server && NODE_PATH=./node_modules node ../test-deliverables/g-seed-ai-tables.js
 */
const mysql = require('mysql2/promise')

const CFG = { host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test' }
const J = (o) => JSON.stringify(o)

async function main() {
  const conn = await mysql.createConnection(CFG)
  try {
    // 取真实教师与班级，保证租户隔离一致
    // 业务表的 tenant 键 teacherId 即 users.id（登录账号），故从 users 表取教师
    // 排除 teacher_disabled（禁用示例账号），与既有 seed 脚本保持一致
    const [teachers] = await conn.execute(
      'SELECT id, name, username FROM users WHERE username LIKE "teacher%" AND username != "teacher_disabled" ORDER BY username'
    )
    const [classes] = await conn.execute(
      'SELECT id, teacherId, name FROM classes ORDER BY name'
    )
    if (!teachers.length) throw new Error('未找到 teacher 数据，请先跑 a-test-seed-data.js')
    const tIds = teachers.map((t) => t.id)
    // 清理范围包含所有 teacher% 账号（含禁用示例），保证反复执行不产生重复行
    const [allTeachers] = await conn.execute(
      'SELECT id FROM users WHERE username LIKE "teacher%"'
    )
    const cleanIds = allTeachers.map((t) => t.id)
    const tWang = teachers[0]
    const tLi = teachers[1] || teachers[0]
    const classA = classes.find((c) => c.teacherId === tWang.id) || classes[0]
    const classB = classes.find((c) => c.teacherId === (tLi && tLi.id)) || classes[1] || classes[0]
    const clsIds = classes.map((c) => c.id)

    console.log(`教师: ${teachers.length} 人 | 班级: ${classes.length} 个`)
    console.log(`主教师: ${tWang.username}(${tWang.name}) | 次教师: ${tLi.username}(${tLi.name})`)

    // ---- 幂等清理（覆盖全部 teacher% 账号，含禁用示例）----
    // 注意：mysql2 对 IN(?) 传数组有时不展开，故显式拼接占位符，确保删除生效
    const ph = (arr) => arr.map(() => '?').join(',')
    await conn.execute(`DELETE FROM generated_papers WHERE teacherId IN (${ph(cleanIds)})`, cleanIds)
    await conn.execute(`DELETE FROM generated_lesson_plans WHERE teacherId IN (${ph(cleanIds)})`, cleanIds)
    await conn.execute(`DELETE FROM generated_knowledges WHERE teacherId IN (${ph(cleanIds)})`, cleanIds)
    await conn.execute(`DELETE FROM paper_queries WHERE teacherId IN (${ph(cleanIds)})`, cleanIds)
    await conn.execute(`DELETE FROM ai_settings WHERE teacherId IN (${ph(cleanIds)})`, cleanIds)
    await conn.execute(`DELETE FROM class_duty_configs WHERE classId IN (${ph(clsIds)})`, clsIds)

    let n = 0

    // ---- generated_papers (AI 出卷) ----
    const papers = [
      {
        t: tWang, grade: '三年级', subject: '数学',
        title: '三年级数学下册第三单元测试卷',
        prompt: '生成一份三年级数学下册“两位数乘除法”单元测试，含填空、选择、应用题，难度中等。',
        content:
          '# 三年级数学下册 第三单元测试卷\n\n## 一、填空题（每空2分，共20分）\n1. 25 × 4 = ____\n2. 360 ÷ 6 = ____\n\n## 二、选择题\n1. 下列各数中，能被3整除的是（ ）\nA. 124  B. 135  C. 142\n\n## 三、应用题\n小明买3盒彩笔，每盒12元，付50元应找回____元。',
      },
      {
        t: tWang, grade: '三年级', subject: '语文',
        title: '三年级语文阅读理解训练卷',
        prompt: '出一份三年级语文阅读理解，主题“春天的公园”，3道题，附参考答案。',
        content:
          '# 阅读理解：春天的公园\n\n春天的公园里，柳树抽出嫩绿的枝条……\n\n1. 短文写了哪些景物？\n2. “嫩绿”是什么意思？\n3. 你喜欢春天吗？为什么？\n\n【参考答案】1. 柳树、花朵、小鸟……',
      },
      {
        t: tLi, grade: '四年级', subject: '英语',
        title: '四年级英语 Unit 3 词汇闯关卷',
        prompt: '生成四年级英语 Unit 3 词汇选择题10道，含听力原文。',
        content:
          '# Unit 3 Vocabulary Quiz\n1. A. weather  B. water  C. windy\n2. A. cloudy  B. clothes  C. class\n\n【Key】1.A 2.A',
      },
    ]
    for (const p of papers) {
      await conn.execute(
        'INSERT INTO generated_papers (id, teacherId, title, grade, subject, prompt, content) VALUES (UUID(),?,?,?,?,?,?)',
        [p.t.id, p.title, p.grade, p.subject, p.prompt, p.content]
      )
      n++
    }

    // ---- generated_lesson_plans (AI 教案) ----
    const plans = [
      {
        t: tWang, subject: '数学', grade: '三年级', topic: '认识分数',
        title: '三年级数学《认识分数》教学设计',
        prompt: '写一份三年级《认识分数》教案，含教学目标、重难点、教学过程、板书设计。',
        content:
          '# 《认识分数》教学设计\n\n## 教学目标\n1. 理解几分之一的含义。\n2. 会用分数表示图形的一部分。\n\n## 教学重难点\n重点：分数的读写；难点：分数的意义。\n\n## 教学过程\n一、情境导入（分披萨）\n二、探究新知\n三、巩固练习\n\n## 板书设计\n1/2  1/4  1/3',
      },
      {
        t: tWang, subject: '语文', grade: '三年级', topic: '荷花',
        title: '三年级语文《荷花》教案',
        prompt: '《荷花》第二课时教案，侧重朗读指导与优美句式积累。',
        content:
          '# 《荷花》第二课时\n\n## 朗读指导\n“挨挨挤挤”“饱胀”重读。\n\n## 句式积累\n“有的……有的……有的……”仿写。',
      },
      {
        t: tLi, subject: '英语', grade: '四年级', topic: 'My school',
        title: '四年级英语《My school》教案',
        prompt: '写一份关于学校场所的会话教学教案。',
        content:
          '# My school\n\nTarget: library, playground, classroom\nDrill: Where is the ...? It is on the ... floor.',
      },
    ]
    for (const p of plans) {
      await conn.execute(
        'INSERT INTO generated_lesson_plans (id, teacherId, title, topic, subject, grade, prompt, content) VALUES (UUID(),?,?,?,?,?,?,?)',
        [p.t.id, p.title, p.topic, p.subject, p.grade, p.prompt, p.content]
      )
      n++
    }

    // ---- generated_knowledges (AI 知识点) ----
    const knows = [
      {
        t: tWang, grade: '三年级', subject: '数学', textbook: '人教版', term: '下',
        title: '面积与周长的区别',
        prompt: '讲清“面积”与“周长”的概念区别，配生活例子。',
        content:
          '# 面积 vs 周长\n- 周长：图形一周的长度（单位：cm、m）。\n- 面积：图形表面的大小（单位：cm²、m²）。\n例：给相框包边用周长，铺桌布用面积。',
      },
      {
        t: tWang, grade: '三年级', subject: '语文', textbook: '部编版', term: '下',
        title: '如何概括段落大意',
        prompt: '教学生概括段落大意的三种方法。',
        content:
          '# 概括段落大意\n1. 找中心句。\n2. 合并层意。\n3. 抓关键词串联。',
      },
      {
        t: tLi, grade: '四年级', subject: '英语', textbook: '外研社', term: '上',
        title: '一般过去时用法',
        prompt: '总结一般过去时结构及常见时间词。',
        content:
          '# Past Simple\nStructure: subject + verb-ed\nTime: yesterday, last week\nIrregular: go→went, eat→ate',
      },
    ]
    for (const k of knows) {
      await conn.execute(
        'INSERT INTO generated_knowledges (id, teacherId, title, grade, subject, textbook, term, prompt, content) VALUES (UUID(),?,?,?,?,?,?,?,?)',
        [k.t.id, k.title, k.grade, k.subject, k.textbook, k.term, k.prompt, k.content]
      )
      n++
    }

    // ---- paper_queries (卷宗检索结果，teacher 级) ----
    const queries = [
      {
        t: tWang, keyword: '分数应用题', title: '小学分数应用题经典题型汇编',
        source: '教研文库', year: '2024',
        abstract: '汇总小升初分数应用题 20 例，含工程、行程、浓度问题。',
        content: '1. 工程问题：甲独做6天，乙独做4天，合作几天完成？\n2. 浓度问题：300g 盐水含盐15%，加水后变10%……',
      },
      {
        t: tWang, keyword: '阅读理解策略', title: '中年级阅读理解的四种提问策略',
        source: '语文教学', year: '2023',
        abstract: '提取信息、推理、评价、联结四类提问设计。',
        content: '一、提取信息题；二、推理性题；三、评价性题；四、联结生活题。',
      },
      {
        t: tLi, keyword: 'phonics', title: '自然拼读 CVC 词卡片',
        source: 'English Teaching', year: '2025',
        abstract: '常见 CVC 组合练习卡片设计。',
        content: 'cat / map / pen / dog / sun — 拼读与书写练习。',
      },
      {
        t: tLi, keyword: '课堂管理', title: '小组合作学习的分组策略',
        source: '班主任之友', year: '2024',
        abstract: '异质分组、角色分工与评价体系。',
        content: '异质分组原则；组长/记录/发言角色；过程+结果双评价。',
      },
    ]
    for (const q of queries) {
      await conn.execute(
        'INSERT INTO paper_queries (id, teacherId, keyword, title, source, year, abstract, content) VALUES (UUID(),?,?,?,?,?,?,?)',
        [q.t.id, q.keyword, q.title, q.source, q.year, q.abstract, q.content]
      )
      n++
    }

    // ---- ai_settings (每位教师一行) ----
    for (const t of teachers) {
      await conn.execute(
        `INSERT INTO ai_settings
          (id, teacherId, baseUrl, apiKey, textModel, visionModel, imageModel, videoModel, temperature, aiName, systemPrompt, resourceModels)
         VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?)`,
        [
          t.id,
          'https://api.openai.com/v1',
          'sk-demo-encrypted-***', // 演示占位，绝不真实密钥
          'gpt-4o-mini',
          'gpt-4o',
          'dall-e-3',
          'none',
          0.7,
          '小林子',
          '你是一位耐心、专业的小学教师助手，回答要简洁、可操作。',
          J({ chat: 'gpt-4o-mini', 'exam-analysis': 'gpt-4o' }),
        ]
      )
      n++
    }

    // ---- class_duty_configs (每班一行) ----
    const dutyDefs = [
      { c: classA, duties: ['擦黑板', '扫地', '倒垃圾', '摆桌椅', '关灯'], per: 5 },
      { c: classB, duties: ['擦黑板', '扫地', '倒垃圾', '浇花'], per: 4 },
    ]
    for (const d of dutyDefs) {
      if (!d.c) continue
      // 用班级学生名构造 assignments
      const [stus] = await conn.execute('SELECT name FROM students WHERE classId = ? ORDER BY seatNo LIMIT 10', [d.c.id])
      const names = stus.map((s) => s.name)
      const assignments = {}
      d.duties.forEach((duty, i) => {
        assignments[duty] = names.filter((_, idx) => idx % d.duties.length === i).slice(0, 2)
      })
      await conn.execute(
        'INSERT INTO class_duty_configs (id, teacherId, classId, duties, assignments) VALUES (UUID(),?,?,?,?)',
        [d.c.teacherId, d.c.id, J(d.duties), J(assignments)]
      )
      n++
    }

    console.log(`\n✓ 插入完成，共 ${n} 行`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('SEED ERROR:', e.message)
  process.exit(1)
})
