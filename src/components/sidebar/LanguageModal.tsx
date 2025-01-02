import { useCallback, useEffect, useState } from 'react'
import { Settings } from '@/lib/types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LanguageModalProps {
  language: Settings['languages'][0]
  onClose: () => void
  onSave: (lang: Settings['languages'][0]) => void
  isOpen: boolean
}

export const languageName: Record<string, string> = {
  en: 'English',
  ar: 'Arabic',
  bg: 'Bulgarian',
  zh: 'Chinese',
  hr: 'Croatian',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  fr: 'French',
  de: 'German',
  hu: 'Hungarian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  es: 'Spanish',
  sr: 'Serbian',
  tr: 'Turkish',
}

export function LanguageModal({ language, onClose, onSave, isOpen }: LanguageModalProps) {
  const [editedLang, setEditedLang] = useState(language)

  // Reset editedLang when language prop changes
  useEffect(() => {
    setEditedLang(language)
  }, [language])

  const handleChange = useCallback(
    (changes: Partial<Settings['languages'][0]>) => {
      const newLang = { ...editedLang, ...changes }
      setEditedLang(newLang)
      onSave(newLang)
    },
    [editedLang, onSave]
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Language</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Language Voice</Label>
            <Select value={editedLang.code} onValueChange={(value) => handleChange({ code: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languageName).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Show Subtitles</span>
            <Switch checked={editedLang.showSubtitles} onCheckedChange={(checked) => handleChange({ showSubtitles: checked })} />
          </div>

          <div className="grid gap-2 mt-6">
            <Label>Voice</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={editedLang.voice === 'male' ? 'default' : 'outline'}
                onClick={() => handleChange({ voice: 'male' as const })}
                className="w-full"
              >
                Male
              </Button>
              <Button
                size="sm"
                variant={editedLang.voice === 'female' ? 'default' : 'outline'}
                onClick={() => handleChange({ voice: 'female' as const })}
                className="w-full"
              >
                Female
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label>Speech Speed</Label>
              <span className="text-sm text-muted-foreground">{editedLang.speed.toFixed(1)}x</span>
            </div>
            <Slider value={[editedLang.speed]} min={0.5} max={1.5} step={0.1} onValueChange={([value]) => handleChange({ speed: value })} />
          </div>

          <div className="grid gap-2 mt-6">
            <Label>Show Sublanguage Subtitle</Label>
            <Select value={editedLang.sublanguage || 'none'} onValueChange={(value) => handleChange({ sublanguage: value })}>
              <SelectTrigger className={editedLang.sublanguage === 'none' || !editedLang.sublanguage ? 'opacity-25' : ''}>
                <SelectValue placeholder="No additional subtitles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="opacity-25">
                  No additional subtitles
                </SelectItem>
                {Object.entries(languageName).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
