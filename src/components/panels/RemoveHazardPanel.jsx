"use client"

import { useState } from "react"
import { AlertCircle, Trash2, CheckCircle } from "lucide-react"

export const RemoveHazardPanel = ({ hazards, onRemoveHazard }) => {
  const [selectedHazardId, setSelectedHazardId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedHazard, setSelectedHazard] = useState(null)

  const unverifiedHazards = hazards.filter((h) => !h.verified || h.voteYes < 20)

  const handleRemove = (hazard) => {
    setIsSubmitting(true)
    setSelectedHazard(hazard)
    onRemoveHazard(hazard.id)
    setIsSubmitting(false)
    setShowConfirmation(true)
    setTimeout(() => {
      setShowConfirmation(false)
      setSelectedHazardId(null)
    }, 3000)
  }

  if (showConfirmation) {
    return (
      <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
        <CheckCircle className="w-8 h-8 text-purple-600 mx-auto" />
        <h3 className="font-semibold text-purple-900">Removal Request Submitted!</h3>
        <p className="text-sm text-purple-700">
          {selectedHazard?.type.replace("_", " ").toUpperCase()} removal pending verification
        </p>
        <div className="bg-white p-3 rounded border border-purple-200 text-xs text-purple-800">
          <p>This removal needs confirmation from 20 travelers before the hazard is deleted from the system.</p>
        </div>
      </div>
    )
  }

  if (unverifiedHazards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No Hazards to Remove</p>
        <p className="text-sm mt-1">All verified hazards can only be removed by the community.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 font-medium">Select a hazard to report for removal:</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {unverifiedHazards.map((hazard) => (
          <button
            key={hazard.id}
            onClick={() => handleRemove(hazard)}
            disabled={isSubmitting}
            className={`w-full p-3 rounded-lg text-left border-2 transition-all ${
              selectedHazardId === hazard.id
                ? "border-red-500 bg-red-50"
                : "border-gray-200 bg-white hover:border-red-300 hover:bg-red-50"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 capitalize">{hazard.type.replace("_", " ")}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.round(hazard.lat * 1000) / 1000}, {Math.round(hazard.lng * 1000) / 1000}
                </p>
                {!hazard.verified && (
                  <p className="text-xs text-orange-600 mt-1">Status: Pending ({hazard.voteYes || 0}/20 verified)</p>
                )}
              </div>
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
