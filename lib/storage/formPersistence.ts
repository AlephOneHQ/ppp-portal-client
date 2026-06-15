export const formStorage = {
  /**
   * Save form data to localStorage
   */
  save: <T = unknown>(key: string, data: T): void => {
    try {
      const serialized = JSON.stringify(data)
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error("[v0] Error saving form data:", error)
    }
  },

  /**
   * Load form data from localStorage
   */
  load: <T = unknown>(key: string): T | null => {
    try {
      const serialized = localStorage.getItem(key)
      if (serialized === null) {
        return null
      }
      return JSON.parse(serialized) as T
    } catch (error) {
      console.error("[v0] Error loading form data:", error)
      return null
    }
  },

  /**
   * Remove form data from localStorage
   */
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error("[v0] Error removing form data:", error)
    }
  },

  /**
   * Check if form data exists
   */
  exists: (key: string): boolean => {
    try {
      return localStorage.getItem(key) !== null
    } catch (error) {
      return false
    }
  },
}
