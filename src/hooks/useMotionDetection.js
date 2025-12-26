"use client"

import { useState, useEffect, useRef } from "react"

const GRAVITY = 9.81

export const useMotionDetection = (enabled, onHazardDetected) => {
  const [detectionData, setDetectionData] = useState(null)
  const baselineRef = useRef(null)
  const bufferRef = useRef([])
  const lastDetectionRef = useRef(0)
  const lastSpeedRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleDeviceMotion = (event) => {
      const { x, y, z } = event.acceleration
      const timestamp = Date.now()

      if (baselineRef.current === null) {
        baselineRef.current = { x: 0, y: 0, z: 0 }
        return
      }

      const peakG =
        Math.sqrt(
          Math.pow((x || 0) - baselineRef.current.x, 2) +
            Math.pow((y || 0) - baselineRef.current.y, 2) +
            Math.pow((z || 0) - baselineRef.current.z, 2),
        ) / GRAVITY

      bufferRef.current.push({
        peakG,
        x,
        y,
        z,
        timestamp,
      })

      if (bufferRef.current.length > 100) {
        bufferRef.current.shift()
      }

      if (timestamp - lastDetectionRef.current < 1500) return

      analyzeMotionBuffer()
    }

    const analyzeMotionBuffer = () => {
      if (bufferRef.current.length < 5) return

      const window = bufferRef.current.slice(-50)
      const peakValues = window.map((s) => s.peakG)
      const maxPeak = Math.max(...peakValues)
      const minPeak = Math.min(...peakValues)
      const duration = window[window.length - 1].timestamp - window[0].timestamp

      // Speed breaker: sudden sharp vertical acceleration, moderate duration
      if (maxPeak > 1.8 && duration > 200 && duration < 600) {
        const severity = classifySeverity(maxPeak, duration, "speed_breaker")
        triggerDetection("speed_breaker", severity, maxPeak)
        lastDetectionRef.current = Date.now()
      }
      // Pothole: sharp dip followed by rebound, longer duration
      else if (minPeak < -1.5 && maxPeak > 1.5 && duration > 300 && duration < 900) {
        const severity = classifySeverity(maxPeak, duration, "pothole")
        triggerDetection("pothole", severity, maxPeak)
        lastDetectionRef.current = Date.now()
      }
      // Manhole: very sharp acceleration over short time
      else if (maxPeak > 2.0 && minPeak > -0.5 && duration > 80 && duration < 250) {
        const severity = classifySeverity(maxPeak, duration, "manhole")
        triggerDetection("manhole", severity, maxPeak)
        lastDetectionRef.current = Date.now()
      }
    }

    const classifySeverity = (peakG, duration, type) => {
      if (type === "speed_breaker") {
        if (peakG > 3.2) return "high"
        if (peakG > 2.3) return "medium"
        return "low"
      } else if (type === "pothole") {
        if (peakG > 3.0) return "high"
        if (peakG > 2.0) return "medium"
        return "low"
      } else if (type === "manhole") {
        if (peakG > 3.8) return "high"
        if (peakG > 2.7) return "medium"
        return "low"
      }
      return "medium"
    }

    const triggerDetection = (type, severity, peakG) => {
      setDetectionData({ type, severity, peakG })

      if (onHazardDetected) {
        onHazardDetected({ type, severity, confidence: Math.min(peakG / 5, 1) })
      }

      console.log(`[v0] Detected ${type} (${severity}) - Peak G: ${peakG.toFixed(2)}`)
    }

    window.addEventListener("devicemotion", handleDeviceMotion)

    return () => {
      window.removeEventListener("devicemotion", handleDeviceMotion)
      baselineRef.current = null
      bufferRef.current = []
    }
  }, [enabled, onHazardDetected])

  return { detectionData }
}
