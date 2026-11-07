"""Utility per ispezionare file di appunti e supporto al progetto di gioco."""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import textwrap
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence

import yaml

KEYWORDS = {
    "biome",
    "bioma",
    "canvas",
    "encounter",
    "mating",
    "mutazioni",
    "pack",
    "pi shop",
    "telemetria",
    "telemetry",
    "vc",
}

TEXT_EXTENSIONS = {".md", ".markdown"}
STRUCTURED_EXTENSIONS = {".json", ".yaml", ".yml"}
DOCUMENT_EXTENSIONS = {".doc", ".docx"}
PDF_EXTENSIONS = {".pdf"}
ARCHIVE_EXTENSIONS = {".zip"}
SUPPORTED_EXTENSIONS = (
    TEXT_EXTENSIONS
    | STRUCTURED_EXTENSIONS
    | DOCUMENT_EXTENSIONS
    | PDF_EXTENSIONS
    | ARCHIVE_EXTENSIONS
)


@dataclass
class InvestigationResult:
    path: str
    type: str
    summary: str
    preview: str
    keywords: Sequence[str]
    size_bytes: int
    children: Optional[List["InvestigationResult"]] = None
    notes: Optional[str] = None


def detect_keywords(text: str) -> List[str]:
    lowered = text.lower()
    hits = sorted({keyword for keyword in KEYWORDS if keyword in lowered})
    return hits


def shrink_text(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return f"{value[:limit]}\n…"


def summarise_mapping(data: object) -> str:
    if isinstance(data, dict):
        keys = list(data.keys())
        head = ", ".join(keys[:5])
        if len(keys) > 5:
            head = f"{head}, …"
        return f"Oggetto con {len(keys)} chiavi: {head or '—'}"
    if isinstance(data, list):
        return f"Lista con {len(data)} elementi"
    return f"Valore {type(data).__name__}"


def load_structured_payload(text: str, suffix: str) -> tuple[object, str]:
    if suffix in {".yaml", ".yml"}:
        try:
            data = yaml.safe_load(text)
        except yaml.YAMLError as error:
            raise ValueError(f"YAML non valido: {error}") from error
        return data if data is not None else {}, "yaml"
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError(f"JSON non valido: {error}") from error
    return data, "json"


def analyse_structured(path: Path, text: str, *, max_preview: int) -> InvestigationResult:
    data, label = load_structured_payload(text, path.suffix.lower())
    if label == "json":
        preview_source = json.dumps(data, ensure_ascii=False, indent=2)
    else:
        preview_source = text.strip() or yaml.safe_dump(
            data, allow_unicode=True, sort_keys=False
        )

    preview = shrink_text(preview_source, max_preview)
    keywords = detect_keywords(preview)
    summary = summarise_mapping(data)
    return InvestigationResult(
        path=str(path),
        type=label,
        summary=summary,
        preview=preview or "(contenuto vuoto)",
        keywords=keywords,
        size_bytes=len(text.encode("utf-8")),
    )


def analyse_markdown(path: Path, text: str, *, max_preview: int) -> InvestigationResult:
    headings = len(re.findall(r"^#{1,6}\\s+", text, flags=re.MULTILINE))
    words = len(re.findall(r"\\w+", text))
    summary = f"Markdown con {words} parole e {headings} heading"
    preview = shrink_text(text.strip(), max_preview)
    keywords = detect_keywords(text)
    return InvestigationResult(
        path=str(path),
        type="markdown",
        summary=summary,
        preview=preview or "(contenuto vuoto)",
        keywords=keywords,
        size_bytes=len(text.encode("utf-8")),
    )


def extract_docx_text(stream: io.BufferedIOBase) -> str:
    import xml.etree.ElementTree as ET

    with zipfile.ZipFile(stream) as archive:
        document_xml = archive.read("word/document.xml")
    root = ET.fromstring(document_xml)
    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    texts = [
        node.text
        for node in root.iterfind(f".//{namespace}t")
        if node.text and node.text.strip()
    ]
    return " ".join(texts)


def analyse_docx(path: Path, *, max_preview: int) -> InvestigationResult:
    with path.open("rb") as handle:
        text = extract_docx_text(handle)
    summary = f"Documento DOCX con circa {len(text.split())} parole"
    preview = shrink_text(text.strip(), max_preview) or "(contenuto vuoto)"
    keywords = detect_keywords(text)
    return InvestigationResult(
        path=str(path),
        type="docx",
        summary=summary,
        preview=preview,
        keywords=keywords,
        size_bytes=path.stat().st_size,
    )


def analyse_doc(path: Path, *, max_preview: int) -> InvestigationResult:
    return InvestigationResult(
        path=str(path),
        type="doc",
        summary="File DOC legacy non supportato (convertire in DOCX per l'analisi)",
        preview="",
        keywords=[],
        size_bytes=path.stat().st_size,
        notes="Convertire il documento in formato DOCX per ottenere il testo.",
    )


def extract_pdf_text(stream: io.BufferedIOBase) -> tuple[str, int]:
    try:
        from pypdf import PdfReader
    except ImportError as error:  # pragma: no cover - dipende dall'ambiente
        raise RuntimeError(
            "Libreria 'pypdf' non installata. Aggiungerla alle dipendenze per analizzare i PDF."
        ) from error

    reader = PdfReader(stream)
    texts = []
    for page in reader.pages:
        snippet = page.extract_text() or ""
        texts.append(snippet.strip())
    combined = "\n".join(filter(None, texts))
    return combined, len(reader.pages)


def analyse_pdf(path: Path, *, max_preview: int) -> InvestigationResult:
    with path.open("rb") as handle:
        text, page_count = extract_pdf_text(handle)
    summary = f"Documento PDF con {page_count} pagine"
    preview = shrink_text(text.strip(), max_preview) or "(contenuto vuoto)"
    keywords = detect_keywords(text)
    return InvestigationResult(
        path=str(path),
        type="pdf",
        summary=summary,
        preview=preview,
        keywords=keywords,
        size_bytes=path.stat().st_size,
    )


def analyse_embedded_file(name: str, data: bytes, *, max_preview: int) -> Optional[InvestigationResult]:
    suffix = Path(name).suffix.lower()
    if suffix in STRUCTURED_EXTENSIONS:
        text = data.decode("utf-8", errors="replace")
        return analyse_structured(Path(name), text, max_preview=max_preview)
    if suffix in TEXT_EXTENSIONS:
        text = data.decode("utf-8", errors="replace")
        return analyse_markdown(Path(name), text, max_preview=max_preview)
    return None


def analyse_zip(path: Path, *, max_preview: int) -> InvestigationResult:
    entries: List[str] = []
    children: List[InvestigationResult] = []
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            entries.append(f"{info.filename} ({info.file_size} B)")
            with archive.open(info) as handle:
                data = handle.read()
            try:
                child = analyse_embedded_file(
                    info.filename, data, max_preview=max_preview
                )
            except Exception as error:
                children.append(
                    InvestigationResult(
                        path=str(Path(path.name) / info.filename),
                        type="error",
                        summary=f"Errore estrazione: {error}",
                        preview="",
                        keywords=[],
                        size_bytes=len(data),
                    )
                )
            else:
                if child:
                    children.append(child)
    listing = "\n".join(entries[:10])
    if len(entries) > 10:
        listing = f"{listing}\n…"
    summary = f"Archivio ZIP con {len(entries)} file, {len(children)} analizzati"
    keywords = detect_keywords("\n".join([listing] + [child.preview for child in children]))
    preview = shrink_text(listing or "(archivio vuoto)", max_preview)
    return InvestigationResult(
        path=str(path),
        type="zip",
        summary=summary,
        preview=preview,
        keywords=keywords,
        size_bytes=path.stat().st_size,
        children=children or None,
    )


def analyse_file(path: Path, *, max_preview: int) -> InvestigationResult:
    suffix = path.suffix.lower()
    if suffix in STRUCTURED_EXTENSIONS:
        text = path.read_text(encoding="utf-8")
        return analyse_structured(path, text, max_preview=max_preview)
    if suffix in TEXT_EXTENSIONS:
        text = path.read_text(encoding="utf-8")
        return analyse_markdown(path, text, max_preview=max_preview)
    if suffix == ".docx":
        return analyse_docx(path, max_preview=max_preview)
    if suffix == ".doc":
        return analyse_doc(path, max_preview=max_preview)
    if suffix in PDF_EXTENSIONS:
        return analyse_pdf(path, max_preview=max_preview)
    if suffix in ARCHIVE_EXTENSIONS:
        return analyse_zip(path, max_preview=max_preview)
    raise ValueError(f"Formato non supportato: {path}")


def iter_targets(paths: Sequence[Path], *, recursive: bool) -> Iterable[Path]:
    for path in paths:
        if path.is_file():
            if path.suffix.lower() in SUPPORTED_EXTENSIONS:
                yield path
            continue
        if path.is_dir():
            iterator = path.rglob("*") if recursive else path.iterdir()
            for candidate in iterator:
                if candidate.is_file() and candidate.suffix.lower() in SUPPORTED_EXTENSIONS:
                    yield candidate
            continue
        yield path  # segnala percorsi non trovati


def collect_investigation(
    paths: Sequence[Path], *, recursive: bool, max_preview: int
) -> List[InvestigationResult]:
    results: List[InvestigationResult] = []
    for target in iter_targets(paths, recursive=recursive):
        if not target.exists():
            results.append(
                InvestigationResult(
                    path=str(target),
                    type="missing",
                    summary="Percorso non trovato",
                    preview="",
                    keywords=[],
                    size_bytes=0,
                )
            )
            continue
        try:
            result = analyse_file(target, max_preview=max_preview)
        except Exception as error:
            results.append(
                InvestigationResult(
                    path=str(target),
                    type="error",
                    summary=f"Errore durante l'analisi: {error}",
                    preview="",
                    keywords=[],
                    size_bytes=target.stat().st_size if target.exists() else 0,
                )
            )
        else:
            results.append(result)
    return results


def render_report(
    results: Sequence[InvestigationResult], *, json_output: bool, stream: io.TextIOBase
) -> None:
    if json_output:
        payload = [
            {
                "path": result.path,
                "type": result.type,
                "summary": result.summary,
                "preview": result.preview,
                "keywords": list(result.keywords),
                "size_bytes": result.size_bytes,
                "notes": result.notes,
                "children": [
                    {
                        "path": child.path,
                        "type": child.type,
                        "summary": child.summary,
                        "preview": child.preview,
                        "keywords": list(child.keywords),
                        "size_bytes": child.size_bytes,
                        "notes": child.notes,
                    }
                    for child in (result.children or [])
                ]
                if result.children
                else None,
            }
            for result in results
        ]
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
        return

    for result in results:
        header = f"=== {result.path} ({result.type}) ==="
        stream.write(f"{header}\n")
        stream.write(f"{result.summary}\n")
        if result.keywords:
            stream.write(f"Parole chiave: {', '.join(result.keywords)}\n")
        if result.notes:
            stream.write(f"Note: {result.notes}\n")
        if result.preview:
            stream.write("Preview:\n")
            stream.write(textwrap.indent(result.preview, "  "))
            stream.write("\n")
        if result.children:
            stream.write("Contenuti estratti:\n")
            for child in result.children:
                stream.write(
                    textwrap.indent(
                        f"- {child.path} [{child.type}]: {child.summary}\n", "  "
                    )
                )
        stream.write("\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Analizza file di supporto per decidere quali integrare nel gioco.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("paths", nargs="+", help="File o directory da analizzare")
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Analizza ricorsivamente le cartelle specificate",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Produce un output JSON facilmente parsabile",
    )
    parser.add_argument(
        "--max-preview",
        type=int,
        default=400,
        help="Numero massimo di caratteri mostrati nella preview",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    paths = [Path(p) for p in args.paths]
    results = collect_investigation(
        paths, recursive=args.recursive, max_preview=max(100, args.max_preview)
    )
    render_report(results, json_output=args.json, stream=sys.stdout)
    return 0


if __name__ == "__main__":  # pragma: no cover - esecuzione diretta
    sys.exit(main())
