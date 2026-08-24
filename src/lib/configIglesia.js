import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

let cache = null
let inFlight = null
const listeners = new Set()

function fetchConfig() {
  if (!inFlight) {
    inFlight = supabase
      .from('config_iglesia')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        cache = data || {}
        listeners.forEach((fn) => fn(cache))
        inFlight = null
        return cache
      })
  }
  return inFlight
}

export function refreshConfigIglesia() {
  return fetchConfig()
}

export function useConfigIglesia() {
  const [config, setConfig] = useState(cache)

  useEffect(() => {
    if (!cache) fetchConfig()
    const fn = (c) => setConfig(c)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return config
}
