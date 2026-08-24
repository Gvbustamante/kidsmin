import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function fileUrl(path, bucket = 'actividades') {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function esFoto(f) {
  return f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
}

function iconoPorTipo(nombre) {
  if (!nombre) return '📄'
  const ext = nombre.split('.').pop()?.toLowerCase()
  if (['pdf'].includes(ext)) return '📕'
  if (['doc', 'docx'].includes(ext)) return '📘'
  if (['xls', 'xlsx'].includes(ext)) return '📗'
  if (['ppt', 'pptx'].includes(ext)) return '📙'
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return '🎬'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
  return '📄'
}

/**
 * Muestra los archivos ya subidos de una actividad/devocional con opción
 * de eliminar cada uno individualmente. Al eliminar se borra el registro
 * de la BD y, si NO es del Drive, también del Storage.
 */
export default function ArchivosExistentes({ archivos, tabla = 'actividad_archivos', onDeleted }) {
  const [eliminando, setEliminando] = useState(null)

  if (!archivos || archivos.length === 0) return null

  async function eliminar(archivo) {
    if (!confirm(`¿Eliminar "${archivo.nombre_archivo || 'este archivo'}"?`)) return
    setEliminando(archivo.id)

    // Borrar de Storage solo si NO es del Drive (los del Drive se comparten)
    if (archivo.bucket !== 'drive') {
      await supabase.storage.from(archivo.bucket || 'actividades').remove([archivo.storage_path])
    }

    // Borrar registro de la BD
    await supabase.from(tabla).delete().eq('id', archivo.id)

    setEliminando(null)
    onDeleted?.(archivo.id)
  }

  const fotos = archivos.filter(esFoto)
  const otros = archivos.filter((f) => !esFoto(f))

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink/40">Archivos subidos</p>

      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f) => (
            <div key={f.id} className="group relative aspect-square overflow-hidden rounded-xl bg-ink/5">
              <img
                src={fileUrl(f.storage_path, f.bucket)}
                alt={f.nombre_archivo || ''}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => eliminar(f)}
                disabled={eliminando === f.id}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-coral-500 text-xs font-bold text-white shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-coral-600 disabled:opacity-50"
                title="Eliminar"
              >
                {eliminando === f.id ? '…' : '×'}
              </button>
            </div>
          ))}
        </div>
      )}

      {otros.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {otros.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-xl bg-ink/[0.03] px-3 py-2">
              <span className="text-lg">{iconoPorTipo(f.nombre_archivo)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink/70">{f.nombre_archivo || 'Archivo'}</span>
              {f.bucket === 'drive' && <span className="text-[10px] font-bold text-sky-500">Drive</span>}
              <button
                type="button"
                onClick={() => eliminar(f)}
                disabled={eliminando === f.id}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-coral-500 hover:bg-coral-50 disabled:opacity-50"
              >
                {eliminando === f.id ? '...' : '🗑️ Quitar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
