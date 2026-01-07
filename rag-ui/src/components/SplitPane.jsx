import { useEffect, useRef, useState } from 'react'

export default function SplitPane({
  left,
  right,
  initialLeftPct = 55,
  minLeftPct = 30,
  maxLeftPct = 75,
}) {
  const containerRef = useRef(null)
  const draggingRef = useRef(false)
  const [leftPct, setLeftPct] = useState(initialLeftPct)

  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return
      const el = containerRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = (x / rect.width) * 100
      setLeftPct(Math.max(minLeftPct, Math.min(maxLeftPct, pct)))
    }

    function onUp() {
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [minLeftPct, maxLeftPct])

  function onDown() {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div ref={containerRef} className="w-full h-full flex">
      <div style={{ width: `${leftPct}%` }} className="h-full min-w-0">
        {left}
      </div>

      <div
        onMouseDown={onDown}
        title="Drag to resize"
        className="w-2 h-full cursor-col-resize flex items-center justify-center bg-gray-100"
      >
        <div className="w-1 h-full bg-gray-300 rounded" />
      </div>

      <div style={{ width: `${100 - leftPct}%` }} className="h-full min-w-0">
        {right}
      </div>
    </div>
  )
}
