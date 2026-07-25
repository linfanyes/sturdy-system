// 配置与登录态端点（含教师/系统配置、当前用户）
export const authEndpoints = {
  '/config/public': { defaultSubjects: ['语文', '数学', '英语', '科学', '道德与法治', '体育', '音乐', '美术', '信息科技'] },
  '/users/me': { id: 'u1', name: '珊珊老师', school: '阳光实验小学', subjects: ['语文', '品德'] },
  '/config/ai': { id: 'ai_demo', teacherId: 'u1', baseUrl: 'https://api.openai.com/v1', apiKey: '', textModel: 'gpt-4o-mini', visionModel: 'gpt-4o', imageModel: 'dall-e-3', videoModel: 'none', temperature: 0.7, aiName: '小林子', systemPrompt: '你是一位耐心、专业的小学教师助手。', resourceModels: { chat: 'gpt-4o-mini', 'exam-analysis': 'gpt-4o' } },
  '/config/app': [{ key: '版本', value: '1.0.0 (demo)' }, { key: '环境', value: '演示模式' }],
}
