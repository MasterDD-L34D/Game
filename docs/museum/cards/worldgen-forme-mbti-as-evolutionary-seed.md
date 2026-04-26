---
title: '16 Forme MBTI come seed evolutivi: d12 bias + PI pacchetti vs telemetria VC'
museum_id: M-2026-04-26-017
type: mechanic
domain: [personality]
provenance:
  found_at: 'docs/core/22-FORME_BASE_16.md:1 + data/core/forms/form_pack_bias.yaml:1'
  git_sha_first: 'c185ae8b'
  git_sha_last: '0d501169'
  last_modified: '2026-04-24'
  last_author: 'MasterDD-L34D'
  buried_reason: forgotten
relevance_score: 4
reuse_path: 'apps/backend/services/forms/formPackRecommender.js:101 — già operativo; gap: biome starter pack non wired in session /start'
related_pillars: [P2, P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# 16 Forme MBTI come seed evolutivi: d12 bias + PI pacchetti vs telemetria VC

## Summary (30s)

- Le 16 Forme Base (1:1 con tipi MBTI) sono "seed temperamentali": ciascuna assegna 1 trait innata + 7 PI pacchetti tematici con d12 bias verso pack A/B/C. Runtime: `formPackRecommender.js` legge `data/core/forms/form_pack_bias.yaml` e restituisce raccomandazione in base a Forma + Job + d20/d12 roll. **Operativo**.
- Gap worldgen: il link "bioma → starter pack" (campo `starter_bioma` in pack universali F/G/E/C) non è wired in session `/start` — nessun bioma influenza quale PI pack viene offerto all'inizio della campagna.
- Gap da SoT §5: la telemetria VC sposta la Forma nel tempo (comportamento → asse MBTI derivato) ma il punto di partenza (Forma iniziale) non è collegato all'ecosistema di provenienza della specie.

## What was buried

**`form_pack_bias.yaml`** struttura:

```yaml
universal_packs:
  C: 'job_ability + cap_pt + starter_bioma' # ← starter_bioma campo dichiarato
  E: 'trait_T1 + starter_bioma + cap_pt + PE'
  F: 'sigillo_forma + job_ability + starter_bioma'
  G: 'sigillo_forma + trait_T1 + starter_bioma + PE'

# Per ogni forma MBTI (esempio, una delle 16):
forms:
  - id: ENTJ # o slug forma equivalente
    d12_bias: { a: [1, 5], b: [6, 9], c: [10, 12] }
    pack_a: { label: '...', combo: '...' }
    pack_b: { ... }
    pack_c: { ... }
```

Il campo `starter_bioma` compare 4 volte nei pack universali ma non è definito come dato separato — è un placeholder per "un trait/item del bioma di provenienza della specie". Nessuna logica lo risolve oggi.

**`formPackRecommender.js`** (già live, commit `0d501169` 2026-04-24):

```javascript
function recommendPacks({ form_id, job_id, d20_roll = null, d12_roll = null }) {
  // 1. d20 ≤ 15 → universal (A-J)
  // 2. d20 16-17 → Bias Forma (d12 roll + form.d12_bias → A/B/C)
  // 3. d20 18-19 → Bias Job (job_bias map)
  // 4. d20 20 → Scelta libera
  // Returns: { recommended, type, reason, form_packs, job_bias }
}
```

**Formula SoT §5** (lines 315-319): la Forma è il seed — ma "Bioma/Ecosistema/Pressione" precede "Specie" precede "Forme" nella catena causale. Il link bioma→forma è documentato come intent, non come wire.

**`vcScoring.js:843`**: `deriveMbtiType(mbti)` già esiste — la VC telemetria calcola gli assi MBTI da comportamento e li usa per `projectForm()` (suggerisce la Forma verso cui il personaggio sta evolvendo).

## Why it was buried

- `form_pack_bias.yaml` creato 2026-04-24 (V4 vision gap sprint) — abbastanza recente.
- La connessione "bioma → starter_bioma content" non è mai stata riempita perché richiede decisione design: cosa contiene `starter_bioma`? Un trait? Un item? Un bonus affix?
- Il worldgen model (bioma → specie → forma) è documentato in SoT §5 ma l'implementazione ha proceduto in direzione opposta: Forma scelta liberamente → PI → VC telemetria → Forma evolved. Il bioma è opzionale.
- Card esistente [personality-triangle-strategy-transfer.md](personality-triangle-strategy-transfer.md) (score 5/5) copre P4 surface presentation ma non il link worldgen→forma.

## Why it might still matter

- **P2 Evoluzione emergente**: la promessa Spore-core è che l'ambiente plasma la creatura. Bioma → starter pack = una incarnazione di questa promessa accessibile in ~2h, senza PCG completo.
- **P4 Temperamenti MBTI**: onboarding meaningful se la Forma iniziale è influenzata dall'ecosistema di provenienza (dune_stalker in savana → forme Desert/arid affini). Coerenza narrativa.
- **Worldgen gap**: `starter_bioma` non è un campo vuoto per sbaglio — è il raccordo dichiarato tra livello 1 (bioma) e livello "Forma" del sistema evolutivo. Riempirlo chiude l'ultimo gap dichiarato nel SoT §5 a basso costo.

## Concrete reuse paths

1. **Minimal** (P0, ~2h): definisci `starter_bioma_trait` per ogni bioma in `data/core/biomes.yaml` (es. `canyons_risonanti: starter_bioma_trait: artigli_sette_vie`). In `formPackRecommender.js`, quando pack include `starter_bioma`, sostituisci con `biomes[biome_id].starter_bioma_trait`. Wire in session `/start` passando `biome_id`. Blast radius ×1.3 → ~3h.
2. **Moderate** (P1, ~6h): `biome_affinity` della specie scelta → lookup `biome_pools.json` per pool `core` traits → offri 3 starter_bioma options in character creation (come PI pack C/E/F/G). Wired in `characterCreationPanel.js`. Blast radius ×1.3 → ~8h.
3. **Full** (P2, ~15h): bioma di campagna influenza d12_bias delle Forme — in savana (DESERTO_CALDO) le forme arid-affini (es. ISTJ = costancy/endurance) hanno d12_bias spostato verso pack più "robusti". Richiede `biome_form_affinity.yaml` + calcolo bias modificato. ADR richiesto. Blast radius ×1.5 → ~22h.

## Sources / provenance trail

- Found at: [docs/core/22-FORME_BASE_16.md](../../../docs/core/22-FORME_BASE_16.md) — commit `c185ae8b` (MasterDD-L34D, 2026-04-14)
- Machine-readable: [data/core/forms/form_pack_bias.yaml](../../../data/core/forms/form_pack_bias.yaml) — commit `0d501169` (MasterDD-L34D, 2026-04-24)
- Runtime live: [apps/backend/services/forms/formPackRecommender.js](../../../apps/backend/services/forms/formPackRecommender.js) — `recommendPacks()` operativo
- VC integration: [apps/backend/services/vcScoring.js:843](../../../apps/backend/services/vcScoring.js) — `deriveMbtiType()` + `projectForm()`
- SoT §5: [docs/core/00-SOURCE-OF-TRUTH.md:253-323](../../../docs/core/00-SOURCE-OF-TRUTH.md)
- Related card (P4 surface): [personality-triangle-strategy-transfer.md](personality-triangle-strategy-transfer.md) — score 5/5

## Risks / open questions

- `starter_bioma` in pack universali è stringa, non tipo strutturato — design undefined. Serve decisione prima di wire: è un trait T1? Un item? Un affix bonus di sessione? Una sola risposta, user deve decidere.
- `data/core/forms/mbti_forms.yaml` esiste ma non letto in questo flow — verificare se contiene info aggiuntive utili (es. biome affinity già mappata) prima di creare `biome_form_affinity.yaml` da zero.
- NON confondere Forma (seed statico) con Forma evolved (output VC telemetria in-match). Forma iniziale ≠ Forma finale. Il biome influenza solo il punto di partenza.
