# Live monitor for the MAP-Elites overnight run (read-only, stdlib only).
# v2: + progress bar totale + barra iterazione in corso (righe jsonl / 40).
# Scans the trial dir every 60s and regenerates monitor.html (meta-refresh 60s).
# Kill anytime: it never touches the run, the backend, or production files.
import glob
import json
import os
import time
from datetime import datetime

TRIAL_DIR = r"C:\dev\Game\docs\playtest\map-elites-hardcore_06-overnight-20260702"
OUT_HTML = r"C:\dev\Game\logs\map_elites_monitor.html"
TOTAL_ITER = 50
N_PER_TRIAL = 40
WR_B = [(0, .10), (.10, .20), (.20, .30), (.30, .40), (.40, 1.0)]
DF_B = [(0, .30), (.30, .50), (.50, .70), (.70, .90), (.90, 1.0)]


def bucket(v, bands):
    for i, (lo, hi) in enumerate(bands):
        if lo <= v < hi or (i == len(bands) - 1 and v >= lo):
            return i
    return None


def scan():
    iters = []
    for fp in sorted(glob.glob(os.path.join(TRIAL_DIR, "iter-*.json"))):
        try:
            with open(fp, encoding="utf-8") as fh:
                agg = json.load(fh).get("aggregate") or {}
            iters.append({
                "i": int(os.path.basename(fp)[5:8]),
                "wr": agg.get("win_rate"), "df": agg.get("defeat_rate"),
                "to": agg.get("timeout_rate"), "n": agg.get("N"),
                "verdict": agg.get("verdict"), "turns": agg.get("turns_avg"),
                "mtime": os.path.getmtime(fp),
            })
        except (json.JSONDecodeError, OSError, ValueError):
            continue
    return iters


def current_iter_progress(iters):
    done_ids = {x["i"] for x in iters}
    best = None
    for fp in glob.glob(os.path.join(TRIAL_DIR, "iter-*.jsonl")):
        try:
            i = int(os.path.basename(fp)[5:8])
        except ValueError:
            continue
        if i not in done_ids and (best is None or i > best[0]):
            best = (i, fp)
    if best is None:
        return None
    try:
        with open(best[1], encoding="utf-8") as fh:
            lines = sum(1 for ln in fh if ln.strip())
    except OSError:
        return None
    return {"i": best[0], "runs": lines, "of": N_PER_TRIAL}


def bar(pct, label, color="#4C72B0"):
    pct = max(0.0, min(1.0, pct))
    return ("<div style='margin:6px 0 14px'>"
            f"<div style='font-size:13px;margin-bottom:3px'>{label}</div>"
            "<div style='background:#e9ecef;border-radius:6px;height:22px;width:560px;overflow:hidden'>"
            f"<div style='background:{color};height:100%;width:{pct*100:.1f}%;border-radius:6px;"
            "color:#fff;font-size:12px;font-weight:700;line-height:22px;padding-left:8px;white-space:nowrap'>"
            f"{pct*100:.1f}%</div></div></div>")


def render(iters):
    now = time.time()
    done = len(iters)
    cur = current_iter_progress(iters)
    frac = done + (cur["runs"] / cur["of"] if cur else 0)
    bars = bar(frac / TOTAL_ITER,
               f"Run totale: {done}/{TOTAL_ITER} iterazioni complete"
               + (f" + iter-{cur['i']:03d} in corso" if cur else ""),
               "#4C72B0")
    if cur:
        bars += bar(cur["runs"] / cur["of"],
                    f"Iterazione in corso (iter-{cur['i']:03d}): "
                    f"{cur['runs']}/{cur['of']} battaglie simulate", "#55A868")
    all_files = glob.glob(os.path.join(TRIAL_DIR, "*"))
    newest = max((os.path.getmtime(f) for f in all_files), default=0)
    age_min = (now - newest) / 60
    status = "RUNNING" if age_min < 90 else "STALLED?"
    scolor = "#28a745" if age_min < 90 else "#dc3545"
    eta = ""
    if done >= 2:
        ts = sorted(x["mtime"] for x in iters)
        gaps = [b - a for a, b in zip(ts, ts[1:])][-5:]
        per_iter = sum(gaps) / len(gaps)
        remaining = (TOTAL_ITER - frac) * per_iter
        eta = (f"{per_iter/60:.0f} min/iter (media ultime {len(gaps)}) -> "
               f"~{remaining/3600:.1f}h residue, fine ~"
               f"{datetime.fromtimestamp(now + remaining).strftime('%d/%m %H:%M')}")
    grid = {}
    for x in iters:
        if x["wr"] is None or x["df"] is None:
            continue
        c = (bucket(x["wr"], WR_B), bucket(x["df"], DF_B))
        grid.setdefault(c, []).append(x["i"])
    cells = ""
    for dj in range(4, -1, -1):
        cells += "<tr>"
        cells += f"<th>df {DF_B[dj][0]:.0%}-{DF_B[dj][1]:.0%}</th>"
        for wi in range(5):
            hits = grid.get((wi, dj), [])
            if hits:
                cells += (f"<td class='on'>{len(hits)}<br>"
                          f"<small>iter {min(hits)}..{max(hits)}</small></td>")
            else:
                cells += "<td class='off'>-</td>"
        cells += "</tr>"
    hdr = "".join(f"<th>wr {lo:.0%}-{hi:.0%}</th>" for lo, hi in WR_B)
    rows = ""
    for x in iters[-8:][::-1]:
        v = x["verdict"] or "?"
        vc = "#28a745" if v == "GREEN" else "#6c757d"
        rows += (f"<tr><td>{x['i']:03d}</td><td>{x['wr']:.1%}</td>"
                 f"<td>{x['df']:.1%}</td><td>{x['to']:.1%}</td><td>{x['n']}</td>"
                 f"<td style='color:{vc}'>{v}</td><td>{x['turns']:.1f}</td></tr>")
    low_n = sum(1 for x in iters if (x["n"] or 0) < N_PER_TRIAL)
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="60"><title>MAP-Elites monitor</title>
<style>body{{font-family:Segoe UI,sans-serif;background:#f8f9fa;margin:24px;color:#212529}}
.k{{display:inline-block;background:#fff;border-radius:8px;padding:12px 20px;margin:0 10px 14px 0;box-shadow:0 1px 3px rgba(0,0,0,.1)}}
.k b{{font-size:22px}} table{{border-collapse:collapse;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)}}
td,th{{border:1px solid #dee2e6;padding:8px 12px;text-align:center;font-size:13px}}
.on{{background:#55A868;color:#fff;font-weight:700}} .off{{background:#f1f3f5;color:#adb5bd}}
h3{{margin:18px 0 8px}}</style></head><body>
<h2>MAP-Elites hardcore_06 -- overnight 20260702</h2>
{bars}
<div class="k">stato <b style="color:{scolor}">{status}</b><br><small>ultimo file {age_min:.0f} min fa</small></div>
<div class="k">iterazioni <b>{done}/{TOTAL_ITER}</b></div>
<div class="k">celle popolate <b>{len(grid)}/25</b></div>
<div class="k">ETA <b style="font-size:14px">{eta or 'n/d'}</b></div>
<div class="k">iter con N&lt;{N_PER_TRIAL} <b>{low_n}</b><br><small>run parziali (da indagare nel report)</small></div>
<h3>Mappa QD (win-rate x defeat-rate) -- celle raggiunte</h3>
<table><tr><th></th>{hdr}</tr>{cells}</table>
<h3>Ultime iterazioni</h3>
<table><tr><th>iter</th><th>WR</th><th>defeat</th><th>timeout</th><th>N</th><th>verdict</th><th>turns avg</th></tr>{rows}</table>
<p><small>aggiornato {datetime.now().strftime('%H:%M:%S')} -- auto-refresh 60s -- read-only, non tocca la run</small></p>
</body></html>"""


while True:
    try:
        with open(OUT_HTML, "w", encoding="utf-8") as fh:
            fh.write(render(scan()))
        print(f"refresh {datetime.now().strftime('%H:%M:%S')}", flush=True)
    except Exception as e:
        print(f"warn: {e}", flush=True)
    time.sleep(60)
