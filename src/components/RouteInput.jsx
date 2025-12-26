"use client"

import { useState, useEffect, useRef } from "react"
import { Navigation, X, AlertCircle, MapPin, Crosshair } from "lucide-react"

export const RouteInput = ({
  google,
  map,
  onRouteCalculated,
  onClearRoute,
  userLocation,
  isNavigating,
  onStartNavigation,
  onStopNavigation,
}) => {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [error, setError] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [useCurrentLocationAsOrigin, setUseCurrentLocationAsOrigin] = useState(false)
  const [routeReady, setRouteReady] = useState(false)
  const originInputRef = useRef(null)
  const destInputRef = useRef(null)
  const originAutocompleteRef = useRef(null)
  const destAutocompleteRef = useRef(null)

  useEffect(() => {
    if (!google || !map) return

    try {
      const options = {
        fields: ["formatted_address", "geometry", "name"],
        strictBounds: false,
      }

      originAutocompleteRef.current = new google.maps.places.Autocomplete(originInputRef.current, options)
      originAutocompleteRef.current.bindTo("bounds", map)
      originAutocompleteRef.current.addListener("place_changed", () => {
        const place = originAutocompleteRef.current.getPlace()
        if (place.formatted_address) {
          setOrigin(place.formatted_address)
          setUseCurrentLocationAsOrigin(false)
        }
      })

      destAutocompleteRef.current = new google.maps.places.Autocomplete(destInputRef.current, options)
      destAutocompleteRef.current.bindTo("bounds", map)
      destAutocompleteRef.current.addListener("place_changed", () => {
        const place = destAutocompleteRef.current.getPlace()
        if (place.formatted_address) {
          setDestination(place.formatted_address)
        }
      })
    } catch (err) {
      console.error("[v0] Places Autocomplete error:", err)
      setError("Places API not available. Please enable 'Places API' in Google Cloud Console.")
    }
  }, [google, map])

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setUseCurrentLocationAsOrigin(true)
      setOrigin("Your Location")
      if (originInputRef.current) {
        originInputRef.current.value = "Your Location"
      }
    } else {
      setError("Unable to get your current location. Please ensure location permission is enabled.")
    }
  }

  const handleCalculate = async () => {
    const originValue = useCurrentLocationAsOrigin && userLocation ? `${userLocation.lat},${userLocation.lng}` : origin

    if (originValue && destination) {
      setIsCalculating(true)
      setError(null)
      try {
        await onRouteCalculated(originValue, destination)
        setRouteReady(true)
      } catch (err) {
        console.error("[v0] Route calculation error:", err)
        if (err.message && err.message.includes("LEGACY_API_ERROR")) {
          setError(
            "Directions API not enabled. Please enable 'Directions API' (not Routes API) in Google Cloud Console.",
          )
        } else {
          setError(err.message || "Failed to calculate route. Please check your inputs.")
        }
        setRouteReady(false)
      } finally {
        setIsCalculating(false)
      }
    }
  }

  const handleClear = () => {
    setOrigin("")
    setDestination("")
    setError(null)
    setUseCurrentLocationAsOrigin(false)
    setRouteReady(false)
    onClearRoute()
    if (originInputRef.current) originInputRef.current.value = ""
    if (destInputRef.current) destInputRef.current.value = ""
    if (onStopNavigation) onStopNavigation()
  }

  const handleStartNavigation = () => {
    console.log("[v0] Navigation started - voice guidance will begin")

    if (onStartNavigation) {
      onStartNavigation()
    }
  }

  if (isNavigating) {
    return (
      <div className="absolute top-4 left-4 right-4 z-10 bg-blue-600 rounded-xl shadow-lg p-3 border border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div className="text-white">
              <div className="text-sm font-medium">Navigation Active</div>
              <div className="text-xs opacity-80">Following route to destination</div>
            </div>
          </div>
          <button
            onClick={() => {
              if (onStopNavigation) onStopNavigation()
              setRouteReady(false)
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            End
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-4 space-y-3 border border-gray-200">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Route Error</p>
            <p className="text-red-600 text-xs mt-1">{error}</p>
            {error.includes("Directions API") && (
              <a
                href="https://console.cloud.google.com/google/maps-apis/api-list"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-xs mt-1 inline-block hover:text-blue-800"
              >
                Open Google Cloud Console
              </a>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-3 top-3 text-blue-500">
          <div className="w-3 h-3 rounded-full border-2 border-current" />
        </div>
        <input
          ref={originInputRef}
          type="text"
          placeholder="Choose starting point"
          className={`w-full pl-10 pr-24 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            useCurrentLocationAsOrigin ? "text-blue-600 font-medium" : ""
          }`}
          onChange={(e) => {
            setOrigin(e.target.value)
            setUseCurrentLocationAsOrigin(false)
          }}
          disabled={useCurrentLocationAsOrigin}
        />
        <button
          onClick={handleUseCurrentLocation}
          className={`absolute right-2 top-1.5 px-2 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
            useCurrentLocationAsOrigin ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
          title="Use your current location"
        >
          <Crosshair className="w-3 h-3" />
          <span className="hidden sm:inline">Your Location</span>
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-3 text-red-500">
          <MapPin className="w-4 h-4" />
        </div>
        <input
          ref={destInputRef}
          type="text"
          placeholder="Choose destination"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {!routeReady ? (
          <button
            onClick={handleCalculate}
            disabled={(!origin && !useCurrentLocationAsOrigin) || !destination || isCalculating}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {isCalculating ? "Finding Route..." : "Get Route"}
          </button>
        ) : (
          <button
            onClick={handleStartNavigation}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 animate-pulse"
          >
            <Navigation className="w-4 h-4" />
            Start Navigation
          </button>
        )}
        {(origin || destination || routeReady) && (
          <button
            onClick={handleClear}
            className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
