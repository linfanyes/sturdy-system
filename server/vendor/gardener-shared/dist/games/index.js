"use strict";
/**
 * shared/games barrel。
 * 端侧通过 `@gardener/shared/games` 或更细粒度路径引入。
 * 含游戏状态机 + 通用游戏算法/映射（helpers/mappings 自 utils/ 迁移而来）。
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
__exportStar(require("./types.js"), exports);
__exportStar(require("./snake.js"), exports);
__exportStar(require("./game2048.js"), exports);
__exportStar(require("./sudoku.js"), exports);
__exportStar(require("./helpers.js"), exports);
__exportStar(require("./mappings.js"), exports);
//# sourceMappingURL=index.js.map