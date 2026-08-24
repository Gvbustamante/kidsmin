import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import Materiales from './Materiales'
import MultiFilePicker from '../../components/MultiFilePicker'
import FotosGaleria from '../../components/FotosGaleria'
import { exportExcel } from '../../lib/exportExcel'

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function diasEnMes(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const MOMENTOS = [
  { value: 'antes', label: '🚪 Antes de clase', pregunta: '¿Cómo se encontró el salón?' },
  { value: 'despues', label: '🏁 Después de clase', pregunta: '¿Cómo se entrega el salón?' },
]

export default function BitacoraAdmin() {
  const [tab, setTab] = useState('bitacora')
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [mes, setMes] = useState(hoyYYYYMM())
  const [registros, setRegistros] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

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
    if (!nivelId) return
    setRegistros(null)
    const inicio = `${mes}-01`
    const fin = `${mes}-${String(diasEnMes(mes)).padStart(2, '0')}`
    const { data } = await supabase
      .from('bitacora_clase')
      .select('*, docente:profiles(nombre_completo), bitacora_fotos(*)')
      .eq('nivel_id', nivelId)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: false })
    setRegistros(data || [])
  }, [nivelId, mes])

  useEffect(() => {
    load()
  }, [load])

  function exportar() {
    const filas = (registros || []).map((r) => [
      r.fecha,
      r.momento === 'antes' ? 'Antes de clase' : 'Después de clase',
      r.docente?.nombre_completo || '',
      r.salon_ok ? 'En buen estado' : 'Hubo daños',
      r.refrigerio_detalle || '',
      r.notas || '',
    ])
    exportExcel('bitacora', ['Fecha', 'Momento', 'Docente', 'Salón', 'Refrigerio', 'Notas'], filas)
  }

  if (!niveles) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (niveles.length === 0) return <p className="card text-ink/50">Todavía no hay clases creadas.</p>

  const porFecha = agruparPorFecha(registros)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Bitácora 📋</h1>
          <p className="text-ink/50">Constancia de salón antes/después de clase, refrigerio, y materiales</p>
        </div>
        {tab === 'bitacora' && (
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              📝 Registrar bitácora
            </button>
            <button className="btn-secondary" onClick={exportar} disabled={!registros || registros.length === 0}>
              📊 Exportar
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('bitacora')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'bitacora' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          📋 Bitácora
        </button>
        <button
          type="button"
          onClick={() => setTab('materiales')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'materiales' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          🧰 Materiales
        </button>
      </div>

      {tab === 'materiales' ? (
        <Materiales />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
            <input type="month" className="input max-w-xs" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>

          {!registros ? (
            <Skeleton className="h-64 w-full" />
          ) : porFecha.length === 0 ? (
            <p className="card text-ink/50">Sin registros este mes para esta clase.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {porFecha.map(({ fecha, antes, despues }) => (
                <div key={fecha} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{fecha}</p>
                    <div className="flex gap-2">
                      <span className={`badge ${antes ? 'bg-grass-100 text-grass-700' : 'bg-sunshine-100 text-sunshine-700'}`}>
                        {antes ? '✅' : '⏳'} Antes de clase
                      </span>
                      <span className={`badge ${despues ? 'bg-grass-100 text-grass-700' : 'bg-sunshine-100 text-sunshine-700'}`}>
                        {despues ? '✅' : '⏳'} Después de clase
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {MOMENTOS.map((m) => {
                      const r = m.value === 'antes' ? antes : despues
                      const fotosSalon = r
                        ? [r.salon_foto_url && { url: r.salon_foto_url }, ...(r.bitacora_fotos || []).filter((f) => f.tipo === 'salon')].filter(Boolean)
                        : []
                      const fotosRefrigerio = r
                        ? [
                            r.refrigerio_foto_url && { url: r.refrigerio_foto_url },
                            ...(r.bitacora_fotos || []).filter((f) => f.tipo === 'refrigerio'),
                          ].filter(Boolean)
                        : []
                      return (
                        <div key={m.value} className="rounded-2xl border-2 border-ink/5 p-3">
                          <p className="text-sm font-bold">{m.label}</p>
                          {!r ? (
                            <p className="mt-1 text-sm text-ink/40">Todavía no se ha registrado.</p>
                          ) : (
                            <>
                              <span className={`badge mt-1 ${r.salon_ok ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                                {r.salon_ok ? '✅ Salón en buen estado' : '⚠️ Hubo daños'}
                              </span>
                              <p className="mt-1 text-xs text-ink/50">Registrado por {r.docente?.nombre_completo || '—'}</p>
                              {r.refrigerio_detalle && <p className="mt-2 text-sm text-ink/70">🥤 Refrigerio: {r.refrigerio_detalle}</p>}
                              {r.notas && <p className="mt-1 text-sm text-ink/60">{r.notas}</p>}
                              {fotosSalon.length > 0 && (
                                <div className="mt-2">
                                  <p className="mb-1 text-xs font-bold uppercase text-ink/40">Salón</p>
                                  <FotosGaleria fotos={fotosSalon} size="h-16 w-16" />
                                </div>
                              )}
                              {fotosRefrigerio.length > 0 && (
                                <div className="mt-2">
                                  <p className="mb-1 text-xs font-bold uppercase text-ink/40">Refrigerio</p>
                                  <FotosGaleria fotos={fotosRefrigerio} size="h-16 w-16" />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar bitácora">
        <RegistrarBitacoraForm
          niveles={niveles}
          nivelIdInicial={nivelId}
          onSaved={() => {
            setModalOpen(false)
            load()
          }}
        />
      </Modal>
    </div>
  )
}

function agruparPorFecha(registros) {
  if (!registros) return []
  const map = {}
  registros.forEach((r) => {
    if (!map[r.fecha]) map[r.fecha] = { fecha: r.fecha, antes: null, despues: null }
    map[r.fecha][r.momento === 'antes' ? 'antes' : 'despues'] = r
  })
  return Object.values(map).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

function RegistrarBitacoraForm({ niveles, nivelIdInicial, onSaved }) {
  const { user } = useAuth()
  const [nivelId, setNivelId] = useState(nivelIdInicial || niveles[0]?.id || '')
  const [fecha, setFecha] = useState(hoyISO())
  const [momento, setMomento] = useState('antes')
  const [registro, setRegistro] = useState(null)
  const [salonOk, setSalonOk] = useState(true)
  const [salonFotos, setSalonFotos] = useState([])
  const [refrigerioDetalle, setRefrigerioDetalle] = useState('')
  const [refrigerioFotos, setRefrigerioFotos] = useState([])
  const [notas, setNotas] = useState('')
  const [fotosExistentes, setFotosExistentes] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const meta = MOMENTOS.find((m) => m.value === momento)
  const esDespues = momento === 'despues'

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase
      .from('bitacora_clase')
      .select('*, bitacora_fotos(*)')
      .eq('nivel_id', nivelId)
      .eq('fecha', fecha)
      .eq('momento', momento)
      .maybeSingle()
    setRegistro(data)
    setSalonOk(data?.salon_ok ?? true)
    setRefrigerioDetalle(data?.refrigerio_detalle || '')
    setNotas(data?.notas || '')
    setFotosExistentes(data?.bitacora_fotos || [])
    setSalonFotos([])
    setRefrigerioFotos([])
  }, [nivelId, fecha, momento])

  useEffect(() => {
    load()
  }, [load])

  const fotosSalonExistentes = [
    registro?.salon_foto_url && { url: registro.salon_foto_url },
    ...fotosExistentes.filter((f) => f.tipo === 'salon'),
  ].filter(Boolean)
  const fotosRefrigerioExistentes = [
    registro?.refrigerio_foto_url && { url: registro.refrigerio_foto_url },
    ...fotosExistentes.filter((f) => f.tipo === 'refrigerio'),
  ].filter(Boolean)

  async function subirFotos(archivos, tipo, bitacoraId) {
    for (const file of archivos) {
      const path = `bitacora/${nivelId}/${fecha}-${momento}-${tipo}-${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
      if (!upError) {
        await supabase.from('bitacora_fotos').insert({
          bitacora_id: bitacoraId,
          tipo,
          storage_path: path,
          nombre_archivo: file.name,
          mime: file.type,
        })
      }
    }
  }

  async function guardar(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      nivel_id: nivelId,
      fecha,
      momento,
      docente_id: user.id,
      salon_ok: salonOk,
      refrigerio_detalle: esDespues ? refrigerioDetalle || null : null,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    }
    const { data: fila, error: saveError } = await supabase
      .from('bitacora_clase')
      .upsert(payload, { onConflict: 'nivel_id,fecha,momento' })
      .select()
      .single()
    if (saveError) {
      setBusy(false)
      setError(saveError.message)
      return
    }

    if (salonFotos.length > 0) await subirFotos(salonFotos, 'salon', fila.id)
    if (esDespues && refrigerioFotos.length > 0) await subirFotos(refrigerioFotos, 'refrigerio', fila.id)

    setBusy(false)
    onSaved()
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="label">Clase</label>
          <select className="input" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fecha</label>
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        {MOMENTOS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMomento(m.value)}
            className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${momento === m.value ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {registro && <p className="text-xs font-bold text-sunshine-700">Ya hay una bitácora de "{meta.label}" para esta clase y fecha — se va a actualizar.</p>}

      <div>
        <label className="label">{meta.pregunta}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSalonOk(true)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${salonOk ? 'bg-grass-400 text-white' : 'bg-ink/5'}`}
          >
            ✅ En buen estado
          </button>
          <button
            type="button"
            onClick={() => setSalonOk(false)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${!salonOk ? 'bg-coral-400 text-white' : 'bg-ink/5'}`}
          >
            ⚠️ Hubo daños
          </button>
        </div>
        <div className="mt-2">
          <MultiFilePicker archivos={salonFotos} onChange={setSalonFotos} accept="image/*" label="📷 Agregar foto(s) del salón" />
        </div>
        <FotosGaleria fotos={fotosSalonExistentes} />
      </div>

      {esDespues && (
        <div>
          <label className="label">Refrigerio dado</label>
          <input
            className="input"
            placeholder="Ej. Galletas y jugo"
            value={refrigerioDetalle}
            onChange={(e) => setRefrigerioDetalle(e.target.value)}
          />
          <div className="mt-2">
            <MultiFilePicker
              archivos={refrigerioFotos}
              onChange={setRefrigerioFotos}
              accept="image/*"
              label="📷 Agregar foto(s) del refrigerio"
            />
          </div>
          <FotosGaleria fotos={fotosRefrigerioExistentes} />
        </div>
      )}

      <div>
        <label className="label">Descripción / notas (opcional)</label>
        <textarea
          className="input"
          rows={3}
          placeholder={
            esDespues
              ? 'Ej. Quedó todo recogido, se barrió y se acomodaron las sillas...'
              : 'Ej. Encontramos las mesas desordenadas, faltaba jabón en el baño...'
          }
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
      <button disabled={busy} className="btn-primary justify-center">
        {busy ? 'Guardando...' : `Guardar — ${meta.label}`}
      </button>
    </form>
  )
}
