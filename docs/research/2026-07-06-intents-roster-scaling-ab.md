# Intents roster-scaling A/B N=10 -- NEGATIVE RESULT (direction probe)

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Probe: `tools/sim/dorsale-ferrosa-band-probe.js`
Spec: `docs/planning/2026-07-06-sistema-intents-roster-scaling-spec.md` | Feed: grid-ratify
2026-07-06 "Limite di modello" + D4 threat-dial. Stato: scaling SHIPPED flag OFF (infra);
flip NON proposto. SDMG: decider Eduardo.

## Verdetto in una riga

Lo scaling per-roster del dial `intents_per_round` e' wired, attivo e back-compat (misurato),
ma NON rompe il ceiling di letalita' AI-vs-AI a N=10: il collo di bottiglia e' la CONVERSIONE
delle attivazioni (dinamica del driver), non il numero di attivazioni.

## Matrice N=10 (seeds 1..10 appaiati, pressure 50, party canonico badlands)

| Arm | Flag | K | countMult | rangeAdd | WR | KO-rate | avg_rounds |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | ON | 3 | 1 (7 max vivi) | 0 | 1.0 | 0.000 | **13.3** (in banda [10,18]) |
| B0 | OFF | - | 3 (13 max vivi) | 0 | 1.0 | 0.050 | 20.5 |
| B1 | ON | 3 | 3 | 0 | 1.0 | 0.025 | 21.1 |
| B2 | ON | 2 | 3 | 0 | 1.0 | 0.025 | 19.5 |
| C0 | OFF | - | 3 | +3 (range 4) | 1.0 | 0.050 | 20.7 |
| C1 | ON | 2 | 3 | +3 | 1.0 | 0.075 | 19.8 |

Criterio direction (spec sez. 5): "morde" = dWR <= -0.2 o KO-rate >= 0.05 (delta vs control)
o dRounds fuori banda. Nessun arm treatment lo soddisfa vs il proprio control.

Artifacts: `reports/sim/intents-scaling-*/` (runs.jsonl + summary.json, checkpoint per-seed).

## Cosa E' confermato (valore positivo del probe)

1. **Back-compat tier-floor MISURATA**: A1 (flag ON, roster faithful) = WR 1.0, KO 0,
   pace 13.3 vs baseline N=40 14.03 -- il flip e' un no-op sui roster piccoli, come da
   garanzia strutturale (test) E come da fight misurato.
2. **Patologia riprodotta**: B0 (13 nemici, flag OFF) = KO 0.05, pace 20.5 (fuori banda
   pace del faithful): 3x nemici quasi non aggiungono pressione -- il finding grid-ratify
   regge anche come arm dedicato.
3. **Treatment ATTIVO (falsificazione wiring)**: divergenza per-seed B0-B2 10/10, B0-B1
   7/10 (K=3 binda solo ad alive >= 10: coerente col meccanismo, i seed dove i rinforzi
   muoiono presto restano identici). Il flag arriva al backend; il negative result NON e'
   un artefatto di wiring.

## Cosa NON succede (il negative result)

- Piu' attivazioni melee (B1/B2) -> le unita' extra si attivano, si avvicinano, muoiono
  in approccio: KO-rate resta 0.025-0.05, WR 1.0 ovunque.
- Interazione con conversione ranged (C1 vs C0, range 4 mirror cal-r4): KO 0.075 vs 0.050,
  pace 19.8 vs 20.7 -- direzione giusta, magnitudine trascurabile a N=10, nessun criterio
  soddisfatto. Anche quando le attivazioni extra POSSONO convertire a distanza, il ceiling
  tiene.
- Coerente con la scala della ratify: faithful, hp+3/mod+1/dc+1, +range4 -> tutti WR 1.0.
  Il dial era il sospettato n.1 (activation count lever #1 nella ricerca big-map); l'A/B
  dice che sul driver v2 round-model e' NECESSARIO ma NON SUFFICIENTE.

## Implicazioni per D4 (feed decisionale)

1. Il lever attivazione da solo non compra letalita' AI-vs-AI su questo driver: la
   prossima ipotesi forte e' **comportamentale** -- AI zone-defense / focus coordinato
   (gia' chip dichiarato nella ratify per capture_point), oppure un modello di intento
   che converta l'attivazione in minaccia (flank/focus_fire dei tier alti del YAML,
   oggi non differenziati nel driver).
2. Lo scaling resta INFRA UTILE: e' il knob che qualunque arm futuro (zone-defense,
   intent-type unlock) dovra' comporre per non essere strozzato dal cap globale. Flag
   OFF di default, zero impatto shipped, probe-ready (`--intents-scaling` / `--intents-k`).
3. NO N=40: guardrail N-sample -- N=40 ratifica una direction; qui non c'e' direction da
   ratificare. `grid_ratify_baseline.json` NON toccata.

## Gap dichiarati

- N=10 non esclude effetti piccoli (CI95 Wilson [0.722, 1.0] su WR): esclude effetti
  della taglia che il criterio direction chiedeva (dWR 0.2+). Un effetto fine andrebbe
  cercato con telemetria intents/attacchi per round (non esposta dal probe oggi).
- Roster melee-heavy (2/3 specie wave-1 melee): un encounter autorato ranged-first
  potrebbe rispondere diversamente allo scaling; nessun encounter simile esiste oggi.
- HUD `intents_per_round` mostra il tier baseline anche a flag ON (chip dichiarato in spec).
