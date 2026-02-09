"use client"

import { useState, useEffect } from "react"

// export const DetectionConfirmationToast = ({ detection, onConfirm, onDismiss }) => {
//   const [isVisible, setIsVisible] = useState(!!detection)

//   useEffect(() => {
//     setIsVisible(!!detection)
//     if (detection) {
//       const timer = setTimeout(() => {
//         setIsVisible(false)
//       }, 8000)
//       return () => clearTimeout(timer)
//     }
//   }, [detection])

export const DetectionConfirmationToast = ({ detection, onConfirm, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(!!detection)

  // 🔴 ADD THIS LINE
  const normalizedType =
    detection?.type === "manhole" ? "pothole" : detection?.type

  useEffect(() => {
    setIsVisible(!!detection)
    if (detection) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [detection])


  if (!isVisible || !detection) return null

  const hazardLabels = {
    speed_breaker: "Speed Breaker",
    pothole: "Pothole",
    manhole: "Pothole",
  }

  const hazardColors = {
    speed_breaker: "bg-orange-500",
    pothole: "bg-red-500",
    manhole: "bg-blue-500",
  }

  const severityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  }

  const handleConfirm = () => {
    onConfirm(detection)
    setIsVisible(false)
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in fade-in">
      <div className={`${hazardColors[detection.type]} text-white rounded-lg shadow-lg p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg">{hazardLabels[detection.type]} Detected</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${severityColors[detection.severity]}`}>
                {detection.severity.toUpperCase()} Severity
              </span>
              <span className="text-sm opacity-90">Confidence: {(detection.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-white text-current font-semibold py-2 px-4 rounded transition-all hover:bg-gray-100"
          >
            Confirm & Report
          </button>
          <button
            onClick={() => {
              setIsVisible(false)
              onDismiss?.()
            }}
            className="flex-1 bg-current/20 text-white font-semibold py-2 px-4 rounded transition-all hover:bg-current/30"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
