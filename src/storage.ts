const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage may be full or unavailable; the app keeps working in memory
  }
}

const remove = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // nothing to clean up
  }
}

export const storage = { read, write, remove }
