import { EventEmitter } from 'events'
import { openDB, IDBPDatabase } from 'idb'

interface Phrase {
  id?: number
  position?: number
  langs: Record<string, string | undefined>
}

interface AudioCache {
  id: string
  audioData: string
  createdAt: number
}

interface DbSchema {
  phrases: {
    key: number
    value: Phrase
    indexes: { 'by-position': number }
  }
  audioCache: {
    key: string
    value: AudioCache
    indexes: { 'by-created-at': number }
  }
}

const DB_NAME = import.meta.env.VITE_DB_NAME || 'tts-language-learning'
const DB_VERSION = (import.meta.env.DB_VERSION && parseInt(import.meta.env.DB_VERSION)) || 1
const CACHE_EXPIRY_DAYS = 3
const MAX_CACHE_SIZE_MB = 50 // Maximum cache size in MB

let db: IDBPDatabase<DbSchema> | null = null

const emitter = new EventEmitter()

function updateDB(db: IDBPDatabase<DbSchema>) {
  if (db.objectStoreNames.contains('phrases')) db.deleteObjectStore('phrases')
  db.createObjectStore('phrases', { keyPath: 'id', autoIncrement: true }).createIndex('by-position', 'position')

  if (db.objectStoreNames.contains('audioCache')) db.deleteObjectStore('audioCache')
  db.createObjectStore('audioCache', { keyPath: 'id' }).createIndex('by-created-at', 'createdAt')
}

export async function initDB(): Promise<void> {
  db = await openDB<DbSchema>(DB_NAME, DB_VERSION, { upgrade: updateDB })
  await cleanupExpiredCache()
}

async function cleanupExpiredCache() {
  if (!db) throw new Error('Database not initialized')
  const tx = db.transaction('audioCache', 'readwrite')
  const store = tx.objectStore('audioCache')
  const index = store.index('by-created-at')

  // Calculate expiry timestamp
  const expiryTime = Date.now() - CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

  // Delete expired entries
  let cursor = await index.openCursor()
  let totalSize = 0

  while (cursor) {
    const entry = cursor.value

    // Delete if expired
    if (entry.createdAt < expiryTime) {
      await cursor.delete()
    } else {
      // Calculate size in MB
      const size = (entry.audioData.length * 3) / 4 / (1024 * 1024) // base64 to MB
      totalSize += size

      // If total size exceeds limit, delete oldest entries
      if (totalSize > MAX_CACHE_SIZE_MB) {
        await cursor.delete()
      }
    }
    cursor = await cursor.continue()
  }

  await tx.done
}

// phrases

export async function getAllPhrases(): Promise<Phrase[]> {
  if (!db) throw new Error('Database not initialized')
  const phrases = await db.getAll('phrases')
  return phrases.sort((a, b) => (a.position || 99999) - (b.position || 99999))
}

export async function importPhrase(phrases: Phrase[]) {
  if (!db) throw new Error('Database not initialized')
  const tx = db.transaction('phrases', 'readwrite')
  // await tx.store.clear()
  for (const phrase of phrases) {
    await tx.store.add(phrase)
  }
  await tx.done
  await emiterPhrases()
}

export async function updatePhrase(phrase: Phrase) {
  if (!db) throw new Error('Database not initialized')
  if (!phrase.id) throw new Error('Phrase id is required')
  await db.put('phrases', phrase)
  await emiterPhrases()
}

export async function deletePhrase(phrase: Phrase) {
  if (!db) throw new Error('Database not initialized')
  if (!phrase.id) throw new Error('Phrase id is required')
  await db.delete('phrases', phrase.id)
  await emiterPhrases()
}

export async function listenerPhrases(updateHandler: (newPhrases: Phrase[]) => void) {
  emitter.on('phrasesEmitter', updateHandler)
}
async function emiterPhrases() {
  emitter.emit('phrasesEmitter', await getAllPhrases())
}

// audio cache

export async function addAudioCache(cacheKey: string, audioData: string) {
  if (!db) throw new Error('Database not initialized')
  try {
    const cacheEntry: AudioCache = {
      id: cacheKey,
      audioData,
      createdAt: Date.now(),
    }
    await db.put('audioCache', cacheEntry)
    await updateAudioCacheSize()
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

export async function getCachedAudio(cacheKey: string): Promise<string | null> {
  if (!db) throw new Error('Database not initialized')
  try {
    const cached = await db.get('audioCache', cacheKey)
    if (cached && cached.audioData) {
      return cached.audioData
    }
  } catch (error) {
    console.error('Error reading from cache:', error)
  }
  return null
}

export async function clearAudioCache() {
  if (!db) throw new Error('Database not initialized')
  console.debug('clearAudioCache')
  const tx = db.transaction('audioCache', 'readwrite')
  await tx.objectStore('audioCache').clear()
  await tx.done
  await updateAudioCacheSize()
}

export interface AudioInfo {
  audioSize: number
  audioCount: number
}

export const listenerAudioInfo = (updateHandler: (newAudioInfo: AudioInfo) => void) => {
  emitter.on('audioInfoEmitter', updateHandler)
}

export async function updateAudioCacheSize() {
  if (!db) throw new Error('Database not initialized')
  const tx = db.transaction('audioCache', 'readonly')
  const store = tx.objectStore('audioCache')
  const entries = await store.getAll()
  await tx.done

  emitter.emit('audioInfoEmitter', {
    audioCount: entries.length,
    audioSize: entries.reduce((acc, entry) => {
      const size = (entry.audioData.length * 3) / 4
      return acc + size
    }, 0),
  })
}

export type { Phrase, DbSchema, AudioCache }
