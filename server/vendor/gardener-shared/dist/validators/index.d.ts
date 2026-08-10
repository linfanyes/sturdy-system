/**
 * 跨端共享校验器 - 纯函数、无副作用、无框架依赖
 * 可在 Node.js、浏览器、微信小程序环境通用
 * 使用 tsconfig paths 别名 @gardener/shared/validators 导入
 */
/**
 * 严格手机号校验：必须符合 PHONE_REGEX，**不允许空**
 * @param value 待校验手机号
 * @returns true = 合法
 */
export declare function isPhone(value: string): boolean;
/**
 * 宽松手机号校验：允许空/undefined/null，非空则匹配 PHONE_REGEX
 * @param value 待校验手机号（可为空）
 * @returns true = 合法（含空值）
 */
export declare function isValidPhone(value: string | null | undefined): boolean;
/**
 * 手机号归一化：去除空格/横线，返回纯数字字符串
 * @param value 原始手机号
 * @returns 纯数字手机号
 */
export declare function normalizePhone(value: string): string;
/**
 * 班级名校验：必须符合 "年级+序号+班" 格式
 * 支持年级：
 *   - 小学：一~六年级（如 "五年级1班"）
 *   - 初中：初一~初三（如 "初二3班"）
 *   - 高中：高一~高三（如 "高一5班"）
 * @param name 班级名称
 * @param grade 可选：指定年级时额外校验年级一致性
 * @returns { valid: boolean; error?: string; classNo?: number }
 */
export declare function validateClassName(name: string, grade?: string): {
    valid: boolean;
    error?: string;
    classNo?: number;
};
/**
 * 由年级+序号生成标准班级名
 * @param grade 年级（如 "五年级"、"初二"、"高一"）
 * @param classNo 序号（1-99），支持数字或数字字符串
 * @param opts.lenient 宽松模式：true 时非法输入返回 ''（不抛异常），用于表单中间态
 * @returns 标准班级名（如 "五年级1班"、"初二3班"、"高一5班"）；宽松模式下非法输入返回 ''
 */
export declare function generateClassName(grade: string, classNo: number | string, opts?: {
    lenient?: boolean;
}): string;
/**
 * 解析标准班级名，返回 { grade, classNo }
 * 支持三种格式：
 *   - 小学：五年级1班 -> { grade: "五年级", classNo: 1 }
 *   - 初中：初二3班 -> { grade: "初二", classNo: 3 }
 *   - 高中：高一5班 -> { grade: "高一", classNo: 5 }
 * @param className 标准班级名
 * @returns { grade: string; classNo: number } | null
 */
export declare function parseClassName(className: string): {
    grade: string;
    classNo: number;
} | null;
/**
 * 校验学科是否在 SUBJECT_OPTIONS 中
 * @param subject 学科名称
 * @returns true = 合法学科
 */
export declare function isSubject(subject: string): boolean;
/**
 * 反查学科对象（通过 value 找 SubjectOption）
 * @param value 学科值
 * @returns SubjectOption | undefined
 */
export declare function getSubjectByValue(value: string): import('../constants').SubjectOption | undefined;
/**
 * 校验角色是否合法（4 种角色之一）
 * @param role 角色字符串
 * @returns true = 合法角色
 */
export declare function isRole(role: string): boolean;
/**
 * 权限特性检查：判断 features 数组是否包含指定 feature
 * - fail-closed：features 缺失 / 非数组 / 空数组 一律拒绝（不猜测、不放行）
 * - 非空数组 = 必须包含 feature 才放行
 * @param features 用户拥有的特性数组
 * @param feature 待检查的特性
 * @returns true = 有权限
 */
export declare function hasFeature(features: string[], feature: string): boolean;
/**
 * 校验年级是否合法
 * @param grade 年级字符串
 * @returns true = 合法年级
 */
export declare function isGrade(grade: string): boolean;
/**
 * 校验分数范围（默认 0-100，可自定义 max）
 * @param score 分数
 * @param max 最大分值，默认 100
 * @returns true = 合法分数
 */
export declare function isScore(score: number | string, max?: number): boolean;
/**
 * 校验非空字符串（trim 后判断）
 * @param value 待校验值
 * @returns true = 非空
 */
export declare function isNonEmpty(value: string | null | undefined): boolean;
/**
 * 校验学号格式：字母数字组合，2-32 位
 * @param studentNo 学号
 * @returns true = 合法（允许空，视为可选字段）
 */
export declare function isStudentNo(studentNo: string | null | undefined): boolean;
/**
 * 邮箱校验：标准格式。
 * @param s 邮箱字符串
 * @returns true = 合法
 */
export declare function isEmail(s: string | null | undefined): boolean;
/**
 * 数字范围校验：min/max 均为闭区间；非数字返回 false。
 * @param num 待校验值
 * @param min 最小值（含），可选
 * @param max 最大值（含），可选
 * @returns true = 在范围内
 */
export declare function inRange(num: number | string, min: number | null, max: number | null): boolean;
/**
 * 整数范围校验（含负数）。
 * @param num 待校验值
 * @param min 最小值（含），可选
 * @param max 最大值（含），可选
 * @returns true = 合法整数且在范围内
 */
export declare function isInt(num: number | string, min?: number | null, max?: number | null): boolean;
/**
 * 校验金额：最多两位小数的正数
 * @param amount 金额
 * @returns true = 合法
 */
export declare function isAmount(amount: number | string): boolean;
/**
 * URL 格式校验（允许空值）
 * @param url URL 字符串
 * @returns true = 合法或空
 */
export declare function isUrl(url: string | null | undefined): boolean;
/**
 * 日期字符串校验：YYYY-MM-DD 格式（允许空值）
 * @param dateStr 日期字符串
 * @returns true = 合法或空
 */
export declare function isDateStr(dateStr: string | null | undefined): boolean;
/**
 * 字符串长度截断
 * @param str 字符串
 * @param max 最大长度
 * @returns 截断后字符串
 */
export declare function clip(str: string | null | undefined, max: number): string;
/** 常见字段最大长度参考（与后端 entity 定义对齐） */
export declare const MAX_LEN: {
    readonly NAME: 50;
    readonly TITLE: 100;
    readonly PHONE: 11;
    readonly STUDENT_NO: 32;
    readonly EMAIL: 100;
    readonly URL: 500;
    readonly TAG: 20;
    readonly REMARK: 200;
    readonly SCHOOL: 60;
    readonly SUBJECT: 30;
    readonly PASSWORD: 64;
};
export { PHONE_REGEX, PHONE_HINT, CLASS_NAMING_RULE, SUBJECT_VALUES, ROLE_VALUES, FEATURE_FLAGS_SET, GRADE_OPTIONS } from '../constants';
export type { SubjectOption, RoleOption, Role } from '../constants';
/**
 * 归一化某一级的功能清单：null / 非数组 / 空数组 → 全集（FEATURE_FLAGS）。
 * @param flags 某一级配置（学校级或教师级）
 * @returns 归一化后的 key 列表
 */
export declare function normalizeLevel(flags: string[] | null | undefined): string[];
/**
 * 计算实际可用功能包：effective = 学校级 ∩ 教师级。
 * @param schoolFlags 学校级 featureFlags
 * @param teacherFeatures 教师级 features
 * @returns 实际可用的 key 列表（保持 FEATURE_FLAGS 原始顺序）
 */
export declare function computeEffective(schoolFlags: string[] | null | undefined, teacherFeatures: string[] | null | undefined): string[];
/**
 * 判断某 key 是否被「学校级」关闭（教师即使勾选也不可用）。
 * @param key 功能包 key
 * @param schoolFlags 学校级 featureFlags
 * @returns true = 被学校级关闭
 */
export declare function isBlockedBySchool(key: string, schoolFlags: string[] | null | undefined): boolean;
//# sourceMappingURL=index.d.ts.map