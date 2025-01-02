import { loadSettings, TTSRequest } from '.'

// Language code mappings for Google Cloud TTS
const languageCode: Record<string, string> = {
  de: 'de-DE',
  pl: 'pl-PL',
  fr: 'fr-FR',
}

const languageName: Record<string, { female: string; male: string }> = {
  pl: {
    female: 'pl-PL-Standard-A',
    male: 'pl-PL-Standard-G',
  },
}

export async function synthesizeGoogleTTS({ text, lang, voice, speed }: TTSRequest): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || loadSettings().googleApiKey

  if (!apiKey) {
    throw new Error('Google Cloud API key is not configured')
  }

  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        ssmlGender: voice === 'male' ? 'MALE' : 'FEMALE',
        languageCode: languageCode[lang] || lang,
        name: languageName[lang]?.[voice],
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speed,
        pitch: 1.0,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Google Cloud TTS API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.audioContent
}
