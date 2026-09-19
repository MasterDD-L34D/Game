# MAP-Elites v2 -- dry-run gate PASS + root cause F2 corretto (pipe, non warm-up)

status: GATE PASS (3/3 check) -- overnight v2 in attesa di OK owner
run: calibrate_map_elites.py --scenario hardcore_06 --iterations 3 --n-per-trial 40 --shards 4 --base-port 3390 --label dryrun-gate
base code: claude/map-elites-v2 @ ddcba488 (v2 rewrite)
trial dir: docs/playtest/map-elites-hardcore_06-dryrun-gate
elapsed: 72.1s totali (3 eval N=40 concorrenti su 3 shard)

## TL;DR

Dry-run gate 3 iterazioni: PASS su tutti i check richiesti. In piu' la
riproduzione controllata ha FALSIFICATO l'ipotesi F2 del doc negative-result
(warm-up + --skip-health): il vero root cause del N-leak v1 e' il backend
spawnato con stdout=PIPE mai drenato -- il buffer (~4KB) si riempie dopo ~18
run di log e l'event loop Node si congela sulla write bloccata. Prova
drain-recovery: a backend congelato, leggere i 4204 byte accodati nel pipe ha
riportato /api/health a 200 senza restart. Rimosso il PIPE, il sim gira a
~1.4s/run (baseline L-074): i ~35 min/iter della v1 erano interamente
patologia del pipe. L'overnight v2 da 50 iterazioni costa ~15-25 min, non 4-6h.

## Gate check (richiesti dal piano v2)

1. **N effettivo == N richiesto**: 40/40, 40/40, 40/40; failures=0 in tutte e
   tre le iterazioni (v1: 18/40 con 22 connection-error per iter).
2. **Assi non collineari / secondo asse vivo**: le defeat si fermano
   ESATTAMENTE al cap staged per-iterazione -- iter-000 cap 25 -> rounds_max
   25; iter-001 cap 28 -> rounds_max 28 (turns_avg 26.1, impossibile in v1);
   iter-002 cap 26 -> rounds_max 26. Stessa colonna WR (40-100%) separata su
   2 bucket turns diversi: l'asse turns_avg esprime varianza knob-driven
   indipendente da WR. (La collinearita' v1 r(wr,turns)=-0.90 era artefatto
   del regime cap-pinned-25, vedi bug OD-032 sotto.)
3. **Checkpoint scritto**: checkpoint.jsonl 3 righe
   {iter,knobs,features,cell,fitness,origin,n_eff}, append dopo OGNI
   valutazione; resume replay verificato su stub (6 -> 12 iter).

## Root cause F2 (corregge il doc 2026-07-02 negative-result)

Ipotesi originale (F2): batch con --skip-health parte sul warm-up del backend
(428 trait, 10-15s) e le prime ~22 run muoiono. **FALSIFICATA dai log v1
stessi**: in TUTTE le 25 iterazioni v1 il pattern e' run 1-18 OK, run 19-40
errore -- il leak e' in coda, non in testa, ed e' deterministico.

Riproduzione controllata (porta 3390, main @ beeb1f5c, N=25, stesso code path
v1 via import calibrate_optuna):

- Arm A (stdout=PIPE fedele a v1): muro identico, 18 OK poi 7 errori
  "connection failed after retries". Post-mortem: processo VIVO, /api/health
  da connessione fresca TIMEOUT, 9 socket CLOSE_WAIT (FIN mai processati =
  event loop fermo), **4204 byte accodati nel pipe stdout mai letto**.
- Drain-recovery: letti i 4204 byte dal pipe -> /api/health torna 200 in <5s,
  backend di nuovo funzionante SENZA restart. QED.

Meccanismo: calibrate_optuna.start_backend spawnava node con
stdout=subprocess.PIPE senza mai leggerlo. Il log cumulativo del backend
(startup + audit per-sessione) riempie il buffer anonimo (~4KB) intorno alla
run 18; da li' ogni write su stdout blocca l'event loop. Gia' prima del
congelamento totale il backpressure degrada le run a ~34s/run (v1 e Arm A) vs
~1.4s/run reali (L-074: 127.0.0.1 ~0.7s/call). Lo smoke Optuna 2026-05-21
(20/20 OK, stesso PIPE) passava perche' il backend di maggio logga meno del
backend attuale: il muro dipende dal VOLUME di log, non dal numero di run.

Fix shippati nel branch v2:

- calibrate_optuna.start_backend: stdout -> file (log_path) o DEVNULL, mai
  PIPE non drenato.
- calibrate_map_elites v2: valuta su shard calibrate_parallel (stdout su file
  gia' dal 2026-05-20) -- pattern 4x-validato.
- run_shard_batch/build_shard_cmd: param skip_health; v2 lancia il client
  SENZA --skip-health (fail-fast a inizio batch + re-check periodico ogni 10
  run che ABORTisce su backend morto invece di bruciare retry per run).

## Bug latente v1 trovato in recon (non nel doc): client no-op OD-032

evaluate_knobs_real v1 chiamava run_batch SENZA curves_path: il CLIENT batch
leggeva gli override di PRODUZIONE mentre il backend leggeva staging. Il cap
turn_limit_defeat (enforcement client-side) restava inchiodato a 25 qualunque
fosse il knob staged 25-35 -> l'asse turns v1 era strutturalmente compresso a
<=25 (turns_max 25 in 25/25 iter) e il knob turn_limit era un no-op client.
Stessa classe del no-op-bug OD-032 gia' fixato per Optuna. v2 passa
curves_path=staging al client (verificato dal gate check 2: defeat al cap
staged).

## Bucket turns (calibrazione)

TURNS_BUCKETS = [0-22, 22-24, 24-26, 26-30, 30-36].
Fonte: corpus v1 (26 aggregati, turns_avg 21.8-24.9 nel regime cap-25 =
bucket 0-2) + estensione teorica del knob live (cap 26-35 = bucket 3-4).
Il dry-run conferma il bucket 3 raggiungibile (iter-001 turns 26.1, cap 28).
Da rivedere dopo l'overnight se la distribuzione reale si concentra.

## ETA overnight v2 (misurata, non stimata)

- Dry-run: wave da 3 eval N=40 concorrenti = 72s (incl. ~15s startup shard).
- 50 iterazioni / 4 shard = 13 wave -> **~15-25 min** totali attesi.
- v1 aveva fatto 25 iter in ~14.5h. Il collo era il pipe, non il sim.

## Ref

- Negative result v1: docs/research/2026-07-02-map-elites-hc06-overnight-negative-result.md
- Repro driver: scratchpad sessione hub 2026-07-02 (Arm A + drain probe)
- L-074 (127.0.0.1 vs localhost), L-071 (LOBBY_WS_ENABLED), L-073 (N>=40)
- OD-032 no-op-bug client (PR #2365 era per Optuna; v1 map-elites call site scoperto oggi)
