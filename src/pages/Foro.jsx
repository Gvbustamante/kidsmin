import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { coincide } from '../lib/busqueda'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

export default function Foro() {
  const { user, profile } = useAuth()
  const esStaff = ['admin', 'coordinador'].includes(profile.role)
  const esStaffAmplio = ['admin', 'coordinador', 'docente'].includes(profile.role)

  const [tabPrincipal, setTabPrincipal] = useState('foro')
  const [busqueda, setBusqueda] = useState('')

  const [foros, setForos] = useState(null)
  const [eventos, setEventos] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [mensajes, setMensajes] = useState(null)
  const [nuevoMensaje, setNuevoMensaje] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', categoria: 'general', evento_id: '', privado: false })
  const [busy, setBusy] = useState(false)

  const [peticiones, setPeticiones] = useState(null)
  const [formPeticion, setFormPeticion] = useState({ texto: '', privado: true })
  const [busyPeticion, setBusyPeticion] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('foros')
      .select('*, creador:profiles(nombre_completo), evento:agenda(titulo), mensajes:foro_mensajes(count)')
      .order('created_at', { ascending: false })
    setForos(data || [])
  }, [])

  const cargarPeticiones = useCallback(async () => {
    const { data } = await supabase
      .from('peticiones_oracion')
      .select('*, autor:profiles(nombre_completo)')
      .order('created_at', { ascending: false })
    setPeticiones(data || [])
  }, [])

  useEffect(() => {
    load()
    cargarPeticiones()
    supabase.from('agenda').select('id, titulo, fecha').gte('fecha', new Date().toISOString().slice(0, 10)).order('fecha').then(({ data }) => setEventos(data || []))
  }, [load, cargarPeticiones])

  async function abrirForo(foro) {
    setSeleccionado(foro)
    setMensajes(null)
    const { data } = await supabase
      .from('foro_mensajes')
      .select('*, autor:profiles(nombre_completo, role)')
      .eq('foro_id', foro.id)
      .order('created_at')
    setMensajes(data || [])
  }

  function openNew() {
    setForm({ titulo: '', categoria: 'general', evento_id: '', privado: false })
    setModalOpen(true)
  }

  async function crearForo(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('foros').insert({
      titulo: form.titulo,
      categoria: form.categoria,
      evento_id: form.categoria === 'evento' ? form.evento_id || null : null,
      privado: form.privado,
      creado_por: user.id,
    })
    setBusy(false)
    setModalOpen(false)
    load()
  }

  async function cambiarPrivacidadForo(foro) {
    await supabase.from('foros').update({ privado: !foro.privado }).eq('id', foro.id)
    load()
  }

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!nuevoMensaje.trim()) return
    await supabase.from('foro_mensajes').insert({ foro_id: seleccionado.id, autor_id: user.id, mensaje: nuevoMensaje.trim() })
    setNuevoMensaje('')
    abrirForo(seleccionado)
  }

  async function borrarForo(id) {
    await supabase.from('foros').delete().eq('id', id)
    setSeleccionado(null)
    load()
  }

  async function borrarMensaje(id) {
    await supabase.from('foro_mensajes').delete().eq('id', id)
    abrirForo(seleccionado)
  }

  async function crearPeticion(e) {
    e.preventDefault()
    if (!formPeticion.texto.trim()) return
    setBusyPeticion(true)
    await supabase.from('peticiones_oracion').insert({
      autor_id: user.id,
      texto: formPeticion.texto.trim(),
      privado: formPeticion.privado,
    })
    setBusyPeticion(false)
    setFormPeticion({ texto: '', privado: true })
    cargarPeticiones()
  }

  async function cambiarPrivacidad(peticion) {
    await supabase.from('peticiones_oracion').update({ privado: !peticion.privado }).eq('id', peticion.id)
    cargarPeticiones()
  }

  async function borrarPeticion(id) {
    await supabase.from('peticiones_oracion').delete().eq('id', id)
    cargarPeticiones()
  }

  if (!foros || !peticiones) return <Spinner />

  const forosFiltrados = foros.filter((f) => coincide(busqueda, f.titulo, f.creador?.nombre_completo, f.evento?.titulo))
  const peticionesFiltradas = peticiones.filter((p) => coincide(busqueda, p.texto, p.autor?.nombre_completo))

  if (seleccionado) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={() => setSeleccionado(null)} className="mb-2 text-sm font-bold text-sky-500 hover:underline">
              ← Volver a Nuestra comunidad
            </button>
            <h1 className="text-2xl font-bold">{seleccionado.titulo}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {seleccionado.evento?.titulo && (
                <span className="badge bg-sunshine-100 text-sunshine-700">📅 {seleccionado.evento.titulo}</span>
              )}
              <span className={`badge ${seleccionado.privado ? 'bg-grape-100 text-grape-700' : 'bg-grass-100 text-grass-700'}`}>
                {seleccionado.privado ? '🔒 Privado' : '🌍 Público'}
              </span>
              {(esStaff || seleccionado.creado_por === user.id) && (
                <button
                  onClick={async () => {
                    await cambiarPrivacidadForo(seleccionado)
                    setSeleccionado({ ...seleccionado, privado: !seleccionado.privado })
                  }}
                  className="text-xs font-bold text-sky-500 hover:underline"
                >
                  cambiar
                </button>
              )}
            </div>
          </div>
          {(esStaff || seleccionado.creado_por === user.id) && (
            <button onClick={() => borrarForo(seleccionado.id)} className="text-2xl text-ink/30 hover:text-coral-500">
              🗑️
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!mensajes ? (
            <Spinner />
          ) : (
            <>
              {mensajes.map((m) => (
                <div key={m.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{m.autor?.nombre_completo}</p>
                      <p className="text-xs text-ink/40">{new Date(m.created_at).toLocaleString('es')}</p>
                    </div>
                    {(esStaff || m.autor_id === user.id) && (
                      <button onClick={() => borrarMensaje(m.id)} className="text-lg text-ink/30 hover:text-coral-500">
                        🗑️
                      </button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-ink/70">{m.mensaje}</p>
                </div>
              ))}
              {mensajes.length === 0 && <p className="card text-ink/50">Sé el primero en escribir en este tema.</p>}
            </>
          )}
        </div>

        <form onSubmit={enviarMensaje} className="card flex flex-col gap-3">
          <textarea
            className="input"
            rows={3}
            placeholder="Escribe tu mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <button className="btn-primary self-end">Enviar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Nuestra comunidad 🤝</h1>
        <p className="text-ink/50">Conversemos y oremos los unos por los otros</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setTabPrincipal('foro')
            setBusqueda('')
          }}
          className={`rounded-full px-4 py-2 text-xs font-bold sm:px-5 sm:text-sm ${tabPrincipal === 'foro' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          💬 Foro
        </button>
        <button
          onClick={() => {
            setTabPrincipal('oracion')
            setBusqueda('')
          }}
          className={`rounded-full px-4 py-2 text-xs font-bold sm:px-5 sm:text-sm ${tabPrincipal === 'oracion' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          🙏 Peticiones de oración
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="input max-w-xs"
          placeholder={tabPrincipal === 'foro' ? 'Buscar tema...' : 'Buscar petición...'}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {tabPrincipal === 'foro' && (
          <button className="btn-primary" onClick={openNew}>
            + Nuevo tema
          </button>
        )}
      </div>

      {tabPrincipal === 'foro' ? (
        <>
          <div className="flex flex-col gap-3">
            {forosFiltrados.map((f) => (
              <button key={f.id} onClick={() => abrirForo(f)} className="card-link flex items-center justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{f.titulo}</h3>
                    {f.categoria === 'evento' && <span className="badge bg-sunshine-100 text-sunshine-700">📅 Evento</span>}
                    {f.privado && <span className="badge bg-grape-100 text-grape-700">🔒 Privado</span>}
                  </div>
                  <p className="text-sm text-ink/50">
                    {f.creador?.nombre_completo} {f.evento?.titulo && `· ${f.evento.titulo}`}
                  </p>
                </div>
                <span className="badge bg-sky-100 text-sky-700">{f.mensajes?.[0]?.count ?? 0} 💬</span>
              </button>
            ))}
            {foros.length === 0 && (
              <p className="card text-ink/50">
                {esStaffAmplio ? 'Todavía no hay temas. ¡Crea el primero!' : 'Todavía no hay temas visibles para ti.'}
              </p>
            )}
            {foros.length > 0 && forosFiltrados.length === 0 && <p className="card text-ink/50">No hay temas que coincidan con "{busqueda}".</p>}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={crearPeticion} className="card flex flex-col gap-3">
            <label className="label">Nueva petición de oración</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Cuéntanos qué necesitas que oremos contigo..."
              value={formPeticion.texto}
              onChange={(e) => setFormPeticion({ ...formPeticion, texto: e.target.value })}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormPeticion({ ...formPeticion, privado: true })}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-bold sm:flex-none sm:px-4 sm:text-sm ${formPeticion.privado ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
                >
                  🔒 Privado (equipo)
                </button>
                <button
                  type="button"
                  onClick={() => setFormPeticion({ ...formPeticion, privado: false })}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-bold sm:flex-none sm:px-4 sm:text-sm ${!formPeticion.privado ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
                >
                  🌍 Público (comunidad)
                </button>
              </div>
              <button disabled={busyPeticion} className="btn-primary">
                {busyPeticion ? 'Enviando...' : 'Enviar petición'}
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            {peticionesFiltradas.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{p.autor?.nombre_completo}</p>
                    <p className="text-xs text-ink/40">{new Date(p.created_at).toLocaleString('es')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${p.privado ? 'bg-grape-100 text-grape-700' : 'bg-grass-100 text-grass-700'}`}>
                      {p.privado ? '🔒 Privado' : '🌍 Público'}
                    </span>
                    {(esStaff || p.autor_id === user.id) && (
                      <button onClick={() => cambiarPrivacidad(p)} className="text-sm font-bold text-sky-500 hover:underline">
                        cambiar
                      </button>
                    )}
                    {(esStaff || p.autor_id === user.id) && (
                      <button onClick={() => borrarPeticion(p.id)} className="text-lg text-ink/30 hover:text-coral-500">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-ink/70">🙏 {p.texto}</p>
              </div>
            ))}
            {peticiones.length === 0 && (
              <p className="card text-ink/50">
                {esStaffAmplio ? 'Todavía no hay peticiones de oración.' : 'Todavía no hay peticiones de oración públicas.'}
              </p>
            )}
            {peticiones.length > 0 && peticionesFiltradas.length === 0 && (
              <p className="card text-ink/50">No hay peticiones que coincidan con "{busqueda}".</p>
            )}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo tema">
        <form onSubmit={crearForo} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, categoria: 'general' })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.categoria === 'general' ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, categoria: 'evento' })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.categoria === 'evento' ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                De un evento
              </button>
            </div>
          </div>
          {form.categoria === 'evento' && (
            <div>
              <label className="label">Evento</label>
              <select className="input" value={form.evento_id} onChange={(e) => setForm({ ...form, evento_id: e.target.value })}>
                <option value="">Elige un evento...</option>
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo} ({e.fecha})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Quién lo puede ver</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, privado: false })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${!form.privado ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                🌍 Público (toda la comunidad)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, privado: true })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.privado ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                🔒 Privado (solo el equipo)
              </button>
            </div>
          </div>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Creando...' : 'Crear tema'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
