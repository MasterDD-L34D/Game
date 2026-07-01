#!/usr/bin/env python3
"""Build a self-contained HTML dashboard from playtest_aggregates.json.

Companion of aggregate_session_logs.py (run that first). Output is a single
offline HTML file (Chart.js via CDN) with KPIs, outcome views, WR-by-scenario
against the 30-50% calibration band, damage by species/job, session length
distribution and per-turn action funnel. See issue #3157 for data caveats.

Usage:
    python tools/py/build_playtest_dashboard.py [--in PATH] [--out PATH]

Defaults: --in logs/reports/playtest_aggregates.json,
          --out logs/reports/evo_playtest_dashboard.html (generated, do not commit).
"""
import argparse
import json
import os
import sys

# encoding-non-ascii-ok: sort arrows (U+25B2/U+25BC) inside the embedded HTML template
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Evo-Tactics AI-Playtest Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1"></script>
<style>
:root{--bg:#f8f9fa;--card:#fff;--hdr:#1a1a2e;--txt:#212529;--txt2:#6c757d;
--c1:#4C72B0;--c2:#DD8452;--c3:#55A868;--c4:#C44E52;--c5:#8172B3;--c6:#937860;
--pos:#28a745;--neg:#dc3545;--gap:16px;--r:8px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--txt);line-height:1.5}
.wrap{max-width:1400px;margin:0 auto;padding:var(--gap)}
header{background:var(--hdr);color:#fff;padding:20px 24px;border-radius:var(--r);margin-bottom:var(--gap);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
header h1{font-size:20px;font-weight:600}
.filters{display:flex;gap:12px;align-items:center}
.filters label{font-size:12px;color:rgba(255,255,255,.7)}
.filters select{padding:6px 10px;border:1px solid rgba(255,255,255,.2);border-radius:4px;background:rgba(255,255,255,.1);color:#fff;font-size:13px}
.filters select option{background:var(--hdr)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--gap);margin-bottom:var(--gap)}
.kpi{background:var(--card);border-radius:var(--r);padding:18px 22px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.kpi .l{font-size:12px;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px}
.kpi .v{font-size:28px;font-weight:700}
.kpi .s{font-size:12px;color:var(--txt2)}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:var(--gap);margin-bottom:var(--gap)}
.chart{background:var(--card);border-radius:var(--r);padding:18px 22px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.chart h3{font-size:14px;font-weight:600;margin-bottom:12px}
.chart canvas{max-height:300px}
.wide{grid-column:1/-1}
.tbl{background:var(--card);border-radius:var(--r);padding:18px 22px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 12px;border-bottom:2px solid #dee2e6;color:var(--txt2);font-size:12px;text-transform:uppercase;cursor:pointer;user-select:none;white-space:nowrap}
td{padding:8px 12px;border-bottom:1px solid #f0f0f0}
tr:hover td{background:#f8f9fa}
.band-ok{color:var(--pos);font-weight:600}
.band-off{color:var(--neg);font-weight:600}
footer{color:var(--txt2);font-size:12px;padding:8px 4px}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>Evo-Tactics -- AI-Playtest Batch Dashboard</h1>
  <div class="filters">
    <label for="f-scenario">Scenario</label>
    <select id="f-scenario" onchange="applyScenario()"><option value="all">All scenarios</option></select>
  </div>
</header>
<section class="kpis">
  <div class="kpi"><div class="l">Sessions</div><div class="v" id="k-sessions"></div><div class="s" id="k-src"></div></div>
  <div class="kpi"><div class="l">Events</div><div class="v" id="k-events"></div></div>
  <div class="kpi"><div class="l">Win rate (completed)</div><div class="v" id="k-wr"></div><div class="s">target band 30-50%</div></div>
  <div class="kpi"><div class="l">Avg session turns</div><div class="v" id="k-turns"></div></div>
</section>
<section class="charts">
  <div class="chart"><h3 id="t-outcome">Outcomes</h3><canvas id="c-outcome"></canvas></div>
  <div class="chart"><h3>Win rate by scenario (band 30-50%)</h3><canvas id="c-wr"></canvas></div>
  <div class="chart"><h3>Damage by species (top 12)</h3><canvas id="c-species"></canvas></div>
  <div class="chart"><h3>Damage by job</h3><canvas id="c-job"></canvas></div>
  <div class="chart"><h3>Session length (turns) distribution</h3><canvas id="c-hist"></canvas></div>
  <div class="chart"><h3>Sessions per day (by outcome)</h3><canvas id="c-days"></canvas></div>
  <div class="chart wide"><h3>Actions per turn (funnel, turns 0-30)</h3><canvas id="c-funnel"></canvas></div>
</section>
<section class="tbl"><h3 style="font-size:14px;margin-bottom:10px">Scenario detail</h3><div id="tbl"></div></section>
<footer>Generated from <span id="f-src"></span> -- static snapshot, regenerate via tools/py/aggregate_session_logs.py + build_playtest_dashboard.py</footer>
</div>
<script>
const DATA = /*__DATA__*/;
const COLORS=['#4C72B0','#DD8452','#55A868','#C44E52','#8172B3','#937860','#DA8BC3','#8C8C8C'];
const OUTCOL={win:'#55A868',abandon:'#DD8452',timeout:'#8172B3',truncated:'#8C8C8C',wipe:'#C44E52'};
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':n.toLocaleString();
let outChart;

function scenarioStats(sc){
  const src = sc==='all' ? DATA.outcomes_total : (DATA.outcomes_by_scenario[sc]||{});
  const total=Object.values(src).reduce((a,b)=>a+b,0);
  const completed=total-(src.truncated||0);
  const wr=completed?100*(src.win||0)/completed:0;
  return {src,total,completed,wr};
}

function applyScenario(){
  const sc=document.getElementById('f-scenario').value;
  const st=scenarioStats(sc);
  document.getElementById('k-sessions').textContent=fmt(st.total);
  document.getElementById('k-wr').textContent=st.wr.toFixed(1)+'%';
  document.getElementById('k-wr').style.color=(st.wr>=30&&st.wr<=50)?'#28a745':'#dc3545';
  document.getElementById('t-outcome').textContent='Outcomes -- '+(sc==='all'?'all scenarios':sc);
  const labels=Object.keys(st.src), vals=labels.map(k=>st.src[k]);
  outChart.data.labels=labels;
  outChart.data.datasets[0].data=vals;
  outChart.data.datasets[0].backgroundColor=labels.map(l=>OUTCOL[l]||'#8172B3');
  outChart.update('none');
}

// --- init ---
document.getElementById('k-sessions').textContent=fmt(DATA.kpis.sessions);
document.getElementById('k-events').textContent=fmt(DATA.kpis.events);
document.getElementById('k-wr').textContent=DATA.kpis.win_rate_pct.toFixed(1)+'%';
document.getElementById('k-wr').style.color=(DATA.kpis.win_rate_pct>=30&&DATA.kpis.win_rate_pct<=50)?'#28a745':'#dc3545';
document.getElementById('k-turns').textContent=DATA.kpis.avg_turns;
document.getElementById('k-src').textContent=DATA.generated_from;
document.getElementById('f-src').textContent=DATA.generated_from;

// scenario filter
const scSel=document.getElementById('f-scenario');
Object.keys(DATA.outcomes_by_scenario).sort().forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;scSel.appendChild(o);});

// outcomes doughnut
{const l=Object.keys(DATA.outcomes_total);
outChart=new Chart(document.getElementById('c-outcome'),{type:'doughnut',
 data:{labels:l,datasets:[{data:l.map(k=>DATA.outcomes_total[k]),backgroundColor:l.map(k=>OUTCOL[k]||'#8172B3'),borderColor:'#fff',borderWidth:2}]},
 options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'right'}}}});}

// win rate by scenario horizontal bar, band-colored
{const rows=Object.keys(DATA.outcomes_by_scenario).map(s=>{const st=scenarioStats(s);return {s,wr:st.wr,n:st.completed};})
  .filter(r=>r.n>=10).sort((a,b)=>b.wr-a.wr);
new Chart(document.getElementById('c-wr'),{type:'bar',
 data:{labels:rows.map(r=>r.s+' (n='+r.n+')'),datasets:[{data:rows.map(r=>+r.wr.toFixed(1)),
  backgroundColor:rows.map(r=>r.wr>=30&&r.wr<=50?'#55A868CC':'#C44E52CC'),borderRadius:4}]},
 options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
  tooltip:{callbacks:{label:c=>c.parsed.x+'% win rate'}}},
  scales:{x:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%'}}}}});}

// damage by species (top 12)
{const ks=Object.keys(DATA.damage_by_species).slice(0,12);
new Chart(document.getElementById('c-species'),{type:'bar',
 data:{labels:ks,datasets:[{label:'total damage',data:ks.map(k=>DATA.damage_by_species[k].total),backgroundColor:'#4C72B0CC',borderRadius:4}]},
 options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});}

// damage by job
{const ks=Object.keys(DATA.damage_by_job);
new Chart(document.getElementById('c-job'),{type:'bar',
 data:{labels:ks,datasets:[{label:'total damage',data:ks.map(k=>DATA.damage_by_job[k].total),backgroundColor:'#DD8452CC',borderRadius:4}]},
 options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});}

// turns histogram
{const ks=Object.keys(DATA.turns_histogram).map(Number).sort((a,b)=>a-b);
new Chart(document.getElementById('c-hist'),{type:'bar',
 data:{labels:ks.map(k=>k===30?'30+':String(k)),datasets:[{data:ks.map(k=>DATA.turns_histogram[String(k)]),backgroundColor:'#8172B3CC',borderRadius:3}]},
 options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
  scales:{x:{title:{display:true,text:'turns'}},y:{title:{display:true,text:'sessions'}}}}});}

// sessions per day stacked by outcome
{const days=Object.keys(DATA.outcome_by_day).sort();
const outs=['win','abandon','timeout','wipe','truncated'];
new Chart(document.getElementById('c-days'),{type:'bar',
 data:{labels:days,datasets:outs.map(o=>({label:o,data:days.map(d=>(DATA.outcome_by_day[d]||{})[o]||0),backgroundColor:OUTCOL[o]+'CC'}))},
 options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true}},plugins:{legend:{position:'top'}}}});}

// actions per turn funnel (top 6 action types by volume)
{const turns=Object.keys(DATA.actions_by_turn).map(Number).sort((a,b)=>a-b);
const tot={};turns.forEach(t=>{const c=DATA.actions_by_turn[String(t)];Object.keys(c).forEach(k=>tot[k]=(tot[k]||0)+c[k]);});
const top=Object.keys(tot).sort((a,b)=>tot[b]-tot[a]).slice(0,6);
new Chart(document.getElementById('c-funnel'),{type:'line',
 data:{labels:turns,datasets:top.map((k,i)=>({label:k,data:turns.map(t=>DATA.actions_by_turn[String(t)][k]||0),
  borderColor:COLORS[i%COLORS.length],backgroundColor:COLORS[i%COLORS.length]+'20',borderWidth:2,tension:.3,pointRadius:2}))},
 options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
  scales:{x:{title:{display:true,text:'turn'}},y:{title:{display:true,text:'events'}}}}});}

// scenario table sortable
{const cols=[['scenario','Scenario'],['n','Sessions'],['completed','Completed'],['win','Win'],['abandon','Abandon'],['timeout','Timeout'],['wipe','Wipe'],['truncated','Trunc'],['wr','Win rate']];
const rows=Object.keys(DATA.outcomes_by_scenario).map(s=>{const c=DATA.outcomes_by_scenario[s];const st=scenarioStats(s);
 return {scenario:s,n:st.total,completed:st.completed,win:c.win||0,abandon:c.abandon||0,timeout:c.timeout||0,wipe:c.wipe||0,truncated:c.truncated||0,wr:+st.wr.toFixed(1)};});
let sc='n',sd=-1;
function render(){rows.sort((a,b)=>(a[sc]<b[sc]?1:-1)*sd*-1);
 let h='<table><thead><tr>'+cols.map(c=>'<th onclick="window.__sort(\''+c[0]+'\')">'+c[1]+(sc===c[0]?(sd===1?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>';
 rows.forEach(r=>{const cls=r.wr>=30&&r.wr<=50?'band-ok':'band-off';
  // cells built FROM cols so header/data can never drift apart again (Codex P2 #3159)
  h+='<tr>'+cols.map(c=>c[0]==='wr'?'<td class="'+cls+'">'+r.wr+'%</td>':'<td>'+r[c[0]]+'</td>').join('')+'</tr>';});
 document.getElementById('tbl').innerHTML=h+'</tbody></table>';}
window.__sort=k=>{if(sc===k)sd=-sd;else{sc=k;sd=-1;}render();};
render();}
</script>
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in", dest="inp", default=os.path.join(ROOT, "logs", "reports", "playtest_aggregates.json"))
    ap.add_argument("--out", default=os.path.join(ROOT, "logs", "reports", "evo_playtest_dashboard.html"))
    args = ap.parse_args()

    if not os.path.exists(args.inp):
        print(f"aggregates not found: {args.inp} -- run tools/py/aggregate_session_logs.py first", file=sys.stderr)
        return 1
    with open(args.inp, encoding="utf-8") as fh:
        data = json.load(fh)

    out = HTML.replace("/*__DATA__*/", json.dumps(data, separators=(",", ":")))
    # injection check: placeholder replaced AND output grew past the bare template
    # (relative threshold -- a tiny test corpus must not trip a fixed-size assert)
    assert "/*__DATA__*/" not in out and len(out) > len(HTML), "data injection failed"
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"OK -> {args.out} ({len(out)//1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
