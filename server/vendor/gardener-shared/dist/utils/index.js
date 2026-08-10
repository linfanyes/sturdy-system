"use strict";
/**
 * shared/utils —— 跨端通用纯函数工具
 * 无平台依赖，可在 Web / 小程序 / 后端共用
 * 注：游戏算法/映射已迁移至 shared/games（helpers/mappings），请从 @gardener/shared/games 引入。
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
exports.normalizeGender = void 0;
__exportStar(require("./student.js"), exports);
__exportStar(require("./general.js"), exports);
__exportStar(require("./security.js"), exports);
__exportStar(require("./sse-parser.js"), exports);
__exportStar(require("./export-data.js"), exports);
__exportStar(require("./image-spec.js"), exports);
__exportStar(require("./date.js"), exports);
__exportStar(require("./format.js"), exports);
__exportStar(require("./score.js"), exports);
var gender_1 = require("./gender");
Object.defineProperty(exports, "normalizeGender", { enumerable: true, get: function () { return gender_1.normalizeGender; } });
//# sourceMappingURL=index.js.map