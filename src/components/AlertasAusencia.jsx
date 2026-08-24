import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from './Spinner'

const UMBRAL_DIAS = 21

function diasDesde(fecha) {
  const hoy = new Date()
  const d = new Date(fecha + 'T00:00:00')
  return Math.floor((hoy - d) / 86400000)
}

export default function AlertasAusencia({ nivelId, ninos }) {
  const [registros, setRegistros] = useState(null)

  useEffect(() => {
    if (!nivelId) return
    setRegistros(null)
    supabase
      .from('asistencia')
      .select('nino_id, fecha')
      .eq('nivel_id', nivelId)
      .eq('presente', true)
      .then(({ data }) => setRegistros(data || []))
  }, [nivelId])

  if (!ninos) return null
  if (!registros) return <Spinner label="Revisando asistencia..." />

  const ultimaPresencia = {}
  registros.forEach((r) => {
    if (!ultimaPresencia[r.nino_id] || r.fecha > ultimaPresencia[r.nino_id]) ultimaPresencia[r.nino_id] = r.fecha
  })

  const alertas = ninos
    .map((n) => {
      const ultima = ultimaPresencia[n.id] || null
      const dias = ultima ? diasDesde(ultima) : null
      return { nino: n, ultima, dias }
    })
    .filter((a) => a.dias === null || a.dias >= UMBRAL_DIAS)
    .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/50">Niños que no vienen hace {UMBRAL_DIAS} días o más (o que nunca han asistido).</p>
      {alertas.length === 0 ? (
        <p className="card text-ink/50">🎉 Todos tus niños han venido recientemente.</p>
      ) : (
        alertas.map(({ nino, ultima, dias }, i) => (
          <div
            key={nino.id}
            className="card animate-pop-in flex items-center justify-between gap-3"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <div>
              <p className="font-bold">{nino.nombre_completo}</p>
              <p className="text-sm text-ink/50">{ultima ? `Última vez: ${ultima}` : 'Nunca ha asistido'}</p>
            </div>
            <span className="badge bg-coral-100 text-coral-700">{dias === null ? 'Sin registro' : `${dias} días`}</span>
          </div>
        ))
      )}
    </div>
  )
}
