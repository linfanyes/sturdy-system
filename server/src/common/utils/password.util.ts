import * as bcrypt from 'bcrypt'
import * as crypto from 'node:crypto'

/**
 * 密码工具：bcrypt 加盐哈希 + 向后兼容旧 sha256 数据。
 *
 * 策略：
 * - 新密码用 bcrypt.hash(p, 10) 存储，格式：$2b$10$...
 * - 校验时先尝试 bcrypt.compare；若 hash 不是 bcrypt 格式（64 位 hex），降级为 sha256 校验
 * - sha256 校验成功后自动升级为 bcrypt（透明迁移）
 */
const BCRYPT_ROUNDS = 10

/** 判断是否为 bcrypt 哈希格式 */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[abxy]\$\d{2}\$/.test(hash)
}

/** 用 bcrypt 加盐哈希密码 */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS)
}

/**
 * 校验密码：支持 bcrypt 和旧 sha256。
 * 若为旧 sha256 且校验通过，返回 true（调用方可据此升级）。
 */
export function verifyPassword(plain: string, hash: string): boolean {
  if (!hash) return false
  if (isBcryptHash(hash)) {
    return bcrypt.compareSync(plain, hash)
  }
  // 降级：sha256（无盐）兼容旧数据
  return crypto.createHash('sha256').update(plain).digest('hex') === hash
}

/**
 * 校验密码并在需要时自动升级为 bcrypt。
 * @returns 若升级了返回新 hash，否则返回 null。
 */
export function verifyAndUpgrade(plain: string, hash: string): { valid: boolean; newHash: string | null } {
  if (!hash) return { valid: false, newHash: null }
  if (isBcryptHash(hash)) {
    return { valid: bcrypt.compareSync(plain, hash), newHash: null }
  }
  // sha256 兼容：校验通过则升级
  if (crypto.createHash('sha256').update(plain).digest('hex') === hash) {
    return { valid: true, newHash: hashPassword(plain) }
  }
  return { valid: false, newHash: null }
}
