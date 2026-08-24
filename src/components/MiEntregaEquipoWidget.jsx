import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

/**
 * Botón de "marcar como hecha" que ve un docente en una actividad dirigida
 * al equipo docente (audiencia='docentes', es_tarea=true). Se usa en
 * docente/Actividades.jsx (pestaña "Para el equipo") y en
 * ActividadDetalle.jsx.
 */
export default function MiEntregaEquipoWidget({ actividad, entrega, onSaved }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const estado = entrega?.estado || 'pendiente'

  async function marcar(hecha) {
    setBusy(true)
    await supabase.from('tarea_entregas').upsert(
      {
        actividad_id: actividad.id,
        docente_id: user.id,
        estado: hecha ? 'entregada' : 'pendiente',
        entregado_por: user.id,
        entregado_at: hecha ? new Date().toISOString() : null,
      },
      { onConflict: 'actividad_id,docente_id' },
    )
    setBusy(false)
    onSaved()
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border-2 border-dashed border-grape-200 bg-grape-50/50 p-3">
      {estado === 'entregada' ? (
        <p className="text-sm font-bold text-grass-700">✅ Ya la marcaste como hecha</p>
      ) : (
        <p className="text-sm font-bold text-grape-700">⏳ Pendiente por hacer</p>
      )}
      <button
        disabled={busy}
        onClick={() => marcar(estado !== 'entregada')}
        className={estado === 'entregada' ? 'btn-secondary !py-1 !px-3 !text-xs' : 'btn-primary !py-1 !px-3 !text-xs'}
      >
        {busy ? '...' : estado === 'entregada' ? 'Deshacer' : '✅ Marcar como hecha'}
      </button>
    </div>
  )
}
