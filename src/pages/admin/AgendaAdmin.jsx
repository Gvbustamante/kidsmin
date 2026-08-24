import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import CalendarioAgenda from '../../components/CalendarioAgenda'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AgendaAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState([])
  const [eventos, setEventos] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: hoyISO(), nivel_id: '' })
  const [busy, setBusy] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('agenda').select('*, nivel:niveles(nombre)').order('fecha')
    setEventos(data || [])
  }, [])

  useEffect(() => {
    load()
    supabase.from('niveles').select('*').eq('activo', true).order('nombre').then(({ data }) => setNiveles(data || []))
  }, [load])

  function openNew() {
    setForm({ titulo: '', descripcion: '', fecha: selectedDay || hoyISO(), nivel_id: '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('agenda').insert({
      creado_por: user.id,
      titulo: form.titulo,
      descripcion: form.descripcion,
      fecha: form.fecha,
      nivel_id: form.nivel_id || null,
    })
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

  if (!eventos) return <Spinner />

  const eventosDelDia = selectedDay ? eventos.filter((e) => e.fecha === selectedDay) : eventos
  const hoy = hoyISO()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Agenda 📅</h1>
          <p className="text-ink/50">Eventos para toda la escuelita o por clase</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nuevo evento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CalendarioAgenda eventos={eventos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

        <div className="flex flex-col gap-3">
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="self-start text-sm font-bold text-sky-500 hover:underline">
              ← Ver todos los eventos
            </button>
          )}
          {eventosDelDia.map((ev) => (
            <div key={ev.id} className={`card flex items-center justify-between gap-3 ${ev.fecha < hoy ? 'opacity-50' : ''}`}>
              <div>
                <p className="font-bold">{ev.titulo}</p>
                <p className="text-xs font-bold uppercase text-sky-500">{ev.nivel?.nombre || 'Toda la escuelita'}</p>
                <p className="text-sm text-ink/50">{ev.fecha}</p>
                {ev.descripcion && <p className="mt-1 text-sm text-ink/60">{ev.descripcion}</p>}
              </div>
              <button onClick={() => setConfirmEliminar(ev.id)} className="text-2xl text-ink/30 hover:text-coral-500">
                🗑️
              </button>
            </div>
          ))}
          {eventosDelDia.length === 0 && <p className="card text-ink/50">No hay eventos.</p>}
        </div>
      </div>

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" required className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Clase</label>
              <select className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
                <option value="">Toda la escuelita</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
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
