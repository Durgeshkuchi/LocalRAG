// import { useState } from 'react'
// import FileUpload from './components/FileUpload'
// import Chat from './components/Chat'
// import PdfViewer from './components/PdfViewer'
// import SplitPane from './components/SplitPane'

// export default function App() {
//   const [docId, setDocId] = useState(null)
//   const [page, setPage] = useState(1)

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">
//         <h1 className="text-2xl font-bold mb-2">Local RAG Application</h1>
//         <p className="text-gray-600 mb-4">
//           Upload documents and ask questions using your local LLM
//         </p>

//         <FileUpload
//           onUploaded={(newDocId) => {
//             setDocId(newDocId)
//             setPage(1)
//           }}
//         />

//         <div className="h-[75vh]">
//           <SplitPane
//             initialLeftPct={55}
//             minLeftPct={30}
//             maxLeftPct={75}
//             left={
//               docId ? (
//                 <Chat docId={docId} onOpenPage={(p) => setPage(p)} />
//               ) : (
//                 <div className="h-full flex items-center justify-center text-gray-400 border rounded-lg">
//                   Upload a document to start
//                 </div>
//               )
//             }
//             right={<PdfViewer docId={docId} page={page} />}
//           />
//         </div>
//       </div>
//     </div>
//   )
// }

import { useState } from 'react'
import FileUpload from './components/FileUpload'
import Chat from './components/Chat'
import PDFViewer from './components/PdfViewer'
import SplitPane from './components/SplitPane'

export default function App() {
  // optional: “current uploaded doc”
  const [uploadedDocId, setUploadedDocId] = useState(null)

  const [viewerDocId, setViewerDocId] = useState(null)
  const [page, setPage] = useState(1)

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Local RAG Application</h1>
        <p className="text-gray-600 mb-4">
          Upload documents and ask questions using your local LLM
        </p>

        <FileUpload
          onUploaded={(newDocId) => {
            setUploadedDocId(newDocId)
            setViewerDocId(newDocId)
            setPage(1)
          }}
        />

        <div className="h-[75vh]">
          <SplitPane
            initialLeftPct={55}
            minLeftPct={30}
            maxLeftPct={75}
            left={
              <Chat
                docId={uploadedDocId}
                onOpenSource={(doc_id, p) => {
                  setViewerDocId(doc_id)
                  setPage(p || 1)
                }}
              />
            }
            right={<PDFViewer docId={viewerDocId} page={page} />}
          />
        </div>
      </div>
    </div>
  )
}
