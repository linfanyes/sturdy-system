/**
 * 鉴权状态机接口（Auth State Machine）—— 跨端共享的鉴权生命周期抽象。
 *
 * 【定位】定义 Web / 小程序 / 后端共有的鉴权操作契约。
 * 各端的具体实现（Persistence / API 调用 / 存储键名）不同，但状态机语义一致：
 *   - login:     凭据 → token / user
 *   - logout:    清状态 + 清存储
 *   - restore:   冷启动从本地持久化恢复
 *   - switchRole: 多角色切换（师兼家等），不重新输入密码
 *
 * 【对齐】
 *   - Web 端实现在 web-app/src/stores/auth.ts（Pinia） + roleSwitch.ts
 *   - 小程序端实现在 mini-program/src/common/store.js（reactive）
 *
 * 该接口为阶段 2 契约层：各端保留具体 store 实现，共享抽象约束状态名称与类型。
 * 阶段 3 可将各端 store 收敛为同一个状态机实现 + 不同 Persistence Adapter。
 */
/**
 * 鉴权用户。
 * 注：各端实际的 User 形状会随角色扩展（如 schoolId / studentId 等），
 * 这里只保留最小公共字段；实现时在该基础上扩展。
 */
export interface AuthUser {
    id: string;
    role: string;
    name: string;
    /** 该角色下可用的特性列表（用于功能开关） */
    effectiveFeatures?: string[];
    /** 兼容扩展字段 */
    [key: string]: unknown;
}
/**
 * 任意凭据的通用形状 —— 具体凭据类型由各自 login 变体实现。
 * 常见的子类：{ username, password } / { studentNo, password } / { code, ... }
 */
export interface Credentials {
    username?: string;
    password?: string;
    studentNo?: string;
    /** 兼容扩展字段 */
    [key: string]: unknown;
}
/** 登录结果 */
export interface LoginResult {
    token: string;
    user: AuthUser;
}
/** 角色身份（两端对齐：super / school_admin / teacher / parent） */
export type Role = 'super' | 'school_admin' | 'teacher' | 'parent';
/** 鉴权错误 */
export declare class AuthError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
/**
 * 鉴权状态机核心接口。
 *
 * 各端实现须保证：
 * - login 成功 → state.token / state.user 写入最新值 + 写入持久化
 * - logout → state 清空 + 持久化清除
 * - restore → 冷启动从持久化读取；解析失败返回 null 表示"未登录"
 * - switchRole → 在同一台设备的不同角色 token 之间切换，无需重登
 */
export interface IAuthStateMachine {
    /** 当前 token（未登录时空字符串或 null） */
    get token(): string | null;
    /** 当前用户（未登录时 null） */
    get user(): AuthUser | null;
    /** 当前角色（未登录时 null） */
    get role(): Role | null;
    /** 是否已登录 */
    get isLoggedIn(): boolean;
    /**
     * 登录。
     * @throws AuthError 登录失败（凭据无效 / 后端错误）
     */
    login(creds: Credentials): Promise<LoginResult>;
    /** 登出，清空本地状态与持久化。返回 Promise 用于后端可选的 revoke 调用。 */
    logout(): Promise<void>;
    /**
     * 冷启动恢复：从持久化读 token/user。
     * @returns 恢复成功返回 LoginResult；持久化损坏/过期/不存在返回 null。
     */
    restore(): Promise<LoginResult | null>;
    /**
     * 多角色切换（典型：师兼家）。
     * 每个角色有独立的 token/user；切换时把"当前活跃角色"指针指向目标角色。
     *
     * @param targetRole 要切到的角色
     * @returns 切换成功返回目标角色的 LoginResult；未登录或目标角色不可用时抛 AuthError
     */
    switchRole(targetRole: Role): Promise<LoginResult>;
}
/** 鉴权事件类型，用于状态变更订阅（可选）。 */
export type AuthEvent = 'login' | 'logout' | 'switchRole' | 'restore' | 'tokenExpired';
/** 鉴权事件监听器 */
export type AuthEventListener = (evt: AuthEvent, data?: {
    token?: string;
    user?: AuthUser | null;
    role?: Role | null;
}) => void;
/**
 * 鉴权状态机 —— 事件发布订阅扩展接口。
 *
 * 各端实现可选支持：Web 端可通过 Pinia store 变化自动触发，小程序端可用事件总线。
 */
export interface IAuthStateMachineWithEvents extends IAuthStateMachine {
    /** 订阅事件（返回取消订阅函数） */
    on(event: AuthEvent, listener: AuthEventListener): () => void;
    /** 一次性订阅 */
    once(event: AuthEvent, listener: AuthEventListener): () => void;
}
/**
 * 持久化接口的抽象定义（用于阶段 3 注入不同端实现）。
 *
 * 具体 key 由各端约定；shared 不强制绑定 localStorage / uni.getStorageSync。
 */
export interface AuthPersistence {
    saveLogin(result: LoginResult): void;
    loadLogin(): LoginResult | null;
    clearLogin(): void;
    /** 多角色保存（师兼家场景下的双 token） */
    saveMultiRole(data: Record<string, LoginResult>): void;
    loadMultiRole(): Record<string, LoginResult> | null;
    clearMultiRole(): void;
}
/**
 * 创建鉴权状态机的工厂参数 —— 阶段 3 收敛时使用。
 */
export interface AuthMachineOptions {
    /** 发起实际登录的端点调用适配器 */
    loginFn: (creds: Credentials) => Promise<LoginResult>;
    /** 持久化实现 */
    persistence: AuthPersistence;
    /** 登出时通知后端的实现（可选，用于 revoke token） */
    revokeFn?: (token: string) => Promise<void>;
    /** 启动时打印日志（可选） */
    debug?: boolean;
}
/**
 * 辅助：判断 token 是否形如 JWT（三段 base64）。
 * 用于客户端快速校验（不做签名校验）。
 */
export declare function isJwtLike(token: string): boolean;
/**
 * 辅助：从 JWT payload 提取字段（不验签）。
 * 用于客户端读 exp / role 等。
 *
 * 【跨端兼容】使用 `atob`（浏览器 / 小程序 通用），无需 Node Buffer。
 * 在 atob 不可用时返回 null。
 */
export declare function parseJwtPayload<T = Record<string, unknown>>(token: string): T | null;
/**
 * 辅助：判断 JWT 是否已过期（基于 exp 字段）。
 * 留 bufferSec 用于客户端提前判定（避免请求时才失败）。
 */
export declare function isJwtExpired(token: string, bufferSec?: number): boolean;
//# sourceMappingURL=machine.d.ts.map