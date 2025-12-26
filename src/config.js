export const config = {
  // Client-side Google Maps API key for map display, places, directions
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "",

  // Firebase configuration from environment variables
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  },
}

// Validate required environment variables
export const validateConfig = () => {
  const warnings = []

  if (!config.googleMapsApiKey) {
    warnings.push("NEXT_PUBLIC_GOOGLE_MAP_API_KEY is not set")
  }

  if (!config.firebase.apiKey || !config.firebase.projectId) {
    warnings.push("Firebase configuration is incomplete")
  }

  if (warnings.length > 0) {
    console.warn("[v0] Configuration warnings:", warnings)
  }

  return warnings
}
