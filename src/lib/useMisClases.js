import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function useMisClases() {
  const { user } = useAuth()
  const [clases, setClases] = useState(null)
  const [nivelId, setNivelId] = useState('')

  useEffect(() => {
    async function load() {
      const { data: asign } = await supabase.from('docentes_niveles').select('nivel_id').eq('docente_id', user.id)
      const nivelIds = (asign || []).map((a) => a.nivel_id)
      if (nivelIds.length === 0) {
        setClases([])
        return
      }
      const { data: niveles } = await supabase.from('niveles').select('*').in('id', nivelIds).order('nombre')
      setClases(niveles || [])
      setNivelId((niveles || [])[0]?.id || '')
    }
    load()
  }, [user.id])

  return { clases, nivelId, setNivelId }
}
