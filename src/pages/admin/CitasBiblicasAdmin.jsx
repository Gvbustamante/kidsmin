import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { coincide } from '../../lib/busqueda'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'

function hoyStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CitasBiblicasAdmin() {
  const [citas, setCitas] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ texto: '', referencia: '', activo: true, fecha_mostrar: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('citas_biblicas')
      .select('*')
      .order('fecha_mostrar', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    setCitas(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ texto: '', referencia: '', activo: true, fecha_mostrar: '' })
    setError('')
    setModalOpen(true)
  }

  function openEdit(cita) {
    setEditing(cita)
    setForm({
      texto: cita.texto,
      referencia: cita.referencia,
      activo: cita.activo,
      fecha_mostrar: cita.fecha_mostrar || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      texto: form.texto,
      referencia: form.referencia,
      activo: form.activo,
      fecha_mostrar: form.fecha_mostrar || null,
    }

    const query = editing
      ? supabase.from('citas_biblicas').update(payload).eq('id', editing.id)
      : supabase.from('citas_biblicas').insert(payload)

    const { error } = await query
    setBusy(false)
    if (error) {
      setError(
        error.code === '23505'
          ? 'Ya hay otra cita programada para esa fecha. Elige otro día o quítale la fecha.'
          : error.message
      )
      return
    }
    setModalOpen(false)
    load()
  }

  async function quitarFecha(cita) {
    await supabase.from('citas_biblicas').update({ fecha_mostrar: null }).eq('id', cita.id)
    load()
  }

  async function usarHoy(cita) {
    await supabase.from('citas_biblicas').update({ fecha_mostrar: hoyStr() }).eq('id', cita.id)
    load()
  }

  async function eliminar(cita) {
    await supabase.from('citas_biblicas').delete().eq('id', cita.id)
    load()
  }

  async function confirmarEliminar() {
    setConfirmBusy(true)
    await eliminar(confirmEliminar)
    setConfirmBusy(false)
    setConfirmEliminar(null)
  }

  async function toggleActivo(cita) {
    await supabase.from('citas_biblicas').update({ activo: !cita.activo }).eq('id', cita.id)
    load()
  }

  function handleToggleClick(cita) {
    if (cita.activo) {
      setConfirmDesactivar(cita)
    } else {
      toggleActivo(cita)
    }
  }

  async function confirmarDesactivar() {
    setConfirmBusy(true)
    await toggleActivo(confirmDesactivar)
    setConfirmBusy(false)
    setConfirmDesactivar(null)
  }

  if (!citas) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-40" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const hoy = hoyStr()
  const citasFiltradas = citas.filter((c) => coincide(busqueda, c.texto, c.referencia))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink/50">Arma la lista de citas y programa cuál se muestra cada día.</p>
        <button className="btn-primary" onClick={openNew}>
          + Nueva cita
        </button>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Buscar versículo..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs font-bold uppercase text-ink/50">
            <tr>
              <th className="px-3 py-1.5 sm:px-4 sm:py-2">Texto</th>
              <th className="px-3 py-1.5 sm:px-4 sm:py-2">Referencia</th>
              <th className="px-3 py-1.5 sm:px-4 sm:py-2">Fecha</th>
              <th className="px-3 py-1.5 sm:px-4 sm:py-2">Estado</th>
              <th className="px-3 py-1.5 sm:px-4 sm:py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {citasFiltradas.map((c) => (
              <tr key={c.id} className={`border-t border-ink/5 ${!c.activo ? 'opacity-50' : ''}`}>
                <td className="max-w-[10rem] truncate px-3 py-1.5 italic text-ink/80 sm:max-w-xs sm:px-4 sm:py-2">"{c.texto}"</td>
                <td className="px-3 py-1.5 sm:px-4 sm:py-2 font-bold text-ink/60">{c.referencia}</td>
                <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                  {c.fecha_mostrar === hoy && <span className="badge bg-grass-100 text-grass-700">Hoy</span>}
                  {c.fecha_mostrar && c.fecha_mostrar !== hoy && (
                    <span className="badge bg-sky-100 text-sky-700">
                      {new Date(c.fecha_mostrar + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {!c.fecha_mostrar && <span className="badge bg-ink/5 text-ink/40">Sin fecha</span>}
                </td>
                <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                  <span className={`badge ${c.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-600'}`}>
                    {c.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                  <div className="flex flex-wrap gap-2">
                    {c.fecha_mostrar !== hoy && (
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => usarHoy(c)}>
                        Usar hoy
                      </button>
                    )}
                    {c.fecha_mostrar && (
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => quitarFecha(c)}>
                        Quitar fecha
                      </button>
                    )}
                    <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => handleToggleClick(c)}>
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => openEdit(c)}>
                      Editar
                    </button>
                    <button className="btn-secondary !py-1 !px-3 !text-xs !text-coral-600" onClick={() => setConfirmEliminar(c)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {citas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Aún no hay citas. ¡Agrega la primera!
                </td>
              </tr>
            )}
            {citas.length > 0 && citasFiltradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  No hay versículos que coincidan con "{busqueda}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cita' : 'Nueva cita'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Texto</label>
            <textarea
              required
              rows={3}
              className="input"
              value={form.texto}
              onChange={(e) => setForm({ ...form, texto: e.target.value })}
              placeholder='Ej. "Todo lo puedo en Cristo que me fortalece."'
            />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input
              required
              className="input"
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
              placeholder="Ej. Filipenses 4:13"
            />
          </div>
          <div>
            <label className="label">Mostrar el día (opcional)</label>
            <input
              type="date"
              className="input"
              value={form.fecha_mostrar}
              onChange={(e) => setForm({ ...form, fecha_mostrar: e.target.value })}
            />
            <p className="mt-1 text-xs text-ink/40">Déjalo vacío para que quede disponible sin fecha fija.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 rounded"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activa
          </label>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={confirmarDesactivar}
        busy={confirmBusy}
        title="¿Desactivar esta cita?"
        confirmLabel="Sí, desactivar"
        message="Dejará de estar disponible para elegirla como cita del día. Puedes reactivarla cuando quieras."
      />

      <ConfirmModal
        open={!!confirmEliminar}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar}
        busy={confirmBusy}
        title="¿Eliminar esta cita bíblica?"
        confirmLabel="Sí, eliminar"
        message="Esta acción no se puede deshacer."
      />
    </div>
  )
}
