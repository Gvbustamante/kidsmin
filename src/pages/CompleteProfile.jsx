import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PasswordInput from '../components/PasswordInput'

export default function CompleteProfile() {
  const { user, profile, needsProfile, passwordRecovery, loading, refreshProfile, clearPasswordRecovery, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.nombre_completo || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && !needsProfile && !passwordRecovery) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setError(pwError.message)
      setBusy(false)
      return
    }

    if (needsProfile) {
      const role = user.app_metadata?.role || 'padre'
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        role,
        nombre_completo: nombre,
      })
      if (profileError) {
        setError('No se pudo crear tu perfil: ' + profileError.message)
        setBusy(false)
        return
      }
    }

    clearPasswordRecovery()
    await refreshProfile()
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grape-100 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-6xl">🎉</span>
          <h1 className="text-2xl font-bold text-grape-600">¡Bienvenido/a{profile?.nombre_completo ? `, ${profile.nombre_completo.split(' ')[0]}` : ''}!</h1>
          <p className="text-ink/50">Crea tu contraseña para entrar a la escuelita</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {needsProfile && (
            <div>
              <label className="label">Tu nombre completo</label>
              <input required className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Crea una contraseña</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="label">Confirma tu contraseña</label>
            <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-2 justify-center">
            {busy ? 'Guardando...' : 'Empezar a usar la app'}
          </button>
          <button type="button" onClick={signOut} className="text-sm text-ink/40 underline">
            Cancelar y salir
          </button>
        </form>
      </div>
    </div>
  )
}
