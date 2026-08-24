import { useMemo, useState } from 'react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function CalendarioAgenda({ eventos, onSelectDay, selectedDay }) {
  const [cursor, setCursor] = useState(() => {
    const hoy = new Date()
    return { year: hoy.getFullYear(), month: hoy.getMonth() }
  })

  const eventosPorDia = useMemo(() => {
    const map = {}
    for (const ev of eventos) {
      map[ev.fecha] = map[ev.fecha] || []
      map[ev.fecha].push(ev)
    }
    return map
  }, [eventos])

  const { year, month } = cursor
  const primerDia = new Date(year, month, 1).getDay()
  const diasEnMes = new Date(year, month + 1, 0).getDate()
  const hoyISO = toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
          className="rounded-full px-3 py-1 text-xl font-bold text-ink/40 hover:bg-ink/5"
        >
          ‹
        </button>
        <h3 className="text-lg font-bold">
          {MESES[month]} {year}
        </h3>
        <button
          onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
          className="rounded-full px-3 py-1 text-xl font-bold text-ink/40 hover:bg-ink/5"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS.map((d, i) => (
          <div key={i} className="pb-2 text-xs font-extrabold uppercase text-ink/40">
            {d}
          </div>
        ))}
        {celdas.map((d, i) => {
          if (d === null) return <div key={i} />
          const iso = toISO(year, month, d)
          const evs = eventosPorDia[iso] || []
          const esHoy = iso === hoyISO
          const seleccionado = iso === selectedDay
          return (
            <button
              key={i}
              onClick={() => onSelectDay(evs.length ? iso : null)}
              className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded-xl p-1 text-sm font-bold transition-colors
                ${seleccionado ? 'bg-sky-400 text-white' : esHoy ? 'bg-sunshine-100 text-sunshine-700' : 'hover:bg-ink/5'}`}
            >
              <span>{d}</span>
              {evs.length > 0 && (
                <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white' : 'bg-coral-400'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
