import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { BADGE_CLASSES } from '../lib/colors'

/**
 * Tarjeta de "Inicio" del docente para unirse/salirse de una clase por su
 * cuenta, sin pasar por el admin. Solo se muestra si el permiso
 * docente.elegir_clase está activado (ver Usuarios → Roles y permisos).
 */
export default function MiClase({ onChange }) {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [misNivelIds, setMisNivelIds] = useState(new Set())
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    const [{ data: niv }, { data: asign }] = await Promise.all([
      supabase.from('niveles').select('*').eq('activo', true).order('edad_min', { ascending: true, nullsFirst: true }),
      supabase.from('docentes_niveles').select('nivel_id').eq('docente_id', user.id),
    ])
    setNiveles(niv || [])
    setMisNivelIds(new Set((asign || []).map((a) => a.nivel_id)))
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(nivelId) {
    setBusyId(nivelId)
    if (misNivelIds.has(nivelId)) {
      await supabase.from('docentes_niveles').delete().eq('docente_id', user.id).eq('nivel_id', nivelId)
    } else {
      await supabase.from('docentes_niveles').insert({ docente_id: user.id, nivel_id: nivelId })
    }
    await load()
    onChange?.()
    setBusyId('')
  }

  if (!niveles || niveles.length === 0) return null

  return (
    <div className="card">
      <p className="font-bold">🎒 Elige tu clase</p>
      <p className="mt-1 text-sm text-ink/50">Únete o sal de la clase que vayas a llevar — puedes estar en más de una.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {niveles.map((n) => {
          const dentro = misNivelIds.has(n.id)
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => toggle(n.id)}
              disabled={busyId === n.id}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                dentro ? `${BADGE_CLASSES[n.color] || BADGE_CLASSES.sky}` : 'bg-ink/5 text-ink/50'
              }`}
            >
              {busyId === n.id ? '...' : dentro ? `✅ ${n.nombre}` : `+ ${n.nombre}`}
            </button>
          )
        })}
      </div>
    </div>
  )
}
