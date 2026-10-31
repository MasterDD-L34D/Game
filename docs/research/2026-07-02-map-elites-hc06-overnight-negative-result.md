# MAP-Elites hardcore_06 overnight -- interrotta a 25/50: mappa degenere + N-leak (negative result)

status: CLOSED (run interrotta con decisione owner 2026-07-02)
run: calibrate_map_elites.py --scenario hardcore_06 --iterations 50 --n-per-trial 40 --seed 42
base code: main @ bba41fb6 (include #3164/#3166/#3167/#3168)
trial dir: docs/playtest/map-elites-hardcore_06-overnight-20260702 (25 iter complete, ~35 min/iter)

## TL;DR

Prima full-run REAL di Method D (mai eseguita dallo ship #2357). Interrotta a 25/50
su evidenza: (1) la griglia WR x defeat_rate e' EMPIRICAMENTE degenere per hc06 con
timer ON -- wr+defeat=1.00 esatto e timeout=0.00 in 25/25 trial, tutte le celle
popolate giacciono sull'anti-diagonale (6/25, informazione = una linea 1D di WR);
(2) N effettivo per trial = 18/40 -- 22 run/trial morte per connection-error al
warm-up del backend (batch lanciato con --skip-health contro backend appena
spawnato); (3) i knob per-trial NON sono ricostruibili post-kill (nessun checkpoint:
vivevano nella memoria del processo). Le 15h residue avrebbero ridisegnato la stessa
diagonale con N rumoroso: fermarla ha perso ~0 informazione.

## Cosa la run HA prodotto

- **Conferma empirica del blocco strutturale 2026-05-21** (feedback_calibration_toolkit):
  con turn_limit_defeat attivo ogni partita non risolta diventa defeat -> timeout
  irraggiungibile, defeat = 1 - WR. La banda secondaria originale resta morta.
- **Range WR raggiungibile nel knob-space** (boss_hp 0.50-1.00 x turn_limit 25-35):
  WR osservate 6%-67% sui 25 campioni -- lo spazio copre e supera la banda 15-30%.
- **Varianza latente utile**: turns_avg 21.8-24.9 correla con la difficolta' -- e' il
  candidato naturale come SECONDO asse informativo (al posto di defeat_rate).
- **Method D caratterizzato**: architettura sana (staging-writer, per-trial batch,
  L-073/L-074 compliant in intento), 3 difetti impliti trovati solo eseguendola.

## Finding

### F1 -- Griglia degenere (design, non bug)

5x5 WR x defeat con timer ON = anti-diagonale. Celle popolate: (0,4),(1,3),(2,3),
(3,2),(4,1),(4,2). Un QD-archive su assi collineari e' uno sweep costoso.

### F2 -- N-leak: 18/40 run per trial (bug operativo)

iter-020: 40 run tentate -> 21 "fetch scenario failed: connection", 1 "session/start
failed", 18 OK. Il batch parte con `--skip-health` (run_batch, calibrate_optuna.py:352)
subito dopo start_backend: il backend impiega 10-15s a caricare (428 trait) e le prime
~22 run muoiono sul warm-up. CI95 su N=18 ~ +/-23pp -> piazzamenti cella rumorosi
(violazione de-facto di L-073 nonostante n-per-trial=40 richiesto). Spiega anche i
35 min/iter (timeout di connessione) vs ~20 stimati.

### F3 -- Knob non ricostruibili (no checkpoint)

I knob suggeriti per iterazione esistono solo nel processo (feature_map in RAM, dump
solo a fine run). Kill a 25/50 = curva knob->WR persa; restano gli aggregati per-trial
(WR/turns/N) senza le coordinate che li hanno prodotti. Rischio dichiarato al lancio,
confermato.

## Design v2 (approvato in principio, da implementare)

1. **Readiness-wait** in start_backend (poll /api/health fino a 200, cap 60s) O
   rimozione di --skip-health nel run_batch di Method D -> N reale = N richiesto,
   ~-40% wall-time per iter. Effort S.
2. **Assi informativi**: WR x turns_avg per il regime timer-ON; in alternativa arm
   timer-OFF dedicato per esplorare il regime timeout (knob enemy_damage gia' wired,
   OD-032 C). Effort S (config) / M (dual-arm).
3. **Checkpoint per-iter**: append di {iter, knobs, features, cell} su un jsonl DOPO
   ogni valutazione -> kill-safe, riprendibile. Effort S.
4. **Parallelismo Method C**: 4 shard con LOBBY_WS_ENABLED=false (pattern
   calibrate_parallel, gia' 4x validato) -> 50 iter in ~4-6h invece di 29. Effort M.
5. **SPRT (Method B) opzionale** per troncare i trial gia' fuori da ogni banda di
   interesse. Effort M.

## Lesson

- Le run lunghe si progettano col checkpoint PRIMA (il "rischio accettato" al lancio
  e' diventato perdita reale a 25/50).
- Un explorer QD va lanciato solo dopo aver verificato che gli assi della feature-map
  siano indipendenti NEL REGIME del sistema (qui la collinearita' era prevedibile dal
  finding 05-21: bastava un check pre-lancio su 3 trial).
- Dry-run corto (3 iter) prima dell'overnight avrebbe esposto N-leak e collinearita'
  a costo ~1h.

## Ref

- Toolkit: feedback_calibration_toolkit_2026_05_21 (Method A-D, L-069..L-074)
- Blocco strutturale hc06: damage_curves.yaml history + OD-032 (PR #2365)
- Fix a monte usati dalla run: #3164 (outcome declare), #3166 (species), #3167
  (scenario_id), #3168 (endSession)
