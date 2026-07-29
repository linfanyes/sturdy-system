# ai_providers 启动同步失败修复手册

## 现象
云托管后端启动日志：
```
QueryFailedError: BLOB, TEXT, GEOMETRY or JSON column 'textModels' can't have a default value
[Nest] ERROR [TypeOrmModule] Unable to connect to the database. Retrying (3)...
```
后端因 schema 同步失败而反复重试连库，API 不可用，前端登录表现为 `Network Error`。

## 根因
- 当前实体 `server/src/config/ai-provider.entity.ts` 对四个数组列使用 `@Column('simple-json', { nullable: true })`
  （`textModels / visionModels / imageModels / videoModels`），**无 default**。
- TypeORM MySQL 驱动对 `simple-json` 一律生成 **`text`** 类型列，不会生成 `json`。
- 但**线上 `ai_providers` 表**的这四列是历史遗留的 **`json` 类型且带默认值**（来自旧版本代码用 `type:'json'` + `default` 建表）。
- 项目 `DB_SYNCHRONIZE=true`（`app.module.ts:63`），每次启动做 schema 同步，检测到「线上 json 列 vs 实体 text 列」差异并生成 `ALTER`，
  MySQL 拒绝为 JSON 列设置默认值，导致同步失败、连库重试。

> 结论：**代码层已安全，问题在线上历史表结构**，必须修正线上表。

## 修复方案（二选一）

### 方案 A（推荐）：直接修正线上表结构
用云托管提供的方式连接 MySQL（控制台「数据库」/ 环境变量 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`，或云托管内网地址），执行：

```sql
ALTER TABLE ai_providers
  MODIFY textModels  LONGTEXT NULL,
  MODIFY visionModels LONGTEXT NULL,
  MODIFY imageModels LONGTEXT NULL,
  MODIFY videoModels LONGTEXT NULL;
```

执行后重新部署/重启后端实例。`synchronize` 检测到实体（`simple-json`→`text`）与线上（`LONGTEXT`）一致，启动成功。

### 方案 B（兜底，先让服务起来）：临时关闭 synchronize
将环境变量 `DB_SYNCHRONIZE` 设为 `false` 并重新部署 → 后端不再碰表结构，可正常连库启动。
（`simple-json` 读写 `json` 列完全兼容，业务不受影响。）随后择机按方案 A 规范化列类型，
再视情况把 `DB_SYNCHRONIZE` 恢复为 `true`。

## 防复发约定
1. JSON / 数组类列统一使用 `simple-json`，**禁止** `type:'json'` + `default`。
2. 数组默认值用 `@AfterLoad()` 初始化（本项目 `ai-provider.entity.ts` 的 `initArrayDefaults()` 已是示范）。
3. 生产环境建议关闭 `synchronize`，改用 `migrations/` 下的 SQL 管理 schema，避免启动期 schema 漂移导致连库失败。
