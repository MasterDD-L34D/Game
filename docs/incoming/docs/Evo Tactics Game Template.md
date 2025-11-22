**PTPF TEMPLATE — GAME DESIGN STRUCTURE**
**Project:** Evo-Tactics
**Version:** v1.0 · DriftLocked

⸻

### 1. 🎯 VISION & TONE  
**Tag:** `@VISION_CORE`
- Setting: Techno-biological, ecosystem instability
- Factions: Hybrid teams (half-scientist, half-explorer)
- Keywords: Adaptation, Evolution, Intelligence, Mutation
- User Feeling Target: Smart, fast, systemic
- Drift Policy: Reject fantasy tropes; stay bio-logical

⸻

### 2. 🧠 STRATEGIC CORE: Tactical System  
**Tag:** `@TACTICS_CORE`
- Dashboard anchors: `PI Slots`, `Hook Patterns`, `Bias Vectors`
- Tactical Outcomes: A/B/C packages, VC interaction nodes
- Constraints:
  - PI slots = form constraints
  - Rarity modifiers visible at all times
- Rehydration: Telemetry-linked loadouts for emergent tactics

⸻

### 3. 🧬 FORM MANAGEMENT & CAPS  
**Tag:** `@FORM_ENGINE`
- Packet types: Mutation packs A/B/C
- Shape Biasing: form-balance mapped per bioma
- Visibility:
  - Caps per round
  - VC sync table (telemetry compliance)
- DriftLock: Prevent shape mismatch between rounds

⸻

### 4. 🛰️ TELEMETRY SYSTEM  
**Tag:** `@VC_TRACK`
- Input: Player behavior (choice logs, roll trends)
- Output: Dynamic encounter shifts, VC compat tiers
- Triggers:
  - Form inefficiency
  - Underused bioma-synergy
- Review mode: YAML dataset inspector

⸻

### 5. 🌱 BIOMA & ENCOUNTER ENGINE  
**Tag:** `@BIOMA_ENGINE`
- Generator: Bioma roll (fast table)
- Spotlight: Mutations vs environment + synergy matrix
- MBTI Compatibility Table:
  - Mission archetypes ↔ Player profiles
- Load: Encounter seeds auto-linked to PI caps

⸻

### 6. 🔁 PLAYTEST LOOP  
**Tag:** `@PLAYTEST_CORE`
- Iteration Tracker:
  - Loop ID
  - Stress Level
  - Mutation Stability
- Routines:
  - YAML snapshot check
  - Random encounter delta
  - Synergy pulse

⸻

### 7. 🔗 LINKING & TRACEABILITY  
**Anchor Map:**
- `@VISION_CORE` links → `@TACTICS_CORE`, `@FORM_ENGINE`
- `@VC_TRACK` bi-directional with `@BIOMA_ENGINE`
- `@PLAYTEST_CORE` hooks into all above for stress testing

**Receipts:** All modules carry local trace hashes for playtest lineage.

⸻

### 8. ⚠️ DRIFT GUARDS  
- TONE LOCK: Never shift toward fantasy, steampunk, or comical
- STRUCTURE LOCK: No freeform modules; always packetized
- TELEMETRY LOCK: Changes must be YAML-valid and receipt-tagged

⸻

### 9. 📦 REPO TOOLS & EXTENSIONS (Recommended)
**Tag:** `@REPO_TOOLS`
- `/tools/obsidian-template.md` → For local knowledge base
- `/scripts/yaml_validator.py` → Ensures YAML test data compliance
- `/hooks/drift_check.js` → Pre-commit check: flags Δdrift or missing receipts
- `/docs/README_structure.yaml` → Defines module dependencies and tag relations
- `/telemetry/bioma_encounters.yaml` → Tracks outcomes by form+biome+MBTI

**Suggested GitHub integrations:**
- Obsidian Vault Sync
- GitBook Docs rendering
- DriftDelta Tracker badge (Echo-style summary)

⸻

**[END TEMPLATE — Evo-Tactics PTPF Seed · v1.0]**

