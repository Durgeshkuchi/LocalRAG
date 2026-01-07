# backend/app.py
from __future__ import annotations

import os
import shutil
import uuid
import threading
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse

from langchain_ollama import OllamaLLM, OllamaEmbeddings
from langchain_chroma import Chroma

from backend.ingest import ingest_pdf_file, ingest_text_file

# -------------------------------------------------------------------
# Retrieval tuning
# -------------------------------------------------------------------

TOP_K = 8
MAX_CONTEXT_CHUNKS = 4
SCORE_THRESHOLD = 0.45

# -------------------------------------------------------------------
# App setup
# -------------------------------------------------------------------

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Models
# -------------------------------------------------------------------

llm = OllamaLLM(model="llama3")
embeddings = OllamaEmbeddings(model="nomic-embed-text")

DB_PATH = "vectorstore/db"
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------------------------------------------------------
# Job registry (in-memory for now)
# -------------------------------------------------------------------

JOBS: Dict[str, Dict[str, Any]] = {}

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

def vectorstore() -> Chroma:
    return Chroma(
        persist_directory=DB_PATH,
        embedding_function=embeddings,
    )


def confidence_from_score(score: float) -> float:
    return float(1 / (1 + score))


# -------------------------------------------------------------------
# Background workers
# -------------------------------------------------------------------

def run_pdf_ingest_job(
    *,
    job_id: str,
    path: str,
    doc_id: str,
    filename: str,
):
    try:
        JOBS[job_id]["status"] = "processing"

        def on_progress(page, total_pages, chunks):
            JOBS[job_id]["progress"] = {
                "page": page,
                "total_pages": total_pages,
                "chunks_indexed": chunks,
            }

        chunks = ingest_pdf_file(
            path,
            doc_id=doc_id,
            filename=filename,
            on_progress=on_progress,
        )

        JOBS[job_id]["status"] = "done"
        JOBS[job_id]["result"] = {
            "doc_id": doc_id,
            "filename": filename,
            "chunks_created": chunks,
        }

    except Exception as e:
        JOBS[job_id]["status"] = "error"
        JOBS[job_id]["error"] = str(e)


# -------------------------------------------------------------------
# Job status
# -------------------------------------------------------------------

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return JSONResponse(
            status_code=404,
            content={"error": "job not found"},
        )
    return job


# -------------------------------------------------------------------
# Documents
# -------------------------------------------------------------------

@app.get("/documents")
def list_documents():
    vs = vectorstore()
    data = vs.get(include=["metadatas"])
    metas = data.get("metadatas", []) or []

    docs: Dict[str, Dict[str, Any]] = {}
    for m in metas:
        if not m:
            continue
        doc_id = m.get("doc_id")
        if not doc_id:
            continue

        docs.setdefault(
            doc_id,
            {
                "doc_id": doc_id,
                "filename": m.get("filename", "document"),
            },
        )

    return {"documents": list(docs.values())}


@app.get("/pdf/{doc_id}")
def get_pdf(doc_id: str):
    path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "PDF not found"})
    return FileResponse(path, media_type="application/pdf")


# -------------------------------------------------------------------
# Upload TXT (still sync – OK for now)
# -------------------------------------------------------------------

@app.post("/upload")
async def upload_txt(file: UploadFile):
    doc_id = str(uuid.uuid4())
    path = os.path.join(UPLOAD_DIR, f"{doc_id}.txt")

    try:
        with open(path, "wb") as out:
            shutil.copyfileobj(file.file, out)

        chunks = ingest_text_file(
            path,
            doc_id=doc_id,
            filename=file.filename,
        )

        return {
            "doc_id": doc_id,
            "filename": file.filename,
            "chunks_created": int(chunks or 0),
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# -------------------------------------------------------------------
# Upload PDF (ASYNC / 10GB-READY)
# -------------------------------------------------------------------

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile):
    doc_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")

    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    JOBS[job_id] = {
        "job_id": job_id,
        "doc_id": doc_id,
        "filename": file.filename,
        "status": "queued",
        "progress": {
            "page": 0,
            "total_pages": None,
            "chunks_indexed": 0,
        },
    }

    threading.Thread(
        target=run_pdf_ingest_job,
        kwargs={
            "job_id": job_id,
            "path": path,
            "doc_id": doc_id,
            "filename": file.filename,
        },
        daemon=True,
    ).start()

    return {
        "job_id": job_id,
        "doc_id": doc_id,
        "status": "queued",
    }


# -------------------------------------------------------------------
# Query (non-stream)
# -------------------------------------------------------------------

@app.get("/query")
async def query(q: str, doc_id: Optional[str] = None):
    vs = vectorstore()

    summary_filter = (
        {"$and": [{"doc_id": doc_id}, {"type": "doc_summary"}]}
        if doc_id
        else {"type": "doc_summary"}
    )

    summary_results = vs.similarity_search_with_score(
        q, k=1, filter=summary_filter
    )

    raw_chunks = vs.similarity_search_with_score(
        q, k=TOP_K, filter={"doc_id": doc_id} if doc_id else None
    )

    chunk_results = [
        (d, s)
        for (d, s) in raw_chunks
        if s <= SCORE_THRESHOLD and d.metadata.get("type") != "doc_summary"
    ][:MAX_CONTEXT_CHUNKS]

    results = summary_results + chunk_results

    if not results:
        return {
            "answer": "The document does not contain this information.",
            "confidence": 0.0,
            "sources": [],
        }

    context = "\n\n".join(d.page_content for (d, _) in results)
    scores = [s for (_, s) in results]

    answer = llm.invoke(
        f"""Answer ONLY using the context below.

Context:
{context}

Question:
{q}

Answer:"""
    )

    return {
        "answer": answer,
        "confidence": confidence_from_score(min(scores)),
        "sources": [
            {
                "filename": d.metadata.get("filename"),
                "doc_id": d.metadata.get("doc_id"),
                "page": d.metadata.get("page"),
                "score": s,
                "preview": d.page_content[:240],
            }
            for (d, s) in results
        ],
    }


# -------------------------------------------------------------------
# Query (stream)
# -------------------------------------------------------------------

@app.get("/query-stream")
async def query_stream(q: str = Query(...), doc_id: Optional[str] = None):
    vs = vectorstore()

    raw_chunks = vs.similarity_search_with_score(
        q, k=TOP_K, filter={"doc_id": doc_id} if doc_id else None
    )

    results = [
        (d, s)
        for (d, s) in raw_chunks
        if s <= SCORE_THRESHOLD
    ][:MAX_CONTEXT_CHUNKS]

    if not results:
        return StreamingResponse(
            iter(["The document does not contain this information."]),
            media_type="text/plain",
        )

    context = "\n\n".join(d.page_content for (d, _) in results)

    def generator():
        for chunk in llm.stream(
            f"""Answer ONLY using the context below.

Context:
{context}

Question:
{q}

Answer:"""
        ):
            yield str(chunk)

    return StreamingResponse(generator(), media_type="text/plain")
