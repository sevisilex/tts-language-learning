import { ConfirmDialog } from '@/components/sidebar/ConfirmDialog'
import { toast } from '@/hooks/use-toast'

import { addAudioCache, importPhrase, Phrase } from '@/lib/db/idb'
import { Settings } from '@/lib/types'

interface ImportDemoDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

export function ImportDemoDialog({ isOpen, onClose, settings, onSettingsChange }: ImportDemoDialogProps) {
  const handleImportDemo = async () => {
    try {
      const response = await fetch('/demo/data.json')
      const data = (await response.json()) as { phrases: Record<string, string>[]; settings: Settings; voices: { id: string; audioFile: string }[] }
      const phrases: Phrase[] = data.phrases.map((item) => ({ langs: item }))
      await importPhrase(phrases)
      onSettingsChange({ ...settings, ...data.settings })

      await Promise.all(
        data.voices.map(async (voice) => {
          const response = await fetch(`/demo/${voice.audioFile}.json`)
          const data = (await response.json()) as { audioContent: string }
          addAudioCache(voice.id, data.audioContent)
        })
      )

      toast({
        title: 'Demo data imported',
        description: `Imported ${data.phrases.length} demo phrases`,
      })
    } catch (error) {
      console.error('Error importing demo data:', error)
      toast({
        title: 'Error importing demo data',
        description: `Error: ${error instanceof Error ? error.message : `Unknown error: ${error}`}`,
        variant: 'destructive',
      })
    } finally {
      onClose()
    }
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleImportDemo}
      forceAction={true}
      title="Oh! It's Empty Here!"
      message="It looks like you don't have any saved phrases yet! Would you like to import languages with four demo phrases?"
      actionLabel="Yes, show me!"
      cancelLabel="No thanks, I'll add my own"
    />
  )
}
