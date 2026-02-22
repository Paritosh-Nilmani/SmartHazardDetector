// export const getElevationAlongPath = async (path) => {
//   if (!path || path.length === 0) return []

//   try {
//     const response = await fetch("/api/elevation", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         path: path.map((p) => ({
//           lat: typeof p.lat === "function" ? p.lat() : p.lat,
//           lng: typeof p.lng === "function" ? p.lng() : p.lng,
//         })),
//         // No longer passing apiKey - server uses ELEVATION_API_KEY
//       }),
//     })

//     if (!response.ok) {
//       const errorData = await response.json()
//       console.error("[v0] Elevation API error:", errorData.error)
//       return []
//     }

//     const data = await response.json()
//     return data.results || []
//   } catch (error) {
//     console.error("[v0] Elevation API fetch error:", error)
//     return []
//   }
// }

// export const detectElevationChanges = (elevationData, threshold = 2) => {
//   const hazards = []

//   if (!elevationData || elevationData.length < 2) return hazards

//   for (let i = 1; i < elevationData.length; i++) {
//     const prev = elevationData[i - 1]
//     const curr = elevationData[i]

//     if (!prev?.location || !curr?.location) continue

//     const elevationChange = Math.abs(curr.elevation - prev.elevation)

//     if (elevationChange > threshold) {
//       const severity = elevationChange > 5 ? "high" : elevationChange > 3 ? "medium" : "low"

//       hazards.push({
//         type: "speed_breaker",
//         lat: curr.location.lat,
//         lng: curr.location.lng,
//         severity,
//         source: "elevation_detection",
//         elevationChange,
//         confidence: Math.min(elevationChange / 10, 1),
//         detectedAt: new Date().toISOString(),
//       })
//     }
//   }

//   return hazards
// }






// New Logic 


export const detectElevationChanges = (elevationData, threshold = 2) => {
  const hazards = []

  if (!elevationData || elevationData.length < 3) return hazards

  // 🔹 Smooth data (only for potholes)
  const smoothData = elevationData.map((point, i, arr) => {
    const prev = arr[i - 1]?.elevation ?? point.elevation
    const next = arr[i + 1]?.elevation ?? point.elevation

    return {
      ...point,
      smoothElevation: (prev + point.elevation + next) / 3,
    }
  })

  for (let i = 1; i < elevationData.length - 1; i++) {
    const prevRaw = elevationData[i - 1]
    const currRaw = elevationData[i]

    const prev = smoothData[i - 1]
    const curr = smoothData[i]
    const next = smoothData[i + 1]

    if (!prevRaw?.location || !currRaw?.location) continue
    if (!prev?.location || !curr?.location || !next?.location) continue

    // =========================
    // 🔥 SPEED BREAKER (KEEP OLD LOGIC)
    // =========================
    const elevationChange = Math.abs(currRaw.elevation - prevRaw.elevation)

    if (elevationChange > threshold) {
      const severity =
        elevationChange > 5 ? "high" :
        elevationChange > 3 ? "medium" : "low"

      const confidence = Math.min(elevationChange / 10, 1)

      // Keep your old threshold (40%)
      if (confidence >= 0.4) {
        hazards.push({
          type: "speed_breaker",
          lat: currRaw.location.lat,
          lng: currRaw.location.lng,
          severity,
          source: "elevation_detection",
          elevationChange,
          confidence,
          detectedAt: new Date().toISOString(),
        })
      }
    }

    // =========================
    // 🔥 POTHOLE (NEW IMPROVED LOGIC)
    // =========================
    const prevElevation = prev.smoothElevation
    const currElevation = curr.smoothElevation
    const nextElevation = next.smoothElevation

    const drop = prevElevation - currElevation
    const rise = nextElevation - currElevation

    const isDip = drop > 0 && rise > 0

    if (isDip) {
      const elevationChange = Math.min(drop, rise)

      // Ignore small dips
      if (elevationChange < 0.5) continue

      let confidence = 0

      // Depth score
      if (elevationChange >= 0.7) confidence += 0.4
      else if (elevationChange >= 0.5) confidence += 0.3

      // Pattern score
      confidence += 0.3

      // Consistency score
      if (Math.abs(drop - rise) < 0.3) confidence += 0.3

      // Only high confidence potholes
      if (confidence < 0.8) continue

      const severity =
        elevationChange > 1 ? "high" :
        elevationChange > 0.7 ? "medium" : "low"

      hazards.push({
        type: "pothole",
        lat: curr.location.lat,
        lng: curr.location.lng,
        severity,
        source: "elevation_detection",
        elevationChange,
        confidence,
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return hazards
}
