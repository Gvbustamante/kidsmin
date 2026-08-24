import { supabase } from '../lib/supabaseClient'

function fileUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function icono(f) {
  const tipo = f.tipo || ''
  const nombre = f.nombre_archivo || ''
  if (tipo.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(nombre)) return '🖼️'
  if (tipo === 'application/pdf' || /\.pdf$/i.test(nombre)) return '📄'
  if (tipo.startsWith('video/')) return '🎬'
  if (tipo.startsWith('audio/')) return '🎵'
  if (/\.(docx?|xlsx?|pptx?)$/i.test(nombre)) return '📝'
  return '📎'
}

/**
 * Lista de archivos descargables, estilo blog: un renglón por archivo con
 * su icono, nombre y botón de descargar. Se usa en ActividadDetalle.jsx y
 * DevocionalDetalle.jsx, debajo del contenido principal.
 */
export default function ArticulosAdjuntos({ archivos, bucket = 'actividades', titulo = '📎 Materiales para descargar' }) {
  if (!archivos || archivos.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink/40">{titulo}</p>
      <div className="flex flex-col gap-2">
        {archivos.map((f) => (
          <a
            key={f.id}
            href={fileUrl(f.bucket || bucket, f.storage_path)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 transition-colors hover:border-sky-300 hover:bg-sky-50"
          >
            <span className="text-2xl">{icono(f)}</span>
            <span className="min-w-0 flex-1 truncate font-bold text-ink">{f.nombre_archivo || 'Archivo'}</span>
            <span className="shrink-0 text-sm font-bold text-sky-600">⬇️ Descargar</span>
          </a>
        ))}
      </div>
    </div>
  )
}
