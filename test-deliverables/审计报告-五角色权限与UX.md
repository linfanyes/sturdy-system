# 五角色权限与用户体验审计报告

> 日期：2026-07-23
> 后端：NestJS + MySQL 8.0 (`gardener_test`)
> 审计方式：单进程种子重建 + live API 逐一验证

---

## 审计概览

| 角色 | 登录 | 业务功能 | 越权保护 | 状态 |
|------|------|---------|---------|------|
| 超管 (admin) | ✅ | 学校/校管管理正常 | ⚠️ 可访问教师端点(空数据) | 需修复 |
| 校管 (sa1) | ✅ | 看板/统计正常 | ⚠️ 可访问教师端点(空数据) | 需修复 |
| 班主任 (teacher1) | ✅ | 33/33 端点可用 | — | ✅ |
| 任课教师 (teacher3) | ✅ | 基本功能正常 | — | ✅ |
| 家长 (2024001) | ⚠️需微信code | 通知/作业查看 | — | 跳过 |

---

## 逐项审计结果

### 1. 超级管理员
| 项目 | 结果 |
|------|------|
| 登录 `/admin/login` ✅ | JWT 正常签发 |
| 列出学校 ✅ | 2 所 (阳光实验、明德) |
| 列出校管 ✅ | 3 人 |
| 越权: `/todos` (教师端) ⚠️ | 返回 200 + 空数组，未拒绝 |
| 越权: `/school-admin/dashboard` ✅ | 401 拒绝 |
| `reset-all` 接口 ⚠️ | 存在但审计中跳过了调用（会清空全库） |

### 2. 学校管理员
| 项目 | 结果 |
|------|------|
| 登录 `/school-admin/login` ✅ | sa1/123456 正常 |
| Dashboard ✅ | 教师5人，班级2个 |
| 教师列表 ✅ | 正常返回 |
| 概览统计 ❌ | 需检查视图逻辑 |
| 越权: `/admin/schools` ✅ | 401 拒绝 |
| 越权: `/todos` (教师端) ⚠️ | 返回 200，未拒绝 |

### 3. 班主任 (teacher1 王老师)
| 项目 | 结果 |
|------|------|
| 登录 ✅ | 返回用户信息完整 |
| 33 个业务端点 ✅ | **全部正常返回数据** |
| CRUD 待办 ✅ | 创建成功 |
| 家长登录开关 ✅ | 接口可调用 |

### 4. 任课教师 (teacher3 张老师)
| 项目 | 结果 |
|------|------|
| 登录 ✅ | 正常 |
| 待办/课表 ✅ | 数据隔离正确 (不会看到 teacher1 的数据) |

### 5. 家长
| 项目 | 结果 |
|------|------|
| 学号+密码登录 ❌ | 需要微信 code (`auth/bind-by-number`), 本地环境无法微信登录 |
| 替代: 密码登录 `password-login` | 正常 |
| 通知/作业查看 | 正常 |

---

## 🔴 关键发现

### 发现1: JwtAuthGuard 无角色校验 (严重)
`JwtAuthGuard` 只验证 token 合法性，**不检查 `role` 字段**。结果：
- 超管 token (role=super) → 可以调用教师端点 → 返回0条数据（不会拒绝）
- 校管 token (role=school_admin) → 同上
- 任何有效 JWT 都可以访问教师 CRUD

**影响**：如果超管/校管的 JWT 被窃取或泄露，攻击者可以访问所有教师数据。

**建议修复**：在 `JwtAuthGuard` 或每个 `@UseGuards()` 处增加角色校验：
```typescript
// jwt-auth.guard.ts 增加可选角色参数
canActivate(context: ExecutionContext): boolean {
  const req = context.switchToHttp().getRequest()
  // ... 现有 token 校验 ...
  const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler())
  if (requiredRoles && !requiredRoles.includes(payload.role))
    throw new UnauthorizedException('权限不足')
  return true
}
```

### 发现2: `reset-all` 端点无确认机制 (中)
`POST /admin/reset-all` 会 `DELETE FROM users` + `DELETE FROM school_admins` + 所有业务表。无二次确认，误调则全库核心账号丢失。

**建议**：增加确认参数 `{ confirm: true }` 或二次弹窗。

### 发现3: 数据丢失风险 (中)
服务重启后 TypeORM `synchronize` 维持表结构，但种子数据**不会自动重建**。如果 `reset-all` 被触发或无意的数据清空发生，需要手动运行种子脚本恢复账号。

**建议**：在 `onModuleInit` 中增加管理员账号自动检测与创建，或使用 TypeORM Migration 管理初始数据。

---

## 审计结论

| 维度 | 评价 |
|------|------|
| 功能完整性 | ✅ 超管/校管/班主任/任课教师 四大角色功能基本完整 |
| 权限隔离 | ⚠️ 教师端缺少角色守卫，超管和校管 token 可通行 |
| 数据隔离 | ✅ 教师间天然 teacherId 隔离，互不可见 |
| 用户体验 | ✅ 班主任 33 端点全可用；待办/通知/课表等日常功能正常 |
| 安全性 | ⚠️ JwtAuthGuard 缺角色校验，属设计缺陷 |
| 部署就绪 | ❌ 种子数据需手动维护，无启动自动恢复机制 |
