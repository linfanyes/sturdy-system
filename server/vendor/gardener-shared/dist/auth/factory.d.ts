/**
 * shared/auth/factory.ts —— 通用鉴权状态机实现。
 *
 * 跨端共用的状态机逻辑：login / logout / restore / switchRole 四大操作的状态变迁与持久化，
 * 各端仅注入 loginFn（调用各自后端适配）和 persistence（localStorage / wx storage 适配器）。
 *
 * 【持久化语义】
 *   - saveLogin / loadLogin：当前"活跃角色"的凭证
 *   - saveMultiRole / loadMultiRole：多角色（师兼家、超管/校管 token 分存）的全量快照
 *   - clearLogin 仅清活跃凭证；clearMultiRole 清多角色快照；logout 两者都清
 *
 * 【事件】通过 on/once 订阅 'login' | 'logout' | 'switchRole' | 'restore' | 'tokenExpired'。
 * Web 端可在 store 中桥接为 Pinia 响应式；小程序端桥接为 reactive。
 *
 * 【对齐】
 *   - Web 适配：web-app/src/stores/auth-machine.ts（Pinia 包装）
 *   - 小程序适配：mini-program/src/common/auth-machine.js（reactive 包装）
 */
import type { AuthMachineOptions, AuthPersistence, IAuthStateMachineWithEvents } from './machine';
/** 创建跨端共用的鉴权状态机实例 */
export declare function createAuthMachine(opts: AuthMachineOptions): IAuthStateMachineWithEvents;
/**
 * 基于 Key-Value 存储的轻量持久化适配器。
 * 注入 get/set/remove 三函数即可；不直接依赖 localStorage。
 */
export declare function createKvPersistence(opts: {
    get: (k: string) => string | null | undefined;
    set: (k: string, v: string) => void;
    remove: (k: string) => void;
    tokenKey: string;
    userKey: string;
    multiRoleKey?: string;
}): AuthPersistence;
/**
 * 浏览器端默认适配器：使用 window.localStorage。
 * Web 端可直接使用，测试环境可按需替换为内存实现。
 */
export declare function createLocalStoragePersistence(opts?: {
    tokenKey?: string;
    userKey?: string;
    multiRoleKey?: string;
}): AuthPersistence;
export type { IAuthStateMachine, IAuthStateMachineWithEvents, AuthMachineOptions, AuthPersistence } from './machine';
//# sourceMappingURL=factory.d.ts.map