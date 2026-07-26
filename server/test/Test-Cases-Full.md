# 后端服务 全量测试用例文档

> 生成时间：2026-07-26 | 基于 PRD：Audit-PRD.md | 测试框架：Jest + Supertest + TypeORM (SQLite 内存库)

---

## 1. 测试用例总览

| 模块 | 单元测试 | 集成测试 | E2E测试 | 总计 |
|------|---------|---------|---------|------|
| DTO验证 | 45 | - | - | 45 |
| 租户隔离 | 14 | - | - | 14 |
| 异常过滤器 | 12 | - | - | 12 |
| Guard权限 | 8 | - | - | 8 |
| 认证全流程 | - | 25 | - | 25 |
| 班级CRUD | - | 22 | - | 22 |
| 学生CRUD | - | 24 | - | 24 |
| 成绩/考试 | - | 26 | - | 26 |
| 作业全流程 | - | 28 | - | 28 |
| AI工具调用 | - | 18 | - | 18 |
| 学校/校管管理 | 15 | 10 | - | 25 |
| 教师管理 | 12 | 8 | - | 20 |
| 公告通知 | 8 | 6 | - | 14 |
| 课表管理 | 6 | 4 | - | 10 |
| 考勤管理 | 8 | 5 | - | 13 |
| 资源库 | 6 | 4 | - | 10 |
| 成长档案 | 5 | 3 | - | 8 |
| 行为观察 | 5 | 3 | - | 8 |
| 家长联系 | 4 | 3 | - | 7 |
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
| 家访路线 | 3 | 2 | - | 5 |
| 阅读记录 | 3 | 2 | - | 5 |
| 座位表/分组 | 4 | 3 | - | 7 |
| 备份/配置/审计 | 8 | 5 | - | 13 |
| **总计** | **238** | **227** | **0** | **465** |

---

## 2. 结构化用例表

### 2.1 DTO 验证测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-DTO-001 | CreateClassDto_合法数据_验证通过 | 正常流 | P0 | - | 1.调用validateSync(dto) | grade='三年级', classNo='2' | 无错误 | P0-04 |
| TC-SRV-DTO-002 | CreateClassDto_非法年级_返回验证错误 | 异常流 | P0 | - | 1.传入grade='幼儿园' | grade='幼儿园' | ValidationError含grade | P0-04 |
| TC-SRV-DTO-003 | CreateClassDto_手机号格式错误_返回错误 | 异常流 | P0 | - | 1.传入phone='123' | phone='123' | ValidationError含phone | P0-04 |
| TC-SRV-DTO-004 | CreateClassDto_手机号为空_宽松模式通过 | 边界条件 | P0 | - | 1.传入phone='' | phone='' | 无phone错误 | P0-04 |
| TC-SRV-DTO-005 | CreateStudentDto_学号唯一_通过 | 正常流 | P0 | - | 1.传入唯一学号 | studentNo='S2024001' | 无错误 | P0-04 |
| TC-SRV-DTO-006 | CreateStudentDto_学号重复_数据库层面约束 | 边界条件 | P1 | 已有相同学号 | 1.尝试插入重复 | studentNo='S2024001' | DB抛出唯一约束错误 | P0-05 |
| TC-SRV-DTO-007 | CreateExamDto_科目必须在SUBJECT_VALUES中 | 正常流 | P0 | - | 1.传入subjects=['语文','数学'] | subjects in SUBJECT_VALUES | 无错误 | P0-02 |
| TC-SRV-DTO-008 | CreateExamDto_非法科目_返回错误 | 异常流 | P0 | - | 1.传入subjects=['编程'] | subjects not in list | ValidationError | P0-02 |
| TC-SRV-DTO-009 | CreateGradeDto_分值范围0-150_验证通过 | 正常流 | P0 | - | 1.传入score=95 | score=95 | 无错误 | P0-04 |
| TC-SRV-DTO-010 | CreateGradeDto_分值超范围_返回错误 | 异常流 | P0 | - | 1.传入score=151 | score=151 | ValidationError | P0-04 |
| TC-SRV-DTO-011 | CreateHomeworkDto_截止日期不早于开始日期 | 正常流 | P0 | - | 1.deadline >= startDate | valid dates | 无错误 | P0-04 |
| TC-SRV-DTO-012 | CreateHomeworkDto_截止早于开始_返回错误 | 异常流 | P0 | - | 1.deadline < startDate | invalid dates | ValidationError | P0-04 |
| TC-SRV-DTO-013 | LoginDto_用户名密码必填 | 正常流 | P0 | - | 1.传入username/password | admin/admin | 无错误 | P0-03 |
| TC-SRV-DTO-014 | LoginDto_缺失字段_返回错误 | 异常流 | P0 | - | 1.仅传username | {username:'admin'} | ValidationError | P0-03 |
| TC-SRV-DTO-015 | 共享常量对齐_PHONE_REGEX与shared完全一致 | 正常流 | P0 | - | 1.对比导入的PHONE_REGEX | /^1[3-9]\d{9}$/ | 完全一致 | P0-02 |

---

### 2.2 租户隔离测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-ISO-001 | 列表查询_默认按teacherId严格隔离 | 正常流 | P0 | 两教师各有数据 | 1.teacherA查列表 | teacherA token | 仅返回teacherA数据 | P0-04 |
| TC-SRV-ISO-002 | 查询单条_越权访问他人记录_返回404不泄露 | 安全 | P0 | teacherB有id=5记录 | 1.teacherA查id=5 | teacherA token, id=5 | 404 NOT_FOUND | P0-04 |
| TC-SRV-ISO-003 | 创建_强制注入teacherId_忽略传入伪造值 | 安全 | P0 | teacherA创建 | 1.传入teacherId=999 | {teacherId:999} | 保存记录teacherId=teacherA | P0-04 |
| TC-SRV-ISO-004 | 更新/删除_走findOne校验_越权抛404 | 安全 | P0 | teacherB有记录 | 1.teacherA更新id=5 | teacherA token | 404 | P0-04 |
| TC-SRV-ISO-005 | 班级维度_未指定classId_按可访问班级集合过滤 | 正常流 | P0 | teacherA教班级1/2 | 1.teacherA查学生列表 | teacherA token | 仅班级1/2学生 | P0-04 |
| TC-SRV-ISO-006 | 班级维度_可访问班级为空_返回空列表不查库 | 边界条件 | P0 | teacher无班级 | 1.teacherC查学生 | teacherC token | [], 不执行SQL | P0-04 |
| TC-SRV-ISO-007 | 班级维度_查询单条_校验班级访问权限_越权404 | 安全 | P0 | 学生属于班级3 | 1.teacherA查该学生 | teacherA token | 404 | P0-04 |
| TC-SRV-ISO-008 | 校管隔离_仅本校数据_跨校隔离 | 正常流 | P0 | 两校各有数据 | 1.schoolAdminA查 | schoolAdminA token | 仅校A数据 | P0-04 |
| TC-SRV-ISO-009 | 超管隔离_全量数据_无限制 | 正常流 | P0 | 多校数据 | 1.super查列表 | super token | 全量数据 | P0-04 |
| TC-SRV-ISO-010 | 家长隔离_仅自家孩子数据 | 正常流 | P0 | 家长绑定学生1 | 1.parent查成绩 | parent token | 仅学生1成绩 | P0-04 |
| TC-SRV-ISO-011 | BackupService_list_仅当前教师备份 | 正常流 | P0 | 教师各有备份 | 1.teacherA list | teacherA token | 仅teacherA备份 | P0-04 |
| TC-SRV-ISO-012 | BackupService_get_按{id,teacherId}查询 | 正常流 | P0 | teacherB有备份id=1 | 1.teacherA查id=1 | teacherA token, id=1 | 返回null | P0-04 |
| TC-SRV-ISO-013 | BackupService_remove_按{id,teacherId}删除 | 正常流 | P0 | teacherB有备份 | 1.teacherA删id=1 | teacherA token | 删除失败/不影响 | P0-04 |
| TC-SRV-ISO-014 | 并发隔离_同一教师并发请求_数据一致 | 边界条件 | P1 | 并发场景 | 1.并发读写 | concurrent | 无数据竞争 | P0-05 |

---

### 2.3 异常过滤器测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-EXC-001 | BusinessException_自定义错误码_返回标准格式 | 正常流 | P0 | 抛出BusinessException | 1.throw new BusinessException('ERR_CODE', 'msg') | code='ERR_CODE' | {code, message, statusCode, timestamp} | P0-06 |
| TC-SRV-EXC-002 | ValidationException_类验证失败_返回422详细字段错误 | 正常流 | P0 | DTO验证失败 | 1.触发ValidationPipe | invalid dto | 422, errors字段级错误 | P0-06 |
| TC-SRV-EXC-003 | EntityNotFound_TypeORM未找到_返回404标准格式 | 正常流 | P0 | 查询不存在实体 | 1.repo.findOneOrFail不存在 | not found | 404, NOT_FOUND | P0-06 |
| TC-SRV-EXC-004 | QueryFailed_唯一约束冲突_返回409_CONFLICT | 正常流 | P0 | 插入重复唯一键 | 1.插入重复studentNo | duplicate | 409, CONFLICT | P0-06 |
| TC-SRV-EXC-005 | JwtExpired_Token过期_返回401_UNAUTHORIZED | 正常流 | P0 | 携带过期token | 1.访问受保护接口 | expired token | 401, UNAUTHORIZED | P0-06 |
| TC-SRV-EXC-006 | JwtInvalid_Token无效/篡改_返回401 | 正常流 | P0 | 携带无效token | 1.访问受保护接口 | invalid token | 401, UNAUTHORIZED | P0-06 |
| TC-SRV-EXC-007 | Forbidden_角色权限不足_返回403_FORBIDDEN | 正常流 | P0 | parent访问教师接口 | 1.parent token访问 | parent token | 403, FORBIDDEN | P0-04 |
| TC-SRV-EXC-008 | Throttle_超限_返回429_TOO_MANY_REQUESTS | 正常流 | P1 | 短时间大量请求 | 1.61次/分钟请求 | burst requests | 429, TOO_MANY_REQUESTS | P0-06 |
| TC-SRV-EXC-009 | InternalError_未捕获异常_返回500不泄露堆栈 | 安全 | P0 | 抛出未知Error | 1.throw new Error('internal') | unhandled | 500, INTERNAL_ERROR, 无stack | P0-06 |
| TC-SRV-EXC-010 | 统一错误格式_所有错误含code/message/timestamp | 正常流 | P0 | 触发各类错误 | 1.验证响应结构 | all errors | 字段完整 | P0-06 |
| TC-SRV-EXC-011 | 错误码枚举_覆盖所有业务错误场景 | 正常流 | P1 | 错误码注册表 | 1.验证枚举完整性 | error codes | 无遗漏 | P0-06 |
| TC-SRV-EXC-012 | 国际化错误消息_中英文切换 | 正常流 | P2 | Accept-Language头 | 1.请求en/zh | headers | 对应语言消息 | - |

---

### 2.4 Guard 权限测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-GRD-001 | JwtAuthGuard_有效token_放行附带user | 正常流 | P0 | 有效token | 1.携带token请求 | valid token | req.user存在 | P0-04 |
| TC-SRV-GRD-002 | JwtAuthGuard_无token_拦截401 | 安全 | P0 | 无token | 1.无Authorization头 | - | 401 | P0-04 |
| TC-SRV-GRD-003 | RolesGuard_super角色_通过所有校验 | 正常流 | P0 | super token | 1.访问任意受保护接口 | super token | 200 | P0-04 |
| TC-SRV-GRD-004 | RolesGuard_schoolAdmin_仅校管接口 | 正常流 | P0 | school_admin token | 1.访问校管/教师/家长接口 | sa token | 校管200, 其他403 | P0-04 |
| TC-SRV-GRD-005 | RolesGuard_teacher_仅教师接口 | 正常流 | P0 | teacher token | 1.访问教师/校管接口 | teacher token | 教师200, 校管403 | P0-04 |
| TC-SRV-GRD-006 | RolesGuard_parent_仅家长接口 | 正常流 | P0 | parent token | 1.访问家长/教师接口 | parent token | 家长200, 教师403 | P0-04 |
| TC-SRV-GRD-007 | TeacherGuard_验证教师身份_附带teacherId | 正常流 | P0 | teacher token | 1.访问教师接口 | teacher token | req.teacherId存在 | P0-04 |
| TC-SRV-GRD-008 | SchoolAdminGuard_验证校管身份_附带schoolId | 正常流 | P0 | school_admin token | 1.访问校管接口 | sa token | req.schoolId存在 | P0-04 |

---

### 2.5 认证全流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-AUTH-001 | POST /api/auth/login_超管登录_返回token含role=super | 正常流 | P0 | 系统初始化 | 1.POST /api/auth/login {username:'admin',password:'admin'} | admin/admin | 200, token, role=super | P0-03 |
| TC-SRV-AUTH-002 | POST /api/auth/login_校管登录_role=school_admin含schoolId | 正常流 | P0 | 校管账号存在 | 1.POST login校管凭据 | admin01/Admin@123 | 200, role=school_admin, schoolId | P0-03 |
| TC-SRV-AUTH-003 | POST /api/auth/login_教师登录_role=teacher含features | 正常流 | P0 | 教师账号存在 | 1.POST login教师凭据 | teacher01/Teacher@123 | 200, role=teacher, features | P0-03 |
| TC-SRV-AUTH-004 | POST /api/auth/login_家长登录_role=parent含studentId | 正常流 | P0 | 家长账号存在 | 1.POST login家长凭据 | parent01/123456 | 200, role=parent, studentId | P0-03 |
| TC-SRV-AUTH-005 | POST /api/auth/login_错误密码_返回401密码错误 | 异常流 | P0 | 账号存在 | 1.POST login错误密码 | admin/wrong | 401, message含密码错误 | P0-03 |
| TC-SRV-AUTH-006 | POST /api/auth/login_不存在账号_返回401账号不存在 | 异常流 | P0 | 账号不存在 | 1.POST login不存在账号 | notexist/admin | 401 | P0-03 |
| TC-SRV-AUTH-007 | POST /api/auth/register_注册新教师_密码强度校验 | 正常流 | P1 | 开放注册 | 1.POST register教师数据 | valid teacher data | 201, 创建成功 | P0-03 |
| TC-SRV-AUTH-008 | POST /api/auth/register_弱密码_返回422密码强度不足 | 异常流 | P1 | 开放注册 | 1.POST register弱密码 | password='123' | 422, 密码强度错误 | P0-06 |
| TC-SRV-AUTH-009 | POST /api/auth/register_手机号重复_返回409手机号已存在 | 异常流 | P1 | 手机号已注册 | 1.POST register重复手机号 | phone=13800138000 | 409, 手机号已存在 | P0-04 |
| TC-SRV-AUTH-010 | GET /api/auth/profile_携带有效token_返回完整用户档案 | 正常流 | P0 | 已登录 | 1.GET profile携带token | valid token | 200, 含id/name/role/features/schoolId | P0-03 |
| TC-SRV-AUTH-011 | GET /api/auth/profile_无token_返回401 | 安全 | P0 | 未登录 | 1.GET profile无token | - | 401 | P0-03 |
| TC-SRV-AUTH-012 | GET /api/auth/profile_过期token_返回401 | 安全 | P0 | token过期 | 1.GET profile携带过期token | expired token | 401 | P0-03 |
| TC-SRV-AUTH-013 | POST /api/auth/refresh_有效refresh_token_签发新access_token | 正常流 | P0 | 有refresh_token | 1.POST refresh | valid refresh | 200, 新access_token | P0-03 |
| TC-SRV-AUTH-014 | POST /api/auth/refresh_无效refresh_返回401 | 异常流 | P0 | 无效refresh | 1.POST refresh | invalid refresh | 401 | P0-03 |
| TC-SRV-AUTH-015 | POST /api/auth/logout_登出_加入黑名单/清除token | 正常流 | P0 | 已登录 | 1.POST logout | valid token | 200, token失效 | P0-03 |
| TC-SRV-AUTH-016 | 并发登录_同一账号多地登录_策略一致(踢下线/共存) | 边界条件 | P1 | 并发场景 | 1.同账号两地登录 | concurrent login | 按策略处理 | P0-05 |
| TC-SRV-AUTH-017 | 微信登录_教师_openid绑定_签发wechat_token | 正常流 | P0 | 微信授权码 | 1.POST /api/auth/wechat/teacher | code, openid | 200, wechat_token | P0-03 |
| TC-SRV-AUTH-018 | 微信登录_家长_openid+student绑定_签发wechat_token | 正常流 | P0 | 微信授权码 | 1.POST /api/auth/wechat/parent | code, openid, studentId | 200, wechat_token | P0-03 |
| TC-SRV-AUTH-019 | 密码修改_旧密码正确_更新成功 | 正常流 | P0 | 已登录 | 1.POST change-password | old/new password | 200, 新密码生效 | P0-03 |
| TC-SRV-AUTH-020 | 密码修改_旧密码错误_返回400 | 异常流 | P0 | 已登录 | 1.POST change-password错误旧密码 | wrong old | 400 | P0-03 |
| TC-SRV-AUTH-021 | 忘记密码_手机验证码重置_流程完整 | 正常流 | P1 | 手机验证码 | 1.发送验证码 2.重置密码 | phone, code, newPwd | 200, 密码更新 | P0-03 |
| TC-SRV-AUTH-022 | 共享常量对齐_登录DTO手机号用PHONE_REGEX | 正常流 | P0 | - | 1.验证LoginDto装饰器 | @Matches(PHONE_REGEX) | 与shared完全一致 | P0-02 |
| TC-SRV-AUTH-023 | 共享常量对齐_角色枚举用ROLE_VALUES | 正常流 | P0 | - | 1.验证RolesGuard roles | ROLE_VALUES | 与shared完全一致 | P0-02 |
| TC-SRV-AUTH-024 | 共享常量对齐_教师features用FEATURE_FLAGS_SET | 正常流 | P0 | - | 1.验证feature校验 | FEATURE_FLAGS_SET | 与shared完全一致 | P0-02 |
| TC-SRV-AUTH-025 | Token黑名单_登出后token无法刷新/访问 | 安全 | P0 | 已登出 | 1.登出后用旧token访问 | blacklisted token | 401 | P0-06 |

---

### 2.6 班级 CRUD 集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-CLS-001 | POST /api/classes_创建班级_年级+序号生成标准名 | 正常流 | P0 | 校管登录 | 1.POST {grade:'三年级', classNo:'2', headTeacherId:3} | grade/classNo | 201, name='三年级2班', classNo=2 | P0-01 |
| TC-SRV-CLS-002 | POST /api/classes_创建班级_手机号校验用PHONE_REGEX | 正常流 | P0 | 校管登录 | 1.POST含phone字段 | phone=13800138000 | 201, 校验通过 | P0-04 |
| TC-SRV-CLS-003 | POST /api/classes_非法年级_返回422 | 异常流 | P0 | 校管登录 | 1.POST grade='幼儿园' | invalid grade | 422 | P0-04 |
| TC-SRV-CLS-004 | POST /api/classes_班主任不存在_返回404 | 异常流 | P0 | 校管登录 | 1.POST headTeacherId=999 | not exist | 404 | P0-04 |
| TC-SRV-CLS-005 | GET /api/classes_列表_分页/搜索/年级筛选 | 正常流 | P0 | 有班级数据 | 1.GET ?page=1&size=10&keyword=三&grade=三年级 | query params | 200, 分页数据, 筛选正确 | P0-01 |
| TC-SRV-CLS-006 | GET /api/classes_校管仅看本校_跨校隔离 | 安全 | P0 | 两校数据 | 1.校管A查列表 | saA token | 仅校A班级 | P0-04 |
| TC-SRV-CLS-007 | GET /api/classes_教师仅看任教班级_权限隔离 | 安全 | P0 | 教师任教班级1 | 1.教师查列表 | teacher token | 仅班级1 | P0-04 |
| TC-SRV-CLS-008 | GET /api/classes/:id_详情_含学生数/任教教师/班主任 | 正常流 | P0 | 班级存在 | 1.GET /api/classes/1 | id=1 | 200, 完整详情 | P0-01 |
| TC-SRV-CLS-009 | GET /api/classes/:id_不存在_返回404 | 异常流 | P0 | 班级不存在 | 1.GET /api/classes/999 | id=999 | 404 | P0-01 |
| TC-SRV-CLS-010 | PATCH /api/classes/:id_编辑班级_年级变更触发名重生成 | 正常流 | P0 | 班级存在 | 1.PATCH {grade:'四年级'} | grade change | 200, name='四年级2班' | P0-04 |
| TC-SRV-CLS-011 | PATCH /api/classes/:id_班主任变更_发送通知/更新关联 | 正常流 | P0 | 班级存在 | 1.PATCH {headTeacherId:5} | new head | 200, 班主任更新 | P0-01 |
| TC-SRV-CLS-012 | PATCH /api/classes/:id_教师无权编辑_返回403 | 安全 | P0 | 教师非班主任 | 1.教师PATCH班级 | teacher token | 403 | P0-04 |
| TC-SRV-CLS-013 | DELETE /api/classes/:id_删除班级_有学生时阻止_返回409 | 异常流 | P0 | 班级有学生 | 1.DELETE班级 | has students | 409, 不能删除有学生班级 | P0-05 |
| TC-SRV-CLS-014 | DELETE /api/classes/:id_无学生_删除成功_级联清理关联 | 正常流 | P0 | 空班级 | 1.DELETE空班级 | empty class | 200, 关联清理 | P0-05 |
| TC-SRV-CLS-015 | 权限矩阵_超管全权/校管本校/教师仅读/家长不可见 | 正常流 | P0 | 四角色 | 1.各角色操作 | all roles | 矩阵验证通过 | P0-04 |
| TC-SRV-CLS-016 | 批量创建_Excel导入_事务回滚/错误行跳过 | 正常流 | P1 | Excel文件 | 1.POST /api/classes/import | excel buffer | 200, 成功数/失败数 | P0-01 |
| TC-SRV-CLS-017 | 班级学生数统计_实时更新_增删学生触发 | 正常流 | P1 | 班级存在 | 1.增/删学生 2.查班级 | student changes | studentCount实时 | P0-05 |
| TC-SRV-CLS-018 | 共享常量对齐_生成名用generateClassName_校验用CLASS_NAMING_RULE | 正常流 | P0 | - | 1.验证Service调用shared | generateClassName/pattern | 与shared完全一致 | P0-02 |
| TC-SRV-CLS-019 | 并发创建_同年级同序号_唯一约束/乐观锁 | 边界条件 | P1 | 并发 | 1.并发POST同grade/classNo | concurrent | 仅一条成功 | P0-05 |
| TC-SRV-CLS-020 | 班级归档_软删除_列表不显示/详情可访问 | 正常流 | P1 | 班级存在 | 1.PATCH archive=true | archive | 200, 列表隐藏 | P0-01 |
| TC-SRV-CLS-021 | 学期切换_班级按学期隔离_跨学期不冲突 | 正常流 | P1 | 多学期 | 1.查不同时期班级 | term filter | 数据隔离 | P0-01 |
| TC-SRV-CLS-022 | 导出班级名单_Excel_含学生/家长信息 | 正常流 | P1 | 班级有学生 | 1.GET /api/classes/1/export | export | 200, 触发下载 | P0-01 |

---

### 2.7 学生 CRUD 集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-STU-001 | POST /api/students_创建学生_学号唯一/班级关联/家长手机关联 | 正常流 | P0 | 班级存在 | 1.POST {studentNo:'S2024001', classId:1, parentPhone:'13800138000'} | valid student | 201, 关联家长/班级 | P0-01 |
| TC-SRV-STU-002 | POST /api/students_学号重复_返回409 | 异常流 | P0 | 已有学号 | 1.POST重复studentNo | duplicate | 409 | P0-05 |
| TC-SRV-STU-003 | POST /api/students_班级不存在_返回404 | 异常流 | P0 | 班级不存在 | 1.POST classId=999 | not exist | 404 | P0-04 |
| TC-SRV-STU-004 | GET /api/students_列表_班级筛选/姓名学号搜索/导出 | 正常流 | P0 | 有学生数据 | 1.GET ?classId=1&keyword=小明 | query | 200, 筛选正确 | P0-01 |
| TC-SRV-STU-005 | GET /api/students/:id_详情_档案/成绩/考勤/作业/奖惩聚合 | 正常流 | P0 | 学生存在 | 1.GET /api/students/1 | id=1 | 200, 聚合数据完整 | P0-01 |
| TC-SRV-STU-006 | PATCH /api/students/:id_编辑学生_班级调整触发统计更新 | 正常流 | P0 | 学生存在 | 1.PATCH {classId:2} | class change | 200, 两班级统计更新 | P0-05 |
| TC-SRV-STU-007 | DELETE /api/students/:id_软删除_关联数据保留 | 正常流 | P0 | 学生存在 | 1.DELETE学生 | id=1 | 200, deletedAt设置, 关联保留 | P0-05 |
| TC-SRV-STU-008 | 批量导入_Excel模板_校验/事务回滚/错误行报告 | 正常流 | P1 | Excel文件 | 1.POST /api/students/import | excel | 200, 成功/失败报告 | P0-01 |
| TC-SRV-STU-009 | 家长关联_一个学生多家长/一个家长多学生_正确建立 | 正常流 | P1 | 多家长场景 | 1.建立多对多 | parent-student | 关联正确 | P0-01 |
| TC-SRV-STU-010 | 学生画像_聚合成绩趋势/考勤率/作业完成率/奖惩 | 正常流 | P1 | 学生有数据 | 1.GET /api/students/1/profile | id=1 | 200, 完整画像 | P0-01 |
| TC-SRV-STU-011 | 跨端一致性_Web创建学生_Mini读取姓名/学号/班级同步 | 正常流 | P0 | 同一后端 | 1.Web创建 2.Mini读取 | cross-end | 核心字段完全一致 | P0-05 |
| TC-SRV-STU-012 | 学号生成规则_自动生成/手动指定_唯一性保证 | 正常流 | P1 | 批量创建 | 1.不传studentNo | auto generate | 唯一, 格式S+时间戳 | P0-01 |
| TC-SRV-STU-013 | 转学处理_原班级学生数-1_新班级+1_历史记录保留 | 正常流 | P1 | 学生转班 | 1.PATCH classId | transfer | 统计更新, 历史保留 | P0-05 |
| TC-SRV-STU-014 | 毕业/离校_状态标记_不再出现在在校列表 | 正常流 | P1 | 学生离校 | 1.PATCH status=graduated | graduated | 列表隐档案在 | P0-01 |
| TC-SRV-STU-015 | 共享常量对齐_学生手机号用PHONE_REGEX_学号用isStudentNo | 正常流 | P0 | - | 1.验证DTO装饰器 | PHONE_REGEX, isStudentNo | 与shared完全一致 | P0-02 |

---

### 2.8 成绩/考试 集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-GRD-001 | POST /api/exams_创建考试_科目年级关联/状态流转 | 正常流 | P0 | 教师登录 | 1.POST {name:'期中', subjects:['语文','数学'], grades:['三年级']} | valid exam | 201, status=draft | P0-01 |
| TC-SRV-GRD-002 | PATCH /api/exams/:id_发布考试_status=draft->published | 正常流 | P0 | 考试草稿 | 1.PATCH status=published | draft exam | 200, status=published | P0-01 |
| TC-SRV-GRD-003 | PATCH /api/exams/:id_归档考试_status=published->archived | 正常流 | P0 | 已发布考试 | 1.PATCH status=archived | published | 200, status=archived | P0-01 |
| TC-SRV-GRD-004 | POST /api/grades_单条录入_分值校验0-150/缺考标记 | 正常流 | P0 | 考试已发布 | 1.POST {examId:1, studentId:1, subject:'语文', score:95} | score=95 | 201, 录入成功 | P0-04 |
| TC-SRV-GRD-005 | POST /api/grades_批量录入_事务保证一致性 | 正常流 | P0 | 考试已发布 | 1.POST /api/grades/batch [{...}] | batch scores | 200, 全部成功或全回滚 | P0-05 |
| TC-SRV-GRD-006 | POST /api/grades_分值超范围_返回422 | 异常流 | P0 | 考试已发布 | 1.POST score=151 | invalid score | 422 | P0-04 |
| TC-SRV-GRD-007 | POST /api/grades_缺考标记_score=null_isAbsent=true | 正常流 | P0 | 考试已发布 | 1.POST {score:null, isAbsent:true} | absent | 201, 缺考记录 | P0-01 |
| TC-SRV-GRD-008 | 排名计算_班级排名/年级排名_自动计算存储 | 正常流 | P0 | 成绩录入完成 | 1.触发排名计算 | scores | rank/classRank/gradeRank存储 | P0-01 |
| TC-SRV-GRD-009 | GET /api/grades/student/:id_学生维度查询_历史成绩趋势 | 正常流 | P0 | 学生有成绩 | 1.GET student grades | studentId | 200, 趋势数据 | P0-01 |
| TC-SRV-GRD-010 | GET /api/grades/class/:id_班级维度_统计分析/分数段分布 | 正常流 | P0 | 班级有成绩 | 1.GET class grades | classId | 200, 平均分/及格率/优秀率/分布 | P0-01 |
| TC-SRV-GRD-011 | GET /api/grades/grade/:grade_年级维度_跨班对比/趋势图 | 正常流 | P0 | 年级有成绩 | 1.GET grade grades | grade | 200, 年级统计/趋势 | P0-01 |
| TC-SRV-GRD-012 | 权限_教师仅录入任教科目_非任教返回403 | 安全 | P0 | 教师任教语文 | 1.教师录入数学 | math score | 403 | P0-04 |
| TC-SRV-GRD-013 | 权限_校管全校_家长仅看自家孩子 | 安全 | P0 | 多角色 | 1.各角色查成绩 | all roles | 矩阵验证 | P0-04 |
| TC-SRV-GRD-014 | 成绩修改_已发布成绩修改_记录操作日志/版本 | 正常流 | P1 | 已发布成绩 | 1.PATCH grade | modified | 200, 审计日志 | P0-05 |
| TC-SRV-GRD-015 | 导出成绩单_Excel/PDF_班级/学生/年级维度 | 正常流 | P1 | 有成绩数据 | 1.GET /api/grades/export | export params | 200, 触发下载 | P0-01 |
| TC-SRV-GRD-016 | 共享常量对齐_考试科目用SUBJECT_VALUES_分值用isScore | 正常流 | P0 | - | 1.验证DTO/Service | SUBJECT_VALUES, isScore | 与shared完全一致 | P0-02 |

---

### 2.9 作业全流程集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-HW-001 | POST /api/homework_教师发布_标题内容科目班级截止日期附件 | 正常流 | P0 | 教师登录 | 1.POST {title:'语文作业', subject:'语文', classId:1, deadline:tomorrow} | valid homework | 201, status=published | P0-01 |
| TC-SRV-HW-002 | POST /api/homework_定时发布_publishAt未来时间_status=scheduled | 正常流 | P0 | 教师登录 | 1.POST {publishAt:future} | scheduled | 201, status=scheduled | P0-01 |
| TC-SRV-HW-003 | POST /api/homework_草稿箱_status=draft_不可见学生 | 正常流 | P0 | 教师登录 | 1.POST {status:'draft'} | draft | 201, status=draft | P0-01 |
| TC-SRV-HW-004 | GET /api/homework_学生/家长查看_列表筛选未完成/已完成/过期 | 正常流 | P0 | 有作业 | 1.GET ?status=pending | student token | 200, 仅未完成 | P0-01 |
| TC-SRV-HW-005 | GET /api/homework/:id_详情_附件下载/截止倒计时 | 正常流 | P0 | 作业存在 | 1.GET homework/1 | id=1 | 200, 详情含附件URL | P0-01 |
| TC-SRV-HW-006 | POST /api/homework/:id/submit_学生提交_文本图片文件/多次取最新 | 正常流 | P0 | 作业进行中 | 1.POST submit {content:'...', attachments:[...]} | submission | 201, 最新提交覆盖 | P0-01 |
| TC-SRV-HW-007 | POST /api/homework/:id/submit_截止后禁止_返回409 | 异常流 | P0 | 作业已过期 | 1.POST submit过期作业 | expired | 409, 截止时间已过 | P0-05 |
| TC-SRV-HW-008 | PATCH /api/homework/submissions/:id_教师批改_评分评语附件反馈 | 正常流 | P0 | 有提交 | 1.PATCH {score:90, comment:'好', feedbackAttachments:[...]} | grading | 200, 批改完成 | P0-01 |
| TC-SRV-HW-009 | PATCH /api/homework/submissions_批量批改_筛选未批/已批 | 正常流 | P0 | 多提交 | 1.PATCH 批量 | batch grade | 200, 批量更新 | P0-01 |
| TC-SRV-HW-010 | GET /api/homework/statistics_统计_完成率/平均分/未交名单导出 | 正常流 | P0 | 有提交数据 | 1.GET statistics | classId | 200, 完成率/平均分/名单 | P0-01 |
| TC-SRV-HW-011 | 作业附件_上传压缩base64/对象存储/下载签名URL | 正常流 | P1 | 有附件 | 1.上传/下载附件 | attachment | 压缩存储, 签名URL下载 | P0-01 |
| TC-SRV-HW-012 | 权限_教师仅发布任教班级_非任教403 | 安全 | P0 | 教师非任教班级 | 1.POST其他班级 | other class | 403 | P0-04 |
| TC-SRV-HW-013 | 跨端一致性_Web发布作业_Mini学生查看提交同步 | 正常流 | P0 | 同一后端 | 1.Web发布 2.Mini提交 | cross-end | 内容/附件/评分同步 | P0-05 |
| TC-SRV-HW-014 | 共享常量对齐_作业科目用SUBJECT_VALUES_截止日期用isDateStr | 正常流 | P0 | - | 1.验证DTO/Service | SUBJECT_VALUES, isDateStr | 与shared完全一致 | P0-02 |

---

### 2.10 AI 工具调用集成测试

| 用例ID | 标题 | 类型 | 优先级 | 前置条件 | 测试步骤 | 测试数据 | 预期结果 | 关联需求 |
|--------|------|------|--------|----------|----------|----------|----------|----------|
| TC-SRV-AI-001 | POST /api/ai/chat/sync_同步调用_Prompt构建/上下文注入/Token统计 | 正常流 | P0 | 教师登录 | 1.POST {messages:[{role:'user',content:'生成作业'}]} | prompt | 200, content, tokenUsage | P0-01 |
| TC-SRV-AI-002 | POST /api/ai/chat/async_异步任务_创建/轮询/回调/超时处理 | 正常流 | P0 | 教师登录 | 1.POST async {prompt:'...'} 2.轮询status | async task | 202->轮询->completed | P0-01 |
| TC-SRV-AI-003 | 模板管理_CRUD_预设模板/变量替换/版本控制 | 正常流 | P0 | 教师登录 | 1.CRUD /api/ai/templates | template | 200/201/200/204 | P0-01 |
| TC-SRV-AI-004 | 保��历史_用户维度/按工具分类/导出 | 正常流 | P0 | 有调用记录 | 1.GET /api/ai/history | userId | 200, 分页历史 | P0-01 |
| TC-SRV-AI-005 | 限流配额_用户级/校级/平台级_超额返回429 | 安全 | P0 | 配额设置 | 1.超额请求 | burst | 429, 配额耗尽 | P0-06 |
| TC-SRV-AI-006 | 流式输出_SSE/分片传输_小程序wx.cloud.callContainer适配 | 正常流 | P1 | 流式端点 | 1.POST stream=true | stream | 分片传输, 完整内容 | P0-01 |
| TC-SRV-AI-007 | OCR/ASR/图生图/文生视频_专用端点_参数校验 | 正常流 | P1 | 多模态 | 1.POST专用端点 | multimodal | 200, 结果URL | P0-01 |
| TC-SRV-AI-008 | 知识库检索_RAG_向量检索/上下文注入/引用溯源 | 正常流 | P1 | 知识库 | 1.POST /api/ai/knowledge/query | query | 200, 答案+引用 | P0-01 |
| TC-SRV-AI-009 | 共享常量对齐_AI功能标识用FEATURE_FLAGS_SET含ai | 正常流 | P0 | - | 1.验证Guard/Controller | FEATURE_FLAGS_SET.has('ai') | 与shared完全一致 | P0-02 |
| TC-SRV-AI-010 | Token计费_输入/输出Token统计_按模型/用户聚合 | 正常流 | P1 | 有调用 | 1.查询Token统计 | userId | 200, 统计报表 | P0-01 |

---

## 3. 测试数据制备脚本引用

统一使用 `test-deliverables/Test-Data-Fixtures/` 共享数据工厂：

- `server/test/integration/setup.ts` - `TestDataFactory` 类，含 `createSchool/createTeacher/createClass/createStudent/createExam/createGrade/createHomework/createNotice...` 等工厂方法
- `server/test/integration/test-app.module.ts` - SQLite 内存库测试模块配置
- `server/test/integration/auth-flow.spec.ts` 等 - 具体测试用例中的数据制备示例

---

## 4. 执行命令

```bash
cd /d/workspae/gitee/techer/work-system/server

# 运行现有单元测试 (已通过)
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/dto-validation.spec.ts test/tenant-isolation.spec.ts test/exception-filters.spec.ts

# 运行集成测试 (需SQLite内存库配置)
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/

# 运行特定模块
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/auth-flow.spec.ts
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/classes-crud.spec.ts
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/students-crud.spec.ts
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/grades-exams.spec.ts
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/homework-flow.spec.ts
node ../web-app/node_modules/jest/bin/jest.js --no-coverage test/integration/ai-tools.spec.ts
```

---

*文档结束*