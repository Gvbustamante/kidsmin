import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { coincide } from '../../lib/busqueda'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ArchivosExistentes from '../../components/ArchivosExistentes'
import TareaEntregas from '../../components/TareaEntregas'
import ActividadFila from '../../components/ActividadFila'
import RichTextEditor from '../../components/RichTextEditor'
import MultiFilePicker from '../../components/MultiFilePicker'
import DrivePicker from '../../components/DrivePicker'
import { getVideoEmbedUrl } from '../../lib/videoEmbed'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function formVacio(fecha) {
  return {
    titulo: '',
    descripcion: '',
    fecha: fecha || hoyISO(),
    versiculo_clave: '',
    historia_biblica: '',
    visible_padres: true,
    es_tarea: false,
    enlace_externo: '',
  }
}

export default function ActividadesAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [audiencia, setAudiencia] = useState('ninos')
  const [actividades, setActividades] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [mesFiltro, setMesFiltro] = useState(hoyYYYYMM())
  const [verTodosMeses, setVerTodosMeses] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(formVacio())
  const [imagen, setImagen] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [tareaActividad, setTareaActividad] = useState(null)
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [archivosDrive, setArchivosDrive] = useState([])
  const [archivosExistentes, setArchivosExistentes] = useState([])

  useEffect(() => {
    supabase
      .from('niveles')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setNiveles(data || [])
        setNivelId((data || [])[0]?.id || '')
      })
  }, [])

  const load = useCallback(async () => {
    if (audiencia === 'docentes') {
      const { data } = await supabase
        .from('actividades')
        .select('*, actividad_archivos(*), actividad_reacciones(*)')
        .eq('audiencia', 'docentes')
        .order('fecha', { ascending: false })
      setActividades(data || [])
      return
    }
    if (!nivelId) return
    const { data } = await supabase
      .from('actividades')
      .select('*, actividad_archivos(*), actividad_reacciones(*)')
      .eq('nivel_id', nivelId)
      .eq('audiencia', 'ninos')
      .order('fecha', { ascending: false })
    setActividades(data || [])
  }, [nivelId, audiencia])

  useEffect(() => {
    load()
  }, [load])

  function cambiarAudiencia(nueva) {
    setAudiencia(nueva)
    setActividades(null)
  }

  function openNew() {
    setEditing(null)
    setForm(formVacio())
    setImagen(null)
    setImagenPreview(null)
    setArchivos([])
    setArchivosDrive([])
    setArchivosExistentes([])
    setError('')
    setModalOpen(true)
  }

  function openEdit(actividad) {
    setEditing(actividad)
    setForm({
      titulo: actividad.titulo,
      descripcion: actividad.descripcion || '',
      fecha: actividad.fecha,
      versiculo_clave: actividad.versiculo_clave || '',
      historia_biblica: actividad.historia_biblica || '',
      visible_padres: actividad.visible_padres ?? true,
      es_tarea: actividad.es_tarea ?? false,
      enlace_externo: actividad.enlace_externo || '',
    })
    setImagen(null)
    setImagenPreview(null)
    setArchivos([])
    setArchivosDrive([])
    setArchivosExistentes(actividad.actividad_archivos || [])
    setError('')
    setModalOpen(true)
  }

  function handleImagen(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImagen(f)
    setImagenPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      fecha: form.fecha,
      versiculo_clave: form.versiculo_clave || null,
      historia_biblica: form.historia_biblica || null,
      visible_padres: audiencia === 'docentes' ? false : form.visible_padres,
      es_tarea: form.es_tarea,
      enlace_externo: form.enlace_externo || null,
    }

    let actividadId = editing?.id
    if (editing) {
      const { error: updError } = await supabase.from('actividades').update(payload).eq('id', editing.id)
      if (updError) {
        setError(updError.message)
        setBusy(false)
        return
      }
    } else {
      const { data: actividad, error: actError } = await supabase
        .from('actividades')
        .insert({
          ...payload,
          nivel_id: audiencia === 'docentes' ? null : nivelId,
          audiencia,
          docente_id: user.id,
        })
        .select()
        .single()
      if (actError) {
        setError(actError.message)
        setBusy(false)
        return
      }
      actividadId = actividad.id
    }

    if (imagen) {
      const path = `${nivelId || 'equipo-docente'}/${actividadId}/portada-${Date.now()}-${imagen.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, imagen)
      if (!upError) {
        const imagen_url = supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
        await supabase.from('actividades').update({ imagen_url }).eq('id', actividadId)
      }
    }

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i]
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}...`)
      const path = `${nivelId || 'equipo-docente'}/${actividadId}/${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
      if (!upError) {
        await supabase.from('actividad_archivos').insert({
          actividad_id: actividadId,
          storage_path: path,
          nombre_archivo: file.name,
          tipo: file.type,
        })
      }
    }

    for (const df of archivosDrive) {
      await supabase.from('actividad_archivos').insert({
        actividad_id: actividadId,
        storage_path: df.storage_path,
        nombre_archivo: df.nombre,
        tipo: df.tipo,
        bucket: 'drive',
      })
    }

    setProgreso('')
    setBusy(false)
    setModalOpen(false)
    load()
  }

  async function eliminar(id) {
    await supabase.from('actividades').delete().eq('id', id)
    load()
  }

  if (!niveles) return <Spinner />
  if (niveles.length === 0) return <p className="card text-ink/50">Todavía no hay clases creadas.</p>

  // Filtrado por búsqueda + mes
  let actividadesFiltradas = (actividades || []).filter((a) =>
    coincide(busqueda, a.titulo, a.descripcion, a.versiculo_clave, a.historia_biblica),
  )
  if (!verTodosMeses && mesFiltro) {
    actividadesFiltradas = actividadesFiltradas.filter((a) => a.fecha?.startsWith(mesFiltro))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Actividades 🎨</h1>
          <p className="text-ink/50">Lo que se hace en cada clase — fotos, versículo e historia bíblica</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nueva actividad
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cambiarAudiencia('ninos')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${audiencia === 'ninos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50 border-2 border-ink/10'}`}
          >
            🧒 Niños
          </button>
          <button
            type="button"
            onClick={() => cambiarAudiencia('docentes')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${audiencia === 'docentes' ? 'bg-grape-400 text-white' : 'bg-white text-ink/50 border-2 border-ink/10'}`}
          >
            🍎 Equipo docente
          </button>
        </div>
        {audiencia === 'ninos' && (
          <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
            {niveles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
      {audiencia === 'docentes' && (
        <p className="-mt-3 text-sm text-ink/50">Comunicados, capacitaciones o tareas dirigidas a todo el equipo docente, no a una clase en particular.</p>
      )}

      {/* Búsqueda + filtro de mes */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/30">🔍</span>
          <input
            className="input max-w-xs !pl-9"
            placeholder="Buscar actividad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {!verTodosMeses && (
          <input type="month" className="input max-w-[180px]" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
        )}
        <button
          onClick={() => setVerTodosMeses((v) => !v)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${verTodosMeses ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          {verTodosMeses ? 'Filtrar por mes' : 'Ver todos'}
        </button>
      </div>

      {!actividades ? (
        <Spinner />
      ) : (
        <div className="card divide-y divide-ink/5 !p-0">
          {actividadesFiltradas.map((a) => (
            <ActividadFila key={a.id} a={a} onEdit={openEdit} onDelete={eliminar} onVerEntregas={setTareaActividad} />
          ))}
          {actividades.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-5xl">🎨</span>
              <p className="text-ink/50">Aún no hay actividades para esta clase.</p>
              <button className="btn-primary mt-1" onClick={openNew}>+ Nueva actividad</button>
            </div>
          )}
          {actividades.length > 0 && actividadesFiltradas.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-ink/50">
                No hay actividades que coincidan{busqueda ? ` con "${busqueda}"` : ' en este mes'}.
              </p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar actividad' : audiencia === 'docentes' ? 'Nuevo comunicado para el equipo' : 'Nueva actividad'}
        wide
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ═══ Sección: Información básica ═══ */}
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-ink/30">
              📋 Información básica
            </legend>
            <div>
              <label className="label">Título</label>
              <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <label className="label">Descripción</label>
              <RichTextEditor value={form.descripcion} onChange={(html) => setForm({ ...form, descripcion: html })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Fecha</label>
                <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div>
                <label className="label">Historia bíblica (opcional)</label>
                <input
                  className="input"
                  placeholder="Ej. David y Goliat"
                  value={form.historia_biblica}
                  onChange={(e) => setForm({ ...form, historia_biblica: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Versículo clave (opcional)</label>
              <input
                className="input"
                placeholder='Ej. "Todo lo puedo en Cristo..." — Filipenses 4:13'
                value={form.versiculo_clave}
                onChange={(e) => setForm({ ...form, versiculo_clave: e.target.value })}
              />
            </div>
          </fieldset>

          <hr className="border-ink/5" />

          {/* ═══ Sección: Configuración ═══ */}
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-ink/30">
              ⚙️ Configuración
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {audiencia === 'ninos' && (
                <div>
                  <label className="label">Visibilidad</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, visible_padres: true })}
                      className={`flex-1 rounded-chunky px-3 py-2.5 text-sm font-bold transition-all ${form.visible_padres ? 'bg-sky-400 text-white shadow-sm' : 'bg-ink/5 text-ink/50 hover:bg-ink/10'}`}
                    >
                      👀 Padres ven
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, visible_padres: false })}
                      className={`flex-1 rounded-chunky px-3 py-2.5 text-sm font-bold transition-all ${!form.visible_padres ? 'bg-grape-400 text-white shadow-sm' : 'bg-ink/5 text-ink/50 hover:bg-ink/10'}`}
                    >
                      🙈 Solo equipo
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="label">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, es_tarea: false })}
                    className={`flex-1 rounded-chunky px-3 py-2.5 text-sm font-bold transition-all ${!form.es_tarea ? 'bg-sky-400 text-white shadow-sm' : 'bg-ink/5 text-ink/50 hover:bg-ink/10'}`}
                  >
                    📢 Informativa
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, es_tarea: true })}
                    className={`flex-1 rounded-chunky px-3 py-2.5 text-sm font-bold transition-all ${form.es_tarea ? 'bg-sunshine-400 text-white shadow-sm' : 'bg-ink/5 text-ink/50 hover:bg-ink/10'}`}
                  >
                    📝 Tarea
                  </button>
                </div>
                {form.es_tarea && (
                  <p className="mt-1.5 rounded-xl bg-sunshine-50 px-3 py-1.5 text-xs text-sunshine-700">
                    {audiencia === 'docentes'
                      ? '🔔 Cada docente podrá marcarla como hecha desde su cuenta.'
                      : '🔔 Cada niño del nivel podrá entregar su evidencia.'}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <hr className="border-ink/5" />

          {/* ═══ Sección: Multimedia ═══ */}
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-ink/30">
              🎬 Multimedia
            </legend>
            <div>
              <label className="label">{editing ? 'Cambiar imagen principal' : 'Imagen principal (opcional)'}</label>
              <label className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/10 bg-ink/[0.02] px-4 py-5 transition-colors hover:border-sky-300 hover:bg-sky-50/50">
                {(imagenPreview || (editing && editing.imagen_url)) ? (
                  <img src={imagenPreview || editing.imagen_url} alt="" className="h-36 w-full rounded-xl object-cover" />
                ) : (
                  <>
                    <span className="text-3xl">📷</span>
                    <span className="text-sm font-bold text-ink/40 group-hover:text-sky-600">Toca para seleccionar una imagen</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImagen} />
                {(imagenPreview || (editing && editing.imagen_url)) && (
                  <span className="text-xs font-bold text-sky-600">Cambiar imagen</span>
                )}
              </label>
            </div>
            <div>
              <label className="label">Video o enlace externo (opcional)</label>
              <input
                type="url"
                className="input"
                placeholder="https://youtube.com/watch?v=... o cualquier URL"
                value={form.enlace_externo}
                onChange={(e) => setForm({ ...form, enlace_externo: e.target.value })}
              />
              {form.enlace_externo && getVideoEmbedUrl(form.enlace_externo) && (
                <div className="mt-2 overflow-hidden rounded-xl bg-ink shadow-soft">
                  <iframe
                    src={getVideoEmbedUrl(form.enlace_externo)}
                    title="Vista previa"
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {!form.enlace_externo && (
                <p className="mt-1 text-xs text-ink/40">YouTube y Vimeo se muestran como video embebido.</p>
              )}
            </div>
            <div>
              <label className="label">{editing ? 'Agregar más archivos' : 'Fotos y archivos'}</label>
              <div className="flex flex-wrap items-center gap-2">
                <MultiFilePicker archivos={archivos} onChange={setArchivos} />
                <button type="button" onClick={() => setDrivePickerOpen(true)} className="btn-secondary !py-2 !text-sm">
                  📁 Desde el Drive
                </button>
              </div>
              {archivosDrive.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {archivosDrive.map((df, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                      📁 {df.nombre}
                      <button type="button" onClick={() => setArchivosDrive(archivosDrive.filter((_, j) => j !== i))} className="ml-1 text-coral-500 hover:text-coral-700">×</button>
                    </span>
                  ))}
                </div>
              )}
              {editing && archivosExistentes.length > 0 && (
                <ArchivosExistentes
                  archivos={archivosExistentes}
                  tabla="actividad_archivos"
                  onDeleted={(id) => setArchivosExistentes((prev) => prev.filter((a) => a.id !== id))}
                />
              )}
            </div>
          </fieldset>

          {/* ═══ Feedback ═══ */}
          {progreso && (
            <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              <span className="text-sm font-bold text-sky-600">{progreso}</span>
            </div>
          )}
          {error && <p className="rounded-xl bg-coral-50 px-4 py-2.5 text-sm font-bold text-coral-600">⚠️ {error}</p>}
          <button disabled={busy} className="btn-primary justify-center text-base">
            {busy ? 'Guardando...' : editing ? '✓ Guardar cambios' : '🚀 Publicar actividad'}
          </button>
        </form>
      </Modal>

      <TareaEntregas actividad={tareaActividad} open={!!tareaActividad} onClose={() => setTareaActividad(null)} />

      <DrivePicker
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelect={(files) => setArchivosDrive([...archivosDrive, ...files])}
      />
    </div>
  )
}
