import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import ResumenAsistenciaMensual from '../../components/ResumenAsistenciaMensual'
import ProgresoNinoModal from '../../components/ProgresoNinoModal'
import AlertasAusencia from '../../components/AlertasAusencia'
import TomarAsistenciaModal from '../../components/TomarAsistenciaModal'

export default function Asistencia() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [ninos, setNinos] = useState(null)
  const [tab, setTab] = useState('mes')
  const [progresoNino, setProgresoNino] = useState(null)
  const [tomarOpen, setTomarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data: n } = await supabase.from('ninos').select('*').eq('nivel_id', nivelId).eq('activo', true).order('nombre_completo')
    setNinos(n || [])
  }, [nivelId])

  useEffect(() => {
    load()
  }, [load])

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  const nivelActual = clases.find((c) => c.id === nivelId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Asistencia ✅</h1>
          <p className="text-ink/50">La tabla del mes y las ausencias, de un vistazo</p>
        </div>
        <button className="btn-primary" onClick={() => setTomarOpen(true)}>
          + Tomar asistencia
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('mes')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'mes' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Tabla del mes
        </button>
        <button
          onClick={() => setTab('ausencias')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'ausencias' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Ausencias
        </button>
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {tab === 'mes' ? (
        <ResumenAsistenciaMensual key={`${nivelId}-${refreshKey}`} nivelId={nivelId} ninos={ninos} />
      ) : (
        <AlertasAusencia nivelId={nivelId} ninos={ninos} />
      )}

      <TomarAsistenciaModal
        open={tomarOpen}
        onClose={() => setTomarOpen(false)}
        nivelId={nivelId}
        nivelNombre={nivelActual?.nombre}
        ninos={ninos}
        userId={user.id}
        onProgreso={(n) => setProgresoNino(n)}
        onSaved={() => {
          setTomarOpen(false)
          setRefreshKey((k) => k + 1)
        }}
      />

      <ProgresoNinoModal nino={progresoNino} nivelId={nivelId} open={!!progresoNino} onClose={() => setProgresoNino(null)} />
    </div>
  )
}
