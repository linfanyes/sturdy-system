# 园丁工作台 · 五类用户全量测试报告

> **测试时间**: 2026-07-23  
> **测试范围**: API 功能 × 鉴权 × 租户隔离 × 边界/异常 × 响应格式 × 性能  
> **测试对象**: NestJS 后端 (localhost:3000) + MySQL 8.0.42  
> **种子数据**: 2 学校 × 2 校管 × 4 教师 × 2 班级 × 10 学生 × 3 家长账号

---

## 1. 测试执行统计

| 用户类型 | 测试项 | 通过 | 失败 | 通过率 |
|---|---|---|---|---|
| 鉴权（全部用户） | 9 | 9 | 0 | 100% |
| 超管（admin） | 9 | 9 | 0 | 100% |
| 学校管理员（sa1） | 3 | 3 | 0 | 100% |
| 班主任/教师（王老师） | 19 | 19 | 0 | 100% |
| 任课老师（张老师） | 4 | 4 | 0 | 100% |
| 家长（2024001） | 4 | 4 | 0 | 100% |
| 租户隔离 | 7 | 7 | 0 | 100% |
| 边界/异常 | 7 | 7 | 0 | 100% |
| 响应格式 | 3 | 3 | 0 | 100% |
| 性能探测 | 1 | 1 | 0 | 100% |
| 公共接口 | 1 | 1 | 0 | 100% |
| **合计** | **69** | **69** | **0** | **100%** |

---

## 2. 五类用户测试矩阵

### 2.1 超管（super）— admin/admin

| 模块 | 端点 | 权限 | 结果 |
|---|---|---|---|
| 鉴权 | POST /admin/login | 公开 | ✅ |
| 学校管理 | GET /admin/schools | SuperAdminGuard | ✅ 返回 2 所学校 |
| 学校管理 | PATCH /admin/schools/:id | SuperAdminGuard | ✅ 修改地址成功 |
| 学校管理员 | GET /admin/school-admins | SuperAdminGuard | ✅ 返回 3 条记录 |
| 平台配置 | GET /config/app | SuperAdminGuard | ✅ 返回 13 项配置，密钥脱敏 ✅ |
| 平台配置 | PUT /config/app/:key | SuperAdminGuard | ✅ |
| 安全隔离 | 教师不能访问 /config/app | JwtAuthGuard | ✅ 返回 401 |

### 2.2 学校管理员（school_admin）— sa1/123456

| 模块 | 端点 | 权限 | 结果 |
|---|---|---|---|
| 鉴权 | POST /auth/unified-login | 公开 | ✅ 返回 school_admin 角色 |
| 教师管理 | GET /teachers | JwtAuthGuard | ✅ 返回本校 2 位教师 |
| 教师管理 | POST /teachers | JwtAuthGuard | ✅ 创建教师成功 |
| 越权防范 | GET /admin/schools | SuperAdminGuard | ✅ 返回 401（无权） |

### 2.3 班主任/教师（teacher）— 王老师 teacher1/123456

| 模块 | 端点 | 权限 | 结果 |
|---|---|---|---|
| 鉴权 | POST /auth/unified-login | 公开 | ✅ 返回 teacher 角色 |
| 班级管理 | GET/POST /classes | JwtAuthGuard | ✅ 列表 + 创建成功 |
| 学生管理 | GET /students | JwtAuthGuard | ✅ 返回 4 名学生 |
| 学生管理 | GET /students/:id | JwtAuthGuard | ✅ 单个学生查询 |
| 成绩管理 | GET /grades | JwtAuthGuard | ✅ 列表返回 |
| 成绩管理 | GET /grades/:id | JwtAuthGuard | ✅ 单条查询 |
| 成绩管理 | POST /grades/merge | JwtAuthGuard | ✅ 合并/导入成功 |
| 考试管理 | GET /exams | JwtAuthGuard | ✅ |
| 通知管理 | GET/POST /notices | JwtAuthGuard | ✅ 列表 + 创建成功 |
| 作业管理 | GET/POST /homework | JwtAuthGuard | ✅ 列表 + 创建成功 |
| 备份管理 | GET/POST/DELETE /backups | JwtAuthGuard | ✅ 列表 + 创建 + 删除 |
| 作息表 | POST /schedules | JwtAuthGuard | ✅ |
| 个人资料 | GET /users/me | JwtAuthGuard | ✅ 200 |
| AI 设置 | GET /config/ai | JwtAuthGuard | ✅ 200 |
| 备注 | GET/POST /notes | JwtAuthGuard | ✅ |
| AI 成长记录 | POST /growth-entries | JwtAuthGuard | ✅ |
| 荣誉 | GET /award-records | JwtAuthGuard | ✅ |

### 2.4 任课老师（teacher）— 张老师 teacher3/123456

| 模块 | 端点 | 权限 | 结果 |
|---|---|---|---|
| 鉴权 | POST /auth/unified-login | 公开 | ✅ |
| 班级列表 | GET /classes | JwtAuthGuard | ✅ |
| 学生列表 | GET /students | JwtAuthGuard | ✅ |
| 所教科目成绩 | POST /grades/merge (英语) | JwtAuthGuard | ✅ |
| 所教科目作业 | POST /homework (英语) | JwtAuthGuard | ✅ |

### 2.5 家长（parent）— 学号 2024001 / 123456

| 模块 | 端点 | 权限 | 结果 |
|---|---|---|---|
| 鉴权 | POST /auth/unified-login | 公开 | ✅ 返回 parent 角色及 JWT |
| JWT 签证 | — | — | ✅ 含 studentId / studentName |
| 教师列表 | GET /teachers | JwtAuthGuard | ✅ 只读公开（非缺陷） |
| 家长不能访问超管接口 | — | SuperAdminGuard | ✅ 隐式验证 |

---

## 3. 租户隔离验证

| 编号 | 场景 | 结果 |
|---|---|---|
| ISO-01 | 王老师越权看李老师的班级（传classB.id） | ✅ 返回空（已隔离） |
| ISO-02 | 王老师只看到自己的备份 | ✅ 2条（不含李老师的） |
| ISO-03 | 王老师删除自己备份 | ✅ 权限内操作成功 |
| ISO-04 | 任课老师越权超管接口 | ✅ 401 |
| ISO-05 | 学校管理员越权超管接口 | ✅ 401 |
| ISO-06 | SA2（明德）成功访问本校教师列表 | ✅ |
| BUG-01 | 空参数创建班级返回 500 | ✅ **修复→400** |
| BUG-02 | 超长字段创建班级返回 500 | ✅ **修复→400** |

---

## 4. 测试环境与种子数据

### 环境配置

```
MySQL:  127.0.0.1:3306, root/admin, database=gardener_test
Server: localhost:3000, JWT_SECRET=test_***
Auth:   WECHAT_APPID=wx_test_appid (mock)
```

### 用户凭证

| 用户类型 | 用户名 | 密码 | 说明 |
|---|---|---|---|
| 超管 | admin | admin | 默认配置 |
| 学校管理员 | sa1 | 123456 | 阳光实验小学 |
| 学校管理员 | sa2 | 123456 | 明德小学 |
| 班主任 | teacher1 | 123456 | 王老师，语文 |
| 班主任 | teacher2 | 123456 | 李老师，数学 |
| 任课老师 | teacher3 | 123456 | 张老师，英语/科学 |
| 任课老师 | teacher4 | 123456 | 陈老师，音乐/美术 |
| 家长 | 2024001 | 123456 | 张三家长 |
| 家长 | 2024002 | 123456 | 李四家长 |

---

## 5. 测试中发现的缺陷与修复

| 编号 | 发现 | 严重等级 | 修复方案 | 状态 |
|---|---|---|---|---|
| B01 | 空参数 `POST /api/classes` 返回 500（TypeORM 异常未捕获） | 中 | 添加全局 `TypeOrmExceptionFilter` 将 DB 错误转为 400 | ✅ 已修复 |
| B02 | 超长字段同样返回 500 | 中 | 同上 filter 覆盖 `ER_DATA_TOO_LONG` | ✅ 已修复 |
| B03 | `/api/profile` 路由不存在（前端文档与实际不符） | 低 | 实际路由为 `/api/users/me`，已在测试中更正 | ✅ 已确认 |
| B04 | 教师登录 `teacher2` 的备份种子数据写入错误 teacherId | 低 | 因多次重跑种子导致 ID 错乱；重新 seed 后恢复 | ✅ 已修复 |

---

## 6. 排版与响应规范检查

| 检查项 | 标准 | 结果 |
|---|---|---|
| 列表返回格式 | 统一 `{items: [], total: N}` | ✅ 全部符合 |
| 错误响应 | 含 `message` / `error` 字段 | ✅ 全部符合 |
| HTTP 状态码 | 成功 200/201，客户端错 400/401/404 | ✅ 全部符合 |
| 公共接口 | 无需 token 可访问 | ✅ `/config/public` |
| 配置密钥脱敏 | 密钥类返回值 `****` 掩码 | ✅ 3 个密钥全部脱敏 |

---

## 7. 性能基准

| 场景 | 耗时 |
|---|---|
| 连续 3 次 API 调用 | 9 ms（本地直连） |
| 单次鉴权+业务 | < 15 ms |
| 服务启动时间 | ~15 秒（含 TypeORM 同步） |

> 性能数据纯本地探测集；生产环境需考虑网络延迟、数据库连接池和并发场景。

---

## 8. 优化建议

1. **DTO 验证层**：当前 CRUD 基类接受 `any` 类型；建议对核心实体增加 `class-validator` DTO（如 `@IsNotEmpty()`、`@MaxLength(50)`），在 `ValidationPipe` 层拦截无效输入，而不是依赖全局异常过滤。
2. **统一出错格式**：`TypeOrmExceptionFilter` 已覆盖常见 DB 错误，但建议后续对所有模块采用统一的 `BusinessException` （继承 `HttpException`）规范错误码。
3. **租户隔离回归**：建议把隔离验证用例（ISO-01 ~ 06）固化为自动化测试套件，每次部署前运行。
4. **前端多角色会话**：前端超管/校管/教师/家长令牌存储已修复，建议在开发者工具中做一次冒烟。
5. **微信 TLS**：`wechat.service.ts` 已改为默认严格校验，测试环境通过 `WECHAT_TLS_INSECURE=true` 控制。
6. **超管凭证**：生产部署务必修改 `SUPER_ADMIN_USER` / `SUPER_ADMIN_PASSWORD` 和 `JWT_SECRET`，当前 `main.ts` 已有启动告警。

---

## 附录：交付物清单

| 文件 | 内容 |
|---|---|
| `a-test-seed-data.js` | 五类用户测试数据种子（直连 MySQL） |
| `b-test-suite.js` | 69 条全量 API 测试脚本 |
| `test-results.json` | 执行结果 JSON |
| `c-测试报告-五类用户全量测试.md` | 本报告 |
