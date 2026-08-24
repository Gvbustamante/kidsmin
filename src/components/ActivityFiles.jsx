import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function fileUrl(path, bucket = 'actividades') {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function esFoto(f) {
  return f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
}

export default function ActivityFiles({ archivos }) {
  const [lightbox, setLightbox] = useState(null)

  if (!archivos || archivos.length === 0) return null

  const fotos = archivos.filter(esFoto)
  const otros = archivos.filter((f) => !esFoto(f))

  return (
    <>
      {fotos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setLightbox(f)}
              className="group aspect-square overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <img
                src={fileUrl(f.storage_path, f.bucket)}
                alt={f.nombre_archivo || 'Foto de la actividad'}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </button>
          ))}
        </div>
      )}

      {otros.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {otros.map((f) => (
            <a
              key={f.id}
              href={fileUrl(f.storage_path, f.bucket)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
            >
              📎 {f.nombre_archivo}
            </a>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="animate-pop-in fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={fileUrl(lightbox.storage_path, lightbox.bucket)}
            alt={lightbox.nombre_archivo || 'Foto de la actividad'}
            className="max-h-[85vh] max-w-full rounded-2xl shadow-soft"
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-2xl leading-none text-ink hover:bg-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
