# 园丁工作台 跨平台一致性问题审计报告

> 审计范围：web-app（Vue 3）、mini-program（uni-app）、server（NestJS）
> 审计日期：2026-07-25

---

## 一、校验规则不一致

### 1.1 手机号校验
| 平台 | 函数 | 行为 | 状态 |
|---|---|---|---|
| Web | `validators.ts :: isValidPhone()` | 空/null → true（选填）| ✅ |
| Mini | `validators.js :: isPhone()` | 空 → false（必填）| ❌ 不一致 |
| Server DTO | `@Matches(\|^1[3-9]\d{9}$\|^$/)` | 空串放行 | ✅ |

**影响**：小程序若手机号为选填字段，会错误拒绝空输入。

### 1.2 学科常量是否一致
| 平台 | 文件 | 数量 | 内容 |
|---|---|---|---|
| Web | `constants/subjects.ts` | 15 | 语文/数学/英语/科学/物理/化学/生物/政治/历史/地理/音乐/体育/美术/信息技术/道德与法治 |
| Mini | `common/subject-schema.js` | ? | 需确认 |

### 1.3 后端 DTO 校验
需确认小程序传参是否匹配后端 DTO 的校验规则（class-validator decorators）。

---

## 二、功能覆盖不一致

### 2.1 Web 有、小程序无的功能
| 功能 | Web 路由 | 重要性 |
|---|---|---|
| 奖项管理（奖项分类CRUD） | teacher-award-categories | ⭐ |
| 试卷查询 | teacher-paper-queries | ⭐ |
| 教案模板 | teacher-lesson-plan-templates | ⭐⭐ |
| 通知模板 | teacher-notice-templates | ⭐⭐ |
| 值日配置 | teacher-duty-config | ⭐ |
| 评语生成 | tool-comment | ⭐ |
| 期末总结 | tool-summary | ⭐ |
| 文案模板库 | plan-template-lib | ⭐ |
| 课表排版 | tool-schedule-maker | ⭐ |
| 班级职务 | tool-class-duty | ⭐ |
| 学校管理员公告 | school-admin-notices | ⭐⭐ |
| 超管：学校管理、管理员管理、审计日志、平台配置（4页） | super-* | ⭐⭐⭐ |

### 2.2 小程序有、Web 无的功能
| 功能 | 小程序页面 | 重要性 |
|---|---|---|
| 家访路线 | home-visit-route | ⭐ |
| 学科练习 | subject | ⭐ |
| 学科工具列表 | subject-list | ⭐⭐ |
| 成绩趋势图 | grade-trend | ⭐⭐ |
| 数据统计 | analysis | ⭐ |
| 抽签历史 | picker-history | ⭐ |
| 智能工具 | quicktool | ⭐⭐ |
| 考试分析（单独页） | ai/ai-exam | ⭐⭐ |
| 互动答疑 | ai/ai-interactive | ⭐⭐ |
| 奖励管理（工具类） | tools/reward | ⭐ |

### 2.3 名称差异（相同功能不同名称）
| 功能本质 | Web 命名 | 小程序命名 |
|---|---|---|
| 考试分析 | ExamAnalysis | ai-exam（考试分析 + 数据统计） |
| AI 对话 | AiChat | ai/ai（AI 助手） |
| 数据看板 | DataDashboard | data-dashboard + analysis |
| 班级活动 | ClassActivities | class-activity（班级活动） |
| 班级风采 | Gallery | gallery |
| 加分/减分 | ScoreRecords / ScorePanel | tools/score-panel |

---

## 三、操作流程不一致

### 3.1 登录流程
| 环节 | Web | 小程序 |
|---|---|---|
| 统一登录 | ✅ 统一身份：username+password，后端按角色匹配 | ❌ 分角色登录页（教师 admin 登录、家长 parent-login 分离） |
| parent 字段映射 | ✅ 已适配 parent→AuthUser | 需确认 |

### 3.2 班级管理
| 操作 | Web | 小程序 |
|---|---|---|
| 班级名称生成 | 年级 + 班级序号 + "班"（自动生成） | ✅ 已改数字序号 |
| 班主任选择 | 拖选下拉 | picker 选人 |
| 批量导入 | ✅ BatchImportDialog | 独立导入页 |

### 3.3 教师管理
| 操作 | Web | 小程序 |
|---|---|---|
| 学科字段 | 下拉框（SUBJECT_OPTIONS） | ❓ 需确认 |
| 用户名显示 | ✅ 新增/编辑均显示 | ❓ 需确认 |
| 查重校验 | ✅ 后端校验 | ❓ 需确认 |

### 3.4 学生管理
| 字段/操作 | Web | 小程序 |
|---|---|---|
| 手机号校验 | 选填（isValidPhone） | 必填（isPhone） |
| 批量导入 | ✅ | ✅ |

---

## 四、API 调用一致性

### 4.1 Web API 模块
| 模块 | 端点 |
|---|---|
| auth.ts | login/unified-login, profile |
| school-admin.ts | teachers CRUD, classes CRUD, students CRUD, batch import/export, search |
| teacher.ts | exams, grades, attendance, homework, growth, etc. |
| admin.ts | super admin CRUD |
| parent.ts | parent features |
| notification.ts | notifications |

### 4.2 Mini API 调用
需逐页确认 mini 的 API 路径是否与 server 端点匹配。尤其关注：
- REST 路径命名风格（web 可能用 `/api/school-admin/teachers`，mini 可能不同）
- 请求/响应字段名（camelCase vs snake_case）
- 分页/排序参数是否一致

---

## 五、排版/UI 待审查点

### 5.1 Web 排版问题待查
- 侧边栏 3 级折叠：所有分类和子分组是否完整无遗漏
- 页面间距一致性（padding/margin 规范）
- 空状态/加载中/错误状态覆盖
- 响应式在小屏下的表现

### 5.2 小程序排版问题待查
- 各页面样式一致性（字号/颜色/间距统一）
- 暗黑模式适配完整性
- 空状态/加载中状态覆盖
- 导航/返回逻辑完整性

---

## 六、测试覆盖差距

### 6.1 当前测试覆盖
| 平台 | 测试套件 | 用例数 | 状态 |
|---|---|---|---|
| Web | 14 | 250 | ✅ |
| Server | 12 | 185 | ✅ |
| Mini | 6 | ~30 | ❌ 严重不足 |

### 6.2 小程序缺少的测试
- 几乎所有页面功能测试（exams, grades, homework, classes, students, etc.）
- API mock 测试
- 登录流程集成测试
- 角色路由守卫测试

---

*本报告将作为后续测试用例生成和优化整改的基础。*
