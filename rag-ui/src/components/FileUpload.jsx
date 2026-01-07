import { useState } from 'react'
import { upload, getJob } from '../api'

export default function FileUpload({ onUploaded }) {
  const [status, setStatus] = useState('')
  const [fileName, setFileName] = useState('')
  const [polling, setPolling] = useState(false)

  async function pollJob(jobId) {
    setPolling(true)

    const interval = setInterval(async () => {
      try {
        const job = await getJob(jobId)

        if (job.status === 'processing') {
          const p = job.progress || {}
          setStatus(`Indexing… page ${p.page || 0} / ${p.total_pages || '?'}`)
        }

        if (job.status === 'done') {
          clearInterval(interval)
          setPolling(false)

          setStatus(`✅ Indexed ${job.result.chunks_created} chunks`)

          onUploaded?.(job.result.doc_id)
        }

        if (job.status === 'error') {
          clearInterval(interval)
          setPolling(false)
          setStatus(`❌ ${job.error}`)
        }
      } catch (e) {
        clearInterval(interval)
        setPolling(false)
        setStatus('❌ Failed to fetch job status')
      }
    }, 1500)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    setStatus('Uploading…')

    const formData = new FormData()
    formData.append('file', file)

    const isPdf = file.name.toLowerCase().endsWith('.pdf')

    try {
      const res = await upload(formData, isPdf)

      // 🔴 NEW BEHAVIOR
      if (res.job_id) {
        setStatus('Queued for indexing…')
        pollJob(res.job_id)
      } else {
        // TXT upload (sync)
        setStatus(`✅ Indexed ${res.chunks_created} chunks`)
        onUploaded?.(res.doc_id)
      }
    } catch (err) {
      console.error(err)
      setStatus('❌ Upload failed')
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-2">Upload Document</h2>

      <input
        type="file"
        accept=".pdf,.txt"
        disabled={polling}
        onChange={handleUpload}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-600 file:text-white
          hover:file:bg-blue-700 cursor-pointer"
      />

      {fileName && (
        <p className="mt-2 text-sm text-gray-500">Selected: {fileName}</p>
      )}

      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  )
}
