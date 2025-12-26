"use client"

export const ProximityVotingModal = ({ hazard, onVote, onClose }) => {
  if (!hazard) return null

  const hazardLabels = {
    speed_breaker: "Speed Breaker",
    pothole: "Pothole",
    manhole: "Manhole",
  }

  const hazardColors = {
    speed_breaker: "border-orange-500",
    pothole: "border-red-500",
    manhole: "border-blue-500",
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 border-2 ${hazardColors[hazard.type]}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Hazard</h2>

        <p className="text-gray-600 mb-4">
          Was there really a <strong>{hazardLabels[hazard.type]}</strong> here?
        </p>

        <div className="bg-gray-100 rounded-lg p-3 mb-4 text-sm text-gray-700">
          <p>
            Type: <strong>{hazardLabels[hazard.type]}</strong>
          </p>
          <p>
            Severity: <strong>{hazard.severity.toUpperCase()}</strong>
          </p>
          <p>
            Current Votes: Yes {hazard.voteYes} | No {hazard.voteNo}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              onVote("no")
              onClose()
            }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
          >
            No
          </button>
          <button
            onClick={() => {
              onVote("yes")
              onClose()
            }}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
          >
            Yes
          </button>
        </div>

        <button onClick={onClose} className="w-full mt-3 text-gray-600 hover:text-gray-900 font-medium">
          Skip
        </button>
      </div>
    </div>
  )
}
