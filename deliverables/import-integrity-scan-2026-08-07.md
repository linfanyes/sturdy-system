# 导入完整性扫描报告（2026-08-07）

## 结论

**全项目未发现「导入不存在的具名导出」问题**，此前 `games.ts` 连续触发的
`The requested module '...' does not provide an export named '...'` 类错误已全部修复，且无同类隐患残留。

## 扫描范围与规模

| 项目 | 目录 | 文件类型 |
|---|---|---|
| Web 管理端 | `web-app/src` | .ts/.tsx/.js/.jsx/.vue |
| 小程序 | `mini-program/src` | .js/.ts/.vue |
| 共享包 | `shared/` | .ts |

- 扫描文件：**450** 个（含导入文件 340 个）
- 具名导入校验数：**951** 处
- 解析失败：**0**

## 校验规则

1. **缺失导出**（致命）：从项目内模块（相对路径 / `@/` / `@gardener/shared/`）导入的具名符号，
   在目标模块（含 `export * from` 再导出链）中不存在 → 报错。这正是浏览器端
   `does not provide an export named` 的根因。
2. **type-only 被 value 导入**（潜在）：目标仅 `export interface/type`、导入方却未写 `type` 关键字
   → 提示（vite dev 下浏览器端同样可能报错）。
3. 跳过项：`import type` / `import { type X }`（vite transform 剥离，不校验）、node_modules 包、
   副作用导入（`import './x.css'`）。

## 灵敏性自测

放置临时文件 `web-app/src/__scan_selftest__.ts`，故意写入两类错误导入：

- `import { NONEXISTENT_FROM_SCAN_TEST } from '@/api/games'` → ✅ 被抓到
- `import { AnotherFakeSymbol } from '@gardener/shared/api/endpoints'` → ✅ 被抓到（与真实事故同型）

验证后已删除自测文件，复扫回到全绿。**结论：脚本非"假阴性"，0 问题可信。**

## 使用方式（后续可复扫）

```bash
node scripts/check-imports.mjs                 # 终端报告
node scripts/check-imports.mjs --report out.json  # 导出 JSON 明细
```

依赖 `@babel/parser` 与 `@vue/compiler-sfc`（web-app 已内置），脚本本身零新增依赖。

## 背景：本次连续修掉的同源问题

| # | 文件 | 错误 | 修复 |
|---|---|---|---|
| 1 | `web-app/src/api/games.ts` | 从 `@gardener/shared/api/endpoints` 导入 `GAME_KEY_TO_NAME`（实际在 `utils/game-mappings.ts`） | 改导入来源 |
| 2 | 同文件 | 从 `endpoints` 导入 `GAME_SCORE_SUBMIT_THROTTLE_MS`（实际在 `game-mappings.ts:59`） | 改导入来源 |
| 3 | `web-app/index.html` | Google Fonts 外链 `ERR_PROXY_CONNECTION_FAILED` | 移除外链（非致命） |

> 根因模式：`@gardener/shared` 的 `api/endpoints.ts` 与 `utils/game-mappings.ts` 拆包后，
> 旧代码仍习惯从 `endpoints` 一并导入全部共享常量。本次扫描已确认无其余同类残留。
