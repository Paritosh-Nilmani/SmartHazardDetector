export const getElevationAlongPath = async (path) => {
  if (!path || path.length === 0) return []

  try {
    const response = await fetch("/api/elevation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path.map((p) => ({
          lat: typeof p.lat === "function" ? p.lat() : p.lat,
          lng: typeof p.lng === "function" ? p.lng() : p.lng,
        })),
        // No longer passing apiKey - server uses ELEVATION_API_KEY
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Elevation API error:", errorData.error)
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[v0] Elevation API fetch error:", error)
    return []
  }
}

export const detectElevationChanges = (elevationData, threshold = 2) => {
  const hazards = []

  if (!elevationData || elevationData.length < 2) return hazards

  for (let i = 1; i < elevationData.length; i++) {
    const prev = elevationData[i - 1]
    const curr = elevationData[i]

    if (!prev?.location || !curr?.location) continue

    const elevationChange = Math.abs(curr.elevation - prev.elevation)

    if (elevationChange > threshold) {
      const severity = elevationChange > 5 ? "high" : elevationChange > 3 ? "medium" : "low"

      hazards.push({
        type: "speed_breaker",
        lat: curr.location.lat,
        lng: curr.location.lng,
        severity,
        source: "elevation_detection",
        elevationChange,
        confidence: Math.min(elevationChange / 10, 1),
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return hazards
}
