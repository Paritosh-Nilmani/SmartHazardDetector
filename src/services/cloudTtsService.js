const voiceQueue = []
let isPlaying = false

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
      // Process next item in queue
      setTimeout(() => processQueue(), 300) // 300ms delay between announcements
    })
    .catch((error) => {
      reject(error)
      processQueue()
    })
}

const speakTextInternal = (text, options) => {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Speech synthesis not supported"))
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate || 0.85
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume !== undefined ? options.volume : 1

      const voice = getPreferredNavigationVoice()
      if (voice) {
        utterance.voice = voice
      }

      utterance.onend = () => {
        console.log("[v0] Voice guidance complete:", text.substring(0, 50))
        resolve()
      }

      utterance.onerror = (event) => {
        console.error("[v0] Voice error:", event.error)
        reject(new Error(`Voice error: ${event.error}`))
      }

      window.speechSynthesis.speak(utterance)
      console.log("[v0] Speaking:", text.substring(0, 60))
    } catch (error) {
      console.error("[v0] Error in speakTextInternal:", error)
      reject(error)
    }
  })
}

export const speakWithCloudTts = async (text, options = {}) => {
  return new Promise((resolve, reject) => {
    voiceQueue.push({ text, options, resolve, reject })
    if (!isPlaying) {
      processQueue()
    }
  })
}

export const getPreferredNavigationVoice = () => {
  if (!("speechSynthesis" in window)) return null

  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // Prioritize voices that sound natural for navigation
  let voice = voices.find((v) => v.lang === "en-US" && v.name.includes("Google"))
  if (voice) return voice

  voice = voices.find((v) => v.lang === "en-US" && !v.name.includes("Google"))
  if (voice) return voice

  voice = voices.find((v) => v.lang.startsWith("en-"))
  if (voice) return voice

  return voices[0] || null
}

export const stopNavigation = () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel()
    voiceQueue.length = 0 // Clear queue
    isPlaying = false
    console.log("[v0] Navigation speech stopped")
  }
}
