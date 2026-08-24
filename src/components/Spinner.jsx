export default function Spinner({ label = 'Cargando...' }) {
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 text-ink/60">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
      <p className="font-display text-lg">{label}</p>
    </div>
  )
}
