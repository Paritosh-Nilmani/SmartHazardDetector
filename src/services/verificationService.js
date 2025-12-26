import { updateHazard, deleteHazard } from "firebase/firestore"

const userVoteCache = new Map()

export const hasUserVoted = (hazardId, userId) => {
  const key = `${hazardId}:${userId}`
  return userVoteCache.has(key)
}

export const recordUserVote = (hazardId, userId) => {
  const key = `${hazardId}:${userId}`
  userVoteCache.set(key, true)
}

export const processHazardVerification = async (hazardId, hazard) => {
  try {
    if (hazard.voteYes >= 3) {
      console.log(`[Verification] Hazard ${hazardId} marked as VERIFIED`)
      await updateHazard(hazardId, { verified: true })
      return { status: "verified", action: "marked_verified" }
    }

    if (hazard.voteNo >= 2) {
      console.log(`[Verification] Hazard ${hazardId} REMOVED due to negative votes`)
      await deleteHazard(hazardId)
      return { status: "removed", action: "deleted" }
    }

    return { status: "pending", action: "none" }
  } catch (error) {
    console.error("Error processing hazard verification:", error)
    throw error
  }
}

export const getNearbyHazardsForVoting = (userLocation, hazards, proximityRadius = 200) => {
  if (!userLocation) return []

  const nearby = []
  hazards.forEach((hazard) => {
    const distance = calculateDistance(userLocation.lat, userLocation.lng, hazard.lat, hazard.lng)

    if (distance <= proximityRadius && !hazard.verified) {
      nearby.push({ ...hazard, distance })
    }
  })

  return nearby.sort((a, b) => a.distance - b.distance)
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const initializeVerificationProcess = async (hazardId) => {
  try {
    console.log(`[Verification] Started for new hazard: ${hazardId}`)

    await updateHazard(hazardId, {
      verified: false,
      voteYes: 0,
      voteNo: 0,
      verificationStartedAt: new Date(),
    })

    return {
      hazardId,
      verificationTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    }
  } catch (error) {
    console.error("Error initializing verification:", error)
    throw error
  }
}

export const getVerificationStats = (hazard) => {
  const totalVotes = (hazard.voteYes || 0) + (hazard.voteNo || 0)
  const verificationPercentage = totalVotes > 0 ? ((hazard.voteYes || 0) / totalVotes) * 100 : 0

  return {
    totalVotes,
    yesVotes: hazard.voteYes || 0,
    noVotes: hazard.voteNo || 0,
    verificationPercentage: Math.round(verificationPercentage),
    isVerified: hazard.verified || false,
    confidence: Math.min((hazard.voteYes || 0) / 3, 1), // 0 to 1 scale
  }
}
