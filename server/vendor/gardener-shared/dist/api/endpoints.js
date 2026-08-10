"use strict";
/**
 * 后端端点契约（API Endpoints Contract）—— Web 端 & 小程序端的单一事实来源。
 *
 * 【契约】每个端点定义 method / path 模板 / 请求与响应类型。
 * 两侧的请求实现（fetch / callContainer 等）各自保留，类型与 path 常量从这里导入。
 *
 * 【对齐】契约与 server/src/game-scores/*.controller.ts、server/src/chat-history/*.controller.ts 严格一致。
 * 若后端接口变更，只需改此处 + 对应 controller，两侧无需再同步。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_SESSIONS_PATHS = exports.GAME_SCORES_PATHS = void 0;
// ======== 小游戏得分 ========
/** 游戏得分提交 / 查询 endpoints */
exports.GAME_SCORES_PATHS = {
    /** POST /game-scores —— 上报一次对局得分（幂等 upsert） */
    submit: '/game-scores',
    /** GET /game-scores —— 当前教师所有游戏得分（榜单） */
    list: '/game-scores',
    /** GET /game-scores/:gameKey —— 单游戏最高分 */
    byKey: (gameKey) => `/game-scores/${gameKey}`,
};
// ======== AI 对话历史 ========
/** AI 对话 history endpoints */
exports.CHAT_SESSIONS_PATHS = {
    /** POST /chat-sessions —— 新建会话 */
    create: '/chat-sessions',
    /** GET /chat-sessions —— 会话列表 */
    list: '/chat-sessions',
    /** GET /chat-sessions/:id —— 会话详情（含全部消息） */
    byId: (id) => `/chat-sessions/${id}`,
    /** PATCH /chat-sessions/:id/messages —— 追加一条消息 */
    appendMessage: (id) => `/chat-sessions/${id}/messages`,
    /** PATCH /chat-sessions/:id/pin —— 置顶/取消置顶 */
    togglePin: (id) => `/chat-sessions/${id}/pin`,
    /** DELETE /chat-sessions/:id —— 删除会话 */
    remove: (id) => `/chat-sessions/${id}`,
};
//# sourceMappingURL=endpoints.js.map