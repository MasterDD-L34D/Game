#!/usr/bin/env python3
"""Batch calibration runner -- enc_badlands_ambient_01 (S1 2026-06-18 ambient, rubrospina + ferriscroba).

Copy of batch_calibrate_hardcore06.py retargeted to the badlands 01 scenario.
The enemy roster is derived by ecologyCombatAdapter from real badlands species
(no apex boss). Greedy player policy (atk-closest), AI auto. N=30 default.
Target band: win_rate [0.70, 1.00] (winnable floor; designed-winnable, NOT a balance-oracle) (encounter_class 'badlands_ambient', damage_curves.yaml).

Differences vs hardcore06:
  - SCENARIO_ID = enc_badlands_ambient_01
  - run_one sends encounter_class='badlands_ambient' in /session/start body so the backend
    applies the badlands_ambient class multiplier -- this makes calibration
    mirror real play, where the scenario's encounter_class resolves to 'badlands_ambient'.
    (hardcore06 omitted it and silently ran at the 'standard' default 1.2x.)
  - CHANNEL_EXPLOIT_MAP empty: no boss/elite vuln mapping; all attacks 'fisico'.
  - default --encounter-class 'badlands_ambient'.

PERF / HANG NOTE (2026-05-21): default --host uses 127.0.0.1, NOT "localhost".
The backend binds IPv4 (0.0.0.0); on Windows "localhost" resolves IPv6 ::1 first
and Python urllib (no Happy-Eyeballs) stalls ~2s per request before IPv4 fallback
(~28 calls/run x 2s = ~56s/run vs ~0.7s/run). That per-call stall is what made a
shard look like it "hangs" after ~7 sessions. Always pass an IP host, not a name.
"""

import argparse
import json
import os
import random
import re
import statistics
import sys
import time
import urllib.error
import urllib.request

import calibrate_policies

SCENARIO_ID = "enc_badlands_ambient_01"
ENCOUNTER_CLASS = "badlands_ambient"  # sent in /session/start body (backend class mult resolution)
MAX_ROUNDS = 40
DEFAULT_HOST = "http://127.0.0.1:3341"  # IP not "localhost" (Windows IPv6 stall, see module docstring)
# 2026-05-21 no-op-bug fix (OD-032): honor DAMAGE_CURVES_PATH env so the batch
# CLIENT reads the SAME staging file the backend reads. Without this the client's
# load_turn_limit_defeat / scenario-override parser always read production, making
# staging-writer scenario_overrides (turn_limit_defeat_override, enemy_damage...)
# a SILENT NO-OP on the client side during Optuna/MAP-Elites calibration.
DAMAGE_CURVES_PATH = os.environ.get("DAMAGE_CURVES_PATH") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "core", "balance", "damage_curves.yaml"
)


def load_target_bands(encounter_class):
    """M7-#2 Phase D: legge target_bands da damage_curves.yaml via
    mini-YAML parser stdlib-only (no PyYAML dep).

    Ritorna dict {win_rate:[lo,hi], defeat_rate:[lo,hi], timeout_rate:[lo,hi]}
    o None se class non trovata.
    """
    if not os.path.exists(DAMAGE_CURVES_PATH):
        return None
    try:
        with open(DAMAGE_CURVES_PATH, "r", encoding="utf-8") as f:
            raw = f.read()
    except OSError:
        return None

    # Mini parser: cerca blocco "encounter_classes:" -> <class>: -> target_bands:
    # Pattern compact. Usa regex line-based (YAML semplice, non flow).
    lines = raw.splitlines()
    idx_class = None
    in_classes = False
    class_indent = None
    for i, line in enumerate(lines):
        if line.startswith("encounter_classes:"):
            in_classes = True
            continue
        if not in_classes:
            continue
        # Match "  <name>:"
        m = re.match(r"^(\s+)(\w+):\s*$", line)
        if m and m.group(2) == encounter_class:
            idx_class = i
            class_indent = len(m.group(1))
            break
        # Break out if top-level section ended.
        if line and not line.startswith(" ") and not line.startswith("#"):
            break
    if idx_class is None:
        return None

    # Scan subsequent lines for target_bands block.
    bands = {}
    j = idx_class + 1
    while j < len(lines):
        line = lines[j]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            j += 1
            continue
        # End of class block = indent <= class_indent.
        if line and len(line) - len(line.lstrip()) <= class_indent:
            break
        if "target_bands:" in line:
            # Parse 3 following indented lines.
            k = j + 1
            while k < len(lines):
                bl = lines[k]
                bstripped = bl.strip()
                if not bstripped or bstripped.startswith("#"):
                    k += 1
                    continue
                # Expect "      win_rate: [lo, hi]"
                bm = re.match(r"^\s+(\w+):\s*\[([\d.]+)\s*,\s*([\d.]+)\]", bl)
                if bm:
                    bands[bm.group(1)] = [float(bm.group(2)), float(bm.group(3))]
                    k += 1
                    continue
                break
            break
        j += 1

    return bands if bands else None


def _load_scenario_turn_limit_override(scenario_id):
    """2026-05-20 L-069 iter3: scenario_overrides parser per turn_limit_defeat_override.
    Coerente con backend damageCurves.js getTurnLimitDefeat() scenario-override logic.

    Ritorna:
      - int>0 = override numerico esplicito
      - None  = override esplicito null (disable) OR scenario assente OR key assente
      - 'INHERIT' sentinel string se scenario non ha la key (caller usa class default)

    Caller deve distinguere None-disable vs 'INHERIT'-fallback.
    """
    if not scenario_id or not os.path.exists(DAMAGE_CURVES_PATH):
        return "INHERIT"
    try:
        with open(DAMAGE_CURVES_PATH, "r", encoding="utf-8") as f:
            raw = f.read()
    except OSError:
        return "INHERIT"

    lines = raw.splitlines()
    in_overrides = False
    overrides_indent = None
    idx_scenario = None
    scenario_indent = None
    for i, line in enumerate(lines):
        if line.startswith("scenario_overrides:"):
            in_overrides = True
            overrides_indent = 0
            continue
        if not in_overrides:
            continue
        # Detect scenario_id key (e.g. 'enc_tutorial_06_hardcore:')
        m = re.match(r"^(\s+)([A-Za-z0-9_]+):\s*$", line)
        if m:
            indent = len(m.group(1))
            if scenario_indent is None:
                scenario_indent = indent
            if indent == scenario_indent and m.group(2) == scenario_id:
                idx_scenario = i
                break
        if line and not line.startswith(" ") and not line.startswith("#"):
            break

    if idx_scenario is None:
        return "INHERIT"

    j = idx_scenario + 1
    while j < len(lines):
        line = lines[j]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            j += 1
            continue
        # Exit if we hit a sibling scenario or section
        if line and scenario_indent is not None and len(line) - len(line.lstrip()) <= scenario_indent:
            break
        m = re.match(r"^\s+turn_limit_defeat_override:\s*(\S+)", line)
        if m:
            val = m.group(1).strip().lower()
            if val in ("null", "~", "none"):
                return None  # explicit disable
            try:
                n = int(val)
                return n if n > 0 else None
            except ValueError:
                return "INHERIT"
        j += 1
    return "INHERIT"


def load_turn_limit_defeat(encounter_class, scenario_id=None):
    """M9 P6: legge turn_limit_defeat da damage_curves.yaml per class.
    Ritorna int>0 o None (no limit).

    2026-05-20 L-069 iter3: scenario_id arg enables scenario_overrides resolution.
    Override esplicito null = no limit; override numerico = use override;
    override assente = inherit class default.

    Mini-parser consistente con load_target_bands.
    """
    # Scenario override check first.
    override = _load_scenario_turn_limit_override(scenario_id)
    if override != "INHERIT":
        return override

    if not os.path.exists(DAMAGE_CURVES_PATH):
        return None
    try:
        with open(DAMAGE_CURVES_PATH, "r", encoding="utf-8") as f:
            raw = f.read()
    except OSError:
        return None

    lines = raw.splitlines()
    idx_class = None
    in_classes = False
    class_indent = None
    for i, line in enumerate(lines):
        if line.startswith("encounter_classes:"):
            in_classes = True
            continue
        if not in_classes:
            continue
        m = re.match(r"^(\s+)(\w+):\s*$", line)
        if m and m.group(2) == encounter_class:
            idx_class = i
            class_indent = len(m.group(1))
            break
        if line and not line.startswith(" ") and not line.startswith("#"):
            break
    if idx_class is None:
        return None

    j = idx_class + 1
    while j < len(lines):
        line = lines[j]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            j += 1
            continue
        if line and len(line) - len(line.lstrip()) <= class_indent:
            break
        m = re.match(r"^\s+turn_limit_defeat:\s*(\S+)", line)
        if m:
            val = m.group(1).strip()
            if val.lower() in ("null", "~", "none"):
                return None
            try:
                n = int(val)
                return n if n > 0 else None
            except ValueError:
                return None
        j += 1
    return None


def verdict_for(win_rate, defeat_rate, timeout_rate, bands):
    """Ritorna (verdict, reasons) dati rates vs bands.
    verdict in {GREEN, AMBER, RED}.
    """
    if not bands:
        return "UNKNOWN", ["no bands for class"]
    reasons = []
    score = 0  # 0 green, 1 amber, 2 red
    for key, observed in [
        ("win_rate", win_rate),
        ("defeat_rate", defeat_rate),
        ("timeout_rate", timeout_rate),
    ]:
        band = bands.get(key)
        if not band:
            continue
        lo, hi = band
        if lo <= observed <= hi:
            continue
        # Distance-based amber vs red (+/-5pp amber tolerance).
        dist = min(abs(observed - lo), abs(observed - hi))
        if dist <= 0.05:
            score = max(score, 1)
            reasons.append(f"{key}={observed:.2f} near band [{lo},{hi}] (amber)")
        else:
            score = 2
            reasons.append(f"{key}={observed:.2f} out of band [{lo},{hi}] (red)")
    if score == 0:
        return "GREEN", ["all rates in band"]
    if score == 1:
        return "AMBER", reasons
    return "RED", reasons


def _retry(fn, retries=5, backoff_base=0.5):
    """Retry exponential backoff su ConnectionRefusedError / URLError.
    Mitiga TCP port exhaustion Windows + transient backend stalls (TKT-08/10)."""
    last_err = None
    for attempt in range(retries):
        try:
            return fn()
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, ConnectionRefusedError, OSError) as e:
            last_err = e
            time.sleep(backoff_base * (2 ** attempt))
    raise last_err


def post(url, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        def _do():
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, json.loads(r.read().decode("utf-8"))
        return _retry(_do)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": f"connection failed after retries: {e}"}


def get(url):
    try:
        def _do():
            with urllib.request.urlopen(url, timeout=15) as r:
                return r.status, json.loads(r.read().decode("utf-8"))
        return _retry(_do)
    except urllib.error.HTTPError as e:
        return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": f"connection failed after retries: {e}"}


def health_check(host):
    """Probe /api/health. Ritorna True se backend risponde 200."""
    status, _ = get(f"{host}/api/health")
    return status == 200


def pressure_tier(p):
    if p < 25: return "Low"
    if p < 50: return "Medium"
    if p < 75: return "High"
    if p < 90: return "Critical"
    return "Apex"


def manhattan(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


def step_toward(src, dst, grid_w, grid_h):
    dx = dst["x"] - src["x"]
    dy = dst["y"] - src["y"]
    nx, ny = src["x"], src["y"]
    # Prefer axis with larger diff (greedy orthogonal 1-step).
    if abs(dx) >= abs(dy) and dx != 0:
        nx += 1 if dx > 0 else -1
    elif dy != 0:
        ny += 1 if dy > 0 else -1
    nx = max(0, min(grid_w - 1, nx))
    ny = max(0, min(grid_h - 1, ny))
    return {"x": nx, "y": ny}


# M6-#1b iter3: smart channel policy. Player exploit vulnerability
# dell'archetype del target (esplicitato in hardcore-06 scenario).
# Mapping statico basato su tutorial species (M5-#3) + species_resistances.yaml.
# Apex boss + elite hunter = archetype corazzato (vuln psionico, mentale).
# Altri enemies = adattivo neutral (nessun vantaggio particolare).
# Badlands pilot has no boss/elite with a mapped vulnerability -> all attacks fisico.
CHANNEL_EXPLOIT_MAP = {}


def _pick_channel_for(target_id):
    """Return attack channel che sfrutta vuln del target.
    Default 'fisico' se target non ha weakness mappata."""
    return CHANNEL_EXPLOIT_MAP.get(target_id, "fisico")


# TKT-PLAYTEST-TRIANGULATE: hc06 ctx -- channel exploit map + boss-last priority
# (focus minions first, mirrors plan_player_intents enemy_priority).
def _enemy_priority_hc06(e):
    eid = e.get("id", "")
    if eid == "e_apex_boss":
        return 2
    if "elite" in eid:
        return 1
    return 0


POLICY_CTX = {
    "channel_for": _pick_channel_for,
    "enemy_priority": _enemy_priority_hc06,
    "attack_range_default": 1,
}


def _policy_rng(policy, run_seed):
    """random.Random for the 'random' policy (seeded -> reproducible); None else."""
    if policy != "random":
        return None
    return random.Random(run_seed) if run_seed is not None else random.Random()


def plan_player_intents(state, occupied):
    units = state.get("units", [])
    grid = state.get("grid", {})
    gw, gh = grid.get("width", 10), grid.get("height", 10)
    players = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not enemies:
        return []

    # Prioritize BOSS last (focus minions first for swarm reduction).
    def enemy_priority(e):
        if e["id"] == "e_apex_boss":
            return 2
        if "elite" in e["id"]:
            return 1
        return 0

    intents = []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}

    for pl in players:
        ap = pl.get("ap_remaining", pl.get("ap", 2))
        if ap <= 0:
            continue
        rng = pl.get("attack_range", 1)
        # Nearest enemy (prefer lower priority = minions first).
        enemies_sorted = sorted(enemies, key=lambda e: (enemy_priority(e), manhattan(pl["position"], e["position"])))
        target = enemies_sorted[0]
        target_id = target["id"]
        channel = _pick_channel_for(target_id)  # M6-#1b iter3 channel exploit
        dist = manhattan(pl["position"], target["position"])
        if dist <= rng and ap >= 1:
            intents.append({
                "actor_id": pl["id"],
                "action": {"type": "attack", "target_id": target_id, "channel": channel}
            })
        elif ap >= 2:
            new_pos = step_toward(pl["position"], target["position"], gw, gh)
            if (new_pos["x"], new_pos["y"]) in reserved:
                # Try alt axis.
                alt = step_toward(pl["position"], {"x": target["position"]["x"] + 1, "y": target["position"]["y"]}, gw, gh)
                if (alt["x"], alt["y"]) not in reserved:
                    new_pos = alt
            # Move then attack if now in range, else skip atk.
            intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": new_pos}})
            new_dist = manhattan(new_pos, target["position"])
            if new_dist <= rng and ap >= 2:
                intents.append({
                    "actor_id": pl["id"],
                    "action": {"type": "attack", "target_id": target_id, "channel": channel}
                })
            reserved.discard((pl["position"]["x"], pl["position"]["y"]))
            reserved.add((new_pos["x"], new_pos["y"]))
        else:
            intents.append({"actor_id": pl["id"], "action": {"type": "skip"}})
    return intents


def detect_outcome(state, turn_limit_defeat=None):
    """M9 P6: turn_limit_defeat forza decision pressure.
    Se turn >= limit + neither faction wiped -> 'defeat' (invece di timeout).
    Param None = legacy behavior (timeout rimane timeout).
    """
    units = state.get("units", [])
    pa = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    ea = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not pa: return "defeat"
    if not ea: return "victory"
    if turn_limit_defeat is not None:
        current_turn = int(state.get("turn", 0) or 0)
        if current_turn >= turn_limit_defeat:
            return "defeat"
    return None


def probe_one(host):
    """N=1 verbose probe -- dump shape API per ogni response (TKT-09 root cause:
    in priority_queue mode AI actions stanno in `results[]` non `ai_result`).

    Memory feedback_probe_before_batch.md: sempre N=1 + schema dump prima batch.
    """
    print("\n=== PROBE N=1 ===\n", flush=True)
    status, sc = get(f"{host}/api/tutorial/{SCENARIO_ID}")
    print(f"GET /api/tutorial/{SCENARIO_ID} -> {status}, keys: {list(sc.keys())}", flush=True)
    print(f"  sistema_pressure_start: {sc.get('sistema_pressure_start')}", flush=True)
    print(f"  units count: {len(sc.get('units', []))}", flush=True)
    if status != 200:
        return None

    units = sc["units"]
    status, start = post(f"{host}/api/session/start", {
        "units": units,
        # #3157 F3: tag the session so per-scenario telemetry stops logging null
        "scenario_id": SCENARIO_ID,
        "modulation": "full",
        "sistema_pressure_start": sc.get("sistema_pressure_start", 75),
        "hazard_tiles": sc.get("hazard_tiles", []),
    })
    print(f"\nPOST /api/session/start -> {status}, keys: {list(start.keys()) if isinstance(start, dict) else 'N/A'}", flush=True)
    if status != 200:
        print(f"  ERROR: {start}", flush=True)
        return None
    sid = start["session_id"]
    state = start["state"]
    print(f"  session_id: {sid[:12]}...", flush=True)
    print(f"  state.grid: {state.get('grid')}", flush=True)
    print(f"  state.units count: {len(state.get('units', []))}", flush=True)

    # Single round to inspect /round/execute response.
    intents = plan_player_intents(state, None)
    print(f"\nplan_player_intents -> {len(intents)} intents", flush=True)
    status, resp = post(f"{host}/api/session/round/execute", {
        "session_id": sid,
        "player_intents": intents,
        "ai_auto": True,
        "priority_queue": True,
    })
    print(f"\nPOST /api/session/round/execute -> {status}, top-level keys: {list(resp.keys()) if isinstance(resp, dict) else 'N/A'}", flush=True)
    if status == 200:
        print(f"  state present: {bool(resp.get('state'))}", flush=True)
        print(f"  results count: {len(resp.get('results', []))}", flush=True)
        if resp.get("results"):
            print(f"  results[0] keys: {list(resp['results'][0].keys())}", flush=True)
            print(f"  results[0] sample: {json.dumps(resp['results'][0], indent=2)[:500]}", flush=True)
        print(f"  ai_result present: {bool(resp.get('ai_result'))}", flush=True)
        if resp.get("ai_result"):
            print(f"  ai_result keys: {list(resp['ai_result'].keys())}", flush=True)
            print(f"  ai_result.ia_actions count: {len(resp['ai_result'].get('ia_actions', []))}", flush=True)
        # Check actor_id distribution in results[]
        actors = {}
        for r in resp.get("results", []):
            aid = r.get("actor_id", "?")
            actors[aid] = actors.get(aid, 0) + 1
        print(f"  results actor_id distribution: {actors}", flush=True)

    # Cleanup.
    post(f"{host}/api/session/end", {"session_id": sid})
    print("\n=== PROBE END ===\n", flush=True)
    return resp


def _ai_actions_from_resp(resp, sis_actor_ids):
    """Estrai AI actions da /round/execute response.
    TKT-09 fix: in priority_queue mode AI actions sono in results[] (non ai_result.ia_actions).
    Nota: priority_queue mode results are flat, non c\'e' bisogno di fare l\'unwrap di ia_actions.
    Filtra per actor_id appartenente a SIS-controlled.
    """
    actions = []
    # Path 1: results[] filter SIS actors (priority_queue mode).
    for r in resp.get("results", []):
        if r.get("actor_id") in sis_actor_ids:
            actions.append(r)
    # Path 2 (fallback): legacy ai_result.ia_actions (non-priority mode).
    ai_res = resp.get("ai_result") or {}
    for a in ai_res.get("ia_actions", []):
        actions.append(a)
    return actions


def _player_actions_from_resp(resp, player_actor_ids):
    """Estrai player actions da /round/execute response.
    2026-05-20 method F: close anti-pattern #8 shallow-ADOPT.
    Enables empirical trait/action analysis vs heuristic-only.
    """
    actions = []
    for r in resp.get("results", []):
        if r.get("actor_id") in player_actor_ids:
            actions.append(r)
    return actions


def _extract_trait_id(action_result):
    """LEGACY single-trait extract. Mantenuto back-compat. Vedi _extract_trait_ids
    per canonical reading via trait_effects array."""
    ids = _extract_trait_ids(action_result)
    return ids[0] if ids else None


def _extract_trait_ids(action_result):
    """Extract TRIGGERED trait_ids da action_result via canonical schema.

    2026-05-21 FASE B fix (Codex audit followup): backend already exposes
    triggered traits via `result.trait_effects` array -- schema canonica in
    sessionRoundBridge.js:753 + session.js:1102. Each entry:
        {trait: 'trait_id', triggered: bool, effect: {...}}
    Estrai SOLO traits con triggered=true (effect attivato runtime).

    Chiude F-gap "trait_used_distribution empty" senza richiedere modifiche
    backend o packages/contracts (schema esisteva gia').

    Args:
        action_result: dict di results[] da /api/session/round/execute

    Returns:
        list[str] trait_ids triggered. Empty se nessun trait attivo o action
        non-attack (move/skip non hanno trait_effects).
    """
    if not isinstance(action_result, dict):
        return []
    res = action_result.get("result")
    if not isinstance(res, dict):
        return []
    effects = res.get("trait_effects") or []
    if not isinstance(effects, list):
        return []
    out = []
    for eff in effects:
        if not isinstance(eff, dict):
            continue
        if not eff.get("triggered"):
            continue
        tid = eff.get("trait")
        if tid:
            out.append(str(tid))
    return out


def run_one(host, run_idx, turn_limit_defeat=None, biome_id=None, seed=None,
            policy="greedy", rng=None):
    # Fetch scenario.
    status, sc = get(f"{host}/api/tutorial/{SCENARIO_ID}")
    if status != 200:
        return {"error": f"fetch scenario failed: {sc}"}
    units = sc["units"]
    hazard = sc.get("hazard_tiles", [])
    pstart = sc.get("sistema_pressure_start", 75)

    # Start.
    status, start = post(f"{host}/api/session/start", {
        "units": units,
        # #3157 F3: tag the session so per-scenario telemetry stops logging null
        "scenario_id": SCENARIO_ID,
        # TKT-PLAYTEST-SEED: pin backend combat RNG for bit-identical replay.
        # None -> key omitted -> backend stays on Math.random (no behavior change).
        **({"seed": seed} if seed is not None else {}),
        "modulation": "full",
        "sistema_pressure_start": pstart,
        "hazard_tiles": hazard,
        # 2026-05-21 (OD-032 C): id enables scenario_overrides resolution at /start
        # (boss_hp + enemy_damage_multiplier_override per session.js scenarioIdForEdm).
        "encounter": {"id": SCENARIO_ID},
        # phase 2b: backend getEncounterClass reads body.encounter_class -> resolves
        # the 'badlands' class multiplier (1.0). Without this it defaults to 'standard'
        # (1.2x), diverging from real play. Keeps calibration == shipped behavior.
        "encounter_class": ENCOUNTER_CLASS,
        # ERMES FASE 3 P2: set biome_id to exercise applyBiomeEcoEffects in calibration.
        **({"biome_id": biome_id} if biome_id else {}),
    })
    if status != 200:
        return {"error": f"session/start failed: {start}"}
    sid = start["session_id"]
    state = start["state"]

    ai_intent_tally = {}  # type -> count per tier
    pressure_samples = []
    dmg_to_boss = 0
    initial_units = {u["id"]: dict(u) for u in units}
    sis_actor_ids = {u["id"] for u in units if u.get("controlled_by") == "sistema"}
    # 2026-05-20 method F: player action + trait telemetry (close anti-pattern #8).
    player_actor_ids = {u["id"] for u in units if u.get("controlled_by") == "player"}
    player_action_tally = {}  # action_type -> count
    trait_used_tally = {}     # trait_id -> count (None values dropped)

    outcome = None
    for rnd in range(1, MAX_ROUNDS + 1):
        outcome = detect_outcome(state, turn_limit_defeat)
        if outcome:
            break
        if policy == "greedy":
            intents = plan_player_intents(state, None)
        else:
            intents = calibrate_policies.pick_intents(policy, state, POLICY_CTX, rng)
        status, resp = post(f"{host}/api/session/round/execute", {
            "session_id": sid,
            "player_intents": intents,
            "ai_auto": True,
            "priority_queue": True,
        })
        if status != 200:
            # End round if e.g. session already terminated; try to read state.
            st_status, st = get(f"{host}/api/session/state?session_id={sid}")
            if st_status == 200:
                state = st
                outcome = detect_outcome(state, turn_limit_defeat)
            break
        state = resp.get("state", state)
        pressure_samples.append(state.get("sistema_pressure", pstart))

        # Tally AI actions -- TKT-09 fix: read from results[] (priority_queue) +
        # fallback ai_result.ia_actions. Vedi feedback_probe_before_batch.md.
        # Closed as no-op: priority_queue mode results are already flat and correctly provide action_type.
        ai_actions = _ai_actions_from_resp(resp, sis_actor_ids)
        for a in ai_actions:
            tier = pressure_tier(state.get("sistema_pressure", pstart))
            # action_type per priority_queue results[], type per legacy ia_actions
            atype = a.get("action_type") or a.get("type", "unknown")
            key = (tier, atype)
            ai_intent_tally[key] = ai_intent_tally.get(key, 0) + 1

        # 2026-05-20 method F: tally player actions + trait usage.
        player_actions = _player_actions_from_resp(resp, player_actor_ids)
        for pa in player_actions:
            ptype = pa.get("action_type") or pa.get("type", "unknown")
            player_action_tally[ptype] = player_action_tally.get(ptype, 0) + 1
            # 2026-05-21 FASE B: read all triggered traits via canonical schema.
            for tid in _extract_trait_ids(pa):
                trait_used_tally[tid] = trait_used_tally.get(tid, 0) + 1

    if outcome is None:
        outcome = detect_outcome(state, turn_limit_defeat) or "timeout"

    # Final metrics.
    final_units = {u["id"]: u for u in state.get("units", [])}
    players_alive = sum(1 for u in final_units.values() if u.get("controlled_by") == "player" and u.get("hp", 0) > 0)
    players_dead = sum(1 for u in final_units.values() if u.get("controlled_by") == "player" and u.get("hp", 0) <= 0)
    enemies_alive = sum(1 for u in final_units.values() if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0)
    enemies_dead = sum(1 for u in final_units.values() if u.get("controlled_by") == "sistema" and u.get("hp", 0) <= 0)
    dmg_dealt_player = sum(max(0, initial_units[u_id]["hp"] - u.get("hp", 0))
                           for u_id, u in final_units.items() if u.get("controlled_by") == "sistema")
    dmg_taken_player = sum(max(0, initial_units[u_id]["hp"] - u.get("hp", 0))
                           for u_id, u in final_units.items() if u.get("controlled_by") == "player")
    boss_hp_remaining = final_units.get("e_apex_boss", {}).get("hp", 0)

    # VC scores -- TKT-D FU-M3: PR #1564 espone vc_snapshot direttamente
    # nel response di /end, risparmiando una GET /vc per run.
    end_status, end_res = post(f"{host}/api/session/end", {"session_id": sid})
    vc_data = {}
    if end_status == 200 and isinstance(end_res, dict):
        vc_snapshot = end_res.get("vc_snapshot") or {}
        vc_data = vc_snapshot
    else:
        # Fallback legacy: GET /vc se /end non ha vc_snapshot (non dovrebbe mai
        # accadere post PR #1564, tenuto per sicurezza).
        vc_status, vc = get(f"{host}/api/session/{sid}/vc")
        vc_data = vc if vc_status == 200 else {}

    return {
        "run": run_idx,
        "seed": seed,
        "policy": policy,
        "outcome": outcome,
        "rounds": state.get("turn", 0),
        "players_alive": players_alive,
        "players_dead": players_dead,
        "enemies_alive": enemies_alive,
        "enemies_dead": enemies_dead,
        "dmg_dealt_player": dmg_dealt_player,
        "dmg_taken_player": dmg_taken_player,
        "boss_hp_remaining": boss_hp_remaining,
        "pressure_final": pressure_samples[-1] if pressure_samples else pstart,
        "ai_intent_tally": {f"{t}|{a}": c for (t, a), c in ai_intent_tally.items()},
        # 2026-05-20 method F: player + trait telemetry (anti-pattern #8 close).
        "player_action_tally": dict(player_action_tally),
        "trait_used_tally": dict(trait_used_tally),
        "vc": {
            "mbti": vc_data.get("mbti"),
            "ennea": vc_data.get("ennea"),
            "aggregate": vc_data.get("aggregate"),
        },
    }


def aggregate(runs, encounter_class=None):
    ok = [r for r in runs if "error" not in r]
    if not ok:
        return {"error": "no successful runs"}
    wins = [r for r in ok if r["outcome"] == "victory"]
    losses = [r for r in ok if r["outcome"] == "defeat"]
    timeouts = [r for r in ok if r["outcome"] == "timeout"]
    turns = [r["rounds"] for r in ok]
    kd = []
    for r in ok:
        d = r["players_dead"] or 0
        k = r["enemies_dead"] or 0
        kd.append(k / d if d > 0 else float(k))
    # Aggregate AI intent distribution by tier.
    ai_global = {}
    for r in ok:
        for k, v in r["ai_intent_tally"].items():
            ai_global[k] = ai_global.get(k, 0) + v
    # 2026-05-20 method F: aggregate player action + trait usage.
    player_global = {}
    trait_global = {}
    for r in ok:
        for k, v in (r.get("player_action_tally") or {}).items():
            player_global[k] = player_global.get(k, 0) + v
        for k, v in (r.get("trait_used_tally") or {}).items():
            trait_global[k] = trait_global.get(k, 0) + v

    n = len(ok)
    wr = len(wins) / n
    dr = len(losses) / n
    tr = len(timeouts) / n
    # M7-#2 Phase D: verdict vs class target_bands (ADR-2026-04-20).
    verdict = None
    verdict_reasons = []
    bands = None
    if encounter_class:
        bands = load_target_bands(encounter_class)
        verdict, verdict_reasons = verdict_for(wr, dr, tr, bands)

    return {
        "N": n,
        "encounter_class": encounter_class,
        "target_bands": bands,
        "verdict": verdict,
        "verdict_reasons": verdict_reasons,
        "win_rate": wr,
        "defeat_rate": dr,
        "timeout_rate": tr,
        "win_count": len(wins),
        "loss_count": len(losses),
        "timeout_count": len(timeouts),
        "turns_avg": statistics.mean(turns),
        "turns_median": statistics.median(turns),
        "turns_stdev": statistics.pstdev(turns) if len(turns) > 1 else 0.0,
        "turns_min": min(turns),
        "turns_max": max(turns),
        "turns_hist": _hist(turns, bins=[(1,5),(6,10),(11,15),(16,20),(21,30),(31,40),(41,999)]),
        "kd_avg": statistics.mean(kd),
        "kd_median": statistics.median(kd),
        "dmg_dealt_avg": statistics.mean(r["dmg_dealt_player"] for r in ok),
        "dmg_taken_avg": statistics.mean(r["dmg_taken_player"] for r in ok),
        "boss_hp_remaining_avg_on_loss": (
            statistics.mean(r["boss_hp_remaining"] for r in losses) if losses else None
        ),
        "players_alive_avg_on_win": (
            statistics.mean(r["players_alive"] for r in wins) if wins else None
        ),
        "ai_intent_distribution": ai_global,
        # 2026-05-20 method F: player + trait empirical telemetry.
        "player_action_distribution": player_global,
        "trait_used_distribution": trait_global,
    }


def _hist(values, bins):
    """Build histogram labeled buckets. Open-ended bucket (hi >= 999) labeled "{lo}+".

    Codex review fix: MAX_ROUNDS=40 esaurito -> run ending at round 41 were dropped
    by finite bins. Open-ended bucket cattura timeout + late-resolve run.
    """
    out = {}
    for lo, hi in bins:
        label = f"{lo}+" if hi >= 999 else f"{lo}-{hi}"
        out[label] = sum(1 for v in values if lo <= v <= hi)
    return out


def run_triangulation(args):
    """TKT-PLAYTEST-TRIANGULATE: run every policy at N and report a WR band.
    Additive output (mode=triangulation); single-policy callers unaffected."""
    from calibrate_policies import POLICIES, compute_band

    turn_limit_defeat = load_turn_limit_defeat(args.encounter_class, scenario_id=SCENARIO_ID)
    print(
        f"Hardcore 06 TRIANGULATION: policies={list(POLICIES)} N={args.n}/policy "
        f"host={args.host} seed={'None' if args.seed is None else args.seed} "
        f"turn_limit_defeat={turn_limit_defeat}",
        flush=True,
    )
    t0 = time.time()
    per_policy = {}
    policy_aggs = {}
    for pol in POLICIES:
        runs = []
        for i in range(args.n):
            run_seed = args.seed + i if args.seed is not None else None
            r = run_one(args.host, i, turn_limit_defeat=turn_limit_defeat,
                        biome_id=args.biome_id, seed=run_seed, policy=pol,
                        rng=_policy_rng(pol, run_seed))
            runs.append(r)
            mark = ("V" if r.get("outcome") == "victory" else "L" if r.get("outcome") == "defeat"
                    else "T" if r.get("outcome") == "timeout" else "E")
            print(f"  [{pol}] [{i+1}/{args.n}] {mark} rounds={r.get('rounds','?')} "
                  f"boss_hp={r.get('boss_hp_remaining','?')}", flush=True)
            if args.cooldown > 0 and i + 1 < args.n:
                time.sleep(args.cooldown)
        per_policy[pol] = runs
        policy_aggs[pol] = aggregate(runs, encounter_class=args.encounter_class)

    band = compute_band(per_policy)
    elapsed = round(time.time() - t0, 1)
    pwr = band["policy_win_rate"]
    print("\n=== TRIANGULATION BAND ===", flush=True)
    for pol in POLICIES:
        wr = pwr.get(pol)
        print(f"  {pol:11s} WR={'n/a' if wr is None else f'{wr * 100:.1f}%'}", flush=True)
    lo, hi = band["band"]
    human = band["human_wr_est"]
    lo_s = "n/a" if lo is None else f"{lo * 100:.1f}%"
    hi_s = "n/a" if hi is None else f"{hi * 100:.1f}%"
    human_s = "n/a" if human is None else f"{human * 100:.1f}%"
    print(f"  band=[{lo_s}, {hi_s}]  human_est={human_s} ({band['human_wr_formula']})", flush=True)

    out = {
        "scenario_id": SCENARIO_ID,
        "mode": "triangulation",
        "n_per_policy": args.n,
        "seed": args.seed,
        "encounter_class": args.encounter_class,
        "elapsed_sec": elapsed,
        "band": band,
        "policies": {pol: {"aggregate": policy_aggs[pol], "runs": per_policy[pol]} for pol in POLICIES},
    }
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {args.out}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--out", default=None, help="JSON output path (aggregate)")
    ap.add_argument("--jsonl", default=None, help="JSONL incremental output (resume)")
    ap.add_argument("--cooldown", type=float, default=0.5, help="Sec between runs")
    ap.add_argument("--skip-health", action="store_true", help="Skip /api/health probe")
    ap.add_argument("--probe", action="store_true",
                    help="Run N=1 verbose probe (schema dump) -- REQUIRED prima di batch nuovo. "
                         "Vedi memory feedback_probe_before_batch.md")
    ap.add_argument("--encounter-class", default="badlands_ambient",
                    help="M7-#2 Phase D: class key da damage_curves.yaml. "
                         "Default 'badlands_ambient' (enc_badlands_ambient_01). "
                         "Valori: tutorial|tutorial_advanced|standard|hardcore|boss|badlands")
    ap.add_argument("--biome-id", default=None,
                    help="ERMES FASE 3 P2: set req.body.biome_id to exercise biome eco "
                         "deltas (applyBiomeEcoEffects) during calibration. e.g. "
                         "cryosteppe_convergence (HIGH) | rovine_planari (LOW).")
    ap.add_argument("--seed", type=int, default=None,
                    help="TKT-PLAYTEST-SEED: base seed for bit-identical runs. Run i uses "
                         "seed+i (so the whole batch is reproducible). Omit = legacy "
                         "Math.random (statistical reproducibility only).")
    ap.add_argument("--policy", default="greedy",
                    choices=["random", "greedy", "lookahead2", "utility", "all"],
                    help="TKT-PLAYTEST-TRIANGULATE: player policy proxy. 'all' runs every "
                         "policy and reports a WR band (Jaffe 2012 Restricted Play). "
                         "Default greedy (back-compat single-policy output).")
    args = ap.parse_args()

    # Health probe (TKT-08): fail fast se backend non risponde.
    if not args.skip_health:
        if not health_check(args.host):
            print(f"ERROR: backend health check failed at {args.host}/api/health", flush=True)
            return 1
        print(f"OK: backend healthy at {args.host}", flush=True)

    # Probe mode: dump shape API + exit 0. Validate metric collection prima batch.
    if args.probe:
        probe_one(args.host)
        return 0

    # TKT-PLAYTEST-TRIANGULATE: multi-policy band mode short-circuits single flow.
    if args.policy == "all":
        return run_triangulation(args)

    # M9 P6: load turn_limit_defeat per class (force decision pressure).
    # 2026-05-20 L-069 iter3: pass SCENARIO_ID for scenario_overrides resolution.
    turn_limit_defeat = load_turn_limit_defeat(args.encounter_class, scenario_id=SCENARIO_ID)
    if turn_limit_defeat:
        print(f"M9 P6: turn_limit_defeat={turn_limit_defeat} for class '{args.encounter_class}' scenario={SCENARIO_ID} (Long War pattern)", flush=True)
    else:
        print(f"M9 P6: turn_limit_defeat DISABLED for scenario={SCENARIO_ID} (override null OR class no limit)", flush=True)

    runs = []
    jsonl_fh = open(args.jsonl, "a", encoding="utf-8") if args.jsonl else None
    t0 = time.time()
    failures = 0
    try:
        for i in range(args.n):
            run_seed = args.seed + i if args.seed is not None else None
            r = run_one(args.host, i, turn_limit_defeat=turn_limit_defeat,
                        biome_id=args.biome_id, seed=run_seed, policy=args.policy,
                        rng=_policy_rng(args.policy, run_seed))
            runs.append(r)
            if "error" in r:
                failures += 1
            mark = "V" if r.get("outcome") == "victory" else "L" if r.get("outcome") == "defeat" else "T" if r.get("outcome") == "timeout" else "E"
            print(f"[{i+1}/{args.n}] {mark} rounds={r.get('rounds','?')} boss_hp={r.get('boss_hp_remaining','?')} pa={r.get('players_alive','?')}", flush=True)
            # Incremental JSONL write -- resume-friendly (TKT-10).
            if jsonl_fh:
                jsonl_fh.write(json.dumps(r) + "\n")
                jsonl_fh.flush()
            # Inter-run cooldown -- mitiga TCP port exhaustion Windows.
            if i + 1 < args.n and args.cooldown > 0:
                time.sleep(args.cooldown)
            # Periodic health re-check ogni 10 run.
            if (i + 1) % 10 == 0 and not args.skip_health:
                if not health_check(args.host):
                    print(f"WARN: health check failed dopo run {i+1}, retry sleep 5s", flush=True)
                    time.sleep(5)
                    if not health_check(args.host):
                        print(f"ABORT: backend non recuperato, stop batch (run completati: {i+1})", flush=True)
                        break
    finally:
        if jsonl_fh:
            jsonl_fh.close()

    elapsed = time.time() - t0
    agg = aggregate(runs, encounter_class=args.encounter_class)
    agg["elapsed_sec"] = round(elapsed, 1)
    agg["failures"] = failures

    out = {"aggregate": agg, "runs": runs}
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {args.out}")
    print("\n=== AGGREGATE ===")
    print(json.dumps(agg, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
