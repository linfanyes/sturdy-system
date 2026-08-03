import { readFileSync, writeFileSync } from 'node:fs'

const root = 'D:/workspace/my-prj/tercher-work/work-system'
const pages = JSON.parse(readFileSync(root + '/scripts/mini-pages.json', 'utf8'))
const tok = JSON.parse(readFileSync(root + '/scripts/mini-test-tokens.json', 'utf8'))

const PKG_CN = {
  main: '主包（工作台/班级/学生/工具箱/设置）',
  'pages/games': '分包 games（课堂小游戏）',
  'pages/tools': '分包 tools（教学工具）',
  'pages/ai': '分包 ai（AI 能力）',
}

// 功能用例目录（覆盖全功能全按钮的后端契约 + 关键交互）
const CATALOG = [
  ['A. 认证与权限', [
    ['TC-A01', '微信/统一登录（超管）', 'F/I', 'P0', 'unified-login(admin) → role=super，返回 JWT'],
    ['TC-A02', '统一登录（校管）', 'F/I', 'P0', 'unified-login(sa) → role=school_admin'],
    ['TC-A03', '统一登录（教师）', 'F/I', 'P0', 'unified-login(teacher) → role=teacher'],
    ['TC-A04', '家长登录', 'F/I', 'P0', 'parent-auth/login(学号+123456) → role=parent'],
    ['TC-A05', '错误密码 → 401', 'X', 'P0', 'unified-login 错误密码返回 401'],
    ['TC-A06', '空参数 → 400', 'B', 'P1', 'unified-login 空 body 返回 400'],
    ['TC-A07', '无 token 访问 → 401', 'X', 'P0', '未带 Bearer 访问 /classes → 401'],
    ['TC-A08', '失效/伪造 token → 401', 'X', 'P0', '无效 JWT → 401，前端跳登录'],
    ['TC-A09', '五角色权限矩阵', 'I', 'P0', '教师/校管越权超管接口 401/403；教师越权校管接口 401/403；家长接口仅家长可访问'],
  ]],
  ['B. 核心业务（班级/学生/考试/成绩/考勤）', [
    ['TC-B01', '班级管理闭环', 'F', 'P0', '校管/教师 新建→列表→编辑→删除 班级'],
    ['TC-B02', '学生管理闭环', 'F', 'P0', '新增→列表→编辑→删除 学生（含纯数字学号）'],
    ['TC-B03', '考试自动建成绩', 'F', 'P1', '新建考试（勾选科目）→ 自动生成空成绩记录'],
    ['TC-B04', '成绩合并导入', 'F', 'P1', 'POST /grades/merge 导入分数，幂等'],
    ['TC-B05', '成绩录入与统计', 'F', 'P1', '录入成绩→排名/均分/及格率正确'],
    ['TC-B06', '考勤标记', 'F', 'P1', '出勤/迟到/请假/旷课切换→保存，顶部统计刷新'],
    ['TC-B07', '班级看板', 'F', 'P1', 'GET /classes/:id/dashboard 返回聚合数据'],
    ['TC-B08', '家长登录授权', 'F', 'P1', '教师 toggle-parent-login → 默认密码 123456，自动建 Parent 记录'],
  ]],
  ['C. 教师端通用 CRUD（32 模块）', [
    ['TC-C01~C32', '32 个教师 CRUD 模块全覆盖', 'F/I', 'P1', 'notes/todos/picker-history/award-*/duty-rosters/teaching-calendar/generated/*/reward-records/score-records/group-scores/checkins/reading-logs/home-visits/parent-contacts/notice-templates/class-*/seat-layouts/growth-entries/behavior-records/attendances/homework/resources/schedules/notices/semesters 均完成 创建/列表/读取/更新/删除 闭环'],
  ]],
  ['D. 超管与校管', [
    ['TC-D01', '超管-学校/校管/教师/审计', 'I', 'P0', '/admin/schools|school-admins|teachers|audit-logs 仅超管可访问'],
    ['TC-D02', '超管-创建/更新校管', 'F/I', 'P1', 'POST/PATCH /admin/school-admins'],
    ['TC-D03', '超管-AI 服务商写', 'F/I', 'P1', 'POST/PATCH /ai-providers（教师写被拒）'],
    ['TC-D04', '校管-数据看板/教师/班级', 'F/I', 'P1', '/school-admin/dashboard|teachers|classes 仅校管'],
    ['TC-D05', '校管-创建/更新教师', 'F/I', 'P1', 'POST/PATCH /school-admin/teachers'],
  ]],
  ['E. 家长端', [
    ['TC-E01', '家长-个人与通知', 'F', 'P1', '/parent-auth/me|notices 返回 200'],
    ['TC-E02', '家长-考试/作业/考勤', 'F', 'P1', '/parent-auth/exams|homework|attendance 返回 200'],
    ['TC-E03', '家长-课表/沟通', 'F', 'P1', '/parent-auth/schedule|communications 返回 200'],
    ['TC-E04', '家长-越权防护', 'X', 'P1', '教师访问 /parent-auth/me → 401/403'],
  ]],
  ['F. AI 能力（ai 分包 6 页 / 11 接口）', [
    ['TC-F01', 'AI 对话/解析', 'F/I', 'P1', '/ai/chat|parse|chat-sync 调用（未配置密钥应优雅返回，非 500）'],
    ['TC-F02', 'AI 考试分析/学情诊断', 'F/I', 'P1', '/ai/analyze-exam|diagnose 调用 + 越权隔离'],
    ['TC-F03', 'AI 生图/语音/识别', 'F/I', 'P2', '/ai/gen-image|asr|ocr|gen-video|parse-file'],
    ['TC-F04', 'AI 配置读写', 'F/I', 'P1', 'GET/PUT /config/ai；POST /config/ai/models'],
  ]],
  ['G. 课堂小游戏 / 教学工具（纯客户端）', [
    ['TC-G01', 'games 分包 34 页', 'F', 'P2', '2048/数独/24点/井字棋/五子棋/消消乐/记忆翻牌等：页面可渲染、交互无白屏（H5 冒烟覆盖）'],
    ['TC-G02', 'tools 分包 15 页', 'F', 'P2', '教学工具页：页面可渲染、交互无白屏（H5 冒烟覆盖）'],
  ]],
  ['H. 边界与异常', [
    ['TC-H01', '空列表', 'B', 'P2', 'GET 空数据返回 [] 不报错'],
    ['TC-H02', '不存在 ID', 'B/X', 'P1', 'GET/DELETE 假 id → 404/400 不 500'],
    ['TC-H03', '分页超大 take', 'B', 'P2', 'take=9999/100000 被截断≤500 不溢出'],
    ['TC-H04', '缺字段创建', 'B', 'P1', 'POST 缺必填 → 400'],
    ['TC-H05', 'AI 未配置密钥', 'X', 'P1', '点 AI 功能 → 友好提示，不白屏'],
    ['TC-H06', '网络错误归一化', 'X', 'P1', '后端不可达 → 统一错误，toast，不白屏'],
  ]],
]

const lines = []
lines.push('# 园丁工作台 · 微信小程序 · 全量测试用例')
lines.push('')
lines.push('> 范围：全功能 / 全按钮 / 全页面。目标后端：微信云托管（公网）。')
lines.push('> 生成时间：' + new Date().toISOString().replace('T', ' ').slice(0, 19))
lines.push('')
lines.push('## 一、测试环境与五角色账号')
lines.push('')
lines.push('- **后端**：`https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api`（微信云托管，已开启）')
lines.push('- **测试学校**：`' + (tok.entities.schoolId || '') + '`（前缀 QA，测试数据均以 `qa_mp_` 前缀，执行后 teardown 清理）')
lines.push('')
lines.push('| 角色 | 账号 | 密码 | 说明 |')
lines.push('| --- | --- | --- | --- |')
lines.push('| 超管 super | admin | admin | 平台默认超管 |')
const sa = tok.roles.school_admin
lines.push(`| 校管 school_admin | ${sa.username} | ${sa.password} | 测试校管 |`)
const t1k = Object.keys(tok.roles).find((k) => k.startsWith('teacher_qa_teacher1_'))
const t1 = tok.roles[t1k]
lines.push(`| 教师 teacher | ${t1.username} | ${t1.password} | 班主任（已绑定班级） |`)
const t2k = Object.keys(tok.roles).find((k) => k.startsWith('teacher_qa_teacher2_'))
lines.push(`| 教师2 teacher | ${tok.roles[t2k].username} | ${tok.roles[t2k].password} | 任课教师 |`)
const p = tok.roles.parent
lines.push(`| 家长 parent | 学号 ${p.studentNo} | 123456 | 由教师授权家长登录生成 |`)
lines.push('')
lines.push('## 二、覆盖率基线（来自源码静态分析）')
lines.push('')
lines.push(`- **页面总数**：${pages.totalPages}（主包 ${pages.byPackage.main || 0} / games ${pages.byPackage['pages/games'] || 0} / tools ${pages.byPackage['pages/tools'] || 0} / ai ${pages.byPackage['pages/ai'] || 0}）`)
const sa2 = pages.staticAnalysis
lines.push(`- **按钮/事件**：静态扫描 ${sa2.vueFiles} 个 .vue 页面，命中 \`@click/@tap\` 处理器 **${sa2.totalClickTap}** 处`)
lines.push(`- **导航**：\`navigateTo/redirectTo/switchTab/reLaunch\` 等 **${sa2.totalNav}** 处`)
lines.push(`- **接口调用**：页面内 \`api/http\` 请求 **${sa2.totalApiCall}** 处`)
lines.push(`- **后端接口面**：239 个端点；其中 AI 11 个、家长 24 个、games/tools 0 个（纯客户端）`)
lines.push(`- **五角色**：super / school_admin / teacher / teacher2 / parent 均已开通并验证`)
lines.push('')
lines.push('## 三、全页面测试矩阵（' + pages.totalPages + ' 页）')
lines.push('')
lines.push('| # | 分包 | 页面路由 | 标题 | 归属角色 | 冒烟 |')
lines.push('| --- | --- | --- | --- | --- | --- |')
pages.pages.forEach((pg, i) => {
  const role = pg.pkg === 'pages/ai' ? 'teacher' : pg.pkg.startsWith('pages/') ? 'teacher' : 'teacher/校管/家长'
  lines.push(`| ${i + 1} | ${PKG_CN[pg.pkg] ? pg.pkg : pg.pkg} | ${pg.path} | ${pg.title || '—'} | ${role} | 待执行 |`)
})
lines.push('')
lines.push('> 说明：页面「冒烟」列由 `e2e/mini.smoke.mjs`（H5 编译 + wx.cloud 垫片）对云托管后端做无头全页面遍历填充；纯客户端 games/tools 由运行时渲染验证。')
lines.push('')
lines.push('## 四、全功能·全按钮 测试用例')
lines.push('')
for (const [group, cases] of CATALOG) {
  lines.push(`### ${group}`)
  lines.push('')
  lines.push('| 用例 | 名称 | 策略 | 优先级 | 预期 |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const [id, name, strat, pri, exp] of cases) {
    lines.push(`| ${id} | ${name} | ${strat} | ${pri} | ${exp} |`)
  }
  lines.push('')
}
lines.push('## 五、测试数据')
lines.push('')
lines.push('- 五角色账号见第一章；结构化测试数据见 `test-deliverables/mini-test-data.json`。')
lines.push('- 种子数据：1 学校 / 1 校管 / 2 教师 / 1 班级（一年级1班）/ 8 学生（纯数字学号）/ 1 家长（授权登录）。')
lines.push('- 边界数据：空列表、假 id、take=9999/100000、缺字段 body、未配置 AI 密钥。')
lines.push('')
lines.push('## 六、执行策略')
lines.push('')
lines.push('1. **API 套件（全功能/全按钮后端契约）**：`scripts/mini-api-test.mjs` 加载上述五角色 token，执行 11 个套件（认证/权限矩阵/32 教师 CRUD/学生/自定义路由/超管/校管/家长/AI/边界/公共），结果落 `mini-api-test-results.json`。')
lines.push('2. **页面冒烟（全页面）**：`e2e/mini.smoke.mjs` 将小程序编译为 H5，用 `wx.cloud` 垫片转发到云托管后端，puppeteer 无头遍历全部 160 页面，采集 pageerror/console。')
lines.push('3. **报告**：合并上述结果生成 `test-deliverables/09-小程序全量测试报告.md`。')

writeFileSync(root + '/test-deliverables/08-小程序全量测试用例.md', lines.join('\n'))
console.log('✅ 测试用例文档已生成: test-deliverables/08-小程序全量测试用例.md')
console.log('   页面矩阵行数:', pages.pages.length, ' 功能用例组:', CATALOG.length)
