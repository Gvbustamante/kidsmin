import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useMisHijos } from '../lib/useMisHijos'
import { useMisClases } from '../lib/useMisClases'
import Spinner from '../components/Spinner'
import RichTextView from '../components/RichTextView'
import ReaccionesBar from '../components/ReaccionesBar'
import TareaEntregas from '../components/TareaEntregas'
import TareaHijoWidget from '../components/TareaHijoWidget'
import MiEntregaEquipoWidget from '../components/MiEntregaEquipoWidget'
import FilePreview, { getFileIcon } from '../components/FilePreview'
import { getVideoEmbedUrl } from '../lib/videoEmbed'

const STAFF = ['admin', 'coordinador']

function esFoto(f) {
  return f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
}

function esVideo(f) {
  return f.tipo?.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(f.nombre_archivo || '')
}

function fileUrl(path, bucket = 'actividades') {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function formatMes(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es', { month: 'long', year: 'numeric' })
}

export default function ActividadDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [actividad, setActividad] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)
  const [otrasDelMes, setOtrasDelMes] = useState(null)
  const [prevNext, setPrevNext] = useState({ prev: null, next: null })
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('actividades')
      .select('*, nivel:niveles(nombre), actividad_archivos(*), actividad_reacciones(*)')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      setNotFound(true)
      return
    }
    setActividad(data)
  }, [id])

  useEffect(() => { load() }, [load])

  // Cargar otras actividades del mismo mes
  useEffect(() => {
    if (!actividad?.fecha) return
    setOtrasDelMes(null)
    const [year, month] = actividad.fecha.split('-')
    const inicioMes = `${year}-${month}-01`
    const finMes = `${year}-${month}-31`
    supabase
      .from('actividades')
      .select('id, titulo, fecha, actividad_archivos(storage_path, tipo, nombre_archivo, bucket)')
      .neq('id', id)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .limit(8)
      .then(({ data }) => setOtrasDelMes(data || []))
  }, [id, actividad?.fecha])

  // Cargar anterior y siguiente
  useEffect(() => {
    if (!actividad?.fecha) return
    setPrevNext({ prev: null, next: null })
    Promise.all([
      supabase
        .from('actividades')
        .select('id, titulo')
        .lte('fecha', actividad.fecha)
        .neq('id', actividad.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('actividades')
        .select('id, titulo')
        .gte('fecha', actividad.fecha)
        .neq('id', actividad.id)
        .order('fecha', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data: prev }, { data: next }]) => {
      setPrevNext({ prev: prev || null, next: next || null })
    })
  }, [actividad?.id, actividad?.fecha])

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb navigate={navigate} />
        <p className="card text-ink/50">No se encontró esta actividad, o no tienes acceso a ella.</p>
      </div>
    )
  }
  if (!actividad) return <Spinner />

  const archivos = actividad.actividad_archivos || []
  const video = archivos.find(esVideo)
  const fotos = archivos.filter(esFoto)
  const heroAdjunto = !video && !actividad.imagen_url ? fotos[0] : null
  const heroUrl = actividad.imagen_url || (heroAdjunto ? fileUrl(heroAdjunto.storage_path, heroAdjunto.bucket) : null)
  const restoFotos = actividad.imagen_url ? fotos : video ? fotos : fotos.slice(1)
  const adjuntos = archivos.filter((f) => !esFoto(f) && !esVideo(f))

  return (
    <div className="flex flex-col gap-6">
      {/* ═══ Breadcrumb ═══ */}
      <Breadcrumb navigate={navigate} titulo={actividad.titulo} />

      {/* ═══ Contenido principal ═══ */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Columna izquierda: video/hero + contenido */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Video player o hero image */}
          {video && (
            <div className="overflow-hidden rounded-2xl bg-ink shadow-soft">
              <video
                src={fileUrl(video.storage_path, video.bucket)}
                controls
                poster={fotos[0] ? fileUrl(fotos[0].storage_path, fotos[0].bucket) : undefined}
                className="aspect-video w-full"
                controlsList="nodownload"
              >
                Tu navegador no soporta la reproducción de video.
              </video>
            </div>
          )}

          {!video && heroUrl && (
            <div className="overflow-hidden rounded-2xl shadow-soft">
              <img
                src={heroUrl}
                alt={actividad.titulo}
                className="w-full max-h-[420px] object-cover cursor-pointer"
                onClick={() => setPreview({ url: heroUrl, nombre: actividad.titulo, mime: 'image/*' })}
              />
            </div>
          )}

          {/* Encabezado */}
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">{actividad.titulo}</h1>
                  {actividad.audiencia === 'docentes' && <span className="badge bg-grape-100 text-grape-700">🍎 Equipo docente</span>}
                  {actividad.visible_padres === false && actividad.audiencia !== 'docentes' && (
                    <span className="badge bg-grape-100 text-grape-700">🙈 Solo equipo</span>
                  )}
                  {actividad.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
                </div>
                {actividad.nivel?.nombre && (
                  <p className="mt-1 text-sm font-bold uppercase text-sky-500">{actividad.nivel.nombre}</p>
                )}
              </div>
              <span className="rounded-xl bg-ink/5 px-3 py-1 text-sm font-bold text-ink/50">{actividad.fecha}</span>
            </div>

            {/* Contenido */}
            <div className="border-t border-ink/5 pt-4">
              <RichTextView html={actividad.descripcion} />
            </div>

            {/* Versículo / historia */}
            {(actividad.versiculo_clave || actividad.historia_biblica) && (
              <div className="mt-4 rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-4">
                {actividad.versiculo_clave && (
                  <p className="text-base italic text-ink/80">📖 &ldquo;{actividad.versiculo_clave}&rdquo;</p>
                )}
                {actividad.historia_biblica && (
                  <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {actividad.historia_biblica}</p>
                )}
              </div>
            )}

            {/* Enlace externo — embeber si es YouTube/Vimeo */}
            {actividad.enlace_externo && (
              getVideoEmbedUrl(actividad.enlace_externo) ? (
                <div className="mt-4 overflow-hidden rounded-2xl bg-ink shadow-soft">
                  <iframe
                    src={getVideoEmbedUrl(actividad.enlace_externo)}
                    title="Video"
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={actividad.enlace_externo}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block w-fit rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-600 transition-colors hover:bg-sky-100"
                >
                  🔗 Abrir enlace externo
                </a>
              )
            )}
          </div>

          {/* Galería de fotos */}
          {restoFotos.length > 0 && (
            <div className="card">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">📸 Galería de fotos</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {restoFotos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreview({
                      url: fileUrl(f.storage_path, f.bucket),
                      nombre: f.nombre_archivo,
                      mime: f.tipo,
                    })}
                    className="group aspect-square overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    <img
                      src={fileUrl(f.storage_path, f.bucket)}
                      alt={f.nombre_archivo || ''}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Archivos adjuntos */}
          {adjuntos.length > 0 && (
            <div className="card">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">📎 Materiales</p>
              <div className="flex flex-col gap-2">
                {adjuntos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreview({
                      url: fileUrl(f.storage_path, f.bucket),
                      nombre: f.nombre_archivo,
                      mime: f.tipo,
                    })}
                    className="flex items-center gap-3 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="text-2xl">{getFileIcon(f.nombre_archivo, f.tipo)}</span>
                    <span className="min-w-0 flex-1 truncate font-bold text-ink">{f.nombre_archivo || 'Archivo'}</span>
                    <span className="shrink-0 text-sm font-bold text-sky-600">👁️ Ver</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tarea */}
          {actividad.es_tarea && (
            <div className="card">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">📝 Tarea</p>
              <TareaSeccion actividad={actividad} onVerEntregas={() => setTareaModalOpen(true)} onSaved={load} />
            </div>
          )}

          {/* Reacciones */}
          <div className="card">
            {profile.role === 'padre' ? (
              <ReaccionesBar
                tabla="actividad_reacciones"
                columnaId="actividad_id"
                columnaUsuario="padre_id"
                targetId={actividad.id}
                reacciones={actividad.actividad_reacciones}
                onChanged={load}
              />
            ) : (
              <p className="text-sm font-bold text-coral-500">{actividad.actividad_reacciones.length} reacciones ❤️</p>
            )}
          </div>

          {/* ═══ Navegación anterior/siguiente ═══ */}
          {(prevNext.prev || prevNext.next) && (
            <div className="flex items-stretch gap-3">
              {prevNext.prev ? (
                <button
                  onClick={() => navigate(`/actividades/${prevNext.prev.id}`)}
                  className="card flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-sky-50"
                >
                  <span className="text-lg text-ink/30">←</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase text-ink/30">Anterior</p>
                    <p className="truncate text-sm font-bold">{prevNext.prev.titulo}</p>
                  </div>
                </button>
              ) : (
                <div className="flex-1" />
              )}
              {prevNext.next ? (
                <button
                  onClick={() => navigate(`/actividades/${prevNext.next.id}`)}
                  className="card flex min-w-0 flex-1 items-center gap-2 text-right transition-colors hover:bg-sky-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase text-ink/30">Siguiente</p>
                    <p className="truncate text-sm font-bold">{prevNext.next.titulo}</p>
                  </div>
                  <span className="text-lg text-ink/30">→</span>
                </button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          )}
        </div>

        {/* ═══ Sidebar: otras actividades del mes ═══ */}
        <aside className="w-full shrink-0 lg:w-72 xl:w-80">
          <div className="card sticky top-4">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">
              📅 Más de {formatMes(actividad.fecha)}
            </p>
            {otrasDelMes === null ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/5" />
                ))}
              </div>
            ) : otrasDelMes.length === 0 ? (
              <p className="text-sm text-ink/40">No hay otras actividades este mes.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {otrasDelMes.map((a) => {
                  const thumb = (a.actividad_archivos || []).find((f) =>
                    f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.nombre_archivo || '')
                  )
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/actividades/${a.id}`)}
                      className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-sky-50"
                    >
                      {thumb ? (
                        <img
                          src={fileUrl(thumb.storage_path, thumb.bucket)}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xl">🎨</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{a.titulo}</p>
                        <p className="text-xs text-ink/40">{a.fecha}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <TareaEntregas actividad={tareaModalOpen ? actividad : null} open={tareaModalOpen} onClose={() => setTareaModalOpen(false)} />

      {/* Preview modal */}
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

function Breadcrumb({ navigate, titulo }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <button onClick={() => navigate('/actividades')} className="font-bold text-sky-500 hover:underline">
        Actividades
      </button>
      {titulo && (
        <>
          <span className="text-ink/30">›</span>
          <span className="truncate text-ink/50">{titulo}</span>
        </>
      )}
    </nav>
  )
}

function TareaSeccion({ actividad, onVerEntregas, onSaved }) {
  const { user, profile } = useAuth()
  const hijos = useMisHijos()
  const { clases } = useMisClases()
  const [entregasHijos, setEntregasHijos] = useState({})
  const [miEntrega, setMiEntrega] = useState(undefined)

  const cargarEntregasHijos = useCallback(async () => {
    if (!hijos) return
    const hijoIds = hijos.filter((h) => h.nivel_id === actividad.nivel_id).map((h) => h.id)
    if (hijoIds.length === 0) return
    const { data } = await supabase.from('tarea_entregas').select('*').eq('actividad_id', actividad.id).in('nino_id', hijoIds)
    const grouped = {}
    ;(data || []).forEach((row) => {
      grouped[row.nino_id] = row
    })
    setEntregasHijos(grouped)
  }, [hijos, actividad.id, actividad.nivel_id])

  const cargarMiEntrega = useCallback(async () => {
    const { data } = await supabase
      .from('tarea_entregas')
      .select('*')
      .eq('actividad_id', actividad.id)
      .eq('docente_id', user.id)
      .maybeSingle()
    setMiEntrega(data)
  }, [actividad.id, user.id])

  useEffect(() => {
    if (profile.role === 'padre') cargarEntregasHijos()
    if (profile.role === 'docente' && actividad.audiencia === 'docentes') cargarMiEntrega()
  }, [profile.role, actividad.audiencia, cargarEntregasHijos, cargarMiEntrega])

  const esStaff = STAFF.includes(profile.role)
  const esDocenteDeLaClase = profile.role === 'docente' && clases?.some((c) => c.id === actividad.nivel_id)

  if (esStaff || esDocenteDeLaClase) {
    return (
      <button className="btn-secondary self-start !py-2 !px-4 !text-sm" onClick={onVerEntregas}>
        📋 Ver entregas
      </button>
    )
  }

  if (profile.role === 'docente' && actividad.audiencia === 'docentes' && miEntrega !== undefined) {
    return (
      <MiEntregaEquipoWidget
        actividad={actividad}
        entrega={miEntrega}
        onSaved={() => {
          cargarMiEntrega()
          onSaved()
        }}
      />
    )
  }

  if (profile.role === 'padre' && hijos) {
    const hijosDeLaClase = hijos.filter((h) => h.nivel_id === actividad.nivel_id)
    if (hijosDeLaClase.length === 0) return null
    return (
      <div className="flex flex-col gap-2">
        {hijosDeLaClase.map((h) => (
          <TareaHijoWidget
            key={h.id}
            actividad={actividad}
            hijo={h}
            entrega={entregasHijos[h.id]}
            onSaved={() => {
              cargarEntregasHijos()
              onSaved()
            }}
          />
        ))}
      </div>
    )
  }

  return null
}
