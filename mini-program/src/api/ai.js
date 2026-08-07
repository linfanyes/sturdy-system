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
