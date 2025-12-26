"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getNearbyHazardsForVoting,
  hasUserVoted,
  recordUserVote,
  processHazardVerification,
} from "../services/verificationService"

export const useVerificationWorkflow = (userLocation, hazards) => {
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [currentVerification, setCurrentVerification] = useState(null)
  const userIdRef = useRef(null)

  useEffect(() => {
    if (!userIdRef.current) {
      userIdRef.current = `user_${Date.now()}_${Math.random()}`
      console.log(`[Verification] Generated user ID: ${userIdRef.current}`)
    }
  }, [])

  useEffect(() => {
    if (!userLocation) return

    const nearby = getNearbyHazardsForVoting(userLocation, hazards)
    const unvotedHazards = nearby.filter((hazard) => !hasUserVoted(hazard.id, userIdRef.current))

    setPendingVerifications(unvotedHazards)

    if (unvotedHazards.length > 0 && !currentVerification) {
      setCurrentVerification(unvotedHazards[0])
    }
  }, [userLocation, hazards])

  const submitVote = useCallback(
    async (hazardId, voteType, onVerificationUpdate) => {
      try {
        recordUserVote(hazardId, userIdRef.current)

        const updatedHazard = hazards.find((h) => h.id === hazardId)
        if (updatedHazard) {
          const result = await processHazardVerification(hazardId, updatedHazard)

          if (onVerificationUpdate) {
            onVerificationUpdate(result)
          }
        }

        setPendingVerifications((prev) => prev.filter((h) => h.id !== hazardId))
        setCurrentVerification(null)
      } catch (error) {
        console.error("Error submitting vote:", error)
        throw error
      }
    },
    [hazards],
  )

  return {
    pendingVerifications,
    currentVerification,
    submitVote,
    userId: userIdRef.current,
  }
}
