import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Phrase } from '@/lib/db/idb'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  phrases: Phrase[]
}

interface ExportFormat {
  data: string
  filename: string
  type: string
}

export function ExportDialog({ isOpen, onClose, phrases }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [exportData, setExportData] = useState<ExportFormat | null>(null)

  const getSortedHeaders = () => {
    // Get all possible headers (excluding id and position)
    const allHeaders = new Set<string>()
    phrases.forEach((phrase) => {
      Object.keys(phrase.langs).forEach((key) => {
        allHeaders.add(key)
      })
    })

    // Count non-empty values for each header
    const headerCounts = Array.from(allHeaders).map((header) => ({
      header,
      count: phrases.filter((phrase) => phrase.langs[header]).length,
    }))

    // Sort by count (descending)
    return headerCounts.sort((a, b) => b.count - a.count).map((item) => item.header)
  }

  const escapeValue = (value: string | undefined, separator: string) => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(separator) || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const prepareCSV = () => {
    const headers = getSortedHeaders()
    const content = [
      headers.join(','),
      ...phrases
        .sort((a, b) => (a.position || 99999) - (b.position || 99999))
        .map((phrase) => headers.map((key) => escapeValue(phrase.langs[key], ',')).join(',')),
    ].join('\n')

    setExportData({
      data: content,
      filename: 'phrases.csv',
      type: 'text/csv',
    })
  }

  const prepareTSV = () => {
    const headers = getSortedHeaders()
    const content = [
      headers.join('\t'),
      ...phrases
        .sort((a, b) => (a.position || 99999) - (b.position || 99999))
        .map((phrase) => headers.map((key) => escapeValue(phrase.langs[key], '\t')).join('\t')),
    ].join('\n')

    setExportData({
      data: content,
      filename: 'phrases.tsv',
      type: 'text/tab-separated-values',
    })
  }

  const prepareJSON = () => {
    const sortedAndCleanedPhrases = phrases.sort((a, b) => (a.position || 99999) - (b.position || 99999)).map(({ langs }) => langs)
    const content = JSON.stringify(sortedAndCleanedPhrases, null, 2)
    setExportData({
      data: content,
      filename: 'phrases.json',
      type: 'application/json',
    })
  }

  const handleFormatSelect = (format: string) => {
    setSelectedFormat(format)
    switch (format) {
      case 'csv':
        prepareCSV()
        break
      case 'tsv':
        prepareTSV()
        break
      case 'json':
        prepareJSON()
        break
    }
  }

  const { toast } = useToast()

  const handleCopy = async () => {
    try {
      if (!exportData?.data) return
      await navigator.clipboard.writeText(exportData.data)
      toast({
        title: 'Copied to clipboard',
        description: 'Content has been copied to your clipboard.',
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Failed to copy content to clipboard.',
      })
    }
  }

  const handleDownload = () => {
    if (!exportData) return

    const blob = new Blob([exportData.data], { type: exportData.type })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', exportData.filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
        </DialogHeader>

        {!selectedFormat ? (
          <div className="grid gap-4 py-4">
            <Button onClick={() => handleFormatSelect('csv')} variant="outline" className="justify-start">
              CSV (Comma Separated Values)
            </Button>
            <Button onClick={() => handleFormatSelect('tsv')} variant="outline" className="justify-start">
              TSV (Tab Separated Values)
            </Button>
            <Button onClick={() => handleFormatSelect('json')} variant="outline" className="justify-start">
              JSON
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="relative">
              <Textarea readOnly className="font-mono h-48" value={exportData?.data || ''} />

              <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedFormat(null)}>
                Back
              </Button>
              <Button onClick={handleDownload}>Save {selectedFormat.toUpperCase()} File</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
