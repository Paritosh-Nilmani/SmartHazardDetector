"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, X, Volume2 } from "lucide-react"
import { HAZARD_COLORS } from "../services/googlemaps"
import { speakText } from "../services/voiceService"

export const HazardAlert = ({ hazard, distance, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true)
  const hasSpokenRef = useRef(false)

  const hazardLabels = {
    speed_breaker: "Speed Breaker",
    pothole: "Pothole",
    manhole: "Manhole",
  }

  const severityColors = {
    low: "bg-orange-400", // Safety Orange (#FFB700)
    medium: "bg-amber-400", // Amber (#FFBF00)
    high: "bg-red-700", // Scarlet Red (#DC143C)
  }

  useEffect(() => {
    // Play alert sound and speak warning
    playAlertSound(hazard.severity)

    if (!hasSpokenRef.current) {
      const label = hazardLabels[hazard.type] || "Hazard"
      const severity = hazard.severity || "medium"
      let warningText = ""

      if (severity === "high") {
        warningText = `Warning! Severe ${label} ahead in ${Math.round(distance)} meters. Please slow down immediately!`
      } else if (severity === "medium") {
        warningText = `Caution! ${label} ahead in ${Math.round(distance)} meters. Reduce your speed.`
      } else {
        warningText = `Attention! ${label} ahead in ${Math.round(distance)} meters.`
      }

      console.log("[v0] Hazard alert speaking:", warningText)
      speakText(warningText, { rate: 0.9, pitch: 1.1 })
      hasSpokenRef.current = true
    }

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onDismiss) onDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [hazard, distance, onDismiss])

  const playAlertSound = (severity) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different severities
      const frequencies = {
        low: 600,
        medium: 800,
        high: 1000,
      }

      oscillator.frequency.value = frequencies[severity] || 800
      oscillator.type = "sine"

      // Quick beep pattern
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)

      // Second beep for high severity
      if (severity === "high") {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator()
          const gain2 = audioContext.createGain()
          osc2.connect(gain2)
          gain2.connect(audioContext.destination)
          osc2.frequency.value = 1000
          osc2.type = "sine"
          gain2.gain.setValueAtTime(0.4, audioContext.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          osc2.start(audioContext.currentTime)
          osc2.stop(audioContext.currentTime + 0.3)
        }, 400)
      }
    } catch (e) {
      console.error("[v0] Audio playback error:", e)
    }
  }

  if (!isVisible || !hazard) return null

  const hazardColor = HAZARD_COLORS[hazard.type] || "#F97316"

  return (
    <div className="fixed top-32 left-4 right-4 z-50 animate-bounce">
      <div className={`${severityColors[hazard.severity] || "bg-orange-500"} rounded-xl shadow-2xl p-4 text-white`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: hazardColor }} />
              <span className="text-lg font-bold">{hazardLabels[hazard.type] || "Hazard"} Ahead!</span>
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-sm opacity-90">
              {hazard.severity?.toUpperCase()} severity - {Math.round(distance)}m away
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              if (onDismiss) onDismiss()
            }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
