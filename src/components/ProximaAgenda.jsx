import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Widget de "qué viene": próximos eventos de agenda + tareas recientes.
 * - nivelIds: undefined/null = sin filtrar (admin/coordinador ve de todas las clases).
 *   Un array (incluso vacío) filtra agenda/tareas a esas clases + eventos generales.
 * - soloTareasPendientes: si es true (uso del padre), en vez de listar todas las
 *   tareas recientes del nivel, solo muestra las que sus propios hijos (hijoIds)
 *   todavía no han entregado.
 * - hijoIds: requerido cuando soloTareasPendientes es true.
 */
export default function ProximaAgenda({ nivelIds, soloTareasPendientes = false, hijoIds = [] }) {
  const [eventos, setEventos] = useState(null)
  const [tareas, setTareas] = useState(null)

  useEffect(() => {
    let cancelado = false
    const hoy = hoyISO()
    const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    async function load() {
      if (nivelIds && nivelIds.length === 0) {
        if (!cancelado) {
          setEventos([])
          setTareas([])
        }
        return
      }

      let agendaQuery = supabase
        .from('agenda')
        .select('id, titulo, fecha, nivel:niveles(nombre)')
        .gte('fecha', hoy)
        .order('fecha')
        .limit(5)
      if (nivelIds) agendaQuery = agendaQuery.or(`nivel_id.is.null,nivel_id.in.(${nivelIds.join(',')})`)
      const { data: ag } = await agendaQuery

      let tareasData = []
      if (soloTareasPendientes) {
        if (hijoIds.length > 0) {
          let tq = supabase
            .from('actividades')
            .select('id, titulo, fecha, nivel_id, nivel:niveles(nombre)')
            .eq('es_tarea', true)
            .gte('fecha', hace7)
          if (nivelIds) tq = tq.in('nivel_id', nivelIds)
          const { data: tareasNivel } = await tq
          const { data: entregas } = await supabase
            .from('tarea_entregas')
            .select('actividad_id, nino_id, estado')
            .in('nino_id', hijoIds)
          const entregasSet = new Set(
            (entregas || []).filter((e) => e.estado === 'entregada').map((e) => `${e.actividad_id}_${e.nino_id}`),
          )
          tareasData = (tareasNivel || []).filter((t) => !hijoIds.every((hid) => entregasSet.has(`${t.id}_${hid}`)))
        }
      } else {
        let tq = supabase
          .from('actividades')
          .select('id, titulo, fecha, nivel:niveles(nombre)')
          .eq('es_tarea', true)
          .gte('fecha', hace7)
          .order('fecha', { ascending: false })
          .limit(5)
        if (nivelIds) tq = tq.in('nivel_id', nivelIds)
        const { data } = await tq
        tareasData = data || []
      }

      if (!cancelado) {
        setEventos(ag || [])
        setTareas(tareasData)
      }
    }
    load()
    return () => {
      cancelado = true
    }
  }, [nivelIds?.join(','), soloTareasPendientes, hijoIds.join(',')])

  if (eventos === null || tareas === null) return null

  const items = [
    ...eventos.map((e) => ({ tipo: 'evento', fecha: e.fecha, titulo: e.titulo, nivel: e.nivel?.nombre })),
    ...tareas.map((t) => ({ tipo: 'tarea', fecha: t.fecha, titulo: t.titulo, nivel: t.nivel?.nombre })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (items.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">📅 Agenda y tareas</p>
        <Link to="/agenda" className="text-sm font-bold text-sky-500 hover:underline">
          Ver agenda →
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {items.slice(0, 6).map((it, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-ink/5 px-3 py-2">
            <span className="text-lg" aria-hidden="true">
              {it.tipo === 'evento' ? '📅' : '📝'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{it.titulo}</p>
              <p className="text-xs text-ink/40">
                {it.fecha}
                {it.nivel ? ` · ${it.nivel}` : ''}
                {it.tipo === 'tarea' && soloTareasPendientes ? ' · pendiente' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
