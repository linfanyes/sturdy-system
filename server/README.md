# 园丁工作台 · 后端服务（NestJS + MySQL）

教师=租户的多租户后端，集中保存所有配置（含 AI 密钥），微信授权登录，提供 REST API 与 AI 代理。前端（微信小程序 uni-app）只与后端通信。

## 目录
```
src/
  auth/       微信登录（code -> openid -> 自动建档 -> JWT）
  users/      教师账号与个人资料
  config/     集中配置：平台配置(app_config) + 每位教师的 AI 设置(ai_settings)
  ai/         AI 代理：/ai/chat(SSE 流式) /ai/chat-sync(同步) /ai/parse(结构化解析)
  common/     通用 CRUD 基类、JWT 守卫、租户装饰器、实体基类
  classes|students|seats|exams|grades|parent-contact|generated|duty-roster|
  school|class-ops|growth|notes|award|teacher|admin|engagement/  业务模块
```

所有业务表都带 `teacherId` 字段，控制器统一按 JWT 中的 `sub`（教师ID）做数据隔离。

## 本地开发
```bash
cp .env.example .env      # 填写数据库、JWT、微信、AI 配置
npm install
npm run start:dev         # http://localhost:3000/api
```
首次启动会自动建表（DB_SYNCHRONIZE=true），并用 .env 中的默认值填充平台配置。

## 腾讯云托管 + 云数据库 MySQL 部署（推荐）

整体架构：后端跑在「腾讯云托管（CloudBase 云托管）」的容器实例上，数据落在「腾讯云数据库 MySQL（TencentDB for MySQL）」；AI 密钥与所有业务配置只存后端，前端小程序只与后端通信，密钥不出后端。

### 1. 准备云数据库 MySQL
1. 腾讯云控制台 → 云数据库 MySQL → 新建实例（建议与云托管**同地域、同 VPC**）。
2. 创建数据库 `gardener`，创建账号（如 `gardener`）并授权。
3. 记录连接地址：同 VPC 用「**内网地址**」（低延迟、免流量费、更安全）；本地联调用「外网地址」（需在安全组放行本机 IP）。

### 2. 构建并推送镜像到 TCR
1. 腾讯云容器镜像服务（TCR）建命名空间与仓库（如 `gardener/gardener-api`）。
2. 本地构建并推送：
   ```bash
   docker build -t ccr.ccs.tencentyun.com/your-namespace/gardener-api:latest .
   docker push ccr.ccs.tencentyun.com/your-namespace/gardener-api:latest
   ```
   也可在 CloudBase 控制台「在线构建」：直接上传源码 + Dockerfile 自动构建，无需本地 Docker。

### 3. 创建云托管服务
1. 腾讯云控制台 → CloudBase → 云托管 → 新建服务 `gardener-api`，关联上面的镜像仓库。
2. 服务配置：
   - 监听端口：`3000`（与 Dockerfile 的 `EXPOSE`/`PORT` 一致）
   - 实例规格：1 核 2G 起步；最小实例 `0`（无流量自动缩容到 0，省成本）、最大 `5`
   - 环境变量：填 `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE`、`JWT_SECRET`、`WECHAT_APPID/WECHAT_SECRET`、`DEFAULT_SUBJECTS`、`LOGIN_CODE`、AI 相关（AI 也可不填，之后在小程序「设置」里配）。**敏感值（DB_PASSWORD / JWT_SECRET / AI_API_KEY）建议在云托管「密钥管理」里配置，不要写进镜像。**
   - 声明式管理：见仓库 `cloudbaserc.json`（含 service 定义与变量占位，可按需调整）。
3. 访问方式（二选一）：
   - **微信私有链路（本项目采用）**：小程序已用 `wx.cloud.callContainer` 走微信内部网络，免公网域名、免流量、免登记合法域名；需云托管服务开启「微信私有链路」并关联云开发环境（环境 ID 填 `config.js` 的 `CLOUDRUN_ENV`）。
   - **公网访问（可选）**：若改用公网，需在云托管绑定已备案自定义域名 + 免费 SSL，并在公众平台登记 `request 合法域名`。

### 4. 自管服务器（CVM）备选
若暂不采用云托管，也可在 CVM 上用 Docker 自管：
```bash
# 本地没云数据库时，先起一个 MySQL 容器
docker compose -f docker-compose.local.yml up -d
# 再起后端（DB_HOST 指向云数据库内网地址，或本地 127.0.0.1）
docker compose up -d --build
```
并参考 `nginx.conf` 做 443 反代（AI 对话为 SSE 长连接，已配置 read_timeout）。生产数据库仍建议用云数据库 MySQL。

## 小程序前端
见 `../mini-program`：
- 把 `src/common/config.js` 的 `API_BASE` 改为后端地址：公网用 `https://你的域名/api`，云托管私有链路用 `https://{envId}.api.tcloudbase.com/api`（详见上方部署说明）
- `npm install && npm run build:mp-weixin`
- 用微信开发者工具导入 `dist/build/mp-weixin` 并上传
- 在 `manifest.json` 填入你的小程序 `appid`

## 主要接口
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/auth/wechat-login | 微信 code 换 token |
| GET  | /api/users/me | 当前教师资料 |
| PUT  | /api/users/me | 更新资料 |
| GET  | /api/config/public | 公开配置（默认学科等） |
| GET/PUT | /api/config/ai | 教师 AI 设置（密钥仅存后端） |
| GET/PUT | /api/config/app/:key | 平台配置 |
| POST | /api/ai/chat | SSE 流式对话 |
| POST | /api/ai/chat-sync | 同步对话（小程序用） |
| POST | /api/ai/parse | 把自由文本解析为 JSON 数组 |
| REST | /api/classes /students /seat-layouts /exams /grades /parent-contacts /generated/* /duty-rosters /schedules /attendances /homework /notices /resources /class-expenses /class-activities /growth-entries /behavior-records /notes /todos /award-records /teachers /lesson-observations /work-logs /lesson-plan-templates /reward-records /score-records /group-scores | 标准 CRUD（均按教师隔离） |
| POST | /api/seat-layouts/:id/activate | 启用座位布局并回写学生行列 |
| POST | /api/grades/merge | 成绩幂等导入（按班级+考试+科目） |
