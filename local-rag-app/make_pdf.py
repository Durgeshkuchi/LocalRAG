from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

file_name = "sample.pdf"

c = canvas.Canvas(file_name, pagesize=LETTER)
text = c.beginText(40, 750)

content = [
    "Local RAG Sample Document",
    "",
    "LangChain is a framework for building LLM-powered applications.",
    "It supports document loading, text splitting, embeddings,",
    "vector databases, and retrieval-augmented generation (RAG).",
    "",
    "This PDF is used to test local RAG ingestion and citations."
]

for line in content:
    text.textLine(line)

c.drawText(text)
c.showPage()
c.save()

print("sample.pdf created successfully")
