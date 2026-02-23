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

  for (let i = 1; i < elevationData.length - 1; i++) {
    const prev = elevationData[i - 1]
    const curr = elevationData[i]
    const next = elevationData[i + 1]

    if (!prev?.location || !curr?.location || !next?.location) continue

    const dipDown = prev.elevation - curr.elevation  // elevation drops (dip)
    const riseUp = next.elevation - curr.elevation   // elevation rises back (up)

    // Pothole: dip then up pattern
    if (dipDown > 0 && riseUp > 0) {
      const dipMagnitude = Math.min(dipDown, riseUp)

      if (dipMagnitude >= threshold) {
        // Confidence based on how symmetric and deep the dip is
        const symmetry = 1 - Math.abs(dipDown - riseUp) / Math.max(dipDown, riseUp)
        const depthScore = Math.min(dipMagnitude / 5, 1)
        const confidence = symmetry * depthScore

        // Only report if confidence >= 80%
        if (confidence >= 0.8) {
          const severity = dipMagnitude > 5 ? "high" : dipMagnitude > 3 ? "medium" : "low"

          hazards.push({
            type: "pothole",
            lat: curr.location.lat,
            lng: curr.location.lng,
            severity,
            source: "elevation_detection",
            elevationChange: dipMagnitude,
            confidence: parseFloat(confidence.toFixed(2)),
            pattern: "dip_up",
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }
  }

  return hazards
}




