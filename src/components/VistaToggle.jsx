const DEFAULT_OPTIONS = [
  { value: 'tarjetas', label: '🔲 Tarjetas' },
  { value: 'lista', label: '☰ Lista' },
]

export default function VistaToggle({ vista, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm ${vista === opt.value ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
