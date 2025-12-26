"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MapContainer } from "./components/MapContainer"
import { BottomDock } from "./components/BottomDock"
import { DetectionConfirmationToast } from "./components/DetectionConfirmationToast"
import { ProximityVotingModal } from "./components/ProximityVotingModal"
import { RouteInput } from "./components/RouteInput"
import { NavigationPanel } from "./components/NavigationPanel"
import { HazardAlert } from "./components/HazardAlert"
import { FirebaseStatus } from "./components/FirebaseStatus"
import { useGeolocation } from "./hooks/useGeolocation"
import { useMotionDetection } from "./hooks/useMotionDetection"
import { useDynamicRoadStatus } from "./hooks/useDynamicRoadStatus"
import {
  subscribeToHazards,
  createHazard,
  voteOnHazard,
  updateHazard,
  deleteHazard,
  isFirebaseAvailable,
  retryFirebaseConnection,
} from "./services/firebase"
import {
  filterHazardsByProximity,
  generateStatusText,
  buildRouteSummary,
  getHazardsAlongRoute,
  playProximityAlert,
} from "./services/hazardAnalytics"
import { getDirections } from "./services/googlemaps"
import { analyzeRouteForHazards } from "./services/routeAnalysisService"
import { validateConfig } from "./config"

export default function App() {
  const [map, setMap] = useState(null)
  const [google, setGoogle] = useState(null)
  const [hazards, setHazards] = useState([])
  const [warningDistance, setWarningDistance] = useState(100)
  const [isDetecting, setIsDetecting] = useState(false)
  const [currentDetection, setCurrentDetection] = useState(null)
  const [detectedHazards, setDetectedHazards] = useState([])
  const [proximityVoting, setProximityVoting] = useState(null)
  const [statusText, setStatusText] = useState("Normal Road")
  const [hazardsInProximity, setHazardsInProximity] = useState([])
  const [routePath, setRoutePath] = useState(null)
  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [routeSummary, setRouteSummary] = useState({})
  const [predictedHazards, setPredictedHazards] = useState([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [hazardsAhead, setHazardsAhead] = useState([])
  const [currentHazardAlert, setCurrentHazardAlert] = useState(null)
  const [filters, setFilters] = useState({
    types: ["speed_breaker", "pothole", "manhole"],
    severities: ["low", "medium", "high"],
    onlyVerified: false,
  })
  const [showFirebaseWarning, setShowFirebaseWarning] = useState(false)
  const [configWarnings, setConfigWarnings] = useState([])
  const [currentSegmentStatus, setCurrentSegmentStatus] = useState(null)

  const lastAlertTimeRef = useRef(0)
  const lastAlertedHazardRef = useRef(null)

  const handleLocationUpdate = useCallback(
    (newLocation, newSpeed) => {
      if (map && google && hazards.length > 0) {
        const proximity = filterHazardsByProximity(hazards, newLocation, warningDistance, filters)
        setHazardsInProximity(proximity)

        if (isNavigating && routePath) {
          const ahead = getHazardsAlongRoute(hazards, routePath, newLocation, 500, filters)
          setHazardsAhead(ahead)

          // Show alert for closest hazard
          if (ahead.length > 0 && newSpeed > 2) {
            const closestHazard = ahead[0]
            const hazardKey = `${closestHazard.id}`

            if (lastAlertedHazardRef.current !== hazardKey) {
              setCurrentHazardAlert({
                hazard: closestHazard,
                distance: closestHazard.distanceFromUser,
              })
              lastAlertedHazardRef.current = hazardKey
            }
          }
        }

        // Only play alert if moving and enough time has passed
        const now = Date.now()
        if (proximity.length > 0 && newSpeed > 5 && now - lastAlertTimeRef.current > 5000) {
          playProximityAlert()
          lastAlertTimeRef.current = now
        }
      }
    },
    [map, google, hazards, warningDistance, filters, isNavigating, routePath],
  )

  const {
    location,
    speed,
    heading,
    error: geoError,
    startTracking,
    stopTracking,
  } = useGeolocation(handleLocationUpdate)

  const { detectionData } = useMotionDetection(isDetecting, (detection) => {
    console.log("[v0] Motion detection triggered:", detection.type, detection.severity)
    setCurrentDetection(detection)
  })

  const segmentStatus = useDynamicRoadStatus(location, routePath, hazards, filters)

  useEffect(() => {
    setCurrentSegmentStatus(segmentStatus)
  }, [segmentStatus])

  useEffect(() => {
    const warnings = validateConfig()
    setConfigWarnings(warnings)
  }, [])

  useEffect(() => {
    console.log("[v0] Setting up Firebase hazard subscription")
    const unsubscribe = subscribeToHazards((updatedHazards) => {
      console.log("[v0] Received hazards from Firebase:", updatedHazards.length)
      setHazards(updatedHazards)

      if (routePath && filters) {
        const summary = buildRouteSummary(updatedHazards, routePath, filters)
        setRouteSummary(summary)
      }
    })

    return () => unsubscribe()
  }, [routePath, filters])

  useEffect(() => {
    const text = generateStatusText(hazardsInProximity, location)
    setStatusText(text)
  }, [hazardsInProximity, location])

  useEffect(() => {
    setTimeout(() => {
      if (!isFirebaseAvailable()) {
        setShowFirebaseWarning(true)
      }
    }, 1000)
  }, [])

  const handleMapReady = (mapInstance, googleInstance) => {
    console.log("[v0] Map is ready")
    setMap(mapInstance)
    setGoogle(googleInstance)
  }

  const handleRouteCalculated = async (origin, destination) => {
    if (!google || !map) return

    try {
      console.log("[v0] Calculating route from", origin, "to", destination)
      const result = await getDirections(google, origin, destination)
      setDirectionsResponse(result)

      const path = result.routes[0].overview_path
      setRoutePath(path)

      console.log("[v0] Analyzing route for hazards using Elevation API...")
      const analysis = await analyzeRouteForHazards(result, hazards)
      console.log("[v0] Route analysis complete:", {
        predictedHazards: analysis.predictedHazards.length,
        speedChanges: analysis.speedChanges.length,
        elevationHazards: analysis.elevationHazards.length,
      })

      setPredictedHazards(analysis.predictedHazards)

      // Build route summary
      const summary = buildRouteSummary(hazards, path, filters)
      setRouteSummary(summary)

      const bounds = new google.maps.LatLngBounds()
      path.forEach((point) => bounds.extend(point))
      map.fitBounds(bounds)

      console.log("[v0] Route calculated successfully")
    } catch (error) {
      console.error("[v0] Failed to calculate route:", error)
      throw error
    }
  }

  const handleClearRoute = () => {
    console.log("[v0] Clearing route")
    setDirectionsResponse(null)
    setRoutePath(null)
    setRouteSummary({})
    setPredictedHazards([])
    setIsNavigating(false)
    setHazardsAhead([])
    if (map && location) {
      map.panTo({ lat: location.lat, lng: location.lng })
      map.setZoom(16)
    }
  }

  const handleStartNavigation = () => {
    console.log("[v0] Starting navigation mode")
    setIsNavigating(true)

    if (location && routePath && hazards.length > 0) {
      const ahead = getHazardsAlongRoute(hazards, routePath, location, warningDistance, filters)
      setHazardsAhead(ahead)
      console.log("[v0] Initial hazard check from start - found", ahead.length, "hazards within", warningDistance, "m")
    }

    startTracking()

    // Center on user with higher zoom
    if (map && location) {
      map.setZoom(18)
      map.panTo({ lat: location.lat, lng: location.lng })
    }
  }

  const handleStopNavigation = () => {
    console.log("[v0] Stopping navigation mode")
    setIsNavigating(false)
    setHazardsAhead([])
    setCurrentHazardAlert(null)
  }

  const handleDetectionConfirm = async (detection) => {
    if (location) {
      try {
        console.log("[v0] Creating hazard from motion detection:", detection)
        await createHazard({
          type: detection.type,
          severity: detection.severity,
          lat: location.lat,
          lng: location.lng,
          verified: false,
          source: "motion_detection",
          confidence: detection.confidence,
        })
        setDetectedHazards([...detectedHazards, detection])
        setCurrentDetection(null)

        setTimeout(() => {
          const newHazard = hazards.find(
            (h) => h.lat === location.lat && h.lng === location.lng && h.type === detection.type,
          )
          if (newHazard) {
            setProximityVoting(newHazard)
          }
        }, 1000)
      } catch (error) {
        console.error("[v0] Error creating hazard:", error)
      }
    }
  }

  const handleHazardVote = async (voteType) => {
    if (proximityVoting) {
      try {
        console.log("[v0] Voting on hazard:", proximityVoting.id, voteType)
        await voteOnHazard(proximityVoting.id, voteType)

        const updatedHazard = hazards.find((h) => h.id === proximityVoting.id)
        if (updatedHazard) {
          if (updatedHazard.voteYes >= 3) {
            console.log("[v0] Hazard verified with 3+ yes votes")
            await updateHazard(proximityVoting.id, { verified: true })
          } else if (updatedHazard.voteNo >= 2) {
            console.log("[v0] Hazard deleted with 2+ no votes")
            await deleteHazard(proximityVoting.id)
          }
        }
      } catch (error) {
        console.error("[v0] Error voting on hazard:", error)
      }
    }
  }

  const handleAddHazard = async (hazardData) => {
    try {
      console.log("[v0] Adding manual hazard:", JSON.stringify(hazardData))
      const hazardId = await createHazard({
        ...hazardData,
        source: "manual_report",
        verified: false,
      })
      console.log("[v0] createHazard returned:", hazardId)
      if (hazardId) {
        console.log("[v0] Manual hazard created successfully with ID:", hazardId)
        alert("Hazard reported successfully!")
      } else {
        console.error("[v0] Failed to create manual hazard - no ID returned")
        alert("Failed to report hazard. Check console for details.")
      }
    } catch (error) {
      console.error("[v0] Error adding hazard:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleRemoveHazard = async (hazardId) => {
    try {
      console.log("[v0] Removing hazard:", hazardId)
      // Mark hazard for removal with pending status
      await updateHazard(hazardId, {
        removalRequested: true,
        removalVotes: 1,
      })
      console.log("[v0] Removal request submitted for hazard:", hazardId)
    } catch (error) {
      console.error("[v0] Error removing hazard:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleRetryFirebase = async () => {
    const connected = await retryFirebaseConnection()
    if (connected) {
      setShowFirebaseWarning(false)
      alert("Connected to Firebase successfully!")
      window.location.reload()
    } else {
      alert("Still unable to connect. Please check Firebase Console.")
    }
  }

  useEffect(() => {
    if (isDetecting || isNavigating) {
      console.log("[v0] Detection/Navigation enabled, starting GPS tracking")
      startTracking()
    } else {
      console.log("[v0] Detection disabled, stopping GPS tracking")
      stopTracking()
    }
  }, [isDetecting, isNavigating, startTracking, stopTracking])

  useEffect(() => {
    startTracking()
    return () => stopTracking()
  }, [])

  useEffect(() => {
    if (isNavigating && map && location) {
      map.panTo({ lat: location.lat, lng: location.lng })
    }
  }, [isNavigating, location, map])

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {showFirebaseWarning && <FirebaseStatus onRetry={handleRetryFirebase} />}

      {configWarnings.length > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 p-2 text-xs text-yellow-800 z-50">
          <strong>Config:</strong> {configWarnings.join(", ")}
        </div>
      )}

      <RouteInput
        google={google}
        map={map}
        onRouteCalculated={handleRouteCalculated}
        onClearRoute={handleClearRoute}
        userLocation={location}
        isNavigating={isNavigating}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={handleStopNavigation}
      />

      <NavigationPanel
        directionsResponse={directionsResponse}
        userLocation={location}
        hazardsAhead={hazardsAhead}
        isNavigating={isNavigating}
        currentSpeed={speed}
        warningDistance={warningDistance}
      />

      {currentHazardAlert && (
        <HazardAlert
          hazard={currentHazardAlert.hazard}
          distance={currentHazardAlert.distance}
          onDismiss={() => setCurrentHazardAlert(null)}
        />
      )}

      <MapContainer
        onMapReady={handleMapReady}
        hazards={hazards}
        predictedHazards={predictedHazards}
        showRoute={!!routePath}
        routePath={routePath}
        directionsResponse={directionsResponse}
        userLocation={location}
        userHeading={heading}
        setHazardsInProximity={setHazardsInProximity}
        isNavigating={isNavigating}
      />

      {!isNavigating && (
        <BottomDock
          currentSpeed={speed}
          warningDistance={warningDistance}
          setWarningDistance={setWarningDistance}
          isDetecting={isDetecting}
          setIsDetecting={setIsDetecting}
          statusText={statusText}
          proximityAlert={hazardsInProximity.length > 0}
          hazardsInProximity={hazardsInProximity}
          hazards={hazards}
          onAddHazard={handleAddHazard}
          onRemoveHazard={handleRemoveHazard}
          filters={filters}
          setFilters={setFilters}
          routeSummary={routeSummary}
          predictedHazards={predictedHazards}
          currentSegmentStatus={currentSegmentStatus}
        />
      )}

      <DetectionConfirmationToast
        detection={currentDetection}
        onConfirm={handleDetectionConfirm}
        onDismiss={() => setCurrentDetection(null)}
      />

      <ProximityVotingModal
        hazard={proximityVoting}
        onVote={handleHazardVote}
        onClose={() => setProximityVoting(null)}
      />

      {geoError && !isNavigating && (
        <div className="absolute top-20 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 z-20">
          <strong>Location:</strong> {geoError}
        </div>
      )}
    </div>
  )
}
