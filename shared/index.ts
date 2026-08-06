/**
 * Teacher 共享模块 - 单一事实来源
 * 导出常量、类型、校验器、API 契约、跨端工具供 Web 端、小程序端、后端服务共用
 */

// 常量
export * from './constants/index.js'

// 类型
export * from './types/index.js'

// 校验器
export * from './validators/index.js'

// API 契约（端点路径 + 请求/响应类型）
export * from './api/index.js'

// 跨端工具（纯函数 / 无平台依赖）
export * from './utils/index.js'

// 鉴权状态机抽象（阶段 2 契约层）
export * from './auth/index.js'

// 显式转发 constants 的三个类型，消除与 types star 导出的同名歧义（constants 为权威来源）
export type { Role, SubjectOption, RoleOption } from './constants/index.js'
