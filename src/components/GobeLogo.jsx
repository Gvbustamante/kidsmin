export default function GobeLogo({ className = 'h-8 w-auto' }) {
  return (
    <svg viewBox="0 0 460 100" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gobe App Technology">
      <defs>
        <linearGradient id="gobeSlash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6bff" />
          <stop offset="100%" stopColor="#29c2f0" />
        </linearGradient>
      </defs>
      <polyline points="55,15 18,50 55,85" fill="none" stroke="#0d1b42" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="95" y1="10" x2="68" y2="90" stroke="url(#gobeSlash)" strokeWidth="8" strokeLinecap="round" />
      <polyline points="105,15 142,50 105,85" fill="none" stroke="#0d1b42" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <text x="175" y="65" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="42" letterSpacing="1" fill="#0d1b42">
        GOBE APP
      </text>
    </svg>
  )
}
