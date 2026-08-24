import { useCountUp } from '../lib/useCountUp'

const COLORS = {
  sky: 'bg-sky-100 text-sky-700 ring-sky-200',
  grass: 'bg-grass-100 text-grass-700 ring-grass-200',
  sunshine: 'bg-sunshine-100 text-sunshine-700 ring-sunshine-200',
  coral: 'bg-coral-100 text-coral-700 ring-coral-200',
  grape: 'bg-grape-100 text-grape-700 ring-grape-200',
}

export default function StatCard({ icon, label, value, color = 'sky', delay = 0 }) {
  const shown = useCountUp(value)

  return (
    <div
      className="card animate-pop-in flex items-center gap-3 !p-4 transition-transform duration-200 ease-out hover:-translate-y-1 sm:gap-4 sm:!p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ring-4 sm:h-16 sm:w-16 sm:text-3xl ${COLORS[color]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold leading-none tabular-nums sm:text-3xl">{shown}</p>
        <p className="mt-1 text-xs font-bold leading-tight text-ink/50 sm:text-sm">{label}</p>
      </div>
    </div>
  )
}
