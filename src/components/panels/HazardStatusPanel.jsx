"use client"

export const HazardStatusPanel = ({ statusText, proximityAlert, isDetecting, setIsDetecting }) => {
  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsDetecting(!isDetecting)}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          isDetecting
            ? "bg-red-500/20 text-red-700 border border-red-300"
            : "bg-green-500/20 text-green-700 border border-green-300"
        }`}
      >
        {isDetecting ? "Stop Detection" : "Start Detection"}
      </button>

      <div
        className={`p-3 rounded-lg font-medium ${
          proximityAlert
            ? "bg-red-100/50 text-red-800 border border-red-300"
            : "bg-green-100/50 text-green-800 border border-green-300"
        }`}
      >
        {statusText}
      </div>
    </div>
  )
}
