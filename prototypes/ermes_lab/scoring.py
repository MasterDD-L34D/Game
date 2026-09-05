#!/usr/bin/env python3
from __future__ import annotations
import argparse,copy,csv,json,random,sys
from pathlib import Path
from typing import Any
from ermes_sim import LAB_ROOT,load_config,run_simulation,write_report
DEFAULT_RANGES=LAB_ROOT/'configs'/'experiment_ranges.json'; DEFAULT_RESULTS=LAB_ROOT/'outputs'/'experiment_results.csv'; DEFAULT_BEST=LAB_ROOT/'outputs'/'best_config.json'
def score_report(r:dict[str,Any])->float:
    init=max(1,int(r['total_initial_population'])); final=max(0,int(r['total_final_population'])); ratio=final/init; risks=list(r['extinction_risk'].values()); avg=sum(risks)/len(risks) if risks else 0; maxrisk=max(risks) if risks else 0
    motion=0
    for s in r.get('species_summary',{}).values(): motion+=sum(abs(float(v)) for v in s['trait_delta'].values())
    motion/=max(1,len(r.get('species_summary',{})))
    pressure=1-abs(float(r['eco_pressure'])-.55); risk=1-abs(avg-.35); mot=min(1,motion*4); penalty=0
    if final<=0: penalty+=.75
    if ratio>20: penalty+=.40
    if maxrisk>=1 and final<=init*.1: penalty+=.25
    return round(max(0,min(1,pressure*.35+risk*.25+mot*.30+min(1,maxrisk)*.10-penalty)),4)
def load_ranges(path:Path=DEFAULT_RANGES): return json.loads(path.read_text(encoding='utf-8'))
def sample(base,ranges,rng):
    c=copy.deepcopy(base); e=c['environment']; e['temperature']=rng.choice(ranges['temperature']); e['food']=rng.choice(ranges['food']); e['predators']=rng.choice(ranges['predators']); e['volatility']=rng.choice(ranges['volatility']); c['generations']=rng.choice(ranges['generations']); c['seed']=rng.randint(1,999999); ms=rng.choice(ranges['mutation_rate_scale']); rs=rng.choice(ranges['reproduction_rate_scale'])
    for sp in c['species']: sp['mutation_rate']=min(.5,sp['mutation_rate']*ms); sp['reproduction_rate']=max(.1,sp['reproduction_rate']*rs)
    return c
def run_experiments(runs:int,seed:int,results_path:Path,best_path:Path):
    base=load_config(); ranges=load_ranges(); rng=random.Random(seed); rows=[]; best=None; bestscore=-1
    for i in range(runs):
        c=sample(base,ranges,rng); _,r=run_simulation(c); sc=score_report(r); row={'run':i+1,'score':sc,'seed':c['seed'],'generations':r['generation'],'temperature':c['environment']['temperature'],'food':c['environment']['food'],'predators':c['environment']['predators'],'volatility':c['environment']['volatility'],'eco_pressure':r['eco_pressure'],'final_population':r['total_final_population'],'report':json.dumps(r,ensure_ascii=False)}; rows.append(row)
        if sc>bestscore: bestscore=sc; best={'score':sc,'config':c,'report':r}
    rows.sort(key=lambda x:x['score'],reverse=True); results_path.parent.mkdir(parents=True,exist_ok=True)
    with results_path.open('w',newline='',encoding='utf-8') as f: w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    if best: best_path.write_text(json.dumps(best,indent=2,ensure_ascii=False),encoding='utf-8'); write_report(best['report'])
    return rows
def main(argv=None):
    p=argparse.ArgumentParser(); p.add_argument('--runs',type=int,default=50); p.add_argument('--seed',type=int,default=20260429); p.add_argument('--results',default=str(DEFAULT_RESULTS)); p.add_argument('--best',default=str(DEFAULT_BEST)); a=p.parse_args(argv or sys.argv[1:]); rows=run_experiments(max(1,a.runs),a.seed,Path(a.results),Path(a.best)); print('ERMES Experiment Loop'); print('====================='); print('Runs:',a.runs); print('Best score:',rows[0]['score']); print('Results:',a.results); print('Best config:',a.best); return 0
if __name__=='__main__': raise SystemExit(main())
