import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import AppLogo from '../../components/AppLogo'
import PermisosTab from '../../components/PermisosTab'
import CambiarPasswordModal from '../../components/CambiarPasswordModal'
import ConfigEstrellas from './ConfigEstrellas'
import { AyudaContenido } from '../Tutorial'
import { useConfigIglesia, refreshConfigIglesia } from '../../lib/configIglesia'

const DIAS_SEMANA = [
  { dia_semana: 0, label: 'Domingo' },
  { dia_semana: 1, label: 'Lunes' },
  { dia_semana: 2, label: 'Martes' },
  { dia_semana: 3, label: 'Miércoles' },
  { dia_semana: 4, label: 'Jueves' },
  { dia_semana: 5, label: 'Viernes' },
  { dia_semana: 6, label: 'Sábado' },
]

export default function Ajustes() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('general')
  const [pwOpen, setPwOpen] = useState(false)
  const config = useConfigIglesia()
  const [nombreIglesia, setNombreIglesia] = useState('')
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const inputRef = useRef(null)

  const [revisando, setRevisando] = useState(false)
  const [resultadoRevision, setResultadoRevision] = useState('')

  const [diasClase, setDiasClase] = useState(null)
  const [horarios, setHorarios] = useState(null)
  const [nuevoHorario, setNuevoHorario] = useState('')
  const [nuevoHorarioDia, setNuevoHorarioDia] = useState('')
  const [busyHorario, setBusyHorario] = useState(false)

  const loadHorarios = () => supabase.from('horarios').select('*').order('orden').then(({ data }) => setHorarios(data || []))

  useEffect(() => {
    supabase
      .from('dias_clase')
      .select('*')
      .order('dia_semana')
      .then(({ data }) => setDiasClase(data || []))
    loadHorarios()
  }, [])

  async function toggleDiaClase(dia_semana) {
    const actual = diasClase.find((d) => d.dia_semana === dia_semana)
    const nuevoActivo = !actual?.activo
    setDiasClase((prev) => prev.map((d) => (d.dia_semana === dia_semana ? { ...d, activo: nuevoActivo } : d)))
    await supabase.from('dias_clase').upsert({ dia_semana, activo: nuevoActivo }, { onConflict: 'dia_semana' })
  }

  async function agregarHorario(e) {
    e.preventDefault()
    if (!nuevoHorario.trim()) return
    setBusyHorario(true)
    const orden = (horarios.reduce((max, h) => Math.max(max, h.orden), 0) || 0) + 1
    await supabase
      .from('horarios')
      .insert({ nombre: nuevoHorario.trim(), orden, dia_semana: nuevoHorarioDia === '' ? null : Number(nuevoHorarioDia) })
    setNuevoHorario('')
    setNuevoHorarioDia('')
    setBusyHorario(false)
    loadHorarios()
  }

  async function toggleHorarioActivo(h) {
    await supabase.from('horarios').update({ activo: !h.activo }).eq('id', h.id)
    loadHorarios()
  }

  async function renombrarHorario(h, nombre) {
    if (!nombre.trim() || nombre === h.nombre) return
    await supabase.from('horarios').update({ nombre: nombre.trim() }).eq('id', h.id)
    loadHorarios()
  }

  async function cambiarDiaHorario(h, valor) {
    await supabase.from('horarios').update({ dia_semana: valor === '' ? null : Number(valor) }).eq('id', h.id)
    loadHorarios()
  }

  async function handleRevisarInactividad() {
    setRevisando(true)
    setResultadoRevision('')
    const { data, error: rpcError } = await supabase.rpc('revisar_inactividad')
    setRevisando(false)
    if (rpcError) {
      setResultadoRevision('❌ ' + rpcError.message)
      return
    }
    const fila = Array.isArray(data) ? data[0] : data
    setResultadoRevision(
      `✅ Se pausaron ${fila?.ninos_pausados ?? 0} niño(s) y ${fila?.padres_pausados ?? 0} cuenta(s) de padre/madre por inactividad.`,
    )
  }

  useEffect(() => {
    setNombreIglesia(config?.nombre_iglesia || '')
  }, [config])

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleGuardar() {
    setBusy(true)
    setError('')
    setOk('')

    let logo_url = config?.logo_url || null

    if (file) {
      const path = `logo-${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (upError) {
        setError(upError.message)
        setBusy(false)
        return
      }
      logo_url = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
    }

    const payload = { nombre_iglesia: nombreIglesia || null, logo_url, updated_at: new Date().toISOString() }
    const { error: saveError } = config?.id
      ? await supabase.from('config_iglesia').update(payload).eq('id', config.id)
      : await supabase.from('config_iglesia').insert(payload)

    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('¡Guardado! Los cambios ya se ven en toda la plataforma.')
    setFile(null)
    setPreview(null)
    await refreshConfigIglesia()
  }

  async function handleQuitarLogo() {
    if (!config?.id) return
    setBusy(true)
    setError('')
    setOk('')
    const { error: saveError } = await supabase
      .from('config_iglesia')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', config.id)
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('Logo quitado. Volviste al ícono por defecto.')
    setFile(null)
    setPreview(null)
    await refreshConfigIglesia()
  }

  if (config === null) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Ajustes ⚙️</h1>
        <p className="text-ink/50">Personaliza tu escuelita, tu cuenta, y consulta la ayuda</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('general')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'general' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          General
        </button>
        <button
          onClick={() => setTab('cuenta')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'cuenta' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Mi cuenta
        </button>
        <button
          onClick={() => setTab('ayuda')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'ayuda' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Ayuda
        </button>
        <button
          onClick={() => setTab('estrellas')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'estrellas' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          🌟 Estrellas
        </button>
        {profile.role === 'admin' && (
          <button
            onClick={() => setTab('permisos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'permisos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            Roles y permisos
          </button>
        )}
      </div>

      {tab === 'cuenta' && (
        <div className="card max-w-xl">
          <p className="label mb-1">Contraseña</p>
          <p className="mb-4 text-sm text-ink/50">Cambia la contraseña con la que entras a tu propia cuenta.</p>
          <button type="button" onClick={() => setPwOpen(true)} className="btn-secondary">
            🔑 Cambiar mi contraseña
          </button>
        </div>
      )}

      {tab === 'ayuda' && <AyudaContenido />}

      {tab === 'estrellas' && <ConfigEstrellas />}

      {tab === 'permisos' && profile.role === 'admin' && <PermisosTab />}

      {tab === 'general' && (
        <>
          <div className="card max-w-xl">
            <p className="label mb-3">Logo de la escuelita</p>

            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
                {preview ? (
                  <img src={preview} alt="Vista previa" className="h-16 w-16 object-contain" />
                ) : (
                  <AppLogo emojiClassName="text-5xl" imgClassName="h-16 w-16 object-contain" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary">
                  📷 Elegir imagen
                </button>
                {config?.logo_url && !preview && (
                  <button
                    type="button"
                    onClick={handleQuitarLogo}
                    disabled={busy}
                    className="text-sm font-bold text-coral-500 hover:underline"
                  >
                    Quitar logo y usar el ícono por defecto
                  </button>
                )}
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/50">
              Usa una imagen cuadrada de fondo transparente si puedes (PNG). Se verá en el menú, la pantalla de
              ingreso y la página pública.
            </p>

            <div className="mt-5">
              <label className="label">Nombre de la iglesia o escuelita (opcional)</label>
              <input
                className="input"
                value={nombreIglesia}
                onChange={(e) => setNombreIglesia(e.target.value)}
                placeholder="Ej. Escuelita Dominical Casa de Fe"
              />
            </div>

            {error && <p className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
            {ok && <p className="mt-3 rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}

            <button type="button" onClick={handleGuardar} disabled={busy} className="btn-primary mt-5 justify-center">
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

          <div className="card max-w-xl">
            <p className="label mb-1">Revisar inactividad</p>
            <p className="mb-4 text-sm text-ink/50">
              Pausa automáticamente a los niños sin asistencia hace más de 3 meses, y a los padres/madres que no han
              entrado en más de 2 meses. No borra nada — es reversible, y un padre se reactiva solo la próxima vez
              que entra. Tócalo cuando quieras (ej. cada domingo).
            </p>
            <button type="button" onClick={handleRevisarInactividad} disabled={revisando} className="btn-secondary">
              {revisando ? 'Revisando...' : '🔍 Revisar inactividad'}
            </button>
            {resultadoRevision && <p className="mt-3 text-sm font-bold text-ink/70">{resultadoRevision}</p>}
          </div>

          <div className="card max-w-xl">
            <p className="label mb-1">Días de clase</p>
            <p className="mb-4 text-sm text-ink/50">
              Qué días de la semana hay escuelita. Se usa en <strong>Planeación</strong> para saber qué días marcar
              en el calendario y pedirte cubrir cada clase.
            </p>
            {!diasClase ? (
              <p className="text-sm text-ink/40">Cargando...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => {
                  const activo = diasClase.find((x) => x.dia_semana === d.dia_semana)?.activo
                  return (
                    <button
                      key={d.dia_semana}
                      type="button"
                      onClick={() => toggleDiaClase(d.dia_semana)}
                      className={`rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${
                        activo ? 'bg-sky-400 text-white' : 'bg-ink/5 text-ink/50'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card max-w-xl">
            <p className="label mb-1">Horarios</p>
            <p className="mb-4 text-sm text-ink/50">
              Si el mismo día de clase hay más de un servicio (ej. 9:00 am y 11:00 am), agrégalos aquí. Con uno solo
              no necesitas tocar nada — ya viene creado por defecto. Si un horario es solo de un día (ej. los 3
              servicios son del domingo, pero el sábado solo hay uno), dile a cuál día pertenece para que Planeación
              y "Cobertura de hoy" no lo mezclen con los demás días.
            </p>
            {!horarios ? (
              <p className="text-sm text-ink/40">Cargando...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {horarios.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink/5 px-3 py-2">
                    <input
                      defaultValue={h.nombre}
                      onBlur={(e) => renombrarHorario(h, e.target.value)}
                      className="input !w-auto flex-1 !py-1.5 !text-sm"
                    />
                    <select
                      defaultValue={h.dia_semana ?? ''}
                      onChange={(e) => cambiarDiaHorario(h, e.target.value)}
                      className="input !w-auto !py-1.5 !text-sm"
                    >
                      <option value="">Todos los días</option>
                      {DIAS_SEMANA.map((d) => (
                        <option key={d.dia_semana} value={d.dia_semana}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleHorarioActivo(h)}
                      className={`badge shrink-0 ${h.activo ? 'bg-grass-100 text-grass-700' : 'bg-ink/10 text-ink/40'}`}
                    >
                      {h.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
                {horarios.length === 0 && <p className="text-sm text-ink/40">Aún no hay horarios.</p>}
              </div>
            )}
            <form onSubmit={agregarHorario} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="input flex-1"
                value={nuevoHorario}
                onChange={(e) => setNuevoHorario(e.target.value)}
                placeholder="Ej. 11:00 am"
              />
              <select
                value={nuevoHorarioDia}
                onChange={(e) => setNuevoHorarioDia(e.target.value)}
                className="input !w-auto"
              >
                <option value="">Todos los días</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d.dia_semana} value={d.dia_semana}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button disabled={busyHorario} className="btn-secondary shrink-0">
                {busyHorario ? 'Agregando...' : '+ Agregar horario'}
              </button>
            </form>
          </div>
        </>
      )}

      <CambiarPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
