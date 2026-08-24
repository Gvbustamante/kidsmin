import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import MultiFilePicker from '../../components/MultiFilePicker'
import FotosGaleria from '../../components/FotosGaleria'
import { exportExcel } from '../../lib/exportExcel'

const CATEGORIA_LABEL = { general: 'General', ninos: 'Para niños', clase: 'Para una clase' }

export default function Materiales() {
  const [materiales, setMateriales] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', categoria: 'general', nivel_id: '', cantidad: 0, notas: '' })
  const [fotos, setFotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('materiales').select('*, nivel:niveles(nombre), material_fotos(*)').order('nombre')
    setMateriales(data || [])
  }, [])

  useEffect(() => {
    load()
    supabase.from('niveles').select('*').eq('activo', true).order('nombre').then(({ data }) => setNiveles(data || []))
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ nombre: '', categoria: 'general', nivel_id: '', cantidad: 0, notas: '' })
    setFotos([])
    setError('')
    setModalOpen(true)
  }

  function openEdit(m) {
    setEditing(m)
    setForm({ nombre: m.nombre, categoria: m.categoria, nivel_id: m.nivel_id || '', cantidad: m.cantidad, notas: m.notas || '' })
    setFotos([])
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      nombre: form.nombre,
      categoria: form.categoria,
      nivel_id: form.categoria === 'clase' ? form.nivel_id || null : null,
      cantidad: Number(form.cantidad) || 0,
      notas: form.notas || null,
    }

    let materialId = editing?.id
    const { data: fila, error: saveError } = editing
      ? await supabase.from('materiales').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('materiales').insert(payload).select().single()

    if (saveError) {
      setBusy(false)
      setError(saveError.message)
      return
    }
    materialId = fila.id

    for (const foto of fotos) {
      const path = `materiales-fotos/${materialId}/${Date.now()}-${foto.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, foto)
      if (!upError) {
        await supabase
          .from('material_fotos')
          .insert({ material_id: materialId, storage_path: path, nombre_archivo: foto.name, tipo: foto.type })
      }
    }

    setBusy(false)
    setModalOpen(false)
    load()
  }

  async function eliminar() {
    setConfirmBusy(true)
    await supabase.from('materiales').delete().eq('id', confirmEliminar.id)
    setConfirmBusy(false)
    setConfirmEliminar(null)
    load()
  }

  async function toggleActivo(m) {
    await supabase.from('materiales').update({ activo: !m.activo }).eq('id', m.id)
    load()
  }

  function exportar() {
    const filas = materiales.map((m) => [
      m.nombre,
      m.categoria === 'clase' ? m.nivel?.nombre || 'Para una clase' : CATEGORIA_LABEL[m.categoria],
      m.cantidad,
      m.notas || '',
      m.activo ? 'Activo' : 'Inactivo',
    ])
    exportExcel('materiales', ['Nombre', 'Categoría/Clase', 'Cantidad', 'Notas', 'Estado'], filas)
  }

  if (!materiales) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const fotosDe = (m) => [m.foto_url && { url: m.foto_url }, ...(m.material_fotos || [])].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink/50">Qué hay disponible para los niños y para cada clase</p>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportar}>
            📊 Exportar
          </button>
          <button className="btn-primary" onClick={openNew}>
            + Agregar material
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50 text-xs font-bold uppercase text-ink/50">
              <tr>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Nombre</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Categoría/Clase</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Fotos</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Cantidad</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Estado</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((m) => (
                <tr key={m.id} className={`border-t border-ink/5 ${!m.activo ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2 font-bold">{m.nombre}</td>
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2 text-ink/60">
                    {m.categoria === 'clase' ? m.nivel?.nombre || 'Para una clase' : CATEGORIA_LABEL[m.categoria]}
                  </td>
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                    <FotosGaleria fotos={fotosDe(m)} size="h-10 w-10" />
                  </td>
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                    <span className={`badge ${m.cantidad <= 2 ? 'bg-coral-100 text-coral-700' : 'bg-sky-100 text-sky-700'}`}>
                      {m.cantidad} {m.cantidad <= 2 && '⚠️'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                    <span className={`badge ${m.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 sm:px-4 sm:py-2">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => openEdit(m)}>
                        Editar
                      </button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => toggleActivo(m)}>
                        {m.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs !text-coral-600" onClick={() => setConfirmEliminar(m)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {materiales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                    Aún no hay materiales registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar material' : 'Agregar material'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="general">General</option>
                <option value="ninos">Para niños</option>
                <option value="clase">Para una clase</option>
              </select>
            </div>
            <div>
              <label className="label">Cantidad</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              />
            </div>
          </div>
          {form.categoria === 'clase' && (
            <div>
              <label className="label">Clase</label>
              <select className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
                <option value="">Elige una clase</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          <div>
            <label className="label">{editing ? 'Agregar más fotos (opcional)' : 'Fotos (opcional)'}</label>
            <MultiFilePicker archivos={fotos} onChange={setFotos} accept="image/*" label="📷 Agregar foto(s)" />
            {editing && <FotosGaleria fotos={fotosDe(editing)} />}
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmEliminar}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={eliminar}
        busy={confirmBusy}
        title="¿Eliminar este material?"
        confirmLabel="Sí, eliminar"
        message="Esta acción no se puede deshacer."
      />
    </div>
  )
}
