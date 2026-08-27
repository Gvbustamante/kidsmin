import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLogo from '../components/AppLogo'
import AppName from '../components/AppName'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const valor = usuario.trim()
    const email = valor.includes('@')
      ? valor
      : `${valor.toLowerCase().replace(/[^a-z0-9]/g, '')}@accesskids.local`
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError('Usuario (o correo) o contraseña incorrectos.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sky-100 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <AppLogo emojiClassName="text-6xl" imgClassName="h-16 w-16 object-contain" />
          <h1 className="text-3xl uppercase text-sky-500">
            <AppName />
          </h1>
          <p className="font-bold text-ink/50">Ingresa con tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Usuario</label>
            <input
              required
              className="input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Tu usuario"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-2 justify-center">
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/40">
          ¿No tienes cuenta? Pide al administrador de tu escuelita que te invite.
        </p>
        <Link to="/bienvenida" className="mt-2 block text-center text-sm font-bold text-sky-500 hover:underline">
          ← Conoce KidsMin
        </Link>
      </div>
    </div>
  )
}
