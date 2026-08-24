import { useState } from 'react'
import { useNivelesEstrella, badgeActual, siguienteBadge, progresoHaciaSiguiente } from '../lib/nivelesEstrella'
import { useMotivosReconocimiento } from '../lib/motivosReconocimiento'

export default function RewardsPanel({ estrellas, recientes = [], onAward, busy }) {
  const niveles = useNivelesEstrella()
  const motivos = useMotivosReconocimiento()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [motivoElegido, setMotivoElegido] = useState('')
  const [motivoLibre, setMotivoLibre] = useState('')

  const badge = badgeActual(niveles, estrellas)
  const siguiente = siguienteBadge(niveles, estrellas)
  const pct = progresoHaciaSiguiente(niveles, estrellas)

  function confirmarEstrella() {
    const motivo = motivoLibre.trim() || motivoElegido || null
    onAward(motivo)
    setPickerOpen(false)
    setMotivoElegido('')
    setMotivoLibre('')
  }

  return (
    <div className="rw-card relative overflow-hidden rounded-blob border-4 border-sunshine-200 bg-sunshine-50 p-5">
      <style>{`
        @keyframes rw-badge-in { 0% { transform: scale(0.6) rotate(-8deg); opacity: 0; } 60% { transform: scale(1.12) rotate(4deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
        @keyframes rw-shine { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.8; } }
        .rw-badge { animation: rw-badge-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .rw-shine { animation: rw-shine 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rw-badge, .rw-shine { animation: none !important; } }
      `}</style>

      <div className="flex items-center gap-4">
        <span className="rw-badge rw-shine text-5xl drop-shadow-sm" aria-hidden="true">
          {badge.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-sunshine-700">Insignia actual</p>
          <p className="truncate text-lg font-extrabold text-ink">{badge.nombre}</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-sunshine-400 transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-bold text-ink/50">
            {estrellas} ⭐
            {siguiente
              ? ` · faltan ${siguiente.min_estrellas - estrellas} para ${siguiente.emoji} ${siguiente.nombre}`
              : ' · ¡insignia máxima desbloqueada!'}
          </p>
        </div>
      </div>

      {onAward && !pickerOpen && (
        <button onClick={() => setPickerOpen(true)} className="btn-primary mt-4 w-full justify-center !bg-sunshine-500 hover:!bg-sunshine-600">
          ⭐ Dar una estrella
        </button>
      )}

      {onAward && pickerOpen && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/40">¿Por qué se la ganó?</p>
          <div className="flex flex-wrap gap-2">
            {motivos.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => {
                  setMotivoElegido(m.texto)
                  setMotivoLibre('')
                }}
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  motivoElegido === m.texto ? 'bg-sunshine-400 text-white' : 'bg-ink/5'
                }`}
              >
                {m.emoji} {m.texto}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="input"
            placeholder="O escribe tu propio motivo (opcional)"
            value={motivoLibre}
            onChange={(e) => {
              setMotivoLibre(e.target.value)
              setMotivoElegido('')
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary flex-1 !py-2 !text-sm"
              onClick={() => {
                setPickerOpen(false)
                setMotivoElegido('')
                setMotivoLibre('')
              }}
            >
              Cancelar
            </button>
            <button disabled={busy} onClick={confirmarEstrella} className="btn-primary flex-1 !py-2 !text-sm justify-center !bg-sunshine-500 hover:!bg-sunshine-600">
              {busy ? 'Guardando...' : '⭐ Confirmar'}
            </button>
          </div>
        </div>
      )}

      {recientes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t-2 border-sunshine-100 pt-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/40">Últimas estrellas</p>
          {recientes.slice(0, 4).map((r) => (
            <p key={r.id} className="text-sm text-ink/70">
              ⭐ {r.motivo || 'Reconocimiento'} <span className="text-ink/40">— {r.created_at?.slice(0, 10)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
