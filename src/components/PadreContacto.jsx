import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { whatsappLink } from '../lib/whatsapp'

export default function PadreContacto({ padre, parentesco, onSaved, onDesvincular }) {
  const [telefono, setTelefono] = useState(padre?.telefono || '')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    setTelefono(padre?.telefono || '')
    setOk(false)
  }, [padre?.id, padre?.telefono])

  async function guardar() {
    setBusy(true)
    await supabase.from('profiles').update({ telefono: telefono || null }).eq('id', padre.id)
    setBusy(false)
    setOk(true)
    onSaved?.()
  }

  const link = whatsappLink(padre?.telefono)

  return (
    <div className="rounded-xl bg-ink/5 p-3">
      <p className="flex flex-wrap items-center justify-between gap-2 font-bold">
        <span className="flex flex-wrap items-center gap-2">
          {padre?.nombre_completo} {parentesco && `(${parentesco})`}
          {padre?.pausado && <span className="badge bg-ink/10 text-ink/50">⏸️ Sin entrar hace tiempo</span>}
        </span>
        {onDesvincular && (
          <button
            type="button"
            onClick={onDesvincular}
            className="shrink-0 text-xs font-bold text-coral-500 hover:underline"
          >
            ✕ Desvincular
          </button>
        )}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          className="input !py-2 !text-sm"
          placeholder="WhatsApp, ej. 18091234567"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <button type="button" onClick={guardar} disabled={busy} className="btn-secondary shrink-0 !px-3 !text-sm">
          {busy ? '...' : 'Guardar'}
        </button>
      </div>
      {ok && <p className="mt-1 text-xs font-bold text-grass-600">Guardado ✔️</p>}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="btn-success mt-2 w-full justify-center !py-2 !text-sm">
          💬 Abrir chat de WhatsApp
        </a>
      )}
    </div>
  )
}
