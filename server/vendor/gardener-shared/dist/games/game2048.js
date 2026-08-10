"use strict";
/**
 * shared/games/game2048.ts —— 2048 纯状态机。
 *
 * 端侧只需注入音效/震动/提交钩子，核心逻辑（随机数、压缩、合并、死局、undo）在此。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game2048 = void 0;
exports.createBoard = createBoard;
exports.boardEqual = boardEqual;
const types_1 = require("./types");
class Game2048 {
    size;
    target;
    historyLimit;
    board;
    score = 0;
    over = false;
    won = false;
    /** 每格是否含合并标记（端侧渲染后应清除） */
    lastMerged = new Set();
    history = [];
    constructor(config = {}) {
        this.size = config.size ?? 4;
        this.target = config.target ?? 2048;
        this.historyLimit = config.historyLimit ?? 5;
        this.reset();
    }
    reset() {
        this.board = createBoard(this.size);
        this.score = 0;
        this.over = false;
        this.won = false;
        this.history = [];
        this.lastMerged = new Set();
        this.addRandom();
        this.addRandom();
    }
    /** 数字编码移动（兼容小程序滑动编码 1上 2下 3左 4右） */
    moveByCode(code) {
        const map = { 1: 'up', 2: 'down', 3: 'left', 4: 'right' };
        return this.move(map[code]);
    }
    /** 在随机空格填入 2 或 4（90%/10%） */
    addRandom() {
        const empties = (0, types_1.collectEmpty)(this.board);
        if (!empties.length)
            return null;
        const [r, c] = empties[Math.floor(Math.random() * empties.length)];
        const v = Math.random() < 0.9 ? 2 : 4;
        this.board[r][c] = v;
        return { r, c, v };
    }
    /** 执行滑动移动；变更成功返回 true */
    move(dir) {
        if (this.over)
            return { moved: false, gained: 0, over: true, won: this.won, mergedCells: new Set() };
        const b = (0, types_1.cloneMatrix)(this.board);
        let gained = 0;
        const merged = new Set();
        const N = this.size;
        // i=0..N-1 遍历"行"
        // up: 第 i 列，从上往下读；结果第 k 位 = 第 k 行
        // down: 第 i 列，从下往上读（reverse）；结果回写后 reverse
        // left: 第 i 行，从左往右
        // right: 第 i 行，从右往左（reverse）
        const lineFromBoard = (i) => {
            const cells = [];
            for (let k = 0; k < N; k++) {
                let r, c;
                if (dir === 'up') {
                    r = k;
                    c = i;
                }
                else if (dir === 'down') {
                    r = N - 1 - k;
                    c = i;
                }
                else if (dir === 'left') {
                    r = i;
                    c = k;
                }
                else {
                    r = i;
                    c = N - 1 - k;
                }
                cells.push({ value: b[r][c], baseR: r, baseC: c, stepR: 0, stepC: 0 });
            }
            return cells;
        };
        const applyLine = (i, out, mergedLocal) => {
            for (let k = 0; k < N; k++) {
                let r, c;
                if (dir === 'up') {
                    r = k;
                    c = i;
                }
                else if (dir === 'down') {
                    r = N - 1 - k;
                    c = i;
                }
                else if (dir === 'left') {
                    r = i;
                    c = k;
                }
                else {
                    r = i;
                    c = N - 1 - k;
                }
                b[r][c] = out[k];
                if (mergedLocal.has(k)) {
                    merged.add(r * N + c);
                }
            }
        };
        const compress = (line, _rowIdx) => {
            const arr = line.filter((x) => x);
            const mergedLocal = new Set();
            let g = 0;
            const result = [];
            let k = 0;
            while (k < arr.length) {
                if (k + 1 < arr.length && arr[k] === arr[k + 1]) {
                    const merged = arr[k] * 2;
                    result.push(merged);
                    g += merged;
                    mergedLocal.add(result.length - 1);
                    k += 2;
                }
                else {
                    result.push(arr[k]);
                    k++;
                }
            }
            while (result.length < N)
                result.push(0);
            return { out: result, gained: g, mergedLocal };
        };
        for (let i = 0; i < N; i++) {
            const cells = lineFromBoard(i);
            const line = cells.map((c) => c.value);
            const { out, gained: g, mergedLocal } = compress(line, i);
            gained += g;
            applyLine(i, out, mergedLocal);
        }
        const changed = !boardEqual(b, this.board);
        if (!changed)
            return { moved: false, gained: 0, over: false, won: this.won, mergedCells: this.lastMerged };
        this.history.push({ board: (0, types_1.cloneMatrix)(this.board), score: this.score });
        if (this.history.length > this.historyLimit)
            this.history.shift();
        this.board = b;
        this.score += gained;
        this.lastMerged = merged;
        this.addRandom();
        this.checkOver();
        return {
            moved: true,
            gained,
            over: this.over,
            won: this.won,
            mergedCells: this.lastMerged,
        };
    }
    /** 清除合并标记（端侧渲染动画后调用） */
    clearMerged() {
        this.lastMerged = new Set();
    }
    /** 撤销一步 */
    undo() {
        if (this.over || !this.history.length)
            return false;
        const last = this.history.pop();
        this.board = last.board;
        this.score = last.score;
        this.lastMerged = new Set();
        return true;
    }
    /** 清空 undo 栈 */
    clearHistory() {
        this.history = [];
    }
    /** 端侧只读访问快照 */
    get historyList() {
        return this.history;
    }
    checkOver() {
        const N = this.size;
        // 胜利判定：任一格达到 target
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++)
                if (this.board[i][j] >= this.target) {
                    this.won = true;
                    return;
                }
        // 死局判定：无空格 + 无可合并相邻
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                if (this.board[i][j] === 0)
                    return;
            }
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                const v = this.board[i][j];
                if (j < N - 1 && this.board[i][j + 1] === v)
                    return;
                if (i < N - 1 && this.board[i + 1][j] === v)
                    return;
            }
        this.over = true;
    }
}
exports.Game2048 = Game2048;
function createBoard(n) {
    return Array.from({ length: n }, () => Array(n).fill(0));
}
function boardEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const aRow = a[i];
        const bRow = b[i];
        if (aRow.length !== bRow.length)
            return false;
        for (let j = 0; j < aRow.length; j++)
            if (aRow[j] !== bRow[j])
                return false;
    }
    return true;
}
//# sourceMappingURL=game2048.js.map