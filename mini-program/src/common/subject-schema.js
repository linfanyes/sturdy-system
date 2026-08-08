// 已提升到 shared/schemas/subject-schema.ts，本文件保留为 re-export 以维持原 import 路径
export {
  SUBJECT_TOOLS,
  getSubjectTool,
  SUBJECT_LIST,
  ALL_SUBJECTS,
  MATH_TOOLS,
  getToolsBySubject,
  // P1：教师任教学科计算 / 学科可见性判断（多学科支持）
  getTeacherSubjects,
  isTeacherSubjectVisible,
} from '@gardener/shared/schemas/subject-schema'