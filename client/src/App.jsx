import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { Sun, Moon } from 'lucide-react'
import { useImageStore } from './store/imageStore.js'
import { fetchCapabilities } from './api/client.js'
import { Sidebar } from './components/Sidebar.jsx'
import { PreviewPanel } from './components/PreviewPanel.jsx'
import { CommandBar } from './components/CommandBar.jsx'
import { MobileSheet } from './components/MobileSheet.jsx'

export default function App() {
  const setCapabilities = useImageStore(s => s.setCapabilities)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    fetchCapabilities().then(setCapabilities)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  useEffect(() => {
    const cleanup = () => useImageStore.getState().cleanup()
    window.addEventListener('beforeunload', cleanup)
    return () => window.removeEventListener('beforeunload', cleanup)
  }, [])

  return (
    <div className="h-svh flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-4 h-12 border-b border-white/10 flex-shrink-0">
        <span className="font-bold tracking-tight text-sm">MagickStudio</span>
        <button
          onClick={() => setDark(d => !d)}
          className="ml-auto p-2 rounded hover:bg-white/10 text-gray-400"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar />
        </div>

        {/* Preview */}
        <main className="flex-1 flex flex-col overflow-hidden p-2 md:p-3 min-h-0">
          <PreviewPanel />
        </main>
      </div>

      <CommandBar />
      <MobileSheet />
      <Toaster theme="dark" position="bottom-center" offset={56} />
    </div>
  )
}
