#!/usr/bin/env python3
"""
Genera un search_index.json (semplice) basato sulle directory e mapping della IA.
- Usa ops/site-audit/route_mapping.yaml per capire dove cercare contenuti.
- Per i file YAML/MD/JSON prova a estrarre titolo/descrizione/tag.
- Output: ops/site-audit/_out/search_index.json (+ copia in ./public/ se esiste)
"""
from __future__ import annotations
import os, re, json, argparse
from pathlib import Path
from typing import Any, Dict, List
import yaml

def safe_read(p: Path) -> str:
    for enc in ("utf-8","latin-1","cp1252"):
        try:
            return p.read_text(encoding=enc)
        except Exception:
            continue
    return ""

def frontmatter_from_md(text: str) -> dict:
    # molto semplice: ---\n...\n--- all'inizio
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            import yaml as _y
            try:
                return _y.safe_load(text[3:end]) or {}
            except Exception:
                return {}
    return {}

def normalize_summary(s: str, limit: int = 220) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    return (s[:limit]+"…") if len(s) > limit else s

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9\-\s_]+", "", s)
    s = s.replace("_","-").replace(" ","-")
    s = re.sub(r"-{2,}", "-", s)
    return s.strip("-")

def title_from_file(p: Path) -> str:
    if p.suffix.lower() in [".yaml",".yml"]:
        try:
            y = yaml.safe_load(safe_read(p))
            if isinstance(y, dict):
                for k in ("name","title","nome","titolo","label"):
                    if k in y and isinstance(y[k], str):
                        return str(y[k]).strip()
        except Exception:
            pass
    if p.suffix.lower() == ".md":
        fm = frontmatter_from_md(safe_read(p))
        for k in ("title","nome","titolo"):
            if k in fm and isinstance(fm[k], str):
                return fm[k].strip()
    return p.stem.replace("_"," ").title()

def summary_from_file(p: Path) -> str:
    if p.suffix.lower() in [".yaml",".yml"]:
        try:
            y = yaml.safe_load(safe_read(p))
            if isinstance(y, dict):
                for k in ("description","descrizione","summary"):
                    if k in y and isinstance(y[k], str):
                        return normalize_summary(y[k])
        except Exception:
            pass
    if p.suffix.lower() == ".md":
        text = safe_read(p)
        fm = frontmatter_from_md(text)
        if isinstance(fm, dict):
            if "description" in fm and isinstance(fm["description"], str):
                return normalize_summary(fm["description"])
        # fallback: prime 2 linee del contenuto dopo frontmatter
        body = text.split("\n---",1)[-1] if text.startswith("---") else text
        lines = [l.strip() for l in body.splitlines() if l.strip() and not l.strip().startswith("#")]
        return normalize_summary(" ".join(lines[:3]))
    if p.suffix.lower()==".json":
        try:
            j = json.loads(safe_read(p))
            if isinstance(j, dict):
                for k in ("description","descrizione","summary"):
                    if k in j and isinstance(j[k], str):
                        return normalize_summary(j[k])
        except Exception:
            pass
    return ""

def tags_from_file(p: Path) -> list[str]:
    out = []
    if p.suffix.lower() in [".yaml",".yml"]:
        try:
            y = yaml.safe_load(safe_read(p))
            if isinstance(y, dict):
                for k in ("tags","categorie","categories"):
                    v = y.get(k, [])
                    if isinstance(v, list):
                        out.extend([str(x) for x in v if isinstance(x, (str,int,float))])
        except Exception:
            pass
    if p.suffix.lower()==".md":
        fm = frontmatter_from_md(safe_read(p))
        v = fm.get("tags",[])
        if isinstance(v, list):
            out.extend([str(x) for x in v if isinstance(x,(str,int,float))])
    if p.suffix.lower()==".json":
        try:
            j = json.loads(safe_read(p))
            if isinstance(j, dict):
                v = j.get("tags", [])
                if isinstance(v, list):
                    out.extend([str(x) for x in v if isinstance(x,(str,int,float))])
        except Exception:
            pass
    return list(dict.fromkeys(out))  # dedup by order

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--mapping-file", default="ops/site-audit/route_mapping.yaml")
    ap.add_argument("--out-json", default="ops/site-audit/_out/search_index.json")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    mapping = yaml.safe_load((repo / args.mapping_file).read_text(encoding="utf-8"))

    include_exts = set(mapping.get("include_exts", [".yaml",".yml",".md",".json"]))
    exclude_stems = set(mapping.get("exclude_stems", []))

    docs = []
    # top sections as docs, too, with short description placeholders
    for sec in mapping.get("top_sections", []):
        docs.append({
            "title": sec["title"],
            "path": sec["path"],
            "type": "toplevel",
            "summary": "",
            "tags": []
        })

    for entry in mapping.get("content_dirs", []):
        rel = entry["dir"]; url_base = entry["url_base"]; passthrough = bool(entry.get("passthrough_filename"))
        base = repo / rel
        if not base.exists(): 
            continue
        for p in base.rglob("*"):
            if not p.is_file(): continue
            if p.suffix.lower() not in include_exts: continue
            if p.stem in exclude_stems: continue

            title = title_from_file(p)
            summary = summary_from_file(p)
            tags = tags_from_file(p)

            if passthrough:
                path = f"{url_base}/{p.name}"
            else:
                path = f"{url_base}/{slugify(p.stem)}"

            docs.append({
                "title": title, "path": path, "type": url_base.strip("/").split("/")[0] or "home",
                "summary": summary, "tags": tags
            })
    out = Path(args.out_json); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"docs": docs}, ensure_ascii=False, indent=2), encoding="utf-8")

    # duplicate to /public/ if exists
    pub = repo / "public"
    if pub.exists() and pub.is_dir():
        (pub / "search_index.json").write_text(json.dumps({"docs": docs}, ensure_ascii=False), encoding="utf-8")
    print(f"[search-index] docs: {len(docs)} → {out}")
if __name__ == "__main__":
    from pathlib import Path
    main()
