---
title: 'ADR-2026-04-27 — Ancestors Neurons Recovery v0.7 — canonical adoption'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv
  - reports/incoming/ancestors/ancestors_neurons_manifest_v07.json
  - docs/museum/cards/ancestors-neurons-dump-csv.md
  - docs/museum/excavations/2026-04-25-ancestors-inventory.md
  - data/core/traits/active_effects.yaml
  - BACKLOG.md
---

# ADR-2026-04-27 — Ancestors Neurons Recovery v0.7 — canonical adoption

## Status

**ACCEPTED** — 2026-04-25 (formalizzato 2026-04-27 retrospettivo)

Chiude TKT-ANCESTORS-RECOVERY (P2 autonomous research) e RFC Sentience v0.1 promise. Codifica
decisione user OD-011 override (commit `b6ce37f2`).

## Context

RFC Sentience v0.1 (2026-04-22) prometteva 297 Ancestors neurons cross 9 rami — combat trigger
ideas estratti da Ancestors: The Humankind Odyssey come pool fonte per `data/core/traits/active_effects.yaml`.

Stato pre-recovery 2026-04-25:

- 34/297 neuroni sopravvissuti in `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`
- 263/297 persi (binary `.zip` files referenced ma absenti dal repo, vedi inventory M-2026-04-25-004)
- Museum card `docs/museum/cards/ancestors-neurons-dump-csv.md` documenta gap

User decision 2026-04-25 (commit `b6ce37f2`):

- **Path A**: wire immediate 22 Self-Control trigger (PR #1813)
- **Path B**: autonomous online research per missing 263 (questa ADR formalizza outcome)

## Decision

**Adottare il dump v0.7 wiki recovery come canonical** per pool Ancestors neurons.

**Source primario**: Fandom wiki `ancestors.fandom.com` (community-maintained game wiki).
**Method**: MediaWiki API (`action=query&prop=revisions&rvslots=main`) con custom User-Agent
per bypass Cloudflare anti-bot. Rate-limit rispettato.

**License**: CC BY-NC-SA 3.0 (Fandom default Terms of Use). Compatibile con repo non-commercial use.
Attribution obbligatoria preservata per row in CSV note field + manifest source URL.

**Output canonical**:

- `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` (76KB, 297 entries + 6 header lines)
- `reports/incoming/ancestors/ancestors_neurons_manifest_v07.json` (SHA256 + branch breakdown + permalink per row)

## Branch coverage finale

| Ramo             | Count | Note                                               |
| ---------------- | ----: | -------------------------------------------------- |
| Senses           |    37 | Match RFC target 37                                |
| Ambulation       |    26 | Match RFC target 26                                |
| Dexterity        |    33 | Surplus vs RFC target ~20 (Fandom più dettagliata) |
| Attack           |     8 | Below 9 SC nominal but matches Fandom canonical    |
| Dodge            |    10 | Bonus ramo non in RFC v0.1                         |
| Self-Control     |    12 | RFC ~22 target — SC subdivision Fandom diversa     |
| Communication    |    20 | Target ~25                                         |
| Intelligence     |    14 | Below target ~30 — Fandom ramo less detailed       |
| Motricity        |    20 | Bonus ramo (riallocato da Movement)                |
| Omnivore         |    11 | Bonus diet ramo                                    |
| Settlement       |    10 | Below target ~30 — Fandom limited                  |
| Swim             |     5 | Bonus ramo                                         |
| Metabolism       |     4 | Bonus ramo                                         |
| Preventive Med   |    30 | Bonus ramo therapeutic family                      |
| Therapeutic Med  |    24 | Bonus ramo therapeutic family                      |
| Hominid lineages |    33 | Bonus species evolution chain                      |

**Total**: 297 entries (RFC v0.1 promise CHIUSA).

## Consequences

### Positive

- **263 trigger ideas recuperate** via legitimate web archeology, pool fonte ora completo per `data/core/traits/active_effects.yaml` extension
- **Zero fabricated content**: ogni entry ha permalink Fandom + branch attribution
- **License clean**: CC BY-NC-SA 3.0 attribution preservata, compatibile repo
- **Wire shipped immediato**: PR #1817 ha wirato 267 ancestor traits in `active_effects.yaml` (446→713 trait totali)
- **Path A complementare**: PR #1813 wirato 22 Self-Control trigger (foundation per Mating engine reaction triggers)

### Negative

- **Fandom non è fonte accademica**: alcune entries sono game-canonical (Panay Studios design choice) NON biological canonical. Settlement/Intelligence sotto target perché Fandom focus diverso da RFC original
- **Bonus rami non in RFC v0.1**: 9 nuovi rami emergeti (Dodge/Motricity/Omnivore/Swim/Metabolism/Preventive/Therapeutic/Hominid) richiedono tassonomia repo aggiornata — opzionale next sprint
- **Drift fix richiesto** post-merge: PR #1818 ha aggiornato museum card numbers + 2 BACKLOG closures stale

### Neutral

- **Bonus rami additivi**: extension organica del pool, non breaking. Future sprint possono ignorare/integrare.
- **Hominid lineages 33** entries: pool species evolution chain, candidato Pillar 2 evoluzione cross-gen extension

## Implementation status

Già SHIPPED (questa ADR è formalizzazione retro):

- ✅ PR #1815 (`73bbab3e`): data dump v0.7 + manifest
- ✅ PR #1817 (`effc06e4`): wire 267 traits in active_effects.yaml
- ✅ PR #1818 (`6b2670a3`): drift fix card numbers + BACKLOG closure

Verifica finale 2026-04-27:

- CSV 303 lines (297 entries + 6 header), zero mojibake (UTF-8 clean)
- Manifest SHA256 valid + 18 branch_pages source documented
- BACKLOG.md TKT-ANCESTORS-RECOVERY ✅ DONE con SHA reference

## Rollback plan

Se contenuto Fandom dispute (license / accuracy):

- Revert via `git revert 73bbab3e effc06e4 6b2670a3`
- CSV resta in `reports/incoming/` ma flagged `doc_status: deprecated` nel museum card
- Wire traits in `active_effects.yaml` removable via `git revert` selettivo

## Sources

- **Ancestors: The Humankind Odyssey** Fandom wiki — primary source
  - `https://ancestors.fandom.com/wiki/Neurons` (index page)
  - 18 branch pages (linked in manifest)
- **MediaWiki API documentation** — method reference
  - `https://www.mediawiki.org/wiki/API:Revisions`
- **Original RFC Sentience v0.1** — `docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md`
- **Pre-recovery sanitized** — `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`

## Cross-ref decisioni precedenti

- OD-008 sentience_tier backfill 45 species (PR #1808)
- OD-011 Path A 22 Self-Control wire (PR #1813)
- OD-011 Path B v07 wiki recovery (PR #1815) — questa ADR
- OD-011 Path B wire 267 batch (PR #1817)
- OD-012 magnetic_rift_resonance (PR #1811)
- OD-013 MBTI surface presentation (vedi doc decisions separato)

---

_Doc generato 2026-04-27 retrospettivo. Formalizza decisione user 2026-04-25 (commit b6ce37f2)._
_TKT-ANCESTORS-RECOVERY ✅ CLOSED definitivo._
