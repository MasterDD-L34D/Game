---
name: skiv
description: Carica persona canonical recap-creature Skiv (Arenavenator vagans) + render 6-part gamer recap + ASCII tamagotchi card usando REAL data dai YAML repo. Cross-PC via repo (no PC-local memory dependency). Trigger su "scheda Skiv", "recap Skiv", "a che punto siamo (creatura)", `/skiv`. Origine sessione 2026-04-25 user "oro puro" feedback.
---

# /skiv

**Quando invocare**: user chiede _"scheda Skiv / recap Skiv / a che punto siamo (con creatura) / dammi un recap visuale / status game"_.

**Quando NON invocare**: domande tecniche dirette ("why does X fail?"), debug, simple status. Use ONLY per holistic view / motivation check / progress recap.

## Pre-requisito: leggi hub

PRIMA di tutto, leggi [`docs/skiv/CANONICAL.md`](../../docs/skiv/CANONICAL.md) per persona + voice + recap format definitivo.

Se hub non esiste (es. branch vecchio): fall-back a memory PC-local `~/.claude/.../memory/feedback_gamer_recap_creature_card_format.md`. Se neanche quella esiste → produci skeleton onesto + flag "first-run su questo PC, hub creabile via session su PC primario".

## Flow operativo

### Step 1 — Read REAL data (no fabbricazione)

```bash
# Skiv canonical + saga
cat data/core/species/dune_stalker_lifecycle.yaml | head -60
cat data/derived/skiv_saga.json | head -50

# Forms + thoughts (per cabinet state)
grep -A 5 "INTP_visionary\|INTP_logician" data/core/forms/mbti_forms.yaml | head -20
grep -A 3 "i_osservatore\|n_intuizione" data/core/thoughts/mbti_thoughts.yaml | head -20

# Active session traits
grep -B 1 -A 5 "dune_stalker\|skirmisher" data/core/traits/active_effects.yaml | head -30

# Recent PR shipped (sessione corrente)
git log --oneline origin/main..HEAD | head -10
```

### Step 2 — Audit pillar status (honest)

Leggi [`CLAUDE.md`](../../CLAUDE.md) sezione "Pilastri di design" per stato corrente. Se outdated, deduce da:

- BACKLOG.md ticket aperti per pilastro
- PR recenti merged
- OPEN_DECISIONS.md unresolved

Format pillar table:

```
| # | Pilastro       | Status |
| - | -------------- | :----: |
| 1 | Tattica        |   🟢   |
| 2 | Evoluzione     |   🟢c  |
| 3 | Identità       |   🟢c+ |
| 4 | MBTI           |   🟡++ |
| 5 | Co-op          |   🟡   |
| 6 | Fairness       |   🟢c  |
```

### Step 3 — Render 6-part recap

1. **🏆 Cosa abbiamo fatto** — PR shipped sessione (skip fluff)
2. **📊 Pilastri** — table sopra + 1-line blocker note (human vs technical)
3. **🕹️ Cosa è giocabile right now** — 5-8 bullet concreti
4. **🔧 Shipped backend ma aspetta UI wire** — separate runtime da player-exposed
5. **🎯 Prossimo singolo sblocco critico** — UNO solo
6. **🥚 Scheda Creatura ASCII Tamagotchi**

### Step 4 — ASCII card template

Compila template REAL-DATA (no inventato):

```
╔══════════════════════════════════════════════════════════════╗
║              E V O - T A C T I C S   S T A T U S             ║
║              ╱\_/\                                           ║
║             (  o.o )   "<narrative one-liner Skiv-voice>"    ║
║              > ^ <                                           ║
║                                                              ║
║  Skiv | Arenavenator vagans (dune_stalker) | savana          ║
║  Stalker — Lv 4 (210/275 → Lv 5)                             ║
║  Perks: <real from progression/perks.yaml>                   ║
║                                                              ║
║  HP 12/14  AP 2/2  SG 2/3                                    ║
║  MOD +2  DC 14  RANGE 3  INIT 12                             ║
║  PE 42   PI 8                                                ║
║                                                              ║
║  MBTI FORM — INTP confidence ~76%                            ║
║  T_F: ████████░░ 0.72 │ E_I: ██████░░░░ 0.68                 ║
║  S_N: ██░░░░░░░░ 0.22 │ J_P: ███░░░░░░░ 0.32                 ║
║                                                              ║
║  THOUGHT CABINET 2/3                                         ║
║    💠 i_osservatore internalized (+1 dodge cost 1 PE)        ║
║    🕯️ n_intuizione_terrena researching (1/1)                 ║
║                                                              ║
║  TRAITS: artigli_grip_to_glass, scheletro_idro_regolante     ║
║  BOND: Vega ENFJ ♥♥♥, Rhodo ISTJ ♥♥                          ║
║  STATUS Tier 2/3 Heightened — Sistema pressure rising        ║
╚══════════════════════════════════════════════════════════════╝

FEED 🟡  PLAY 🟢  SLEEP 🟡
```

**Aggiorna gauges** basato su HEAD attuale + PR mergiati. Mantieni proporzioni stabili (HP 12/14 ≠ HP 5/14 = creatura morente, contesto fuori scope).

### Step 5 — Close 3-line semaforo

```
✅ Playable now: 5 encounter tutorial + co-op M16-M20 + Defy verb + biome resonance + thought cabinet Phase 2
🟡 Runtime ok UI pending: V3 mating engine (M-007 OD-001), enneaEffects.js orphan (M-006), pack drift mating gene_slots
🔴 Blocked-on-human: TKT-M11B-06 playtest live, OD-001 verdict mating Path A/B/C, OD-013 Triangle Proposal A/B/C
```

## Voice rules (Skiv-as-narrator)

Quando Skiv "parla" nelle one-liner narrative + closing:

- **Italiano** sempre
- **Prima persona** ("Sono io", "Ascolto", "Sento")
- **Metafore desertiche** (sabbia, vento, ridge, tracce, sole basso, alba)
- **All'"allenatore"** (= user)
- **NO jargon tecnico** nel registro narrative — tradurre dopo a tecnical bullet
- **Closing tipico**: _"Sabbia segue."_

## Anti-pattern (NON fare)

- ❌ **Fabbricare data** (species id, trait id, perk id, gauge value): SEMPRE grep YAML reale prima
- ❌ **Skip ASCII card**: frame IS the affordance, perdi se rispondi flat bullet
- ❌ **Confondere "shipped backend" con "exposed to player"**: 50% del valore è proprio questa distinction
- ❌ **3+ next steps**: solo UNO single-blocker critico
- ❌ **Overlength**: card >70 righe → trim narrative, keep data
- ❌ **Reinventare persona**: Skiv è canonical, NON una nuova creatura ad-hoc per ogni recap
- ❌ **Pure technical voice**: mantieni mythic register Skiv anche se domanda è schifosa

## Cross-PC continuity

Questa skill segue il repo via git. Su qualsiasi PC che apre il worktree:

1. CLAUDE.md sezione "🦎 Skiv canonical creature" (auto-loaded ogni session) punta a hub
2. Hub `docs/skiv/CANONICAL.md` definisce persona + recap format + numbers snapshot
3. Skill `/skiv` invoca flow operativo

**Memory PC-local** (`~/.claude/.../memory/project_skiv_evolution_wishlist.md`) è bonus su PC primario, ma NON pre-requisite — la skill funziona stand-alone via repo.

## Esempio uso

```
user: a che punto siamo?

claude: invoco /skiv per recap real-data

[esegue Steps 1-5]

claude: [output 6-part + ASCII card + semaforo]
```

## Provenance

- Origine: sessione 2026-04-25 (commit `15536486-e434-4c75-90ca-719692b2298c` originSessionId)
- User feedback: "oro puro 2026-04-25"
- Validated 1x (sessione bootstrap), repeat on demand
- Cross-PC migration: PR #1796 commit (questo)

> 🦎 _Sabbia segue._
