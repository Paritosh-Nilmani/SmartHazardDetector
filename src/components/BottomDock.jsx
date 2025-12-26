"use client"

import { useState } from "react"
import { SpeedPanel } from "./panels/SpeedPanel"
import { HazardStatusPanel } from "./panels/HazardStatusPanel"
import { AddHazardPanel } from "./panels/AddHazardPanel"
import { RemoveHazardPanel } from "./panels/RemoveHazardPanel"
import { FiltersPanel } from "./panels/FiltersPanel"
import { RouteSummaryPanel } from "./panels/RouteSummaryPanel"
import { RoadStatusIndicator } from "./RoadStatusIndicator"

export const BottomDock = ({
  currentSpeed,
  warningDistance,
  setWarningDistance,
  isDetecting,
  setIsDetecting,
  statusText,
  proximityAlert,
  hazardsInProximity,
  hazards,
  onAddHazard,
  onRemoveHazard,
  filters,
  setFilters,
  routeSummary,
  predictedHazards = [],
  currentSegmentStatus,
}) => {
  const [activeTab, setActiveTab] = useState("status")

  const tabs = [
    { id: "status", label: "Status" },
    { id: "add-hazard", label: "Add Hazard" },
    { id: "remove-hazard", label: "Remove Hazard" },
    { id: "filters", label: "Filters" },
    { id: "summary", label: "Summary" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
      <div className="backdrop-blur-md bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-200">
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">Road Condition</span>
          <RoadStatusIndicator
            hazards={hazards}
            predictedHazards={predictedHazards}
            currentSegmentStatus={currentSegmentStatus}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-500/20 text-blue-900 border-b-2 border-blue-500"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-64 overflow-y-auto">
          {activeTab === "status" && (
            <>
              <SpeedPanel
                currentSpeed={currentSpeed}
                warningDistance={warningDistance}
                setWarningDistance={setWarningDistance}
              />
              <HazardStatusPanel
                statusText={statusText}
                proximityAlert={proximityAlert}
                isDetecting={isDetecting}
                setIsDetecting={setIsDetecting}
              />
            </>
          )}

          {activeTab === "add-hazard" && <AddHazardPanel onAddHazard={onAddHazard} />}

          {activeTab === "remove-hazard" && <RemoveHazardPanel hazards={hazards} onRemoveHazard={onRemoveHazard} />}

          {activeTab === "filters" && <FiltersPanel filters={filters} setFilters={setFilters} />}

          {activeTab === "summary" && (
            <RouteSummaryPanel routeSummary={routeSummary} predictedHazards={predictedHazards} />
          )}
        </div>
      </div>
    </div>
  )
}
