import { supabase } from './supabaseClient'

export async function crearUsuario({ cedula, nombre_completo, role, nino_id, parentesco }) {
  const { data, error } = await supabase.rpc('admin_create_invited_user', {
    p_cedula: cedula,
    p_role: role,
    p_nombre_completo: nombre_completo,
    p_nino_id: nino_id ?? null,
    p_parentesco: parentesco ?? null,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return { id: row.id, password: row.password }
}
