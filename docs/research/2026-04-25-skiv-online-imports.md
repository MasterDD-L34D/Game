---
title: Skiv online imports — reference + ROI evaluation
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 90
tags: [skiv, research, imports, npm, cc0, optimization]
---

# Skiv online imports — reference + ROI

## Scope

Inventario risorse online riusabili per ottimizzare effort Skiv-monitor evolution. Ogni voce: ROI 1-5, npm dep cost, alternative inline.

## High-ROI imports — SHIPPED inline (no npm dep)

### 1. Tracery seeded grammar (galaxykate/tracery)

- **Source**: [tracery-grammar npm](https://www.npmjs.com/package/tracery-grammar) · [galaxykate/tracery GitHub](https://github.com/galaxykate/tracery)
- **License**: Apache 2.0
- **ROI**: 5/5
- **Pattern**: dict[symbol, list[templates]] + `#sym#` reference + seeded RNG → combinatorial expansion
- **Adopted as**: [tools/py/skiv_tracery.py](../../tools/py/skiv_tracery.py) (~150 LOC inline Python)
- **Voices effective**: 131 static → **662 combinatorial** (+400%)
- **Determinism**: hash(seed + symbol + depth) — replay-safe

### 2. SimpleQBN storylet selector (videlais/simple-qbn)

- **Source**: [videlais/simple-qbn GitHub](https://github.com/videlais/simple-qbn) · [SimpleQBN docs](https://videlais.github.io/simple-qbn/)
- **License**: MIT
- **ROI**: 4/5
- **Pattern**: storylets in YAML/JSON + `requires` predicates + `salience` priority + tie-break by id
- **Adopted as**: [tools/py/skiv_qbn.py](../../tools/py/skiv_qbn.py) + [data/core/narrative/skiv_storylets.yaml](../../data/core/narrative/skiv_storylets.yaml)
- **Storylets**: 14 (replaceable hardcoded `WEEKLY_DIGEST_TEMPLATES`)
- **Predicates**: `gte`, `lte`, `gt`, `lt`, `eq`, `ne`, `in`

### 3. Conventional Commits parser (conventionalcommits.org)

- **Source**: [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)
- **License**: spec public
- **ROI**: 3/5
- **Pattern**: `<type>[(scope)][!]: <description>` regex
- **Adopted as**: `parse_conventional_commit()` in [tools/py/skiv_monitor.py](../../tools/py/skiv_monitor.py)
- **Type expand**: feat/fix/chore/docs/style/refactor/perf/test/build/ci/revert — accurate categorization
- **Bonus**: breaking change (`!`) → +1 stress

## Medium-ROI imports — DEFERRED (require npm dep approval)

### 4. @octokit/webhooks-types

- **Source**: [@octokit/webhooks-types npm](https://www.npmjs.com/package/@octokit/webhooks-types)
- **License**: MIT
- **ROI**: 3/5
- **Why deferred**: `apps/backend/routes/skiv.js` `buildFeedEntryFromWebhook()` works without typed payload. Adding types = correctness gain, not feature.
- **Future shipping**: when npm dep approval available, swap manual property access with typed `IssuesOpenedEvent`/`PullRequestClosedEvent` interfaces.

### 5. @octokit/webhooks (Node.js handler)

- **Source**: [octokit/webhooks.js GitHub](https://github.com/octokit/webhooks.js/)
- **License**: MIT
- **ROI**: 2/5 (already inline `verifyWebhookSignature` works)
- **Why deferred**: HMAC verify minimal, ~10 LOC inline. octokit dep adds 50KB for 1 function.

## CC0 art assets — REFERENCE (hand-craft SVG already shipped)

### 6. OpenGameArt CC0 sprites

- **Source**: [opengameart.org/content/cc0-resources](https://opengameart.org/content/cc0-resources) · [opengameart 32x32 CC0 JRPG](https://opengameart.org/content/32x32-cc0-jrpg-ish-style)
- **License**: CC0 (no attribution required)
- **ROI**: 4/5 (visual quality boost)
- **Status**: 5 SVG hand-craft già shipped in [apps/play/public/skiv/](../../apps/play/public/skiv/) (PR #1845). Raster fallback può esser aggiunto post.
- **Future shipping** (manual download required, WebFetch returns thumbnails only):
  - 5 lizard/reptile sprites (one per fase: hatchling/juvenile/mature/apex/legacy)
  - Commit a `apps/play/public/skiv/raster/` con `CREDITS.txt` (CC0 attribution log)
  - `<picture>` element in `skivPanel.js` per rendering preferenziale raster vs SVG fallback

### 7. Liberated Pixel Cup (LPC) assets

- **Source**: [LPC opengameart](https://lpc.opengameart.org/) · [LPC reptile expansion](https://opengameart.org/content/cc0-resources)
- **License**: CC-BY-SA 3.0 + GPL 3.0 (NOT CC0 — attribution + share-alike)
- **ROI**: 3/5 (license overhead)
- **Why deferred**: dual-license più complesso di CC0. Per ora skip.

## Low-ROI / skipped

| Risorsa                        | Motivo skip                                      |
| ------------------------------ | ------------------------------------------------ |
| Storyboard (lazerwalker)       | Alpha, non su npm                                |
| TinyQBN                        | Twine/SugarCube specific (not standalone JS)     |
| Pixilart Tamagotchi sprites    | Non CC0 (UGC license unclear)                    |
| Freepik vectors                | Attribution required, non sempre commercial-safe |
| ChronicleHub QBN               | Not released open source                         |
| Tamagotchi On official sprites | Copyright Bandai (NO)                            |

## ROI totale shipped (questa sessione)

| Wave | Pattern                     | LOC           | Voices/Storylets             | ROI |
| ---- | --------------------------- | ------------- | ---------------------------- | --- |
| A1   | Tracery inline              | 150           | 662 voices effective         | 5/5 |
| A2   | QBN storylet engine         | 100 + 14 YAML | 14 storylets                 | 4/5 |
| A3   | Conventional Commits parser | 30 LOC delta  | accurate type categorization | 3/5 |

**Net effort save**: ~6h reduction effort future content authoring (tracery combinatorial + QBN data-driven vs hardcoded templates).

## Cross-references

- Persona canonical: [docs/skiv/CANONICAL.md](../skiv/CANONICAL.md)
- Web research prior art: [docs/research/2026-04-25-skiv-prior-art-web.md](2026-04-25-skiv-prior-art-web.md)
- Narrative arc research: [docs/research/2026-04-25-skiv-narrative-arc-research.md](2026-04-25-skiv-narrative-arc-research.md)
- Monitor source: [tools/py/skiv_monitor.py](../../tools/py/skiv_monitor.py)

## Sources

- [tracery-grammar npm](https://www.npmjs.com/package/tracery-grammar)
- [galaxykate/tracery GitHub](https://github.com/galaxykate/tracery)
- [SimpleQBN docs](https://videlais.github.io/simple-qbn/)
- [videlais/simple-qbn GitHub](https://github.com/videlais/simple-qbn)
- [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)
- [@octokit/webhooks-types](https://www.npmjs.com/package/@octokit/webhooks-types)
- [octokit/webhooks.js](https://github.com/octokit/webhooks.js/)
- [OpenGameArt CC0 resources](https://opengameart.org/content/cc0-resources)
- [Tracery deterministic seeded RNG](https://www.andrewzigler.com/blog/sculpting-generative-text-with-tracery/)
- [QBN design analysis (Bruno Dias)](https://brunodias.dev/2017/05/30/an-ideal-qbn-system.html)
- [Storylets you want them (Emily Short)](https://emshort.blog/2019/11/29/storylets-you-want-them/)

🦎 _Sabbia segue. Imports valutati, top 3 shippati inline (zero deps preserved)._
