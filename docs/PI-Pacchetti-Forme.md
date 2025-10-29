# PI, Pacchetti & Forme — Canvas B

## Struttura Economica
- **Costo PI**: trait_T1 3 PE, trait_T2 6 PE, trait_T3 10 PE, job_ability 4 PE, ultimate_slot 6 PE, modulo_tattico 3 PE; cap acquisti su `cap_pt_max` e `starter_bioma_max` per evitare snowball precoce.【F:data/packs.yaml†L1-L8】
- **Curve Budget**: baseline 7 → veteran 9 → elite 11, con sblocchi legati a optional e style bonus; i pack si basano su tiri `random_general_d20` con risultati speciali per bias Forma/Job e scelta manuale a 20.【F:data/packs.yaml†L9-L23】
- **Shop Loop**: `pi_shop` alimenta companion app e HUD con suggerimenti di spesa coerenti con telemetria `pe_economy` (expected delta 6 PE, soft cap backlog 18).【F:data/core/telemetry.yaml†L63-L78】

## Pacchetti d20
| Range d20 | Pack | Combo | Note |
|-----------|------|-------|------|
| 1-2 | A | job_ability + trait_T1 | Entry-level aggressivo per definire identità Forma. |
| 3-4 | B | trait_T1 + guardia_situazionale + cap_pt | Rinforzo difensivo per squadre low guard. |
| 5-6 | C | job_ability + cap_pt + starter_bioma | Seed tattico legato al bioma iniziale. |
| 7-8 | D | job_ability + guardia_situazionale + PE | Combo offensiva con salvaguardia. |
| 9-10 | E | trait_T1 + starter_bioma + cap_pt + PE | All-rounder multi-bioma. |
| 11 | F | sigillo_forma + job_ability + starter_bioma | Spinge identità Forma esclusiva. |
| 12 | G | sigillo_forma + trait_T1 + starter_bioma + PE | Prep evolutivo con investimento Forma. |
| 13 | H | PE ×7 | Fondo accelerato per economie mirate. |
| 14 | I | trait_T1 + guardia_situazionale + sigillo_forma | Difesa adattiva e crescita Forma. |
| 15 | J | job_ability + PE ×3 | Spike abilità. |
| 16-17 | Bias Forma | Rimanda alla tabella d12 della Forma scelta. |
| 18-19 | Bias Job | Mappa preferenze per ruolo (Vanguard B/D, Skirmisher C/E, ecc.). |
| 20 | Scelta | Qualsiasi pack disponibile; usato per correzioni bilanciamento o focus narrativo. |
【F:data/packs.yaml†L9-L23】

## Job Bias
- Vanguard → preferenza B/D per tanking e controllo frontline.
- Skirmisher → preferenza C/E per mobilità e danno a singolo bersaglio.
- Warden → E/G per protezione e sustain.
- Artificer → A/F per strumenti tattici e controllo area.
- Invoker → A/J per poteri psionici burst.
- Harvester → D/J per utility predatoria e economia risorse.
【F:data/packs.yaml†L21-L32】

## Forme Base (d12 bias)
| Forma | Pack A | Pack B | Pack C | Bias d12 |
|-------|--------|--------|--------|----------|
| ISTJ | trait_T1:Pianificatore, guardia_situazionale, sigillo_forma | job_ability:Vanguard/Muraglia, cap_pt, PE | trait_T1:Pianificatore, cap_pt, starter_bioma, PE | A:1-5, B:6-9, C:10-12 |
| ISFJ | trait_T1:Risonanza_di_Branco, guardia_situazionale, starter_bioma, PE | job_ability:Warden/Aura_di_Sollievo, cap_pt, PE | job_ability:Warden/Purga, guardia_situazionale, PE | A:1-4, B:5-9, C:10-12 |
| INFJ | trait_T1:Focus_Frazionato, cap_pt, starter_bioma, PE | job_ability:Invoker/Vena_Psionica, guardia_situazionale, PE | job_ability:Artificer/Mina_a_Pressione, cap_pt, PE | A:1-4, B:5-8, C:9-12 |
| INTJ | job_ability:Invoker/Varchi_di_Forza, cap_pt, PE | job_ability:Artificer/Mina_a_Pressione, guardia_situazionale, PE | trait_T1:Pianificatore, sigillo_forma, starter_bioma, PE | A:1-6, B:7-9, C:10-12 |
| ISTP | trait_T1:Ghiandola_Caustica, guardia_situazionale, PE ×2 | job_ability:Skirmisher/Taglio_Opportunista, cap_pt, PE | job_ability:Artificer/Turret_Ematica, guardia_situazionale, PE | B:1-5, A:6-8, C:9-12 |
| ISFP | job_ability:Skirmisher/Smoke_Step, starter_bioma, PE ×2 | trait_T1:Zampe_a_Molla, cap_pt, guardia_situazionale | job_ability:Skirmisher/Dash_Cut, cap_pt, PE | A:1-4, C:5-8, B:9-12 |
| INFP | trait_T1:Empatia_Coordinativa, job_ability:Warden/Scudo_di_Risonanza | job_ability:Warden/Aura_di_Sollievo, starter_bioma, PE ×2 | trait_T1:Risonanza_di_Branco, cap_pt, guardia_situazionale | A:1-6, B:7-9, C:10-12 |
| INTP | job_ability:Artificer/Turret_Ematica, cap_pt, PE | job_ability:Artificer/Neutralizzatore, guardia_situazionale, PE | trait_T1:Focus_Frazionato, sigillo_forma, starter_bioma, PE | A:1-5, B:6-9, C:10-12 |
| ESTP | job_ability:Skirmisher/Dash_Cut, trait_T1:Zampe_a_Molla | job_ability:Skirmisher/Raffica, guardia_situazionale, PE | job_ability:Invoker/Sincronia, cap_pt, PE | A:1-6, B:7-9, C:10-12 |
| ESFP | job_ability:Harvester/Taglia_Obiettivo, guardia_situazionale, PE | trait_T1:Tattiche_di_Branco, cap_pt, starter_bioma, PE | job_ability:Harvester/Rete_Predatoria, cap_pt, PE | A:1-5, B:6-8, C:9-12 |
| ENFP | trait_T1:Pathfinder, cap_pt, starter_bioma, PE | job_ability:Invoker/Sincronia, guardia_situazionale, PE | job_ability:Skirmisher/Smoke_Step, cap_pt, PE | A:1-6, B:7-8, C:9-12 |
| ENTP | job_ability:Invoker/Sincronia, trait_T1:Focus_Frazionato | job_ability:Artificer/Rete_Sincro, cap_pt, PE | trait_T1:Pianificatore, guardia_situazionale, sigillo_forma | A:1-6, B:7-9, C:10-12 |
| ESTJ | job_ability:Vanguard/Muraglia, guardia_situazionale, PE | job_ability:Vanguard/Carica, cap_pt, PE | trait_T1:Pianificatore, sigillo_forma, starter_bioma, PE | A:1-5, B:6-9, C:10-12 |
| ESFJ | job_ability:Warden/Scudo_di_Risonanza, cap_pt, PE | trait_T1:Tattiche_di_Branco, guardia_situazionale, sigillo_forma | job_ability:Warden/Aura_di_Sollievo, starter_bioma, PE ×2 | A:1-5, B:6-8, C:9-12 |
| ENFJ | job_ability:Warden/Aura_di_Sollievo, starter_bioma, PE ×2 | trait_T1:Risonanza_di_Branco, cap_pt, guardia_situazionale | job_ability:Harvester/Taglia_Obiettivo, cap_pt, PE | A:1-6, B:7-8, C:9-12 |
| ENTJ | job_ability:Harvester/Blocco_Rifornimenti, cap_pt, PE | job_ability:Vanguard/Sfida, guardia_situazionale, PE | trait_T1:Pianificatore, sigillo_forma, starter_bioma, PE | A:1-6, B:7-9, C:10-12 |
| NEUTRA | trait_T1:Random, job_ability:Random | trait_T1:Random, guardia_situazionale, cap_pt | job_ability:Random, starter_bioma, cap_pt | A:1-4, B:5-8, C:9-12 |
【F:data/packs.yaml†L24-L90】

## Workflow Operativo
1. Usa `tools/py/roll_pack.py <Forma> <Job> data/packs.yaml --seed <seed>` per generare simulazioni deterministiche; verifica parità con `node tools/ts/dist/roll_pack.js` usando lo stesso seed (workflow documentato in `docs/tool_run_report.md`).【F:docs/tool_run_report.md†L1-L25】
2. Archivia gli output di riferimento in `docs/examples/` per ogni bioma e Forma testata; mantenere i seed condivisi (`demo`) per confronti cross-stack.【F:docs/checklist/action-items.md†L1-L35】
3. Aggiorna `docs/Canvas/feature-updates.md` e `docs/piani/roadmap.md` con nuove sinergie o spostamenti budget dopo ogni tuning settimanale PR/telemetria.【F:docs/Canvas/feature-updates.md†L1-L40】【F:docs/piani/roadmap.md†L1-L90】

## Stato & Azioni
- Tutte le Forme MBTI sono mappate; restano da estendere `compat_forme` e `base_scores` nel dataset `data/core/mating.yaml` per supportare romance e Nido (task Ondata 2).【F:data/core/mating.yaml†L1-L120】【F:docs/piani/roadmap.md†L43-L61】
- Il workflow `daily-pr-summary` aggiorna automaticamente pack change log, evitando divergenze tra CLI TS/Python e documentazione PI.【F:docs/Canvas/feature-updates.md†L11-L20】【F:docs/tool_run_report.md†L1-L40】
