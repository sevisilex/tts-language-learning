import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Settings } from '@/lib/types'

interface GoogleApiDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

export function GoogleApiDialog({ isOpen, onClose, settings, onSettingsChange }: GoogleApiDialogProps) {
  const [googleApiKey, setGoogleApiKey] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && settings.googleApiKey) {
      setGoogleApiKey(settings.googleApiKey)
    } else {
      setGoogleApiKey('')
    }
  }, [isOpen, settings.googleApiKey])

  const handleClose = () => {
    const trimmedKey = googleApiKey.trim()
    if (trimmedKey !== settings.googleApiKey) {
      onSettingsChange({
        ...settings,
        googleApiKey: trimmedKey,
      })
      if (trimmedKey) {
        toast({
          title: 'Success',
          description: 'Google API key has been saved',
        })
      }
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Google Cloud API Key</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter your Google Cloud API key for Text-to-Speech service</p>
            <Input type="password" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} placeholder="Enter API key..." />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
