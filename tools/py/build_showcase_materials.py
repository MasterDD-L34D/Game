"""Generate showcase dossier assets (HTML/PDF preview + landing image).

The script consumes the curated YAML payload in
``docs/presentations/showcase/showcase_dossier.yaml`` and produces:

* HTML dossier based on the generator template.
* PDF dossier for press kits.
* SVG hero preview aligned con la palette `public/`.
"""

from __future__ import annotations

import base64
import html
import json
import re
import textwrap
from pathlib import Path
from typing import Any

import yaml
from fpdf import FPDF
from fpdf.enums import XPos, YPos

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = REPO_ROOT / "docs" / "presentations" / "showcase" / "showcase_dossier.yaml"
TEMPLATE_PATH = REPO_ROOT / "docs" / "templates" / "dossier.html"
OUTPUT_HTML = REPO_ROOT / "docs" / "presentations" / "showcase" / "evo-tactics-showcase-dossier.html"
OUTPUT_PDF_BASE64 = (
    REPO_ROOT
    / "docs"
    / "presentations"
    / "showcase"
    / "evo-tactics-showcase-dossier.pdf.base64"
)
OUTPUT_PREVIEW = REPO_ROOT / "public" / "showcase-dossier.svg"
DIST_DIR = REPO_ROOT / "docs" / "presentations" / "showcase" / "dist"
DIST_PDF = DIST_DIR / "evo-tactics-showcase-dossier.pdf"


def _assert_nonempty(path: Path, *, min_bytes: int = 1) -> None:
    size = path.stat().st_size if path.exists() else 0
    if size < min_bytes:
        raise RuntimeError(f"Generated asset {path} is empty (size={size})")

ACCENT_COLOR = "#3b82f6"
BACKGROUND_COLOR = "#0f172a"
SURFACE_COLOR = "#101c36"
TEXT_PRIMARY = "#f8fafc"
TEXT_SECONDARY = "#cbd5f5"


_SLOT_PATTERN = re.compile(r'(\bdata-slot="(?P<slot>[^"]+)"[^>]*>)(?P<body>.*?)(</[^>]+>)', re.S)


def _load_config() -> dict[str, Any]:
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Invalid dossier config: expected mapping root")
    return data


def _replace_slot(html_source: str, slot: str, payload: str) -> str:
    def _sub(match: re.Match[str]) -> str:
        if match.group("slot") != slot:
            return match.group(0)
        return f"{match.group(1)}{payload}{match.group(4)}"

    replaced, count = _SLOT_PATTERN.subn(_sub, html_source)
    if count == 0:
        raise ValueError(f"Slot '{slot}' not found in dossier template")
    return replaced


def _build_metrics_markup(entries: list[dict[str, Any]]) -> str:
    items = []
    for entry in entries:
        value = html.escape(str(entry.get("value", "")))
        label = html.escape(str(entry.get("label", "")))
        detail = entry.get("detail")
        detail_html = (
            f"<span style=\"color:#5b6475; font-size:0.78rem; display:block;\">{html.escape(str(detail))}</span>"
            if detail
            else ""
        )
        items.append(
            "<span style=\"display:flex;flex-direction:column;gap:0.2rem;min-width:10rem;\">"
            f"<strong style=\"font-size:1.2rem;\">{value}</strong>"
            f"<span>{label}</span>{detail_html}</span>"
        )
    return "".join(items)


def _build_chip_list(chips: list[str]) -> str:
    if not chips:
        return ""
    chip_markup = "".join(
        f"<span class=\"dossier__chip\">{html.escape(chip)}</span>" for chip in chips
    )
    return f"<div class=\"dossier__chips\">{chip_markup}</div>"


def _build_list_markup(entries: list[dict[str, Any]], *, kind: str) -> str:
    blocks: list[str] = []
    for entry in entries:
        title = html.escape(str(entry.get("name", "")))
        subtitle = html.escape(str(entry.get("subtitle", entry.get("role", ""))))
        summary = html.escape(str(entry.get("summary", "")))
        highlights = entry.get("highlights") or entry.get("hooks") or entry.get("beats")
        chips = entry.get("chips") or entry.get("cues")
        detail_lines = ""
        if highlights:
            detail_lines = "".join(
                f"<p style=\"margin:0 0 0.3rem;\">• {html.escape(str(item))}</p>" for item in highlights
            )
        block = [
            f"<li class=\"dossier__list-item\"><h3>{title}</h3>",
        ]
        if subtitle:
            block.append(
                f"<p style=\"margin-bottom:0.3rem; color:#40495b;\"><strong>{subtitle}</strong></p>"
            )
        if summary:
            block.append(
                f"<p style=\"margin-bottom:0.5rem;\">{summary}</p>"
            )
        if detail_lines:
            block.append(detail_lines)
        block.append(_build_chip_list([str(chip) for chip in chips or []]))
        block.append("</li>")
        blocks.append("".join(block))
    return "".join(blocks)


def build_html(config: dict[str, Any]) -> None:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    meta = config.get("meta", {})
    metrics = config.get("metrics", [])
    biomes = config.get("biomes", [])
    species = config.get("species", [])
    seeds = config.get("seeds", [])
    calls = config.get("call_to_action", [])

    summary = html.escape(str(meta.get("summary", "")))
    if calls:
        actions = " · ".join(html.escape(str(item)) for item in calls)
        summary = f"{summary}<br /><strong>Azioni rapide:</strong> {actions}"

    rendered = template
    rendered = _replace_slot(rendered, "title", html.escape(str(meta.get("title", "Dossier"))))
    rendered = _replace_slot(rendered, "badge", html.escape(str(meta.get("badge", "Ecosystem dossier"))))
    heading = meta.get("heading") or meta.get("title")
    rendered = _replace_slot(rendered, "heading", html.escape(str(heading)))

    meta_text = f"Aggiornato {html.escape(str(meta.get('updated_at', 'N/D')))} · {html.escape(str(meta.get('note', '')))}"
    rendered = _replace_slot(rendered, "meta", meta_text)
    rendered = _replace_slot(rendered, "summary", summary)

    rendered = _replace_slot(rendered, "metrics", _build_metrics_markup(metrics))
    rendered = _replace_slot(rendered, "biomes", _build_list_markup(biomes, kind="biome"))
    rendered = _replace_slot(rendered, "species", _build_list_markup(species, kind="species"))
    rendered = _replace_slot(rendered, "seeds", _build_list_markup(seeds, kind="seed"))

    OUTPUT_HTML.write_text(rendered, encoding="utf-8")
    _assert_nonempty(OUTPUT_HTML)


def _sanitize_text(value: str) -> str:
    replacements = {
        "—": "-",
        "–": "-",
        "•": "-",
        "“": '"',
        "”": '"',
        "’": "'",
        "·": "·",
    }
    for src, dst in replacements.items():
        value = value.replace(src, dst)
    return value


def _encode_base64(data: bytes) -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return "\n".join(textwrap.wrap(encoded, 76))


def build_pdf(config: dict[str, Any]) -> None:
    meta = config.get("meta", {})
    metrics = config.get("metrics", [])
    biomes = config.get("biomes", [])
    species = config.get("species", [])
    seeds = config.get("seeds", [])
    calls = config.get("call_to_action", [])

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, _sanitize_text(str(meta.get("title", "Evo-Tactics"))), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 11)
    subtitle = f"{meta.get('badge', '')} · Aggiornato {meta.get('updated_at', 'N/D')}"
    pdf.cell(0, 8, _sanitize_text(subtitle), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    note = meta.get("note")
    if note:
        pdf.cell(0, 6, _sanitize_text(str(note)), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, _sanitize_text(str(meta.get("summary", ""))))
    if calls:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 6, "Azioni rapide", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 11)
        for item in calls:
            pdf.multi_cell(pdf.epw, 6, f"- {_sanitize_text(str(item))}")
    pdf.ln(4)

    if metrics:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 7, "Metriche principali", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 11)
        for entry in metrics:
            line = f"{entry.get('value', '')} — {entry.get('label', '')}"
            detail = entry.get("detail")
            pdf.cell(0, 6, _sanitize_text(line), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            if detail:
                pdf.set_font("Helvetica", "I", 10)
                pdf.multi_cell(pdf.epw, 5, _sanitize_text(str(detail)))
                pdf.set_font("Helvetica", "", 11)
        pdf.ln(2)

    def _section(title: str, entries: list[dict[str, Any]], *, name_key: str = "name") -> None:
        if not entries:
            return
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 7, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        for entry in entries:
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 6, _sanitize_text(str(entry.get(name_key, ""))), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            subtitle = entry.get("subtitle") or entry.get("role") or entry.get("intensity")
            if subtitle:
                pdf.set_font("Helvetica", "I", 10)
                pdf.cell(0, 5, _sanitize_text(str(subtitle)), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Helvetica", "", 10)
            summary = entry.get("summary")
            if summary:
                pdf.multi_cell(pdf.epw, 5, _sanitize_text(str(summary)))
            highlights = entry.get("highlights") or entry.get("hooks") or entry.get("beats")
            if highlights:
                for item in highlights:
                    pdf.multi_cell(pdf.epw, 5, f"- {_sanitize_text(str(item))}")
            chips = entry.get("chips") or entry.get("cues")
            if chips:
                pdf.set_font("Helvetica", "", 9)
                pdf.multi_cell(pdf.epw, 5, _sanitize_text("Tags: " + ", ".join(str(chip) for chip in chips)))
            pdf.ln(2)

    _section("Biomi selezionati", biomes)
    _section("Specie protagoniste", species)
    _section("Encounter seed", seeds, name_key="name")

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    pdf_output = pdf.output(dest="S")
    if isinstance(pdf_output, str):
        pdf_bytes = pdf_output.encode("latin1")
    else:
        pdf_bytes = bytes(pdf_output)
    DIST_PDF.write_bytes(pdf_bytes)
    OUTPUT_PDF_BASE64.write_text(_encode_base64(pdf_bytes), encoding="utf-8")
    _assert_nonempty(OUTPUT_PDF_BASE64, min_bytes=1024)


def build_preview_image(config: dict[str, Any]) -> None:
    meta = config.get("meta", {})
    metrics = config.get("metrics", [])[:3]
    seeds = config.get("seeds", [])[:2]

    OUTPUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    width, height = 1200, 675

    def esc(value: Any) -> str:
        return html.escape(str(value))

    raw_summary = str(meta.get("summary", ""))
    summary_lines = textwrap.wrap(raw_summary, width=84)
    if len(summary_lines) > 3:
        summary_lines = summary_lines[:3]
        summary_lines[-1] += "…"

    metric_lines: list[str] = []
    for entry in metrics:
        value = esc(entry.get("value", ""))
        label = esc(entry.get("label", ""))
        detail = entry.get("detail")
        detail_text = esc(detail) if detail else ""
        metric_lines.append(
            f"<g transform=\"translate(0,{len(metric_lines)*72})\">"
            f"<text x=\"0\" y=\"0\" fill=\"{TEXT_PRIMARY}\" font-size=\"28\" font-weight=\"600\">{value} · {label}</text>"
            + (
                f"<text x=\"0\" y=\"36\" fill=\"{TEXT_SECONDARY}\" font-size=\"22\">{detail_text}</text>"
                if detail_text
                else ""
            )
            + "</g>"
        )

    seed_blocks: list[str] = []
    for idx, seed in enumerate(seeds):
        name = esc(seed.get("name", ""))
        seed_summary = str(seed.get("summary", ""))
        truncated = seed_summary
        if len(truncated) > 140:
            truncated = truncated[:137] + "…"
        summary_text = esc(truncated)
        y = idx * 140
        seed_blocks.append(
            "<g transform=\"translate(0,{y})\">".format(y=y)
            + f"<rect x=\"0\" y=\"0\" width=\"520\" height=\"120\" rx=\"28\" fill=\"#18294b\" stroke=\"{ACCENT_COLOR}\" stroke-width=\"2\" />"
            + f"<text x=\"32\" y=\"50\" fill=\"{TEXT_PRIMARY}\" font-size=\"26\" font-weight=\"600\">{name}</text>"
            + f"<text x=\"32\" y=\"84\" fill=\"{TEXT_SECONDARY}\" font-size=\"20\">{summary_text}</text>"
            + "</g>"
        )

    svg = f"""
<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#18294b" />
    </linearGradient>
  </defs>
  <rect width="{width}" height="{height}" fill="url(#bg)" />
  <rect x="50" y="50" width="{width - 100}" height="{height - 100}" rx="42" fill="{SURFACE_COLOR}" stroke="#1f2a44" stroke-width="2" />
  <g transform="translate(120,140)">
    <text x="0" y="0" fill="{TEXT_PRIMARY}" font-size="48" font-weight="700" font-family="'Inter', 'Segoe UI', sans-serif">{esc(meta.get("title", "Evo-Tactics Showcase"))}</text>
    <text x="0" y="60" fill="{ACCENT_COLOR}" font-size="34" font-weight="600" font-family="'Inter', 'Segoe UI', sans-serif">{esc(meta.get("heading", "Meta-ecosistema Alpha"))}</text>
  </g>
  <g transform="translate(120,260)" font-family="'Inter', 'Segoe UI', sans-serif">
    {''.join(f'<text x="0" y="{idx*28}" fill="{TEXT_SECONDARY}" font-size="22">{esc(line)}</text>' for idx, line in enumerate(summary_lines))}
  </g>
  <g transform="translate(120,380)" font-family="'Inter', 'Segoe UI', sans-serif">
    {''.join(metric_lines)}
  </g>
  <g transform="translate(700,360)" font-family="'Inter', 'Segoe UI', sans-serif">
    <text x="0" y="-20" fill="{ACCENT_COLOR}" font-size="24" font-weight="600">Encounter spotlight</text>
    {''.join(seed_blocks)}
  </g>
</svg>
"""

    OUTPUT_PREVIEW.write_text(svg.strip() + "\n", encoding="utf-8")
    _assert_nonempty(OUTPUT_PREVIEW, min_bytes=256)


def main() -> None:
    config = _load_config()
    build_html(config)
    build_pdf(config)
    build_preview_image(config)
    manifest = {
        "html": str(OUTPUT_HTML.relative_to(REPO_ROOT)),
        "pdf_base64": str(OUTPUT_PDF_BASE64.relative_to(REPO_ROOT)),
        "pdf_dist": str(DIST_PDF.relative_to(REPO_ROOT)),
        "preview_svg": str(OUTPUT_PREVIEW.relative_to(REPO_ROOT)),
    }
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
