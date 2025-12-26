"use client"

export const SpeedPanel = ({ currentSpeed, warningDistance, setWarningDistance }) => {
  return (
    <div className="space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-700 font-medium">Current Speed</span>
        <span className="text-3xl font-bold text-blue-600">
          {currentSpeed !== null && currentSpeed !== undefined ? Math.round(currentSpeed) : 0}
        </span>
        <span className="text-gray-600">km/h</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-gray-700 font-medium">Warning Distance</label>
          <span className="text-lg font-semibold text-orange-500">{warningDistance}m</span>
        </div>
        <input
          type="range"
          min="25"
          max="500"
          step="25"
          value={warningDistance}
          onChange={(e) => setWarningDistance(Number(e.target.value))}
          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>25m</span>
          <span>500m</span>
        </div>
      </div>
    </div>
  )
}
