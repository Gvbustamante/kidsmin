import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const userIdRef = useRef(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id ?? null
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)

      const nuevoUserId = session?.user?.id ?? null
      const esMismoUsuario = nuevoUserId === userIdRef.current
      userIdRef.current = nuevoUserId

      setSession(session)

      // Supabase vuelve a disparar SIGNED_IN con la misma sesión cada vez
      // que la pestaña recupera el foco (no es un login real) — si ahí
      // ponemos loading=true, App.jsx desmonta toda la app (incluyendo
      // cualquier modal abierto o texto sin guardar) para mostrar el
      // spinner de pantalla completa. Solo lo hacemos si de verdad cambió
      // de usuario o cerró sesión.
      if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && !esMismoUsuario)) {
        setLoading(true)
        loadProfile(nuevoUserId).finally(() => setLoading(false))
      } else {
        loadProfile(nuevoUserId)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()
  const refreshProfile = () => loadProfile(session?.user?.id)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
    needsProfile: !!session?.user && !loading && !profile,
    passwordRecovery,
    clearPasswordRecovery: () => setPasswordRecovery(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
