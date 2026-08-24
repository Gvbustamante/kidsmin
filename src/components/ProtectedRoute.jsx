import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ roles, children }) {
  const { session, profile, loading, needsProfile, passwordRecovery } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (passwordRecovery || needsProfile) return <Navigate to="/completar-perfil" replace />
  if (!profile) return <Spinner />
  if (profile.activo === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-5xl">🚫</span>
        <h2 className="text-2xl font-bold">Tu cuenta está desactivada</h2>
        <p className="text-ink/60">Habla con el administrador de tu escuelita.</p>
      </div>
    )
  }
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
