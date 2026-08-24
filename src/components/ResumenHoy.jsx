import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * "Hoy en tu escuelita" — todo lo del día en una sola tarjeta: el devocional
 * activo del momento, los eventos de agenda de hoy, y las actividades/tareas
 * de hoy. Si no hay nada de nada, no se muestra (igual que ProximaAgenda).
 * - nivelIds: undefined/null = sin filtrar (admin/coordinador ve de todo).
 *   Un array (incluso vacío) filtra agenda/actividades a esas clases +
 *   eventos generales sin nivel.
 */
export default function ResumenHoy({ nivelIds }) {
  const [devocional, setDevocional] = useState(null)
  const [eventos, setEventos] = useState(null)
  const [actividades, setActividades] = useState(null)

  useEffect(() => {
    let cancelado = false
    const hoy = hoyISO()

    async function load() {
      if (nivelIds && nivelIds.length === 0) {
        if (!cancelado) {
          setEventos([])
          setActividades([])
        }
      } else {
        let agendaQuery = supabase.from('agenda').select('id, titulo, nivel:niveles(nombre)').eq('fecha', hoy)
        if (nivelIds) agendaQuery = agendaQuery.or(`nivel_id.is.null,nivel_id.in.(${nivelIds.join(',')})`)

        let actQuery = supabase.from('actividades').select('id, titulo, es_tarea, nivel:niveles(nombre)').eq('fecha', hoy)
        if (nivelIds) actQuery = actQuery.in('nivel_id', nivelIds)

        const [{ data: ag }, { data: act }] = await Promise.all([agendaQuery, actQuery])
        if (!cancelado) {
          setEventos(ag || [])
          setActividades(act || [])
        }
      }

      const { data: dev } = await supabase.from('devocionales_ninos').select('*').eq('activo', true).maybeSingle()
      if (!cancelado) setDevocional(dev)
    }
    load()
    return () => {
      cancelado = true
    }
  }, [nivelIds?.join(',')])

  if (eventos === null || actividades === null) return null

  const hayAlgo = !!devocional || eventos.length > 0 || actividades.length > 0
  if (!hayAlgo) return null

  return (
    <div className="card">
      <p className="font-bold">🌟 Hoy en tu escuelita</p>

      {devocional && (
        <Link
          to={`/devocionales/${devocional.id}`}
          className="mt-3 flex items-start gap-3 rounded-xl bg-sunshine-50 px-3 py-2.5 transition-colors hover:bg-sunshine-100"
        >
          {devocional.imagen_url ? (
            <img src={devocional.imagen_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sunshine-100 text-2xl">🙏</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sunshine-600">Devocional destacado</p>
            <p className="truncate font-bold">{devocional.titulo}</p>
            {devocional.versiculo && <p className="truncate text-sm italic text-ink/60">📖 "{devocional.versiculo}"</p>}
          </div>
        </Link>
      )}

      {eventos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-grape-600">📅 Eventos de hoy</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {eventos.map((e) => (
              <div key={e.id} className="rounded-xl bg-grape-50 px-3 py-2 text-sm">
                <span className="font-bold">{e.titulo}</span>
                {e.nivel && <span className="text-ink/40"> · {e.nivel.nombre}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {actividades.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-sky-600">🎨 Actividades y tareas de hoy</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {actividades.map((a) => (
              <Link key={a.id} to={`/actividades/${a.id}`} className="block rounded-xl bg-sky-50 px-3 py-2 text-sm transition-colors hover:bg-sky-100">
                <span aria-hidden="true">{a.es_tarea ? '📝' : '🎨'}</span> <span className="font-bold">{a.titulo}</span>
                {a.nivel && <span className="text-ink/40"> · {a.nivel.nombre}</span>}
                {a.es_tarea && <span className="badge ml-2 bg-coral-100 text-coral-700">Tarea</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
