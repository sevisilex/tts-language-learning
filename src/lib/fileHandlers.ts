import { Phrase } from '@/lib/db/idb'
import { Language, Settings } from '@/lib/types'
import { getAudioContent } from '@/lib/tts'

// Create and manage progress indicator
class ProgressIndicator {
  private element: HTMLDivElement
  private progressBar: HTMLDivElement
  private textElement: HTMLDivElement

  constructor() {
    // Create container
    this.element = document.createElement('div')
    this.element.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #000000;
      color: #ffffff;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      min-width: 250px;
    `

    // Create text element
    this.textElement = document.createElement('div')
    this.textElement.style.marginBottom = '8px'
    this.element.appendChild(this.textElement)

    // Create progress bar container
    const progressContainer = document.createElement('div')
    progressContainer.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      overflow: hidden;
    `

    // Create progress bar indicator
    this.progressBar = document.createElement('div')
    this.progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: #ffffff;
      border-radius: 2px;
      transition: width 0.3s ease;
    `

    progressContainer.appendChild(this.progressBar)
    this.element.appendChild(progressContainer)
    document.body.appendChild(this.element)
  }

  update(progress: number, currentItem: number, totalItems: number) {
    this.textElement.textContent = `Generating audio files: ${progress}% (${currentItem}/${totalItems})`
    this.progressBar.style.width = `${progress}%`
  }

  remove() {
    document.body.removeChild(this.element)
  }
}

export async function exportMP3(phrases: Phrase[], settings: Settings): Promise<void> {
  const progress = new ProgressIndicator()

  try {
    // Initialize Web Audio Context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const totalPhrases = phrases.length
    const audioBuffers: AudioBuffer[] = []

    // Generate silence buffers for pauses
    const shortPause = await createSilenceBuffer(audioContext, settings.pauses.betweenPhrases)
    const longPause = await createSilenceBuffer(audioContext, settings.pauses.betweenCycles)

    // Process each phrase
    for (let phraseIndex = 0; phraseIndex < phrases.length; phraseIndex++) {
      const phrase = phrases[phraseIndex]
      progress.update(Math.round((phraseIndex / totalPhrases) * 100), phraseIndex + 1, totalPhrases)

      // Process each language for the current phrase
      for (let langIndex = 0; langIndex < settings.languages.length; langIndex++) {
        const lang = settings.languages[langIndex]
        const text = phrase.langs[lang.code] as string

        // Get and add audio for the current language
        const audio = await getAudioAndDecodeBuffer(text, lang, audioContext)
        audioBuffers.push(audio)
        audioBuffers.push(langIndex === settings.languages.length - 1 ? longPause : shortPause)
      }

      // Add small delay to prevent API rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Combine all audio buffers
    const finalBuffer = await combineAudioBuffers(audioContext, audioBuffers)

    // Convert to WAV and save
    // Convert audio buffer to MP3
    const mp3Data = await audioBufferToMp3(finalBuffer)

    // Create Blob from MP3 data
    const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' })

    const url = window.URL.createObjectURL(mp3Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `language_audio_${new Date().toISOString().split('T')[0]}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error in MP3 export:', error)
    throw error
  } finally {
    progress.remove()
  }
}

async function getAudioAndDecodeBuffer(text: string, language: Language, audioContext: AudioContext): Promise<AudioBuffer> {
  const audioContent = await getAudioContent(text, language)
  const arrayBuffer = base64ToArrayBuffer(audioContent)
  return await audioContext.decodeAudioData(arrayBuffer)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

async function createSilenceBuffer(audioContext: AudioContext, duration: number): Promise<AudioBuffer> {
  const sampleRate = audioContext.sampleRate
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  return buffer
}

async function combineAudioBuffers(audioContext: AudioContext, buffers: AudioBuffer[]): Promise<AudioBuffer> {
  // Calculate total duration
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.length, 0)

  // Create a new buffer for the combined audio
  const combinedBuffer = audioContext.createBuffer(
    1, // mono
    totalLength,
    audioContext.sampleRate
  )

  // Copy each buffer into the combined buffer
  let offset = 0
  for (const buffer of buffers) {
    const channelData = buffer.getChannelData(0)
    combinedBuffer.copyToChannel(channelData, 0, offset)
    offset += buffer.length
  }

  return combinedBuffer
}

/*
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels
  const length = audioBuffer.length * numOfChan * 2
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)
  const channels = []
  let offset = 0
  let pos = 0

  // write WAVE header
  setUint32(0x46464952) // "RIFF"
  setUint32(length + 36) // length
  setUint32(0x45564157) // "WAVE"
  setUint32(0x20746d66) // "fmt "
  setUint32(16) // format chunk length
  setUint16(1) // coding (PCM)
  setUint16(numOfChan)
  setUint32(audioBuffer.sampleRate)
  setUint32(audioBuffer.sampleRate * 2 * numOfChan) // byte rate
  setUint16(numOfChan * 2) // block align
  setUint16(16) // bits per sample
  setUint32(0x61746164) // "data"
  setUint32(length) // data chunk length

  // write interleaved data
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true)
    pos += 4
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
*/

async function audioBufferToMp3(audioBuffer: AudioBuffer): Promise<Int8Array> {
  const lamejs = await import('@breezystack/lamejs')
  const mp3encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128) //mono 44.1khz encode to 128kbps

  const samples = audioBuffer.getChannelData(0) // get channel data
  const sampleBlockSize = 1152 //can be anything but make it a multiple of 576 to make encoders life easier

  const mp3Data = []

  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.slice(i, i + sampleBlockSize)
    const mp3buf = mp3encoder.encodeBuffer(convertFloat32ToInt16(sampleChunk))
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }
  }

  const mp3buf = mp3encoder.flush() //finish writing mp3

  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf)
  }

  // Combine all mp3 data chunks into one array
  const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0)
  const combinedMp3Data = new Int8Array(totalLength)
  let offset = 0

  for (const buf of mp3Data) {
    combinedMp3Data.set(buf, offset)
    offset += buf.length
  }

  return combinedMp3Data
}

function convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}
