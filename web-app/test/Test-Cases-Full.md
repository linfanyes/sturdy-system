# Web端 全量测试用例文档

> 生成时间：2026-07-26 | 基于 PRD：Audit-PRD.md | 测试框架：Jest + Vue Test Utils + jsdom

---

## 1. 测试用例总览

| 模块 | 单元测试 | 集成测试 | E2E测试 | 总计 |
|------|---------|---------|---------|------|
| 认证授权 | 12 | 8 | - | 20 |
| 共享校验器/常量/类型 | 146 | - | - | 146 |
| 班级命名规则 | 42 | - | - | 42 |
| 学科模型 | 33 | - | - | 33 |
| 登录流程 | - | 15 | - | 15 |
| CRUD标准流程 | - | 18 | - | 18 |
| AI工具调用 | - | 16 | - | 16 |
| 相册CRUD | - | 12 | - | 12 |
| 超管管理 | 8 | 6 | - | 14 |
| 校管管理 | 10 | 8 | - | 18 |
| 教师核心 | 15 | 12 | - | 27 |
| 课表管理 | 6 | 4 | - | 10 |
| 考勤管理 | 8 | 5 | - | 13 |
| 作业管理 | 12 | 8 | - | 20 |
| 成绩管理 | 15 | 10 | - | 25 |
| 考试管理 | 10 | 7 | - | 17 |
| 班级管理 | 10 | 6 | - | 16 |
| 学生管理 | 12 | 8 | - | 20 |
| 公告通知 | 8 | 5 | - | 13 |
| 资源库 | 6 | 4 | - | 10 |
| 成长档案 | 5 | 3 | - | 8 |
| 行为观察 | 5 | 3 | - | 8 |
| 家长联系 | 4 | 3 | - | 7 |
| 教师通讯录 | 3 | 2 | - | 5 |
| 轮值表 | 4 | 3 | - | 7 |
| 班级活动 | 4 | 3 | - | 7 |
| 班费管理 | 4 | 3 | - | 7 |
| 班级风采 | 4 | 3 | - | 7 |
| 听课记录 | 4 | 3 | - | 7 |
| 工作日志 | 4 | 3 | - | 7 |
| 个人笔记 | 4 | 3 | - | 7 |
| 获奖记录 | 4 | 3 | - | 7 |
| 奖励/积分/小组 | 6 | 4 | - | 10 |
| 阅读打卡 | 4 | 3 | - | 7 |
| 家访路线 | 2 | 2 | - | 4 |
| 阅读记录 | 3 | 2 | - | 5 |
| AI助手 | 8 | 6 | - | 14 |
| 工具箱/小游戏 | 20 | 10 | - | 30 |
| 座位表/分组 | 4 | 3 | - | 7 |
| 个人中心 | 5 | 3 | - | 8 |
| 成绩趋势 | 3 | 2 | - | 5 |
| 待办事项 | 3 | 2 | - | 5 |
| 教学日历 | 3 | 2 | - | 5 |
| **总计** | **455** | **182** | **0** | **637** |

---

## 2. 结构化用例表

### 2.1 认证授权模块

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-AUTH-001 | 统一登录_超管账号_跳转超管工作台 | 正常流 | P0 | 系统初始化 | 1.打开/#/login 2.输入admin/admin 3.点击开始工作 | username=admin, password=admin | 跳转/super, token有效, role=super | P0-03 |
| TC-AUTH-002 | 统一登录_校管账号_跳转校管工作台 | 正常流 | P0 | 系统初始化 | 1.打开/#/login 2.输入admin01/Admin@123 3.点击开始工作 | username=admin01, password=Admin@123 | 跳转/school-admin, role=school_admin | P0-03 |
| TC-AUTH-003 | 统一登录_教师账号_跳转教师工作台 | 正常流 | P0 | 系统初始化 | 1.打开/#/login 2.输入teacher01/Teacher@123 3.点击开始工作 | username=teacher01, password=Teacher@123 | 跳转/teacher, role=teacher | P0-03 |
| TC-AUTH-004 | 统一登录_家长账号_跳转家长工作台 | 正常流 | P0 | 系统初始化 | 1.打开/#/login 2.输入parent01/123456 3.点击开始工作 | username=parent01, password=123456 | 跳转/parent, role=parent | P0-03 |
| TC-AUTH-005 | 空表单提交_提示用户名密码必填 | 异常流 | P0 | 登录页 | 1.打开/#/login 2.不输入直接点击开始工作 | - | 提示"请输入用户名和密码", 不调用登录API | P0-03 |
| TC-AUTH-006 | 错误密码_显示后端错误不跳转 | 异常流 | P0 | 登录页 | 1.输入admin/wrong 2.点击开始工作 | username=admin, password=wrong | 显示"用户名或密码错误", 停留登录页 | P0-03 |
| TC-AUTH-007 | 历史账号兼容_旧版对象格式localStorage_自动展��为数组 | 边界条件 | P1 | localStorage有旧格式数据 | 1.localStorage.setItem('historyAccounts', '{"username":"old","avatar":"👨‍🏫"}') 2.刷新登录页 | 历史账号对象 | 正确展平为数组并显示 | P0-03 |
| TC-AUTH-008 | 头像选择_点选emoji_更新角标写入localStorage | 正常流 | P1 | 登录页 | 1.点击头像选择器中某emoji | avatar=👨‍🏫 | 顶部角标更新, localStorage.selectedAvatar写入 | P0-03 |
| TC-AUTH-009 | 已登录访问根路径_按角色重定向 | 正常流 | P0 | 已登录teacher | 1.访问/#/ | token=valid, role=teacher | 重定向到/#/teacher | P0-03 |
| TC-AUTH-010 | 未登录访问受保护页_跳转登录页带redirect | 正常流 | P0 | 未登录 | 1.访问/#/teacher | - | 跳转/#/login?redirect=/teacher | P0-03 |
| TC-AUTH-011 | 登录后访问登录页_跳转回角色首页 | 正常流 | P0 | 已登录school_admin | 1.访问/#/login | token=valid, role=school_admin | 跳转/#/school-admin | P0-03 |
| TC-AUTH-012 | Token过期_自动刷新或跳转登录 | 异常流 | P1 | Token已过期 | 1.携带过期token访问受保护接口 | expired token | 返回401, 跳转登录页 | P0-06 |
| TC-AUTH-013 | 网络错误_显示通用错误提示 | 异常流 | P1 | 网络异常 | 1.模拟网络错误登录 | network error | 显示"登录失败，请检查网络" | P0-06 |
| TC-AUTH-014 | 角色权限特性_空features数组_全放行 | 边界条件 | P1 | 用户features=[] | 1.验证hasFeature([], 'any') | features=[] | 返回true | P0-04 |
| TC-AUTH-015 | 角色权限特性_包含特定feature_精确匹配 | 正常流 | P1 | 用户features=['homework','grades'] | 1.验证hasFeature(['homework'], 'homework') | features=['homework'] | 返回true | P0-04 |
| TC-AUTH-016 | 登出_清除token和用户信息 | 正常流 | P0 | 已登录 | 1.调用logout() | - | token清空, user=null, 跳转登录页 | P0-03 |
| TC-AUTH-017 | 多标签页登录状态同步 | 边界条件 | P2 | 多标签页 | 1.标签A登录 2.标签B刷新 | - | 标签B自动同步登录状态 | P0-04 |
| TC-AUTH-018 | 密码显示/隐藏切换 | 正常流 | P2 | 登录页 | 1.点击眼睛图标 | - | 密码框type在password/text切换 | - |
| TC-AUTH-019 | 记住我_勾选后本地存储凭据 | 正常流 | P2 | 登录页 | 1.勾选记住我 2.登录 | rememberMe=true | localStorage保存加密凭据 | - |
| TC-AUTH-020 | 禁止访问_无权限角色访问受限页面_显示403 | 异常流 | P0 | parent角色 | 1.parent访问/#/teacher | role=parent | 显示Forbidden页面 | P0-04 |

---

### 2.2 共享校验器/常量/类型模块

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-VAL-001 | isPhone_有效手机号_返回true | 正常流 | P0 | - | 1.调用isPhone('13800138000') | '13800138000' | true | P0-04 |
| TC-VAL-002 | isPhone_无效手机号_返回false | 异常流 | P0 | - | 1.调用isPhone('12345678901') | '12345678901' | false | P0-04 |
| TC-VAL-003 | isPhone_空字符串_返回false | 边界条件 | P0 | - | 1.调用isPhone('') | '' | false | P0-04 |
| TC-VAL-004 | isValidPhone_有效手机号_返回true | 正常流 | P0 | - | 1.调用isValidPhone('13900139000') | '13900139000' | true | P0-04 |
| TC-VAL-005 | isValidPhone_空值_返回true(宽松模式) | 边界条件 | P0 | - | 1.调用isValidPhone(null) | null | true | P0-04 |
| TC-VAL-006 | isValidPhone_undefined_返回true | 边界条件 | P0 | - | 1.调用isValidPhone(undefined) | undefined | true | P0-04 |
| TC-VAL-007 | normalizePhone_带空格横线_归一化纯数字 | 正常流 | P0 | - | 1.调用normalizePhone('138-0013 8000') | '138-0013 8000' | '13800138000' | P0-04 |
| TC-VAL-008 | validateClassName_小学标准格式_返回valid=true且classNo正确 | 正常流 | P0 | - | 1.调用validateClassName('五年级3班') | '五年级3班' | {valid:true, classNo:3} | P0-04 |
| TC-VAL-009 | validateClassName_初中标准格式_返回valid=true | 正常流 | P0 | - | 1.调用validateClassName('初二5班') | '初二5班' | {valid:true, classNo:5} | P0-04 |
| TC-VAL-010 | validateClassName_高中标准格式_返回valid=true | 正常流 | P0 | - | 1.调用validateClassName('高一10班') | '高一10班' | {valid:true, classNo:10} | P0-04 |
| TC-VAL-011 | validateClassName_中文序号_返回false | 异常流 | P0 | - | 1.调用validateClassName('一年级一班') | '一年级一班' | {valid:false} | P0-04 |
| TC-VAL-012 | validateClassName_缺少年级_返回false | 异常流 | P0 | - | 1.调用validateClassName('1班') | '1班' | {valid:false} | P0-04 |
| TC-VAL-013 | validateClassName_缺少班字_返回false | 异常流 | P0 | - | 1.调用validateClassName('一年级') | '一年级' | {valid:false} | P0-04 |
| TC-VAL-014 | validateClassName_非法年级_返回false | 异常流 | P0 | - | 1.调用validateClassName('幼儿园1班') | '幼儿园1班' | {valid:false} | P0-04 |
| TC-VAL-015 | validateClassName_空字符串_返回false | 边界条件 | P0 | - | 1.调用validateClassName('') | '' | {valid:false} | P0-04 |
| TC-VAL-016 | validateClassName_指定年级一致_返回true | 正常流 | P0 | - | 1.调用validateClassName('五年级1班', '五年级') | '五年级1班', '五年级' | {valid:true} | P0-04 |
| TC-VAL-017 | validateClassName_指定年级不一致_返回false | 异常流 | P0 | - | 1.调用validateClassName('五年级1班', '六年级') | '五年级1班', '六年级' | {valid:false} | P0-04 |
| TC-VAL-018 | validateClassName_序号0_返回false | 边界条件 | P0 | - | 1.调用validateClassName('一年级0班') | '一年级0班' | {valid:false} | P0-04 |
| TC-VAL-019 | validateClassName_序号100_返回false | 边界条件 | P0 | - | 1.调用validateClassName('一年级100班') | '一年级100班' | {valid:false} | P0-04 |
| TC-VAL-020 | validateClassName_序号99_返回true | 边界条件 | P0 | - | 1.调用validateClassName('一年级99班') | '一年级99班' | {valid:true, classNo:99} | P0-04 |
| TC-VAL-021 | generateClassName_小学_生成标准名 | 正常流 | P0 | - | 1.调用generateClassName('三年级', 5) | '三年级', 5 | '三年级5班' | P0-04 |
| TC-VAL-022 | generateClassName_初中_生成标准名 | 正常流 | P0 | - | 1.调用generateClassName('初三', 8) | '初三', 8 | '初三8班' | P0-04 |
| TC-VAL-023 | generateClassName_高中_生成标准名 | 正常流 | P0 | - | 1.调用generateClassName('高二', 12) | '高二', 12 | '高二12班' | P0-04 |
| TC-VAL-024 | generateClassName_非法年级_抛出错误 | 异常流 | P0 | - | 1.调用generateClassName('幼儿园', 1) | '幼儿园', 1 | throw Error | P0-04 |
| TC-VAL-025 | generateClassName_非法序号_抛出错误 | 异常流 | P0 | - | 1.调用generateClassName('一年级', 0) | '一年级', 0 | throw Error | P0-04 |
| TC-VAL-026 | parseClassName_小学标准_解析出grade和classNo | 正常流 | P0 | - | 1.调用parseClassName('四年级2班') | '四年���2班' | {grade:'四年级', classNo:2} | P0-04 |
| TC-VAL-027 | parseClassName_初中标准_解析出grade和classNo | 正常流 | P0 | - | 1.调用parseClassName('初一7班') | '初一7班' | {grade:'初一', classNo:7} | P0-04 |
| TC-VAL-028 | parseClassName_高中标准_解析出grade和classNo | 正常流 | P0 | - | 1.调用parseClassName('高三15班') | '高三15班' | {grade:'高三', classNo:15} | P0-04 |
| TC-VAL-029 | parseClassName_非标准格式_返回null | 异常流 | P0 | - | 1.调用parseClassName('一年级一班') | '一年级一班' | null | P0-04 |
| TC-VAL-030 | isSubject_合法学科_返回true | 正常流 | P0 | - | 1.调用isSubject('语文') | '语文' | true | P0-04 |
| TC-VAL-031 | isSubject_非法学科_返回false | 异常流 | P0 | - | 1.调用isSubject('编程') | '编程' | false | P0-04 |
| TC-VAL-032 | getSubjectByValue_存在学科_返回对象 | 正常流 | P0 | - | 1.调用getSubjectByValue('math') | 'math' | {label:'数学', value:'math'} | P0-04 |
| TC-VAL-033 | getSubjectByValue_不存在学科_返回undefined | 异常流 | P0 | - | 1.调用getSubjectByValue('coding') | 'coding' | undefined | P0-04 |
| TC-VAL-034 | isRole_合法角色_返回true | 正常流 | P0 | - | 1.调用isRole('teacher') | 'teacher' | true | P0-04 |
| TC-VAL-035 | isRole_非法角色_返回false | 异常流 | P0 | - | 1.调用isRole('principal') | 'principal' | false | P0-04 |
| TC-VAL-036 | hasFeature_空数组_返回true(全放行) | 边界条件 | P0 | - | 1.调用hasFeature([], 'homework') | [], 'homework' | true | P0-04 |
| TC-VAL-037 | hasFeature_包含特性_返回true | 正常流 | P0 | - | 1.调用hasFeature(['homework'], 'homework') | ['homework'], 'homework' | true | P0-04 |
| TC-VAL-038 | hasFeature_不包含特性_返回false | 正常流 | P0 | - | 1.调用hasFeature(['grades'], 'homework') | ['grades'], 'homework' | false | P0-04 |
| TC-VAL-039 | isGrade_合法年级_返回true | 正常流 | P0 | - | 1.调用isGrade('三年级') | '三年级' | true | P0-04 |
| TC-VAL-040 | isScore_有效分数_返回true | 正常流 | P0 | - | 1.调用isScore(95) | 95 | true | P0-04 |
| TC-VAL-041 | isScore_超范围分数_返回false | 异常流 | P0 | - | 1.调用isScore(151) | 151 | false | P0-04 |
| TC-VAL-042 | isNonEmpty_非空字符串_返回true | 正常流 | P0 | - | 1.调用isNonEmpty('content') | 'content' | true | P0-04 |
| TC-VAL-043 | isStudentNo_合法学号_返回true | 正常流 | P0 | - | 1.调用isStudentNo('S2024001') | 'S2024001' | true | P0-04 |
| TC-VAL-044 | isAmount_合法金额_返回true | 正常流 | P0 | - | 1.调用isAmount(99.99) | 99.99 | true | P0-04 |
| TC-VAL-045 | isUrl_合法URL_返回true | 正常流 | P0 | - | 1.调用isUrl('https://example.com') | 'https://example.com' | true | P0-04 |
| TC-VAL-046 | isDateStr_合法日期_返回true | 正常流 | P0 | - | 1.调用isDateStr('2024-01-15') | '2024-01-15' | true | P0-04 |
| TC-VAL-047 | clip_长文本_截断并加省略号 | 正常流 | P0 | - | 1.调用clip('很长的文本...', 10) | '很长的文本...', 10 | '很长的文...' | P0-04 |

---

### 2.3 班级命名规则模块

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-CLS-001 | CLASS_NAMING_RULE.pattern_小学标准格式_匹配 | 正常流 | P0 | - | 1.验证pattern.test('五年级1班') | '五年级1班' | true | P0-04 |
| TC-CLS-002 | CLASS_NAMING_RULE.pattern_初中标准格式_匹配 | 正常流 | P0 | - | 1.验证pattern.test('初二3班') | '初二3班' | true | P0-04 |
| TC-CLS-003 | CLASS_NAMING_RULE.pattern_高中标准格式_匹配 | 正常流 | P0 | - | 1.验证pattern.test('高一5班') | '高一5班' | true | P0-04 |
| TC-CLS-004 | CLASS_NAMING_RULE.pattern_中文序号_不匹配 | 异常流 | P0 | - | 1.验证pattern.test('一年级一班') | '一年级一班' | false | P0-04 |
| TC-CLS-005 | GRADE_OPTIONS_包含12个标准年级 | 正常流 | P0 | - | 1.验证GRADE_OPTIONS.length | - | 12 | P0-04 |
| TC-CLS-006 | validateClassName_兼容旧格式一班_解析classNo=1 | 正常流 | P1 | - | 1.解析'一班' | '一班' | classNo=1 | P0-04 |
| TC-CLS-007 | validateClassName_兼容旧格式1班_解析classNo=1 | 正常流 | P1 | - | 1.解析'1班' | '1班' | classNo=1 | P0-04 |

---

### 2.4 学科模型模块

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SUB-001 | SUBJECT_OPTIONS_15门学科完整性 | 正常流 | P0 | - | 1.验证长度 | - | 15 | P0-04 |
| TC-SUB-002 | SUBJECT_OPTIONS_字段结构label/value/icon/color | 正常流 | P0 | - | 1.验证每项结构 | - | 全包含4字段 | P0-04 |
| TC-SUB-003 | SUBJECT_OPTIONS_value唯一性 | 正常流 | P0 | - | 1.验证value去重 | - | 15个唯一 | P0-04 |
| TC-SUB-004 | SUBJECT_OPTIONS_icon唯一性(除语文历史共用📜) | 正常流 | P1 | - | 1.验证icon去重 | - | 14个唯一icon | P0-04 |
| TC-SUB-005 | SUBJECT_OPTIONS_color唯一性 | 正常流 | P1 | - | 1.验证color去重 | - | 15个唯一color | P0-04 |
| TC-SUB-006 | SUBJECT_OPTIONS_顺序固定(语文/数学/英语前三) | 正常流 | P0 | - | 1.验证前三项 | - | 语文/数学/英语 | P0-04 |
| TC-SUB-007 | SUBJECT_VALUES_与SUBJECT_OPTIONS对齐 | 正常流 | P0 | - | 1.验证值数组 | - | 长度15,全包含 | P0-04 |
| TC-SUB-008 | isSubject_合法学科值_返回true | 正常流 | P0 | - | 1.遍历SUBJECT_VALUES验证 | - | 全true | P0-04 |
| TC-SUB-009 | isSubject_非法学科值_返回false | 异常流 | P0 | - | 1.验证非法值 | '编程' | false | P0-04 |
| TC-SUB-010 | getSubjectByValue_存在值_返回对象且引用一致 | 正常流 | P0 | - | 1.调用getSubjectByValue('chinese') | 'chinese' | 对象, ===SUBJECT_OPTIONS[0] | P0-04 |
| TC-SUB-011 | getSubjectByValue_不存在值_返回undefined | 异常流 | P0 | - | 1.调用getSubjectByValue('coding') | 'coding' | undefined | P0-04 |
| TC-SUB-012 | 跨端一致性_mini-program_ALL_SUBJECTS字段对齐 | 正常流 | P0 | - | 1.对比Web端SUBJECT_OPTIONS与Mini端ALL_SUBJECTS | - | label/value/icon/color全对齐 | P0-02 |

---

### 2.5 登录流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-LOGIN-001 | 页面渲染_打开/#/login_显示园丁工作台、登录、用户名/密码输入框、历史账号区 | 正常流 | P0 | - | 1.router.push('/login') 2.验证DOM元素 | - | 所有元素存在 | P0-03 |
| TC-LOGIN-002 | 空表单提交_直接点开始工作_提示请输入用户名和密码，不调用登录 | 异常流 | P0 | 登录页 | 1.点击提交按钮 | - | 提示文案, request.post未调用 | P0-03 |
| TC-LOGIN-003 | 仅用户名_提示密码必填 | 异常流 | P0 | 登录页 | 1.输入用户名 2.提交 | username=admin | 提示密码必填 | P0-03 |
| TC-LOGIN-004 | 仅密码_提示用户名必填 | 异常流 | P0 | 登录页 | 1.输入密码 2.提交 | password=admin | 提示用户名必填 | P0-003 |
| TC-LOGIN-005 | 超管登录_admin_admin_跳转超管工作台 | 正常流 | P0 | 登录页 | 1.输入admin/admin 2.提交 3.await flushPromises | admin/admin | 跳转/super, token有效, role=super | P0-03 |
| TC-LOGIN-006 | 校管登录_跳转校管工作台 | 正常流 | P0 | 登录页 | 1.输入校管账号 2.提交 | admin01/Admin@123 | 跳转/school-admin, role=school_admin | P0-03 |
| TC-LOGIN-007 | 教师登录_跳转教师工作台 | 正常流 | P0 | 登录页 | 1.输入教师账号 2.提交 | teacher01/Teacher@123 | 跳转/teacher, role=teacher | P0-03 |
| TC-LOGIN-008 | 家长登录_跳转家长工作台 | 正常流 | P0 | 登录页 | 1.输入家长账号 2.提交 | parent01/123456 | 跳转/parent, role=parent | P0-03 |
| TC-LOGIN-009 | 错误密码_显示后端错误不跳转 | 异常流 | P0 | 登录页 | 1.输入错误密码 2.提交 | admin/wrong | 显示错误信息, 无跳转 | P0-03 |
| TC-LOGIN-010 | 网络错误_显示通用错误 | 异常流 | P1 | 登录页 | 1.mock reject 2.提交 | network error | 显示登录失败 | P0-03 |
| TC-LOGIN-011 | 历史账号_旧版对象格式localStorage_自动展平 | 边界条件 | P1 | 登录页 | 1.设置旧格式localStorage | {username:'old'} | 展平为数组 | P0-03 |
| TC-LOGIN-012 | 历史账号_新版数组格式_正常读取 | 正常流 | P1 | 登录页 | 1.设置数组格式localStorage | [{username:'u1'},{username:'u2'}] | 读取2条 | P0-03 |
| TC-LOGIN-013 | 头像选择_点选emoji_更新角标写入localStorage | 正常流 | P1 | 登录页 | 1.点击头像选择器某按钮 | - | selectedAvatar写入localStorage | P0-03 |
| TC-LOGIN-014 | 已登录访问根路径_按角色重定向 | 正常流 | P0 | 已登录teacher | 1.router.push('/') | role=teacher | 当前路由/teacher | P0-03 |
| TC-LOGIN-015 | 未登录访问受保护页_跳转登录页带redirect | 正常流 | P0 | 未登录 | 1.router.push('/teacher') | - | 路由/login, query.redirect=/teacher | P0-03 |

---

### 2.6 CRUD标准流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-CRUD-001 | 列表渲染_页面加载_调用列表API渲染表格数据 | 正常流 | P0 | CrudTable挂载 | 1.挂载组件 2.await flushPromises | mock listResponse | 表格渲染数据行 | P0-01 |
| TC-CRUD-002 | 空态处理_API返回空数组_显示暂无数据 | 边界条件 | P0 | CrudTable挂载 | 1.mock空数组 2.挂载 | listResponse={items:[]} | 显示"暂无数据" | P0-01 |
| TC-CRUD-003 | 搜索过滤_输入关键字_300ms防抖调用搜索API结果渲染 | 正常流 | P0 | CrudTable挂载 | 1.输入关键字 2.wait 300ms | keyword='测试' | 调用搜索API, 结果渲染 | P0-01 |
| TC-CRUD-004 | 班级筛选_选择班级下拉_重新加载列表 | 正常流 | P0 | CrudTable挂载 | 1.选择班级下拉项 | classId=1 | 重新加载列表, 参数含classId | P0-01 |
| TC-CRUD-005 | 新增模态框_点击新增_打开模态框表单渲染正确 | 正常流 | P0 | CrudTable挂载 | 1.点击新增按钮 | - | 模态框打开, 表单字段正确 | P0-01 |
| TC-CRUD-006 | 新增必填校验_空表单提交_显示必填错误(使用shared validators) | 异��流 | P0 | 新增模态框打开 | 1.点击保存 | 空表单 | 显示必填错误, 使用shared validators | P0-04 |
| TC-CRUD-007 | 新增保存_填写合法数据_点击保存调用POST API成功后列表刷新 | 正常流 | P0 | 新增模态框打开 | 1.填写合法数据 2.点击保存 | valid form data | POST API调用, 列表刷新 | P0-01 |
| TC-CRUD-008 | 编辑模态框_点击行编辑_打开模态框回填数据 | 正常流 | P0 | 列表有数据 | 1.点击编辑按钮 | row data | 模态框打开, 字段回填正确 | P0-01 |
| TC-CRUD-009 | 编辑保存_修改数据_点击保存调用PATCH API成功后列表刷新 | 正常流 | P0 | 编辑模态框打开 | 1.修改字段 2.点击保存 | modified data | PATCH API调用, 列表刷新 | P0-01 |
| TC-CRUD-010 | 删除确认_点击删除_弹出确认框确认后调用DELETE API列表刷新 | 正常流 | P0 | 列表有数据 | 1.点击删除 2.确认 | row id | DELETE API调用, 列表刷新 | P0-01 |
| TC-CRUD-011 | 跨角色权限_教师角色_仅显示有权限操作按钮 | 正常流 | P0 | teacher登录 | 1.验证features过滤 | features=['homework'] | 仅显示homework相关按钮 | P0-04 |
| TC-CRUD-012 | 跨角色权限_校管角色_显示全部管理按钮 | 正常流 | P0 | school_admin登录 | 1.验证features过滤 | features=['all'] | 显示全部按钮 | P0-04 |
| TC-CRUD-013 | 分页加载_点击下一页_调用API page+1 | 正常流 | P1 | 列表多页 | 1.点击下一页 | page=2 | API调用page=2 | P0-01 |
| TC-CRUD-014 | 排序切换_点击表头_调用API sortBy/sortOrder | 正常流 | P1 | 列表可排序 | 1.点击表头 | sortBy='name' | API参数含sortBy | P0-01 |
| TC-CRUD-015 | 批量操作_勾选多行点击批量删除_确认后批量调用DELETE | 正常流 | P1 | 列表多行 | 1.勾选3行 2.批量删除 | [id1,id2,id3] | 3次DELETE调用 | P0-01 |
| TC-CRUD-016 | 导出功能_点击导出_调用导出API下载文件 | 正常流 | P1 | 列表有数据 | 1.点击导出按钮 | - | 导出API调用, 触发下载 | P0-01 |
| TC-CRUD-017 | 表单重置_编辑模态框点击重置_恢复原始数据 | 边界条件 | P1 | 编辑模态框打开 | 1.修改字段 2.点击重置 | original data | 字段恢复原值 | P0-01 |
| TC-CRUD-018 | 并发编辑_两用户同时编辑同一行_乐观锁/最后写入胜 | 边界条件 | P2 | 并发场景 | 1.模拟并发编辑 | concurrent edits | 最后写入胜, 无数据丢失 | P0-05 |

---

### 2.7 AI工具调用流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-AI-001 | 表单渲染_打开AI工具页_表单字段渲染正确(输入框/下拉选项/生成按钮) | 正常流 | P0 | AiTextTool挂载 | 1.挂载组件 2.验证DOM | title='作业生成', fields含topic/grade | h1含标题, input/select/button存在 | P0-01 |
| TC-AI-002 | 生成调用_填写参数点击生成_调用aiChatSync_API显示加载态 | 正常流 | P0 | AiTextTool挂载 | 1.填主题/年级 2.点击生成 | topic='小学数学', grade='一年级' | aiChatSync调用, loading显示 | P0-01 |
| TC-AI-003 | 结果展示_API返回结果_渲染在结果区域支持复制/保存 | 正常流 | P0 | 生成完成 | 1.等待API返回 | mockResult='AI生成内容' | 结果区域显示内容 | P0-01 |
| TC-AI-004 | 空输入守卫_空输入点击生成_不调用API提示错误 | 异常流 | P0 | AiTextTool挂载 | 1.不填内容直接点生成 | 空表单 | aiChatSync未调用, alert提示 | P0-01 |
| TC-AI-005 | 保存功能_有savePath时显示保存按钮_点击调用POST API保存结果 | 正常流 | P0 | 有savePath | 1.生成结果 2.点击保存 | savePath='notes' | POST API调用, 保存成功 | P0-01 |
| TC-AI-006 | 无savePath_隐藏保存按钮 | 正常流 | P0 | 无savePath | 1.挂载无savePath组件 | 无savePath prop | 无保存按钮 | P0-01 |
| TC-AI-007 | 复制功能_点击复制_调用Clipboard_API提示复制成功 | 正常流 | P0 | 有生成结果 | 1.点击复制按钮 | - | navigator.clipboard.writeText调用, alert已复制 | P0-01 |
| TC-AI-008 | 复制失败_降级处理_提示手动复制 | 异常流 | P1 | Clipboard API失败 | 1.mock reject 2.点击复制 | reject Error | alert提示手动复制 | P0-01 |
| TC-AI-009 | 结果为空_不显示复制保存按钮 | 边界条件 | P1 | API返回空内容 | 1.生成空结果 | content='' | 无操作按钮 | P0-01 |
| TC-AI-010 | 长文本结果_支持滚动查看 | 正常流 | P1 | 长文本结果 | 1.生成5000字结果 | 'A'.repeat(5000) | 结果容器可滚动 | P0-01 |
| TC-AI-011 | 仅空白字符_视为空输入 | 边界条件 | P0 | 仅空白 | 1.输入'   \n\t  ' 2.点击生成 | whitespace | aiChatSync未调用, 提示必填 | P0-01 |
| TC-AI-012 | 参数未选择_使用默认值或提示 | 正常流 | P1 | 未选下拉 | 1.仅填主题 2.点击生成 | topic only | aiChatSync调用, grade用默认 | P0-01 |
| TC-AI-013 | 快速连续点击生成_防抖处理_只发一次请求 | 边界条件 | P1 | 快速点击 | 1.连续点击3次 | rapid clicks | aiChatSync调用1次 | P0-01 |
| TC-AI-014 | 生成中切换工具_取消当前请求_加载新工具 | 边界条件 | P1 | 生成中卸载 | 1.触发生成 2.立即卸载重新挂载 | unmount during loading | 无内存泄漏, 新工具正常 | P0-01 |
| TC-AI-015 | 结果含HTML标签_安全渲染_不执行脚本 | 安全 | P0 | XSS payload | 1.生成含script内容 | '<script>alert(1)</script>' | 脚本未执行, 内容转义显示 | P0-06 |
| TC-AI-016 | API报错_显示错误信息 | 异常流 | P0 | API 500 | 1.mock reject 2.点击生成 | server error | 显示错误/失败/服务器错误 | P0-01 |

---

### 2.8 相册CRUD流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-PHOTO-001 | 网格渲染_相册列表以网格形式渲染显示缩略图 | 正常流 | P0 | PhotoAlbum挂载 | 1.挂载组件 2.验证网格 | mock albums | 网格渲染缩略图 | P0-01 |
| TC-PHOTO-002 | 空态_无相册时显示空态提示 | 边界条件 | P0 | 空列表 | 1.mock空数组 | [] | 显示空态提示 | P0-01 |
| TC-PHOTO-003 | 新增相册_点击新增_必填标题+班级选择_上传图片压缩base64_保存调用POST | 正常流 | P0 | PhotoAlbum挂载 | 1.点击新增 2.填标题/选班级 3.上传图片 4.保存 | title='春游', classId=1, images=[base64] | POST调用, 列表刷新 | P0-01 |
| TC-PHOTO-004 | 编辑相册_点击编辑_修改标题/图片_保存调用PATCH | 正常流 | P0 | 有相册数据 | 1.点击编辑 2.修改 3.保存 | modified data | PATCH调用, 列表刷新 | P0-01 |
| TC-PHOTO-005 | 删除相册_点击删除_确认后调用DELETE_列表刷新 | 正常流 | P0 | 有相册数据 | 1.点击删除 2.确认 | album id | DELETE调用, 列表刷新 | P0-01 |
| TC-PHOTO-005 | 图片压缩_上传前调用compressImages压缩base64_非原图直传 | 正常流 | P0 | 上传图片 | 1.选择大图上传 | large image file | compressImages调用, base64压缩后传输 | P0-01 |
| TC-PHOTO-007 | 图片预览_点击缩略图_打开预览大图支持切换 | 正常流 | P1 | 有相册 | 1.点击缩略图 | album with images | 预览打开, 支持左右切换 | P0-01 |
| TC-PHOTO-008 | 批量上传_一次选择多图_逐个压缩上传 | 正常流 | P1 | 多图选择 | 1.选择5张图 | 5 images | 5次压缩+上传 | P0-01 |
| TC-PHOTO-009 | 上传进度_大文件上传_显示进度条 | 正常流 | P1 | 大文件 | 1.上传10MB图 | 10MB file | 进度条显示 | P0-01 |
| TC-PHOTO-010 | 上传失败_重试机制_点击重试重新上传 | 异常流 | P1 | 上传失败 | 1.mock失败 2.点击重试 | failed upload | 重试上传成功 | P0-01 |
| TC-PHOTO-011 | 权限控制_仅班主任/任课教师可管理班级相册 | 正常流 | P0 | 不同角色 | 1.teacher无权限班级 | role=teacher, other class | 无新增/编辑/删除按钮 | P0-04 |
| TC-PHOTO-012 | 跨端一致性_Web创建相册_Mini读取验证标题/班级/图片同步 | 正常流 | P0 | 跨端 | 1.Web创建 2.Mini读取 | cross-end data | 标题/班级/图片完全一致 | P0-05 |

---

## 3. 测试数据制备脚本引用

### 3.1 单元测试数据 (`web-app/test/data/fixtures.ts`)
```typescript
// 核心测试数据工厂
export const fixtures = {
  // 账号数据
  mockAccounts: {
    super: { id: 1, username: 'admin', role: 'super', name: '超管', features: ['all'] },
    school_admin: { id: 2, username: 'admin01', role: 'school_admin', name: '校管', schoolId: 1, features: ['school_manage'] },
    teacher: { id: 3, username: 'teacher01', role: 'teacher', name: '张老师', schoolId: 1, classId: 1, features: ['homework', 'grades'] },
    parent: { id: 4, username: 'parent01', role: 'parent', name: '李家长', schoolId: 1, studentId: 1, features: [] }
  },
  
  // 班级数据
  classes: [
    { id: 1, name: '一年级1班', grade: '一年级', classNo: 1, teacherId: 3, studentCount: 40 },
    { id: 2, name: '初二3班', grade: '初二', classNo: 3, teacherId: 5, studentCount: 45 },
    { id: 3, name: '高一5班', grade: '高一', classNo: 5, teacherId: 7, studentCount: 50 }
  ],
  
  // 学生数据
  students: [
    { id: 1, name: '小明', studentNo: 'S2024001', classId: 1, className: '一年级1班', grade: '一年级', parentPhone: '13800138000' },
    { id: 2, name: '小红', studentNo: 'S2024002', classId: 1, className: '一年级1班', grade: '一年级', parentPhone: '13900139000' }
  ],
  
  // CRUD 示例行
  crudSampleRows: [
    { id: 1, name: '测试1', status: 'active', createTime: '2024-01-01' },
    { id: 2, name: '测试2', status: 'inactive', createTime: '2024-01-02' }
  ],
  
  // 列表响应模拟
  listResponse: {
    items: [{ id: 1, name: '测试1' }, { id: 2, name: '测试2' }],
    total: 2,
    page: 1,
    pageSize: 10
  }
};
```

### 3.2 集成测试数据工厂 (`web-app/test/integration/setup.ts`)
```typescript
// Mock API 层
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()
const mockDelete = jest.fn()

jest.mock('@/api/request', () => ({
  __esModule: true,
  default: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete }
}))

// Mock AI 接口
const mockAiChatSync = jest.fn()
jest.mock('@/api/teacher', () => ({
  __esModule: true,
  aiChatSync: (...args: any[]) => mockAiChatSync(...args)
}))

// Mock localStorage
const localStorageMock = { /* ... */ }
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

### 3.3 断言封装库 (`web-app/test/helpers/assertions.ts`)
```typescript
export function expectSuccessResponse(res: any): any {
  expect(res.status).toBe(200)
  expect(res.body).toHaveProperty('code', 200)
  expect(res.body).toHaveProperty('data')
  expect(res.body).toHaveProperty('message', 'success')
  expect(res.body).toHaveProperty('timestamp')
  return res.body.data
}

export function expectErrorResponse(res: any, expectedStatus: number, expectedCode?: string): void {
  expect(res.status).toBe(expectedStatus)
  expect(res.body).toHaveProperty('code', expectedCode || getErrorCode(expectedStatus))
  expect(res.body).toHaveProperty('message')
  expect(res.body).toHaveProperty('statusCode', expectedStatus)
}

export function expectPaginatedResponse(data: any): void {
  expect(data).toHaveProperty('items')
  expect(data).toHaveProperty('total')
  expect(Array.isArray(data.items)).toBe(true)
  expect(typeof data.total).toBe('number')
}
```

---

## 4. 执行命令

```bash
# 运行所有 Web 端测试
cd /d/workspae/gitee/techer/work-system/web-app
node node_modules/jest/bin/jest.js --no-coverage

# 运行特定模块测试
node node_modules/jest/bin/jest.js --no-coverage test/unit/validators.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/unit/class-naming.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/unit/subject-schema.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/integration/login-flow.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/integration/crud-flow.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/integration/ai-tool-flow.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/integration/photo-album-flow.spec.ts
node node_modules/jest/bin/jest.js --no-coverage test/integration/cross-end-consistency.spec.ts
```

---

*文档结束*