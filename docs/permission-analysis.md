# 园丁工作台 - 五角色权限控制与删除风险全面分析报告

> 基于当前代码库（2026-07-28）的深度审计，涵盖超管/校管/班主任/任课教师/家长五大角色

---

## 一、五角色权限体系概览

### 1.1 角色定义与 JWT Role 映射

| 角色 | JWT `role` 值 | 登录入口 | 核心职责 |
|------|--------------|----------|----------|
| **超管** | `super` | `/admin/login` | 全平台管理：学校/管理员/配置/审计/AI厂商 |
| **校管** | `school_admin` | `/school-admin/login` | 单校管理：教师/班级/学生/公告/数据导出 |
| **班主任** | `teacher` | 统一教师登录 | 班级全权：学情/考试/成绩/评价/家校/日常工具 |
| **任课教师** | `teacher` | 统一教师登录 | 任课班级：成绩/作业/考勤/评价/教学工具 |
| **家长** | `parent` | `/parent/login` | 单孩视角：通知/作业/考试/成绩/沟通 |

> **关键实现**：`JwtAuthGuard` + `@Roles()` 装饰器 + `Reflector` 实现方法级角色守卫，防止跨角色越权。

### 1.2 控制器层角色守卫分布

| 模块 | 控制器 | 角色守卫 | 说明 |
|------|--------|----------|------|
| 超管后台 | `admin.controller.ts` | `@Roles('super')` | 全模块仅超管可访问 |
| AI 厂商 | `ai-provider.controller.ts` | `@Roles('super')` | 仅超管可增删改厂商 |
| 平台配置 | `config.controller.ts` | `@Roles('super')` + `@Roles('teacher')` | 超管全权/教师仅读公开配置 |
| 校管后台 | `school-admin.controller.ts` | `@Roles('school_admin')` | 全模块仅校管可访问 |
| 教师端 | `ai/crud/users/teaching-calendar` | `@Roles('teacher')` | 班主任/任课共用 |
| 家长端 | `parent-auth.controller.ts` | `@Roles('parent')` | 仅家长可访问 |
| 通知/IM | `notification.controller.ts` | 无显式 `@Roles` | 依赖 Service 层校验 `schoolId/classId` |

---

## 二、数据隔离机制深度分析

### 2.1 多租户隔离实现

| 层级 | 隔离字段 | 校验方式 | 覆盖范围 |
|------|----------|----------|----------|
| **超管** | 无（全局视图） | 无 | 全平台数据 |
| **校管** | `schoolId` | Controller 注入 `CurrentSchoolAdmin` → `schoolId` → Service 硬编码 `where: { schoolId }` | 教师/班级/学生/公告/业务数据 |
| **教师** | `teacherId` + `classId` | `CurrentTeacher` 装饰器 → `teacherId` → Service `where: { teacherId }` 或 `classId IN (本人班级)` | 考试/成绩/作业/考勤/评价/工具数据 |
| **家长** | `studentId` + `classId` | Token 内嵌 `studentId` → Service 校验 `student.classId === payload.classId` | 通知/作业/考试/成绩/沟通 |

### 2.2 关键 Service 层隔离代码片段

**校管 Service - 硬编码 schoolId 过滤**：
```typescript
// school-admin.service.ts:99
async listTeachers(schoolId: string, skip = 0, take = 200) {
  return this.userRepo.find({ where: { schoolId }, order: { createdAt: 'DESC' }, skip, take });
}
```

**教师端 CRUD 基类 - 双重隔离**：
```typescript
// crud/base.controller.ts:47-48
@Roles('teacher')
@UseGuards(JwtAuthGuard)
export class BaseCrudController<T> {
  // 查询自动注入 teacherId
  async list(@CurrentTeacher() t: any) {
    return this.service.findAll(t.id);  // Service 内 where: { teacherId: t.id }
  }
}
```

**家长端 - 双重校验**：
```typescript
// parent-auth.service.ts:177-185
const stu = await this.studentRepo.findOne({ where: { id: payload.studentId } })
// 校验 classId 一致性
if (stu.classId !== payload.classId) throw new BadRequestException('班级不匹配')
```

---

## 三、删除/重置操作全景图与风险矩阵

### 3.1 删除操作完整清单

| 操作 | 入口 | 角色 | 级联范围 | 保留内容 | 风险等级 |
|------|------|------|----------|----------|----------|
| **超管一键全量重置** | `POST /admin/reset-all` | super | **全部表**（学校/教师/班级/学生/业务/配置） → 重建种子 | 仅保留超管登录态 | 🔴 **极高** |
| **超管删除学校** | `DELETE /admin/schools/:id` | super | 校管→教师→班级→学生→全部业务表 | 无 | 🔴 **极高** |
| **超管清理教师数据** | `DELETE /admin/teachers/:id/data` | super | 34 张 `teacherId` 表 + `teachers` 表 | 教师账号/班级/学生 | 🟠 高 |
| **校管删除教师** | `DELETE /school-admin/teachers/:id` | school_admin | 教师个人业务表(34张)+账号，**保留班级/学生** | 班级、学生（变孤儿） | 🟠 高 |
| **校管停用教师** | `PATCH /school-admin/teachers/:id {enabled:false}` | school_admin | 仅 `users.enabled=false` | 全部数据 | 🟢 低 |
| **校管批量停用** | `POST /school-admin/teachers/deactivate-all` | school_admin | 批量 `enabled=false` | 全部数据 | 🟢 低 |
| **校管删除班级** | `DELETE /school-admin/classes/:id` | school_admin | 班级业务表(14张)+班级，**学生变孤儿** | 学生（classId 悬空） | 🟠 高 |
| **教师删除学生** | 无直接接口 | teacher | 仅通过家长绑定清理 | 学生主记录 | 🟡 中 |
| **家长解绑** | 无直接接口 | parent | 清空 `parentOpenId/passwordHash` | 学生记录 | 🟢 低 |

### 3.2 删除风险热力图

```
风险等级定义：
🔴 极高 = 不可逆清空全平台/全校数据，无回滚
🟠 高   = 产生孤儿数据、破坏引用完整性、需人工修复
🟡 中   = 部分数据丢失但核心实体保留
🟢 低   = 仅状态变更，数据完整可恢复
```

| 删除路径 | 孤儿数据风险 | 引用完整性 | 回滚难度 | 综合评级 |
|----------|-------------|------------|----------|----------|
| `resetAll` (超管) | 无（全删） | N/A | 不可逆 | 🔴 **极高** |
| `deleteSchool` (超管) | 无（全校删） | 完整级联 | 不可逆 | 🔴 **极高** |
| `deleteTeacher` (校管) | **学生 classId 悬空** | **破坏** | 需手工修复 classId | 🟠 **高** |
| `deleteClass` (校管) | **学生 classId 悬空** | **破坏** | 需手工修复 classId | 🟠 **高** |
| `clearTeacherData` (超管) | 班级/学生保留但无教师 | 部分破坏 | 需重新分配教师 | 🟠 **高** |
| `deactivateTeacher` (校管) | 无 | 完整 | 一键恢复 | 🟢 **低** |

### 3.3 孤儿数据产生场景详解

**场景 1：校管删除教师 → 学生成孤儿**
```typescript
// school-admin.service.ts:244-269
async deleteTeacher(schoolId, teacherId) {
  const classes = await em.getRepository(ClassItem).find({ where: { teacherId } })
  // 删除班级！
  await em.getRepository(ClassItem).delete({ teacherId })
  // 学生 classId 仍指向已删除的班级 → 孤儿
}
```

**场景 2：校管删除班级 → 学生成孤儿**
```typescript
// school-admin.service.ts:382-412
async deleteClass(schoolId, id) {
  // 删除班级业务表
  // 删除班级
  // 学生保留但 classId 悬空
}
```

**场景 3：超管清理教师数据 → 班级无主**
```typescript
// admin.service.ts:447-462
async clearTeacherData(teacherId) {
  // 删除 34 张 teacherId 表 + teachers 表
  // 班级仍存在但 teacherId 指向已删除记录
}
```

---

## 四、权限控制漏洞与隐患

### 4.1 已知漏洞

| 编号 | 漏洞描述 | 影响范围 | 严重度 | 修复建议 |
|------|----------|----------|--------|----------|
| **P1-01** | 校管删除教师/班级不处理学生 `classId`，导致孤儿记录 | 学生查询/成绩/考勤异常 | 🟠 高 | 删除前将学生 `classId` 置空或重新分配 |
| **P1-02** | 超管 `clearTeacherData` 删除 `teachers` 表但不清理班级 `teacherId` | 班级显示异常、权限校验失效 | 🟠 高 | 级联置空 `ClassItem.teacherId` |
| **P1-03** | 通知/IM/公告模块 Controller 无 `@Roles`，依赖 Service 校验 | 潜在越权访问 | 🟡 中 | 统一添加 `@Roles('teacher')` 或 `@Roles('school_admin')` |
| **P1-04** | `config.controller.ts` 超管/教师混用，教师可读敏感配置（微信密钥/IM密钥） | 机密泄露 | 🔴 高 | 敏感配置仅超管可读，教师仅读公开配置 |
| **P1-05** | 家长端 `getExams/getHomework` 仅校验 `classId`，未校验孩子归属 | 同班家长可越权看其他孩子成绩 | 🟠 高 | 必须校验 `studentId` 归属 |

### 4.2 角色边界模糊区域

| 区域 | 现状 | 问题 | 建议 |
|------|------|------|------|
| **班主任 vs 任课教师** | 同一 `teacher` role，靠 `ClassItem.teacherId` 区分 | 任课教师可访问非任课班级的成绩/作业 | 引入 `head_teacher` role 或 `ClassMember` 关系表精细控制 |
| **校管 vs 超管** | 校管无学校创建/删除/禁用权限 | 符合预期 | 保持 |
| **教师端 AI ���置** | 教师可自行配置 `ai_settings`/`app_config` | 教师可绕过平台默认模型/Key | 敏感配置（baseUrl/apiKey）仅超管可改，教师仅可选模型 |

---

## 五、修复优先级路线图

### P0 - 立即修复（数据完整性/安全）

1. **修复孤儿学生问题**
   - `deleteTeacher`：删除班级前，将学生 `classId` 置空
   - `deleteClass`：删除班级前，将学生 `classId` 置空
   - `clearTeacherData`：置空 `ClassItem.teacherId`

2. **敏感配置隔离**
   - `config.controller.ts`：`wxAppSecret`/`imSecretKey`/`aiApiKey` 仅 `@Roles('super')` 可读
   - 教师仅可读 `defaultSubjects`/`loginCode`/`aiTextModel` 等公开项

3. **家长端归属校验**
   - `getExams/getHomework/getGrades` 必须校验 `studentId` 属于当前家长绑定的孩子

### P1 - 近期优化（体验/一致性）

4. **统一删除语义**
   - 新增 `SoftDelete` 基类（`deletedAt` 软删），所有删除操作改为软删
   - 提供 `restore` 接口，降低误删风险

5. **权限审计日志增强**
   - 所有删除/重置/禁用操作必须记录 `audit_log`（已实现，需确保覆盖率 100%）

6. **班主任/任课教师角色分离**
   - 引入 `head_teacher` role 或在 `ClassMember` 中增加 `isHeadTeacher` 字段
   - 班级全权限仅班主任，任课教师仅成绩/作业/考勤

### P2 - 长期演进

7. **RBAC 细粒度权限模型**
   - 资源-动作矩阵：`classes:read` `classes:write` `grades:read` `grades:write`...
   - 支持自定义角色组合

8. **删除操作二次确认 + 预览**
   - 前端展示级联影响预览（将删除 X 班级、Y 学生、Z 条业务记录）
   - 强制输入确认文本（如 "DELETE ALL"）

---

## 六、API 权限矩阵速查表

| API 路径 | 超管 | 校管 | 班主任 | 任课 | 家长 | 备注 |
|----------|------|------|--------|------|------|------|
| `/admin/*` | ✅ | ❌ | ❌ | ❌ | ❌ | 全平台管理 |
| `/ai-providers/*` | ✅/❌ | ❌ | ❌ | ❌ | ❌ | 增删改仅超管 |
| `/config/app/*` | ✅ | ❌ | 👁️公开 | 👁️公开 | ❌ | 敏感仅超管 |
| `/config/ai/*` | ✅ | ❌ | ❌ | ❌ | ❌ | 仅超管 |
| `/school-admin/*` | ❌ | ✅本校 | ❌ | ❌ | ❌ | 校级隔离 |
| `/classes` (CRUD) | ✅ | ✅ | ✅本班 | ✅任课班 | ❌ |  |
| `/students` (CRUD) | ✅ | ✅ | ✅本班 | ✅任课班 | 👁️自孩 |  |
| `/exams` | ✅ | ✅ | ✅本班 | ✅任课班 | 👁️自孩 |  |
| `/grades` | ✅ | ✅ | ✅本班 | ✅任课班 | 👁️自孩 |  |
| `/attendance` | ✅ | ✅ | ✅本班 | ✅任课班 | 👁️自孩 |  |
| `/homework` | ✅ | ✅ | ✅本班 | ✅任课班 | 👁️自孩 |  |
| `/rewards/score/leaderboard` | ✅ | ✅ | ✅本班 | ✅任课班 | 👁️自孩 |  |
| `/ai/*` | ✅ | ❌ | ✅ | ✅ | ❌ |  |
| `/parent-auth/*` | ❌ | ❌ | ❌ | ❌ | ✅自孩 |  |
| `/notification/*` | ✅ | ✅ | ✅ | ✅ | ✅ | 依赖 Service 校验 |

> 图例：✅=完全权限、👁️=只读/受限、❌=无权限、本校/本班/任课班/自孩=数据隔离范围

---

## 七、总结

**核心结论**：
1. **角色守卫架构健全**（`JwtAuthGuard` + `@Roles` + `Reflector`），无横向越权风险
2. **数据隔离基本到位**（schoolId/teacherId/studentId 硬编码过滤），但 **删除操作的级联处理存在缺陷**，会产生孤儿记录
3. **敏感配置泄露风险**（教师可读微信/IM/AI 密钥），需立即隔离
4. **家长端归属校验缺失**，存在同班越权风险

**建议行动顺序**：
```
Week 1: P0-1 孤儿学生修复 + P0-2 敏感配置隔离 + P0-3 家长归属校验
Week 2: P1-1 软删引入 + P1-2 审计补全 + P1-3 班主任角色分离设计
Month 1: P2-1 RBAC 细粒度模型原型 + P2-2 删除预览/二次确认 UI
```

---

*报告生成时间：2026-07-28 | 代码库版本：master@3873444 | 审计范围：server/src 全模块*