import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

let cache = null
let inFlight = null
const listeners = new Set()

function fetchMotivos() {
  if (!inFlight) {
    inFlight = supabase
      .from('motivos_reconocimiento')
      .select('*')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => {
        cache = data || []
        listeners.forEach((fn) => fn(cache))
        inFlight = null
        return cache
      })
  }
  return inFlight
}

export function refreshMotivosReconocimiento() {
  return fetchMotivos()
}

export function useMotivosReconocimiento() {
  const [motivos, setMotivos] = useState(cache || [])

  useEffect(() => {
    if (!cache) fetchMotivos()
    const fn = (m) => setMotivos(m)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return motivos
}
