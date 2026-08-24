import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, wide, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={panelRef}
        className={`card my-auto w-full animate-pop-in overflow-hidden !p-0 shadow-xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ Header fijo ═══ */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/5 bg-white px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink/70"
          >
            ✕
          </button>
        </div>
        {/* ═══ Body scrolleable ═══ */}
        <div className="max-h-[calc(90vh-64px)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
