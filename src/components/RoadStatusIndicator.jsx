"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle, X } from "lucide-react"

export const RoadStatusIndicator = ({ hazards, predictedHazards, currentSegmentStatus }) => {
  const [showModal, setShowModal] = useState(false)

  const severeHazards = [...hazards, ...predictedHazards].filter((hazard) => {
    const confidence = hazard.confidence || 0
    const severityScore = hazard.severity === "high" ? 0.9 : hazard.severity === "medium" ? 0.6 : 0.3
    return confidence >= 0.85 || severityScore >= 0.85
  })

  const isIdle = currentSegmentStatus ? currentSegmentStatus.isIdle : severeHazards.length === 0

  const hazardLabels = {
    speed_breaker: "Speed Breaker",
    pothole: "Pothole",
    manhole: "Manhole",
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isIdle
            ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
            : "bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer animate-pulse"
        }`}
      >
        {isIdle ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Severe Hazards</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Severe Hazards ({severeHazards.length})</span>
          </>
        )}
      </button>

      {/* Modal showing severe hazards */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-gray-900">Severe Hazards ({severeHazards.length})</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-96">
              <p className="text-sm text-gray-600 mb-4">
                These hazards have more than 85% severity and require caution:
              </p>

              {severeHazards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No severe hazards detected</p>
              ) : (
                <div className="space-y-3">
                  {severeHazards.map((hazard, index) => (
                    <div key={hazard.id || index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-800">{hazardLabels[hazard.type] || hazard.type}</span>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                          {Math.round((hazard.confidence || 0.85) * 100)}% confidence
                        </span>
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Severity: {hazard.severity?.toUpperCase() || "HIGH"}
                      </div>
                      {hazard.source && <div className="text-xs text-red-500 mt-1">Source: {hazard.source}</div>}
                      {hazard.voteYes && hazard.voteYes < 20 && (
                        <div className="text-xs text-orange-600 mt-1">Verification: {hazard.voteYes}/20 travelers</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
