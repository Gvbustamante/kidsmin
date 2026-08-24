import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Insignias por defecto, usadas solo si la tabla niveles_estrella todavía
// no tiene filas (por ejemplo antes de correr la actualización de SQL).
const FALLBACK = [
  { min_estrellas: 0, emoji: '🐣', nombre: 'Explorador nuevo' },
  { min_estrellas: 3, emoji: '🦊', nombre: 'Curioso' },
  { min_estrellas: 6, emoji: '🦁', nombre: 'Valiente' },
  { min_estrellas: 10, emoji: '🦋', nombre: 'Brillante' },
  { min_estrellas: 15, emoji: '🌟', nombre: 'Estrella de la Biblia' },
  { min_estrellas: 20, emoji: '👑', nombre: 'Campeón de fe' },
]

let cache = null
let inFlight = null
const listeners = new Set()

function fetchNiveles() {
  if (!inFlight) {
    inFlight = supabase
      .from('niveles_estrella')
      .select('*')
      .order('min_estrellas')
      .then(({ data }) => {
        cache = data && data.length ? data : FALLBACK
        listeners.forEach((fn) => fn(cache))
        inFlight = null
        return cache
      })
  }
  return inFlight
}

export function refreshNivelesEstrella() {
  return fetchNiveles()
}

export function useNivelesEstrella() {
  const [niveles, setNiveles] = useState(cache || FALLBACK)

  useEffect(() => {
    if (!cache) fetchNiveles()
    const fn = (n) => setNiveles(n)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return niveles
}

export function badgeActual(niveles, estrellas) {
  return [...niveles].reverse().find((b) => estrellas >= b.min_estrellas) || niveles[0]
}

export function siguienteBadge(niveles, estrellas) {
  return niveles.find((b) => estrellas < b.min_estrellas) || null
}

export function progresoHaciaSiguiente(niveles, estrellas) {
  const actual = badgeActual(niveles, estrellas)
  const siguiente = siguienteBadge(niveles, estrellas)
  if (!siguiente) return 100
  const rango = siguiente.min_estrellas - actual.min_estrellas
  const avance = estrellas - actual.min_estrellas
  return Math.min(100, Math.round((avance / rango) * 100))
}
