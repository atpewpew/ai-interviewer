import fitz  # PyMuPDF


def parse_resume_pdf(pdf_bytes: bytes, max_chars: int = 2000) -> str:
    """Extract text from a PDF resume, cleaned and truncated."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()

    full_text = "\n".join(text_parts)
    # Clean whitespace
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)
    return cleaned[:max_chars]
