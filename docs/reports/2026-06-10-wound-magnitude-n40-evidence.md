---
title: 'Wound magnitude per tier -- N=40 evidence (OD-058 D2)'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, od-058, wound-system, hit-location, n40, ratification]
---

# Wound magnitude (-1/-1/-2 per tier) -- N=40 evidence (2026-06-10)

Evidence pack per il gate **OD-058 D2** (issue #2531): "N=40 post-build: magnitudo
X per tier + malus `coda` opzionale per-specie". Modello SPEC-D2 (vault, ratify
master-dd 2026-06-01): hit-location -> stat-malus, magnitudo -1 (lieve) / -1
(media) / -2 (grave).

Posture L-069: questo documento RIPORTA; ratifica magnitudo + flip del flag =
verdetto master-dd.

## Prerequisito costruito in questo PR: read-apply flag-gated

**Finding ground-truth**: l'engine #2535 (woundSystem.js + double-apply guard) non
aveva NESSUN consumer di `computeWoundMaluses` nel combat -- una ferita iniettata
non cambiava nulla, il probe avrebbe misurato zero (anti-pattern #14, stesso
limite trovato per #2381). Il box N=40 era quindi BLOCCATO dalla slice read-apply
del cutover.

Build (TDD, 10 test, default OFF = status quo byte-identical) dietro
`WOUND_LOCATION_V2=true`:

- `statusModifiers.computeStatusModifiers`: actor wounds -> `attack_mod` +
  `accuracy` nel attackDelta (entrambi riducono il to-hit d20; log separati);
  target wounds -> `defense_mod` nel defenseDelta (piu' colpibile). Stesso seam
  per-attack delta di tutti gli altri modifier (enrage/time-of-day/biome).
- `sessionHelpers.applyApRefill`: malus `ap` (testa grave -1, SPEC §8.4
  graduato) al refill, floor 0 come `defy_penalty`.
- `mobility` (arti_posteriori): **NESSUN consumer engine** (non esiste una stat
  move-range nel motore d20 attuale) -> intenzionalmente inerte, pinned da test
  e documentata qui (arm dedicato sotto = prova empirica).
- Doppio-apply: il guard #2535 resta (wound presente -> legacy wounded_perma
  yield), pinned da test.

NON in questo PR (cutover live residuo, verdetto DD): write-trigger crit/KO
(mapping trigger->severity NON pinnato nella SPEC §4/§8.2 -- "critico + KO
generano ferita" senza tier; proposta sotto), deprecazione del wire woundedPerma
HP-penalty (session.js KO/wipe), rename `lastMissionWounds`.

## Setup probe

- Harness: `tools/sim/wound-magnitude-probe.js --runs 40 --seed-base 42000`.
- Scenario: `enc_hardcore_reinf_01` + overlay `{countAdd:6, hpAdd:4, modAdd:6,
  dcAdd:2}` (stesso punto di misura del probe D1 #2713: baseline 0.90, margine
  in entrambe le direzioni; L-069 punto di misura, non banda).
- Roster: 2x skirmisher ap:2; **ferita seedata su OGNI player unit** via /start
  status passthrough (normaliseUnit copia status verbatim).
- 8 armi, stessi seed (wd-42000..42039): control / control2 (noise floor) /
  atk_lieve / atk_grave / def_grave / acc_lieve / ap_grave / mob_grave
  (lieve==media in-encounter by design: stesso -1, differiscono solo per
  persistenza -> un solo arm in-encounter per la coppia).
- Artifacts: `reports/sim/wound-magnitude-n40-2026-06-10/`.

## Risultati

| arm | n | win rate (Wilson CI95) | rounds (tick) | survivors |
| --- | --- | --- | --- | --- |
| control | 40 | 0.88 [0.74, 0.95] | 85.3 +/- 10.1 | 1.75 |
| control2 | 40 | 1.00 [0.91, 1.00] | 82.4 +/- 3.3 | 2.00 |
| atk_lieve | 40 | 0.97 [0.87, 1.00] | 81.8 +/- 5.2 | 1.95 |
| atk_grave | 40 | 0.95 [0.83, 0.99] | 81.8 +/- 3.9 | 1.90 |
| def_grave | 40 | 0.95 [0.83, 0.99] | 83.0 +/- 5.8 | 1.90 |
| acc_lieve | 40 | 0.97 [0.87, 1.00] | 81.0 +/- 4.5 | 1.95 |
| ap_grave | 40 | 0.93 [0.80, 0.97] | 78.8 +/- 4.0 | 1.85 |
| mob_grave | 40 | 0.90 [0.77, 0.96] | 82.9 +/- 6.4 | 1.80 |

Paired per-seed, doppio anchor (control si e' rivelato il batch sfortunato: i due
control identici distano 13pp -> quello E' il noise floor):

| arm | vs control | vs control2 | rounds vs control2 (CI95) | flips vs c2 L->W / W->L |
| --- | --- | --- | --- | --- |
| control/control2 (floor) | +0.13 | -0.13 | +2.9 [-0.2, +6.0] | 0 / 5 |
| atk_lieve | +0.10 | -0.03 | -0.6 [-2.5, +1.3] | 0 / 1 |
| atk_grave | +0.07 | -0.05 | -0.6 [-2.3, +1.1] | 0 / 2 |
| def_grave | +0.07 | -0.05 | +0.6 [-1.6, +2.8] | 0 / 2 |
| acc_lieve | +0.10 | -0.03 | -1.4 [-3.3, +0.5] | 0 / 1 |
| ap_grave | +0.05 | **-0.07** | **-3.6 [-5.0, -2.2]** | 0 / 3 |
| mob_grave (inerte) | +0.03 | -0.10 | +0.5 [-1.6, +2.6] | 0 / 4 |

### Findings

- **F1 -- Read-apply VERIFICATO live E2E** (anti A13-round-1: il flat result NON
  e' un wiring-gap): /start passthrough -> `status.wounds` nello state; attack
  event con `die=2, roll=20` = mod 20 **-2** (malus applicato al tiro) +
  `trait_effects: status:wound triggered` nel log evento.
- **F2 -- Effetto net sul win-rate <= noise floor a N=40.** I due control
  identici distano 13pp (5 flip one-sided); TUTTI gli arm ferita (incluso
  l'arm inerte mob_grave) cadono dentro quella banda (-3/-10pp vs anchor
  fortunato). Magnitudo -1/-2 sul d20 (~5-10pp hit-chance per tiro) su party 2
  vs 8-9 nemici = effetto aggregato piccolo a questa fidelity.
- **F3 -- ap_grave = unico segnale cinetico distinto**: rounds -3.6 [-5.0,
  -2.2] (unico CI che clears zero, oltre il floor +2.9 [-0.2, +6.0] in
  direzione opposta). Il -1 AP morde l'economia d'azione -- coerente col probe
  D1 (#2713): l'AP e' la leva piu' forte del sistema.
- **F4 -- Firma "segnaletica" (design note)**: a magnitudo attuale la ferita e'
  percepibile al singolo tiro + telegraph (WoundState badge Godot #204) ma
  quasi non punitiva sull'outcome -- stessa famiglia del verdetto A13
  ("ferita segnaletica, anti death-spiral", ratificato 2026-06-10 #2710).
  Coerente by-design O da indurire: design call, non buco di misura.

## Domande per la ratifica (master-dd)

1. **Magnitudo -1/-1/-2 ratificabile as-is?** Con effetto net sub-floor la
   ferita e' firma per-tiro/telegraph, non punizione da outcome (coerente col
   verdetto A13 simmetria/anti death-spiral). Se invece l'intent e' che le
   ferite pesino sull'esito run: alzare magnitudo (-2/-3) o effetto secondario
   (es. bleed tick) e re-run (probe pronto, 2 comandi).
2. **Trigger->severity (per il cutover write-side)**: SPEC §4/§8.2 dice
   "critico + KO generano ferita" senza pinnare il tier. PROPOSED: crit ->
   `lieve` (encounter-scoped), KO -> `grave` (eredita il ruolo cross-encounter
   di woundedPerma). Serve verdetto prima del cutover live.
3. **Flip `WOUND_LOCATION_V2` ON**: dopo verdetto su 1+2 insieme al cutover
   completo (write-trigger + deprecazione woundedPerma HP-penalty + rename
   `lastMissionWounds`).
4. **Potenza**: per misurare effetti <13pp serve N>>40 oppure metrica diretta
   per-tiro (hit-rate dal log eventi -- il -2 e' gia' provato esattamente li',
   F1). Da decidere solo se il verdetto su Q1 chiede re-misura.

## Stato gate D2

- Box "N=40 post-build magnitudo": evidence raccolta (sopra). Ratifica = DD.
- `coda` opzionale per-specie: SPEC §8.3 la declassa a hook futuro ("4 locazioni
  fisse per tutti, copertura stat gia' completa") -> nessun build necessario per
  il gate; resta design-option per-specie.
- Cutover live (write-trigger + deprecazione woundedPerma): residuo dichiarato,
  sbloccato da questa slice; il mapping trigger->severity proposto e' PROPOSED
  (verdetto DD), il resto e' esecuzione.
