# 更新日志 (Changelog)

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。记录所有版本的显著变更。

---

## [Unreleased]

### 安全修复
- **CI/CD**：移除 `continue-on-error: true` 和 `|| true` 绕过，确保测试和类型检查真正拦截问题
- **小程序依赖升级**：将 `xlsx` 从 `^0.18.5` 升级到 `^0.20.3`，修复 CVE-2023-30533 原型污染漏洞
- **超管密码加密**：`SUPER_ADMIN_PASSWORD` 现在支持 bcrypt 哈希格式（`$2b$...` 开头）
- **生产环境启动检查**：如果 `SUPER_ADMIN_PASSWORD` 未使用 bcrypt 哈希格式，生产环境拒绝启动

### Bug 修复
- **switchRole 逻辑矛盾**：从 `switchRole` 中移除 `g_token` 写入操作，修复与 `readToken()` 修复冲突导致的角色误判问题
- **多实例迁移锁**：使用 MySQL 命名锁 `GET_LOCK()` 保护迁移过程，防止云托管多副本并发执行迁移

### 重构
- **AuthService 拆分**：将 ~460 行的巨型 AuthService 重构为 Facade，新增 `WechatAuthService` 专门处理微信登录和绑定逻辑
- **AiService 拆分**：将 ~730 行的巨型 AiService 重构为 Facade，拆分为：
  - `AiChatService` - 对话核心（流式/同步/结构化解析/上下文缓存）
  - `AiFileParserService` - 文件解析（TXT/PDF/Excel/Magic Bytes）
  - `AiVisionService` - 视觉识别（OCR/图片识别）
  - `AiMediaService` - 媒体生成（文生图/文生视频/ASR）

### 改进
- **安全自检增强**：生产环境新增超管密码格式验证
- **废弃代码隔离**：将 `_deprecated_orphan_pages` 加入 .gitignore
- **TypeORM 产物排除**：将 `server/dist/` 加入 .gitignore

### 新增（Web / 小程序功能对齐）
- **小游戏得分云端同步**：
  - 后端新增 `game-scores` 模块（按教师租户隔离，幂等 upsert 最高分）+ 迁移 `0022_game_scores.sql`（root `migrations/`）。
  - Web 端：`api/games.ts` 上报/查询接口 + `GamesIndex.vue` 得分榜 + `installGameScoreReporter` 全局自动上报（补丁 `Storage.setItem`，覆盖全部游戏，零侵入）。
  - 小程序端：`common/game-score.js` + `useGame.submitScore` 自动上报 + 游戏索引得分榜。
- **AI 对话历史**：
  - 后端新增 `chat-sessions` 模块（会话增删改查 + 置顶 + 消息追加）+ 迁移 `0023_chat_sessions.sql`（root `migrations/`）。
  - Web 端：`api/chat.ts` + `AiChat.vue` 新增会话历史侧栏（新对话/打开/置顶/删除）、自动持久化用户与 AI 消息。
  - 小程序端：`common/chat-history.js` 将本地会话同步到后端，实现跨端历史打通。
- **家长端补缺**：Web 新增家长「专项资源库」页面（古诗词/数学公式/英语单词，`/parent/resources`），家长看板新增「教材知识点」「专项资源库」快捷入口。
- **小程序校管补缺**（对齐 Web 校管）：`school-admin.vue` 新增班级/学生批量导入（Excel/CSV + AI 识图）、班级升级（`/classes/:id/promote`）、班级/学生 XLS 导出入口。
- **复用改造计划**：产出 `复用改造实施计划.md`（分 3 阶段，首推先统一本次新增的得分/会话两端 API 层）。

---

## [3.0.0] - 2025-08-01

### 新增
- 微信小程序云托管部署支持
- AI 助手功能（多模态对话、图片 OCR、文生图、语音识别）
- 家长-教师双角色切换支持
- 三级页返回条
- 教师导入学生功能修复
- 专项资源库改名

### 安全
- CORS fail-closed 策略
- SSRF 防护（AI 出站地址仅允许 HTTPS 公网）
- 文件 Magic Bytes 校验
- 密码 bcrypt 升级路径
- 登录安全自检（JWT_SECRET 弱密钥检测、默认超管账号检测）

### 修复
- 校管 401 误判为会话失效
- 微信小程序登录兼容性

---

## [2.x.x] - 2025-06

### 新增
- uni-app 小程序 H5 支持
- 教师通讯录
- 成绩管理模块
- 多校区管理

---

## 版本格式说明

- `Added`：新功能
- `Changed`：已有功能变更
- `Deprecated`：即将移除的功能
- `Removed`：已移除的功能
- `Fixed`：Bug 修复
- `Security`：安全相关修复

---

## 升级指南

### 超管密码加密升级

如果你当前在生产环境使用明文 `SUPER_ADMIN_PASSWORD`：

1. 生成 bcrypt 哈希：
   ```bash
   node -e "const b=require('bcrypt');console.log(b.hashSync('你的强密码',10))"
   ```

2. 更新环境变量 `SUPER_ADMIN_PASSWORD` 为生成的哈希值（以 `$2b$` 开头）

3. 重启服务验证

### xlsx 依赖升级

```bash
cd mini-program
# 修改 package.json 中 xlsx 版本后
npm ci
```

升级后请验证 Excel 导入功能是否正常。

---

## 报告安全问题

如发现安全问题，请通过 Issue 或邮件联系维护者。严重安全问题可直接提交至项目安全频道。
