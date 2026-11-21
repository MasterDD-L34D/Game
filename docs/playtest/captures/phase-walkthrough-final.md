# Phase walkthrough — Bible §1-§7 verifica

Backend: http://localhost:3334
Date: 2026-05-14T23:36:32+02:00

## Pre-flight

- `/api/health`: `{"status":"ok","service":"idea-engine"}`

## Bible §1 — Lobby

- Room created: **`KRTC`**
- Host ID: `p_0040eb9042bc`
- JWT host_token TTL 24h emit ✅

**Bible §1 phone-side check** (FU2 + FU3 wire):

- Deep-link URL: `http://localhost:3334/phone/?room=KRTC`
- Code input pre-fills + Create button hides when code present ✅ (verified via screenshot)

## §1 cont. — 5 players join

- Alice joined: `p_d39e57cdbc88` (JWT len: 213)
- Bob joined: `p_8830ebd800ce` (JWT len: 213)
- Chiara joined: `p_ed16e199663f` (JWT len: 213)
- Dario joined: `p_4639769cb2e8` (JWT len: 213)
- Elena joined: `p_5ee561977c17` (JWT len: 213)

## Bible §0 — Character Creation phase start

- POST /api/coop/run/start
- Phase transition: lobby → **`character_creation`**

**State snapshot phase=character_creation**:

```json
{
    "snapshot": {
        "roomCode": "KRTC",
        "phase": "character_creation",
        "run": {
            "id": "run_mp60dig7",
            "scenarioStack": [
                "enc_tutorial_01"
            ],
            "currentIndex": 0,
            "partyXp": 0,
            "partyPi": 0,
            "outcome": null
        },
        "characters": [],
        "log": [
            {
                "kind": "phase_change",
                "payload": {
                    "from": "lobby",
                    "to": "character_creation"
                },
                "ts": 1778794596007,
                "phase": "character_creation"
            },
            {
                "kind": "run_started",
                "payload": {
                    "run_id": "run_mp60dig7"
                },
                "ts": 1778794596007,
                "phase": "character_creation"
            }
        ]
    },
    "character_ready_list": [
        {
            "player_id": "p_d39e57cdbc88",
            "name": null,
            "form_id": null,
```

## Bible §2 — Form Pulse (synthetic via character_create)

- Alice → elastovaranus_hydrus / guerriero submitted: phase=`character_creation` ready_count=1
- Bob → gulogluteus_scutiger / custode submitted: phase=`character_creation` ready_count=2
- Chiara → perfusuas_pedes / esploratore submitted: phase=`character_creation` ready_count=3
- Dario → rupicapra_sensoria / tessitore submitted: phase=`character_creation` ready_count=4
- Elena → soniptera_resonans / guerriero submitted: phase=`world_setup` ready_count=5

Phase after 5/5 chars ready: **`world_setup`**

## Bible §4 — World Vote

- Alice vote scenario=savana accept=true: phase=`world_setup`
- Bob vote scenario=savana accept=true: phase=`world_setup`
- Chiara vote scenario=savana accept=true: phase=`world_setup`
- Dario vote scenario=savana accept=true: phase=`world_setup`
- Elena vote scenario=savana accept=true: phase=`world_setup`

Phase after votes: **`world_setup`**

## Bible §3 — World Seed Reveal + §5 Scenario Brief

- POST /api/coop/world/confirm (scenario=savana, biome=savana)
- Phase: **`combat`**

**Enriched world payload** (W5-bb cross-stack):

```json
{
  "world": {
    "biome_id": "savana",
    "biome_label_it": "Savana Ionizzata",
    "pressure": "medium",
    "hazards": [
      "tempeste_ioniche_e_sabbia_vetrificata_che_erodono_equipaggiamento",
      "termico",
      "luminescente",
      "spore_diluite",
      "sabbia"
    ]
  },
  "ermes": {
    "eco_pressure_score": 0.62,
    "bias": {
      "predator_density": 0.7,
      "resource_scarcity": 0.55
    },
    "role_gap": {
      "esploratore": 0,
      "guerriero": 1,
      "custode": 1,
      "tessitore": 1
    }
  },
  "custode": {
    "display_name": "Tiro",
    "species_id": "dune_stalker",
    "biome_origin_id": "savana",
    "voice_it": "Allenatore, il vento porta odori da tre dune di distanza.",
    "opening_line": "Allenatore, il vento porta odori da tre dune di distanza.",
    "closing_ritual": "Sabbia segue.",
    "voice_modifier": "",
    "ennea_archetype": "Cacciatore"
  }
}
```

## Bible §6 — Combat (WS-driven, snapshot only)

_Combat phase runs over WS protocol. REST snapshot captures encounter state only._

- Phase: **`combat`**

## Bible §7 — Debrief (via combat/end)

- POST /api/coop/combat/end outcome=victory xp=100
- Phase: **`debrief`**

## §7 cont. — Debrief choices (lineage_keep)

- Alice choice=lineage_keep: phase=`debrief`
- Bob choice=lineage_keep: phase=`debrief`
- Chiara choice=lineage_keep: phase=`debrief`
- Dario choice=lineage_keep: phase=`debrief`
- Elena choice=lineage_keep: phase=`ended`

## Phase progression summary

| Bible Screen          | Phase backend            |            Verdict            |
| --------------------- | ------------------------ | :---------------------------: |
| §0 Character Creation | character_creation       |    ✅ (run_start trigger)     |
| §1 Lobby              | lobby (pre-run)          |     ✅ (create + 5 join)      |
| §2 Form Pulse         | character_creation cont. |      ✅ (5 chars submit)      |
| §3 World Seed Reveal  | world_setup              |        depending phase        |
| §4 World Vote         | (vote endpoints)         |      ✅ (5 votes posted)      |
| §5 Scenario Brief     | combat                   | ✅ (confirm + enriched world) |
| §6 Combat             | combat                   |      ✅ (state captured)      |
| §7 Debrief            | debrief                  |      ✅ (force-advance)       |

## Final state snapshot

```json
{
    "snapshot": {
        "roomCode": "KRTC",
        "phase": "ended",
        "run": {
            "id": "run_mp60dig7",
            "scenarioStack": [
                "savana"
            ],
            "currentIndex": 1,
            "partyXp": 100,
            "partyPi": 0,
            "outcome": "victory"
        },
        "characters": [
            {
                "player_id": "p_d39e57cdbc88",
                "name": "Alice",
                "form_id": "form_entj_a01",
                "species_id": "elastovaranus_hydrus",
                "job_id": "guerriero",
                "traits": [],
                "ready": true,
                "submitted_at": 1778794596661
            },
            {
                "player_id": "p_8830ebd800ce",
                "name": "Bob",
                "form_id": "form_isfj_b01",
                "species_id": "gulogluteus_scutiger",
                "job_id": "custode",
                "traits": [],
                "ready": true,
                "submitted_at": 1778794597070
            },
            {
                "player_id": "p_ed16e199663f",
                "name": "Chiara",
                "form_id": "form_enfp_c01",
                "species_id": "perfusuas_pedes",
                "job_id": "esploratore",
                "traits": [],
                "ready": true,
                "submitted_at": 1778794597476
            },
            {
                "player_id": "p_4639769cb2e8",
                "name": "Dario",
                "form_id": "form_intj_d01",
                "species_id": "rupicapra_sensoria",
                "job_id": "tessitore",
                "traits": [],
                "ready": true,
                "submitted_at": 1778794597881
            },
            {
                "player_id": "p_5ee561977c17",
                "name": "Elena",
                "form_id": "form_estp_e01",
                "species_id": "soniptera_resonans",
```

_Room `KRTC` closed._

Walkthrough complete: docs/playtest/captures/phase-walkthrough-final.md
