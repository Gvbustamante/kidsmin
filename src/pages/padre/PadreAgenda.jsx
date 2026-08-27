import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useMisHijos } from '../../lib/useMisHijos'
import Spinner from '../../components/Spinner'
import HijoSelector from '../../components/HijoSelector'
import CalendarioAgenda from '../../components/CalendarioAgenda'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function PadreAgenda() {
  const hijos = useMisHijos()
  const [eventos, setEventos] = useState(null)
  const [selectedHijoId, setSelectedHijoId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const load = useCallback(async () => {
    if (!hijos) return
    const hijosActivos = selectedHijoId ? hijos.filter((h) => h.id === selectedHijoId) : hijos
    const nivelIds = [...new Set(hijosActivos.map((h) => h.nivel_id).filter(Boolean))]
    const query = supabase.from('agenda').select('*, nivel:niveles(nombre)').order('fecha')
    const { data } = nivelIds.length
      ? await query.or(`nivel_id.is.null,nivel_id.in.(${nivelIds.join(',')})`)
      : await query.is('nivel_id', null)
    setEventos(data || [])
  }, [hijos, selectedHijoId])

  useEffect(() => {
    load()
  }, [load])

  if (!hijos || !eventos) return <Spinner />

  const hoy = hoyISO()
  const eventosDelDia = selectedDay ? eventos.filter((e) => e.fecha === selectedDay) : eventos

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Agenda 📅</h1>
        <p className="text-ink/50">Próximos eventos de la escuelita</p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedHijoId} onChange={setSelectedHijoId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CalendarioAgenda eventos={eventos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

        <div className="flex flex-col gap-3">
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="self-start text-sm font-bold text-sky-500 hover:underline">
              ← Ver todos los eventos
            </button>
          )}
          {eventosDelDia.map((ev) => (
            <div key={ev.id} className={`card flex items-center gap-4 ${ev.fecha < hoy ? 'opacity-50' : ''}`}>
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-sunshine-100 text-sunshine-700">
                <span className="text-xs font-bold">{new Date(ev.fecha + 'T00:00').toLocaleDateString('es', { month: 'short' })}</span>
                <span className="text-lg font-bold leading-none">{new Date(ev.fecha + 'T00:00').getDate()}</span>
              </div>
              <div>
                <p className="font-bold">{ev.titulo}</p>
                {ev.nivel?.nombre && <p className="text-xs font-bold uppercase text-sky-500">{ev.nivel.nombre}</p>}
                {ev.descripcion && <p className="text-sm text-ink/50">{ev.descripcion}</p>}
              </div>
            </div>
          ))}
          {eventosDelDia.length === 0 && <p className="card text-ink/50">No hay eventos programados.</p>}
        </div>
      </div>
    </div>
  )
}
