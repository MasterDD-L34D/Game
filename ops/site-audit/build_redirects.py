#!/usr/bin/env python3
"""
Legge ops/site-audit/redirects_map.yaml e genera:
- redirects.txt (Netlify compatibile)
- netlify.toml (se preferisci)
- vercel.json (rewrites/redirects)
- nginx.conf.sample (blocchi "location" 301)
"""
from __future__ import annotations
import yaml, json, argparse
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--map-file", default="ops/site-audit/redirects_map.yaml")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    data = yaml.safe_load((repo / args.map_file).read_text(encoding="utf-8"))
    redirects = data.get("redirects", [])

    # redirects.txt (Netlify)
    lines = []
    for r in redirects:
        code = r.get("code", 301)
        lines.append(f"{r['from']} {r['to']} {code}")
    (repo / "redirects.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # netlify.toml
    nt_lines = ['[build]\n  publish = "public"\n']
    for r in redirects:
        nt_lines.append('[[redirects]]')
        nt_lines.append(f'  from = "{r["from"]}"')
        nt_lines.append(f'  to = "{r["to"]}"')
        nt_lines.append(f'  status = {int(r.get("code",301))}')
    (repo / "netlify.toml").write_text("\n".join(nt_lines)+"\n", encoding="utf-8")

    # vercel.json
    vercel = {"redirects": [{"source": r["from"], "destination": r["to"], "permanent": int(r.get("code",301))==301} for r in redirects]}
    (repo / "vercel.json").write_text(json.dumps(vercel, indent=2), encoding="utf-8")

    # nginx.conf.sample
    nginx = ["# Example server block snippets for redirects"]
    for r in redirects:
        nginx.append(f'location = {r["from"]} {{ return {int(r.get("code",301))} {r["to"]}; }}')
    (repo / "nginx.conf.sample").write_text("\n".join(nginx)+"\n", encoding="utf-8")

    print(f"[redirects] Generated redirects for {len(redirects)} rules")

if __name__ == "__main__":
    main()
