/**
 * IndexedDB 封装工具 (基于 idb 库)
 *
 * 用于替代 localStorage 存储大量数据, 支持:
 * - 更大容量 (通常 50MB+)
 * - 异步读写, 不阻塞主线程
 * - 更高效的查询
 *
 * 渐进式迁移方案:
 * 1. 现有 localStorage 继续工作
 * 2. 新增数据优先写入 IndexedDB
 * 3. 提供迁移工具批量导入
 */

let dbPromise: Promise<IDBDatabase> | null = null
const DB_NAME = 'trace-db'
const DB_VERSION = 1
const STORE_NAME = 'stores'

/**
 * 初始化 IndexedDB
 * 注意: 需要先安装 idb 依赖: npm install idb
 * 当前实现使用原生 IndexedDB API, 避免额外依赖
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * 存储数据到 IndexedDB
 */
export async function setDBItem(key: string, value: any, userId?: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put({
      key,
      value,
      userId: userId || 'public',
      updatedAt: Date.now(),
    })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 IndexedDB 读取数据
 */
export async function getDBItem<T = any>(key: string): Promise<T | null> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)
    request.onsuccess = () => {
      const result = request.result
      resolve(result ? result.value : null)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 IndexedDB 删除数据
 */
export async function removeDBItem(key: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取所有存储的 key
 */
export async function getAllDBKeys(): Promise<string[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()
    request.onsuccess = () => resolve(request.result as string[])
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 localStorage 迁移到 IndexedDB
 * 将当前用户的所有 trace.* 数据迁移过去
 */
export async function migrateFromLocalStorage(userId?: string): Promise<number> {
  const prefix = userId ? `trace.${userId}.` : 'trace.public.'
  let count = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || 'null')
        await setDBItem(key, value, userId)
        count++
      } catch {
        // 跳过解析失败的
      }
    }
  }

  return count
}

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return 'indexedDB' in window
  } catch {
    return false
  }
}
