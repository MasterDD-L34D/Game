
#!/usr/bin/env python3
import json
from pathlib import Path

def main():
    repo = Path(".").resolve()
    data = json.loads((repo / "ops/site-audit/redirects_map.json").read_text(encoding="utf-8"))
    redirects = data.get("redirects", [])

    # redirects.txt (Netlify)
    lines = [f"{r['from']} {r['to']} {int(r.get('code',301))}" for r in redirects]
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

    print(f"[redirects] generated {len(redirects)} rules")

if __name__ == "__main__":
    main()
