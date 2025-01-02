import { useEffect, useState } from 'react'
import { LanguageModal, languageName } from '@/components/sidebar/LanguageModal'
import { ConfirmDialog } from '@/components/sidebar/ConfirmDialog'
import { StorageUsage } from '@/components/sidebar/StorageUsage'
import { PhrasesDialog } from '@/components/sidebar/PhrasesDialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getAllPhrases, Phrase } from '@/lib/db/idb'
import { exportMP3 } from '@/lib/fileHandlers'
import { Settings } from '@/lib/types'
import { GoogleApiDialog } from './GoogleApiDialog'
import { PanelLeftClose, X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  phrases: Phrase[]
}

export function Sidebar({ isOpen, onClose, settings, onSettingsChange, phrases }: SidebarProps) {
  const [editingLanguageIndex, setEditingLanguageIndex] = useState<number>(0)
  const [showEditingLanguage, setShowEditingLanguage] = useState(false)
  const [showExportMp3Confirm, setShowExportMp3Confirm] = useState(false)
  const [showPhrasesDialog, setShowPhrasesDialog] = useState(false)
  const [showGoogleApiDialog, setShowGoogleApiDialog] = useState(false)

  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const googleApiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleAddLanguage = () => {
    if (settings.languages.length >= 5) {
      alert('Maximum of 5 languages allowed')
      return
    }

    const newLanguage = {
      code: 'de',
      voice: 'male' as const,
      speed: 1,
      showSubtitles: false,
    }

    onSettingsChange({
      ...settings,
      languages: [...settings.languages, newLanguage],
    })
    // setEditingLanguageIndex(settings.languages.length)
  }

  const handleRemoveLanguage = (index: number) => {
    if (settings.languages.length <= 2) {
      alert('Minimum of 2 languages required')
      return
    }

    const newLanguages = settings.languages.filter((_, i) => i !== index)
    onSettingsChange({
      ...settings,
      languages: newLanguages,
    })
  }

  const handleLanguageChange = (updatedLang: Settings['languages'][0]) => {
    const newLanguages = [...settings.languages]
    newLanguages[editingLanguageIndex] = updatedLang
    onSettingsChange({ ...settings, languages: newLanguages })
  }

  const handlePauseChange = (field: keyof Settings['pauses'], value: number) => {
    onSettingsChange({
      ...settings,
      pauses: { ...settings.pauses, [field]: value },
    })
  }

  const handleExportMP3 = async () => {
    try {
      const phrases = await getAllPhrases()
      await exportMP3(phrases, settings)
      toast({
        title: 'Export successful',
        description: 'Audio files have been exported successfully.',
      })
    } catch (error) {
      console.error('Error exporting MP3:', error)
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Error exporting audio files. Check console for details.',
      })
    }
  }

  return (
    <>
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-secondary/20 backdrop-blur shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-0 pl-4 pt-4">
          <div className="space-y-2 mb-2 pr-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Settings</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <PanelLeftClose size={24} />
              </Button>
            </div>
            <hr className="border-t border-border" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-10">
            {/* Language Settings */}
            <section>
              <h3 className="text-sm font-medium mb-4">Voice Languages</h3>
              <div className="space-y-2">
                {settings.languages.map((lang, index) => (
                  <div key={index} className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-grow p-2 text-left hover:bg-secondary/20 rounded-lg flex items-center justify-between"
                      onClick={() => {
                        setEditingLanguageIndex(index)
                        setShowEditingLanguage(true)
                      }}
                    >
                      <span>
                        {languageName[lang.code] || lang.code} ({lang.voice})
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {lang.speed.toFixed(1)}x{lang.showSubtitles ? ' · subtitles' : ''}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLanguage(index)}
                      disabled={settings.languages.length <= 2}
                      className={settings.languages.length <= 2 ? 'opacity-10' : 'hover:text-destructive'}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                ))}
                {settings.languages.length < 5 && (
                  <Button variant="outline" className="w-full mt-2" onClick={handleAddLanguage}>
                    Add Language
                  </Button>
                )}
              </div>
            </section>

            {/* Pause Settings */}
            <section>
              <h3 className="text-sm font-medium mb-4">Pause Settings</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Between Phrases</Label>
                    <span className="text-sm text-muted-foreground">{settings.pauses.betweenPhrases}s</span>
                  </div>
                  <Slider
                    value={[settings.pauses.betweenPhrases]}
                    min={0.5}
                    max={2}
                    step={0.5}
                    onValueChange={([value]) => handlePauseChange('betweenPhrases', value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Between Cycles</Label>
                    <span className="text-sm text-muted-foreground">{settings.pauses.betweenCycles}s</span>
                  </div>
                  <Slider
                    value={[settings.pauses.betweenCycles]}
                    min={2}
                    max={5}
                    step={1}
                    onValueChange={([value]) => handlePauseChange('betweenCycles', value)}
                  />
                </div>
              </div>
            </section>

            {/* Import/Export */}
            <section>
              <h3 className="text-sm font-medium mb-4">Import/Export</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => setShowPhrasesDialog(true)}>
                  Phrases List
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowExportMp3Confirm(true)}>
                  Export MP3
                </Button>
              </div>
            </section>

            <section>
              <div className="space-y-2">
                <hr className="border-t border-border my-2" />

                <StorageUsage />

                {!googleApiKey && (
                  <Button variant="outline" className="w-full" onClick={() => setShowGoogleApiDialog(true)}>
                    Google Cloud API Key
                  </Button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <LanguageModal
        key={editingLanguageIndex}
        isOpen={showEditingLanguage}
        language={settings.languages[editingLanguageIndex]}
        onClose={() => setShowEditingLanguage(false)}
        onSave={handleLanguageChange}
      />

      <PhrasesDialog isOpen={showPhrasesDialog} onClose={() => setShowPhrasesDialog(false)} phrases={phrases} />

      <GoogleApiDialog isOpen={showGoogleApiDialog} onClose={() => setShowGoogleApiDialog(false)} settings={settings} onSettingsChange={onSettingsChange} />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showExportMp3Confirm}
        onClose={() => setShowExportMp3Confirm(false)}
        onConfirm={async () => {
          setShowExportMp3Confirm(false)
          await handleExportMP3()
        }}
        title="Export MP3"
        message="This process might take some time depending on the number of phrases. Are you sure you want to continue?"
        actionLabel="Continue"
      />
    </>
  )
}
