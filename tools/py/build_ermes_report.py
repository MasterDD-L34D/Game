#!/usr/bin/env python3
"""Build a self-contained static HTML report from an ERMES eco-pressure report.

Replaces the dead Streamlit dashboard (prototypes/ermes_lab/ermes_dashboard.py,
single-biome, Streamlit-gated). This generator consumes the MULTI-BIOME schema
v1.0.0 emitted at backend boot by apps/backend/services/ermes/ermesRunner.js
(default sink prototypes/ermes_lab/outputs/latest_eco_pressure_report.json) and
renders ONE offline HTML page -- no server, no CDN -- with one card per biome:

  * diegetic band label + eco-pressure score (bands read FROM
    data/core/balance/ermes_bucket_thresholds.yaml, never hardcoded),
  * encounter-bias and mutation-bias tables (annotated with the sub-metric
    band when the yaml defines one),
  * extinction risks, with species at risk >= 0.5 highlighted,
  * the diegetic debrief notes,
  * a footer with generated_at + report schema version.

Player-facing language stays diegetic ('Bioma calmo / in equilibrio / in
tensione') exactly as ratified in the thresholds yaml.

Usage:
    py tools/py/build_ermes_report.py [--in PATH] [--out PATH] [--thresholds PATH]

Defaults (repo-relative):
    --in         prototypes/ermes_lab/outputs/latest_eco_pressure_report.json
    --out        logs/reports/ermes_report.html          (generated, gitignored)
    --thresholds data/core/balance/ermes_bucket_thresholds.yaml
"""

from __future__ import annotations

import argparse
import html
import json
import os
import sys
from typing import Any, Optional

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_IN = os.path.join(
    ROOT, "prototypes", "ermes_lab", "outputs", "latest_eco_pressure_report.json"
)
DEFAULT_OUT = os.path.join(ROOT, "logs", "reports", "ermes_report.html")
DEFAULT_THRESHOLDS = os.path.join(
    ROOT, "data", "core", "balance", "ermes_bucket_thresholds.yaml"
)

# Presentation-only colour per band key (NOT a threshold; bands come from yaml).
BAND_CLASS = {"low": "band-low", "med": "band-med", "high": "band-high", "unknown": "band-na"}
EXTINCTION_HIGHLIGHT = 0.5  # species at/above this risk get the risk-high accent


# --------------------------------------------------------------------------- #
# Data / classification (pure, unit-tested)
# --------------------------------------------------------------------------- #
def load_thresholds(path: str) -> dict:
    """Load the ermes_bucket_thresholds.yaml. utf-8-sig tolerates a BOM."""
    with open(path, encoding="utf-8-sig") as fh:
        return yaml.safe_load(fh)


def classify_eco_band(score: Optional[float], thresholds: dict) -> dict:
    """Map an eco_pressure_score to its band using ONLY the yaml ranges.

    Ranges are half-open [lo, hi); the top band is inclusive of its hi so a
    score of exactly 1.0 does not fall through the edge. A missing score
    soft-fails to an 'unknown' band (mirror guards.soft_fail_on_eco_pressure_missing).
    """
    buckets = thresholds["buckets"]["eco_pressure_score"]
    if score is None:
        return {"band": "unknown", "delta_mod": None, "label": "Bioma non rilevato.",
                "range": None}
    ordered = sorted(buckets.items(), key=lambda kv: kv[1]["range"][0])
    top_hi = max(spec["range"][1] for _, spec in ordered)
    for name, spec in ordered:
        lo, hi = spec["range"]
        if (lo <= score < hi) or (hi == top_hi and lo <= score <= hi):
            return {"band": name, "delta_mod": spec.get("delta_mod"),
                    "label": spec.get("narrative_it", name), "range": [lo, hi]}
    fallback = thresholds.get("guards", {}).get("bucket_miss_fallback", "low")
    spec = buckets.get(fallback, {})
    return {"band": fallback, "delta_mod": spec.get("delta_mod"),
            "label": spec.get("narrative_it", fallback), "range": spec.get("range")}


def classify_sub_band(bucket_key: str, value: Any, thresholds: dict) -> Optional[str]:
    """Return the band name (low/med/high) for a sub-metric defined in the yaml.

    bucket_key is the dotted yaml key, e.g. 'mutation_bias.heat_resistance'.
    Returns None when the metric is not modelled or the value is not numeric.
    """
    buckets = thresholds.get("buckets", {})
    spec = buckets.get(bucket_key)
    if not spec or not isinstance(value, (int, float)):
        return None
    ordered = sorted(spec.items(), key=lambda kv: kv[1]["range"][0])
    top_hi = max(s["range"][1] for _, s in ordered)
    for name, s in ordered:
        lo, hi = s["range"]
        if (lo <= value < hi) or (hi == top_hi and lo <= value <= hi):
            return name
    return None


# --------------------------------------------------------------------------- #
# HTML rendering
# --------------------------------------------------------------------------- #
def _esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def _fmt(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.3f}"
    return _esc(value)


def _bias_table(title: str, group_key: str, data: dict, thresholds: dict) -> str:
    if not data:
        return ""
    rows = []
    for metric, value in data.items():
        band = classify_sub_band(f"{group_key}.{metric}", value, thresholds)
        band_cell = (
            f'<span class="pill {BAND_CLASS.get(band, "band-na")}">{_esc(band)}</span>'
            if band else '<span class="muted">--</span>'
        )
        rows.append(
            f"<tr><td>{_esc(metric)}</td><td class=\"num\">{_fmt(value)}</td>"
            f"<td>{band_cell}</td></tr>"
        )
    return (
        f'<div class="subtable"><h4>{_esc(title)}</h4>'
        f'<table><thead><tr><th>metrica</th><th class="num">valore</th>'
        f'<th>banda</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>'
    )


def _extinction_block(risks: dict) -> str:
    if not risks:
        return '<div class="subtable"><h4>Rischio estinzione</h4>' \
               '<p class="muted">Nessun rischio registrato.</p></div>'
    rows = []
    for species, risk in sorted(risks.items(), key=lambda kv: kv[1], reverse=True):
        high = isinstance(risk, (int, float)) and risk >= EXTINCTION_HIGHLIGHT
        cls = " class=\"risk-high\"" if high else ""
        flag = ' <span class="flag">a rischio</span>' if high else ""
        rows.append(
            f"<tr{cls}><td>{_esc(species)}{flag}</td>"
            f"<td class=\"num\">{_fmt(risk)}</td></tr>"
        )
    return (
        '<div class="subtable"><h4>Rischio estinzione</h4>'
        '<table><thead><tr><th>specie</th><th class="num">rischio</th></tr></thead>'
        f'<tbody>{"".join(rows)}</tbody></table></div>'
    )


def _debrief_block(notes: list) -> str:
    if not notes:
        return ""
    items = "".join(f"<li>{_esc(n)}</li>" for n in notes)
    return f'<div class="subtable"><h4>Debrief</h4><ul class="notes">{items}</ul></div>'


def _biome_card(biome_id: str, biome: dict, thresholds: dict) -> str:
    band = classify_eco_band(biome.get("eco_pressure_score"), thresholds)
    score = biome.get("eco_pressure_score")
    delta = band["delta_mod"]
    delta_txt = f"{delta:+d}" if isinstance(delta, int) else "n/d"
    return f"""
    <section class="card">
      <div class="card-head">
        <h2>{_esc(biome_id)}</h2>
        <span class="band {BAND_CLASS.get(band['band'], 'band-na')}">{_esc(band['label'])}</span>
      </div>
      <div class="metrics">
        <div class="metric"><span class="mlabel">eco pressure</span>
          <span class="mval">{_fmt(score) if score is not None else 'n/d'}</span></div>
        <div class="metric"><span class="mlabel">banda</span>
          <span class="mval">{_esc(band['band'])}</span></div>
        <div class="metric"><span class="mlabel">delta mod</span>
          <span class="mval">{_esc(delta_txt)}</span></div>
      </div>
      <div class="grid">
        {_bias_table('Encounter bias', 'encounter_bias', biome.get('encounter_bias', {}), thresholds)}
        {_bias_table('Mutation bias', 'mutation_bias', biome.get('mutation_bias', {}), thresholds)}
        {_extinction_block(biome.get('extinction_risk', {}))}
        {_debrief_block(biome.get('debrief_notes', []))}
      </div>
    </section>"""


CSS = """
:root{--bg:#0d1117;--card:#161b22;--border:#30363d;--txt:#c9d1d9;--txt2:#8b949e;
--accent:#58a6ff;--low:#3fb950;--med:#d29922;--high:#f85149;--na:#6e7681;
--riskbg:#3d1417;--r:8px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
background:var(--bg);color:var(--txt);line-height:1.55;padding:24px}
.wrap{max-width:1200px;margin:0 auto}
header{border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:24px}
header h1{font-size:22px;font-weight:600;color:#f0f6fc}
header p{color:var(--txt2);font-size:13px;margin-top:4px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:20px}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:18px}
.card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;
border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:12px}
.card-head h2{font-size:17px;color:#f0f6fc;font-weight:600;text-transform:capitalize}
.band{font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap}
.band-low{background:rgba(63,185,80,.15);color:var(--low);border:1px solid var(--low)}
.band-med{background:rgba(210,153,34,.15);color:var(--med);border:1px solid var(--med)}
.band-high{background:rgba(248,81,73,.15);color:var(--high);border:1px solid var(--high)}
.band-na{background:rgba(110,118,129,.15);color:var(--na);border:1px solid var(--na)}
.metrics{display:flex;gap:20px;margin-bottom:14px;flex-wrap:wrap}
.metric{display:flex;flex-direction:column}
.mlabel{font-size:11px;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em}
.mval{font-size:18px;font-weight:600;color:#f0f6fc;font-variant-numeric:tabular-nums}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.subtable h4{font-size:12px;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em;
margin-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--border)}
th{color:var(--txt2);font-weight:500;font-size:11px;text-transform:uppercase}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.pill{font-size:11px;padding:1px 8px;border-radius:12px;font-weight:600}
.muted{color:var(--txt2)}
.notes{list-style:none;font-size:13px}
.notes li{padding:3px 0 3px 14px;position:relative;color:var(--txt)}
.notes li:before{content:'-';position:absolute;left:0;color:var(--accent)}
tr.risk-high td{background:var(--riskbg)}
.flag{font-size:10px;color:var(--high);font-weight:700;text-transform:uppercase;
border:1px solid var(--high);border-radius:10px;padding:0 6px;margin-left:6px}
.empty{background:var(--card);border:1px dashed var(--border);border-radius:var(--r);
padding:40px;text-align:center;color:var(--txt2)}
footer{margin-top:28px;padding-top:16px;border-top:1px solid var(--border);
color:var(--txt2);font-size:12px;display:flex;flex-wrap:wrap;gap:6px 20px}
footer code{color:var(--accent)}
"""


def build_html(report: dict, thresholds: dict, in_path: str) -> str:
    """Render the full single-page HTML string for a multi-biome ERMES report."""
    biomes = report.get("biomes") or {}
    schema_version = report.get("schema_version", "n/d")
    generated_at = report.get("generated_at", "n/d")
    generator = report.get("generator") or {}
    gen_tool = generator.get("tool", "n/d")
    gen_ver = generator.get("tool_version", "n/d")

    if biomes:
        cards = "".join(
            _biome_card(bid, biomes[bid], thresholds) for bid in sorted(biomes)
        )
        body = f'<div class="cards">{cards}</div>'
    else:
        body = (
            '<div class="empty"><h2>Nessun bioma nel report</h2>'
            "<p>Il report non contiene biomi. Genera un report multi-bioma con "
            "<code>ermes_sim.py --multi-biome</code> oppure avvia il backend "
            "(ermesRunner scrive il report al boot).</p></div>"
        )

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ERMES -- Eco Pressure Report</title>
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
<header>
<h1>ERMES -- Eco Pressure Report</h1>
<p>Report diegetico della pressione ecosistemica per bioma. Bande lette da
ermes_bucket_thresholds.yaml.</p>
</header>
{body}
<footer>
<span>generato: <code>{_esc(generated_at)}</code></span>
<span>schema: <code>{_esc(schema_version)}</code></span>
<span>generatore: <code>{_esc(gen_tool)} {_esc(gen_ver)}</code></span>
<span>sorgente: <code>{_esc(in_path)}</code></span>
</footer>
</div>
</body>
</html>"""


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main(argv: Optional[list] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--in", dest="inp", default=DEFAULT_IN,
                    help="input eco-pressure report json")
    ap.add_argument("--out", default=DEFAULT_OUT, help="output html path")
    ap.add_argument("--thresholds", default=DEFAULT_THRESHOLDS,
                    help="ermes_bucket_thresholds.yaml")
    args = ap.parse_args(argv)

    if not os.path.exists(args.thresholds):
        print(f"thresholds yaml not found: {args.thresholds}", file=sys.stderr)
        return 2
    thresholds = load_thresholds(args.thresholds)

    if os.path.exists(args.inp):
        with open(args.inp, encoding="utf-8-sig") as fh:
            report = json.load(fh)
    else:
        print(f"report not found: {args.inp} -- rendering honest empty-state. "
              f"Generate one with prototypes/ermes_lab/ermes_sim.py --multi-biome "
              f"or boot the backend (ermesRunner).", file=sys.stderr)
        report = {"schema_version": "n/d", "biomes": {}}

    out_html = build_html(report, thresholds, args.inp)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(out_html)

    n = len(report.get("biomes") or {})
    print(f"OK -> {args.out} ({len(out_html) // 1024} KB, {n} biome(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
