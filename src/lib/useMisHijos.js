import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function useMisHijos() {
  const { user } = useAuth()
  const [hijos, setHijos] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelado = false

    async function load() {
      const { data, error } = await supabase
        .from('ninos_padres')
        .select('parentesco, nino:ninos(*, nivel:niveles(*))')
        .eq('padre_id', user.id)
      if (error) console.error('useMisHijos:', error.message)
      const resultado = (data || []).map((row) => ({ ...row.nino, parentesco: row.parentesco }))
      if (!cancelado) setHijos(resultado)
    }

    load()
    return () => { cancelado = true }
  }, [user?.id])

  return hijos
}
