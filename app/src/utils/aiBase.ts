// AI 服务商默认 baseUrl 集中常量。
// 原因：原先 dashscope / deepseek 的默认地址散落在 6 个调用点硬编码，
// 且两处默认值不一致，既难以统一维护，也容易漏改。
// 集中后一处修改、全局生效，且消除重复字面量。
export const AI_DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const AI_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
