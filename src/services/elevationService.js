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

export const detectElevationChanges = (elevationData, threshold = 2) => {
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

  // 🔹 Distance function (used for filtering slopes)
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
    // 🔥 POTHOLE DETECTION (includes manholes)
    // =========================
    const isDip = drop > 0 && rise > 0

    if (isDip) {
      const elevationChange = Math.min(drop, rise)

      // Ignore small dips (noise)
      if (elevationChange < 0.5) continue

      // Ignore long gradual dips (not potholes)
      const dist = getDistance(
        prev.location.lat,
        prev.location.lng,
        next.location.lat,
        next.location.lng
      )

      if (dist > 20) continue

      // 🔹 Confidence calculation
      let confidence = 0

      // Depth score (40%)
      if (elevationChange >= 0.7) confidence += 0.4
      else if (elevationChange >= 0.5) confidence += 0.3

      // Pattern score (30%)
      confidence += 0.3

      // Symmetry / consistency (30%)
      const consistency = Math.abs(drop - rise) < 0.3
      if (consistency) confidence += 0.3

      // Only high confidence potholes
      if (confidence < 0.8) continue

      const severity =
        elevationChange > 1
          ? "high"
          : elevationChange > 0.7
          ? "medium"
          : "low"

      hazards.push({
        type: "pothole", // 🔥 unified type (manhole included)
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
    // 🔥 SPEED BREAKER DETECTION
    // =========================
    const isBump = bumpUp > 0 && bumpDown > 0

    if (isBump) {
      const elevationChange = Math.min(bumpUp, bumpDown)

      if (elevationChange < threshold) continue

      // 🔹 Sharpness check (avoid slopes)
      const sharpness = Math.abs(bumpUp - bumpDown)
      if (sharpness > 1) continue

      // 🔹 Distance check (avoid hills)
      const dist = getDistance(
        prev.location.lat,
        prev.location.lng,
        next.location.lat,
        next.location.lng
      )

      if (dist > 20) continue

      // 🔹 Confidence calculation
      let confidence = 0

      // Height score (50%)
      if (elevationChange > 4) confidence += 0.5
      else if (elevationChange > 2) confidence += 0.3

      // Pattern score (30%)
      confidence += 0.3

      // Sharpness score (20%)
      if (sharpness < 0.5) confidence += 0.2

      if (confidence < 0.6) continue

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
        confidence,
        detectedAt: new Date().toISOString(),
      })
    }
  }

  // 🔹 Remove duplicates (~10 meters)
  const filteredHazards = []

  hazards.forEach((h) => {
    const exists = filteredHazards.some((f) => {
      const dist = Math.sqrt(
        Math.pow(f.lat - h.lat, 2) + Math.pow(f.lng - h.lng, 2)
      )
      return dist < 0.0001
    })

    if (!exists) filteredHazards.push(h)
  })

  return filteredHazards
}
