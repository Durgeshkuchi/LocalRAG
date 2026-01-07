export default function ConfidenceBar({ value }) {
  if (value === null || value === undefined) return null

  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))

  // color by confidence level
  let color = 'bg-red-500'
  if (pct >= 70) color = 'bg-green-500'
  else if (pct >= 40) color = 'bg-yellow-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>Answer confidence</span>
        <span>{pct}%</span>
      </div>

      <div
        className="w-full h-2 bg-gray-200 rounded"
        title={`Confidence score: ${pct}%`}
      >
        <div
          className={`h-2 rounded transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
