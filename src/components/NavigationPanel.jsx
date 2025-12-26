"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  MapPin,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react"
import { HAZARD_COLORS } from "../services/googlemaps"
import { speakWithCloudTts, stopNavigation } from "../services/cloudTtsService"

export const NavigationPanel = ({
  directionsResponse,
  userLocation,
  hazardsAhead,
  isNavigating,
  currentSpeed,
  warningDistance = 100,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [distanceToNextStep, setDistanceToNextStep] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [announcedInitialRoute, setAnnouncedInitialRoute] = useState(false)
  const lastSpokenStepRef = useRef(-1)
  const lastHazardAlertRef = useRef(new Set())
  const lastHazardAlertTimeRef = useRef(0)
  const navigationStartTimeRef = useRef(null)

  const steps = directionsResponse?.routes?.[0]?.legs?.[0]?.steps || []
  const currentStep = steps[currentStepIndex]
  const nextStep = steps[currentStepIndex + 1]
  const totalDistance = directionsResponse?.routes?.[0]?.legs?.[0]?.distance?.text
  const totalDuration = directionsResponse?.routes?.[0]?.legs?.[0]?.duration?.text

  useEffect(() => {
    if (!isNavigating || !audioEnabled || announcedInitialRoute || !currentStep) return

    navigationStartTimeRef.current = Date.now()

    // Announce the first instruction immediately
    const firstInstruction = getCleanInstruction(currentStep?.instructions) || "Start navigating"
    const distance = currentStep?.distance?.text || "unknown distance"

    const initialAnnouncement = `Navigation started. ${firstInstruction}. Distance: ${distance}`

    console.log("[v0] Announcing initial route:", initialAnnouncement)
    speakWithCloudTts(initialAnnouncement, { rate: 0.85, pitch: 1 })
      .then(() => {
        console.log("[v0] Initial announcement complete")
        setAnnouncedInitialRoute(true)
      })
      .catch((err) => {
        console.error("[v0] Initial announcement failed:", err)
        setAnnouncedInitialRoute(true)
      })
  }, [isNavigating, audioEnabled, announcedInitialRoute, currentStep])

  // Calculate distance from user to the end point of current step
  useEffect(() => {
    if (!userLocation || !currentStep) return

    const stepEndLat = currentStep.end_location.lat()
    const stepEndLng = currentStep.end_location.lng()

    const distance = getHaversineDistance(userLocation.lat, userLocation.lng, stepEndLat, stepEndLng)

    setDistanceToNextStep(distance)

    // If we're within 30m of step end, move to next step
    if (distance < 30 && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }, [userLocation, currentStep, currentStepIndex, steps.length])

  useEffect(() => {
    if (!audioEnabled || !currentStep || !isNavigating) return
    if (lastSpokenStepRef.current === currentStepIndex) return
    if (!announcedInitialRoute) return

    // Speak at multiple distance thresholds for better guidance
    if (distanceToNextStep !== null) {
      const instruction = getCleanInstruction(currentStep.instructions)
      const distanceMeters = Math.round(distanceToNextStep)
      let shouldSpeak = false
      let enhancedInstruction = instruction

      // Progressive announcements based on distance
      if (distanceMeters > 300 && distanceMeters <= 350) {
        enhancedInstruction = `In approximately ${distanceMeters} meters, ${instruction}`
        shouldSpeak = true
      } else if (distanceMeters > 150 && distanceMeters <= 200) {
        enhancedInstruction = `In about ${distanceMeters} meters, ${instruction}`
        shouldSpeak = true
      } else if (distanceMeters > 80 && distanceMeters <= 120) {
        enhancedInstruction = `In ${distanceMeters} meters, ${instruction}`
        shouldSpeak = true
      } else if (distanceMeters > 40 && distanceMeters <= 60) {
        enhancedInstruction = `Coming up: ${instruction}`
        shouldSpeak = true
      } else if (distanceMeters > 20 && distanceMeters <= 40) {
        enhancedInstruction = `Soon, ${instruction}`
        shouldSpeak = true
      } else if (distanceMeters <= 20) {
        enhancedInstruction = instruction
        shouldSpeak = true
      }

      if (shouldSpeak) {
        console.log("[v0] Speaking turn guidance:", enhancedInstruction)
        speakWithCloudTts(enhancedInstruction, { rate: 0.85, pitch: 1 }).catch((err) => {
          console.error("[v0] Turn guidance failed:", err)
        })
        lastSpokenStepRef.current = currentStepIndex
      }
    }
  }, [currentStepIndex, distanceToNextStep, audioEnabled, currentStep, isNavigating, announcedInitialRoute])

  useEffect(() => {
    if (!audioEnabled || !hazardsAhead || hazardsAhead.length === 0 || !isNavigating) {
      console.log(
        "[v0] Hazard alert skipped - audio:",
        audioEnabled,
        "hazards:",
        hazardsAhead?.length,
        "navigating:",
        isNavigating,
      )
      return
    }

    const now = Date.now()
    // Only check hazards every 1 second to avoid overwhelming
    if (now - lastHazardAlertTimeRef.current < 1000) return

    // Process ALL hazards within warning distance, not just the closest one
    const newAlerts = new Set()

    hazardsAhead.forEach((hazard) => {
      const hazardDistance = hazard.distanceFromUser || 0

      if (hazardDistance > warningDistance) {
        console.log(
          "[v0] Hazard too far away:",
          Math.round(hazardDistance),
          "m > warning distance:",
          warningDistance,
          "m - skipping alert",
        )
        return
      }

      const hazardKey = `${hazard.type}-${Math.round(hazard.lat * 1000)}-${Math.round(hazard.lng * 1000)}`

      // Check if we've already alerted about this specific hazard
      if (lastHazardAlertRef.current.has(hazardKey)) {
        console.log("[v0] Already alerted about this hazard, skipping duplicate")
        return
      }

      // New hazard to alert about
      newAlerts.add(hazardKey)

      const label = getHazardLabel(hazard.type)
      const severity = hazard.severity || "medium"
      const distance = Math.round(hazardDistance)

      let warningText = ""

      if (severity === "high") {
        warningText =
          distance < 50
            ? `WARNING! Severe ${label} just ahead, only ${distance} meters away. Reduce speed immediately!`
            : `ALERT! Severe ${label} ahead in ${distance} meters. Prepare to slow down now.`
      } else if (severity === "medium") {
        warningText =
          distance < 50
            ? `Caution! ${label} ahead in ${distance} meters. Reduce your speed.`
            : `Attention: ${label} ahead in ${distance} meters. Be prepared.`
      } else {
        warningText = `Note: Minor ${label} ahead in ${distance} meters.`
      }

      console.log("[v0] Speaking hazard alert:", warningText, "Distance:", distance, "m")
      speakWithCloudTts(warningText, { rate: 0.85, pitch: 1.1 }).catch((err) => {
        console.error("[v0] Hazard alert failed:", err)
      })
    })

    // Update the set of alerted hazards
    if (newAlerts.size > 0) {
      lastHazardAlertRef.current = new Set([...lastHazardAlertRef.current, ...newAlerts])
      lastHazardAlertTimeRef.current = now
      console.log("[v0] Hazards alerted:", newAlerts.size, "Total tracked:", lastHazardAlertRef.current.size)
    }
  }, [hazardsAhead, audioEnabled, isNavigating, warningDistance])

  useEffect(() => {
    if (!isNavigating) {
      lastHazardAlertRef.current = new Set()
      console.log("[v0] Navigation stopped - clearing hazard alert history")
    }
  }, [isNavigating])

  const getCleanInstruction = (html) => {
    if (!html) return ""
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim()
  }

  const getHazardLabel = (type) => {
    const labels = {
      speed_breaker: "Speed Breaker",
      pothole: "Pothole",
      manhole: "Manhole",
    }
    return labels[type] || type
  }

  const getManeuverIcon = (maneuver) => {
    if (!maneuver) return <ArrowUp className="w-8 h-8" />

    if (maneuver.includes("left")) {
      if (maneuver.includes("slight") || maneuver.includes("keep")) {
        return <CornerUpLeft className="w-8 h-8" />
      }
      return <ArrowLeft className="w-8 h-8" />
    }
    if (maneuver.includes("right")) {
      if (maneuver.includes("slight") || maneuver.includes("keep")) {
        return <CornerUpRight className="w-8 h-8" />
      }
      return <ArrowRight className="w-8 h-8" />
    }
    if (maneuver.includes("uturn") || maneuver.includes("u-turn")) {
      return <RotateCcw className="w-8 h-8" />
    }
    if (maneuver.includes("destination") || maneuver.includes("arrive")) {
      return <MapPin className="w-8 h-8" />
    }
    return <ArrowUp className="w-8 h-8" />
  }

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
  }

  const getHazardAlertColor = (hazard) => {
    if (hazard.severity === "high") {
      return "#DC143C" // Scarlet Red
    } else if (hazard.severity === "medium") {
      return "#FFBF00" // Amber
    } else {
      return "#FFB700" // Safety Orange
    }
  }

  if (!isNavigating || !directionsResponse) return null

  return (
    <div className="absolute top-20 left-4 right-4 z-20 space-y-3">
      {/* Current instruction */}
      <div className="bg-blue-600 rounded-xl shadow-lg p-4 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            {getManeuverIcon(currentStep?.maneuver)}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold">
              {distanceToNextStep ? formatDistance(distanceToNextStep) : currentStep?.distance?.text}
            </div>
            <div className="text-sm opacity-90 line-clamp-2">
              {getCleanInstruction(currentStep?.instructions) || "Continue on route"}
            </div>
          </div>
          <button
            onClick={() => {
              if (audioEnabled) {
                stopNavigation()
              }
              setAudioEnabled(!audioEnabled)
            }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Next instruction preview */}
        {nextStep && (
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-3 text-sm opacity-80">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              {getManeuverIcon(nextStep?.maneuver)}
            </div>
            <span>Then: {getCleanInstruction(nextStep?.instructions)?.substring(0, 40)}...</span>
          </div>
        )}
      </div>

      {/* Hazard warning */}
      {hazardsAhead && hazardsAhead.length > 0 && (
        <div
          className="rounded-xl shadow-lg p-3 text-white animate-pulse"
          style={{
            backgroundColor: getHazardAlertColor(hazardsAhead[0]),
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <div className="flex-1">
              <div className="font-bold">
                {hazardsAhead.length} Hazard{hazardsAhead.length > 1 ? "s" : ""} Ahead!
              </div>
              <div className="text-sm opacity-90 flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: HAZARD_COLORS[hazardsAhead[0].type] || "#fff" }}
                />
                {getHazardLabel(hazardsAhead[0].type)} - {hazardsAhead[0].severity?.toUpperCase()}
                {hazardsAhead[0].distanceFromUser && (
                  <span className="ml-2">({Math.round(hazardsAhead[0].distanceFromUser)}m)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed and trip info */}
      <div className="flex gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 flex-1">
          <div className="text-xs text-gray-500">Speed</div>
          <div className="text-xl font-bold text-gray-900">{Math.round(currentSpeed || 0)} km/h</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 flex-1">
          <div className="text-xs text-gray-500">ETA</div>
          <div className="text-xl font-bold text-gray-900">{totalDuration || "--"}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 flex-1">
          <div className="text-xs text-gray-500">Distance</div>
          <div className="text-xl font-bold text-gray-900">{totalDistance || "--"}</div>
        </div>
      </div>
    </div>
  )
}

// Helper function
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
