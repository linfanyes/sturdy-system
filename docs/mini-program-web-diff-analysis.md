# 园丁工作台 · Web 与小程序全面差异分析与统一报告

## 一、架构总览

| 维度 | Web (web-app) | 小程序 (mini-program) |
|---|---|---|
| 框架 | Vue 3 + Vite + Vue Router | uni-app (Vue 3) + Vite |
| 语言 | TypeScript (.ts) | JavaScript (.js) |
| UI | 自研 + Tailwind CSS | 自研 + uni.scss |
| 路由 | vue-router 声明式 | pages.json + route-guard 拦截 |
| 状态管理 | Pinia (defineStore) | 手写 reactive |
| HTTP | axios (REST, Bearer JWT) | wx.cloud.callContainer (云托管) |
| 存储 | localStorage | uni.setStorageSync |
| 部署 | vite build → 静态部署 | uni build → 微信上传 |
| 域名 | 需白名单 + 自定义域名 | 免域名（云托管私有链路） |

## 二、已共享内容 (@gardener/shared)
- constants: 学科、角色、功能权限、主题色、字体档位等枚举常量
- types: AuthUser, Role, Feature 等类型定义
- validators: 表单校验器（手机号、班级名等）

## 三、核心差异与处理

### 3.1 HTTP 通信
- Web: axios, baseURL 三级解析, 401 清除 localStorage
- 小程序: wx.cloud.callContainer 云托管私有链路, 显式超时, Mock 演示模式
- 影响: 后端 API 路径和响应格式统一，通信方式因平台特性不同，无需统一

### 3.2 路由导航
- Web: vue-router meta.roles + meta.feature, beforeEach 守卫
- 小程序: pages.json + uni.addInterceptor 拦截
- 建议: 业务角色规则保持对齐，实现方式各随框架

### 3.3 状态管理
- Web: Pinia useAuthStore, 统一 loginByUsername, 单 token
- 小程序: 4 个独立 token, 含主题/字体 UI 状态
- 建议: 后端 token 验证逻辑一致

### 3.4 主题 UI
- 小程序: 4 主题色 + 3 档字体
- 处理: SCHEMES/FONT_SIZES 已抽到 shared/constants，小程序改为共享导入

### 3.5 Web 端补齐的 8 个功能模块
1. 教学日历 (teaching-calendar)
2. 工作日志 (work-log)
3. 阅读打卡 (reading-log)
4. 成长记录 (growth)
5. 家访路线 (home-visit-route)
6. 成绩趋势 (grade-trend)
7. 排行榜 (leaderboard)
8. 我的相册 (my-gallery)

## 四、实施结果

### Phase 1 ✅ 主题常量统一
- shared/constants/index.ts 新增 SCHEMES、FONT_SIZES
- mini-program/src/common/store.js 改为从 shared 导入

### Phase 2 ✅ Web 端补齐 8 个功能模块
- 新增 8 个 Vue 页面组件
- 新增路由配置和教师端 feature 权限
- 新增教师端左侧菜单入口

### Phase 3 ✅ 角色守卫规则对齐
- Web 端新增 8 个 feature
- 小程序 PAGE_ROLES / canAccess() 映射一致

### Phase 4 ✅ API 错误处理语义统一
- 两端 401 均清除登录态 + 跳转登录

### Phase 5 ✅ 家长端隔离验证
- 后端 JWT role 字段强制校验，前端篡改无效
