import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import RichTextEditor from './RichTextEditor'
import MultiFilePicker from './MultiFilePicker'
import ArticulosAdjuntos from './ArticulosAdjuntos'

/**
 * Tarjeta para que un padre/madre suba la evidencia de una tarea de su
 * hijo/a. Se usa en PadreActividades.jsx (lista) y en ActividadDetalle.jsx
 * (página extendida de una actividad).
 */
export default function TareaHijoWidget({ actividad, hijo, entrega, onSaved }) {
  const { user } = useAuth()
  const [archivos, setArchivos] = useState([])
  const [comentario, setComentario] = useState('')
  const [busy, setBusy] = useState(false)
  const [archivosExistentes, setArchivosExistentes] = useState([])

  const estado = entrega?.estado || 'pendiente'

  useEffect(() => {
    if (estado !== 'entregada' || !entrega?.id) {
      setArchivosExistentes([])
      return
    }
    supabase
      .from('tarea_entrega_archivos')
      .select('*')
      .eq('entrega_id', entrega.id)
      .then(({ data }) => setArchivosExistentes(data || []))
  }, [estado, entrega?.id])

  if (hijo.pausado) {
    return (
      <div className="rounded-2xl bg-ink/5 px-3 py-2 text-sm text-ink/40">
        ⏸️ Esta tarea está en pausa para {hijo.nombre_completo.split(' ')[0]}.
      </div>
    )
  }

  if (estado === 'pausada') {
    return (
      <div className="rounded-2xl bg-sunshine-50 px-3 py-2 text-sm font-bold text-sunshine-700">
        ⏸️ El docente puso esta tarea en pausa para {hijo.nombre_completo.split(' ')[0]}.
      </div>
    )
  }

  if (estado === 'entregada') {
    return (
      <div className="rounded-2xl bg-grass-50 px-3 py-3">
        <p className="text-sm font-bold text-grass-700">✅ {hijo.nombre_completo.split(' ')[0]} ya entregó esta tarea</p>
        {entrega.archivo_url && (
          <a href={entrega.archivo_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-600 hover:underline">
            📎 Ver lo que subiste
          </a>
        )}
        {archivosExistentes.length > 0 && (
          <div className="mt-2">
            <ArticulosAdjuntos archivos={archivosExistentes} titulo="📎 Archivos entregados" />
          </div>
        )}
        {entrega.nota_docente && <p className="mt-1 text-sm text-ink/70">💬 Nota del docente: {entrega.nota_docente}</p>}
      </div>
    )
  }

  async function subir() {
    if (archivos.length === 0) return
    setBusy(true)
    const { data: fila, error: saveError } = await supabase
      .from('tarea_entregas')
      .upsert(
        {
          actividad_id: actividad.id,
          nino_id: hijo.id,
          estado: 'entregada',
          comentario_padre: comentario || null,
          entregado_por: user.id,
          entregado_at: new Date().toISOString(),
        },
        { onConflict: 'actividad_id,nino_id' },
      )
      .select()
      .single()
    if (saveError) {
      setBusy(false)
      return
    }
    for (const archivo of archivos) {
      const path = `tareas/${actividad.id}/${hijo.id}/${Date.now()}-${archivo.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, archivo)
      if (!upError) {
        await supabase
          .from('tarea_entrega_archivos')
          .insert({ entrega_id: fila.id, storage_path: path, nombre_archivo: archivo.name, tipo: archivo.type })
      }
    }
    setBusy(false)
    setArchivos([])
    setComentario('')
    onSaved()
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 p-3">
      <p className="text-sm font-bold text-sky-700">📝 Sube la tarea de {hijo.nombre_completo.split(' ')[0]}</p>
      <div className="mt-2">
        <MultiFilePicker archivos={archivos} onChange={setArchivos} label="📎 Agregar archivo(s)" />
      </div>
      <div className="mt-2">
        <RichTextEditor value={comentario} onChange={setComentario} placeholder="Comentario (opcional)" compact />
      </div>
      <button disabled={archivos.length === 0 || busy} onClick={subir} className="btn-primary mt-2 w-full justify-center !py-2 !text-sm">
        {busy ? 'Subiendo...' : 'Subir tarea'}
      </button>
    </div>
  )
}
