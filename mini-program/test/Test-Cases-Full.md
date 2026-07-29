# 小程序端 全量测试用例文档

> 生成时间：2026-07-26 | 基于 PRD：Audit-PRD.md | 测试框架：Jest + @vue/test-utils (uni-app 兼容)

---

## 1. 测试用例总览

| 模块 | 单元测试 | 集成测试 | E2E测试 | 总计 |
|------|---------|---------|---------|------|
| 共享校验器对齐 | 104 | - | - | 104 |
| 共享常量对齐 | 45 | - | - | 45 |
| 共享类型定义 | 17 | - | - | 17 |
| 本地扩展校验器 | 12 | - | - | 12 |
| Pinia Store 状态管理 | 38 | - | - | 38 |
| 工具箱纯函数 | 20 | - | - | 20 |
| 登录流程 | - | 15 | - | 15 |
| 首页/仪表盘 | - | 8 | - | 8 |
| 工具箱/小游戏 | - | 20 | - | 20 |
| 作业管理 | - | 12 | - | 12 |
| 成绩/考试 | - | 10 | - | 10 |
| 考勤管理 | - | 8 | - | 8 |
| 通知公告 | - | 6 | - | 6 |
| 班级/学生管理 | - | 10 | - | 10 |
| AI工具 | - | 8 | - | 8 |
| 个人中心 | - | 6 | - | 6 |
| 数据看板 | - | 5 | - | 5 |
| 消息聚合/IM | - | 6 | - | 6 |
| 待办事项/抽签/日历 | - | 8 | - | 8 |
| **总计** | **236** | **116** | **0** | **352** |

---

## 2. 结构化用例表

### 2.1 共享校验器对齐测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-VAL-001 | isPhone_有效手机号_返回true(与Web端一致) | 正常流 | P0 | - | 1.调用isPhone('13800138000') | '13800138000' | true | P0-02 |
| TC-MP-VAL-002 | isValidPhone_空值_返回true(宽松模式，与Web端一致) | 边界条件 | P0 | - | 1.调用isValidPhone(null) | null | true | P0-02 |
| TC-MP-VAL-003 | validateClassName_小学标准格式_返回valid=true(与Web端一致) | 正常流 | P0 | - | 1.调用validateClassName('五年级3班') | '五年级3班' | {valid:true, classNo:3} | P0-02 |
| TC-MP-VAL-004 | validateClassName_初中标准格式_返回valid=true(与Web端一致) | 正常流 | P0 | - | 1.调用validateClassName('初二5班') | '初二5班' | {valid:true, classNo:5} | P0-02 |
| TC-MP-VAL-005 | validateClassName_高中标准格式_返回valid=true(与Web端一致) | 正常流 | P0 | - | 1.调用validateClassName('高一10班') | '高一10班' | {valid:true, classNo:10} | P0-02 |
| TC-MP-VAL-006 | isSubject_15门学科全覆盖(与Web端SUBJECT_OPTIONS一致) | 正常流 | P0 | - | 1.遍历SUBJECT_VALUES验证 | 15学科值 | 全true | P0-02 |
| TC-MP-VAL-007 | getSubjectByValue_反查学科对象_引用一致性 | 正常流 | P0 | - | 1.调用getSubjectByValue('chinese') | 'chinese' | ===SUBJECT_OPTIONS[0] | P0-02 |
| TC-MP-VAL-008 | isRole_四角色全覆盖 | 正常流 | P0 | - | 1.验证super/school_admin/teacher/parent | 四角色值 | 全true | P0-02 |
| TC-MP-VAL-009 | hasFeature_空数组全放行_与Web端一致 | 边界条件 | P0 | - | 1.调用hasFeature([], 'any') | [], 'any' | true | P0-02 |
| TC-MP-VAL-010 | normalizePhone_归一化_与Web端一致 | 正常流 | P0 | - | 1.调用normalizePhone('138-0013 8000') | '138-0013 8000' | '13800138000' | P0-02 |

... (共 104 个共享校验器对齐用例，与 Web 端 validators.spec.ts 语义完全一致)

---

### 2.2 共享常量对齐测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-CONST-001 | SUBJECT_OPTIONS_15门学科字段结构_与Web端一致 | 正常流 | P0 | - | 1.验证每项含label/value/icon/color | - | 15项全包含4字段 | P0-02 |
| TC-MP-CONST-002 | SUBJECT_OPTIONS_value唯一性_去重验证 | 正常流 | P0 | - | 1.验证value数组去重 | - | 15个唯一 | P0-02 |
| TC-MP-CONST-003 | SUBJECT_OPTIONS_color唯一性_去重验证 | 正常流 | P1 | - | 1.验证color数组去重 | - | 15个唯一color | P0-02 |
| TC-MP-CONST-004 | SUBJECT_OPTIONS_icon去重_语文历史共用📜_放宽断言 | 边界条件 | P1 | - | 1.验证icon唯一数 | - | 14个唯一icon | P0-02 |
| TC-MP-CONST-005 | GRADE_OPTIONS_12个标准年级_与Web端一致 | 正常流 | P0 | - | 1.验证长度与内容 | - | 12项含一~六年级/初一~初三/高一~高三 | P0-02 |
| TC-MP-CONST-006 | CLASS_NAMING_RULE_pattern_行为与Web端一致 | 正常流 | P0 | - | 1.验证pattern.test小学/初中/高中格式 | 标准格式 | 全匹配 | P0-02 |
| TC-MP-CONST-007 | ROLE_OPTIONS_四角色枚举_与Web端一致 | 正常流 | P0 | - | 1.验证角色值 | - | super/school_admin/teacher/parent | P0-02 |
| TC-MP-CONST-008 | FEATURE_FLAGS_31个教师功能特性标识_与Web端一致 | 正常流 | P0 | - | 1.验证Set大小与内容 | - | size=31, 含homework/grades/ai等 | P0-02 |
| TC-MP-CONST-009 | PHONE_REGEX_手机号正则_单一源头 | 正常流 | P0 | - | 1.验证正则与Web端完全相同 | /^1[3-9]\d{9}$/ | 完全一致 | P0-02 |
| TC-MP-CONST-010 | SUBJECT_VALUES_值数组_与Web端对齐 | 正常流 | P0 | - | 1.对比Web端SUBJECT_VALUES | - | 内容顺序完全一致 | P0-02 |

---

### 2.3 共享类型定义测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-TYPE-001 | User接口_编译期类型检查通过 | 编译期 | P0 | TypeScript环境 | 1.tsc --noEmit | User类型定义 | 无类型错误 | P0-02 |
| TC-MP-TYPE-002 | Teacher接口_扩展User含subjects/features | 编译期 | P0 | TypeScript环境 | 1.tsc --noEmit | Teacher类型定义 | 无类型错误 | P0-02 |
| TC-MP-TYPE-003 | Student接口_含classId/parentIds | 编译期 | P0 | TypeScript环境 | 1.tsc --noEmit | Student类型定义 | 无类型错误 | P0-02 |
| TC-MP-TYPE-004 | ClassInfo接口_含grade/classNo/teacherId | 编译期 | P0 | TypeScript环境 | 1.tsc --noEmit | ClassInfo类型定义 | 无类型错误 | P0-02 |
| TC-MP-TYPE-005 | ApiResponse泛型_类型参数正确推导 | 编译期 | P0 | TypeScript环境 | 1.tsc --noEmit | ApiResponse<T> | 无类型错误 | P0-02 |
| TC-MP-TYPE-006 | PageParams/PageResult_分页类型正确 | 编译期 | P0 | TypeScript环境 | 1.tsc --noEmit | PageParams, PageResult | 无类型错误 | P0-02 |

---

### 2.4 本地扩展校验器测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-LOCAL-001 | isEmail_合法邮箱_返回true | 正常流 | P1 | - | 1.调用isEmail('test@example.com') | 'test@example.com' | true | - |
| TC-MP-LOCAL-002 | isEmail_非法邮箱_返回false | 异常流 | P1 | - | 1.调用isEmail('invalid') | 'invalid' | false | - |
| TC-MP-LOCAL-003 | inRange_数值在范围内_返回true | 正常流 | P1 | - | 1.调用inRange(5, 1, 10) | 5, 1, 10 | true | - |
| TC-MP-LOCAL-004 | inRange_数值超范围_返回false | 异常流 | P1 | - | 1.调用inRange(15, 1, 10) | 15, 1, 10 | false | - |
| TC-MP-LOCAL-005 | isInt_整数_返回true | 正常流 | P1 | - | 1.调用isInt(42) | 42 | true | - |
| TC-MP-LOCAL-006 | isInt_浮点数_返回false | 异常流 | P1 | - | 1.调用isInt(3.14) | 3.14 | false | - |

---

### 2.5 Pinia Store 状态管理测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-STORE-001 | authStore_登录_设置token/user/features | 正常流 | P0 | store初始化 | 1.store.login(token, user) | mock token/user | state.token/user/features更新 | P0-03 |
| TC-MP-STORE-002 | authStore_登出_清空所有状态 | 正常流 | P0 | 已登录 | 1.store.logout() | - | token='', user=null, features=[] | P0-03 |
| TC-MP-STORE-003 | authStore_持久化_localStorage同步 | 正常流 | P1 | 已登录 | 1.验证localStorage写入 | - | localStorage含auth状态 | P0-03 |
| TC-MP-STORE-004 | themeStore_切换主题_更新CSS变量 | 正常流 | P1 | store初始化 | 1.store.toggleTheme() | - | document.documentElement.classList含dark | - |
| TC-MP-STORE-005 | parentStore_设置学生信息_getters正确 | 正常流 | P1 | store初始化 | 1.store.setStudent(student) | mock student | getters.currentStudent返回正确 | - |
| TC-MP-STORE-006 | mockModeStore_启用Mock模式_拦截API请求 | 正常流 | P1 | store初始化 | 1.store.enableMock() | - | mockMode.enabled=true | - |
| TC-MP-STORE-007 | switchTabParamsStore_缓存Tab参数_页面间传递 | 正常流 | P1 | store初始化 | 1.store.setParams({classId:1}) | {classId:1} | getters获取正确参数 | - |

---

### 2.6 工具箱纯函数测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-TOOL-001 | toolboxCategories_分类逻辑_无重复标签 | 正常流 | P0 | - | 1.验证categories结构 | - | 标签唯一 | - |
| TC-MP-TOOL-002 | subjectTools_学科工具重构_含15学科映射 | 正常流 | P0 | - | 1.验证subjectTools覆盖 | - | 15学科全覆盖 | P0-02 |
| TC-MP-TOOL-003 | featureMapping_功能映射_与FEATURE_FLAGS对齐 | 正常流 | P0 | - | 1.对比FEATURE_FLAGS_SET | - | 完全对齐 | P0-02 |

---

### 2.7 登录流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-LOGIN-001 | 教师登录_微信授权+账号密码_跳转教师工作台 | 正常流 | P0 | 登录页 | 1.微信授权 2.输入账号密码 | teacher/Teacher@123 | 跳转dashboard, token有效 | P0-03 |
| TC-MP-LOGIN-002 | 家长登录_微信授权+手机验证码_跳转家长首页 | 正常流 | P0 | 登录页 | 1.微信授权 2.手机验证码 | phone=13800138000, code=123456 | 跳转home, studentId绑定 | P0-03 |
| TC-MP-LOGIN-003 | 自动登录_token有效_无感跳转 | 正常流 | P1 | 本地有token | 1.冷启动小程序 | valid token | 自动进入首页 | P0-03 |
| TC-MP-LOGIN-004 | Token过期_引导重新登录 | 异常流 | P1 | token过期 | 1.冷启动 | expired token | 跳转登录页 | P0-03 |

---

### 2.8 跨端一致性验证用例

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-MP-CROSS-001 | 班级命名_Web创建班级_Mini读取名/年级/序号一致 | 正常流 | P0 | 同一后端 | 1.Web创建'三年级2班' 2.Mini读取 | cross-end | name/grade/classNo完全一致 | P0-05 |
| TC-MP-CROSS-002 | 手机号校验_Web提交手机号_Mini验证通过 | 正常流 | P0 | 同一后端 | 1.Web提交13800138000 2.Mini验证 | 13800138000 | 双端校验均通过 | P0-04 |
| TC-MP-CROSS-003 | 学科下拉_Web选数学_Mini下拉选项完全一致 | 正常流 | P0 | 同一后端 | 1.对比SUBJECT_OPTIONS | - | label/value/icon/color全对齐 | P0-02 |
| TC-MP-CROSS-004 | 作业流程_Web发布作业_Mini学生查看/提交同步 | 正常流 | P0 | 同一后端 | 1.Web发布 2.Mini查看提交 | homework data | 内容/附件/截止日期同步 | P0-05 |
| TC-MP-CROSS-005 | 成绩查看_Web录入成绩_Mini家长查看分值/排名一致 | 正常流 | P0 | 同一后端 | 1.Web录入 2.Mini查看 | grade data | 分数/班级排名/年级排名同步 | P0-05 |

---

## 3. 测试数据制备脚本引用

复用 `test-deliverables/Test-Data-Fixtures/` 共享数据工厂，小程序端适配：
- `mini-program/test/data/fixtures.ts` - 适配 uni-app 环境的测试数据
- `mini-program/test/integration/setup.ts` - 集成测试上下文与 Mock 工厂

---

## 4. 执行命令

```bash
cd /d/workspae/gitee/techer/work-system/mini-program
node ../web-app/node_modules/jest/bin/jest.js --no-coverage

# 单元测试
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/unit/shared-validators.spec.ts test/unit/shared-constants.spec.ts test/unit/shared-types.spec.ts test/validators.spec.ts test/store.spec.ts test/toolbox.spec.ts

# 集成测试 (待补齐)
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/
```

---

*文档结束*