---
title: Procedural Lore Generation -- standard di settore + pipeline Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-06-20'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - docs/guide/games-source-index.md
  - docs/design/evo-tactics-aliena-enforcement-lore.md
  - docs/research/2026-04-25-skiv-online-imports.md
---

# Procedural Lore Generation -- standard di settore + pipeline Evo-Tactics

Guida canonica per generare lore di creature/specie su scala combinatoria
(specie x bioma x dimensioni) da solo-dev, senza scrivere ogni voce a mano e
senza che la prosa-macchina raggiunga il player non rivista.

SoT della pipeline. Per i pattern-fonte vedi `games-source-index.md`; per il
metodo A.L.I.E.N.A. (le 6 dimensioni + lo scoring) vedi
`docs/design/evo-tactics-aliena-enforcement-lore.md`.

## Il problema

Il catalogo cresce in modo combinatorio (75+ specie x N biomi x 6 dimensioni
A.L.I.E.N.A.). Scrivere a mano ogni `content:` non scala per un solo autore. Ma
la lore generata che finisce davanti al player senza revisione = rischio
qualita'/coerenza/canon. Lo standard di settore risolve entrambi.

## Standard di settore (cosa fanno gli altri)

Pattern proven, adottati da studi solo/indie e dalla ricerca 2024-2026. Righe
catalogo in `games-source-index.md`.

- **Layered handcrafted + procedural (Wildermyth)** -- il designer scrive i
  BEAT (template + slot) una volta; il motore sostituisce le variabili
  (personaggi, relazioni, bioma) a runtime. Autoriale ma altamente variabile:
  "una trapunta di patch progettate per incastrarsi". Tu autori il SISTEMA, non
  ogni voce. ([Wikipedia](https://en.wikipedia.org/wiki/Wildermyth),
  [Vice](https://www.vice.com/en/article/pkbz78/wildermyth-review))
- **Generate-data-then-narrate / replacement grammar (Caves of Qud)** -- una
  state-machine + replacement grammar genera prima gli EVENTI/dati, poi li
  "razionalizza ex-post" in prosa nella voce del gioco; niente simulazione
  completa. CoQ usa anche Markov order-2 su un corpus (LibraryCorpus.json +
  Project Gutenberg) per libri/graffiti/sogni. La lore NARRATIVIZZA dati gia'
  esistenti, non li inventa.
  ([Game Developer](https://www.gamedeveloper.com/design/tapping-into-the-potential-of-procedural-generation-in-caves-of-qud),
  ["Generation of Mythic Biographies in Caves of Qud"](https://www.freeholdgames.com/papers/Generation_of_mythic_biographies_in_Cavesofqud.pdf),
  [Qud wiki: Markov chain](https://wiki.cavesofqud.com/wiki/Markov_chain))
- **Grammar-constrained decoding (layer LLM opzionale)** -- quando un LLM
  rifinisce la prosa, lo si VINCOLA a uno schema: a ogni token la grammatica
  maschera i token non-validi (probabilita' zero) -> output sempre
  schema-conforme. Tooling: GBNF in llama.cpp (auto-converte JSON Schema ->
  grammar), Outlines / LLGuidance (logit processor), vLLM `guided_json` /
  `guided_grammar` / `guided_regex` (backend XGrammar/Outlines).
  ([llama.cpp grammar](https://deepwiki.com/ggml-org/llama.cpp/8.1-grammar-and-structured-output),
  [Grammar-Constrained Generation 2026](https://tianpan.co/blog/2026-04-16-grammar-constrained-generation-output-reliability))
- **Human-in-the-loop (HITL) review-gate** -- generazione e verifica restano
  DECOUPLED; risk-tiering (low-risk = spot-check, high-priority = revisione
  strutturata + sign-off); "come il gate `require_review` in una pipeline
  CI/CD". La prosa generata e' un draft finche' un umano non firma.
  ([HITL systematic review, MDPI](https://www.mdpi.com/1099-4300/28/4/377),
  [Guild.ai: Human-in-the-Loop](https://www.guild.ai/glossary/human-in-the-loop))
- **Dependency pipeline + structured-JSON** -- generazione multi-stage dove ogni
  stage e' condizionato sull'output strutturato del precedente, per coerenza.
  ([arXiv 2604.25482](https://arxiv.org/html/2604.25482v1))

## Architettura Evo-Tactics (3 livelli)

Mappa 1:1 sugli standard sopra. Riusa l'infra Tracery gia' nel repo
(`tools/py/skiv_tracery.py`, 131->662 voci combinatorial su Skiv).

1. **Slot-fill deterministico (replacement grammar)** --
   `tools/py/codex_aliena_lore_gen.py`. Narrativizza i dati strutturati di una
   creatura (`codex_entry.lore_vars`: bioma, role_trofico, morfotipo, job,
   ecc.) nelle 6 `content:` A.L.I.E.N.A. via story-grammar. Picker
   hashlib-stabile = riproducibile cross-run (il builtin `hash()` Python e'
   randomizzato per-processo, non replay-safe). [= Wildermyth + Caves of Qud]
2. **Grammar autorato (layer handcrafted)** --
   `data/codex/_grammar/aliena_lore.json`. Le regole Tracery sono il SISTEMA che
   master-dd rifinisce (voce, varianti/dimensione). Slot-articolo-safe (es.
   "per il ruolo di #job#", non "per il #job#"). [= layer handcrafted Wildermyth]
3. **HITL review-gate** -- `tools/js/promote_codex_draft.js`
   (`evaluateDraft()`). Rifiuta ogni draft con `lore_review_status` PRESENTE e
   != `human_reviewed`: la prosa-macchina non raggiunge MAI il player senza
   curatela. Generazione/verifica decoupled; il flag e' il `require_review`.
   [= HITL standard]

Il layer LLM-constrained (grammar-constrained decoding su modello locale Ollama,
Phi-4-mini / Qwen3 / Mistral Small 3) e' un'estensione OPZIONALE del livello 1
per rifinire la prosa restando schema-valido + secret-invariant: NON ancora
implementato (vedi BACKLOG).

## Workflow autoriale (chiudere una voce codex)

```
# 1. aggiungi il blocco lore_vars (factual, dai dati specie) al draft
#    data/codex/_drafts/<id>.yaml
# 2. genera la bozza
PYTHONPATH=tools/py python tools/py/codex_aliena_lore_gen.py \
    data/codex/_drafts/<id>.yaml            # review mode (stampa)
PYTHONPATH=tools/py python tools/py/codex_aliena_lore_gen.py \
    data/codex/_drafts/<id>.yaml --out <path>   # scrive bozza pending-review
# 3. RIVEDI/EDITA la prosa -> imposta lore_review_status: human_reviewed
#    (o rimuovi il campo)
# 4. promuovi (il gate rifiuta finche' pending)
node tools/js/promote_codex_draft.js <id>
#    -> sposta data/codex/_drafts/<id>.yaml -> data/codex/<id>.yaml
#    il loader (apps/backend/services/codex/codexEntries.js) globba
#    data/codex/*.yaml FLAT -> la voce diventa servita + sbloccabile in-flow
# 5. npm run test:api (HA2 validate_codex_aliena) + commit
```

PoC di riferimento: `predoni_nomadi` (PR #2907).

## Boundary + invarianti (HITL standard applicato)

- **Decoupled generation/verification**: il generatore PROPONE (draft), l'umano
  RATIFICA (review-gate). Mai auto-promote di prosa-macchina.
- **Risk-tiering**: ogni voce e' high-priority (player-facing canon) -> sign-off
  obbligatorio (no spot-check). Il gate impone il sign-off via
  `lore_review_status`.
- **Secret invariant (SPEC-H sez.8)**: il generatore SCRUB-a ricorsivamente i
  campi score engine-only (aggregate / sub_scores / coherence /
  enforcement_factor) -> mai serializzati in un draft player-facing.
- **Author owns the voice**: il grammar (`aliena_lore.json`) e' uno scaffold
  SDMG che master-dd rifinisce; la prosa finale e' curatela umana.
- **Replay-safe**: stesso `(id, dim)` -> stesso output (diff git stabili).

## Cross-repo

Questa pipeline vive in **Game** (backend + tooling + data). Le superfici la
consumano:

- **Game** (questo repo) -- SoT: generatore, grammar, gate, draft, loader,
  validator HA2. Questa guida = canonical.
- **Game-Godot-v2** -- SURFACE: rende le voci codex sbloccate (tab "Specie",
  unlock-through-play). Il contenuto e' generated-then-reviewed lato Game; Godot
  non genera lore. Pointer: `docs/godot-v2/codex-lore-source.md`.
- **Game-Database** -- TAXONOMY CMS: importa specie/tratti/biomi build-time. Le
  voci codex restano in Game (`data/codex/`), NON nel DB. Pointer:
  `docs/reference/codex-lore-source.md`.

## Riferimenti

- Ricerca social (last30days, 2026-06-20): segnale niche sottile, sostanza nella
  letteratura -- raw: `~/Documents/Last30Days/procedural-creature-lore-generation-for-large-combinatorial-species-spaces-raw-v3.md`.
- Games Source Index (pattern catalog): `docs/guide/games-source-index.md`.
- A.L.I.E.N.A. enforcement (metodo + scoring): `docs/design/evo-tactics-aliena-enforcement-lore.md`.
- Tracery/QBN import: `docs/research/2026-04-25-skiv-online-imports.md`.
- Dependency-driven RPG generation: [arXiv 2604.25482](https://arxiv.org/html/2604.25482v1).
- Grammar-constrained decoding: [arXiv 2403.06988](https://arxiv.org/html/2403.06988v1).
