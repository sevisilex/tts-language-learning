import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { importPhrase, Phrase } from '@/lib/db/idb'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport?: (data: Record<string, string>[]) => void
}

export function ImportDialog({ isOpen, onClose, onImport }: ImportDialogProps) {
  const [format, setFormat] = useState<string | null>(null)
  const [inputData, setInputData] = useState('')
  const { toast } = useToast()

  // Custom CSV/TSV parser function
  const parseDelimitedText = (text: string, delimiter: string = ',') => {
    try {
      // Split into lines and filter out empty lines
      const lines = text.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        throw new Error('File must have a header row and at least one data row')
      }

      // Parse header row
      const headers = splitLineWithQuotes(lines[0], delimiter)

      // Validate minimum number of columns
      if (headers.length < 2) {
        throw new Error('Data must have at least 2 language columns')
      }

      // Parse data rows
      const data = lines.slice(1).map((line) => {
        const values = splitLineWithQuotes(line, delimiter)
        return headers.reduce(
          (obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || ''
            return obj
          },
          {} as Record<string, string>
        )
      })

      return { data, errors: [] }
    } catch (error) {
      return { data: [], errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }] }
    }
  }

  // Helper function to handle quoted values in CSV/TSV
  const splitLineWithQuotes = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let currentValue = ''
    let isInQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (char === '"') {
        if (isInQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Handle escaped quotes
          currentValue += '"'
          i += 2
          continue
        }
        isInQuotes = !isInQuotes
      } else if (char === delimiter && !isInQuotes) {
        result.push(currentValue)
        currentValue = ''
      } else {
        currentValue += char
      }

      i++
    }

    result.push(currentValue) // Add the last value
    return result
  }

  const parseCSV = (data: string, delimiter: string) => {
    try {
      const result = parseDelimitedText(data, delimiter)

      if (result.errors.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Parse Error',
          description: `Error parsing data: ${result.errors[0].message}`,
        })
        return null
      }

      return result.data as Record<string, string>[]
    } catch {
      toast({
        variant: 'destructive',
        title: 'Parse Error',
        description: 'Failed to parse CSV data.',
      })
      return null
    }
  }

  const parseJSON = (data: string) => {
    try {
      const parsed = JSON.parse(data)
      // Validate array and check if each item is an object with at least 2 properties
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'object' && item !== null && Object.keys(item).length >= 2)) {
        toast({
          variant: 'destructive',
          title: 'Invalid JSON',
          description: 'JSON data must be an array of objects.',
        })
        return null
      }
      return parsed as Record<string, string>[]
    } catch {
      toast({
        variant: 'destructive',
        title: 'Parse Error',
        description: 'Failed to parse JSON data.',
      })
      return null
    }
  }

  const detectFileFormat = (filename: string): string | null => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'csv':
        return 'csv'
      case 'tsv':
        return 'tsv'
      case 'json':
        return 'json'
      default:
        return null
    }
  }

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const detectedFormat = detectFileFormat(file.name)
      if (detectedFormat) {
        setFormat(detectedFormat)
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setInputData(content)
        }
        reader.readAsText(file)
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select a CSV, TSV, or JSON file.',
        })
      }
    }
  }

  const handleImport = async () => {
    if (!inputData.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Data',
        description: 'Please enter some data to import.',
      })
      return
    }

    let parsedData: Record<string, string>[] | null = null

    switch (format) {
      case 'csv':
        parsedData = parseCSV(inputData, ',')
        break
      case 'tsv':
        parsedData = parseCSV(inputData, '\t')
        break
      case 'json':
        parsedData = parseJSON(inputData)
        break
    }

    if (parsedData) {
      const phrases: Phrase[] = parsedData.map((item) => ({ langs: item }))
      await importPhrase(phrases)
      setInputData('')
      setFormat(null)
      onClose()
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${parsedData.length} phrases.`,
      })
      onImport?.(parsedData)
    }
  }

  const handleBack = () => {
    setFormat(null)
    setInputData('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
        </DialogHeader>

        {!format ? (
          <div className="grid gap-4 py-4">
            <Button onClick={() => setFormat('csv')} variant="outline" className="justify-start">
              CSV (Comma Separated Values)
            </Button>
            <Button onClick={() => setFormat('tsv')} variant="outline" className="justify-start">
              TSV (Tab Separated Values)
            </Button>
            <Button onClick={() => setFormat('json')} variant="outline" className="justify-start">
              JSON
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Textarea
              className="font-mono h-48"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder={`Paste your ${format.toUpperCase()} data here...`}
            />
            <div className="flex justify-between items-center">
              <div className="flex justify-start gap-2">
                <input type="file" accept=".csv,.tsv,.json" onChange={handleFileLoad} className="hidden" id="fileInput" />
                <Button variant="secondary" onClick={() => document.getElementById('fileInput')?.click()}>
                  Load File
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleImport}>Import</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
