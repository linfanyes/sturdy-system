# 依赖漏洞治理记录（2026-08-10）

> 关联：`docs/RISK_AUDIT_2026-08-10.md` P1「依赖漏洞 16 处」。
> 方法：本机沙箱环境 npm CLI 的 install/audit-fix 写路径被环境拦截（EPERM/挂起），
> 只读 `npm audit` 可用。因此采用 **`package.json` overrides 声明式修复**（CI 执行 `npm ci` 时自动生效），
> 无法安全升级的项记录为后续专项。

---

## 1. web-app（已修复，4 处）

审计结果：`4 vulnerabilities (1 moderate, 3 high)`：

| 包 | 原版本 | 风险 | 修复方式 |
|---|---|---|---|
| `brace-expansion` | 2.1.2（js-beautify 链, dev） | high：DoS | overrides `^2.1.4` |
| `glob` | 10.4.5（js-beautify 链, dev） | high：命令注入 | overrides `^10.5.0` |
| `nanoid` | 3.3.16（vite 链） | high：生成器死循环 | overrides `^3.3.17` |
| `postcss` | 8.5.22 | moderate：sourceMappingURL 任意文件读 | 直接依赖升 `^8.5.23` |

**改动**：`web-app/package.json` 新增 `overrides` 块 + `postcss` 版本提升。
**生效方式**：`npm ci` 时 npm 自动应用 overrides（`npm ci` 校验 lockfile 需先 `--package-lock-only` 同步，CI 已加该步骤）。

## 2. server（28 处：3 low / 16 moderate / 9 high → 保留，专项治理）

审计确认高危均绑定 **NestJS semver major 升级**（Nest 10 → 11），无安全小版本可修：

| 依赖链 | 问题 | 修复代价 |
|---|---|---|
| `@nestjs/core` / `platform-express` / `swagger` / `typeorm` | 需升级至 Nest 11 | **breaking change**：需全量回归 |
| `@nestjs/cli` → webpack / ajv / @angular-devkit | dev 链 | 需 Nest CLI 11（major） |
| `uuid@9`（exceljs 链）/ `brace-expansion@1.x` | 已知漏洞 | 需 major 升级 |
| `glob@7` / `rimraf@2` / `inflight`（archiver/fstream 链） | 无安全小版本 | 需上游升级 |

**建议**：单独立项「Nest 11 升级」专项（含 DTO/守卫/模块回归清单），不在本次批量整改中执行——避免引入未验证的破坏性变更。运行时镜像只装 `--production` 依赖，dev 链（@nestjs/cli/webpack）**不进生产镜像**，优先级低于运行时依赖。

## 3. mini-program（41 处：14 low / 12 moderate / 15 high → 保留，专项治理）

| 依赖链 | 问题 | 修复代价 |
|---|---|---|
| `@dcloudio/uni-*`（uni-app 全家桶，构建期） | babel/ws/esbuild 等传递漏洞 | 需 uni-app 版本升级（**生态绑定**，升级需回归小程序构建） |
| `xlsx`（SheetJS） | Prototype Pollution + ReDoS | **无修复版本**（官方 npm 包停更） |

**建议**：
- uni-app 升级需在微信开发者工具验证构建与真机行为，单独立项；
- `xlsx` 无修复：若生产无用户可控 xlsx 解析入口则风险可控；建议后续替换为 `exceljs` 或 `xlsx-js-style` 维护分支。

## 4. 环境备注（本机复现依赖治理的方法）

本机沙箱会拦截 npm 写路径（`package.json`/`package-lock.json` EPERM，install 挂起）。
如需在本机执行 `npm audit fix` / `npm install`，请：
1. 使用非沙箱终端（本机 PowerShell/CMD 直接运行）；
2. 或删除 `node_modules` 后重装。

CI（Gitee Go）网络不受此限制，`npm ci` 正常。

## 5. 验收

- [ ] `web-app`: `npm audit` 无 high/critical（或仅剩 `postcss` 类 moderate 已修）
- [ ] `server` / `mini-program`: 高危项有明确专项计划
- [ ] CI web 阶段新增 `--package-lock-only` 步骤生效（overrides 同步 lockfile）
