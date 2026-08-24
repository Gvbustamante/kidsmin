import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import CambiarPasswordModal from './CambiarPasswordModal'
import AppLogo from './AppLogo'
import AppName from './AppName'

const NAV = {
  admin: [
    { to: '/', label: 'Inicio', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/asistencia', label: 'Asistencia', icon: '✅' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋' },
    { to: '/planeacion', label: 'Planeación', icon: '📆' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/drive', label: 'Drive', icon: '📁' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/docentes', label: 'Equipo', icon: '🍎' },
    { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
  ],
  coordinador: [
    { to: '/', label: 'Inicio', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/asistencia', label: 'Asistencia', icon: '✅' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋' },
    { to: '/planeacion', label: 'Planeación', icon: '📆' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/drive', label: 'Drive', icon: '📁' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/docentes', label: 'Equipo', icon: '🍎' },
    { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
  ],
  docente: [
    { to: '/', label: 'Mis clases', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/asistencia', label: 'Asistencia', icon: '✅' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋' },
    { to: '/planeacion', label: 'Planeación', icon: '📆' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/progreso', label: 'Progreso', icon: '🌱' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/drive', label: 'Drive', icon: '📁' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
  padre: [
    { to: '/', label: 'Mi hijo/a', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/progreso', label: 'Progreso', icon: '🌱' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
}

const ROLE_LABEL = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  docente: 'Docente',
  padre: 'Padre / Madre',
}

export default function Layout() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { pathname } = useLocation()
  const [pwOpen, setPwOpen] = useState(false)
  const [tieneHijos, setTieneHijos] = useState(false)
  const [bienvenidaDeVuelta, setBienvenidaDeVuelta] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const yaRevisadoPausado = useRef(null)
  const mainRef = useRef(null)

  useEffect(() => {
    // El scroll real pasa en la ventana (el <main> no queda con altura
    // fija porque el contenedor de afuera usa min-h-screen, no h-screen),
    // así que hay que resetear window, no solo el <main>.
    window.scrollTo({ top: 0 })
    mainRef.current?.scrollTo({ top: 0 })
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!user || profile?.role === 'padre') return
    supabase
      .from('ninos_padres')
      .select('nino_id', { count: 'exact', head: true })
      .eq('padre_id', user.id)
      .then(({ count }) => setTieneHijos((count || 0) > 0))
  }, [user, profile?.role])

  useEffect(() => {
    if (!profile || profile.role !== 'padre' || !profile.pausado) return
    if (yaRevisadoPausado.current === profile.id) return
    yaRevisadoPausado.current = profile.id
    setBienvenidaDeVuelta(true)
    supabase
      .from('profiles')
      .update({ pausado: false })
      .eq('id', profile.id)
      .then(() => refreshProfile())
  }, [profile, refreshProfile])

  const items = [...(NAV[profile?.role] || [])]
  if (tieneHijos && ['admin', 'coordinador', 'docente'].includes(profile?.role)) {
    items.splice(1, 0, { to: '/mi-familia', label: 'Mi familia', icon: '👪' })
  }

  return (
    <div className="flex min-h-screen bg-cream">
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r-4 border-sky-100 bg-white px-4 py-4 transition-transform duration-300 ease-out
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:z-auto md:w-64 md:translate-x-0 md:py-6`}
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1 sm:mb-6">
          <div className="flex items-center gap-2">
            <AppLogo emojiClassName="text-3xl sm:text-4xl" imgClassName="h-9 w-9 object-contain sm:h-11 sm:w-11" />
            <span className="font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-sky-500">
              <AppName />
            </span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="shrink-0 rounded-full p-1.5 text-2xl leading-none text-ink/40 hover:bg-ink/5 md:hidden"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto sm:gap-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-base font-bold transition-colors sm:py-3 sm:text-lg ${
                  isActive ? 'bg-sky-400 text-white shadow-pop' : 'text-ink/60 hover:bg-sky-50'
                }`
              }
            >
              <span className="text-xl sm:text-2xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-2 flex flex-col gap-2 border-t-2 border-ink/5 pt-3 sm:mt-4 sm:pt-4">
          <div className="text-center">
            <p className="truncate text-sm font-bold">{profile?.nombre_completo}</p>
            <p className="text-xs text-ink/50">{ROLE_LABEL[profile?.role]}</p>
          </div>
          {!['admin', 'coordinador'].includes(profile?.role) && (
            <button onClick={() => setPwOpen(true)} className="btn-secondary w-full !px-2 !py-2 !text-sm sm:!text-base">
              <span>🔑</span>
              <span>Contraseña</span>
            </button>
          )}
          <button onClick={signOut} className="btn-secondary w-full !px-2 !py-2 !text-sm sm:!text-base">
            <span>🚪</span>
            <span>Salir</span>
          </button>
          <a
            href="https://gobeapp.com"
            target="_blank"
            rel="noreferrer"
            className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-ink/30 hover:text-sky-500"
          >
            Gobe App Technology
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b-4 border-sky-100 bg-white px-3 py-2.5 md:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-full p-2 text-2xl leading-none text-ink/60 hover:bg-sky-50"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <AppLogo emojiClassName="text-2xl" imgClassName="h-7 w-7 object-contain" />
            <span className="font-display text-base font-extrabold uppercase tracking-wide text-sky-500">
              <AppName />
            </span>
          </div>
          <span className="w-9" aria-hidden="true" />
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8">
          <div className="mx-auto w-full max-w-screen-2xl">
            {bienvenidaDeVuelta && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-sm font-bold text-sky-700">
                  👋 ¡Bienvenido/a de vuelta! Habíamos marcado tu cuenta como inactiva porque llevaba un tiempo sin
                  entrar — ya quedó activa de nuevo.
                </p>
                <button
                  onClick={() => setBienvenidaDeVuelta(false)}
                  className="shrink-0 text-lg font-bold text-sky-400 hover:text-sky-600"
                  aria-label="Cerrar aviso"
                >
                  ×
                </button>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      <CambiarPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
