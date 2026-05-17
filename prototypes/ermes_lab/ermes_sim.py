#!/usr/bin/env python3
from __future__ import annotations
import argparse,csv,json,math,random,sys,unittest
from dataclasses import dataclass,field
from pathlib import Path
from typing import Any
LAB_ROOT=Path(__file__).resolve().parent
DEFAULT_CONFIG=LAB_ROOT/'configs'/'default.json'
DEFAULT_OUTPUT=LAB_ROOT/'outputs'/'latest_eco_pressure_report.json'
DEFAULT_HISTORY_CSV=LAB_ROOT/'outputs'/'latest_history.csv'

def clamp(v:float,a:float=0.0,b:float=1.0)->float: return max(a,min(v,b))
def sigmoid(x:float)->float: return 1/(1+math.exp(-x))
def rnd(a:float)->float: return random.uniform(-a,a)
@dataclass
class Environment:
    temperature:float; food:float; predators:float; volatility:float=0.04
    def update(self)->None:
        self.temperature=clamp(self.temperature+rnd(self.volatility)); self.food=clamp(self.food+rnd(self.volatility)); self.predators=clamp(self.predators+rnd(self.volatility))
@dataclass
class Species:
    name:str; population:int; traits:dict[str,float]; reproduction_rate:float; mutation_rate:float; mutation_strength:float; extinct:bool=False; history:list[dict[str,Any]]=field(default_factory=list)
    def record(self,g:int,fit:float,surv:float,env:Environment)->None:
        self.history.append({'generation':g,'species':self.name,'population':self.population,'speed':self.traits['speed'],'size':self.traits['size'],'resistance':self.traits['resistance'],'fitness':fit,'survival_rate':surv,'temperature':env.temperature,'food':env.food,'predators':env.predators,'extinct':self.extinct})

def calculate_fitness(sp:Species,env:Environment)->float:
    speed,size,res=sp.traits['speed'],sp.traits['size'],sp.traits['resistance']
    temp_stress=abs(env.temperature-0.5)*2
    food_component=size*env.food if env.food>=0.5 else (1-size)*(1-env.food)
    return clamp(speed*env.predators*.40 + res*temp_stress*.35 + food_component*.25)

def survival_rate(fit:float,env:Environment)->float:
    difficulty=env.predators*.40 + abs(env.temperature-0.5)*2*.35 + (1-env.food)*.25
    return clamp(sigmoid((fit-difficulty+0.28)*4.0),0.03,0.99)

def mutate(sp:Species,stress:float)->None:
    rate=clamp(sp.mutation_rate*stress,0,.5)
    for t in sp.traits:
        if random.random()<rate: sp.traits[t]=clamp(sp.traits[t]+rnd(sp.mutation_strength))

def drift(sp:Species)->None:
    if sp.population<=0: return
    strength=clamp(20/sp.population,.001,.08)
    for t in sp.traits: sp.traits[t]=clamp(sp.traits[t]+rnd(strength))

def update_species(sp:Species,env:Environment,g:int)->None:
    if sp.extinct: sp.record(g,0,0,env); return
    fit=calculate_fitness(sp,env); surv=survival_rate(fit,env); survivors=max(0,int(sp.population*surv))
    food_mod=clamp(.55+env.food*.55,.25,1.10); density=max(.25,1-sp.population/5000)
    births=int(survivors*sp.reproduction_rate*(.25+fit)*food_mod*density)
    sp.population=min(5000,max(0,survivors+births))
    mutate(sp,1+(1-surv)*3); drift(sp)
    if sp.population<2: sp.population=0; sp.extinct=True
    sp.record(g,fit,surv,env)

def load_config(path:Path=DEFAULT_CONFIG)->dict[str,Any]: return json.loads(path.read_text(encoding='utf-8'))
def build(config:dict[str,Any]):
    e=config['environment']; env=Environment(float(e['temperature']),float(e['food']),float(e['predators']),float(e.get('volatility',.04)))
    species=[Species(x['name'],int(x['population']),{k:float(v) for k,v in x['traits'].items()},float(x['reproduction_rate']),float(x['mutation_rate']),float(x['mutation_strength'])) for x in config['species']]
    return config.get('biome_id','unknown'),int(config.get('generations',150)),int(config.get('seed',7)),env,species

def trait_delta(sp:Species,t:str)->float: return 0 if len(sp.history)<2 else float(sp.history[-1][t])-float(sp.history[0][t])
def pop_change(sp:Species)->float:
    if not sp.history: return 0
    return (sp.population-max(1,float(sp.history[0]['population'])))/max(1,float(sp.history[0]['population']))

def build_report(biome:str,g:int,env:Environment,species:list[Species],history:list[dict[str,Any]]):
    food_p=clamp(1-env.food); pred_p=clamp(env.predators); temp_p=clamp(abs(env.temperature-.5)*2); eco=clamp(food_p*.35+pred_p*.4+temp_p*.25)
    ext={}; summary={}
    for sp in species:
        start=max(1,int(sp.history[0]['population'])) if sp.history else 1; decline=clamp(1-sp.population/start); risk=1.0 if sp.extinct else clamp(decline*.75+eco*.25)
        ext[sp.name]=round(risk,3); summary[sp.name]={'population':sp.population,'extinct':sp.extinct,'population_change':round(pop_change(sp),3),'trait_delta':{t:round(trait_delta(sp,t),3) for t in ('speed','size','resistance')}}
    notes=['Il bioma mostra pressione ecosistemica moderata.' if eco>=.45 else 'Il bioma è relativamente stabile.']
    if food_p>.55: notes.append('Stress alimentare alto: favoriti scavenger e metabolismo efficiente.')
    if pred_p>.55: notes.append('Pressione predatoria alta: favoriti mobilità e sensi.')
    if temp_p>.45: notes.append('Stress termico significativo: favoriti tratti di resistenza.')
    dead=[sp.name for sp in species if sp.extinct]
    if dead: notes.append('Specie estinte nel modello: '+', '.join(dead)+'.')
    return {'schema':'ermes_eco_pressure_report','schema_version':'0.1.0','biome_id':biome,'generation':g,'eco_pressure':round(eco,3),'food_pressure':round(food_p,3),'predator_pressure':round(pred_p,3),'temperature_pressure':round(temp_p,3),'total_initial_population':sum(max(1,int(sp.history[0]['population'])) for sp in species if sp.history),'total_final_population':sum(sp.population for sp in species),'extinction_risk':ext,'encounter_bias':{'ambush':round(clamp(pred_p*.18+food_p*.05),3),'scavenger':round(clamp(food_p*.20+eco*.05),3),'hazard':round(clamp(temp_p*.16+eco*.05),3),'migration_pressure':round(clamp(eco*.12),3)},'mutation_bias':{'heat_resistance':round(clamp(temp_p*.20),3),'burst_mobility':round(clamp(pred_p*.16),3),'efficient_metabolism':round(clamp(food_p*.18),3),'sensory_alertness':round(clamp(pred_p*.10+eco*.05),3)},'species_summary':summary,'debrief_notes':notes,'runtime_note':'Prototype-only. Do not consume in runtime without ADR and tests.'}

def run_simulation(config:dict[str,Any]):
    biome,generations,seed,env,species=build(config); random.seed(seed)
    for sp in species: sp.record(0,calculate_fitness(sp,env),1.0,env)
    final=0
    for g in range(1,generations+1):
        final=g; env.update()
        for sp in species: update_species(sp,env,g)
        if all(sp.extinct for sp in species): break
    history=[]
    for sp in species: history.extend(sp.history)
    return history, build_report(biome,final,env,species,history)

def write_history(history:list[dict[str,Any]],path:Path=DEFAULT_HISTORY_CSV)->None:
    path.parent.mkdir(parents=True,exist_ok=True)
    if not history: path.write_text('',encoding='utf-8'); return
    with path.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(history[0].keys())); w.writeheader(); w.writerows(history)
def write_report(report:dict[str,Any],path:Path=DEFAULT_OUTPUT)->None:
    path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
def run_cli(config_path:Path,output:Path,history_path:Path):
    history,report=run_simulation(load_config(config_path)); write_report(report,output); write_history(history,history_path)
    print('ERMES Lab — CLI'); print('==============='); print('Biome:',report['biome_id']); print('Generation:',report['generation']); print('Eco pressure:',report['eco_pressure']); print('Final population:',report['total_final_population']); print('Report:',output); print('History:',history_path); print(); [print('-',n) for n in report['debrief_notes']]
    return report
class Tests(unittest.TestCase):
    def test_fitness_bounded(self):
        sp=Species('T',100,{'speed':1,'size':.5,'resistance':1},1,0,0); env=Environment(1,0,1,0); self.assertTrue(0<=calculate_fitness(sp,env)<=1)
    def test_deterministic(self):
        c=load_config(); self.assertEqual(run_simulation(c)[1],run_simulation(c)[1])
    def test_population_non_negative(self):
        h,_=run_simulation(load_config()); self.assertTrue(all(int(r['population'])>=0 for r in h))
    def test_traits_bounded(self):
        h,_=run_simulation(load_config()); self.assertTrue(all(0<=float(r[t])<=1 for r in h for t in ('speed','size','resistance')))
    def test_report_fields(self):
        _,r=run_simulation(load_config()); [self.assertIn(k,r) for k in ('biome_id','eco_pressure','encounter_bias','mutation_bias','debrief_notes')]
def run_tests():
    res=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests));
    if not res.wasSuccessful(): raise SystemExit(1)
def main(argv=None):
    p=argparse.ArgumentParser(); p.add_argument('--cli',action='store_true'); p.add_argument('--test',action='store_true'); p.add_argument('--config',default=str(DEFAULT_CONFIG)); p.add_argument('--output',default=str(DEFAULT_OUTPUT)); p.add_argument('--history',default=str(DEFAULT_HISTORY_CSV)); a=p.parse_args(argv or sys.argv[1:])
    if a.test: run_tests(); return 0
    run_cli(Path(a.config),Path(a.output),Path(a.history)); return 0
if __name__=='__main__': raise SystemExit(main())
