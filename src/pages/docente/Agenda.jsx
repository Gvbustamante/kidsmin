import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import CalendarioAgenda from '../../components/CalendarioAgenda'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Agenda() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [eventos, setEventos] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: hoyISO() })
  const [busy, setBusy] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase.from('agenda').select('*').eq('nivel_id', nivelId).order('fecha')
    setEventos(data || [])
  }, [nivelId])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setForm({ titulo: '', descripcion: '', fecha: selectedDay || hoyISO() })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('agenda').insert({ nivel_id: nivelId, creado_por: user.id, ...form })
    setBusy(false)
    setModalOpen(false)
    load()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setConfirmBusy(true)
    await supabase.from('agenda').delete().eq('id', confirmEliminar)
    setConfirmBusy(false)
    setConfirmEliminar(null)
    load()
  }

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  const hoy = hoyISO()
  const eventosDelDia = eventos ? (selectedDay ? eventos.filter((e) => e.fecha === selectedDay) : eventos) : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Agenda 📅</h1>
          <p className="text-ink/50">Próximos eventos y actividades especiales</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nuevo evento
        </button>
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {!eventos ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CalendarioAgenda eventos={eventos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

          <div className="flex flex-col gap-3">
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} className="self-start text-sm font-bold text-sky-500 hover:underline">
                ← Ver todos los eventos
              </button>
            )}
            {eventosDelDia.map((ev) => (
              <div key={ev.id} className={`card flex items-center justify-between gap-4 ${ev.fecha < hoy ? 'opacity-50' : ''}`}>
                <div>
                  <p className="font-bold">{ev.titulo}</p>
                  <p className="text-sm text-ink/50">{ev.fecha}</p>
                  {ev.descripcion && <p className="text-sm text-ink/50">{ev.descripcion}</p>}
                </div>
                <button onClick={() => setConfirmEliminar(ev.id)} className="text-2xl text-ink/30 hover:text-coral-500">
                  🗑️
                </button>
              </div>
            ))}
            {eventosDelDia.length === 0 && <p className="card text-ink/50">No hay eventos programados.</p>}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo evento">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" required className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar evento'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmEliminar}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar}
        busy={confirmBusy}
        title="¿Eliminar este evento?"
        confirmLabel="Sí, eliminar"
        message="No se puede deshacer."
      />
    </div>
  )
}
