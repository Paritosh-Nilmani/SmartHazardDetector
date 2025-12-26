import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json()

    // Get elevation API key from server-side environment variable
    const elevationApiKey = process.env.ELEVATION_API_KEY

    if (!elevationApiKey) {
      console.error("[Server] ELEVATION_API_KEY is not configured")
      return NextResponse.json(
        { error: "Elevation API is not configured. Please add ELEVATION_API_KEY to environment variables." },
        { status: 500 },
      )
    }

    if (!path || path.length === 0) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    // Sample path to avoid API limits (max 512 locations per request)
    const maxSamples = Math.min(path.length, 100)
    const sampledPath = []
    const step = Math.max(1, Math.floor(path.length / maxSamples))

    for (let i = 0; i < path.length; i += step) {
      if (sampledPath.length < maxSamples) {
        sampledPath.push(path[i])
      }
    }

    const locations = sampledPath.map((point: any) => `${point.lat},${point.lng}`).join("|")
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations}&key=${elevationApiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === "OK") {
      return NextResponse.json({ results: data.results })
    } else {
      console.error("[Server] Elevation API error:", data.status, data.error_message)
      return NextResponse.json({ error: data.error_message || data.status }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[Server] Elevation API fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
