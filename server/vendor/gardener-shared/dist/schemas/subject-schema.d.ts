/**
 * 语文 / 数学 / 英语 / 科学 / 道德与法治 学科专项工具（AI 生成类）配置（跨端共享）
 *
 * 每项：title 标题；icon 图标；subject 学科；fields 表单字段；build(f) 生成 prompt
 * 字段 type: input 文本 / number 数字 / picker 选项(带 options) / textarea 多行
 *
 * 使用端：
 *  - 小程序端 quick/subject.vue / subject-list.vue / school-admin.vue 已接入
 *  - Web 端尚未接入，后续可通过 SUBJECT_LIST 渲染学科工具首页
 */
export type SubjectToolFieldType = 'input' | 'number' | 'picker' | 'textarea';
export interface SubjectToolFieldDef {
    k: string;
    label: string;
    type: SubjectToolFieldType;
    required?: boolean;
    options?: string[];
    placeholder?: string;
}
export interface SubjectToolDef {
    title: string;
    icon: string;
    subject: string;
    fields: SubjectToolFieldDef[];
    build: (f: Record<string, string>) => string;
}
export type SubjectToolSchema = {
    [key: string]: SubjectToolDef;
};
export declare const SUBJECT_TOOLS: SubjectToolSchema;
export declare function getSubjectTool(type: string): SubjectToolDef | null;
export interface SubjectListItem {
    subject: string;
    icon: string;
    color: string;
    desc: string;
}
/**
 * 学科清单（用于工具箱"学科工具"上层菜单的学科入口展示）。
 */
export declare const SUBJECT_LIST: SubjectListItem[];
/**
 * 完整学科列表（15 科，与 shared/constants SUBJECT_OPTIONS 对齐）。
 */
export declare const ALL_SUBJECTS: string[];
export interface MathToolItem {
    label: string;
    icon: string;
    path: string;
}
/**
 * 数学学科独立工具入口（不在 SUBJECT_TOOLS 中，跳转到独立页面）。
 */
export declare const MATH_TOOLS: MathToolItem[];
export interface ToolMenuItem {
    key: string;
    title: string;
    icon: string;
    subject: string;
    path?: string;
    subjectKey?: string;
}
/**
 * 按学科名称返回该学科的所有工具列表。
 */
export declare function getToolsBySubject(subject: string): ToolMenuItem[];
/**
 * 计算教师「可见」的任教学科（用于 Web / 小程序端按学科过滤工具入口）：
 * - subjects 数组非空 → 以数组为准（可多学科任教的教师）
 * - 否则回退到 subject 主学科
 * - 两者都为空 → 返回全部学科（兼容超管/校管/无学科信息的历史账号，不做限制）
 *
 * 满足需求：语文老师只能看到语文对应工具 + 公共工具，看不到数学/英语等其他学科工具。
 */
export declare function getTeacherSubjects(subject?: string, subjects?: string[]): string[];
/**
 * 判断某学科是否为该教师可见学科之一（teacherSubjects 为空时视为可见）。
 */
export declare function isTeacherSubjectVisible(subject: string, teacherSubjects?: string[]): boolean;
//# sourceMappingURL=subject-schema.d.ts.map