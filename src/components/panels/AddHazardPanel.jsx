"use client"

import { useState } from "react"
import { CheckCircle, Clock } from "lucide-react"

const hazardTypes = [
  { value: "speed_breaker", label: "Speed Breaker", color: "bg-red-600" },
  { value: "pothole", label: "Pothole", color: "bg-orange-600" },
  { value: "manhole", label: "Manhole", color: "bg-amber-600" },
]

const severities = ["low", "medium", "high"]

export const AddHazardPanel = ({ onAddHazard }) => {
  const [selectedType, setSelectedType] = useState("speed_breaker")
  const [selectedSeverity, setSelectedSeverity] = useState("medium")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleSubmit = () => {
    if (navigator.geolocation) {
      setIsSubmitting(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onAddHazard({
            type: selectedType,
            severity: selectedSeverity,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setSelectedType("speed_breaker")
          setSelectedSeverity("medium")
          setIsSubmitting(false)
          setShowConfirmation(true)
          setTimeout(() => setShowConfirmation(false), 3000)
        },
        (error) => {
          console.error("[v0] Geolocation error in AddHazardPanel:", error)
          alert("Could not get your location. Please enable location services.")
          setIsSubmitting(false)
        },
      )
    } else {
      alert("Geolocation is not supported by your browser")
    }
  }

  if (showConfirmation) {
    return (
      <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
        <CheckCircle className="w-8 h-8 text-purple-600 mx-auto" />
        <h3 className="font-semibold text-purple-900">Hazard Reported!</h3>
        <p className="text-sm text-purple-700">
          Your report has been submitted and marked as <strong>PENDING</strong>
        </p>
        <div className="bg-white p-3 rounded border border-purple-200 text-xs text-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Verification Required</span>
          </div>
          <p>This hazard needs verification from 20 travelers on this route to be permanently added.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-gray-700 font-medium">Hazard Type</label>
        <div className="grid grid-cols-3 gap-2">
          {hazardTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              disabled={isSubmitting}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                selectedType === type.value
                  ? `${type.color} text-white shadow-lg`
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-gray-700 font-medium">Severity</label>
        <div className="grid grid-cols-3 gap-2">
          {severities.map((severity) => (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(severity)}
              disabled={isSubmitting}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                selectedSeverity === severity
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all ${
          isSubmitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isSubmitting ? "Reporting..." : "Report Current Location"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        This will add a hazard marker at your current GPS location with timestamp.
      </p>
    </div>
  )
}
