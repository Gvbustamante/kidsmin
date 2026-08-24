import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const REACCIONES = ['❤️', '👏', '🙌', '😍']

/**
 * Barra de reacciones (emoji) genérica, reutilizable entre actividades
 * (actividad_reacciones, columna padre_id) y devocionales
 * (devocional_reacciones, columna usuario_id).
 */
export default function ReaccionesBar({ tabla, columnaId, targetId, columnaUsuario, reacciones, onChanged }) {
  const { user } = useAuth()
  const mia = reacciones.find((r) => r[columnaUsuario] === user.id)

  async function reaccionar(tipo) {
    if (mia && mia.tipo === tipo) {
      await supabase.from(tabla).delete().eq(columnaId, targetId).eq(columnaUsuario, user.id)
    } else {
      await supabase.from(tabla).upsert({ [columnaId]: targetId, [columnaUsuario]: user.id, tipo }, { onConflict: `${columnaId},${columnaUsuario}` })
    }
    onChanged()
  }

  return (
    <div className="flex items-center gap-2">
      {REACCIONES.map((r) => (
        <button
          key={r}
          onClick={() => reaccionar(r)}
          className={`rounded-full px-3 py-2 text-xl transition-transform duration-150 active:scale-90 ${
            mia?.tipo === r ? 'animate-pop-in scale-110 bg-coral-100 ring-2 ring-coral-400' : 'bg-ink/5 hover:scale-110 hover:bg-ink/10'
          }`}
        >
          {r}
        </button>
      ))}
      <span className="ml-auto text-sm font-bold text-ink/40">{reacciones.length} reacciones</span>
    </div>
  )
}
