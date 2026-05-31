---
title: ADR-2026-05-31 — Meta-network edge arc-conditions schema (2.0 → 2.1)
status: proposed
date: 2026-05-31
workstream: flow
doc_status: draft
doc_owner: claude-code
last_verified: 2026-05-31
source_of_truth: false
language: it
review_cycle_days: 180
tags:
  [adr, worldgen, meta-network, arc-conditions, schema, gap-c, lock-and-key, data-gate, proposed]
---

# ADR-2026-05-31 — Meta-network edge arc-conditions schema (2.0 → 2.1)

## Status

**PROPOSED** — gated master-dd (Eduardo). NON applicare a `meta_network_alpha.yaml` finché questo
ADR non è **ACCEPTED**. Questo documento è la decisione di design (bozza); non tocca alcun file dati.

## Context

GAP-C fase 1 ([PR #2483](https://github.com/MasterDD-L34D/Game/pull/2483), `efa3e50d` su main) ha
shippato il routing della campagna sul grafo meta-network: `metaNetworkResolver` (loader read-only) +
`metaNetworkRouting.selectNextNodes` (selezione pura, filtro topologico `prior_node_cleared`) +
`GET /api/campaign/meta-network/next` (flag `META_NETWORK_ROUTING` OFF default).

La fase 2 ([spec PR #2487](https://github.com/MasterDD-L34D/Game/pull/2487)) vuole il **lock-and-key**
di Dormans: un arco è una **porta**, la condizione è la **chiave**. Per esprimere le chiavi serve un
blocco `conditions:` sugli **edge** di `meta_network_alpha.yaml`. Scrivere quel blocco:

- tocca **catalog/data** (`packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml`) →
  fork **irreversibile** (non reversibile via feature-flag, a differenza del codice);
- richiede bump `schema_version 2.0 → 2.1` + ricalcolo `receipt.trace_hash`.

Per la disciplina del progetto (anti-pattern #19 "stop per fork/catalog-write", memoria
`feedback_autonomous_choice_on_forks`), questa modifica al dato è **owner-gated** → questo ADR.

## Decision

Tre decisioni di design (verdict master-dd Eduardo, 2026-05-31):

### D1 — Forma: mappa **terse** inline sull'edge (stile FTL `events.xml`), NON l'albero mutation-trigger

Il blocco `conditions:` è una **mappa piatta** di chiavi sull'edge stesso (inline, non tabella
separata). Semantica:

- blocco `conditions` **assente o vuoto** → arco **sempre eleggibile** (passthrough / back-compat);
- **AND fra chiavi** (tutte devono passare);
- **OR dentro una chiave a lista** (es. `season: [winter, autumn]` → basta una);
- soglie via coppia `min_*` / `max_*` (numeri).

```yaml
# meta_network_alpha.yaml — esempio illustrativo (NON scritto da questo ADR)
edges:
  - from: FORESTA_TEMPERATA
    to: CRYOSTEPPE
    type: seasonal_bridge
    resistance: 0.6
    seasonality: inverno # flavor IT — RESTA, NON usato per il gate (vedi D-Q-C fase-2)
    notes: valichi nevosi con copertura forestale rada
    conditions: # NUOVO (fase 2). Assente = arco sempre eleggibile.
      season: [winter] # OR intra-lista; enum EN (= seasonalEngine.SEASONS)
      min_pressure: 3 # AND con season; soglia campaignPressure
      prior_node_cleared: [BADLANDS] # lock-and-key topologico
```

**Perché terse e non l'albero `trigger_conditions` del mutation system**: il valutatore mutazioni
(`apps/backend/services/combat/mutationTriggerEvaluator.js:78-130`, schema in
`data/core/mutations/mutation_catalog.yaml`) usa `kind:` + 12 evaluator che **aggregano stream di
eventi di combattimento** (`status_apply_count`, `damage_taken_high_mos`, `kill_streak`, …). Le
condizioni di routing sono invece **check di stato a snapshot** (stagione corrente, pressione di
campagna, nodi puliti) — molto più semplici. Per **12 archi scritti a mano** la mappa terse è più
leggibile e meno verbosa. Si lascia un **upgrade-path**: se in futuro serve nesting/OR esplicito fra
gruppi, si può adottare la forma `{ op: AND|OR, conditions: [...] }` senza rompere la forma terse
(la terse diventa lo zucchero sintattico del caso AND-flat).

### D2 — Versioning: `schema_version 2.0 → 2.1`, additivo + back-compat

Bump **minor additivo**. Gli edge senza `conditions` restano validi in 2.1 (campo opzionale). Nessuna
migrazione dati necessaria. Coerente col precedente di progetto: la famiglia ecosystem schema è già
salita `1.0 → 1.1 → 2.0` per soli campi additivi, e [ADR-2026-05-10](ADR-2026-05-10-mutation-auto-trigger-evaluator.md)
(mutation auto-trigger, ACCEPTED) ha aggiunto `trigger_conditions` a un catalogo dati con regola
esplicita "NO breaking change".

### D3 — Telegraph: arco bloccato **mostrato + lucchetto + motivo**, motivo **generato dal codice** (nessun campo dato extra)

Pattern "blue option" di FTL / telegraph di Into the Breach: l'arco gated-ma-non-soddisfatto è
**visibile**, in grigio, con il **motivo** del blocco. Il motivo NON è un campo nel dato: lo genera il
**codice** dal tipo di condizione fallita (`blocked_by`), via stringa i18n. Esempio: `blocked_by:
'season'` → UI mostra "Solo durante l'inverno". Vantaggio: zero campo per-arco da scrivere a mano,
zero rischio di drift testo↔logica, traduzioni centralizzate.

> Conseguenza dato: l'edge **non** porta un campo `lock_hint`/`lock_reason`. Il routing espone
> `blocked: [{ node_id, blocked_by }]` (campo additivo, vedi spec fase-2 Q-E); la UI Godot mappa
> `blocked_by` → testo (fase separata, spec fase-2 Q-H).

## Set condizioni v1 + gate order (eredita verdict fase-2)

Coerente coi verdetti già postati su [#2487](https://github.com/MasterDD-L34D/Game/pull/2487):

1. **`prior_node_cleared: [id]`** — lock-and-key canonico Dormans (la key = aver vinto il nodo Y).
   Già coperto topologicamente in fase 1; qui **formalizzato** nel blocco `conditions`. Primo gate.
2. **`season: [enum EN]`** — quick-win di plumbing (stato già live `campaignSeasonalState.current_season`).
   Banco di prova della catena dato→resolver→routing, NON gate di prodotto primario.
3. **`min_pressure` / `max_pressure`** — soglia su `campaign.campaignPressure` (scalare crescente
   di campagna, modello FTL fleet / Into the Breach Grid — vedi Q-F risolta su #2487). `max_pressure`
   = "la rotta sicura si chiude se indugi". Gate di prodotto #2.

**Deferiti a v1.1** (non in questo schema v1): `requires_trait`, `requires_flag`, `biome_affinity`,
`act_gate`. `biome_affinity` resta gated finché la confidence D4 non è band-verificata (segnale
rumoroso, memoria D4).

**Semantica eval** (nel codice puro `_evalEdgeConditions`, spec fase-2 §3.2):
`AND` fra chiavi; `OR` intra-lista; soglia `ctx.pressure >= min_pressure && <= max_pressure`;
**fail-closed** (stato mancante per una condizione richiesta → arco bloccato = band-safe, mai apre una
rotta out-of-state).

## Alternatives considered

| Alternativa                                                         | Esito     | Motivo                                                                                                 |
| ------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| Nessun campo (routing resta solo topologico)                        | rifiutato | niente lock-and-key = niente scelta di rotta significativa (core della fase 2)                         |
| Riuso albero `trigger_conditions` mutation (`kind:` + 12 evaluator) | rifiutato | combat-event-driven vs state-snapshot; troppo verboso per 12 archi a mano; complessità non necessaria  |
| Tabella `conditions` separata keyed-by-edge-id                      | rifiutato | indirection inutile per un grafo piccolo scritto a mano; inline (FTL events.xml) più manutenibile      |
| Gate sulla `seasonality` it-free-text esistente                     | rifiutato | `estate/notte`, `tarda_inverno`, `episodico` = parsing fragile; campo `conditions.season` EN esplicito |
| Campo dato `lock_reason` per-arco                                   | rifiutato | drift testo↔logica + costo per-arco; motivo generato dal codice (D3)                                  |

## Reference games (informano le scelte)

- **FTL: Faster Than Light — `events.xml`**: le scelte sono gated inline con attributi `req="…"`
  `lvl/max_lvl` `blue="true"` — requisito **dichiarativo sull'elemento stesso**, non in tabella esterna.
  Supporta **D1** (terse inline) + **D3** ("blue option" = mostrata solo se la qualifichi → telegraph).
- **Into the Breach — telegraph**: la minaccia/ricompensa è mostrata PRIMA del commit, con back-out;
  perfect-information. Supporta **D3** (shown-locked-with-reason, non hidden).
- **Dormans — lock-and-key**: `addKeyLock`/`moveLockBack` garantiscono che la key sia generata prima
  del lock (completability). Supporta il set v1 (`prior_node_cleared` = lock canonico) + la regola
  "valida ≥1 path non-gated → terminale prima di presentare la mappa".

## Consequences

### Positive

- Routing diventa lock-and-key (scelta di rotta significativa) restando **band-safe** (edge senza
  `conditions` = comportamento fase-1 identico; flag `META_NETWORK_ROUTING` resta OFF default).
- Vocabolario `season` allineato a `seasonalEngine.SEASONS` + `cross_events.yaml` (un solo enum EN).
- Nessun nuovo campo per-arco oltre `conditions` (motivo lock generato dal codice).

### Ripple checklist (da eseguire SOLO dopo ACCEPTED, in fase di impl)

| Ripple                                          | Azione                                                                                                        | Stato verificato 2026-05-31                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `schema_version 2.0 → 2.1`                      | bump additivo riga 1                                                                                          | precedente ecosystem 1.0→1.1→2.0 + ADR-2026-05-10                                                               |
| `receipt.trace_hash` (riga 6)                   | ricalcolo via `tools/py/update_trace_hashes.py`; `tests/scripts/test_trace_hashes.py` flagga solo `"to-fill"` | ✅ test = solo placeholder check (ricorsivo)                                                                    |
| Resolver pass-through                           | estendere `metaNetworkResolver.js:63-70` con `conditions: e.conditions ?? null` — **codice, non dato**        | 🔴 senza questo `conditions:` è no-op silenzioso (mapper strippa campi ignoti)                                  |
| Validator network                               | `validate_ecosistema_v2_0.py` + `validate_cross_foodweb_v1_0.py` (via `run_all_validators.py:49-53`)          | 🟡 nessun hard-pin `==2.0` trovato → 2.1 dovrebbe passare; **re-confermare in impl** (eventuale validator v2_1) |
| Strict schema rejection                         | `conditions` campo ignoto                                                                                     | ✅ nessun `additionalProperties:false` sul network schema → non rigettato                                       |
| `validate-ecosystem-pack` / `validate-datasets` | restare verdi                                                                                                 | da eseguire in impl                                                                                             |
| Forbidden-path / governance                     | `packs/.../ecosystems/` non è in forbidden-paths (CLAUDE.md §guardrail)                                       | ✅ free-to-edit MA owner-gated come DATA                                                                        |

### Negative / rischi

- Bump `2.0 → 2.1`: se un validator (improbabile) hard-pinna `==2.0`, va rilassato/duplicato in impl
  (rischio basso, da re-confermare — vedi tabella).
- Ogni nuovo tipo di condizione moltiplica la superficie del completability-check (regola Dormans:
  validare che ≥1 path non-gated raggiunga il terminale prima di presentare la mappa).

## Verified ground-truth (file:line, 2026-05-31)

- vocab condizioni esistente: `mutationTriggerEvaluator.js:78-130` (12 `kind`), `mutation_catalog.yaml:49-55`
  (`trigger_conditions` shape, ANY-clause).
- `exit_condition` campagna: `data/core/campaign/default_campaign_mvp.yaml:94-96,152-154`.
- precedente soglia: `packs/evo_tactics_pack/data/balance/sistema_pressure.yaml:62-63` (`min_pressure`/`max_pressure`).
- trace_hash: `tests/scripts/test_trace_hashes.py` (rglob `*.yaml`, check `"to-fill"`), regen `tools/py/update_trace_hashes.py`.
- validators network: `packs/evo_tactics_pack/tools/py/run_all_validators.py:49-53`.
- no `additionalProperties:false` su ecosystem/network schema (solo `packages/contracts/schemas/*` lo usano).
- forbidden paths: CLAUDE.md §guardrail = `.github/workflows/`, `migrations/`, `packages/contracts/`,
  `services/generation/`, `services/rules/` — `packs/.../ecosystems/` NON incluso.

## Links

- Spec fase 1: [`docs/superpowers/specs/2026-05-31-worldgen-gapc-meta-network-routing-design.md`](../superpowers/specs/2026-05-31-worldgen-gapc-meta-network-routing-design.md)
- Spec fase 2: [`docs/superpowers/specs/2026-05-31-worldgen-gapc-fase2-arc-conditions-design.md`](../superpowers/specs/2026-05-31-worldgen-gapc-fase2-arc-conditions-design.md) ([PR #2487](https://github.com/MasterDD-L34D/Game/pull/2487))
- Precedente additivo: [ADR-2026-05-10](ADR-2026-05-10-mutation-auto-trigger-evaluator.md)
