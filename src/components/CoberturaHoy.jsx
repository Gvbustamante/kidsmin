import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function horaActualHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CoberturaHoy() {
  const [estado, setEstado] = useState(null) // undefined mientras carga; luego { esDiaClase, filas }

  useEffect(() => {
    async function load() {
      const hoy = hoyISO()
      const diaSemana = new Date().getDay()

      const { data: diasClase } = await supabase.from('dias_clase').select('dia_semana, activo')
      const esDiaClase = (diasClase || []).some((d) => d.dia_semana === diaSemana && d.activo)

      if (!esDiaClase) {
        setEstado({ esDiaClase: false, filas: [] })
        return
      }

      const [{ data: niveles }, { data: horarios }, { data: docentesNiveles }, { data: asigHorario }, { data: coberturaHoy }, { data: ninos }, { data: asistenciaHoy }] =
        await Promise.all([
          supabase.from('niveles').select('id, nombre').eq('activo', true).order('edad_min', { ascending: true, nullsFirst: true }),
          supabase.from('horarios').select('*').eq('activo', true).order('orden'),
          supabase.from('docentes_niveles').select('nivel_id, docente:profiles(nombre_completo)'),
          supabase.from('asignacion_horario').select('nivel_id, horario_id, docente:profiles(nombre_completo)'),
          supabase.from('cobertura_dia').select('nivel_id, horario_id, docente:profiles(nombre_completo)').eq('fecha', hoy),
          supabase.from('ninos').select('nivel_id').eq('activo', true),
          supabase.from('asistencia').select('nivel_id, tomada_por:profiles(nombre_completo)').eq('fecha', hoy),
        ])

      const horaAhora = horaActualHHMM()
      const yaPaso = (h) => !h.hora || h.hora.slice(0, 5) <= horaAhora

      const docentesGeneralPorNivel = {}
      ;(docentesNiveles || []).forEach((a) => {
        if (!a.docente?.nombre_completo) return
        docentesGeneralPorNivel[a.nivel_id] = docentesGeneralPorNivel[a.nivel_id] || []
        docentesGeneralPorNivel[a.nivel_id].push(a.docente.nombre_completo)
      })

      const ninosPorNivel = {}
      ;(ninos || []).forEach((n) => {
        if (!n.nivel_id) return
        ninosPorNivel[n.nivel_id] = (ninosPorNivel[n.nivel_id] || 0) + 1
      })

      const tomadaPorNivel = {}
      ;(asistenciaHoy || []).forEach((r) => {
        if (!tomadaPorNivel[r.nivel_id]) tomadaPorNivel[r.nivel_id] = r.tomada_por?.nombre_completo || 'el equipo'
      })

      // Un horario con dia_semana=null aplica a cualquier día de clase; si
      // tiene un día específico (ej. los 3 servicios son solo del domingo),
      // hoy solo cuenta si hoy es ese día — así un sábado con un solo
      // servicio no hereda (ni marca como "sin docente") los horarios del
      // domingo.
      const horariosActivos = (horarios || []).filter((h) => h.dia_semana === null || h.dia_semana === diaSemana)
      const soloUnHorario = horariosActivos.length <= 1

      const filas = (niveles || []).map((n) => {
        const generalNombres = docentesGeneralPorNivel[n.id] || []
        const tieneAsigPorHorario =
          (asigHorario || []).some((a) => a.nivel_id === n.id) || (coberturaHoy || []).some((c) => c.nivel_id === n.id)

        const porHorario = horariosActivos.map((h) => {
          const override = (coberturaHoy || []).find((c) => c.nivel_id === n.id && c.horario_id === h.id)
          const fijo = (asigHorario || []).find((a) => a.nivel_id === n.id && a.horario_id === h.id)
          let docente = override?.docente?.nombre_completo || fijo?.docente?.nombre_completo || null
          // Respaldo: si esta clase todavía no tiene nada configurado por
          // horario (caso típico: un solo servicio con la lista general de
          // Clases), usamos esa lista para no generar una alarma falsa.
          if (!docente && !tieneAsigPorHorario && generalNombres.length > 0) docente = generalNombres.join(', ')
          return { horario: h, docente, pasado: yaPaso(h) }
        })

        const ninosCount = ninosPorNivel[n.id] || 0
        const algunoPaso = porHorario.some((p) => p.pasado)
        const pasadosSinDocente = porHorario.filter((p) => p.pasado)
        const sinDocente = algunoPaso && pasadosSinDocente.length > 0 && pasadosSinDocente.every((p) => !p.docente)
        const asistenciaTomada = tomadaPorNivel[n.id] || null
        const pendiente = algunoPaso && !sinDocente && ninosCount > 0 && !asistenciaTomada

        return {
          id: n.id,
          nombre: n.nombre,
          porHorario,
          soloUnHorario,
          ninosCount,
          asistenciaTomada,
          algunoPaso,
          sinDocente,
          pendiente,
        }
      })

      setEstado({ esDiaClase: true, filas })
    }
    load()
  }, [])

  if (estado === null) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!estado.esDiaClase) {
    return (
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Cobertura de hoy 🗓️</h2>
            <p className="text-sm text-ink/50">Hoy no es un día de clase configurado — no hay nada que cubrir.</p>
          </div>
        </div>
        <Link to="/ajustes" className="mt-4 inline-block text-sm font-bold text-sky-600 hover:underline">
          Configurar días de clase en Ajustes →
        </Link>
      </div>
    )
  }

  const { filas } = estado
  const alertas = filas.filter((f) => f.sinDocente || f.pendiente).length

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Cobertura de hoy 🗓️</h2>
          <p className="text-sm text-ink/50">Quién está a cargo de cada clase y si ya se registró asistencia.</p>
        </div>
        {filas.length === 0 ? null : alertas === 0 ? (
          <span className="badge bg-grass-100 text-grass-700">✅ Todo cubierto</span>
        ) : (
          <span className="badge bg-coral-100 text-coral-700">
            ⚠️ {alertas} clase{alertas === 1 ? '' : 's'} necesita{alertas === 1 ? '' : 'n'} atención
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-xs font-bold uppercase text-ink/40">
            <tr>
              <th className="px-2 py-2">Clase</th>
              <th className="px-2 py-2">Docente(s)</th>
              <th className="px-2 py-2">Niños</th>
              <th className="px-2 py-2">Asistencia hoy</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-ink/5">
                <td className="px-2 py-3 font-bold">{f.nombre}</td>
                <td className="px-2 py-3 text-sm">
                  {f.soloUnHorario ? (
                    f.porHorario[0]?.docente ? (
                      f.porHorario[0].docente
                    ) : (
                      <span className="font-bold text-coral-600">Sin docente asignado</span>
                    )
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {f.porHorario.map((p) => (
                        <span key={p.horario.id}>
                          <span className="text-ink/40">{p.horario.nombre}:</span>{' '}
                          {p.docente || <span className="font-bold text-coral-600">sin docente</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2 py-3 text-sm text-ink/50">{f.ninosCount}</td>
                <td className="px-2 py-3">
                  {f.asistenciaTomada ? (
                    <span className="badge bg-grass-100 text-grass-700">✅ Tomada por {f.asistenciaTomada}</span>
                  ) : f.sinDocente ? (
                    <span className="badge bg-coral-100 text-coral-700">🔴 Sin docente</span>
                  ) : f.ninosCount === 0 ? (
                    <span className="badge bg-ink/5 text-ink/40">— Sin niños</span>
                  ) : !f.algunoPaso ? (
                    <span className="badge bg-ink/5 text-ink/40">⏳ Aún no empieza</span>
                  ) : (
                    <span className="badge bg-sunshine-100 text-sunshine-700">⏳ Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-6 text-center text-ink/40">
                  Aún no hay clases activas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link to="/clases" className="mt-4 inline-block text-sm font-bold text-sky-600 hover:underline">
        Gestionar clases y docentes asignados →
      </Link>
    </div>
  )
}
