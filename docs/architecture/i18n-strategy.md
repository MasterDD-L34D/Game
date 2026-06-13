---
title: 'Localization (i18n) Strategy — it + en'
doc_status: active
doc_owner: frontend-team
workstream: atlas
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Localization Strategy — it + en

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T1.5)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A6 (SoT §19 Q3 — "Localizzazione: it + en al lancio")

## Scope lancio

- **Lingue**: Italiano (primary), English (launch day 1)
- **Non-goal al lancio**: altre lingue (de/fr/es/pt/ja/zh) — post-launch
- **Docs**: già bilingual (it-en) in molti casi, no change necessario

## Struttura filesystem

```
data/i18n/
  it/
    common.json          # UI chrome (menu/settings/ui)
    combat.json          # combat strings (future split)
    tutorial.json        # tutorial strings (future split)
    narrative.json       # Ink narratives (future split)
  en/
    common.json
    combat.json
    tutorial.json
    narrative.json
  _schema/
    i18n.schema.json     # namespace structure validation
```

**Namespace per dominio** (non singolo file monolitico):

- `common` — UI chrome, menu, errors, status (shared)
- `combat` — strings in-match (round, hit, damage, ecc.)
- `tutorial` — strings onboarding specifici
- `narrative` — dialoghi/briefing Ink (managed separately via `.ink.json`)

## Format

JSON flat con nesting di max 2-3 livelli. Non YAML (facile tooling + runtime parse).

```json
{
  "_meta": { "locale": "it", "completion_percent": 5 },
  "namespace": {
    "key": "valore",
    "with_param": "Ciao {{name}}"
  }
}
```

### Interpolation

Mustache-style `{{variable}}`:

```
"hp_remaining": "HP: {{current}} / {{max}}"
```

### Pluralization (future)

ICU message format quando richiesto:

```
"creatures_defeated": "{count, plural, =0 {Nessuna creatura} one {1 creatura} other {# creature}} sconfitte"
```

Non necessario al lancio per it/en (english pluralization semplice).

## Runtime loading

Proposta (frontend):

```javascript
// apps/dashboard/src/i18n/loader.js (post-approval)
async function loadLocale(locale = 'it') {
  const namespaces = ['common', 'combat', 'tutorial'];
  const bundles = await Promise.all(
    namespaces.map((ns) => fetch(`/data/i18n/${locale}/${ns}.json`).then((r) => r.json())),
  );
  return namespaces.reduce((acc, ns, i) => ({ ...acc, [ns]: bundles[i] }), {});
}

function t(key, params = {}) {
  // Resolve "combat.hit" → lookup bundle
  // Apply {{param}} interpolation
}
```

## Scaffolding attuale (PR-1, in Q-001)

- `data/i18n/it/common.json` — seed ~85 key
- `data/i18n/en/common.json` — seed ~85 key (parity)
- Completion tracking in `_meta.completion_percent`

## Delivery roadmap

| Step       | Scope                                 | Branch               | Effort |
| ---------- | ------------------------------------- | -------------------- | ------ |
| PR-1 (qui) | Scaffold common.json it+en            | Q-001                | S      |
| PR-2       | Schema validator + CI parity check    | feat/i18n-validation | S      |
| PR-3       | Loader + t() helper                   | feat/i18n-runtime    | M      |
| PR-4       | Migrate hardcoded strings → t() in UI | feat/i18n-migration  | L      |
| PR-5       | combat.json + tutorial.json content   | feat/i18n-combat     | M      |
| PR-6       | Narrative Ink bilingual export        | feat/i18n-narrative  | M      |

## Validation CI (PR-2)

- Verifica parity chiavi fra tutti i locale (it deve avere stesse chiavi di en e viceversa)
- Verifica nessun `TODO` o `MISSING` in valori
- Verifica interpolation params coerenti fra locale
- Warning se `completion_percent` < 90% prima di release gate

## Key naming convention

- **snake_case** per chiavi
- **namespace.subnamespace.key** max 3 livelli
- Evitare strings lunghi come chiavi: `ui.confirm` ✅ vs `ui.are_you_sure_you_want_to_delete` ❌ → usa key parlante breve e inserisci full text in value
- Per UI ripetuta usa chiavi shared in `common.ui` (es. `common.ui.confirm`)

## Content guidelines

### Italian (primary)

- **Tono**: diretto, tattico. No "Vi prego" / "Gentilmente". Imperativi OK ("Attacca", "Muovi")
- **Sistema** (il Sistema = antagonista): sempre maiuscolo, article "il"
- **Creature**: sempre femminile nouns quando generico ("la creatura", "le creature")
- **PT** = Punti Tattici (non tradurre al sigla)
- **MoS** = Margine di Successo (OK come sigla)
- **HP** = OK come sigla

### English

- **Tone**: direct, tactical. No fluff. Imperatives OK
- **System** (the System): capitalized
- **PT** = Tactical Points (keep "PT" as acronym for consistency with Italian)
- **MoS** = Margin of Success

## Glossary critico

| IT                  | EN                   | Note               |
| ------------------- | -------------------- | ------------------ |
| Creatura            | Creature             | femminile/neutral  |
| Sistema             | System               | sempre capitalized |
| Nido                | Nest                 | meta-loop term     |
| Tratto / Tratti     | Trait / Traits       | —                  |
| Turno               | Turn                 | —                  |
| Round               | Round                | invariato          |
| Punti Tattici (PT)  | Tactical Points (PT) | sigla invariata    |
| Margine di Successo | Margin of Success    | entrambe usano MoS |
| Obiettivo           | Objective            | —                  |
| Bioma               | Biome                | —                  |
| Senzienza           | Sentience            | —                  |

## Decisione Master DD (2026-04-17) — Q-001 T1.5

- Path: **DATA** — `data/i18n/` confermato (coerente con altri dataset)
- Namespace split: **SI** — common/combat/tutorial/narrative
- Format: **JSON** — no YAML per runtime speed
- Interpolation: **MUSTACHE** — ICU rimandato a post-launch se serve pluralization complex
- Priorità: **PR-2** prima (CI validation parity check) → poi PR-3 runtime

Follow-up branch sequenza: `feat/i18n-validation` → `feat/i18n-runtime` → `feat/i18n-migration`.
