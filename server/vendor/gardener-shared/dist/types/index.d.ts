/**
 * 跨端共享 TypeScript 类型定义
 * 三端（Web、小程序、后端）统一引用 @gardener/shared/types
 * 使用 tsconfig paths 别名直接引用源码（方案 C：零发布流程）
 */
import type { SubjectOption as ConstSubjectOption, RoleOption as ConstRoleOption, Role as ConstRole } from '../constants';
/** 角色类型：与后端 JWT payload.role、Web 端 AuthUser.role 对齐 */
export type Role = ConstRole;
/** 学科选项：label=显示名，value=存储值，icon=可选图标 */
export type SubjectOption = ConstSubjectOption;
/** 角色选项：含标签、值、可选功能权限列表 */
export type RoleOption = ConstRoleOption;
/** 基础用户信息（三端通用核心字段） */
export interface User {
    id: number;
    username: string;
    name: string;
    role: Role;
    features: string[];
    avatar?: string;
    schoolId?: number;
}
/** 教师 = User + 教学科目/班级 */
export interface Teacher extends User {
    role: 'teacher';
    subjectIds: string[];
    classIds: number[];
}
/** 学生信息 */
export interface Student {
    id: number;
    name: string;
    studentNo: string;
    classId: number;
    parentIds: number[];
}
/** 班级信息 */
export interface Class {
    id: number;
    name: string;
    grade: string;
    classNo: number;
    teacherId?: number;
    studentCount: number;
}
/** 统一 API 响应结构 */
export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
}
/** 分页查询参数 */
export interface PageParams {
    page: number;
    size: number;
}
/** 分页结果结构 */
export interface PageResult<T> {
    list: T[];
    total: number;
    page: number;
    size: number;
}
/** 登录凭证（Web/小程序通用） */
export interface LoginCredentials {
    username?: string;
    password?: string;
    studentNo?: string;
    code?: string;
}
/** JWT 载荷 */
export interface JwtPayload {
    sub: number;
    role: Role;
    schoolId?: number;
    features?: string[];
    iat?: number;
    exp?: number;
}
/** 权限检查上下文 */
export interface PermissionContext {
    userId: number;
    role: Role;
    schoolId?: number;
    features: string[];
    classIds?: number[];
    subjectIds?: string[];
}
/** 通用 ID 类型 */
export type Id = number | string;
/** 时间戳字符串（ISO 8601） */
export type Timestamp = string;
/** 可选字段类型工具 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/** 必选字段类型工具 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
/** 深度只读 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};
/** 非空断言工具类型 */
export type NonNullable<T> = T extends null | undefined ? never : T;
export type { SubjectOption as SharedSubjectOption, RoleOption as SharedRoleOption, Role as SharedRole } from '../constants';
//# sourceMappingURL=index.d.ts.map