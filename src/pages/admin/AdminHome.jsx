import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import StatCard from '../../components/StatCard'
import Skeleton from '../../components/Skeleton'
import CitaDelDia from '../../components/CitaDelDia'
import CoberturaHoy from '../../components/CoberturaHoy'
import ProximaAgenda from '../../components/ProximaAgenda'
import ResumenHoy from '../../components/ResumenHoy'

export default function AdminHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const diaSemana = new Date().getDay()
      const [ninos, clases, docentes, asistenciaHoy, eventosProximos, peticionesRecientes, diasClase] = await Promise.all([
        supabase.from('ninos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('niveles').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['docente', 'coordinador']).eq('activo', true),
        supabase.from('asistencia').select('id', { count: 'exact', head: true }).eq('fecha', today).eq('presente', true),
        supabase.from('agenda').select('id', { count: 'exact', head: true }).gte('fecha', today),
        supabase.from('peticiones_oracion').select('id', { count: 'exact', head: true }).gte('created_at', hace7dias),
        supabase.from('dias_clase').select('dia_semana, activo'),
      ])
      const esDiaClase = (diasClase.data || []).some((d) => d.dia_semana === diaSemana && d.activo)
      setStats({
        ninos: ninos.count ?? 0,
        clases: clases.count ?? 0,
        docentes: docentes.count ?? 0,
        asistenciaHoy: asistenciaHoy.count ?? 0,
        esDiaClase,
        eventosProximos: eventosProximos.count ?? 0,
        peticionesRecientes: peticionesRecientes.count ?? 0,
      })
    }
    load()
  }, [])

  if (!stats) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full rounded-blob" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <span className="animate-float-soft pointer-events-none absolute -right-2 -top-6 text-5xl opacity-10 sm:text-6xl" aria-hidden="true">
          🎒
        </span>
        <h1 className="text-3xl font-bold">¡Hola, {profile.nombre_completo.split(' ')[0]}! 👋</h1>
        <p className="text-ink/50">Este es el resumen de tu escuelita hoy.</p>
      </div>

      <CitaDelDia />

      <ResumenHoy />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon="🧒" label="Niños activos" value={stats.ninos} color="sky" delay={0} />
        <StatCard icon="🎒" label="Clases activas" value={stats.clases} color="grass" delay={80} />
        <StatCard icon="🍎" label="Equipo" value={stats.docentes} color="sunshine" delay={160} />
        {stats.esDiaClase ? (
          <StatCard icon="✅" label="Asistencia hoy" value={stats.asistenciaHoy} color="grape" delay={240} />
        ) : (
          <div className="card animate-pop-in flex items-center gap-3 !p-4 sm:gap-4 sm:!p-6" style={{ animationDelay: '240ms' }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-xl text-ink/30 ring-4 ring-ink/5 sm:h-16 sm:w-16 sm:text-3xl">
              💤
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-none text-ink/40 sm:text-xl">Sin clase</p>
              <p className="mt-1 text-xs font-bold leading-tight text-ink/50 sm:text-sm">Hoy no toca escuelita</p>
            </div>
          </div>
        )}
        <StatCard icon="📅" label="Eventos próximos" value={stats.eventosProximos} color="coral" delay={320} />
        <StatCard icon="🙏" label="Peticiones (7 días)" value={stats.peticionesRecientes} color="sky" delay={400} />
      </div>

      <CoberturaHoy />

      <ProximaAgenda />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/ninos" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '80ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl">🧒</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Gestionar niños</p>
            <p className="text-sm text-ink/50">Agregar, editar, desactivar</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/clases" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '160ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grass-100 text-2xl">🎒</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Gestionar clases</p>
            <p className="text-sm text-ink/50">Niveles y edades</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/docentes" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '240ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sunshine-100 text-2xl">🍎</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Invitar docentes</p>
            <p className="text-sm text-ink/50">Gestionar el equipo</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
      </div>
    </div>
  )
}
