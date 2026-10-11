---
title: 'Triage 3 exploration-note vs P2 Evoluzione emergente'
workstream: planning
category: triage
status: draft
owner: master-dd
created: 2026-04-21
tags:
  - triage
  - exploration
  - p2-evoluzione
  - prompt-3
  - flint-kill-60
related:
  - docs/planning/2026-04-20-integrated-design-map.md
  - docs/archive/concept-explorations/2026-04/README.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
---

# Triage 3 exploration-note vs P2 Evoluzione emergente

Integrated design map Prompt 3: valutare 3 note deck v2 contro Pilastro 2 (🟡 post deep-audit) + Flint §19.3 anti scope-creep. Output: 3 issue draft pronto per GitHub + decisione (a) issue P0 / (b) issue P2 parcheggiata / (c) fuori perimetro Freeze.

## Cornice valutazione

Per ogni nota:

1. **Quale lacuna concreta chiude (L01-L11 da integrated-map)**
2. **Rischio scope creep (Freeze §19.3 "stessa valuta non deve fare troppe cose")**
3. **Raccomandazione (a/b/c)**
4. **Se issue: doc toccare + ADR scrivere**

---

## Issue Draft 1 — BiomeMemory

### Fonte

Deck v2 §Nota 1. "Se una creatura sopravvive a N encounter nello stesso bioma, il bioma 'la ricorda' — piccoli bonus adattativi persistenti che non passano per PI/PE ma sono registrati lato Nido."

### Lacuna concreta chiusa

- **L06** P2 persistence + PI pack spender runtime (parziale — aggiunge un canale persistence diverso)
- **L08** Biome runtime gap Node (aggancia `data/core/biomes.yaml` biome_affinity che è dataset-only)

### Rischio scope creep

🔴 **ALTO**. Introduce **quarta economia implicita** (oltre PE/PI/Seed/Trust). Freeze §19.3 warn esplicito: "la stessa valuta non deve fare troppe cose".

Aggiuntivo: persistence schema Prisma aggiunge tabella `BiomeMemory` + relation PartyRoster + indexing performance overhead. Non MVP-scope.

### Raccomandazione: **(b) issue P2 parcheggiata**

Motivo: idea interessante tematicamente (Spore-like passive adaptation) ma:

- Aggiunge complessità economy senza closing L06 canonical gap
- Meglio integrare in PI pack v2 M12+ come pack category "biome-specific trait" invece di channel separato

### Issue draft

```markdown
---
title: [P2] BiomeMemory — bonus adattativi persistenti per-unità per-bioma
labels: design, p2-evoluzione, parked, scope-creep-risk
assignee: master-dd
---

## Contesto

Exploration-note deck v2 (2026-04-20): creature che sopravvivono a N encounter
nello stesso bioma ricevono "memoria" = piccoli bonus adattativi persistenti,
registrati in Nido state.

## Lacune agganciate

- L06 P2 persistence runtime (ortogonale, non closing)
- L08 Biome runtime Node gap

## Proposta MVP (se accettato)

- Prisma schema: `BiomeMemory` table con {party_member_id, biome_id, encounters_survived, bonus_type, bonus_value}
- Threshold: N=3 encounter stesso bioma → +1 stat_bump per quel bioma
- Consume: read-only applicato al session init, NON spendable

## Scope creep risk (Flint)

ALTO. Quarta economia implicita (PE/PI/Seed/Trust + BiomeMemory).
Freeze §19.3: "la stessa valuta non deve fare troppe cose".

## Raccomandazione triage

**PARCHEGGIATA** M12+. Meglio integrare in PI pack v2 come
"biome-specific trait bundle" — pack_manifest esistente, no nuovo
economy channel.

## Non fare nel MVP

- No tabella `BiomeMemory` dedicata finché PI pack v2 non ha gated
- No UI in Nido panel finché scope non è approvato

## Riferimenti

- `docs/planning/2026-04-20-integrated-design-map.md` §4 exploration note 1
- `docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html` slide Nota 1
- Freeze §19.3 scope-creep warn
```

### Doc toccare se accettato (futuro)

- Nessuno per ora. Se M12+ promosso: `docs/core/PI-Pacchetti-Forme.md` aggiungere pack category `biome_adaptive` + ADR dedicata.

### ADR da scrivere se accettato

ADR-202X-biome-adaptive-pack-system (M12+ solo).

---

## Issue Draft 2 — Costo ambientale del trait

### Fonte

Deck v2 §Nota 2. "Ogni trait dovrebbe avere un **costo ambientale** (es. `thermal_armor` penalizza mobilità in clima caldo), non solo un costo PI."

### Lacuna concreta chiusa

- **L06** P2 runtime (trait economy diventa contextual vs flat)
- **L08** Biome runtime gap Node (penalty biome-specific → wire biome effects)
- **Q66** stress_modifiers formula — parzialmente (dà struttura a sandstorm: 0.06)

### Rischio scope creep

🟡 **MEDIO**. Pattern proven (Into the Breach usa environment penalty, XCOM terrain effect). MA:

- Matrice `trait × biome` = 84 species × 5-10 trait × 7 biomi = **~3000 cell tuning**
- Rischio content-explosion se fatto generico
- Opportunità pilot: 4 trait × 3 biomi shipping = 12 cell, gestibile

### Raccomandazione: **(a) issue P0 pilot** (pilot limitato, poi generalizza)

Motivo: chiude L06 parzialmente + aggancia L08 a runtime (unblock M12+ biome port). Ma limit a 4 trait × 3 biomi per evitare content-explosion. Generalizzazione post-MVP solo se playtest valida pattern.

### Issue draft

````markdown
---
title: [P0 pilot] Costo ambientale trait — 4 trait × 3 biomi pilot
labels: design, p0-evoluzione, pilot, balance
assignee: master-dd
---

## Contesto

Exploration-note deck v2: ogni trait dovrebbe avere un costo ambientale
context-dependent (es. `thermal_armor` → +defense in clima freddo,
−mobility in clima caldo), non solo costo PI flat.

Oggi `trait_mechanics.yaml` ha solo costi numerici meccanici.
Guida_Evo_Tactics_Pack_v2 + SoT §5 parlano di "adattamento ambientale"
ma non traducono in penalty numeriche per-bioma.

## Lacune agganciate

- L06 P2 runtime (parziale)
- L08 Biome runtime gap Node (aggancia terrain_defense.yaml shipping)
- Q66 stress_modifiers formula

## Proposta MVP pilot

- **4 trait shipping**: `thermal_armor`, `zampe_a_molla`, `pelle_elastomera`, `denti_seghettati`
- **3 biomi shipping**: `savana` (caldo arido), `caverna_risonante` (freddo umido), `rovine_planari` (neutral)
- Matrix 4×3 = 12 cell con stat modifier ±1 a ±2

Schema `data/core/balance/trait_environmental_costs.yaml` NEW:

```yaml
version: '1.0'
trait_costs:
  thermal_armor:
    savana: { defense_mod: -1, mobility: -1 } # caldo penalizza
    caverna_risonante: { defense_mod: +2 } # freddo premia
    rovine_planari: {} # neutral
  zampe_a_molla:
    savana: { mobility: +1 }
    caverna_risonante: { mobility: -1 } # superficie umida
    rovine_planari: {}
  # ... 2 altri trait
```

Runtime wire: `apps/backend/services/traitEffects.js` hook in session
init legge biome_id → applica penalty/bonus a unit.mod + movement.

## Scope creep guard

- **NON generalizzare** a 84 species × 10 trait × 7 biomi = 5880 cell
- **NON** nuovo economy channel (trait penalty = stat_delta runtime, no new currency)
- **Pilot only**: dopo playtest N=10 validate → promote altri trait, OR kill

## Raccomandazione triage

**P0 pilot** — ship 4×3 matrix come ADR-202X + YAML + wire. Se playtest
"feel" positivo (Master DM reports) → generalizza. Se confuso → revert.

## Deliverable

1. ADR-202X-trait-environmental-costs
2. `data/core/balance/trait_environmental_costs.yaml` (schema + 12 cell)
3. `apps/backend/services/traitEffects.js` hook biome penalty
4. Tests unit: 4 scenari (trait × biome) applica delta corretto
5. Playtest follow-up notes.md

## Effort

~6-8h (spec 2h + YAML 1h + wire 3h + test 2h).

## Riferimenti

- `docs/planning/2026-04-20-integrated-design-map.md` §4 exploration note 2
- `docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html` Nota 2
- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` (shipping)
- `docs/planning/2026-04-20-design-audit-consolidated.md` Q66 stress_modifiers
````

### Doc toccare

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — nessun cambio, aggiungere `references` link al nuovo YAML
- `docs/core/PI-Pacchetti-Forme.md` — aggiungere riga "trait hanno costo ambientale context-dependent (vedi ADR-202X)"

### ADR da scrivere

**ADR-202X-trait-environmental-costs** — trait modifier biome-specific, scope pilot limitato 4×3, criteri promotion/revert post-playtest.

---

## Issue Draft 3 — Onboarding narrativo 60s

### Fonte

Deck v2 §Nota 3. "I primi 60 secondi non devono spiegare regole, devono far scegliere qualcosa di identitario (un tratto, un ricordo di specie, una pressione evolutiva)."

Supporto: `Vertical Slice - 60s Onboarding.html` in archive — UX mockup concept.

### Lacuna concreta chiusa

- **L05** P0 narrative arc framework (debrief/onboarding beat emotivo) — **chiusura diretta**
- L04 Campaign structure (onboarding precede Act 0) — tangenziale

### Rischio scope creep

🟢 **BASSO**. Spec design isolato (primi 60s), no nuovo system, no nuova economy. Richiede:

- 1 doc canonical onboarding flow
- 1 narrative choice (3 opzioni trait/memoria/pressione)
- Propaga a campaign_tree.yaml come pre-Act 0 prompt

### Raccomandazione: **(a) issue P0 design doc** (chiude L05)

Motivo: L05 è P0 blocking per narrative arc. Cheapest P0 close = scrivere design doc. Impl successiva (frontend choice picker) deferred M11+.

### Issue draft

````markdown
---
title: [P0 design] Onboarding narrativo 60s — 3 scelte identitarie pre-Act 0
labels: design, p0-narrative, mvp-scope
assignee: master-dd
---

## Contesto

Exploration-note deck v2: primi 60 secondi devono far scegliere qualcosa
di identitario (trait, memoria specie, pressione evolutiva), non spiegare
regole. Risponde al gap P0 #2 audit 4-agent ("Narrative arc framework").

## Lacune agganciate

- **L05 P0 narrative arc framework** (chiusura diretta)
- L04 Campaign structure (tangenziale, onboarding = pre-Act 0)

## Proposta MVP

### Flow 60s (pre-Act 0)

```
[00:00] Apri gioco → splash "Sopravvivi all'Apex"
[00:10] Briefing audio breve (2-3 frasi): "Il tuo branco è stato marcato.
        L'Apex ti troverà. Come vuoi che ti ricordino?"
[00:20] 3 scelte identitarie (30s max deliberazione):
        - OPZIONE A: "Come veloce e sfuggente" → trait `zampe_a_molla` pre-slot
        - OPZIONE B: "Come duro e inamovibile" → trait `pelle_elastomera` pre-slot
        - OPZIONE C: "Come letale e preciso" → trait `denti_seghettati` pre-slot
[00:50] Transizione narrativa breve (10s): "Così sarà."
[01:00] Enter enc_tutorial_01 (Act 0 chapter 1)
```

### Impatto runtime

- Scelta salvata in `PartyRoster.acquired_traits` pre-session (M10 Phase A schema)
- UI: 3 card con narrative text + tratto preview
- Backend: nessun nuovo endpoint — reuse `/api/campaign/start` con body `{player_id, initial_trait_choice: 'zampe_a_molla'}`

### Vertical slice reference

`docs/archive/concept-explorations/2026-04/Vertical Slice - 60s Onboarding.html`
(solo UX reference, NON spec. In archive come exploration.)

## Scope creep guard

- **NON** aggiungere lore/dialogue branching extra al minute-0
- **NON** tutorial interattivo in 60s (Freeze §6: tutorial sotto i 10min ≠ 60s)
- 60s è **choice identitaria**, NON tutorial. Regole spiegate solo in Act 0 chapter 1 (enc_tutorial_01).

## Raccomandazione triage

**P0 design doc** — scrivere `docs/core/51-ONBOARDING-60S.md` canonical
(A3 authority) + mockup UI allineato vertical-slice HTML.

Impl frontend (choice picker + narrative intro UI) deferred M11+ quando
Jackbox network permette scelta sync per co-op.

## Deliverable design doc

1. `docs/core/51-ONBOARDING-60S.md` NEW:
   - Flow timing 60s esatto
   - 3 scelte canonical + narrative text
   - Integration con campaign_tree.yaml pre-Act 0 hook
   - UX reference vertical-slice HTML (link archive)
   - Scope creep guards

2. `data/core/campaign/default_campaign_mvp.yaml` extend:
   - Aggiungere `onboarding:` root section con 3 choice
   - Schema validation: exactly 3 choices, each with trait_id valid

3. ADR-202X-onboarding-narrative-60s (auto se design doc approvato)

## Effort

~4-8h (design doc 3h + YAML extend 1h + ADR 1h + review 2h). **No code.**

## Riferimenti

- `docs/planning/2026-04-20-integrated-design-map.md` §4 exploration note 3
- `docs/archive/concept-explorations/2026-04/Vertical Slice - 60s Onboarding.html`
- `docs/planning/2026-04-20-design-audit-consolidated.md` §1 gap #2 narrative arc
- `docs/adr/ADR-2026-04-21-campaign-save-persistence.md` (per Act 0 hook)
````

### Doc toccare

- `docs/core/40-ROADMAP.md` — M10 content budget: aggiungere "Onboarding 60s" voce
- `data/core/campaign/default_campaign_mvp.yaml` — aggiungere sezione `onboarding:` con 3 choice
- `docs/core/51-ONBOARDING-60S.md` — NEW canonical

### ADR da scrivere

**ADR-202X-onboarding-narrative-60s** — flow canonical pre-Act 0, 3 scelte identitarie, timing 60s strict, no regole in minute-0.

---

## Sintesi triage

| Nota                     | Lacuna          | Scope creep |        Rec         | Effort    | Prossimo step           |
| ------------------------ | --------------- | :---------: | :----------------: | --------- | ----------------------- |
| 1 BiomeMemory            | L06 + L08       |   🔴 ALTO   | **(b) parcheggia** | 0h (M12+) | PI pack v2 integration  |
| 2 Costo ambientale trait | L06 + L08 + Q66 |   🟡 MED    | **(a) pilot 4×3**  | ~6-8h     | ADR-202X + YAML + wire  |
| 3 Onboarding 60s         | **L05**         |  🟢 BASSO   | **(a) design doc** | ~4-8h     | 51-ONBOARDING canonical |

**Raccomandazione priority execute ordine**:

1. **Issue 3 (Onboarding 60s)** — chiude L05 P0, low risk, cheap
2. **Issue 2 (Costo ambientale pilot)** — chiude L06/L08 parzialmente, pilot contenuto
3. **Issue 1 (BiomeMemory)** — parcheggia, rivalutare M12+

Total effort se tutti shipped: ~10-16h (M11 adjacent). Se solo Issue 3: ~4-8h standalone.

## Kill-60 Flint

**Non spendere tempo su**:

- Generalizzare Issue 2 oltre pilot 4×3 pre-playtest validation
- Creare Issue 1 tabella Prisma BiomeMemory prima PI pack v2 M12+
- Tutorial UI elaborata in Issue 3 60s (Freeze §6: tutorial ≠ onboarding)

## Riferimenti

- `docs/planning/2026-04-20-integrated-design-map.md` §4 exploration-note table
- `docs/archive/concept-explorations/2026-04/README.md` §Le 3 exploration-note
- `docs/planning/2026-04-20-pilastri-reality-audit.md` §P2
- Freeze §19.3 scope creep warn
