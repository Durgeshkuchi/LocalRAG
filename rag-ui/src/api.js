const API_BASE = 'http://localhost:8000'

export async function upload(formData, isPdf) {
  const endpoint = isPdf ? '/upload-pdf' : '/upload'
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listDocuments() {
  const res = await fetch(`${API_BASE}/documents`)
  return res.json()
}

export async function ask(question, docId) {
  const url = new URL(`${API_BASE}/query`)
  url.searchParams.set('q', question)
  if (docId) url.searchParams.set('doc_id', docId)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
