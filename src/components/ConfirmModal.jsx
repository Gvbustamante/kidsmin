import Modal from './Modal'

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro/a?',
  message,
  confirmLabel = 'Sí, continuar',
  busy = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">
        {message && <p className="text-ink/60">{message}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn-danger flex-1 justify-center" onClick={onConfirm} disabled={busy}>
            {busy ? 'Un momento...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
