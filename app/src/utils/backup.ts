/**
 * 数据自动备份工具
 *
 * 功能:
 * - 定时自动备份所有用户数据到 localStorage / IndexedDB
 * - 保留多个历史版本, 支持回滚
 * - 手动触发备份和恢复
 * - 导出备份文件
 */

import { getCurrentUserId } from './storage'

const BACKUP_PREFIX = 'trace-backup'
const MAX_BACKUPS = 10 // 最多保留 10 个备份
const AUTO_BACKUP_KEY = 'trace-autobackup' // 自动备份开关（'1' 开 / '0' 关）
const DEFAULT_INTERVAL = 2 * 60 * 60 * 1000 // 默认每 2 小时备份一次

export interface BackupInfo {
  id: string
  timestamp: number
  userId: string
  size: number
  label?: string
}

let backupTimer: number | null = null

/** 获取所有需要备份的 store key */
function getAllStoreKeys(): string[] {
  const userId = getCurrentUserId() || 'public'
  const prefix = `trace.${userId}.`
  const keys: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix) && !key.startsWith(BACKUP_PREFIX)) {
      keys.push(key)
    }
  }

  return keys
}

/** 创建备份 */
export function createBackup(label?: string): BackupInfo {
  const userId = getCurrentUserId() || 'public'
  const keys = getAllStoreKeys()
  const data: Record<string, string> = {}

  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value) data[key] = value
  }

  const backupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const backupKey = `${BACKUP_PREFIX}.${userId}.${backupId}`
  const jsonStr = JSON.stringify(data)

  try {
    localStorage.setItem(
      backupKey,
      JSON.stringify({
        id: backupId,
        timestamp: Date.now(),
        userId,
        label,
        data,
      }),
    )
  } catch (e) {
    // 存储空间不足，清理最旧的备份后重试
    cleanupOldBackups()
    try {
      localStorage.setItem(
        backupKey,
        JSON.stringify({
          id: backupId,
          timestamp: Date.now(),
          userId,
          label,
          data,
        }),
      )
    } catch {
      // 仍然失败则跳过此次备份
      console.warn('[backup] 存储空间不足，跳过本次备份')
      return { id: backupId, timestamp: Date.now(), userId, size: 0, label }
    }
  }

  // 清理超出数量限制的旧备份
  cleanupOldBackups()

  return {
    id: backupId,
    timestamp: Date.now(),
    userId,
    size: jsonStr.length,
    label,
  }
}

/** 获取备份列表 (按时间倒序) */
export function getBackupList(): BackupInfo[] {
  const userId = getCurrentUserId() || 'public'
  const prefix = `${BACKUP_PREFIX}.${userId}.`
  const backups: BackupInfo[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const backup = JSON.parse(raw)
          backups.push({
            id: backup.id,
            timestamp: backup.timestamp,
            userId: backup.userId,
            size: JSON.stringify(backup.data).length,
            label: backup.label,
          })
        }
      } catch {
        // 跳过损坏的备份
      }
    }
  }

  return backups.sort((a, b) => b.timestamp - a.timestamp)
}

/** 恢复指定备份 */
export function restoreBackup(backupId: string): boolean {
  const userId = getCurrentUserId() || 'public'
  const backupKey = `${BACKUP_PREFIX}.${userId}.${backupId}`

  try {
    const raw = localStorage.getItem(backupKey)
    if (!raw) return false

    const backup = JSON.parse(raw)
    const data = backup.data as Record<string, string>

    // 先清除当前数据
    const currentKeys = getAllStoreKeys()
    for (const key of currentKeys) {
      localStorage.removeItem(key)
    }

    // 恢复备份数据
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value)
    }

    // 触发页面刷新以重新加载所有 store
    window.location.reload()
    return true
  } catch {
    return false
  }
}

/** 删除指定备份 */
export function deleteBackup(backupId: string): void {
  const userId = getCurrentUserId() || 'public'
  const backupKey = `${BACKUP_PREFIX}.${userId}.${backupId}`
  localStorage.removeItem(backupKey)
}

/** 清理旧备份, 只保留最新的 MAX_BACKUPS 个 */
function cleanupOldBackups(): void {
  const backups = getBackupList()
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS)
    for (const backup of toDelete) {
      deleteBackup(backup.id)
    }
  }
}

/** 导出备份为文件 */
export function exportBackup(backupId: string): void {
  const userId = getCurrentUserId() || 'public'
  const backupKey = `${BACKUP_PREFIX}.${userId}.${backupId}`
  const raw = localStorage.getItem(backupKey)
  if (!raw) return

  const blob = new Blob([raw], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  a.href = url
  a.download = `trace-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 从文件导入备份 */
export function importBackupFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result))

        // 基本结构校验，防止恶意或损坏的文件
        if (!backup || typeof backup !== 'object' || !backup.data || typeof backup.data !== 'object') {
          console.warn('[backup] 导入文件结构不合法')
          resolve(false)
          return
        }

        // 校验 data 中的值都是字符串（localStorage 存储格式）
        for (const [key, val] of Object.entries(backup.data)) {
          if (typeof key !== 'string' || typeof val !== 'string') {
            console.warn('[backup] 导入文件 data 格式不合法')
            resolve(false)
            return
          }
        }

        const userId = getCurrentUserId() || 'public'
        const backupId = `imported-${Date.now()}`
        const backupKey = `${BACKUP_PREFIX}.${userId}.${backupId}`

        localStorage.setItem(
          backupKey,
          JSON.stringify({
            ...backup,
            id: backupId,
            timestamp: Date.now(),
            userId,
            label: backup.label || '导入的备份',
          }),
        )

        cleanupOldBackups()
        resolve(true)
      } catch {
        resolve(false)
      }
    }
    reader.onerror = () => resolve(false)
    reader.readAsText(file)
  })
}

/** 启动自动备份 */
export function startAutoBackup(intervalMs: number = DEFAULT_INTERVAL): void {
  stopAutoBackup()

  // 启动时立即创建一次备份
  try {
    createBackup('自动备份 - 启动')
  } catch (e) {
    console.warn('[backup] 启动备份失败', e)
  }

  backupTimer = window.setInterval(() => {
    try {
      createBackup('自动备份')
    } catch (e) {
      console.warn('[backup] 定时备份失败', e)
    }
  }, intervalMs)
}

/** 停止自动备份 */
export function stopAutoBackup(): void {
  if (backupTimer !== null) {
    clearInterval(backupTimer)
    backupTimer = null
  }
}

/** 读取自动备份开关（默认开启） */
export function getAutoBackupEnabled(): boolean {
  const v = localStorage.getItem(AUTO_BACKUP_KEY)
  return v === null ? true : v === '1'
}

/** 写入自动备份开关 */
export function setAutoBackupEnabled(on: boolean): void {
  localStorage.setItem(AUTO_BACKUP_KEY, on ? '1' : '0')
}
