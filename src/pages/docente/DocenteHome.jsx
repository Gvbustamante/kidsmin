import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { usePermisosRol } from '../../lib/permisosRol'
import Spinner from '../../components/Spinner'
import { BADGE_CLASSES } from '../../lib/colors'
import CitaDelDia from '../../components/CitaDelDia'
import ProximaAgenda from '../../components/ProximaAgenda'
import ResumenHoy from '../../components/ResumenHoy'
import MiClase from '../../components/MiClase'

export default function DocenteHome() {
  const { profile, user } = useAuth()
  const { tiene } = usePermisosRol()
  const puedeElegirClase = tiene('docente', 'elegir_clase')
  const [clases, setClases] = useState(null)

  const load = useCallback(async () => {
    const { data: asign } = await supabase.from('docentes_niveles').select('nivel_id').eq('docente_id', user.id)
    const nivelIds = (asign || []).map((a) => a.nivel_id)
    if (nivelIds.length === 0) {
      setClases([])
      return
    }
    const { data: niveles } = await supabase.from('niveles').select('*').in('id', nivelIds)
    const { data: ninos } = await supabase.from('ninos').select('id, nivel_id').eq('activo', true).in('nivel_id', nivelIds)
    const withCounts = (niveles || []).map((n) => ({
      ...n,
      count: (ninos || []).filter((c) => c.nivel_id === n.id).length,
    }))
    setClases(withCounts)
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  if (!clases) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <span className="animate-float-soft pointer-events-none absolute -right-2 -top-6 text-5xl opacity-10 sm:text-6xl" aria-hidden="true">
          🌟
        </span>
        <h1 className="text-3xl font-bold">¡Hola, miss {profile.nombre_completo.split(' ')[0]}! 🌟</h1>
        <p className="text-ink/50">Tus clases asignadas</p>
      </div>

      <CitaDelDia />

      <ResumenHoy nivelIds={clases.map((c) => c.id)} />

      {puedeElegirClase ? (
        <MiClase onChange={load} />
      ) : (
        clases.length === 0 && (
          <p className="card text-ink/50">
            Aún no tienes clases asignadas. Pide al administrador que te asigne una en la sección de Clases.
          </p>
        )
      )}

      <ProximaAgenda nivelIds={clases.map((c) => c.id)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clases.map((c, i) => (
          <div key={c.id} className="card animate-pop-in transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: `${i * 80}ms` }}>
            <span className={`badge ${BADGE_CLASSES[c.color] || BADGE_CLASSES.sky}`}>{c.edad_min}-{c.edad_max} años</span>
            <h3 className="mt-2 text-xl font-bold">{c.nombre}</h3>
            <p className="text-ink/50">{c.count} niños activos</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/asistencia" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '80ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grass-100 text-2xl">✅</span>
          <p className="flex-1 font-bold">Tomar asistencia</p>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/actividades" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '160ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sunshine-100 text-2xl">🎨</span>
          <p className="flex-1 font-bold">Subir actividad</p>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/agenda" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '240ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grape-100 text-2xl">📅</span>
          <p className="flex-1 font-bold">Agendar evento</p>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
      </div>
    </div>
  )
}
