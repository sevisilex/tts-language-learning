import { useState, useEffect } from 'react'
import { AudioInfo, listenerAudioInfo, updateAudioCacheSize } from '@/lib/db/idb'
import { Database } from 'lucide-react'
import { Button } from '../ui/button'
import { ConfirmDialog } from './ConfirmDialog'
import { clearAudioCache } from '@/lib/db/idb'
import { toast } from '@/hooks/use-toast'

interface StorageInfo {
  audioSize: number
  audioCount: number
  isLoading: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export function StorageUsage() {
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false)
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    audioSize: 0,
    audioCount: 0,
    isLoading: true,
  })

  useEffect(() => {
    listenerAudioInfo((newAudioInfo: AudioInfo) => {
      setStorageInfo({
        audioSize: newAudioInfo.audioSize,
        audioCount: newAudioInfo.audioCount,
        isLoading: false,
      })
    })

    updateAudioCacheSize()
  }, [])

  if (storageInfo.isLoading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Calculating storage usage...</div>
  }

  const handleClearCache = async () => {
    try {
      await clearAudioCache()
      setShowClearCacheConfirm(false)
      toast({
        title: 'Cache cleared',
        description: 'Audio cache has been cleared.',
      })
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  return (
    <>
      <div className="text-sm space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Database className="w-4 h-4" />
          <span>Audio Cache</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <span className="text-muted-foreground">Used Space:</span>
          <span className="text-right font-mono">{formatBytes(storageInfo.audioSize)}</span>
          <span className="text-muted-foreground">Files:</span>
          <span className="text-right font-mono">{storageInfo.audioCount}</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" disabled={!storageInfo.audioSize} onClick={() => setShowClearCacheConfirm(true)}>
        Clear Audio Cache
      </Button>

      {/* Confirm Clear Cache Dialog */}
      <ConfirmDialog
        isOpen={showClearCacheConfirm}
        onClose={() => setShowClearCacheConfirm(false)}
        onConfirm={handleClearCache}
        title="Clear Audio Cache"
        message="Are you sure you want to clear the audio cache? This will delete all cached audio files and they will need to be regenerated when needed."
        actionLabel="Delete"
        variant="destructive"
      />
    </>
  )
}

export default StorageUsage
