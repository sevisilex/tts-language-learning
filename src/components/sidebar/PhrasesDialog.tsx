import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deletePhrase, updatePhrase, Phrase } from '@/lib/db/idb'
import { Trash2, MoveVertical } from 'lucide-react'
import { ExportDialog } from '@/components/sidebar/ExportDialog'
import { ImportDialog } from '@/components/sidebar/ImportDialog'
import { ConfirmDialog } from '@/components/sidebar/ConfirmDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'

interface EditableCellProps {
  value: string
  onSave: (value: string) => void
}

function EditableCell({ value, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleBlur = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onSave(editValue)
    }
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleBlur()
          }
        }}
        className="w-full p-1 border rounded bg-background"
      />
    )
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded p-1">
      {value}
    </div>
  )
}

interface PhraseWithId extends Phrase {
  id: number
}

interface SelectedPhrases {
  [id: number]: boolean
}

interface PhrasesDialogProps {
  isOpen: boolean
  onClose: () => void
  phrases: Phrase[]
}

export function PhrasesDialog({ isOpen, onClose, phrases }: PhrasesDialogProps) {
  const [phraseToDelete, setPhraseToDelete] = useState<PhraseWithId | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedPhrases, setSelectedPhrases] = useState<SelectedPhrases>({})
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const getSortedHeaders = () => {
    const allHeaders = new Set<string>()
    phrases.forEach((phrase) => {
      Object.keys(phrase.langs).forEach((key) => {
        allHeaders.add(key)
      })
    })
    const headerCounts = Array.from(allHeaders).map((header) => ({
      header,
      count: phrases.filter((phrase) => phrase.langs[header]).length,
    }))
    return headerCounts.sort((a, b) => b.count - a.count).map((item) => item.header)
  }

  const hasSelectedPhrases = Object.values(selectedPhrases).some(Boolean)
  const phrasesWithId = [...phrases].filter((phrase) => phrase.id !== undefined) as PhraseWithId[]
  const headers = getSortedHeaders()

  // update positions

  const updatePositions = async (startIndex: number, endIndex: number) => {
    const newPhrases = [...phrasesWithId]
    const [movedPhrase] = newPhrases.splice(startIndex, 1)
    newPhrases.splice(endIndex, 0, movedPhrase)

    const updates = newPhrases.map((phrase, index) => updatePhrase({ ...phrase, position: index + 1 }))

    try {
      await Promise.all(updates)
    } catch (error) {
      console.error('Error updating positions:', error)
    }
  }

  const clearSelection = () => {
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  }

  // update/delete one phrase

  const handleUpdatePhrase = async (phrase: PhraseWithId, field: string, value: string) => {
    try {
      const updatedPhrase = { ...phrase, langs: { ...phrase.langs, [field]: value } }
      await updatePhrase(updatedPhrase)
    } catch (error) {
      console.error('Error updating phrase:', error)
    }
  }

  const handleDeletePhrase = async (phrase: PhraseWithId) => {
    try {
      await deletePhrase(phrase)
      setPhraseToDelete(null)
      setSelectedPhrases({})
    } catch (error) {
      console.error('Error deleting phrase:', error)
    }
  }

  // multiple selection phrases

  const handleSelectPhrase = (phraseId: number) => {
    setSelectedPhrases((prev) => ({ ...prev, [phraseId]: !prev[phraseId] }))
  }

  const handleDeleteSelected = async () => {
    try {
      const promises = phrasesWithId.filter((phrase) => selectedPhrases[phrase.id]).map((phrase) => deletePhrase(phrase))
      await Promise.all(promises)
      setPhraseToDelete(null)
      setSelectedPhrases({})
    } catch (error) {
      console.error('Error deleting phrases:', error)
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={() => {
          setSelectedPhrases({})
          onClose()
        }}
      >
        <DialogContent className="sm:max-w-[90vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Phrases</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <Table className="relative">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-14 text-center">#</TableHead>
                  {headers.map((header) => (
                    <TableHead key={header}>{header.toUpperCase()}</TableHead>
                  ))}
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phrasesWithId.map((phrase, index) => (
                  <TableRow
                    key={phrase.id}
                    draggable={draggedIndex !== null}
                    onDragOver={(e) => {
                      if (draggedIndex !== null) {
                        e.preventDefault()
                        setDragOverIndex(index)
                      }
                    }}
                    onDragEnd={() => {
                      if (draggedIndex !== null && dragOverIndex !== null) {
                        updatePositions(draggedIndex, dragOverIndex)
                      }
                      setDraggedIndex(null)
                      setDragOverIndex(null)
                    }}
                    className={`
                      ${draggedIndex === index ? 'opacity-20' : ''}
                      ${dragOverIndex === index ? 'border-t-2 border-primary' : ''}
                    `}
                  >
                    <TableCell className="font-mono text-center">
                      {hasSelectedPhrases ? (
                        <div className="flex items-center h-8 w-8 justify-center">
                          <Checkbox checked={selectedPhrases[phrase.id] || false} onCheckedChange={() => handleSelectPhrase(phrase.id)} className="h-4 w-4" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground cursor-pointer" onClick={() => handleSelectPhrase(phrase.id)}>
                          {index + 1}
                        </span>
                      )}
                    </TableCell>
                    {headers.map((header) => (
                      <TableCell key={header}>
                        <EditableCell value={(phrase.langs[header] as string) || ''} onSave={(value) => handleUpdatePhrase(phrase, header, value)} />
                      </TableCell>
                    ))}
                    <TableCell className="text-end">
                      {!hasSelectedPhrases && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-grab active:cursor-grabbing"
                            onMouseDown={() => {
                              clearSelection()
                              setDraggedIndex(index)
                            }}
                            onMouseUp={() => setDraggedIndex(null)}
                          >
                            <MoveVertical className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setPhraseToDelete(phrase)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasSelectedPhrases && (
            <div className="mt-4 flex gap-2 justify-start">
              <Button variant="outline" onClick={() => setSelectedPhrases({})} className={hasSelectedPhrases ? 'bg-muted' : ''}>
                {'Cancel Selection'}
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  setPhraseToDelete({ id: -1, position: -1, langs: {} })
                }}
              >
                Delete Selected ({Object.values(selectedPhrases).filter(Boolean).length})
              </Button>
            </div>
          )}

          {!hasSelectedPhrases && (
            <div className="mt-4 flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                Import Data
              </Button>
              <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                Export Data
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!phraseToDelete}
        onClose={() => setPhraseToDelete(null)}
        onConfirm={() => {
          if (phraseToDelete?.id === -1) {
            handleDeleteSelected()
          } else if (phraseToDelete) {
            handleDeletePhrase(phraseToDelete)
          }
        }}
        title={phraseToDelete?.id === -1 ? 'Delete Selected Phrases' : 'Delete Phrase'}
        message={
          phraseToDelete?.id === -1
            ? `Are you sure you want to delete ${Object.values(selectedPhrases).filter(Boolean).length} selected phrases? This action cannot be undone.`
            : 'Are you sure you want to delete this phrase? This action cannot be undone.'
        }
        actionLabel="Delete"
        variant="destructive"
      />

      <ExportDialog isOpen={showExportDialog} onClose={() => setShowExportDialog(false)} phrases={phrases} />
      <ImportDialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} />
    </>
  )
}
