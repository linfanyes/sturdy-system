/**
 * shared/games/game2048.ts —— 2048 纯状态机。
 *
 * 端侧只需注入音效/震动/提交钩子，核心逻辑（随机数、压缩、合并、死局、undo）在此。
 */
export type Direction2048 = 'up' | 'down' | 'left' | 'right';
export interface Game2048Config {
    size?: number;
    /** 目标值（默认 2048），达到即判定胜利 */
    target?: number;
    /** undo 历史容量 */
    historyLimit?: number;
}
export interface MoveResult {
    moved: boolean;
    gained: number;
    over: boolean;
    won: boolean;
    /** 合并位置集合（用于端侧动画），以 row*N+col 索引 */
    mergedCells: Set<number>;
}
export interface HistoryEntry {
    board: number[][];
    score: number;
}
export declare class Game2048 {
    size: number;
    target: number;
    historyLimit: number;
    board: number[][];
    score: number;
    over: boolean;
    won: boolean;
    /** 每格是否含合并标记（端侧渲染后应清除） */
    lastMerged: Set<number>;
    private history;
    constructor(config?: Game2048Config);
    reset(): void;
    /** 数字编码移动（兼容小程序滑动编码 1上 2下 3左 4右） */
    moveByCode(code: 1 | 2 | 3 | 4): MoveResult;
    /** 在随机空格填入 2 或 4（90%/10%） */
    addRandom(): {
        r: number;
        c: number;
        v: number;
    } | null;
    /** 执行滑动移动；变更成功返回 true */
    move(dir: Direction2048): MoveResult;
    /** 清除合并标记（端侧渲染动画后调用） */
    clearMerged(): void;
    /** 撤销一步 */
    undo(): boolean;
    /** 清空 undo 栈 */
    clearHistory(): void;
    /** 端侧只读访问快照 */
    get historyList(): ReadonlyArray<{
        board: number[][];
        score: number;
    }>;
    private checkOver;
}
export declare function createBoard(n: number): number[][];
export declare function boardEqual(a: number[][], b: number[][]): boolean;
//# sourceMappingURL=game2048.d.ts.map