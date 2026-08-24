import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import { getFileIcon, getFileType } from './FilePreview'
import { coincide } from '../lib/busqueda'

function fileUrl(path) {
  return supabase.storage.from('drive').getPublicUrl(path).data.publicUrl
}

/**
 * Modal para elegir archivos del Drive y traerlos a un formulario
 * (Actividades, Devocionales, Foro, etc.) sin re-subirlos.
 *
 * Props:
 *   open       – boolean
 *   onClose    – () => void
 *   onSelect   – (archivos: { nombre, storage_path, tipo, tamano, drive_url }[]) => void
 *   multiple   – boolean (default true)
 *   accept     – filtro MIME opcional, ej. 'image/*'
 */
export default function DrivePicker({ open, onClose, onSelect, multiple = true, accept }) {
  const [carpetas, setCarpetas] = useState([])
  const [archivos, setArchivos] = useState([])
  const [ruta, setRuta] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState([]) // ids
  const [loading, setLoading] = useState(true)

  const carpetaActualId = ruta.length > 0 ? ruta[ruta.length - 1].id : null

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from('carpetas_drive').select('id, nombre, padre_id').order('nombre'),
      supabase.from('archivos_drive').select('id, nombre, storage_path, tipo, tamano, carpeta_id').order('nombre'),
    ])
    setCarpetas(c || [])
    setArchivos(a || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      load()
      setSeleccionados([])
      setRuta([])
      setBusqueda('')
    }
  }, [open, load])

  const carpetasAqui = carpetas.filter((c) => c.padre_id === carpetaActualId && coincide(busqueda, c.nombre))

  const archivosAqui = archivos.filter((a) => {
    if (a.carpeta_id !== carpetaActualId) return false
    if (!coincide(busqueda, a.nombre)) return false
    if (accept) {
      const [mainType] = accept.split('/')
      if (accept.endsWith('/*')) {
        if (!a.tipo?.startsWith(mainType + '/')) return false
      } else {
        if (a.tipo !== accept) return false
      }
    }
    return true
  })

  function toggle(id) {
    if (!multiple) {
      setSeleccionados(seleccionados.includes(id) ? [] : [id])
      return
    }
    setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function confirmar() {
    const elegidos = archivos
      .filter((a) => seleccionados.includes(a.id))
      .map((a) => ({
        nombre: a.nombre,
        storage_path: a.storage_path,
        tipo: a.tipo,
        tamano: a.tamano,
        drive_url: fileUrl(a.storage_path),
      }))
    onSelect(elegidos)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="📁 Elegir del Drive">
      <div className="flex flex-col gap-3 -mt-1">
        {/* Breadcrumb + search */}
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
            <button
              onClick={() => { setRuta([]); setBusqueda('') }}
              className={`shrink-0 rounded-lg px-2 py-1 font-bold transition-colors ${ruta.length === 0 ? 'bg-sky-100 text-sky-700' : 'text-ink/50 hover:bg-ink/5'}`}
            >
              🏠
            </button>
            {ruta.map((r, i) => (
              <span key={r.id} className="flex items-center gap-1">
                <span className="text-ink/30">/</span>
                <button
                  onClick={() => { setRuta(ruta.slice(0, i + 1)); setBusqueda('') }}
                  className={`shrink-0 rounded-lg px-2 py-1 font-bold transition-colors ${i === ruta.length - 1 ? 'bg-sky-100 text-sky-700' : 'text-ink/50 hover:bg-ink/5'}`}
                >
                  {r.nombre}
                </button>
              </span>
            ))}
          </nav>
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input !w-32 !py-1 !text-sm"
          />
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border-2 border-ink/10 divide-y divide-ink/5">
          {loading && <p className="px-4 py-8 text-center text-ink/40 text-sm">Cargando...</p>}

          {!loading && carpetasAqui.length === 0 && archivosAqui.length === 0 && (
            <p className="px-4 py-8 text-center text-ink/40 text-sm">
              {busqueda ? 'Sin resultados.' : 'Carpeta vacía.'}
            </p>
          )}

          {carpetasAqui.map((c) => (
            <button
              key={c.id}
              onClick={() => { setRuta([...ruta, { id: c.id, nombre: c.nombre }]); setBusqueda('') }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-sky-50/50"
            >
              <span className="text-xl">📁</span>
              <span className="flex-1 truncate text-sm font-bold">{c.nombre}</span>
              <span className="text-ink/30 text-xs">→</span>
            </button>
          ))}

          {archivosAqui.map((a) => {
            const selected = seleccionados.includes(a.id)
            const esImagen = getFileType(a.nombre, a.tipo) === 'imagen'
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${selected ? 'bg-sky-100' : 'hover:bg-ink/5'}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold ${selected ? 'border-sky-400 bg-sky-400 text-white' : 'border-ink/20'}`}>
                  {selected ? '✓' : ''}
                </span>
                {esImagen ? (
                  <img src={fileUrl(a.storage_path)} alt="" className="h-8 w-8 rounded object-cover shrink-0" loading="lazy" />
                ) : (
                  <span className="text-xl shrink-0">{getFileIcon(a.nombre, a.tipo)}</span>
                )}
                <span className="flex-1 truncate text-sm font-bold">{a.nombre}</span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink/40">
            {seleccionados.length} archivo{seleccionados.length === 1 ? '' : 's'} seleccionado{seleccionados.length === 1 ? '' : 's'}
          </p>
          <button
            className="btn-primary !py-2 !px-5 !text-sm"
            disabled={seleccionados.length === 0}
            onClick={confirmar}
          >
            Usar seleccionados
          </button>
        </div>
      </div>
    </Modal>
  )
}
