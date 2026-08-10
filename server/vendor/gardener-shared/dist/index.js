"use strict";
/**
 * Teacher 共享模块 - 单一事实来源
 * 导出常量、类型、校验器、API 契约、跨端工具供 Web 端、小程序端、后端服务共用
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// 常量
__exportStar(require("./constants/index.js"), exports);
// 类型
__exportStar(require("./types/index.js"), exports);
// 校验器
__exportStar(require("./validators/index.js"), exports);
// API 契约（端点路径 + 请求/响应类型）
__exportStar(require("./api/index.js"), exports);
// 跨端工具（纯函数 / 无平台依赖）
__exportStar(require("./utils/index.js"), exports);
// 鉴权状态机抽象（阶段 2 契约层）
__exportStar(require("./auth/index.js"), exports);
// 跨端 schema 配置（CRUD / 学科工具 / 快捷工具）
__exportStar(require("./schemas/index.js"), exports);
// 跨端游戏状态机（snake / 2048 / sudoku）—— 纯函数，两端各自渲染
__exportStar(require("./games/index.js"), exports);
// 跨端 composables（Vue 3 响应式逻辑，两端通用）
__exportStar(require("./composables/index.js"), exports);
//# sourceMappingURL=index.js.map