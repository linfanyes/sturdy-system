import api from '../common/request'

/** 语音识别 (ASR) */
export function speechToText(audio, format = 'wav') {
  return api.post('/ai/asr', { audio, format })
}
/** 解析文件（PDF/图片）提取文字 */
export function parseFile(fileName, fileData) {
  return api.post('/ai/parse-file', { fileName, fileData })
}
/** OCR 图片识文 */
export function ocrImage(image) {
  return api.post('/ai/ocr', { image })
}
/** AI 流式对话（通用 chat-sync 端点） */
export function chatSync(payload) {
  return api.post('/ai/chat-sync', payload)
}
/** AI 考试分析 */
export function analyzeExam(payload) {
  return api.post('/ai/analyze-exam', payload)
}
/** AI 生成内容（通用：type = essay / paper / english-story / scene-dialogue 等） */
export function generateAi(prompt, type) {
  return api.post('/ai/generate', { prompt, type })
}
/** AI 生成图片 */
export function genImage(payload) {
  return api.post('/ai/gen-image', payload)
}
/** AI 生成视频 */
export function genVideo(payload) {
  return api.post('/ai/gen-video', payload)
}
