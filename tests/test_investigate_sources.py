"""Test per lo strumento di indagine dei contenuti ausiliari."""

from __future__ import annotations

import io
import json
import sys
import zipfile
from pathlib import Path

from pypdf import PdfWriter

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

from investigate_sources import collect_investigation, render_report  # noqa: E402


def _create_docx(path: Path, text: str) -> None:
    document_xml = f"""<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">
  <w:body>
    <w:p><w:r><w:t>{text}</w:t></w:r></w:p>
  </w:body>
</w:document>
"""
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">
  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>
  <Default Extension=\"xml\" ContentType=\"application/xml\"/>
  <Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>
</Types>
""",
        )
        archive.writestr(
            "_rels/.rels",
            """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>
</Relationships>
""",
        )
        archive.writestr("word/_rels/document.xml.rels", """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>
""")
        archive.writestr("word/document.xml", document_xml)


def _create_pdf(path: Path) -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    with path.open("wb") as handle:
        writer.write(handle)


def test_collect_investigation_handles_formats(tmp_path: Path) -> None:
    json_path = tmp_path / "packs.json"
    json_path.write_text(json.dumps({"pack": {"name": "Alpha"}, "note": "Bioma"}))

    md_path = tmp_path / "notes.md"
    md_path.write_text("# Canvas\nTelemetria pack VC")

    docx_path = tmp_path / "report.docx"
    _create_docx(docx_path, "Mutazioni e telemetria in analisi")

    pdf_path = tmp_path / "brief.pdf"
    _create_pdf(pdf_path)

    zip_path = tmp_path / "bundle.zip"
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("inner.json", json.dumps({"canvas": "Shared board"}))
        archive.writestr("inner.md", "# Canvas Notes\nPack VC")

    targets = [json_path, md_path, docx_path, pdf_path, zip_path]
    results = collect_investigation(targets, recursive=False, max_preview=200)

    results_map = {Path(result.path).name: result for result in results}
    assert "packs.json" in results_map
    assert "notes.md" in results_map
    assert "report.docx" in results_map
    assert "brief.pdf" in results_map
    assert "bundle.zip" in results_map

    assert "pack" in results_map["packs.json"].keywords
    assert results_map["notes.md"].type == "markdown"
    assert results_map["report.docx"].type == "docx"
    assert results_map["brief.pdf"].summary.startswith("Documento PDF")

    zip_result = results_map["bundle.zip"]
    assert zip_result.children is not None
    child_types = {child.type for child in zip_result.children}
    assert "json" in child_types
    assert "markdown" in child_types

    buffer = io.StringIO()
    render_report(results, json_output=False, stream=buffer)
    assert "packs.json" in buffer.getvalue()

    buffer = io.StringIO()
    render_report(results, json_output=True, stream=buffer)
    payload = json.loads(buffer.getvalue())
    assert any(entry["type"] == "zip" for entry in payload)
