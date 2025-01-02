import { useState, useEffect } from 'react'
import { Moon, Sun, PanelLeftOpen, Info, Coffee, Heart } from 'lucide-react'
import { Player } from '@/components/player/Player'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { AboutDialog } from '@/components/sidebar/AboutDialog'
import { ImportDemoDialog } from '@/components/player/ImportDemoDialog'
import { PlayerState, Settings } from '@/lib/types'
import { initDB, getAllPhrases, Phrase, listenerPhrases } from '@/lib/db/idb'
import { loadSettings, saveSettings } from './lib/tts'
import { Button } from '@/components/ui/button'

function applyDarkMode(settings: Settings) {
  if (settings.darkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    applyDarkMode(settings)
    saveSettings(settings)
  }, [settings])

  return [settings, setSettings] as const
}

export default function App() {
  const [settings, setSettings] = useSettings()
  const [phrases, setPhrases] = useState<Phrase[]>([])

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showAboutDialog, setShowAboutDialog] = useState(false)
  const [showEmptyDialog, setShowEmptyDialog] = useState(false)
  const [resolveEmptyDialog, setResolveEmptyDialog] = useState<() => void>()
  const [mounted, setMounted] = useState(false)
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentPhraseIndex: 0,
    currentLanguageIndex: 0,
    isPlaying: false,
  })

  // Initialize database
  useEffect(() => {
    const initializeDB = async () => {
      await initDB()
      const phrases = await getAllPhrases()
      setPhrases(phrases)
      setMounted(true)

      listenerPhrases((newPhrases: Phrase[]) => {
        setPhrases(newPhrases)
      })

      if (!phrases.length) {
        setShowEmptyDialog(true)
        await new Promise<void>((resolve) => setResolveEmptyDialog(() => resolve))
        setShowEmptyDialog(false)
      }

      setTimeout(() => {
        setShowAboutDialog(true)
        setIsSidebarOpen(true)
      }, 2000)
    }
    initializeDB()
  }, [])

  useEffect(() => {
    setPlayerState((prev) => ({
      currentPhraseIndex: Math.max(0, Math.min(prev.currentPhraseIndex, phrases.length - 1)),
      currentLanguageIndex: 0,
      isPlaying: false,
    }))
  }, [phrases])

  if (!mounted || !settings) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Menu Button */}
      <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4">
        <PanelLeftOpen size={24} />
      </Button>

      {/* About Button */}
      <Button variant="ghost" size="icon" onClick={() => setShowAboutDialog(true)} className="fixed top-4 right-16">
        <Info size={20} />
      </Button>

      {/* Dark Mode Toggle */}
      <Button variant="ghost" size="icon" onClick={() => setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }))} className="fixed top-4 right-4">
        {settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </Button>

      {/* Player */}
      <Player settings={settings} phrases={phrases} playerState={playerState} setPlayerState={setPlayerState} />

      <Sidebar settings={settings} onSettingsChange={setSettings} phrases={phrases} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* About Dialog */}
      <AboutDialog isOpen={showAboutDialog} onClose={() => setShowAboutDialog(false)} />

      {/* Buy me a coffee button */}
      <Button variant="ghost" asChild className="fixed bottom-8 right-4 hover:bg-[#faa9ff] hover:text-[#8f3894] group">
        <a href="https://ko-fi.com/svslx" target="_blank" className="inline-flex items-center gap-2">
          <span className="relative">
            <Coffee className="w-4 h-4 transition-opacity duration-300 group-hover:opacity-0" />
            <Heart className="w-4 h-4 text-red-500 absolute left-0 top-0 opacity-0 transition-all duration-300 scale-0 rotate-0 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-12" />
          </span>
          Buy me a coffee
        </a>
      </Button>

      {/* Demo data */}
      <ImportDemoDialog isOpen={showEmptyDialog} onClose={() => resolveEmptyDialog?.()} settings={settings} onSettingsChange={setSettings} />
    </div>
  )
}
