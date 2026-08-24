import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import RewardBurst from './RewardBurst'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const MENSAJES_COMPLETO = ['¡Asistencia completa! 🎉', '¡Todos presentes hoy! 🙌', '¡Qué domingo tan lleno! 🌟']

export default function TomarAsistenciaModal({ open, onClose, nivelId, nivelNombre, ninos, userId, onSaved, onProgreso }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [marcados, setMarcados] = useState({})
  const [cargando, setCargando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const celebradoRef = useRef(false)

  useEffect(() => {
    if (open) setFecha(hoyISO())
  }, [open])

  useEffect(() => {
    if (!open || !nivelId) return
    setCargando(true)
    celebradoRef.current = false
    supabase
      .from('asistencia')
      .select('nino_id, presente')
      .eq('nivel_id', nivelId)
      .eq('fecha', fecha)
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach((r) => (map[r.nino_id] = r.presente))
        setMarcados(map)
        setCargando(false)
      })
  }, [open, nivelId, fecha])

  function toggle(ninoId) {
    setMarcados((prev) => {
      const next = { ...prev, [ninoId]: !prev[ninoId] }
      const todosPresentes = ninos.length > 0 && ninos.every((n) => next[n.id])
      if (todosPresentes && !celebradoRef.current) {
        celebradoRef.current = true
        const msg = MENSAJES_COMPLETO[Math.floor(Math.random() * MENSAJES_COMPLETO.length)]
        setToast({ key: Date.now(), message: msg })
      }
      return next
    })
  }

  async function guardar() {
    setSaving(true)
    const rows = ninos.map((n) => ({
      nino_id: n.id,
      nivel_id: nivelId,
      fecha,
      presente: !!marcados[n.id],
      tomada_por: userId,
    }))
    await supabase.from('asistencia').upsert(rows, { onConflict: 'nino_id,fecha' })
    setSaving(false)
    onSaved?.()
  }

  const presentes = Object.values(marcados).filter(Boolean).length

  return (
    <Modal open={open} onClose={onClose} title={`Tomar asistencia — ${nivelNombre || ''}`}>
      <RewardBurst toast={toast} />
      <div className="flex flex-col gap-4">
        <input type="date" className="input max-w-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />

        {cargando ? (
          <p className="text-sm text-ink/40">Cargando...</p>
        ) : !ninos || ninos.length === 0 ? (
          <p className="text-sm text-ink/40">No hay niños activos en esta clase.</p>
        ) : (
          <>
            <p className="font-bold text-ink/60">
              {presentes} de {ninos.length} presentes
            </p>
            {ninos.length > 10 ? (
              <div className="max-h-80 overflow-y-auto rounded-2xl border-2 border-ink/10">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-sky-50 text-xs font-bold uppercase text-ink/50">
                    <tr>
                      <th className="px-3 py-2">Niño/a</th>
                      <th className="px-3 py-2 text-center">Presente</th>
                      {onProgreso && <th className="px-3 py-2 text-center">Progreso</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ninos.map((n) => {
                      const presente = !!marcados[n.id]
                      return (
                        <tr key={n.id} className={`border-t border-ink/5 ${presente ? 'bg-grass-50' : ''}`}>
                          <td className="px-3 py-2 font-bold">{n.nombre_completo}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(n.id)}
                              aria-label={`Marcar presente a ${n.nombre_completo}`}
                              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-base shadow-pop transition-transform active:translate-y-0.5 active:shadow-none ${
                                presente ? 'bg-grass-400 text-white' : 'bg-white text-ink/20 ring-2 ring-ink/10'
                              }`}
                            >
                              {presente ? '✅' : ''}
                            </button>
                          </td>
                          {onProgreso && (
                            <td className="px-3 py-2 text-center">
                              {presente && (
                                <button
                                  type="button"
                                  onClick={() => onProgreso(n)}
                                  title="Registrar progreso"
                                  aria-label={`Registrar progreso de ${n.nombre_completo}`}
                                  className="text-lg transition-transform hover:scale-110 active:scale-95"
                                >
                                  🌱
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                {ninos.map((n) => {
                  const presente = !!marcados[n.id]
                  return (
                    <div key={n.id} className="relative">
                      <button
                        type="button"
                        onClick={() => toggle(n.id)}
                        className={`flex w-full flex-col items-center gap-1 rounded-blob p-3 text-center shadow-pop transition-transform active:translate-y-1 active:shadow-none ${
                          presente ? 'bg-grass-400 text-white' : 'bg-white text-ink'
                        }`}
                      >
                        <span className="text-2xl">{presente ? '✅' : '🧒'}</span>
                        <span className="text-sm font-bold leading-tight">{n.nombre_completo}</span>
                      </button>
                      {presente && onProgreso && (
                        <button
                          type="button"
                          onClick={() => onProgreso(n)}
                          title="Registrar progreso"
                          aria-label={`Registrar progreso de ${n.nombre_completo}`}
                          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-base shadow-soft ring-2 ring-grass-200 transition-transform hover:scale-110 active:scale-95"
                        >
                          🌱
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={guardar} disabled={saving} className="btn-success justify-center">
              {saving ? 'Guardando...' : '💾 Guardar asistencia'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
