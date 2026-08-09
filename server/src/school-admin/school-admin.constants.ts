/**
 * 学校管理员模块常量
 */
// fix-5: 学校级公告占位符常量，避免魔术字符串与真实班级 ID 冲突
// 此标记用于 Notice.classId 字段表示全校公告（不归属任何具体班级）
export const SCHOOL_NOTICE_CLASS_ID = '__school__'
