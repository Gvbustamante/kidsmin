import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Modal from './Modal'
import RewardsPanel from './RewardsPanel'
import RewardBurst from './RewardBurst'
import { mensajeAleatorio, playSound } from '../lib/gamification'

const COMPORTAMIENTOS = ['Excelente', 'Bueno', 'Regular', 'Necesita apoyo']
const EMOCIONES = ['😊 Feliz', '🤩 Emocionado', '😐 Tranquilo', '😢 Triste', '😡 Molesto', '😴 Cansado']

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ProgresoNinoModal({ nino, nivelId, open, onClose }) {
  const { user } = useAuth()
  const [estrellas, setEstrellas] = useState([])
  const [form, setForm] = useState({ fecha: hoyISO(), comportamiento: '', emocion: '', logros: '' })
  const [busy, setBusy] = useState(false)
  const [busyEstrella, setBusyEstrella] = useState(false)
  const [toast, setToast] = useState(null)
  const [guardado, setGuardado] = useState(false)

  const cargarEstrellas = useCallback(async () => {
    if (!nino) return
    const { data } = await supabase
      .from('reconocimientos')
      .select('*')
      .eq('nino_id', nino.id)
      .order('created_at', { ascending: false })
    setEstrellas(data || [])
  }, [nino])

  useEffect(() => {
    if (open && nino) {
      setForm({ fecha: hoyISO(), comportamiento: '', emocion: '', logros: '' })
      setGuardado(false)
      cargarEstrellas()
    }
  }, [open, nino, cargarEstrellas])

  async function darEstrella(motivo) {
    setBusyEstrella(true)
    const { error } = await supabase.from('reconocimientos').insert({
      nino_id: nino.id,
      nivel_id: nivelId,
      motivo: motivo || null,
      otorgado_por: user.id,
    })
    setBusyEstrella(false)
    if (!error) {
      playSound('estrella')
      setToast({ key: Date.now(), message: `${mensajeAleatorio()} · ${nino.nombre_completo.split(' ')[0]}` })
      cargarEstrellas()
    }
  }

  async function guardarNota(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('progreso_notas').insert({
      nino_id: nino.id,
      nivel_id: nivelId,
      docente_id: user.id,
      ...form,
    })
    setBusy(false)
    setGuardado(true)
  }

  if (!nino) return null

  return (
    <Modal open={open} onClose={onClose} title={`Progreso — ${nino.nombre_completo}`}>
      <RewardBurst toast={toast} />
      <div className="flex flex-col gap-4">
        <RewardsPanel estrellas={estrellas.length} recientes={estrellas} busy={busyEstrella} onAward={darEstrella} />

        <form onSubmit={guardarNota} className="flex flex-col gap-4">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label">¿Cómo se comportó?</label>
            <div className="flex flex-wrap gap-2">
              {COMPORTAMIENTOS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, comportamiento: c })}
                  className={`rounded-full px-3 py-2 text-sm font-bold ${form.comportamiento === c ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">¿Cómo se sintió?</label>
            <div className="flex flex-wrap gap-2">
              {EMOCIONES.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setForm({ ...form, emocion: em })}
                  className={`rounded-full px-3 py-2 text-sm font-bold ${form.emocion === em ? 'bg-coral-400 text-white' : 'bg-ink/5'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">¿Qué logró hoy?</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Ej. Aprendió a compartir sus crayones, memorizó el versículo..."
              value={form.logros}
              onChange={(e) => setForm({ ...form, logros: e.target.value })}
            />
          </div>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : guardado ? '✔️ Nota guardada — guardar otra' : 'Guardar nota'}
          </button>
        </form>
      </div>
    </Modal>
  )
}
