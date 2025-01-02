import { Language, Settings } from '@/lib/types'
import { addAudioCache, getCachedAudio } from '@/lib/db/idb'
import { synthesizeGoogleTTS } from './google'

interface AudioManager {
  currentAudio: HTMLAudioElement | null
  isPlaying: boolean
}

const audioManager: AudioManager = {
  currentAudio: null,
  isPlaying: false,
}

export function stop(): void {
  if (audioManager.currentAudio && audioManager.isPlaying) {
    audioManager.currentAudio.pause()
    audioManager.currentAudio.currentTime = 0
    audioManager.isPlaying = false
  }
}

export async function speak(text: string, language: Language): Promise<void> {
  try {
    stop()
    audioManager.currentAudio = null
    audioManager.isPlaying = false

    const audioContent = await getAudioContent(text, language)
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
    await new Promise((resolve) => {
      audio.addEventListener('canplaythrough', resolve, { once: true })
    })
    audioManager.currentAudio = audio

    try {
      audioManager.isPlaying = true
      await audio.play()
      await new Promise((resolve) => {
        audio.addEventListener('ended', resolve, { once: true })
      })
    } finally {
      audioManager.isPlaying = false
    }
  } catch (error) {
    console.error('Error with Google Cloud TTS:', error)
    throw error
  }
}

// Helper function to generate audio content from Google Cloud TTS
export async function getAudioContent(text: string, language: Language): Promise<string> {
  const cacheKey = `${language.code}-${language.voice}-${language.speed}|${text}`

  const cachedAudio = await getCachedAudio(cacheKey)
  if (cachedAudio) {
    return cachedAudio
  }

  try {
    const audioContent = await synthesizeSpeech('google', {
      text,
      lang: language.code,
      voice: language.voice,
      speed: language.speed,
    })

    // Cache the audio content
    await addAudioCache(cacheKey, audioContent)

    return audioContent
  } catch (error) {
    console.error('Error generating audio:', error)
    throw error
  }
}

export interface TTSRequest {
  text: string
  lang: string
  voice: 'male' | 'female'
  speed: number
  pitch?: number
}

export async function synthesizeSpeech(provider: 'google' | 'amazon' | 'azure', request: TTSRequest): Promise<string> {
  if (provider === 'google') {
    return synthesizeGoogleTTS(request)
  }
  throw new Error(`Unsupported provider: ${provider}`)
}

const defaultSettings: Settings = {
  languages: [
    { code: 'de', showSubtitles: false, voice: 'male', speed: 1 },
    { code: 'pl', showSubtitles: false, voice: 'male', speed: 1 },
    { code: 'de', showSubtitles: true, voice: 'female', speed: 1, sublanguage: 'pl' },
  ],
  pauses: { betweenPhrases: 0.5, betweenCycles: 2 },
  darkMode: false,
}

export function loadSettings(): Settings {
  const savedSettings = localStorage.getItem('tts-settings')
  if (savedSettings) {
    return JSON.parse(savedSettings)
  }
  return defaultSettings
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem('tts-settings', JSON.stringify(settings))
}
