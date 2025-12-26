"use client"

import { useEffect, useRef, useState } from "react"
import { loadGoogleMaps, createMarkerSVG, HAZARD_COLORS } from "../services/googlemaps"
import { AlertTriangle, Navigation } from "lucide-react"
import { config } from "../config"

const MIN_CONFIDENCE_THRESHOLD = 0.4 // 40%

const MapContainer = ({
  onMapReady,
  hazards = [],
  predictedHazards = [],
  showRoute,
  routePath,
  userLocation,
  userHeading,
  setHazardsInProximity,
  directionsResponse,
  isNavigating = false,
}) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const predictedMarkersRef = useRef({})
  const userMarkerRef = useRef(null)
  const accuracyCircleRef = useRef(null)
  const directionsRendererRef = useRef(null)
  const googleRef = useRef(null)

  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const initMap = async () => {
    try {
      setError(null)
      setIsLoading(true)

      const google = await loadGoogleMaps()
      googleRef.current = google

      if (!mapRef.current) return

      if (!mapInstanceRef.current) {
        const mapOptions = {
          center: { lat: userLocation?.lat || 28.6139, lng: userLocation?.lng || 77.209 },
          zoom: 16,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }

        mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions)

        if (onMapReady) onMapReady(mapInstanceRef.current, google)
      }

      if (!directionsRendererRef.current && mapInstanceRef.current) {
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          polylineOptions: {
            strokeColor: "#3B82F6",
            strokeWeight: 6,
            strokeOpacity: 0.8,
          },
          suppressMarkers: false,
        })
      }

      setIsLoading(false)
    } catch (err) {
      console.error("Map initialization error:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initMap()
  }, [])

  useEffect(() => {
    if (!config.googleMapsApiKey) {
      setError(
        "Google Maps API Key is missing! Please add NEXT_PUBLIC_GOOGLE_MAP_API_KEY to your environment variables.",
      )
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !googleRef.current) return

    const google = googleRef.current
    const position = {
      lat: userLocation.latitude || userLocation.lat,
      lng: userLocation.longitude || userLocation.lng,
    }

    if (!position.lat || !position.lng) return

    // Update or create accuracy circle
    if (userLocation.accuracy && userLocation.accuracy < 500) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter(position)
        accuracyCircleRef.current.setRadius(userLocation.accuracy)
      } else {
        accuracyCircleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current,
          center: position,
          radius: userLocation.accuracy,
          fillColor: "#4285F4",
          fillOpacity: 0.1,
          strokeColor: "#4285F4",
          strokeOpacity: 0.3,
          strokeWeight: 1,
        })
      }
    }

    // Create navigation arrow marker with heading
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position)
      // Update rotation based on heading
      if (userHeading !== null && userHeading !== undefined) {
        const icon = userMarkerRef.current.getIcon()
        if (icon) {
          userMarkerRef.current.setIcon({
            ...icon,
            rotation: userHeading,
          })
        }
      }
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: isNavigating ? 8 : 6,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
          rotation: userHeading || 0,
        },
        zIndex: 999,
        title: "Your Location",
      })
    }

    if (isNavigating) {
      mapInstanceRef.current.panTo(position)
      if (mapInstanceRef.current.getZoom() < 17) {
        mapInstanceRef.current.setZoom(18)
      }
    } else if (!directionsResponse && !mapInstanceRef.current.hasPanned) {
      mapInstanceRef.current.panTo(position)
      mapInstanceRef.current.hasPanned = true
    }
  }, [userLocation, userHeading, directionsResponse, isNavigating])

  // Hazard markers
  useEffect(() => {
    if (!mapInstanceRef.current || !googleRef.current) return

    const google = googleRef.current
    const currentHazardIds = new Set(hazards.map((h) => h.id))

    Object.keys(markersRef.current).forEach((id) => {
      if (!currentHazardIds.has(id)) {
        markersRef.current[id].setMap(null)
        delete markersRef.current[id]
      }
    })

    hazards.forEach((hazard) => {
      if (markersRef.current[hazard.id]) return

      const color = HAZARD_COLORS[hazard.type] || "#6B7280"

      const marker = new google.maps.Marker({
        position: {
          lat: hazard.location?.latitude || hazard.lat,
          lng: hazard.location?.longitude || hazard.lng,
        },
        map: mapInstanceRef.current,
        icon: createMarkerSVG(color, hazard.verified),
        title: `${hazard.type} (${hazard.source || "reported"})`,
      })

      marker.addListener("click", () => {
        window.dispatchEvent(new CustomEvent("hazard-selected", { detail: hazard }))
      })

      markersRef.current[hazard.id] = marker
    })
  }, [hazards])

  useEffect(() => {
    if (!mapInstanceRef.current || !googleRef.current) return

    const google = googleRef.current

    Object.values(predictedMarkersRef.current).forEach((marker) => {
      marker.setMap(null)
    })
    predictedMarkersRef.current = {}

    // Only show predictions with confidence >= 40%
    const filteredPredictions = predictedHazards.filter((p) => (p.confidence || 0) >= MIN_CONFIDENCE_THRESHOLD)

    filteredPredictions.forEach((prediction, index) => {
      const lat = prediction.location?.lat ? prediction.location.lat() : prediction.lat
      const lng = prediction.location?.lng ? prediction.location.lng() : prediction.lng

      if (!lat || !lng) return

      const baseColor = HAZARD_COLORS[prediction.type] || "#FCD34D"

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: prediction.clustered ? baseColor : baseColor,
          fillOpacity: prediction.clustered ? 0.9 : 0.6,
          strokeColor: "white",
          strokeWeight: 2,
        },
        title: `Predicted ${prediction.type || "hazard"} (${Math.round(prediction.confidence * 100)}% confidence)`,
        zIndex: 100,
      })

      marker.addListener("click", () => {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <strong>Predicted Hazard</strong><br/>
              Type: ${prediction.type || "Unknown"}<br/>
              Confidence: ${Math.round(prediction.confidence * 100)}%<br/>
              ${prediction.clustered ? `Verified by ${prediction.verifiedBy} users` : "Not yet verified"}<br/>
              Source: ${prediction.source || "Algorithm"}
            </div>
          `,
        })
        infoWindow.open(mapInstanceRef.current, marker)
      })

      predictedMarkersRef.current[`predicted-${index}`] = marker
    })
  }, [predictedHazards])

  // Directions renderer
  useEffect(() => {
    if (mapInstanceRef.current && directionsRendererRef.current && directionsResponse) {
      directionsRendererRef.current.setDirections(directionsResponse)

      const route = directionsResponse.routes[0]
      if (route && route.bounds && !isNavigating) {
        mapInstanceRef.current.fitBounds(route.bounds)
      }
    }
  }, [directionsResponse, isNavigating])

  return (
    <div className="relative w-full h-full bg-gray-200">
      <div ref={mapRef} className="w-full h-full" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/95 z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md text-center space-y-4 border border-red-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Setup Required</h3>
            <div className="text-sm text-gray-600 text-left">
              {error.includes("API Key") ? (
                <div className="space-y-2">
                  <p className="font-semibold text-red-600">API Key Missing</p>
                  <p>Please add the following environment variables:</p>
                  <ul className="list-disc pl-5 text-xs bg-gray-50 p-2 rounded border border-gray-200">
                    <li>
                      <strong>NEXT_PUBLIC_GOOGLE_MAP_API_KEY</strong> - For Maps
                    </li>
                    <li>
                      <strong>ELEVATION_API_KEY</strong> - For Elevation API (server-side)
                    </li>
                  </ul>
                </div>
              ) : error.includes("Legacy") ? (
                <div className="space-y-2">
                  <p className="font-semibold text-red-600">API Configuration Issue</p>
                  <p>Please enable these APIs in Google Cloud Console:</p>
                  <ul className="list-disc pl-5 text-xs bg-gray-50 p-2 rounded border border-gray-200">
                    <li>
                      <strong>Places API</strong>
                    </li>
                    <li>
                      <strong>Directions API</strong>
                    </li>
                    <li>
                      <strong>Elevation API</strong>
                    </li>
                    <li>Maps JavaScript API</li>
                  </ul>
                </div>
              ) : (
                <p>{error}</p>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-40">
          <div className="animate-pulse flex flex-col items-center">
            <Navigation className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
            <span className="text-blue-600 font-medium">Loading Map...</span>
          </div>
        </div>
      )}

      {predictedHazards.filter((p) => (p.confidence || 0) >= MIN_CONFIDENCE_THRESHOLD).length > 0 && !isNavigating && (
        <div className="absolute bottom-24 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg text-xs z-30">
          <div className="font-semibold mb-2">Hazard Colors</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.speed_breaker }}></div>
              <span>Speed Breaker</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.pothole }}></div>
              <span>Pothole</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.manhole }}></div>
              <span>Manhole</span>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="text-gray-500">Only showing hazards with &gt;40% confidence</div>
          </div>
        </div>
      )}
    </div>
  )
}

export { MapContainer }
export default MapContainer
