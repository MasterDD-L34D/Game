# RESCUE-FORGOTTEN-HIGH-ROI.md

_Documento operativo per i 3 item dimenticati_
_Data: 2026-05-18 | Priorità: CRITICA_
_Autorità: A1 → aggiornare Q-001 + BACKLOG in Game_

---

## Perché questo documento esiste

L'audit del 2026-05-18 ha identificato 3 item con ROI 5/5 che sono
stati dimenticati nel ciclo operativo normale (mai entrati in BACKLOG
né OPEN_DECISIONS). Sono la priorità più alta dell'integrazione DF
perché il codice di supporto esiste già e il ROI è massimo.

---

## Item 1 — Triangle Strategy Transfer (5/5, FORGOTTEN)

**Museum card**: M-2026-04-25-009
**Status prima del rescue**: MUSEUM solo, mai in BACKLOG né OPEN_DECISIONS
**Pilastro target**: P4 (Temperamenti giocati)
**Problema risolve**: P4 è il pilastro più freddo (0/6 verde in audit M1)

### Le 3 proposte

#### Proposta A — MBTI Phased Reveal (PRIORITÀ)

Il profilo MBTI della creatura si rivela progressivamente attraverso i
lifecycle milestone. Non è dichiarato all'inizio — emerge dal comportamento.

```
Juvenile   → 1 asse rivelato (es: E/I visibile dal comportamento branco)
Mature     → 2 assi rivelati (es: + N/S dall'approccio tattico)
Apex       → profilo completo rivelato + label visiva
Legacy     → profilo nella cronaca come "carattere definitivo"
```

**File da toccare:**

- `vcScoring.js` → aggiunge `getMbtiRevealLevel(individual_id)`
- `formSessionStore.js` → traccia quale percentuale di assi è cristallizzata
- `lifecycles.json` → aggiunge campo `mbti_reveal_threshold` per stage
- Godot `scripts/ai/vc_scoring.gd` → `get_mbti_visibility(unit_id)` ≤15 LOC

**Stima**: ~6h | **Gate**: YELLOW | **Milestone**: M4

#### Proposta B — Dialogue Color Codes Diegetic

Il Sistema colora le sue comunicazioni (Ink knots) in base al tipo MBTI
della creatura che ha identificato. Disco Elysium-style ma diegetico.

```
MBTI NT (Stratega) → Sistema parla in termini strategici
MBTI SF (Guaritore) → Sistema parla di vulnerabilità relazionali
MBTI TJ (Comandante) → Sistema usa linguaggio di minaccia diretto
...
```

**File da toccare:**

- `ai_profiles.yaml` → aggiunge `mbti_color_voice` per profilo
- `mbti_forms.yaml` → aggiunge `sistema_voice_style` per gruppo
- Ink knots → aggiunge condizionali `{if mbti_group == "NT"}`

**Stima**: ~4h | **Gate**: YELLOW | **Milestone**: M4

#### Proposta C — Recruit Gating by MBTI

Certi tipi di reclute sono disponibili solo se il team ha un profilo
MBTI complementare. Crea profondità di scelta nella composizione del team.

**Stima**: ~5h | **Gate**: YELLOW | **Milestone**: post-recruit system

### Azione operativa immediata

1. Aggiungere a `Game/docs/governance/Q-001-DECISIONS-LOG.md`:

```
[2026-05-18] RESCUED: Triangle Strategy Transfer
  Source: museum M-2026-04-25-009, ROI 5/5, era FORGOTTEN
  Proposte A/B/C documentate in RESCUE-FORGOTTEN-HIGH-ROI.md
  Decisione: Eduardo sceglie quale proposta implementare prima
  Priorità suggerita: A → B → C (in ordine di impatto/effort)
  Owner: Eduardo
  Milestone target: M4
```

2. Aggiungere a `BACKLOG.md` in Game:

```
TKT-RESCUE-001 | Triangle Strategy proposal A (MBTI phased reveal)
  Pilastro: P4 | Milestone: M4 | Gate: YELLOW | Sforzo: ~6h
  File: vcScoring.js, formSessionStore.js, lifecycles.json
  Status: RESCUED-PENDING-APPROVAL

TKT-RESCUE-002 | Triangle Strategy proposal B (dialogue color codes)
  Pilastro: P4 | Milestone: M4 | Gate: YELLOW | Sforzo: ~4h
  File: ai_profiles.yaml, mbti_forms.yaml, Ink knots
  Status: RESCUED-PENDING-APPROVAL
```

---

## Item 2 — Worldgen 4-level stack (5/5, MUSEUM) — quick-win

**Museum card**: interna (no card esterna)
**Status**: infrastruttura progettata, zero runtime consumption
**DF level**: L0 (simulazione) + L2 (biome memory)

### Struttura

```
Bioma        → definisce climate, hazard, terrain
└── Ecosistema → species populations, ruoli ecologici
      └── Foodweb → edge predation/scavenging/detritus
            └── Network → dynamics emergenti, cascade
```

Tutto già progettato in `packs/evo_tactics_pack/data/foodwebs/*.yaml`.
Il problema: non c'è un tick che consuma questa struttura a runtime.

### Quick-win (~3-6h)

```javascript
// services/worldstate/population_tick.js (nuovo, ~80 LOC)
function tick(biomeId, populationState, foodwebConfig) {
  const pred = populationState.predators;
  const prey = populationState.prey;

  // Formula DF-inspired: Lotka-Volterra semplificata
  const newPred = clamp(pred + prey * 0.1 - pred * 0.05, 0, biomeConfig.capacity);
  const newPrey = clamp(prey + biomeConfig.fertility - pred * 0.15, 0, biomeConfig.capacity * 1.5);

  const events = [];
  if (newPred === 0 && pred > 0) events.push({ type: 'local_extinction', species: 'predators' });
  if (newPrey > biomeConfig.capacity) events.push({ type: 'population_boom', species: 'prey' });

  return { predators: newPred, prey: newPrey, events };
}
```

### Azione operativa

Aggiungere a BACKLOG:

```
TKT-RESCUE-003 | Worldgen population tick quick-win
  Pilastro: P2, P5 | Milestone: M3 (anticipabile) | Gate: GREEN | Sforzo: ~6h
  File: services/worldstate/population_tick.js (nuovo)
  Sblocca: L2 biome history, L0 food web dynamics
  Status: RESCUED-READY
```

---

## Item 3 — Sentience Tiers v1.0 (5/5, MUSEUM) — ~3h wire

**Museum card**: interna (no card esterna)
**Status**: 93 LOC orphan, non connesso
**DF level**: L0 (simulazione profonda del comportamento)

### Struttura tier

```
T0 Riflesso puro      → risposta diretta a stimolo, zero deliberazione
T1 Istinto            → pattern fight/flee/feed basici
T2 Abitudine          → condizionamento da storia recente (needs!)
T3 Emozione           → stato emotivo influenza scelta
T4 Ragionamento       → valutazione multi-step
T5 Autoconsapevolezza → riconosce se stesso come agente
T6 Meta-cognizione    → delibera sui propri processi mentali
```

### Mapping lifecycle → tier

```
Hatchling  → T0 (riflesso puro)
Juvenile   → T1-T2 (istinto + abitudine)
Mature     → T3 (emozione, dipende da temperamento)
Apex       → T4-T5 (ragionamento + autoconsapevolezza)
Legacy     → T6 (meta-cognizione, comportamento iconico)
```

I 22 Self-Control trigger si agganciano naturalmente ai needs (L0)
e alle relazioni (L1): una creatura con need critico non soddisfatto
scende di un tier fino al soddisfacimento.

### Azione operativa

Aggiungere a BACKLOG:

```
TKT-RESCUE-004 | Sentience Tiers v1.0 wire (~3h)
  Pilastro: P2, P4 | Milestone: Post-M6 | Gate: GREEN | Sforzo: ~3h
  File: cerca 93 LOC orphan in codebase, wire a lifecycle stages
  Sblocca: L0 comportamento profondo, T-tier come proxy focus score
  Status: RESCUED-PENDING-LOCATE (trova prima i 93 LOC)
```

---

## Summary priorità rescue

| #   | Item                     | ROI | Milestone | Sforzo | Gate   | Azione immediata     |
| --- | ------------------------ | --- | --------- | ------ | ------ | -------------------- |
| 1   | Triangle Strategy A      | 5/5 | M4        | ~6h    | YELLOW | Q-001 + BACKLOG oggi |
| 2   | Worldgen population tick | 5/5 | M3        | ~6h    | GREEN  | BACKLOG + sprint S3  |
| 3   | Triangle Strategy B      | 5/5 | M4        | ~4h    | YELLOW | BACKLOG dopo A       |
| 4   | Sentience Tiers wire     | 5/5 | Post-M6   | ~3h    | GREEN  | Localizza 93 LOC     |

---

_RESCUE-FORGOTTEN-HIGH-ROI.md_
_Autorità A1: aggiungi Q-001 + BACKLOG in Game (decisione Eduardo)_
_Copia A5: vault Spaces/Dev/Evo-Tactics/core/_
