const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export const filterHazardsByProximity = (hazards, userLocation, warningDistance, filters) => {
  if (!userLocation) return []

  return hazards
    .filter((hazard) => {
      if (!filters.types.includes(hazard.type)) return false
      if (!filters.severities.includes(hazard.severity)) return false
      if (filters.onlyVerified && !hazard.verified) return false

      const hazardLat = hazard.location?.latitude || hazard.lat
      const hazardLng = hazard.location?.longitude || hazard.lng

      if (!hazardLat || !hazardLng) return false

      const distance = getHaversineDistance(userLocation.lat, userLocation.lng, hazardLat, hazardLng)
      hazard.distanceFromUser = distance

      return distance <= warningDistance
    })
    .sort((a, b) => a.distanceFromUser - b.distanceFromUser)
}

export const generateStatusText = (hazardsInProximity, userLocation) => {
  if (!hazardsInProximity || hazardsInProximity.length === 0) {
    return "Normal Road"
  }

  const closest = hazardsInProximity[0] // Already sorted by distance

  const hazardLabels = {
    speed_breaker: "Speed Breaker",
    pothole: "Pothole",
    manhole: "Pothole",
  }

  const distance = Math.round(closest.distanceFromUser || 0)

  return `⚠ ${hazardLabels[closest.type] || "Hazard"} Ahead (${closest.severity.toUpperCase()}) - ${distance}m`
}

export const getHazardsAlongRoute = (hazards, routePath, userLocation, lookAheadDistance, filters) => {
  if (!routePath || !userLocation || !hazards) return []

  // Find user's position on route
  let minDistanceToRoute = Number.POSITIVE_INFINITY
  let userRouteIndex = 0

  for (let i = 0; i < routePath.length; i++) {
    const pointLat = typeof routePath[i].lat === "function" ? routePath[i].lat() : routePath[i].lat
    const pointLng = typeof routePath[i].lng === "function" ? routePath[i].lng() : routePath[i].lng

    const distance = getHaversineDistance(userLocation.lat, userLocation.lng, pointLat, pointLng)
    if (distance < minDistanceToRoute) {
      minDistanceToRoute = distance
      userRouteIndex = i
    }
  }

  // Get hazards ahead on the route
  const hazardsAhead = []

  hazards.forEach((hazard) => {
    if (!filters.types.includes(hazard.type)) return
    if (!filters.severities.includes(hazard.severity)) return
    if (filters.onlyVerified && !hazard.verified) return

    const hazardLat = hazard.location?.latitude || hazard.lat
    const hazardLng = hazard.location?.longitude || hazard.lng

    if (!hazardLat || !hazardLng) return

    // Check if hazard is near any point on the route ahead of user
    for (let i = userRouteIndex; i < routePath.length; i++) {
      const pointLat = typeof routePath[i].lat === "function" ? routePath[i].lat() : routePath[i].lat
      const pointLng = typeof routePath[i].lng === "function" ? routePath[i].lng() : routePath[i].lng

      const distanceFromRoutePoint = getHaversineDistance(hazardLat, hazardLng, pointLat, pointLng)
      const distanceFromUser = getHaversineDistance(userLocation.lat, userLocation.lng, hazardLat, hazardLng)

      // Hazard is within 50m of route and within look-ahead distance from user
      if (distanceFromRoutePoint < 50 && distanceFromUser < lookAheadDistance) {
        hazardsAhead.push({
          ...hazard,
          distanceFromUser,
          routeIndex: i,
        })
        break
      }
    }
  })

  // Sort by distance from user
  return hazardsAhead.sort((a, b) => a.distanceFromUser - b.distanceFromUser)
}

export const buildRouteSummary = (hazards, routePath, filters) => {
  if (!routePath || routePath.length === 0) {
    return {}
  }

  const summary = {
  speed_breaker: { low: 0, medium: 0, high: 0 },
  pothole: { low: 0, medium: 0, high: 0 },
}


  hazards.forEach((hazard) => {
    if (!filters.types.includes(hazard.type)) return
    if (!filters.severities.includes(hazard.severity)) return
    if (filters.onlyVerified && !hazard.verified) return

    if (isHazardNearRoute(hazard, routePath, 100)) {
      const normalizedType = hazard.type === "manhole" ? "pothole" : hazard.type
       if (summary[normalizedType]) {
       summary[normalizedType][hazard.severity]++
}

    }
  })

  return summary
}

const isHazardNearRoute = (hazard, routePath, proximityRadius) => {
  if (!routePath) return false

  const hazardLat = hazard.location?.latitude || hazard.lat
  const hazardLng = hazard.location?.longitude || hazard.lng

  if (!hazardLat || !hazardLng) return false

  for (let i = 0; i < routePath.length; i++) {
    const pointLat = typeof routePath[i].lat === "function" ? routePath[i].lat() : routePath[i].lat
    const pointLng = typeof routePath[i].lng === "function" ? routePath[i].lng() : routePath[i].lng

    const distance = getHaversineDistance(hazardLat, hazardLng, pointLat, pointLng)

    if (distance <= proximityRadius) {
      return true
    }
  }

  return false
}

export const playProximityAlert = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (e) {
    console.error("[v0] Audio error:", e)
  }
}
