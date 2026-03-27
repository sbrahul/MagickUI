import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { Sidebar } from './Sidebar.jsx'

export function MobileSheet() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 p-4 rounded-full bg-blue-600 shadow-lg text-white"
        aria-label="Open editing panel"
      >
        <SlidersHorizontal size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-gray-900 max-h-[85vh] flex flex-col"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setOpen(false) }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-4 p-1 text-gray-400 hover:text-white"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
              <div className="flex-1 overflow-y-auto min-h-0">
                <Sidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
