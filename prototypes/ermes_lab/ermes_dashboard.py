#!/usr/bin/env python3
from __future__ import annotations
import json
try: import streamlit as st
except ImportError: st=None
from ermes_sim import DEFAULT_CONFIG,DEFAULT_OUTPUT,load_config,run_simulation,write_history,write_report
from scoring import score_report
if st is None:
    print('Streamlit non installato. Usa: python prototypes/ermes_lab/ermes_sim.py --cli')
    raise SystemExit(0)
st.set_page_config(page_title='ERMES Lab',layout='wide'); st.title('E.R.M.E.S. Lab'); st.caption('Ecosystem Research, Measurement & Evolution System')
config=load_config(DEFAULT_CONFIG); env=config['environment']
st.sidebar.header('Simulation'); config['generations']=st.sidebar.slider('Generations',20,500,int(config['generations']),10); config['seed']=st.sidebar.number_input('Seed',0,999999,int(config['seed']))
st.sidebar.header('Environment'); env['temperature']=st.sidebar.slider('Temperature',0.0,1.0,float(env['temperature']),0.01); env['food']=st.sidebar.slider('Food',0.0,1.0,float(env['food']),0.01); env['predators']=st.sidebar.slider('Predators',0.0,1.0,float(env['predators']),0.01); env['volatility']=st.sidebar.slider('Volatility',0.0,0.15,float(env['volatility']),0.005)
if st.sidebar.button('Run ERMES',type='primary'):
    h,r=run_simulation(config); write_report(r); write_history(h)
elif DEFAULT_OUTPUT.exists(): r=json.loads(DEFAULT_OUTPUT.read_text(encoding='utf-8'))
else: st.info('Premi Run ERMES per generare un eco pressure report.'); st.stop()
score=score_report(r); c=st.columns(5); c[0].metric('Biome',r['biome_id']); c[1].metric('Eco pressure',r['eco_pressure']); c[2].metric('Food pressure',r['food_pressure']); c[3].metric('Predator pressure',r['predator_pressure']); c[4].metric('Interestingness',score)
st.subheader('Encounter Bias'); st.json(r['encounter_bias']); st.subheader('Mutation Bias'); st.json(r['mutation_bias']); st.subheader('Extinction Risk'); st.json(r['extinction_risk']); st.subheader('Species Summary'); st.json(r['species_summary']); st.subheader('Debrief Notes'); [st.write('- '+n) for n in r['debrief_notes']]; st.subheader('Raw Report'); st.json(r)
