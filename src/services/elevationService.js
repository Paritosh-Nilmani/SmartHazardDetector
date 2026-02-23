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





// NEW LOGIC 



export const detectElevationChanges = (elevationData, threshold = 2) => {
  const hazards = []

  if (!elevationData || elevationData.length < 3) return hazards

  // 🔹 Smooth data ONLY for pothole detection
  const smoothData = elevationData.map((point, i, arr) => {
    const prev = arr[i - 1]?.elevation ?? point.elevation
    const next = arr[i + 1]?.elevation ?? point.elevation

    return {
      ...point,
      smoothElevation: (prev + point.elevation + next) / 3,
    }
  })

  for (let i = 1; i < elevationData.length; i++) {
    const prev = elevationData[i - 1]
    const curr = elevationData[i]

    if (!prev?.location || !curr?.location) continue

    // =========================
    // 🔥 ORIGINAL SPEED BREAKER LOGIC (UNCHANGED)
    // =========================
    const elevationChange = Math.abs(curr.elevation - prev.elevation)

    if (elevationChange > threshold) {
      const severity =
        elevationChange > 5
          ? "high"
          : elevationChange > 3
          ? "medium"
          : "low"

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

    // =========================
    // 🔥 NEW POTHOLE LOGIC (STRICT)
    // =========================
    if (i === 0 || i === elevationData.length - 1) continue

    const prevSmooth = smoothData[i - 1]
    const currSmooth = smoothData[i]
    const nextSmooth = smoothData[i + 1]

    if (!prevSmooth || !currSmooth || !nextSmooth) continue

    const drop = prevSmooth.smoothElevation - currSmooth.smoothElevation
    const rise = nextSmooth.smoothElevation - currSmooth.smoothElevation

    const isDip = drop > 0 && rise > 0

    if (isDip) {
      const potholeDepth = Math.min(drop, rise)

      // Ignore small dips (noise)
      if (potholeDepth < 0.5) continue

      // 🔹 Confidence calculation
      let confidence = 0

      // Depth score
      if (potholeDepth >= 0.7) confidence += 0.4
      else if (potholeDepth >= 0.5) confidence += 0.3

      // Pattern score
      confidence += 0.3

      // Symmetry score
      if (Math.abs(drop - rise) < 0.3) confidence += 0.3

      // Only high confidence potholes
      if (confidence < 0.8) continue

      const severity =
        potholeDepth > 1
          ? "high"
          : potholeDepth > 0.7
          ? "medium"
          : "low"

      hazards.push({
        type: "pothole",
        lat: currSmooth.location.lat,
        lng: currSmooth.location.lng,
        severity,
        source: "elevation_detection",
        elevationChange: potholeDepth,
        confidence,
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return hazards
}
