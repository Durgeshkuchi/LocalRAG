import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function pickKeywords(query = '', max = 6) {
  const stop = new Set([
    'what',
    'is',
    'the',
    'a',
    'an',
    'and',
    'or',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'about',
    'this',
    'that',
    'it',
    'are',
    'was',
    'were',
    'does',
    'do',
    'did',
    'explain',
    'define',
  ])

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w))
    .slice(0, max)
}

export default function PdfViewer({ docId, page = 1 }) {
  if (!docId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 border rounded-lg bg-white">
        No document selected
      </div>
    )
  }

  // Native PDF viewer supports #page=
  const src = `http://localhost:8000/pdf/${docId}#page=${page || 1}`

  return (
    <div className="h-full flex flex-col border rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 border-b text-xs text-gray-600 flex justify-between">
        <div>PDF Viewer</div>
        <div>
          Page <span className="font-semibold">{page || 1}</span>
        </div>
      </div>

      {/* IMPORTANT: iframe itself must be the scroll surface */}
      <iframe
        key={`${docId}-${page}`} // 👈 forces navigation to new #page
        src={src}
        title="PDF"
        className="w-full flex-1"
      />
    </div>
  )
}

function applyHighlightToTextLayer(textLayerEl, keywords) {
  if (!textLayerEl || !keywords?.length) return
  const spans = textLayerEl.querySelectorAll('span')

  for (const span of spans) {
    const raw = span.textContent || ''
    if (!keywords.some((k) => raw.toLowerCase().includes(k))) continue

    let html = escapeHtml(raw)
    for (const k of keywords) {
      const re = new RegExp(`(${k})`, 'gi')
      html = html.replace(re, '<mark class="pdf-mark">$1</mark>')
    }
    span.innerHTML = html
  }
}
