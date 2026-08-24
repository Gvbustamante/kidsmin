import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNivelesEstrella, badgeActual } from '../lib/nivelesEstrella'
import { BADGE_CLASSES } from '../lib/colors'
import Modal from './Modal'
import PadreContacto from './PadreContacto'

function calcularEdad(fecha) {
  if (!fecha) return '—'
  const nacimiento = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

export default function DetalleNinoModal({ nino, nivel, padres = [], open, onClose, onSaved, onDesvincular }) {
  const niveles = useNivelesEstrella()
  const [historial, setHistorial] = useState(null)

  useEffect(() => {
    if (!open || !nino) {
      setHistorial(null)
      return
    }
    async function load() {
      const [{ data: asistencia }, { data: notas }, { data: estrellas }] = await Promise.all([
        supabase.from('asistencia').select('fecha, presente').eq('nino_id', nino.id).order('fecha', { ascending: false }).limit(8),
        supabase.from('progreso_notas').select('*').eq('nino_id', nino.id).order('fecha', { ascending: false }).limit(5),
        supabase.from('reconocimientos').select('id, created_at, motivo').eq('nino_id', nino.id).order('created_at', { ascending: false }),
      ])
      setHistorial({ asistencia: asistencia || [], notas: notas || [], estrellas: estrellas || [] })
    }
    load()
  }, [open, nino])

  if (!nino) return null

  const badge = historial ? badgeActual(niveles, historial.estrellas.length) : null

  return (
    <Modal open={open} onClose={onClose} title={`Detalle — ${nino.nombre_completo}`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-ink/5 text-ink/60">{calcularEdad(nino.fecha_nacimiento)} años</span>
          {nivel && <span className={`badge ${BADGE_CLASSES[nivel.color] || BADGE_CLASSES.sky}`}>{nivel.nombre}</span>}
          <span className={`badge ${nino.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
            {nino.activo ? 'Activo' : 'Inactivo'}
          </span>
          {nino.pausado && <span className="badge bg-ink/10 text-ink/50">⏸️ Pausado</span>}
        </div>

        {nino.alergias && (
          <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">⚠️ Alergias: {nino.alergias}</p>
        )}
        {nino.notas && <p className="text-sm text-ink/60">📝 {nino.notas}</p>}

        <div>
          <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Padres/encargados</p>
          {padres.length === 0 ? (
            <p className="text-sm text-ink/40">Sin vincular</p>
          ) : (
            <div className="flex flex-col gap-2">
              {padres.map((p, i) => (
                <PadreContacto
                  key={i}
                  padre={p.padre}
                  parentesco={p.parentesco}
                  onSaved={onSaved}
                  onDesvincular={onDesvincular ? () => onDesvincular(p.padre) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {!historial ? (
          <p className="text-sm text-ink/40">Cargando historial...</p>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-sunshine-50 p-3">
              <span className="text-3xl">{badge.emoji}</span>
              <div>
                <p className="font-bold">{badge.nombre}</p>
                <p className="text-sm text-ink/50">{historial.estrellas.length} estrella(s) en total</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Últimas asistencias</p>
              {historial.asistencia.length === 0 ? (
                <p className="text-sm text-ink/40">Sin registros todavía.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {historial.asistencia.map((a, i) => (
                    <li key={i} className="flex items-center justify-between border-b border-ink/5 py-1">
                      <span>{a.fecha}</span>
                      <span className={`badge ${a.presente ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                        {a.presente ? 'Presente' : 'Ausente'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Notas de progreso</p>
              {historial.notas.length === 0 ? (
                <p className="text-sm text-ink/40">Sin notas todavía.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {historial.notas.map((n, i) => (
                    <li key={i} className="rounded-xl bg-ink/5 px-3 py-2">
                      <p className="font-bold">
                        {n.fecha} {n.comportamiento && `· ${n.comportamiento}`} {n.emocion && `· ${n.emocion}`}
                      </p>
                      {n.logros && <p className="text-ink/60">{n.logros}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
