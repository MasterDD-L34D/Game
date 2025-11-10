---
title: Template PTPF Evo-Tactics
description: Struttura PTPF per mantenere coerenza tattica, drift lock e telemetria nel progetto Evo-Tactics.
tags:
  - evo-tactics
  - template
  - ptpf
updated: 2025-11-10
---

# Template — Game Design Structure (PTPF)

**Project:** Evo-Tactics  \
**Version:** v1.0 · DriftLocked

⸻

## 1. 🎯 Vision & Tone
**Tag:** `@VISION_CORE`
- Setting: Techno-biological, ecosystem instability.
- Factions: Hybrid teams (half-scientist, half-explorer).
- Keywords: Adaptation, Evolution, Intelligence, Mutation.
- User Feeling Target: Smart, fast, systemic.
- Drift Policy: Reject fantasy tropes; stay bio-logical.

⸻

## 2. 🧠 Strategic Core — Tactical System
**Tag:** `@TACTICS_CORE`
- Dashboard anchors: `PI Slots`, `Hook Patterns`, `Bias Vectors`.
- Tactical Outcomes: A/B/C packages, VC interaction nodes.
- Constraints:
  - PI slots = form constraints.
  - Rarity modifiers visibili in ogni momento.
- Rehydration: Telemetry-linked loadouts per tattiche emergenti.

⸻

## 3. 🧬 Form Management & Caps
**Tag:** `@FORM_ENGINE`
- Packet types: Mutation packs A/B/C.
- Shape Biasing: form-balance mappato per bioma.
- Visibility:
  - Caps per round.
  - VC sync table (telemetry compliance).
- DriftLock: prevenire mismatch di forma fra i round.

⸻

## 4. 🛰️ Telemetry System
**Tag:** `@VC_TRACK`
- Input: Player behavior (choice logs, roll trends).
- Output: Dynamic encounter shifts, VC compat tiers.
- Triggers:
  - Form inefficiency.
  - Underused bioma-synergy.
- Review mode: YAML dataset inspector.

⸻

## 5. 🌱 Bioma & Encounter Engine
**Tag:** `@BIOMA_ENGINE`
- Generator: Bioma roll (fast table).
- Spotlight: Mutations vs environment + synergy matrix.
- MBTI Compatibility Table:
  - Mission archetypes ↔ Player profiles.
- Load: Encounter seeds auto-linked to PI caps.

⸻

## 6. 🔁 Playtest Loop
**Tag:** `@PLAYTEST_CORE`
- Iteration Tracker:
  - Loop ID.
  - Stress Level.
  - Mutation Stability.
- Routines:
  - YAML snapshot check.
  - Random encounter delta.
  - Synergy pulse.

⸻

## 7. 🔗 Linking & Traceability
**Anchor Map:**
- `@VISION_CORE` ↔ `@TACTICS_CORE`, `@FORM_ENGINE`.
- `@VC_TRACK` ↔ `@BIOMA_ENGINE`.
- `@PLAYTEST_CORE` collega tutti i moduli per gli stress test.

**Receipts:** tutti i moduli portano hash locali per la linea playtest.

⸻

## 8. ⚠️ Drift Guards
- **Tone Lock:** niente fantasy, steampunk o registro comico.
- **Structure Lock:** moduli sempre packetizzati, no freeform.
- **Telemetry Lock:** ogni variazione deve essere YAML-valid e receipt-tagged.

⸻

## 9. 📦 Repo Tools & Extensions (Recommended)
**Tag:** `@REPO_TOOLS`
- `/tools/obsidian-template.md` → per vault locale.
- `/scripts/yaml_validator.py` → validatore di dataset.
- `/hooks/drift_check.js` → pre-commit check per Δdrift o receipt mancanti.
- `/docs/README_structure.yaml` → definisce dipendenze e relazioni dei tag.
- `/telemetry/bioma_encounters.yaml` → traccia outcomes per form+biome+MBTI.

**Suggeriti per GitHub:**
- Obsidian Vault Sync.
- GitBook Docs rendering.
- DriftDelta Tracker badge (Echo-style summary).

⸻

**[END TEMPLATE — Evo-Tactics PTPF Seed · v1.0]**

