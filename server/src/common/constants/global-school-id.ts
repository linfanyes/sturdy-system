/**
 * 全局共享数据标识。
 * 教学资源库（resource_*）/ 教材（textbook_*）等「产品初始化数据」与用户信息无关，
 * 归入此 schoolId，所有学校可见可读；resetAll 一键清除不删除，缺失时由初始化流程补齐。
 */
export const GLOBAL_SCHOOL_ID = 'global'
