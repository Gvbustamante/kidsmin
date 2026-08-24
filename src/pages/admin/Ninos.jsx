import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { crearUsuario } from '../../lib/invite'
import { useAuth } from '../../contexts/AuthContext'
import { usePermisosRol } from '../../lib/permisosRol'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import DetalleNinoModal from '../../components/DetalleNinoModal'
import Avatar from '../../components/Avatar'
import Clases from './Clases'
import { BADGE_CLASSES } from '../../lib/colors'
import { whatsappLink } from '../../lib/whatsapp'
import { exportExcel } from '../../lib/exportExcel'
import { generarCodigoFacil } from '../../lib/codigoFacil'

const STAFF = ['admin', 'coordinador']

function calcularEdad(fecha) {
  if (!fecha) return '—'
  const nacimiento = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

export default function Ninos() {
  const { profile, user } = useAuth()
  const esStaff = STAFF.includes(profile.role)
  const esDocente = profile.role === 'docente'
  const [tab, setTab] = useState('ninos')
  const { tiene } = usePermisosRol()
  const puedeEditar = esStaff || (esDocente && tiene('docente', 'editar_ninos'))
  const puedeAgregar = esStaff || (esDocente && tiene('docente', 'agregar_ninos'))
  const puedeVincularPadre = esStaff || (esDocente && tiene('docente', 'vincular_padres'))

  const [ninos, setNinos] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [padresPorNino, setPadresPorNino] = useState({})
  const [misNivelIds, setMisNivelIds] = useState(null)
  const [filtro, setFiltro] = useState('activos')
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre_completo: '', fecha_nacimiento: '', nivel_id: '', alergias: '', notas: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [inviteModal, setInviteModal] = useState(null)
  const [modoVinculo, setModoVinculo] = useState('nueva')
  const [inviteForm, setInviteForm] = useState({ cedula: '', nombre_completo: '', parentesco: '' })
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [creado, setCreado] = useState(null)
  const [todosPerfiles, setTodosPerfiles] = useState([])
  const [busquedaPerfil, setBusquedaPerfil] = useState('')
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null)
  const [parentescoExistente, setParentescoExistente] = useState('')

  const [detalleNino, setDetalleNino] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmDesvincular, setConfirmDesvincular] = useState(null) // { nino, padre }

  const load = useCallback(async () => {
    const queries = [
      supabase.from('ninos').select('*').order('nombre_completo'),
      supabase.from('niveles').select('*').eq('activo', true),
      supabase.from('ninos_padres').select('nino_id, parentesco, padre:profiles(id, nombre_completo, telefono, pausado)'),
    ]
    if (esDocente) queries.push(supabase.from('docentes_niveles').select('nivel_id').eq('docente_id', user.id))
    const [{ data: n }, { data: niv }, { data: np }, misAsig] = await Promise.all(queries)
    setNinos(n || [])
    setNiveles(niv || [])
    const grouped = {}
    ;(np || []).forEach((row) => {
      grouped[row.nino_id] = grouped[row.nino_id] || []
      grouped[row.nino_id].push(row)
    })
    setPadresPorNino(grouped)
    if (esDocente) setMisNivelIds(new Set((misAsig?.data || []).map((a) => a.nivel_id)))
  }, [esDocente, user.id])

  useEffect(() => {
    load()
  }, [load])

  const nivelesById = useMemo(() => Object.fromEntries(niveles.map((n) => [n.id, n])), [niveles])

  const ninosVisibles = useMemo(() => {
    if (!ninos) return []
    return esDocente ? ninos.filter((n) => misNivelIds?.has(n.nivel_id)) : ninos
  }, [ninos, esDocente, misNivelIds])

  const filtrados = useMemo(() => {
    return ninosVisibles
      .filter((n) => (filtro === 'activos' ? n.activo : filtro === 'inactivos' ? !n.activo : true))
      .filter((n) => n.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()))
  }, [ninosVisibles, filtro, busqueda])

  function openNew() {
    setEditing(null)
    setForm({ nombre_completo: '', fecha_nacimiento: '', nivel_id: '', alergias: '', notas: '' })
    setError('')
    setModalOpen(true)
  }

  function openEdit(nino) {
    setEditing(nino)
    setForm({
      nombre_completo: nino.nombre_completo,
      fecha_nacimiento: nino.fecha_nacimiento || '',
      nivel_id: nino.nivel_id || '',
      alergias: nino.alergias || '',
      notas: nino.notas || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      nombre_completo: form.nombre_completo,
      fecha_nacimiento: form.fecha_nacimiento || null,
      nivel_id: form.nivel_id || null,
      alergias: form.alergias || null,
      notas: form.notas || null,
    }
    const { error } = editing
      ? await supabase.from('ninos').update(payload).eq('id', editing.id)
      : await supabase.from('ninos').insert(payload)

    setBusy(false)
    if (error) return setError(error.message)
    setModalOpen(false)
    load()
  }

  async function toggleActivo(nino) {
    await supabase.from('ninos').update({ activo: !nino.activo }).eq('id', nino.id)
    load()
  }

  async function togglePausado(nino) {
    await supabase.from('ninos').update({ pausado: !nino.pausado }).eq('id', nino.id)
    load()
  }

  function exportar() {
    const filas = filtrados.map((nino) => {
      const nivel = nivelesById[nino.nivel_id]
      const padres = padresPorNino[nino.id] || []
      return [
        nino.nombre_completo,
        calcularEdad(nino.fecha_nacimiento),
        nivel?.nombre || '',
        nino.alergias || '',
        padres.map((p) => p.padre?.nombre_completo).filter(Boolean).join(' / '),
        nino.activo ? 'Activo' : 'Inactivo',
        nino.pausado ? 'Sí' : 'No',
      ]
    })
    exportExcel('ninos', ['Nombre', 'Edad', 'Clase', 'Alergias', 'Padres/encargados', 'Estado', 'Pausado'], filas)
  }

  function handleToggleClick(nino) {
    if (nino.activo) {
      setConfirmDesactivar(nino)
    } else {
      toggleActivo(nino)
    }
  }

  async function confirmarDesactivar() {
    setConfirmBusy(true)
    await toggleActivo(confirmDesactivar)
    setConfirmBusy(false)
    setConfirmDesactivar(null)
  }

  function pedirDesvincular(nino, padre) {
    setConfirmDesvincular({ nino, padre })
  }

  async function confirmarDesvincular() {
    if (!confirmDesvincular) return
    setConfirmBusy(true)
    await supabase
      .from('ninos_padres')
      .delete()
      .eq('nino_id', confirmDesvincular.nino.id)
      .eq('padre_id', confirmDesvincular.padre.id)
    setConfirmBusy(false)
    setConfirmDesvincular(null)
    load()
  }

  function openInvite(nino) {
    setInviteModal(nino)
    setModoVinculo('nueva')
    setInviteForm({ cedula: '', nombre_completo: '', parentesco: '' })
    setInviteMsg('')
    setCreado(null)
    setBusquedaPerfil('')
    setPerfilSeleccionado(null)
    setParentescoExistente('')
    supabase.from('profiles').select('*').order('nombre_completo').then(({ data }) => setTodosPerfiles(data || []))
  }

  async function handleInviteNueva(e) {
    e.preventDefault()
    setInviteBusy(true)
    setInviteMsg('')
    try {
      const { password } = await crearUsuario({
        cedula: inviteForm.cedula,
        nombre_completo: inviteForm.nombre_completo,
        role: 'padre',
        nino_id: inviteModal.id,
        parentesco: inviteForm.parentesco,
      })
      setCreado({ cedula: inviteForm.cedula, password, nombre: inviteForm.nombre_completo })
      load()
    } catch (err) {
      setInviteMsg('❌ ' + err.message)
    }
    setInviteBusy(false)
  }

  async function handleVincularExistente(e) {
    e.preventDefault()
    if (!perfilSeleccionado) return
    setInviteBusy(true)
    setInviteMsg('')
    const { error } = await supabase.from('ninos_padres').insert({
      nino_id: inviteModal.id,
      padre_id: perfilSeleccionado.id,
      parentesco: parentescoExistente || null,
    })
    setInviteBusy(false)
    if (error) {
      setInviteMsg('❌ ' + error.message)
      return
    }
    setInviteMsg(`✅ ${perfilSeleccionado.nombre_completo} vinculado/a como padre/madre.`)
    load()
  }

  const yaVinculadosIds = new Set((padresPorNino[inviteModal?.id] || []).map((p) => p.padre?.id).filter(Boolean))
  const perfilesFiltrados = todosPerfiles
    .filter((p) => !yaVinculadosIds.has(p.id))
    .filter(
      (p) =>
        p.nombre_completo.toLowerCase().includes(busquedaPerfil.toLowerCase()) ||
        (p.cedula || '').includes(busquedaPerfil),
    )
    .slice(0, 8)

  if (!ninos) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Niños 🧒</h1>
          <p className="text-ink/50">
            {tab === 'ninos' ? `${filtrados.length} de ${ninosVisibles.length} en total` : 'Niveles por edad de tu escuelita'}
          </p>
        </div>
        {tab === 'ninos' && esStaff && (
          <button className="btn-secondary" onClick={exportar}>
            📊 Exportar
          </button>
        )}
        {tab === 'ninos' && puedeAgregar && (
          <button className="btn-primary" onClick={openNew}>
            + Nuevo niño/a
          </button>
        )}
      </div>

      {esStaff && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('ninos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'ninos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            🧒 Niños
          </button>
          <button
            type="button"
            onClick={() => setTab('clases')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'clases' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            🎒 Clases
          </button>
        </div>
      )}

      {tab === 'clases' && esStaff ? (
        <Clases />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="flex gap-2">
          {[
            ['activos', 'Activos'],
            ['inactivos', 'Inactivos'],
            ['todos', 'Todos'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${filtro === v ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-sm font-bold uppercase text-ink/50">
              <tr>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Nombre</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Edad</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Clase</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Alergias</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Padres/encargados</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Estado</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((nino) => {
                const nivel = nivelesById[nino.nivel_id]
                const padres = padresPorNino[nino.id] || []
                return (
                  <tr key={nino.id} className={`border-t border-ink/5 ${!nino.activo || nino.pausado ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-bold">
                      <div className="flex items-center gap-2">
                        <Avatar nombre={nino.nombre_completo} size="sm" />
                        <span>{nino.nombre_completo}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">{calcularEdad(nino.fecha_nacimiento)}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      {nivel ? (
                        <span className={`badge ${BADGE_CLASSES[nivel.color] || BADGE_CLASSES.sky}`}>{nivel.nombre}</span>
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">
                      {nino.alergias ? <span className="font-bold text-coral-600">⚠️ {nino.alergias}</span> : '—'}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">
                      {padres.length === 0 ? (
                        'Sin vincular'
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {padres.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1">
                              {p.padre?.nombre_completo}
                              {whatsappLink(p.padre?.telefono) && (
                                <a href={whatsappLink(p.padre.telefono)} target="_blank" rel="noreferrer" title="Abrir WhatsApp">
                                  💬
                                </a>
                              )}
                              {i < padres.length - 1 && ','}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`badge ${nino.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                          {nino.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {nino.pausado && <span className="badge bg-ink/10 text-ink/50">⏸️ Pausado</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => setDetalleNino(nino)}>
                          👁️ Ver detalle
                        </button>
                        {puedeEditar && (
                          <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => openEdit(nino)}>
                            ✏️ Editar
                          </button>
                        )}
                        {puedeVincularPadre && (
                          <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => openInvite(nino)}>
                            👪 + Padre
                          </button>
                        )}
                        {esStaff && (
                          <>
                            <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => togglePausado(nino)}>
                              {nino.pausado ? '▶️ Reanudar' : '⏸️ Pausar'}
                            </button>
                            <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => handleToggleClick(nino)}>
                              {nino.activo ? '🚫 Desactivar' : '✅ Activar'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink/40">
                    No hay niños que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar niño/a' : 'Nuevo niño/a'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre completo</label>
            <input
              required
              className="input"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input
                type="date"
                className="input"
                value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Clase</label>
              <select
                className="input"
                value={form.nivel_id}
                onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}
              >
                <option value="">Sin asignar</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Alergias / condiciones</label>
            <input
              className="input"
              value={form.alergias}
              onChange={(e) => setForm({ ...form, alergias: e.target.value })}
              placeholder="Ej. Alergia al maní"
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              className="input"
              rows={3}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>

      <Modal open={!!inviteModal} onClose={() => setInviteModal(null)} title={`Padre/madre de ${inviteModal?.nombre_completo || ''}`}>
        {creado ? (
          <div className="flex flex-col gap-4 text-center">
            <span className="text-4xl">✅</span>
            <p className="font-bold">Cuenta creada para {creado.nombre}</p>
            <div className="rounded-chunky bg-grass-50 p-4">
              <p className="text-xs font-extrabold uppercase text-ink/40">Cédula (usuario)</p>
              <p className="text-xl font-extrabold text-grass-700">{creado.cedula}</p>
              <p className="mt-2 text-xs font-extrabold uppercase text-ink/40">Contraseña</p>
              <p className="text-xl font-extrabold text-grass-700">{creado.password}</p>
            </div>
            <p className="text-sm text-ink/50">Comunícale estos datos para que pueda entrar.</p>
            <button className="btn-primary justify-center" onClick={() => setInviteModal(null)}>
              Listo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModoVinculo('nueva')}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${modoVinculo === 'nueva' ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                Crear cuenta nueva
              </button>
              <button
                type="button"
                onClick={() => setModoVinculo('existente')}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${modoVinculo === 'existente' ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                Ya tiene cuenta
              </button>
            </div>

            {modoVinculo === 'nueva' ? (
              <form onSubmit={handleInviteNueva} className="flex flex-col gap-4">
                <div>
                  <label className="label">Nombre del padre/madre</label>
                  <input
                    required
                    className="input"
                    value={inviteForm.nombre_completo}
                    onChange={(e) => setInviteForm({ ...inviteForm, nombre_completo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Cédula (o un código fácil, si no la sabes)</label>
                  <div className="flex gap-2">
                    <input
                      required
                      className="input"
                      value={inviteForm.cedula}
                      onChange={(e) => setInviteForm({ ...inviteForm, cedula: e.target.value })}
                      placeholder="Ej. 001-1234567-8"
                    />
                    <button
                      type="button"
                      onClick={() => setInviteForm({ ...inviteForm, cedula: generarCodigoFacil(inviteModal?.nombre_completo) })}
                      className="btn-secondary shrink-0 !px-3 !text-sm"
                    >
                      🎲 Generar
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-ink/40">
                    No siempre es la mamá o el papá quien recoge al niño/a. Si no sabes su cédula, genera un código
                    fácil y úsalo como usuario — funciona igual.
                  </p>
                </div>
                <div>
                  <label className="label">Parentesco</label>
                  <input
                    className="input"
                    placeholder="Mamá, papá, abuela..."
                    value={inviteForm.parentesco}
                    onChange={(e) => setInviteForm({ ...inviteForm, parentesco: e.target.value })}
                  />
                </div>
                {inviteMsg && <p className="text-sm font-bold">{inviteMsg}</p>}
                <button disabled={inviteBusy} className="btn-primary justify-center">
                  {inviteBusy ? 'Creando...' : 'Crear cuenta'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVincularExistente} className="flex flex-col gap-4">
                <p className="text-sm text-ink/50">
                  Para cuando el padre/madre ya es docente, coordinador/a, o ya tiene cuenta con otro hijo/a.
                </p>
                <div>
                  <label className="label">Buscar por nombre o cédula</label>
                  <input
                    className="input"
                    value={busquedaPerfil}
                    onChange={(e) => {
                      setBusquedaPerfil(e.target.value)
                      setPerfilSeleccionado(null)
                    }}
                    placeholder="Escribe para buscar..."
                  />
                </div>
                {busquedaPerfil && !perfilSeleccionado && (
                  <div className="flex max-h-40 flex-col overflow-y-auto rounded-2xl border-2 border-ink/10">
                    {perfilesFiltrados.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setPerfilSeleccionado(p)
                          setBusquedaPerfil(p.nombre_completo)
                        }}
                        className="flex items-center justify-between px-3 py-2 text-left text-sm font-bold hover:bg-sky-50"
                      >
                        <span>{p.nombre_completo}</span>
                        <span className="text-xs font-normal text-ink/40">{p.role}</span>
                      </button>
                    ))}
                    {perfilesFiltrados.length === 0 && (
                      <p className="px-3 py-2 text-sm text-ink/40">Sin resultados.</p>
                    )}
                  </div>
                )}
                {perfilSeleccionado && (
                  <div>
                    <label className="label">Parentesco</label>
                    <input
                      className="input"
                      placeholder="Mamá, papá, abuela..."
                      value={parentescoExistente}
                      onChange={(e) => setParentescoExistente(e.target.value)}
                    />
                  </div>
                )}
                {inviteMsg && <p className="text-sm font-bold">{inviteMsg}</p>}
                <button disabled={inviteBusy || !perfilSeleccionado} className="btn-primary justify-center">
                  {inviteBusy ? 'Vinculando...' : 'Vincular'}
                </button>
              </form>
            )}
          </div>
        )}
      </Modal>

      <DetalleNinoModal
        nino={detalleNino}
        nivel={detalleNino ? nivelesById[detalleNino.nivel_id] : null}
        padres={detalleNino ? padresPorNino[detalleNino.id] || [] : []}
        open={!!detalleNino}
        onClose={() => setDetalleNino(null)}
        onSaved={load}
        onDesvincular={esStaff ? (padre) => pedirDesvincular(detalleNino, padre) : undefined}
      />

      <ConfirmModal
        open={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={confirmarDesactivar}
        busy={confirmBusy}
        title="¿Desactivar a este niño/a?"
        confirmLabel="Sí, desactivar"
        message={
          confirmDesactivar
            ? `${confirmDesactivar.nombre_completo} dejará de aparecer en las listas activas. Puedes reactivarlo/a cuando quieras.`
            : ''
        }
      />

      <ConfirmModal
        open={!!confirmDesvincular}
        onClose={() => setConfirmDesvincular(null)}
        onConfirm={confirmarDesvincular}
        busy={confirmBusy}
        title="¿Desvincular a este padre/madre?"
        confirmLabel="Sí, desvincular"
        message={
          confirmDesvincular
            ? `${confirmDesvincular.padre?.nombre_completo} ya no podrá ver ni gestionar la información de ${confirmDesvincular.nino?.nombre_completo}. Su cuenta sigue existiendo — puedes volver a vincularlo/a cuando quieras con "+ Padre".`
            : ''
        }
      />
    </div>
  )
}
