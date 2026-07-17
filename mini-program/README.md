# 园丁工作台 · 微信小程序（uni-app）

与 `../server` 后端配套的微信小程序。只和后端通信，密钥不落地。本 README 面向**开发者 / 维护者**；产品使用说明见根目录 **[《系统说明书》](../系统说明书.md)**，部署与发布流程见 **[《微信小程序前后端完整部署与发布流程》](../微信小程序云托管部署手册.md)**。

## 技术栈

- 框架：uni-app（Vue3 语法 + `<script setup>`）
- 构建：Vite + `@dcloudio/vite-plugin-uni`
- 运行目标：微信小程序（mp-weixin）
- 后端：NestJS + TypeORM + MySQL 8.0（微信云托管）
- 鉴权：微信 `wx.login` code → 后端换 openid → 签发 JWT

## 功能规模（截至当前版本）

| 维度 | 数量 | 说明 |
|---|---|---|
| 页面（pages.json） | 53 | 含 tabBar 5 个 + 普通页 48 个 |
| CRUD 通用实体 | 29 | `common/crud-schema.js` 声明，统一走 `pages/crud/crud.vue` |
| AI 生成页 | 3 | 知识点生成 / 优选试卷生成 / 考试一键分析 |
| 学科专项（配置驱动） | 15 | 语文 7 + 英语 8，走 `pages/subject/subject.vue` |
| 文字办公（配置驱动） | 6 | 翻译 / 评语 / 期末总结 / 演讲稿 / 教育论文 / 黑板报 |
| 小游戏 | 18 | `pages/games/*` |
| 课堂神器 / 本地工具 | 5 + 5 | 随机点名/倒计时/计算器/口算/随机决定器 + 竖式/答题卡/口诀/换算/错题本/花朵/模板库 |

> 小程序与原桌面版「工具箱」44 项工具已 **100% 覆盖迁移**，无遗漏。

## 开发

```bash
npm install
npm run dev:mp-weixin      # 用微信开发者工具打开 dist/dev/mp-weixin
```

## 上线（精简版，详见部署手册）

1. 在 `src/common/config.js` 把 `API_BASE` 改为你的后端域名：`https://你的域名/api`
2. 在 `src/manifest.json` 填入你的小程序 `appid`
3. 构建：`npm run build:mp-weixin`（产物 `dist/build/mp-weixin`）
4. 微信开发者工具 → 导入项目 → 选择 `dist/build/mp-weixin` → 上传 → 公众平台审核 → 发布
5. 微信公众平台 → 开发管理 → 服务器域名：把 `request 合法域名` 设为 `https://你的域名`

## 目录

```
src/
  common/
    config.js        API 基地址（改成后端域名）
    request.js       请求封装（自动带 token、401 跳登录、put→PATCH）
    store.js         登录态（token + 用户，持久化）
    crud-schema.js    29 个 CRUD 实体字段声明
    subject-schema.js 15 个学科专项配置（含 prompt 模板）
    quicktool-schema.js 6 个文字办公配置
  pages/
    login/ dashboard/ classes/ students/ exams/ grades/   # 核心教学管理
    seats/ group/ crud/ toolbox/ config/ ai/              # 座位/分组/通用CRUD/工具箱/设置/AI助手
    ai-knowledge/ ai-paper/ ai-exam/                      # 3 个 AI 生成页
    subject/ quicktool/                                  # 配置驱动通用页
    games/    (19 文件：index + 18 款游戏)                # 小游戏合集
    tools/    (12 文件)                                   # 课堂神器 + 数学专项 + 花朵 + 模板库
```

## 关键约定

- **登录**：微信 `wx.login` 拿 code → `POST /api/auth/wechat-login` → 后端换 openid 并签发 JWT。
- **AI 生成**：小程序端调用 `/api/ai/chat-sync`（同步），密钥与模型**仅在后端「设置」页配置**，绝不下发到小程序。
- **CRUD**：`pages/crud/crud.vue` 按 `?type=` 读取 `crud-schema` 渲染表单；请求 `GET/POST/PATCH/DELETE /api/<实体>`。
- **离线可用**：18 款小游戏、随机点名、倒计时、计算器、口算、单位换算、乘法口诀、错题本、文案模板库均为本地逻辑，无需后端。
- **租户隔离**：所有业务表带 `teacherId`，JWT 解析后自动过滤，数据互不越权。

## 与后端的关系

详见 `../server/README.md`。小程序不直连数据库、不持有任何密钥；所有持久化与 AI 调用都经后端完成。
