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

export const detectElevationChanges = (elevationData, threshold = 1) => {
  const hazards = []

  if (!elevationData || elevationData.length < 3) return hazards

  // 🔹 Smooth elevation data (reduce noise)
  const smoothData = elevationData.map((point, i, arr) => {
    const prev = arr[i - 1]?.elevation ?? point.elevation
    const next = arr[i + 1]?.elevation ?? point.elevation

    return {
      ...point,
      smoothElevation: (prev + point.elevation + next) / 3,
    }
  })

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  for (let i = 1; i < smoothData.length - 1; i++) {
    const prev = smoothData[i - 1]
    const curr = smoothData[i]
    const next = smoothData[i + 1]

    if (!prev?.location || !curr?.location || !next?.location) continue

    const prevElevation = prev.smoothElevation
    const currElevation = curr.smoothElevation
    const nextElevation = next.smoothElevation

    const drop = prevElevation - currElevation
    const rise = nextElevation - currElevation

    const bumpUp = currElevation - prevElevation
    const bumpDown = currElevation - nextElevation

    // =========================
    // 🔥 POTHOLE DETECTION
    // =========================
    const isDip = drop > 0 && rise > 0

    if (isDip) {
      const elevationChange = Math.min(drop, rise)

      if (elevationChange < 0.5) continue

      const dist = getDistance(
        prev.location.lat,
        prev.location.lng,
        next.location.lat,
        next.location.lng
      )

      if (dist > 30) continue

      let confidence = 0

      if (elevationChange >= 0.7) confidence += 0.4
      else if (elevationChange >= 0.5) confidence += 0.3

      confidence += 0.3

      const consistency = Math.abs(drop - rise) < 0.3
      if (consistency) confidence += 0.3

      if (confidence < 0.8) continue

      const severity =
        elevationChange > 1
          ? "high"
          : elevationChange > 0.7
          ? "medium"
          : "low"

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

    // =========================
    // 🔥 SPEED BREAKER DETECTION (Balanced & Working)
    // =========================
    const isBump = bumpUp > 0 && bumpDown > 0

    if (isBump) {
      const elevationChange = Math.min(bumpUp, bumpDown)

      if (elevationChange < threshold) continue

      const dist = getDistance(
        prev.location.lat,
        prev.location.lng,
        next.location.lat,
        next.location.lng
      )

      // Less strict than pothole
      if (dist > 50) continue

      const sharpness = Math.abs(bumpUp - bumpDown)

      let confidence = 0

      if (elevationChange > 3) confidence += 0.5
      else if (elevationChange > 1) confidence += 0.3

      confidence += 0.3

      if (sharpness < 1) confidence += 0.2

      // Less strict than pothole
      if (confidence < 0.5) continue

      const severity =
        elevationChange > 4
          ? "high"
          : elevationChange > 2
          ? "medium"
          : "low"

      hazards.push({
        type: "speed_breaker",
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



