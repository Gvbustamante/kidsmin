import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const STAFF = ['admin', 'coordinador']

function hoyStr() {
  return new Date().toISOString().slice(0, 10)
}

function diaDelAnio() {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), 0, 0)
  const diff = hoy - inicio
  return Math.floor(diff / 86400000)
}

const THEMES = [
  { accent: '#1cade4', glow: 'rgba(28,173,228,0.28)', label: '#0b76a0', chip: 'bg-sky-50' },
  { accent: '#f0296f', glow: 'rgba(240,41,111,0.24)', label: '#c81856', chip: 'bg-coral-50' },
  { accent: '#ff9500', glow: 'rgba(255,149,0,0.26)', label: '#c96b00', chip: 'bg-sunshine-50' },
]

const INTROS = [
  (n) => (n ? `Mira, ${n}: hoy Dios te dice` : 'Hoy Dios te dice'),
  (n) => (n ? `${n}, escucha lo que el Señor tiene para ti hoy` : 'Escucha lo que el Señor tiene para ti hoy'),
  (n) => (n ? `Oye, ${n}, esto es lo que te mando hoy` : 'Esto es lo que se te manda hoy'),
  (n) => (n ? `${n}, guarda esta palabra en tu corazón hoy` : 'Guarda esta palabra en tu corazón hoy'),
  (n) => (n ? `Para ti, ${n}, con todo su amor` : 'Para ti, con todo su amor'),
]

export default function CitaDelDia() {
  const { profile } = useAuth()
  const esStaff = STAFF.includes(profile?.role)

  const [status, setStatus] = useState('cargando') // cargando | listo | elegir
  const [cita, setCita] = useState(null)
  const [pool, setPool] = useState([])
  const [elegido, setElegido] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const hoy = hoyStr()
    const { data: deHoy } = await supabase.from('citas_biblicas').select('*').eq('fecha_mostrar', hoy).maybeSingle()
    if (deHoy) {
      setCita(deHoy)
      setStatus('listo')
      return
    }

    const { data: devocionalActivo } = await supabase
      .from('devocionales_ninos')
      .select('titulo, versiculo')
      .eq('activo', true)
      .maybeSingle()
    if (devocionalActivo?.versiculo) {
      setCita({ texto: devocionalActivo.versiculo, referencia: devocionalActivo.titulo })
      setStatus('listo')
      return
    }

    if (esStaff) {
      const { data: todas } = await supabase.from('citas_biblicas').select('id, texto, referencia').order('referencia')
      setPool(todas || [])
      setElegido(todas?.[0]?.id || '')
      setStatus('elegir')
      return
    }
    const { data } = await supabase.from('citas_biblicas').select('*').eq('activo', true).order('created_at')
    if (data && data.length > 0) {
      setCita(data[diaDelAnio() % data.length])
      setStatus('listo')
    } else {
      setStatus('elegir')
    }
  }, [esStaff])

  useEffect(() => {
    load()
  }, [load])

  async function usarHoy() {
    if (!elegido) return
    setBusy(true)
    const { error } = await supabase.from('citas_biblicas').update({ fecha_mostrar: hoyStr() }).eq('id', elegido)
    if (!error) {
      const { data } = await supabase.from('citas_biblicas').select('*').eq('id', elegido).maybeSingle()
      setCita(data)
      setStatus('listo')
    }
    setBusy(false)
  }

  if (status === 'cargando') return null

  if (status === 'elegir') {
    return (
      <div className="card border-4 border-sky-200 bg-sky-50">
        <p className="text-lg font-extrabold text-sky-700">📖 Aún no elegiste la cita de hoy</p>
        <p className="mt-1 text-sm text-ink/60">
          ¿Cuál será la cita del día para todos? Elige una de tu lista o crea una nueva.
        </p>
        {pool.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select className="input flex-1" value={elegido} onChange={(e) => setElegido(e.target.value)}>
              {pool.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.referencia} — {c.texto.slice(0, 40)}
                  {c.texto.length > 40 ? '…' : ''}
                </option>
              ))}
            </select>
            <button disabled={busy} onClick={usarHoy} className="btn-primary !py-3 whitespace-nowrap">
              {busy ? 'Guardando...' : 'Usar hoy'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/50">Todavía no hay ninguna cita cargada.</p>
        )}
        <Link to="/citas-biblicas" className="mt-3 inline-block text-sm font-bold text-sky-600 hover:underline">
          Ir a Versículos para crear una nueva →
        </Link>
      </div>
    )
  }

  const theme = THEMES[diaDelAnio() % THEMES.length]
  const intro = INTROS[diaDelAnio() % INTROS.length]
  const primerNombre = profile?.nombre_completo?.trim().split(/\s+/)[0] || ''

  return (
    <div
      className="relative overflow-hidden rounded-blob bg-white p-6 shadow-card sm:p-7"
      style={{ borderLeft: `6px solid ${theme.accent}` }}
    >
      <style>{`
        @keyframes cd-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cd-sparkle { 0%, 100% { opacity: 0.25; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes cd-glow { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.65; } }
        .cd-body { animation: cd-in 0.5s ease-out 0.1s both; }
        .cd-sparkle { animation: cd-sparkle 2.6s ease-in-out infinite; }
        .cd-glow { animation: cd-glow 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cd-body, .cd-sparkle, .cd-glow { animation: none !important; }
        }
      `}</style>

      <div className="cd-glow pointer-events-none absolute -left-8 -top-8 h-36 w-36 rounded-full blur-3xl" style={{ background: theme.glow }} />
      <span className="cd-sparkle pointer-events-none absolute right-8 top-5 text-base" style={{ animationDelay: '0.5s' }}>
        ✨
      </span>
      <span className="cd-sparkle pointer-events-none absolute right-20 top-12 text-xs" style={{ animationDelay: '1.3s' }}>
        ✨
      </span>

      <div className="relative flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${theme.chip}`}>📖</div>
        <div className="min-w-0 flex-1">
          <div className="cd-body">
            <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: theme.label }}>
              Versículo del día
            </p>
            <p className="mt-1 text-sm font-bold text-ink/50">{intro(primerNombre)}:</p>
            <p className="mt-1 text-lg font-extrabold italic leading-snug text-ink sm:text-xl">"{cita.texto}"</p>
            <p className="mt-2 text-sm font-bold" style={{ color: theme.label }}>
              — {cita.referencia}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
