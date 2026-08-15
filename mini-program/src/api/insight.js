import { parentApi } from '../common/request'

/** 学生 AI 学习伙伴（家长端调用，后端带内容安全护栏） */
export function studyBuddy(messages, studentName) {
  return parentApi.post('/parent/insight/study-buddy', { messages, studentName })
}
