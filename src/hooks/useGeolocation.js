"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export const useGeolocation = (onLocationUpdate) => {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [speed, setSpeed] = useState(0)
  const [heading, setHeading] = useState(null)
  const watchIdRef = useRef(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef(null)
  const lastPositionRef = useRef(null)
  const lastTimeRef = useRef(null)
  const isTrackingRef = useRef(false)
  const speedHistoryRef = useRef([])
  const hasReceivedPositionRef = useRef(false)

  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
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
  }, [])

  const calculateBearing = useCallback((lat1, lng1, lat2, lng2) => {
    const phi1 = (lat1 * Math.PI) / 180
    const phi2 = (lat2 * Math.PI) / 180
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180

    const y = Math.sin(deltaLambda) * Math.cos(phi2)
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)

    const bearing = (Math.atan2(y, x) * 180) / Math.PI
    return (bearing + 360) % 360
  }, [])

  const smoothSpeed = useCallback((newSpeed) => {
    speedHistoryRef.current.push(newSpeed)
    if (speedHistoryRef.current.length > 5) {
      speedHistoryRef.current.shift()
    }
    const sum = speedHistoryRef.current.reduce((a, b) => a + b, 0)
    return sum / speedHistoryRef.current.length
  }, [])

  const startTracking = useCallback(() => {
    if (isTrackingRef.current) {
      return
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      const defaultLocation = { lat: 28.6139, lng: 77.209, accuracy: 0, timestamp: Date.now() }
      setLocation(defaultLocation)
      if (onLocationUpdate) {
        onLocationUpdate(defaultLocation, 0)
      }
      return
    }

    isTrackingRef.current = true
    hasReceivedPositionRef.current = false

    navigator.geolocation.getCurrentPosition(
      (position) => {
        hasReceivedPositionRef.current = true
        const { latitude, longitude, accuracy } = position.coords
        const initialLocation = { lat: latitude, lng: longitude, accuracy, timestamp: position.timestamp }
        setLocation(initialLocation)
        setError(null)
        if (onLocationUpdate) {
          onLocationUpdate(initialLocation, 0)
        }
      },
      () => {
        // Silently fail - watchPosition will handle it or use fallback
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 },
    )

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        hasReceivedPositionRef.current = true
        const { latitude, longitude, speed: gpsSpeed, accuracy, heading: gpsHeading } = position.coords

        const newLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: position.timestamp,
        }

        let calculatedSpeed = 0
        let calculatedHeading = gpsHeading

        if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0) {
          calculatedSpeed = gpsSpeed * 3.6
        } else if (lastPositionRef.current && lastTimeRef.current) {
          const timeDiff = (position.timestamp - lastTimeRef.current) / 1000
          if (timeDiff > 0.5) {
            const distance = calculateDistance(
              lastPositionRef.current.lat,
              lastPositionRef.current.lng,
              latitude,
              longitude,
            )
            calculatedSpeed = (distance / timeDiff) * 3.6

            if (calculatedHeading === null || calculatedHeading === undefined) {
              calculatedHeading = calculateBearing(
                lastPositionRef.current.lat,
                lastPositionRef.current.lng,
                latitude,
                longitude,
              )
            }
          }
        }

        const smoothedSpeed = smoothSpeed(Math.max(0, calculatedSpeed))

        lastPositionRef.current = newLocation
        lastTimeRef.current = position.timestamp

        setLocation(newLocation)
        setSpeed(smoothedSpeed)
        setHeading(calculatedHeading)
        setError(null)
        retryCountRef.current = 0

        if (onLocationUpdate) {
          onLocationUpdate(newLocation, smoothedSpeed)
        }
      },
      (error) => {
        if (!hasReceivedPositionRef.current) {
          console.log("[v0] Geolocation unavailable, using default location")
        }

        if (error.code === 3 && retryCountRef.current < 2) {
          retryCountRef.current++

          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
          isTrackingRef.current = false

          retryTimeoutRef.current = setTimeout(() => {
            isTrackingRef.current = true
            watchIdRef.current = navigator.geolocation.watchPosition(
              (position) => {
                hasReceivedPositionRef.current = true
                const { latitude, longitude, accuracy } = position.coords
                const newLocation = { lat: latitude, lng: longitude, accuracy, timestamp: position.timestamp }
                setLocation(newLocation)
                setError(null)
                if (onLocationUpdate) {
                  onLocationUpdate(newLocation, 0)
                }
              },
              () => {
                if (!hasReceivedPositionRef.current) {
                  const defaultLocation = { lat: 28.6139, lng: 77.209, accuracy: 0, timestamp: Date.now() }
                  setLocation(defaultLocation)
                  if (onLocationUpdate) {
                    onLocationUpdate(defaultLocation, 0)
                  }
                }
              },
              { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 },
            )
          }, 1000)
        } else if (!hasReceivedPositionRef.current) {
          const defaultLocation = { lat: 28.6139, lng: 77.209, accuracy: 0, timestamp: Date.now() }
          setLocation(defaultLocation)
          if (onLocationUpdate) {
            onLocationUpdate(defaultLocation, 0)
          }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 30000,
      },
    )
  }, [onLocationUpdate, calculateDistance, calculateBearing, smoothSpeed])

  const stopTracking = useCallback(() => {
    console.log("[v0] Stopping GPS tracking")
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    isTrackingRef.current = false
    retryCountRef.current = 0
    speedHistoryRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    location,
    speed,
    heading,
    error,
    startTracking,
    stopTracking,
  }
}
