"use strict";
/**
 * shared/games/snake.ts —— 贪吃蛇纯状态机。
 *
 * 端侧适配仅需：
 *   - clearTimeout/setTimeout 驱动 step()
 *   - vibrate/playSound / submitScore 由 callbck 注入
 *
 * 零平台依赖：不引用 uni./wx./window./document。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnakeGame = void 0;
const types_1 = require("./types");
const SPEED_PRESETS = {
    slow: 280,
    medium: 200,
    fast: 130,
};
const MIN_INTERVAL = 80;
const RAMP_EVERY = 5;
const RAMP_AMOUNT = 10;
class SnakeGame {
    size;
    snake;
    dir;
    nextDir;
    food;
    score = 0;
    ate = 0;
    over = false;
    speed;
    hooks;
    constructor(config = {}, hooks = {}) {
        const size = config.size ?? 15;
        const difficulty = config.difficulty ?? 'medium';
        const speed = config.speed ?? SPEED_PRESETS[difficulty];
        this.size = size;
        this.speed = speed;
        this.hooks = hooks;
        this.snake = initialSnake(size);
        this.dir = { r: 0, c: 1 };
        this.nextDir = { r: 0, c: 1 };
        this.food = randomFood(this.snake, size);
    }
    /** 计算当前帧间隔（难度递增） */
    currentInterval() {
        const reduce = Math.floor(this.ate / RAMP_EVERY) * RAMP_AMOUNT;
        return Math.max(MIN_INTERVAL, this.speed - reduce);
    }
    /** 设置下一个方向（拒绝 180° 反向） */
    setDir(r, c) {
        // 与当前已生效方向比较（在 step 时才生效）
        if (this.dir.r === -r && this.dir.c === -c)
            return false;
        this.nextDir = { r, c };
        return true;
    }
    /** 推动一帧；返回 { ate, moved, over } */
    step() {
        if (this.over)
            return { ate: false, over: true };
        this.dir = this.nextDir;
        const head = this.snake[0];
        const nr = head.r + this.dir.r;
        const nc = head.c + this.dir.c;
        if (!(0, types_1.inBounds)(nr, nc, this.size) ||
            this.snake.some((s) => s.r === nr && s.c === nc)) {
            this.die();
            return { ate: false, over: true };
        }
        const newHead = { r: nr, c: nc };
        const ateFood = nr === this.food.r && nc === this.food.c;
        this.snake = [newHead, ...this.snake];
        if (ateFood) {
            this.score++;
            this.ate++;
            this.food = randomFood(this.snake, this.size);
            this.hooks.onEat?.(this.score, this.ate);
        }
        else {
            this.snake.pop();
        }
        return { ate: ateFood, over: false };
    }
    die() {
        this.over = true;
        this.hooks.onDie?.();
    }
    /** 重置 */
    reset() {
        this.snake = initialSnake(this.size);
        this.dir = { r: 0, c: 1 };
        this.nextDir = { r: 0, c: 1 };
        this.score = 0;
        this.ate = 0;
        this.over = false;
        this.food = randomFood(this.snake, this.size);
    }
    /** 导出快照（端侧渲染或持久化） */
    snapshot() {
        return {
            snake: this.snake.map((c) => ({ ...c })),
            dir: { ...this.dir },
            nextDir: { ...this.nextDir },
            food: { ...this.food },
            score: this.score,
            ate: this.ate,
            over: this.over,
            size: this.size,
        };
    }
}
exports.SnakeGame = SnakeGame;
/** 初始化蛇（中部水平 3 节） */
function initialSnake(size) {
    const mid = Math.floor(size / 2);
    return [
        { r: mid, c: mid },
        { r: mid, c: mid - 1 },
        { r: mid, c: mid - 2 },
    ];
}
/** 在空格上随机放置食物（Math.random 两端均可） */
function randomFood(snake, size) {
    const occupied = new Set(snake.map((s) => `${s.r},${s.c}`));
    const empty = [];
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (!occupied.has(`${r},${c}`))
                empty.push({ r, c });
    return empty[Math.floor(Math.random() * empty.length)];
}
//# sourceMappingURL=snake.js.map