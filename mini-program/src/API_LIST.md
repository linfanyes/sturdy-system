## 小程序 API 调用清单

### common/request.js
- （无直接调用，仅封装实现）

### pages/ai/ai-exam.vue
- `POST /api/ai/analyze-exam`
- `GET /api/exams`
- `GET /api/generated/papers`
- `POST /api/notes`

### pages/ai/ai-interactive.vue
- `POST /api/ai/chat-sync`

### pages/ai/ai-knowledge.vue
- `POST /api/ai/chat-sync`
- `POST /api/generated/knowledges`
- `POST /api/notes`

### pages/ai/ai-lesson.vue
- `POST /api/ai/chat-sync`
- `POST /api/generated/lesson-plans`
- `POST /api/notes`

### pages/ai/ai-paper.vue
- `POST /api/ai/chat-sync`
- `POST /api/generated/papers`
- `POST /api/notes`

### pages/ai/ai.vue
- `POST /api/ai/chat`
- `GET /api/config/ai`
- `GET /api/config/ai-settings`
- `POST /api/notes`

### pages/analysis/analysis.vue
- `GET /api/attendances`
- `GET /api/classes`
- `GET /api/exams`
- `GET /api/grades`
- `GET /api/homework`
- `GET /api/notes`
- `GET /api/notices`
- `GET /api/semesters`
- `GET /api/students`
- `GET /api/todos`

### pages/attendance/attendance.vue
- `POST /api/attendances`
- `PATCH /api/attendances`
- `GET /api/attendances`
- `GET /api/classes`
- `POST /api/notices`
- `GET /api/students`

### pages/award-categories/award-categories.vue
- `POST /api/award-categories`
- `DEL /api/award-categories`
- `PATCH /api/award-categories`
- `GET /api/award-categories`

### pages/award-record/award-record.vue
- `GET /api/award-records`
- `POST /api/award-records`
- `DEL /api/award-records`
- `PATCH /api/award-records`

### pages/behavior-record/behavior-record.vue
- `GET /api/behavior-records`
- `POST /api/behavior-records`
- `DEL /api/behavior-records`
- `PATCH /api/behavior-records`
- `GET /api/classes`
- `GET /api/students`

### pages/checkin/checkin.vue
- `GET /api/checkins`
- `POST /api/checkins`
- `DEL /api/checkins`

### pages/class-activities/class-activities.vue
- `GET /api/class-activities`
- `POST /api/class-activities`
- `DEL /api/class-activities`
- `PATCH /api/class-activities`

### pages/class-activity/class-activity.vue
- `POST /api/class-activities`
- `DEL /api/class-activities`
- `GET /api/class-activities`
- `GET /api/classes`

### pages/class-duty/class-duty.vue
- `POST /api/class-duty-configs`
- `DEL /api/class-duty-configs`
- `PATCH /api/class-duty-configs`
- `GET /api/class-duty-configs`
- `GET /api/classes`
- `GET /api/students`

### pages/class-finance/class-finance.vue
- `POST /api/class-expenses`
- `DEL /api/class-expenses`
- `GET /api/class-expenses`
- `GET /api/classes`

### pages/classes/classes.vue
- `GET /api/classes`
- `POST /api/classes`
- `DEL /api/classes`
- `PATCH /api/classes`
- `POST /api/classes/school-teachers`
- `GET /api/config/public`
- `GET /api/notices`
- `GET /api/students`

### pages/config/config.vue
- `GET /api/config/ai`
- `PUT /api/config/ai`
- `GET /api/config/ai-providers`
- `PATCH /api/config/ai-settings`
- `GET /api/config/app-config`
- `PATCH /api/config/app-config`
- `PATCH /api/users/me`

### pages/crud/crud.vue
- `GET /api/classes`
- `POST /api/schedules/import-ai`
- `POST /api/schedules/import-commit`

### pages/dashboard/dashboard.vue
- `POST /api/ai/chat-sync`
- `GET /api/attendances`
- `GET /api/behavior-records`
- `GET /api/classes`
- `GET /api/grades`
- `GET /api/homework`
- `GET /api/notes`
- `GET /api/notices`
- `GET /api/notifications/unread-count`
- `GET /api/schedules`
- `GET /api/school-admin/search`
- `GET /api/semesters`
- `GET /api/students`
- `GET /api/todos`
- `POST /api/todos`
- `DEL /api/todos`
- `PATCH /api/todos`

### pages/data-dashboard/data-dashboard.vue
- `GET /api/attendances`
- `GET /api/classes`
- `GET /api/grades`
- `GET /api/notices`
- `GET /api/students`

### pages/data-manager/data-manager.vue
- `POST /api/backups`
- `DEL /api/backups`
- `GET /api/backups`

### pages/duty-config/duty-config.vue
- `POST /api/class-duty-configs`
- `DEL /api/class-duty-configs`
- `PATCH /api/class-duty-configs`
- `GET /api/class-duty-configs`
- `GET /api/classes`
- `GET /api/students`

### pages/duty-roster/duty-roster.vue
- `GET /api/classes`
- `POST /api/duty-rosters`
- `DEL /api/duty-rosters`
- `PATCH /api/duty-rosters`
- `GET /api/duty-rosters`

### pages/english-story/english-story.vue
- `POST /api/ai/generate`

### pages/essay/essay.vue
- `POST /api/ai/generate`

### pages/exam-detail/exam-detail.vue
- `GET /api/classes`
- `GET /api/exams`
- `GET /api/grades/analysis/exam`
- `GET /api/grades/analysis/rank`

### pages/exams/exams.vue
- `GET /api/classes`
- `GET /api/config/public`
- `GET /api/exams`
- `POST /api/exams`
- `DEL /api/exams`
- `PATCH /api/exams`

### pages/gallery/gallery.vue
- `POST /api/class-galleries`
- `DEL /api/class-galleries`
- `PATCH /api/class-galleries`
- `GET /api/class-galleries`
- `GET /api/classes`

### pages/grade-trend/grade-trend.vue
- `GET /api/classes`
- `GET /api/grades`
- `GET /api/students`

### pages/grades/grades.vue
- `POST /api/ai/analyze-exam`
- `POST /api/ai/diagnose`
- `GET /api/classes`
- `GET /api/config/public`
- `GET /api/exams`
- `GET /api/grades`
- `DEL /api/grades`
- `POST /api/grades/import-commit`
- `POST /api/grades/import-preview`
- `POST /api/grades/merge`
- `GET /api/semesters`
- `GET /api/students`

### pages/group-scores/group-scores.vue
- `GET /api/classes`
- `POST /api/group-scores`
- `DEL /api/group-scores`
- `PATCH /api/group-scores`
- `GET /api/group-scores`

### pages/grouper/grouper.vue
- `GET /api/classes`
- `GET /api/seat-layouts`
- `GET /api/students`

### pages/growth/growth.vue
- `GET /api/growth-entries`
- `POST /api/growth-entries`
- `DEL /api/growth-entries`

### pages/homework/homework.vue
- `GET /api/classes`
- `GET /api/homework`
- `POST /api/homework`
- `DEL /api/homework`
- `PATCH /api/homework`
- `POST /api/notices`

### pages/im/im.vue
- `GET /api/classes`
- `POST /api/im/class-group`
- `GET /api/im/parents`
- `POST /api/im/user-sig`

### pages/image-creation/image-creation.vue
- `POST /api/ai/gen-image`
- `POST /api/ai/gen-video`
- `GET /api/config/ai`
- `GET /api/my-galleries`
- `POST /api/my-galleries`
- `PATCH /api/my-galleries`

### pages/knowledges/knowledges.vue
- `POST /api/generated/knowledges`
- `DEL /api/generated/knowledges`
- `PATCH /api/generated/knowledges`
- `GET /api/generated/knowledges`

### pages/leaderboard/leaderboard.vue
- `GET /api/classes`
- `GET /api/reward-records`
- `GET /api/students`

### pages/lesson-observation/lesson-observation.vue
- `GET /api/classes`
- `GET /api/lesson-observations`
- `POST /api/lesson-observations`
- `DEL /api/lesson-observations`
- `PATCH /api/lesson-observations`

### pages/lesson-plan-templates/lesson-plan-templates.vue
- `POST /api/lesson-plan-templates`
- `DEL /api/lesson-plan-templates`
- `PATCH /api/lesson-plan-templates`
- `GET /api/lesson-plan-templates`

### pages/lesson-plans/lesson-plans.vue
- `GET /api/generated/lesson-plans`

### pages/login/login.vue
- `POST /api/auth/unified-login`

### pages/messages/messages.vue
- `POST /api/messages`
- `DEL /api/messages`
- `PATCH /api/messages`
- `PATCH /api/messages/mark-all-read`
- `GET /api/messages/recipients`
- `GET /api/messages/sent`
- `GET /api/messages`

### pages/my-gallery/my-gallery.vue
- `GET /api/my-galleries`
- `POST /api/my-galleries`
- `DEL /api/my-galleries`
- `PATCH /api/my-galleries`

### pages/notes/notes.vue
- `POST /api/ai/asr`
- `POST /api/ai/ocr`
- `POST /api/ai/parse-file`
- `GET /api/notes`
- `POST /api/notes`
- `DEL /api/notes`
- `PATCH /api/notes`
- `POST /api/security/img-check`
- `POST /api/security/msg-check`

### pages/notice-templates/notice-templates.vue
- `POST /api/notice-templates`
- `DEL /api/notice-templates`
- `PATCH /api/notice-templates`
- `GET /api/notice-templates`

### pages/notice/notice.vue
- `POST /api/ai/chat-sync`
- `GET /api/classes`
- `GET /api/notice-templates`
- `GET /api/notices`
- `POST /api/notices`
- `DEL /api/notices`
- `PATCH /api/notices`
- `POST /api/notices/push`
- `POST /api/security/msg-check`

### pages/notifications/notifications.vue
- `GET /api/notifications`
- `PATCH /api/notifications`
- `POST /api/notifications/mark-all-read`

### pages/office-tools/blackboard.vue
- `POST /api/ai/chat-sync`

### pages/office-tools/comment.vue
- `POST /api/ai/chat-sync`

### pages/office-tools/speech.vue
- `POST /api/ai/chat-sync`

### pages/office-tools/summary.vue
- `POST /api/ai/chat-sync`

### pages/office-tools/thesis.vue
- `POST /api/ai/chat-sync`

### pages/office-tools/translate.vue
- `POST /api/ai/chat-sync`

### pages/paper-queries/paper-queries.vue
- `POST /api/generated/queries`
- `DEL /api/generated/queries`
- `PATCH /api/generated/queries`
- `GET /api/generated/queries`

### pages/paper/paper.vue
- `POST /api/ai/generate`

### pages/papers/papers.vue
- `GET /api/generated/papers`

### pages/parent-contact/parent-contact.vue
- `GET /api/classes`
- `POST /api/parent-contacts`
- `DEL /api/parent-contacts`
- `PATCH /api/parent-contacts`
- `GET /api/students`

### pages/parent-login/parent-login.vue
- `POST /api/parent-auth/login`

### pages/parent/compare.vue
- `GET /api/parent-auth/compare-kids`

### pages/parent/parent-resource-library.vue
- `GET /api/resource-library/words/categories`

### pages/parent/parent.vue
- `GET /api/parent-auth/attendance`
- `GET /api/parent-auth/behavior`
- `POST /api/parent-auth/change-password`
- `GET /api/parent-auth/communications`
- `GET /api/parent-auth/exams`
- `GET /api/parent-auth/homework`
- `GET /api/parent-auth/me`
- `GET /api/parent-auth/notices`
- `GET /api/parent-auth/schedule`
- `POST /api/parent-auth/student-update-request`
- `GET /api/parent-auth/student-update-requests`
- `POST /api/parent-auth/switch-student`
- `GET /api/parent-auth/teachers`
- `GET /api/textbooks/search`
- `GET /api/textbooks/tree:id`

### pages/picker-history/picker-history.vue
- `GET /api/classes`
- `GET /api/picker-history`
- `DEL /api/picker-history`

### pages/plan-template-lib/plan-template-lib.vue
- `POST /api/lesson-plan-templates`
- `DEL /api/lesson-plan-templates`
- `PATCH /api/lesson-plan-templates`
- `GET /api/lesson-plan-templates`

### pages/profile/profile.vue
- `POST /api/award-records`
- `GET /api/backups`
- `POST /api/backups`
- `DEL /api/backups`
- `POST /api/backups/auto`
- `POST /api/classes`
- `GET /api/config/ai-providers`
- `GET /api/config/ai-settings`
- `PATCH /api/config/ai-settings`
- `GET /api/config/app-config`
- `PATCH /api/config/app-config`
- `POST /api/exams`
- `POST /api/grades/merge`
- `POST /api/notes`
- `POST /api/students`
- `POST /api/teachers`
- `POST /api/todos`
- `GET /api/users/me`
- `PUT /api/users/me`

### pages/quicktool/quicktool.vue
- `POST /api/ai/chat-sync`

### pages/radar/radar.vue
- `GET /api/classes`
- `GET /api/grades`
- `GET /api/students`

### pages/reading-log/reading-log.vue
- `GET /api/reading-logs`
- `POST /api/reading-logs`
- `DEL /api/reading-logs`
- `PATCH /api/reading-logs`

### pages/resource-library/resource-library.vue
- `GET /api/resource-library/words/categories`

### pages/resource/resource.vue
- `GET /api/resources`
- `POST /api/resources`
- `DEL /api/resources`

### pages/reward-records/reward-records.vue
- `GET /api/classes`
- `POST /api/reward-records`
- `DEL /api/reward-records`
- `PATCH /api/reward-records`
- `GET /api/reward-records`

### pages/scene-dialogue/scene-dialogue.vue
- `POST /api/ai/generate`

### pages/schedule-maker/schedule-maker.vue
- `GET /api/classes`

### pages/schedule/schedule.vue
- `GET /api/classes`
- `GET /api/schedules`
- `POST /api/schedules`
- `DEL /api/schedules`
- `PATCH /api/schedules`

### pages/school-admin/school-features.vue
- `GET /api/admin/schools`

### pages/score-records/score-records.vue
- `GET /api/classes`
- `POST /api/score-records`
- `DEL /api/score-records`
- `PATCH /api/score-records`
- `GET /api/score-records`

### pages/seatMap/seatMap.vue
- `GET /api/classes`
- `GET /api/exams`
- `GET /api/grades/analysis/rank`
- `POST /api/seat-layouts`
- `PATCH /api/seat-layouts/:id`
- `POST /api/seat-layouts/:id/activate`
- `GET /api/seat-layouts`
- `GET /api/students`

### pages/student-grades/student-grades.vue
- `GET /api/grades/analysis/student`
- `GET /api/students`

### pages/students/students.vue
- `POST /api/ai/chat-sync`
- `GET /api/attendances`
- `GET /api/behavior-records`
- `GET /api/classes`
- `GET /api/grades`
- `POST /api/students`
- `DEL /api/students`
- `PATCH /api/students`
- `POST /api/students/import`
- `POST /api/students/import-ai`
- `POST /api/students/import-commit`
- `GET /api/students`

### pages/subject-tools/dictation.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/grammar.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/idiom.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/listening.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/pinyin.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/poetry.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/reading.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/sentencePractice.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/speaking.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/spell.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/wordCard.vue
- `POST /api/ai/chat-sync`

### pages/subject-tools/writingMaterials.vue
- `POST /api/ai/chat-sync`

### pages/subject/subject.vue
- `POST /api/ai/chat-sync`

### pages/teacher/teacher.vue
- `GET /api/classes`
- `GET /api/teachers`
- `POST /api/teachers`
- `DEL /api/teachers`
- `PATCH /api/teachers`

### pages/teaching-calendar/teaching-calendar.vue
- `GET /api/teaching-calendar`
- `POST /api/teaching-calendar`
- `DEL /api/teaching-calendar`
- `PATCH /api/teaching-calendar`

### pages/todos/todos.vue
- `GET /api/todos`
- `POST /api/todos`
- `DEL /api/todos`
- `PATCH /api/todos`

### pages/tools/picker.vue
- `GET /api/classes`
- `GET /api/students`

### pages/tools/reward/reward.vue
- `GET /api/classes`
- `GET /api/reward-records`
- `POST /api/reward-records`
- `DEL /api/reward-records`
- `GET /api/students`

### pages/tools/scorePanel.vue
- `GET /api/classes`
- `GET /api/group-scores`
- `POST /api/group-scores`
- `DEL /api/group-scores`
- `PATCH /api/group-scores`

### pages/tools/strokeOrder.vue
- `POST /api/ai/chat-sync`

### pages/work-log/work-log.vue
- `GET /api/work-logs`
- `POST /api/work-logs`
- `DEL /api/work-logs`
- `PATCH /api/work-logs`
