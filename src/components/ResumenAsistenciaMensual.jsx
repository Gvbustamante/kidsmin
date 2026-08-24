import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from './Spinner'
import { exportExcel } from '../lib/exportExcel'

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function diasEnMes(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function ResumenAsistenciaMensual({ nivelId, ninos }) {
  const [mes, setMes] = useState(hoyYYYYMM())
  const [registros, setRegistros] = useState(null)

  useEffect(() => {
    if (!nivelId) return
    setRegistros(null)
    const inicio = `${mes}-01`
    const fin = `${mes}-${String(diasEnMes(mes)).padStart(2, '0')}`
    supabase
      .from('asistencia')
      .select('nino_id, fecha, presente')
      .eq('nivel_id', nivelId)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .then(({ data }) => setRegistros(data || []))
  }, [nivelId, mes])

  if (!ninos) return null

  const fechas = registros ? [...new Set(registros.map((r) => r.fecha))].sort() : []
  const mapa = {}
  ;(registros || []).forEach((r) => {
    mapa[r.nino_id] = mapa[r.nino_id] || {}
    mapa[r.nino_id][r.fecha] = r.presente
  })

  function exportar() {
    const filas = ninos.map((n) => {
      const fila = mapa[n.id] || {}
      const total = fechas.filter((f) => fila[f]).length
      return [n.nombre_completo, ...fechas.map((f) => (fila[f] === true ? 'Presente' : fila[f] === false ? 'Ausente' : '')), `${total}/${fechas.length}`]
    })
    exportExcel(`asistencia-${mes}`, ['Niño/a', ...fechas, 'Total'], filas)
  }

  return (
    <div className="card animate-pop-in overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b-2 border-ink/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="font-bold">Asistencia del mes</p>
          <p className="text-xs text-ink/40">Solo se muestran los días en que se tomó asistencia</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" className="input !w-auto !py-2" value={mes} onChange={(e) => setMes(e.target.value)} />
          <button className="btn-secondary !py-2 !text-sm" onClick={exportar} disabled={fechas.length === 0}>
            📊 Exportar
          </button>
        </div>
      </div>

      {!registros ? (
        <div className="p-6">
          <Spinner label="Cargando asistencia..." />
        </div>
      ) : ninos.length === 0 ? (
        <p className="p-6 text-center text-ink/40">No hay niños activos en esta clase.</p>
      ) : fechas.length === 0 ? (
        <p className="p-6 text-center text-ink/40">Todavía no se ha tomado asistencia este mes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-sky-50 text-[0.65rem] font-bold uppercase text-ink/50 sm:text-xs">
              <tr>
                <th className="sticky left-0 z-10 min-w-[6rem] bg-sky-50 px-2 py-2 sm:min-w-0 sm:px-4 sm:py-3">Niño/a</th>
                {fechas.map((f) => {
                  const d = new Date(f + 'T00:00:00')
                  return (
                    <th key={f} className="px-1.5 py-2 text-center sm:px-3 sm:py-3">
                      <div className="text-xs sm:text-sm">{d.getDate()}</div>
                      <div className="font-normal normal-case text-ink/35">{DIAS_SEMANA[d.getDay()]}</div>
                    </th>
                  )
                })}
                <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {ninos.map((n) => {
                const fila = mapa[n.id] || {}
                const total = fechas.filter((f) => fila[f]).length
                return (
                  <tr key={n.id} className="border-t border-ink/5">
                    <td className="sticky left-0 z-10 min-w-[6rem] truncate bg-white px-2 py-2 font-bold sm:min-w-0 sm:px-4 sm:py-3">
                      {n.nombre_completo}
                    </td>
                    {fechas.map((f) => {
                      const v = fila[f]
                      return (
                        <td key={f} className="px-1.5 py-2 text-center text-base sm:px-3 sm:py-3 sm:text-lg">
                          {v === true ? '✅' : v === false ? '❌' : <span className="text-xs text-ink/20 sm:text-sm">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-1.5 py-2 text-center font-bold text-grass-600 sm:px-3 sm:py-3">
                      {total}/{fechas.length}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/10 bg-ink/5 font-bold text-ink/60">
                <td className="sticky left-0 z-10 min-w-[6rem] bg-ink/5 px-2 py-2 sm:min-w-0 sm:px-4 sm:py-3">Presentes</td>
                {fechas.map((f) => (
                  <td key={f} className="px-1.5 py-2 text-center sm:px-3 sm:py-3">
                    {ninos.filter((n) => mapa[n.id]?.[f]).length}
                  </td>
                ))}
                <td className="px-1.5 py-2 sm:px-3 sm:py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
