/**
 * 安全常量（跨端共享）
 *
 * 来源对齐：
 *   - web-app/src/api/request.ts (行 67): 字面量正则判断 401 失效
 *   - mini-project/src/common/request.js (行 119): 字面量正则判断 401 失效
 *
 * 同一份正则定义，避免两端漂移。当后端新增/修改失效提示文案时只改一处。
 */
/** 后端返回的「会话失效」提示文案匹配正则 */
export declare const SESSION_INVALID_PATTERNS: RegExp;
/** 字符串是否命中会话失效模式 */
export declare function isSessionInvalid(msgText: string): boolean;
//# sourceMappingURL=security.d.ts.map