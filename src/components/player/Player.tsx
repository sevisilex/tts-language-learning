import { useEffect, useRef, useState } from 'react'
import { PlayerState } from '@/lib/types'
import { Phrase } from '@/lib/db/idb'
import { speak, stop } from '@/lib/tts'
import { Button } from '@/components/ui/button'
import { Settings } from '@/lib/types'
import { RotateCcw } from 'lucide-react'
import { ImportDialog } from '@/components/sidebar/ImportDialog'
import { toast } from '@/hooks/use-toast'

interface PlayerProps {
  phrases: Phrase[]
  playerState: PlayerState
  settings: Settings
  setPlayerState: (updater: (prev: PlayerState) => PlayerState) => void
}

export function Player({ phrases, playerState, settings, setPlayerState }: PlayerProps) {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalPhrases = phrases.length
  const phrase = phrases[playerState.currentPhraseIndex]
  const currentLanguage = settings.languages[playerState.currentLanguageIndex]

  useEffect(() => {
    return () => stopTimeout()
  }, [])

  useEffect(() => {
    if (playerState.isPlaying && phrase && currentLanguage) {
      playNextPart(phrase.langs[currentLanguage.code])
      return () => stopTimeout()
    }
  }, [playerState.isPlaying, playerState.currentLanguageIndex, playerState.currentPhraseIndex])

  useEffect(() => {
    handlePause()
  }, [settings.languages.length, totalPhrases])

  // Clean up function to clear any pending timeouts
  const stopTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    stop()
  }

  const playNextPart = async (text: string | undefined) => {
    try {
      stopTimeout()

      if (!text) {
        throw new Error(`No phrase for ${currentLanguage.code} language`)
      }

      await speak(text, currentLanguage)

      const isLastLanguage = playerState.currentLanguageIndex === settings.languages.length - 1
      const isLastPhrase = playerState.currentPhraseIndex === totalPhrases - 1
      const pauseDuration = (isLastLanguage ? settings.pauses.betweenCycles : settings.pauses.betweenPhrases) * 1000

      await new Promise((resolve) => {
        // Wait for the pause duration, it can cancel the speech
        timeoutRef.current = setTimeout(resolve, pauseDuration)
      })

      if (!isLastLanguage) {
        setPlayerState((prev) => ({ ...prev, currentLanguageIndex: prev.currentLanguageIndex + 1 }))
      } else {
        if (isLastPhrase) {
          handlePause()
        } else {
          handleNext()
        }
      }
    } catch (error) {
      console.error('TTS error:', error)
      handlePause()
      toast({
        title: 'Speech synthesis error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const handlePlay = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: true }))
  }

  const handlePause = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false }))
    stop()
  }

  const handleNext = () => {
    setPlayerState((prev) => ({ ...prev, currentPhraseIndex: Math.min(prev.currentPhraseIndex + 1, totalPhrases - 1), currentLanguageIndex: 0 }))
  }

  const handlePrev = () => {
    setPlayerState((prev) => ({ ...prev, currentPhraseIndex: Math.max(prev.currentPhraseIndex - 1, 0), currentLanguageIndex: 0 }))
  }

  return (
    <>
      <div className="flex flex-col justify-between min-h-screen p-4">
        <div className="flex-grow flex flex-col items-center justify-center">
          {/* Main phrase display */}
          {phrase ? (
            <>
              <div className="text-5xl font-bold mb-8">
                {currentLanguage.showSubtitles ? ( //
                  phrase.langs[currentLanguage.code]
                ) : (
                  <span className="opacity-10">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _</span>
                )}
              </div>
              <div className="text-xl text-muted-foreground mb-8">
                {currentLanguage.sublanguage && currentLanguage.sublanguage !== 'none' ? (
                  phrase.langs[currentLanguage.sublanguage]
                ) : (
                  <span className="opacity-10">&nbsp;</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-5xl font-bold mb-8">
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold">No phrase loaded</div>
                <p className="text-base text-muted-foreground">Start by importing a file with your phrases</p>
                <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                  Import
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom navigation controls */}
        {totalPhrases > 0 && (
          <div className="pb-4 flex flex-col items-center">
            {totalPhrases > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (playerState.isPlaying) {
                    handlePause()
                  }
                  setPlayerState((prev) => ({ ...prev, currentPhraseIndex: 0, currentLanguageIndex: 0 }))
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Play from start{' '}
              </Button>
            )}

            <div className="mb-2 mt-4 text-sm text-muted-foreground">
              {playerState.currentPhraseIndex + 1} / {totalPhrases}
            </div>

            {/* Controls */}
            <div className="flex gap-4 items-center">
              <Button variant="outline" size="icon" onClick={handlePrev} disabled={playerState.currentPhraseIndex === 0}>
                ←
              </Button>

              <Button size="lg" onClick={playerState.isPlaying ? handlePause : handlePlay} className="w-24">
                {playerState.isPlaying ? '❚❚' : '▶'}
              </Button>

              <Button variant="outline" size="icon" onClick={handleNext} disabled={playerState.currentPhraseIndex === totalPhrases - 1}>
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImportDialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} />
    </>
  )
}
