/**
 * 通用 CRUD 页面实体字段配置表（跨端共享）
 *
 * 由后端 TypeORM 实体自动归纳生成。
 * 字段 type 仅支持：input / textarea / picker / number / date
 * 排除系统字段：id、teacherId、createdAt、updatedAt
 * 说明：
 *  - 与 *Name 同时存在的 studentId 视为冗余外键，已省略（保留可读的 *Name）。
 *  - TypeORM simple-json 字段（数组/对象）无对应类型，统一用 textarea 存放 JSON 文本。
 *  - boolean 字段统一用 picker(['是','否']) 表达开关。
 *  - 含固定可选值的字段用 picker 并给出合理 options。
 *
 * 使用端：
 *  - 小程序端 crud.vue 已接入
 *  - Web 端 schema-driven 渲染器（CrudSchemaRenderer.vue）已接入
 */
export type CrudFieldType = 'input' | 'textarea' | 'picker' | 'number' | 'date';
export interface CrudFieldDef {
    key: string;
    label: string;
    type: CrudFieldType;
    required?: boolean;
    options?: string[];
    placeholder?: string;
}
export interface CrudEntityDef {
    title: string;
    prefix: string;
    fields: CrudFieldDef[];
    display: string[];
    search: string;
    bulkImport?: string;
}
export type CrudSchema = Record<string, CrudEntityDef>;
export declare const CRUD_SCHEMA: CrudSchema;
//# sourceMappingURL=crud-schema.d.ts.map