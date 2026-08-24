import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import ConfirmModal from '../../components/ConfirmModal'
import { refreshMotivosReconocimiento } from '../../lib/motivosReconocimiento'
import { refreshNivelesEstrella } from '../../lib/nivelesEstrella'

export default function ConfigEstrellas() {
  const [motivos, setMotivos] = useState(null)
  const [niveles, setNiveles] = useState(null)
  const [nuevoMotivo, setNuevoMotivo] = useState({ emoji: '⭐', texto: '' })
  const [nuevoNivel, setNuevoNivel] = useState({ emoji: '🏅', nombre: '', min_estrellas: '' })
  const [busy, setBusy] = useState(false)
  const [confirmBorrar, setConfirmBorrar] = useState(null)

  const load = useCallback(async () => {
    const [{ data: m }, { data: n }] = await Promise.all([
      supabase.from('motivos_reconocimiento').select('*').order('orden'),
      supabase.from('niveles_estrella').select('*').order('min_estrellas'),
    ])
    setMotivos(m || [])
    setNiveles(n || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function agregarMotivo(e) {
    e.preventDefault()
    if (!nuevoMotivo.texto.trim()) return
    setBusy(true)
    const orden = (motivos.reduce((max, m) => Math.max(max, m.orden), 0) || 0) + 1
    await supabase.from('motivos_reconocimiento').insert({ ...nuevoMotivo, orden })
    setNuevoMotivo({ emoji: '⭐', texto: '' })
    setBusy(false)
    await load()
    refreshMotivosReconocimiento()
  }

  async function toggleMotivoActivo(m) {
    await supabase.from('motivos_reconocimiento').update({ activo: !m.activo }).eq('id', m.id)
    await load()
    refreshMotivosReconocimiento()
  }

  async function borrarMotivo(m) {
    setBusy(true)
    await supabase.from('motivos_reconocimiento').delete().eq('id', m.id)
    setBusy(false)
    setConfirmBorrar(null)
    await load()
    refreshMotivosReconocimiento()
  }

  async function agregarNivel(e) {
    e.preventDefault()
    if (!nuevoNivel.nombre.trim() || nuevoNivel.min_estrellas === '') return
    setBusy(true)
    await supabase.from('niveles_estrella').insert({
      emoji: nuevoNivel.emoji,
      nombre: nuevoNivel.nombre,
      min_estrellas: Number(nuevoNivel.min_estrellas),
      orden: Number(nuevoNivel.min_estrellas),
    })
    setNuevoNivel({ emoji: '🏅', nombre: '', min_estrellas: '' })
    setBusy(false)
    await load()
    refreshNivelesEstrella()
  }

  async function actualizarNivel(nivel, cambios) {
    await supabase.from('niveles_estrella').update(cambios).eq('id', nivel.id)
    await load()
    refreshNivelesEstrella()
  }

  async function borrarNivel(nivel) {
    setBusy(true)
    await supabase.from('niveles_estrella').delete().eq('id', nivel.id)
    setBusy(false)
    setConfirmBorrar(null)
    await load()
    refreshNivelesEstrella()
  }

  if (!motivos || !niveles) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink/50">Configura los motivos rápidos y las insignias que ganan los niños</p>

      <div className="card max-w-2xl">
        <p className="label mb-1">Motivos de reconocimiento</p>
        <p className="mb-3 text-sm text-ink/50">Los botones rápidos que ve el docente al dar una estrella.</p>

        <div className="flex flex-col gap-2">
          {motivos.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink/5 px-3 py-2">
              <span className={`font-bold ${!m.activo ? 'text-ink/30 line-through' : ''}`}>
                {m.emoji} {m.texto}
              </span>
              <div className="flex gap-2">
                <button className="text-xs font-bold text-sky-600 hover:underline" onClick={() => toggleMotivoActivo(m)}>
                  {m.activo ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  className="text-xs font-bold text-coral-500 hover:underline"
                  onClick={() => setConfirmBorrar({ tipo: 'motivo', item: m })}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {motivos.length === 0 && <p className="text-sm text-ink/40">Sin motivos todavía.</p>}
        </div>

        <form onSubmit={agregarMotivo} className="mt-4 flex gap-2">
          <input
            className="input w-14 shrink-0 text-center sm:w-20"
            value={nuevoMotivo.emoji}
            onChange={(e) => setNuevoMotivo({ ...nuevoMotivo, emoji: e.target.value })}
            placeholder="🌟"
          />
          <input
            className="input min-w-0 flex-1"
            value={nuevoMotivo.texto}
            onChange={(e) => setNuevoMotivo({ ...nuevoMotivo, texto: e.target.value })}
            placeholder="Ej. Compartió con sus compañeros"
          />
          <button disabled={busy} className="btn-primary shrink-0 !px-3 sm:!px-4">
            + Agregar
          </button>
        </form>
      </div>

      <div className="card max-w-2xl">
        <p className="label mb-1">Insignias / niveles de estrella</p>
        <p className="mb-3 text-sm text-ink/50">A partir de cuántas estrellas un niño alcanza cada insignia.</p>

        <div className="flex flex-col gap-2">
          {niveles.map((n) => (
            <div key={n.id} className="flex flex-col gap-2 rounded-xl bg-ink/5 px-3 py-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <input
                  className="input !w-14 !py-1 shrink-0 text-center"
                  defaultValue={n.emoji}
                  onBlur={(e) => e.target.value !== n.emoji && actualizarNivel(n, { emoji: e.target.value })}
                />
                <input
                  className="input !flex-1 !py-1"
                  defaultValue={n.nombre}
                  onBlur={(e) => e.target.value !== n.nombre && actualizarNivel(n, { nombre: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="flex items-center gap-1 text-sm text-ink/50">
                  <span>desde</span>
                  <input
                    type="number"
                    min={0}
                    className="input !w-20 !py-1 text-center"
                    defaultValue={n.min_estrellas}
                    onBlur={(e) =>
                      Number(e.target.value) !== n.min_estrellas &&
                      actualizarNivel(n, { min_estrellas: Number(e.target.value), orden: Number(e.target.value) })
                    }
                  />
                  <span>⭐</span>
                </div>
                <button
                  className="shrink-0 text-xs font-bold text-coral-500 hover:underline"
                  onClick={() => setConfirmBorrar({ tipo: 'nivel', item: n })}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {niveles.length === 0 && <p className="text-sm text-ink/40">Sin niveles todavía.</p>}
        </div>

        <form onSubmit={agregarNivel} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <input
              className="input w-20 shrink-0 text-center"
              value={nuevoNivel.emoji}
              onChange={(e) => setNuevoNivel({ ...nuevoNivel, emoji: e.target.value })}
              placeholder="🏅"
            />
            <input
              className="input flex-1"
              value={nuevoNivel.nombre}
              onChange={(e) => setNuevoNivel({ ...nuevoNivel, nombre: e.target.value })}
              placeholder="Ej. Guerrero de fe"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1 text-sm text-ink/50 sm:flex-none">
              <span>desde</span>
              <input
                type="number"
                min={0}
                className="input w-20 text-center"
                value={nuevoNivel.min_estrellas}
                onChange={(e) => setNuevoNivel({ ...nuevoNivel, min_estrellas: e.target.value })}
                placeholder="25"
              />
              <span>⭐</span>
            </div>
            <button disabled={busy} className="btn-primary shrink-0 !px-4">
              + Agregar
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={!!confirmBorrar}
        onClose={() => setConfirmBorrar(null)}
        onConfirm={() =>
          confirmBorrar?.tipo === 'motivo' ? borrarMotivo(confirmBorrar.item) : borrarNivel(confirmBorrar.item)
        }
        busy={busy}
        title="¿Borrar esto?"
        confirmLabel="Sí, borrar"
        message={
          confirmBorrar?.tipo === 'motivo'
            ? 'Las estrellas ya dadas con este motivo no se ven afectadas, solo dejará de aparecer como opción.'
            : 'Los niños que ya alcanzaron este nivel simplemente pasarán a mostrar el nivel más cercano.'
        }
      />
    </div>
  )
}
