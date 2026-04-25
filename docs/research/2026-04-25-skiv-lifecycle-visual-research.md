---
title: Skiv Lifecycle Visual Progression — Research patterns + top-2 shipping
workstream: cross-cutting
category: research
doc_status: active
doc_owner: creature-aspect-illuminator
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 60
tags:
  - skiv
  - lifecycle
  - visual-progression
  - creature-design
  - render
  - research
related:
  - data/core/species/dune_stalker_lifecycle.yaml
  - data/derived/skiv_saga.json
  - apps/play/src/skivPanel.js
  - apps/play/src/render.js
  - docs/planning/2026-04-25-skiv-aspect-evolution.md
---

# Skiv Lifecycle Visual Progression — Research

> RESEARCH mode output 2026-04-25. Pattern industria + concrete reuse paths per
> visual creature progression Skiv card. Top-2 priorita' shipping immediato.
> Anti-pattern library applicata. Citazioni primary-sourced.

---

## Contesto snapshot (repo reale, non aspirazionale)

**Skiv saga attuale** (`data/derived/skiv_saga.json`):

- `lifecycle_phase`: **mature** (Lv 4, 1 mutation `artigli_grip_to_glass`, 2 thoughts internalized)
- MBTI axes: I_high (0.68) + T_high (0.72) + N_high (0.78) + P_high (0.68) — polarity stable
- `next_phase`: apex | gate: Lv 6 + 2 mutations + 3 thoughts
- Job: stalker (ex skirmisher)

**Card UI attuale** (`apps/play/src/skivPanel.js`):

- Fetch `/api/skiv/card` (text/plain), `/api/skiv/status` (chip Lv), `/api/skiv/feed`
- Mostra: ASCII pre-tag + events feed + status chip "Lv 4 · YYYY-MM-DD"
- **Gap**: nessuna barra di progressione fase, nessun overlay mutation, nessun cue transizione

**Canvas** (`apps/play/src/render.js`):

- `drawUnit(ctx, unit, gridH)` → `drawUnitBody(ctx, cx, cy, job, radius)` (job shape + faction color + rings)
- Nessun lifecycle ring. Nessun mutation dot. Solo outer job ring + inner faction circle + label.

---

## Pattern library — analisi 6 sistemi

### 1. Wildermyth layered portraits (P0 — composition foundation)

**Fonte canonical**: [Wildermyth Image layers wiki](https://wildermyth.com/wiki/Image_layers) +
[Category:Transformation](https://wildermyth.com/wiki/Category:Transformation)

**Come funziona**: PSD-like stack `body_base + phase_overlay + mutation_overlays[] + scar_overlays[]`.
Ogni transformation SOSTITUISCE specifici layer (wolf arm, stone eye, flame wing). Chapter beat
triggerizza layer addition PRIMA del flavor text. Player vede cambio corpo → poi legge testo.

**Reuse path Skiv**:
Il canvas 2D `drawUnit()` gia' usa `drawUnitBody()` per job shape + faction ring. Estendere con:

- `drawLifecycleRing(ctx, unit, cx, cy)` — anello colorato esterno che varia per fase
  (hatchling=grigio chiaro, juvenile=ocra, mature=arancio caldo, apex=nero+bioluminescenza,
  legacy=argenteo sbiadito). Implementa come terzo cerchio concentrico fuori dal job ring.
- `drawMutationDots(ctx, unit, cx, cy)` — punto per ogni mutation accumulata, posizionati
  a ore 2/4/6 del ring. Max 3 dots a CELL=40. Colore per `category`:
  physiological=amber, behavioral=blue, sensorial=teal.

**Limitazione concreta**: canvas 2D NON ha CSS compositing. Max 3 mutation dots a CELL=40.
Nessun layer PSD: solo cerchi + punti aggiuntivi sul ciclo render.

**Effort**: ~3h (drawLifecycleRing + drawMutationDots + test render). Zero nuove dipendenze.

---

### 2. Caves of Qud morphotype gating (P0 — personality → mutation pool)

**Fonte canonical**: [Caves of Qud Mutations wiki](https://wiki.cavesofqud.com/wiki/Mutations) +
[Modding:Genotypes](https://wiki.cavesofqud.com/wiki/Modding:Genotypes_and_Subtypes)

**Come funziona**: morphotype Chimera = physical mutations only; Esper = mental only.
Pool mutation gated da morphotype a char creation. "Physical features" come postfix description.

**Reuse path Skiv**:
MBTI axes gia' live (vcScoring + Thought Cabinet Phase 2). `mutation_catalog.yaml` ha `mbti_alignment`
field gia' compilato (es. `{S:1, T:1}` su artigli_freeze_to_glacier). Schema da aggiungere:
`mbti_pool: [T_high, S_low]` su ogni mutation. Derivazione automatica:

- T_F axis → physiological mutation pool (artigli, scaglie, ossa)
- N_S axis → sensorial mutation pool (echolocation, occhi, sensori)
- E_I axis → behavioral mutation pool (vocalizzazioni, postura)

**Default non-restrictive**: mutation senza tag `mbti_pool` → disponibile in TUTTI pool. Zero
rischio pool vuoto per Skiv (T+N+I stable → physiological+sensorial+behavioral tutti coperti).

**Effort**: ~2h (aggiungere `mbti_pool` a 30 mutations + visual cue "questo pool ti appartiene" nella
card UI). Non blocca nessun sistema esistente — additive field.

**Anti-pattern check**: NON restringere pool per mutations gia' acquistate. Gate prospettico only.

---

### 3. CK3 DNA chains — lineage inheritance timeline (P1 — futuro V3 Mating)

**Fonte canonical**: [Paradox dev diary CK3 portraits](https://www.pcinvasion.com/crusader-kings-iiis-latest-dev-diary-explains-schemes-portraits-dna-council-members-and-your-court/) +
[CK3 characters modding wiki](https://ck3.paradoxwikis.com/index.php?title=Characters_modding)

**Come funziona**: DNA = string compatta (gene index → value). 3 chain "level-uppable"
(Attractive/Intelligence/Strength) → 50% upgrade se entrambi i parent condividono. Trasmissibile
cross-generation.

**Reuse path Skiv**:
`dune_stalker_lifecycle.yaml` ha gia' `lineage_id` anchor nel campo `skiv_saga_anchor`.
`legacy` phase (phase 5) espone `inheritable_traits` API futura. Per ora: **DEFERRED** — V3
Mating/Nido OD-001 pending verdict utente. Non implementare nulla runtime finche' OD-001 chiusa.

**Visualizzazione timeline**: nella skivPanel, aggiungere una sezione "Saga Lineage" collassabile
con items ordinati per `diary.ts` → lista testuale eventi (scenario_completed, thought_internalized,
mutation_acquired, job_changed). I dati esistono gia' in `skiv_saga.json:diary[]`.

**Effort**: ~1.5h (solo UI timeline testuale, nessun gene engine). Separato da V3.

---

### 4. Hades weapon aspects reveal (P1 — mature→apex unlock modal)

**Fonte canonical**: [Hades 2 Weapon Aspects wiki](https://hades2.wiki.fextralife.com/Weapon+Aspects)

**Come funziona**: aspect = modifier permanente che cambia look + moveset arma. UI confirmation
modal "Adopt Aspect: X?" + silhouette iconica + name reveal. Sblocco come evento di narrativa.

**Reuse path Skiv**:
Ogni transition `mature → apex` offre una "Aspect Reveal" modal nella skivPanel:

- Trigger: `lifecycle_phase` cambia da mature a apex (rilevabile confrontando previous vs current fetch)
- UI: dialog dentro skivPanel con `sprite_ascii[apex]` + `aspect_it[apex]` + `voice_it[apex]`
- Pattern: `formsPanel.js` gia' fa modal. Riusa stessa struttura CSS `.skiv-modal-reveal`.

**Dati disponibili**: `dune_stalker_lifecycle.yaml` ha gia' `sprite_ascii`, `aspect_it`, `voice_it`,
`warning_zone_it` per ogni fase. Nessun nuovo dato necessario.

**Effort**: ~2h (detection phase change nel refresh() + modal reveal HTML/CSS inject).

---

### 5. Subnautica habitat lifecycle — biome stage lock (P1 — differenziazione)

**Fonte canonical**: [Subnautica Ghost Leviathan wiki](https://subnautica.fandom.com/wiki/Ghost_Leviathan)

**Come funziona**: juvenile spawn-locked Lost River → adult migra biomi diversi → comportamento
age-driven (juvenile timid, adult territorial).

**Reuse path Skiv**:
Skiv `biome_affinity: savana` e' fisso attualmente. Differenziazione per fase:

- hatchling/juvenile → spawn-locked savana (gia' corretto)
- mature → eligible desert
- apex → multi-biome (savana + desert + caverna)
- legacy → non spawna, memoria narrativa biome

`biomeSpawnBias.js` gia' esiste (PR #1726 V7). Aggiungere fase come moltiplicatore: serve
campo `lifecycle_biome_expansion` nella lifecycle YAML (non c'e' ancora — GAP schema minore).

**Effort**: ~1h YAML + ~2h wire biomeSpawnBias.js. Non urgente per card UI.

---

### 6. Monster Hunter Stories gene grid — mutation 3x3 (P0 — set bonus visual)

**Fonte canonical**: [MHST Kiranico Gene db](https://mhst.kiranico.com/gene) +
[MHS3 grid Game8](https://game8.co/games/Monster-Hunter-Stories-3/archives/586640)

**Come funziona**: 3x3 grid di gene slot. 3 stesso-tipo allineati (row/col/diagonal) → Bingo Bonus.
Borders silver/gold/platinum per rarity tier. Max 9 mutations per creature.

**Reuse path Skiv**:
Skiv ha `picked_perks` array (1 attuale) + `mutations` array (1 attuale). Per ora insufficienti per
3x3. Il pattern diventa utile a Apex (target 2-3 mutations + 3 perks di categoria).

**Implementazione skivPanel**: sezione collassabile "Mutation Grid" con griglia 3x3 in HTML/CSS.
Ogni cella = mutation slot. Celle vuote = bordo tratteggiato. 3 stesso `category` → background
highlighting bonus. Colori: physiological=amber, behavioral=blue, sensorial=teal.

**Effort**: ~2h UI solo panel (no canvas). Massimo impatto visivo per effort minimo.

---

## TOP-2 SHIPPING IMMEDIATO

### A. Phase Progression Bar nella skivPanel (effort ~2h)

**Problema**: player non sa a che punto del lifecycle e' Skiv. Card mostra "Lv 4" ma non
"Lv 4 di 7 — fase 3/5 — prossima apex a Lv 6 + 1 mutation + 1 thought".

**Implementazione**:

```html
<!-- Inserire in buildOverlay() dopo .skiv-ascii-card -->
<div class="skiv-phase-bar" id="skiv-phase-bar">
  <div class="phase-item phase-past" data-phase="hatchling">Cucciolo</div>
  <div class="phase-item phase-past" data-phase="juvenile">Giovane</div>
  <div class="phase-item phase-current" data-phase="mature">▶ Maturo ◀</div>
  <div class="phase-item phase-future" data-phase="apex">Apex</div>
  <div class="phase-item phase-future" data-phase="legacy">Memoria</div>
</div>
<div class="skiv-next-gate" id="skiv-next-gate">
  <!-- "Prossimo: Apex — manca: Lv 6, 1 mutation, 1 thought" -->
</div>
```

**CSS**:

```css
.skiv-phase-bar {
  display: flex;
  gap: 6px;
  margin: 10px 0;
  flex-wrap: wrap;
}
.phase-item {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.78rem;
  border: 1px solid #5a4a2f;
  color: #8a8a8a;
}
.phase-past {
  background: #1a1f2a;
  color: #6a6a6a;
}
.phase-current {
  background: #2a1f0a;
  border-color: #c4a574;
  color: #c4a574;
  font-weight: bold;
}
.phase-future {
  background: #0f1520;
  border-style: dashed;
}
.skiv-next-gate {
  font-size: 0.78rem;
  color: #8a8a8a;
  font-style: italic;
  padding: 4px 0;
}
```

**JS in refresh()**:

```js
// Aggiungere dopo la lettura di statusRes:
const PHASES = ['hatchling', 'juvenile', 'mature', 'apex', 'legacy'];
const PHASE_LABELS = {
  hatchling: 'Cucciolo',
  juvenile: 'Giovane',
  mature: 'Maturo',
  apex: 'Apex',
  legacy: 'Memoria',
};
// statusRes.data deve esporre lifecycle_phase + next_phase_gate
// (aggiungere a /api/skiv/status response)
if (statusRes.ok && statusRes.data && statusRes.data.lifecycle_phase) {
  const currentPhase = statusRes.data.lifecycle_phase;
  const gate = statusRes.data.next_phase_gate || {};
  const barEl = document.getElementById('skiv-phase-bar');
  const gateEl = document.getElementById('skiv-next-gate');

  if (barEl) {
    barEl.innerHTML = PHASES.map((p) => {
      const idx = PHASES.indexOf(p);
      const currIdx = PHASES.indexOf(currentPhase);
      const cls = idx < currIdx ? 'phase-past' : idx === currIdx ? 'phase-current' : 'phase-future';
      const arrow = idx === currIdx ? `▶ ${PHASE_LABELS[p]} ◀` : PHASE_LABELS[p];
      return `<div class="phase-item ${cls}" data-phase="${p}">${arrow}</div>`;
    }).join('');
  }

  if (gateEl && gate.level) {
    const lvl = statusRes.data.level || '?';
    const muts = statusRes.data.mutations_count || 0;
    const thoughts = statusRes.data.thoughts_internalized || 0;
    const missingLv = Math.max(0, gate.level - lvl);
    const missingMut = Math.max(0, (gate.mutations || 0) - muts);
    const missingThought = Math.max(0, (gate.thoughts_internalized || 0) - thoughts);
    const parts = [];
    if (missingLv > 0) parts.push(`Lv ${gate.level}`);
    if (missingMut > 0) parts.push(`+${missingMut} mutation`);
    if (missingThought > 0) parts.push(`+${missingThought} thought`);
    const nextLabel = PHASE_LABELS[statusRes.data.next_phase] || 'fine saga';
    gateEl.textContent = parts.length
      ? `Prossimo: ${nextLabel} — manca: ${parts.join(', ')}`
      : `Pronto per: ${nextLabel}`;
  }
}
```

**Backend touch** (`apps/backend/routes/skiv.js`): `/api/skiv/status` deve aggiungere:
`lifecycle_phase`, `next_phase`, `next_phase_gate`, `mutations_count`, `thoughts_internalized`.
Legge da `data/derived/skiv_saga.json` (gia' presente) + `data/core/species/dune_stalker_lifecycle.yaml`.
Effort backend: ~30min.

**Dati gia' disponibili**: `skiv_saga.json` ha `aspect.lifecycle_phase = "mature"`,
`skiv_saga_anchor.next_phase_gate = {level:6, mutations:2, thoughts_internalized:3}`,
`mutations` array length = 1, `cabinet.internalized` length = 2.

---

### B. Lifecycle Ring sul canvas (effort ~2h)

**Problema**: sul grid tile di gioco, Skiv sembra identico agli altri stalker. Player non distingue
visivamente "questa creatura e' a phase mature con mutations accumulate".

**Implementazione** (extend `apps/play/src/render.js`):

```js
// Aggiungere dopo le costanti JOB_SHAPE_MAP / JOB_COLOR_MAP
const LIFECYCLE_RING_COLOR = {
  hatchling: '#d0d0d0', // grigio pallido
  juvenile: '#c4a040', // ocra
  mature: '#e07020', // arancio caldo (Skiv current)
  apex: '#1a1a1a', // quasi nero (bioluminescenza via mutation dot)
  legacy: '#8a8a9a', // argenteo sbiadito
};

const MUTATION_DOT_COLOR = {
  physiological: '#c4a574', // amber
  behavioral: '#5599cc', // blue
  sensorial: '#4aafaa', // teal
  symbiotic: '#7a6aaa', // violet
};

function drawLifecycleRing(ctx, unit, cx, cy) {
  // unit deve avere unit.lifecycle_phase (stringa) per il ring.
  // Fallback a 'juvenile' se assente — non rompe rendering altre creature.
  const phase = unit.lifecycle_phase || 'juvenile';
  const color = LIFECYCLE_RING_COLOR[phase] || LIFECYCLE_RING_COLOR.juvenile;
  const radius = CELL * 0.5 * (unit.boss ? 1.5 : 1.0);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = phase === 'apex' ? 2.5 : 1.5;
  // Apex: linea tratteggiata per bioluminescenza
  if (phase === 'apex') {
    ctx.setLineDash([4, 3]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMutationDots(ctx, unit, cx, cy) {
  // unit.mutations deve essere array di {id, category}.
  const muts = (unit.mutations || []).slice(0, 3); // max 3 a CELL=40
  if (!muts.length) return;
  const baseRadius = CELL * 0.5;
  const dotR = 3;
  // Posiziona dot a ore 1 / ore 3 / ore 5 (angoli: -60°, 0°, +60°)
  const angles = [-Math.PI / 3, 0, Math.PI / 3];
  muts.forEach((mut, i) => {
    const angle = angles[i];
    const dx = cx + baseRadius * Math.cos(angle);
    const dy = cy + baseRadius * Math.sin(angle);
    const color = MUTATION_DOT_COLOR[mut.category] || MUTATION_DOT_COLOR.physiological;
    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}
```

**Wire in drawUnit()** (dopo il loop che disegna l'outer job ring, prima del fillText label):

```js
// Aggiungere ~linea 276 in drawUnit():
if (unit.lifecycle_phase) drawLifecycleRing(ctx, unit, cx, cy);
if (unit.mutations && unit.mutations.length) drawMutationDots(ctx, unit, cx, cy);
```

**Backend touch**: `/api/session/state` deve propagare `lifecycle_phase` e `mutations[]` nel payload
unit per le creature lifecycle-aware (Skiv + future lifecycle species). Attualmente il payload unit
ha `job`, `hp`, `ap`, `position` ma non `lifecycle_phase`. Campo opzionale — zero breaking change
per creature senza lifecycle YAML.

---

## Gating logic deterministica (lifecycle phase mapping)

```js
// Pure function — nessuna dipendenza runtime
function deriveLifecyclePhase(unit) {
  const level = unit.level || unit.progression?.level || 1;
  const mutCount = (unit.mutations || []).length;
  const thoughtCount = (unit.cabinet?.internalized || []).length;
  const polarityStable = unit.aspect?.polarity_stable === true;

  // Cascade: ordine importante. Fasi superiori prima.
  if (level >= 7 && mutCount >= 3 && thoughtCount >= 3 && polarityStable) return 'legacy';
  if (level >= 6 && mutCount >= 2 && thoughtCount >= 3 && polarityStable) return 'apex';
  if (level >= 4 && mutCount >= 1 && thoughtCount >= 2 && polarityStable) return 'mature';
  if (level >= 2) return 'juvenile';
  return 'hatchling';
}

// Skiv corrente: level=4, mutCount=1, thoughtCount=2, polarityStable=true → 'mature' ✓
// Next apex: level=6, mutCount=2, thoughtCount=3, polarityStable=true → 'apex' ✓
```

**Regola invariante**: polarity_stable richiesto da mature in su. Finche' MBTI axes in dead-band
(0.35–0.65) nessuna transizione visiva. Coerente con anti-pattern "MBTI form senza polarity stable
→ nessun visual change" (agent knowledge base).

---

## Pattern NON applicabili (anti-pattern guard)

| Pattern                             | Motivo skip                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Spore full procedural (Frontier)    | No riconoscibilita', 3D engine. Player non si affeziona a sprite generato.             |
| CK3 DNA gene encoding V3            | OD-001 mating pending. Non implementare finche' verdict utente.                        |
| Full sprite swap per fase           | Canvas 2D. Max ring color + dots. Full swap = art budget zero (solo-dev).              |
| Phase transition senza warning zone | `warning_zone_it` gia' presente nel lifecycle YAML per mature/apex. Wire obbligatorio. |
| Lifecycle decoupled da Lv gating    | Fase MAI basata solo su Lv. Cascade gating con AND conditions.                         |

---

## Gap minori identificati (non bloccanti)

1. **`/api/skiv/status` manca lifecycle fields** — aggiungere `lifecycle_phase`, `next_phase`,
   `next_phase_gate`, `mutations_count`, `thoughts_internalized`. ~30min backend.
2. **`/api/session/state` unit payload manca `lifecycle_phase` + `mutations[]`** — campo opzionale.
   ~1h backend. Blocca il canvas ring (Pattern B) ma non il panel bar (Pattern A).
3. **`dune_stalker_lifecycle.yaml` manca `lifecycle_biome_expansion`** — campo futuro per
   biomeSpawnBias.js phase-aware. Non urgente. Aggiungerlo quando Subnautica pattern (Pattern 5)
   viene implementato.
4. **`mutation_catalog.yaml` manca `mbti_pool` field su 30 entries** — additive field, non blocca
   nulla. Utile per Qud pattern (Pattern 2) future wire. ~1h content editing.

---

## Priorita' e sequenza shipping

| Fase                   | Task                                                     | Effort | Blocca                |
| ---------------------- | -------------------------------------------------------- | ------ | --------------------- |
| **Sprint A immediato** | Backend: `/api/skiv/status` lifecycle fields             | 30min  | Panel bar             |
| **Sprint A immediato** | Frontend: Phase bar skivPanel (Pattern A)                | 1.5h   | Visual gap principale |
| **Sprint A immediato** | Canvas: drawLifecycleRing + drawMutationDots (Pattern B) | 2h     | Tile grid gap         |
| Sprint A follow-up     | Aspect reveal modal mature→apex (Hades pattern)          | 2h     | Delight layer         |
| Sprint B               | Mutation grid 3x3 nel panel (MHS pattern)                | 2h     | Utile da Apex in su   |
| Sprint B               | mbti_pool field su mutation_catalog (Qud pattern)        | 1h     | Future gating         |
| V3 deferred            | CK3 lineage inheritance (OD-001 verdict needed)          | 15h+   | Utente                |

**Effort totale Sprint A**: ~4h. Zero nuove dipendenze. Zero breaking change. Skiv saga data
gia' completa — e' solo rendering.

---

## Provenance ricerca

Pattern estratti da agent knowledge base (2026-04-25 sprint #1776):

- Wildermyth Image layers wiki + Category:Transformation + WilderForge GitHub org (studio only)
- Caves of Qud Mutations wiki + Modding:Genotypes_and_Subtypes
- MHST Kiranico Gene db + MHS3 grid Game8
- Paradox dev diary CK3 portraits/DNA + CK3 wiki characters modding
- Hades 2 Weapon Aspects wiki Fextralife
- Subnautica Ghost Leviathan wiki Fandom

Museum consultato: nessuna card museo direttamente reuse per questo specifico dominio.
Card M-008 (Nido Itinerante) menziona `lineage_id` compatibile con Pattern 3 (CK3) — deferred
OD-001. Card M-011 (BiomeMemory) compatibile con Pattern 5 (Subnautica) — deferred.

Citazioni content farm: zero (verificato contro lista vietata).
