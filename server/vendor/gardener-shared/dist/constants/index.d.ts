/**
 * 跨端共享常量 - 单一事实来源
 * 供 Web 端、小程序端、后端服务共同引用
 * 使用 tsconfig paths 别名 @gardener/shared/constants 导入
 */
/**
 * 学科选项（15 门标准学科）
 * 对齐：web-app/src/constants/subjects.ts、mini-program/src/common/subject-schema.js::ALL_SUBJECTS
 */
export interface SubjectOption {
    label: string;
    value: string;
    icon?: string;
    color?: string;
    description?: string;
}
export declare const SUBJECT_OPTIONS: SubjectOption[];
/** 学科值数组（便于校验器直接引用） */
export declare const SUBJECT_VALUES: string[];
/**
 * 手机号正则：中国大陆手机号（1 开头，第二位 3-9，共 11 位）
 * 对齐：web-app/src/utils/validators.ts::PHONE_RE、mini-program/src/common/validators.js::isPhone
 */
export declare const PHONE_REGEX: RegExp;
/** 手机号校验失败提示语 */
export declare const PHONE_HINT: string;
/**
 * 班级命名规则：年级+序号+"班"（如 "五年级1班"、"初二3班"、"高一5班"）
 * 支持格式：
 *   - 小学：一年级~六年级 + 序号 + 班（如 "五年级1班"）
 *   - 初中：初一~初三 + 序号 + 班（如 "初二3班"）
 *   - 高中：高一~高三 + 序号 + 班（如 "高一5班"）
 * 对齐：mini-program/src/common/validators.js::isClassName（如有）、web 端校验逻辑
 */
export declare const CLASS_NAMING_RULE: {
    /** 正则：(一~六年级|初一~初三|高一~高三) + 序号(1-99) + 班 */
    readonly pattern: RegExp;
    /** 示例 */
    readonly example: "五年级1班 / 初二3班 / 高一5班";
    /** 说明 */
    readonly description: "班级命名格式：小学\"年级+序号+班\"（如 五年级1班）、初高中\"年级+序号+班\"（如 初二3班、高一5班）";
};
/**
 * 年级选项（小学一~六年级、初一~初三、高一~高三）
 * 对齐：mini-program/src/common/subject-schema.js::GRADE
 */
export declare const GRADE_OPTIONS: string[];
/**
 * 角色选项（4 种角色）
 * 对齐：web-app/src/types/user.ts::Role、后端 JWT payload.role
 * Role 类型权威来源：@gardener/shared/auth（auth/machine.ts）
 */
import type { Role } from '../auth/machine.js';
export type { Role };
export interface RoleOption {
    label: string;
    value: Role;
    features?: string[];
}
export declare const ROLE_OPTIONS: RoleOption[];
/** 角色值数组（便于校验器引用） */
export declare const ROLE_VALUES: Role[];
/**
 * 教师职务选项
 * - 基础职务：班主任、教研组长、年级组长、教导主任、副校长、校长
 * - 学科组长：{年级}{学科}组长（如"一年级语文组长"），用于教材知识库编辑权限
 * 学科组长可编辑对应学科+年级的教材内容；"{学科}组长"（无年级）可编辑该学科所有年级。
 */
export declare const BASE_POSITIONS: string[];
export declare const SUBJECT_LEADER_POSITIONS: string[];
/** 全部职务选项（基础 + 学科组长），供前端下拉使用 */
export declare const ALL_POSITIONS: string[];
/**
 * 解析职务字符串，提取学科和年级（用于教材编辑权限判断）
 * @returns { subject?, grade? } 学科组长职务返回对应学科和年级；否则返回空
 */
export declare function parseSubjectLeader(position: string): {
    subject?: string;
    grade?: string;
};
/**
 * 功能包标识（FEATURE_FLAGS）—— 双端 + 后端的「单一事实来源」。
 * - 以 Web 端 ALL_FEATURES（40 个）为基础，均为 camelCase「包级 key」，不做 games.2048 项级拆分。
 * - 旧 ['games'] 等价于「games 包开启」，迁移零兼容负担。
 * - 学校级 key 值域 = 教师级全集（超管可开关任意包级 key）。
 * 对齐：web-app/src/constants/features.ts、mini-program/src/pages/school-admin/school-admin.vue
 */
export declare const FEATURE_FLAGS: string[];
/** 功能包 key → 中文标签（双端 UI 展示用，保持单一来源） */
export declare const FEATURE_FLAG_LABELS: Record<string, string>;
/** 特性标识集合（用于快速 O(1) 查找） */
export declare const FEATURE_FLAGS_SET: Set<string>;
/** 标准功能包清单（双端 UI 直接复用） */
export declare const FEATURE_FLAG_LIST: {
    key: string;
    label: string;
}[];
/** 主题配色方案（4 色） */
export interface ColorScheme {
    value: string;
    label: string;
    color: string;
}
export declare const SCHEMES: ColorScheme[];
/** 主题色值数组 */
export declare const SCHEME_VALUES: string[];
/**
 * 字体大小选项（3 档）
 * 对齐：mini-program/src/common/store.js::FONT_SIZES
 */
export interface FontSizeOption {
    value: string;
    label: string;
    scale: number;
}
export declare const FONT_SIZES: FontSizeOption[];
//# sourceMappingURL=index.d.ts.map