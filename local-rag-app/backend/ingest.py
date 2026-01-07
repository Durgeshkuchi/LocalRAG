# backend/ingest.py
from __future__ import annotations

from typing import Optional
from pypdf import PdfReader

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain_chroma import Chroma

DB_PATH = "vectorstore/db"

embeddings = OllamaEmbeddings(model="nomic-embed-text")
summary_llm = OllamaLLM(model="llama3")

splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=200)


def _vectorstore() -> Chroma:
    return Chroma(persist_directory=DB_PATH, embedding_function=embeddings)


def upsert_chunks(chunks, *, doc_id, filename, page=None) -> int:
    if not chunks:
        return 0

    vs = _vectorstore()
    metadatas, ids = [], []

    for idx, c in enumerate(chunks):
        metadatas.append({
            "doc_id": doc_id,
            "filename": filename,
            "page": page,
            "chunk_index": idx,
        })
        ids.append(f"{doc_id}:{page}:{idx}" if page else f"{doc_id}:{idx}")

    vs.add_texts(chunks, metadatas=metadatas, ids=ids)
    return len(chunks)


def ingest_document_summary(text: str, *, doc_id: str, filename: str):
    if not text.strip():
        return

    prompt = f"""
Summarize this document in 4–6 sentences.
Explain what it is about and its purpose.

{text}

Summary:
""".strip()

    summary = summary_llm.invoke(prompt)
    vs = _vectorstore()

    vs.add_texts(
        [summary],
        metadatas=[{
            "doc_id": doc_id,
            "filename": filename,
            "type": "doc_summary",
            "page": None,
        }],
        ids=[f"{doc_id}:summary"],
    )


def ingest_text_file(path, *, doc_id, filename, batch_chars=120_000) -> int:
    total_chunks, buffer = 0, ""

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        while True:
            piece = f.read(batch_chars)
            if not piece:
                break

            buffer += piece
            chunks = splitter.split_text(buffer)
            if len(chunks) > 1:
                total_chunks += upsert_chunks(chunks[:-1], doc_id=doc_id, filename=filename)
                buffer = chunks[-1]

    if buffer.strip():
        total_chunks += upsert_chunks(splitter.split_text(buffer), doc_id=doc_id, filename=filename)

    ingest_document_summary(buffer[:4000], doc_id=doc_id, filename=filename)
    return total_chunks


def ingest_pdf_file(path, *, doc_id, filename, on_progress=None) -> int:
    reader = PdfReader(path)
    total_chunks, intro_text = 0, ""

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        text = (page.extract_text() or "").strip()

        if page_num <= 2:
            intro_text += text + "\n"

        if text:
            chunks = splitter.split_text(text)
            total_chunks += upsert_chunks(chunks, doc_id=doc_id, filename=filename, page=page_num)

        if on_progress:
            on_progress(page_num, len(reader.pages), total_chunks)

    ingest_document_summary(intro_text, doc_id=doc_id, filename=filename)
    return total_chunks
