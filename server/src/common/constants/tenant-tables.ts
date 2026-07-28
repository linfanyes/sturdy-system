/**
 * 多租户业务表清单（共享常量，消除 school-admin / admin 服务中的重复定义）
 */
/** 教师个人数据表（按 teacherId 级联清理） */
export const TEACHER_ID_TABLES = [
  'exams', 'grades', 'notes', 'todos', 'picker_history',
  'backup_snapshots', 'ai_settings', 'app_config',
  'generated_papers', 'generated_lesson_plans', 'generated_knowledges', 'paper_queries',
  'class_expenses', 'class_activities', 'duty_rosters',
  'reward_records', 'score_records', 'group_scores',
  'growth_entries', 'behavior_records',
  'parent_contacts', 'seat_layouts', 'class_galleries',
  'notices', 'lesson_observations', 'work_logs', 'lesson_plan_templates',
  'reading_logs', 'checkins', 'award_records', 'award_categories',
  'class_duty_configs', 'notice_templates', 'home_visits', 'teaching_calendar',
  'class_members', 'my_galleries', 'notifications', 'schedules', 'resources',
  'semesters', 'teachers',
];

/** 班级数据表（按 classId 级联清理） */
export const CLASS_ID_TABLES = [
  'grades', 'exams', 'homework', 'attendances', 'notices',
  'schedules', 'seat_layouts', 'class_galleries', 'my_galleries',
  'class_activities', 'class_expenses', 'class_duty_configs',
  'duty_rosters', 'class_members', 'students',
];

/** 全量业务数据表（超管一键清除用，按 teacherId 过滤） */
export const ALL_BUSINESS_TABLES = [
  'picker_history', 'todos', 'notes',
  'ai_settings', 'app_config', 'audit_logs',
  'paper_queries', 'generated_knowledges', 'generated_lesson_plans', 'generated_papers',
  'notice_templates', 'notifications',
  'semesters', 'teaching_calendar',
  'backup_snapshots',
  'reading_logs', 'checkins', 'home_visits',
  'behavior_records', 'growth_entries',
  'parent_contacts',
  'award_records', 'award_categories',
  'score_records', 'reward_records', 'group_scores',
  'grades', 'exams',
  'homework',
  'attendances',
  'schedules',
  'seat_layouts',
  'resources',
  'work_logs',
  'lesson_observations', 'lesson_plan_templates',
  'class_members',
  'class_activities', 'class_expenses', 'class_duty_configs',
  'class_galleries', 'my_galleries',
  'notices',
  'duty_rosters',
];
