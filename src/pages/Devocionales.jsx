import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { coincide } from '../lib/busqueda'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import RichTextEditor from '../components/RichTextEditor'
import ArchivosExistentes from '../components/ArchivosExistentes'
import MultiFilePicker from '../components/MultiFilePicker'
import DrivePicker from '../components/DrivePicker'
import CitasBiblicasAdmin from './admin/CitasBiblicasAdmin'
import { getVideoEmbedUrl } from '../lib/videoEmbed'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function diasEnMes(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function formatFecha(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function previewTexto(html, max = 100) {
  const text = stripHtml(html)
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default function Devocionales() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const puedeCrear = ['admin', 'coordinador', 'docente'].includes(profile.role)
  const puedeVerVersiculos = ['admin', 'coordinador'].includes(profile.role)
  const [tab, setTab] = useState('devocionales')
  const [vista, setVista] = useState('tarjetas')
  const [nivelFiltro, setNivelFiltro] = useState('')

  const [devocionales, setDevocionales] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [mes, setMes] = useState(hoyYYYYMM())
  const [verTodos, setVerTodos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '', enlace_externo: '' })
  const [imagen, setImagen] = useState(null)
  const [preview, setPreview] = useState(null)
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [archivosDrive, setArchivosDrive] = useState([])
  const [archivosExistentes, setArchivosExistentes] = useState([])

  const load = useCallback(async () => {
    let query = supabase
      .from('devocionales_ninos')
      .select('*, nivel:niveles(nombre), devocional_reacciones(*), devocional_archivos(*)')
      .order('fecha', { ascending: false })
    if (!verTodos) {
      query = query.gte('fecha', `${mes}-01`).lte('fecha', `${mes}-${String(diasEnMes(mes)).padStart(2, '0')}`)
    }
    const { data } = await query
    setDevocionales(data || [])
  }, [mes, verTodos])

  useEffect(() => {
    load()
    if (puedeCrear) {
      supabase.from('niveles').select('*').eq('activo', true).then(({ data }) => setNiveles(data || []))
    }
  }, [load, puedeCrear])

  function openNew() {
    setEditing(null)
    setForm({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '', enlace_externo: '' })
    setImagen(null)
    setPreview(null)
    setArchivos([])
    setArchivosDrive([])
    setArchivosExistentes([])
    setError('')
    setModalOpen(true)
  }

  function openEdit(d) {
    setEditing(d)
    setForm({
      titulo: d.titulo,
      versiculo: d.versiculo || '',
      contenido: d.contenido,
      fecha: d.fecha,
      nivel_id: d.nivel_id || '',
      enlace_externo: d.enlace_externo || '',
    })
    setImagen(null)
    setPreview(null)
    setArchivos([])
    setArchivosDrive([])
    setArchivosExistentes(d.devocional_archivos || [])
    setError('')
    setModalOpen(true)
  }

  function handleImagen(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImagen(f)
    setPreview(URL.createObjectURL(f))
  }

  async function marcarActivo(d) {
    await supabase.from('devocionales_ninos').update({ activo: false }).eq('activo', true)
    await supabase.from('devocionales_ninos').update({ activo: true }).eq('id', d.id)
    load()
  }

  async function quitarActivo(d) {
    await supabase.from('devocionales_ninos').update({ activo: false }).eq('id', d.id)
    load()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.contenido) {
      setError('Escribe la reflexión para el niño/a.')
      return
    }
    setBusy(true)
    setError('')

    const payload = {
      titulo: form.titulo,
      versiculo: form.versiculo || null,
      contenido: form.contenido,
      fecha: form.fecha,
      nivel_id: form.nivel_id || null,
      enlace_externo: form.enlace_externo || null,
    }

    let devocionalId = editing?.id
    if (editing) {
      const { error: updError } = await supabase.from('devocionales_ninos').update(payload).eq('id', editing.id)
      if (updError) {
        setError(updError.message)
        setBusy(false)
        return
      }
    } else {
      const { data: devocional, error: insError } = await supabase
        .from('devocionales_ninos')
        .insert({ ...payload, creado_por: user.id })
        .select()
        .single()
      if (insError) {
        setError(insError.message)
        setBusy(false)
        return
      }
      devocionalId = devocional.id
    }

    if (imagen) {
      const path = `devocionales/${devocionalId}/${Date.now()}-${imagen.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, imagen)
      if (!upError) {
        const imagen_url = supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
        await supabase.from('devocionales_ninos').update({ imagen_url }).eq('id', devocionalId)
      }
    }

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i]
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}...`)
      const path = `devocionales-archivos/${devocionalId}/${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
      if (!upError) {
        await supabase.from('devocional_archivos').insert({
          devocional_id: devocionalId,
          storage_path: path,
          nombre_archivo: file.name,
          tipo: file.type,
        })
      }
    }

    for (const df of archivosDrive) {
      await supabase.from('devocional_archivos').insert({
        devocional_id: devocionalId,
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

  if (!devocionales) return <Spinner />

  let devocionalesFiltrados = devocionales.filter((d) =>
    coincide(busqueda, d.titulo, d.versiculo, d.contenido, d.nivel?.nombre),
  )
  if (nivelFiltro) {
    devocionalesFiltrados = devocionalesFiltrados.filter((d) => d.nivel_id === nivelFiltro)
  }

  const totalActivos = devocionales.filter((d) => d.activo).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Devocionales 🙏</h1>
          <p className="text-ink/50">Reflexiones para niños, y el versículo que se muestra cada día</p>
        </div>
        {tab === 'devocionales' && puedeCrear && (
          <button className="btn-primary" onClick={openNew}>
            + Nuevo devocional
          </button>
        )}
      </div>

      {puedeVerVersiculos && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('devocionales')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'devocionales' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            🙏 Devocionales
          </button>
          <button
            type="button"
            onClick={() => setTab('versiculos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'versiculos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            📖 Versículos
          </button>
        </div>
      )}

      {tab === 'versiculos' && puedeVerVersiculos ? (
        <CitasBiblicasAdmin />
      ) : (
        <>
          {/* ═══ Contadores ═══ */}
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
              {devocionales.length} devocional{devocionales.length !== 1 ? 'es' : ''}
            </span>
            {totalActivos > 0 && (
              <span className="rounded-full bg-sunshine-50 px-3 py-1 text-xs font-bold text-sunshine-700">
                ⭐ {totalActivos} activo{totalActivos !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* ═══ Filtros ═══ */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/30">🔍</span>
              <input
                className="input max-w-xs !pl-9"
                placeholder="Buscar devocional..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            {!verTodos && (
              <input type="month" className="input max-w-[180px]" value={mes} onChange={(e) => setMes(e.target.value)} />
            )}
            {niveles.length > 0 && (
              <select className="input max-w-[180px]" value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
                <option value="">Todas las clases</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>{n.nombre}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setVerTodos((v) => !v)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${verTodos ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
            >
              {verTodos ? 'Ver por mes' : 'Ver todos'}
            </button>
            {/* Toggle de vista */}
            <div className="ml-auto flex overflow-hidden rounded-xl border-2 border-ink/10">
              <button
                type="button"
                onClick={() => setVista('tarjetas')}
                className={`px-3 py-1.5 text-sm font-bold ${vista === 'tarjetas' ? 'bg-sky-400 text-white' : 'bg-white text-ink/40 hover:bg-ink/5'}`}
                title="Vista tarjetas"
              >
                ▦
              </button>
              <button
                type="button"
                onClick={() => setVista('lista')}
                className={`px-3 py-1.5 text-sm font-bold ${vista === 'lista' ? 'bg-sky-400 text-white' : 'bg-white text-ink/40 hover:bg-ink/5'}`}
                title="Vista lista"
              >
                ☰
              </button>
            </div>
          </div>

          {/* ═══ Vista tarjetas ═══ */}
          {vista === 'tarjetas' && devocionalesFiltrados.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {devocionalesFiltrados.map((d) => (
                <div
                  key={d.id}
                  className="card group cursor-pointer overflow-hidden !p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
                  onClick={() => navigate(`/devocionales/${d.id}`)}
                >
                  {/* Imagen o header con color */}
                  {d.imagen_url ? (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={d.imagen_url}
                        alt={d.titulo}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-base font-bold text-white drop-shadow">{d.titulo}</h3>
                        <p className="text-xs font-bold text-white/70">{formatFecha(d.fecha)}</p>
                      </div>
                      {d.activo && (
                        <span className="badge absolute left-2 top-2 bg-sunshine-200/90 text-sunshine-800 shadow-sm">⭐ Activo</span>
                      )}
                    </div>
                  ) : (
                    <div className="relative flex h-32 flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-grape-50">
                      <span className="text-5xl">🙏</span>
                      {d.activo && (
                        <span className="badge absolute left-2 top-2 bg-sunshine-200/90 text-sunshine-800 shadow-sm">⭐ Activo</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 p-4">
                    {/* Título (si no hay imagen) */}
                    {!d.imagen_url && (
                      <>
                        <h3 className="text-base font-bold">{d.titulo}</h3>
                        <p className="text-xs text-ink/40">{formatFecha(d.fecha)}</p>
                      </>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {d.nivel?.nombre && <span className="badge bg-sky-100 text-sky-700">{d.nivel.nombre}</span>}
                    </div>

                    {/* Versículo */}
                    {d.versiculo && (
                      <p className="truncate text-xs italic text-ink/50">📖 &ldquo;{d.versiculo}&rdquo;</p>
                    )}

                    {/* Preview del contenido */}
                    {d.contenido && (
                      <p className="text-xs leading-relaxed text-ink/40" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {previewTexto(d.contenido, 120)}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-1 flex items-center justify-between border-t border-ink/5 pt-2">
                      <span className="text-xs font-bold text-coral-500">{d.devocional_reacciones?.length || 0} ❤️</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {puedeCrear && (
                          <button
                            onClick={() => (d.activo ? quitarActivo(d) : marcarActivo(d))}
                            className="text-sm text-ink/30 hover:text-sunshine-500"
                            title={d.activo ? 'Quitar activo' : 'Marcar activo'}
                          >
                            {d.activo ? '⭐' : '☆'}
                          </button>
                        )}
                        {puedeCrear && (
                          <button onClick={() => openEdit(d)} className="text-sm text-ink/30 hover:text-sky-500" title="Editar">
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ Vista lista ═══ */}
          {vista === 'lista' && devocionalesFiltrados.length > 0 && (
            <div className="card divide-y divide-ink/5 !p-0">
              {devocionalesFiltrados.map((d) => (
                <div
                  key={d.id}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-sky-50/50 ${d.activo ? 'border-l-4 border-sunshine-400 bg-sunshine-50/50' : ''}`}
                  onClick={() => navigate(`/devocionales/${d.id}`)}
                >
                  {/* Thumbnail */}
                  {d.imagen_url ? (
                    <img src={d.imagen_url} alt={d.titulo} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-2xl">🙏</div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold hover:text-sky-600 sm:text-base">{d.titulo}</p>
                      {d.activo && <span className="badge bg-sunshine-200 text-sunshine-800">⭐ Activo</span>}
                      {d.nivel?.nombre && <span className="badge bg-sky-100 text-sky-700">{d.nivel.nombre}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-ink/40">{formatFecha(d.fecha)}</p>
                    {d.versiculo && <p className="mt-1 truncate text-xs italic text-ink/50">📖 &ldquo;{d.versiculo}&rdquo;</p>}
                    {d.contenido && (
                      <p className="mt-0.5 truncate text-xs text-ink/40">{previewTexto(d.contenido, 80)}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs font-bold text-coral-500">{d.devocional_reacciones?.length || 0} ❤️</span>
                    {puedeCrear && (
                      <button
                        className="btn-secondary !py-1 !px-3 !text-xs"
                        onClick={() => (d.activo ? quitarActivo(d) : marcarActivo(d))}
                      >
                        {d.activo ? 'Quitar activo' : '⭐ Marcar activo'}
                      </button>
                    )}
                    {puedeCrear && (
                      <button onClick={() => openEdit(d)} className="text-lg text-ink/30 hover:text-sky-500" title="Editar">
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ Empty states ═══ */}
          {devocionales.length === 0 && (
            <div className="card flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-6xl">🙏</span>
              <p className="text-lg font-bold text-ink/50">
                {verTodos ? 'Todavía no hay devocionales publicados' : 'No hay devocionales este mes'}
              </p>
              <p className="text-sm text-ink/30">
                {puedeCrear ? 'Crea el primer devocional para los niños' : 'Pronto se publicarán nuevos devocionales'}
              </p>
              {puedeCrear && (
                <button className="btn-primary mt-2" onClick={openNew}>+ Nuevo devocional</button>
              )}
            </div>
          )}
          {devocionales.length > 0 && devocionalesFiltrados.length === 0 && (
            <div className="card flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-ink/50">No hay devocionales que coincidan con &ldquo;{busqueda}&rdquo;</p>
            </div>
          )}

          {/* ═══ Modal de crear/editar ═══ */}
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar devocional' : 'Nuevo devocional'} wide>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* ═══ Sección: Contenido ═══ */}
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-ink/30">
                  🙏 Contenido
                </legend>
                <div>
                  <label className="label">Título</label>
                  <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                </div>
                <div>
                  <label className="label">Versículo (opcional)</label>
                  <input
                    className="input"
                    placeholder='Ej. "Todo lo puedo en Cristo..." — Filipenses 4:13'
                    value={form.versiculo}
                    onChange={(e) => setForm({ ...form, versiculo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Reflexión para el niño/a</label>
                  <RichTextEditor
                    value={form.contenido}
                    onChange={(html) => setForm({ ...form, contenido: html })}
                    placeholder="Escribe algo corto y sencillo que un niño pueda entender..."
                  />
                </div>
              </fieldset>

              <hr className="border-ink/5" />

              {/* ═══ Sección: Detalles ═══ */}
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-ink/30">
                  📋 Detalles
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Fecha</label>
                    <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Clase (opcional)</label>
                    <select className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
                      <option value="">Para todas las clases</option>
                      {niveles.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nombre}
                        </option>
                      ))}
                    </select>
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
                    {(preview || (editing && editing.imagen_url)) ? (
                      <img src={preview || editing.imagen_url} alt="" className="h-36 w-full rounded-xl object-cover" />
                    ) : (
                      <>
                        <span className="text-3xl">📷</span>
                        <span className="text-sm font-bold text-ink/40 group-hover:text-sky-600">Toca para seleccionar una imagen</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImagen} />
                    {(preview || (editing && editing.imagen_url)) && (
                      <span className="text-xs font-bold text-sky-600">Cambiar imagen</span>
                    )}
                  </label>
                </div>
                <div>
                  <label className="label">Video o enlace externo (opcional)</label>
                  <input
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
                  <label className="label">{editing ? 'Agregar más materiales' : 'Materiales para descargar (opcional)'}</label>
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
                      tabla="devocional_archivos"
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
                {busy ? 'Guardando...' : editing ? '✓ Guardar cambios' : '🚀 Publicar devocional'}
              </button>
            </form>
          </Modal>

          <DrivePicker
            open={drivePickerOpen}
            onClose={() => setDrivePickerOpen(false)}
            onSelect={(files) => setArchivosDrive([...archivosDrive, ...files])}
          />
        </>
      )}
    </div>
  )
}
