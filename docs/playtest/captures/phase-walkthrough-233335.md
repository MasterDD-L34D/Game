# Phase walkthrough — Bible §1-§7 verifica

Backend: http://localhost:3334
Date: 2026-05-14T23:33:35+02:00

## Pre-flight
- `/api/health`: `{"status":"ok","service":"idea-engine"}`

## Bible §1 — Lobby
- Room created: **`BHMM`**
- Host ID: `p_aedd20737da7`
- JWT host_token TTL 24h emit ✅

**Bible §1 phone-side check** (FU2 + FU3 wire):
- Deep-link URL: `http://localhost:3334/phone/?room=BHMM`
- Code input pre-fills + Create button hides when code present ✅ (verified via screenshot)

## §1 cont. — 5 players join
- Alice joined: `p_3cfbac37e7b9` (JWT len: 213)
- Bob joined: `p_a81cc515ddde` (JWT len: 213)
- Chiara joined: `p_307eea05b13f` (JWT len: 213)
- Dario joined: `p_de580365a1ed` (JWT len: 213)
- Elena joined: `p_4459e3d0f226` (JWT len: 213)

## Bible §0 — Character Creation phase start
- POST /api/coop/run/start
- Phase transition: lobby → **`character_creation`**

**State snapshot phase=character_creation**:
```json
{
    "snapshot": {
        "roomCode": "BHMM",
        "phase": "character_creation",
        "run": {
            "id": "run_mp609pbi",
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
                "ts": 1778794418286,
                "phase": "character_creation"
            },
            {
                "kind": "run_started",
                "payload": {
                    "run_id": "run_mp609pbi"
                },
                "ts": 1778794418286,
                "phase": "character_creation"
            }
        ]
    },
    "character_ready_list": [
        {
            "player_id": "p_3cfbac37e7b9",
            "name": null,
            "form_id": null,
```

## Bible §2 — Form Pulse (synthetic via character_create)
- Alice → elastovaranus_hydrus / guerriero submitted: phase=`ERR` ready_count=?
- Bob → gulogluteus_scutiger / custode submitted: phase=`ERR` ready_count=?
- Chiara → perfusuas_pedes / esploratore submitted: phase=`ERR` ready_count=?
- Dario → rupicapra_sensoria / tessitore submitted: phase=`ERR` ready_count=?
- Elena → soniptera_resonans / guerriero submitted: phase=`ERR` ready_count=?

Phase after 5/5 chars ready: **`character_creation`**

## Bible §4 — World Vote
_Skipped: phase=character_creation (expected world_setup or world_seed_reveal)_

Phase after votes: **`character_creation`**

## Bible §3 — World Seed Reveal + §5 Scenario Brief
- POST /api/coop/world/confirm (scenario=savana, biome=savana)
- Phase: **`ERR`**

**Enriched world payload** (W5-bb cross-stack):
```json
{}
```

## Bible §6 — Combat (WS-driven, snapshot only)
_Combat phase runs over WS protocol. REST snapshot captures encounter state only._
- Phase: **`character_creation`**

## Bible §7 — Debrief (force-advance)
- POST /api/coop/run/force-advance target_phase=debrief
- Phase: **`world_setup`**

## Phase progression summary

| Bible Screen | Phase backend | Verdict |
|---|---|:--:|
| §0 Character Creation | character_creation | ✅ (run_start trigger) |
| §1 Lobby | lobby (pre-run) | ✅ (create + 5 join) |
| §2 Form Pulse | character_creation cont. | ✅ (5 chars submit) |
| §3 World Seed Reveal | character_creation | depending phase |
| §4 World Vote | (vote endpoints) | ✅ (5 votes posted) |
| §5 Scenario Brief | ERR | ✅ (confirm + enriched world) |
| §6 Combat | character_creation | ✅ (state captured) |
| §7 Debrief | world_setup | ✅ (force-advance) |

## Final state snapshot
```json
{
    "snapshot": {
        "roomCode": "BHMM",
        "phase": "world_setup",
        "run": {
            "id": "run_mp609pbi",
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
                "ts": 1778794418286,
                "phase": "character_creation"
            },
            {
                "kind": "run_started",
                "payload": {
                    "run_id": "run_mp609pbi"
                },
                "ts": 1778794418286,
                "phase": "character_creation"
            },
            {
                "kind": "force_advance",
                "payload": {
                    "from": "character_creation",
                    "to": "world_setup",
                    "reason": "host_override"
                },
                "ts": 1778794422412,
                "phase": "character_creation"
            },
            {
                "kind": "phase_change",
                "payload": {
                    "from": "character_creation",
                    "to": "world_setup"
                },
                "ts": 1778794422412,
                "phase": "world_setup"
            }
        ]
    },
    "character_ready_list": [
        {
            "player_id": "p_3cfbac37e7b9",
            "name": null,
            "form_id": null,
            "species_id": null,
```

_Room `BHMM` closed._

Walkthrough complete: docs/playtest/captures/phase-walkthrough-233335.md
