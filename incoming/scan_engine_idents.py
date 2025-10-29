#!/usr/bin/env python3
"""
scan_engine_idents.py
Ricerca in un albero di sorgenti (TS/JS/PY) i candidati nomi di STAT ed EVENTI.
Uso:
  python scan_engine_idents.py --root /path/to/Game --out scan_results.json
"""
import os, re, json, argparse
STAT_HINTS = [
  "hp", "health", "initiative", "damage", "melee", "ranged", "support",
  "evasion", "dodge", "stealth", "stamina", "energy", "aura", "charisma",
  "counter", "skill", "burst", "bond", "solo", "independent"
]

def is_source(fname):
    lname = fname.lower()
    return lname.endswith((".ts",".tsx",".js",".jsx",".py",".json",".yaml",".yml",".md"))

def tokenize(text):
    # identifiers and dotted paths
    return re.findall(r"[A-Za-z_][A-Za-z0-9_\.]*", text)

def scan(root):
    stats = {}
    events = {}
    files = []
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if not is_source(fn): continue
            p = os.path.join(dirpath, fn)
            try:
                with open(p, "r", encoding="utf-8") as f:
                    txt = f.read()
            except Exception:
                continue
            files.append(p)
            toks = tokenize(txt)

            # EVENTI: pattern on_xxx / onXxx / "on_xxx" in json
            for t in toks:
                if t.startswith("on_"):
                    events[t] = events.get(t, 0) + 1
                if t.startswith("on") and len(t) > 2 and t[2].isupper():
                    events[t] = events.get(t, 0) + 1

            # STAT: euristiche: chiavi 'stat' / 'stats', chiamate applyEffect({stat: 'x'}) ecc.
            # 1) stringhe 'stat' o 'stats' vicine a valori letterali
            for m in re.finditer(r"stat[s]?\s*[:=]\s*['\"]([A-Za-z_][A-Za-z0-9_\-]*)['\"]", txt):
                key = m.group(1)
                stats[key] = stats.get(key, 0) + 1
            # 2) funzioni contenenti 'apply' e 'stat' nella firma
            for m in re.finditer(r"apply\w*\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_\-]*)['\"]", txt):
                key = m.group(1)
                stats[key] = stats.get(key, 0) + 1
            # 3) termini indicativi liberi
            for t in toks:
                lt = t.lower()
                for hint in STAT_HINTS:
                    if hint in lt and len(lt) <= 32:
                        stats[lt] = stats.get(lt, 0) + 1

    # ordina per frequenza
    stats_sorted = sorted(stats.items(), key=lambda x: (-x[1], x[0]))
    events_sorted = sorted(events.items(), key=lambda x: (-x[1], x[0]))
    return {
        "scanned_files": files,
        "stats": [{"name": k, "count": c} for k, c in stats_sorted],
        "events": [{"name": k, "count": c} for k, c in events_sorted]
    }

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    result = scan(args.root)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("Saved:", args.out)
