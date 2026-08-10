/**
 * shared/games/sudoku.ts —— 数独纯状态机。
 *
 * 功能：生成题目、填数、笔记、校验、求解、死局检测。
 * 端侧仅需渲染 9×9 网格与选择高亮。
 */
export type Grid = number[];
export interface SudokuConfig {
    /** 难度 = 随机挖空数（默认 40） */
    holes?: number;
}
export interface SudokuPuzzle {
    puzzle: Grid;
    solution: Grid;
}
export declare class Sudoku {
    puzzle: Grid;
    solution: Grid;
    /** 当前玩家填入（含 0 = 空） */
    current: Grid;
    /** 笔记：每格的候选数数组 */
    notes: number[][];
    /** 错误标记（端侧渲染红色） */
    bad: boolean[];
    /** 选中的格子索引（-1 无） */
    sel: number;
    /** 是否笔记模式 */
    noteMode: boolean;
    /** 难度（挖空数） */
    holes: number;
    /** 完成标记 */
    solved: boolean;
    durationSec: number;
    constructor(config?: SudokuConfig);
    reset(): void;
    select(i: number): void;
    toggleNoteMode(): void;
    /** 填数返回 { ok, mismatch, solved } */
    fill(n: number): {
        ok: boolean;
        mismatch: boolean;
        solved: boolean;
    };
    /** 全局校验 */
    check(): {
        wrong: number;
        empty: number;
    };
    /** 检查索引是否与选中同行/同列/同宫 */
    isRelated(i: number): boolean;
}
/** 回溯求解：修改并返回 grid；成功 true，失败 false */
export declare function solve(grid: Grid): boolean;
export declare function isValid(grid: Grid, r: number, col: number, n: number): boolean;
export declare function generate(holes: number): SudokuPuzzle;
//# sourceMappingURL=sudoku.d.ts.map