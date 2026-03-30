export default function Logo({ size = 36 }) {
  return (
    <div className="flex items-center gap-1">
      {/* Galão de água 20L */}
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="3" width="12" height="5" rx="2" fill="#60a5fa"/>
        <path d="M17 3 Q20 0 23 3" stroke="#93c5fd" strokeWidth="1.5" fill="none"/>
        <rect x="10" y="8" width="20" height="26" rx="4" fill="#bfdbfe"/>
        <rect x="13" y="11" width="5" height="14" rx="2.5" fill="white" opacity="0.5"/>
        <rect x="10" y="24" width="20" height="10" rx="0 0 4 4" fill="#3b82f6" opacity="0.5"/>
        <rect x="13" y="15" width="14" height="8" rx="1.5" fill="#1d4ed8" opacity="0.7"/>
        <text x="20" y="21" textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">20L</text>
        <rect x="12" y="34" width="16" height="3" rx="1.5" fill="#93c5fd"/>
      </svg>

      {/* Botijão de gás 13kg */}
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="17" y="2" width="6" height="4" rx="1.5" fill="#9ca3af"/>
        <rect x="15" y="5" width="10" height="3" rx="1" fill="#6b7280"/>
        <rect x="16" y="7" width="8" height="4" rx="2" fill="#d1d5db"/>
        <ellipse cx="20" cy="24" rx="11" ry="15" fill="#f97316"/>
        <ellipse cx="15" cy="18" rx="3" ry="6" fill="white" opacity="0.25"/>
        <rect x="12" y="19" width="16" height="10" rx="2" fill="#ea580c"/>
        <text x="20" y="25.5" textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">13kg</text>
        <text x="20" y="27.5" textAnchor="middle" fontSize="2.5" fill="#fed7aa">GÁS</text>
        <ellipse cx="20" cy="37" rx="9" ry="2.5" fill="#c2410c"/>
      </svg>
    </div>
  )
}
