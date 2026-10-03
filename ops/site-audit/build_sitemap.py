
#!/usr/bin/env python3
from __future__ import annotations
import os, sys, json, csv
from datetime import date
from pathlib import Path
from common import slugify, safe_read_text, guess_title_from_yaml_text

def load_mapping(repo: Path):
    # prefer JSON; fallback to YAML parsed naively into JSON if present
    jm = repo / "ops/site-audit/route_mapping.json"
    if jm.exists():
        return json.loads(jm.read_text(encoding="utf-8"))
    ym = repo / "ops/site-audit/route_mapping.yaml"
    if ym.exists():
        # very naive yaml-to-json for our simple structure: use ':' and '-' detection
        # but better: tell user to convert to JSON. We'll bail with message.
        raise SystemExit("route_mapping.yaml trovato ma il parser YAML non è disponibile. Usa route_mapping.json.")
    raise SystemExit("File di mappatura non trovato (route_mapping.json).")

def iter_files(base: Path):
    for p in base.rglob("*"):
        if p.is_file():
            yield p

def main():
    repo = Path(".").resolve()
    mapping = load_mapping(repo)
    include_exts = set(mapping.get("include_exts", [".yaml",".yml",".md",".json"]))
    exclude_stems = set(mapping.get("exclude_stems", []))
    routes = []

    # Top sections
    for sec in mapping.get("top_sections", []):
        routes.append({"section":"Toplevel", "title": sec["title"], "path": sec["path"], "source_file": ""})

    # Content dirs
    for entry in mapping.get("content_dirs", []):
        rel = entry["dir"]
        url_base = entry["url_base"]
        passthrough = bool(entry.get("passthrough_filename"))
        base = repo / rel
        if not base.exists():
            continue
        for f in iter_files(base):
            if f.suffix.lower() not in include_exts:
                continue
            if f.stem in exclude_stems:
                continue
            # path
            if passthrough:
                path = f"{url_base}/{f.name}"
            else:
                path = f"{url_base}/{slugify(f.stem)}"
            # title
            title = f.stem.replace('_',' ').title()
            if f.suffix.lower() in (".yaml",".yml"):
                maybe = guess_title_from_yaml_text(safe_read_text(f))
                if maybe: title = maybe
            section_name = url_base.split("/")[1] if url_base != "/" else "home"
            routes.append({
                "section": section_name,
                "title": title,
                "path": path,
                "source_file": str(f.relative_to(repo))
            })

    # dedup
    seen = set(); deduped = []
    for r in routes:
        if r["path"] not in seen:
            seen.add(r["path"]); deduped.append(r)

    out_dir = repo / "ops/site-audit/_out"; out_dir.mkdir(parents=True, exist_ok=True)
    with (out_dir / "routes.csv").open("w", encoding="utf-8", newline="") as fo:
        w = csv.DictWriter(fo, fieldnames=["section","title","path","source_file"])
        w.writeheader()
        for r in sorted(deduped, key=lambda x: (x["section"], x["path"])):
            w.writerow(r)

    base_url = os.getenv("SITE_BASE_URL","https://example.com").rstrip("/")
    today = date.today().isoformat()
    # sitemap.xml
    lines = ['<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for r in deduped:
        lines.append(f"  <url><loc>{base_url}{r['path']}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq></url>")
    lines.append("</urlset>\n")
    (repo / "sitemap.xml").write_text("\n".join(lines), encoding="utf-8")
    # robots.txt
    (repo / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {base_url}/sitemap.xml\n", encoding="utf-8")

    print(f"[site-audit] routes={len(deduped)} → sitemap.xml, robots.txt, ops/site-audit/_out/routes.csv")

if __name__ == "__main__":
    main()
