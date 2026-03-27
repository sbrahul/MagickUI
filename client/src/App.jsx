import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useImageStore } from './store/imageStore.js'
import { fetchCapabilities } from './api/client.js'
import { Sidebar } from './components/Sidebar.jsx'
import { PreviewPanel } from './components/PreviewPanel.jsx'
import { CommandBar } from './components/CommandBar.jsx'

export default function App() {
  const setCapabilities = useImageStore(s => s.setCapabilities)

  useEffect(() => {
    fetchCapabilities().then(setCapabilities)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-4 h-12 border-b border-white/10 flex-shrink-0">
        <span className="font-bold tracking-tight">MagickStudio</span>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Preview */}
        <main className="flex-1 flex flex-col overflow-hidden p-3">
          <PreviewPanel />
        </main>
      </div>

      {/* CommandBar */}
      <CommandBar />

      <Toaster theme="dark" position="bottom-center" />
    </div>
  )
}
