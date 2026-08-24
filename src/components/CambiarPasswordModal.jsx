import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import PasswordInput from './PasswordInput'

export default function CambiarPasswordModal({ open, onClose }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  function handleClose() {
    setPassword('')
    setConfirm('')
    setError('')
    setOk(false)
    onClose()
  }

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
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    setOk(true)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cambiar mi contraseña">
      {ok ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">✅</span>
          <p className="font-bold">¡Listo! Tu contraseña se actualizó.</p>
          <button className="btn-primary" onClick={handleClose}>
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nueva contraseña</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="label">Confirma la nueva contraseña</label>
            <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      )}
    </Modal>
  )
}
