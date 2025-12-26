let voicesCache = []
let voicesLoaded = false

const voiceQueue = []
let isPlaying = false

// Initialize voices on page load
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const loadVoices = () => {
    const availableVoices = window.speechSynthesis.getVoices()
    if (availableVoices.length > 0) {
      voicesCache = availableVoices
      voicesLoaded = true
      console.log("[v0] Voices loaded:", availableVoices.length, "available")
    }
  }

  // Chrome loads voices asynchronously
  window.speechSynthesis.onvoiceschanged = loadVoices
  loadVoices()
}

export const getPreferredVoice = () => {
  if (!voicesCache.length) {
    console.log("[v0] No voices available yet")
    return null
  }

  // Try to find English voice in order of preference
  // 1. Google English (US)
  let voice = voicesCache.find((v) => v.lang === "en-US" && v.name.includes("Google"))
  if (voice) {
    console.log("[v0] Using Google US voice")
    return voice
  }

  // 2. Any English (US) voice
  voice = voicesCache.find((v) => v.lang === "en-US")
  if (voice) {
    console.log("[v0] Using default US voice")
    return voice
  }

  // 3. Any English voice
  voice = voicesCache.find((v) => v.lang.startsWith("en-"))
  if (voice) {
    console.log("[v0] Using English voice:", voice.lang)
    return voice
  }

  // 4. First available voice as fallback
  if (voicesCache.length > 0) {
    console.log("[v0] Using fallback voice:", voicesCache[0].lang)
    return voicesCache[0]
  }

  return null
}

const speakTextInternal = (text, options) => {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      console.error("[v0] Speech synthesis not supported")
      reject(new Error("Speech synthesis not supported"))
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text)

      // Configure voice properties
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume !== undefined ? options.volume : 1

      // Set preferred voice
      const voice = getPreferredVoice()
      if (voice) {
        utterance.voice = voice
        console.log("[v0] Speaking with voice:", voice.name)
      } else {
        console.warn("[v0] No suitable voice found, using default")
      }

      // Handle completion
      utterance.onend = () => {
        console.log("[v0] Speech synthesis completed")
        resolve()
      }

      utterance.onerror = (event) => {
        console.error("[v0] Speech synthesis error:", event.error)
        reject(new Error(`Speech error: ${event.error}`))
      }

      // Start speaking
      window.speechSynthesis.speak(utterance)
      console.log("[v0] Started speaking:", text.substring(0, 50) + "...")
    } catch (error) {
      console.error("[v0] Error in speakTextInternal:", error)
      reject(error)
    }
  })
}

const processQueue = () => {
  if (voiceQueue.length === 0) {
    isPlaying = false
    return
  }

  isPlaying = true
  const { text, options, resolve, reject } = voiceQueue.shift()

  speakTextInternal(text, options)
    .then(() => {
      resolve()
      // 300ms delay between announcements for natural pausing
      setTimeout(() => processQueue(), 300)
    })
    .catch((error) => {
      reject(error)
      processQueue()
    })
}

export const speakText = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    voiceQueue.push({ text, options, resolve, reject })
    if (!isPlaying) {
      processQueue()
    }
  })
}

export const stopSpeech = () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel()
    voiceQueue.length = 0 // Clear queue when stopping
    isPlaying = false
    console.log("[v0] Speech stopped and queue cleared")
  }
}
