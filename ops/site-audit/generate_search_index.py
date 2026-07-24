
#!/usr/bin/env python3
from __future__ import annotations
import os, re, json, argparse
from pathlib import Path
from common import slugify, safe_read_text

def frontmatter_from_md(text: str) -> dict:
    if text.startswith('---'):
        end = text.find('\n---', 3)
        if end != -1:
            block = text[3:end]
            # naive YAML frontmatter parser: key: value lines
            fm = {}
            for line in block.splitlines():
                if ':' in line:
                    k,v = line.split(':',1)
                    fm[k.strip()] = v.strip().strip('"').strip("'")
            return fm
    return {}

def normalize_summary(s: str, limit=220) -> str:
    s = re.sub(r"\s+"," ", s).strip()
    return (s[:limit] + "…") if len(s) > limit else s

def title_from_file(p: Path) -> str:
    if p.suffix.lower() in (".yaml",".yml"):
        txt = safe_read_text(p)
        for key in ("name:","title:","nome:","titolo:","label:"):
            for line in txt.splitlines():
                if line.strip().lower().startswith(key):
                    val = line.split(":",1)[1].strip().strip('"').strip("'")
                    if val: return val
    if p.suffix.lower() == ".md":
        fm = frontmatter_from_md(safe_read_text(p))
        for k in ("title","nome","titolo"):
            if k in fm and fm[k]: return fm[k]
    return p.stem.replace("_"," ").title()

def summary_from_file(p: Path) -> str:
    if p.suffix.lower() == ".md":
        text = safe_read_text(p)
        fm = frontmatter_from_md(text)
        if "description" in fm: return normalize_summary(fm["description"])
        body = text.split("\n---",1)[-1] if text.startswith("---") else text
        lines = [l.strip() for l in body.splitlines() if l.strip() and not l.strip().startswith("#")]
        return normalize_summary(" ".join(lines[:3]))
    return ""

def load_mapping(repo: Path) -> dict:
    jm = repo / "ops/site-audit/route_mapping.json"
    if jm.exists():
        return json.loads(jm.read_text(encoding="utf-8"))
    raise SystemExit("route_mapping.json mancante.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--out-json", default="ops/site-audit/_out/search_index.json")
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    mapping = load_mapping(repo)

    include_exts = set(mapping.get("include_exts", [".yaml",".yml",".md",".json"]))
    exclude_stems = set(mapping.get("exclude_stems", []))

    docs = []
    for sec in mapping.get("top_sections", []):
        docs.append({"title": sec["title"], "path": sec["path"], "type": "toplevel", "summary": "", "tags": []})

    for entry in mapping.get("content_dirs", []):
        rel = entry["dir"]; url_base = entry["url_base"]; passthrough = bool(entry.get("passthrough_filename"))
        base = repo / rel
        if not base.exists(): continue
        for p in base.rglob("*"):
            if not p.is_file(): continue
            if p.suffix.lower() not in include_exts: continue
            if p.stem in exclude_stems: continue
            if passthrough:
                path = f"{url_base}/{p.name}"
            else:
                path = f"{url_base}/{slugify(p.stem)}"
            title = title_from_file(p)
            summary = summary_from_file(p)
            docs.append({"title": title, "path": path, "type": url_base.strip('/').split('/')[0] or "home", "summary": summary, "tags": []})

    out = Path(args.out_json); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"docs": docs}, ensure_ascii=False, indent=2), encoding="utf-8")
    pub = Path(repo / "public")
    if pub.exists() and pub.is_dir():
        (pub / "search_index.json").write_text(json.dumps({"docs": docs}, ensure_ascii=False), encoding="utf-8")
    print(f"[search-index] docs={len(docs)} → {out}")

if __name__ == "__main__":
    main()
