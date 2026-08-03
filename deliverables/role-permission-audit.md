# 园丁工作台 · 角色关系与权限梳理

> 梳理时间：2026-08-03  
> 范围：超管 / 校管 / 班主任 / 科任老师 / 家长 — 与学生、班级、学期、考试、成绩的关系

---

## 一、当前角色体系

| 角色 | 登录方式 | JWT payload 核心字段 | 有效功能包计算 |
|------|---------|---------------------|---------------|
| super（超管） | admin/admin | `{ sub: 'super', role: 'super' }` | 全开（ALL） |
| school_admin（校管） | 校管账号密码 | `{ sub: saId, role: 'school_admin', schoolId }` | 全开（ALL） |
| teacher（教师） | 教师账号密码 | `{ sub: teacherId, role: 'teacher', schoolId }` | 学校 featureFlags ∩ 教师 features |
| parent（家长） | 学号+家长密码 | `{ sub: parentImUserId, type: 'parent', parentId, studentId, classId, studentNo }` | 学校 featureFlags ∩ 孩子班主任 features |

---

## 二、数据归属与关系图

```
School（学校）
  ├─ school_admin（校管）         ← 一对多，校管属于一所学校
  ├─ User/Teacher（教师）         ← 一对多，教师属于一所学校
  │    ├─ ClassItem.teacherId     ← 班主任（head）唯一归属
  │    ├─ class_members           ← 班主任+科任老师（按学期隔离）
  │    │    ├─ role='head'        ← 班主任（一师一班/一班一师，同学期）
  │    │    └─ role='subject'     ← 科任老师（可跨多班）
  │    ├─ Exam（考试）            ← teacherId=创建者，班级维度
  │    └─ Grade（成绩）           ← teacherId=录入者，班级维度
  └─ Student（学生）
       ├─ classId                 ← 归属班级
       ├─ parentId                ← 主家长（单值，旧逻辑）
       └─ StudentParent（关联表） ← 一学生多微信/多家长（新逻辑）

Parent（家长）
  └─ openId                     ← 微信 openid（唯一）
```

---

## 三、当前权限模型

### 3.1 双层守卫

| 守卫 | 作用 | 说明 |
|------|------|------|
| `@Roles('teacher')` | 角色门禁 | 仅允许指定角色进入 |
| `@Feature('classes')` | 功能包门禁 | 检查 effectiveFeatures 是否包含该 key |
| `JwtAuthGuard` | 认证门禁 | 验证 JWT 有效性，挂载 req.user |

### 3.2 功能包计算（FeatureService）

```
super / school_admin → effective = ALL（永不被 FeatureGuard 拦截）

teacher → effective = FEATURE_FLAGS ∩ school.featureFlags ∩ user.features

parent  → 通过 studentId → Student.teacherId → User
          → effective = FEATURE_FLAGS ∩ school.featureFlags ∩ 班主任 user.features
```

### 3.3 班级访问权限（ClassMemberService）

| 方法 | 权限判断 | 问题 |
|------|---------|------|
| `canAccess(teacherId, classId)` | 教师是否在 class_members 有记录（任一学期） | 正确 |
| `getRole(teacherId, classId)` | 返回 head / subject / null | 正确 |
| `assertCanBecomeHead` | 一师一班 head + 一班一 head（同学期） | 正确 |

---

## 四、已发现的权限混乱与错误

### 4.1 成绩权限过严（P1）

**位置**：`grades.module.ts`
- `assertClassAccess(teacherId, classId)` 仅检查 `ClassItem.teacherId`
- `studentHistory(teacherId, studentId)` 同样只允许班主任访问

**影响**：
- 科任老师无法查看自己录入/教授的班级成绩
- 班主任可以查看全科目成绩（设计如此，但科任老师被误伤）

**根因**：
- 代码混淆了"班级创建者"和"班级访问者"
- `ClassItem.teacherId` 只存班主任，但成绩应是"班级维度共享"

### 4.2 考试权限不一致（P2）

**位置**：`exams.module.ts`
- `findAll(classId)` 检查 `ClassItem.teacherId`（班主任）
- `remove(id, teacherId)` 检查 `exam.teacherId`（创建者）

**影响**：
- 班主任可以删除其他教师创建的考试（只要他是班主任）
- 科任老师只能删除自己创建的考试，但可能无法查看同班其他考试

### 4.3 家长功能包继承错误（P2）

**位置**：`feature.service.ts` + `auth.service.ts`
- 家长权限继承自"孩子所在班级班主任的 features"
- 未考虑"科任老师功能包应独立生效"

**影响**：
- 如果班主任关闭了「作业」功能，科任老师发布的作业家长端也看不到
- 家长功能包被班主任单方面决定，不合理

### 4.4 学生-家长关系建模过时（P2）

**位置**：`student.entity.ts` + `parent.entity.ts`
- `Student.parentId` 单值字段，一个学生只能有一个主家长
- 实际场景：一个学生有父亲+母亲两个家长

**影响**：
- 第二个家长无法通过 `parentId` 关联
- 只能依赖 `StudentParent` 关联表，但代码中仍有大量回退到 `parentId` 的逻辑

### 4.5 微信登录歧义（P3）

**位置**：`auth.service.ts`
- 教师不支持微信登录（产品决策）
- 但 `Teacher` 实体仍有 `openid` 字段
- 如果教师 openid 已绑定，微信登录会引导"绑定家长身份"，提示不明确

### 4.6 超管/校管接口命名混乱（P3）

**位置**：`school-admin.controller.ts`
- 校管接口前缀 `/school-admin/classes`、`/school-admin/teachers`
- 但超管也走 `/admin/*` 前缀
- 部分管理功能（如班级删除）在校管端可操作，超管端无对应接口

---

## 五、整改建议

### 5.1 成绩权限重构（针对 4.1）

**目标**：班主任全权访问 + 科任老师访问自己教的科目

**方案**：
```
assertClassAccess(teacherId, classId)
  ├─ 班主任：ClassItem.teacherId === teacherId → 放行
  └─ 科任老师：class_members 有 subject 记录 → 放行
       └─ 科任老师只能访问自己教授的科目成绩（按 subject 过滤）
```

**studentHistory 同理**：
```
studentHistory(teacherId, studentId)
  ├─ 班主任：直接放行（可看全科目）
  └─ 科任老师：检查 class_members，返回时只包含该老师教授的科目
```

### 5.2 考试权限统一（针对 4.2）

**目标**：班级内教师共享考试，创建者有删除权

**方案**：
```
findAll(classId)
  ├─ 班主任：放行
  └─ 科任老师：class_members 有记录 → 放行（只读）

remove(id, teacherId)
  ├─ 班主任：允许删除同班任何考试
  └─ 科任老师：仅允许删除自己创建的考试
```

### 5.3 家长功能包改为"并集"（针对 4.3）

**目标**：家长功能包 = 学校级 ∩ 孩子所有科任老师的 features 并集

**方案**：
```
parent effectiveFeatures
  ├─ 学校 featureFlags（必过）
  └─ 孩子所在班级所有教师（班主任+科任）features 的并集
       └─ 任一教师开启了某功能，家长即可使用
```

**注意**：需考虑性能，缓存班级教师 features 列表。

### 5.4 学生-家长关系升级（针对 4.4）

**目标**：支持一学生多家长

**方案**：
1. 保留 `Student.parentId` 作为"主家长"兼容
2. 新增 `StudentSecondaryParent` 关联表（或复用 `StudentParent`）
3. 家长登录/微信绑定时，不限制必须绑定到 `parentId`
4. 数据迁移脚本：将现有 `parentId` 关联迁移到 `StudentParent`

### 5.5 微信登录提示优化（针对 4.5）

**目标**：教师 openid 已绑定时，微信登录明确提示

**方案**：
```
微信登录流程：
  ├─ 命中家长身份 → 直接登录
  ├─ 命中教师 openid → 返回 needsRoleChoice（可选：是否同时引导绑定家长）
  └─ 未命中 → needsBind
```

### 5.6 接口命名与权限对齐（针对 4.6）

**目标**：超管/校管接口职责清晰

**方案**：
```
/admin/*          ← 超管独占（学校CRUD、超管账号管理）
/school-admin/*   ← 校管+超管可访问（本校教师/班级/学生管理）
  └─ 超管访问时按 schoolId 过滤，或允许跨校
```

---

## 六、优先级与实施顺序

| 优先级 | 整改项 | 影响范围 | 建议 |
|--------|--------|---------|------|
| P0 | 4.1 成绩权限重构 | 教师模块核心功能 | 立即修复 |
| P1 | 4.3 家长功能包并集 | 家长端体验 | 下一迭代 |
| P1 | 4.4 多家长支持 | 数据模型 | 下一迭代 |
| P2 | 4.2 考试权限统一 | 考试模块 | 随 4.1 一起改 |
| P2 | 4.5 微信登录提示 | 用户体验 | 小优化 |
| P3 | 4.6 接口命名对齐 | 代码可读性 | 重构时处理 |

---

## 七、附：关键代码位置

| 文件 | 行号 | 说明 |
|------|------|------|
| `server/src/grades/grades.module.ts` | 361-364 | `assertClassAccess`（仅班主任） |
| `server/src/grades/grades.module.ts` | 482-491 | `studentHistory`（仅班主任） |
| `server/src/exams/exams.module.ts` | 38-46 | `findAll` 班级校验 |
| `server/src/exams/exams.module.ts` | 75-82 | `remove` 创建者校验 |
| `server/src/common/feature/feature.service.ts` | 68-76 | parent 权限解析 |
| `server/src/auth/auth.service.ts` | 192-239 | 微信登录逻辑 |
| `server/src/class-members/class-members.module.ts` | 47-52 | `canAccess` |
