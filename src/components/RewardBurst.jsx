const PARTICLES = ['⭐', '✨', '🌟', '✨', '⭐', '🎉']

export default function RewardBurst({ toast }) {
  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
      <style>{`
        @keyframes rb-pop { 0% { transform: translateY(8px) scale(0.85); opacity: 0; } 15% { transform: translateY(0) scale(1.04); opacity: 1; } 85% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-6px) scale(0.98); opacity: 0; } }
        @keyframes rb-fly { 0% { transform: translate(0, 0) scale(0.6); opacity: 1; } 100% { transform: translate(var(--rb-x), -70px) scale(1); opacity: 0; } }
        .rb-toast { animation: rb-pop 2.2s ease-out both; }
        .rb-particle { animation: rb-fly 0.9s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .rb-toast, .rb-particle { animation: none !important; } }
      `}</style>

      <div key={toast.key} className="rb-toast relative flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-white shadow-soft">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="rb-particle pointer-events-none absolute left-1/2 top-1/2 text-lg"
            style={{ '--rb-x': `${(i - 2.5) * 22}px`, animationDelay: `${i * 0.03}s` }}
          >
            {p}
          </span>
        ))}
        <span className="text-xl">🌟</span>
        <span className="font-extrabold">{toast.message}</span>
      </div>
    </div>
  )
}
