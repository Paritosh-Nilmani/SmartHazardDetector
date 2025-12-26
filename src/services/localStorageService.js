// Fallback storage when Firebase is not available
const STORAGE_KEY = "roadguard_hazards"

export const saveHazardLocally = (hazardData) => {
  try {
    const hazards = getLocalHazards()
    const newHazard = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...hazardData,
      createdAt: new Date().toISOString(),
      voteYes: 0,
      voteNo: 0,
      isLocal: true, // Mark as local-only
    }
    hazards.push(newHazard)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hazards))
    console.log("[v0] Hazard saved locally:", newHazard.id)
    return newHazard.id
  } catch (error) {
    console.error("[v0] Error saving to localStorage:", error)
    return null
  }
}

export const getLocalHazards = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("[v0] Error reading from localStorage:", error)
    return []
  }
}

export const updateLocalHazard = (hazardId, updates) => {
  try {
    const hazards = getLocalHazards()
    const index = hazards.findIndex((h) => h.id === hazardId)
    if (index !== -1) {
      hazards[index] = { ...hazards[index], ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hazards))
    }
  } catch (error) {
    console.error("[v0] Error updating localStorage:", error)
  }
}

export const deleteLocalHazard = (hazardId) => {
  try {
    const hazards = getLocalHazards().filter((h) => h.id !== hazardId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hazards))
  } catch (error) {
    console.error("[v0] Error deleting from localStorage:", error)
  }
}

export const clearLocalHazards = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("[v0] Error clearing localStorage:", error)
  }
}
