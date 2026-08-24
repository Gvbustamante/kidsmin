import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import RichTextView from './RichTextView'
import ArticulosAdjuntos from './ArticulosAdjuntos'

const ESTADO_BADGE = {
  pendiente: 'bg-ink/10 text-ink/50',
  pausada: 'bg-sunshine-100 text-sunshine-700',
  entregada: 'bg-grass-100 text-grass-700',
}
const ESTADO_LABEL = { pendiente: '⏳ Pendiente', pausada: '⏸️ Pausada', entregada: '✅ Entregada' }

export default function TareaEntregas({ actividad, open, onClose }) {
  const esDocentes = actividad?.audiencia === 'docentes'
  const [personas, setPersonas] = useState(null)
  const [entregas, setEntregas] = useState({})
  const [notaDraft, setNotaDraft] = useState({})
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!actividad) return
    if (esDocentes) {
      const [{ data: d }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'docente').eq('activo', true).order('nombre_completo'),
        supabase.from('tarea_entregas').select('*, tarea_entrega_archivos(*)').eq('actividad_id', actividad.id),
      ])
      setPersonas(d || [])
      const byDocente = {}
      ;(e || []).forEach((row) => {
        if (row.docente_id) byDocente[row.docente_id] = row
      })
      setEntregas(byDocente)
      setNotaDraft({})
      return
    }
    const [{ data: n }, { data: e }] = await Promise.all([
      supabase.from('ninos').select('*').eq('nivel_id', actividad.nivel_id).eq('activo', true).order('nombre_completo'),
      supabase.from('tarea_entregas').select('*, tarea_entrega_archivos(*)').eq('actividad_id', actividad.id),
    ])
    setPersonas(n || [])
    const byNino = {}
    ;(e || []).forEach((row) => {
      if (row.nino_id) byNino[row.nino_id] = row
    })
    setEntregas(byNino)
    setNotaDraft({})
  }, [actividad, esDocentes])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  function idField() {
    return esDocentes ? 'docente_id' : 'nino_id'
  }

  async function togglePausa(persona) {
    setBusyId(persona.id)
    const actual = entregas[persona.id]
    const nuevoEstado = actual?.estado === 'pausada' ? 'pendiente' : 'pausada'
    await supabase
      .from('tarea_entregas')
      .upsert(
        { actividad_id: actividad.id, [idField()]: persona.id, estado: nuevoEstado, updated_at: new Date().toISOString() },
        { onConflict: `actividad_id,${idField()}` },
      )
    setBusyId(null)
    load()
  }

  async function guardarNota(persona) {
    setBusyId(persona.id)
    const nota = notaDraft[persona.id] ?? entregas[persona.id]?.nota_docente ?? ''
    await supabase
      .from('tarea_entregas')
      .upsert(
        { actividad_id: actividad.id, [idField()]: persona.id, nota_docente: nota, updated_at: new Date().toISOString() },
        { onConflict: `actividad_id,${idField()}` },
      )
    setBusyId(null)
    load()
  }

  if (!actividad) return null

  const total = esDocentes ? personas?.length || 0 : personas?.filter((n) => !n.pausado).length || 0
  const entregadas = esDocentes
    ? personas?.filter((d) => entregas[d.id]?.estado === 'entregada').length || 0
    : personas?.filter((n) => !n.pausado && entregas[n.id]?.estado === 'entregada').length || 0

  return (
    <Modal open={open} onClose={onClose} title={`Entregas — ${actividad.titulo}`}>
      <div className="flex flex-col gap-3">
        {personas && (
          <p className="text-sm font-bold text-ink/50">
            {entregadas} de {total} {esDocentes ? 'ya la marcaron como hecha' : 'entregaron'}
          </p>
        )}
        {actividad.enlace_externo && (
          <a
            href={actividad.enlace_externo}
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
          >
            🔗 Abrir enlace de la tarea
          </a>
        )}
        {!personas ? (
          <p className="text-ink/40">Cargando...</p>
        ) : (
          personas.map((persona) => {
            const entrega = entregas[persona.id]
            const estado = entrega?.estado || 'pendiente'
            const pausadaPorNino = !esDocentes && persona.pausado
            return (
              <div key={persona.id} className={`rounded-2xl border-2 border-ink/5 p-3 ${pausadaPorNino ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{persona.nombre_completo}</p>
                  {pausadaPorNino ? (
                    <span className="badge bg-ink/10 text-ink/50">⏸️ Pausado (niño)</span>
                  ) : (
                    <span className={`badge ${ESTADO_BADGE[estado]}`}>{ESTADO_LABEL[estado]}</span>
                  )}
                </div>

                {!pausadaPorNino && entrega?.archivo_url && (
                  <a
                    href={entrega.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-bold text-sky-600 hover:underline"
                  >
                    📎 Ver evidencia
                  </a>
                )}
                {!pausadaPorNino && entrega?.tarea_entrega_archivos?.length > 0 && (
                  <div className="mt-2">
                    <ArticulosAdjuntos archivos={entrega.tarea_entrega_archivos} titulo="📎 Evidencia entregada" />
                  </div>
                )}
                {!pausadaPorNino && entrega?.comentario_padre && <RichTextView html={entrega.comentario_padre} className="mt-1 text-sm text-ink/60" />}

                {!pausadaPorNino && !esDocentes && estado !== 'entregada' && (
                  <button
                    disabled={busyId === persona.id}
                    onClick={() => togglePausa(persona)}
                    className="btn-secondary mt-2 !py-1 !px-3 !text-xs"
                  >
                    {estado === 'pausada' ? '▶️ Reanudar' : '⏸️ Pausar'}
                  </button>
                )}

                {!pausadaPorNino && estado === 'entregada' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input !py-1 !text-sm"
                      placeholder="Escríbele una nota (ej. ¡Muy bien!)"
                      value={notaDraft[persona.id] ?? entrega?.nota_docente ?? ''}
                      onChange={(e) => setNotaDraft({ ...notaDraft, [persona.id]: e.target.value })}
                    />
                    <button
                      disabled={busyId === persona.id}
                      onClick={() => guardarNota(persona)}
                      className="btn-secondary shrink-0 !py-1 !px-3 !text-xs"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
        {personas && personas.length === 0 && (
          <p className="text-ink/40">{esDocentes ? 'No hay docentes activos.' : 'No hay niños activos en este nivel.'}</p>
        )}
      </div>
    </Modal>
  )
}
