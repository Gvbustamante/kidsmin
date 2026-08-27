import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useMisHijos } from '../lib/useMisHijos'
import Spinner from '../components/Spinner'
import HijoSelector from '../components/HijoSelector'
import { BADGE_CLASSES } from '../lib/colors'

function calcularEdad(fecha) {
  if (!fecha) return null
  const nacimiento = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

function formatFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function iniciales(nombre) {
  if (!nombre) return '?'
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

const COLORES_AVATAR = [
  'bg-sky-400 text-white',
  'bg-coral-400 text-white',
  'bg-grape-400 text-white',
  'bg-sunshine-400 text-white',
  'bg-grass-400 text-white',
]

export default function MiFamilia() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const hijos = useMisHijos()
  const [selectedId, setSelectedId] = useState(null)
  const [datosPorHijo, setDatosPorHijo] = useState({})
  const [devocionalActivo, setDevocionalActivo] = useState(null)
  // Seleccionar el primer hijo automáticamente
  useEffect(() => {
    if (hijos && hijos.length > 0 && !selectedId) {
      setSelectedId(hijos[0].id)
    }
  }, [hijos, selectedId])

  useEffect(() => {
    supabase
      .from('devocionales_ninos')
      .select('id, titulo, versiculo, imagen_url')
      .eq('activo', true)
      .maybeSingle()
      .then(({ data }) => setDevocionalActivo(data))
  }, [])

  useEffect(() => {
    if (!hijos || hijos.length === 0) return
    let cancelado = false

    async function loadAll() {
      const ninoIds = hijos.map((h) => h.id)
      const nivelIds = [...new Set(hijos.map((h) => h.nivel_id).filter(Boolean))]
      const hoy = new Date().toISOString().slice(0, 10)

      const [{ data: allActs }, { data: allNotas }, { data: allAgenda }] = await Promise.all([
        nivelIds.length > 0
          ? supabase
              .from('actividades')
              .select('id, titulo, fecha, nivel_id, actividad_archivos(id)')
              .in('nivel_id', nivelIds)
              .order('fecha', { ascending: false })
          : { data: [] },
        supabase
          .from('progreso_notas')
          .select('*')
          .in('nino_id', ninoIds)
          .order('fecha', { ascending: false }),
        nivelIds.length > 0
          ? supabase
              .from('agenda')
              .select('*')
              .or(`nivel_id.is.null,nivel_id.in.(${nivelIds.join(',')})`)
              .gte('fecha', hoy)
              .order('fecha')
          : { data: [] },
      ])

      const result = {}
      for (const hijo of hijos) {
        result[hijo.id] = {
          actividades: (allActs || []).filter((a) => a.nivel_id === hijo.nivel_id).slice(0, 5),
          notas: (allNotas || []).filter((n) => n.nino_id === hijo.id).slice(0, 5),
          eventos: (allAgenda || []).filter((e) => !e.nivel_id || e.nivel_id === hijo.nivel_id).slice(0, 5),
        }
      }
      if (!cancelado) setDatosPorHijo(result)
    }
    loadAll()
    return () => { cancelado = true }
  }, [hijos])

  if (!hijos) return <Spinner />

  if (hijos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Mi familia 👪</h1>
        <p className="card text-ink/50">
No hay niños registrados todavía.
        </p>
      </div>
    )
  }

  const hijoActivo = hijos.find((h) => h.id === selectedId)

  if (!hijoActivo) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Mi familia 👪</h1>
        <p className="text-ink/50">
          {hijos.length === 1
            ? 'La información de tu hijo/a en la escuelita'
            : `${hijos.length} hijos/as registrados`}
        </p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedId} onChange={setSelectedId} />

      {/* ═══ Detalle del hijo seleccionado ═══ */}
      {(() => {
        const hijo = hijoActivo
        const edad = calcularEdad(hijo.fecha_nacimiento)
        const datos = datosPorHijo[hijo.id]
        const idx = hijos.findIndex((h) => h.id === hijo.id)

            return (
              <div key={hijo.id} className="flex flex-col gap-5">
                {/* Tarjeta principal */}
                <div className="card">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-extrabold ${COLORES_AVATAR[idx % COLORES_AVATAR.length]}`}>
                      {iniciales(hijo.nombre_completo)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold">{hijo.nombre_completo}</h2>
                      <p className="text-sm text-ink/50">
                        {edad !== null ? `${edad} años` : ''}
                        {hijo.parentesco && ` · ${hijo.parentesco}`}
                      </p>
                    </div>
                    {hijo.nivel && (
                      <span className={`badge shrink-0 ${BADGE_CLASSES[hijo.nivel.color] || BADGE_CLASSES.sky}`}>
                        {hijo.nivel.nombre}
                      </span>
                    )}
                  </div>
                  {hijo.alergias && (
                    <p className="mt-3 rounded-xl bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-600">
                      ⚠️ Alergias: {hijo.alergias}
                    </p>
                  )}
                </div>

                {/* Devocional activo */}
                {devocionalActivo && (
                  <div
                    className="card flex cursor-pointer items-center gap-4 !p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
                    onClick={() => navigate(`/devocionales/${devocionalActivo.id}`)}
                  >
                    {devocionalActivo.imagen_url ? (
                      <img
                        src={devocionalActivo.imagen_url}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-grape-50 text-3xl">
                        🙏
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-sunshine-600">⭐ Devocional de hoy</p>
                      <h3 className="truncate text-base font-bold">{devocionalActivo.titulo}</h3>
                      {devocionalActivo.versiculo && (
                        <p className="truncate text-xs italic text-ink/50">📖 &ldquo;{devocionalActivo.versiculo}&rdquo;</p>
                      )}
                    </div>
                    <span className="shrink-0 text-lg text-ink/30">→</span>
                  </div>
                )}

                {/* Paneles de información */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {/* Actividades recientes */}
                  <div className="card">
                    <h3 className="flex items-center gap-2 font-bold">
                      <span className="text-lg">🎨</span> Últimas actividades
                    </h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {(datos?.actividades || []).length > 0 ? (
                        datos.actividades.map((a) => (
                          <div
                            key={a.id}
                            className="flex cursor-pointer items-start gap-2 rounded-xl bg-ink/[0.03] px-3 py-2 transition-colors hover:bg-sky-50"
                            onClick={() => navigate(`/actividades/${a.id}`)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">{a.titulo}</p>
                              <p className="text-xs text-ink/40">{formatFecha(a.fecha)}</p>
                            </div>
                            {a.actividad_archivos?.length > 0 && (
                              <span className="shrink-0 text-xs text-ink/30">📎 {a.actividad_archivos.length}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-ink/40">Sin actividades todavía.</p>
                      )}
                    </div>
                  </div>

                  {/* Progreso */}
                  <div className="card">
                    <h3 className="flex items-center gap-2 font-bold">
                      <span className="text-lg">🌱</span> Progreso reciente
                    </h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {(datos?.notas || []).length > 0 ? (
                        datos.notas.map((n) => (
                          <div key={n.id} className="rounded-xl bg-ink/[0.03] px-3 py-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold">{n.emocion || formatFecha(n.fecha)}</p>
                              {n.emocion && <span className="text-xs text-ink/30">{formatFecha(n.fecha)}</span>}
                            </div>
                            {n.logros && <p className="mt-0.5 text-xs text-ink/60">🌟 {n.logros}</p>}
                            {n.notas && <p className="mt-0.5 text-xs text-ink/40">{n.notas}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-ink/40">Sin notas todavía.</p>
                      )}
                    </div>
                  </div>

                  {/* Próximos eventos */}
                  <div className="card">
                    <h3 className="flex items-center gap-2 font-bold">
                      <span className="text-lg">📅</span> Próximos eventos
                    </h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {(datos?.eventos || []).length > 0 ? (
                        datos.eventos.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 rounded-xl bg-ink/[0.03] px-3 py-2">
                            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                              <span className="text-[10px] font-bold leading-none">
                                {new Date(e.fecha + 'T12:00:00').toLocaleDateString('es', { month: 'short' }).toUpperCase()}
                              </span>
                              <span className="text-sm font-extrabold leading-none">
                                {new Date(e.fecha + 'T12:00:00').getDate()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">{e.titulo}</p>
                              {e.descripcion && <p className="truncate text-xs text-ink/40">{e.descripcion}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-ink/40">No hay eventos próximos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
      })()}
    </div>
  )
}
