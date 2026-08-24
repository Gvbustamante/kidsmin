import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/Skeleton'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import FilePreview, { getFileIcon, getFileType } from '../components/FilePreview'
import { coincide } from '../lib/busqueda'

const VISTAS = ['grid', 'lista', 'compacta']
const VISTA_ICONS = { grid: '▦', lista: '☰', compacta: '≡' }

function fileUrl(path) {
  return supabase.storage.from('drive').getPublicUrl(path).data.publicUrl
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Drive() {
  const { profile } = useAuth()
  const [carpetas, setCarpetas] = useState(null)
  const [archivos, setArchivos] = useState(null)
  const [ruta, setRuta] = useState([]) // [{ id, nombre }, ...] — breadcrumb stack
  const [vista, setVista] = useState(() => localStorage.getItem('drive-vista') || 'grid')
  const [busqueda, setBusqueda] = useState('')

  const [verPapelera, setVerPapelera] = useState(false)

  // Modals
  const [carpetaModal, setCarpetaModal] = useState(false)
  const [carpetaEditando, setCarpetaEditando] = useState(null)
  const [carpetaNombre, setCarpetaNombre] = useState('')
  const [renombrarModal, setRenombrarModal] = useState(null) // archivo
  const [renombrarNombre, setRenombrarNombre] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState(null) // { tipo: 'carpeta'|'archivo', item }
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [moverModal, setMoverModal] = useState(null) // archivo o carpeta que se va a mover
  const [moverDestino, setMoverDestino] = useState(null) // carpeta destino id (null = raíz)
  const [todasCarpetas, setTodasCarpetas] = useState([])

  const fileInputRef = useRef(null)
  const carpetaActualId = ruta.length > 0 ? ruta[ruta.length - 1].id : null

  const load = useCallback(async () => {
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase
        .from('carpetas_drive')
        .select('*, creador:profiles(nombre_completo)')
        .order('nombre'),
      supabase
        .from('archivos_drive')
        .select('*, subidor:profiles(nombre_completo)')
        .order('nombre'),
    ])
    setCarpetas(c || [])
    setArchivos(a || [])
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    localStorage.setItem('drive-vista', vista)
  }, [vista])

  // Carpetas y archivos de la ubicación actual (o papelera)
  const carpetasAqui = (carpetas || []).filter((c) => {
    if (verPapelera) return !!c.eliminado_at && coincide(busqueda, c.nombre)
    const enCarpeta = c.padre_id === carpetaActualId
    return enCarpeta && !c.eliminado_at && coincide(busqueda, c.nombre)
  })
  const archivosAqui = (archivos || []).filter((a) => {
    if (verPapelera) return !!a.eliminado_at && coincide(busqueda, a.nombre)
    const enCarpeta = a.carpeta_id === carpetaActualId
    return enCarpeta && !a.eliminado_at && coincide(busqueda, a.nombre)
  })

  // Conteo de items en papelera
  const enPapelera = (carpetas || []).filter((c) => c.eliminado_at).length + (archivos || []).filter((a) => a.eliminado_at).length

  function entrar(carpeta) {
    setRuta([...ruta, { id: carpeta.id, nombre: carpeta.nombre }])
    setBusqueda('')
  }

  function irA(index) {
    setRuta(ruta.slice(0, index + 1))
    setBusqueda('')
  }

  function irARaiz() {
    setRuta([])
    setBusqueda('')
  }

  // --- CRUD carpetas ---
  function openNuevaCarpeta() {
    setCarpetaEditando(null)
    setCarpetaNombre('')
    setCarpetaModal(true)
  }

  function openEditarCarpeta(c) {
    setCarpetaEditando(c)
    setCarpetaNombre(c.nombre)
    setCarpetaModal(true)
  }

  async function guardarCarpeta(e) {
    e.preventDefault()
    if (!carpetaNombre.trim()) return
    if (carpetaEditando) {
      await supabase.from('carpetas_drive').update({ nombre: carpetaNombre.trim() }).eq('id', carpetaEditando.id)
    } else {
      await supabase.from('carpetas_drive').insert({
        nombre: carpetaNombre.trim(),
        padre_id: carpetaActualId,
        creado_por: profile.id,
      })
    }
    setCarpetaModal(false)
    load()
  }

  // --- Subir archivos ---
  async function subirArchivos(fileList) {
    if (!fileList?.length) return
    setSubiendo(true)
    const files = Array.from(fileList)
    for (const file of files) {
      const ts = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = carpetaActualId
        ? `${carpetaActualId}/${ts}-${safeName}`
        : `raiz/${ts}-${safeName}`
      const { error: upErr } = await supabase.storage.from('drive').upload(storagePath, file)
      if (upErr) { console.error(upErr); continue }
      await supabase.from('archivos_drive').insert({
        carpeta_id: carpetaActualId,
        nombre: file.name,
        storage_path: storagePath,
        tipo: file.type || null,
        tamano: file.size || null,
        subido_por: profile.id,
      })
    }
    setSubiendo(false)
    load()
  }

  // --- Renombrar archivo ---
  function openRenombrar(archivo) {
    setRenombrarModal(archivo)
    setRenombrarNombre(archivo.nombre)
  }

  async function guardarRenombrar(e) {
    e.preventDefault()
    if (!renombrarNombre.trim()) return
    await supabase.from('archivos_drive').update({ nombre: renombrarNombre.trim() }).eq('id', renombrarModal.id)
    setRenombrarModal(null)
    load()
  }

  // --- Eliminar (soft-delete → papelera) ---
  async function confirmarEliminar() {
    setConfirmBusy(true)
    const { tipo, item } = confirmEliminar
    const ahora = new Date().toISOString()
    if (tipo === 'carpeta') {
      await supabase.from('carpetas_drive').update({ eliminado_at: ahora }).eq('id', item.id)
      // Marcar archivos dentro de la carpeta también
      const archivosEnCarpeta = (archivos || []).filter((a) => a.carpeta_id === item.id && !a.eliminado_at)
      for (const a of archivosEnCarpeta) {
        await supabase.from('archivos_drive').update({ eliminado_at: ahora }).eq('id', a.id)
      }
    } else {
      await supabase.from('archivos_drive').update({ eliminado_at: ahora }).eq('id', item.id)
    }
    setConfirmBusy(false)
    setConfirmEliminar(null)
    load()
  }

  // --- Restaurar desde papelera ---
  async function restaurar(tipo, item) {
    if (tipo === 'carpeta') {
      await supabase.from('carpetas_drive').update({ eliminado_at: null }).eq('id', item.id)
      // Restaurar archivos que estaban en esa carpeta
      const archivosEnCarpeta = (archivos || []).filter((a) => a.carpeta_id === item.id && a.eliminado_at)
      for (const a of archivosEnCarpeta) {
        await supabase.from('archivos_drive').update({ eliminado_at: null }).eq('id', a.id)
      }
    } else {
      await supabase.from('archivos_drive').update({ eliminado_at: null }).eq('id', item.id)
    }
    load()
  }

  // --- Eliminar definitivamente ---
  const [confirmDefinitivo, setConfirmDefinitivo] = useState(null)
  const [confirmDefBusy, setConfirmDefBusy] = useState(false)

  async function eliminarDefinitivamente() {
    setConfirmDefBusy(true)
    const { tipo, item } = confirmDefinitivo
    if (tipo === 'carpeta') {
      const archivosEnCarpeta = (archivos || []).filter((a) => a.carpeta_id === item.id)
      for (const a of archivosEnCarpeta) {
        await supabase.storage.from('drive').remove([a.storage_path])
      }
      await supabase.from('carpetas_drive').delete().eq('id', item.id)
    } else {
      await supabase.storage.from('drive').remove([item.storage_path])
      await supabase.from('archivos_drive').delete().eq('id', item.id)
    }
    setConfirmDefBusy(false)
    setConfirmDefinitivo(null)
    load()
  }

  // --- Vaciar papelera ---
  const [confirmVaciar, setConfirmVaciar] = useState(false)
  const [vaciarBusy, setVaciarBusy] = useState(false)

  async function vaciarPapelera() {
    setVaciarBusy(true)
    const archivosPapelera = (archivos || []).filter((a) => a.eliminado_at)
    for (const a of archivosPapelera) {
      await supabase.storage.from('drive').remove([a.storage_path])
    }
    await supabase.from('archivos_drive').delete().not('eliminado_at', 'is', null)
    await supabase.from('carpetas_drive').delete().not('eliminado_at', 'is', null)
    setVaciarBusy(false)
    setConfirmVaciar(false)
    load()
  }

  // --- Mover archivo/carpeta ---
  async function openMover(item, tipo) {
    setMoverModal({ item, tipo })
    setMoverDestino(tipo === 'carpeta' ? item.padre_id : item.carpeta_id)
    // Cargar TODAS las carpetas para el selector
    const { data } = await supabase.from('carpetas_drive').select('id, nombre, padre_id').order('nombre')
    setTodasCarpetas(data || [])
  }

  async function confirmarMover() {
    if (!moverModal) return
    const { item, tipo } = moverModal
    if (tipo === 'carpeta') {
      await supabase.from('carpetas_drive').update({ padre_id: moverDestino || null }).eq('id', item.id)
    } else {
      await supabase.from('archivos_drive').update({ carpeta_id: moverDestino || null }).eq('id', item.id)
    }
    setMoverModal(null)
    load()
  }

  // --- Preview ---
  function abrirPreview(archivo) {
    setPreview({
      url: fileUrl(archivo.storage_path),
      nombre: archivo.nombre,
      mime: archivo.tipo,
    })
  }

  // --- Loading state ---
  if (!carpetas || !archivos) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const hayContenido = carpetasAqui.length > 0 || archivosAqui.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{verPapelera ? '🗑️ Papelera' : '📁 Drive'}</h1>
          <p className="text-sm text-ink/50">
            {verPapelera ? 'Archivos eliminados — puedes restaurarlos o borrarlos definitivamente' : 'Archivos y materiales compartidos del equipo'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!verPapelera && (
            <>
              <button className="btn-primary !py-2 !px-4 !text-sm" onClick={openNuevaCarpeta}>
                📁 Nueva carpeta
              </button>
              <button
                className="btn-secondary !py-2 !px-4 !text-sm"
                disabled={subiendo}
                onClick={() => fileInputRef.current?.click()}
              >
                {subiendo ? '⏳ Subiendo...' : '📤 Subir archivos'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  subirArchivos(e.target.files)
                  e.target.value = ''
                }}
              />
            </>
          )}
          {verPapelera && enPapelera > 0 && ['admin', 'coordinador'].includes(profile.role) && (
            <button className="btn-secondary !py-2 !px-4 !text-sm !text-coral-600 !border-coral-200 hover:!bg-coral-50" onClick={() => setConfirmVaciar(true)}>
              🗑️ Vaciar papelera
            </button>
          )}
          <button
            onClick={() => { setVerPapelera(!verPapelera); setBusqueda(''); setRuta([]) }}
            className={`relative rounded-full px-4 py-2 text-sm font-bold transition-colors ${verPapelera ? 'bg-coral-400 text-white' : 'bg-white text-ink/50 border-2 border-ink/10'}`}
          >
            🗑️ Papelera
            {!verPapelera && enPapelera > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white">
                {enPapelera}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Toolbar: breadcrumb + vista + busqueda */}
      <div className="card !p-3 flex flex-wrap items-center gap-3">
        {/* Breadcrumb (no en papelera) */}
        {!verPapelera && (
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
            <button
              onClick={irARaiz}
              className={`shrink-0 rounded-lg px-2 py-1 font-bold transition-colors ${ruta.length === 0 ? 'bg-sky-100 text-sky-700' : 'text-ink/50 hover:bg-ink/5'}`}
            >
              🏠 Inicio
            </button>
            {ruta.map((r, i) => (
              <span key={r.id} className="flex items-center gap-1">
                <span className="text-ink/30">/</span>
                <button
                  onClick={() => irA(i)}
                  className={`shrink-0 rounded-lg px-2 py-1 font-bold transition-colors ${i === ruta.length - 1 ? 'bg-sky-100 text-sky-700' : 'text-ink/50 hover:bg-ink/5'}`}
                >
                  {r.nombre}
                </button>
              </span>
            ))}
          </nav>
        )}
        {verPapelera && <span className="flex-1 text-sm font-bold text-ink/40">Mostrando elementos eliminados</span>}

        {/* Busqueda */}
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input !w-40 !py-1.5 !text-sm sm:!w-56"
        />

        {/* Vista toggle */}
        <div className="flex rounded-xl border-2 border-ink/10 overflow-hidden">
          {VISTAS.map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-2.5 py-1.5 text-sm font-bold transition-colors ${vista === v ? 'bg-sky-400 text-white' : 'bg-white text-ink/40 hover:bg-sky-50'}`}
              title={v[0].toUpperCase() + v.slice(1)}
            >
              {VISTA_ICONS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {!hayContenido ? (
        <div className="card text-center">
          <p className="text-5xl mb-3">{verPapelera ? '🗑️' : '📂'}</p>
          <p className="text-ink/40 font-bold">
            {busqueda
              ? 'No hay resultados para tu búsqueda.'
              : verPapelera
                ? 'La papelera está vacía.'
                : 'Esta carpeta está vacía.'}
          </p>
          {!verPapelera && <p className="text-sm text-ink/30 mt-1">Sube archivos o crea una carpeta para empezar.</p>}
        </div>
      ) : vista === 'grid' ? (
        <GridView
          carpetas={carpetasAqui}
          archivos={archivosAqui}
          onEntrar={verPapelera ? undefined : entrar}
          onPreview={abrirPreview}
          onEditarCarpeta={verPapelera ? undefined : openEditarCarpeta}
          onEliminar={verPapelera ? undefined : (tipo, item) => setConfirmEliminar({ tipo, item })}
          onRenombrar={verPapelera ? undefined : openRenombrar}
          onMover={verPapelera ? undefined : openMover}
          onRestaurar={verPapelera ? restaurar : undefined}
          onEliminarDefinitivo={verPapelera ? (tipo, item) => setConfirmDefinitivo({ tipo, item }) : undefined}
          profile={profile}
          papelera={verPapelera}
        />
      ) : vista === 'lista' ? (
        <ListaView
          carpetas={carpetasAqui}
          archivos={archivosAqui}
          onEntrar={verPapelera ? undefined : entrar}
          onPreview={abrirPreview}
          onEditarCarpeta={verPapelera ? undefined : openEditarCarpeta}
          onEliminar={verPapelera ? undefined : (tipo, item) => setConfirmEliminar({ tipo, item })}
          onRenombrar={verPapelera ? undefined : openRenombrar}
          onMover={verPapelera ? undefined : openMover}
          onRestaurar={verPapelera ? restaurar : undefined}
          onEliminarDefinitivo={verPapelera ? (tipo, item) => setConfirmDefinitivo({ tipo, item }) : undefined}
          profile={profile}
          papelera={verPapelera}
        />
      ) : (
        <CompactaView
          carpetas={carpetasAqui}
          archivos={archivosAqui}
          onEntrar={verPapelera ? undefined : entrar}
          onPreview={abrirPreview}
          onEditarCarpeta={verPapelera ? undefined : openEditarCarpeta}
          onEliminar={verPapelera ? undefined : (tipo, item) => setConfirmEliminar({ tipo, item })}
          onRenombrar={verPapelera ? undefined : openRenombrar}
          onMover={verPapelera ? undefined : openMover}
          onRestaurar={verPapelera ? restaurar : undefined}
          onEliminarDefinitivo={verPapelera ? (tipo, item) => setConfirmDefinitivo({ tipo, item }) : undefined}
          profile={profile}
          papelera={verPapelera}
        />
      )}

      {/* Modals */}
      <Modal open={carpetaModal} onClose={() => setCarpetaModal(false)} title={carpetaEditando ? 'Renombrar carpeta' : 'Nueva carpeta'}>
        <form onSubmit={guardarCarpeta} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              required
              className="input"
              value={carpetaNombre}
              onChange={(e) => setCarpetaNombre(e.target.value)}
              placeholder="Ej. Materiales de clase"
              autoFocus
            />
          </div>
          <button className="btn-primary justify-center">
            {carpetaEditando ? 'Guardar' : 'Crear carpeta'}
          </button>
        </form>
      </Modal>

      <Modal open={!!renombrarModal} onClose={() => setRenombrarModal(null)} title="Renombrar archivo">
        <form onSubmit={guardarRenombrar} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              required
              className="input"
              value={renombrarNombre}
              onChange={(e) => setRenombrarNombre(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn-primary justify-center">Guardar</button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmEliminar}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar}
        busy={confirmBusy}
        title={confirmEliminar?.tipo === 'carpeta' ? '¿Enviar carpeta a la papelera?' : '¿Enviar archivo a la papelera?'}
        confirmLabel="Sí, mover a papelera"
        message={
          confirmEliminar?.tipo === 'carpeta'
            ? `"${confirmEliminar.item.nombre}" y su contenido irán a la papelera. Podrás restaurarlo después.`
            : `"${confirmEliminar?.item.nombre}" irá a la papelera. Podrás restaurarlo después.`
        }
      />

      <ConfirmModal
        open={!!confirmDefinitivo}
        onClose={() => setConfirmDefinitivo(null)}
        onConfirm={eliminarDefinitivamente}
        busy={confirmDefBusy}
        title="¿Eliminar definitivamente?"
        confirmLabel="Sí, eliminar para siempre"
        message={`"${confirmDefinitivo?.item.nombre}" se borrará para siempre del servidor. Esta acción NO se puede deshacer.`}
      />

      <ConfirmModal
        open={confirmVaciar}
        onClose={() => setConfirmVaciar(false)}
        onConfirm={vaciarPapelera}
        busy={vaciarBusy}
        title="¿Vaciar toda la papelera?"
        confirmLabel="Sí, eliminar todo"
        message={`Se eliminarán definitivamente ${enPapelera} elemento(s) del servidor. Esta acción NO se puede deshacer.`}
      />

      {/* Mover modal */}
      <Modal open={!!moverModal} onClose={() => setMoverModal(null)} title={`Mover: ${moverModal?.item.nombre}`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink/50">Selecciona la carpeta destino:</p>
          <button
            onClick={() => setMoverDestino(null)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left font-bold transition-colors ${moverDestino === null ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'}`}
          >
            🏠 Inicio (raíz)
          </button>
          {todasCarpetas
            .filter((c) => moverModal?.tipo === 'carpeta' ? c.id !== moverModal.item.id : true)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setMoverDestino(c.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left font-bold transition-colors ${moverDestino === c.id ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'}`}
              >
                📁 {c.nombre}
              </button>
            ))}
          <button onClick={confirmarMover} className="btn-primary justify-center mt-2">
            Mover aquí
          </button>
        </div>
      </Modal>

      <FilePreview
        open={!!preview}
        onClose={() => setPreview(null)}
        url={preview?.url}
        nombre={preview?.nombre}
        mime={preview?.mime}
      />
    </div>
  )
}

// ─── Vista Grid ────────────────────────────────────────────────
function GridView({ carpetas, archivos, onEntrar, onPreview, onEditarCarpeta, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, profile, papelera }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {carpetas.map((c) => (
        <CarpetaCard
          key={c.id}
          carpeta={c}
          onEntrar={onEntrar}
          onEditar={onEditarCarpeta}
          onEliminar={onEliminar}
          onMover={onMover}
          onRestaurar={onRestaurar}
          onEliminarDefinitivo={onEliminarDefinitivo}
          profile={profile}
          papelera={papelera}
        />
      ))}
      {archivos.map((a) => (
        <ArchivoCard
          key={a.id}
          archivo={a}
          onPreview={onPreview}
          onEliminar={onEliminar}
          onRenombrar={onRenombrar}
          onMover={onMover}
          onRestaurar={onRestaurar}
          onEliminarDefinitivo={onEliminarDefinitivo}
          profile={profile}
          papelera={papelera}
        />
      ))}
    </div>
  )
}

function CarpetaCard({ carpeta, onEntrar, onEditar, onEliminar, onMover, onRestaurar, onEliminarDefinitivo, profile, papelera }) {
  const [menu, setMenu] = useState(false)
  return (
    <div className={`card-link relative flex flex-col items-center gap-2 !p-4 text-center ${papelera ? 'opacity-60' : ''}`} onClick={() => onEntrar?.(carpeta)}>
      <span className="text-5xl">📁</span>
      <p className="w-full truncate text-sm font-bold">{carpeta.nombre}</p>
      <p className="text-[10px] text-ink/30">{papelera ? `Eliminado ${formatFecha(carpeta.eliminado_at)}` : carpeta.creador?.nombre_completo}</p>
      {papelera ? (
        <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onRestaurar?.('carpeta', carpeta)} className="rounded-lg bg-grass-50 px-2.5 py-1 text-xs font-bold text-grass-700 hover:bg-grass-100">♻️ Restaurar</button>
          {['admin', 'coordinador'].includes(profile.role) && (
            <button onClick={() => onEliminarDefinitivo?.('carpeta', carpeta)} className="rounded-lg bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-700 hover:bg-coral-100">🗑️ Borrar</button>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setMenu(!menu) }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-ink/30 hover:bg-ink/5 hover:text-ink/60"
            aria-label="Opciones"
          >
            ⋮
          </button>
          {menu && (
            <div className="absolute right-2 top-9 z-10 flex flex-col rounded-xl bg-white py-1 shadow-soft border border-ink/10" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setMenu(false); onEditar(carpeta) }} className="px-4 py-2 text-left text-sm font-bold hover:bg-ink/5">✏️ Renombrar</button>
              <button onClick={() => { setMenu(false); onMover(carpeta, 'carpeta') }} className="px-4 py-2 text-left text-sm font-bold hover:bg-ink/5">📦 Mover</button>
              {['admin', 'coordinador'].includes(profile.role) && (
                <button onClick={() => { setMenu(false); onEliminar('carpeta', carpeta) }} className="px-4 py-2 text-left text-sm font-bold text-coral-600 hover:bg-coral-50">🗑️ Eliminar</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ArchivoCard({ archivo, onPreview, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, profile, papelera }) {
  const [menu, setMenu] = useState(false)
  const tipo = getFileType(archivo.nombre, archivo.tipo)
  const esImagen = tipo === 'imagen'
  const url = fileUrl(archivo.storage_path)

  return (
    <div className={`card-link relative flex flex-col items-center gap-2 !p-3 text-center ${papelera ? 'opacity-60' : ''}`} onClick={() => onPreview(archivo)}>
      {esImagen ? (
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-ink/5">
          <img src={url} alt={archivo.nombre} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : (
        <span className="text-5xl py-3">{getFileIcon(archivo.nombre, archivo.tipo)}</span>
      )}
      <p className="w-full truncate text-xs font-bold">{archivo.nombre}</p>
      <p className="text-[10px] text-ink/30">{papelera ? `Eliminado ${formatFecha(archivo.eliminado_at)}` : formatBytes(archivo.tamano)}</p>
      {papelera ? (
        <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onRestaurar?.('archivo', archivo)} className="rounded-lg bg-grass-50 px-2.5 py-1 text-xs font-bold text-grass-700 hover:bg-grass-100">♻️ Restaurar</button>
          {['admin', 'coordinador'].includes(profile.role) && (
            <button onClick={() => onEliminarDefinitivo?.('archivo', archivo)} className="rounded-lg bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-700 hover:bg-coral-100">🗑️ Borrar</button>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setMenu(!menu) }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-ink/30 hover:bg-ink/5 hover:text-ink/60"
            aria-label="Opciones"
          >
            ⋮
          </button>
          {menu && (
            <div className="absolute right-2 top-9 z-10 flex flex-col rounded-xl bg-white py-1 shadow-soft border border-ink/10" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setMenu(false); onRenombrar(archivo) }} className="px-4 py-2 text-left text-sm font-bold hover:bg-ink/5">✏️ Renombrar</button>
              <button onClick={() => { setMenu(false); onMover(archivo, 'archivo') }} className="px-4 py-2 text-left text-sm font-bold hover:bg-ink/5">📦 Mover</button>
              <a href={url} target="_blank" rel="noreferrer" onClick={() => setMenu(false)} className="px-4 py-2 text-left text-sm font-bold hover:bg-ink/5">⬇️ Descargar</a>
              {['admin', 'coordinador'].includes(profile.role) && (
                <button onClick={() => { setMenu(false); onEliminar('archivo', archivo) }} className="px-4 py-2 text-left text-sm font-bold text-coral-600 hover:bg-coral-50">🗑️ Eliminar</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Vista Lista (detallada) ───────────────────────────────────
function ListaView({ carpetas, archivos, onEntrar, onPreview, onEditarCarpeta, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, profile, papelera }) {
  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full text-left">
        <thead className="bg-sky-50 text-xs font-bold uppercase text-ink/40">
          <tr>
            <th className="px-3 py-2.5 sm:px-4">Nombre</th>
            <th className="px-3 py-2.5 sm:px-4 hidden sm:table-cell">{papelera ? 'Eliminado' : 'Tipo'}</th>
            <th className="px-3 py-2.5 sm:px-4 hidden sm:table-cell">Tamaño</th>
            <th className="px-3 py-2.5 sm:px-4 hidden md:table-cell">Subido por</th>
            <th className="px-3 py-2.5 sm:px-4 hidden md:table-cell">Fecha</th>
            <th className="px-3 py-2.5 sm:px-4 w-24">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {carpetas.map((c) => (
            <tr key={`c-${c.id}`} className={`border-t border-ink/5 hover:bg-sky-50/50 ${papelera ? 'opacity-60' : 'cursor-pointer'}`} onClick={() => onEntrar?.(c)}>
              <td className="px-3 py-2.5 sm:px-4">
                <span className="flex items-center gap-2">
                  <span className="text-2xl">📁</span>
                  <span className="font-bold">{c.nombre}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden sm:table-cell">{papelera ? formatFecha(c.eliminado_at) : 'Carpeta'}</td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden sm:table-cell">—</td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden md:table-cell">{c.creador?.nombre_completo || '—'}</td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden md:table-cell">{formatFecha(c.created_at)}</td>
              <td className="px-3 py-2.5 sm:px-4" onClick={(e) => e.stopPropagation()}>
                {papelera ? (
                  <div className="flex gap-1">
                    <button onClick={() => onRestaurar?.('carpeta', c)} className="rounded-lg bg-grass-50 px-2 py-1 text-xs font-bold text-grass-700 hover:bg-grass-100">♻️</button>
                    {['admin', 'coordinador'].includes(profile.role) && (
                      <button onClick={() => onEliminarDefinitivo?.('carpeta', c)} className="rounded-lg bg-coral-50 px-2 py-1 text-xs font-bold text-coral-700 hover:bg-coral-100">🗑️</button>
                    )}
                  </div>
                ) : (
                  <AccionesDropdown
                    items={[
                      { label: '✏️ Renombrar', action: () => onEditarCarpeta(c) },
                      { label: '📦 Mover', action: () => onMover(c, 'carpeta') },
                      ...(['admin', 'coordinador'].includes(profile.role) ? [{ label: '🗑️ Eliminar', action: () => onEliminar('carpeta', c), danger: true }] : []),
                    ]}
                  />
                )}
              </td>
            </tr>
          ))}
          {archivos.map((a) => (
            <tr key={`a-${a.id}`} className={`border-t border-ink/5 hover:bg-sky-50/50 ${papelera ? 'opacity-60' : 'cursor-pointer'}`} onClick={() => onPreview(a)}>
              <td className="px-3 py-2.5 sm:px-4">
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{getFileIcon(a.nombre, a.tipo)}</span>
                  <span className="font-bold truncate max-w-[200px] sm:max-w-none">{a.nombre}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden sm:table-cell">{papelera ? formatFecha(a.eliminado_at) : (a.tipo?.split('/')[1] || '—')}</td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden sm:table-cell">{formatBytes(a.tamano)}</td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden md:table-cell">{a.subidor?.nombre_completo || '—'}</td>
              <td className="px-3 py-2.5 sm:px-4 text-sm text-ink/40 hidden md:table-cell">{formatFecha(a.created_at)}</td>
              <td className="px-3 py-2.5 sm:px-4" onClick={(e) => e.stopPropagation()}>
                {papelera ? (
                  <div className="flex gap-1">
                    <button onClick={() => onRestaurar?.('archivo', a)} className="rounded-lg bg-grass-50 px-2 py-1 text-xs font-bold text-grass-700 hover:bg-grass-100">♻️</button>
                    {['admin', 'coordinador'].includes(profile.role) && (
                      <button onClick={() => onEliminarDefinitivo?.('archivo', a)} className="rounded-lg bg-coral-50 px-2 py-1 text-xs font-bold text-coral-700 hover:bg-coral-100">🗑️</button>
                    )}
                  </div>
                ) : (
                  <AccionesDropdown
                    items={[
                      { label: '👁️ Ver', action: () => onPreview(a) },
                      { label: '✏️ Renombrar', action: () => onRenombrar(a) },
                      { label: '📦 Mover', action: () => onMover(a, 'archivo') },
                      ...(['admin', 'coordinador'].includes(profile.role) ? [{ label: '🗑️ Eliminar', action: () => onEliminar('archivo', a), danger: true }] : []),
                    ]}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {carpetas.length === 0 && archivos.length === 0 && (
        <p className="px-4 py-8 text-center text-ink/40">{papelera ? 'La papelera está vacía' : 'Carpeta vacía'}</p>
      )}
    </div>
  )
}

// ─── Vista Compacta ────────────────────────────────────────────
function CompactaView({ carpetas, archivos, onEntrar, onPreview, onEditarCarpeta, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, profile, papelera }) {
  return (
    <div className="card !p-2 flex flex-col divide-y divide-ink/5">
      {carpetas.map((c) => (
        <div key={`c-${c.id}`} onClick={() => onEntrar?.(c)} className={`flex items-center gap-2 px-3 py-2 text-left hover:bg-sky-50/50 rounded-lg group ${papelera ? 'opacity-60' : 'cursor-pointer'}`}>
          <span className="text-lg">📁</span>
          <span className="flex-1 truncate text-sm font-bold">{c.nombre}</span>
          {papelera ? (
            <span className="text-xs text-ink/30 hidden sm:inline">{formatFecha(c.eliminado_at)}</span>
          ) : (
            <span className="text-xs text-ink/30 hidden sm:inline">{formatFecha(c.created_at)}</span>
          )}
          {papelera ? (
            <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onRestaurar?.('carpeta', c)} className="rounded-lg bg-grass-50 px-2 py-1 text-xs font-bold text-grass-700 hover:bg-grass-100">♻️</button>
              {['admin', 'coordinador'].includes(profile.role) && (
                <button onClick={() => onEliminarDefinitivo?.('carpeta', c)} className="rounded-lg bg-coral-50 px-2 py-1 text-xs font-bold text-coral-700 hover:bg-coral-100">🗑️</button>
              )}
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onEditarCarpeta(c)} className="text-xs text-sky-500 hover:underline">✏️</button>
              <button onClick={() => onMover(c, 'carpeta')} className="text-xs text-sky-500 hover:underline">📦</button>
              {['admin', 'coordinador'].includes(profile.role) && (
                <button onClick={() => onEliminar('carpeta', c)} className="text-xs text-coral-500 hover:underline">🗑️</button>
              )}
            </span>
          )}
        </div>
      ))}
      {archivos.map((a) => (
        <div key={`a-${a.id}`} onClick={() => onPreview(a)} className={`flex items-center gap-2 px-3 py-2 text-left hover:bg-sky-50/50 rounded-lg group ${papelera ? 'opacity-60' : 'cursor-pointer'}`}>
          <span className="text-lg">{getFileIcon(a.nombre, a.tipo)}</span>
          <span className="flex-1 truncate text-sm font-bold">{a.nombre}</span>
          {papelera ? (
            <span className="text-xs text-ink/30 hidden sm:inline">{formatFecha(a.eliminado_at)}</span>
          ) : (
            <>
              <span className="text-xs text-ink/30 hidden sm:inline">{formatBytes(a.tamano)}</span>
              <span className="text-xs text-ink/30 hidden md:inline ml-2">{formatFecha(a.created_at)}</span>
            </>
          )}
          {papelera ? (
            <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onRestaurar?.('archivo', a)} className="rounded-lg bg-grass-50 px-2 py-1 text-xs font-bold text-grass-700 hover:bg-grass-100">♻️</button>
              {['admin', 'coordinador'].includes(profile.role) && (
                <button onClick={() => onEliminarDefinitivo?.('archivo', a)} className="rounded-lg bg-coral-50 px-2 py-1 text-xs font-bold text-coral-700 hover:bg-coral-100">🗑️</button>
              )}
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onRenombrar(a)} className="text-xs text-sky-500 hover:underline">✏️</button>
              <button onClick={() => onMover(a, 'archivo')} className="text-xs text-sky-500 hover:underline">📦</button>
              {['admin', 'coordinador'].includes(profile.role) && (
                <button onClick={() => onEliminar('archivo', a)} className="text-xs text-coral-500 hover:underline">🗑️</button>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Dropdown de acciones (para vista lista) ───────────────────
function AccionesDropdown({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink/30 hover:bg-ink/5 hover:text-ink/60"
        aria-label="Opciones"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 flex flex-col rounded-xl bg-white py-1 shadow-soft border border-ink/10 min-w-[140px]">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); item.action() }}
              className={`px-4 py-2 text-left text-sm font-bold hover:bg-ink/5 ${item.danger ? 'text-coral-600 hover:bg-coral-50' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
