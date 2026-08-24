import { supabase } from '../lib/supabaseClient'

function urlDe(foto) {
  return foto.storage_path ? supabase.storage.from('actividades').getPublicUrl(foto.storage_path).data.publicUrl : foto.url
}

/**
 * Grilla simple de fotos, para Bitácora y Materiales. Cada entrada puede
 * ser {storage_path} (guardada en bitacora_fotos/material_fotos) o {url}
 * (la foto legacy de una sola URL, de antes de esas tablas) — se mezclan
 * en una sola grilla sin que importe de dónde vino cada una.
 */
export default function FotosGaleria({ fotos, size = 'h-24 w-24' }) {
  const lista = (fotos || []).filter(Boolean)
  if (lista.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {lista.map((f, i) => (
        <a
          key={f.id || i}
          href={urlDe(f)}
          target="_blank"
          rel="noreferrer"
          className={`${size} shrink-0 overflow-hidden rounded-xl bg-ink/5`}
        >
          <img src={urlDe(f)} alt="" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  )
}
