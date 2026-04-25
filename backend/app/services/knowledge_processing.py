from __future__ import annotations

import json
import re
import uuid
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree
from zipfile import ZipFile

import httpx


class _PlainTextHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        value = data.strip()
        if value:
            self._parts.append(value)

    @property
    def text(self) -> str:
        return '\n'.join(self._parts)


def _normalize_whitespace(value: str) -> str:
    value = value.replace('\u00a0', ' ')
    value = re.sub(r'[\t\r]+', ' ', value)
    value = re.sub(r'\n\s*\n+', '\n\n', value)
    value = re.sub(r' +', ' ', value)
    return value.strip()


def _extract_text_from_docx(path: Path) -> str:
    try:
        with ZipFile(path) as archive:
            xml_content = archive.read('word/document.xml')
    except Exception:
        return ''

    try:
        tree = ElementTree.fromstring(xml_content)
    except Exception:
        return ''

    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    fragments = [node.text or '' for node in tree.findall('.//w:t', namespaces)]
    return _normalize_whitespace('\n'.join(fragments))


def _extract_text_from_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return ''

    try:
        reader = PdfReader(str(path))
    except Exception:
        return ''

    fragments: list[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ''
            if page_text:
                fragments.append(page_text)
        except Exception:
            continue

    return _normalize_whitespace('\n'.join(fragments))


def extract_text_from_file(path: Path, mime_type: str | None, filename: str) -> str:
    suffix = path.suffix.lower()
    normalized_mime = (mime_type or '').lower()

    if suffix == '.txt' or normalized_mime.startswith('text/'):
        try:
            return _normalize_whitespace(path.read_text(encoding='utf-8', errors='ignore'))
        except Exception:
            return ''

    if suffix == '.docx' or normalized_mime == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return _extract_text_from_docx(path)

    if suffix == '.pdf' or normalized_mime == 'application/pdf':
        return _extract_text_from_pdf(path)

    try:
        raw = path.read_bytes()
        return _normalize_whitespace(raw.decode('utf-8', errors='ignore'))
    except Exception:
        return ''


def fetch_text_from_url(url: str) -> tuple[str, str | None, str | None]:
    response = httpx.get(url, timeout=15, follow_redirects=True)
    response.raise_for_status()

    content_type = response.headers.get('content-type')
    media_type = content_type.split(';', 1)[0].strip() if content_type else None

    parsed = urlparse(url)
    path_name = Path(parsed.path)
    filename = path_name.name or 'url-content.txt'

    if media_type and 'html' in media_type.lower():
        parser = _PlainTextHTMLParser()
        parser.feed(response.text)
        text = parser.text
    else:
        text = response.text

    return _normalize_whitespace(text), media_type, filename


def split_into_chunks(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    text = _normalize_whitespace(text)
    if not text:
        return []

    if chunk_overlap >= chunk_size:
        chunk_overlap = max(chunk_size // 4, 0)

    step = max(chunk_size - chunk_overlap, 1)
    chunks: list[str] = []

    start = 0
    while start < len(text):
        end = start + chunk_size
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        start += step

    return chunks


def estimate_token_count(text: str) -> int:
    words = text.split()
    if not words:
        return 0
    return max(1, int(len(text) / 4))


def build_chunks_payload(chunks: list[str]) -> list[dict]:
    payload: list[dict] = []
    for idx, chunk in enumerate(chunks):
        payload.append(
            {
                'chunk_index': idx,
                'content': chunk,
                'token_count': estimate_token_count(chunk),
                'embedding_id': uuid.uuid4().hex,
                'metadata_json': json.dumps({'length': len(chunk)}, ensure_ascii=False),
            }
        )
    return payload
