/**
 * shared/games —— 跨端游戏状态机纯函数集合。
 *
 * 原则（对齐计划第一节）：
 *   禁止 import uni.* / wx.* / document.* / window.* / process.*。
 *   状态机仅依赖 Math.random（两端运行时均可用），负责：
 *     - 题目/初始状态生成（init / reset / generate）
 *     - 纯状态迁移（step / move / fill / setDir）
 *     - 游戏结束/胜利判定
 *     - 合法走法 / 提示 / undo
 *   计时 / 渲染 / 音效 / 计分提交由端侧 adapter 负责。
 */
/** 方向向量 */
export interface Dir {
    r: number;
    c: number;
}
/** 4 个基础方向 */
export declare const DIR: Record<'up' | 'down' | 'left' | 'right', Dir>;
/** 反向方向映射（用于禁止 180° 掉头） */
export declare const OPPOSITE: Record<string, string>;
export declare const dirKey: (d: Dir) => string;
/** 棋盘工具：在 gridSize × gridSize 范围内 */
export declare const inBounds: (r: number, c: number, n: number) => boolean;
/** 工具：深拷贝二维数组 */
export declare function cloneMatrix<T>(m: T[][]): T[][];
/** 工具：收集矩阵中的空位坐标（值为 0 / null / undefined） */
export declare function collectEmpty(matrix: number[][]): Array<[number, number]>;
//# sourceMappingURL=types.d.ts.map