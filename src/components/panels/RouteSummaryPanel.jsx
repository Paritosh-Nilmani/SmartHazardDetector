"use client"

import { AlertTriangle, CheckCircle, Info } from "lucide-react"
import { HAZARD_COLORS } from "../../services/googlemaps"

const MIN_CONFIDENCE_THRESHOLD = 0.4 // 40%

export const RouteSummaryPanel = ({ routeSummary, predictedHazards = [] }) => {
  const filteredPredictions = predictedHazards.filter((p) => (p.confidence || 0) >= MIN_CONFIDENCE_THRESHOLD)

  const calculateTotals = () => {
    if (!routeSummary || Object.keys(routeSummary).length === 0) {
      return { total: 0, high: 0, medium: 0, low: 0 }
    }

    let total = 0,
      high = 0,
      medium = 0,
      low = 0

    Object.values(routeSummary).forEach((category) => {
      if (category) {
        high += category.high || 0
        medium += category.medium || 0
        low += category.low || 0
        total += (category.high || 0) + (category.medium || 0) + (category.low || 0)
      }
    })

    return { total, high, medium, low }
  }

  const totals = calculateTotals()

  if ((!routeSummary || Object.keys(routeSummary).length === 0) && filteredPredictions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No Active Route</p>
        <p className="text-sm mt-1">Search for a destination to see hazard summary</p>
      </div>
    )
  }

  const hazardCategories = [
    { type: "speed_breaker", label: "Speed Breakers", color: HAZARD_COLORS.speed_breaker },
    { type: "pothole", label: "Potholes", color: HAZARD_COLORS.pothole },
    { type: "manhole", label: "Manholes", color: HAZARD_COLORS.manhole },
  ]

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "bg-red-500 text-white"
      case "medium":
        return "bg-orange-500 text-white"
      case "low":
        return "bg-yellow-500 text-gray-900"
      default:
        return "bg-gray-200 text-gray-600"
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl p-4 ${totals.total > 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {totals.total > 0 ? (
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <span className="font-bold text-lg">
              {totals.total > 0 ? `${totals.total} Hazards on Route` : "Clear Route!"}
            </span>
          </div>
        </div>

        {totals.total > 0 && (
          <div className="flex gap-2">
            {totals.high > 0 && (
              <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                <span>{totals.high}</span>
                <span>High</span>
              </div>
            )}
            {totals.medium > 0 && (
              <div className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                <span>{totals.medium}</span>
                <span>Medium</span>
              </div>
            )}
            {totals.low > 0 && (
              <div className="flex items-center gap-1 bg-yellow-500 text-gray-900 px-2 py-1 rounded-full text-xs font-medium">
                <span>{totals.low}</span>
                <span>Low</span>
              </div>
            )}
          </div>
        )}
      </div>

      {filteredPredictions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">AI Predicted Hazards</span>
          </div>
          <p className="text-sm text-blue-700 mb-2">
            {filteredPredictions.length} potential hazard{filteredPredictions.length > 1 ? "s" : ""} detected (≥40%
            confidence)
          </p>
          <div className="text-xs text-blue-600">Note: Hazards below 40% confidence are not shown</div>
        </div>
      )}

      {/* Category breakdown with colors */}
      {hazardCategories.map((category) => {
        const categoryData = routeSummary[category.type]
        const categoryTotal = (categoryData?.low || 0) + (categoryData?.medium || 0) + (categoryData?.high || 0)

        if (categoryTotal === 0) return null

        return (
          <div key={category.type} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                {category.label}
              </h3>
              <span className="text-sm font-medium text-gray-600">{categoryTotal} total</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["high", "medium", "low"].map((severity) => {
                const count = categoryData?.[severity] || 0
                return (
                  <div
                    key={severity}
                    className={`text-center p-2 rounded-lg ${count > 0 ? getSeverityColor(severity) : "bg-gray-100"}`}
                  >
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-xs capitalize opacity-90">{severity}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
