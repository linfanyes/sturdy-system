/**
 * 全局登录态 store —— 已拆分为共享鉴权状态机实现。
 *
 * 本文件作为**向后兼容 re-export shim**：继续让所有 `@/stores/auth` 的 importer
 * 通过统一入口拿到 `useAuthStore`，但实际实现收敛到 `auth-machine.ts`
 * 中的 `createAuthMachine`（shared/auth/factory.ts）。
 *
 * 旧直接实现已删除（124 行）。如需修改鉴权行为，请编辑：
 *   - 共享逻辑：shared/auth/factory.ts
 *   - Web 适配：/auth-machine.ts（localStorage 持久化 + Pinia 桥接）
 *
 * 提供者：Pinia store id 仍为 'auth'（与旧版一致，避免 devtools / 持久化插件断裂）。
 */
export { useAuthStore } from './auth-machine'
