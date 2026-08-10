/**
 * shared/games/snake.ts —— 贪吃蛇纯状态机。
 *
 * 端侧适配仅需：
 *   - clearTimeout/setTimeout 驱动 step()
 *   - vibrate/playSound / submitScore 由 callbck 注入
 *
 * 零平台依赖：不引用 uni./wx./window./document。
 */
import type { Dir } from './types';
export type SnakeDifficulty = 'slow' | 'medium' | 'fast';
export interface SnakeConfig {
    /** 棋盘宽度（正方形），默认 15 */
    size?: number;
    /** 难度 → 基准毫秒 */
    speed?: number;
    /** 难度预设 */
    difficulty?: SnakeDifficulty;
}
/** 蛇身单元 */
export interface Cell {
    r: number;
    c: number;
}
/** 游戏状态快照 */
export interface SnakeState {
    snake: Cell[];
    dir: Dir;
    nextDir: Dir;
    food: Cell;
    score: number;
    ate: number;
    over: boolean;
    size: number;
}
/** 钩子（端侧注入音效/震动/提交） */
export interface SnakeHooks {
    onEat?: (score: number, ate: number) => void;
    onDie?: () => void;
}
export declare class SnakeGame {
    size: number;
    snake: Cell[];
    dir: Dir;
    nextDir: Dir;
    food: Cell;
    score: number;
    ate: number;
    over: boolean;
    private speed;
    private hooks;
    constructor(config?: SnakeConfig, hooks?: SnakeHooks);
    /** 计算当前帧间隔（难度递增） */
    currentInterval(): number;
    /** 设置下一个方向（拒绝 180° 反向） */
    setDir(r: number, c: number): boolean;
    /** 推动一帧；返回 { ate, moved, over } */
    step(): {
        ate: boolean;
        over: boolean;
    };
    private die;
    /** 重置 */
    reset(): void;
    /** 导出快照（端侧渲染或持久化） */
    snapshot(): SnakeState;
}
//# sourceMappingURL=snake.d.ts.map