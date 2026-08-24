export default function HijoSelector({ hijos, selectedId, onChange }) {
  if (!hijos || hijos.length < 2) return null

  return (
    <div className="flex flex-wrap gap-2">
      {hijos.map((h) => (
        <button
          key={h.id}
          onClick={() => onChange(h.id)}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${selectedId === h.id ? 'bg-sky-400 text-white shadow-sm' : 'bg-white text-ink/50 hover:bg-ink/5'}`}
        >
          {h.nombre_completo.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}
