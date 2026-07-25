// Jest 测试环境下替换 @napi-rs/canvas 原生模块：CI/单测环境通常缺少对应平台的
// 原生二进制，直接 require 会抛错。此处提供一个最小桩，仅满足 ai.service 的导入，
// 避免在不需要真实 OCR 渲染的单元测试中加载原生 binding。
export function createCanvas(): any {
  return {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage() {},
      fillRect() {},
      fillText() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
    }),
    toBuffer: () => Buffer.from(''),
  }
}

export default { createCanvas }
