"use strict";
/**
 * shared/games/sudoku.ts —— 数独纯状态机。
 *
 * 功能：生成题目、填数、笔记、校验、求解、死局检测。
 * 端侧仅需渲染 9×9 网格与选择高亮。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sudoku = void 0;
exports.solve = solve;
exports.isValid = isValid;
exports.generate = generate;
class Sudoku {
    puzzle;
    solution;
    /** 当前玩家填入（含 0 = 空） */
    current;
    /** 笔记：每格的候选数数组 */
    notes;
    /** 错误标记（端侧渲染红色） */
    bad;
    /** 选中的格子索引（-1 无） */
    sel = -1;
    /** 是否笔记模式 */
    noteMode = false;
    /** 难度（挖空数） */
    holes;
    /** 完成标记 */
    solved = false;
    durationSec = 0;
    constructor(config = {}) {
        this.holes = config.holes ?? 40;
        const { puzzle, solution } = generate(this.holes);
        this.puzzle = puzzle;
        this.solution = solution;
        this.current = puzzle.slice();
        this.notes = Array.from({ length: 81 }, () => []);
        this.bad = Array(81).fill(false);
        this.solved = false;
        this.durationSec = 0;
    }
    reset() {
        const { puzzle, solution } = generate(this.holes);
        this.puzzle = puzzle;
        this.solution = solution;
        this.current = puzzle.slice();
        this.notes = Array.from({ length: 81 }, () => []);
        this.bad = Array(81).fill(false);
        this.sel = -1;
        this.solved = false;
        this.durationSec = 0;
    }
    select(i) {
        this.sel = i;
    }
    toggleNoteMode() {
        this.noteMode = !this.noteMode;
    }
    /** 填数返回 { ok, mismatch, solved } */
    fill(n) {
        if (this.sel < 0 || this.solved)
            return { ok: false, mismatch: false, solved: false };
        const i = this.sel;
        if (this.puzzle[i] !== 0)
            return { ok: false, mismatch: false, solved: false };
        if (this.noteMode && n !== 0) {
            const arr = this.notes[i];
            const idx = arr.indexOf(n);
            if (idx >= 0)
                arr.splice(idx, 1);
            else
                arr.push(n);
            return { ok: true, mismatch: false, solved: false };
        }
        this.current[i] = n;
        this.notes[i] = [];
        if (n === 0) {
            this.bad[i] = false;
            return { ok: true, mismatch: false, solved: false };
        }
        const correct = n === this.solution[i];
        this.bad[i] = !correct;
        if (correct) {
            const done = this.current.every((v, k) => v === this.solution[k]);
            if (done) {
                this.solved = true;
                return { ok: true, mismatch: false, solved: true };
            }
            return { ok: true, mismatch: false, solved: false };
        }
        return { ok: true, mismatch: true, solved: false };
    }
    /** 全局校验 */
    check() {
        let wrong = 0;
        let empty = 0;
        for (let i = 0; i < 81; i++) {
            if (this.puzzle[i] !== 0)
                continue;
            if (this.current[i] === 0)
                empty++;
            else if (this.current[i] !== this.solution[i]) {
                this.bad[i] = true;
                wrong++;
            }
        }
        return { wrong, empty };
    }
    /** 检查索引是否与选中同行/同列/同宫 */
    isRelated(i) {
        if (this.sel < 0 || i === this.sel)
            return false;
        const r1 = Math.floor(this.sel / 9);
        const c1 = this.sel % 9;
        const r2 = Math.floor(i / 9);
        const c2 = i % 9;
        if (r1 === r2 || c1 === c2)
            return true;
        if (Math.floor(r1 / 3) === Math.floor(r2 / 3) &&
            Math.floor(c1 / 3) === Math.floor(c2 / 3))
            return true;
        return false;
    }
}
exports.Sudoku = Sudoku;
/** 回溯求解：修改并返回 grid；成功 true，失败 false */
function solve(grid) {
    for (let i = 0; i < 81; i++) {
        if (grid[i] === 0) {
            const r = Math.floor(i / 9);
            const col = i % 9;
            const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            for (const n of nums) {
                if (isValid(grid, r, col, n)) {
                    grid[i] = n;
                    if (solve(grid))
                        return true;
                    grid[i] = 0;
                }
            }
            return false;
        }
    }
    return true;
}
function isValid(grid, r, col, n) {
    for (let k = 0; k < 9; k++) {
        if (grid[r * 9 + k] === n)
            return false;
        if (grid[k * 9 + col] === n)
            return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            if (grid[(br + i) * 9 + (bc + j)] === n)
                return false;
    return true;
}
function generate(holes) {
    const solution = Array(81).fill(0);
    solve(solution);
    const puzzle = solution.slice();
    const indices = shuffle([...Array(81).keys()]);
    for (let k = 0; k < holes && k < indices.length; k++) {
        puzzle[indices[k]] = 0;
    }
    return { puzzle, solution };
}
function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
    }
    return out;
}
//# sourceMappingURL=sudoku.js.map