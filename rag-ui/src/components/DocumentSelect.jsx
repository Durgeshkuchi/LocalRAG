import { useEffect, useState } from 'react'
import { listDocuments } from '../api'

export default function DocumentSelect({ value, onChange }) {
  const [docs, setDocs] = useState([])
  const selected = value ?? '' // empty string means "All"

  useEffect(() => {
    let mounted = true
    listDocuments()
      .then((res) => {
        if (!mounted) return
        setDocs(res.documents || [])
      })
      .catch(console.error)

    return () => {
      mounted = false
    }
  }, [])

  return (
    <select
      className="w-full border rounded px-3 py-2 text-sm"
      value={selected}
      onChange={(e) => {
        const v = e.target.value
        onChange?.(v === '' ? null : v)
      }}
    >
      <option value="">All documents</option>

      {docs.map((d) => (
        <option key={d.doc_id} value={d.doc_id}>
          {d.filename} ({d.doc_id.slice(0, 8)})
        </option>
      ))}
    </select>
  )
}
