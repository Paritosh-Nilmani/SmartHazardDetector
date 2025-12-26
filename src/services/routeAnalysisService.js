import { getElevationAlongPath, detectElevationChanges } from "./elevationService"

const MIN_CONFIDENCE_THRESHOLD = 0.4 // 40% - hazards below this won't be shown

export const analyzeRouteForHazards = async (route, existingHazards) => {
  if (!route || !route.routes || route.routes.length === 0) {
    return { predictedHazards: [], speedChanges: [], elevationHazards: [] }
  }

  const path = route.routes[0].overview_path
  const legs = route.routes[0].legs

  // Analyze speed changes from route data
  const speedChanges = []
  legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step, stepIndex) => {
      if (step.duration && step.distance) {
        const avgSpeed = (step.distance.value / step.duration.value) * 3.6

        if (legIndex > 0 || stepIndex > 0) {
          const prevStep =
            stepIndex > 0 ? leg.steps[stepIndex - 1] : legs[legIndex - 1]?.steps[legs[legIndex - 1].steps.length - 1]

          if (prevStep && prevStep.duration && prevStep.distance) {
            const prevSpeed = (prevStep.distance.value / prevStep.duration.value) * 3.6
            const speedDelta = Math.abs(avgSpeed - prevSpeed)

            if (speedDelta > 20) {
              const location = step.start_location
              const confidence = Math.min(speedDelta / 60, 1)

              if (confidence >= MIN_CONFIDENCE_THRESHOLD) {
                speedChanges.push({
                  lat: typeof location.lat === "function" ? location.lat() : location.lat,
                  lng: typeof location.lng === "function" ? location.lng() : location.lng,
                  speedDelta,
                  severity: speedDelta > 40 ? "high" : speedDelta > 30 ? "medium" : "low",
                  type: "speed_breaker",
                  source: "route_analysis",
                  confidence,
                })
              }
            }
          }
        }
      }
    })
  })

  // Get elevation data and detect elevation-based hazards
  let elevationHazards = []
  try {
    console.log("[v0] Fetching elevation data for", path.length, "points")
    const elevationData = await getElevationAlongPath(path)

    if (elevationData && elevationData.length > 0) {
      console.log("[v0] Received elevation data:", elevationData.length, "points")
      const rawElevationHazards = detectElevationChanges(elevationData)
      elevationHazards = rawElevationHazards.filter((h) => (h.confidence || 0) >= MIN_CONFIDENCE_THRESHOLD)
      console.log(
        "[v0] Detected",
        elevationHazards.length,
        "elevation-based hazards (filtered from",
        rawElevationHazards.length,
        ")",
      )
    } else {
      console.log("[v0] No elevation data received - check ELEVATION_API_KEY")
    }
  } catch (error) {
    console.error("[v0] Error analyzing elevation:", error)
  }

  // Cross-check with existing hazards for clustering
  const predictedHazards = clusterPredictions(speedChanges, elevationHazards, existingHazards)

  console.log("[v0] Route analysis complete:", {
    speedChanges: speedChanges.length,
    elevationHazards: elevationHazards.length,
    predictedHazards: predictedHazards.length,
  })

  return {
    predictedHazards,
    speedChanges,
    elevationHazards,
  }
}

const clusterPredictions = (speedChanges, elevationHazards, existingHazards) => {
  const combined = [...speedChanges, ...elevationHazards]
  const predictions = []

  combined.forEach((prediction) => {
    const predLat = prediction.location
      ? typeof prediction.location.lat === "function"
        ? prediction.location.lat()
        : prediction.location.lat
      : prediction.lat
    const predLng = prediction.location
      ? typeof prediction.location.lng === "function"
        ? prediction.location.lng()
        : prediction.location.lng
      : prediction.lng

    if (!predLat || !predLng) return

    const nearbyExisting = existingHazards.filter((hazard) => {
      const hazardLat = hazard.lat || hazard.location?.latitude
      const hazardLng = hazard.lng || hazard.location?.longitude
      if (!hazardLat || !hazardLng) return false

      const distance = calculateDistance(predLat, predLng, hazardLat, hazardLng)
      return distance < 50 // Within 50 meters
    })

    const baseConfidence = prediction.confidence || 0.4
    let finalConfidence

    if (nearbyExisting.length > 0) {
      // Boost confidence when verified by existing hazards
      finalConfidence = Math.min(0.8 + nearbyExisting.length * 0.05, 1)
    } else {
      finalConfidence = baseConfidence
    }

    if (finalConfidence >= MIN_CONFIDENCE_THRESHOLD) {
      predictions.push({
        lat: predLat,
        lng: predLng,
        type: prediction.type || "speed_breaker",
        severity: prediction.severity,
        source: prediction.source,
        confidence: finalConfidence,
        verifiedBy: nearbyExisting.length,
        clustered: nearbyExisting.length > 0,
      })
    }
  })

  return predictions
}

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
