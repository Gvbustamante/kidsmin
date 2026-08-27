import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisHijos } from '../../lib/useMisHijos'
import { coincide } from '../../lib/busqueda'
import Spinner from '../../components/Spinner'
import HijoSelector from '../../components/HijoSelector'
import RichTextView from '../../components/RichTextView'
import TareaHijoWidget from '../../components/TareaHijoWidget'
import { getVideoEmbedUrl } from '../../lib/videoEmbed'

const REACCIONES = ['❤️', '👏', '🙌', '😍']
const TRES_DIAS = 3 * 24 * 60 * 60 * 1000

function fileUrl(path, bucket = 'actividades') {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function esFoto(f) {
  return f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
}

function esNuevo(fecha) {
  if (!fecha) return false
  return Date.now() - new Date(fecha + 'T12:00:00').getTime() < TRES_DIAS
}

function nombreMes(yyyyMM) {
  if (!yyyyMM) return ''
  const [y, m] = yyyyMM.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  const nombre = d.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

function formatFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function agruparPorMes(actividades) {
  const grupos = {}
  actividades.forEach((a) => {
    const mes = a.fecha ? a.fecha.slice(0, 7) : 'sin-fecha'
    if (!grupos[mes]) grupos[mes] = []
    grupos[mes].push(a)
  })
  return Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a))
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export default function PadreActividades() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const hijos = useMisHijos()
  const [actividades, setActividades] = useState(null)
  const [entregas, setEntregas] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const load = useCallback(async () => {
    if (!hijos) return
    const hijosActivos = selectedId ? hijos.filter((h) => h.id === selectedId) : hijos
    const nivelIds = [...new Set(hijosActivos.map((h) => h.nivel_id).filter(Boolean))]
    if (nivelIds.length === 0) {
      setActividades([])
      return
    }
    const { data } = await supabase
      .from('actividades')
      .select('*, nivel:niveles(nombre), actividad_archivos(*), actividad_reacciones(*)')
      .in('nivel_id', nivelIds)
      .lte('fecha', new Date().toISOString().slice(0, 10))
      .order('fecha', { ascending: false })
    setActividades(data || [])

    const tareaIds = (data || []).filter((a) => a.es_tarea).map((a) => a.id)
    const hijoIds = hijos.map((h) => h.id)
    if (tareaIds.length > 0 && hijoIds.length > 0) {
      const { data: e } = await supabase
        .from('tarea_entregas')
        .select('*')
        .in('actividad_id', tareaIds)
        .in('nino_id', hijoIds)
      const grouped = {}
      ;(e || []).forEach((row) => {
        grouped[`${row.actividad_id}_${row.nino_id}`] = row
      })
      setEntregas(grouped)
    } else {
      setEntregas({})
    }
  }, [hijos, selectedId])

  useEffect(() => {
    load()
  }, [load])

  async function reaccionar(actividadId, tipo) {
    const actividad = actividades.find((a) => a.id === actividadId)
    const mia = actividad.actividad_reacciones.find((r) => r.padre_id === user.id)
    if (mia && mia.tipo === tipo) {
      await supabase.from('actividad_reacciones').delete().eq('actividad_id', actividadId).eq('padre_id', user.id)
    } else {
      await supabase.from('actividad_reacciones').upsert(
        { actividad_id: actividadId, padre_id: user.id, tipo },
        { onConflict: 'actividad_id,padre_id' },
      )
    }
    load()
  }

  if (!hijos || !actividades) return <Spinner />

  const hijosParaTarea = (nivelId) => (selectedId ? hijos.filter((h) => h.id === selectedId) : hijos).filter((h) => h.nivel_id === nivelId)
  const actividadesFiltradas = actividades.filter((a) =>
    coincide(busqueda, a.titulo, a.descripcion, a.versiculo_clave, a.historia_biblica, a.nivel?.nombre),
  )
  const porMes = agruparPorMes(actividadesFiltradas)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Actividades 🎨</h1>
        <p className="text-ink/50">Lo que hicieron en la escuelita</p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedId} onChange={setSelectedId} />

      {/* Búsqueda con ícono */}
      <div className="relative max-w-xs">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/30">🔍</span>
        <input
          className="input w-full !pl-9"
          placeholder="Buscar actividad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Listado agrupado por mes */}
      <div className="flex flex-col gap-6">
        {porMes.map(([mesKey, acts]) => (
          <div key={mesKey}>
            {/* Separador de mes */}
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-extrabold uppercase tracking-wide text-ink/30">
                📅 {nombreMes(mesKey)}
              </span>
              <div className="h-px flex-1 bg-ink/10" />
              <span className="text-xs text-ink/30">{acts.length}</span>
            </div>

            <div className="flex flex-col gap-4">
              {acts.map((a, i) => {
                const mia = a.actividad_reacciones.find((r) => r.padre_id === user.id)
                const archivos = a.actividad_archivos || []
                const fotos = archivos.filter(esFoto)
                const otros = archivos.filter((f) => !esFoto(f))
                const heroFoto = fotos[0]
                const desc = stripHtml(a.descripcion)
                const nuevo = esNuevo(a.fecha)

                return (
                  <div
                    key={a.id}
                    className="card animate-pop-in overflow-hidden !p-0 transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                  >
                    {/* Hero image */}
                    {heroFoto && (
                      <div
                        className="relative h-44 cursor-pointer overflow-hidden sm:h-52"
                        onClick={() => navigate(`/actividades/${a.id}`)}
                      >
                        <img
                          src={fileUrl(heroFoto.storage_path, heroFoto.bucket)}
                          alt={a.titulo}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
                        {/* Badges sobre la imagen */}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          {nuevo && <span className="badge bg-grass-400 text-white shadow-sm">✨ Nuevo</span>}
                          {a.es_tarea && <span className="badge bg-sky-400/90 text-white shadow-sm">📝 Tarea</span>}
                        </div>
                        {/* File counts */}
                        {(fotos.length > 1 || otros.length > 0) && (
                          <div className="absolute right-3 top-3 flex gap-1.5">
                            {fotos.length > 1 && (
                              <span className="rounded-full bg-ink/50 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                                📸 {fotos.length}
                              </span>
                            )}
                            {otros.length > 0 && (
                              <span className="rounded-full bg-ink/50 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                                📎 {otros.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 p-4">
                      {/* Encabezado */}
                      <div className="flex items-start justify-between cursor-pointer" onClick={() => navigate(`/actividades/${a.id}`)}>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold hover:text-sky-600">{a.titulo}</h3>
                            {!heroFoto && nuevo && <span className="badge bg-grass-100 text-grass-700">✨ Nuevo</span>}
                            {!heroFoto && a.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
                          </div>
                          <p className="text-xs font-bold uppercase text-sky-500">{a.nivel?.nombre}</p>
                        </div>
                        <span className="shrink-0 text-xs text-ink/40">{formatFecha(a.fecha)}</span>
                      </div>

                      {/* Descripción truncada */}
                      {desc && (
                        <p className="text-sm text-ink/60" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {desc}
                        </p>
                      )}

                      {/* Versículo / historia */}
                      {(a.versiculo_clave || a.historia_biblica) && (
                        <div className="rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-3">
                          {a.versiculo_clave && <p className="text-sm italic text-ink/80">📖 &ldquo;{a.versiculo_clave}&rdquo;</p>}
                          {a.historia_biblica && <p className="mt-1 text-xs font-bold text-sunshine-700">Historia: {a.historia_biblica}</p>}
                        </div>
                      )}

                      {/* Video embebido */}
                      {a.enlace_externo && (
                        getVideoEmbedUrl(a.enlace_externo) ? (
                          <div className="overflow-hidden rounded-2xl bg-ink shadow-soft">
                            <iframe
                              src={getVideoEmbedUrl(a.enlace_externo)}
                              title="Video"
                              className="aspect-video w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <a
                            href={a.enlace_externo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block w-fit rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
                          >
                            🔗 Abrir enlace
                          </a>
                        )
                      )}

                      {/* Contadores de archivos (solo si no hay hero, ya que si hay hero se muestran ahí) */}
                      {!heroFoto && (fotos.length > 0 || otros.length > 0) && (
                        <div className="flex gap-2 text-xs text-ink/40">
                          {fotos.length > 0 && <span>📸 {fotos.length} foto{fotos.length !== 1 ? 's' : ''}</span>}
                          {otros.length > 0 && <span>📎 {otros.length} archivo{otros.length !== 1 ? 's' : ''}</span>}
                        </div>
                      )}

                      {/* Tarea widget */}
                      {a.es_tarea && (
                        <div className="flex flex-col gap-2">
                          {hijosParaTarea(a.nivel_id).map((h) => (
                            <TareaHijoWidget key={h.id} actividad={a} hijo={h} entrega={entregas[`${a.id}_${h.id}`]} onSaved={load} />
                          ))}
                        </div>
                      )}

                      {/* Reacciones compactas */}
                      <div className="flex items-center gap-1.5 border-t border-ink/5 pt-3">
                        {REACCIONES.map((r) => (
                          <button
                            key={r}
                            onClick={() => reaccionar(a.id, r)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all duration-150 active:scale-90 ${
                              mia?.tipo === r ? 'bg-coral-100 ring-2 ring-coral-400 scale-110' : 'bg-ink/5 hover:scale-105 hover:bg-ink/10'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                        <button
                          onClick={() => navigate(`/actividades/${a.id}`)}
                          className="ml-auto text-xs font-bold text-ink/40 hover:text-sky-600"
                        >
                          {a.actividad_reacciones.length} reacciones · Ver →
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Empty states */}
        {actividades.length === 0 && (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-6xl">🎨</span>
            <p className="text-lg font-bold text-ink/50">Aún no hay actividades publicadas</p>
            <p className="text-sm text-ink/30">Cuando el equipo publique actividades, las verás aquí</p>
          </div>
        )}
        {actividades.length > 0 && actividadesFiltradas.length === 0 && (
          <div className="card flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-ink/50">No hay actividades que coincidan con &ldquo;{busqueda}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  )
}
