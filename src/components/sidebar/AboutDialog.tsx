import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Coffee, Heart } from 'lucide-react'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>About TTS Language Learning</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Version 1.3.1</div>

          <div className="space-y-4 text-sm">
            <p>
              This open-source project serves as a portfolio demonstration. It offers an interactive language learning tool that enables users to enhance their
              language skills through Text-to-Speech technology.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">Key Features:</h3>
              <ul className="list-disc pl-4 space-y-1">
                <li>Multi-language voice support with configurable speech settings</li>
                <li>Dark/Light theme support</li>
                <li>Data import/export (CSV/TSV/JSON)</li>
                <li>Audio export to MP3</li>
                <li>Google Cloud Text-to-Speech integration</li>
                <li>Local data storage with IndexedDB</li>
                <li>Pause customization between phrases</li>
                <li>Responsive design</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Tech Stack:</h3>
              <ul className="list-disc pl-4 space-y-1">
                <li>React + TypeScript + Vite</li>
                <li>TailwindCSS + Shadcn/UI</li>
                <li>Lucide Icons</li>
                <li>IndexedDB for storage</li>
                <li>Google Cloud TTS API</li>
              </ul>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Developed by Dariusz Krzeminski</p>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                If you're happy with this project,
                <br />
                consider buying me a coffee! ☕
              </p>

              <Button variant="default" asChild className="hover:bg-[#faa9ff] hover:text-[#8f3894] group">
                <a href="https://ko-fi.com/svslx" target="_blank" className="inline-flex items-center gap-2">
                  <span className="relative">
                    <Coffee className="w-4 h-4 transition-opacity duration-300 group-hover:opacity-0" />
                    <Heart className="w-4 h-4 text-red-500 absolute left-0 top-0 opacity-0 transition-all duration-300 scale-0 rotate-0 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-12" />
                  </span>
                  Buy me a coffee
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
