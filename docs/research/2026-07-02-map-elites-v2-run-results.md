# MAP-Elites v2 hardcore_06 -- run 50-iter completa: archive 6/25 + candidato banda 15-30%

status: COMPLETE (run 2026-07-02, 862.6s)
run: calibrate_map_elites.py --scenario hardcore_06 --iterations 50 --n-per-trial 40 --shards 4 --base-port 3390 --label v2-run
base code: main @ 3520f955 (v2, PR #3181)
trial dir: docs/playtest/map-elites-hardcore_06-v2-run (checkpoint + 50 iter json/jsonl/log; shard-log backend esclusi dal commit)

## TL;DR

Prima run completa di Method D v2: 50/50 iterazioni, N=40 effettivo in TUTTE
(v1: 18/40 in 25/25), zero failure, r(WR,turns_avg) = -0.019 (assi
indipendenti; v1 defeat-axis r=-1.00, v1 turns cap-pinned r=-0.90). Wall-time
14.4 min (v1: 14.5h per 25 iter -- il collo era il pipe non drenato, vedi doc
dry-run gate). Archive: 6/25 celle. Output principale: **knob-set in banda
target 15-30% con evidenza N=40** -- boss_hp 0.886 + cap 26 -> WR 28%. Finding
strutturale: con turn_limit live 25-35 il floor di WR sale a ~28%; le colonne
WR <20% sono irraggiungibili nel knob-space attuale.

## Integrita' (gate L-073)

- checkpoint.jsonl: 50 righe, iter 0-49 completi, n_eff=40 in 50/50.
- stats: eval_failures=0, n_shortfall=0, cells_skipped=0.
- r(WR, turns_avg) su 50 sample = -0.019 -> la griglia WR x turns e'
  effettivamente 2D (F1 v1 risolto).
- turns knob-driven confermato: range turns_avg per cap crescente si sposta
  (cap 25 -> 20.2-23.4; cap 31 -> 27.5-27.9; cap 33 -> fino a 29.9).

## Archive (6/25 celle, coverage 24%)

| cella (wr,turns)      | WR   | turns_avg | knobs                 | origin |
| --------------------- | ---- | --------- | --------------------- | ------ |
| (2,2) 20-30% x 24-26  | 0.28 | 24.9      | boss_hp 0.886, cap 26 | mutate |
| (3,1) 30-40% x 22-24  | 0.38 | 23.4      | boss_hp 0.711, cap 25 | random |
| (4,0) 40-100% x <22   | 0.72 | 20.2      | boss_hp 0.50, cap 25  | mutate |
| (4,1) 40-100% x 22-24 | 0.70 | 22.5      | boss_hp 0.545, cap 26 | mutate |
| (4,2) 40-100% x 24-26 | 0.75 | 24.8      | boss_hp 0.69, cap 30  | random |
| (4,3) 40-100% x 26-30 | 0.70 | 27.5      | boss_hp 0.866, cap 32 | mutate |

**Candidato banda hardcore 15-30%**: cella (2,2) = `boss_hp_multiplier 0.886 +
turn_limit_defeat_override 26` -> WR 28% N=40. Nota: e' vicino al ceiling
della banda; per un target centrato (~20-22%) servirebbe boss_hp ~0.95-1.0 con
cap 25-26 (regione campionata poco: 3 sample con boss_hp>0.95, tutti cap>=30).

## Finding strutturale: WR floor ~28% nel knob-space attuale

WR osservato su 50 sample: 0.28-0.90. Le colonne WR 0-10% e 10-20% non sono
MAI state toccate. Confronto v1: con cap client-pinned a 25 (bug no-op) WR
scendeva a 0.06; col cap live 25-35 anche boss_hp 1.0 resta winnable ~30%
(piu' turni = piu' probabilita' di chiudere il boss). Conseguenza pratica:

- La banda 15-30% e' raggiungibile solo nel sotto-spazio boss_hp alto + cap
  basso (25-26) -- angolo campionato 4 volte su 50.
- WR <15% richiede lever fuori dal knob-space attuale: boss_hp >1.0, cap <25,
  o enemy_damage_multiplier (OD-032 C, gia' wired ma non in KNOB_SPACE hc06).
- La riga turns 30-36 e' vuota (turns_avg max 29.9): defeat al cap 33-35
  troppo rare col WR alto corrente; regione esplorabile solo se WR scende.

Non e' un difetto della run: e' l'informazione QD che la mappa doveva dare
(quali regioni del behavior-space il knob-space copre). Eventuale estensione
del KNOB_SPACE (boss_hp hi>1.0 o enemy_damage) = decisione design, non tuning.

## Prossimi passi possibili (non impegnati)

1. Ratify dedicata del candidato (2,2) se si vuole spostare la calibrazione
   hardcore_06 (N=40 gia' disponibile, eventualmente N=100 per ship).
2. Estensione knob-space (boss_hp fino 1.2 e/o enemy_damage) + re-run 50 iter
   (~15 min) per aprire le colonne WR basse.
3. --sprt su re-run futuri (mai esercitato su dati reali in questa run).

## Ref

- v2 + dry-run gate: docs/research/2026-07-02-map-elites-v2-dryrun-gate.md (PR #3181)
- v1 negative result: docs/research/2026-07-02-map-elites-hc06-overnight-negative-result.md
- Hub card: codemasterdd PR #453 (trial_dir pinnato map-elites-hardcore_06-v2-run)
