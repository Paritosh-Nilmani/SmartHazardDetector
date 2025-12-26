"use client"

import { useEffect, useState, useCallback } from "react"

export const useDynamicRoadStatus = (location, routePath, hazards, filters) => {
  const [segmentStatus, setSegmentStatus] = useState({
    segmentIndex: 0,
    totalSegments: 0,
    hazardCount: 0,
    isIdle: true,
    distanceCovered: 0,
  })

  const calculateSegmentStatus = useCallback(() => {
    if (!location || !routePath || routePath.length === 0) return

    const SEGMENT_DISTANCE_KM = 2
    const EARTH_RADIUS_KM = 6371

    const getDistance = (lat1, lng1, lat2, lng2) => {
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLng = ((lng2 - lng1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return EARTH_RADIUS_KM * c
    }

    // Find closest point on route to current location
    let minDistance = Number.POSITIVE_INFINITY
    let closestSegmentIndex = 0

    for (let i = 0; i < routePath.length - 1; i++) {
      const segment = [routePath[i], routePath[i + 1]]
      const distance = getDistance(location.lat, location.lng, segment[0].lat, segment[0].lng)
      if (distance < minDistance) {
        minDistance = distance
        closestSegmentIndex = i
      }
    }

    // Calculate 2km segment boundaries
    let distanceAccumulated = 0
    let segmentStartIndex = 0
    let currentSegmentIndex = 0

    for (let i = 0; i < routePath.length - 1; i++) {
      const segmentDist = getDistance(routePath[i].lat, routePath[i].lng, routePath[i + 1].lat, routePath[i + 1].lng)
      distanceAccumulated += segmentDist

      if (distanceAccumulated >= SEGMENT_DISTANCE_KM) {
        currentSegmentIndex++
        segmentStartIndex = i + 1
        distanceAccumulated = 0

        if (closestSegmentIndex < segmentStartIndex) {
          break
        }
      }
    }

    const totalSegments = Math.ceil(
      getDistance(
        routePath[0].lat,
        routePath[0].lng,
        routePath[routePath.length - 1].lat,
        routePath[routePath.length - 1].lng,
      ) / SEGMENT_DISTANCE_KM || 1,
    )

    // Count hazards in current 2km segment
    let hazardCountInSegment = 0
    if (segmentStartIndex < routePath.length) {
      const segmentEnd =
        segmentStartIndex + Math.floor((SEGMENT_DISTANCE_KM * routePath.length) / (totalSegments * SEGMENT_DISTANCE_KM))

      hazards.forEach((hazard) => {
        if (!filters.types.includes(hazard.type) || !filters.severities.includes(hazard.severity)) return

        const hazardDist = getDistance(location.lat, location.lng, hazard.lat, hazard.lng)
        if (hazardDist < SEGMENT_DISTANCE_KM * 1.5) {
          hazardCountInSegment++
        }
      })
    }

    const isIdle = hazardCountInSegment <= 4

    setSegmentStatus({
      segmentIndex: currentSegmentIndex,
      totalSegments,
      hazardCount: hazardCountInSegment,
      isIdle,
      distanceCovered: minDistance,
    })
  }, [location, routePath, hazards, filters])

  useEffect(() => {
    const interval = setInterval(calculateSegmentStatus, 1000)
    return () => clearInterval(interval)
  }, [calculateSegmentStatus])

  return segmentStatus
}
