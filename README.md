# Local RAG System – Complete Setup Guide

## Prerequisites

- Python 3.10+
- Node.js 20+
- npm 9+
- Git
- Ollama

## Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
ollama pull nomic-embed-text
```

## Backend Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pypdf langchain langchain-ollama langchain-chroma chromadb python-multipart
uvicorn backend.app:app --reload --port 8000
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Usage

- Upload PDF/TXT
- Ask questions
- View sources and confidence
- Click Open Page to navigate PDF

## Persistence

- Vector DB: vectorstore/db
- Uploads: uploads/
