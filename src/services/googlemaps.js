import { config } from "../config"

export const loadGoogleMaps = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google)
      return
    }

    const existingScript = document.getElementById("google-maps-script")
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google && window.google.maps) resolve(window.google)
        else reject(new Error("Google Maps SDK not found after script load"))
      })
      existingScript.addEventListener("error", () => reject(new Error("Google Maps script failed to load")))
      return
    }

    const apiKey = config.googleMapsApiKey
    if (!apiKey) {
      reject(
        new Error(
          "Google Maps API Key is missing. Please add NEXT_PUBLIC_GOOGLE_MAP_API_KEY to your environment variables.",
        ),
      )
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=initGoogleMaps&v=weekly`
    script.id = "google-maps-script"
    script.async = true
    script.defer = true

    window.initGoogleMaps = () => {
      if (window.google && window.google.maps) {
        resolve(window.google)
      } else {
        reject(new Error("Google Maps SDK loaded but window.google is undefined"))
      }
    }

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script. Check your API key."))
    }

    document.head.appendChild(script)
  })
}

export const HAZARD_COLORS = {
  speed_breaker: "#DC143C", // Crimson Red for speed breakers
  pothole: "#800000", // Maroon for potholes
  manhole: "#FFA500", // Orange for manholes
}

export const getMarkerColor = (type) => {
  return HAZARD_COLORS[type] || "#6B7280" // Gray fallback
}

export const createMarkerSVG = (color, verified = false) => {
  const strokeColor = verified ? color : "none"
  const fillColor = verified ? color : "white"
  const strokeWidth = verified ? "0" : "2"

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path fill="${fillColor}" stroke="${color}" stroke-width="${strokeWidth}" d="M16 0C9.373 0 4 5.373 4 12c0 8 12 28 12 28s12-20 12-28c0-6.627-5.373-12-12-12z"/>
      <circle cx="16" cy="12" r="5" fill="${color}"/>
    </svg>
  `

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
}

export const getDirections = async (google, origin, destination) => {
  const directionsService = new google.maps.DirectionsService()

  try {
    const result = await directionsService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false,
    })
    return result
  } catch (error) {
    console.error("[v0] Error calculating route:", error)

    if (error && (error.message?.includes("LegacyApiNotActivatedMapError") || error.code === "NOT_FOUND")) {
      throw new Error(
        "LEGACY_API_ERROR: The Directions API is not enabled. Please enable 'Directions API' (not Routes API) in your Google Cloud Console.",
      )
    }

    if (error && error.code === "ZERO_RESULTS") {
      throw new Error("No route found between these locations.")
    }

    throw error
  }
}

export const calculateRoute = async (google, map, origin, destination) => {
  const directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    polylineOptions: {
      strokeColor: "#3B82F6",
      strokeWeight: 5,
      strokeOpacity: 0.8,
    },
    suppressMarkers: false,
  })

  try {
    const result = await getDirections(google, origin, destination)
    directionsRenderer.setDirections(result)
    const path = result.routes[0].overview_path
    return path
  } catch (error) {
    console.error("Error calculating route:", error)
    throw error
  }
}

export const getDistanceToPoint = (google, userLat, userLng, pointLat, pointLng) => {
  const userLocation = new google.maps.LatLng(userLat, userLng)
  const pointLocation = new google.maps.LatLng(pointLat, pointLng)
  return google.maps.geometry.spherical.computeDistanceBetween(userLocation, pointLocation)
}
