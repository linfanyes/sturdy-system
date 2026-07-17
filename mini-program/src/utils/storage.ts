let _currentUserId: string | null = null
const _subscribers = new Set<() => void>()

export function setCurrentUserId(id: string | null) {
  if (_currentUserId === id) return
  _currentUserId = id
  for (const cb of _subscribers) {
    try {
      cb()
    } catch (e) {
      console.warn('[storage] user-change callback error:', e)
    }
  }
}

export function getCurrentUserId(): string | null {
  return _currentUserId
}

export function getStorageKey(base: string): string {
  return _currentUserId
    ? `trace.${_currentUserId}.${base}`
    : `trace.public.${base}`
}

export function onUserChange(cb: () => void): () => void {
  _subscribers.add(cb)
  return () => {
    _subscribers.delete(cb)
  }
}

export function migrateLegacyKey<T>(base: string, fallback: T): T {
  const userKey = getStorageKey(base)
  try {
    const raw = uni.getStorageSync(userKey)
    if (raw) return JSON.parse(raw) as T
    const legacyRaw = uni.getStorageSync(`trace.${base}`)
    if (legacyRaw) {
      const data = JSON.parse(legacyRaw) as T
      uni.setStorageSync(userKey, JSON.stringify(data))
      uni.removeStorageSync(`trace.${base}`)
      return data
    }
  } catch (e) {}
  return fallback
}

export function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = uni.getStorageSync(key)
    if (raw) return JSON.parse(raw) as T
  } catch (e) {}
  return fallback
}

export function setStorage<T>(key: string, value: T): void {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  } catch (e) {
    console.warn('[storage] setStorage err:', e)
  }
}
