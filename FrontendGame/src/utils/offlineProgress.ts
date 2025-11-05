export interface OfflineProgressEntry {
  level: number
  timeTaken: number
  moves: number
}

const STORAGE_KEY = 'offlineProgressV1'

export function getOfflineProgress(): OfflineProgressEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as OfflineProgressEntry[]
    return []
  } catch {
    return []
  }
}

export function addOfflineProgress(entry: OfflineProgressEntry): void {
  const current = getOfflineProgress()
  current.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function clearOfflineProgress(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function flushOfflineProgress(post: (entry: OfflineProgressEntry) => Promise<Response | null>): Promise<boolean> {
  const entries = getOfflineProgress()
  if (entries.length === 0) return true
  let allOk = true
  for (const entry of entries) {
    try {
      const res = await post(entry)
      if (!res || !res.ok) allOk = false
    } catch {
      allOk = false
    }
  }
  if (allOk) clearOfflineProgress()
  return allOk
}


