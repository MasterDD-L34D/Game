#!/usr/bin/env python3
"""Genera sitemap.xml, robots.txt e routes.csv a partire dal route_mapping."""
from __future__ import annotations

import argparse
import csv
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional, Tuple
from urllib.parse import urljoin

import yaml

# Riutilizziamo utility dal generatore dell'indice di ricerca
from generate_search_index import slugify, title_from_file, summary_from_file  # type: ignore


def load_mapping(repo: Path, mapping_file: str) -> dict:
    data = yaml.safe_load((repo / mapping_file).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("route_mapping.yaml non valido")
    return data


def iter_content(repo: Path, mapping: dict) -> Iterable[Tuple[str, Optional[Path]]]:
    include_exts = {str(ext).lower() for ext in mapping.get("include_exts", [])}
    exclude_stems = {str(stem) for stem in mapping.get("exclude_stems", [])}

    for section in mapping.get("top_sections", []):
        path = section.get("path")
        if isinstance(path, str) and path:
            yield path.rstrip("/"), None

    for entry in mapping.get("content_dirs", []):
        rel = entry.get("dir")
        url_base = entry.get("url_base")
        if not isinstance(rel, str) or not isinstance(url_base, str):
            continue
        passthrough = bool(entry.get("passthrough_filename"))
        base = repo / rel
        if not base.exists():
            continue
        for file_path in base.rglob("*"):
            if not file_path.is_file():
                continue
            if include_exts and file_path.suffix.lower() not in include_exts:
                continue
            if file_path.stem in exclude_stems:
                continue
            if passthrough:
                url_path = f"{url_base.rstrip('/')}/{file_path.name}"
            else:
                url_path = f"{url_base.rstrip('/')}/{slugify(file_path.stem)}"
            yield url_path, file_path


def build_sitemap(base_url: str, entries: Iterable[Tuple[str, Optional[Path]]]) -> str:
    lines = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    ]
    for url_path, _ in sorted(set(entries), key=lambda x: x[0]):
        full_url = urljoin(base_url, url_path.lstrip("/"))
        lines.append("  <url>")
        lines.append(f"    <loc>{full_url}</loc>")
        lines.append(f"    <lastmod>{datetime.utcnow().date().isoformat()}</lastmod>")
        lines.append("    <changefreq>weekly</changefreq>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def build_routes_csv(entries: Iterable[Tuple[str, Optional[Path]]]) -> list[list[str]]:
    rows = [["url", "title", "summary", "source_file"]]
    seen = set()
    for url_path, file_path in sorted(set(entries), key=lambda x: x[0]):
        key = (url_path, str(file_path) if file_path else "")
        if key in seen:
            continue
        seen.add(key)
        rel_file = ""
        title = ""
        summary = ""
        if file_path:
            try:
                rel_file = str(file_path.relative_to(Path.cwd()))
            except ValueError:
                rel_file = str(file_path)
            if file_path.exists():
                title = title_from_file(file_path)
                summary = summary_from_file(file_path)
        rows.append([url_path, title, summary, rel_file])
    return rows


def write_routes_csv(path: Path, rows: list[list[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerows(rows)


def write_robots(base_url: str) -> str:
    lines = ["User-agent: *", "Allow: /", f"Sitemap: {urljoin(base_url, 'sitemap.xml')}" ]
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--mapping-file", default="ops/site-audit/route_mapping.yaml")
    ap.add_argument("--out-dir", default="ops/site-audit/_out")
    ap.add_argument("--duplicate-to-public", action="store_true")
    ap.add_argument("--base-url", default=os.environ.get("SITE_BASE_URL", "https://example.com"))
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    mapping = load_mapping(repo, args.mapping_file)
    out_dir = (repo / args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    entries = list(iter_content(repo, mapping))

    sitemap_xml = build_sitemap(args.base_url.rstrip("/") + "/", entries)
    (out_dir / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")

    robots_txt = write_robots(args.base_url.rstrip("/") + "/")
    (out_dir / "robots.txt").write_text(robots_txt, encoding="utf-8")

    routes_rows = build_routes_csv(entries)
    write_routes_csv(out_dir / "routes.csv", routes_rows)

    if args.duplicate_to_public:
        public_dir = repo / "public"
        public_dir.mkdir(parents=True, exist_ok=True)
        (public_dir / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")
        (public_dir / "robots.txt").write_text(robots_txt, encoding="utf-8")

    print(f"[sitemap] URLs: {len(routes_rows) - 1} → {out_dir}")


if __name__ == "__main__":
    main()
