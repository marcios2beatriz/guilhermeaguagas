export function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton h-8 w-24 mb-2" />
      <div className="skeleton h-3 w-16" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="skeleton h-3 w-48" />
      </div>
      <div className="divide-y divide-blue-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className={`skeleton h-4 ${j === 0 ? 'w-32' : 'w-20'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
