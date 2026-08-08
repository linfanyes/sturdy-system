# 优化交付概览（2026-08-08）

> 用户负责：① migration 0025 云托管线上执行 ② GitHub SSH key 配置
> 其余优化项全部完成并验证。

## 验证结果

| 项 | 结果 |
|---|---|
| Server 单测 | ✅ 17 suites / 347 tests 全绿 |
| Mini 单测 | ✅ 9 suites / 199 tests 全绿 |
| Web 类型检查 | ✅ vue-tsc 0 errors |
| 提交 | ✅ `bbb21c6`（21 文件，+307/-182） |
| 推送 | ✅ Gitee origin/master（GitHub 待配 SSH key） |

## 完成内容

### 1. 修复腐坏单测套件（核心债）
测试因功能漂移腐坏 + CI 从不跑 test，安全网形同虚设。已对齐真实实现：

**Server（17 suite 全绿）**
- AuthService 构造器真实 11 参顺序；所有角色走 `feature.buildProfile`（mock 必补）
- 家长登录不再支持默认弱密码（`parentPasswordHash` 为 null 抛 BadRequest）
- `findStudentByNoForLogin` 改用 `studentRepo.find`（数组）
- school-admin 默认密码现为 `1314521`；级联删除 `TEACHER_ID_TABLES` 真实 43 表
- toolbox 对齐真实 11 分区 / 97 工具

**Mini（9 suite 全绿）**
- FEATURE_FLAGS 真实 40（非 31）
- `hasFeature` fail-closed（空数组/null 返回 false）
- `store.setAuth/setParent` 持久化 `JSON.stringify(user)`
- `login` 改用 `unifiedLogin` wrapper
- `subject-schema` 改为直引 `@gardener/shared/schemas/subject-schema` dist 模块（原正则提取 TS 源码失败）

### 2. CI 测试门禁
- `ci.yml` 新增 server `npx jest --testPathIgnorePatterns="integration"`（integration 需真实 DB，属环境债排除）
- 新增独立 `mini-test` job（先 build shared dist 再跑 jest）

### 3. 生产构建 console 清理
- `web-app/vite.config.ts` + `mini-program/vite.config.js` 加 `build.esbuild.pure: ['console.log','console.info','console.debug','console.table']`（保留 error/warn 供监控上报）

### 4. Web 无障碍增强
- CrudTable 补 `aria-label`（搜索 / 班级筛选 / 每页条数 / 表单字段）
- 加载与空态加 `role="status" aria-live="polite"`
- `style.css` 新增全局 `@media (prefers-reduced-motion: reduce)` 尊重系统"减少动效"偏好

## 待用户处理（阻塞项）
1. **migration 0025 云托管线上执行** —— DB_SYNCHRONIZE=false，math-mistakes 线上仍会 500
2. **GitHub SSH key 配置** —— GitHub 远程 push 仍失败，CI 未真正触发过
3. （非阻塞）mini `page-smoke.spec.ts` 页面结构冒烟未排期
