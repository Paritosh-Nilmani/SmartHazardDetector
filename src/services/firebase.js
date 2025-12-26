import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  onSnapshot,
  deleteDoc,
  getDoc,
} from "firebase/firestore"
import { config } from "../config"
import { saveHazardLocally, getLocalHazards, updateLocalHazard, deleteLocalHazard } from "./localStorageService"

let app
export let db = null
let firestoreInitialized = false

const initFirebase = () => {
  console.log("[v0] Attempting to initialize Firebase...")

  if (!config.firebase.apiKey || !config.firebase.projectId) {
    console.warn("[v0] Firebase config missing. Using local storage only.")
    console.warn("[v0] Please add Firebase environment variables:")
    console.warn("  - NEXT_PUBLIC_FIREBASE_API_KEY")
    console.warn("  - NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    return
  }

  try {
    if (getApps().length === 0) {
      app = initializeApp(config.firebase)
      console.log("[v0] Firebase App initialized")
    } else {
      app = getApp()
    }

    setTimeout(() => {
      try {
        db = getFirestore(app)
        firestoreInitialized = true
        console.log("[v0] Firestore connected successfully!")
      } catch (e) {
        console.error("[v0] Firestore initialization failed:", e.message)
        console.error("[v0] Please enable Firestore in Firebase Console")
        db = null
        firestoreInitialized = false
      }
    }, 100)
  } catch (error) {
    console.error("[v0] Firebase initialization error:", error)
  }
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFirebase)
  } else {
    initFirebase()
  }
}

export const isFirebaseAvailable = () => !!db && firestoreInitialized

export const retryFirebaseConnection = () => {
  console.log("[v0] Retrying Firebase connection...")
  initFirebase()
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(isFirebaseAvailable())
    }, 500)
  })
}

export const createHazard = async (hazardData) => {
  if (db && firestoreInitialized) {
    try {
      const now = new Date()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const hazardDoc = {
        ...hazardData,
        createdAt: now,
        timezone,
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleString("en-US", {
          timeZone: timezone,
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        voteYes: 0,
        voteNo: 0,
        verified: hazardData.verified || false,
      }

      const docRef = await addDoc(collection(db, "hazards"), hazardDoc)
      console.log("[v0] Hazard saved to Firebase:", docRef.id)
      return docRef.id
    } catch (error) {
      console.error("[v0] Firebase save failed, using localStorage:", error.message)
      return saveHazardLocally(hazardData)
    }
  } else {
    console.log("[v0] Firebase unavailable, using localStorage")
    return saveHazardLocally(hazardData)
  }
}

export const updateHazard = async (hazardId, updates) => {
  if (db && firestoreInitialized) {
    try {
      await updateDoc(doc(db, "hazards", hazardId), updates)
    } catch (error) {
      console.error("Error updating hazard:", error)
      updateLocalHazard(hazardId, updates)
    }
  } else {
    updateLocalHazard(hazardId, updates)
  }
}

export const deleteHazard = async (hazardId) => {
  if (db && firestoreInitialized) {
    try {
      await deleteDoc(doc(db, "hazards", hazardId))
    } catch (error) {
      console.error("Error deleting hazard:", error)
      deleteLocalHazard(hazardId)
    }
  } else {
    deleteLocalHazard(hazardId)
  }
}

export const subscribeToHazards = (callback) => {
  if (db && firestoreInitialized) {
    try {
      const q = query(collection(db, "hazards"))
      return onSnapshot(
        q,
        (snapshot) => {
          const hazards = []
          snapshot.forEach((doc) => {
            hazards.push({ id: doc.id, ...doc.data() })
          })
          console.log("[v0] Firebase hazards loaded:", hazards.length)
          callback(hazards)
        },
        (error) => {
          console.error("Snapshot error, falling back to localStorage:", error)
          callback(getLocalHazards())
        },
      )
    } catch (e) {
      console.error("Subscription error:", e)
      callback(getLocalHazards())
      return () => {}
    }
  } else {
    console.log("[v0] Using localStorage for hazards")
    callback(getLocalHazards())

    const interval = setInterval(() => {
      callback(getLocalHazards())
    }, 2000)

    return () => clearInterval(interval)
  }
}

export const voteOnHazard = async (hazardId, voteType) => {
  if (db && firestoreInitialized) {
    try {
      const hazardRef = doc(db, "hazards", hazardId)
      const currentData = await getDoc(hazardRef)

      if (currentData.exists()) {
        const field = voteType === "yes" ? "voteYes" : "voteNo"
        await updateDoc(hazardRef, {
          [field]: (currentData.data()[field] || 0) + 1,
        })
      }
    } catch (error) {
      console.error("Error voting:", error)
    }
  } else {
    const hazards = getLocalHazards()
    const hazard = hazards.find((h) => h.id === hazardId)
    if (hazard) {
      const field = voteType === "yes" ? "voteYes" : "voteNo"
      updateLocalHazard(hazardId, { [field]: (hazard[field] || 0) + 1 })
    }
  }
}
