import { useAuth } from '../../contexts/AuthContext'
import { useMisHijos } from '../../lib/useMisHijos'
import Spinner from '../../components/Spinner'
import { BADGE_CLASSES } from '../../lib/colors'
import CitaDelDia from '../../components/CitaDelDia'
import ProximaAgenda from '../../components/ProximaAgenda'
import ResumenHoy from '../../components/ResumenHoy'

function calcularEdad(fecha) {
  if (!fecha) return '—'
  const nacimiento = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

export default function PadreHome() {
  const { profile } = useAuth()
  const hijos = useMisHijos()

  if (!hijos) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <span className="animate-float-soft pointer-events-none absolute -right-2 -top-6 text-5xl opacity-10 sm:text-6xl" aria-hidden="true">
          💛
        </span>
        <h1 className="text-3xl font-bold">¡Hola, {profile.nombre_completo.split(' ')[0]}! 💛</h1>
        <p className="text-ink/50">Así está tu familia en la escuelita</p>
      </div>

      <CitaDelDia />

      <ResumenHoy nivelIds={[...new Set(hijos.map((h) => h.nivel_id).filter(Boolean))]} />

      {hijos.length === 0 && (
        <p className="card text-ink/50">Aún no tienes niños vinculados. Habla con la docente de tu hijo/a.</p>
      )}

      {hijos.length > 0 && (
        <ProximaAgenda
          nivelIds={[...new Set(hijos.map((h) => h.nivel_id).filter(Boolean))]}
          soloTareasPendientes
          hijoIds={hijos.map((h) => h.id)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hijos.map((h, i) => (
          <div key={h.id} className="card animate-pop-in transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{h.nombre_completo}</h3>
                <p className="text-sm text-ink/50">{calcularEdad(h.fecha_nacimiento)} años · {h.parentesco}</p>
              </div>
              {h.nivel && <span className={`badge ${BADGE_CLASSES[h.nivel.color] || BADGE_CLASSES.sky}`}>{h.nivel.nombre}</span>}
            </div>
            {h.alergias && (
              <p className="mt-2 rounded-xl bg-coral-50 px-3 py-1 text-xs font-bold text-coral-600">⚠️ Alergias: {h.alergias}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
