export interface Language {
  code: string
  voice: 'male' | 'female'
  speed: number
  showSubtitles: boolean
  sublanguage?: string
}

export interface Settings {
  languages: Language[]
  pauses: {
    betweenPhrases: number
    betweenCycles: number
  }
  darkMode: boolean
  googleApiKey?: string
}

export interface PlayerState {
  currentPhraseIndex: number
  isPlaying: boolean
  currentLanguageIndex: number
}

// global window type

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

// Fallback for localStorage during SSR (Server Side Rendering)
// When running on server, provide mock implementation with no-op methods

export const localStorage =
  typeof window !== 'undefined'
    ? window.localStorage
    : {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null,
        clear: () => null,
      }
