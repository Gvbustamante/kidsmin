import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'
import { usePermisosRol, refreshPermisosRol, PERMISOS_DISPONIBLES } from '../lib/permisosRol'

const ROLE_LABEL = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente', padre: 'Padre / Madre' }
const ROLE_BADGE = {
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
  padre: 'bg-coral-100 text-coral-700',
}

/**
 * Interruptores de permisos extra por rol. Solo lo ve `admin` (ver Ajustes.jsx).
 * Vivía antes como una pestaña dentro de la pantalla Usuarios, que se
 * fusionó con Docentes ("Equipo") — esta parte se movió a Ajustes.
 */
export default function PermisosTab() {
  const { permisos, cargando, error: errorCarga } = usePermisosRol()
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')

  async function toggle(rol, permiso) {
    const key = `${rol}_${permiso}`
    setBusyKey(key)
    setError('')
    const actual = permisos?.find((p) => p.rol === rol && p.permiso === permiso)
    const { error: upsertError } = await supabase
      .from('permisos_rol')
      .upsert({ rol, permiso, activo: !actual?.activo }, { onConflict: 'rol,permiso' })
    if (upsertError) {
      setError(upsertError.message)
      setBusyKey('')
      return
    }
    await refreshPermisosRol()
    setBusyKey('')
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-ink/50">
        Interruptores extra para lo que un rol puede hacer, además de lo normal de la plataforma. Se aplican al
        instante — no hace falta guardar.
      </p>
      {errorCarga && (
        <p className="max-w-2xl rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">
          No pude cargar los permisos: {errorCarga}. ¿Ya corriste <code>actualizacion_permisos.sql</code> en tu
          proyecto de Supabase?
        </p>
      )}
      {error && (
        <p className="max-w-2xl rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">
          No se pudo guardar: {error}
        </p>
      )}
      {PERMISOS_DISPONIBLES.map((p) => {
        const activo = !!permisos?.find((row) => row.rol === p.rol && row.permiso === p.permiso)?.activo
        const key = `${p.rol}_${p.permiso}`
        return (
          <div key={key} className="card flex max-w-2xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${ROLE_BADGE[p.rol]}`}>{ROLE_LABEL[p.rol]}</span>
                <p className="font-bold">{p.label}</p>
              </div>
              <p className="mt-1 text-sm text-ink/50">{p.detalle}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(p.rol, p.permiso)}
              disabled={busyKey === key}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                activo ? 'bg-grass-400 text-white' : 'bg-ink/10 text-ink/50'
              }`}
            >
              {busyKey === key ? '...' : activo ? '✅ Activado' : 'Desactivado'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
