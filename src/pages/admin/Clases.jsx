import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { BADGE_CLASSES, DOT_CLASSES } from '../../lib/colors'

const COLOR_OPTIONS = ['sky', 'grass', 'sunshine', 'coral', 'grape']
const DIA_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Clases() {
  const { profile } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [docentes, setDocentes] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [horarios, setHorarios] = useState([])
  const [asignacionesHorario, setAsignacionesHorario] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', edad_min: '', edad_max: '', color: 'sky' })
  const [selectedDocentes, setSelectedDocentes] = useState([])
  const [horarioDocentes, setHorarioDocentes] = useState({}) // { [horario_id]: docente_id }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: n }, { data: d }, { data: a }, { data: h }, { data: ah }] = await Promise.all([
      supabase.from('niveles').select('*').order('orden', { ascending: true }),
      supabase.from('profiles').select('id, nombre_completo, role').in('role', ['admin', 'coordinador', 'docente']).eq('activo', true).order('nombre_completo'),
      supabase.from('docentes_niveles').select('*'),
      supabase.from('horarios').select('*').eq('activo', true).order('orden'),
      supabase.from('asignacion_horario').select('*'),
    ])
    setNiveles(n || [])
    setDocentes(d || [])
    setAsignaciones(a || [])
    setHorarios(h || [])
    setAsignacionesHorario(ah || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ nombre: '', edad_min: '', edad_max: '', color: 'sky' })
    setSelectedDocentes([])
    setHorarioDocentes({})
    setError('')
    setModalOpen(true)
  }

  function openEdit(nivel) {
    setEditing(nivel)
    setForm({
      nombre: nivel.nombre,
      edad_min: nivel.edad_min ?? '',
      edad_max: nivel.edad_max ?? '',
      color: nivel.color || 'sky',
    })
    setSelectedDocentes(asignaciones.filter((a) => a.nivel_id === nivel.id).map((a) => a.docente_id))
    const hd = {}
    asignacionesHorario
      .filter((a) => a.nivel_id === nivel.id)
      .forEach((a) => {
        hd[a.horario_id] = a.docente_id
      })
    setHorarioDocentes(hd)
    setError('')
    setModalOpen(true)
  }

  function setHorarioDocente(horarioId, docenteId) {
    setHorarioDocentes((prev) => ({ ...prev, [horarioId]: docenteId || undefined }))
  }

  function toggleDocente(id) {
    setSelectedDocentes((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      nombre: form.nombre,
      edad_min: form.edad_min === '' ? null : Number(form.edad_min),
      edad_max: form.edad_max === '' ? null : Number(form.edad_max),
      color: form.color,
    }

    let nivelId = editing?.id
    if (editing) {
      const { error } = await supabase.from('niveles').update(payload).eq('id', editing.id)
      if (error) return fail(error)
    } else {
      const orden = niveles.reduce((max, n) => Math.max(max, n.orden ?? 0), 0) + 1
      const { data, error } = await supabase.from('niveles').insert({ ...payload, orden }).select().single()
      if (error) return fail(error)
      nivelId = data.id
    }

    // Un docente fijo por horario auto-vincula (docentes_niveles) aunque no
    // se haya marcado a mano en la lista general de arriba.
    const docentesPorHorario = Object.values(horarioDocentes).filter(Boolean)
    const docentesFinal = Array.from(new Set([...selectedDocentes, ...docentesPorHorario]))

    await supabase.from('docentes_niveles').delete().eq('nivel_id', nivelId)
    if (docentesFinal.length) {
      await supabase.from('docentes_niveles').insert(docentesFinal.map((docente_id) => ({ docente_id, nivel_id: nivelId })))
    }

    await supabase.from('asignacion_horario').delete().eq('nivel_id', nivelId)
    const filasHorario = horarios
      .filter((h) => horarioDocentes[h.id])
      .map((h) => ({ nivel_id: nivelId, horario_id: h.id, docente_id: horarioDocentes[h.id] }))
    if (filasHorario.length) {
      await supabase.from('asignacion_horario').insert(filasHorario)
    }

    setBusy(false)
    setModalOpen(false)
    load()

    function fail(error) {
      setError(error.message)
      setBusy(false)
    }
  }

  async function toggleActivo(nivel) {
    await supabase.from('niveles').update({ activo: !nivel.activo }).eq('id', nivel.id)
    load()
  }

  async function mover(nivel, direccion) {
    const i = niveles.findIndex((n) => n.id === nivel.id)
    const j = i + direccion
    if (j < 0 || j >= niveles.length) return
    const vecino = niveles[j]
    await Promise.all([
      supabase.from('niveles').update({ orden: vecino.orden ?? 0 }).eq('id', nivel.id),
      supabase.from('niveles').update({ orden: nivel.orden ?? 0 }).eq('id', vecino.id),
    ])
    load()
  }

  function handleToggleClick(nivel) {
    if (nivel.activo) {
      setConfirmDesactivar(nivel)
    } else {
      toggleActivo(nivel)
    }
  }

  async function confirmarDesactivar() {
    setConfirmBusy(true)
    await toggleActivo(confirmDesactivar)
    setConfirmBusy(false)
    setConfirmDesactivar(null)
  }

  if (!niveles) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink/50">Niveles por edad de tu escuelita — usa ▲▼ para ordenarlas como quieras verlas</p>
        <button className="btn-primary" onClick={openNew}>
          + Nueva clase
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left">
          <thead className="bg-sky-50 text-sm font-bold uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Nombre</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Edades</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Docentes</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Estado</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {niveles.map((nivel, i) => {
              const docs = asignaciones.filter((a) => a.nivel_id === nivel.id)
              return (
                <tr key={nivel.id} className={`border-t border-ink/5 ${!nivel.activo ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => mover(nivel, -1)}
                          className="leading-none text-ink/30 hover:text-sky-500 disabled:opacity-20 disabled:hover:text-ink/30"
                          title="Subir"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={i === niveles.length - 1}
                          onClick={() => mover(nivel, 1)}
                          className="leading-none text-ink/30 hover:text-sky-500 disabled:opacity-20 disabled:hover:text-ink/30"
                          title="Bajar"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="font-bold">{nivel.nombre}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">
                    {nivel.edad_min ?? '?'} - {nivel.edad_max ?? '?'} años
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <span className={`badge ${BADGE_CLASSES[nivel.color] || BADGE_CLASSES.sky}`}>{docs.length} docente(s)</span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <span className={`badge ${nivel.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                      {nivel.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => openEdit(nivel)}>
                        Editar
                      </button>
                      {profile.role === 'admin' && (
                        <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => handleToggleClick(nivel)}>
                          {nivel.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {niveles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Aún no hay clases. ¡Crea la primera!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar clase' : 'Nueva clase'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              required
              className="input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. Exploradores"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Edad mínima</label>
              <input
                type="number"
                className="input"
                value={form.edad_min}
                onChange={(e) => setForm({ ...form, edad_min: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Edad máxima</label>
              <input
                type="number"
                className="input"
                value={form.edad_max}
                onChange={(e) => setForm({ ...form, edad_max: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-10 w-10 rounded-full ${DOT_CLASSES[c]} ${form.color === c ? 'ring-4 ring-ink/20' : ''}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Personas asignadas a esta clase</label>
            <p className="mb-2 text-xs text-ink/40">Marca a quienes enseñan o ayudan en esta clase — pueden ser docentes, coordinadores o admins.</p>
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink/10 p-3 max-h-40 overflow-y-auto">
              {docentes.length === 0 && <p className="text-sm text-ink/40">Aún no hay cuentas de equipo.</p>}
              {docentes.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={selectedDocentes.includes(d.id)}
                    onChange={() => toggleDocente(d.id)}
                    className="h-5 w-5 rounded"
                  />
                  {d.nombre_completo}
                  {d.role !== 'docente' && (
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${d.role === 'admin' ? 'bg-grape-100 text-grape-700' : 'bg-sunshine-100 text-sunshine-700'}`}>
                      {d.role === 'admin' ? 'Admin' : 'Coord'}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
          {horarios.length > 1 && (
            <div>
              <label className="label">Docente fijo por horario (opcional)</label>
              <p className="mb-2 text-xs text-ink/40">
                Si hay más de un servicio el mismo día, di quién cubre cada uno. Se vincula automáticamente arriba.
              </p>
              <div className="flex flex-col gap-2">
                {horarios.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 text-sm font-bold text-ink/60">
                      {h.nombre}
                      {h.dia_semana != null && <span className="font-normal text-ink/40"> · {DIA_LABEL[h.dia_semana]}</span>}
                    </span>
                    <select
                      className="input !w-auto flex-1 !py-1.5 !text-sm"
                      value={horarioDocentes[h.id] || ''}
                      onChange={(e) => setHorarioDocente(h.id, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {docentes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre_completo}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        title="¿Desactivar esta clase?"
        confirmLabel="Sí, desactivar"
        message={
          confirmDesactivar
            ? `"${confirmDesactivar.nombre}" dejará de aparecer como clase activa. Puedes reactivarla cuando quieras.`
            : ''
        }
      />
    </div>
  )
}
