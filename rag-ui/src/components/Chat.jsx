// import { useEffect, useState } from 'react'
// import { ask } from '../api'
// import DocumentSelect from './DocumentSelect'
// import ConfidenceBar from './ConfidenceBar'

// export default function Chat({ docId, onOpenPage }) {
//   const [selectedDocId, setSelectedDocId] = useState(docId)
//   const [question, setQuestion] = useState('')
//   const [answer, setAnswer] = useState('')
//   const [sources, setSources] = useState([])
//   const [confidence, setConfidence] = useState(null)
//   const [loading, setLoading] = useState(false)

//   useEffect(() => {
//     setSelectedDocId(docId)
//     setSources([])
//     setAnswer('')
//     setConfidence(null)
//   }, [docId])

//   async function handleAsk() {
//     if (!question.trim() || !selectedDocId) return

//     setLoading(true)
//     setAnswer('')
//     setSources([])
//     setConfidence(null)

//     try {
//       const res = await ask(question, selectedDocId)

//       setAnswer(res.answer || '')
//       setSources(res.sources || [])
//       setConfidence(res.confidence ?? null)
//     } catch (e) {
//       console.error(e)
//       setAnswer('Error while querying the document.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="h-full flex flex-col border rounded-lg bg-white overflow-hidden">
//       {/* Header */}
//       <div className="p-3 border-b space-y-2">
//         <DocumentSelect value={selectedDocId} onChange={setSelectedDocId} />

//         <div className="flex gap-2">
//           <input
//             className="flex-1 border rounded px-3 py-2"
//             value={question}
//             onChange={(e) => setQuestion(e.target.value)}
//             placeholder="Ask something about your document…"
//           />
//           <button
//             onClick={handleAsk}
//             disabled={loading}
//             className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
//           >
//             Ask
//           </button>
//         </div>

//         {loading && <p className="text-xs text-gray-500">Thinking…</p>}
//       </div>

//       {/* Body */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
//         {answer && (
//           <section className="bg-white border rounded-lg p-3">
//             <div className="text-sm font-semibold text-gray-700 mb-2">
//               Answer
//             </div>

//             <div className="whitespace-pre-wrap text-sm">{answer}</div>

//             <div className="mt-3">
//               <ConfidenceBar value={confidence} />
//             </div>
//           </section>
//         )}

//         {sources.length > 0 && (
//           <section className="bg-white border rounded-lg p-3">
//             <div className="text-sm font-semibold text-gray-700 mb-2">
//               Sources
//             </div>

//             <div className="space-y-3">
//               {sources.map((s, idx) => {
//                 const pageToOpen = s.page ?? 1

//                 return (
//                   <div key={idx} className="border rounded-md p-3 bg-gray-50">
//                     <div className="flex justify-between items-center">
//                       <div className="text-xs text-gray-600">
//                         {s.filename}
//                         {pageToOpen ? ` • page ${pageToOpen}` : ''}
//                       </div>

//                       {/* <button
//                         onClick={() => onOpenPage?.(pageToOpen)}
//                         className="text-xs text-blue-600 hover:underline"
//                       >
//                         Open page
//                       </button> */}
//                     </div>

//                     {s.preview && (
//                       <div className="mt-2 text-sm text-gray-700">
//                         {s.preview}
//                       </div>
//                     )}
//                   </div>
//                 )
//               })}
//             </div>
//           </section>
//         )}
//       </div>
//     </div>
//   )
// }

import { useEffect, useState } from 'react'
import { ask } from '../api'
import DocumentSelect from './DocumentSelect'
import ConfidenceBar from './ConfidenceBar'

export default function Chat({ docId, onOpenSource }) {
  const [selectedDocId, setSelectedDocId] = useState(docId ?? null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [confidence, setConfidence] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => setSelectedDocId(docId ?? null), [docId])

  async function handleAsk() {
    if (!question.trim()) return

    setLoading(true)
    setAnswer('')
    setSources([])
    setConfidence(null)

    try {
      // ✅ doc filter is optional now: null => query across ALL docs
      const res = await ask(question, selectedDocId || undefined)

      setAnswer(res.answer || '')
      setSources(res.sources || [])
      setConfidence(res.confidence ?? null)
    } catch (e) {
      console.error(e)
      setAnswer('Error while querying.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col border rounded-lg bg-white overflow-hidden">
      {/* header */}
      <div className="p-3 border-b space-y-2">
        <DocumentSelect value={selectedDocId} onChange={setSelectedDocId} />

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something..."
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Ask
          </button>
        </div>

        {loading && <p className="text-xs text-gray-500">Thinking…</p>}
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {answer && (
          <section className="bg-white border rounded-lg p-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Answer
            </div>
            <div className="whitespace-pre-wrap text-sm">{answer}</div>
            <div className="mt-3">
              <ConfidenceBar value={confidence} />
            </div>
          </section>
        )}

        {sources.length > 0 && (
          <section className="bg-white border rounded-lg p-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Sources
            </div>

            <div className="space-y-3">
              {sources.map((s, idx) => (
                <div key={idx} className="border rounded-md p-3 bg-white">
                  <div className="flex justify-between items-center gap-3">
                    <div className="text-xs text-gray-600">
                      {s.filename || 'document'}
                      {s.doc_id ? ` • ${String(s.doc_id).slice(0, 8)}` : ''}
                      {s.page ? ` • page ${s.page}` : ''}
                    </div>

                    {!!(s.doc_id && s.page) && (
                      <button
                        onClick={() => onOpenSource?.(s.doc_id, s.page)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Open page
                      </button>
                    )}
                  </div>

                  {s.preview && (
                    <div className="mt-2 text-sm text-gray-700">
                      {s.preview}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
