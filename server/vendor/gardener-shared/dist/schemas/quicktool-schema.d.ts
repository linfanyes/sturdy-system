/**
 * 通用「文字办公 / 其他」AI 工具配置（非学科类）（跨端共享）
 *
 * 每个工具：icon/title + fields(表单字段) + build(form)->prompt
 * 页面 pages/quicktool/quicktool.vue 按 type 动态渲染并调用 /api/ai/chat-sync
 *
 * 使用端：
 *  - 小程序端 quick/quicktool.vue 已接入
 *  - Web 端尚未接入，后续可在 web-app 增加工具中心页消费此 schema
 */
export type QuickToolFieldType = 'text' | 'number' | 'picker' | 'textarea';
export interface QuickToolFieldDef {
    k: string;
    label: string;
    type: QuickToolFieldType;
    required?: boolean;
    options?: string[];
    placeholder?: string;
}
export interface QuickToolDef {
    icon: string;
    title: string;
    hint: string;
    fields: QuickToolFieldDef[];
    build: (f: Record<string, string>) => string;
}
export type QuickToolSchema = Record<string, QuickToolDef>;
export declare const QUICK_TOOLS: QuickToolSchema;
export declare function getQuickTool(type: string): QuickToolDef | null;
//# sourceMappingURL=quicktool-schema.d.ts.map