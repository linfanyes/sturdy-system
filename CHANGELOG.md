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

### 改进
- **安全自检增强**：生产环境新增超管密码格式验证

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
